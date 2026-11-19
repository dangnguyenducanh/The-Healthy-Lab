"""JWT sessions in httpOnly cookies, password hashing, CSRF and login throttling.

Access token: 15 minutes, cookie `thl_access` on `/`. Refresh token: 7 days, cookie `thl_refresh`
on `/api/auth` only, its jti stored hashed so it can be rotated and revoked. JavaScript never sees
either token. A Bearer header is still accepted for scripts and tests.
"""

import hashlib
import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException, Request, Response, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from config import COOKIE_SECURE, JWT_SECRET
from database import get_session
from models import LoginAttempt, RefreshToken, User

ALGORITHM = "HS256"
ISSUER = "healthy-lab-api"
AUDIENCE = "healthy-lab-web"
ACCESS_TTL = timedelta(minutes=15)
REFRESH_TTL = timedelta(days=7)
ACCESS_COOKIE = "thl_access"
REFRESH_COOKIE = "thl_refresh"
REFRESH_PATH = "/api/auth"  # the path the browser sees on the web origin (proxied to /auth)
CSRF_HEADER = "x-requested-with"
SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}
MAX_FAILED_LOGINS = 5
LOCKOUT = timedelta(minutes=15)
# Hash of a throwaway password: checked when the email is unknown, so both cases take bcrypt time.
_DUMMY_HASH = "$2b$12$Ybs.zRGEU.3UESf2yBxmae3ly11PSBnhiY2WJJ/Pi74to1FZsqfLq"


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _db_now() -> datetime:
    """Naive UTC, matching the DateTime columns (SQLite and Postgres alike)."""
    return _now().replace(tzinfo=None)


# ------------------------------------------------------------------ passwords

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(12)).decode()


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), password_hash.encode())
    except ValueError:  # malformed hash or a password over bcrypt's 72 bytes
        return False


# ------------------------------------------------------------------ tokens

def _encode(user: User, kind: str, ttl: timedelta) -> tuple[str, str, datetime]:
    now = _now()
    jti = uuid.uuid4().hex
    expires = now + ttl
    claims = {
        "sub": str(user.id),
        "role": user.role,
        "type": kind,
        "iat": now,
        "nbf": now,
        "exp": expires,
        "jti": jti,
        "iss": ISSUER,
        "aud": AUDIENCE,
    }
    return jwt.encode(claims, JWT_SECRET, algorithm=ALGORITHM), jti, expires


def create_token(user: User) -> str:
    """An access token, for scripts and tests that use the Bearer header."""
    return _encode(user, "access", ACCESS_TTL)[0]


def decode_token(token: str, kind: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[ALGORITHM],
            audience=AUDIENCE,
            issuer=ISSUER,
            options={"require": ["exp", "iat", "nbf", "sub", "jti", "type"]},
        )
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired") from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc
    if payload.get("type") != kind:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return payload


def _hash_jti(jti: str) -> str:
    return hashlib.sha256(jti.encode()).hexdigest()


# ------------------------------------------------------------------ cookies and sessions

def _set_cookies(response: Response, access: str, refresh: str) -> None:
    common = {"httponly": True, "secure": COOKIE_SECURE, "samesite": "lax"}
    response.set_cookie(ACCESS_COOKIE, access, max_age=int(ACCESS_TTL.total_seconds()), path="/", **common)
    response.set_cookie(REFRESH_COOKIE, refresh, max_age=int(REFRESH_TTL.total_seconds()), path=REFRESH_PATH, **common)


def clear_session_cookies(response: Response) -> None:
    common = {"httponly": True, "secure": COOKIE_SECURE, "samesite": "lax"}
    response.delete_cookie(ACCESS_COOKIE, path="/", **common)
    response.delete_cookie(REFRESH_COOKIE, path=REFRESH_PATH, **common)


def issue_session(user: User, response: Response, session: Session) -> None:
    """New access + refresh pair as cookies; the refresh jti is stored hashed. Caller commits."""
    access, _, _ = _encode(user, "access", ACCESS_TTL)
    refresh, jti, expires = _encode(user, "refresh", REFRESH_TTL)
    session.add(RefreshToken(user_id=user.id, jti_hash=_hash_jti(jti), expires_at=expires.replace(tzinfo=None)))
    _set_cookies(response, access, refresh)


def rotate_session(refresh_token: str, response: Response, session: Session) -> User:
    payload = decode_token(refresh_token, "refresh")
    row = session.query(RefreshToken).filter(RefreshToken.jti_hash == _hash_jti(payload["jti"])).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session")
    if row.revoked_at is not None:
        # A refresh token used twice was copied: end every session of that user.
        session.query(RefreshToken).filter(
            RefreshToken.user_id == row.user_id, RefreshToken.revoked_at.is_(None)
        ).update({"revoked_at": _db_now()})
        session.commit()
        clear_session_cookies(response)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session revoked")
    user = session.get(User, row.user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session")
    row.revoked_at = _db_now()
    issue_session(user, response, session)
    session.commit()
    return user


def revoke_session(refresh_token: str | None, session: Session) -> None:
    if not refresh_token:
        return
    try:
        payload = decode_token(refresh_token, "refresh")
    except HTTPException:
        return
    session.query(RefreshToken).filter(
        RefreshToken.jti_hash == _hash_jti(payload["jti"]), RefreshToken.revoked_at.is_(None)
    ).update({"revoked_at": _db_now()})
    session.commit()


# ------------------------------------------------------------------ login throttling

def ensure_login_allowed(email: str, session: Session) -> None:
    since = _db_now() - LOCKOUT
    failures = (
        session.query(func.count(LoginAttempt.id))
        .filter(LoginAttempt.email == email, LoginAttempt.created_at >= since)
        .scalar()
    )
    if failures >= MAX_FAILED_LOGINS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed sign-in attempts. Try again in 15 minutes.",
            headers={"Retry-After": str(int(LOCKOUT.total_seconds()))},
        )


def record_login(email: str, success: bool, session: Session) -> None:
    """Failures are stored; a success clears them. Caller commits."""
    if success:
        session.query(LoginAttempt).filter(LoginAttempt.email == email).delete()
    else:
        session.add(LoginAttempt(email=email, created_at=_db_now()))


def authenticate(email: str, password: str, session: Session) -> User | None:
    user = session.query(User).filter(User.email == email).first()
    password_ok = verify_password(password, user.password_hash if user else _DUMMY_HASH)
    if user is None or not password_ok or not user.is_active:
        return None
    return user


# ------------------------------------------------------------------ request dependencies

def _request_token(request: Request) -> tuple[str | None, bool]:
    """(token, came_from_cookie)."""
    header = request.headers.get("authorization", "")
    if header.lower().startswith("bearer "):
        return header[7:].strip(), False
    cookie = request.cookies.get(ACCESS_COOKIE)
    return (cookie, True) if cookie else (None, False)


def require_csrf_header(request: Request) -> None:
    if request.method not in SAFE_METHODS and request.headers.get(CSRF_HEADER) != "fetch":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Missing X-Requested-With header")


def get_current_user(request: Request, session: Session = Depends(get_session)) -> User:
    token, from_cookie = _request_token(request)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not signed in")
    if from_cookie:
        require_csrf_header(request)
    payload = decode_token(token, "access")
    user = session.get(User, int(payload["sub"]))
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not signed in")
    return user


def get_optional_current_user(request: Request, session: Session = Depends(get_session)) -> User | None:
    """Public routes: a missing or stale token means a guest, never an error."""
    token, _ = _request_token(request)
    if not token:
        return None
    try:
        return get_current_user(request, session)
    except HTTPException:
        return None


def require_role(user: User | None, allowed_roles: list[str]) -> None:
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not signed in")
    if user.role not in allowed_roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permission")

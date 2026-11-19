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
# Not a credential: "1" while a refresh session exists, readable by the web app so it can skip
# session calls for guests and gate pages before render. The API never trusts it.
HINT_COOKIE = "thl_session"
REFRESH_PATH = "/api/auth"  # the path the browser sees on the web origin (proxied to /auth)
CSRF_HEADER = "x-requested-with"
SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}
MAX_FAILED_LOGINS = 5
LOCKOUT = timedelta(minutes=15)
# Two tabs refreshing at the same moment both present the same refresh token; the later one inside
# this window is a race, not theft, so it fails quietly instead of ending every session.
REUSE_GRACE = timedelta(seconds=30)
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
    response.set_cookie(HINT_COOKIE, "1", max_age=int(REFRESH_TTL.total_seconds()), path="/", secure=COOKIE_SECURE, samesite="lax")


def clear_session_cookies(response: Response) -> None:
    common = {"httponly": True, "secure": COOKIE_SECURE, "samesite": "lax"}
    response.delete_cookie(ACCESS_COOKIE, path="/", **common)
    response.delete_cookie(REFRESH_COOKIE, path=REFRESH_PATH, **common)
    response.delete_cookie(HINT_COOKIE, path="/", secure=COOKIE_SECURE, samesite="lax")


class SessionEnded(HTTPException):
    """A refresh that must also clear the browser's session cookies (the router turns it into a response)."""

    def __init__(self, detail: str):
        super().__init__(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)


def issue_session(user: User, response: Response, session: Session) -> None:
    """New access + refresh pair as cookies; the refresh jti is stored hashed. Caller commits."""
    access, _, _ = _encode(user, "access", ACCESS_TTL)
    refresh, jti, expires = _encode(user, "refresh", REFRESH_TTL)
    session.add(RefreshToken(user_id=user.id, jti_hash=_hash_jti(jti), expires_at=expires.replace(tzinfo=None)))
    _set_cookies(response, access, refresh)


def rotate_session(refresh_token: str, response: Response, session: Session) -> User:
    try:
        payload = decode_token(refresh_token, "refresh")
    except HTTPException as exc:
        raise SessionEnded(exc.detail) from exc
    row = session.query(RefreshToken).filter(RefreshToken.jti_hash == _hash_jti(payload["jti"])).first()
    if row is None:
        raise SessionEnded("Invalid session")

    # Claim the token atomically: of two concurrent refreshes only one can flip revoked_at.
    now = _db_now()
    claimed = (
        session.query(RefreshToken)
        .filter(RefreshToken.id == row.id, RefreshToken.revoked_at.is_(None))
        .update({"revoked_at": now}, synchronize_session=False)
    )
    if not claimed:
        session.rollback()
        revoked_at = session.query(RefreshToken.revoked_at).filter(RefreshToken.id == row.id).scalar()
        if revoked_at is not None and now - revoked_at < REUSE_GRACE:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session was just refreshed")
        # A refresh token used again later was copied: end every session of that user, including
        # access tokens already handed out.
        session.query(RefreshToken).filter(
            RefreshToken.user_id == row.user_id, RefreshToken.revoked_at.is_(None)
        ).update({"revoked_at": now}, synchronize_session=False)
        session.query(User).filter(User.id == row.user_id).update({"sessions_valid_after": now}, synchronize_session=False)
        session.commit()
        raise SessionEnded("Session revoked")

    user = session.get(User, row.user_id)
    if user is None or not user.is_active:
        session.rollback()
        raise SessionEnded("Invalid session")
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

def begin_login_attempt(email: str, session: Session) -> None:
    """Record the attempt before the password is checked, so parallel guesses all count, then refuse
    the sixth and later attempts on that email within LOCKOUT. Rows older than LOCKOUT are purged."""
    now = _db_now()
    since = now - LOCKOUT
    session.query(LoginAttempt).filter(LoginAttempt.created_at < since).delete(synchronize_session=False)
    session.add(LoginAttempt(email=email, created_at=now))
    session.commit()
    attempts = (
        session.query(func.count(LoginAttempt.id))
        .filter(LoginAttempt.email == email, LoginAttempt.created_at >= since)
        .scalar()
    )
    if attempts > MAX_FAILED_LOGINS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed sign-in attempts. Try again in 15 minutes.",
            headers={"Retry-After": str(int(LOCKOUT.total_seconds()))},
        )


def clear_login_attempts(email: str, session: Session) -> None:
    """A successful sign-in forgets that email's attempts. Caller commits."""
    session.query(LoginAttempt).filter(LoginAttempt.email == email).delete(synchronize_session=False)


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
    if user.sessions_valid_after is not None:
        issued = datetime.fromtimestamp(payload["iat"], timezone.utc).replace(tzinfo=None)
        if issued < user.sessions_valid_after:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session revoked")
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

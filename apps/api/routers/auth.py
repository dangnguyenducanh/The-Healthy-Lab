from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from auth import (
    REFRESH_COOKIE,
    SessionEnded,
    authenticate,
    begin_login_attempt,
    clear_login_attempts,
    clear_session_cookies,
    get_current_user,
    hash_password,
    issue_session,
    require_csrf_header,
    revoke_session,
    rotate_session,
)
from database import get_session
from models import Membership, User
from schemas import LoginRequest, UserCreate, UserRead


router = APIRouter()


@router.post("/auth/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(data: UserCreate, response: Response, session: Session = Depends(get_session)):
    email = data.email.strip().lower()
    if session.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user = User(
        name=data.name.strip(),
        email=email,
        password_hash=hash_password(data.password),
        role="customer",
        phone=data.phone,
        address=data.address,
    )
    session.add(user)
    session.flush()
    session.add(Membership(user_id=user.id, points=0, tier="bronze"))
    issue_session(user, response, session)
    session.commit()
    session.refresh(user)
    return user


@router.post("/auth/login", response_model=UserRead)
def login(data: LoginRequest, response: Response, session: Session = Depends(get_session)):
    email = data.email.strip().lower()
    begin_login_attempt(email, session)
    user = authenticate(email, data.password, session)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    clear_login_attempts(email, session)
    issue_session(user, response, session)
    session.commit()
    return user


@router.post("/auth/refresh", response_model=UserRead)
def refresh(request: Request, response: Response, session: Session = Depends(get_session)):
    require_csrf_header(request)
    token = request.cookies.get(REFRESH_COOKIE)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not signed in")
    try:
        return rotate_session(token, response, session)
    except SessionEnded as exc:
        # Raising would drop the cookie headers, so answer directly and clear the session cookies.
        ended = JSONResponse({"detail": exc.detail}, status_code=exc.status_code)
        clear_session_cookies(ended)
        return ended


@router.post("/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request, response: Response, session: Session = Depends(get_session)):
    require_csrf_header(request)
    revoke_session(request.cookies.get(REFRESH_COOKIE), session)
    clear_session_cookies(response)


@router.get("/auth/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)):
    return current_user

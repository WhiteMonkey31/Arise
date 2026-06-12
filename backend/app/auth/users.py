from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.config import settings
from app.db.database import get_session
from app.db.models import Organization, User, UserRole
from app.logger import get_logger

logger = get_logger("auth")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")
ALGORITHM = "HS256"

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    payload = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    payload["exp"] = expire
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    org_id: str
    role: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    org_name: str
    role: UserRole = UserRole.BID_MANAGER


class UserResponse(BaseModel):
    id: UUID
    email: str
    org_id: UUID
    role: UserRole
    is_active: bool
    full_name: Optional[str] = None
    google_picture: Optional[str] = None

    model_config = {"from_attributes": True}


router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(payload: RegisterRequest, session: AsyncSession = Depends(get_session)):
    existing = await session.execute(select(User).where(User.email == payload.email))
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="Email already registered")

    slug = payload.org_name.lower().replace(" ", "-")[:100]
    slug_check = await session.execute(select(Organization).where(Organization.slug == slug))
    if slug_check.scalars().first():
        slug = f"{slug}-{datetime.utcnow().strftime('%H%M%S')}"

    org = Organization(name=payload.org_name, slug=slug)
    session.add(org)
    await session.flush()
    await session.refresh(org)

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        org_id=org.id,
        role=payload.role,
        is_active=True,
    )
    session.add(user)
    await session.flush()
    await session.refresh(user)

    logger.info("User registered", email=payload.email, org_id=str(org.id))
    return UserResponse.model_validate(user)


@router.post("/token", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(select(User).where(User.email == form_data.username))
    user = result.scalars().first()

    if not user or not user.hashed_password:
        raise HTTPException(status_code=401, detail="Incorrect email or password", headers={"WWW-Authenticate": "Bearer"})
    if not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password", headers={"WWW-Authenticate": "Bearer"})
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is inactive")

    token = create_access_token({"sub": str(user.id), "org_id": str(user.org_id), "role": user.role.value})
    logger.info("User logged in", user_id=str(user.id))
    return Token(access_token=token, user_id=str(user.id), org_id=str(user.org_id), role=user.role.value)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(current_active_user)):
    return UserResponse.model_validate(current_user)


@router.put("/me", response_model=UserResponse)
async def update_me(
    full_name: Optional[str] = None,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(current_active_user),
):
    if full_name is not None:
        current_user.full_name = full_name
    session.add(current_user)
    await session.flush()
    await session.refresh(current_user)
    return UserResponse.model_validate(current_user)


# Google OAuth
@router.get("/google/login")
async def google_login():
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=501, detail="Google OAuth not configured")
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
    }
    query = "&".join(f"{k}={v}" for k, v in params.items())
    return RedirectResponse(f"{GOOGLE_AUTH_URL}?{query}")


@router.get("/google/callback", response_model=Token)
async def google_callback(code: str, session: AsyncSession = Depends(get_session)):
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=501, detail="Google OAuth not configured")

    # Exchange code for tokens
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(GOOGLE_TOKEN_URL, data={
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        })
        if token_resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Google token exchange failed")

        access_token = token_resp.json().get("access_token")
        user_resp = await client.get(GOOGLE_USERINFO_URL, headers={"Authorization": f"Bearer {access_token}"})
        if user_resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to fetch Google user info")

    google_user = user_resp.json()
    google_id = google_user.get("sub")
    email = google_user.get("email")
    name = google_user.get("name")
    picture = google_user.get("picture")

    if not email:
        raise HTTPException(status_code=400, detail="No email from Google")

    # Find or create user
    result = await session.execute(select(User).where(User.google_id == google_id))
    user = result.scalars().first()

    if not user:
        # Try matching by email
        email_result = await session.execute(select(User).where(User.email == email))
        user = email_result.scalars().first()

    if user:
        # Update Google fields if first OAuth login
        user.google_id = google_id
        user.google_picture = picture
        if name and not user.full_name:
            user.full_name = name
        session.add(user)
    else:
        # Brand-new user — create an org for them
        slug_base = email.split("@")[0].lower().replace(".", "-")[:80]
        slug = slug_base
        slug_check = await session.execute(select(Organization).where(Organization.slug == slug))
        if slug_check.scalars().first():
            slug = f"{slug_base}-{datetime.utcnow().strftime('%H%M%S')}"

        org = Organization(name=name or email, slug=slug)
        session.add(org)
        await session.flush()
        await session.refresh(org)

        user = User(
            email=email,
            org_id=org.id,
            role=UserRole.BID_MANAGER,
            is_active=True,
            google_id=google_id,
            google_picture=picture,
            full_name=name,
        )
        session.add(user)
        await session.flush()
        await session.refresh(user)

    await session.commit()
    token = create_access_token({"sub": str(user.id), "org_id": str(user.org_id), "role": user.role.value})
    logger.info("Google OAuth login", user_id=str(user.id), email=email)
    return Token(access_token=token, user_id=str(user.id), org_id=str(user.org_id), role=user.role.value)


async def current_active_user(
    token: str = Depends(oauth2_scheme),
    session: AsyncSession = Depends(get_session),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = await session.get(User, UUID(user_id))
    if not user:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user

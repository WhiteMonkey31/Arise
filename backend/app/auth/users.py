from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
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

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is inactive")

    token = create_access_token({
        "sub": str(user.id),
        "org_id": str(user.org_id),
        "role": user.role.value,
    })
    logger.info("User logged in", user_id=str(user.id))
    return Token(access_token=token, user_id=str(user.id), org_id=str(user.org_id), role=user.role.value)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(current_active_user)):
    return UserResponse.model_validate(current_user)


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

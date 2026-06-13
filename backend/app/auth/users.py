from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.database import get_db
from app.db.models import Organization, User, UserRole
from app.db.repository import DbSession, db_create, db_get_by_id, db_query
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
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
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
async def register(payload: RegisterRequest, session: DbSession | None = Depends(get_db)):
    existing = await db_query(User, session, filters=[("email", "==", payload.email)])
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    slug = payload.org_name.lower().replace(" ", "-")[:100]
    slug_check = await db_query(session, Organization, filters=[("slug", "==", slug)])
    if slug_check:
        slug = f"{slug}-{datetime.now(timezone.utc).strftime('%H%M%S')}"

    org = Organization(name=payload.org_name, slug=slug)
    org = await db_create(session, org)

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        org_id=UUID(str(org["id"] if isinstance(org, dict) else org.id)),
        role=payload.role,
        is_active=True,
    )
    user = await db_create(session, user)

    logger.info("User registered", email=payload.email, org_id=str(org["id"] if isinstance(org, dict) else org.id))
    return UserResponse.model_validate(user)


@router.post("/token", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: DbSession | None = Depends(get_db),
):
    users = await db_query(session, User, filters=[("email", "==", form_data.username)])
    user = users[0] if users else None

    if not user or not verify_password(form_data.password, user["hashed_password"] if isinstance(user, dict) else user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    is_active = user["is_active"] if isinstance(user, dict) else user.is_active
    if not is_active:
        raise HTTPException(status_code=400, detail="Account is inactive")

    user_id = str(user["id"] if isinstance(user, dict) else user.id)
    org_id = str(user["org_id"] if isinstance(user, dict) else user.org_id)
    role = user["role"] if isinstance(user, dict) else user.role.value
    token = create_access_token({
        "sub": user_id,
        "org_id": org_id,
        "role": role,
    })
    logger.info("User logged in", user_id=user_id)
    return Token(access_token=token, user_id=user_id, org_id=org_id, role=role)


async def current_active_user(
    token: str = Depends(oauth2_scheme),
    session: DbSession | None = Depends(get_db),
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

    user = await db_get_by_id(session, User, UUID(user_id))
    if not user:
        raise credentials_exception
    is_active = user["is_active"] if isinstance(user, dict) else user.is_active
    if not is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(current_active_user)):
    return UserResponse.model_validate(current_user)

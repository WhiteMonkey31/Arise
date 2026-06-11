from typing import List

from fastapi import Depends, HTTPException, status

from app.auth.users import current_active_user
from app.db.models import User, UserRole
from app.logger import get_logger

logger = get_logger("roles")


def require_role(roles: List[UserRole]):
    async def _check(current_user: User = Depends(current_active_user)) -> User:
        if current_user.role not in roles:
            logger.warning("Access denied", user_id=str(current_user.id), role=current_user.role)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Required roles: {[r.value for r in roles]}",
            )
        return current_user
    return _check


require_admin = require_role([UserRole.ADMIN])
require_bid_manager = require_role([UserRole.ADMIN, UserRole.BID_MANAGER])
require_reviewer = require_role([UserRole.ADMIN, UserRole.BID_MANAGER, UserRole.REVIEWER])

from fastapi import Depends, HTTPException, status

from app.models import User, UserRole
from app.security import get_current_user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")
    return current_user


def require_manager_or_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in {UserRole.admin, UserRole.manager}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Manager role required")
    return current_user


def require_admin_or_hr_manager(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in {UserRole.admin, UserRole.hr_manager}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="HR manager role required")
    return current_user


def require_hr_tablet_or_above(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in {UserRole.admin, UserRole.hr_manager, UserRole.hr_tablet}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="HR tablet role required")
    return current_user

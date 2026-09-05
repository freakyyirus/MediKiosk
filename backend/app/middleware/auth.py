"""
Dependencies for FastAPI routes (e.g. Current User extraction).
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError

from app.utils.security import verify_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user_token(token: str = Depends(oauth2_scheme)) -> dict:
    """Validate JWT token and return the payload."""
    payload = verify_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload


async def get_current_active_user(token_payload: dict = Depends(get_current_user_token)) -> dict:
    """Ensure the user is active/authorized (mock implementation)."""
    # Here you would typically query the DB for the user and check if active
    return token_payload


async def require_role(role: str):
    """Dependency generator to require a specific role."""
    async def role_checker(user: dict = Depends(get_current_active_user)):
        user_role = user.get("role")
        if user_role != role and user_role != "super_admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions",
            )
        return user
    return role_checker

"""
Authentication dependencies — Clerk-first API surface (``app.core.auth``).

This module is the public, author-respecting entry point for the new feature
routers (outreach, interviews, visits). It exposes the three names used by the
implementation plan:

* ``verify_clerk_token`` — FastAPI dependency → verified identity claims
  (``{"sub": <clerk-user-uuid>, ...}``).
* ``require_staff`` — FastAPI dependency → any staff-derived role.
* ``require_role(role)`` — dependency factory for a specific role.

Rather than maintaining a second JWT verifier, it delegates to the proven
chain in ``app.middleware.clerk_auth._verify``:

    Supabase (active production identity)
      -> Clerk JWKS (RS256, activated when CLERK_ISSUER/CLERK_JWKS_URL are set)
      -> legacy dev JWT (offline/tests only, never in production)

Clerk tokens are validated against the project's *JWKS* key that signed the
token (``kid``-matched), so a Clerk-issued Access Token presented as
``Authorization: Bearer <token>`` verifies out-of-the-box once the Clerk
instance URL is configured in the environment.
"""

from __future__ import annotations

from fastapi import Depends, HTTPException, status

from app.middleware.clerk_auth import get_current_user

# Staff-facing backend roles (mirrors middleware/clerk_auth.require_staff).
_STAFF_ROLES = {"admin", "physician", "super_admin"}


async def verify_clerk_token(claims: dict = Depends(get_current_user)) -> dict:
    """Dependency: return the verified Clerk/Supabase identity claims."""
    return claims


async def require_staff(claims: dict = Depends(get_current_user)) -> dict:
    """Dependency: any authenticated staff role (admin/physician/super_admin)."""
    user_role = claims.get("role") or claims.get("typ")
    if user_role not in _STAFF_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Staff credentials required",
        )
    return claims


def require_role(role: str, *, super_admin_allowed: bool = True):
    """Dependency factory requiring a specific role claim."""

    async def role_checker(claims: dict = Depends(get_current_user)) -> dict:
        user_role = claims.get("role") or claims.get("typ")
        if user_role != role and not (super_admin_allowed and user_role == "super_admin"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires {role} role",
            )
        return claims

    return role_checker

"""
Clerk authentication — single source of truth for web/staff auth.

Verifies Clerk-issued JWTs against the Clerk JWKS endpoint (RS256), replacing
the legacy custom signed HS256 JWTs produced by the mock ``/auth/login``.

Engineers' role is carried in the Clerk JWT's custom claim ``role``
(configured in the Clerk JWT template / session claims); ``sub`` is the unique
Clerk user id.

Graceful degradation (offline / local demo):
  * If CLERK_ISSUER is not set, we fall back to the legacy ``verify_access_token``
    using the custom JWT secret so existing mock flows (tests, local dev, the
    old login endpoint) keep working until Clerk is fully wired.
  * JWT verification is always synchronous-verified against cached JWKS; the
    JWKS is refreshed lazily with a background-safe re-fetch on expiry.
"""

from __future__ import annotations

import logging
import time

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwk, jwt
from jose.constants import ALGORITHMS

from app.config import get_settings
from app.utils.security import verify_access_token

logger = logging.getLogger("medikiosk.auth.clerk")

settings = get_settings()

bearer_scheme = HTTPBearer(auto_error=False)


# ---- JWKS cache ----
_jwks_cache: dict | None = None
_jwks_fetched_at = 0.0
_JWKS_TTL = 3600  # seconds — re-fetch hourly


def _jwk_from_key(public_key: dict):
    """Resolve a JWK to a CryptographyKey usable by python-jose."""
    if public_key.get("kty") == "RSA":
        try:
            return jwk.construct(public_key, algorithm=ALGORITHMS.RS256)
        except Exception:  # pragma: no cover
            return None
    if public_key.get("kty") == "EC":
        return jwk.construct(public_key, algorithm=ALGORITHMS.ES256)
    return None


def _jwks_uri() -> str:
    if settings.clerk_jwks_url:
        return settings.clerk_jwks_url
    return f"{settings.clerk_issuer}/.well-known/jwks.json"


async def _load_jwks(force: bool = False) -> dict | None:
    global _jwks_cache, _jwks_fetched_at
    now = time.time()
    if _jwks_cache is not None and not force and (now - _jwks_fetched_at) < _JWKS_TTL:
        return _jwks_cache
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(_jwks_uri())
            resp.raise_for_status()
            _jwks_cache = resp.json()
            _jwks_fetched_at = now
            return _jwks_cache
    except Exception as exc:  # pragma: no cover - network dependent
        logger.warning("Failed to fetch Clerk JWKS from %s: %s", _jwks_uri(), exc)
        return _jwks_cache  # stale cache or None


def _decode_clerk(token: str, jwks: dict) -> dict:
    """Verify a Clerk JWT against JWKS. Returns the claims dict."""
    unverified_header = jwt.get_unverified_header(token)
    kid = unverified_header.get("kid")
    if not jwks or "keys" not in jwks:
        raise JWTError("No JWKS available")

    key = next((k for k in jwks["keys"] if k.get("kid") == kid), None)
    if key is None:
        raise JWTError("Matching JWK not found for token kid")

    public_key = _jwk_from_key(key)
    if public_key is None:
        raise JWTError("Unsupported JWK algorithm")

    claims = jwt.decode(
        token,
        public_key,
        algorithms=[ALGORITHMS.RS256, ALGORITHMS.ES256],
        audience=None,
        issuer=settings.clerk_issuer or None,
        options={"verify_aud": False},  # Clerk does not issue an aud claim by default
    )
    return claims


def _is_clerk_enabled() -> bool:
    return bool((settings.clerk_issuer or "").strip())


async def _verify(token: str) -> dict:
    """Verify a Clerk JWT first; fall back to the legacy custom JWT.

    During the transition the old mock ``/auth/login`` still issues custom
    HS256 JWTs. Clerk JWTs (RS256/ES256 via JWKS) take precedence; legacy
    fallback keeps those flows working and is logged so engineers can cut it
    over once Clerk is fully wired.
    """
    if _is_clerk_enabled():
        try:
            jwks = await _load_jwks()
            try:
                return _decode_clerk(token, jwks)
            except JWTError:
                # On verification failure, re-fetch the JWKS once (keys may
                # have rotated) and retry before falling back to legacy.
                jwks = await _load_jwks(force=True)
                if jwks:
                    return _decode_clerk(token, jwks)
                raise
        except JWTError:
            logger.warning("Clerk JWT verification failed — falling back to legacy custom JWT")
    # Legacy fallback: custom HS256 JWT (mock/local).
    payload = verify_access_token(token)
    if not payload:
        raise JWTError("Invalid legacy token")
    return payload


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict:
    """Dependency returning the verified Clerk/legacy token claims."""
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        return await _verify(credentials.credentials)
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


def require_role(role: str, *, super_admin_allowed: bool = True):
    """Dependency factory requiring a specific role claim."""

    async def role_checker(claims: dict = Depends(get_current_user)) -> dict:
        user_role = claims.get("role") or claims.get("typ")
        if user_role != role and not (super_admin_allowed and user_role == "super_admin"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions",
            )
        return claims

    return role_checker


def require_staff():
    """Dependency requiring any staff role (admin/physician/super_admin)."""

    async def staff_checker(claims: dict = Depends(get_current_user)) -> dict:
        user_role = claims.get("role") or claims.get("typ")
        if user_role not in {"admin", "physician", "super_admin"}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Staff credentials required",
            )
        return claims

    return staff_checker

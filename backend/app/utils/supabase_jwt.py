"""
Supabase Auth verification — the single real identity provider.

The frontend authenticates with Supabase Auth (email/password) and sends the
user's access token as ``Authorization: Bearer``. The backend never trusts its
own signing keys for production auth: every token is validated against the
Supabase project's GoTrue service (``GET {project}/auth/v1/user``), which
resolves the real user and their metadata.

Roles travel on the Supabase user's ``user_metadata.role`` and are mapped to
backend roles:

  * patient        -> patient
  * doctor         -> physician
  * hospital_admin -> admin
  * super_admin    -> super_admin

Results are cached per-token until the JWT's ``exp`` (clamped), so we don't
hit GoTrue on every request. Network failures fail closed (reject the token).
"""

from __future__ import annotations

import hashlib
import logging
import time
from typing import Any

import httpx
from jose import jwt

from app.config import get_settings

logger = logging.getLogger("medikiosk.auth.supabase")

settings = get_settings()

_cache: dict[str, tuple[float, dict]] = {}
_MAX_CACHE_TTL = 300  # seconds

# Backend roles that map 1:1 from a Supabase sign-up role.
_ROLE_MAP = {
    "patient": "patient",
    "doctor": "physician",
    "hospital_admin": "admin",
    "admin": "admin",
    "physician": "physician",
    "super_admin": "super_admin",
}


def supabase_auth_enabled() -> bool:
    """True when a Supabase project URL + anon key are configured."""
    return bool((settings.supabase_url or "").strip() and (settings.supabase_anon_key or "").strip())


def map_supabase_role(metadata: dict[str, Any] | None, default: str = "patient") -> str:
    """Map a Supabase ``user_metadata.role`` to the backend role vocabulary."""
    raw = (metadata or {}).get("role")
    return _ROLE_MAP.get(str(raw or "").strip().lower(), default)


def _token_key(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _token_exp(token: str) -> float:
    """Best-effort ``exp`` from the unverified JWT (used only for cache TTL)."""
    try:
        claims = jwt.get_unverified_claims(token)
        exp = claims.get("exp")
        return float(exp) if isinstance(exp, (int, float)) else float("inf")
    except Exception:  # pragma: no cover - malformed token edge case
        return float("inf")


async def verify_supabase_token(token: str) -> dict[str, Any] | None:
    """Validate a Supabase session token server-side.

    Returns a claims dict (``sub``, ``email``, ``role``, ``aud``, ``exp``,
    ``iss``) or None when the token is invalid/unverifiable (fail closed).
    """
    if not token:
        return None

    key = _token_key(token)
    now = time.time()

    # Cache hit?
    hit = _cache.get(key)
    if hit and hit[0] > now:
        return hit[1]

    url = f"{settings.supabase_url.rstrip('/')}/auth/v1/user"
    headers = {
        "Authorization": f"Bearer {token}",
        "apikey": settings.supabase_anon_key,
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url, headers=headers)
        if resp.status_code != 200:
            return None
        user = resp.json()
    except Exception as exc:  # pragma: no cover - network dependent
        logger.warning("Supabase token verification failed (network): %s", exc)
        return None

    exp = _token_exp(token)
    if exp != float("inf"):
        ttl = min(max(exp - now, 1), _MAX_CACHE_TTL)
    else:
        ttl = 60
    claims = {
        "sub": str(user.get("id") or ""),
        "email": user.get("email") or "",
        "role": map_supabase_role(user.get("user_metadata")),
        "aud": user.get("aud"),
        "iat": now,
        "exp": exp,
        "iss": "supabase",
    }
    _cache[key] = (now + ttl, claims)
    return claims

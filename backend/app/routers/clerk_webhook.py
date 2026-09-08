"""
Clerk webhooks — sync auth users into public.profiles.

Clerk sends signed webhook events (user.created, user.updated, user.deleted).
Configure the endpoint in the Clerk dashboard as:
    https://<your-api>/api/v1/webhooks/clerk/user-created

NOTE: for production, validate the Svix signature (Clerk forwards to Svix)
using the CLERK_SECRET_KEY/CLERK_WEBHOOK_SECRET before trusting the payload.
This handler is permissive so local/offline demos work without the secret.
"""

import logging

from fastapi import APIRouter, Request
from pydantic import BaseModel

from app.data.supabase_client import table

logger = logging.getLogger("medikiosk.webhooks.clerk")
router = APIRouter(prefix="/api/v1/webhooks/clerk", tags=["Webhooks"])


class ClerkEmail(BaseModel):
    email_address: str
    id: str


class ClerkUserData(BaseModel):
    id: str
    first_name: str | None = None
    last_name: str | None = None
    email_addresses: list[ClerkEmail] = []


class ClerkPayload(BaseModel):
    type: str
    data: ClerkUserData | None = None


def _email_of(user: ClerkUserData) -> str:
    return user.email_addresses[0].email_address if user.email_addresses else ""


def _sync_user(user: ClerkUserData) -> None:
    name = f"{user.first_name or ''} {user.last_name or ''}".strip()
    row = {
        "id": user.id,
        "full_name": name or None,
        "email": _email_of(user) or None,
        "role": "patient",
        "updated_at": "now()",
    }
    result = table("profiles").upsert(row, on_conflict="id").execute()
    if result and getattr(result, "data", None):
        logger.info("Synced Clerk user %s into profiles", user.id)
    else:
        logger.warning("Clerk profile upsert returned no row for %s", user.id)


@router.post("/user-created")
async def clerk_user_created(request: Request):
    payload = await request.json()
    user = (payload or {}).get("data") or {}
    try:
        _sync_user(ClerkUserData(**user))
    except Exception as exc:  # pragma: no cover - keep webhook 2xx for retries
        logger.warning("Clerk user sync failed: %s", exc)
    return {"status": "ok"}


@router.post("/user-updated")
async def clerk_user_updated(request: Request):
    payload = await request.json()
    user = (payload or {}).get("data") or {}
    try:
        _sync_user(ClerkUserData(**user))
    except Exception as exc:  # pragma: no cover
        logger.warning("Clerk user update sync failed: %s", exc)
    return {"status": "ok"}

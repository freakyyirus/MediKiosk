"""
Document byte storage — Supabase Storage first, /tmp fallback for offline dev.

``store_document_bytes`` routes a validated upload blob into the private
Supabase bucket (``medikiosk-documents``) when the service role is configured,
otherwise it saves to a local temp dir and logs the degraded mode. Returns the
stored path that is persisted on the Document row.
"""

from __future__ import annotations

import logging
import os
import uuid

from app.data import supabase_client

logger = logging.getLogger("medikiosk.storage.documents")


async def store_document_bytes(
    session_id: int,
    file_name: str,
    file_bytes: bytes,
    content_type: str,
    subdir: str = "/tmp/medikiosk_uploads",
) -> str:
    """Persist a validated upload and return its stored path."""
    ext = file_name.rsplit(".", 1)[-1].lower() if "." in file_name else "bin"
    object_path = f"documents/session-{session_id}/{uuid.uuid4().hex}.{ext}"

    if supabase_client.is_available() and supabase_client.bucket():
        try:
            supabase_client.upload_file(object_path, file_bytes, content_type)
            logger.info("Stored document blob in Supabase: %s", object_path)
            return object_path
        except Exception as exc:  # pragma: no cover - network dependent
            logger.warning("Supabase upload failed (%s); falling back to local storage", exc)

    os.makedirs(subdir, exist_ok=True)
    stored_path = os.path.join(subdir, os.path.basename(object_path))
    with open(stored_path, "wb") as f:
        f.write(file_bytes)
    logger.warning("Stored document blob locally (degraded): %s", stored_path)
    return stored_path

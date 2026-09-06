"""
Document upload and OCR endpoints.

Staff-facing:
  * GET /api/v1/documents/session/{session_id}  -> require_staff()

Kiosk-facing (intentionally public — anonymous walk-up):
  * POST /api/v1/documents/upload               -> session-bound ownership

Hardening rules:
  * session_id is REQUIRED and ownership is enforced (the uploaded patient_id
    must equal the session's patient, closing the cross-patient upload hole).
  * Size capped (10 MB) and MIME type + extension allowlisted (PDF/images).
  * Files are stored in Supabase Storage (private bucket) when configured,
    with a local /tmp fallback for offline dev.
"""

import logging

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.ocr_pipeline import OCRPipeline
from app.database import get_db
from app.middleware.clerk_auth import require_staff
from app.models.document import Document
from app.models.session import Session
from app.schemas.schemas import DocumentResponse, DocumentUploadResponse
from app.utils.supabase_storage import store_document_bytes

logger = logging.getLogger("medikiosk.routers.documents")
router = APIRouter(prefix="/api/v1/documents", tags=["Documents & OCR"])
ocr_pipeline = OCRPipeline()

UPLOAD_DIR = "/tmp/medikiosk_uploads"
MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MB

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/heic",
    "image/heif",
}
ALLOWED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg", "webp", "heic", "heif"}


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    patient_id: int = Form(..., description="Must match session.patient_id"),
    session_id: int = Form(..., description="Required; anchors ownership"),
    doc_type: str = Form("other"),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Upload a medical document, run OCR/NER extraction, and persist to DB."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="Missing file name")
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported media type {file.content_type or 'unknown'}",
        )
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=415, detail=f"Unsupported file extension .{ext}")

    # Ownership: upload must belong to the session's patient.
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.patient_id and session.patient_id != patient_id:
        raise HTTPException(
            status_code=403,
            detail="patient_id does not match the session's patient",
        )

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(file_bytes) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds {MAX_UPLOAD_BYTES // (1024 * 1024)} MB limit",
        )

    # Storage: Supabase Storage first; /tmp fallback for offline dev.
    stored_path = await store_document_bytes(
        session_id=session_id,
        file_name=file.filename,
        file_bytes=file_bytes,
        content_type=file.content_type,
        subdir=UPLOAD_DIR,
    )

    ocr_result = await ocr_pipeline.process_image(file_bytes, file.content_type or "")

    document = Document(
        session_id=session_id,
        patient_id=session.patient_id or patient_id,
        file_name=file.filename,
        file_path=stored_path,
        file_size_bytes=len(file_bytes),
        mime_type=file.content_type,
        document_type=doc_type if doc_type != "other" else None,
        ocr_raw_text=ocr_result.get("ocr_raw_text"),
        ocr_confidence=ocr_result.get("ocr_confidence"),
        extracted_diagnoses=ocr_result.get("extracted_diagnoses"),
        extracted_medications=ocr_result.get("extracted_medications"),
        extracted_lab_results=ocr_result.get("extracted_lab_results"),
        extracted_vitals=ocr_result.get("extracted_vitals"),
        processing_status="completed",
    )
    db.add(document)
    await db.flush()
    await db.refresh(document)

    return DocumentUploadResponse(
        document_id=document.id,
        processing_status="completed",
        estimated_time=0,
    )


@router.get("/session/{session_id}", response_model=list[DocumentResponse])
async def list_session_documents(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_staff()),
):
    """List all documents for a session (staff only — PHI)."""
    result = await db.execute(
        select(Document).where(Document.session_id == session_id).order_by(Document.created_at.asc())
    )
    return result.scalars().all()

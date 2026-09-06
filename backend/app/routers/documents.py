"""
Document upload and OCR endpoints.
"""

import logging
import os
import uuid

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.ocr_pipeline import OCRPipeline
from app.database import get_db
from app.models.document import Document
from app.schemas.schemas import DocumentResponse, DocumentUploadResponse

logger = logging.getLogger("medikiosk.routers.documents")
router = APIRouter(prefix="/api/v1/documents", tags=["Documents & OCR"])
ocr_pipeline = OCRPipeline()

UPLOAD_DIR = "/tmp/medikiosk_uploads"


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    patient_id: int = Form(...),
    session_id: int = Form(None),
    doc_type: str = Form("other"),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload a medical document, run OCR/NER extraction, and persist to DB.
    """
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    file_bytes = await file.read()
    file_ext = file.filename.rsplit(".", 1)[-1] if "." in (file.filename or "") else "bin"
    stored_name = f"{uuid.uuid4().hex}.{file_ext}"
    stored_path = os.path.join(UPLOAD_DIR, stored_name)

    with open(stored_path, "wb") as f:
        f.write(file_bytes)

    ocr_result = await ocr_pipeline.process_image(file_bytes, file.content_type or "")

    document = Document(
        session_id=session_id,
        patient_id=patient_id,
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
):
    """List all documents for a session."""
    result = await db.execute(select(Document).where(Document.session_id == session_id).order_by(Document.created_at.asc()))
    return result.scalars().all()

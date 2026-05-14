from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Device
from app.schemas.invoice import InvoiceRequestType, InvoiceUploadResponse
from app.security import get_current_device
from app.services.invoice_service import MAX_INVOICE_FILE_SIZE, upload_invoice
from app.services.store_request_service import StoreRequestError

router = APIRouter(prefix="/invoices", tags=["invoices"])


@router.post("/upload", response_model=InvoiceUploadResponse)
async def upload_invoice_endpoint(
    request_type: InvoiceRequestType = Form(...),
    employee_id: int | None = Form(default=None),
    comment: str | None = Form(default=None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_device: Device = Depends(get_current_device),
) -> InvoiceUploadResponse:
    file_bytes = await file.read(MAX_INVOICE_FILE_SIZE + 1)
    try:
        result = upload_invoice(
            db,
            current_device,
            request_type,
            employee_id,
            comment.strip() if comment else None,
            file.filename,
            file.content_type or "",
            file_bytes,
        )
    except StoreRequestError as exc:
        return InvoiceUploadResponse(ok=False, error=exc.code, message=exc.message)

    return InvoiceUploadResponse(
        ok=True,
        status=result.status,
        request_type=result.request_type,
    )

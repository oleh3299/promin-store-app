import logging

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Device
from app.schemas.photo_report import PhotoReportItemUploadResponse, PhotoReportTemplateResponse, PhotoReportUploadResponse
from app.security import get_current_device
from app.services.invoice_service import MAX_INVOICE_FILE_SIZE
from app.services.photo_report_service import create_photo_report, get_photo_report_template, upload_photo_report_item
from app.services.store_request_service import StoreRequestError

router = APIRouter(prefix="/photo-reports", tags=["photo-reports"])
logger = logging.getLogger(__name__)


@router.get("/template", response_model=PhotoReportTemplateResponse)
def get_template(
    db: Session = Depends(get_db),
    current_device: Device = Depends(get_current_device),
) -> PhotoReportTemplateResponse:
    return PhotoReportTemplateResponse(items=get_photo_report_template(db, current_device))


@router.post("", response_model=PhotoReportUploadResponse)
async def submit_photo_report(
    item_ids: str = Form(...),
    employee_id: int | None = Form(default=None),
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_device: Device = Depends(get_current_device),
) -> PhotoReportUploadResponse:
    logger.info(
        "photo_report_submit_started",
        extra={
            "store_id": current_device.store_id,
            "device_id": current_device.id,
            "files_count": len(files),
            "template_count": len(get_photo_report_template(db, current_device)),
        },
    )
    file_payloads = [
        (
            file.filename,
            file.content_type or "",
            await file.read(MAX_INVOICE_FILE_SIZE + 1),
        )
        for file in files
    ]

    try:
        result = create_photo_report(db, current_device, employee_id, item_ids, file_payloads)
    except StoreRequestError as exc:
        return PhotoReportUploadResponse(ok=False, error=exc.code, message=exc.message)

    return PhotoReportUploadResponse(
        ok=True,
        report_id=result.report_id,
        items_done=result.items_done,
        items_total=result.items_total,
        status=result.status,
    )


@router.post("/item", response_model=PhotoReportItemUploadResponse)
async def submit_photo_report_item(
    item_id: int = Form(...),
    report_id: int | None = Form(default=None),
    employee_id: int | None = Form(default=None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_device: Device = Depends(get_current_device),
) -> PhotoReportItemUploadResponse:
    file_bytes = await file.read(MAX_INVOICE_FILE_SIZE + 1)

    try:
        result = upload_photo_report_item(
            db,
            current_device,
            employee_id,
            report_id,
            item_id,
            file.filename,
            file.content_type or "",
            file_bytes,
        )
    except StoreRequestError as exc:
        return PhotoReportItemUploadResponse(ok=False, error=exc.code, message=exc.message)

    return PhotoReportItemUploadResponse(
        ok=True,
        report_id=result.report_id,
        item_id=result.item_id,
        items_done=result.items_done,
        items_total=result.items_total,
        status=result.status,
    )

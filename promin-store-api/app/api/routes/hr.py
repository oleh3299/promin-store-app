from html import escape

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import HTMLResponse
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import require_admin_or_hr_manager, require_hr_tablet_or_above
from app.db import get_db
from app.models import HRCandidate, User
from app.schemas.hr import (
    HRCandidateCreate,
    HRCandidateListResponse,
    HRCandidateRead,
    HRCandidateSendResponse,
    HRCandidateUpdate,
)
from app.services.hr_service import (
    HRServiceError,
    candidate_badge_code,
    candidate_to_read,
    create_candidate,
    send_candidate_to_one_c,
    update_candidate,
)

router = APIRouter(prefix="/hr", tags=["hr"])


def _get_candidate(db: Session, candidate_id: int) -> HRCandidate:
    candidate = db.scalar(
        select(HRCandidate)
        .options(selectinload(HRCandidate.documents))
        .where(HRCandidate.id == candidate_id),
    )
    if candidate is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="candidate_not_found")
    return candidate


@router.get("/candidates", response_model=HRCandidateListResponse)
def list_candidates(
    status_filter: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin_or_hr_manager),
) -> HRCandidateListResponse:
    statement = (
        select(HRCandidate)
        .options(selectinload(HRCandidate.documents))
        .order_by(HRCandidate.created_at.desc(), HRCandidate.id.desc())
    )
    if status_filter:
        statuses = [item.strip() for item in status_filter.split(",") if item.strip()]
        if statuses:
            statement = statement.where(HRCandidate.sync_status.in_(statuses))

    candidates = list(db.scalars(statement))
    return HRCandidateListResponse(items=[candidate_to_read(candidate) for candidate in candidates])


@router.get("/candidates/{candidate_id}", response_model=HRCandidateRead)
def get_candidate(
    candidate_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin_or_hr_manager),
) -> HRCandidateRead:
    return candidate_to_read(_get_candidate(db, candidate_id))


@router.post("/candidates", response_model=HRCandidateRead)
def create_hr_candidate(
    payload: HRCandidateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_hr_tablet_or_above),
) -> HRCandidateRead:
    try:
        candidate = create_candidate(db, payload, current_user)
    except HRServiceError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.code) from exc
    return candidate_to_read(candidate)


@router.patch("/candidates/{candidate_id}", response_model=HRCandidateRead)
def update_hr_candidate(
    candidate_id: int,
    payload: HRCandidateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_hr_manager),
) -> HRCandidateRead:
    candidate = _get_candidate(db, candidate_id)
    try:
        candidate = update_candidate(db, candidate, payload, current_user)
    except HRServiceError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.code) from exc
    return candidate_to_read(candidate)


@router.post("/candidates/{candidate_id}/send-to-1c", response_model=HRCandidateSendResponse)
def send_hr_candidate_to_one_c(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_hr_manager),
) -> HRCandidateSendResponse:
    candidate = _get_candidate(db, candidate_id)
    try:
        candidate = send_candidate_to_one_c(db, candidate, current_user)
    except HRServiceError as exc:
        return HRCandidateSendResponse(ok=False, status=candidate.sync_status, error=exc.code, message=exc.message)
    return HRCandidateSendResponse(ok=True, status=candidate.sync_status)


def _qr_pattern(value: str) -> str:
    bits = "".join(f"{byte:08b}" for byte in value.encode("utf-8"))
    cells: list[str] = []
    size = 21
    for y in range(size):
        for x in range(size):
            finder = (x < 7 and y < 7) or (x >= 14 and y < 7) or (x < 7 and y >= 14)
            if finder:
                border = x in {0, 6, 14, 20} or y in {0, 6, 14, 20}
                inner = (2 <= x % 14 <= 4) and (2 <= y % 14 <= 4)
                filled = border or inner
            else:
                index = (x * 17 + y * 31) % max(len(bits), 1)
                filled = bits[index] == "1"
            if filled:
                cells.append(f'<rect x="{x}" y="{y}" width="1" height="1" />')
    return "".join(cells)


@router.get("/candidates/{candidate_id}/badge", response_class=HTMLResponse)
def get_candidate_badge(
    candidate_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_hr_tablet_or_above),
) -> HTMLResponse:
    candidate = _get_candidate(db, candidate_id)
    badge_code = candidate.imported_employee.barcode if candidate.imported_employee else candidate_badge_code(candidate)
    html = f"""
<!doctype html>
<html lang="uk">
<head>
  <meta charset="utf-8" />
  <title>Бейдж {escape(str(candidate))}</title>
  <style>
    @page {{ size: 69mm 111mm; margin: 0; }}
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      background: #f5f6f4;
      color: #0f3d2e;
      font-family: Arial, sans-serif;
    }}
    .badge {{
      width: 69mm;
      height: 111mm;
      padding: 9mm 7mm;
      background: #fff;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      border: 1px solid #d8ded8;
    }}
    .brand {{
      width: 100%;
      padding-bottom: 4mm;
      border-bottom: 1px solid #d8ded8;
      font-size: 12pt;
      font-weight: 700;
      letter-spacing: .08em;
      text-align: center;
    }}
    .name {{
      width: 100%;
      text-align: center;
      line-height: 1.12;
    }}
    .last {{ font-size: 20pt; font-weight: 800; text-transform: uppercase; }}
    .first {{ margin-top: 3mm; font-size: 13pt; font-weight: 600; }}
    .position {{ margin-top: 5mm; font-size: 11pt; color: #486258; }}
    .qr {{
      width: 30mm;
      height: 30mm;
      padding: 2mm;
      border: 1px solid #d8ded8;
      background: #fff;
    }}
    .qr svg {{ width: 100%; height: 100%; fill: #0f3d2e; }}
    .code {{ font-size: 8pt; color: #6a756f; }}
    @media print {{
      body {{ background: #fff; }}
      .badge {{ border: none; }}
    }}
  </style>
</head>
<body>
  <section class="badge">
    <div class="brand">ПРОМІНЬ</div>
    <div class="name">
      <div class="last">{escape(candidate.last_name)}</div>
      <div class="first">{escape(" ".join(part for part in [candidate.first_name, candidate.middle_name] if part))}</div>
      <div class="position">{escape(candidate.position or "Працівник магазину")}</div>
    </div>
    <div class="qr" aria-label="QR код бейджа">
      <svg viewBox="0 0 21 21" role="img">{_qr_pattern(badge_code)}</svg>
    </div>
    <div class="code">{escape(badge_code)}</div>
  </section>
  <script>window.addEventListener("load", () => window.print());</script>
</body>
</html>
"""
    return HTMLResponse(html)

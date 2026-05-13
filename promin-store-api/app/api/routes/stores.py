from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Store
from app.schemas.store import StoreRead

router = APIRouter(prefix="/stores", tags=["stores"])


@router.get("", response_model=list[StoreRead])
def list_stores(db: Session = Depends(get_db)) -> list[Store]:
    return list(
        db.scalars(
            select(Store).where(Store.is_active.is_(True)).order_by(Store.code),
        ),
    )

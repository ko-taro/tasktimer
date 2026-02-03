from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from app.database import get_conn

router = APIRouter(prefix="/api/categories", tags=["categories"])


class CategoryResponse(BaseModel):
    key: str
    label: str
    color: str


@router.get("")
def list_categories() -> list[CategoryResponse]:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT key, label, color FROM categories ORDER BY sort_order")
        return [CategoryResponse(**dict(row)) for row in cur.fetchall()]

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from app.database import get_conn

router = APIRouter(prefix="/api/boards", tags=["boards"])


class BoardResponse(BaseModel):
    id: str
    label: str
    color: str


@router.get("")
def list_boards() -> list[BoardResponse]:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT id, label, color FROM boards ORDER BY sort_order")
        return [
            BoardResponse(id=str(row["id"]), label=row["label"], color=row["color"])
            for row in cur.fetchall()
        ]

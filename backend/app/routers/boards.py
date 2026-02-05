from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.database import get_conn

router = APIRouter(prefix="/api/boards", tags=["boards"])


class BoardResponse(BaseModel):
    id: str
    label: str
    color: str


class BoardReorder(BaseModel):
    sort_order: int


@router.get("")
def list_boards() -> list[BoardResponse]:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT id, label, color FROM boards ORDER BY sort_order")
        return [
            BoardResponse(id=str(row["id"]), label=row["label"], color=row["color"])
            for row in cur.fetchall()
        ]


@router.post("/{board_id}/reorder")
def reorder_board(board_id: str, body: BoardReorder) -> BoardResponse:
    with get_conn() as conn, conn.cursor() as cur:
        # 現在のボード情報を取得
        cur.execute(
            "SELECT id, label, color, sort_order FROM boards WHERE id = %s",
            (board_id,),
        )
        current = cur.fetchone()
        if not current:
            raise HTTPException(status_code=404, detail="Board not found")

        old_sort_order = current["sort_order"]
        new_sort_order = body.sort_order

        if old_sort_order == new_sort_order:
            return BoardResponse(
                id=str(current["id"]),
                label=current["label"],
                color=current["color"],
            )

        if old_sort_order < new_sort_order:
            # 右に移動: old_sort_order < x <= new_sort_order のボードを -1
            cur.execute(
                """
                UPDATE boards
                SET sort_order = sort_order - 1
                WHERE sort_order > %s AND sort_order <= %s
                """,
                (old_sort_order, new_sort_order),
            )
        else:
            # 左に移動: new_sort_order <= x < old_sort_order のボードを +1
            cur.execute(
                """
                UPDATE boards
                SET sort_order = sort_order + 1
                WHERE sort_order >= %s AND sort_order < %s
                """,
                (new_sort_order, old_sort_order),
            )

        # ボード自体の sort_order を更新
        cur.execute(
            "UPDATE boards SET sort_order = %s WHERE id = %s",
            (new_sort_order, board_id),
        )

        conn.commit()

        return BoardResponse(
            id=str(current["id"]),
            label=current["label"],
            color=current["color"],
        )

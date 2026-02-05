from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.database import get_conn

router = APIRouter(prefix="/api/boards", tags=["boards"])


class BoardResponse(BaseModel):
    id: str
    label: str
    color: str


class BoardCreate(BaseModel):
    label: str
    color: str = "#e3f2fd"


class BoardUpdate(BaseModel):
    label: str | None = None
    color: str | None = None


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


@router.post("", status_code=201)
def create_board(body: BoardCreate) -> BoardResponse:
    with get_conn() as conn, conn.cursor() as cur:
        # 最大sort_orderを取得
        cur.execute("SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM boards")
        next_order = cur.fetchone()["next_order"]

        cur.execute(
            """
            INSERT INTO boards (label, color, sort_order)
            VALUES (%s, %s, %s)
            RETURNING id, label, color
            """,
            (body.label, body.color, next_order),
        )
        row = cur.fetchone()
        conn.commit()
        return BoardResponse(id=str(row["id"]), label=row["label"], color=row["color"])


@router.patch("/{board_id}")
def update_board(board_id: str, body: BoardUpdate) -> BoardResponse:
    update_data = body.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    set_clause = ", ".join(f"{k} = %s" for k in update_data)
    values = list(update_data.values())
    values.append(board_id)

    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            f"UPDATE boards SET {set_clause} WHERE id = %s RETURNING id, label, color",
            values,
        )
        row = cur.fetchone()
        conn.commit()
        if not row:
            raise HTTPException(status_code=404, detail="Board not found")
        return BoardResponse(id=str(row["id"]), label=row["label"], color=row["color"])


@router.delete("/{board_id}", status_code=204, response_model=None)
def delete_board(board_id: str) -> None:
    with get_conn() as conn, conn.cursor() as cur:
        # 削除するボードのsort_orderを取得
        cur.execute("SELECT sort_order FROM boards WHERE id = %s", (board_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Board not found")

        deleted_order = row["sort_order"]

        # ボードを削除（board_tasksはCASCADEで自動削除）
        cur.execute("DELETE FROM boards WHERE id = %s", (board_id,))

        # 削除されたボードより後のボードのsort_orderを-1
        cur.execute(
            "UPDATE boards SET sort_order = sort_order - 1 WHERE sort_order > %s",
            (deleted_order,),
        )
        conn.commit()


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

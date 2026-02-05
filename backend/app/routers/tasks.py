from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.database import get_conn

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


class TaskResponse(BaseModel):
    id: str
    title: str
    board_id: str
    sort_order: int
    completed: bool


class TaskCreate(BaseModel):
    title: str
    board_id: str


class TaskUpdate(BaseModel):
    title: str | None = None
    board_id: str | None = None
    sort_order: int | None = None
    completed: bool | None = None


def _row_to_task(row: Any) -> TaskResponse:
    return TaskResponse(
        id=str(row["id"]),
        title=row["title"],
        board_id=str(row["board_id"]),
        sort_order=row["sort_order"],
        completed=row["completed"],
    )


@router.get("")
def list_tasks() -> list[TaskResponse]:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("""
            SELECT t.id, t.title, t.completed,
                   bt.board_id, bt.sort_order
            FROM tasks t
            JOIN board_tasks bt ON t.id = bt.task_id
            JOIN boards b ON bt.board_id = b.id
            ORDER BY b.sort_order, bt.sort_order
        """)
        return [_row_to_task(row) for row in cur.fetchall()]


@router.post("", status_code=201)
def create_task(body: TaskCreate) -> TaskResponse:
    with get_conn() as conn, conn.cursor() as cur:
        # board_id の存在確認
        cur.execute("SELECT id FROM boards WHERE id = %s", (body.board_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=400, detail=f"Board '{body.board_id}' not found")

        # タスクを作成
        cur.execute(
            "INSERT INTO tasks (title) VALUES (%s) RETURNING *",
            (body.title,),
        )
        task_row = cur.fetchone()

        # 現在の最大 sort_order を取得
        cur.execute(
            "SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM board_tasks WHERE board_id = %s",
            (body.board_id,),
        )
        next_order = cur.fetchone()["next_order"]

        # board_tasks に追加
        cur.execute(
            "INSERT INTO board_tasks (board_id, task_id, sort_order) VALUES (%s, %s, %s)",
            (body.board_id, task_row["id"], next_order),
        )
        conn.commit()

        return TaskResponse(
            id=str(task_row["id"]),
            title=task_row["title"],
            board_id=body.board_id,
            sort_order=next_order,
            completed=task_row["completed"],
        )


@router.patch("/{task_id}")
def update_task(task_id: str, body: TaskUpdate) -> TaskResponse:
    update_data = body.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    with get_conn() as conn, conn.cursor() as cur:
        # tasks テーブルの更新
        task_fields = {k: v for k, v in update_data.items() if k in ("title", "completed")}
        if task_fields:
            set_clause = ", ".join(f"{k} = %s" for k in task_fields)
            values = list(task_fields.values())
            values.append(task_id)
            cur.execute(
                f"""
                    UPDATE tasks
                    SET {set_clause}, updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                """,
                values,
            )

        # board_tasks の更新（board_id または sort_order が変更された場合）
        if "board_id" in update_data or "sort_order" in update_data:
            # 現在の board_tasks を取得
            cur.execute(
                "SELECT board_id, sort_order FROM board_tasks WHERE task_id = %s",
                (task_id,),
            )
            current = cur.fetchone()
            if not current:
                raise HTTPException(status_code=404, detail="Task not found")

            new_board_id = update_data.get("board_id", str(current["board_id"]))
            new_sort_order = update_data.get("sort_order", current["sort_order"])

            # 新しい board_id の存在確認
            if "board_id" in update_data:
                cur.execute("SELECT id FROM boards WHERE id = %s", (new_board_id,))
                if not cur.fetchone():
                    raise HTTPException(status_code=400, detail=f"Board '{new_board_id}' not found")

            # board_tasks を更新
            cur.execute(
                """
                UPDATE board_tasks
                SET board_id = %s, sort_order = %s
                WHERE task_id = %s
                """,
                (new_board_id, new_sort_order, task_id),
            )

        conn.commit()

        # 更新後のデータを取得して返す
        cur.execute("""
            SELECT t.id, t.title, t.completed,
                   bt.board_id, bt.sort_order
            FROM tasks t
            JOIN board_tasks bt ON t.id = bt.task_id
            WHERE t.id = %s
        """, (task_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Task not found")
        return _row_to_task(row)


@router.delete("/{task_id}", status_code=204, response_model=None)
def delete_task(task_id: str) -> None:
    with get_conn() as conn, conn.cursor() as cur:
        # board_tasks は CASCADE で自動削除される
        cur.execute("DELETE FROM tasks WHERE id = %s", (task_id,))
        conn.commit()
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Task not found")

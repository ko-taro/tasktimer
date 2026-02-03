from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.database import get_conn

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


class TaskResponse(BaseModel):
    id: str
    title: str
    category: str
    completed: bool
    pomodoro_count: int
    total_seconds: int


class TaskCreate(BaseModel):
    title: str
    category: str = "medium"


class TaskUpdate(BaseModel):
    title: str | None = None
    category: str | None = None
    completed: bool | None = None
    pomodoro_count: int | None = None
    total_seconds: int | None = None


def _row_to_task(row: Any) -> TaskResponse:
    return TaskResponse(
        id=str(row["id"]),
        title=row["title"],
        category=row["category_key"],
        completed=row["completed"],
        pomodoro_count=row["pomodoro_count"],
        total_seconds=row["total_seconds"],
    )


@router.get("")
def list_tasks() -> list[TaskResponse]:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT * FROM tasks ORDER BY created_at")
        return [_row_to_task(row) for row in cur.fetchall()]


@router.post("", status_code=201)
def create_task(body: TaskCreate) -> TaskResponse:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
                INSERT INTO tasks (title, category_key)
                VALUES (%s, %s)
                RETURNING *
            """,
            (body.title, body.category),
        )
        row = cur.fetchone()
        conn.commit()
        return _row_to_task(row)


@router.patch("/{task_id}")
def update_task(task_id: str, body: TaskUpdate) -> TaskResponse:
    update_data = body.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    # category -> category_key
    if "category" in update_data:
        update_data["category_key"] = update_data.pop("category")

    set_clause = ", ".join(f"{k} = %s" for k in update_data)
    values = list(update_data.values())
    values.append(task_id)

    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            f"""
                UPDATE tasks
                SET {set_clause},
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                RETURNING *
            """,
            values,
        )
        row = cur.fetchone()
        conn.commit()
        if not row:
            raise HTTPException(status_code=404, detail="Task not found")
        return _row_to_task(row)


@router.delete("/{task_id}", status_code=204, response_model=None)
def delete_task(task_id: str) -> None:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            DELETE FROM tasks
            WHERE id = %s
        """,
            (task_id,),
        )
        conn.commit()
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Task not found")

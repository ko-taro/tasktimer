from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.database import get_conn

router = APIRouter(prefix="/api/projects", tags=["projects"])


class ProjectResponse(BaseModel):
    id: str
    name: str
    short_name: str
    color: str | None


class ProjectCreate(BaseModel):
    name: str
    short_name: str
    color: str | None = None


class ProjectUpdate(BaseModel):
    name: str | None = None
    short_name: str | None = None
    color: str | None = None


def _row_to_project(row: Any) -> ProjectResponse:
    return ProjectResponse(
        id=str(row["id"]),
        name=row["name"],
        short_name=row["short_name"],
        color=row["color"],
    )


@router.get("")
def list_projects() -> list[ProjectResponse]:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT id, name, short_name, color FROM projects ORDER BY sort_order")
        return [_row_to_project(row) for row in cur.fetchall()]


@router.post("", status_code=201)
def create_project(body: ProjectCreate) -> ProjectResponse:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM projects"
        )
        next_order = cur.fetchone()["next_order"]

        cur.execute(
            """
            INSERT INTO projects (name, short_name, color, sort_order)
            VALUES (%s, %s, %s, %s)
            RETURNING *
            """,
            (body.name, body.short_name, body.color, next_order),
        )
        row = cur.fetchone()
        conn.commit()
        return _row_to_project(row)


@router.patch("/{project_id}")
def update_project(project_id: str, body: ProjectUpdate) -> ProjectResponse:
    update_data = body.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    set_clause = ", ".join(f"{k} = %s" for k in update_data)
    values = list(update_data.values())
    values.append(project_id)

    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            f"UPDATE projects SET {set_clause} WHERE id = %s RETURNING *",
            values,
        )
        row = cur.fetchone()
        conn.commit()
        if not row:
            raise HTTPException(status_code=404, detail="Project not found")
        return _row_to_project(row)


@router.delete("/{project_id}", status_code=204, response_model=None)
def delete_project(project_id: str) -> None:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("DELETE FROM projects WHERE id = %s", (project_id,))
        conn.commit()
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Project not found")


class ProjectTaskResponse(BaseModel):
    """プロジェクトのタスク（ボード情報はオプション）"""
    id: str
    title: str
    description: str | None
    scheduled_start: str | None = None
    scheduled_end: str | None = None
    completed_at: str | None = None
    archived_at: str | None = None
    board_id: str | None = None
    board_name: str | None = None
    sort_order: int | None = None


@router.get("/{project_id}")
def get_project(project_id: str) -> ProjectResponse:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT id, name, short_name, color FROM projects WHERE id = %s",
            (project_id,),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Project not found")
        return _row_to_project(row)


@router.get("/{project_id}/tasks")
def list_project_tasks(project_id: str) -> list[ProjectTaskResponse]:
    """プロジェクトに属するタスク一覧を取得（ボード割り当て有無問わず）"""
    with get_conn() as conn, conn.cursor() as cur:
        # プロジェクトの存在確認
        cur.execute("SELECT id FROM projects WHERE id = %s", (project_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Project not found")

        # タスク一覧を取得（board_tasks との LEFT JOIN で未割り当ても含む）
        # アーカイブ済みも含めて取得（UIでフィルタリング）
        cur.execute("""
            SELECT t.id, t.title, t.description,
                   t.scheduled_start, t.scheduled_end, t.completed_at, t.archived_at,
                   bt.board_id, b.label AS board_name, bt.sort_order
            FROM tasks t
            LEFT JOIN board_tasks bt ON t.id = bt.task_id
            LEFT JOIN boards b ON bt.board_id = b.id
            WHERE t.project_id = %s
            ORDER BY t.archived_at NULLS FIRST, t.created_at DESC
        """, (project_id,))

        results = []
        for row in cur.fetchall():
            scheduled_start = row.get("scheduled_start")
            scheduled_end = row.get("scheduled_end")
            completed_at = row.get("completed_at")
            archived_at = row.get("archived_at")
            results.append(ProjectTaskResponse(
                id=str(row["id"]),
                title=row["title"],
                description=row["description"],
                scheduled_start=scheduled_start.isoformat() if scheduled_start else None,
                scheduled_end=scheduled_end.isoformat() if scheduled_end else None,
                completed_at=completed_at.isoformat() if completed_at else None,
                archived_at=archived_at.isoformat() if archived_at else None,
                board_id=str(row["board_id"]) if row["board_id"] else None,
                board_name=row["board_name"],
                sort_order=row["sort_order"],
            ))
        return results

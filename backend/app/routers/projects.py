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

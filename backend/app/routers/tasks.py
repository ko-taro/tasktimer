from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.database import get_conn

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


class ProjectInfo(BaseModel):
    id: str
    name: str
    short_name: str
    color: str | None


class TaskResponse(BaseModel):
    id: str
    title: str
    description: str | None
    board_id: str
    sort_order: int
    completed: bool
    archived_at: str | None
    project: ProjectInfo | None


class UnassignedTaskResponse(BaseModel):
    """ボードに割り当てられていないタスク"""
    id: str
    title: str
    description: str | None
    completed: bool
    archived_at: str | None
    project: ProjectInfo | None


class TaskCreate(BaseModel):
    title: str
    description: str | None = None
    board_id: str | None = None  # Noneの場合は未割り当てタスク
    project_id: str | None = None


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    board_id: str | None = None
    sort_order: int | None = None
    completed: bool | None = None
    project_id: str | None = None
    archived: bool | None = None


def _row_to_task(row: Any) -> TaskResponse:
    project = None
    if row.get("project_id"):
        project = ProjectInfo(
            id=str(row["project_id"]),
            name=row["project_name"],
            short_name=row["project_short_name"],
            color=row["project_color"],
        )
    archived_at = row.get("archived_at")
    return TaskResponse(
        id=str(row["id"]),
        title=row["title"],
        description=row["description"],
        board_id=str(row["board_id"]),
        sort_order=row["sort_order"],
        completed=row["completed"],
        archived_at=archived_at.isoformat() if archived_at else None,
        project=project,
    )


@router.get("")
def list_tasks() -> list[TaskResponse]:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("""
            SELECT t.id, t.title, t.description, t.completed, t.archived_at,
                   bt.board_id, bt.sort_order,
                   p.id AS project_id, p.name AS project_name,
                   p.short_name AS project_short_name, p.color AS project_color
            FROM tasks t
            JOIN board_tasks bt ON t.id = bt.task_id
            JOIN boards b ON bt.board_id = b.id
            LEFT JOIN projects p ON t.project_id = p.id
            WHERE t.archived_at IS NULL
            ORDER BY b.sort_order, bt.sort_order
        """)
        return [_row_to_task(row) for row in cur.fetchall()]


@router.get("/unassigned")
def list_unassigned_tasks() -> list[UnassignedTaskResponse]:
    """ボードに割り当てられていないタスク一覧を取得"""
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("""
            SELECT t.id, t.title, t.description, t.completed, t.archived_at,
                   p.id AS project_id, p.name AS project_name,
                   p.short_name AS project_short_name, p.color AS project_color
            FROM tasks t
            LEFT JOIN board_tasks bt ON t.id = bt.task_id
            LEFT JOIN projects p ON t.project_id = p.id
            WHERE bt.task_id IS NULL AND t.archived_at IS NULL
            ORDER BY t.created_at DESC
        """)
        results = []
        for row in cur.fetchall():
            project = None
            if row.get("project_id"):
                project = ProjectInfo(
                    id=str(row["project_id"]),
                    name=row["project_name"],
                    short_name=row["project_short_name"],
                    color=row["project_color"],
                )
            archived_at = row.get("archived_at")
            results.append(UnassignedTaskResponse(
                id=str(row["id"]),
                title=row["title"],
                description=row["description"],
                completed=row["completed"],
                archived_at=archived_at.isoformat() if archived_at else None,
                project=project,
            ))
        return results


@router.post("", status_code=201)
def create_task(body: TaskCreate) -> TaskResponse | UnassignedTaskResponse:
    with get_conn() as conn, conn.cursor() as cur:
        # board_id が指定された場合は存在確認
        if body.board_id:
            cur.execute("SELECT id FROM boards WHERE id = %s", (body.board_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=400, detail=f"Board '{body.board_id}' not found")

        # project_id の存在確認
        project_row = None
        if body.project_id:
            cur.execute("SELECT id, name, short_name, color FROM projects WHERE id = %s", (body.project_id,))
            project_row = cur.fetchone()
            if not project_row:
                raise HTTPException(status_code=400, detail=f"Project '{body.project_id}' not found")

        # タスクを作成
        cur.execute(
            "INSERT INTO tasks (title, description, project_id) VALUES (%s, %s, %s) RETURNING *",
            (body.title, body.description, body.project_id),
        )
        task_row = cur.fetchone()

        project = None
        if project_row:
            project = ProjectInfo(
                id=str(project_row["id"]),
                name=project_row["name"],
                short_name=project_row["short_name"],
                color=project_row["color"],
            )

        # board_id が指定された場合のみ board_tasks に追加
        if body.board_id:
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
                description=task_row["description"],
                board_id=body.board_id,
                sort_order=next_order,
                completed=task_row["completed"],
                archived_at=None,
                project=project,
            )
        else:
            # 未割り当てタスク
            conn.commit()
            return UnassignedTaskResponse(
                id=str(task_row["id"]),
                title=task_row["title"],
                description=task_row["description"],
                completed=task_row["completed"],
                archived_at=None,
                project=project,
            )


@router.patch("/{task_id}")
def update_task(task_id: str, body: TaskUpdate) -> TaskResponse | UnassignedTaskResponse:
    update_data = body.model_dump(exclude_unset=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    with get_conn() as conn, conn.cursor() as cur:
        # archived フラグの処理（archived_at への変換）
        archived_clause = ""
        if "archived" in update_data:
            archived = update_data.pop("archived")
            if archived:
                archived_clause = ", archived_at = CURRENT_TIMESTAMP"
            else:
                archived_clause = ", archived_at = NULL"

        # tasks テーブルの更新
        task_fields = {k: v for k, v in update_data.items() if k in ("title", "description", "completed", "project_id")}
        if task_fields or archived_clause:
            if task_fields:
                set_clause = ", ".join(f"{k} = %s" for k in task_fields)
                values = list(task_fields.values())
                values.append(task_id)
                cur.execute(
                    f"""
                        UPDATE tasks
                        SET {set_clause}{archived_clause}, updated_at = CURRENT_TIMESTAMP
                        WHERE id = %s
                    """,
                    values,
                )
            else:
                # archived のみ更新の場合
                cur.execute(
                    f"""
                        UPDATE tasks
                        SET updated_at = CURRENT_TIMESTAMP{archived_clause}
                        WHERE id = %s
                    """,
                    (task_id,),
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
                raise HTTPException(status_code=404, detail="Task not found in any board")

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

        # 更新後のデータを取得して返す（LEFT JOINで未割り当てタスクにも対応）
        cur.execute("""
            SELECT t.id, t.title, t.description, t.completed, t.archived_at,
                   bt.board_id, bt.sort_order,
                   p.id AS project_id, p.name AS project_name,
                   p.short_name AS project_short_name, p.color AS project_color
            FROM tasks t
            LEFT JOIN board_tasks bt ON t.id = bt.task_id
            LEFT JOIN projects p ON t.project_id = p.id
            WHERE t.id = %s
        """, (task_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Task not found")

        # board_idがない場合は未割り当てタスク
        if row["board_id"] is None:
            project = None
            if row.get("project_id"):
                project = ProjectInfo(
                    id=str(row["project_id"]),
                    name=row["project_name"],
                    short_name=row["project_short_name"],
                    color=row["project_color"],
                )
            archived_at = row.get("archived_at")
            return UnassignedTaskResponse(
                id=str(row["id"]),
                title=row["title"],
                description=row["description"],
                completed=row["completed"],
                archived_at=archived_at.isoformat() if archived_at else None,
                project=project,
            )

        return _row_to_task(row)


class TaskReorder(BaseModel):
    board_id: str
    sort_order: int


@router.post("/{task_id}/reorder")
def reorder_task(task_id: str, body: TaskReorder) -> TaskResponse:
    with get_conn() as conn, conn.cursor() as cur:
        # タスクの存在確認
        cur.execute("SELECT id FROM tasks WHERE id = %s", (task_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Task not found")

        # 現在のboard_tasks情報を取得
        cur.execute(
            "SELECT board_id, sort_order FROM board_tasks WHERE task_id = %s",
            (task_id,),
        )
        current = cur.fetchone()

        new_board_id = body.board_id
        new_sort_order = body.sort_order

        # 未割り当てタスクの場合は新規にboard_tasksに追加
        if not current:
            # 新ボードで new_sort_order 以降のタスクを +1
            cur.execute(
                """
                UPDATE board_tasks
                SET sort_order = sort_order + 1
                WHERE board_id = %s AND sort_order >= %s
                """,
                (new_board_id, new_sort_order),
            )
            # board_tasksに挿入
            cur.execute(
                "INSERT INTO board_tasks (board_id, task_id, sort_order) VALUES (%s, %s, %s)",
                (new_board_id, task_id, new_sort_order),
            )
        else:
            old_board_id = str(current["board_id"])
            old_sort_order = current["sort_order"]

            if old_board_id == new_board_id:
                # 同じボード内での移動
                if old_sort_order < new_sort_order:
                    # 下に移動: old_sort_order < x <= new_sort_order のタスクを -1
                    cur.execute(
                        """
                        UPDATE board_tasks
                        SET sort_order = sort_order - 1
                        WHERE board_id = %s AND sort_order > %s AND sort_order <= %s
                        """,
                        (new_board_id, old_sort_order, new_sort_order),
                    )
                elif old_sort_order > new_sort_order:
                    # 上に移動: new_sort_order <= x < old_sort_order のタスクを +1
                    cur.execute(
                        """
                        UPDATE board_tasks
                        SET sort_order = sort_order + 1
                        WHERE board_id = %s AND sort_order >= %s AND sort_order < %s
                        """,
                        (new_board_id, new_sort_order, old_sort_order),
                    )
            else:
                # 別ボードへの移動
                # 元ボードで old_sort_order より後のタスクを -1
                cur.execute(
                    """
                    UPDATE board_tasks
                    SET sort_order = sort_order - 1
                    WHERE board_id = %s AND sort_order > %s
                    """,
                    (old_board_id, old_sort_order),
                )
                # 新ボードで new_sort_order 以降のタスクを +1
                cur.execute(
                    """
                    UPDATE board_tasks
                    SET sort_order = sort_order + 1
                    WHERE board_id = %s AND sort_order >= %s
                    """,
                    (new_board_id, new_sort_order),
                )

            # タスク自体の board_id と sort_order を更新
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
            SELECT t.id, t.title, t.description, t.completed, t.archived_at,
                   bt.board_id, bt.sort_order,
                   p.id AS project_id, p.name AS project_name,
                   p.short_name AS project_short_name, p.color AS project_color
            FROM tasks t
            JOIN board_tasks bt ON t.id = bt.task_id
            LEFT JOIN projects p ON t.project_id = p.id
            WHERE t.id = %s
        """, (task_id,))
        row = cur.fetchone()
        return _row_to_task(row)


@router.delete("/{task_id}", status_code=204, response_model=None)
def delete_task(task_id: str) -> None:
    with get_conn() as conn, conn.cursor() as cur:
        # board_tasks は CASCADE で自動削除される
        cur.execute("DELETE FROM tasks WHERE id = %s", (task_id,))
        conn.commit()
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Task not found")

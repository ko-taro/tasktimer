from __future__ import annotations

import uuid
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/tasks", tags=["tasks"])


class Task(BaseModel):
    id: str = Field(default_factory=lambda: uuid.uuid4().hex[:8])
    title: str
    status: Literal["todo", "in_progress", "done"] = "todo"
    pomodoro_count: int = 0
    total_seconds: int = 0


class TaskCreate(BaseModel):
    title: str
    status: Literal["todo", "in_progress", "done"] = "todo"


class TaskUpdate(BaseModel):
    title: str | None = None
    status: Literal["todo", "in_progress", "done"] | None = None
    pomodoro_count: int | None = None
    total_seconds: int | None = None


# In-memory mock data
_tasks: list[Task] = [
    Task(id="1", title="プロジェクト計画を作成する", status="done", pomodoro_count=2, total_seconds=3000),
    Task(id="2", title="API設計書を書く", status="in_progress", pomodoro_count=1, total_seconds=1500),
    Task(id="3", title="データベーススキーマを設計する", status="todo"),
    Task(id="4", title="認証機能を実装する", status="todo"),
    Task(id="5", title="テストを書く", status="todo"),
]


@router.get("")
def list_tasks() -> list[Task]:
    return _tasks


@router.post("", status_code=201)
def create_task(body: TaskCreate) -> Task:
    task = Task(title=body.title, status=body.status)
    _tasks.append(task)
    return task


@router.patch("/{task_id}")
def update_task(task_id: str, body: TaskUpdate) -> Task:
    for task in _tasks:
        if task.id == task_id:
            update_data = body.model_dump(exclude_unset=True)
            for key, value in update_data.items():
                setattr(task, key, value)
            return task
    raise HTTPException(status_code=404, detail="Task not found")


@router.delete("/{task_id}", status_code=204, response_model=None)
def delete_task(task_id: str) -> None:
    for i, task in enumerate(_tasks):
        if task.id == task_id:
            _tasks.pop(i)
            return
    raise HTTPException(status_code=404, detail="Task not found")

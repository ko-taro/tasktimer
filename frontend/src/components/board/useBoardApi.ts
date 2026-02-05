import { useCallback } from "react";
import type { Board, Task, InboxTask } from "./types";

type UseBoardApiProps = {
  tasks: Task[];
  setBoards: React.Dispatch<React.SetStateAction<Board[]>>;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  setInboxTasks: React.Dispatch<React.SetStateAction<InboxTask[]>>;
  setError: (error: string) => void;
  setDeletedTask: (task: Task | null) => void;
};

export default function useBoardApi({
  tasks,
  setBoards,
  setTasks,
  setInboxTasks,
  setError,
  setDeletedTask,
}: UseBoardApiProps) {
  // タスク操作
  const addTask = useCallback(
    (title: string, boardId: string, projectId: string | null) => {
      return fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, board_id: boardId, project_id: projectId }),
      })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((task: Task) => {
          setTasks((prev) => [...prev, task]);
          return task;
        })
        .catch((err) => {
          setError(err.message);
          throw err;
        });
    },
    [setTasks, setError]
  );

  const updateTaskTitle = useCallback(
    (taskId: string, title: string) => {
      fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((updated: Task) => {
          setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        })
        .catch((err) => setError(err.message));
    },
    [setTasks, setError]
  );

  const updateTaskDescription = useCallback(
    (taskId: string, description: string) => {
      fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: description || null }),
      })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((updated: Task) => {
          setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        })
        .catch((err) => setError(err.message));
    },
    [setTasks, setError]
  );

  const updateTaskProject = useCallback(
    (taskId: string, projectId: string | null) => {
      fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId }),
      })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((updated: Task) => {
          setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        })
        .catch((err) => setError(err.message));
    },
    [setTasks, setError]
  );

  const deleteTask = useCallback(
    (task: Task) => {
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
      setDeletedTask(task);
      fetch(`/api/tasks/${task.id}`, { method: "DELETE" }).catch((err) =>
        setError(err.message)
      );
    },
    [setTasks, setDeletedTask, setError]
  );

  const undoDeleteTask = useCallback(
    (deletedTask: Task) => {
      setDeletedTask(null);
      fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: deletedTask.title,
          board_id: deletedTask.board_id,
          project_id: deletedTask.project?.id,
        }),
      })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((restored: Task) => {
          setTasks((prev) => [...prev, restored]);
        })
        .catch((err) => setError(err.message));
    },
    [setTasks, setDeletedTask, setError]
  );

  const toggleTaskCompleted = useCallback(
    (task: Task) => {
      fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !task.completed_at }),
      })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((updated: Task) => {
          setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        })
        .catch((err) => setError(err.message));
    },
    [setTasks, setError]
  );

  const archiveTask = useCallback(
    (task: Task) => {
      fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: true }),
      })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then(() => {
          setTasks((prev) => prev.filter((t) => t.id !== task.id));
        })
        .catch((err) => setError(err.message));
    },
    [setTasks, setError]
  );

  const toggleInboxTaskCompleted = useCallback(
    (task: InboxTask) => {
      fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !task.completed_at }),
      })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((updated) => {
          setInboxTasks((prev) =>
            prev.map((t) => (t.id === task.id ? { ...t, completed_at: updated.completed_at } : t))
          );
        })
        .catch((err) => setError(err.message));
    },
    [setInboxTasks, setError]
  );

  const deleteInboxTask = useCallback(
    (task: InboxTask) => {
      setInboxTasks((prev) => prev.filter((t) => t.id !== task.id));
      fetch(`/api/tasks/${task.id}`, { method: "DELETE" }).catch((err) =>
        setError(err.message)
      );
    },
    [setInboxTasks, setError]
  );

  // ボード操作
  const addBoard = useCallback(
    (label: string, color: string) => {
      return fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, color }),
      })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((board: Board) => {
          setBoards((prev) => [...prev, board]);
          return board;
        })
        .catch((err) => {
          setError(err.message);
          throw err;
        });
    },
    [setBoards, setError]
  );

  const updateBoard = useCallback(
    (boardId: string, label: string, color: string) => {
      return fetch(`/api/boards/${boardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, color }),
      })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((updated: Board) => {
          setBoards((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
          return updated;
        })
        .catch((err) => {
          setError(err.message);
          throw err;
        });
    },
    [setBoards, setError]
  );

  const deleteBoard = useCallback(
    (boardId: string) => {
      return fetch(`/api/boards/${boardId}`, { method: "DELETE" })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          setBoards((prev) => prev.filter((b) => b.id !== boardId));
          const boardTaskIds = tasks.filter((t) => t.board_id === boardId).map((t) => t.id);
          setTasks((prev) => prev.filter((t) => t.board_id !== boardId));
          boardTaskIds.forEach((taskId) => {
            const task = tasks.find((t) => t.id === taskId);
            if (task) {
              setInboxTasks((prev) => [
                ...prev,
                {
                  id: task.id,
                  title: task.title,
                  description: task.description,
                  scheduled_start: task.scheduled_start,
                  scheduled_end: task.scheduled_end,
                  completed_at: task.completed_at,
                  archived_at: task.archived_at,
                  project: task.project,
                },
              ]);
            }
          });
        })
        .catch((err) => {
          setError(err.message);
          throw err;
        });
    },
    [tasks, setBoards, setTasks, setInboxTasks, setError]
  );

  return {
    // タスク
    addTask,
    updateTaskTitle,
    updateTaskDescription,
    updateTaskProject,
    deleteTask,
    undoDeleteTask,
    toggleTaskCompleted,
    archiveTask,
    toggleInboxTaskCompleted,
    deleteInboxTask,
    // ボード
    addBoard,
    updateBoard,
    deleteBoard,
  };
}

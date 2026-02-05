import { useState } from "react";
import {
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import type { Board, Task, InboxTask } from "./types";

type UseBoardDndProps = {
  boards: Board[];
  tasks: Task[];
  inboxTasks: InboxTask[];
  setBoards: React.Dispatch<React.SetStateAction<Board[]>>;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  setInboxTasks: React.Dispatch<React.SetStateAction<InboxTask[]>>;
  setError: (error: string) => void;
};

export default function useBoardDnd({
  boards,
  tasks,
  inboxTasks,
  setBoards,
  setTasks,
  setInboxTasks,
  setError,
}: UseBoardDndProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeBoard, setActiveBoard] = useState<Board | null>(null);
  const [originalBoardId, setOriginalBoardId] = useState<string | null>(null);
  const [boardDropIndicator, setBoardDropIndicator] = useState<{
    boardId: string;
    position: "before" | "after";
  } | null>(null);
  const [taskDropIndicator, setTaskDropIndicator] = useState<{
    taskId: string;
    position: "before" | "after";
  } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const activeId = event.active.id as string;

    const board = boards.find((b) => b.id === activeId);
    if (board) {
      setActiveBoard(board);
      setActiveTask(null);
      return;
    }

    const task = tasks.find((t) => t.id === activeId);
    if (task) {
      setActiveTask(task);
      setActiveBoard(null);
      setOriginalBoardId(task.board_id);
      return;
    }

    const inboxTask = inboxTasks.find((t) => t.id === activeId);
    if (inboxTask) {
      setActiveTask({
        ...inboxTask,
        board_id: "",
        sort_order: 0,
      });
      setActiveBoard(null);
      setOriginalBoardId(null);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) {
      setBoardDropIndicator(null);
      setTaskDropIndicator(null);
      return;
    }

    const activeId = active.id as string;
    let overId = over.id as string;

    if (boards.find((b) => b.id === activeId)) {
      setTaskDropIndicator(null);
      if (overId.startsWith("droppable-")) {
        overId = overId.replace("droppable-", "");
      }

      const activeIndex = boards.findIndex((b) => b.id === activeId);
      const overIndex = boards.findIndex((b) => b.id === overId);

      if (overIndex !== -1 && activeIndex !== overIndex) {
        const position = activeIndex < overIndex ? "after" : "before";
        setBoardDropIndicator({ boardId: overId, position });
      } else {
        setBoardDropIndicator(null);
      }
      return;
    }

    setBoardDropIndicator(null);

    const activeTaskItem = tasks.find((t) => t.id === activeId);
    const activeInboxItem = inboxTasks.find((t) => t.id === activeId);
    if (!activeTaskItem && !activeInboxItem) {
      setTaskDropIndicator(null);
      return;
    }

    const overTask = tasks.find((t) => t.id === overId);
    const overBoardId = overId.startsWith("droppable-")
      ? overId.replace("droppable-", "")
      : null;
    const overBoard = overBoardId ? boards.find((b) => b.id === overBoardId) : null;

    let targetBoardId: string;
    if (overTask) {
      targetBoardId = overTask.board_id;
      if (activeId !== overId) {
        setTaskDropIndicator({ taskId: overId, position: "before" });
      } else {
        setTaskDropIndicator(null);
      }
    } else if (overBoard) {
      targetBoardId = overBoard.id;
      const boardTasks = tasks
        .filter((t) => t.id !== activeId && t.board_id === targetBoardId)
        .sort((a, b) => a.sort_order - b.sort_order);
      if (boardTasks.length > 0) {
        const lastTask = boardTasks[boardTasks.length - 1];
        setTaskDropIndicator({ taskId: lastTask.id, position: "after" });
      } else {
        setTaskDropIndicator(null);
      }
    } else {
      setTaskDropIndicator(null);
      return;
    }

    if (activeInboxItem || !activeTaskItem) {
      return;
    }

    if (activeTaskItem.board_id !== targetBoardId) {
      setTasks((prev) =>
        prev.map((t) => (t.id === activeId ? { ...t, board_id: targetBoardId } : t))
      );
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const activeId = active.id as string;

    if (activeBoard) {
      setActiveBoard(null);
      setBoardDropIndicator(null);
      if (!over) return;

      let overId = over.id as string;
      if (overId.startsWith("droppable-")) {
        overId = overId.replace("droppable-", "");
      }
      if (activeId === overId) return;

      const oldIndex = boards.findIndex((b) => b.id === activeId);
      const newIndex = boards.findIndex((b) => b.id === overId);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(boards, oldIndex, newIndex);
      setBoards(reordered);

      fetch(`/api/boards/${activeId}/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sort_order: newIndex }),
      }).catch((err) => setError(err.message));
      return;
    }

    setActiveTask(null);
    setTaskDropIndicator(null);
    const sourceBoardId = originalBoardId;
    setOriginalBoardId(null);

    if (!over) {
      if (sourceBoardId) {
        setTasks((prev) =>
          prev.map((t) => (t.id === activeId ? { ...t, board_id: sourceBoardId } : t))
        );
      }
      return;
    }

    const overId = over.id as string;

    const overTask = tasks.find((t) => t.id === overId);
    const overBoardId = overId.startsWith("droppable-")
      ? overId.replace("droppable-", "")
      : null;
    const overBoard = overBoardId ? boards.find((b) => b.id === overBoardId) : null;

    let targetBoardId: string;
    let newIndex: number;

    if (overTask) {
      targetBoardId = overTask.board_id;
      const boardTasks = tasks
        .filter((t) => t.id !== activeId && t.board_id === targetBoardId)
        .sort((a, b) => a.sort_order - b.sort_order);
      const overIndex = boardTasks.findIndex((t) => t.id === overId);
      newIndex = overIndex === -1 ? boardTasks.length : overIndex;
    } else if (overBoard) {
      targetBoardId = overBoard.id;
      const boardTasks = tasks
        .filter((t) => t.id !== activeId && t.board_id === targetBoardId)
        .sort((a, b) => a.sort_order - b.sort_order);
      newIndex = boardTasks.length;
    } else {
      return;
    }

    if (!sourceBoardId) {
      const inboxTask = inboxTasks.find((t) => t.id === activeId);
      if (!inboxTask) return;

      setInboxTasks((prev) => prev.filter((t) => t.id !== activeId));
      const newTask: Task = {
        ...inboxTask,
        board_id: targetBoardId,
        sort_order: newIndex,
      };
      setTasks((prev) => {
        const updated = prev.map((t) => {
          if (t.board_id === targetBoardId && t.sort_order >= newIndex) {
            return { ...t, sort_order: t.sort_order + 1 };
          }
          return t;
        });
        return [...updated, newTask];
      });

      fetch(`/api/tasks/${activeId}/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ board_id: targetBoardId, sort_order: newIndex }),
      }).catch((err) => setError(err.message));
      return;
    }

    if (sourceBoardId === targetBoardId) {
      const boardTasks = tasks
        .filter((t) => t.board_id === targetBoardId)
        .sort((a, b) => a.sort_order - b.sort_order);
      const oldIndex = boardTasks.findIndex((t) => t.id === activeId);

      let targetIndex: number;
      if (overBoard) {
        targetIndex = boardTasks.length - 1;
        if (oldIndex === targetIndex) return;
      } else {
        targetIndex = boardTasks.findIndex((t) => t.id === overId);
        if (oldIndex === targetIndex || targetIndex === -1) return;
      }

      const reordered = arrayMove(boardTasks, oldIndex, targetIndex);
      const updatedTasks = tasks.map((t) => {
        if (t.board_id !== targetBoardId) return t;
        const idx = reordered.findIndex((r) => r.id === t.id);
        return { ...t, sort_order: idx };
      });
      setTasks(updatedTasks);

      fetch(`/api/tasks/${activeId}/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ board_id: targetBoardId, sort_order: targetIndex }),
      }).catch((err) => setError(err.message));
    } else {
      const updatedTasks = tasks.map((t) => {
        if (t.id === activeId) {
          return { ...t, board_id: targetBoardId, sort_order: newIndex };
        }
        if (t.board_id === targetBoardId && t.id !== activeId && t.sort_order >= newIndex) {
          return { ...t, sort_order: t.sort_order + 1 };
        }
        return t;
      });
      setTasks(updatedTasks);

      fetch(`/api/tasks/${activeId}/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ board_id: targetBoardId, sort_order: newIndex }),
      }).catch((err) => setError(err.message));
    }
  };

  return {
    sensors,
    activeTask,
    activeBoard,
    boardDropIndicator,
    taskDropIndicator,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  };
}

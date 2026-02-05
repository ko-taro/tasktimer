import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  ClickAwayListener,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DeleteIcon from "@mui/icons-material/Delete";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import DragHandleIcon from "@mui/icons-material/DragHandle";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Project = {
  id: string;
  name: string;
  short_name: string;
  color: string | null;
};

type Task = {
  id: string;
  title: string;
  description: string | null;
  board_id: string;
  sort_order: number;
  completed: boolean;
  project: Project | null;
};

type Board = {
  id: string;
  label: string;
  color: string;
};

function SortableColumn({
  board,
  children,
  onAddClick,
  taskCount,
  showIndicator,
}: {
  board: Board;
  children: React.ReactNode;
  onAddClick: () => void;
  taskCount: number;
  showIndicator?: "before" | "after" | null;
}) {
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `droppable-${board.id}`,
  });
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: board.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const indicatorStyle = {
    position: "absolute" as const,
    top: 0,
    bottom: 0,
    width: 4,
    bgcolor: "primary.main",
    borderRadius: 2,
    zIndex: 10,
  };

  return (
    <Box sx={{ position: "relative" }}>
      {showIndicator === "before" && (
        <Box sx={{ ...indicatorStyle, left: -10 }} />
      )}
      <Paper
        ref={(node) => {
          setSortableRef(node);
          setDroppableRef(node);
        }}
        elevation={0}
        sx={{
          bgcolor: board.color,
          p: 2,
          borderRadius: 2,
          minHeight: 300,
          outline: isOver ? "2px solid" : "none",
          outlineColor: "primary.main",
        }}
        style={style}
        {...attributes}
      >
        <Box
          {...listeners}
          sx={{
            display: "flex",
            justifyContent: "center",
            cursor: "grab",
            color: "text.disabled",
            mb: 0.5,
            mx: -1,
            mt: -1,
            py: 0.5,
            "&:hover": {
              color: "text.secondary",
              bgcolor: "action.hover",
              borderRadius: 1,
            },
          }}
        >
          <DragHandleIcon fontSize="small" />
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold">
            {board.label}
          </Typography>
          <Chip label={taskCount} size="small" sx={{ ml: 1 }} />
          <IconButton size="small" sx={{ ml: "auto" }} onClick={onAddClick}>
            <AddIcon fontSize="small" />
          </IconButton>
        </Box>
        {children}
      </Paper>
      {showIndicator === "after" && (
        <Box sx={{ ...indicatorStyle, right: -10 }} />
      )}
    </Box>
  );
}

function DraggableCard({
  task,
  onUpdateTitle,
  onUpdateDescription,
  onToggleCompleted,
  onDelete,
  showIndicator,
}: {
  task: Task;
  onUpdateTitle: (taskId: string, title: string) => void;
  onUpdateDescription: (taskId: string, description: string) => void;
  onToggleCompleted: (task: Task) => void;
  onDelete: (task: Task) => void;
  showIndicator?: "before" | "after" | null;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDescription, setEditingDescription] = useState("");

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
  };

  const indicatorStyle = {
    position: "absolute" as const,
    left: 0,
    right: 0,
    height: 3,
    bgcolor: "primary.main",
    borderRadius: 1,
    zIndex: 10,
  };

  const handleExpand = () => {
    if (!isDragging && !isExpanded) {
      setIsExpanded(true);
      setEditingTitle(task.title);
      setEditingDescription(task.description ?? "");
    }
  };

  const handleCollapse = () => {
    const title = editingTitle.trim();
    if (title && title !== task.title) {
      onUpdateTitle(task.id, title);
    }
    const description = editingDescription.trim();
    if (description !== (task.description ?? "")) {
      onUpdateDescription(task.id, description);
    }
    setIsExpanded(false);
  };

  // 展開時：ハンドルのみでドラッグ、非展開時：カード全体でドラッグ
  const cardListeners = isExpanded ? {} : listeners;
  const handleListeners = isExpanded ? listeners : {};

  const cardElement = (
    <Box sx={{ position: "relative" }}>
      {showIndicator === "before" && (
        <Box sx={{ ...indicatorStyle, top: -6 }} />
      )}
      <Card
        ref={setNodeRef}
        sx={{
          borderRadius: 1.5,
          cursor: isExpanded ? "default" : "grab",
          ...style,
        }}
        {...cardListeners}
        {...attributes}
      >
      <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {isExpanded && (
            <Box
              {...handleListeners}
              sx={{
                cursor: "grab",
                display: "flex",
                alignItems: "center",
                color: "text.disabled",
                flexShrink: 0,
              }}
            >
              <DragIndicatorIcon fontSize="small" />
            </Box>
          )}
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onToggleCompleted(task);
            }}
            sx={{ p: 0, flexShrink: 0 }}
          >
            {task.completed ? (
              <CheckCircleIcon color="success" fontSize="small" />
            ) : (
              <RadioButtonUncheckedIcon
                fontSize="small"
                sx={{ color: "text.secondary" }}
              />
            )}
          </IconButton>
          {isExpanded ? (
            <TextField
              autoFocus
              fullWidth
              size="small"
              variant="standard"
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") handleCollapse();
              }}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            />
          ) : (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                flex: 1,
                minWidth: 0,
              }}
              onClick={handleExpand}
            >
              {task.project && (
                <Chip
                  label={task.project.short_name}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: "0.7rem",
                    flexShrink: 0,
                    ...(task.project.color && {
                      bgcolor: task.project.color,
                      color: "white",
                    }),
                  }}
                />
              )}
              <Typography
                variant="body1"
                sx={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  ...(task.completed && {
                    textDecoration: "line-through",
                    color: "text.disabled",
                  }),
                }}
              >
                {task.title}
              </Typography>
            </Box>
          )}
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task);
            }}
            sx={{ flexShrink: 0, p: 0, ml: "auto" }}
          >
            <DeleteIcon fontSize="small" sx={{ color: "text.disabled" }} />
          </IconButton>
        </Box>
        {isExpanded && (
          <Box sx={{ mt: 1.5, pl: 4.5 }}>
            <TextField
              fullWidth
              multiline
              minRows={2}
              size="small"
              placeholder="詳細を入力..."
              value={editingDescription}
              onChange={(e) => setEditingDescription(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") handleCollapse();
              }}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            />
          </Box>
        )}
      </CardContent>
    </Card>
      {showIndicator === "after" && (
        <Box sx={{ ...indicatorStyle, bottom: -6 }} />
      )}
    </Box>
  );

  if (isExpanded) {
    return (
      <ClickAwayListener onClickAway={handleCollapse}>
        {cardElement}
      </ClickAwayListener>
    );
  }

  return cardElement;
}

export default function BoardPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [deletedTask, setDeletedTask] = useState<Task | null>(null);
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
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleAddTask = (boardId: string) => {
    const title = newTaskTitle.trim();
    if (!title) {
      setAddingTo(null);
      setNewTaskTitle("");
      return;
    }
    fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, board_id: boardId }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((task: Task) => {
        setTasks((prev) => [...prev, task]);
        setNewTaskTitle("");
        setAddingTo(null);
      })
      .catch((err) => setError(err.message));
  };

  const handleUpdateTitle = (taskId: string, title: string) => {
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
        setTasks((prev) =>
          prev.map((t) => (t.id === updated.id ? updated : t))
        );
      })
      .catch((err) => setError(err.message));
  };

  const handleUpdateDescription = (taskId: string, description: string) => {
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
        setTasks((prev) =>
          prev.map((t) => (t.id === updated.id ? updated : t))
        );
      })
      .catch((err) => setError(err.message));
  };

  const handleDelete = (task: Task) => {
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    setDeletedTask(task);
    fetch(`/api/tasks/${task.id}`, { method: "DELETE" }).catch((err) =>
      setError(err.message)
    );
  };

  const handleUndoDelete = () => {
    if (!deletedTask) return;
    const task = deletedTask;
    setDeletedTask(null);
    fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: task.title,
        board_id: task.board_id,
        project_id: task.project?.id,
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
  };

  const handleToggleCompleted = (task: Task) => {
    fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !task.completed }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((updated: Task) => {
        setTasks((prev) =>
          prev.map((t) => (t.id === updated.id ? updated : t))
        );
      })
      .catch((err) => setError(err.message));
  };

  const handleDragStart = (event: DragStartEvent) => {
    const activeId = event.active.id as string;

    // ボードをドラッグしているか確認
    const board = boards.find((b) => b.id === activeId);
    if (board) {
      setActiveBoard(board);
      setActiveTask(null);
      return;
    }

    // タスクをドラッグ
    const task = tasks.find((t) => t.id === activeId);
    setActiveTask(task ?? null);
    setActiveBoard(null);
    setOriginalBoardId(task?.board_id ?? null);
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

    // ボードをドラッグ中
    if (boards.find((b) => b.id === activeId)) {
      setTaskDropIndicator(null);
      // droppable-プレフィックスを除去
      if (overId.startsWith("droppable-")) {
        overId = overId.replace("droppable-", "");
      }

      const activeIndex = boards.findIndex((b) => b.id === activeId);
      const overIndex = boards.findIndex((b) => b.id === overId);

      if (overIndex !== -1 && activeIndex !== overIndex) {
        // 移動方向に応じてインジケーター位置を決定
        const position = activeIndex < overIndex ? "after" : "before";
        setBoardDropIndicator({ boardId: overId, position });
      } else {
        setBoardDropIndicator(null);
      }
      return;
    }

    // タスクをドラッグ中
    setBoardDropIndicator(null);

    const activeTaskItem = tasks.find((t) => t.id === activeId);
    if (!activeTaskItem) {
      setTaskDropIndicator(null);
      return;
    }

    // over がボードかタスクかを判定（droppable-プレフィックスを考慮）
    const overTask = tasks.find((t) => t.id === overId);
    const overBoardId = overId.startsWith("droppable-")
      ? overId.replace("droppable-", "")
      : null;
    const overBoard = overBoardId
      ? boards.find((b) => b.id === overBoardId)
      : null;

    let targetBoardId: string;
    if (overTask) {
      targetBoardId = overTask.board_id;
      // ドラッグ中のタスクと違うタスクならインジケーターを表示
      if (activeId !== overId) {
        setTaskDropIndicator({ taskId: overId, position: "before" });
      } else {
        setTaskDropIndicator(null);
      }
    } else if (overBoard) {
      targetBoardId = overBoard.id;
      // ボードの空き領域にドラッグした場合、最後のタスクの下にインジケーターを表示
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

    // 異なるボードへ移動する場合、タスクのboard_idを一時的に更新
    if (activeTaskItem.board_id !== targetBoardId) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === activeId ? { ...t, board_id: targetBoardId } : t
        )
      );
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const activeId = active.id as string;

    // ボードのドラッグ終了
    if (activeBoard) {
      setActiveBoard(null);
      setBoardDropIndicator(null);
      if (!over) return;

      let overId = over.id as string;
      // droppable-プレフィックスを除去
      if (overId.startsWith("droppable-")) {
        overId = overId.replace("droppable-", "");
      }
      if (activeId === overId) return;

      const oldIndex = boards.findIndex((b) => b.id === activeId);
      const newIndex = boards.findIndex((b) => b.id === overId);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(boards, oldIndex, newIndex);
      setBoards(reordered);

      // API呼び出し
      fetch(`/api/boards/${activeId}/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sort_order: newIndex }),
      }).catch((err) => setError(err.message));
      return;
    }

    // タスクのドラッグ終了
    setActiveTask(null);
    setTaskDropIndicator(null);
    const sourceBoardId = originalBoardId;
    setOriginalBoardId(null);

    if (!over || !sourceBoardId) {
      // ドラッグがキャンセルされた場合、board_idを元に戻す
      if (sourceBoardId) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === activeId ? { ...t, board_id: sourceBoardId } : t
          )
        );
      }
      return;
    }

    const overId = over.id as string;

    // over がボードかタスクかを判定（droppable-プレフィックスを考慮）
    const overTask = tasks.find((t) => t.id === overId);
    const overBoardId = overId.startsWith("droppable-")
      ? overId.replace("droppable-", "")
      : null;
    const overBoard = overBoardId
      ? boards.find((b) => b.id === overBoardId)
      : null;

    let targetBoardId: string;
    let newIndex: number;

    if (overTask) {
      // タスクの上にドロップ
      // overTaskのboard_idではなく、originalBoardIdを使って正しいボードを判定
      // （handleDragOverでboard_idが更新されている可能性があるため）
      targetBoardId = overTask.id === activeId ? sourceBoardId! : overTask.board_id;

      // originalBoardIdを基準にタスクをフィルタリング
      const boardTasks = tasks
        .filter((t) => {
          // ドラッグ中のタスクを除外
          if (t.id === activeId) return false;
          // 元のボードにいたタスク、または移動先ボードにいるタスク
          return t.board_id === targetBoardId;
        })
        .sort((a, b) => a.sort_order - b.sort_order);
      const overIndex = boardTasks.findIndex((t) => t.id === overId);
      newIndex = overIndex === -1 ? boardTasks.length : overIndex;
    } else if (overBoard) {
      // ボードの空き領域にドロップ
      targetBoardId = overBoard.id;
      const boardTasks = tasks
        .filter((t) => t.id !== activeId && t.board_id === targetBoardId)
        .sort((a, b) => a.sort_order - b.sort_order);
      newIndex = boardTasks.length; // 末尾に追加
    } else {
      return;
    }

    // 同じボード内での移動
    if (sourceBoardId === targetBoardId) {
      const boardTasks = tasks
        .filter((t) => t.board_id === targetBoardId)
        .sort((a, b) => a.sort_order - b.sort_order);
      const oldIndex = boardTasks.findIndex((t) => t.id === activeId);

      // ボードの空き領域にドロップした場合は末尾に移動
      let targetIndex: number;
      if (overBoard) {
        targetIndex = boardTasks.length - 1; // 末尾
        if (oldIndex === targetIndex) return; // 既に末尾なら何もしない
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

      // API呼び出し
      fetch(`/api/tasks/${activeId}/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ board_id: targetBoardId, sort_order: targetIndex }),
      }).catch((err) => setError(err.message));
    } else {
      // 別ボードへの移動
      const updatedTasks = tasks.map((t) => {
        if (t.id === activeId) {
          return { ...t, board_id: targetBoardId, sort_order: newIndex };
        }
        // 移動先ボードでnewIndex以降のタスクはsort_orderを+1
        if (
          t.board_id === targetBoardId &&
          t.id !== activeId &&
          t.sort_order >= newIndex
        ) {
          return { ...t, sort_order: t.sort_order + 1 };
        }
        return t;
      });
      setTasks(updatedTasks);

      // API呼び出し
      fetch(`/api/tasks/${activeId}/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ board_id: targetBoardId, sort_order: newIndex }),
      }).catch((err) => setError(err.message));
    }
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/boards").then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      }),
      fetch("/api/tasks").then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      }),
    ])
      .then(([boardsData, tasksData]) => {
        setBoards(boardsData);
        setTasks(tasksData);
      })
      .catch((err) => setError(err.message));
  }, []);

  if (error) {
    return (
      <Typography color="error" sx={{ mt: 4, textAlign: "center" }}>
        API接続エラー: {error}
      </Typography>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={boards.map((b) => b.id)}
          strategy={horizontalListSortingStrategy}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: `repeat(${boards.length}, 1fr)` },
              gap: 2,
            }}
          >
            {boards.map((board) => {
              const boardTasks = tasks
                .filter((t) => t.board_id === board.id)
                .sort((a, b) => a.sort_order - b.sort_order);
              return (
                <SortableColumn
                  key={board.id}
                  board={board}
                  taskCount={boardTasks.length}
                  onAddClick={() => setAddingTo(board.id)}
                  showIndicator={
                    boardDropIndicator?.boardId === board.id
                      ? boardDropIndicator.position
                      : null
                  }
                >
                  {addingTo === board.id && (
                    <ClickAwayListener
                      onClickAway={() => {
                        setAddingTo(null);
                        setNewTaskTitle("");
                      }}
                    >
                      <Card sx={{ borderRadius: 1.5, mb: 1.5 }}>
                        <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                          <TextField
                            autoFocus
                            fullWidth
                            size="small"
                            placeholder="タスク名を入力"
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleAddTask(board.id);
                              if (e.key === "Escape") {
                                setAddingTo(null);
                                setNewTaskTitle("");
                              }
                            }}
                          />
                        </CardContent>
                      </Card>
                    </ClickAwayListener>
                  )}
                  <SortableContext
                    items={boardTasks.map((t) => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <Stack spacing={1.5}>
                      {boardTasks.map((task) => (
                        <DraggableCard
                          key={task.id}
                          task={task}
                          onUpdateTitle={handleUpdateTitle}
                          onUpdateDescription={handleUpdateDescription}
                          onToggleCompleted={handleToggleCompleted}
                          onDelete={handleDelete}
                          showIndicator={
                            taskDropIndicator?.taskId === task.id
                              ? taskDropIndicator.position
                              : null
                          }
                        />
                      ))}
                    </Stack>
                  </SortableContext>
                </SortableColumn>
              );
            })}
          </Box>
        </SortableContext>
        <DragOverlay>
          {activeTask && (
            <Card sx={{ borderRadius: 1.5, boxShadow: 4, opacity: 0.9 }}>
              <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <IconButton size="small" sx={{ p: 0, flexShrink: 0 }}>
                    {activeTask.completed ? (
                      <CheckCircleIcon color="success" fontSize="small" />
                    ) : (
                      <RadioButtonUncheckedIcon
                        fontSize="small"
                        sx={{ color: "text.secondary" }}
                      />
                    )}
                  </IconButton>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flex: 1, minWidth: 0 }}>
                    {activeTask.project && (
                      <Chip
                        label={activeTask.project.short_name}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: "0.7rem",
                          flexShrink: 0,
                          ...(activeTask.project.color && {
                            bgcolor: activeTask.project.color,
                            color: "white",
                          }),
                        }}
                      />
                    )}
                    <Typography variant="body1" noWrap>
                      {activeTask.title}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          )}
          {activeBoard && (
            <Paper
              elevation={4}
              sx={{
                bgcolor: activeBoard.color,
                p: 2,
                borderRadius: 2,
                opacity: 0.9,
                minWidth: 200,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  color: "text.disabled",
                  mb: 0.5,
                }}
              >
                <DragHandleIcon fontSize="small" />
              </Box>
              <Typography variant="subtitle1" fontWeight="bold">
                {activeBoard.label}
              </Typography>
            </Paper>
          )}
        </DragOverlay>
      </DndContext>
      <Snackbar
        open={deletedTask !== null}
        autoHideDuration={5000}
        onClose={() => setDeletedTask(null)}
        message={`「${deletedTask?.title}」を削除しました`}
        action={
          <Button color="inherit" size="small" onClick={handleUndoDelete}>
            元に戻す
          </Button>
        }
      />
    </>
  );
}

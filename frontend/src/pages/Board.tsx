import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
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
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
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

function DroppableColumn({
  board,
  children,
}: {
  board: Board;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: board.id });
  return (
    <Paper
      ref={setNodeRef}
      elevation={0}
      sx={{
        bgcolor: board.color,
        p: 2,
        borderRadius: 2,
        minHeight: 300,
        outline: isOver ? "2px solid" : "none",
        outlineColor: "primary.main",
        transition: "outline 0.15s",
      }}
    >
      {children}
    </Paper>
  );
}

function DraggableCard({
  task,
  onUpdateTitle,
  onToggleCompleted,
  onDelete,
}: {
  task: Task;
  onUpdateTitle: (taskId: string, title: string) => void;
  onToggleCompleted: (task: Task) => void;
  onDelete: (task: Task) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingTitle, setEditingTitle] = useState("");

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: task.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.3 : 1,
  };

  const commitEdit = () => {
    setIsEditing(false);
    const title = editingTitle.trim();
    if (title && title !== task.title) {
      onUpdateTitle(task.id, title);
    }
  };

  const handleTitleClick = () => {
    // ドラッグ中でなければ編集モードに
    if (!isDragging) {
      setIsEditing(true);
      setEditingTitle(task.title);
    }
  };

  return (
    <Card
      ref={setNodeRef}
      sx={{ borderRadius: 1.5, cursor: "grab", ...style }}
      {...listeners}
      {...attributes}
    >
      <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
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
          {isEditing ? (
            <TextField
              autoFocus
              fullWidth
              size="small"
              variant="standard"
              value={editingTitle}
              onChange={(e) => setEditingTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitEdit();
                if (e.key === "Escape") setIsEditing(false);
              }}
              onBlur={commitEdit}
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
              onClick={handleTitleClick}
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
      </CardContent>
    </Card>
  );
}

function TaskCardOverlay({ task }: { task: Task }) {
  return (
    <Card sx={{ borderRadius: 1.5, boxShadow: 6, width: 300 }}>
      <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          {task.project && (
            <Chip
              label={task.project.short_name}
              size="small"
              sx={{
                height: 20,
                fontSize: "0.7rem",
                ...(task.project.color && {
                  bgcolor: task.project.color,
                  color: "white",
                }),
              }}
            />
          )}
          <Typography variant="body1">{task.title}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function BoardPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [deletedTask, setDeletedTask] = useState<Task | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

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
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const newBoardId = over.id as string;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.board_id === newBoardId) return;

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, board_id: newBoardId } : t
      )
    );

    fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ board_id: newBoardId }),
    }).catch((err) => setError(err.message));
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
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: `repeat(${boards.length}, 1fr)` },
            gap: 2,
          }}
        >
          {boards.map((board) => {
            const boardTasks = tasks.filter((t) => t.board_id === board.id);
            return (
              <DroppableColumn key={board.id} board={board}>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {board.label}
                  </Typography>
                  <Chip
                    label={boardTasks.length}
                    size="small"
                    sx={{ ml: 1 }}
                  />
                  <IconButton
                    size="small"
                    sx={{ ml: "auto" }}
                    onClick={() => setAddingTo(board.id)}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Box>
                {addingTo === board.id && (
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
                      <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => handleAddTask(board.id)}
                        >
                          追加
                        </Button>
                        <Button
                          size="small"
                          onClick={() => {
                            setAddingTo(null);
                            setNewTaskTitle("");
                          }}
                        >
                          キャンセル
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                )}
                <Stack spacing={1.5}>
                  {boardTasks.map((task) => (
                    <DraggableCard
                      key={task.id}
                      task={task}
                      onUpdateTitle={handleUpdateTitle}
                      onToggleCompleted={handleToggleCompleted}
                      onDelete={handleDelete}
                    />
                  ))}
                </Stack>
              </DroppableColumn>
            );
          })}
        </Box>
        <DragOverlay>
          {activeTask ? <TaskCardOverlay task={activeTask} /> : null}
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

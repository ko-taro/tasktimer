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
import AccessTimeIcon from "@mui/icons-material/AccessTime";
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

type Task = {
  id: string;
  title: string;
  category: string;
  completed: boolean;
  pomodoro_count: number;
  total_seconds: number;
};

type Column = {
  key: string;
  label: string;
  color: string;
};

const COLUMNS: Column[] = [
  { key: "high", label: "High", color: "#fce4ec" },
  { key: "medium", label: "Medium", color: "#fff3e0" },
  { key: "low", label: "Low", color: "#e3f2fd" },
];

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function DroppableColumn({
  col,
  children,
}: {
  col: Column;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key });
  return (
    <Paper
      ref={setNodeRef}
      elevation={0}
      sx={{
        bgcolor: col.color,
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
            <Typography
              variant="body1"
              sx={{
                cursor: "pointer",
                flex: 1,
                ...(task.completed && {
                  textDecoration: "line-through",
                  color: "text.disabled",
                }),
              }}
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
                setEditingTitle(task.title);
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {task.title}
            </Typography>
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
        {(task.pomodoro_count > 0 || task.total_seconds > 0) && (
          <Box
            sx={{
              display: "flex",
              gap: 1,
              mt: 1,
              ml: 4,
              alignItems: "center",
            }}
          >
            {task.pomodoro_count > 0 && (
              <Chip
                label={`🍅 ${task.pomodoro_count}`}
                size="small"
                variant="outlined"
              />
            )}
            {task.total_seconds > 0 && (
              <Chip
                icon={<AccessTimeIcon />}
                label={formatTime(task.total_seconds)}
                size="small"
                variant="outlined"
              />
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

function TaskCardOverlay({ task }: { task: Task }) {
  return (
    <Card sx={{ borderRadius: 1.5, boxShadow: 6, width: 300 }}>
      <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Typography variant="body1">{task.title}</Typography>
      </CardContent>
    </Card>
  );
}

export default function Board() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [deletedTask, setDeletedTask] = useState<Task | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleAddTask = (category: string) => {
    const title = newTaskTitle.trim();
    if (!title) {
      setAddingTo(null);
      setNewTaskTitle("");
      return;
    }
    fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, category }),
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
        category: task.category,
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
    const newCategory = over.id as string;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.category === newCategory) return;

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, category: newCategory } : t
      )
    );

    fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: newCategory }),
    }).catch((err) => setError(err.message));
  };

  useEffect(() => {
    fetch("/api/tasks")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setTasks)
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
            gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
            gap: 2,
          }}
        >
          {COLUMNS.map((col) => {
            const columnTasks = tasks.filter((t) => t.category === col.key);
            return (
              <DroppableColumn key={col.key} col={col}>
                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {col.label}
                  </Typography>
                  <Chip
                    label={columnTasks.length}
                    size="small"
                    sx={{ ml: 1 }}
                  />
                  <IconButton
                    size="small"
                    sx={{ ml: "auto" }}
                    onClick={() => setAddingTo(col.key)}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Box>
                {addingTo === col.key && (
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
                          if (e.key === "Enter") handleAddTask(col.key);
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
                          onClick={() => handleAddTask(col.key)}
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
                  {columnTasks.map((task) => (
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

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";

type Project = {
  id: string;
  name: string;
  short_name: string;
  color: string | null;
};

type ProjectTask = {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  board_id: string | null;
  board_name: string | null;
  sort_order: number | null;
};

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  useEffect(() => {
    if (!projectId) return;

    // プロジェクト情報とタスク一覧を並行取得
    Promise.all([
      fetch(`/api/projects/${projectId}`).then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      }),
      fetch(`/api/projects/${projectId}/tasks`).then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      }),
    ])
      .then(([projectData, tasksData]) => {
        setProject(projectData);
        setTasks(tasksData);
      })
      .catch((err) => setError(err.message));
  }, [projectId]);

  const handleAddTask = () => {
    if (!newTaskTitle.trim() || !projectId) return;

    fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTaskTitle.trim(),
        project_id: projectId,
        // board_id は指定しない（未割り当て）
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((task) => {
        setTasks((prev) => [
          {
            id: task.id,
            title: task.title,
            description: task.description,
            completed: task.completed,
            board_id: null,
            board_name: null,
            sort_order: null,
          },
          ...prev,
        ]);
        setNewTaskTitle("");
        setIsAdding(false);
      })
      .catch((err) => setError(err.message));
  };

  const handleToggleComplete = (taskId: string, completed: boolean) => {
    fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(() => {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, completed } : t))
        );
      })
      .catch((err) => setError(err.message));
  };

  const handleDeleteTask = (taskId: string) => {
    fetch(`/api/tasks/${taskId}`, { method: "DELETE" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
      })
      .catch((err) => setError(err.message));
  };

  if (error) {
    return (
      <Box sx={{ mt: 4, textAlign: "center" }}>
        <Typography color="error">Error: {error}</Typography>
        <Button component={Link} to="/projects" sx={{ mt: 2 }}>
          Back to Projects
        </Button>
      </Box>
    );
  }

  if (!project) {
    return (
      <Typography sx={{ mt: 4, textAlign: "center" }}>Loading...</Typography>
    );
  }

  const unassignedTasks = tasks.filter((t) => !t.board_id);
  const assignedTasks = tasks.filter((t) => t.board_id);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
        <IconButton component={Link} to="/projects">
          <ArrowBackIcon />
        </IconButton>
        <Box
          sx={{
            width: 48,
            height: 48,
            bgcolor: project.color || "#ccc",
            borderRadius: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontWeight: "bold",
            fontSize: "1rem",
            flexShrink: 0,
          }}
        >
          {project.short_name.slice(0, 2).toUpperCase()}
        </Box>
        <Box>
          <Typography variant="h5" fontWeight="bold">
            {project.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {tasks.length} tasks
          </Typography>
        </Box>
      </Box>

      {/* Add Task */}
      <Box sx={{ mb: 3 }}>
        {isAdding ? (
          <Card sx={{ maxWidth: 500 }}>
            <CardContent>
              <Stack spacing={2}>
                <TextField
                  autoFocus
                  fullWidth
                  size="small"
                  label="Task Title"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddTask();
                    if (e.key === "Escape") {
                      setIsAdding(false);
                      setNewTaskTitle("");
                    }
                  }}
                />
                <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
                  <Button
                    size="small"
                    onClick={() => {
                      setIsAdding(false);
                      setNewTaskTitle("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleAddTask}
                    disabled={!newTaskTitle.trim()}
                  >
                    Add Task
                  </Button>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        ) : (
          <Button
            startIcon={<AddIcon />}
            variant="outlined"
            onClick={() => setIsAdding(true)}
          >
            Add Task
          </Button>
        )}
      </Box>

      {/* Unassigned Tasks */}
      {unassignedTasks.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
            Inbox (Unassigned)
          </Typography>
          <Stack spacing={1}>
            {unassignedTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggleComplete={handleToggleComplete}
                onDelete={handleDeleteTask}
              />
            ))}
          </Stack>
        </Box>
      )}

      {/* Assigned Tasks */}
      {assignedTasks.length > 0 && (
        <Box>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
            On Board
          </Typography>
          <Stack spacing={1}>
            {assignedTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggleComplete={handleToggleComplete}
                onDelete={handleDeleteTask}
              />
            ))}
          </Stack>
        </Box>
      )}

      {/* Empty State */}
      {tasks.length === 0 && (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <Typography color="text.secondary">
            No tasks yet. Add your first task!
          </Typography>
        </Box>
      )}
    </Box>
  );
}

function TaskItem({
  task,
  onToggleComplete,
  onDelete,
}: {
  task: ProjectTask;
  onToggleComplete: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Card sx={{ maxWidth: 500 }}>
      <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Checkbox
            checked={task.completed}
            onChange={(e) => onToggleComplete(task.id, e.target.checked)}
            size="small"
          />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{
                textDecoration: task.completed ? "line-through" : "none",
                color: task.completed ? "text.secondary" : "text.primary",
              }}
              noWrap
            >
              {task.title}
            </Typography>
          </Box>
          {task.board_name && (
            <Chip label={task.board_name} size="small" variant="outlined" />
          )}
          <IconButton size="small" onClick={() => onDelete(task.id)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      </CardContent>
    </Card>
  );
}

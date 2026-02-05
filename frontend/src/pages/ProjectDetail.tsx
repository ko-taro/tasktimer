import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  ClickAwayListener,
  Collapse,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import UnarchiveIcon from "@mui/icons-material/Unarchive";
import ArchiveIcon from "@mui/icons-material/Archive";
import EditIcon from "@mui/icons-material/Edit";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import EventIcon from "@mui/icons-material/Event";

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
  scheduled_start: string | null;
  scheduled_end: string | null;
  completed_at: string | null;
  archived_at: string | null;
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
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskStartDate, setNewTaskStartDate] = useState("");
  const [newTaskEndDate, setNewTaskEndDate] = useState("");
  const [showAddDetails, setShowAddDetails] = useState(false);

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

  const resetAddForm = () => {
    setNewTaskTitle("");
    setNewTaskDescription("");
    setNewTaskStartDate("");
    setNewTaskEndDate("");
    setShowAddDetails(false);
    setIsAdding(false);
  };

  const handleAddTask = () => {
    if (!newTaskTitle.trim() || !projectId) return;

    fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTaskTitle.trim(),
        description: newTaskDescription.trim() || null,
        scheduled_start: newTaskStartDate || null,
        scheduled_end: newTaskEndDate || null,
        project_id: projectId,
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
            scheduled_start: task.scheduled_start,
            scheduled_end: task.scheduled_end,
            completed_at: task.completed_at,
            archived_at: null,
            board_id: null,
            board_name: null,
            sort_order: null,
          },
          ...prev,
        ]);
        resetAddForm();
      })
      .catch((err) => setError(err.message));
  };

  const handleUpdateTask = (taskId: string, updates: Partial<ProjectTask>) => {
    fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((updated) => {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  title: updated.title,
                  description: updated.description,
                  scheduled_start: updated.scheduled_start,
                  scheduled_end: updated.scheduled_end,
                }
              : t
          )
        );
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
      .then((updated) => {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, completed_at: updated.completed_at } : t))
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

  const handleArchive = (taskId: string, archive: boolean) => {
    fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: archive }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((updated) => {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId ? { ...t, archived_at: updated.archived_at } : t
          )
        );
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

  const activeTasks = tasks.filter((t) => !t.archived_at);
  const archivedTasks = tasks.filter((t) => t.archived_at);
  const unassignedTasks = activeTasks.filter((t) => !t.board_id);
  const assignedTasks = activeTasks.filter((t) => t.board_id);

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
                  label="タイトル"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !showAddDetails) handleAddTask();
                    if (e.key === "Escape") resetAddForm();
                  }}
                />
                <Button
                  size="small"
                  startIcon={showAddDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  onClick={() => setShowAddDetails(!showAddDetails)}
                  sx={{ alignSelf: "flex-start" }}
                >
                  {showAddDetails ? "詳細を隠す" : "詳細を追加"}
                </Button>
                <Collapse in={showAddDetails}>
                  <Stack spacing={2}>
                    <TextField
                      fullWidth
                      size="small"
                      label="説明"
                      multiline
                      minRows={2}
                      value={newTaskDescription}
                      onChange={(e) => setNewTaskDescription(e.target.value)}
                    />
                    <Box sx={{ display: "flex", gap: 2 }}>
                      <TextField
                        size="small"
                        label="開始予定日"
                        type="date"
                        value={newTaskStartDate}
                        onChange={(e) => setNewTaskStartDate(e.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }}
                        sx={{ flex: 1 }}
                      />
                      <TextField
                        size="small"
                        label="終了予定日"
                        type="date"
                        value={newTaskEndDate}
                        onChange={(e) => setNewTaskEndDate(e.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }}
                        sx={{ flex: 1 }}
                      />
                    </Box>
                  </Stack>
                </Collapse>
                <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
                  <Button size="small" onClick={resetAddForm}>
                    キャンセル
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleAddTask}
                    disabled={!newTaskTitle.trim()}
                  >
                    追加
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
            タスクを追加
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
                onArchive={handleArchive}
                onUpdate={handleUpdateTask}
              />
            ))}
          </Stack>
        </Box>
      )}

      {/* Assigned Tasks */}
      {assignedTasks.length > 0 && (
        <Box sx={{ mb: 4 }}>
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
                onArchive={handleArchive}
                onUpdate={handleUpdateTask}
              />
            ))}
          </Stack>
        </Box>
      )}

      {/* Archived Tasks */}
      {archivedTasks.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1, color: "text.secondary" }}>
            Archived ({archivedTasks.length})
          </Typography>
          <Stack spacing={1}>
            {archivedTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onToggleComplete={handleToggleComplete}
                onDelete={handleDeleteTask}
                onArchive={handleArchive}
                onUpdate={handleUpdateTask}
                isArchived
              />
            ))}
          </Stack>
        </Box>
      )}

      {/* Empty State */}
      {activeTasks.length === 0 && archivedTasks.length === 0 && (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <Typography color="text.secondary">
            No tasks yet. Add your first task!
          </Typography>
        </Box>
      )}
    </Box>
  );
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
}

function TaskItem({
  task,
  onToggleComplete,
  onDelete,
  onArchive,
  onUpdate,
  isArchived = false,
}: {
  task: ProjectTask;
  onToggleComplete: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string, archive: boolean) => void;
  onUpdate: (id: string, updates: Partial<ProjectTask>) => void;
  isArchived?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description || "");
  const [editStartDate, setEditStartDate] = useState(task.scheduled_start || "");
  const [editEndDate, setEditEndDate] = useState(task.scheduled_end || "");

  const handleSave = () => {
    if (!editTitle.trim()) return;
    onUpdate(task.id, {
      title: editTitle.trim(),
      description: editDescription.trim() || null,
      scheduled_start: editStartDate || null,
      scheduled_end: editEndDate || null,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(task.title);
    setEditDescription(task.description || "");
    setEditStartDate(task.scheduled_start || "");
    setEditEndDate(task.scheduled_end || "");
    setIsEditing(false);
  };

  const hasDateInfo = task.scheduled_start || task.scheduled_end;

  if (isEditing) {
    return (
      <ClickAwayListener onClickAway={handleSave}>
        <Card sx={{ maxWidth: 500 }}>
          <CardContent>
            <Stack spacing={2}>
              <TextField
                autoFocus
                fullWidth
                size="small"
                label="タイトル"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") handleCancel();
                }}
              />
              <TextField
                fullWidth
                size="small"
                label="説明"
                multiline
                minRows={2}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
              <Box sx={{ display: "flex", gap: 2 }}>
                <TextField
                  size="small"
                  label="開始予定日"
                  type="date"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                  sx={{ flex: 1 }}
                />
                <TextField
                  size="small"
                  label="終了予定日"
                  type="date"
                  value={editEndDate}
                  onChange={(e) => setEditEndDate(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                  sx={{ flex: 1 }}
                />
              </Box>
              <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
                <Button size="small" onClick={handleCancel}>
                  キャンセル
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={handleSave}
                  disabled={!editTitle.trim()}
                >
                  保存
                </Button>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </ClickAwayListener>
    );
  }

  return (
    <Card sx={{ maxWidth: 500, opacity: isArchived ? 0.6 : 1 }}>
      <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
          <Checkbox
            checked={!!task.completed_at}
            onChange={(e) => onToggleComplete(task.id, e.target.checked)}
            size="small"
            disabled={isArchived}
            sx={{ mt: -0.5 }}
          />
          <Box
            sx={{ flex: 1, minWidth: 0, cursor: "pointer" }}
            onClick={() => !isArchived && setIsEditing(true)}
          >
            <Typography
              sx={{
                textDecoration: task.completed_at ? "line-through" : "none",
                color: task.completed_at ? "text.secondary" : "text.primary",
              }}
            >
              {task.title}
            </Typography>
            {task.description && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  mt: 0.5,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}
              >
                {task.description}
              </Typography>
            )}
            {hasDateInfo && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
                <EventIcon sx={{ fontSize: 14, color: "text.disabled" }} />
                <Typography variant="caption" color="text.secondary">
                  {task.scheduled_start && task.scheduled_end
                    ? `${formatDate(task.scheduled_start)} 〜 ${formatDate(task.scheduled_end)}`
                    : task.scheduled_start
                      ? `開始: ${formatDate(task.scheduled_start)}`
                      : `期限: ${formatDate(task.scheduled_end)}`}
                </Typography>
              </Box>
            )}
          </Box>
          {task.board_name && (
            <Chip label={task.board_name} size="small" variant="outlined" />
          )}
          {!isArchived && (
            <IconButton
              size="small"
              onClick={() => setIsEditing(true)}
              title="編集"
            >
              <EditIcon fontSize="small" />
            </IconButton>
          )}
          {isArchived ? (
            <IconButton
              size="small"
              onClick={() => onArchive(task.id, false)}
              title="アーカイブ解除"
            >
              <UnarchiveIcon fontSize="small" />
            </IconButton>
          ) : (
            task.completed_at && (
              <IconButton
                size="small"
                onClick={() => onArchive(task.id, true)}
                title="アーカイブ"
              >
                <ArchiveIcon fontSize="small" />
              </IconButton>
            )
          )}
          <IconButton size="small" onClick={() => onDelete(task.id)}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      </CardContent>
    </Card>
  );
}

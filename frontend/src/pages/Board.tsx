import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  ClickAwayListener,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Drawer,
  FormControlLabel,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
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
import ArchiveIcon from "@mui/icons-material/Archive";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import DragHandleIcon from "@mui/icons-material/DragHandle";
import MenuIcon from "@mui/icons-material/Menu";
import EditIcon from "@mui/icons-material/Edit";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
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
  scheduled_start: string | null;
  scheduled_end: string | null;
  completed_at: string | null;
  archived_at: string | null;
  project: Project | null;
};

type InboxTask = {
  id: string;
  title: string;
  description: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  completed_at: string | null;
  archived_at: string | null;
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
  onArchive,
  showIndicator,
}: {
  task: Task;
  onUpdateTitle: (taskId: string, title: string) => void;
  onUpdateDescription: (taskId: string, description: string) => void;
  onToggleCompleted: (task: Task) => void;
  onDelete: (task: Task) => void;
  onArchive: (task: Task) => void;
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
            {task.completed_at ? (
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
                  ...(task.completed_at && {
                    textDecoration: "line-through",
                    color: "text.disabled",
                  }),
                }}
              >
                {task.title}
              </Typography>
            </Box>
          )}
          <Box sx={{ display: "flex", alignItems: "center", ml: "auto", flexShrink: 0 }}>
            {task.completed_at && (
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  onArchive(task);
                }}
                sx={{ p: 0 }}
                title="アーカイブ"
              >
                <ArchiveIcon fontSize="small" sx={{ color: "text.disabled" }} />
              </IconButton>
            )}
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(task);
              }}
              sx={{ p: 0 }}
            >
              <DeleteIcon fontSize="small" sx={{ color: "text.disabled" }} />
            </IconButton>
          </Box>
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

function InboxTaskCard({
  task,
  onToggleCompleted,
  onDelete,
}: {
  task: InboxTask;
  onToggleCompleted: (task: InboxTask) => void;
  onDelete: (task: InboxTask) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      sx={{ minWidth: 200, maxWidth: 300, borderRadius: 1.5, cursor: "grab" }}
      {...attributes}
      {...listeners}
    >
      <CardContent sx={{ py: 1, "&:last-child": { pb: 1 } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <IconButton
            size="small"
            sx={{ p: 0, flexShrink: 0 }}
            onClick={(e) => {
              e.stopPropagation();
              onToggleCompleted(task);
            }}
          >
            {task.completed_at ? (
              <CheckCircleIcon color="success" fontSize="small" />
            ) : (
              <RadioButtonUncheckedIcon fontSize="small" sx={{ color: "text.secondary" }} />
            )}
          </IconButton>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flex: 1, minWidth: 0 }}>
            {task.project && (
              <Chip
                label={task.project.short_name}
                size="small"
                sx={{
                  height: 18,
                  fontSize: "0.65rem",
                  flexShrink: 0,
                  ...(task.project.color && { bgcolor: task.project.color, color: "white" }),
                }}
              />
            )}
            <Typography
              variant="body2"
              noWrap
              sx={{
                textDecoration: task.completed_at ? "line-through" : "none",
                color: task.completed_at ? "text.secondary" : "text.primary",
              }}
            >
              {task.title}
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task);
            }}
            sx={{ p: 0.25 }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      </CardContent>
    </Card>
  );
}

const SIDEBAR_WIDTH = 280;

// ボード用プリセットカラー（パステル調の背景色）
const BOARD_COLORS = [
  "#fce4ec", // ピンク
  "#fff3e0", // オレンジ
  "#fff9c4", // イエロー
  "#e8f5e9", // グリーン
  "#e3f2fd", // ブルー
  "#ede7f6", // パープル
  "#fafafa", // グレー
  "#e0f7fa", // シアン
];

function BoardColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
      {BOARD_COLORS.map((color) => (
        <Box
          key={color}
          onClick={() => onChange(color)}
          sx={{
            width: 24,
            height: 24,
            bgcolor: color,
            borderRadius: 0.5,
            cursor: "pointer",
            border: value === color ? "2px solid #333" : "2px solid #ddd",
            "&:hover": { opacity: 0.8 },
          }}
        />
      ))}
    </Box>
  );
}

export default function BoardPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [inboxTasks, setInboxTasks] = useState<InboxTask[]>([]);
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

  // サイドバー関連（localStorageから初期値を読み込み）
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("board-sidebar-open");
    return saved ? JSON.parse(saved) : false;
  });
  const [hiddenBoards, setHiddenBoards] = useState<Set<string>>(() => {
    const saved = localStorage.getItem("board-hidden-boards");
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [isAddingBoard, setIsAddingBoard] = useState(false);
  const [newBoardLabel, setNewBoardLabel] = useState("");
  const [newBoardColor, setNewBoardColor] = useState("#e3f2fd");
  const [editingBoardId, setEditingBoardId] = useState<string | null>(null);
  const [editingBoardLabel, setEditingBoardLabel] = useState("");
  const [editingBoardColor, setEditingBoardColor] = useState("");
  const [deletingBoardId, setDeletingBoardId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // サイドバー状態をlocalStorageに保存
  useEffect(() => {
    localStorage.setItem("board-sidebar-open", JSON.stringify(sidebarOpen));
  }, [sidebarOpen]);

  useEffect(() => {
    localStorage.setItem("board-hidden-boards", JSON.stringify([...hiddenBoards]));
  }, [hiddenBoards]);

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
      body: JSON.stringify({ completed: !task.completed_at }),
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

  const handleArchive = (task: Task) => {
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
        // アーカイブされたタスクをリストから削除
        setTasks((prev) => prev.filter((t) => t.id !== task.id));
      })
      .catch((err) => setError(err.message));
  };

  // ボード管理関連
  const handleAddBoard = () => {
    const label = newBoardLabel.trim();
    if (!label) {
      setIsAddingBoard(false);
      setNewBoardLabel("");
      return;
    }
    fetch("/api/boards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, color: newBoardColor }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((board: Board) => {
        setBoards((prev) => [...prev, board]);
        setNewBoardLabel("");
        setNewBoardColor("#e3f2fd");
        setIsAddingBoard(false);
      })
      .catch((err) => setError(err.message));
  };

  const handleUpdateBoard = (boardId: string) => {
    const label = editingBoardLabel.trim();
    if (!label) {
      setEditingBoardId(null);
      return;
    }
    fetch(`/api/boards/${boardId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, color: editingBoardColor }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((updated: Board) => {
        setBoards((prev) =>
          prev.map((b) => (b.id === updated.id ? updated : b))
        );
        setEditingBoardId(null);
      })
      .catch((err) => setError(err.message));
  };

  const handleDeleteBoard = (boardId: string) => {
    setDeletingBoardId(boardId);
  };

  const confirmDeleteBoard = () => {
    if (!deletingBoardId) return;
    const boardId = deletingBoardId;
    setDeletingBoardId(null);

    fetch(`/api/boards/${boardId}`, { method: "DELETE" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setBoards((prev) => prev.filter((b) => b.id !== boardId));
        // ボード内のタスクを未割り当てに移動
        const boardTaskIds = tasks.filter((t) => t.board_id === boardId).map((t) => t.id);
        setTasks((prev) => prev.filter((t) => t.board_id !== boardId));
        // 未割り当てタスクとして追加
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
      .catch((err) => setError(err.message));
  };

  const toggleBoardVisibility = (boardId: string) => {
    setHiddenBoards((prev) => {
      const next = new Set(prev);
      if (next.has(boardId)) {
        next.delete(boardId);
      } else {
        next.add(boardId);
      }
      return next;
    });
  };

  const visibleBoards = boards.filter((b) => !hiddenBoards.has(b.id));

  const handleDragStart = (event: DragStartEvent) => {
    const activeId = event.active.id as string;

    // ボードをドラッグしているか確認
    const board = boards.find((b) => b.id === activeId);
    if (board) {
      setActiveBoard(board);
      setActiveTask(null);
      return;
    }

    // ボード上のタスクをドラッグ
    const task = tasks.find((t) => t.id === activeId);
    if (task) {
      setActiveTask(task);
      setActiveBoard(null);
      setOriginalBoardId(task.board_id);
      return;
    }

    // Inboxタスクをドラッグ
    const inboxTask = inboxTasks.find((t) => t.id === activeId);
    if (inboxTask) {
      // InboxTaskをTaskとして扱う（board_idは空文字で仮設定）
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
    const activeInboxItem = inboxTasks.find((t) => t.id === activeId);
    if (!activeTaskItem && !activeInboxItem) {
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

    // Inboxタスクの場合はboard_idの一時更新は不要
    if (activeInboxItem || !activeTaskItem) {
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

    if (!over) {
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
      targetBoardId = overTask.board_id;
      const boardTasks = tasks
        .filter((t) => t.id !== activeId && t.board_id === targetBoardId)
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

    // InboxタスクをボードにD&D
    if (!sourceBoardId) {
      const inboxTask = inboxTasks.find((t) => t.id === activeId);
      if (!inboxTask) return;

      // Inboxから削除してtasksに追加
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

      // API呼び出し
      fetch(`/api/tasks/${activeId}/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ board_id: targetBoardId, sort_order: newIndex }),
      }).catch((err) => setError(err.message));
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
      fetch("/api/tasks/unassigned").then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      }),
    ])
      .then(([boardsData, tasksData, inboxData]) => {
        setBoards(boardsData);
        setTasks(tasksData);
        setInboxTasks(inboxData);
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
    <Box sx={{ display: "flex" }}>
      {/* サイドバー */}
      <Drawer
        variant="persistent"
        anchor="left"
        open={sidebarOpen}
        sx={{
          width: sidebarOpen ? SIDEBAR_WIDTH : 0,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: SIDEBAR_WIDTH,
            boxSizing: "border-box",
            position: "relative",
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
            <Typography variant="h6" fontWeight="bold">
              <ViewColumnIcon sx={{ mr: 1, verticalAlign: "middle" }} />
              ボード管理
            </Typography>
            <IconButton size="small" onClick={() => setSidebarOpen(false)}>
              <MenuIcon />
            </IconButton>
          </Box>

          {/* ボード一覧 */}
          <List dense>
            {boards.map((board) => (
              <ListItem
                key={board.id}
                disablePadding
                secondaryAction={
                  editingBoardId !== board.id && (
                    <Box>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditingBoardId(board.id);
                          setEditingBoardLabel(board.label);
                          setEditingBoardColor(board.color);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteBoard(board.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  )
                }
              >
                {editingBoardId === board.id ? (
                  <Box sx={{ p: 1, width: "100%" }}>
                    <TextField
                      size="small"
                      fullWidth
                      value={editingBoardLabel}
                      onChange={(e) => setEditingBoardLabel(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleUpdateBoard(board.id);
                        if (e.key === "Escape") setEditingBoardId(null);
                      }}
                      sx={{ mb: 1 }}
                    />
                    <Box sx={{ mb: 1 }}>
                      <BoardColorPicker value={editingBoardColor} onChange={setEditingBoardColor} />
                    </Box>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Button size="small" onClick={() => handleUpdateBoard(board.id)}>
                        保存
                      </Button>
                      <Button size="small" onClick={() => setEditingBoardId(null)}>
                        キャンセル
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  <ListItemButton onClick={() => toggleBoardVisibility(board.id)}>
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Checkbox
                        edge="start"
                        checked={!hiddenBoards.has(board.id)}
                        tabIndex={-1}
                        disableRipple
                        size="small"
                      />
                    </ListItemIcon>
                    <Box
                      sx={{
                        width: 16,
                        height: 16,
                        bgcolor: board.color,
                        borderRadius: 0.5,
                        mr: 1,
                        flexShrink: 0,
                      }}
                    />
                    <ListItemText primary={board.label} />
                  </ListItemButton>
                )}
              </ListItem>
            ))}
          </List>

          {/* ボード追加フォーム */}
          {isAddingBoard ? (
            <Box sx={{ mt: 2 }}>
              <TextField
                autoFocus
                size="small"
                fullWidth
                placeholder="ボード名"
                value={newBoardLabel}
                onChange={(e) => setNewBoardLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddBoard();
                  if (e.key === "Escape") {
                    setIsAddingBoard(false);
                    setNewBoardLabel("");
                  }
                }}
                sx={{ mb: 1 }}
              />
              <Box sx={{ mb: 1 }}>
                <BoardColorPicker value={newBoardColor} onChange={setNewBoardColor} />
              </Box>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button size="small" variant="contained" onClick={handleAddBoard}>
                  追加
                </Button>
                <Button
                  size="small"
                  onClick={() => {
                    setIsAddingBoard(false);
                    setNewBoardLabel("");
                  }}
                >
                  キャンセル
                </Button>
              </Box>
            </Box>
          ) : (
            <Button
              startIcon={<AddIcon />}
              fullWidth
              sx={{ mt: 2 }}
              onClick={() => setIsAddingBoard(true)}
            >
              ボードを追加
            </Button>
          )}
        </Box>
      </Drawer>

      {/* メインコンテンツ */}
      <Box sx={{ flexGrow: 1, p: 2 }}>
        {/* サイドバー開閉ボタン */}
        {!sidebarOpen && (
          <IconButton
            onClick={() => setSidebarOpen(true)}
            sx={{ mb: 2 }}
            title="ボード管理を開く"
          >
            <MenuIcon />
          </IconButton>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          {/* Inbox (未割り当てタスク) */}
          {inboxTasks.length > 0 && (
            <Paper sx={{ p: 2, mb: 3, bgcolor: "grey.50" }}>
              <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5, color: "text.secondary" }}>
                Inbox ({inboxTasks.length})
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {inboxTasks.map((task) => (
                <InboxTaskCard
                  key={task.id}
                  task={task}
                  onToggleCompleted={(t) => {
                    fetch(`/api/tasks/${t.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ completed: !t.completed_at }),
                    })
                      .then((res) => {
                        if (!res.ok) throw new Error(`HTTP ${res.status}`);
                        return res.json();
                      })
                      .then((updated) => {
                        setInboxTasks((prev) =>
                          prev.map((it) => (it.id === t.id ? { ...it, completed_at: updated.completed_at } : it))
                        );
                      })
                      .catch((err) => setError(err.message));
                  }}
                  onDelete={(t) => {
                    setInboxTasks((prev) => prev.filter((it) => it.id !== t.id));
                    fetch(`/api/tasks/${t.id}`, { method: "DELETE" }).catch((err) =>
                      setError(err.message)
                    );
                  }}
                />
              ))}
            </Box>
          </Paper>
        )}

        <SortableContext
          items={visibleBoards.map((b) => b.id)}
          strategy={horizontalListSortingStrategy}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: `repeat(${visibleBoards.length}, 1fr)` },
              gap: 2,
            }}
          >
            {visibleBoards.map((board) => {
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
                          onArchive={handleArchive}
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
                    {activeTask.completed_at ? (
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

        {/* ボード削除確認ダイアログ */}
        <Dialog
          open={deletingBoardId !== null}
          onClose={() => setDeletingBoardId(null)}
        >
          <DialogTitle>ボードを削除</DialogTitle>
          <DialogContent>
            <DialogContentText>
              「{boards.find((b) => b.id === deletingBoardId)?.label}」を削除しますか？
              ボード内のタスクは未割り当てになります。
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeletingBoardId(null)}>キャンセル</Button>
            <Button onClick={confirmDeleteBoard} color="error" variant="contained">
              削除
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
}

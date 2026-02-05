import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  ClickAwayListener,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DragHandleIcon from "@mui/icons-material/DragHandle";
import MenuIcon from "@mui/icons-material/Menu";
import { DndContext, DragOverlay, pointerWithin } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";

import {
  SortableColumn,
  DraggableCard,
  InboxTaskCard,
  BoardSidebar,
  useBoardDnd,
  useBoardApi,
  type Project,
  type Task,
  type InboxTask,
  type Board,
} from "../components/board";

export default function BoardPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [inboxTasks, setInboxTasks] = useState<InboxTask[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [deletedTask, setDeletedTask] = useState<Task | null>(null);

  // タスク追加フォーム
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  // サイドバー状態
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem("board-sidebar-open");
    return saved ? JSON.parse(saved) : false;
  });
  const [hiddenBoards, setHiddenBoards] = useState<Set<string>>(() => {
    const saved = localStorage.getItem("board-hidden-boards");
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  // ボード編集状態
  const [editingBoardId, setEditingBoardId] = useState<string | null>(null);
  const [editingBoardLabel, setEditingBoardLabel] = useState("");
  const [editingBoardColor, setEditingBoardColor] = useState("");

  // ボード追加状態
  const [isAddingBoard, setIsAddingBoard] = useState(false);
  const [newBoardLabel, setNewBoardLabel] = useState("");
  const [newBoardColor, setNewBoardColor] = useState("#e3f2fd");

  // ボード削除確認
  const [deletingBoardId, setDeletingBoardId] = useState<string | null>(null);

  // カスタムフック
  const {
    sensors,
    activeTask,
    activeBoard,
    boardDropIndicator,
    taskDropIndicator,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  } = useBoardDnd({
    boards,
    tasks,
    inboxTasks,
    setBoards,
    setTasks,
    setInboxTasks,
    setError,
  });

  const api = useBoardApi({
    tasks,
    setBoards,
    setTasks,
    setInboxTasks,
    setError,
    setDeletedTask,
  });

  // localStorage保存
  useEffect(() => {
    localStorage.setItem("board-sidebar-open", JSON.stringify(sidebarOpen));
  }, [sidebarOpen]);

  useEffect(() => {
    localStorage.setItem("board-hidden-boards", JSON.stringify([...hiddenBoards]));
  }, [hiddenBoards]);

  // 初期データ取得
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
      fetch("/api/projects").then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      }),
    ])
      .then(([boardsData, tasksData, inboxData, projectsData]) => {
        setBoards(boardsData);
        setTasks(tasksData);
        setInboxTasks(inboxData);
        setProjects(projectsData);
      })
      .catch((err) => setError(err.message));
  }, []);

  const resetAddTaskForm = () => {
    setAddingTo(null);
    setNewTaskTitle("");
  };

  const handleAddTask = (boardId: string) => {
    const input = newTaskTitle.trim();
    if (!input) {
      resetAddTaskForm();
      return;
    }

    // 「短縮名:タイトル」形式をパース
    let title = input;
    let projectId: string | null = null;

    const colonIndex = input.indexOf(":");
    if (colonIndex > 0) {
      const prefix = input.slice(0, colonIndex).trim().toLowerCase();
      const matchedProject = projects.find(
        (p) => p.short_name?.toLowerCase() === prefix
      );
      if (matchedProject) {
        title = input.slice(colonIndex + 1).trim();
        projectId = matchedProject.id;
      }
    }

    if (!title) {
      resetAddTaskForm();
      return;
    }

    api.addTask(title, boardId, projectId).then(() => {
      // タイトルだけクリアして、フォームは開いたまま（連続追加）
      setNewTaskTitle("");
    });
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

  const handleEditBoardStart = (board: Board) => {
    setEditingBoardId(board.id);
    setEditingBoardLabel(board.label);
    setEditingBoardColor(board.color);
  };

  const handleEditBoardSave = (boardId: string) => {
    const label = editingBoardLabel.trim();
    if (!label) {
      setEditingBoardId(null);
      return;
    }
    api.updateBoard(boardId, label, editingBoardColor).then(() => {
      setEditingBoardId(null);
    });
  };

  const handleAddBoardSave = () => {
    const label = newBoardLabel.trim();
    if (!label) {
      setIsAddingBoard(false);
      setNewBoardLabel("");
      return;
    }
    api.addBoard(label, newBoardColor).then(() => {
      setNewBoardLabel("");
      setNewBoardColor("#e3f2fd");
      setIsAddingBoard(false);
    });
  };

  const confirmDeleteBoard = () => {
    if (!deletingBoardId) return;
    api.deleteBoard(deletingBoardId).then(() => {
      setDeletingBoardId(null);
    });
  };

  const visibleBoards = boards.filter((b) => !hiddenBoards.has(b.id));

  if (error) {
    return (
      <Typography color="error" sx={{ mt: 4, textAlign: "center" }}>
        API接続エラー: {error}
      </Typography>
    );
  }

  return (
    <Box sx={{ display: "flex" }}>
      <BoardSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        boards={boards}
        hiddenBoards={hiddenBoards}
        onToggleVisibility={toggleBoardVisibility}
        editingBoardId={editingBoardId}
        editingBoardLabel={editingBoardLabel}
        editingBoardColor={editingBoardColor}
        onEditStart={handleEditBoardStart}
        onEditLabelChange={setEditingBoardLabel}
        onEditColorChange={setEditingBoardColor}
        onEditSave={handleEditBoardSave}
        onEditCancel={() => setEditingBoardId(null)}
        isAdding={isAddingBoard}
        newBoardLabel={newBoardLabel}
        newBoardColor={newBoardColor}
        onAddStart={() => setIsAddingBoard(true)}
        onAddLabelChange={setNewBoardLabel}
        onAddColorChange={setNewBoardColor}
        onAddSave={handleAddBoardSave}
        onAddCancel={() => {
          setIsAddingBoard(false);
          setNewBoardLabel("");
        }}
        onDelete={setDeletingBoardId}
      />

      <Box sx={{ flexGrow: 1, p: 2 }}>
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
                    onToggleCompleted={api.toggleInboxTaskCompleted}
                    onDelete={api.deleteInboxTask}
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
                  .sort((a, b) => {
                    // 完了タスクは下に配置
                    const aCompleted = a.completed_at ? 1 : 0;
                    const bCompleted = b.completed_at ? 1 : 0;
                    if (aCompleted !== bCompleted) {
                      return aCompleted - bCompleted;
                    }
                    return a.sort_order - b.sort_order;
                  });
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
                      <ClickAwayListener onClickAway={resetAddTaskForm}>
                        <Card sx={{ borderRadius: 1.5, mb: 1.5 }}>
                          <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                            <TextField
                              autoFocus
                              fullWidth
                              size="small"
                              placeholder="タスク名 (例: TT:タスク名)"
                              value={newTaskTitle}
                              onChange={(e) => setNewTaskTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleAddTask(board.id);
                                if (e.key === "Escape") resetAddTaskForm();
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
                            projects={projects}
                            onUpdateTitle={api.updateTaskTitle}
                            onUpdateDescription={api.updateTaskDescription}
                            onUpdateProject={api.updateTaskProject}
                            onToggleCompleted={api.toggleTaskCompleted}
                            onDelete={api.deleteTask}
                            onArchive={api.archiveTask}
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
                        <RadioButtonUncheckedIcon fontSize="small" sx={{ color: "text.secondary" }} />
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
                <Box sx={{ display: "flex", justifyContent: "center", color: "text.disabled", mb: 0.5 }}>
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
            <Button
              color="inherit"
              size="small"
              onClick={() => deletedTask && api.undoDeleteTask(deletedTask)}
            >
              元に戻す
            </Button>
          }
        />

        <Dialog open={deletingBoardId !== null} onClose={() => setDeletingBoardId(null)}>
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

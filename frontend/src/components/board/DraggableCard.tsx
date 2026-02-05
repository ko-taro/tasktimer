import { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Chip,
  ClickAwayListener,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DeleteIcon from "@mui/icons-material/Delete";
import ArchiveIcon from "@mui/icons-material/Archive";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task, Project } from "./types";

type Props = {
  task: Task;
  projects: Project[];
  onUpdateTitle: (taskId: string, title: string) => void;
  onUpdateDescription: (taskId: string, description: string) => void;
  onUpdateProject: (taskId: string, projectId: string | null) => void;
  onToggleCompleted: (task: Task) => void;
  onDelete: (task: Task) => void;
  onArchive: (task: Task) => void;
  showIndicator?: "before" | "after" | null;
};

export default function DraggableCard({
  task,
  projects,
  onUpdateTitle,
  onUpdateDescription,
  onUpdateProject,
  onToggleCompleted,
  onDelete,
  onArchive,
  showIndicator,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDescription, setEditingDescription] = useState("");
  const [editingProjectId, setEditingProjectId] = useState("");

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
      setEditingProjectId(task.project?.id ?? "");
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
    const currentProjectId = task.project?.id ?? "";
    if (editingProjectId !== currentProjectId) {
      onUpdateProject(task.id, editingProjectId || null);
    }
    setIsExpanded(false);
  };

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
              <Stack spacing={1.5}>
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
                <FormControl size="small" fullWidth>
                  <InputLabel>プロジェクト</InputLabel>
                  <Select
                    value={editingProjectId}
                    onChange={(e) => setEditingProjectId(e.target.value)}
                    label="プロジェクト"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    MenuProps={{ disablePortal: true }}
                  >
                    <MenuItem value="">
                      <em>なし</em>
                    </MenuItem>
                    {projects.map((p) => (
                      <MenuItem key={p.id} value={p.id}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              bgcolor: p.color || "#ccc",
                              borderRadius: 0.5,
                            }}
                          />
                          {p.name}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
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

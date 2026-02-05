import { Box, Card, CardContent, Chip, IconButton, Typography } from "@mui/material";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DeleteIcon from "@mui/icons-material/Delete";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { InboxTask } from "./types";

type Props = {
  task: InboxTask;
  onToggleCompleted: (task: InboxTask) => void;
  onDelete: (task: InboxTask) => void;
};

export default function InboxTaskCard({
  task,
  onToggleCompleted,
  onDelete,
}: Props) {
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

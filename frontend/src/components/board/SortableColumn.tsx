import { Box, Chip, IconButton, Paper, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DragHandleIcon from "@mui/icons-material/DragHandle";
import { useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Board } from "./types";

type Props = {
  board: Board;
  children: React.ReactNode;
  onAddClick: () => void;
  taskCount: number;
  showIndicator?: "before" | "after" | null;
};

export default function SortableColumn({
  board,
  children,
  onAddClick,
  taskCount,
  showIndicator,
}: Props) {
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

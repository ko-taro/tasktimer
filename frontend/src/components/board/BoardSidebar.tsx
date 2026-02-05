import {
  Box,
  Button,
  Checkbox,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import MenuIcon from "@mui/icons-material/Menu";
import EditIcon from "@mui/icons-material/Edit";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import BoardColorPicker from "./BoardColorPicker";
import type { Board } from "./types";

const SIDEBAR_WIDTH = 280;

type Props = {
  open: boolean;
  onClose: () => void;
  boards: Board[];
  hiddenBoards: Set<string>;
  onToggleVisibility: (boardId: string) => void;
  // 編集
  editingBoardId: string | null;
  editingBoardLabel: string;
  editingBoardColor: string;
  onEditStart: (board: Board) => void;
  onEditLabelChange: (label: string) => void;
  onEditColorChange: (color: string) => void;
  onEditSave: (boardId: string) => void;
  onEditCancel: () => void;
  // 追加
  isAdding: boolean;
  newBoardLabel: string;
  newBoardColor: string;
  onAddStart: () => void;
  onAddLabelChange: (label: string) => void;
  onAddColorChange: (color: string) => void;
  onAddSave: () => void;
  onAddCancel: () => void;
  // 削除
  onDelete: (boardId: string) => void;
};

export default function BoardSidebar({
  open,
  onClose,
  boards,
  hiddenBoards,
  onToggleVisibility,
  editingBoardId,
  editingBoardLabel,
  editingBoardColor,
  onEditStart,
  onEditLabelChange,
  onEditColorChange,
  onEditSave,
  onEditCancel,
  isAdding,
  newBoardLabel,
  newBoardColor,
  onAddStart,
  onAddLabelChange,
  onAddColorChange,
  onAddSave,
  onAddCancel,
  onDelete,
}: Props) {
  return (
    <Drawer
      variant="persistent"
      anchor="left"
      open={open}
      sx={{
        width: open ? SIDEBAR_WIDTH : 0,
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
          <IconButton size="small" onClick={onClose}>
            <MenuIcon />
          </IconButton>
        </Box>

        <List dense>
          {boards.map((board) => (
            <ListItem
              key={board.id}
              disablePadding
              secondaryAction={
                editingBoardId !== board.id && (
                  <Box>
                    <IconButton size="small" onClick={() => onEditStart(board)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => onDelete(board.id)}>
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
                    onChange={(e) => onEditLabelChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") onEditSave(board.id);
                      if (e.key === "Escape") onEditCancel();
                    }}
                    sx={{ mb: 1 }}
                  />
                  <Box sx={{ mb: 1 }}>
                    <BoardColorPicker value={editingBoardColor} onChange={onEditColorChange} />
                  </Box>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Button size="small" onClick={() => onEditSave(board.id)}>
                      保存
                    </Button>
                    <Button size="small" onClick={onEditCancel}>
                      キャンセル
                    </Button>
                  </Box>
                </Box>
              ) : (
                <ListItemButton onClick={() => onToggleVisibility(board.id)}>
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

        {isAdding ? (
          <Box sx={{ mt: 2 }}>
            <TextField
              autoFocus
              size="small"
              fullWidth
              placeholder="ボード名"
              value={newBoardLabel}
              onChange={(e) => onAddLabelChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onAddSave();
                if (e.key === "Escape") onAddCancel();
              }}
              sx={{ mb: 1 }}
            />
            <Box sx={{ mb: 1 }}>
              <BoardColorPicker value={newBoardColor} onChange={onAddColorChange} />
            </Box>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button size="small" variant="contained" onClick={onAddSave}>
                追加
              </Button>
              <Button size="small" onClick={onAddCancel}>
                キャンセル
              </Button>
            </Box>
          </Box>
        ) : (
          <Button
            startIcon={<AddIcon />}
            fullWidth
            sx={{ mt: 2 }}
            onClick={onAddStart}
          >
            ボードを追加
          </Button>
        )}
      </Box>
    </Drawer>
  );
}

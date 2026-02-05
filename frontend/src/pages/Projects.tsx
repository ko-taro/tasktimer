import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  ClickAwayListener,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";

type Project = {
  id: string;
  name: string;
  short_name: string;
  color: string | null;
};

const DEFAULT_COLORS = [
  "#3498db",
  "#e74c3c",
  "#2ecc71",
  "#f39c12",
  "#9b59b6",
  "#1abc9c",
  "#e91e63",
  "#00bcd4",
];

function ColorPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (color: string) => void;
}) {
  return (
    <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
      {DEFAULT_COLORS.map((color) => (
        <Box
          key={color}
          onClick={() => onChange(color)}
          sx={{
            width: 24,
            height: 24,
            bgcolor: color,
            borderRadius: 0.5,
            cursor: "pointer",
            border: value === color ? "2px solid #333" : "2px solid transparent",
            "&:hover": { opacity: 0.8 },
          }}
        />
      ))}
    </Box>
  );
}

function ProjectCard({
  project,
  onUpdate,
  onDelete,
  onClick,
}: {
  project: Project;
  onUpdate: (id: string, data: Partial<Project>) => void;
  onDelete: (id: string) => void;
  onClick: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(project.name);
  const [shortName, setShortName] = useState(project.short_name);
  const [color, setColor] = useState(project.color || DEFAULT_COLORS[0]);

  const handleSave = () => {
    if (name.trim() && shortName.trim()) {
      onUpdate(project.id, {
        name: name.trim(),
        short_name: shortName.trim(),
        color,
      });
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setName(project.name);
    setShortName(project.short_name);
    setColor(project.color || DEFAULT_COLORS[0]);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <ClickAwayListener onClickAway={handleCancel}>
        <Card sx={{ minWidth: 280 }}>
          <CardContent>
            <Stack spacing={2}>
              <TextField
                autoFocus
                fullWidth
                size="small"
                label="Project Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                  if (e.key === "Escape") handleCancel();
                }}
              />
              <TextField
                fullWidth
                size="small"
                label="Short Name"
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                helperText="Displayed on task cards"
              />
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
                  Color
                </Typography>
                <ColorPicker value={color} onChange={setColor} />
              </Box>
              <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
                <Button size="small" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button size="small" variant="contained" onClick={handleSave}>
                  Save
                </Button>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </ClickAwayListener>
    );
  }

  return (
    <Card
      sx={{ minWidth: 280, cursor: "pointer", "&:hover": { bgcolor: "action.hover" } }}
      onClick={onClick}
    >
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              bgcolor: project.color || "#ccc",
              borderRadius: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: "bold",
              fontSize: "0.875rem",
              flexShrink: 0,
            }}
          >
            {project.short_name.slice(0, 2).toUpperCase()}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight="bold" noWrap>
              {project.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {project.short_name}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 0.5 }}>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(project.id);
              }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

function AddProjectCard({ onAdd }: { onAdd: (data: Omit<Project, "id">) => void }) {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [color, setColor] = useState(DEFAULT_COLORS[0]);

  const handleSave = () => {
    if (name.trim() && shortName.trim()) {
      onAdd({
        name: name.trim(),
        short_name: shortName.trim(),
        color,
      });
      setName("");
      setShortName("");
      setColor(DEFAULT_COLORS[0]);
      setIsAdding(false);
    }
  };

  const handleCancel = () => {
    setName("");
    setShortName("");
    setColor(DEFAULT_COLORS[0]);
    setIsAdding(false);
  };

  if (isAdding) {
    return (
      <ClickAwayListener onClickAway={handleCancel}>
        <Card sx={{ minWidth: 280 }}>
          <CardContent>
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold">
                New Project
              </Typography>
              <IconButton size="small" onClick={handleCancel}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
            <Stack spacing={2}>
              <TextField
                autoFocus
                fullWidth
                size="small"
                label="Project Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") handleCancel();
                }}
              />
              <TextField
                fullWidth
                size="small"
                label="Short Name"
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                helperText="Displayed on task cards (e.g., WORK, PERS)"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                  if (e.key === "Escape") handleCancel();
                }}
              />
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
                  Color
                </Typography>
                <ColorPicker value={color} onChange={setColor} />
              </Box>
              <Button variant="contained" onClick={handleSave} disabled={!name.trim() || !shortName.trim()}>
                Create Project
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </ClickAwayListener>
    );
  }

  return (
    <Card
      sx={{
        minWidth: 280,
        border: "2px dashed",
        borderColor: "divider",
        bgcolor: "transparent",
        cursor: "pointer",
        "&:hover": { borderColor: "primary.main", bgcolor: "action.hover" },
      }}
      onClick={() => setIsAdding(true)}
    >
      <CardContent
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 80,
        }}
      >
        <AddIcon sx={{ mr: 1, color: "text.secondary" }} />
        <Typography color="text.secondary">Add Project</Typography>
      </CardContent>
    </Card>
  );
}

export default function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/projects")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setProjects)
      .catch((err) => setError(err.message));
  }, []);

  const handleAdd = (data: Omit<Project, "id">) => {
    fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((project: Project) => {
        setProjects((prev) => [...prev, project]);
      })
      .catch((err) => setError(err.message));
  };

  const handleUpdate = (id: string, data: Partial<Project>) => {
    fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((updated: Project) => {
        setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      })
      .catch((err) => setError(err.message));
  };

  const handleDelete = (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    fetch(`/api/projects/${id}`, { method: "DELETE" }).catch((err) =>
      setError(err.message)
    );
  };

  if (error) {
    return (
      <Typography color="error" sx={{ mt: 4, textAlign: "center" }}>
        API Error: {error}
      </Typography>
    );
  }

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
        Projects
      </Typography>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onClick={() => navigate(`/projects/${project.id}`)}
          />
        ))}
        <AddProjectCard onAdd={handleAdd} />
      </Box>
    </Box>
  );
}

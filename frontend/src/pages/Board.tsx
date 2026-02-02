import { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Chip,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";

type Task = {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "done";
  pomodoro_count: number;
  total_seconds: number;
};

type Column = {
  key: Task["status"];
  label: string;
  color: string;
};

const COLUMNS: Column[] = [
  { key: "todo", label: "Todo", color: "#e3f2fd" },
  { key: "in_progress", label: "In Progress", color: "#fff3e0" },
  { key: "done", label: "Done", color: "#e8f5e9" },
];

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function Board() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState<string | null>(null);

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
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
        gap: 2,
      }}
    >
      {COLUMNS.map((col) => {
        const columnTasks = tasks.filter((t) => t.status === col.key);
        return (
          <Paper
            key={col.key}
            elevation={0}
            sx={{
              bgcolor: col.color,
              p: 2,
              borderRadius: 2,
              minHeight: 300,
            }}
          >
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
              {col.label}
              <Chip
                label={columnTasks.length}
                size="small"
                sx={{ ml: 1 }}
              />
            </Typography>
            <Stack spacing={1.5}>
              {columnTasks.map((task) => (
                <Card key={task.id} sx={{ borderRadius: 1.5 }}>
                  <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                    <Typography variant="body1">{task.title}</Typography>
                    {(task.pomodoro_count > 0 || task.total_seconds > 0) && (
                      <Box
                        sx={{
                          display: "flex",
                          gap: 1,
                          mt: 1,
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
              ))}
            </Stack>
          </Paper>
        );
      })}
    </Box>
  );
}

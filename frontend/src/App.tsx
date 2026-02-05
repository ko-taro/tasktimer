import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { AppBar, Toolbar, Typography, Container, Button, Box } from "@mui/material";
import TimerIcon from "@mui/icons-material/Timer";
import Board from "./pages/Board";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";

function NavButton({ to, children }: { to: string; children: React.ReactNode }) {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Button
      component={Link}
      to={to}
      color="inherit"
      sx={{
        borderBottom: isActive ? "2px solid white" : "2px solid transparent",
        borderRadius: 0,
        px: 2,
      }}
    >
      {children}
    </Button>
  );
}

function AppContent() {
  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <TimerIcon sx={{ mr: 1 }} />
          <Typography variant="h6" component="h1" sx={{ mr: 4 }}>
            TaskTimer
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <NavButton to="/">Board</NavButton>
            <NavButton to="/projects">Projects</NavButton>
          </Box>
        </Toolbar>
      </AppBar>
      <Container maxWidth="xl" sx={{ mt: 3 }}>
        <Routes>
          <Route path="/" element={<Board />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:projectId" element={<ProjectDetail />} />
        </Routes>
      </Container>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;

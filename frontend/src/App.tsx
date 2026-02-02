import { AppBar, Toolbar, Typography, Container } from "@mui/material";
import TimerIcon from "@mui/icons-material/Timer";
import Board from "./pages/Board";

function App() {
  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <TimerIcon sx={{ mr: 1 }} />
          <Typography variant="h6" component="h1">
            TaskTimer
          </Typography>
        </Toolbar>
      </AppBar>
      <Container maxWidth="xl" sx={{ mt: 3 }}>
        <Board />
      </Container>
    </>
  );
}

export default App;

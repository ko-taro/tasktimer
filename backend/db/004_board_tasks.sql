CREATE TABLE IF NOT EXISTS board_tasks (
    board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (board_id, task_id)
);

CREATE INDEX idx_board_tasks_board_id ON board_tasks(board_id);
CREATE INDEX idx_board_tasks_task_id ON board_tasks(task_id);

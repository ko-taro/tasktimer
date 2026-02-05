CREATE TABLE IF NOT EXISTS boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label VARCHAR(100) NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#e3f2fd',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO boards (label, color, sort_order) VALUES
    ('High',   '#fce4ec', 0),
    ('Medium', '#fff3e0', 1),
    ('Low',    '#e3f2fd', 2);

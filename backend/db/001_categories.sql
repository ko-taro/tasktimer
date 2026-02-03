CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(50) UNIQUE NOT NULL,
    label VARCHAR(100) NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#e3f2fd',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO categories (key, label, color, sort_order) VALUES
    ('high',   'High',   '#fce4ec', 0),
    ('medium', 'Medium', '#fff3e0', 1),
    ('low',    'Low',    '#e3f2fd', 2);

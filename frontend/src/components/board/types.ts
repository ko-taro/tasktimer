export type Project = {
  id: string;
  name: string;
  short_name: string;
  color: string | null;
};

export type Task = {
  id: string;
  title: string;
  description: string | null;
  board_id: string;
  sort_order: number;
  scheduled_start: string | null;
  scheduled_end: string | null;
  completed_at: string | null;
  archived_at: string | null;
  project: Project | null;
};

export type InboxTask = {
  id: string;
  title: string;
  description: string | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  completed_at: string | null;
  archived_at: string | null;
  project: Project | null;
};

export type Board = {
  id: string;
  label: string;
  color: string;
};

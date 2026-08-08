CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL,
  status TEXT NOT NULL,
  estimated_minutes INTEGER NOT NULL,
  actual_minutes INTEGER,
  is_recurring_child INTEGER DEFAULT 0,
  recurring_rule_id TEXT,
  scheduled_date INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (recurring_rule_id) REFERENCES recurring_rules(id)
);

CREATE TABLE IF NOT EXISTS task_time_logs (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  paused_at INTEGER,
  duration_minutes INTEGER,
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);

CREATE TABLE IF NOT EXISTS recurring_rules (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL,
  estimated_minutes INTEGER NOT NULL,
  frequency TEXT NOT NULL,
  time_anchor INTEGER,
  is_active INTEGER DEFAULT 1,
  last_instantiated_date INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS daily_plans (
  id TEXT PRIMARY KEY,
  date INTEGER NOT NULL,
  focus_hours REAL,
  primary_goal TEXT,
  plan_json TEXT NOT NULL,
  is_approved INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS performance_reports (
  id TEXT PRIMARY KEY,
  timeframe_start INTEGER NOT NULL,
  timeframe_end INTEGER NOT NULL,
  report_json TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

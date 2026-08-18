import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { AssistantPlan, Project, ProjectDetail, Task } from "./types";

const isProductionBuild = process.env.NEXT_PHASE === "phase-production-build";
const databasePath = isProductionBuild ? ":memory:" : process.env.DATABASE_PATH || path.join(process.cwd(), "data", "project-manager.db");
if (!isProductionBuild) fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const database = new DatabaseSync(databasePath);
database.exec("PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;");
if (!isProductionBuild) database.exec("PRAGMA journal_mode = WAL;");
database.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    goal TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active',
    color TEXT NOT NULL DEFAULT '#6d5dfc',
    start_date TEXT,
    due_date TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    phase TEXT NOT NULL DEFAULT '未分组',
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    acceptance TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'todo',
    priority TEXT NOT NULL DEFAULT 'medium',
    start_date TEXT,
    due_date TEXT,
    estimate_hours REAL NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

const legacyTodoTable = database.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'todos'").get();
if (legacyTodoTable) {
  database.exec("BEGIN");
  try {
    database.exec(`
      INSERT INTO tasks (project_id, phase, title, status, priority, due_date)
      SELECT project_id, 'Todo 迁移', title,
        CASE WHEN completed = 1 THEN 'done' ELSE 'todo' END,
        priority, due_date
      FROM todos;
      DROP TABLE todos;
    `);
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

type Row = Record<string, unknown>;

function projectFromRow(row: Row): Project {
  return {
    id: Number(row.id),
    name: String(row.name),
    description: String(row.description),
    goal: String(row.goal),
    status: String(row.status) as Project["status"],
    color: String(row.color),
    startDate: row.start_date ? String(row.start_date) : null,
    dueDate: row.due_date ? String(row.due_date) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    taskCount: Number(row.task_count || 0),
    completedCount: Number(row.completed_count || 0),
  };
}

function taskFromRow(row: Row): Task {
  return {
    id: Number(row.id), projectId: Number(row.project_id), phase: String(row.phase),
    title: String(row.title), description: String(row.description), acceptance: String(row.acceptance),
    status: String(row.status) as Task["status"], priority: String(row.priority) as Task["priority"],
    startDate: row.start_date ? String(row.start_date) : null, dueDate: row.due_date ? String(row.due_date) : null,
    estimateHours: Number(row.estimate_hours), sortOrder: Number(row.sort_order),
    createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  };
}

export function listProjects(): Project[] {
  const rows = database.prepare(`
    SELECT p.*,
      COUNT(DISTINCT t.id) AS task_count,
      COUNT(DISTINCT CASE WHEN t.status = 'done' THEN t.id END) AS completed_count
    FROM projects p
    LEFT JOIN tasks t ON t.project_id = p.id
    WHERE p.status != 'archived'
    GROUP BY p.id ORDER BY p.updated_at DESC
  `).all() as Row[];
  return rows.map(projectFromRow);
}

export function getProject(id: number): ProjectDetail | null {
  const row = database.prepare(`
    SELECT p.*,
      COUNT(DISTINCT t.id) AS task_count,
      COUNT(DISTINCT CASE WHEN t.status = 'done' THEN t.id END) AS completed_count
    FROM projects p LEFT JOIN tasks t ON t.project_id = p.id
    WHERE p.id = ? GROUP BY p.id
  `).get(id) as Row | undefined;
  if (!row) return null;
  const tasks = (database.prepare("SELECT * FROM tasks WHERE project_id = ? ORDER BY sort_order, id").all(id) as Row[]).map(taskFromRow);
  return { ...projectFromRow(row), tasks };
}

export function createProject(input: { name: string; description?: string; goal?: string; dueDate?: string | null; color?: string }): ProjectDetail {
  const result = database.prepare("INSERT INTO projects (name, description, goal, due_date, color) VALUES (?, ?, ?, ?, ?)")
    .run(input.name, input.description || "", input.goal || "", input.dueDate || null, input.color || "#6d5dfc");
  return getProject(Number(result.lastInsertRowid))!;
}

export function updateProject(id: number, input: Partial<{ name: string; description: string; goal: string; status: string; dueDate: string | null; color: string }>) {
  const entries = Object.entries(input).filter(([, value]) => value !== undefined);
  const columns: Record<string, string> = { name: "name", description: "description", goal: "goal", status: "status", dueDate: "due_date", color: "color" };
  if (entries.length) {
    database.prepare(`UPDATE projects SET ${entries.map(([key]) => `${columns[key]} = ?`).join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .run(...entries.map(([, value]) => value), id);
  }
  return getProject(id);
}

export function deleteProject(id: number) {
  database.prepare("DELETE FROM projects WHERE id = ?").run(id);
}

export function createTask(projectId: number, input: Partial<Task> & { title: string }) {
  const result = database.prepare(`INSERT INTO tasks
    (project_id, phase, title, description, acceptance, status, priority, start_date, due_date, estimate_hours, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(projectId, input.phase || "未分组", input.title, input.description || "", input.acceptance || "", input.status || "todo", input.priority || "medium", input.startDate || null, input.dueDate || null, input.estimateHours || 0, input.sortOrder || 0);
  return taskFromRow(database.prepare("SELECT * FROM tasks WHERE id = ?").get(Number(result.lastInsertRowid)) as Row);
}

export function updateTask(id: number, input: Partial<Task>) {
  const allowed: Record<string, string> = { phase: "phase", title: "title", description: "description", acceptance: "acceptance", status: "status", priority: "priority", startDate: "start_date", dueDate: "due_date", estimateHours: "estimate_hours", sortOrder: "sort_order" };
  const entries = Object.entries(input).filter(([key, value]) => allowed[key] && value !== undefined);
  if (entries.length) database.prepare(`UPDATE tasks SET ${entries.map(([key]) => `${allowed[key]} = ?`).join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(...entries.map(([, value]) => value), id);
  return taskFromRow(database.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as Row);
}

export function deleteTask(id: number) { database.prepare("DELETE FROM tasks WHERE id = ?").run(id); }

export function getSetting(key: string): string | null {
  const row = database.prepare("SELECT value FROM settings WHERE key = ?").get(key) as Row | undefined;
  return row ? String(row.value) : null;
}

export function setSetting(key: string, value: string) {
  database.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, value);
}

export function replacePlan(projectId: number, plan: import("./types").GeneratedPlan) {
  database.exec("BEGIN");
  try {
    database.prepare("UPDATE projects SET description = ?, goal = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(plan.summary, plan.goal, projectId);
    database.prepare("DELETE FROM tasks WHERE project_id = ?").run(projectId);
    let order = 0;
    for (const phase of plan.phases) for (const task of phase.tasks) createTask(projectId, { ...task, phase: phase.name, sortOrder: order++ });
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
  return getProject(projectId);
}

export function applyAssistantPlan(projectId: number, plan: AssistantPlan) {
  const project = getProject(projectId);
  if (!project) throw new Error("项目不存在");
  const validTaskIds = new Set(project.tasks.map(task => task.id));
  database.exec("BEGIN");
  try {
    for (const task of plan.tasks) {
      const input = {
        title: task.title,
        description: task.description,
        acceptance: task.acceptance,
        phase: task.phase,
        priority: task.priority,
        status: task.status,
        estimateHours: task.estimateHours,
        startDate: task.startDate,
        dueDate: task.dueDate,
      };
      if (task.existingTaskId && validTaskIds.has(task.existingTaskId)) updateTask(task.existingTaskId, input);
      else createTask(projectId, input);
    }
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
  return { project: getProject(projectId), appliedCount: plan.tasks.length };
}

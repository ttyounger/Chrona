export type ProjectStatus = "active" | "paused" | "completed" | "archived";
export type TaskStatus = "todo" | "doing" | "blocked" | "done";
export type Priority = "low" | "medium" | "high" | "urgent";

export interface Project {
  id: number;
  name: string;
  description: string;
  goal: string;
  status: ProjectStatus;
  color: string;
  startDate: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  taskCount: number;
  completedCount: number;
}

export interface Task {
  id: number;
  projectId: number;
  phase: string;
  title: string;
  description: string;
  acceptance: string;
  status: TaskStatus;
  priority: Priority;
  startDate: string | null;
  dueDate: string | null;
  estimateHours: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDetail extends Project {
  tasks: Task[];
}

export interface ModelSettings {
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature: number;
}

export interface GeneratedPlan {
  summary: string;
  goal: string;
  assumptions: string[];
  risks: string[];
  phases: Array<{
    name: string;
    tasks: Array<{
      title: string;
      description: string;
      acceptance: string;
      priority: Priority;
      estimateHours: number;
      startDate: string | null;
      dueDate: string | null;
    }>;
  }>;
}

export interface AssistantMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AssistantPlan {
  tasks: Array<{
    existingTaskId: number | null;
    title: string;
    description: string;
    acceptance: string;
    phase: string;
    priority: Priority;
    status: TaskStatus;
    estimateHours: number;
    startDate: string | null;
    dueDate: string | null;
  }>;
}

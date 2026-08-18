import { z } from "zod";

export const generatedPlanSchema = z.object({
  summary: z.string().min(1),
  goal: z.string().min(1),
  assumptions: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  phases: z.array(z.object({
    name: z.string().min(1),
    tasks: z.array(z.object({
      title: z.string().min(1),
      description: z.string().default(""),
      acceptance: z.string().default(""),
      priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
      estimateHours: z.number().nonnegative().default(0),
      startDate: z.string().nullable().default(null),
      dueDate: z.string().nullable().default(null),
    })).min(1),
  })).min(1),
});

export const assistantPlanSchema = z.object({
  reply: z.string().min(1),
  tasks: z.array(z.object({
    existingTaskId: z.number().int().positive().nullable().default(null),
    title: z.string().min(1),
    description: z.string().default(""),
    acceptance: z.string().default(""),
    phase: z.string().default("未分组"),
    priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
    status: z.enum(["todo", "doing", "blocked", "done"]).default("todo"),
    estimateHours: z.number().nonnegative().default(0),
    startDate: z.string().nullable().default(null),
    dueDate: z.string().nullable().default(null),
  })).default([]),
});

export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const source = fenced?.[1] || text;
  const start = source.indexOf("{");
  const end = source.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("模型没有返回有效的 JSON");
  return JSON.parse(source.slice(start, end + 1));
}

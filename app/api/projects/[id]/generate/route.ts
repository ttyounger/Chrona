import { NextResponse } from "next/server";
import { generatePlan } from "@/lib/ai";
import { getProject, getSetting, replacePlan } from "@/lib/db";
import type { ModelSettings } from "@/lib/types";
import { generatedPlanSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const maxDuration = 120;
type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const project = getProject(Number(id));
    if (!project) return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    const saved = getSetting("model-settings");
    if (!saved) return NextResponse.json({ error: "请先在模型设置中保存 AI 模型" }, { status: 400 });
    const body = await request.json().catch(() => ({}));
    if (body.apply === true && body.plan) {
      const plan = generatedPlanSchema.parse(body.plan);
      return NextResponse.json({ plan, project: replacePlan(project.id, plan) });
    }
    const plan = await generatePlan(JSON.parse(saved) as ModelSettings, {
      name: project.name, description: String(body.description || project.description), goal: project.goal, dueDate: project.dueDate,
    });
    return NextResponse.json({ plan });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "AI 生成失败" }, { status: 400 });
  }
}

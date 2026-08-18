import { NextResponse } from "next/server";
import { deleteProject, getProject, updateProject } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

export async function GET(_: Request, context: Context) {
  const { id } = await context.params;
  const project = getProject(Number(id));
  return project ? NextResponse.json(project) : NextResponse.json({ error: "项目不存在" }, { status: 404 });
}

export async function PATCH(request: Request, context: Context) {
  const { id } = await context.params;
  return NextResponse.json(updateProject(Number(id), await request.json()));
}

export async function DELETE(_: Request, context: Context) {
  const { id } = await context.params;
  deleteProject(Number(id));
  return NextResponse.json({ ok: true });
}

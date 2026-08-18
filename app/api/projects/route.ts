import { NextResponse } from "next/server";
import { createProject, listProjects, reorderProjects } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() { return NextResponse.json(listProjects()); }

export async function POST(request: Request) {
  try {
    const input = await request.json();
    if (!String(input.name || "").trim()) return NextResponse.json({ error: "项目名称不能为空" }, { status: 400 });
    return NextResponse.json(createProject({ ...input, name: String(input.name).trim() }), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "创建失败" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const projectIds: number[] = Array.isArray(body.projectIds) ? [...new Set<number>(body.projectIds.map(Number).filter((value: number) => Number.isInteger(value)))] : [];
    if (!projectIds.length) return NextResponse.json({ error: "项目顺序不能为空" }, { status: 400 });
    return NextResponse.json(reorderProjects(projectIds));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "排序失败" }, { status: 500 });
  }
}

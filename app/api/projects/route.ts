import { NextResponse } from "next/server";
import { createProject, listProjects } from "@/lib/db";

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

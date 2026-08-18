import { NextResponse } from "next/server";
import { createTask } from "@/lib/db";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  const { id } = await context.params;
  const input = await request.json();
  if (!String(input.title || "").trim()) return NextResponse.json({ error: "任务名称不能为空" }, { status: 400 });
  return NextResponse.json(createTask(Number(id), { ...input, title: String(input.title).trim() }), { status: 201 });
}

import { NextResponse } from "next/server";
import { deleteTask, updateTask } from "@/lib/db";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  const { id } = await context.params;
  return NextResponse.json(updateTask(Number(id), await request.json()));
}

export async function DELETE(_: Request, context: Context) {
  const { id } = await context.params;
  deleteTask(Number(id));
  return NextResponse.json({ ok: true });
}

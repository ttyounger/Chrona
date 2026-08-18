import { NextResponse } from "next/server";

export async function PATCH() {
  return NextResponse.json({ error: "Todo 已并入 Chrona 任务工作台" }, { status: 410 });
}

export async function DELETE() {
  return NextResponse.json({ error: "Todo 已并入 Chrona 任务工作台" }, { status: 410 });
}

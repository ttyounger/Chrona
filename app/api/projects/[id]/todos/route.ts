import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Todo 已并入 Chrona 任务工作台，请直接创建任务" }, { status: 410 });
}

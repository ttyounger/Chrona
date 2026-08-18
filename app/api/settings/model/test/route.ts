import { NextResponse } from "next/server";
import { chat } from "@/lib/ai";
import { getSetting } from "@/lib/db";
import type { ModelSettings } from "@/lib/types";

export const runtime = "nodejs";

export async function POST() {
  try {
    const saved = getSetting("model-settings");
    if (!saved) throw new Error("请先保存模型设置");
    const result = await chat(JSON.parse(saved) as ModelSettings, [{ role: "user", content: "只回复：连接成功" }]);
    return NextResponse.json({ ok: true, message: result.slice(0, 100) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "连接失败" }, { status: 400 });
  }
}

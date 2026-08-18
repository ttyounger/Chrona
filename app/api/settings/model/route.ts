import { NextResponse } from "next/server";
import { getSetting, setSetting } from "@/lib/db";
import type { ModelSettings } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const key = "model-settings";

export async function GET() {
  const saved = getSetting(key);
  if (!saved) return NextResponse.json({ baseUrl: "https://api.openai.com/v1", apiKey: "", model: "gpt-4.1-mini", temperature: 0.3 });
  const settings = JSON.parse(saved) as ModelSettings;
  return NextResponse.json({ ...settings, apiKey: settings.apiKey ? "••••••••" : "" });
}

export async function PUT(request: Request) {
  const input = await request.json() as ModelSettings;
  const previous = getSetting(key) ? JSON.parse(getSetting(key)!) as ModelSettings : null;
  if (input.apiKey === "••••••••" && previous) input.apiKey = previous.apiKey;
  setSetting(key, JSON.stringify(input));
  return NextResponse.json({ ok: true });
}

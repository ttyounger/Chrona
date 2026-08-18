import { assistantPlanSchema, extractJson, generatedPlanSchema } from "./validation";
import type { AssistantMessage, AssistantPlan, GeneratedPlan, ModelSettings, ProjectDetail } from "./types";

function normalizeBaseUrl(url: string) {
  return url.trim().replace(/\/$/, "").replace(/\/chat\/completions$/, "");
}

export async function chat(settings: ModelSettings, messages: Array<{ role: "system" | "user" | "assistant"; content: string }>) {
  if (!settings.baseUrl || !settings.model) throw new Error("请先填写并保存模型地址和模型名称");
  const isLocalModel = /localhost|127\.0\.0\.1/i.test(settings.baseUrl);
  if (!settings.apiKey && !isLocalModel) throw new Error("在线模型需要填写 API Key");
  const response = await fetch(`${normalizeBaseUrl(settings.baseUrl)}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : {}) },
    body: JSON.stringify({ model: settings.model, messages, temperature: settings.temperature ?? 0.3, stream: false }),
    signal: AbortSignal.timeout(120_000),
  });
  const raw = await response.text();
  if (!response.ok) throw new Error(`模型请求失败（${response.status}）：${raw.slice(0, 300)}`);
  const data = JSON.parse(raw);
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("模型返回内容为空");
  return String(content);
}

export async function generatePlan(settings: ModelSettings, input: { name: string; description: string; goal?: string; dueDate?: string | null }): Promise<GeneratedPlan> {
  const today = new Date().toISOString().slice(0, 10);
  const system = `你是一名严谨的项目经理。请把项目描述转成可执行计划，只返回 JSON，不使用 Markdown。今天是 ${today}。
JSON 必须符合：
{"summary":"项目摘要","goal":"可验证的最终目标","assumptions":["假设"],"risks":["风险"],"phases":[{"name":"阶段名称","tasks":[{"title":"任务","description":"具体步骤和注意事项","acceptance":"完成标准","priority":"low|medium|high|urgent","estimateHours":8,"startDate":"YYYY-MM-DD或null","dueDate":"YYYY-MM-DD或null"}]}]}
要求：阶段按顺序排列；任务可落地；日期合理且不晚于项目截止日期；没有日期信息时基于今天给出保守排期；不要添加 JSON 之外的文字。`;
  const content = await chat(settings, [{ role: "system", content: system }, { role: "user", content: JSON.stringify(input) }]);
  return generatedPlanSchema.parse(extractJson(content));
}

export async function planConversation(settings: ModelSettings, project: ProjectDetail, messages: AssistantMessage[]): Promise<{ reply: string; plan: AssistantPlan }> {
  const today = new Date().toISOString().slice(0, 10);
  const taskContext = project.tasks.map(task => ({ id: task.id, title: task.title, description: task.description, status: task.status, priority: task.priority, startDate: task.startDate, dueDate: task.dueDate, estimateHours: task.estimateHours }));
  const system = `你是一个中文项目与时间规划助手。今天是 ${today}。你要结合项目现状和用户对话，给出简洁、具体、现实的安排。只返回 JSON，不要 Markdown。
JSON 格式：{"reply":"给用户的自然语言回复，说明安排逻辑和时间段","tasks":[{"existingTaskId":123或null,"title":"任务名","description":"具体执行步骤或时间段","acceptance":"完成标准","phase":"阶段","priority":"low|medium|high|urgent","status":"todo|doing|blocked|done","estimateHours":2,"startDate":"YYYY-MM-DD或null","dueDate":"YYYY-MM-DD或null"}]}
四象限映射：urgent=重要且紧急，high=重要不紧急，medium=紧急不重要，low=不重要不紧急。
规则：如果是调整已有任务，必须填写正确 existingTaskId；如果是新任务则为 null；不要把纯建议强行转成任务；日期和工时要符合用户提供的可用时间；避免重复创建已有任务；reply 要便于用户直接照着执行。`;
  const context = `项目：${project.name}\n目标：${project.goal}\n截止日期：${project.dueDate || "未设置"}\n项目简介：${project.description}\n现有任务：${JSON.stringify(taskContext)}`;
  const content = await chat(settings, [
    { role: "system", content: system },
    { role: "user", content: context },
    ...messages.map(message => ({ role: message.role, content: message.content })),
  ]);
  const result = assistantPlanSchema.parse(extractJson(content));
  return { reply: result.reply, plan: { tasks: result.tasks } };
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AssistantMessage, AssistantPlan, GeneratedPlan, ModelSettings, Priority, Project, ProjectDetail, Task, TaskStatus } from "@/lib/types";

const statusNames: Record<TaskStatus, string> = { todo: "待处理", doing: "进行中", blocked: "有阻塞", done: "已完成" };
const priorityNames: Record<Priority, string> = { low: "不重要不紧急", medium: "紧急不重要", high: "重要不紧急", urgent: "重要且紧急" };
const colors = ["#7c6cf2", "#1f9d8a", "#e8755f", "#e3a13b", "#397ec9", "#c0649e"];
const quadrants: Array<{ priority: Priority; title: string; hint: string; action: string }> = [
  { priority: "urgent", title: "重要且紧急", hint: "立刻处理", action: "先做" },
  { priority: "high", title: "重要不紧急", hint: "计划推进", action: "安排" },
  { priority: "medium", title: "紧急不重要", hint: "尽快处理", action: "协同" },
  { priority: "low", title: "不重要不紧急", hint: "有空再做", action: "稍后" },
];
type WorkspaceView = "list" | "board" | "quadrant" | "gantt";
type Appearance = {
  theme: "purple" | "blue" | "green" | "orange" | "night";
  font: "modern" | "system" | "anthropic" | "merriweather" | "song" | "mono";
  fontSize: "compact" | "standard" | "comfortable" | "large";
};
const defaultAppearance: Appearance = { theme: "purple", font: "modern", fontSize: "comfortable" };
const viewNames: Record<WorkspaceView, string> = { list: "列表", board: "看板", quadrant: "四象限", gantt: "甘特图" };

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...options?.headers } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "操作失败");
  return data;
}

function Icon({ name }: { name: "grid" | "plus" | "settings" | "spark" | "calendar" | "trash" | "check" | "arrow" | "edit" | "target" | "send" | "clock" | "list" | "board" | "gantt" | "quadrant" | "palette" | "search" | "grip" }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.08A1.7 1.7 0 0 0 8.95 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3v-4h.08A1.7 1.7 0 0 0 4.6 8.95a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3.08V3h4v.08A1.7 1.7 0 0 0 15.05 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.16.6.68 1 1.3 1H21v4h-.08A1.7 1.7 0 0 0 19.4 15Z"/></>,
    spark: <><path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3Z"/><path d="m18.5 14 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
    trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/></>,
    check: <path d="m5 12 4 4L19 6"/>, arrow: <path d="m9 18 6-6-6-6"/>,
    edit: <><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></>,
    target: <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 4V2M20 12h2"/></>,
    send: <><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    list: <><path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01"/></>,
    board: <><rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="10" rx="1"/><rect x="17" y="4" width="4" height="13" rx="1"/></>,
    gantt: <><path d="M4 5v15M4 8h7M9 12h9M6 16h8"/><path d="m9 6 2 2-2 2M16 10l2 2-2 2M12 14l2 2-2 2"/></>,
    quadrant: <><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/></>,
    palette: <><path d="M12 3a9 9 0 1 0 0 18h1.5a2 2 0 0 0 0-4H12a2 2 0 0 1 0-4h5a4 4 0 0 0 4-4c0-3.3-4-6-9-6Z"/><circle cx="7.5" cy="9" r=".6" fill="currentColor"/><circle cx="10" cy="6.5" r=".6" fill="currentColor"/><circle cx="15" cy="7" r=".6" fill="currentColor"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    grip: <><circle cx="8" cy="6" r="1" fill="currentColor"/><circle cx="16" cy="6" r="1" fill="currentColor"/><circle cx="8" cy="12" r="1" fill="currentColor"/><circle cx="16" cy="12" r="1" fill="currentColor"/><circle cx="8" cy="18" r="1" fill="currentColor"/><circle cx="16" cy="18" r="1" fill="currentColor"/></>,
  };
  return <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<"project" | "settings" | "appearance" | "ai" | "editProject" | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [showOverview, setShowOverview] = useState(false);
  const [draggedProjectId, setDraggedProjectId] = useState<number | null>(null);
  const [projectDropTarget, setProjectDropTarget] = useState<number | null>(null);
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>("quadrant");
  const [appearance, setAppearance] = useState<Appearance>(defaultAppearance);

  const loadProjects = useCallback(async () => {
    try {
      const data = await request<Project[]>("/api/projects");
      setProjects(data); setSelectedId(current => current ?? data[0]?.id ?? null);
    } catch (err) { setError(err instanceof Error ? err.message : "加载失败"); }
    finally { setLoading(false); }
  }, []);
  const loadProject = useCallback(async (id: number) => {
    try { setProject(await request<ProjectDetail>(`/api/projects/${id}`)); }
    catch (err) { setError(err instanceof Error ? err.message : "加载失败"); }
  }, []);
  useEffect(() => { loadProjects(); }, [loadProjects]);
  useEffect(() => { if (selectedId) loadProject(selectedId); else setProject(null); }, [selectedId, loadProject]);
  useEffect(() => {
    const savedAppearance = localStorage.getItem("chrona-appearance") || localStorage.getItem("shiguang-appearance");
    const savedView = (localStorage.getItem("chrona-workspace-view") || localStorage.getItem("shiguang-workspace-view")) as WorkspaceView | null;
    if (savedAppearance) try { setAppearance({ ...defaultAppearance, ...JSON.parse(savedAppearance) }); } catch {}
    if (savedView && savedView in viewNames) setWorkspaceView(savedView);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = appearance.theme;
    document.documentElement.dataset.font = appearance.font;
    document.documentElement.dataset.fontSize = appearance.fontSize;
    localStorage.setItem("chrona-appearance", JSON.stringify(appearance));
  }, [appearance]);
  const changeWorkspaceView = (view: WorkspaceView) => { setWorkspaceView(view); localStorage.setItem("chrona-workspace-view", view); };
  const refresh = async () => { await loadProjects(); if (selectedId) await loadProject(selectedId); };
  const openProject = (projectId: number) => { setSelectedId(projectId); setShowOverview(false); setAssistantOpen(false); };
  const openOverview = () => { setShowOverview(true); setAssistantOpen(false); };
  const reorderProject = async (draggedId: number, targetId: number) => {
    if (draggedId === targetId) return;
    const previous = [...projects];
    const next = [...projects];
    const sourceIndex = next.findIndex(item => item.id === draggedId);
    const targetIndex = next.findIndex(item => item.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const [dragged] = next.splice(sourceIndex, 1);
    next.splice(targetIndex, 0, dragged);
    setProjects(next);
    try { setProjects(await request<Project[]>("/api/projects", { method: "PUT", body: JSON.stringify({ projectIds: next.map(item => item.id) }) })); }
    catch (err) { setProjects(previous); setError(err instanceof Error ? err.message : "项目排序失败"); }
    finally { setDraggedProjectId(null); setProjectDropTarget(null); }
  };

  const removeProject = async () => {
    if (!project || !confirm(`确定删除项目“${project.name}”吗？项目中的任务也会一起删除。`)) return;
    try { await request(`/api/projects/${project.id}`, { method: "DELETE" }); setProject(null); setSelectedId(null); await loadProjects(); }
    catch (err) { setError(err instanceof Error ? err.message : "删除失败"); }
  };
  const enableReminders = async () => {
    if (!("Notification" in window)) return setError("当前浏览器不支持桌面通知");
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return setError("通知权限未开启，可以稍后在浏览器设置中允许");
    localStorage.setItem("project-reminders-enabled", "true");
    new Notification("Chrona 项目提醒已开启", { body: "任务到期时，会在系统运行期间提醒你。" });
  };

  const progress = project?.taskCount ? Math.round(project.completedCount / project.taskCount * 100) : 0;
  const today = new Date().toISOString().slice(0, 10);
  const dueSoon = useMemo(() => project?.tasks.filter(task => task.status !== "done" && task.dueDate && task.dueDate <= today).length || 0, [project, today]);
  const focusTasks = useMemo(() => project?.tasks.filter(task => task.status !== "done").sort((first, second) => {
    const order: Priority[] = ["urgent", "high", "medium", "low"];
    return order.indexOf(first.priority) - order.indexOf(second.priority) || String(first.dueDate || "9999").localeCompare(String(second.dueDate || "9999"));
  }).slice(0, 3) || [], [project]);

  useEffect(() => {
    if (!project || !("Notification" in window) || Notification.permission !== "granted" || localStorage.getItem("project-reminders-enabled") !== "true") return;
    const notify = () => {
      const day = new Date().toISOString().slice(0, 10);
      const dueTasks = project.tasks.filter(task => task.status !== "done" && task.dueDate && task.dueDate <= day);
      if (!dueTasks.length) return;
      const notificationKey = `notified-${project.id}-${day}-${dueTasks.map(task => task.id).join("-")}`;
      if (localStorage.getItem(notificationKey)) return;
      new Notification(`${project.name} · ${dueTasks.length} 项任务需要关注`, { body: dueTasks.slice(0, 3).map(task => task.title).join("、") });
      localStorage.setItem(notificationKey, "true");
    };
    notify(); const timer = window.setInterval(notify, 60_000); return () => window.clearInterval(timer);
  }, [project]);

  if (loading) return <div className="center-screen"><div className="loader"/><p>正在打开你的项目空间…</p></div>;
  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">C</div><div><b>Chrona</b><span>Make time meaningful</span></div></div>
      <button className="primary wide" onClick={() => setModal("project")}><Icon name="plus"/>新建项目</button>
      <nav><div className="nav-title">工作区</div><button className={`nav-item ${showOverview ? "active" : ""}`} onClick={openOverview}><Icon name="grid"/>项目总览</button><div className="nav-title row"><span>我的项目</span><span>{projects.length}</span></div><div className="project-list">{projects.map(item => <button key={item.id} draggable className={`project-link ${!showOverview && selectedId === item.id ? "selected" : ""} ${draggedProjectId === item.id ? "dragging" : ""} ${projectDropTarget === item.id ? "drop-target" : ""}`} onClick={() => openProject(item.id)} onDragStart={event => { setDraggedProjectId(item.id); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", String(item.id)); }} onDragEnter={() => setProjectDropTarget(item.id)} onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }} onDrop={event => { event.preventDefault(); const draggedId = Number(event.dataTransfer.getData("text/plain")) || draggedProjectId; if (draggedId) reorderProject(draggedId, item.id); }} onDragEnd={() => { setDraggedProjectId(null); setProjectDropTarget(null); }}><Icon name="grip"/><span className="dot" style={{ background: item.color }}/><span className="ellipsis">{item.name}</span><Icon name="arrow"/></button>)}</div></nav>
      <div className="sidebar-tools"><button className="nav-item" onClick={() => setModal("appearance")}><Icon name="palette"/>外观设置</button><button className="nav-item" onClick={() => setModal("settings")}><Icon name="settings"/>模型设置</button></div>
    </aside>
    <main>
      <header className="topbar"><div><p className="eyebrow">今天，专注关键进展</p><h1>{showOverview ? "项目总览" : project?.name || "欢迎回来"}</h1></div><div className="top-actions"><button className="secondary reminder-button" onClick={enableReminders}><Icon name="calendar"/>开启提醒</button>{project && !showOverview && <button className="secondary assistant-trigger" onClick={() => setAssistantOpen(true)}><Icon name="spark"/>智能安排</button>}{project && !showOverview && <button className="icon-button top-delete" title="删除项目" onClick={removeProject}><Icon name="trash"/></button>}<button className="avatar">我</button></div></header>
      {error && <div className="toast error"><span>{error}</span><button onClick={() => setError("")}>×</button></div>}
      {showOverview ? <ProjectDashboard projects={projects} onOpen={openProject} onCreate={() => setModal("project")}/> : !project ? <EmptyState onCreate={() => setModal("project")}/> : <>
        <section className="project-overview" style={{ "--project-color": project.color } as React.CSSProperties}>
          <div className="project-summary"><div className="summary-top"><span className="pill">{project.status === "active" ? "进行中" : project.status}</span><button className="text-button" onClick={() => setModal("editProject")}><Icon name="edit"/>编辑项目</button></div><p className="eyebrow light">项目目标</p><h2>{project.goal || "给这个项目设定一个明确目标"}</h2><p className="project-desc">{project.description || "补充一段项目简介，帮助你和 AI 更准确地规划下一步。"}</p><div className="summary-meta"><span><Icon name="calendar"/>{project.dueDate ? `目标日期 ${project.dueDate}` : "暂未设置目标日期"}</span><span><Icon name="target"/>{project.taskCount} 项任务</span></div></div>
          <div className="focus-panel"><div className="focus-head"><div><span>当前焦点</span><b>{focusTasks.length ? "接下来优先完成" : "暂时没有待处理任务"}</b></div><strong>{progress}%</strong></div><div className="progress-track"><i style={{ width: `${progress}%` }}/></div><div className="focus-list">{focusTasks.map((task, index) => <div key={task.id}><span>{index + 1}</span><p>{task.title}</p><small>{task.dueDate?.slice(5) || statusNames[task.status]}</small></div>)}</div><button onClick={() => setAssistantOpen(true)}><Icon name="spark"/>让 AI 帮我安排今天</button></div>
        </section>
        <section className="metrics"><Metric label="任务进度" value={`${progress}%`} note={`${project.completedCount} / ${project.taskCount} 已完成`} tone="purple"/><Metric label="正在推进" value={project.tasks.filter(task => task.status === "doing").length} note="保持节奏，避免并行过多" tone="blue"/><Metric label="到期关注" value={dueSoon} note={dueSoon ? "请优先处理" : "目前没有逾期"} tone={dueSoon ? "orange" : "green"}/><Metric label="重要且紧急" value={project.tasks.filter(task => task.priority === "urgent" && task.status !== "done").length} note="象限一待处理任务" tone="orange"/></section>
        <section className="workspace-card"><div className="workspace-head"><div><p className="eyebrow">项目执行中心</p><h2>任务工作台</h2><span>同一份数据，多种视角；拖拽任务即可调整顺序或流程</span></div><button className="secondary" onClick={() => setModal("ai")}><Icon name="spark"/>重新规划项目</button></div><div className="view-tabs">{(["list","board","quadrant","gantt"] as WorkspaceView[]).map(view => <button key={view} className={workspaceView === view ? "active" : ""} onClick={() => changeWorkspaceView(view)}><Icon name={view}/>{viewNames[view]}</button>)}</div><TaskWorkspace view={workspaceView} project={project} refresh={refresh} onError={setError}/></section>
      </>}
    </main>
    {modal === "project" && <ProjectModal onClose={() => setModal(null)} onCreated={async created => { setModal(null); setShowOverview(false); await loadProjects(); setSelectedId(created.id); }} onError={setError}/>}
    {modal === "settings" && <SettingsModal onClose={() => setModal(null)} onError={setError}/>} 
    {modal === "appearance" && <AppearanceModal value={appearance} onChange={setAppearance} onClose={() => setModal(null)}/>} 
    {modal === "ai" && project && <AiModal project={project} onClose={() => setModal(null)} onApplied={async () => { setModal(null); await refresh(); }} onError={setError}/>} 
    {modal === "editProject" && project && <EditProjectModal project={project} onClose={() => setModal(null)} onSaved={async () => { setModal(null); await refresh(); }} onError={setError}/>} 
    {project && <PlanningAssistant project={project} open={assistantOpen} onClose={() => setAssistantOpen(false)} onApplied={refresh} onError={setError}/>} 
  </div>;
}

function EmptyState({ onCreate }: { onCreate: () => void }) { return <div className="empty-state"><div className="empty-art"><span>✦</span></div><p className="eyebrow">从一个想法开始</p><h2>创建你的第一个项目</h2><p>先记下目标，再用四象限分清轻重缓急；智能助手也能为你生成可执行的时间安排。</p><button className="primary" onClick={onCreate}><Icon name="plus"/>新建项目</button></div>; }
function Metric({ label, value, note, tone }: { label: string; value: string | number; note: string; tone: string }) { return <div className={`metric ${tone}`}><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div><div className="metric-shape"/></div>; }

function ProjectDashboard({ projects, onOpen, onCreate }: { projects: Project[]; onOpen: (projectId: number) => void; onCreate: () => void }) {
  const taskCount = projects.reduce((total, item) => total + item.taskCount, 0);
  const completedCount = projects.reduce((total, item) => total + item.completedCount, 0);
  const activeCount = projects.filter(item => item.status === "active").length;
  const completion = taskCount ? Math.round(completedCount / taskCount * 100) : 0;
  if (!projects.length) return <EmptyState onCreate={onCreate}/>;
  return <div className="dashboard-page"><section className="dashboard-hero"><div><p className="eyebrow">所有项目，一目了然</p><h2>掌握整体进度，找到下一步重点</h2><p>集中查看每个项目的任务进度、截止日期和完成情况，点击项目即可进入执行页面。</p></div><button className="primary" onClick={onCreate}><Icon name="plus"/>新建项目</button></section><section className="metrics dashboard-metrics"><Metric label="项目总数" value={projects.length} note={`${activeCount} 个正在进行`} tone="purple"/><Metric label="全部任务" value={taskCount} note="跨项目任务总量" tone="blue"/><Metric label="已完成" value={completedCount} note="持续积累交付成果" tone="green"/><Metric label="整体完成度" value={`${completion}%`} note="所有项目综合进度" tone="orange"/></section><section className="dashboard-projects"><div className="dashboard-section-head"><div><p className="eyebrow">项目组合</p><h2>我的项目</h2></div><span>左侧列表可拖拽调整顺序</span></div><div className="dashboard-grid">{projects.map(item => { const progress = item.taskCount ? Math.round(item.completedCount / item.taskCount * 100) : 0; return <button key={item.id} className="dashboard-project-card" onClick={() => onOpen(item.id)}><div className="dashboard-card-top"><span className="dashboard-project-mark" style={{ background:item.color }}/><span>{item.status === "active" ? "进行中" : item.status}</span><Icon name="arrow"/></div><h3>{item.name}</h3><p>{item.goal || item.description || "尚未填写项目目标"}</p><div className="dashboard-card-progress"><span><i style={{ width:`${progress}%`, background:item.color }}/></span><b>{progress}%</b></div><footer><span>{item.completedCount} / {item.taskCount} 已完成</span><span>{item.dueDate ? `截止 ${item.dueDate}` : "未设置截止日期"}</span></footer></button>; })}</div></section></div>;
}

function TaskWorkspace({ view, project, refresh, onError }: { view: WorkspaceView; project: ProjectDetail; refresh: () => Promise<void>; onError: (text: string) => void }) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("urgent");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TaskStatus>("all");
  const orderedTasks = useMemo(() => [...project.tasks].sort((first, second) => first.sortOrder - second.sortOrder || first.id - second.id), [project.tasks]);
  const visibleTasks = useMemo(() => orderedTasks.filter(task => (statusFilter === "all" || task.status === statusFilter) && (!search.trim() || `${task.title} ${task.phase} ${task.description}`.toLowerCase().includes(search.trim().toLowerCase()))), [orderedTasks, search, statusFilter]);

  const add = async () => {
    if (!title.trim()) return;
    try { await request(`/api/projects/${project.id}/tasks`, { method: "POST", body: JSON.stringify({ title, priority, phase: "未分组", sortOrder: orderedTasks.length }) }); setTitle(""); await refresh(); }
    catch (err) { onError(err instanceof Error ? err.message : "添加失败"); }
  };
  const update = async (taskId: number, changes: Partial<Task>) => {
    try { await request(`/api/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify(changes) }); await refresh(); }
    catch (err) { onError(err instanceof Error ? err.message : "调整失败"); }
  };
  const reorder = async (draggedId: number, targetId: number) => {
    if (!draggedId || draggedId === targetId) return;
    const next = [...orderedTasks];
    const sourceIndex = next.findIndex(task => task.id === draggedId);
    const targetIndex = next.findIndex(task => task.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const [dragged] = next.splice(sourceIndex, 1); next.splice(targetIndex, 0, dragged);
    try { await Promise.all(next.map((task, index) => task.sortOrder === index ? Promise.resolve() : request(`/api/tasks/${task.id}`, { method: "PATCH", body: JSON.stringify({ sortOrder: index }) }))); await refresh(); }
    catch (err) { onError(err instanceof Error ? err.message : "排序失败"); }
  };

  return <div className="task-workspace">
    <div className="workspace-toolbar"><div className="quick-add"><input value={title} onChange={event => setTitle(event.target.value)} onKeyDown={event => event.key === "Enter" && add()} placeholder="添加一项任务，按回车保存…"/><select value={priority} onChange={event => setPriority(event.target.value as Priority)}>{quadrants.map(item => <option key={item.priority} value={item.priority}>{item.title}</option>)}</select><button className="primary compact" onClick={add}><Icon name="plus"/>添加任务</button></div><div className="view-filters"><label><Icon name="search"/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="搜索任务或阶段"/></label><select value={statusFilter} onChange={event => setStatusFilter(event.target.value as "all" | TaskStatus)}><option value="all">全部状态</option>{Object.entries(statusNames).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select><span>{visibleTasks.length} 项</span></div></div>
    {view === "list" && <TaskList tasks={visibleTasks} onOpen={setEditingTask} onReorder={reorder} onUpdate={update}/>} 
    {view === "board" && <StatusBoard tasks={visibleTasks} onOpen={setEditingTask} onReorder={reorder} onUpdate={update}/>} 
    {view === "quadrant" && <QuadrantView tasks={visibleTasks} onOpen={setEditingTask} onReorder={reorder} onUpdate={update}/>} 
    {view === "gantt" && <GanttView tasks={visibleTasks} project={project} onOpen={setEditingTask} onReorder={reorder}/>} 
    {editingTask && <TaskModal task={project.tasks.find(task => task.id === editingTask.id) || editingTask} onClose={() => setEditingTask(null)} onSaved={async () => { setEditingTask(null); await refresh(); }} onError={onError}/>} 
  </div>;
}

type TaskViewProps = { tasks: Task[]; onOpen: (task: Task) => void; onReorder: (draggedId: number, targetId: number) => void; onUpdate: (taskId: number, changes: Partial<Task>) => void };
function dragId(event: React.DragEvent) { return Number(event.dataTransfer.getData("text/task-id")); }

function TaskList({ tasks, onOpen, onReorder, onUpdate }: TaskViewProps) {
  return <div className="task-table-wrap"><table className="task-table"><thead><tr><th/><th>任务</th><th>阶段</th><th>状态</th><th>四象限</th><th>时间</th><th>工时</th></tr></thead><tbody>{tasks.map(task => <tr key={task.id} draggable onDragStart={event => event.dataTransfer.setData("text/task-id", String(task.id))} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); onReorder(dragId(event), task.id); }}><td className="drag-handle"><Icon name="grip"/></td><td><button className="task-title-button" onClick={() => onOpen(task)}>{task.title}</button><small>{task.description || "暂无说明"}</small></td><td>{task.phase}</td><td><select className={`inline-status ${task.status}`} value={task.status} onChange={event => onUpdate(task.id, { status: event.target.value as TaskStatus })}>{Object.entries(statusNames).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></td><td><span className={`priority-label ${task.priority}`}>{priorityNames[task.priority]}</span></td><td>{task.startDate?.slice(5) || "--"} → {task.dueDate?.slice(5) || "--"}</td><td>{task.estimateHours || 0}h</td></tr>)}</tbody></table>{!tasks.length && <div className="view-empty">没有符合当前筛选条件的任务</div>}</div>;
}

function StatusBoard({ tasks, onOpen, onReorder, onUpdate }: TaskViewProps) {
  return <div className="status-board">{(Object.entries(statusNames) as Array<[TaskStatus,string]>).map(([status,label]) => { const columnTasks = tasks.filter(task => task.status === status); return <section className={`status-column status-${status}`} key={status} onDragOver={event => event.preventDefault()} onDrop={event => { const id = dragId(event); if (id) onUpdate(id, { status }); }}><header><div><i/><h3>{label}</h3></div><span>{columnTasks.length}</span></header><div className="status-cards">{columnTasks.map(task => <article key={task.id} className="workflow-card" draggable onDragStart={event => event.dataTransfer.setData("text/task-id", String(task.id))} onDragOver={event => event.preventDefault()} onDrop={event => { event.stopPropagation(); const id=dragId(event); const source=tasks.find(item => item.id === id); if (source && source.status !== status) onUpdate(id,{status}); onReorder(id,task.id); }} onClick={() => onOpen(task)}><div><span className={`priority-mark ${task.priority}`}/><small>{task.phase}</small><Icon name="grip"/></div><h4>{task.title}</h4><p>{task.description || "暂无任务说明"}</p><footer><span><Icon name="calendar"/>{task.dueDate?.slice(5) || "未排期"}</span><b>{task.estimateHours || 0}h</b></footer></article>)}{!columnTasks.length && <div className="board-dropzone">拖动任务到这里</div>}</div></section>; })}</div>;
}

function QuadrantView({ tasks, onOpen, onReorder, onUpdate }: TaskViewProps) {
  const completed = tasks.filter(task => task.status === "done");
  return <><div className="quadrant-overview"><div><span>PRIORITY MATRIX</span><h3>四象限优先级</h3></div><div className="matrix-legend"><span>上排 · 重要任务</span><span>左列 · 紧急任务</span></div></div><div className="quadrant-board">{quadrants.map((quadrant, quadrantIndex) => { const items=tasks.filter(task => task.priority === quadrant.priority && task.status !== "done"); return <section className={`quadrant quadrant-${quadrant.priority}`} key={quadrant.priority} onDragOver={event => event.preventDefault()} onDrop={event => { const id=dragId(event); if(id) onUpdate(id,{priority:quadrant.priority}); }}><div className="quadrant-head"><div><span>Q{quadrantIndex+1}</span><div><em>{quadrant.action}</em><h3>{quadrant.title}</h3><p>{quadrant.hint}</p></div></div><b>{items.length}</b></div><div className="cards">{items.map(task => <article className="task-card" key={task.id} draggable onDragStart={event => event.dataTransfer.setData("text/task-id",String(task.id))} onDragOver={event => event.preventDefault()} onDrop={event => { event.stopPropagation(); const id=dragId(event); const source=tasks.find(item=>item.id===id); if(source && source.priority!==quadrant.priority) onUpdate(id,{priority:quadrant.priority}); onReorder(id,task.id); }} onClick={() => onOpen(task)}><div className="task-meta"><span>{task.phase}</span><span className={`status-dot ${task.status}`}>{statusNames[task.status]}</span></div><h4>{task.title}</h4>{task.description && <p>{task.description}</p>}<div className="task-footer"><span>{task.dueDate ? <><Icon name="calendar"/>{task.dueDate.slice(5)}</> : <><Icon name="clock"/>{task.estimateHours || 0}h</>}</span><em>{quadrant.action}</em></div></article>)}{!items.length && <div className="column-empty"><Icon name="plus"/><span>拖入任务</span></div>}</div></section>; })}</div>{completed.length>0 && <details className="completed-tasks"><summary>已完成任务（{completed.length}）</summary><div>{completed.map(task => <button key={task.id} onClick={() => onOpen(task)}><Icon name="check"/><span>{task.title}</span><small>{priorityNames[task.priority]}</small></button>)}</div></details>}</>;
}

function dateValue(value: string | null, fallback: string) { const date=new Date(`${value || fallback}T00:00:00`); return Number.isNaN(date.getTime()) ? new Date(`${fallback}T00:00:00`) : date; }
function GanttView({ tasks, project, onOpen, onReorder }: { tasks: Task[]; project: ProjectDetail; onOpen: (task: Task) => void; onReorder: (draggedId: number, targetId: number) => void }) {
  const today=new Date(); const fallback=today.toISOString().slice(0,10);
  const dates=tasks.flatMap(task => [dateValue(task.startDate,fallback),dateValue(task.dueDate,task.startDate||fallback)]);
  const start=new Date(Math.min(...dates.map(date=>date.getTime()),today.getTime())); start.setDate(1);
  const projectEnd=dateValue(project.dueDate,fallback); const end=new Date(Math.max(...dates.map(date=>date.getTime()),projectEnd.getTime(),today.getTime())); end.setMonth(end.getMonth()+1,0);
  const totalDays=Math.max(1,Math.ceil((end.getTime()-start.getTime())/86400000)+1);
  const months:Array<{label:string;days:number}> = []; const cursor=new Date(start); while(cursor<=end){ const monthEnd=new Date(cursor.getFullYear(),cursor.getMonth()+1,0); const segmentEnd=monthEnd>end?end:monthEnd; months.push({label:`${cursor.getFullYear()}年${cursor.getMonth()+1}月`,days:Math.ceil((segmentEnd.getTime()-cursor.getTime())/86400000)+1}); cursor.setMonth(cursor.getMonth()+1,1); }
  const position=(date:Date)=>Math.max(0,Math.min(100,(date.getTime()-start.getTime())/86400000/totalDays*100));
  return <div className="gantt-shell"><div className="gantt-table"><div className="gantt-table-head">任务 / 阶段</div>{tasks.map(task=><div className="gantt-task-name" key={task.id} draggable onDragStart={event=>event.dataTransfer.setData("text/task-id",String(task.id))} onDragOver={event=>event.preventDefault()} onDrop={event=>onReorder(dragId(event),task.id)} onClick={()=>onOpen(task)}><Icon name="grip"/><div><b>{task.title}</b><small>{task.phase}</small></div><span>{statusNames[task.status]}</span></div>)}</div><div className="gantt-timeline"><div className="gantt-months">{months.map(month=><span key={month.label} style={{width:`${month.days/totalDays*100}%`}}>{month.label}</span>)}</div>{tasks.map(task=>{ const taskStart=dateValue(task.startDate,fallback); const taskEnd=dateValue(task.dueDate,task.startDate||fallback); const left=position(taskStart); const width=Math.max(1.5,position(new Date(taskEnd.getTime()+86400000))-left); return <div className="gantt-row" key={task.id} onClick={()=>onOpen(task)}><i className="today-line" style={{left:`${position(today)}%`}}/><span className={`gantt-bar ${task.status} ${task.priority}`} style={{left:`${left}%`,width:`${width}%`}}><b>{task.title}</b></span></div>;})}</div>{!tasks.length&&<div className="view-empty">没有可显示的任务</div>}</div>;
}

function Modal({ title, subtitle, onClose, children, wide = false }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) { return <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}><div className={`modal ${wide ? "wide-modal" : ""}`}><div className="modal-head"><div><h2>{title}</h2><p>{subtitle}</p></div><button onClick={onClose}>×</button></div>{children}</div></div>; }

function TaskModal({ task, onClose, onSaved, onError }: { task: Task; onClose: () => void; onSaved: () => void; onError: (text: string) => void }) {
  const [form, setForm] = useState({ title: task.title, description: task.description, acceptance: task.acceptance, phase: task.phase, priority: task.priority, status: task.status, startDate: task.startDate || "", dueDate: task.dueDate || "", estimateHours: task.estimateHours }); const [saving, setSaving] = useState(false);
  const save = async () => { if (!form.title.trim()) return onError("任务名称不能为空"); setSaving(true); try { await request(`/api/tasks/${task.id}`, { method: "PATCH", body: JSON.stringify({ ...form, startDate: form.startDate || null, dueDate: form.dueDate || null }) }); onSaved(); } catch (err) { onError(err instanceof Error ? err.message : "保存失败"); } finally { setSaving(false); } };
  const remove = async () => { if (!confirm("确定删除这个任务吗？")) return; try { await request(`/api/tasks/${task.id}`, { method: "DELETE" }); onSaved(); } catch (err) { onError(err instanceof Error ? err.message : "删除失败"); } };
  return <Modal title="任务详情" subtitle="查看任务内容，修改后保存即可同步到四象限。" onClose={onClose}><div className="form task-form"><label>任务名称<input autoFocus value={form.title} onChange={event => setForm({ ...form, title: event.target.value })}/></label><label>任务说明<textarea rows={4} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} placeholder="要做什么、相关背景、注意事项…"/></label><label>完成标准<textarea rows={3} value={form.acceptance} onChange={event => setForm({ ...form, acceptance: event.target.value })} placeholder="达到什么结果才算完成？"/></label><div className="form-row"><label>所属阶段<input value={form.phase} onChange={event => setForm({ ...form, phase: event.target.value })}/></label><label>四象限<select value={form.priority} onChange={event => setForm({ ...form, priority: event.target.value as Priority })}>{quadrants.map(item => <option key={item.priority} value={item.priority}>{item.title}</option>)}</select></label></div><div className="form-row three"><label>状态<select value={form.status} onChange={event => setForm({ ...form, status: event.target.value as TaskStatus })}>{Object.entries(statusNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>开始日期<input type="date" value={form.startDate} onChange={event => setForm({ ...form, startDate: event.target.value })}/></label><label>截止日期<input type="date" value={form.dueDate} onChange={event => setForm({ ...form, dueDate: event.target.value })}/></label></div><label>预计工时（小时）<input type="number" min="0" step="0.5" value={form.estimateHours} onChange={event => setForm({ ...form, estimateHours: Number(event.target.value) })}/></label><div className="modal-actions split"><button className="danger-button" onClick={remove}><Icon name="trash"/>删除任务</button><div><button className="ghost" onClick={onClose}>取消</button><button className="primary" disabled={saving} onClick={save}>{saving ? "保存中…" : "保存修改"}</button></div></div></div></Modal>;
}

function ProjectModal({ onClose, onCreated, onError }: { onClose: () => void; onCreated: (project: ProjectDetail) => void; onError: (text: string) => void }) {
  const [form, setForm] = useState({ name: "", description: "", goal: "", dueDate: "", color: colors[0] }); const [saving, setSaving] = useState(false);
  const submit = async () => { if (!form.name.trim()) return onError("请填写项目名称"); setSaving(true); try { onCreated(await request<ProjectDetail>("/api/projects", { method: "POST", body: JSON.stringify(form) })); } catch (err) { onError(err instanceof Error ? err.message : "创建失败"); } finally { setSaving(false); } };
  return <Modal title="创建新项目" subtitle="先写清目标和背景，后续可随时调整。" onClose={onClose}><div className="form"><label>项目名称<input autoFocus value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="例如：智能气味传感器模组"/></label><label>项目简介<textarea rows={4} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} placeholder="项目背景、范围、已有资源和限制…"/></label><label>最终目标<input value={form.goal} onChange={event => setForm({ ...form, goal: event.target.value })} placeholder="一句话说明希望交付的成果"/></label><div className="form-row"><label>目标日期<input type="date" value={form.dueDate} onChange={event => setForm({ ...form, dueDate: event.target.value })}/></label><label>项目颜色<div className="color-picker">{colors.map(color => <button type="button" key={color} aria-label={color} className={form.color === color ? "selected" : ""} style={{ background: color }} onClick={() => setForm({ ...form, color })}/>)}</div></label></div><div className="modal-actions"><button className="ghost" onClick={onClose}>取消</button><button className="primary" disabled={saving} onClick={submit}>{saving ? "创建中…" : "创建项目"}</button></div></div></Modal>;
}

function EditProjectModal({ project, onClose, onSaved, onError }: { project: ProjectDetail; onClose: () => void; onSaved: () => void; onError: (text: string) => void }) {
  const [form, setForm] = useState({ name: project.name, description: project.description, goal: project.goal, dueDate: project.dueDate || "", color: project.color }); const [saving, setSaving] = useState(false);
  const save = async () => { if (!form.name.trim()) return onError("项目名称不能为空"); setSaving(true); try { await request(`/api/projects/${project.id}`, { method: "PATCH", body: JSON.stringify({ ...form, dueDate: form.dueDate || null }) }); onSaved(); } catch (err) { onError(err instanceof Error ? err.message : "保存失败"); } finally { setSaving(false); } };
  return <Modal title="编辑项目" subtitle="保持项目介绍简短清晰，详细工作拆到任务中。" onClose={onClose}><div className="form"><label>项目名称<input autoFocus value={form.name} onChange={event => setForm({ ...form, name: event.target.value })}/></label><label>项目简介<textarea rows={4} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })}/></label><label>最终目标<input value={form.goal} onChange={event => setForm({ ...form, goal: event.target.value })}/></label><div className="form-row"><label>目标日期<input type="date" value={form.dueDate} onChange={event => setForm({ ...form, dueDate: event.target.value })}/></label><label>项目颜色<div className="color-picker">{colors.map(color => <button type="button" key={color} aria-label={color} className={form.color === color ? "selected" : ""} style={{ background: color }} onClick={() => setForm({ ...form, color })}/>)}</div></label></div><div className="modal-actions"><button className="ghost" onClick={onClose}>取消</button><button className="primary" disabled={saving} onClick={save}>{saving ? "保存中…" : "保存项目"}</button></div></div></Modal>;
}

function AppearanceModal({ value, onChange, onClose }: { value: Appearance; onChange: (value: Appearance) => void; onClose: () => void }) {
  const themes: Array<{ value: Appearance["theme"]; name: string; note: string; colors: string[] }> = [
    { value: "purple", name: "星云紫", note: "灵感、专注", colors: ["#7c5cff","#f6f7fb","#ffffff"] },
    { value: "blue", name: "极光蓝", note: "清晰、理性", colors: ["#0969da","#f4f8ff","#ffffff"] },
    { value: "green", name: "翡翠绿", note: "自然、舒缓", colors: ["#15846d","#f2f8f5","#ffffff"] },
    { value: "orange", name: "日落橙", note: "温暖、活力", colors: ["#d97706","#fff8ef","#ffffff"] },
    { value: "night", name: "GitHub 暗黑", note: "沉浸、低眩光", colors: ["#58a6ff","#0d1117","#161b22"] },
  ];
  const fonts: Array<{ value: Appearance["font"]; name: string; sample: string; family: string }> = [
    { value: "modern", name: "现代黑体", sample: "清晰现代，适合日常工作", family: '"Microsoft YaHei UI", "PingFang SC", sans-serif' },
    { value: "system", name: "系统字体", sample: "跟随系统，轻快自然", family: '"Segoe UI", system-ui, sans-serif' },
    { value: "anthropic", name: "Anthropic Sans", sample: "Human, warm and precise", family: '"Anthropic Sans", "Microsoft YaHei UI", sans-serif' },
    { value: "merriweather", name: "Merriweather", sample: "Elegant reading for focused work", family: 'Merriweather, "Microsoft YaHei UI", serif' },
    { value: "song", name: "宋体阅读", sample: "层次分明，适合长文阅读", family: 'SimSun, "Songti SC", serif' },
    { value: "mono", name: "等宽字体", sample: "012345 工时 / 日期 / 数据", family: 'Consolas, "Microsoft YaHei UI", monospace' },
  ];
  const fontSizes: Array<{ value: Appearance["fontSize"]; name: string; titleSize: string; bodySize: string }> = [
    { value: "compact", name: "紧凑", titleSize: "14px", bodySize: "12px" }, { value: "standard", name: "标准", titleSize: "16px", bodySize: "14px" },
    { value: "comfortable", name: "舒适", titleSize: "18px", bodySize: "16px" }, { value: "large", name: "大号", titleSize: "20px", bodySize: "18px" },
  ];
  return <Modal title="外观设置" subtitle="打造适合你的阅读密度与工作氛围。" onClose={onClose}><div className="appearance-form"><section><div className="appearance-section-head"><div><h3>配色方案</h3><p>选择适合当前环境的界面色彩</p></div><span>{themes.find(theme=>theme.value===value.theme)?.name}</span></div><div className="theme-options">{themes.map(theme=><button key={theme.value} className={value.theme===theme.value?"selected":""} onClick={()=>onChange({...value,theme:theme.value})}><div className="theme-preview">{theme.colors.map((color,index)=><i key={color} style={{background:color,flex:index===0?1:2}}/>)}</div><b>{theme.name}</b><small>{theme.note}</small>{value.theme===theme.value&&<span><Icon name="check"/></span>}</button>)}</div></section><section><div className="appearance-section-head"><div><h3>界面字体</h3><p>选择更适合阅读和工作的字体</p></div></div><div className="font-options">{fonts.map(font=><button key={font.value} className={value.font===font.value?"selected":""} onClick={()=>onChange({...value,font:font.value})}><span style={{fontFamily:font.family}}>Aa</span><div><b>{font.name}</b><small style={{fontFamily:font.family}}>{font.sample}</small></div>{value.font===font.value&&<Icon name="check"/>}</button>)}</div></section><section><div className="appearance-section-head"><div><h3>阅读字号</h3><p>同步调整任务与界面正文，不放大页面标题</p></div><span>{fontSizes.find(item=>item.value===value.fontSize)?.name}</span></div><div className="font-size-options">{fontSizes.map(item=><button key={item.value} className={value.fontSize===item.value?"selected":""} onClick={()=>onChange({...value,fontSize:item.value})}><b style={{fontSize:item.titleSize}}>Aa</b><span>{item.name}</span><small>标题 {item.titleSize} / 正文 {item.bodySize}</small></button>)}</div></section><div className="appearance-actions"><button className="ghost" onClick={()=>onChange(defaultAppearance)}>恢复默认</button><button className="primary" onClick={onClose}>完成</button></div></div></Modal>;
}

function SettingsModal({ onClose, onError }: { onClose: () => void; onError: (text: string) => void }) {
  const [form, setForm] = useState<ModelSettings>({ baseUrl: "", apiKey: "", model: "", temperature: 0.3 }); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  useEffect(() => { request<ModelSettings>("/api/settings/model").then(setForm).catch(err => onError(err.message)); }, [onError]);
  const save = async () => { setBusy(true); try { await request("/api/settings/model", { method: "PUT", body: JSON.stringify(form) }); setMessage("设置已保存在本机"); } catch (err) { onError(err instanceof Error ? err.message : "保存失败"); } finally { setBusy(false); } };
  const test = async () => { setBusy(true); setMessage("正在连接模型…"); try { await request("/api/settings/model", { method: "PUT", body: JSON.stringify(form) }); const result = await request<{ message: string }>("/api/settings/model/test", { method: "POST" }); setMessage(`✓ ${result.message}`); } catch (err) { setMessage(""); onError(err instanceof Error ? err.message : "连接失败"); } finally { setBusy(false); } };
  return <Modal title="AI 模型设置" subtitle="支持 OpenAI 兼容接口，例如 OpenAI、DeepSeek、通义千问或本机 Ollama。" onClose={onClose}><div className="form"><label>API 地址<input value={form.baseUrl} onChange={event => setForm({ ...form, baseUrl: event.target.value })} placeholder="https://api.openai.com/v1"/></label><label>API Key<input type="password" value={form.apiKey} onChange={event => setForm({ ...form, apiKey: event.target.value })} placeholder="仅保存在这台电脑"/></label><label>模型名称（Model ID）<input value={form.model} onChange={event => setForm({ ...form, model: event.target.value })} placeholder="gpt-4.1-mini / deepseek-chat"/></label><label>创造性：{form.temperature}<input type="range" min="0" max="1" step="0.1" value={form.temperature} onChange={event => setForm({ ...form, temperature: Number(event.target.value) })}/></label>{message && <div className="success-message">{message}</div>}<p className="privacy-note">密钥保存在项目目录的本机数据库中，不会显示在页面上。请不要把整个 data 文件夹发送给其他人。</p><div className="modal-actions"><button className="secondary" disabled={busy} onClick={test}>测试连接</button><button className="primary" disabled={busy} onClick={save}>保存设置</button></div></div></Modal>;
}

function AiModal({ project, onClose, onApplied, onError }: { project: ProjectDetail; onClose: () => void; onApplied: () => void; onError: (text: string) => void }) {
  const [description, setDescription] = useState(project.description); const [plan, setPlan] = useState<GeneratedPlan | null>(null); const [busy, setBusy] = useState(false);
  const generate = async () => { setBusy(true); try { const data = await request<{ plan: GeneratedPlan }>(`/api/projects/${project.id}/generate`, { method: "POST", body: JSON.stringify({ description }) }); setPlan(data.plan); } catch (err) { onError(err instanceof Error ? err.message : "生成失败"); } finally { setBusy(false); } };
  const apply = async () => { if (!plan || !confirm("应用后会替换当前项目的全部任务，是否继续？")) return; setBusy(true); try { await request(`/api/projects/${project.id}/generate`, { method: "POST", body: JSON.stringify({ apply: true, plan }) }); onApplied(); } catch (err) { onError(err instanceof Error ? err.message : "应用失败"); setBusy(false); } };
  return <Modal title="重新规划项目" subtitle="AI 会先生成预览，你确认后才会替换当前任务。" onClose={onClose} wide><div className="ai-layout"><div className="ai-prompt"><label>补充项目背景与要求<textarea rows={10} value={description} onChange={event => setDescription(event.target.value)} placeholder="项目要做什么、截止时间、已有资源、限制条件…"/></label><button className="primary wide" disabled={busy} onClick={generate}><Icon name="spark"/>{busy ? "AI 正在认真规划…" : plan ? "重新生成方案" : "生成项目方案"}</button><p>生成通常需要 10～60 秒，请保持此窗口打开。</p></div><div className="plan-preview">{plan ? <><div className="plan-summary"><span>方案预览</span><h3>{plan.goal}</h3><p>{plan.summary}</p></div>{plan.phases.map((phase, index) => <div className="phase" key={`${phase.name}-${index}`}><div className="phase-number">{index + 1}</div><div><h4>{phase.name}</h4>{phase.tasks.map(task => <div className="preview-task" key={task.title}><div><b>{task.title}</b><p>{task.description}</p></div><span>{task.estimateHours}h</span></div>)}</div></div>)}{plan.risks.length > 0 && <div className="risk-box"><b>需要注意</b><ul>{plan.risks.map(risk => <li key={risk}>{risk}</li>)}</ul></div>}<div className="modal-actions"><button className="ghost" onClick={onClose}>先不应用</button><button className="primary" disabled={busy} onClick={apply}>确认应用方案</button></div></> : <div className="preview-empty"><div>✦</div><h3>方案会显示在这里</h3><p>AI 将把你的描述整理为阶段、任务、工时、日期和验收标准。</p></div>}</div></div></Modal>;
}

function PlanningAssistant({ project, open, onClose, onApplied, onError }: { project: ProjectDetail; open: boolean; onClose: () => void; onApplied: () => Promise<void>; onError: (text: string) => void }) {
  const [messages, setMessages] = useState<AssistantMessage[]>([{ role: "assistant", content: "告诉我你接下来的目标、可用时间或临时变化。我会结合当前任务，帮你安排顺序和时间；确认后可直接写入任务看板。" }]);
  const [input, setInput] = useState(""); const [busy, setBusy] = useState(false); const [autoApply, setAutoApply] = useState(false); const [pendingPlan, setPendingPlan] = useState<AssistantPlan | null>(null); const [selectedTaskIndexes, setSelectedTaskIndexes] = useState<Set<number>>(new Set()); const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (open) endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, open]);
  useEffect(() => { setMessages([{ role: "assistant", content: `已切换到“${project.name}”。告诉我你的时间安排或想推进的目标，我来帮你拆解。` }]); setPendingPlan(null); setSelectedTaskIndexes(new Set()); }, [project.id, project.name]);
  const apply = async (plan: AssistantPlan, selectedIndexes?: Set<number>) => { const tasks = selectedIndexes ? plan.tasks.filter((_, index) => selectedIndexes.has(index)) : plan.tasks; if (!tasks.length) return; setBusy(true); try { const result = await request<{ appliedCount: number }>(`/api/projects/${project.id}/assistant`, { method: "POST", body: JSON.stringify({ apply: true, plan: { tasks } }) }); setMessages(current => [...current, { role: "assistant", content: `已将 ${result.appliedCount} 项选中安排写入任务看板。你可以点击卡片继续修改。` }]); setPendingPlan(null); setSelectedTaskIndexes(new Set()); await onApplied(); } catch (err) { onError(err instanceof Error ? err.message : "应用安排失败"); } finally { setBusy(false); } };
  const send = async () => { const content = input.trim(); if (!content || busy) return; const nextMessages: AssistantMessage[] = [...messages, { role: "user", content }]; setMessages(nextMessages); setInput(""); setBusy(true); setPendingPlan(null); setSelectedTaskIndexes(new Set()); try { const data = await request<{ reply: string; plan: AssistantPlan }>(`/api/projects/${project.id}/assistant`, { method: "POST", body: JSON.stringify({ messages: nextMessages.slice(-10) }) }); setMessages(current => [...current, { role: "assistant", content: data.reply }]); if (data.plan.tasks.length) { if (autoApply) await apply(data.plan); else { setPendingPlan(data.plan); setSelectedTaskIndexes(new Set(data.plan.tasks.map((_, index) => index))); } } } catch (err) { onError(err instanceof Error ? err.message : "智能助手暂时无法响应"); } finally { setBusy(false); } };
  const toggleTask = (index: number) => setSelectedTaskIndexes(current => { const next = new Set(current); if (next.has(index)) next.delete(index); else next.add(index); return next; });
  const toggleAllTasks = () => { if (!pendingPlan) return; setSelectedTaskIndexes(current => current.size === pendingPlan.tasks.length ? new Set() : new Set(pendingPlan.tasks.map((_, index) => index))); };
  return <aside className={`assistant-panel ${open ? "open" : ""}`} aria-hidden={!open}><div className="assistant-head"><div><span><Icon name="spark"/></span><div><b>Chrona 智能助手</b><small>规划行程 · 安排时间 · 自动建任务</small></div></div><button onClick={onClose}>×</button></div><div className="assistant-context"><span>正在规划</span><b>{project.name}</b><label><input type="checkbox" checked={autoApply} onChange={event => setAutoApply(event.target.checked)}/>自动写入任务</label></div><div className="chat-messages">{messages.map((message, index) => <div className={`chat-message ${message.role}`} key={`${message.role}-${index}`}><span>{message.role === "assistant" ? "C" : "我"}</span><p>{message.content}</p></div>)}{busy && <div className="chat-message assistant"><span>C</span><p className="typing">正在整理安排<i/><i/><i/></p></div>}{pendingPlan && <div className="plan-card"><div><label className="plan-select-all"><input type="checkbox" checked={selectedTaskIndexes.size === pendingPlan.tasks.length} onChange={toggleAllTasks}/>安排建议</label><b>已选 {selectedTaskIndexes.size} / {pendingPlan.tasks.length}</b></div><ul>{pendingPlan.tasks.map((task, index) => <li key={`${task.title}-${task.dueDate}-${index}`} className={selectedTaskIndexes.has(index) ? "selected" : ""}><label className="plan-task-check"><input type="checkbox" checked={selectedTaskIndexes.has(index)} onChange={() => toggleTask(index)}/><span className={`quadrant-mini ${task.priority}`}/><p>{task.title}<small>{task.dueDate || "待定日期"} · {task.estimateHours}h</small></p></label></li>)}</ul><button disabled={busy || !selectedTaskIndexes.size} onClick={() => apply(pendingPlan, selectedTaskIndexes)}><Icon name="check"/>添加已选 {selectedTaskIndexes.size} 项</button></div>}<div ref={endRef}/></div><div className="quick-prompts"><button onClick={() => setInput("根据当前任务，帮我安排今天的工作顺序和时间段")}>安排今天</button><button onClick={() => setInput("检查截止日期和工作量，帮我调整未来一周的计划")}>规划本周</button><button onClick={() => setInput("找出当前风险和最容易拖延的任务，给我应对建议")}>检查风险</button></div><div className="chat-input"><textarea rows={2} value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); } }} placeholder="例如：我明天下午有 3 小时，优先推进样机测试…"/><button disabled={busy || !input.trim()} onClick={send}><Icon name="send"/></button></div></aside>;
}

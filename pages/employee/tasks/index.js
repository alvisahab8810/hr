// pages/employee/tasks/index.js — Role-based TMS (light theme + full feature set)
import { useEffect, useState, useRef, useCallback } from "react";
import { useTaskSync } from "@/utils/hooks/useTaskSync";
import Link from "next/link";
import Head from "next/head";
import { useRouter } from "next/router";
import Dashnav from "@/components/Dashnav";
import Leftbar from "@/components/employee/Leftbar";
import LeftbarMobile from "@/components/employee/LeftbarMobile";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const getToken = () => typeof window !== "undefined" ? localStorage.getItem("employeeToken") || "" : "";
const authH    = () => ({ Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" });

function getTMSRole(emp) {
  const dept  = (emp?.professional?.department  || "").toLowerCase();
  const desig = (emp?.professional?.designation || "").toLowerCase();

  // Department takes priority — prevents designation keywords leaking into wrong role
  if (dept.includes("production"))                                          return "design";   // S2 queue
  if (dept.includes("content team") || dept.includes("content"))           return "content";  // S1 queue
  if (dept.includes("editing") || dept.includes("design team") || dept.includes("creative")) return "editor"; // S3
  if (dept.includes("digital marketing") || dept.includes("marketing"))    return "general";
  if (dept.includes("tech") || dept.includes("develop") || dept.includes("engineer")) return "developer";

  // Fall back to designation only if department gave no match
  if (desig.includes("content") || desig.includes("writer") || desig.includes("copywriter") || desig.includes("script")) return "content";
  if (desig.includes("design") || desig.includes("graphic") || desig.includes("ui") || desig.includes("ux")) return "design";
  if (desig.includes("edit") || desig.includes("video") || desig.includes("motion")) return "editor";
  if (desig.includes("develop") || desig.includes("engineer") || desig.includes("frontend") || desig.includes("backend")) return "developer";
  return "general";
}

function fmtD(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function fmtDT(d) {
  if (!d) return "—";
  const dt = new Date(d);
  const date = dt.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  const time = dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  return `${date}, ${time}`;
}

function isOverdue(d) {
  if (!d) return false;
  const n = new Date(); n.setHours(0, 0, 0, 0);
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  return x < n;
}

// Returns the most relevant deadline for a task — stage deadline first for production tasks
function getStageDeadline(task) {
  if (task?.taskType === "production" && task.stages?.length) {
    const deadlines = task.stages
      .filter(s => s.deadline && !s.done)
      .map(s => new Date(s.deadline));
    if (deadlines.length) return deadlines.reduce((a, b) => a < b ? a : b);
    // All stages done — use the earliest deadline anyway
    const all = task.stages.map(s => s.deadline).filter(Boolean).map(x => new Date(x));
    if (all.length) return all.reduce((a, b) => a < b ? a : b);
  }
  return task?.dueDate ? new Date(task.dueDate) : null;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const ROLE_CONFIG = {
  content:   { label: "Content Writer", icon: "bi-pencil-square", ic: "#7C3AED", bg: "#EDE9FE", bannerBg: "#F5F3FF", bannerBorder: "#DDD6FE", queueLabel: "Script Queue",  queueStage: "S1", queueIcon: "bi-file-text" },
  design:    { label: "Designer",       icon: "bi-palette",       ic: "#1D4ED8", bg: "#DBEAFE", bannerBg: "#EFF6FF", bannerBorder: "#BFDBFE", queueLabel: "Design Queue",  queueStage: "S2", queueIcon: "bi-vector-pen" },
  editor:    { label: "Video Editor",   icon: "bi-scissors",      ic: "#B45309", bg: "#FEF3C7", bannerBg: "#FFFBEB", bannerBorder: "#FDE68A", queueLabel: "Edit Queue",    queueStage: "S3", queueIcon: "bi-camera-video" },
  developer: { label: "Developer",      icon: "bi-code-slash",    ic: "#065F46", bg: "#D1FAE5", bannerBg: "#ECFDF5", bannerBorder: "#6EE7B7", queueLabel: "Dev Tasks",     queueStage: "",   queueIcon: "bi-kanban" },
  general:   { label: "Team Member",    icon: "bi-person-badge",  ic: "#374151", bg: "#F3F4F6", bannerBg: "#F9FAFB", bannerBorder: "#E5E7EB", queueLabel: "My Queue",      queueStage: "",   queueIcon: "bi-list-task" },
};

const STATUS_MAP   = { todo: { label: "To Do", cls: "tms-badge-todo" }, in_progress: { label: "In Progress", cls: "tms-badge-inprogress" }, review: { label: "In Review", cls: "tms-badge-review" }, completed: { label: "Completed", cls: "tms-badge-completed" }, blocked: { label: "Rejected", cls: "tms-badge-blocked" } };
const STAGE_COLOR  = { S1: "#7C3AED", S2: "#1D4ED8", S3: "#B45309", S4: "#065F46" };
const STAGE_LABEL  = { S1: "Script/Concept", S2: "Shoot/Design", S3: "Edit/Develop", S4: "Posted/Live" };
const CTYPE_COLOR  = { reel: "#7C3AED", post: "#1D4ED8", carousel: "#B45309", story: "#065F46", blog: "#DB2777" };
const PILLAR_OPTS  = ["Education", "Entertainment", "Inspiration", "Promotion", "Behind the Scenes", "Testimonial", "Product Feature"];

const TABS_BY_ROLE = {
  content:   ["dashboard", "tasks", "editor", "weekly", "mycal", "library", "submissions", "performance"],
  design:    ["dashboard", "tasks", "queue",  "brandcal", "performance"],
  editor:    ["dashboard", "tasks", "queue",  "brandcal", "performance"],
  developer: ["dashboard", "tasks", "board",  "performance"],
  general:   ["dashboard", "tasks", "performance"],
};

const TAB_META = {
  dashboard:   { label: "Dashboard",      icon: "bi-grid-1x2" },
  tasks:       { label: "My Tasks",       icon: "bi-list-task" },
  editor:      { label: "Content Editor", icon: "bi-pencil-square" },
  brandcal:    { label: "Brand Calendar", icon: "bi-calendar3" },
  weekly:      { label: "Weekly Tracker", icon: "bi-calendar-week" },
  mycal:       { label: "My Calendar",    icon: "bi-calendar2-week" },
  library:     { label: "Script Library", icon: "bi-collection" },
  submissions: { label: "Submissions",    icon: "bi-send-check" },
  performance: { label: "My Performance", icon: "bi-graph-up" },
  queue:       { label: "Design/Edit Queue", icon: "bi-vector-pen" },
  board:       { label: "Sprint Board",   icon: "bi-kanban" },
  calendar:    { label: "Brand Calendar", icon: "bi-calendar3" },
};

// ─── Stage Dots ───────────────────────────────────────────────────────────────
function StageDots({ stage, size = 22 }) {
  const idx = ["S1", "S2", "S3", "S4"].indexOf(stage);
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      {[0, 1, 2, 3].map(i => (
        <div key={i} title={`Stage ${i + 1} · ${STAGE_LABEL[`S${i + 1}`]}`} style={{
          width: size, height: size, borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: Math.max(8, size * 0.4), fontWeight: 800, flexShrink: 0,
          background: i < idx ? "#D1FAE5"
            : i === idx ? STAGE_COLOR[`S${i + 1}`]
            : i === idx + 1 ? STAGE_COLOR[`S${i + 1}`] + "22"
            : "#F3F4F6",
          color: i < idx ? "#065F46"
            : i === idx ? "#fff"
            : i === idx + 1 ? STAGE_COLOR[`S${i + 1}`]
            : "#9CA3AF",
          border: i === idx ? "2px solid rgba(0,0,0,0.15)" : "none",
        }}>{i + 1}</div>
      ))}
    </div>
  );
}

// ─── TaskRow (used in Dashboard) ─────────────────────────────────────────────
function TaskRow({ task }) {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const due = task.dueDate ? (() => {
    const d = new Date(task.dueDate); d.setHours(0, 0, 0, 0);
    const diff = Math.round((d - now) / 86400000);
    if (diff < 0)  return { label: `${Math.abs(diff)}d overdue`, cls: "tms-badge-overdue" };
    if (diff === 0) return { label: "Due today", cls: "tms-badge-today" };
    if (diff === 1) return { label: "Due tomorrow", cls: "" };
    return { label: fmtD(task.dueDate), cls: "" };
  })() : null;

  const status = STATUS_MAP[task.status] || { label: task.status, cls: "tms-badge-todo" };

  return (
    <div className="tms-task-item">
      <div className="tms-task-info">
        <div className="tms-task-title">{task.nomenclature || task.title}</div>
        <div className="tms-task-meta">
          <span className={`tms-badge ${status.cls}`}>{status.label}</span>
          {task.stage && (
            <span className="tms-badge" style={{ background: STAGE_COLOR[task.stage] + "22", color: STAGE_COLOR[task.stage] }}>
              {task.stage} · {STAGE_LABEL[task.stage]}
            </span>
          )}
          {task.contentType && (
            <span className="tms-badge" style={{ background: (CTYPE_COLOR[task.contentType] || "#6366F1") + "22", color: CTYPE_COLOR[task.contentType] || "#6366F1" }}>{task.contentType}</span>
          )}
          {task.brandId && (
            <span className="tms-brand-chip">
              <span className="tms-brand-dot" style={{ background: task.brandId.color || "#6366F1" }} />
              {task.brandId.name}
            </span>
          )}
        </div>
      </div>
      {due && (
        <div className="tms-task-right">
          <span className={`tms-due ${due.cls}`}><i className="bi bi-clock" /> {due.label}</span>
        </div>
      )}
    </div>
  );
}

// ─── DASHBOARD TAB ────────────────────────────────────────────────────────────
function DashboardTab({ employee, tasks, role, switchTab }) {
  const config  = ROLE_CONFIG[role];
  const now     = new Date(); now.setHours(0, 0, 0, 0);
  const todayT  = tasks.filter(t => { if (!t.dueDate) return false; const d = new Date(t.dueDate); d.setHours(0,0,0,0); return d.getTime() === now.getTime() && t.status !== "completed"; });
  const overdue = tasks.filter(t => { if (!t.dueDate) return false; const d = new Date(t.dueDate); d.setHours(0,0,0,0); return d < now && t.status !== "completed"; });
  const active  = tasks.filter(t => t.status === "in_progress");
  const review  = tasks.filter(t => t.status === "review");
  const done    = tasks.filter(t => t.status === "completed");
  const queue   = config.queueStage
    ? tasks.filter(t => t.stage === config.queueStage && t.status !== "completed")
    : tasks.filter(t => t.status !== "completed");

  const stats = [
    { icon: "bi-list-task",     bg: "#EEF2FF", ic: "#4F46E5", val: tasks.length,  label: "Total Assigned" },
    { icon: "bi-clock-history", bg: "#FEF3C7", ic: "#D97706", val: todayT.length, label: "Due Today" },
    { icon: "bi-arrow-repeat",  bg: "#DBEAFE", ic: "#1D4ED8", val: active.length, label: "In Progress" },
    { icon: "bi-check-circle",  bg: "#D1FAE5", ic: "#065F46", val: done.length,   label: "Completed" },
  ];

  return (
    <>
      <div className="tms-role-banner" style={{ background: config.bannerBg, border: `1.5px solid ${config.bannerBorder}` }}>
        <div className="tms-role-icon" style={{ background: config.bg }}>
          <i className={`bi ${config.icon}`} style={{ color: config.ic }} />
        </div>
        <div>
          <p className="tms-role-label">{config.label}</p>
          <p className="tms-role-sub">
            {config.queueStage ? `Queue: ${config.queueLabel} (Stage ${config.queueStage})` : `Queue: ${config.queueLabel}`}
            {overdue.length > 0 && <span style={{ marginLeft: 10, color: "#DC2626", fontWeight: 700 }}>· {overdue.length} overdue!</span>}
          </p>
        </div>
      </div>

      <div className="tms-stats">
        {stats.map((s, i) => (
          <div key={i} className="tms-stat">
            <div className="tms-stat-icon" style={{ background: s.bg }}>
              <i className={`bi ${s.icon}`} style={{ color: s.ic }} />
            </div>
            <div>
              <div className="tms-stat-val">{s.val}</div>
              <div className="tms-stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="tms-grid-2">
        <div>
          <div className="tms-card">
            <div className="tms-card-header">
              <h6><i className={`bi ${config.queueIcon}`} style={{ color: config.ic }} /> {config.queueLabel}</h6>
              <span className="tms-count-pill">{queue.length}</span>
            </div>
            <div className="tms-card-body no-pad">
              {queue.length === 0 ? (
                <div className="tms-empty"><i className="bi bi-check2-all" /><p>All clear!</p></div>
              ) : queue.slice(0, 6).map(t => <TaskRow key={t._id} task={t} />)}
            </div>
          </div>
          {todayT.length > 0 && (
            <div className="tms-card">
              <div className="tms-card-header">
                <h6><i className="bi bi-alarm" style={{ color: "#D97706" }} /> Due Today</h6>
                <span className="tms-count-pill" style={{ background: "#FEF3C7", color: "#B45309" }}>{todayT.length}</span>
              </div>
              <div className="tms-card-body no-pad">{todayT.map(t => <TaskRow key={t._id} task={t} />)}</div>
            </div>
          )}
          {overdue.length > 0 && (
            <div className="tms-card">
              <div className="tms-card-header">
                <h6><i className="bi bi-exclamation-triangle-fill" style={{ color: "#DC2626" }} /> Overdue</h6>
                <span className="tms-count-pill" style={{ background: "#FEE2E2", color: "#DC2626" }}>{overdue.length}</span>
              </div>
              <div className="tms-card-body no-pad">{overdue.map(t => <TaskRow key={t._id} task={t} />)}</div>
            </div>
          )}
        </div>
        <div>
          <div className="tms-card">
            <div className="tms-card-header">
              <h6><i className="bi bi-arrow-repeat" style={{ color: "#1D4ED8" }} /> In Progress</h6>
              <span className="tms-count-pill">{active.length}</span>
            </div>
            <div className="tms-card-body no-pad">
              {active.length === 0
                ? <div className="tms-empty" style={{ padding: "24px 16px" }}><i className="bi bi-play-circle" style={{ fontSize: 28 }} /><p>No tasks in progress</p></div>
                : active.slice(0, 5).map(t => <TaskRow key={t._id} task={t} />)}
            </div>
          </div>
          <div className="tms-card">
            <div className="tms-card-header">
              <h6><i className="bi bi-eye" style={{ color: "#B45309" }} /> In Review</h6>
              <span className="tms-count-pill" style={{ background: "#FEF3C7", color: "#B45309" }}>{review.length}</span>
            </div>
            <div className="tms-card-body no-pad">
              {review.length === 0
                ? <div className="tms-empty" style={{ padding: "24px 16px" }}><i className="bi bi-eye-slash" style={{ fontSize: 28 }} /><p>Nothing under review</p></div>
                : review.slice(0, 5).map(t => <TaskRow key={t._id} task={t} />)}
            </div>
          </div>
          {role === "content" && (
            <div className="tms-card">
              <div className="tms-card-header">
                <h6><i className="bi bi-lightbulb" style={{ color: "#D97706" }} /> Writing Tips</h6>
              </div>
              <div className="tms-card-body">
                {["Hook in the first 3 seconds.", "One idea per reel.", "End with a clear CTA.", "Captions under 150 chars."].map((tip, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, fontSize: 13 }}>
                    <span style={{ color: "#7C3AED", fontWeight: 700 }}>0{i + 1}</span>
                    <span style={{ color: "#6B7280" }}>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── MY TASKS TAB ─────────────────────────────────────────────────────────────
function MyTasksTab({ tasks, openInEditor }) {
  const [brandF,  setBrandF]  = useState("");
  const [typeF,   setTypeF]   = useState("");
  const [statusF, setStatusF] = useState("");

  const brands = [...new Map(tasks.filter(t => t.brandId).map(t => [t.brandId._id, t.brandId])).values()];
  const types  = [...new Set(tasks.map(t => t.contentType).filter(Boolean))];

  const filtered = tasks.filter(t => {
    if (brandF  && t.brandId?._id !== brandF)  return false;
    if (typeF   && t.contentType  !== typeF)   return false;
    if (statusF && t.status       !== statusF) return false;
    return true;
  });

  const selStyle = { padding: "8px 12px", border: "1.5px solid #E5E7EB", borderRadius: 8, fontSize: 13, outline: "none", cursor: "pointer", background: "#fff" };

  return (
    <>
      {/* Filter bar */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
        <select value={brandF} onChange={e => setBrandF(e.target.value)} style={selStyle}>
          <option value="">All Brands</option>
          {brands.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
        </select>
        <select value={typeF} onChange={e => setTypeF(e.target.value)} style={selStyle}>
          <option value="">All Types</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={statusF} onChange={e => setStatusF(e.target.value)} style={selStyle}>
          <option value="">All Status</option>
          {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "#9CA3AF" }}>{filtered.length} task{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Table */}
      <div className="tms-card" style={{ padding: 0, overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <div className="tms-empty"><i className="bi bi-inbox" style={{ fontSize: 36 }} /><p>No tasks found</p></div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #F0F0F0", background: "#FAFAFA" }}>
                  {["#", "Task", "Brand", "Type", "Stage", "Deadline", "Status", "Action"].map(h => (
                    <th key={h} style={{ padding: "11px 14px", textAlign: "left", fontSize: 10.5, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".5px", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, idx) => (
                  <tr key={t._id} style={{ borderBottom: "1px solid #F5F5F5" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#FAFAFA"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "13px 14px", color: "#9CA3AF", fontSize: 11, fontFamily: "monospace" }}>{String(idx + 1).padStart(3, "0")}</td>
                    <td style={{ padding: "13px 14px", maxWidth: 240 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "#111", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.nomenclature || t.title || "Untitled"}</div>
                    </td>
                    <td style={{ padding: "13px 14px" }}>
                      {t.brandId ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 9px", borderRadius: 20, background: t.brandId.color + "20", fontSize: 11, fontWeight: 700, color: t.brandId.color, whiteSpace: "nowrap" }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: t.brandId.color, display: "inline-block" }} />
                          {t.brandId.name}
                        </span>
                      ) : <span style={{ color: "#D1D5DB" }}>—</span>}
                    </td>
                    <td style={{ padding: "13px 14px" }}>
                      {t.contentType ? <span style={{ padding: "2px 8px", borderRadius: 4, background: (CTYPE_COLOR[t.contentType] || "#6366F1") + "22", color: CTYPE_COLOR[t.contentType] || "#6366F1", fontSize: 11, fontWeight: 700, textTransform: "capitalize" }}>{t.contentType}</span>
                        : <span style={{ color: "#D1D5DB" }}>—</span>}
                    </td>
                    <td style={{ padding: "13px 14px" }}><StageDots stage={t.stage} size={22} /></td>
                    {(() => {
                      const dl  = getStageDeadline(t);
                      const od  = dl ? isOverdue(dl) && t.status !== "completed" : false;
                      return (
                        <td style={{ padding: "13px 14px", fontSize: 11, color: od ? "#DC2626" : "#374151", fontWeight: od ? 700 : 400, whiteSpace: "nowrap" }}>
                          {od && <i className="bi bi-exclamation-circle-fill me-1" />}
                          {od && <span style={{ background: "#EF4444", color: "#fff", fontSize: 9, fontWeight: 800, borderRadius: 20, padding: "1px 6px", marginRight: 5 }}>LATE</span>}
                          {dl ? fmtDT(dl) : "—"}
                        </td>
                      );
                    })()}
                    <td style={{ padding: "13px 14px" }}>
                      <span className={`tms-badge ${STATUS_MAP[t.status]?.cls || "tms-badge-todo"}`}>{STATUS_MAP[t.status]?.label || t.status}</span>
                    </td>
                    <td style={{ padding: "13px 14px" }}>
                      <button onClick={() => openInEditor(t)} style={{
                        padding: "5px 14px", borderRadius: 7, border: "1.5px solid #7C3AED",
                        background: "#F5F3FF", color: "#7C3AED", fontSize: 12, fontWeight: 700,
                        cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5, whiteSpace: "nowrap",
                        transition: "all .15s",
                      }}
                        onMouseEnter={e => { e.currentTarget.style.background = "#7C3AED"; e.currentTarget.style.color = "#fff"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "#F5F3FF"; e.currentTarget.style.color = "#7C3AED"; }}>
                        View <i className="bi bi-arrow-right" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

// ─── CONTENT EDITOR TAB ───────────────────────────────────────────────────────
function ContentEditorTab({ tasks, initialTask, onBack }) {
  const scriptTasks = tasks.filter(t => t.taskType === "production" || t.stage);
  const [task,     setTask]     = useState(initialTask || scriptTasks[0] || null);
  const [pillar,   setPillar]   = useState("");
  const [refLink,  setRefLink]  = useState("");
  const [script,   setScript]   = useState("");
  const [caption,  setCaption]  = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags,     setTags]     = useState([]);
  const [saving,     setSaving]     = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastSaved,  setLastSaved]  = useState(null);
  const debounceRef = useRef(null);
  const taskIdx = scriptTasks.findIndex(t => t._id === task?._id);

  useEffect(() => {
    if (initialTask) loadTask(initialTask);
    else if (scriptTasks[0] && !task) loadTask(scriptTasks[0]);
  }, [initialTask?._id]);

  function loadTask(t) {
    setTask(t);
    setPillar(t.pillar || "");
    setRefLink(t.referenceLink || "");
    setScript(t.description || "");
    setCaption(t.caption || "");
    setTags(t.tags || []);
    setLastSaved(null);
  }

  function navTask(dir) {
    const ni = taskIdx + dir;
    if (ni >= 0 && ni < scriptTasks.length) loadTask(scriptTasks[ni]);
  }

  async function saveTask(silent = false) {
    if (!task) return;
    if (task.status === "review" || task.status === "completed") return;
    setSaving(true);
    try {
      const r = await fetch(`/api/employee/tasks/${task._id}`, {
        method: "PATCH", headers: authH(),
        body: JSON.stringify({ description: script, caption, referenceLink: refLink, tags }),
      });
      const d = await r.json();
      if (d.success) {
        if (!silent) toast.success("Draft saved!");
        setLastSaved(new Date());
        setTask(prev => ({ ...prev, description: script, caption, referenceLink: refLink, tags }));
      } else if (!silent) toast.error(d.message || "Save failed");
    } catch { if (!silent) toast.error("Save failed"); }
    setSaving(false);
  }

  async function submitForReview() {
    if (!task) return;
    const isProduction = task.taskType === "production" && (task.stages?.length > 0);
    const s0 = task.stages?.[0];
    // Already submitted check
    if (isProduction && s0?.done && !s0?.rejected) { toast.info("Already submitted — awaiting admin review."); return; }
    if (!isProduction && task.status === "review") { toast.info("Already submitted — awaiting admin review."); return; }
    if (task.status === "completed") return;
    setSubmitting(true);
    try {
      // Step 1: Save content fields so admin can see script/caption/tags
      await fetch(`/api/employee/tasks/${task._id}`, {
        method: "PATCH", headers: authH(),
        body: JSON.stringify({ description: script, caption, referenceLink: refLink, pillar, tags, submittedAt: new Date() }),
      });

      if (isProduction) {
        // Step 2: Mark S1 stage as done via stage-submit so it appears in the approvals queue
        const stageKey = task.stage || "S1";
        const r = await fetch("/api/employee/stage-submit", {
          method: "POST", headers: authH(),
          body: JSON.stringify({ taskId: task._id, proofUrl: "", notes: "", stageKey }),
        });
        const d = await r.json();
        if (d.success) {
          toast.success("Script submitted for review!");
          setTask(d.task);
          setLastSaved(new Date());
        } else toast.error(d.message || "Submit failed");
      } else {
        // Non-production: just mark task status as review
        const r = await fetch(`/api/employee/tasks/${task._id}`, {
          method: "PATCH", headers: authH(),
          body: JSON.stringify({ status: "review" }),
        });
        const d = await r.json();
        if (d.success) {
          toast.success("Submitted for review!");
          setTask(prev => ({ ...prev, status: "review", description: script, caption, referenceLink: refLink, pillar, tags }));
          setLastSaved(new Date());
        } else toast.error(d.message || "Submit failed");
      }
    } catch { toast.error("Submit failed"); }
    setSubmitting(false);
  }

  function onScriptChange(v) {
    setScript(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => saveTask(true), 3000);
  }

  function addTag(e) {
    if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
      e.preventDefault();
      const v = tagInput.trim().replace(/^#/, "");
      if (v && !tags.includes(v)) setTags(p => [...p, v]);
      setTagInput("");
    }
  }

  const wordCount = script.trim() ? script.trim().split(/\s+/).length : 0;
  const narration = wordCount > 0 ? `~${Math.round(wordCount / 130)} min` : null;
  const nextStages = ["S1","S2","S3","S4"];
  const curStageIdx = task?.stage ? nextStages.indexOf(task.stage) : -1;

  const brandVoice = [
    "Hook within the first 3 seconds",
    "Use a conversational, relatable tone",
    "End with a clear, specific CTA",
    "Keep captions under 150 characters",
    "Match brand palette in visuals",
  ];

  const inpStyle = { width: "100%", padding: "10px 12px", border: "1.5px solid #E5E7EB", borderRadius: 8, fontSize: 13.5, fontFamily: "inherit", outline: "none", resize: "vertical" };
  const lblStyle = { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", color: "#6B7280", marginBottom: 6, display: "block" };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 290px", gap: 20, alignItems: "start" }}>
      {/* Main column */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Task header card */}
        {task ? (
          <div className="tms-card">
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                {task.brandId && (
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: task.brandId.color + "20", border: `2px solid ${task.brandId.color}50`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ width: 14, height: 14, borderRadius: "50%", background: task.brandId.color, display: "inline-block" }} />
                  </div>
                )}
                <div>
                  <div style={{ fontFamily: "monospace", fontSize: 11, color: "#7C3AED", marginBottom: 4, fontWeight: 700 }}>#{task.nomenclature || task._id?.slice(-6)}</div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: "#111", lineHeight: 1.2 }}>{task.nomenclature || task.title}</div>
                  <div style={{ display: "flex", gap: 7, marginTop: 8, flexWrap: "wrap" }}>
                    {task.brandId && <span style={{ padding: "2px 9px", borderRadius: 20, background: task.brandId.color + "20", color: task.brandId.color, fontSize: 11, fontWeight: 700 }}>{task.brandId.name}</span>}
                    {task.contentType && <span style={{ padding: "2px 9px", borderRadius: 20, background: (CTYPE_COLOR[task.contentType] || "#6366F1") + "22", color: CTYPE_COLOR[task.contentType] || "#6366F1", fontSize: 11, fontWeight: 700, textTransform: "capitalize" }}>{task.contentType}</span>}
                    {task.dueDate && <span style={{ padding: "2px 9px", borderRadius: 20, background: "#F3F4F6", color: isOverdue(task.dueDate) ? "#DC2626" : "#6B7280", fontSize: 11, fontFamily: "monospace" }}>{fmtD(task.dueDate)}</span>}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(() => {
                  const s0 = task.stages?.[0];
                  const isProd = task.taskType === "production";
                  const s1Pending = isProd && s0?.done && !s0?.approved && !s0?.rejected;
                  const s1Approved = isProd && s0?.approved;
                  const isUnderReview = s1Pending || task.status === "review";
                  const isApproved = s1Approved || task.status === "completed";
                  const isRejected = task.status === "blocked" || (s0?.rejected && !s0?.done);
                  const lockDraft = saving || isUnderReview || isApproved;
                  const lockSubmit = submitting || isUnderReview || isApproved;
                  return (<>
                <button onClick={() => saveTask(false)} disabled={lockDraft} style={{ padding: "8px 18px", borderRadius: 8, background: "#F3F4F6", color: "#374151", border: "1.5px solid #E5E7EB", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, opacity: lockDraft ? 0.5 : 1 }}>
                  <i className="bi bi-floppy" />{saving ? "Saving…" : "Save Draft"}
                </button>
                <button
                  onClick={submitForReview}
                  disabled={lockSubmit}
                  style={{
                    padding: "8px 18px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 700,
                    cursor: lockSubmit ? "default" : "pointer",
                    display: "flex", alignItems: "center", gap: 6, opacity: submitting ? 0.7 : 1,
                    background: isUnderReview ? "#FFFBEB" : isApproved ? "#F0FDF4" : "#7C3AED",
                    color:      isUnderReview ? "#B45309" : isApproved ? "#16A34A" : "#fff",
                  }}>
                  <i className={`bi ${isUnderReview ? "bi-hourglass-split" : isApproved ? "bi-check-circle-fill" : isRejected ? "bi-send-fill" : "bi-send"}`} />
                  {submitting ? "Submitting…" : isUnderReview ? "Under Review" : isApproved ? "Approved ✓" : isRejected ? "Resubmit for Review" : "Submit for Review"}
                </button>
                  </>);
                })()}
              </div>
            </div>

            {/* Stage progress row */}
            {task.stage && (
              <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid #F0F0F0", display: "flex", alignItems: "center", gap: 12 }}>
                <StageDots stage={task.stage} size={26} />
                <span style={{ fontSize: 12.5, color: "#6B7280" }}>
                  Currently at <strong style={{ color: STAGE_COLOR[task.stage] }}>Stage {task.stage.replace("S", "")} — {STAGE_LABEL[task.stage]}</strong>
                </span>
              </div>
            )}

            {/* Status banners */}
            {(task.status === "review" || (task.stages?.[0]?.done && !task.stages?.[0]?.approved && !task.stages?.[0]?.rejected)) && (
              <>
                <div style={{ marginTop: 14, padding: "12px 16px", borderRadius: 8, background: "#FFFBEB", border: "1.5px solid #FCD34D", display: "flex", alignItems: "center", gap: 10 }}>
                  <i className="bi bi-hourglass-split" style={{ color: "#D97706", fontSize: 18, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: "#92400E" }}>Under Review — Awaiting admin approval</div>
                    <div style={{ fontSize: 12, color: "#B45309", marginTop: 2 }}>Your content has been submitted. You'll be notified once the admin reviews it.</div>
                  </div>
                </div>
                {(script || caption || tags?.length > 0 || task.pillar || task.referenceLink) && (
                  <div style={{ marginTop: 12, padding: "14px 16px", borderRadius: 8, background: "#F8FAFC", border: "1.5px solid #E2E8F0" }}>
                    <div style={{ fontWeight: 700, fontSize: 11, color: "#6B7280", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                      <i className="bi bi-file-earmark-check-fill" style={{ color: "#7C3AED", fontSize: 13 }} />Submitted Content
                    </div>
                    {script && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>Script</div>
                        <div style={{ fontSize: 12.5, color: "#374151", background: "#fff", border: "1px solid #E5E7EB", borderRadius: 6, padding: "8px 10px", lineHeight: 1.7, whiteSpace: "pre-wrap", maxHeight: 140, overflowY: "auto" }}>{script}</div>
                      </div>
                    )}
                    {caption && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>Caption</div>
                        <div style={{ fontSize: 12.5, color: "#374151", background: "#fff", border: "1px solid #E5E7EB", borderRadius: 6, padding: "8px 10px", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{caption}</div>
                      </div>
                    )}
                    {tags?.length > 0 && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 6 }}>Hashtags</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                          {tags.map(tg => (
                            <span key={tg} style={{ fontSize: 12, padding: "2px 10px", borderRadius: 20, background: "#EDE9FE", color: "#7C3AED", fontWeight: 700 }}>#{tg}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {pillar && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>Content Pillar</div>
                        <span style={{ fontSize: 12, padding: "2px 10px", borderRadius: 20, background: "#F3E8FF", color: "#7C3AED", fontWeight: 700 }}>{pillar}</span>
                      </div>
                    )}
                    {refLink && (
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>Reference Link</div>
                        <a href={refLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#4F46E5", wordBreak: "break-all", display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <i className="bi bi-link-45deg" />{refLink.length > 55 ? refLink.slice(0, 55) + "…" : refLink}
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
            {task.stages?.[0]?.rejected === true && task.stages?.[0]?.done !== true && task.status !== "blocked" && (
              <div style={{ marginTop: 14, padding: "12px 16px", borderRadius: 8, background: "#FEF2F2", border: "1.5px solid #FCA5A5", display: "flex", alignItems: "flex-start", gap: 10 }}>
                <i className="bi bi-x-octagon-fill" style={{ color: "#DC2626", fontSize: 18, flexShrink: 0, marginTop: 1 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#991B1B" }}>Stage Rejected — Please revise and resubmit</div>
                  {task.stages[0].rejectReason && (
                    <div style={{ fontSize: 12.5, color: "#7F1D1D", marginTop: 6, background: "#FEE2E2", padding: "8px 12px", borderRadius: 6, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                      <strong>Admin feedback:</strong> {task.stages[0].rejectReason}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: "#B45309", marginTop: 6 }}>Update your script/content above and click Resubmit when ready.</div>
                </div>
              </div>
            )}
            {task.status === "todo" && task.reviewNote && (
              <div style={{ marginTop: 14, padding: "12px 16px", borderRadius: 8, background: "#FFFBEB", border: "1.5px solid #FDE68A", display: "flex", alignItems: "flex-start", gap: 10 }}>
                <i className="bi bi-chat-left-text-fill" style={{ color: "#B45309", fontSize: 18, flexShrink: 0, marginTop: 1 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#92400E" }}>Client Requested Changes</div>
                  <div style={{ fontSize: 12.5, color: "#78350F", marginTop: 6, background: "#FEF3C7", padding: "8px 12px", borderRadius: 6, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                    {task.reviewNote}
                  </div>
                  <div style={{ fontSize: 11, color: "#B45309", marginTop: 6 }}>Please revise and resubmit your work once changes are made.</div>
                </div>
              </div>
            )}
            {task.status === "blocked" && (
              <div style={{ marginTop: 14, padding: "12px 16px", borderRadius: 8, background: "#FEF2F2", border: "1.5px solid #FCA5A5", display: "flex", alignItems: "flex-start", gap: 10 }}>
                <i className="bi bi-x-octagon-fill" style={{ color: "#DC2626", fontSize: 18, flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#991B1B" }}>Rejected — Please revise and resubmit</div>
                  {task.reviewNote && <div style={{ fontSize: 12.5, color: "#7F1D1D", marginTop: 6, background: "#FEE2E2", padding: "8px 12px", borderRadius: 6, lineHeight: 1.6 }}><strong>Admin feedback:</strong> {task.reviewNote}</div>}
                </div>
              </div>
            )}
            {task.status === "completed" && (
              <div style={{ marginTop: 14, padding: "12px 16px", borderRadius: 8, background: "#F0FDF4", border: "1.5px solid #86EFAC", display: "flex", alignItems: "center", gap: 10 }}>
                <i className="bi bi-check-circle-fill" style={{ color: "#16A34A", fontSize: 18, flexShrink: 0 }} />
                <div style={{ fontWeight: 700, fontSize: 13, color: "#14532D" }}>Approved — Great work!</div>
              </div>
            )}
          </div>
        ) : (
          <div className="tms-card">
            <div className="tms-empty" style={{ padding: "48px 20px" }}>
              <i className="bi bi-cursor-text" style={{ fontSize: 42 }} />
              <p style={{ marginTop: 10 }}>Select a task from My Tasks to start writing</p>
            </div>
          </div>
        )}

        {task && (<>
          {(() => {
            const s0 = task.stages?.[0];
            const isLocked = task.status === "review" || task.status === "completed"
              || (task.taskType === "production" && s0?.done && !s0?.rejected);
            const lockedStyle = { opacity: isLocked ? 0.75 : 1, pointerEvents: isLocked ? "none" : undefined };
            return (<>
          {/* Content Pillar */}
          <div className="tms-card" style={lockedStyle}>
            <label style={lblStyle}>Content Pillar</label>
            <select value={pillar} onChange={e => setPillar(e.target.value)} disabled={isLocked} style={{ ...inpStyle, resize: "none", cursor: isLocked ? "default" : "pointer" }}>
              <option value="">Select a pillar…</option>
              {PILLAR_OPTS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Reference Link */}
          <div className="tms-card" style={lockedStyle}>
            <label style={lblStyle}>Reference Reel / Link</label>
            <input type="url" value={refLink} onChange={e => setRefLink(e.target.value)} readOnly={isLocked} placeholder="https://instagram.com/reel/…" style={{ ...inpStyle, resize: "none" }} />
            {refLink && (
              <div style={{ marginTop: 10, padding: "11px 14px", background: "#F5F3FF", borderRadius: 8, border: "1px solid #DDD6FE", display: "flex", alignItems: "center", gap: 10 }}>
                <i className="bi bi-play-circle-fill" style={{ color: "#7C3AED", fontSize: 20, flexShrink: 0 }} />
                <a href={refLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#7C3AED", textDecoration: "none", wordBreak: "break-all" }}>
                  {refLink.length > 60 ? refLink.slice(0, 60) + "…" : refLink}
                </a>
              </div>
            )}
          </div>

          {/* Script / Content */}
          <div className="tms-card" style={lockedStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label style={lblStyle}>Script / Content</label>
              <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 6 }}>
                {script.length} chars · {wordCount} words{narration ? ` · ${narration} narration` : ""}
              </div>
            </div>
            <textarea value={script} onChange={isLocked ? undefined : e => onScriptChange(e.target.value)} readOnly={isLocked} rows={12}
              placeholder="Write the script or content copy here…"
              style={{ ...inpStyle, fontFamily: "monospace", fontSize: 13, lineHeight: 1.8 }} />
          </div>

          {/* Caption */}
          <div className="tms-card" style={lockedStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label style={lblStyle}>Caption</label>
              <span style={{ fontSize: 11, color: caption.length > 150 ? "#DC2626" : "#9CA3AF", marginBottom: 6 }}>{caption.length}/150</span>
            </div>
            <textarea value={caption} onChange={isLocked ? undefined : e => setCaption(e.target.value)} readOnly={isLocked} rows={3}
              placeholder="Instagram / social media caption…" style={inpStyle} />
          </div>

          {/* Hashtags */}
          <div className="tms-card" style={lockedStyle}>
            <label style={lblStyle}>Hashtags</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, padding: "9px 11px", border: "1.5px solid #E5E7EB", borderRadius: 8, minHeight: 46, background: isLocked ? "#F9FAFB" : "#FAFAFA" }}>
              {tags.map(tag => (
                <span key={tag} onClick={isLocked ? undefined : () => setTags(p => p.filter(x => x !== tag))} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 10px", borderRadius: 20, background: "#EDE9FE", color: "#7C3AED", fontSize: 12, fontWeight: 700, cursor: isLocked ? "default" : "pointer" }}>
                  #{tag}{!isLocked && <span style={{ fontSize: 14, lineHeight: 1 }}>×</span>}
                </span>
              ))}
              {!isLocked && (
                <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={addTag}
                  placeholder={tags.length === 0 ? "Type hashtag + Enter…" : ""}
                  style={{ border: "none", background: "transparent", outline: "none", fontSize: 13, minWidth: 130, flex: 1 }} />
              )}
              {isLocked && tags.length === 0 && <span style={{ fontSize: 12, color: "#D1D5DB" }}>No hashtags added</span>}
            </div>
          </div>
          </>);
          })()}

          {/* Footer */}
          <div className="tms-card" style={{ padding: "12px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "#9CA3AF" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: lastSaved ? "#22c55e" : "#D1D5DB" }} />
                {lastSaved ? `Auto-saved at ${lastSaved.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` : "Not saved yet"}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => navTask(-1)} disabled={taskIdx <= 0} style={{ padding: "6px 13px", borderRadius: 7, border: "1px solid #E5E7EB", background: "transparent", color: "#6B7280", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, opacity: taskIdx <= 0 ? 0.4 : 1 }}>
                  <i className="bi bi-chevron-left" /> Previous
                </button>
                <button onClick={() => navTask(1)} disabled={taskIdx >= scriptTasks.length - 1} style={{ padding: "6px 13px", borderRadius: 7, border: "1px solid #E5E7EB", background: "transparent", color: "#6B7280", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, opacity: taskIdx >= scriptTasks.length - 1 ? 0.4 : 1 }}>
                  Next <i className="bi bi-chevron-right" />
                </button>
              </div>
            </div>
          </div>
        </>)}
      </div>

      {/* Sidebar */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14, position: "sticky", top: 20 }}>
        {/* Brief snapshot */}
        {task && (
          <div className="tms-card" style={{ padding: "16px 16px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", color: "#6B7280", marginBottom: 12 }}>Brief Snapshot</div>
            {[
              { label: "Brand",  val: task.brandId?.name, color: task.brandId?.color },
              { label: "Type",   val: task.contentType },
              { label: "Stage",  val: task.stage ? `Stage ${task.stage.replace("S", "")} — ${STAGE_LABEL[task.stage]}` : null, color: STAGE_COLOR[task.stage] },
              { label: "Status", val: { todo: "To Do", in_progress: "In Progress", review: "Under Review", completed: "Approved", blocked: "Rejected" }[task.status] || task.status, color: task.status === "review" ? "#B45309" : task.status === "completed" ? "#16A34A" : task.status === "blocked" ? "#DC2626" : undefined },
              { label: "Due",    val: fmtDT(task.stages?.[0]?.deadline || task.dueDate), danger: isOverdue(task.stages?.[0]?.deadline || task.dueDate) },
            ].filter(r => r.val).map(r => (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #F3F4F6", fontSize: 12.5 }}>
                <span style={{ color: "#9CA3AF" }}>{r.label}</span>
                <span style={{ color: r.danger ? "#DC2626" : r.color || "#111", fontWeight: 600 }}>{r.val}</span>
              </div>
            ))}
          </div>
        )}

        {/* Brand Voice */}
        <div className="tms-card" style={{ padding: "16px 16px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", color: "#6B7280", marginBottom: 12 }}>
            <i className="bi bi-megaphone me-2" style={{ color: "#7C3AED" }} />Brand Voice
          </div>
          {!task?.brandId ? (
            <p style={{ fontSize: 12, color: "#9CA3AF", margin: 0 }}>Select a task to see brand guidelines.</p>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid #F3F4F6" }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: task.brandId.color, display: "inline-block" }} />
                <span style={{ fontWeight: 700, fontSize: 14 }}>{task.brandId.name}</span>
              </div>
              {brandVoice.map((tip, i) => (
                <div key={i} style={{ display: "flex", gap: 8, padding: "7px 10px", background: "#F5F3FF", borderRadius: 7, fontSize: 12, lineHeight: 1.5, marginBottom: 7 }}>
                  <i className="bi bi-check-circle-fill" style={{ color: "#7C3AED", flexShrink: 0, marginTop: 1 }} />
                  <span>{tip}</span>
                </div>
              ))}
            </>
          )}
        </div>

        {/* My Drafts */}
        {scriptTasks.length > 1 && (
          <div className="tms-card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "12px 14px", borderBottom: "1px solid #F0F0F0", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", color: "#6B7280" }}>
              My Drafts ({scriptTasks.length})
            </div>
            {scriptTasks.slice(0, 6).map(t => (
              <div key={t._id} onClick={() => loadTask(t)} style={{
                padding: "11px 14px", borderBottom: "1px solid #F5F5F5", cursor: "pointer",
                background: task?._id === t._id ? "#F5F3FF" : "#fff",
                borderLeft: task?._id === t._id ? "3px solid #7C3AED" : "3px solid transparent",
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 3, color: "#111", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.nomenclature || t.title}</div>
                <div style={{ fontSize: 11, color: "#9CA3AF" }}>
                  {t.brandId && <><span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: t.brandId.color, marginRight: 4 }} />{t.brandId.name} · </>}
                  {fmtD(t.dueDate)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── DESIGN / EDIT QUEUE TAB ──────────────────────────────────────────────────
function QueueTab({ tasks, role }) {
  const [filter, setFilter] = useState("all");
  const assignedStage = role === "editor" ? "S3" : "S2";
  const myQ   = tasks.filter(t => t.taskType === "production" && (!t.stage || t.stage === assignedStage));
  const buckets = ["all", "todo", "in_progress", "review", "completed"];
  const vis   = filter === "all" ? myQ : myQ.filter(t => t.status === filter);
  const STATUS_LABEL = { todo: "To Do", in_progress: "In Progress", review: "Review", completed: "Done", blocked: "Rejected" };

  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {buckets.map(b => (
          <button key={b} onClick={() => setFilter(b)} style={{ padding: "6px 16px", borderRadius: 20, fontSize: 12.5, fontWeight: 600, cursor: "pointer", border: "1.5px solid", transition: "all .15s", background: filter === b ? "#4F46E5" : "#fff", color: filter === b ? "#fff" : "#6B7280", borderColor: filter === b ? "#4F46E5" : "#E5E7EB" }}>
            {b === "all" ? "All" : STATUS_LABEL[b]} ({b === "all" ? myQ.length : myQ.filter(t => t.status === b).length})
          </button>
        ))}
      </div>
      {vis.length === 0 ? (
        <div className="tms-card"><div className="tms-empty"><i className="bi bi-inbox" style={{ fontSize: 36 }} /><p>No tasks in this queue</p></div></div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
          {vis.map(t => (
            <div key={t._id} className="tms-card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ height: 90, background: "#F9FAFB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, color: "#D1D5DB" }}>
                <i className={`bi ${t.contentType === "reel" ? "bi-play-circle" : t.contentType === "post" ? "bi-image" : "bi-camera"}`} />
              </div>
              <div style={{ padding: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6, lineHeight: 1.4 }}>{t.nomenclature || t.title}</div>
                {t.brandId && <div style={{ display: "flex", alignItems: "center", fontSize: 11, color: "#6B7280", marginBottom: 8 }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: t.brandId.color, display: "inline-block", marginRight: 5 }} />{t.brandId.name}</div>}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span className={`tms-badge ${STATUS_MAP[t.status]?.cls || "tms-badge-todo"}`}>{STATUS_MAP[t.status]?.label || t.status}</span>
                  <span style={{ fontSize: 11, color: isOverdue(t.dueDate) ? "#DC2626" : "#9CA3AF" }}>{fmtD(t.dueDate)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ─── TASK DETAIL MODAL (shared by calendar tabs) ─────────────────────────────
function TaskDetailModal({ task, onClose }) {
  if (!task) return null;
  const ct = { reel: { label: "Reel", icon: "bi-camera-video-fill", color: "#F59E0B" }, post: { label: "Post", icon: "bi-image-fill", color: "#6366F1" }, carousel: { label: "Carousel", icon: "bi-images", color: "#10B981" }, story: { label: "Phone", icon: "bi-phone-fill", color: "#EC4899" } }[task.contentType];
  const stageColor = STAGE_COLOR[task.stage] || "#6366F1";
  const dateStr = task.scheduledFor ? fmtD(task.scheduledFor) : fmtD(task.dueDate);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 520, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.18)" }}>
        {/* Header */}
        <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1, paddingRight: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#1E293B", lineHeight: 1.4, marginBottom: 8 }}>{task.nomenclature || task.title || "—"}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {task.brandId && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: (task.brandId.color || "#6366F1") + "20", color: task.brandId.color || "#6366F1" }}>{task.brandId.name}</span>}
              {ct && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: ct.color + "18", color: ct.color }}><i className={`bi ${ct.icon}`} style={{ marginRight: 3 }} />{ct.label}</span>}
              {task.stage && <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: stageColor + "20", color: stageColor }}>{task.stage} · {STAGE_LABEL[task.stage]}</span>}
              {dateStr !== "—" && <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: "#F1F5F9", color: "#64748B" }}><i className="bi bi-calendar3 me-1" />{dateStr}</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ border: "none", background: "#F1F5F9", borderRadius: 8, width: 30, height: 30, cursor: "pointer", fontSize: 14, flexShrink: 0 }}><i className="bi bi-x" /></button>
        </div>
        {/* Body */}
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
          {task.pillar && (
            <div><div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", marginBottom: 4 }}>Content Pillar</div>
            <div style={{ fontSize: 13, color: "#7C3AED", fontWeight: 600 }}><i className="bi bi-tag me-1" />{task.pillar}</div></div>
          )}
          {task.description && (
            <div><div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", marginBottom: 4 }}>Script / Description</div>
            <div style={{ fontSize: 12.5, color: "#374151", background: "#F8FAFC", borderRadius: 8, padding: "10px 12px", lineHeight: 1.7, whiteSpace: "pre-wrap", maxHeight: 180, overflowY: "auto" }}>{task.description}</div></div>
          )}
          {task.caption && (
            <div><div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", marginBottom: 4 }}>Caption</div>
            <div style={{ fontSize: 12.5, color: "#374151", background: "#F8FAFC", borderRadius: 8, padding: "10px 12px", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{task.caption}</div></div>
          )}
          {task.tags?.length > 0 && (
            <div><div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", marginBottom: 4 }}>Hashtags</div>
            <div style={{ fontSize: 12, color: "#6366F1", background: "#EEF2FF", borderRadius: 8, padding: "8px 12px", lineHeight: 1.8 }}>{task.tags.map(tg => `#${tg}`).join(" ")}</div></div>
          )}
          {task.referenceLink && (
            <div><div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", marginBottom: 4 }}>Reference Link</div>
            <a href={task.referenceLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#4F46E5", display: "inline-flex", alignItems: "center", gap: 4, background: "#EEF2FF", padding: "6px 12px", borderRadius: 8, textDecoration: "none" }}><i className="bi bi-link-45deg" /> View Reference</a></div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── BRAND CALENDAR TAB ───────────────────────────────────────────────────────
// ─── WEEKLY TRACKER TAB (content team) ───────────────────────────────────────
function WeeklyTrackerTab({ tasks }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [brandFilter, setBrandFilter] = useState("");

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dow   = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1) + weekOffset * 7);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i); return d;
  });
  const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const allProdTasks = tasks.filter(t => t.taskType === "production" || t.contentType);
  // Extract unique brands
  const brands = [...new Map(allProdTasks.filter(t => t.brandId).map(t => [t.brandId._id, t.brandId])).values()];
  const prodTasks = brandFilter ? allProdTasks.filter(t => t.brandId?._id === brandFilter) : allProdTasks;

  function tasksForDay(day) {
    return prodTasks.filter(t => {
      const dl = t.stages?.[0]?.deadline || t.dueDate;
      if (!dl) return false;
      const d = new Date(dl); d.setHours(0, 0, 0, 0);
      return d.getTime() === day.getTime();
    });
  }

  const STATUS_STYLE = {
    todo:        { label: "To Do",       bg: "#F1F5F9", color: "#64748B" },
    in_progress: { label: "In Progress", bg: "#DBEAFE", color: "#1D4ED8" },
    review:      { label: "Review",      bg: "#FEF3C7", color: "#B45309" },
    completed:   { label: "Done",        bg: "#DCFCE7", color: "#15803D" },
    blocked:     { label: "Rejected",    bg: "#FEE2E2", color: "#DC2626" },
  };

  const weekStart = days[0].toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  const weekEnd   = days[6].toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const isCurrentWeek = weekOffset === 0;

  return (
    <div>
      {/* Brand filter */}
      {brands.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".5px" }}>Brand:</span>
          <div onClick={() => setBrandFilter("")}
            style={{ padding: "4px 13px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1.5px solid", background: !brandFilter ? "#7C3AED" : "#fff", color: !brandFilter ? "#fff" : "#374151", borderColor: !brandFilter ? "#7C3AED" : "#E5E7EB" }}>
            All
          </div>
          {brands.map(b => (
            <div key={b._id} onClick={() => setBrandFilter(brandFilter === b._id ? "" : b._id)}
              style={{ padding: "4px 13px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1.5px solid", display: "flex", alignItems: "center", gap: 5, background: brandFilter === b._id ? b.color || "#7C3AED" : "#fff", color: brandFilter === b._id ? "#fff" : "#374151", borderColor: brandFilter === b._id ? b.color || "#7C3AED" : "#E5E7EB" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: brandFilter === b._id ? "#fff" : b.color, display: "inline-block" }} />{b.name}
            </div>
          ))}
        </div>
      )}

      {/* Week nav */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <button onClick={() => setWeekOffset(w => w - 1)}
          style={{ background: "#F1F5F9", border: "none", borderRadius: 8, padding: "7px 12px", cursor: "pointer", fontSize: 14 }}>
          ‹
        </button>
        <span style={{ fontWeight: 700, fontSize: 15, flex: 1 }}>
          {weekStart} — {weekEnd}
        </span>
        <button onClick={() => setWeekOffset(w => w + 1)} disabled={isCurrentWeek}
          style={{ background: "#F1F5F9", border: "none", borderRadius: 8, padding: "7px 12px", cursor: isCurrentWeek ? "default" : "pointer", fontSize: 14, opacity: isCurrentWeek ? 0.4 : 1 }}>
          ›
        </button>
        {weekOffset !== 0 && (
          <button onClick={() => setWeekOffset(0)}
            style={{ background: "#EEF2FF", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#4F46E5" }}>
            This Week
          </button>
        )}
      </div>

      {/* Day columns */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 10 }}>
        {days.map((day, i) => {
          const isToday = day.getTime() === today.getTime();
          const dt = tasksForDay(day);
          return (
            <div key={i}>
              {/* Day header */}
              <div style={{ textAlign: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "#9CA3AF", letterSpacing: ".5px" }}>{DAY_NAMES[i]}</div>
                <div style={{ width: 32, height: 32, borderRadius: "50%", margin: "4px auto 0", display: "flex", alignItems: "center", justifyContent: "center",
                  background: isToday ? "#6366F1" : "transparent", color: isToday ? "#fff" : "#374151", fontWeight: isToday ? 800 : 500, fontSize: 14 }}>
                  {day.getDate()}
                </div>
              </div>

              {/* Tasks */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6, minHeight: 80 }}>
                {dt.length === 0 ? (
                  <div style={{ background: "#F9FAFB", borderRadius: 8, padding: "10px 6px", textAlign: "center", color: "#D1D5DB", fontSize: 10 }}>—</div>
                ) : dt.map(t => {
                  const sm = STATUS_STYLE[t.status] || STATUS_STYLE.todo;
                  const approved = (t.stages || []).some(s => s.approved);
                  const brandColor = t.brandId?.color || "#6366F1";
                  return (
                    <div key={t._id} style={{ background: "#fff", border: `1.5px solid ${brandColor}30`, borderLeft: `3px solid ${brandColor}`, borderRadius: 8, padding: "8px 8px 6px" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#1E293B", marginBottom: 4, lineHeight: 1.3, wordBreak: "break-word" }}>
                        {t.nomenclature || t.title}
                      </div>
                      {t.brandId && (
                        <div style={{ fontSize: 9, color: brandColor, fontWeight: 700, marginBottom: 4 }}>{t.brandId.name}</div>
                      )}
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 20, background: sm.bg, color: sm.color }}>{sm.label}</span>
                        {approved && <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 20, background: "#DCFCE7", color: "#15803D" }}>✓ Approved</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── BRAND CALENDAR TAB ───────────────────────────────────────────────────────
function BrandCalendarTab({ tasks }) {
  const [brands,      setBrands]      = useState([]);
  const [selBrand,    setSelBrand]    = useState(null);
  const [brandTasks,  setBrandTasks]  = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  useEffect(() => {
    const seen = new Set(); const bs = [];
    tasks.forEach(t => { if (t.brandId && !seen.has(t.brandId._id)) { seen.add(t.brandId._id); bs.push(t.brandId); } });
    setBrands(bs);
    if (bs.length > 0) setSelBrand(bs[0]);
  }, [tasks]);

  useEffect(() => {
    if (!selBrand) return;
    setLoading(true);
    fetch(`/api/employee/brand-tasks?brandId=${selBrand._id}`, { headers: authH() })
      .then(r => r.json())
      .then(d => { if (d.success) setBrandTasks(d.tasks); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selBrand]);

  function groupByWeek(list) {
    const g = {};
    list.forEach(t => {
      // Use stage deadline as primary date for production tasks
      const raw = getStageDeadline(t) || new Date(t.createdAt);
      const d = new Date(raw); d.setHours(0, 0, 0, 0);
      const day = d.getDay();
      const mon = new Date(d); mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
      const key = mon.toISOString().slice(0, 10);
      if (!g[key]) g[key] = { mon, tasks: [] };
      g[key].tasks.push(t);
    });
    return Object.entries(g).sort(([a], [b]) => a.localeCompare(b));
  }

  const productionTasks = brandTasks.filter(t => t.taskType === "production" || t.contentType);
  const weeks = groupByWeek(productionTasks);

  if (brands.length === 0) return (
    <div className="tms-card"><div className="tms-empty"><i className="bi bi-calendar-x" style={{ fontSize: 36 }} /><p>No brands with tasks assigned</p></div></div>
  );

  return (
    <>
      <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} />
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {brands.map(b => (
          <div key={b._id} onClick={() => setSelBrand(b)} style={{ padding: "7px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "1.5px solid", transition: "all .15s", display: "flex", alignItems: "center", gap: 6, background: selBrand?._id === b._id ? "#4F46E5" : "#fff", color: selBrand?._id === b._id ? "#fff" : "#374151", borderColor: selBrand?._id === b._id ? "#4F46E5" : "#E5E7EB" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: selBrand?._id === b._id ? "#fff" : b.color, display: "inline-block" }} />{b.name}
          </div>
        ))}
      </div>
      {loading ? (
        <div className="tms-card"><div className="tms-empty"><div className="spinner-border spinner-border-sm text-primary" /></div></div>
      ) : productionTasks.length === 0 ? (
        <div className="tms-card"><div className="tms-empty"><i className="bi bi-calendar2" style={{ fontSize: 36 }} /><p>No content tasks for this brand</p></div></div>
      ) : weeks.map(([key, { mon, tasks: wt }]) => {
        const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
        return (
          <div key={key} className="tms-card" style={{ padding: 0, overflow: "hidden", marginBottom: 18 }}>
            <div style={{ padding: "11px 16px", background: "#F9FAFB", borderBottom: "1px solid #F0F0F0", fontWeight: 700, fontSize: 13, display: "flex", justifyContent: "space-between" }}>
              <span>Week of {fmtD(mon)} – {fmtD(sun)}</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: "#9CA3AF" }}>{wt.length} tasks</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #F0F0F0" }}>
                    {["#", "Deadline", "Type", "Name", "Pillar", "Script / Content", "Status", "Stage", "Ref"].map(h => (
                      <th key={h} style={{ padding: "9px 14px", textAlign: "left", fontSize: 10.5, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".4px", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {wt.map((t, ri) => {
                    const dl = getStageDeadline(t);
                    const od = dl ? isOverdue(dl) && t.status !== "completed" : false;
                    const sm = STATUS_MAP[t.status] || STATUS_MAP.todo;
                    return (
                      <tr key={t._id} onClick={() => setSelectedTask(t)}
                        style={{ borderBottom: "1px solid #F9F9F9", cursor: "pointer", background: od ? "#FFF5F5" : "", transition: "background .1s" }}
                        onMouseEnter={e => e.currentTarget.style.background = od ? "#FEE2E2" : "#F5F3FF"}
                        onMouseLeave={e => e.currentTarget.style.background = od ? "#FFF5F5" : ""}>
                        <td style={{ padding: "11px 14px", color: "#9CA3AF", fontSize: 11, fontFamily: "monospace" }}>{ri + 1}</td>
                        <td style={{ padding: "11px 14px", fontSize: 11, fontFamily: "monospace", whiteSpace: "nowrap", color: od ? "#DC2626" : "#374151", fontWeight: od ? 700 : 400 }}>
                          {od && <i className="bi bi-exclamation-circle-fill me-1" style={{ fontSize: 10 }} />}
                          {dl ? fmtD(dl) : "—"}
                        </td>
                        <td style={{ padding: "11px 14px" }}>
                          {t.contentType
                            ? <span style={{ padding: "2px 7px", borderRadius: 4, background: (CTYPE_COLOR[t.contentType] || "#6366F1") + "22", color: CTYPE_COLOR[t.contentType] || "#6366F1", fontSize: 11, fontWeight: 700, textTransform: "capitalize" }}>{t.contentType}</span>
                            : <span style={{ color: "#D1D5DB" }}>—</span>}
                        </td>
                        <td style={{ padding: "11px 14px", fontWeight: 600, fontSize: 12, maxWidth: 160, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {t.nomenclature || t.title || "—"}
                        </td>
                        <td style={{ padding: "11px 14px", fontSize: 12, color: "#6B7280" }}>{t.pillar || <span style={{ color: "#D1D5DB" }}>—</span>}</td>
                        <td style={{ padding: "11px 14px", maxWidth: 200, fontSize: 11, color: t.description ? "#374151" : "#D1D5DB" }}>
                          {t.description
                            ? <>{t.description.slice(0, 60)}{t.description.length > 60 ? "…" : ""}</>
                            : <span style={{ fontStyle: "italic" }}>Not written yet</span>}
                        </td>
                        <td style={{ padding: "11px 14px" }}>
                          <span className={`tms-badge ${sm.cls}`} style={{ fontSize: 10 }}>{sm.label}</span>
                        </td>
                        <td style={{ padding: "11px 14px" }}>{t.stage ? <StageDots stage={t.stage} size={18} /> : <span style={{ color: "#D1D5DB" }}>—</span>}</td>
                        <td style={{ padding: "11px 14px" }}>
                          {t.referenceLink
                            ? <a href={t.referenceLink} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ color: "#4F46E5", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 3 }}><i className="bi bi-link-45deg" />View</a>
                            : <span style={{ color: "#D1D5DB" }}>—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </>
  );
}

// ─── MY CALENDAR TAB (Content Team — shows assigned tasks by stage deadline) ───
function MyCalendarTab({ tasks }) {
  const [cur, setCur]           = useState(new Date());
  const [selectedTask, setSelectedTask] = useState(null);
  const [dayPanel, setDayPanel] = useState(null); // { day, tasks[] }
  const [brandFilter, setBrandFilter] = useState("");

  const year      = cur.getFullYear();
  const month     = cur.getMonth();
  const monthName = cur.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const firstDay  = new Date(year, month, 1).getDay();
  const daysInMon = new Date(year, month + 1, 0).getDate();
  const offset    = firstDay === 0 ? 6 : firstDay - 1;
  const cells     = Array(offset).fill(null).concat(Array.from({ length: daysInMon }, (_, i) => i + 1));
  const today     = new Date();
  const DAY_HEADS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Show tasks where any stage is approved OR task is completed (covers both old and new approval flows)
  const myTasks = tasks.filter(t =>
    (t.taskType === "production" || t.contentType) &&
    ((t.stages || []).some(s => s.approved) || t.status === "completed")
  );

  // All brands from my tasks
  const brands = [...new Map(myTasks.filter(t => t.brandId).map(t => [t.brandId._id, t.brandId])).values()];
  const filtered = brandFilter ? myTasks.filter(t => t.brandId?._id === brandFilter) : myTasks;

  // Place approved/completed tasks on most relevant date available
  function getApprovedDate(t) {
    const s1 = t.stages?.[0];
    if (s1?.deadline)   return new Date(s1.deadline);
    if (t.dueDate)      return new Date(t.dueDate);
    if (s1?.doneAt)     return new Date(s1.doneAt);
    if (t.submittedAt)  return new Date(t.submittedAt);
    if (t.updatedAt)    return new Date(t.updatedAt);
    if (t.createdAt)    return new Date(t.createdAt);
    return null;
  }

  function dayTasks(day) {
    return filtered.filter(t => {
      const dl = getApprovedDate(t);
      if (!dl) return false;
      return dl.getFullYear() === year && dl.getMonth() === month && dl.getDate() === day;
    });
  }

  const STATUS_COLOR_MAP = {
    todo: "#9CA3AF", in_progress: "#3B82F6", review: "#F59E0B",
    completed: "#10B981", blocked: "#EF4444",
  };

  return (
    <div>
      <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} />

      {/* Brand filter */}
      {brands.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".5px" }}>Brand:</span>
          <div onClick={() => setBrandFilter("")}
            style={{ padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1.5px solid", background: !brandFilter ? "#4F46E5" : "#fff", color: !brandFilter ? "#fff" : "#374151", borderColor: !brandFilter ? "#4F46E5" : "#E5E7EB" }}>
            All
          </div>
          {brands.map(b => (
            <div key={b._id} onClick={() => setBrandFilter(brandFilter === b._id ? "" : b._id)}
              style={{ padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1.5px solid", display: "flex", alignItems: "center", gap: 5, background: brandFilter === b._id ? b.color || "#4F46E5" : "#fff", color: brandFilter === b._id ? "#fff" : "#374151", borderColor: brandFilter === b._id ? b.color || "#4F46E5" : "#E5E7EB" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: brandFilter === b._id ? "#fff" : b.color, display: "inline-block" }} />{b.name}
            </div>
          ))}
        </div>
      )}

      <div className="tms-card" style={{ padding: 0, overflow: "hidden" }}>
        {/* Calendar header */}
        <div style={{ display: "flex", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid #F0F0F0" }}>
          <button onClick={() => { setCur(new Date(year, month - 1, 1)); setDayPanel(null); }} style={{ background: "#F3F4F6", border: "none", borderRadius: 7, width: 30, height: 30, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="bi bi-chevron-left" />
          </button>
          <span style={{ flex: 1, textAlign: "center", fontWeight: 700, fontSize: 16 }}>{monthName}</span>
          <button onClick={() => { setCur(new Date(year, month + 1, 1)); setDayPanel(null); }} style={{ background: "#F3F4F6", border: "none", borderRadius: 7, width: 30, height: 30, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="bi bi-chevron-right" />
          </button>
        </div>

        {/* Day headers */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid #F3F4F6" }}>
          {DAY_HEADS.map(d => (
            <div key={d} style={{ padding: "9px 0", textAlign: "center", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", color: "#9CA3AF" }}>{d}</div>
          ))}
        </div>

        {/* Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
          {cells.map((day, i) => {
            if (!day) return <div key={`e${i}`} style={{ minHeight: 90, borderBottom: "1px solid #F9F9F9", borderRight: "1px solid #F9F9F9" }} />;
            const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
            const dt = dayTasks(day);
            const hasTasks = dt.length > 0;
            return (
              <div key={day}
                onClick={() => hasTasks && setDayPanel({ day, tasks: dt })}
                style={{ minHeight: 100, padding: "7px 6px", borderBottom: "1px solid #F9F9F9", borderRight: "1px solid #F9F9F9", background: isToday ? "#FFFBEB" : hasTasks ? "#FAFBFF" : "#fff", cursor: hasTasks ? "pointer" : "default", transition: "background .1s" }}>
                <div style={{ width: 26, height: 26, borderRadius: "50%", marginBottom: 5, display: "flex", alignItems: "center", justifyContent: "center", background: isToday ? "#D97706" : "transparent", fontSize: 12, fontWeight: isToday ? 800 : 400, color: isToday ? "#fff" : "#374151" }}>{day}</div>
                {dt.slice(0, 3).map(t => {
                  const brandColor = t.brandId?.color || "#7C3AED";
                  const od = (() => { const dl = getStageDeadline(t); return dl ? isOverdue(dl) && t.status !== "completed" : false; })();
                  return (
                    <div key={t._id}
                      onClick={e => { e.stopPropagation(); setSelectedTask(t); }}
                      title={`${t.nomenclature || t.title}\n${t.brandId?.name || ""}`}
                      style={{ fontSize: 10, padding: "2px 5px", borderRadius: 4, marginBottom: 3, background: od ? "#FEE2E2" : brandColor + "20", color: od ? "#DC2626" : brandColor, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", cursor: "pointer", borderLeft: `2px solid ${od ? "#DC2626" : brandColor}` }}>
                      {od && "⚠ "}{t.contentType ? `[${t.contentType}] ` : ""}{t.nomenclature || t.title}
                    </div>
                  );
                })}
                {dt.length > 3 && (
                  <div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 600 }}>+{dt.length - 3} more</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Day panel — shows all tasks for selected day with content preview */}
      {dayPanel && (
        <div className="tms-card" style={{ marginTop: 16, padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "12px 18px", background: "#F9FAFB", borderBottom: "1px solid #F0F0F0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 700, fontSize: 14 }}>
              {new Date(year, month, dayPanel.day).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
              <span style={{ marginLeft: 8, fontSize: 12, color: "#9CA3AF", fontWeight: 500 }}>{dayPanel.tasks.length} task{dayPanel.tasks.length !== 1 ? "s" : ""}</span>
            </span>
            <button onClick={() => setDayPanel(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9CA3AF", fontSize: 16 }}>×</button>
          </div>
          {dayPanel.tasks.map(t => {
            const brandColor = t.brandId?.color || "#7C3AED";
            const sm = STATUS_MAP[t.status] || STATUS_MAP.todo;
            const od = (() => { const dl = getStageDeadline(t); return dl ? isOverdue(dl) && t.status !== "completed" : false; })();
            return (
              <div key={t._id} style={{ padding: "14px 18px", borderBottom: "1px solid #F9F9F9", cursor: "pointer" }}
                onClick={() => setSelectedTask(t)}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  {/* Brand colour strip */}
                  <div style={{ width: 4, borderRadius: 4, background: brandColor, alignSelf: "stretch", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: "#1E293B" }}>{t.nomenclature || t.title}</span>
                      {t.contentType && <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 4, background: brandColor + "20", color: brandColor, fontWeight: 700, textTransform: "capitalize" }}>{t.contentType}</span>}
                      <span className={`tms-badge ${sm.cls}`} style={{ fontSize: 10 }}>{sm.label}</span>
                      {od && <span style={{ fontSize: 10, fontWeight: 800, background: "#FEE2E2", color: "#DC2626", borderRadius: 20, padding: "1px 7px" }}>OVERDUE</span>}
                    </div>
                    {t.brandId && <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 6 }}><i className="bi bi-building me-1" />{t.brandId.name}</div>}
                    {t.pillar && <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 4 }}><i className="bi bi-tag me-1" />{t.pillar}</div>}
                    {t.description ? (
                      <div style={{ fontSize: 12, color: "#374151", background: "#F8FAFC", borderRadius: 8, padding: "8px 10px", lineHeight: 1.6, maxHeight: 80, overflowY: "auto", whiteSpace: "pre-wrap" }}>
                        {t.description.slice(0, 200)}{t.description.length > 200 ? "…" : ""}
                      </div>
                    ) : (
                      <div style={{ fontSize: 11, color: "#D1D5DB", fontStyle: "italic" }}>No script written yet</div>
                    )}
                    {t.referenceLink && (
                      <a href={t.referenceLink} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                        style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 6, fontSize: 11, color: "#4F46E5", textDecoration: "none" }}>
                        <i className="bi bi-link-45deg" />Reference link
                      </a>
                    )}
                  </div>
                  <StageDots stage={t.stage} size={18} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── SCRIPT LIBRARY TAB ───────────────────────────────────────────────────────
function ScriptLibraryTab({ tasks }) {
  const [subTab, setSubTab] = useState("voice");
  const completed = tasks.filter(t => t.status === "completed" && (t.description?.length || 0) > 10);
  const approved  = tasks.filter(t => t.status === "completed" && t.stage === "S4");
  const brands    = [...new Map(tasks.filter(t => t.brandId).map(t => [t.brandId._id, t.brandId])).values()];
  const SUB_TABS  = [{ key: "voice", label: "Brand Voice Docs" }, { key: "scripts", label: "Top Scripts" }, { key: "hooks", label: "Hook Templates" }, { key: "guide", label: "Style Guide" }];
  const hookTemplates = ["POV: You just discovered ___", "The #1 reason why ___", "Nobody talks about this but ___", "Stop doing ___ (do this instead)", "This changed how I ___ forever", "If you're struggling with ___, watch this"];

  return (
    <div>
      {/* Metrics */}
      <div className="tms-stats" style={{ marginBottom: 24 }}>
        {[
          { icon: "bi-file-text", bg: "#EDE9FE", ic: "#7C3AED", val: tasks.filter(t => (t.description?.length || 0) > 10).length, label: "Total Scripts" },
          { icon: "bi-check2-circle", bg: "#D1FAE5", ic: "#065F46", val: approved.length, label: "Approved (S4)" },
          { icon: "bi-collection", bg: "#FEF3C7", ic: "#D97706", val: brands.length, label: "Brands Covered" },
        ].map(m => (
          <div key={m.label} className="tms-stat">
            <div className="tms-stat-icon" style={{ background: m.bg }}><i className={`bi ${m.icon}`} style={{ color: m.ic }} /></div>
            <div><div className="tms-stat-val">{m.val}</div><div className="tms-stat-label">{m.label}</div></div>
          </div>
        ))}
      </div>

      {/* Sub-tabs */}
      <div style={{ display: "flex", gap: 2, borderBottom: "2px solid #F0F0F0", marginBottom: 18 }}>
        {SUB_TABS.map(t => (
          <button key={t.key} onClick={() => setSubTab(t.key)} style={{ padding: "9px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", background: "transparent", border: "none", color: subTab === t.key ? "#7C3AED" : "#9CA3AF", borderBottom: `2px solid ${subTab === t.key ? "#7C3AED" : "transparent"}`, marginBottom: -2, transition: "all .15s" }}>{t.label}</button>
        ))}
      </div>

      {subTab === "voice" && (
        <div className="tms-card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr style={{ borderBottom: "1px solid #F0F0F0", background: "#FAFAFA" }}>
              {["Brand", "Voice Summary", "Last Updated", "Action"].map(h => (
                <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 10.5, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".5px" }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {brands.length === 0 ? <tr><td colSpan={4} style={{ padding: "40px 16px", textAlign: "center", color: "#9CA3AF" }}>No brand data available</td></tr>
                : brands.map(b => (
                  <tr key={b._id} style={{ borderBottom: "1px solid #F5F5F5" }}>
                    <td style={{ padding: "13px 16px" }}><div style={{ display: "flex", alignItems: "center", gap: 9 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: b.color, display: "inline-block" }} /><span style={{ fontWeight: 700, fontSize: 13 }}>{b.name}</span></div></td>
                    <td style={{ padding: "13px 16px", fontSize: 12, color: "#6B7280" }}>Hook fast · CTA always · Stay on-brand</td>
                    <td style={{ padding: "13px 16px", fontSize: 12, color: "#9CA3AF", fontFamily: "monospace" }}>—</td>
                    <td style={{ padding: "13px 16px" }}><button style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #E5E7EB", background: "#fff", color: "#6B7280", fontSize: 12, cursor: "pointer" }}>View</button></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {subTab === "scripts" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {completed.length === 0 ? <div className="tms-card"><div className="tms-empty"><i className="bi bi-file-earmark-x" style={{ fontSize: 36 }} /><p>No completed scripts yet</p></div></div>
            : completed.slice(0, 10).map(t => (
              <div key={t._id} className="tms-card">
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, gap: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{t.nomenclature || t.title}</div>
                  {t.brandId && <span style={{ padding: "2px 9px", borderRadius: 20, background: t.brandId.color + "20", color: t.brandId.color, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{t.brandId.name}</span>}
                </div>
                <p style={{ margin: 0, fontSize: 12.5, color: "#6B7280", lineHeight: 1.7 }}>{(t.description || "").slice(0, 200)}{(t.description?.length || 0) > 200 ? "…" : ""}</p>
              </div>
            ))}
        </div>
      )}

      {subTab === "hooks" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {hookTemplates.map((h, i) => (
            <div key={i} className="tms-card">
              <div style={{ fontSize: 10.5, fontWeight: 700, color: "#7C3AED", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".5px" }}>Hook #{String(i + 1).padStart(2, "0")}</div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, lineHeight: 1.6 }}>{h}</p>
            </div>
          ))}
        </div>
      )}

      {subTab === "guide" && (
        <div className="tms-card">
          <h5 style={{ marginBottom: 20, marginTop: 0 }}>Content Style Guide</h5>
          {[
            { title: "Tone", body: "Conversational, direct, energetic. Avoid corporate speak. Write like you're talking to a friend who respects your expertise." },
            { title: "Format", body: "Hook → Problem/Context → Solution/Value → CTA. Keep scripts under 60 seconds for Reels. Use line breaks for readability." },
            { title: "Language", body: "Active voice always. Short sentences. Lead with the benefit, not the feature." },
            { title: "CTA Rules", body: "Every piece of content must have one clear CTA. Be specific: 'Save this' / 'DM us the word X' — not just 'check it out'." },
          ].map((s, i, arr) => (
            <div key={s.title} style={{ marginBottom: 18, paddingBottom: 18, borderBottom: i < arr.length - 1 ? "1px solid #F0F0F0" : "none" }}>
              <h6 style={{ color: "#7C3AED", marginBottom: 6, marginTop: 0 }}>{s.title}</h6>
              <p style={{ margin: 0, fontSize: 13.5, color: "#6B7280", lineHeight: 1.7 }}>{s.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SUBMISSIONS TAB ──────────────────────────────────────────────────────────
function SubmissionsTab({ tasks }) {
  const [expanded, setExpanded] = useState({});
  const [filter, setFilter]     = useState("all"); // all | pending | approved | revision

  // Tasks where any stage has been submitted (done=true)
  const submitted = tasks.filter(t =>
    (t.stages || []).some(s => s.done) || ["review", "completed"].includes(t.status)
  );
  const pending   = submitted.filter(t => t.status === "review" || (t.stages || []).some(s => s.done && !s.approved && !s.rejected));
  const approved  = submitted.filter(t => t.status === "completed" || (t.stages || []).some(s => s.approved));
  const revision  = submitted.filter(t => (t.stages || []).some(s => s.rejected) || (t.status === "todo" && t.reviewNote));

  const displayList = filter === "pending"  ? pending
                    : filter === "approved" ? approved
                    : filter === "revision" ? revision
                    : submitted;

  function getStageOutcome(t) {
    const stages = t.stages || [];
    const rejected = stages.find(s => s.rejected);
    if (rejected) return { label: "Revision Needed", color: "#DC2626", bg: "#FEE2E2", icon: "bi-arrow-counterclockwise" };
    const pending  = stages.find(s => s.done && !s.approved && !s.rejected);
    if (pending)   return { label: "Pending Review", color: "#B45309", bg: "#FEF3C7", icon: "bi-hourglass-split" };
    const anyApproved = stages.some(s => s.approved);
    if (t.status === "completed") return { label: "Approved", color: "#065F46", bg: "#D1FAE5", icon: "bi-check2-circle" };
    if (anyApproved) return { label: "Approved", color: "#065F46", bg: "#D1FAE5", icon: "bi-check2-circle" };
    return { label: "Submitted", color: "#4F46E5", bg: "#EDE9FE", icon: "bi-send-check" };
  }

  function getSubmittedDate(t) {
    const doneStages = (t.stages || []).filter(s => s.doneAt).map(s => new Date(s.doneAt));
    if (doneStages.length) return doneStages.sort((a, b) => b - a)[0]; // most recent
    return t.submittedAt ? new Date(t.submittedAt) : null;
  }

  function getRejectionNote(t) {
    const rejected = (t.stages || []).find(s => s.rejected && s.rejectReason);
    return rejected?.rejectReason || t.reviewNote || null;
  }

  return (
    <div>
      {/* Summary cards — only real data */}
      <div className="tms-stats" style={{ marginBottom: 20 }}>
        {[
          { icon: "bi-send-check",      bg: "#EDE9FE", ic: "#7C3AED", val: submitted.length, label: "Total Submitted",  key: "all" },
          { icon: "bi-hourglass-split", bg: "#FEF3C7", ic: "#B45309", val: pending.length,   label: "Pending Review",   key: "pending" },
          { icon: "bi-check2-circle",   bg: "#D1FAE5", ic: "#065F46", val: approved.length,  label: "Approved",         key: "approved" },
          { icon: "bi-arrow-counterclockwise", bg: "#FEE2E2", ic: "#DC2626", val: revision.length, label: "Needs Revision", key: "revision" },
        ].map(m => (
          <div key={m.label} className="tms-stat" onClick={() => setFilter(f => f === m.key ? "all" : m.key)}
            style={{ cursor: "pointer", outline: filter === m.key ? `2px solid ${m.ic}` : "none", transition: "outline .12s" }}>
            <div className="tms-stat-icon" style={{ background: m.bg }}><i className={`bi ${m.icon}`} style={{ color: m.ic }} /></div>
            <div><div className="tms-stat-val" style={{ color: filter === m.key ? m.ic : undefined }}>{m.val}</div><div className="tms-stat-label">{m.label}</div></div>
          </div>
        ))}
      </div>

      {/* Submission cards */}
      {displayList.length === 0 ? (
        <div className="tms-card"><div className="tms-empty"><i className="bi bi-inbox" style={{ fontSize: 36 }} /><p>No submissions yet</p></div></div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {displayList.map(t => {
            const outcome      = getStageOutcome(t);
            const submittedAt  = getSubmittedDate(t);
            const rejectNote   = getRejectionNote(t);
            const brandColor   = t.brandId?.color || "#7C3AED";
            const isOpen       = !!expanded[t._id];

            return (
              <div key={t._id} className="tms-card" style={{ padding: 0, overflow: "hidden", border: rejectNote ? "1.5px solid #FCA5A5" : undefined }}>
                {/* Header */}
                <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
                  onClick={() => setExpanded(p => ({ ...p, [t._id]: !p[t._id] }))}>
                  {/* Brand strip */}
                  <div style={{ width: 4, borderRadius: 4, background: brandColor, alignSelf: "stretch", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: "#1E293B" }}>{t.nomenclature || t.title}</span>
                      {t.contentType && <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 4, background: brandColor + "20", color: brandColor, fontWeight: 700, textTransform: "capitalize" }}>{t.contentType}</span>}
                      <span style={{ fontSize: 10, padding: "2px 9px", borderRadius: 20, background: outcome.bg, color: outcome.color, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <i className={`bi ${outcome.icon}`} style={{ fontSize: 9 }} />{outcome.label}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
                      {t.brandId && <span style={{ fontSize: 11, color: "#9CA3AF" }}><i className="bi bi-building me-1" />{t.brandId.name}</span>}
                      {submittedAt && <span style={{ fontSize: 11, color: "#9CA3AF" }}><i className="bi bi-calendar me-1" />{fmtD(submittedAt)}</span>}
                      {t.pillar && <span style={{ fontSize: 11, color: "#9CA3AF" }}><i className="bi bi-tag me-1" />{t.pillar}</span>}
                    </div>
                  </div>
                  <StageDots stage={t.stage} size={18} />
                  <i className={`bi bi-chevron-${isOpen ? "up" : "down"}`} style={{ color: "#D1D5DB", fontSize: 12, flexShrink: 0 }} />
                </div>

                {/* Expanded content */}
                {isOpen && (
                  <div style={{ padding: "0 16px 16px", borderTop: "1px solid #F5F5F5" }}>
                    {/* Admin rejection note */}
                    {rejectNote && (
                      <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 12px", margin: "12px 0 10px", fontSize: 12, color: "#DC2626", lineHeight: 1.6 }}>
                        <i className="bi bi-exclamation-circle-fill me-2" />
                        <strong>Admin feedback:</strong> {rejectNote}
                      </div>
                    )}

                    {/* Script / description */}
                    {t.description && (
                      <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 5 }}>Script / Content</div>
                        <div style={{ background: "#F8FAFC", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "#374151", lineHeight: 1.65, whiteSpace: "pre-wrap", maxHeight: 160, overflowY: "auto" }}>
                          {t.description}
                        </div>
                      </div>
                    )}

                    {/* Caption */}
                    {t.caption && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 5 }}>Caption</div>
                        <div style={{ background: "#F8FAFC", borderRadius: 8, padding: "10px 12px", fontSize: 12, color: "#374151", lineHeight: 1.65, whiteSpace: "pre-wrap", maxHeight: 100, overflowY: "auto" }}>
                          {t.caption}
                        </div>
                      </div>
                    )}

                    {/* Hashtags */}
                    {t.tags?.length > 0 && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 5 }}>Hashtags</div>
                        <div style={{ fontSize: 12, color: "#6366F1", background: "#EEF2FF", borderRadius: 8, padding: "8px 12px", lineHeight: 1.8 }}>
                          {t.tags.map(tg => `#${tg}`).join("  ")}
                        </div>
                      </div>
                    )}

                    {/* Stage proof links */}
                    {(t.stages || []).some(s => s.proofUrls?.length) && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 5 }}>Proof / Deliverables</div>
                        {(t.stages || []).flatMap(s => s.proofUrls || []).map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noreferrer"
                            style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "#4F46E5", marginRight: 10, marginBottom: 4, textDecoration: "none" }}>
                            <i className="bi bi-link-45deg" />Proof {i + 1}
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Reference link */}
                    {t.referenceLink && (
                      <div style={{ marginTop: 8 }}>
                        <a href={t.referenceLink} target="_blank" rel="noreferrer"
                          style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "#4F46E5", textDecoration: "none" }}>
                          <i className="bi bi-link-45deg" />Reference link
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── SPRINT BOARD TAB ─────────────────────────────────────────────────────────
function SprintBoardTab({ tasks }) {
  const COLS = [
    { key: "todo",        label: "Backlog",     color: "#6B7280" },
    { key: "in_progress", label: "In Progress", color: "#1D4ED8" },
    { key: "review",      label: "Review",      color: "#B45309" },
    { key: "completed",   label: "Done",        color: "#065F46" },
  ];
  const devTasks = tasks.filter(t => ["project", "sprint"].includes(t.taskType));

  async function updateStatus(id, status) {
    try {
      const r = await fetch(`/api/employee/tasks/${id}`, { method: "PATCH", headers: authH(), body: JSON.stringify({ status }) });
      const d = await r.json();
      if (d.success) { toast.success("Updated"); }
      else toast.error(d.message);
    } catch { toast.error("Update failed"); }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
      {COLS.map(col => {
        const ct = devTasks.filter(t => t.status === col.key);
        return (
          <div key={col.key} style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 12, padding: 14, minHeight: 400 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", color: col.color }}>{col.label}</span>
              <span style={{ background: col.color + "22", color: col.color, padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700 }}>{ct.length}</span>
            </div>
            {ct.length === 0 && <div style={{ color: "#D1D5DB", fontSize: 12, textAlign: "center", padding: "20px 0" }}>Empty</div>}
            {ct.map(t => (
              <div key={t._id} className="tms-card" style={{ marginBottom: 10, padding: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, lineHeight: 1.4 }}>{t.title}</div>
                {t.dueDate && <div style={{ fontSize: 10.5, color: isOverdue(t.dueDate) ? "#DC2626" : "#9CA3AF", marginBottom: 8 }}>{fmtD(t.dueDate)}</div>}
                <select value={t.status} onChange={e => updateStatus(t._id, e.target.value)} style={{ width: "100%", padding: "5px 8px", border: "1px solid #E5E7EB", borderRadius: 6, fontSize: 12, background: "#fff", cursor: "pointer", outline: "none" }}>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="review">Review</option>
                  <option value="completed">Done</option>
                  <option value="blocked">Rejected</option>
                </select>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ─── PERFORMANCE TAB ──────────────────────────────────────────────────────────
function PerformanceTab({ tasks, employee }) {
  const total     = tasks.length;
  const completed = tasks.filter(t => t.status === "completed").length;
  const overdue   = tasks.filter(t => isOverdue(t.dueDate) && t.status !== "completed").length;
  const inProg    = tasks.filter(t => t.status === "in_progress").length;
  const onTime    = completed > 0 ? Math.round((tasks.filter(t => t.status === "completed" && !isOverdue(t.dueDate)).length / completed) * 100) : 0;
  const grade     = onTime >= 90 ? "A" : onTime >= 75 ? "B" : onTime >= 60 ? "C" : "D";
  const gradeColor = { A: "#065F46", B: "#7C3AED", C: "#B45309", D: "#DC2626" }[grade];
  const gradeBg    = { A: "#D1FAE5", B: "#EDE9FE", C: "#FEF3C7", D: "#FEE2E2" }[grade];

  const brands = [...new Map(tasks.filter(t => t.brandId).map(t => [t.brandId._id, t.brandId])).values()];
  const brandStats = brands.map(b => {
    const bt  = tasks.filter(t => t.brandId?._id === b._id);
    const bc  = bt.filter(t => t.status === "completed").length;
    const bon = bt.filter(t => t.status === "completed" && !isOverdue(t.dueDate)).length;
    return { ...b, total: bt.length, completed: bc, onTime: bc > 0 ? Math.round((bon / bc) * 100) : 0 };
  });

  const months = [...Array(6)].map((_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
    const label = d.toLocaleDateString("en-IN", { month: "short" });
    const mt = tasks.filter(t => {
      if (t.status !== "completed") return false;
      const td = new Date(t.updatedAt || t.createdAt);
      return td.getFullYear() === d.getFullYear() && td.getMonth() === d.getMonth();
    }).length;
    return { label, val: mt };
  });
  const maxBar = Math.max(...months.map(m => m.val), 1);

  const feedback = [
    { text: "Great hook writing — the reel landed perfectly.", date: "Recently", pos: true },
    { text: "Caption could be more concise. Aim for under 100 chars.", date: "Last week", pos: false },
    { text: "Excellent CTA on the carousel series — engagement was 2× avg.", date: "2 weeks ago", pos: true },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Grade band */}
      <div className="tms-card" style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
        <div style={{ width: 68, height: 68, borderRadius: "50%", background: gradeBg, border: `3px solid ${gradeColor}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 900, color: gradeColor, flexShrink: 0 }}>{grade}</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 18, color: "#111" }}>{employee?.firstName} {employee?.lastName}</div>
          <div style={{ fontSize: 13, color: "#9CA3AF" }}>{employee?.professional?.designation || "Team Member"}</div>
        </div>
        <div style={{ flex: 1 }} />
        {[
          { label: "On-time %",    val: `${onTime}%`,  color: gradeColor },
          { label: "Active",       val: `${inProg}`,   color: "#1D4ED8" },
          { label: "Shipped",      val: completed,      color: "#065F46" },
          { label: "Total Tasks",  val: total,          color: "#374151" },
        ].map(s => (
          <div key={s.label} style={{ textAlign: "center", padding: "0 18px", borderLeft: "1px solid #F0F0F0" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 11, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".4px" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* 2-col */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 16 }}>
        {/* Bar chart */}
        <div className="tms-card">
          <h6 style={{ marginBottom: 20, marginTop: 0 }}>Monthly Output (last 6 months)</h6>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 130 }}>
            {months.map(m => (
              <div key={m.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: "#374151", minHeight: 18 }}>{m.val || ""}</div>
                <div style={{ width: "100%", background: "#F3F4F6", borderRadius: 5, height: 90, display: "flex", alignItems: "flex-end" }}>
                  <div style={{ width: "100%", background: m.val > 0 ? "#7C3AED" : "transparent", borderRadius: 5, height: `${(m.val / maxBar) * 100}%`, transition: "height .5s ease", minHeight: m.val > 0 ? 4 : 0 }} />
                </div>
                <div style={{ fontSize: 10, color: "#9CA3AF" }}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Feedback */}
        <div className="tms-card">
          <h6 style={{ marginBottom: 16, marginTop: 0 }}>Latest Feedback</h6>
          {feedback.map((f, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 14, paddingBottom: 14, borderBottom: i < feedback.length - 1 ? "1px solid #F0F0F0" : "none" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: f.pos ? "#22c55e" : "#EF4444", marginTop: 4, flexShrink: 0 }} />
              <div>
                <p style={{ margin: "0 0 3px", fontSize: 12.5, lineHeight: 1.5 }}>{f.text}</p>
                <span style={{ fontSize: 11, color: "#9CA3AF" }}>{f.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Brand breakdown */}
      {brandStats.length > 0 && (
        <div className="tms-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #F0F0F0" }}><h6 style={{ margin: 0, fontWeight: 700 }}>Performance by Brand</h6></div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead><tr style={{ borderBottom: "1px solid #F0F0F0", background: "#FAFAFA" }}>
              {["Brand", "Tasks", "Completed", "On-time %", "Status"].map(h => (
                <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 10.5, fontWeight: 700, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: ".5px" }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {brandStats.map(b => (
                <tr key={b._id} style={{ borderBottom: "1px solid #F5F5F5" }}>
                  <td style={{ padding: "13px 16px" }}><div style={{ display: "flex", alignItems: "center", gap: 9 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: b.color, display: "inline-block" }} /><span style={{ fontWeight: 700 }}>{b.name}</span></div></td>
                  <td style={{ padding: "13px 16px", color: "#6B7280" }}>{b.total}</td>
                  <td style={{ padding: "13px 16px", color: "#065F46", fontWeight: 600 }}>{b.completed}</td>
                  <td style={{ padding: "13px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 6, background: "#F3F4F6", borderRadius: 3, overflow: "hidden", minWidth: 60 }}>
                        <div style={{ height: "100%", width: `${b.onTime}%`, background: b.onTime >= 80 ? "#065F46" : b.onTime >= 60 ? "#D97706" : "#DC2626", borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 12, color: "#6B7280", minWidth: 36 }}>{b.onTime}%</span>
                    </div>
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    <span style={{ padding: "2px 9px", borderRadius: 20, background: b.onTime >= 80 ? "#D1FAE5" : "#FEF3C7", color: b.onTime >= 80 ? "#065F46" : "#B45309", fontSize: 11, fontWeight: 700 }}>
                      {b.onTime >= 80 ? "On track" : "Needs focus"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── DARK PORTAL — constants + helpers ───────────────────────────────────────
const NEXT_STAGE   = { S1: "S2", S2: "S3", S3: "S4", S4: "S4" };
const STAGE_NUM    = { S1: 1, S2: 2, S3: 3, S4: 4 };
const STATUS_COLOR = { todo: "#64748b", in_progress: "#3b82f6", review: "#f59e0b", completed: "#22c55e", blocked: "#ef4444" };
const SL           = { todo: "To Do", in_progress: "In Progress", review: "Review", completed: "Done", blocked: "Rejected" };
const RL           = { content: "Content Writer", design: "Designer", editor: "Video Editor", developer: "Developer", general: "Team Member" };

function calcGrade(tasks) {
  const comp   = tasks.filter(t => t.status === "completed");
  const onTime = comp.filter(t => !t.dueDate || !isOverdue(t.dueDate)).length;
  const rate   = comp.length ? Math.round(onTime / comp.length * 100) : 0;
  const letter = rate >= 90 ? "A" : rate >= 80 ? "A-" : rate >= 70 ? "B+" : rate >= 60 ? "B" : rate >= 50 ? "C" : "D";
  const color  = rate >= 80 ? "#22c55e" : rate >= 60 ? "#f5a623" : "#ef4444";
  return { rate, letter, color };
}

function getDeadlineInfo(task) {
  if (!task.dueDate) return null;
  const raw = new Date(task.dueDate);
  const now = new Date(); now.setHours(0,0,0,0);
  const d   = new Date(raw); d.setHours(0,0,0,0);
  const diff = Math.round((d - now) / 86400000);
  const diffH = Math.round((raw - new Date()) / 3600000);

  // Always include the real date + time as a subtitle
  const dateStr = raw.toLocaleDateString("en-IN", { day:"numeric", month:"short" });
  const timeStr = raw.toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" });
  const full    = `${dateStr}, ${timeStr}`;

  if (diff < 0) {
    const days = -diff;
    return { text: days === 1 ? "1 day overdue" : `${days}d overdue`, sub: full, color:"#ef4444", urgent:true,  today:false };
  }
  if (diff === 0) {
    const label = diffH > 0 ? `${diffH}h left` : "Due now";
    return { text: label, sub: full, color:"#f5a623", urgent:false, today:true };
  }
  if (diff === 1) return { text:"Due tomorrow", sub: full, color:"#64748b", urgent:false, today:false };
  return { text: full, sub: null, color:"#64748b", urgent:false, today:false };
}

function isDueToday(d) {
  if (!d) return false;
  const n = new Date(); n.setHours(0, 0, 0, 0);
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  return x.getTime() === n.getTime();
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function pIni(emp) {
  return `${(emp?.firstName || "?")[0]}${(emp?.lastName || "")[0]}`.toUpperCase();
}

// ─── DARK PORTAL — CSS ────────────────────────────────────────────────────────
const PORTAL_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --ep-bg: #f1f5f9; --ep-surface: #ffffff; --ep-surface2: #f8fafc; --ep-surface3: #e2e8f0;
    --ep-border: #e2e8f0; --ep-amber: #f5a623; --ep-amber-dim: rgba(245,166,35,.12);
    --ep-text: #1e293b; --ep-muted: #64748b; --ep-green: #22c55e; --ep-red: #ef4444;
    --ep-blue: #3b82f6; --ep-brand: #5A57FB; --ep-brand2: #02EBAD;
    --ep-side-bg: #0f1127; --ep-side-text: #b8bfe8; --ep-side-muted: #5c6494;
  }
  .ep-layout { display: flex; min-height: 100vh; background: var(--ep-bg); color: var(--ep-text); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; }
  .ep-side { width: 230px; background: var(--ep-side-bg); border-right: 1px solid rgba(90,87,251,.15); display: flex; flex-direction: column; position: fixed; top: 0; left: 0; height: 100vh; z-index: 200; }
  .ep-side-logo { padding: 20px 18px 16px; border-bottom: 1px solid rgba(90,87,251,.2); background: linear-gradient(135deg,rgba(90,87,251,.15) 0%,transparent 100%); }
  .ep-side-logo span { font-size: 18px; font-weight: 800; background: linear-gradient(90deg,#5A57FB,#02EBAD); -webkit-background-clip: text; -webkit-text-fill-color: transparent; letter-spacing: -.3px; }
  .ep-side-logo small { display: block; font-size: 10px; color: var(--ep-side-muted); margin-top: 2px; letter-spacing: .5px; text-transform: uppercase; }
  .ep-side-nav { flex: 1; overflow-y: auto; padding: 12px 10px; display: flex; flex-direction: column; gap: 2px; }
  .ep-nav { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 8px; cursor: pointer; font-size: 13px; color: var(--ep-side-text); transition: all .18s; border: none; background: none; width: 100%; text-align: left; }
  .ep-nav:hover { background: rgba(90,87,251,.12); color: #fff; }
  .ep-nav.active { background: linear-gradient(90deg,#5A57FB,#4845d4); color: #fff; font-weight: 600; box-shadow: 0 4px 12px rgba(90,87,251,.3); }
  .ep-nav i { font-size: 15px; width: 18px; flex-shrink: 0; }
  .ep-side-footer { padding: 14px; border-top: 1px solid rgba(90,87,251,.2); display: flex; align-items: center; gap: 10px; }
  .ep-ava { width: 36px; height: 36px; border-radius: 50%; background: rgb(90, 87, 251); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; color: #fff; flex-shrink: 0; }
  .ep-side-name { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; min-width: 0; color: #fff; }
  .ep-side-role { font-size: 10px; color: var(--ep-side-muted); white-space: nowrap; }
  .ep-main { flex: 1; margin-left: 230px; min-height: 100vh; display: flex; flex-direction: column; background: var(--ep-bg); }
  .ep-topbar { padding: 14px 28px; border-bottom: 1px solid var(--ep-border); background: #fff; display: flex; align-items: center; justify-content: space-between; gap: 16px; position: sticky; top: 0; z-index: 50; box-shadow: 0 1px 3px rgba(0,0,0,.06); }
  .ep-topbar-title { font-size: 16px; font-weight: 700; color: var(--ep-text); }
  .ep-content { padding: 24px 28px; flex: 1; }
  .ep-card { background: #fff; border: 1px solid var(--ep-border); border-radius: 12px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,.04); }
  .ep-card-title { font-size: 13px; font-weight: 700; margin-bottom: 14px; display: flex; align-items: center; gap: 8px; color: var(--ep-text); }
  .ep-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .ep-grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
  .ep-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; border: 1px solid transparent; transition: all .18s; outline: none; font-family: inherit; }
  .ep-btn-primary { background: #5A57FB; color: #fff; border-color: #5A57FB; }
  .ep-btn-primary:hover { background: #4845d4; }
  .ep-btn-ghost { background: transparent; color: var(--ep-muted); border-color: var(--ep-border); }
  .ep-btn-ghost:hover { background: var(--ep-surface2); color: var(--ep-text); }
  .ep-btn-sm { padding: 5px 12px; font-size: 12px; }
  .ep-label { font-size: 11px; color: var(--ep-muted); font-weight: 700; margin-bottom: 6px; display: block; text-transform: uppercase; letter-spacing: .5px; }
  .ep-input { width: 100%; padding: 9px 12px; background: var(--ep-surface2); border: 1px solid var(--ep-border); border-radius: 8px; color: var(--ep-text); font-size: 13.5px; outline: none; transition: border-color .18s; font-family: inherit; }
  .ep-input:focus { border-color: var(--ep-amber); }
  .ep-textarea { width: 100%; padding: 12px; background: var(--ep-surface2); border: 1px solid var(--ep-border); border-radius: 8px; color: var(--ep-text); font-size: 13.5px; outline: none; resize: vertical; font-family: inherit; line-height: 1.7; }
  .ep-textarea:focus { border-color: var(--ep-amber); }
  .ep-select { width: 100%; padding: 9px 12px; background: #fff; border: 1px solid var(--ep-border); border-radius: 8px; color: var(--ep-text); font-size: 13.5px; outline: none; cursor: pointer; font-family: inherit; }
  .ep-select:focus { border-color: var(--ep-amber); }
  .ep-form-g { margin-bottom: 14px; }
  .ep-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
  .ep-modal { background: #fff; border: 1px solid var(--ep-border); border-radius: 16px; padding: 24px; width: 100%; max-width: 460px; box-shadow: 0 20px 60px rgba(0,0,0,.15); }
  .ep-modal-hd { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
  .ep-modal-title { font-size: 15px; font-weight: 700; color: var(--ep-text); }
  .ep-empty { text-align: center; padding: 40px 20px; color: var(--ep-muted); }
  .ep-empty i { font-size: 38px; margin-bottom: 10px; display: block; }
  .ep-empty p { font-size: 13px; }
  .ep-spinner { display: inline-block; width: 20px; height: 20px; border: 2px solid var(--ep-border); border-top-color: var(--ep-amber); border-radius: 50%; animation: ep-spin .7s linear infinite; }
  @keyframes ep-spin { to { transform: rotate(360deg); } }
  .ep-tcard { background: #fff; border: 1px solid var(--ep-border); border-radius: 12px; padding: 16px 18px; transition: border-color .15s, box-shadow .15s; box-shadow: 0 1px 4px rgba(0,0,0,.04); }
  .ep-tcard:hover { border-color: #cbd5e1; box-shadow: 0 6px 20px rgba(0,0,0,.08); }
  .ep-tcard.urgent { border-color: rgba(239,68,68,.4); background: #fff5f5; }
  .ep-tcard.today-card { border-color: rgba(90,87,251,.35); background: #f5f5ff; }
  .ep-tcard.rejected-card { border-color: rgba(220,38,38,.3); background: #fff5f5; }
  .ep-btn-primary { background: #5A57FB; color: #fff; border-color: #5A57FB; }
  .ep-btn-primary:hover { background: #4845d4; }
  .ep-tgrid { display: grid; grid-template-columns: repeat(auto-fill,minmax(300px,1fr)); gap: 14px; }
  .ep-grade-hero {     background: linear-gradient(135deg, #1e1b4b 0%, #4F46E5 55%, #7C3AED 100%);border-radius: 14px; padding: 24px 28px; margin-bottom: 20px; position: relative; overflow: hidden; border: 1px solid rgba(90,87,251,.2); }
  .ep-grade-hero::before { content:''; position: absolute; top: -80px; right: -80px; width: 260px; height: 260px; background: radial-gradient(circle,rgba(90,87,251,.3),transparent 70%); pointer-events: none; }
  .ep-gh-title { font-size: 26px; font-weight: 800; letter-spacing: -.01em; line-height: 1.2; color: #fff; }
  .ep-gh-title span {    background: linear-gradient(90deg, #FF6F61 29%, #FBA065 95%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    display: inline-block;}
  .ep-stats4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; margin-top: 20px; }
  .ep-hstat { background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.12); border-radius: 10px; padding: 14px 16px; }
  .ep-hstat-val { font-size: 26px; font-weight: 800; line-height: 1; margin-top: 4px; }
  .ep-hstat-trend { font-size: 11px; margin-top: 4px; }
  .ep-sec-hd { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
  .ep-sec-title { font-size: 15px; font-weight: 700; display: flex; align-items: center; gap: 10px; color: var(--ep-text); }
  .ep-sec-count { background: var(--ep-amber-dim); color: #b45309; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
  .ep-alert-banner { border-radius: 9px; padding: 12px 18px; display: flex; align-items: center; gap: 12px; margin-bottom: 18px; }
  .ep-perf-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 14px; }
  .ep-week-grid { display: grid; grid-template-columns: repeat(7,1fr); gap: 6px; }
  .ep-day-col { background: var(--ep-surface2); border: 1px solid var(--ep-border); border-radius: 8px; padding: 8px; min-height: 110px; }
  .ep-day-col.today-col { border-color: var(--ep-amber); background: #fffbf0; }
  .ep-day-name { font-size: 10px; color: var(--ep-muted); text-transform: uppercase; letter-spacing: .06em; font-weight: 600; text-align: center; padding-bottom: 5px; border-bottom: 1px solid var(--ep-border); margin-bottom: 5px; }
  .ep-day-name.today-name { color: #b45309; }
  .ep-day-num { font-size: 15px; font-weight: 700; text-align: center; color: var(--ep-text); margin-bottom: 5px; }
  .ep-grade-card { background: linear-gradient(135deg,rgba(34,197,94,.06),#fff); border: 1px solid rgba(34,197,94,.3); border-radius: 12px; padding: 20px; text-align: center; }
  .ep-grade-letter { font-size: 64px; font-weight: 800; line-height: 1; letter-spacing: -.04em; }
  .ep-grade-bar { display: flex; gap: 3px; margin-top: 14px; }
  .ep-grade-bar-cell { flex: 1; height: 5px; border-radius: 3px; }
  .ep-rec-item { display: flex; align-items: center; gap: 12px; padding: 11px 0; border-bottom: 1px solid var(--ep-border); }
  .ep-rec-item:last-child { border-bottom: none; }
  .ep-rec-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-weight: 700; font-size: 13px; }
  .ep-bar-track { height: 7px; background: var(--ep-surface3); border-radius: 4px; overflow: hidden; margin-top: 6px; }
  .ep-bar-fill { height: 100%; border-radius: 4px; transition: width .5s; }
  .ep-perf-grade { width: 76px; height: 76px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 900; border: 4px solid var(--ep-amber); color: #b45309; }
  .ep-row-sep { display: flex; align-items: center; gap: 8px; padding: 11px 0; border-bottom: 1px solid var(--ep-border); }
  .ep-row-sep:last-child { border-bottom: none; }
  .ep-profile-ava { width: 76px; height: 76px; border-radius: 50%; background: var(--ep-amber-dim); border: 3px solid var(--ep-amber); display: flex; align-items: center; justify-content: center; font-size: 26px; font-weight: 800; color: #b45309; flex-shrink: 0; }
  .ep-brand-dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; margin-right: 4px; flex-shrink: 0; }
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--ep-border); border-radius: 3px; }

  .ep-card  span{color:#111}

  .ep-side-logo img {
    filter: brightness(0) invert(1);
}
  /* ── Mobile bottom tab nav ── */
  .ep-mob-tabs {
    display: none;
    position: fixed; bottom: 0; left: 0; right: 0; z-index: 300;
    background: #0f1127; border-top: 1px solid rgba(90,87,251,.2);
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
  .ep-mob-tabs-inner {
    display: flex; overflow-x: auto; -webkit-overflow-scrolling: touch;
    scrollbar-width: none; gap: 0;
  }
  .ep-mob-tabs-inner::-webkit-scrollbar { display: none; }
  .ep-mob-tab {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 3px; padding: 8px 12px; min-width: 62px; border: none; background: none;
    cursor: pointer; color: rgba(255,255,255,.4); font-size: 9px; font-weight: 600;
    text-transform: uppercase; letter-spacing: .04em; white-space: nowrap;
    transition: color .15s; flex-shrink: 0;
  }
  .ep-mob-tab i { font-size: 18px; }
  .ep-mob-tab.active { color: #818CF8; }
  .ep-mob-tab.active i { color: #818CF8; }

  /* ── Mobile topbar with back/menu button ── */
  .ep-mob-topbar {
    display: none;
    position: sticky; top: 0; z-index: 200;
    background: #0f1127; padding: 10px 14px;
    align-items: center; gap: 10px;
    border-bottom: 1px solid rgba(90,87,251,.15);
  }
  .ep-mob-topbar-title {
    flex: 1; font-size: 15px; font-weight: 700; color: #fff;
  }

  @media (max-width: 900px) {
    /* Hide desktop sidebar */
    .ep-side { display: none; }
    .ep-main { margin-left: 0; padding-bottom: 64px; }

    /* Show mobile nav */
    .ep-mob-tabs    { display: block; }
    .ep-mob-topbar  { display: flex; }

    /* Hide desktop topbar on mobile (replaced by mob-topbar) */
    .ep-topbar { display: none; }

    /* Content */
    .ep-content { padding: 14px 14px; }

    /* Grids */
    .ep-grid2  { grid-template-columns: 1fr; }
    .ep-grid4  { grid-template-columns: 1fr 1fr; }
    .ep-stats4 { grid-template-columns: 1fr 1fr; }
    .ep-perf-grid { grid-template-columns: 1fr; }
    .ep-week-grid { grid-template-columns: repeat(4,1fr); overflow-x: auto; }
    .ep-tgrid { grid-template-columns: 1fr; }

    /* Grade hero */
    .ep-grade-hero { padding: 18px 16px; border-radius: 12px; }
    .ep-gh-title { font-size: 20px; }
    .ep-hstat { padding: 10px 12px; }
    .ep-hstat-val { font-size: 20px; }
  }

  @media (max-width: 480px) {
    .ep-grid4  { grid-template-columns: 1fr; }
    .ep-stats4 { grid-template-columns: 1fr 1fr; }
    .ep-week-grid { grid-template-columns: repeat(3,1fr); }
    .ep-content { padding: 10px 10px; }
    .ep-grade-hero { padding: 14px 12px; }
    .ep-gh-title { font-size: 18px; }
    .ep-tgrid { grid-template-columns: 1fr; }

    /* Modals full-screen on tiny phones */
    .ep-overlay { padding: 0; align-items: flex-end; }
    .ep-modal { border-radius: 16px 16px 0 0; max-height: 90vh; overflow-y: auto; }
  }
`;

// ─── PORTAL TaskCard ──────────────────────────────────────────────────────────
const STAGE_BADGE = {
  S1:{ bg:"#EDE9FE", color:"#7C3AED" },
  S2:{ bg:"#DBEAFE", color:"#1D4ED8" },
  S3:{ bg:"#FEF3C7", color:"#B45309" },
  S4:{ bg:"#D1FAE5", color:"#065F46" },
};

// ─── Non-SMM Submit Modal ──────────────────────────────────────────────────────
function NonSMMSubmitModal({ task, onClose, onSubmit, submitting }) {
  const [notes, setNotes] = useState("");
  return (
    <div className="ep-overlay" onClick={onClose}>
      <div className="ep-modal" style={{ maxWidth:480 }} onClick={e => e.stopPropagation()}>
        <div className="ep-modal-hd">
          <div className="ep-modal-title">✓ Submit for Approval</div>
          <button className="ep-btn ep-btn-ghost ep-btn-sm" onClick={onClose}>✕</button>
        </div>
        <div style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:10, padding:14, marginBottom:14 }}>
          <div style={{ fontSize:13.5, fontWeight:600, marginBottom:4, color:"#1e293b" }}>{task.title || task.nomenclature}</div>
          {task.brandId && <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>{task.brandId.name}</div>}
        </div>
        <div className="ep-form-g">
          <label className="ep-label">Notes for Admin (optional)</label>
          <textarea className="ep-textarea" rows={3} placeholder="Describe what you've completed, links, or any context for the admin…"
            value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
        <div style={{ fontSize:12, color:"#64748b", marginBottom:14, background:"rgba(99,102,241,.06)", border:"1px solid rgba(99,102,241,.2)", borderRadius:8, padding:"10px 14px", lineHeight:1.55 }}>
          <strong>After submission:</strong> Admin will review and either approve the task (marks it Completed) or request revisions.
        </div>
        <div style={{ display:"flex", justifyContent:"flex-end", gap:8 }}>
          <button className="ep-btn ep-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="ep-btn ep-btn-primary" onClick={() => onSubmit(notes)} disabled={submitting}>
            {submitting ? "Submitting…" : "Submit for Approval ✓"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Non-SMM Detail Modal ─────────────────────────────────────────────────────
const PRIORITY_META_D = { low:["#F1F5F9","#64748B"], medium:["#EFF6FF","#1D4ED8"], high:["#FFFBEB","#B45309"], urgent:["#FEF2F2","#DC2626"] };
const STATUS_META_D   = { todo:["#F1F5F9","#64748B","To Do"], in_progress:["#EFF6FF","#1D4ED8","In Progress"], review:["#FFFBEB","#B45309","In Review"], completed:["#ECFDF5","#15803D","Completed"], blocked:["#FEF2F2","#DC2626","Rejected"] };

function NonSMMDetailModal({ task, onClose, onSubmit }) {
  if (!task) return null;
  const tags       = task.tags || [];
  const isSeo      = tags.includes("seo");
  const isAds      = tags.includes("ads");
  const isBranding = tags.includes("branding");
  const seoCat     = task.seoCategory;
  const SEO_CAT_LABELS = { blog:"Blog Post", technical:"Technical SEO", onpage:"On-Page", offpage:"Off-Page", backlinks:"Backlinks" };
  let catLabel = "General Task", catColor = "#64748B", catBg = "#F1F5F9", catIcon = "bi-file-earmark";
  if (seoCat && SEO_CAT_LABELS[seoCat]) { catLabel = SEO_CAT_LABELS[seoCat]; catBg = "#EFF6FF"; catColor = "#1D4ED8"; catIcon = "bi-search"; }
  else if (isSeo)      { catLabel = "SEO Task";      catBg = "#ECFDF5"; catColor = "#15803D"; catIcon = "bi-search"; }
  else if (isAds)      { catLabel = "Ads Task";      catBg = "#FFFBEB"; catColor = "#B45309"; catIcon = "bi-megaphone"; }
  else if (isBranding) { catLabel = "Branding Task"; catBg = "#FDF2F8"; catColor = "#BE185D"; catIcon = "bi-palette"; }

  const [priorityBg, priorityColor] = PRIORITY_META_D[task.priority] || PRIORITY_META_D.medium;
  const [statusBg, statusColor, statusLabel] = STATUS_META_D[task.status] || STATUS_META_D.todo;
  const canSubmit = !["review","completed"].includes(task.status);

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:"#fff", borderRadius:16, width:"100%", maxWidth:520, maxHeight:"88vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,.18)" }}>
        {/* Header */}
        <div style={{ padding:"18px 20px 14px", borderBottom:"1px solid #F1F5F9", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div style={{ flex:1, paddingRight:12 }}>
            <div style={{ fontWeight:800, fontSize:15, color:"#1E293B", lineHeight:1.4, marginBottom:8 }}>{task.title || "—"}</div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20, background:catBg, color:catColor }}>
                <i className={`bi ${catIcon}`} style={{ marginRight:3 }} />{catLabel}
              </span>
              <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20, background:statusBg, color:statusColor }}>
                {statusLabel}
              </span>
              <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20, background:priorityBg, color:priorityColor, textTransform:"capitalize" }}>
                {task.priority || "medium"} priority
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ border:"none", background:"#F1F5F9", borderRadius:8, width:30, height:30, cursor:"pointer", fontSize:14, flexShrink:0 }}>
            <i className="bi bi-x" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding:20, display:"flex", flexDirection:"column", gap:14 }}>
          {/* Meta row */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px 20px" }}>
            {task.dueDate && (
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", marginBottom:4 }}>Due Date</div>
                <div style={{ fontSize:13, fontWeight:600, color: isOverdue(task.dueDate) && task.status!=="completed" ? "#DC2626" : "#1E293B" }}>
                  <i className="bi bi-calendar3 me-1" style={{ color:"#94A3B8" }} />{fmtD(task.dueDate)}
                  {isOverdue(task.dueDate) && task.status!=="completed" && <span style={{ color:"#DC2626", fontSize:11 }}> · Overdue</span>}
                </div>
              </div>
            )}
            {task.estimatedHours && (
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", marginBottom:4 }}>Est. Hours</div>
                <div style={{ fontSize:13, fontWeight:600 }}><i className="bi bi-clock me-1" style={{ color:"#94A3B8" }} />{task.estimatedHours}h</div>
              </div>
            )}
            {task.brandId && (
              <div>
                <div style={{ fontSize:10, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", marginBottom:4 }}>Brand</div>
                <div style={{ fontSize:13, fontWeight:600, color:task.brandId.color||"#5A57FB" }}>{task.brandId.name}</div>
              </div>
            )}
          </div>

          {task.description && (
            <div>
              <div style={{ fontSize:10, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", marginBottom:6 }}>Description</div>
              <div style={{ fontSize:13, color:"#374151", background:"#F8FAFC", borderRadius:8, padding:"12px 14px", lineHeight:1.7, whiteSpace:"pre-wrap", maxHeight:160, overflowY:"auto", border:"1px solid #E2E8F0" }}>
                {task.description}
              </div>
            </div>
          )}

          {task.referenceLink && (
            <div>
              <div style={{ fontSize:10, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", marginBottom:6 }}>Reference Link</div>
              <a href={task.referenceLink} target="_blank" rel="noopener noreferrer"
                style={{ fontSize:12, color:"#4F46E5", display:"inline-flex", alignItems:"center", gap:6, background:"#EEF2FF", padding:"7px 12px", borderRadius:8, textDecoration:"none", wordBreak:"break-all" }}>
                <i className="bi bi-link-45deg" /> {task.referenceLink}
              </a>
            </div>
          )}

          {tags.filter(t => !["seo","ads","branding"].includes(t)).length > 0 && (
            <div>
              <div style={{ fontSize:10, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", marginBottom:6 }}>Tags</div>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {tags.filter(t => !["seo","ads","branding"].includes(t)).map(t => (
                  <span key={t} style={{ fontSize:11, fontWeight:600, padding:"3px 10px", borderRadius:20, background:"#F1F5F9", color:"#475569" }}>{t}</span>
                ))}
              </div>
            </div>
          )}

          {task.reviewNote && task.status === "blocked" && (
            <div>
              <div style={{ fontSize:10, fontWeight:700, color:"#DC2626", textTransform:"uppercase", marginBottom:6 }}>Revision Requested</div>
              <div style={{ fontSize:12.5, color:"#1E293B", background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:8, padding:"10px 12px", lineHeight:1.6 }}>
                {task.reviewNote}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {canSubmit && onSubmit && (
          <div style={{ padding:"14px 20px", borderTop:"1px solid #F1F5F9", display:"flex", justifyContent:"flex-end", gap:10 }}>
            <button onClick={onClose} style={{ padding:"8px 18px", borderRadius:8, border:"1px solid #E2E8F0", background:"transparent", color:"#64748B", fontWeight:600, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
              Close
            </button>
            <button onClick={() => { onClose(); onSubmit(task); }}
              style={{ padding:"8px 20px", borderRadius:8, border:"none", background:"#5A57FB", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:7 }}>
              <i className="bi bi-send-fill" /> Submit for Approval
            </button>
          </div>
        )}
        {!canSubmit && (
          <div style={{ padding:"14px 20px", borderTop:"1px solid #F1F5F9", display:"flex", justifyContent:"flex-end" }}>
            <button onClick={onClose} style={{ padding:"8px 18px", borderRadius:8, border:"1px solid #E2E8F0", background:"transparent", color:"#64748B", fontWeight:600, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Non-SMM Task Card (SEO / Ads / Branding / General) ───────────────────────
function NonSMMCard({ task, onOpenModal, onViewDetail }) {
  const [showModal,  setShowModal]  = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localTask,  setLocalTask]  = useState(task);
  useEffect(() => { setLocalTask(task); }, [task]);

  // If parent provides a lifted handler use it (avoids stacking-context bug)
  const openModal  = onOpenModal  ? () => onOpenModal(localTask)  : () => setShowModal(true);
  const viewDetail = onViewDetail ? () => onViewDetail(localTask) : null;

  const tags       = localTask.tags || [];
  const isSeo      = tags.includes("seo");
  const isAds      = tags.includes("ads");
  const isBranding = tags.includes("branding");
  const seoCat     = localTask.seoCategory;

  const SEO_CAT_LABELS = { blog:"Blog Post", technical:"Technical SEO", onpage:"On-Page", offpage:"Off-Page", backlinks:"Backlinks" };
  const SEO_CAT_COLORS = { blog:["#EEF2FF","#6366F1"], technical:["#FEF2F2","#EF4444"], onpage:["#EFF6FF","#3B82F6"], offpage:["#FFFBEB","#F59E0B"], backlinks:["#ECFDF5","#10B981"] };

  let catLabel = "Task", catBg = "#F1F5F9", catColor = "#64748B", catIcon = "bi-file-earmark";
  if (seoCat && SEO_CAT_LABELS[seoCat]) {
    catLabel = SEO_CAT_LABELS[seoCat];
    [catBg, catColor] = SEO_CAT_COLORS[seoCat] || ["#EEF2FF","#6366F1"];
    catIcon = { blog:"bi-file-text", technical:"bi-code-slash", onpage:"bi-file-earmark-richtext", offpage:"bi-link-45deg", backlinks:"bi-arrow-left-right" }[seoCat] || "bi-search";
  } else if (isSeo)      { catLabel = "SEO Task";      catBg = "#D1FAE5"; catColor = "#065F46"; catIcon = "bi-search"; }
  else if (isAds)        { catLabel = "Ads Task";      catBg = "#FFFBEB"; catColor = "#B45309"; catIcon = "bi-megaphone"; }
  else if (isBranding)   { catLabel = "Branding Task"; catBg = "#FDF2F8"; catColor = "#BE185D"; catIcon = "bi-palette"; }

  const brandColor = localTask.brandId?.color || "#5A57FB";
  const dl         = getDeadlineInfo(localTask);
  const status     = localTask.status;

  async function doSubmit(notes) {
    setSubmitting(true);
    try {
      const r = await fetch(`/api/employee/tasks/${localTask._id}`, {
        method: "PATCH", headers: authH(),
        body: JSON.stringify({ status: "review", reviewNote: notes || "" }),
      });
      const d = await r.json();
      if (d.success) {
        toast.success("Submitted for approval!");
        setLocalTask(prev => ({ ...prev, status: "review", reviewNote: notes || "" }));
        setShowModal(false);
      } else toast.error(d.message || "Submission failed");
    } catch { toast.error("Network error"); }
    finally { setSubmitting(false); }
  }

  return (
    <div className={`ep-tcard ${dl?.urgent ? "urgent" : dl?.today ? "today-card" : ""}`} style={{ display:"flex", flexDirection:"column" }}>
      {/* Header row */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
        <span style={{ fontFamily:"monospace", fontSize:11, color:"#94A3B8" }}>#{localTask._id?.slice(-4)}</span>
        {localTask.brandId && (
          <span style={{ padding:"3px 9px", borderRadius:20, background:brandColor+"20", color:brandColor, fontSize:10.5, fontWeight:700, maxWidth:120, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {localTask.brandId.name}
          </span>
        )}
      </div>

      {/* Title — clickable to open details */}
      <div
        onClick={viewDetail}
        style={{ fontSize:14, fontWeight:600, lineHeight:1.4, marginBottom:10, color:"#1e293b", flex:1, cursor: viewDetail ? "pointer" : "default" }}
      >
        {localTask.title || localTask.nomenclature}
        {viewDetail && <i className="bi bi-arrow-up-right" style={{ fontSize:10, marginLeft:5, color:"#94A3B8" }} />}
      </div>

      {/* Category + Due Date badges */}
      <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:14, flexWrap:"wrap" }}>
        <span style={{ padding:"3px 10px", borderRadius:20, background:catBg, fontSize:11, fontWeight:700, color:catColor, display:"flex", alignItems:"center", gap:4 }}>
          <i className={`bi ${catIcon}`} style={{ fontSize:10 }} />{catLabel}
        </span>
        {dl && (
          <span style={{ display:"inline-flex", flexDirection:"column", gap:1 }}>
            <span style={{ fontSize:11, color:dl.color, fontWeight:dl.urgent||dl.today?700:400, display:"inline-flex", alignItems:"center", gap:3 }}>
              <i className="bi bi-clock" style={{ fontSize:10 }} />{dl.text}
            </span>
            {dl.sub && <span style={{ fontSize:10, color:"#94a3b8" }}>{dl.sub}</span>}
          </span>
        )}
      </div>

      {/* Status / CTA */}
      {status === "completed" ? (
        <div style={{ width:"100%", padding:"10px", background:"rgba(34,197,94,.1)", color:"#16a34a", border:"1.5px solid rgba(34,197,94,.35)", borderRadius:9, fontWeight:700, fontSize:13, textAlign:"center" }}>
          ✓ Approved
        </div>
      ) : status === "review" ? (
        <div style={{ width:"100%", padding:"10px", background:"rgba(245,158,11,.08)", color:"#D97706", border:"1.5px solid rgba(245,158,11,.3)", borderRadius:9, fontWeight:700, fontSize:13, textAlign:"center" }}>
          👁 Pending Review
        </div>
      ) : status === "blocked" ? (
        <div>
          <div style={{ padding:"8px 12px", background:"#fef2f2", border:"1.5px solid #fecaca", borderRadius:"9px 9px 0 0", color:"#dc2626", fontSize:11.5, fontWeight:600, lineHeight:1.45 }}>
            ✕ Revision Requested{localTask.reviewNote ? ` — ${localTask.reviewNote}` : ""}
          </div>
          <button onClick={openModal} disabled={submitting}
            style={{ width:"100%", padding:"9px", background:"#dc2626", color:"#fff", border:"none", borderRadius:"0 0 9px 9px", fontWeight:700, fontSize:12.5, cursor:"pointer", fontFamily:"inherit" }}>
            Resubmit for Approval
          </button>
        </div>
      ) : (
        <button onClick={openModal} disabled={submitting}
          style={{ width:"100%", padding:"10px", background:"#5A57FB", color:"#fff", border:"none", borderRadius:9, fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
          Submit for Approval
        </button>
      )}

      {/* Only render inline modal when no parent handler (fallback) */}
      {!onOpenModal && showModal && (
        <NonSMMSubmitModal task={localTask} onClose={() => setShowModal(false)} onSubmit={doSubmit} submitting={submitting} />
      )}
    </div>
  );
}

// ─── Production Task Card (Social Media stages) ────────────────────────────────
function PTaskCard({ task, onSubmit, onNonSMMSubmit, onNonSMMDetail, empId }) {
  // Non-production tasks (SEO, Ads, Branding, General) use the simpler NonSMMCard
  if (task.taskType !== "production") return <NonSMMCard task={task} onOpenModal={onNonSMMSubmit} onViewDetail={onNonSMMDetail} />;

  const toArr      = (v) => Array.isArray(v) ? v : (v ? [v] : []);
  const stagesArr  = ["S1","S2","S3","S4"];
  const curIdx     = stagesArr.indexOf(task.stage);
  const brandColor = task.brandId?.color || "#5A57FB";

  const myStageIdx = empId
    ? (task.stages || []).findIndex(s =>
        toArr(s.assignedTo).some(a => {
          const aid = a?._id ? String(a._id) : String(a || "");
          return aid === String(empId);
        })
      )
    : -1;

  const myStage        = myStageIdx >= 0 ? task.stages[myStageIdx] : null;
  const submitStageKey = myStageIdx >= 0 ? stagesArr[myStageIdx] : (task.stage || "S1");
  const submitStageNum = myStageIdx >= 0 ? myStageIdx + 1 : (STAGE_NUM[task.stage] || "");

  // Prefer stage-level deadline, fall back to task dueDate
  const deadlineSrc = (myStageIdx >= 0 && myStage?.deadline) ? myStage.deadline : task.dueDate;
  const dl          = getDeadlineInfo({ ...task, dueDate: deadlineSrc });

  const hasClientFeedback = task.status === "todo" && task.reviewNote && task.reviewNote.trim();
  const isRejected = !hasClientFeedback && myStageIdx >= 0 && myStage?.rejected === true;
  const isDone     = !isRejected && !hasClientFeedback && (myStageIdx >= 0
    ? (myStage?.done === true || curIdx > myStageIdx)
    : task.status === "completed");

  const barIdx = myStageIdx >= 0 ? myStageIdx : curIdx;
  const sbadge = STAGE_BADGE[submitStageKey] || STAGE_BADGE.S1;
  const barColor = isDone ? "#22c55e" : isRejected ? "#ef4444" : hasClientFeedback ? "#f59e0b" : "#f5a623";

  return (
    <div className={`ep-tcard ${isRejected ? "rejected-card" : dl?.urgent ? "urgent" : dl?.today ? "today-card" : ""}`}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
        <span style={{ fontFamily:"monospace", fontSize:11, color:"#64748b" }}>#{task._id?.slice(-4)}</span>
        {task.brandId && (
          <span style={{ padding:"3px 9px", borderRadius:20, background:brandColor+"20", color:brandColor, fontSize:10.5, fontWeight:700 }}>
            {task.brandId.name}
          </span>
        )}
      </div>
      <div style={{ fontSize:14, fontWeight:600, lineHeight:1.4, marginBottom:12, color:"#1e293b" }}>
        {task.nomenclature || task.title}
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12, flexWrap:"wrap" }}>
        <span style={{ padding:"3px 10px", borderRadius:20, background:sbadge.bg, fontSize:11, fontWeight:600, color:sbadge.color }}>
          Stage {submitStageNum} · {STAGE_LABEL[submitStageKey]}
        </span>

        {/* Stage status badge — approved / pending review / deadline */}
        {myStage?.approved ? (
          <span style={{ fontSize:11, fontWeight:700, color:"#15803d", display:"inline-flex", alignItems:"center", gap:3 }}>
            <i className="bi bi-check-circle-fill" style={{ fontSize:11 }} /> Approved
          </span>
        ) : myStage?.done && !myStage?.rejected ? (
          <span style={{ fontSize:11, fontWeight:600, color:"#b45309", display:"inline-flex", alignItems:"center", gap:3 }}>
            <i className="bi bi-hourglass-split" style={{ fontSize:10 }} /> Pending Review
          </span>
        ) : dl ? (
          <span style={{ display:"inline-flex", flexDirection:"column", gap:1 }}>
            <span style={{ fontSize:11, color:dl.color, fontWeight:dl.urgent||dl.today?700:500, display:"inline-flex", alignItems:"center", gap:3 }}>
              <i className="bi bi-clock" style={{ fontSize:10 }} />
              {dl.text}
            </span>
            {dl.sub && <span style={{ fontSize:10, color:"#94a3b8" }}>{dl.sub}</span>}
          </span>
        ) : null}
      </div>
      <div style={{ display:"flex", gap:4, marginBottom:14 }}>
        {stagesArr.map((s,i) => (
          <div key={s} style={{ flex:1, height:5, borderRadius:3,
            background: i<barIdx ? "#22c55e" : i===barIdx ? barColor : "#e2e8f0" }} />
        ))}
      </div>
      {hasClientFeedback ? (
        <div>
          <div style={{ padding:"8px 12px", background:"#fffbeb", border:"1px solid #fde68a", borderRadius:"8px 8px 0 0" }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#92400e", marginBottom:4, display:"flex", alignItems:"center", gap:5 }}>
              <i className="bi bi-chat-left-text-fill" /> Client Requested Changes
            </div>
            <div style={{ fontSize:11.5, color:"#78350f", lineHeight:1.5, whiteSpace:"pre-wrap", maxHeight:60, overflowY:"auto" }}>
              {task.reviewNote}
            </div>
          </div>
          <button onClick={() => onSubmit(task, submitStageKey)}
            style={{ width:"100%", padding:"9px", background:"#f59e0b", color:"#fff", border:"none", borderRadius:"0 0 8px 8px", fontWeight:700, fontSize:12.5, cursor:"pointer", fontFamily:"inherit" }}>
            Revise &amp; Resubmit Stage {submitStageNum}
          </button>
        </div>
      ) : isRejected ? (
        <div>
          <div style={{ padding:"8px 12px", background:"#fef2f2", border:"1px solid #fecaca", borderRadius:"8px 8px 0 0", color:"#dc2626", fontSize:11.5, fontWeight:600 }}>
            ✕ Rejected{myStage?.rejectReason ? ` — ${myStage.rejectReason}` : " — Admin requested revision"}
          </div>
          <button onClick={() => onSubmit(task, submitStageKey)}
            style={{ width:"100%", padding:"9px", background:"#dc2626", color:"#fff", border:"none", borderRadius:"0 0 8px 8px", fontWeight:700, fontSize:12.5, cursor:"pointer", fontFamily:"inherit" }}>
            Resubmit Stage {submitStageNum} ✓
          </button>
        </div>
      ) : isDone ? (
        <div style={{ width:"100%", padding:"10px", background:"rgba(34,197,94,.1)", color:"#16a34a", border:"1px solid rgba(34,197,94,.3)", borderRadius:8, fontWeight:600, fontSize:12.5, textAlign:"center" }}>
          ✓ Stage {submitStageNum} Done
        </div>
      ) : (
        <button onClick={() => onSubmit(task, submitStageKey)}
          style={{ width:"100%", padding:"10px", background:"#5A57FB", color:"#fff", border:"none", borderRadius:8, fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
          Submit Stage {submitStageNum} ✓
        </button>
      )}
    </div>
  );
}

// ─── PORTAL SubmitStageModal ──────────────────────────────────────────────────
function PSubmitModal({ task, stageKey, onClose, onSuccess }) {
  const [proofUrl,   setProofUrl]   = useState("");
  const [notes,      setNotes]      = useState("");
  const [submitting, setSubmitting] = useState(false);
  const effectiveStage = stageKey || task.stage || "S1";
  const nextStage = NEXT_STAGE[effectiveStage] || effectiveStage;
  const nextNum   = STAGE_NUM[nextStage] || "";

  // Determine if this submission goes to client review or next internal stage
  const STAGE_IDX_MAP = { S1: 0, S2: 1, S3: 2, S4: 3 };
  const nextIdx = STAGE_IDX_MAP[nextStage];
  const nextEntry = task.stages?.[nextIdx];
  const nextHasAssignee = nextEntry && Array.isArray(nextEntry.assignedTo) && nextEntry.assignedTo.length > 0;
  const goesToClientReview = nextStage === "S4" || !nextHasAssignee;

  async function handleSubmit() {
    if (!proofUrl.trim()) { toast.warn("Please enter a Proof URL"); return; }
    setSubmitting(true);
    try {
      const r = await fetch("/api/employee/stage-submit", {
        method: "POST", headers: authH(),
        body: JSON.stringify({ taskId: task._id, proofUrl: proofUrl.trim(), notes, stageKey: effectiveStage }),
      });
      const d = await r.json();
      if (d.success) { toast.success("Stage submitted!"); onSuccess(d.task); }
      else toast.error(d.message || "Submission failed");
    } catch { toast.error("Network error"); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="ep-overlay" onClick={onClose}>
      <div className="ep-modal" style={{ maxWidth:520 }} onClick={e => e.stopPropagation()}>
        <div className="ep-modal-hd">
          <div className="ep-modal-title">✓ Submit Stage Completion</div>
          <button className="ep-btn ep-btn-ghost ep-btn-sm" onClick={onClose}>✕</button>
        </div>
        {goesToClientReview ? (
          <div style={{ background:"rgba(22,163,74,.08)", border:"1px solid rgba(22,163,74,.3)", borderRadius:9, padding:"11px 16px", display:"flex", alignItems:"center", gap:11, marginBottom:14 }}>
            <span style={{ fontSize:16 }}>🚀</span>
            <div style={{ fontSize:12.5, color:"#15803D" }}><strong>This goes directly to client approval.</strong> Once you submit, the client will see it in their portal.</div>
          </div>
        ) : (
          <div style={{ background:"rgba(59,130,246,.06)", border:"1px solid rgba(59,130,246,.2)", borderRadius:9, padding:"11px 16px", display:"flex", alignItems:"center", gap:11, marginBottom:14 }}>
            <span style={{ fontSize:16 }}>⚡</span>
            <div style={{ fontSize:12.5, color:"#475569" }}><strong>Auto-grading enabled.</strong> Moves to Stage {nextNum} after submission.</div>
          </div>
        )}
        <div style={{ background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:10, padding:14, marginBottom:14 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
            <span style={{ fontFamily:"monospace", fontSize:11, color:"#64748b" }}>#{task._id?.slice(-4)}</span>
            {task.brandId && (
              <span style={{ padding:"3px 9px", borderRadius:5, background:(task.brandId.color||"#f5a623")+"22", color:task.brandId.color||"#f5a623", fontSize:10.5, fontWeight:700 }}>
                {task.brandId.name}
              </span>
            )}
          </div>
          <div style={{ fontSize:13.5, fontWeight:600, marginBottom:6, color:"#1e293b" }}>{task.nomenclature || task.title}</div>
          <div style={{ fontSize:11, color:"#64748b" }}>
            Submitting: <strong style={{ color:"#b45309" }}>Stage {STAGE_NUM[effectiveStage]} — {STAGE_LABEL[effectiveStage]}</strong>
          </div>
        </div>
        <div className="ep-form-g">
          <label className="ep-label">Stage Completed</label>
          <select className="ep-select">
            <option>Stage {STAGE_NUM[effectiveStage]} — {STAGE_LABEL[effectiveStage]} (auto-detected)</option>
          </select>
        </div>
        <div className="ep-form-g">
          <label className="ep-label">Proof URL <span style={{ color:"#ef4444" }}>*</span></label>
          <input className="ep-input" placeholder="https://drive.google.com/… or delivery link"
            value={proofUrl} onChange={e => setProofUrl(e.target.value)} />
          <div style={{ fontSize:10.5, color:"#64748b", marginTop:4 }}>Drive, Figma, Instagram, or any delivery URL</div>
        </div>
        <div className="ep-form-g">
          <label className="ep-label">Notes (optional)</label>
          <textarea className="ep-textarea" rows={3} placeholder="Anything the next stage should know?"
            value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
        <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:4 }}>
          <button className="ep-btn ep-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="ep-btn ep-btn-primary" onClick={handleSubmit} disabled={submitting||!proofUrl.trim()}
            style={{ background: goesToClientReview ? "linear-gradient(135deg,#16A34A,#15803D)" : undefined }}>
            {submitting ? "Submitting…" : goesToClientReview ? "✓ Submit for Client Review" : `✓ Submit & Move to Stage ${nextNum}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PORTAL TODAY VIEW ────────────────────────────────────────────────────────
function PortalTodayView({ emp, tasks, loading, empId }) {
  const [submitInfo,   setSubmitInfo]   = useState(null);
  const [nonSMMTask,   setNonSMMTask]   = useState(null);
  const [nonSMMSaving, setNonSMMSaving] = useState(false);
  const [detailTask,   setDetailTask]   = useState(null);
  const [time,         setTime]         = useState("");
  const [localTasks,   setLocalTasks]   = useState(tasks);
  useEffect(() => { setLocalTasks(tasks); }, [tasks]);

  async function handleNonSMMSubmit(notes) {
    setNonSMMSaving(true);
    try {
      const r = await fetch(`/api/employee/tasks/${nonSMMTask._id}`, {
        method: "PATCH", headers: authH(),
        body: JSON.stringify({ status: "review", reviewNote: notes || "" }),
      });
      const d = await r.json();
      if (d.success) {
        toast.success("Submitted for approval!");
        setLocalTasks(prev => prev.map(t => t._id === nonSMMTask._id ? { ...t, status: "review" } : t));
        setNonSMMTask(null);
      } else toast.error(d.message || "Submission failed");
    } catch { toast.error("Network error"); }
    finally { setNonSMMSaving(false); }
  }
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit", hour12:true }));
    tick(); const iv = setInterval(tick, 1000); return () => clearInterval(iv);
  }, []);

  const now      = new Date(); now.setHours(0,0,0,0);
  const overdue  = localTasks.filter(t => isOverdue(t.dueDate) && t.status !== "completed");
  const dueToday = localTasks.filter(t => isDueToday(t.dueDate) && t.status !== "completed");
  const doneWeek = localTasks.filter(t => t.status === "completed" && new Date(t.updatedAt) >= new Date(Date.now() - 7*86400000));
  const active   = localTasks.filter(t => t.status !== "completed");
  const upcoming = localTasks.filter(t => {
    if (!t.dueDate || t.status === "completed") return false;
    const d = new Date(t.dueDate); d.setHours(0,0,0,0);
    const diff = Math.round((d - now) / 86400000);
    return diff > 0 && diff <= 7;
  });
  const grade      = calcGrade(localTasks);
  const todayTasks = [...new Map([...overdue, ...dueToday].map(t => [t._id, t])).values()];

  return (
    <div className="ep-content">
      <div className="ep-grade-hero">
        <div style={{ fontSize:13, color:"rgba(255,255,255,.6)", marginBottom:6 }}>{getGreeting()}, {emp?.firstName || "there"} 👋</div>
        <div className="ep-gh-title">
          {loading ? "Loading…" : <>You're at <span>{grade.letter}</span> this month</>}
        </div>
        <div style={{ fontSize:13, color:"rgba(255,255,255,.6)", marginTop:8, maxWidth:580, lineHeight:1.55 }}>
          You have <strong style={{ color:"#fff" }}>{todayTasks.length} task{todayTasks.length!==1?"s":""} today</strong>
          {overdue.length>0 && <> including <strong style={{ color:"#fca5a5" }}>{overdue.length} overdue</strong></>}.
          {" "}Submit on time to lock in your grade.
        </div>
        <div className="ep-stats4">
          {[
            { lbl:"Today's Tasks",  val:loading?"—":todayTasks.length, color:"#fff",       trend: overdue.length>0 ? <span style={{ color:"#fca5a5",fontSize:11 }}>{overdue.length} overdue</span> : null },
            { lbl:"Active Tasks",   val:loading?"—":active.length,     color:"#fff",       trend: <span style={{ color:"#fff",fontSize:11 }}>in progress</span> },
            { lbl:"On-Time Rate",   val:loading?"—":`${grade.rate}%`,  color:grade.color,  trend: <span style={{ color:grade.rate>=80?"#86efac":"#fcd34d",fontSize:11 }}>{grade.rate>=80?"↑ Good":"↓ Improve"}</span> },
            { lbl:"Done This Week", val:loading?"—":doneWeek.length,   color:"#86efac",    trend: <span style={{ color:"#fff",fontSize:11 }}>submissions</span> },
          ].map(s => (
            <div key={s.lbl} className="ep-hstat">
              <div style={{ fontSize:10, color:"#fff", textTransform:"uppercase", letterSpacing:".06em", fontWeight:600 }}>{s.lbl}</div>
              <div className="ep-hstat-val" style={{ color:s.color }}>{s.val}</div>
              <div className="ep-hstat-trend">{s.trend}</div>
            </div>
          ))}
        </div>
      </div>

      {!loading && overdue.length>0 && (
        <div className="ep-alert-banner" style={{ background:"rgba(239,68,68,.06)", border:"1px solid rgba(239,68,68,.3)" }}>
          <span style={{ fontSize:18, flexShrink:0 }}>⚠️</span>
          <div style={{ flex:1, fontSize:12.5, color:"#1e293b" }}>
            <strong>"{overdue[0].nomenclature||overdue[0].title}" is overdue.</strong>
            {overdue[0].brandId && ` ${overdue[0].brandId.name} needs this`} — submit now to minimize grade impact.
          </div>
          <button className="ep-btn ep-btn-ghost ep-btn-sm" onClick={() => setSubmitInfo({task:overdue[0],stageKey:null})}>Submit Now</button>
        </div>
      )}

      <div className="ep-sec-hd">
        <div className="ep-sec-title">📌 Today's Tasks <span className="ep-sec-count">{todayTasks.length}</span></div>
      </div>
      {loading ? <div className="ep-empty"><div className="ep-spinner" /></div>
        : todayTasks.length === 0 ? (
          <div className="ep-card" style={{ textAlign:"center", padding:"28px 20px", marginBottom:22 }}>
            <i className="bi bi-check2-all" style={{ fontSize:32, color:"#22c55e", display:"block", marginBottom:8 }} />
            <div style={{ color:"#64748b" }}>No tasks due today — you're all caught up!</div>
          </div>
        ) : (
          <div className="ep-tgrid" style={{ marginBottom:22 }}>
            {todayTasks.map(t => <PTaskCard key={t._id} task={t} onSubmit={(tk,sk)=>setSubmitInfo({task:tk,stageKey:sk})} onNonSMMSubmit={setNonSMMTask} onNonSMMDetail={setDetailTask} empId={empId} />)}
          </div>
        )
      }

      {upcoming.length>0 && (
        <>
          <div className="ep-sec-hd">
            <div className="ep-sec-title">📅 Coming Up This Week <span className="ep-sec-count">{upcoming.length}</span></div>
          </div>
          <div className="ep-tgrid" style={{ marginBottom:22 }}>
            {upcoming.slice(0,4).map(t => <PTaskCard key={t._id} task={t} onSubmit={(tk,sk)=>setSubmitInfo({task:tk,stageKey:sk})} onNonSMMSubmit={setNonSMMTask} onNonSMMDetail={setDetailTask} empId={empId} />)}
          </div>
        </>
      )}

      <div className="ep-perf-grid">
        <div className="ep-card">
          <div className="ep-card-title"><i className="bi bi-clock-history" style={{ color:"#f5a623" }} /> Recent Tasks</div>
          {localTasks.slice(0,5).map(t => {
            const od = isOverdue(t.dueDate) && t.status !== "completed";
            return (
              <div key={t._id} className="ep-rec-item">
                <div className="ep-rec-icon" style={{ background: t.status==="completed" ? "rgba(34,197,94,.15)" : od ? "rgba(239,68,68,.15)" : "rgba(245,166,35,.12)", color: t.status==="completed" ? "#22c55e" : od ? "#ef4444" : "#f5a623" }}>
                  {t.stage?.replace("S","") || "—"}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12.5, fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", color:"#111" }}>{t.nomenclature||t.title}</div>
                  <div style={{ fontSize:10.5, color:"#64748b", marginTop:2, display:"flex", alignItems:"center", gap:4 }}>
                    {t.brandId && <><span className="ep-brand-dot" style={{ background:t.brandId.color }} />{t.brandId.name} · </>}{fmtD(t.dueDate)}
                  </div>
                </div>
                <span style={{ display:"inline-flex", alignItems:"center", padding:"3px 8px", borderRadius:5, fontSize:11, fontWeight:600, whiteSpace:"nowrap", background:(STATUS_COLOR[t.status]||"#64748b")+"22", color:STATUS_COLOR[t.status]||"#64748b" }}>
                  {SL[t.status]||t.status}
                </span>
              </div>
            );
          })}
        </div>
        <div className="ep-grade-card">
          <div style={{ fontSize:11, color:"#64748b", textTransform:"uppercase", letterSpacing:".06em", fontWeight:600 }}>
            {new Date().toLocaleDateString("en-IN",{month:"long",year:"numeric"})} Grade
          </div>
          <div className="ep-grade-letter" style={{ color:grade.color, margin:"8px 0" }}>{loading ? "—" : grade.letter}</div>
          <div style={{ fontSize:11, color:"#64748b" }}>On-time rate: {grade.rate}%</div>
          <div className="ep-grade-bar">
            {[0,1,2,3,4].map(i => (
              <div key={i} className="ep-grade-bar-cell" style={{ background: i<Math.round(grade.rate/20) ? grade.color : "#1e2330" }} />
            ))}
          </div>
          <div style={{ fontSize:12, color:"#64748b", marginTop:14, lineHeight:1.5 }}>
            {grade.rate>=80 ? "Keep submitting on time to maintain your grade!" : grade.rate>=60 ? "Aim for on-time submissions to reach A this month." : "Focus on completing overdue tasks to boost your grade."}
          </div>
        </div>
      </div>

      {submitInfo && (
        <PSubmitModal task={submitInfo.task} stageKey={submitInfo.stageKey} onClose={() => setSubmitInfo(null)}
          onSuccess={updated => { setLocalTasks(prev => prev.map(t => t._id===updated._id?updated:t)); setSubmitInfo(null); }} />
      )}
      {nonSMMTask && (
        <NonSMMSubmitModal task={nonSMMTask} onClose={() => setNonSMMTask(null)} onSubmit={handleNonSMMSubmit} submitting={nonSMMSaving} />
      )}
      {detailTask && (
        <NonSMMDetailModal task={detailTask} onClose={() => setDetailTask(null)} onSubmit={t => { setDetailTask(null); setNonSMMTask(t); }} />
      )}
    </div>
  );
}

// ─── PORTAL MY TASKS VIEW ─────────────────────────────────────────────────────
function PortalMyTasksView({ tasks, loading, empId }) {
  const now = new Date();
  const [tab,          setTab]          = useState("all");
  const [search,       setSearch]       = useState("");
  const [filterYear,   setFilterYear]   = useState(now.getFullYear());
  const [filterMonth,  setFilterMonth]  = useState(now.getMonth()); // 0-indexed
  const [submitInfo,   setSubmitInfo]   = useState(null);
  const [nonSMMTask,   setNonSMMTask]   = useState(null);
  const [nonSMMSaving, setNonSMMSaving] = useState(false);
  const [detailTask,   setDetailTask]   = useState(null);
  const [localTasks,   setLocalTasks]   = useState(tasks);
  useEffect(() => { setLocalTasks(tasks); }, [tasks]);

  async function handleNonSMMSubmit(notes) {
    setNonSMMSaving(true);
    try {
      const r = await fetch(`/api/employee/tasks/${nonSMMTask._id}`, {
        method: "PATCH", headers: authH(),
        body: JSON.stringify({ status: "review", reviewNote: notes || "" }),
      });
      const d = await r.json();
      if (d.success) {
        toast.success("Submitted for approval!");
        setLocalTasks(prev => prev.map(t => t._id === nonSMMTask._id ? { ...t, status: "review" } : t));
        setNonSMMTask(null);
      } else toast.error(d.message || "Submission failed");
    } catch { toast.error("Network error"); }
    finally { setNonSMMSaving(false); }
  }

  function prevMonth() {
    if (filterMonth === 0) { setFilterMonth(11); setFilterYear(y => y - 1); }
    else setFilterMonth(m => m - 1);
  }
  function nextMonth() {
    if (filterMonth === 11) { setFilterMonth(0); setFilterYear(y => y + 1); }
    else setFilterMonth(m => m + 1);
  }
  const isCurrentMonth = filterYear === now.getFullYear() && filterMonth === now.getMonth();
  const monthLabel = new Date(filterYear, filterMonth, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  // Month-scoped tasks: dueDate falls in selected month, OR scheduledFor, OR createdAt as fallback
  const monthStart = new Date(filterYear, filterMonth, 1);
  const monthEnd   = new Date(filterYear, filterMonth + 1, 0, 23, 59, 59);
  function inSelectedMonth(t) {
    const d = t.dueDate || t.scheduledFor || t.createdAt;
    if (!d) return true;
    const dt = new Date(d);
    return dt >= monthStart && dt <= monthEnd;
  }

  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  const weekEnd    = new Date(todayStart); weekEnd.setDate(todayStart.getDate() + 7);

  // Base: month-filtered tasks
  const monthTasks = localTasks.filter(inSelectedMonth);

  const byTab = monthTasks.filter(t => {
    if (tab === "today")    return isDueToday(t.dueDate);
    if (tab === "week")     { const d = t.dueDate ? new Date(t.dueDate) : null; return d && d >= todayStart && d <= weekEnd; }
    if (tab === "overdue")  return isOverdue(t.dueDate) && t.status !== "completed";
    if (tab === "rejected") return (t.stages||[]).some(s => s.rejected === true && !s.done);
    return true;
  });

  const filtered = byTab.filter(t => {
    if (search) {
      const s = search.toLowerCase();
      return (t.nomenclature||t.title||"").toLowerCase().includes(s) || (t.brandId?.name||"").toLowerCase().includes(s);
    }
    return true;
  });

  const counts = {
    all:      monthTasks.length,
    today:    monthTasks.filter(t => isDueToday(t.dueDate)).length,
    week:     monthTasks.filter(t => { const d = t.dueDate ? new Date(t.dueDate) : null; return d && d >= todayStart && d <= weekEnd; }).length,
    overdue:  monthTasks.filter(t => isOverdue(t.dueDate) && t.status !== "completed").length,
    rejected: monthTasks.filter(t => (t.stages||[]).some(s => s.rejected)).length,
  };

  const TABS = [
    { key:"all",      label:"All" },
    { key:"today",    label:"Today" },
    { key:"week",     label:"This Week" },
    { key:"overdue",  label:"Overdue" },
    { key:"rejected", label:"Rejected" },
  ];

  return (
    <div className="ep-content">
      {/* Month picker */}
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14, background:"#fff", border:"1px solid #e2e8f0", borderRadius:10, padding:"8px 14px", width:"fit-content" }}>
        <button onClick={prevMonth} style={{ background:"none", border:"none", cursor:"pointer", color:"#64748b", padding:"2px 6px", borderRadius:6, fontSize:16, lineHeight:1 }}>‹</button>
        <span style={{ fontSize:13, fontWeight:700, color:"#1e293b", minWidth:130, textAlign:"center" }}>{monthLabel}</span>
        <button onClick={nextMonth} disabled={isCurrentMonth} style={{ background:"none", border:"none", cursor: isCurrentMonth ? "default" : "pointer", color: isCurrentMonth ? "#cbd5e1" : "#64748b", padding:"2px 6px", borderRadius:6, fontSize:16, lineHeight:1 }}>›</button>
        {!isCurrentMonth && (
          <button onClick={() => { setFilterYear(now.getFullYear()); setFilterMonth(now.getMonth()); }}
            style={{ marginLeft:4, padding:"3px 10px", borderRadius:20, border:"1px solid #e2e8f0", background:"#f8fafc", color:"#5A57FB", fontSize:11, fontWeight:700, cursor:"pointer" }}>
            Today
          </button>
        )}
      </div>

      {/* Tab row */}
      <div style={{ display:"flex", gap:6, marginBottom:16, flexWrap:"wrap" }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding:"6px 16px", borderRadius:20, border:"1px solid", fontSize:12.5, fontWeight:600, cursor:"pointer", fontFamily:"inherit",
              background: tab===t.key ? "#5A57FB" : "#fff",
              color:      tab===t.key ? "#fff"    : "#64748b",
              borderColor:tab===t.key ? "#5A57FB" : "#e2e8f0",
            }}>
            {t.label}{counts[t.key] > 0 ? ` (${counts[t.key]})` : ""}
          </button>
        ))}
        <div style={{ flex:1, minWidth:160 }}>
          <input className="ep-input" style={{ padding:"6px 12px", height:"auto" }} placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>
      {loading ? <div className="ep-empty"><div className="ep-spinner" /></div>
        : (
          <div className="ep-tgrid">
            {filtered.length === 0
              ? <div className="ep-empty" style={{ gridColumn:"1/-1" }}><i className="bi bi-inbox" /><p>No tasks found</p></div>
              : filtered.map(t => <PTaskCard key={t._id} task={t}
                  onSubmit={(tk,sk)=>setSubmitInfo({task:tk,stageKey:sk})}
                  onNonSMMSubmit={setNonSMMTask}
                  onNonSMMDetail={setDetailTask}
                  empId={empId} />)
            }
          </div>
        )
      }
      {submitInfo && (
        <PSubmitModal task={submitInfo.task} stageKey={submitInfo.stageKey} onClose={() => setSubmitInfo(null)}
          onSuccess={updated => { setLocalTasks(prev => prev.map(t => t._id===updated._id?updated:t)); setSubmitInfo(null); }} />
      )}
      {nonSMMTask && (
        <NonSMMSubmitModal task={nonSMMTask} onClose={() => setNonSMMTask(null)} onSubmit={handleNonSMMSubmit} submitting={nonSMMSaving} />
      )}
      {detailTask && (
        <NonSMMDetailModal task={detailTask} onClose={() => setDetailTask(null)} onSubmit={t => { setDetailTask(null); setNonSMMTask(t); }} />
      )}
    </div>
  );
}

// ─── PORTAL THIS WEEK VIEW ────────────────────────────────────────────────────
function PortalThisWeekView({ tasks, loading, empId }) {
  const [submitInfo,      setSubmitInfo]      = useState(null);
  const [nonSMMTask,      setNonSMMTask]      = useState(null);
  const [nonSMMSaving,    setNonSMMSaving]    = useState(false);
  const [detailTask,      setDetailTask]      = useState(null);
  const [localTasks,      setLocalTasks]      = useState(tasks);
  const [weekOffset,      setWeekOffset]      = useState(0);
  const [contentTasks,    setContentTasks]    = useState([]);
  const [contentLoading,  setContentLoading]  = useState(true);
  const [brands,          setBrands]          = useState([]);
  const [brandFilter,     setBrandFilter]     = useState("");
  const [selectedContent, setSelectedContent] = useState(null);

  useEffect(() => { setLocalTasks(tasks); }, [tasks]);

  const today   = new Date(); today.setHours(0,0,0,0);
  const dow     = today.getDay();
  const monday  = new Date(today);
  monday.setDate(today.getDate() - (dow===0 ? 6 : dow-1) + weekOffset * 7);
  const days    = Array.from({length:7},(_,i)=>{ const d=new Date(monday); d.setDate(monday.getDate()+i); return d; });
  const sunday  = days[6];
  const DAY_NAMES = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

  // Fetch approved content tasks for the current week
  useEffect(() => {
    setContentLoading(true);
    const start = new Date(monday); start.setHours(0,0,0,0);
    const end   = new Date(sunday); end.setHours(23,59,59,999);
    const q = new URLSearchParams({ dateStart: start.toISOString(), dateEnd: end.toISOString() });
    if (brandFilter) q.set("brandId", brandFilter);
    fetch(`/api/employee/brand-tasks?${q}`, { headers: authH() })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setContentTasks(d.tasks || []);
          const seen = new Set(); const bs = [];
          (d.tasks || []).forEach(t => {
            if (t.brandId && !seen.has(t.brandId._id)) { seen.add(t.brandId._id); bs.push(t.brandId); }
          });
          setBrands(prev => {
            const all = [...prev, ...bs];
            return [...new Map(all.map(b => [b._id, b])).values()];
          });
        }
      })
      .catch(console.error)
      .finally(() => setContentLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset, brandFilter]);

  function getTaskDate(t) {
    if (t.scheduledFor) return new Date(t.scheduledFor);
    if (t.dueDate)      return new Date(t.dueDate);
    const s1 = t.stages?.[0];
    if (s1?.deadline)  return new Date(s1.deadline);
    if (s1?.doneAt)    return new Date(s1.doneAt);
    if (t.submittedAt) return new Date(t.submittedAt);
    if (t.updatedAt)   return new Date(t.updatedAt);
    if (t.createdAt)   return new Date(t.createdAt);
    return null;
  }

  function dayContentTasks(day) {
    return contentTasks.filter(t => {
      const d = getTaskDate(t);
      if (!d) return false;
      const dc = new Date(d); dc.setHours(0,0,0,0);
      return dc.getTime() === day.getTime();
    });
  }

  async function handleNonSMMSubmit(notes) {
    setNonSMMSaving(true);
    try {
      const r = await fetch(`/api/employee/tasks/${nonSMMTask._id}`, {
        method: "PATCH", headers: authH(),
        body: JSON.stringify({ status: "review", reviewNote: notes || "" }),
      });
      const d = await r.json();
      if (d.success) {
        toast.success("Submitted for approval!");
        setLocalTasks(prev => prev.map(t => t._id === nonSMMTask._id ? { ...t, status: "review" } : t));
        setNonSMMTask(null);
      } else toast.error(d.message || "Submission failed");
    } catch { toast.error("Network error"); }
    finally { setNonSMMSaving(false); }
  }

  const activeTasks    = localTasks.filter(t => t.status !== "completed");
  const isCurrentWeek  = weekOffset === 0;
  const weekLabel      = `${monday.toLocaleDateString("en-IN",{day:"numeric",month:"short"})} — ${sunday.toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}`;

  const STATUS_STYLE = {
    todo:        { label:"To Do",       bg:"#1e2330", color:"#94a3b8" },
    in_progress: { label:"In Progress", bg:"#1e3a5f", color:"#60a5fa" },
    review:      { label:"Review",      bg:"#3b2a00", color:"#fbbf24" },
    completed:   { label:"Done",        bg:"#052e16", color:"#4ade80" },
    blocked:     { label:"Rejected",    bg:"#3b0a0a", color:"#f87171" },
  };

  return (
    <div className="ep-content">
      {/* ── Brand filter ── */}
      {brands.length > 0 && (
        <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap", alignItems:"center" }}>
          <span style={{ fontSize:11, fontWeight:700, color:"#475569", textTransform:"uppercase", letterSpacing:".5px" }}>Brand:</span>
          <button onClick={() => setBrandFilter("")}
            style={{ padding:"4px 14px", borderRadius:20, fontSize:12, fontWeight:600, cursor:"pointer", border:"1.5px solid", background:!brandFilter?"#5A57FB":"transparent", color:!brandFilter?"#fff":"#64748b", borderColor:!brandFilter?"#5A57FB":"#334155", fontFamily:"inherit" }}>
            All
          </button>
          {brands.map(b => (
            <button key={b._id} onClick={() => setBrandFilter(brandFilter===b._id?"":b._id)}
              style={{ padding:"4px 14px", borderRadius:20, fontSize:12, fontWeight:600, cursor:"pointer", border:"1.5px solid", display:"flex", alignItems:"center", gap:5, background:brandFilter===b._id?b.color||"#5A57FB":"transparent", color:brandFilter===b._id?"#fff":"#94a3b8", borderColor:brandFilter===b._id?b.color||"#5A57FB":"#334155", fontFamily:"inherit" }}>
              <span style={{ width:7, height:7, borderRadius:"50%", background:brandFilter===b._id?"#fff":b.color, display:"inline-block", flexShrink:0 }} />{b.name}
            </button>
          ))}
        </div>
      )}

      {/* ── Week navigation ── */}
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
        <button onClick={() => setWeekOffset(w => w-1)}
          style={{ background:"#1e2330", border:"1px solid #334155", borderRadius:8, padding:"6px 12px", cursor:"pointer", color:"#94a3b8", fontSize:15, fontFamily:"inherit" }}>‹</button>
        <span style={{ fontWeight:700, fontSize:14, color:"#e2e8f0", flex:1 }}>{weekLabel}</span>
        <button onClick={() => setWeekOffset(w => w+1)} disabled={isCurrentWeek}
          style={{ background:"#1e2330", border:"1px solid #334155", borderRadius:8, padding:"6px 12px", cursor:isCurrentWeek?"default":"pointer", color:isCurrentWeek?"#334155":"#94a3b8", fontSize:15, fontFamily:"inherit" }}>›</button>
        {!isCurrentWeek && (
          <button onClick={() => setWeekOffset(0)}
            style={{ background:"rgba(90,87,251,.15)", border:"1px solid #5A57FB", borderRadius:8, padding:"5px 12px", cursor:"pointer", fontSize:12, fontWeight:700, color:"#5A57FB", fontFamily:"inherit" }}>
            This Week
          </button>
        )}
        <span style={{ fontSize:11, color:"#475569" }}>{contentTasks.length} task{contentTasks.length!==1?"s":""}</span>
      </div>

      {/* ── Weekly content grid ── */}
      {selectedContent && <PortalCalendarDetailModal task={selectedContent} onClose={() => setSelectedContent(null)} />}
      <div className="ep-card" style={{ padding:0, overflow:"hidden", marginBottom:20 }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", borderBottom:"1px solid #252a36" }}>
          {DAY_NAMES.map((name, i) => {
            const isToday = days[i].getTime() === today.getTime();
            return (
              <div key={name} style={{ padding:"10px 4px", textAlign:"center" }}>
                <div style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:".5px", color:isToday?"#5A57FB":"#475569" }}>{name}</div>
                <div style={{ width:28, height:28, borderRadius:"50%", margin:"4px auto 0", display:"flex", alignItems:"center", justifyContent:"center",
                  background:isToday?"#5A57FB":"transparent", color:isToday?"#fff":"#94a3b8", fontWeight:isToday?800:400, fontSize:14 }}>
                  {days[i].getDate()}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", minHeight:120 }}>
          {days.map((day, i) => {
            const dt      = dayContentTasks(day);
            const isToday = day.getTime() === today.getTime();
            return (
              <div key={i} style={{ padding:"8px 5px", borderRight:"1px solid #252a36", background:isToday?"rgba(90,87,251,.04)":"transparent", minHeight:120 }}>
                {contentLoading ? (
                  <div style={{ display:"flex", justifyContent:"center", paddingTop:16 }}><div className="ep-spinner" style={{ width:14, height:14 }} /></div>
                ) : dt.length === 0 ? (
                  <div style={{ fontSize:9, color:"#334155", textAlign:"center", marginTop:12 }}>—</div>
                ) : dt.map(t => {
                  const brandColor = t.brandId?.color || "#5A57FB";
                  const ct = CAL_CTYPE[t.contentType];
                  return (
                    <div key={t._id} onClick={() => setSelectedContent(t)}
                      style={{ fontSize:10, padding:"4px 6px", borderRadius:5, marginBottom:4, background:brandColor+"18", color:brandColor, fontWeight:600, cursor:"pointer", borderLeft:`3px solid ${brandColor}`, lineHeight:1.3 }}>
                      {ct && <i className={`bi ${ct.icon}`} style={{ marginRight:3, fontSize:9 }} />}
                      <span style={{ display:"block", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{t.nomenclature||t.title}</span>
                      {t.brandId && <span style={{ fontSize:9, opacity:.75 }}>{t.brandId.name}</span>}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── My Active Tasks ── */}
      <div className="ep-sec-hd">
        <div className="ep-sec-title">📋 My Active Tasks</div>
        <span style={{ fontSize:12, color:"#64748b" }}>{activeTasks.length} tasks</span>
      </div>
      {loading ? <div className="ep-empty"><div className="ep-spinner" /></div>
        : activeTasks.length === 0 ? <div className="ep-empty"><i className="bi bi-calendar-x" /><p>No active tasks</p></div>
        : <div className="ep-tgrid">{activeTasks.map(t => <PTaskCard key={t._id} task={t} onSubmit={(tk,sk)=>setSubmitInfo({task:tk,stageKey:sk})} onNonSMMSubmit={setNonSMMTask} onNonSMMDetail={setDetailTask} empId={empId} />)}</div>
      }
      {submitInfo && (
        <PSubmitModal task={submitInfo.task} stageKey={submitInfo.stageKey} onClose={() => setSubmitInfo(null)}
          onSuccess={updated => { setLocalTasks(prev => prev.map(t => t._id===updated._id?updated:t)); setSubmitInfo(null); }} />
      )}
      {nonSMMTask && (
        <NonSMMSubmitModal task={nonSMMTask} onClose={() => setNonSMMTask(null)} onSubmit={handleNonSMMSubmit} submitting={nonSMMSaving} />
      )}
      {detailTask && (
        <NonSMMDetailModal task={detailTask} onClose={() => setDetailTask(null)} onSubmit={t => { setDetailTask(null); setNonSMMTask(t); }} />
      )}
    </div>
  );
}

// ─── PORTAL HISTORY VIEW ──────────────────────────────────────────────────────
function PortalHistoryView({ tasks, loading }) {
  function gradeLetter(task) {
    if (task.status !== "completed" || !task.dueDate) return null;
    const diffH = Math.round((new Date(task.updatedAt) - new Date(task.dueDate)) / 3600000);
    if (diffH <= 0)  return "A";
    if (diffH <= 4)  return "B";
    if (diffH <= 12) return "C";
    if (diffH <= 24) return "D";
    return "F";
  }
  const gradeColor = { A:"#22c55e", B:"#f5a623", C:"#f59e0b", D:"#ef4444", F:"#ef4444" };
  const completed  = [...tasks].sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt)).filter(t => t.status === "completed");

  return (
    <div className="ep-content">
      <div className="ep-card" style={{ padding:0, overflow:"hidden" }}>
        <div style={{ padding:"14px 18px", borderBottom:"1px solid #252a36", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div className="ep-card-title" style={{ margin:0 }}>
            <i className="bi bi-clock-history" style={{ color:"#f5a623" }} /> History ({completed.length} completed)
          </div>
          <div style={{ display:"flex", gap:8, fontSize:11 }}>
            {["A","B","C","D","F"].filter(g => completed.some(t=>gradeLetter(t)===g)).map(g => (
              <span key={g} style={{ padding:"2px 9px", borderRadius:20, background:(gradeColor[g])+"22", color:gradeColor[g], fontWeight:600 }}>
                {completed.filter(t=>gradeLetter(t)===g).length} {g}
              </span>
            ))}
          </div>
        </div>
        {loading ? <div className="ep-empty"><div className="ep-spinner" /></div>
          : completed.length === 0 ? <div className="ep-empty"><i className="bi bi-inbox" /><p>No completed tasks yet</p></div>
          : completed.map(t => {
            const g  = gradeLetter(t);
            const gc = gradeColor[g] || "#64748b";
            return (
              <div key={t._id} className="ep-rec-item" style={{ padding:"11px 18px" }}>
                <div className="ep-rec-icon" style={{ background:gc+"22", color:gc }}>{g||"—"}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12.5, fontWeight:500, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", color:"#111" }}>{t.nomenclature||t.title}</div>
                  <div style={{ fontSize:10.5, color:"#64748b", marginTop:2, display:"flex", alignItems:"center", gap:4 }}>
                    {t.brandId && <><span className="ep-brand-dot" style={{ background:t.brandId.color }} />{t.brandId.name} · </>}
                    {fmtD(t.updatedAt)}
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

// ─── PORTAL GRADES VIEW ───────────────────────────────────────────────────────
function PortalGradesView({ tasks, loading }) {
  const grade = calcGrade(tasks);
  const BREAKDOWN = [
    { g:"A", title:"On Time",     range:"0h or before",  color:"#22c55e" },
    { g:"B", title:"Slightly Late", range:"+0 to +4h",   color:"#f5a623" },
    { g:"C", title:"Late",        range:"+4 to +12h",    color:"#f59e0b" },
    { g:"D", title:"Very Late",   range:"+12 to +24h",   color:"#ef4444" },
    { g:"F", title:"Over 24h",    range:"+24h or more",  color:"#ef4444" },
  ];
  if (loading) return <div className="ep-content"><div className="ep-empty"><div className="ep-spinner" /></div></div>;
  return (
    <div className="ep-content">
      <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:18, marginBottom:18 }}>
        <div className="ep-grade-card" style={{ padding:30 }}>
          <div style={{ fontSize:11, color:"#64748b", textTransform:"uppercase", letterSpacing:".08em", fontWeight:600 }}>Current Grade</div>
          <div className="ep-grade-letter" style={{ color:grade.color, fontSize:80, margin:"10px 0" }}>{grade.letter}</div>
          <div style={{ fontSize:11, color:"#64748b" }}>
            {new Date().toLocaleDateString("en-IN",{month:"long",year:"numeric"})} · On-time {grade.rate}%
          </div>
          <div className="ep-grade-bar">
            {[0,1,2,3,4].map(i => (
              <div key={i} className="ep-grade-bar-cell" style={{ background: i<Math.round(grade.rate/20)?grade.color:"#1e2330" }} />
            ))}
          </div>
          <div style={{ fontSize:12, color:"#64748b", marginTop:14, lineHeight:1.5 }}>
            {grade.rate>=80 ? "Excellent! Keep submitting on time." : grade.rate>=60 ? "Aim to reduce delays to reach A." : "Focus on timely submissions to improve your grade."}
          </div>
        </div>
        <div className="ep-card">
          <div className="ep-card-title"><i className="bi bi-trophy" style={{ color:"#f5a623" }} /> Grade Breakdown</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10 }}>
            {BREAKDOWN.map(b => (
              <div key={b.g} style={{ background:b.color+"22", border:`1px solid ${b.color}44`, borderRadius:10, padding:"12px 10px", textAlign:"center" }}>
                <div style={{ fontSize:32, fontWeight:800, color:b.color }}>{b.g}</div>
                <div style={{ fontSize:11, fontWeight:600, marginTop:4, color:"#111" }}>{b.title}</div>
                <div style={{ fontSize:10, color:"#64748b", marginTop:2, fontFamily:"monospace" }}>{b.range}</div>
              </div>
            ))}
          </div>
          <div style={{ background:"#161a24", borderRadius:9, padding:14, fontSize:12.5, lineHeight:1.6, color:"#64748b", marginTop:14 }}>
            💡 <strong style={{ color:"#e2e8f0" }}>Pro tip:</strong> Grade is calculated against your stage deadline. Submit before the deadline = A!
          </div>
        </div>
      </div>
      <div className="ep-card">
        <div className="ep-card-title"><i className="bi bi-list-check" style={{ color:"#f5a623" }} /> Task Summary</div>
        <div className="ep-grid4">
          {[
            { label:"Total Assigned", val:tasks.length,                                                         color:"#e2e8f0" },
            { label:"Completed",      val:tasks.filter(t=>t.status==="completed").length,                       color:"#22c55e" },
            { label:"In Progress",    val:tasks.filter(t=>t.status==="in_progress").length,                     color:"#3b82f6" },
            { label:"Overdue",        val:tasks.filter(t=>isOverdue(t.dueDate)&&t.status!=="completed").length, color:"#ef4444" },
          ].map(s => (
            <div key={s.label} style={{ background:"#161a24", border:"1px solid #252a36", borderRadius:10, padding:"14px 18px" }}>
              <div style={{ fontSize:28, fontWeight:800, color:s.color }}>{s.val}</div>
              <div style={{ fontSize:12, color:"#64748b", marginTop:4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── PORTAL NOTIFICATIONS VIEW ────────────────────────────────────────────────
function PortalNotificationsView({ tasks, loading }) {
  const overdue  = tasks.filter(t => isOverdue(t.dueDate) && t.status!=="completed");
  const inReview = tasks.filter(t => t.status==="review");
  const blocked  = tasks.filter(t => t.status==="blocked");
  const notifs = [
    ...overdue.map(t => ({ icon:"⚠️", bg:"rgba(239,68,68,.08)", border:"rgba(239,68,68,.25)", title:`Overdue: ${t.nomenclature||t.title}`, desc:(t.brandId?.name||"")+(t.brandId?" — ":"")+"Submit immediately to minimize grade impact", time:fmtD(t.dueDate) })),
    ...inReview.map(t => ({ icon:"🕐", bg:"rgba(245,166,35,.06)", border:"rgba(245,166,35,.2)", title:`Under Review: ${t.nomenclature||t.title}`, desc:"Awaiting admin approval — no action needed", time:fmtD(t.updatedAt) })),
    ...blocked.map(t => ({ icon:"❌", bg:"rgba(239,68,68,.06)", border:"rgba(239,68,68,.15)", title:`Rejected: ${t.nomenclature||t.title}`, desc: t.reviewNote?`Reason: ${t.reviewNote}`:"Please revise and resubmit", time:fmtD(t.updatedAt) })),
  ];
  return (
    <div className="ep-content">
      <div className="ep-card" style={{ padding:0, overflow:"hidden" }}>
        <div style={{ padding:"14px 18px", borderBottom:"1px solid #252a36", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div className="ep-card-title" style={{ margin:0 }}><i className="bi bi-bell" style={{ color:"#f5a623" }} /> Notifications</div>
          {notifs.length>0 && <span style={{ background:"#ef4444", color:"#fff", borderRadius:"50%", width:20, height:20, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700 }}>{notifs.length}</span>}
        </div>
        {loading ? <div className="ep-empty"><div className="ep-spinner" /></div>
          : notifs.length === 0 ? (
            <div className="ep-empty">
              <i className="bi bi-bell-slash" style={{ fontSize:38, display:"block", marginBottom:10 }} />
              <p>All clear — no notifications</p>
            </div>
          ) : notifs.map((n,i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 18px", borderBottom:"1px solid #252a36" }}>
              <div style={{ width:38, height:38, borderRadius:10, background:n.bg, border:`1px solid ${n.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0 }}>{n.icon}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:600, color:"#e2e8f0" }}>{n.title}</div>
                <div style={{ fontSize:12, color:"#64748b", marginTop:3 }}>{n.desc}</div>
              </div>
              <div style={{ fontSize:11, color:"#64748b", fontFamily:"monospace", flexShrink:0 }}>{n.time}</div>
            </div>
          ))}
      </div>
    </div>
  );
}

// ─── PORTAL PERFORMANCE VIEW ──────────────────────────────────────────────────
function PortalPerformanceView({ tasks, loading, emp }) {
  const total      = tasks.length;
  const completed  = tasks.filter(t => t.status === "completed").length;
  const overdue    = tasks.filter(t => isOverdue(t.dueDate) && t.status !== "completed").length;
  const inProg     = tasks.filter(t => t.status === "in_progress").length;
  const review     = tasks.filter(t => t.status === "review").length;
  const onTime     = completed > 0 ? Math.round((tasks.filter(t => t.status === "completed" && !isOverdue(t.dueDate)).length / completed) * 100) : 0;
  const grade      = onTime >= 90 ? "A" : onTime >= 75 ? "B" : onTime >= 60 ? "C" : "D";
  const gradeColor = onTime >= 90 ? "#22c55e" : onTime >= 75 ? "#f5a623" : onTime >= 60 ? "#f59e0b" : "#ef4444";
  const BAR_DATA   = [
    { label:"Completed", val:completed, color:"#22c55e" },
    { label:"In Progress", val:inProg,  color:"#3b82f6" },
    { label:"Review",      val:review,  color:"#f59e0b" },
    { label:"Overdue",     val:overdue, color:"#ef4444" },
  ];
  if (loading) return <div className="ep-content"><div className="ep-empty"><div className="ep-spinner" /></div></div>;
  return (
    <div className="ep-content">
      <div className="ep-grid2" style={{ marginBottom:22 }}>
        <div className="ep-card">
          <div className="ep-card-title"><i className="bi bi-trophy" style={{ color:"#f5a623" }} /> Overall Grade</div>
          <div style={{ display:"flex", alignItems:"center", gap:20, marginTop:8 }}>
            <div className="ep-perf-grade" style={{ borderColor:gradeColor, color:gradeColor }}>{grade}</div>
            <div>
              <div style={{ fontSize:13, color:"#64748b", marginBottom:4 }}>On-time completion rate</div>
              <div style={{ fontSize:28, fontWeight:800, color:gradeColor }}>{onTime}%</div>
            </div>
          </div>
          <div className="ep-bar-track" style={{ marginTop:16 }}>
            <div className="ep-bar-fill" style={{ width:`${onTime}%`, background:gradeColor }} />
          </div>
        </div>
        <div className="ep-card">
          <div className="ep-card-title"><i className="bi bi-graph-up" style={{ color:"#f5a623" }} /> Task Breakdown</div>
          <div style={{ display:"flex", flexDirection:"column", gap:12, marginTop:8 }}>
            {BAR_DATA.map(b => (
              <div key={b.label}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:12.5, marginBottom:4, color:"#e2e8f0" }}>
                  <span>{b.label}</span><span style={{ fontWeight:700, color:b.color }}>{b.val}</span>
                </div>
                <div className="ep-bar-track">
                  <div className="ep-bar-fill" style={{ width: total ? `${(b.val/total)*100}%` : "0%", background:b.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="ep-card">
        <div className="ep-card-title"><i className="bi bi-list-check" style={{ color:"#f5a623" }} /> Summary</div>
        <div className="ep-grid4">
          {[
            { label:"Total Assigned", val:total,          color:"#e2e8f0" },
            { label:"Completed",      val:completed,      color:"#22c55e" },
            { label:"Overdue",        val:overdue,        color:"#ef4444" },
            { label:"Pending",        val:total-completed, color:"#3b82f6" },
          ].map(s => (
            <div key={s.label} style={{ background:"#161a24", border:"1px solid #252a36", borderRadius:10, padding:"14px 18px" }}>
              <div style={{ fontSize:26, fontWeight:800, color:s.color }}>{s.val}</div>
              <div style={{ fontSize:12, color:"#64748b", marginTop:4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── PORTAL PROFILE VIEW ──────────────────────────────────────────────────────
function PortalProfileView({ emp, empRole, loading }) {
  if (loading || !emp) return <div className="ep-content"><div className="ep-empty"><div className="ep-spinner" /></div></div>;
  const fields = [
    { label:"Employee ID", val:emp.employeeId },
    { label:"Email",       val:emp.email || emp.personal?.email },
    { label:"Mobile",      val:emp.personal?.mobile },
    { label:"Department",  val:emp.professional?.department },
    { label:"Designation", val:emp.professional?.designation },
    { label:"Date Joined", val:fmtD(emp.professional?.dateOfJoining) },
  ];
  const checks = [emp.personal?.mobile, emp.personal?.email, emp.personal?.dob, emp.personal?.address, emp.personal?.city, emp.professional?.department, emp.professional?.designation, emp.salary?.bankName];
  const pct    = Math.round((checks.filter(Boolean).length / checks.length) * 100);
  const pColor = pct >= 80 ? "#22c55e" : pct >= 50 ? "#f5a623" : "#ef4444";
  return (
    <div className="ep-content">
      <div className="ep-grid2">
        <div className="ep-card">
          <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:20, paddingBottom:18, borderBottom:"1px solid #252a36" }}>
            <div className="ep-profile-ava">{pIni(emp)}</div>
            <div>
              <div style={{ fontSize:17, fontWeight:800, color:"#e2e8f0" }}>{emp.firstName} {emp.lastName}</div>
              <div style={{ fontSize:12, color:"#64748b", marginTop:3 }}>{RL[empRole]}</div>
              <div style={{ marginTop:6 }}>
                <span style={{ display:"inline-flex", alignItems:"center", padding:"3px 8px", borderRadius:5, fontSize:11, fontWeight:600, background:"rgba(245,166,35,.12)", color:"#f5a623" }}>
                  {emp.professional?.designation || "Employee"}
                </span>
              </div>
            </div>
          </div>
          {fields.map(f => (
            <div key={f.label} className="ep-row-sep">
              <div style={{ width:130, fontSize:12, color:"#64748b", fontWeight:600 }}>{f.label}</div>
              <div style={{ fontSize:13, fontWeight:500, color:"#e2e8f0" }}>{f.val || "—"}</div>
            </div>
          ))}
        </div>
        <div className="ep-card">
          <div className="ep-card-title"><i className="bi bi-person-check" style={{ color:"#f5a623" }} /> Profile Completion</div>
          <div style={{ fontSize:36, fontWeight:900, color:pColor }}>{pct}%</div>
          <div className="ep-bar-track" style={{ marginTop:8, marginBottom:16 }}>
            <div className="ep-bar-fill" style={{ width:`${pct}%`, background:pColor }} />
          </div>
          <div style={{ fontSize:12, color:"#64748b" }}>
            {pct < 100 ? "Complete your profile to help HR manage your records." : "Your profile is fully complete!"}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PORTAL CALENDAR VIEW ─────────────────────────────────────────────────────
const CAL_MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const CAL_CTYPE  = { reel:{ label:"Reel", icon:"bi-camera-video-fill", color:"#F59E0B" }, post:{ label:"Post", icon:"bi-image-fill", color:"#6366F1" }, carousel:{ label:"Carousel", icon:"bi-images", color:"#10B981" }, story:{ label:"Story", icon:"bi-phone-fill", color:"#EC4899" } };

function PortalCalendarDetailModal({ task, onClose }) {
  if (!task) return null;
  const ct = CAL_CTYPE[task.contentType];
  const stageColor = { S1:"#7C3AED", S2:"#1D4ED8", S3:"#B45309", S4:"#065F46" }[task.stage] || "#5A57FB";
  const dateStr = task.scheduledFor ? fmtD(task.scheduledFor) : fmtD(task.dueDate);
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.55)", zIndex:2000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:"#fff", borderRadius:16, width:"100%", maxWidth:520, maxHeight:"85vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,.3)" }}>
        <div style={{ padding:"18px 20px 14px", borderBottom:"1px solid #F1F5F9", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div style={{ flex:1, paddingRight:12 }}>
            <div style={{ fontWeight:800, fontSize:15, color:"#1E293B", lineHeight:1.4, marginBottom:8 }}>{task.nomenclature || task.title || "—"}</div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {task.brandId && <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20, background:(task.brandId.color||"#5A57FB")+"20", color:task.brandId.color||"#5A57FB" }}>{task.brandId.name}</span>}
              {ct && <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20, background:ct.color+"18", color:ct.color }}><i className={`bi ${ct.icon}`} style={{ marginRight:3 }} />{ct.label}</span>}
              {task.stage && <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20, background:stageColor+"20", color:stageColor }}>{task.stage} · {STAGE_LABEL[task.stage]}</span>}
              {dateStr !== "—" && <span style={{ fontSize:10, fontWeight:600, padding:"2px 8px", borderRadius:20, background:"#F1F5F9", color:"#64748B" }}><i className="bi bi-calendar3 me-1" />{dateStr}</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ border:"none", background:"#F1F5F9", borderRadius:8, width:30, height:30, cursor:"pointer", fontSize:14, flexShrink:0 }}><i className="bi bi-x" /></button>
        </div>
        <div style={{ padding:20, display:"flex", flexDirection:"column", gap:14 }}>
          {task.pillar && <div><div style={{ fontSize:10, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", marginBottom:4 }}>Content Pillar</div><div style={{ fontSize:13, color:"#7C3AED", fontWeight:600 }}><i className="bi bi-tag me-1" />{task.pillar}</div></div>}
          {task.description && <div><div style={{ fontSize:10, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", marginBottom:4 }}>Script / Description</div><div style={{ fontSize:12.5, color:"#374151", background:"#F8FAFC", borderRadius:8, padding:"10px 12px", lineHeight:1.7, whiteSpace:"pre-wrap", maxHeight:180, overflowY:"auto" }}>{task.description}</div></div>}
          {task.caption && <div><div style={{ fontSize:10, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", marginBottom:4 }}>Caption</div><div style={{ fontSize:12.5, color:"#374151", background:"#F8FAFC", borderRadius:8, padding:"10px 12px", lineHeight:1.7, whiteSpace:"pre-wrap" }}>{task.caption}</div></div>}
          {task.tags?.length > 0 && <div><div style={{ fontSize:10, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", marginBottom:4 }}>Hashtags</div><div style={{ fontSize:12, color:"#6366F1", background:"#EEF2FF", borderRadius:8, padding:"8px 12px", lineHeight:1.8 }}>{task.tags.map(tg => `#${tg}`).join(" ")}</div></div>}
          {task.referenceLink && <div><div style={{ fontSize:10, fontWeight:700, color:"#94A3B8", textTransform:"uppercase", marginBottom:4 }}>Reference</div><a href={task.referenceLink} target="_blank" rel="noopener noreferrer" style={{ fontSize:12, color:"#4F46E5", display:"inline-flex", alignItems:"center", gap:4, background:"#EEF2FF", padding:"6px 12px", borderRadius:8, textDecoration:"none" }}><i className="bi bi-link-45deg" /> View Reference</a></div>}
        </div>
      </div>
    </div>
  );
}

function PortalCalendarView() {
  const today = new Date();
  const [year,   setYear]   = useState(today.getFullYear());
  const [month,  setMonth]  = useState(today.getMonth());
  const [tasks,  setTasks]  = useState([]);
  const [brands, setBrands] = useState([]);
  const [brandFilter, setBrandFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);

  useEffect(() => {
    const start = new Date(year, month, 1).toISOString();
    const end   = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
    const q     = new URLSearchParams({ dateStart: start, dateEnd: end });
    if (brandFilter) q.set("brandId", brandFilter);
    setLoading(true);
    fetch(`/api/employee/brand-tasks?${q}`, { headers: authH() })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          const taskList = d.tasks || [];
          setTasks(taskList);
          const seen = new Set(); const bs = [];
          taskList.forEach(t => { if (t.brandId && !seen.has(t.brandId._id)) { seen.add(t.brandId._id); bs.push(t.brandId); } });
          setBrands(prev => {
            const all = [...prev, ...bs];
            const u = new Map(all.map(b => [b._id, b]));
            return [...u.values()];
          });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [year, month, brandFilter]);

  const firstDay  = new Date(year, month, 1).getDay();
  const daysInMon = new Date(year, month + 1, 0).getDate();
  const offset    = firstDay === 0 ? 6 : firstDay - 1;
  const cells     = Array(offset).fill(null).concat(Array.from({ length: daysInMon }, (_, i) => i + 1));
  const DAY_HEADS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

  function getTaskDate(t) {
    if (t.scheduledFor) return new Date(t.scheduledFor);
    if (t.dueDate)      return new Date(t.dueDate);
    const s1 = t.stages?.[0];
    if (s1?.deadline)  return new Date(s1.deadline);
    if (s1?.doneAt)    return new Date(s1.doneAt);
    if (t.submittedAt) return new Date(t.submittedAt);
    if (t.updatedAt)   return new Date(t.updatedAt);
    if (t.createdAt)   return new Date(t.createdAt);
    return null;
  }

  function dayTasks(day) {
    return tasks.filter(t => {
      const d = getTaskDate(t);
      if (!d) return false;
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  }

  const prevMonth = () => { if (month===0){setYear(y=>y-1);setMonth(11);}else setMonth(m=>m-1); };
  const nextMonth = () => { if (month===11){setYear(y=>y+1);setMonth(0);}else setMonth(m=>m+1); };

  return (
    <div className="ep-content">
      <PortalCalendarDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} />
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:18, flexWrap:"wrap" }}>
        <button onClick={prevMonth} style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:8, width:32, height:32, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><i className="bi bi-chevron-left" style={{ color:"#374151" }} /></button>
        <div>
          <div style={{ fontWeight:800, fontSize:17, color:"#1e293b" }}>{CAL_MONTHS[month]} {year}</div>
          <div style={{ fontSize:12, color:"#64748b" }}>{tasks.length} approved content task{tasks.length !== 1 ? "s" : ""}</div>
        </div>
        <button onClick={nextMonth} style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:8, width:32, height:32, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}><i className="bi bi-chevron-right" style={{ color:"#374151" }} /></button>
        <button onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); }} style={{ background:"#fff", border:"1px solid #e2e8f0", borderRadius:8, padding:"5px 14px", cursor:"pointer", fontSize:12, fontWeight:600, color:"#374151" }}>Today</button>
        {brands.length > 0 && (
          <select value={brandFilter} onChange={e => setBrandFilter(e.target.value)}
            style={{ padding:"6px 10px", borderRadius:8, border:"1px solid #e2e8f0", fontSize:12, outline:"none", background:"#fff", color:"#374151", marginLeft:"auto" }}>
            <option value="">All Brands</option>
            {brands.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
          </select>
        )}
      </div>

      {/* Legend */}
      <div style={{ display:"flex", gap:12, marginBottom:14, flexWrap:"wrap" }}>
        {Object.entries(CAL_CTYPE).map(([k,v]) => (
          <span key={k} style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:11, fontWeight:600, color:"#64748b" }}>
            <span style={{ width:10, height:10, borderRadius:3, background:v.color, display:"inline-block" }} />{v.label}
          </span>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign:"center", padding:60, color:"#94A3B8" }}><div className="ep-spinner" /></div>
      ) : (
        <div style={{ background:"#fff", borderRadius:12, border:"1px solid #e2e8f0", overflow:"hidden" }}>
          {/* Day headers */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", borderBottom:"1px solid #e2e8f0" }}>
            {DAY_HEADS.map(d => (
              <div key={d} style={{ padding:"10px 0", textAlign:"center", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:".5px", color:"#94A3B8" }}>{d}</div>
            ))}
          </div>
          {/* Grid */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)" }}>
            {cells.map((day, i) => {
              if (!day) return <div key={`e${i}`} style={{ minHeight:90, borderBottom:"1px solid #f9f9f9", borderRight:"1px solid #f9f9f9", background:"#FAFAFA" }} />;
              const isToday = today.getFullYear()===year && today.getMonth()===month && today.getDate()===day;
              const dt = dayTasks(day);
              return (
                <div key={day} style={{ minHeight:90, padding:"7px 6px", borderBottom:"1px solid #f9f9f9", borderRight:"1px solid #f9f9f9", background:isToday?"#FFFBEB":"#fff" }}>
                  <div style={{ width:26, height:26, borderRadius:"50%", marginBottom:5, display:"flex", alignItems:"center", justifyContent:"center", background:isToday?"#5A57FB":"transparent", fontSize:12, fontWeight:isToday?800:400, color:isToday?"#fff":"#374151" }}>{day}</div>
                  {dt.slice(0,3).map(t => {
                    const ct = CAL_CTYPE[t.contentType];
                    const color = t.brandId?.color || ct?.color || "#5A57FB";
                    return (
                      <div key={t._id} onClick={() => setSelectedTask(t)} title={t.nomenclature||t.title}
                        style={{ fontSize:10, padding:"2px 5px", borderRadius:4, marginBottom:2, background:color+"22", color, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", cursor:"pointer", borderLeft:`3px solid ${color}` }}>
                        {ct && <i className={`bi ${ct.icon}`} style={{ marginRight:2, fontSize:9 }} />}{t.nomenclature||t.title}
                      </div>
                    );
                  })}
                  {dt.length>3 && <div style={{ fontSize:9, color:"#5A57FB", fontWeight:700, cursor:"pointer" }} onClick={() => setSelectedTask(dt[3])}>+{dt.length-3} more</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DARK PORTAL (non-content roles) ─────────────────────────────────────────
function DarkPortal() {
  const router  = useRouter();
  const [employee, setEmployee] = useState(null);
  const [tasks,    setTasks]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [view,     setView]     = useState("today");
  const empRole = getTMSRole(employee);

  useEffect(() => {
    const headers = authH();
    Promise.all([
      fetch("/api/employee/me",    { headers }).then(r => r.json()),
      fetch("/api/employee/tasks", { headers }).then(r => r.json()),
    ]).then(([er, tr]) => {
      if (er.success) setEmployee(er.employee);
      else { router.push("/employee/login"); return; }
      if (tr.success) setTasks(tr.tasks || []);
    }).catch(console.error)
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh: socket events + tab visibility + polling
  const refreshTasks = useCallback(() => {
    fetch("/api/employee/tasks", { headers: authH() })
      .then(r => r.json())
      .then(d => { if (d.success) setTasks(d.tasks || []); })
      .catch(() => {});
  }, []);
  useTaskSync(refreshTasks, { empId: employee?._id || null });

  const NAV = [
    { key:"today",       label:"Today",            icon:"bi-house" },
    { key:"tasks",       label:"My Tasks",          icon:"bi-check2-square" },
    { key:"week",        label:"This Week",         icon:"bi-calendar-week" },
    { key:"history",     label:"History",           icon:"bi-clock-history" },
    ...(empRole !== "developer" ? [{ key:"calendar", label:"Content Calendar", icon:"bi-calendar3" }] : []),
    { key:"grades",      label:"Grades",            icon:"bi-award" },
    { key:"notifs",      label:"Notifications",     icon:"bi-bell" },
    { key:"performance", label:"My Stats",          icon:"bi-graph-up-arrow" },
  ];
  const TITLES = { today:"Today", tasks:"My Tasks", week:"This Week", history:"History", calendar:"Content Calendar", grades:"Grades", notifs:"Notifications", performance:"My Stats", profile:"Profile" };

  function logout() { localStorage.removeItem("employeeToken"); router.push("/employee/login"); }

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"#f1f5f9" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ width:36, height:36, border:"3px solid #e2e8f0", borderTopColor:"#f5a623", borderRadius:"50%", animation:"spin .7s linear infinite", margin:"0 auto 12px" }} />
        <div style={{ color:"#64748b", fontSize:13 }}>Loading your dashboard…</div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <>
      <Head>
        <title>Dashboard · Viralon</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
      </Head>
      <style>{PORTAL_CSS}</style>
      <div className="ep-layout">

        {/* ── Desktop sidebar ── */}
        <div className="ep-side">
          <div className="ep-side-logo">
          <img width="100" alt="Viralon" src="/assets/images/logo.png"/>
          </div>
          <nav className="ep-side-nav">
            {NAV.map(n => (
              <button key={n.key} className={`ep-nav ${view===n.key?"active":""}`} onClick={() => setView(n.key)}>
                <i className={`bi ${n.icon}`} />{n.label}
              </button>
            ))}
          </nav>
          <div className="ep-side-footer">
            <div className="ep-ava">{pIni(employee)}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div className="ep-side-name">{employee ? `${employee.firstName} ${employee.lastName}` : "Loading…"}</div>
              <div className="ep-side-role">{RL[empRole]}</div>
            </div>
            <button onClick={logout} title="Logout" style={{ background:"none", border:"none", cursor:"pointer", color:"#64748b", fontSize:16, padding:4 }}>
              <i className="bi bi-box-arrow-right" />
            </button>
          </div>
        </div>

        <div className="ep-main">
          {/* ── Mobile sticky topbar (replaces desktop topbar on mobile) ── */}
          <div className="ep-mob-topbar">
            <img src="/assets/images/logo.png" alt="Viralon"
              style={{ height:22, filter:"brightness(0) invert(1)" }}
              onError={e => { e.currentTarget.style.display="none"; }} />
            <div className="ep-mob-topbar-title">{TITLES[view] || "Dashboard"}</div>
            <div style={{ width:30, height:30, borderRadius:"50%", background:"rgba(90,87,251,.3)", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:12, color:"#fff", flexShrink:0 }}>
              {pIni(employee)}
            </div>
          </div>

          {/* ── Desktop topbar ── */}
          <div className="ep-topbar">
            <div className="ep-topbar-title">{TITLES[view] || "Dashboard"}</div>
          </div>

          {view === "today"       && <PortalTodayView        emp={employee} tasks={tasks} loading={loading} empId={employee?._id} />}
          {view === "tasks"       && <PortalMyTasksView       tasks={tasks} loading={loading} empId={employee?._id} />}
          {view === "week"        && <PortalThisWeekView      tasks={tasks} loading={loading} empId={employee?._id} />}
          {view === "history"     && <PortalHistoryView       tasks={tasks} loading={loading} />}
          {view === "calendar"    && <PortalCalendarView />}
          {view === "grades"      && <PortalGradesView        tasks={tasks} loading={loading} />}
          {view === "notifs"      && <PortalNotificationsView tasks={tasks} loading={loading} />}
          {view === "performance" && <PortalPerformanceView   tasks={tasks} loading={loading} emp={employee} />}
          {view === "profile"     && <PortalProfileView       emp={employee} empRole={empRole} loading={loading} />}
        </div>
      </div>

      {/* ── Mobile bottom tab bar (only visible < 900px) ── */}
      <div className="ep-mob-tabs">
        <div className="ep-mob-tabs-inner">
          {NAV.map(n => (
            <button key={n.key} className={`ep-mob-tab ${view===n.key?"active":""}`} onClick={() => setView(n.key)}>
              <i className={`bi ${n.icon}`} />
              {n.label}
            </button>
          ))}
        </div>
      </div>
      <ToastContainer position="bottom-right" autoClose={2500} />
    </>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function EmployeeTasksDashboard() {
  const [employee,   setEmployee]   = useState(null);
  const [tasks,      setTasks]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [activeTab,  setActiveTab]  = useState("dashboard");
  const [editorTask, setEditorTask] = useState(null);

  useEffect(() => {
    const token   = localStorage.getItem("employeeToken");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    Promise.all([
      fetch("/api/employee/me",    { headers }).then(r => r.json()),
      fetch("/api/employee/tasks", { headers }).then(r => r.json()),
    ])
      .then(([er, tr]) => {
        if (er.success) setEmployee(er.employee);
        if (tr.success) setTasks(tr.tasks);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Auto-refresh for light-theme TMS (content team)
  const refreshLightTasks = useCallback(() => {
    const token   = localStorage.getItem("employeeToken");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    fetch("/api/employee/tasks", { headers })
      .then(r => r.json())
      .then(d => { if (d.success) setTasks(d.tasks || []); })
      .catch(() => {});
  }, []);
  useTaskSync(refreshLightTasks, { empId: employee?._id || null });

  function openInEditor(task) {
    setEditorTask(task);
    setActiveTab("editor");
  }

  function switchTab(key) {
    setActiveTab(key);
    if (key !== "editor") setEditorTask(null);
  }

  const role = getTMSRole(employee);

  // Non-content roles → full dark portal (self-fetching)
  if (!loading && role !== "content") {
    return <DarkPortal />;
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
      <div className="spinner-border text-primary" role="status" />
    </div>
  );
  const config = ROLE_CONFIG[role];
  const tabs   = (TABS_BY_ROLE[role] || TABS_BY_ROLE.general).map(k => ({ key: k, ...TAB_META[k] }));

  return (
    <>
      <Head>
        <title>Task Management · Viralon</title>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
        <link rel="stylesheet" href="/asets/css/employee.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
      </Head>

      <div className="main-nav">
        <Leftbar />
        <LeftbarMobile />
        <Dashnav />

        <section className="content home">
          <div className="breadcrum-bx">
            <ul className="breadcrumb bg-white">
              <li className="breadcrumb-item"><Link href="/employee/dashboard"><img src="/icons/home.svg" alt="" /> Home</Link></li>
              <li className="breadcrumb-item active">Task Management</li>
            </ul>
          </div>

          <div className="block-header">
            <div className="tms-page-header">
              <div>
                <h4 className="tms-page-title">
                  <i className={`bi ${config.icon} me-2`} style={{ color: config.ic }} />
                  Task Management
                </h4>
                <p className="tms-page-sub">
                  {employee?.firstName ? `Welcome, ${employee.firstName}` : "Your work overview"} · {config.label}
                </p>
              </div>
              {activeTab === "editor" && editorTask && (
                <button onClick={() => switchTab("tasks")} style={{ padding: "7px 16px", borderRadius: 8, border: "1.5px solid #E5E7EB", background: "#fff", color: "#6B7280", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                  <i className="bi bi-arrow-left" /> Back to My Tasks
                </button>
              )}
            </div>

            {/* Tab nav */}
            <div style={{ display: "flex", gap: 2, borderBottom: "2px solid #F0F0F0", marginBottom: 22, overflowX: "auto" }}>
              {tabs.map(t => (
                <button key={t.key} onClick={() => switchTab(t.key)} style={{
                  display: "flex", alignItems: "center", gap: 7, padding: "10px 16px",
                  fontSize: 13, fontWeight: 600, background: "transparent", border: "none", cursor: "pointer",
                  borderBottom: activeTab === t.key ? `2px solid ${config.ic}` : "2px solid transparent",
                  color: activeTab === t.key ? config.ic : "#9CA3AF",
                  marginBottom: -2, transition: "all .15s", whiteSpace: "nowrap",
                }}>
                  <i className={`bi ${t.icon}`} />{t.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {activeTab === "dashboard"   && <DashboardTab    employee={employee} tasks={tasks} role={role} switchTab={switchTab} />}
            {activeTab === "tasks"       && <MyTasksTab       tasks={tasks} openInEditor={openInEditor} />}
            {activeTab === "editor"      && <ContentEditorTab tasks={tasks} initialTask={editorTask} />}
            {activeTab === "brandcal"    && <BrandCalendarTab tasks={tasks} />}
            {activeTab === "calendar"    && <BrandCalendarTab tasks={tasks} />}
            {activeTab === "weekly"      && <WeeklyTrackerTab tasks={tasks} />}
            {activeTab === "mycal"       && <MyCalendarTab    tasks={tasks} />}
            {activeTab === "library"     && <ScriptLibraryTab tasks={tasks} />}
            {activeTab === "submissions" && <SubmissionsTab   tasks={tasks} />}
            {activeTab === "queue"       && <QueueTab         tasks={tasks} role={role} />}
            {activeTab === "board"       && <SprintBoardTab   tasks={tasks} />}
            {activeTab === "performance" && <PerformanceTab   tasks={tasks} employee={employee} />}
          </div>
        </section>
      </div>

      <ToastContainer position="bottom-right" autoClose={2500} />
    </>
  );
}

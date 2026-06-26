import React, { useEffect, useState, useCallback } from "react";
import { useTaskSync } from "@/utils/hooks/useTaskSync";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import SmartLeftbar from "@/components/SmartLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import Dashnav from "@/components/Dashnav";

/* ─── Constants ─────────────────────────────────────────────────────────── */

const STATUS_META = {
  todo:        { label: "To Do",       bg: "#F1F5F9", color: "#64748B", border: "#CBD5E1" },
  in_progress: { label: "In Progress", bg: "#DBEAFE", color: "#1D4ED8", border: "#93C5FD" },
  review:      { label: "Review",      bg: "#FEF3C7", color: "#B45309", border: "#FDE68A" },
  completed:   { label: "Completed",   bg: "#DCFCE7", color: "#15803D", border: "#BBF7D0" },
  blocked:     { label: "Rejected",    bg: "#FEE2E2", color: "#DC2626", border: "#FCA5A5" },
};

const PRIORITY_META = {
  low:    { label: "Low",    bg: "#F0FDF4", color: "#16A34A" },
  medium: { label: "Medium", bg: "#EFF6FF", color: "#2563EB" },
  high:   { label: "High",   bg: "#FFFBEB", color: "#D97706" },
  urgent: { label: "Urgent", bg: "#FFF1F2", color: "#E11D48" },
};

const TYPE_META = {
  project:    { label: "Project",    bg: "#F3E8FF", color: "#7C3AED" },
  sprint:     { label: "Sprint",     bg: "#EEF2FF", color: "#4F46E5" },
  production: { label: "Production", bg: "#FFF7ED", color: "#C2410C" },
  manual:     { label: "Manual",     bg: "#F1F5F9", color: "#475569" },
  general:    { label: "General",    bg: "#F0F9FF", color: "#0EA5E9" },
};

const ACTION_LABELS = {
  created:             "Task created",
  status_changed:      "Status changed",
  priority_changed:    "Priority changed",
  assigned:            "Task assigned",
  reassigned:          "Task reassigned",
  due_date_changed:    "Due date changed",
  title_changed:       "Title updated",
  comment_added:       "Comment added",
  attachment_added:    "Attachment uploaded",
  completed:           "Task completed",
  blocked:             "Task rejected",
  stage_done:          "Stage marked done",
};

const STAGE_COLORS = ["#F59E0B", "#6366F1", "#10B981", "#EC4899"];
const STAGE_NAMES  = ["Script/Concept", "Shoot/Design", "Edit/Develop", "Posted/Live"];
const PRIORITIES   = ["low", "medium", "high", "urgent"];

// Map raw DB status values to display labels
function fmtStatusVal(s) {
  const M = { blocked: "Rejected", in_progress: "In Progress", todo: "To Do", review: "In Review", completed: "Completed" };
  return M[s] || s;
}

const STAGE_DEPT_KEYWORDS = [
  { include: ["content team"],           exclude: [] },
  { include: ["production"],             exclude: ["design", "creative"] },
  { include: ["editing team", "design team", "tech"], exclude: [] },
  { include: ["digital marketing"],      exclude: [] },
];

const STAGE_TEAM_LABELS = ["Content team", "Production", "Editing team", "Digital Marketing team"];

function filterByDept(employees, { include, exclude }) {
  return employees.filter(emp => {
    const dept  = (emp.professional?.department  || "").toLowerCase();
    const desig = (emp.professional?.designation || "").toLowerCase();
    if (exclude.some(kw => dept.includes(kw) || desig.includes(kw))) return false;
    return include.some(kw => dept.includes(kw));
  });
}
function normalizeAssignedTo(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(item => typeof item === "object" ? String(item._id || item) : String(item)).filter(Boolean);
  return [typeof v === "object" ? String(v._id || v) : String(v)].filter(Boolean);
}
function getStageEmps(stg, employees) {
  const ids = normalizeAssignedTo(stg?.assignedTo);
  return ids.map(id => employees.find(e => String(e._id) === id)).filter(Boolean);
}

/* ─── Helpers ──────────────────────────────────────────────────────────── */

const getEmpName = (emp) => {
  if (!emp) return "Unassigned";
  if (emp.personal?.firstName) return `${emp.personal.firstName} ${emp.personal.lastName || ""}`.trim();
  if (emp.firstName) return `${emp.firstName} ${emp.lastName || ""}`.trim();
  return emp.email || "—";
};

const getInitials = (name) =>
  (name || "?").split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase();

const AVATAR_COLORS = [
  ["#EEF2FF", "#4F46E5"], ["#FEF3C7", "#B45309"], ["#DCFCE7", "#15803D"],
  ["#FEE2E2", "#DC2626"], ["#F3E8FF", "#7C3AED"], ["#DBEAFE", "#1D4ED8"],
];
const avatarColor = (name) =>
  AVATAR_COLORS[((name || "").charCodeAt(0) || 0) % AVATAR_COLORS.length];

const fmtDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};
const fmtDateTime = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
};
const fmtDateTimeInput = (d) => {
  if (!d) return "";
  const x = new Date(d);
  const pad = (n) => String(n).padStart(2, "0");
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}T${pad(x.getHours())}:${pad(x.getMinutes())}`;
};
const nowForInput = () => fmtDateTimeInput(new Date());

/* ─── Component ─────────────────────────────────────────────────────────── */

export default function TaskDetail() {
  const router = useRouter();
  const { id }  = router.query;

  const [task,      setTask]      = useState(null);
  const [comments,  setComments]  = useState([]);
  const [activity,  setActivity]  = useState([]);
  const [employees, setEmployees] = useState([]);
  const [adminUser, setAdminUser] = useState(null);
  const [loading,   setLoading]   = useState(true);

  // UI tabs
  const [activeTab,   setActiveTab]   = useState("activity");
  const [submitting,  setSubmitting]  = useState(false);
  const [uploading,   setUploading]   = useState(false);

  // Stage detail panel (read-only, opens when clicking an approved/done stage)
  const [stageDetail, setStageDetail] = useState(null); // { idx, stg, stageEmps }

  // Reject modal
  const [showReject,     setShowReject]     = useState(false);
  const [rejectReason,   setRejectReason]   = useState("");
  const [rejectDeadline, setRejectDeadline] = useState("");
  const [rejectAssign,   setRejectAssign]   = useState("");

  // Stage editor
  const [stageModal,        setStageModal]        = useState(false);
  const [stageIdx,          setStageIdx]          = useState(0);
  const [stageForm,         setStageForm]         = useState({ name: "", assignedTo: [], deadline: "" });
  const [stageSaving,       setStageSaving]       = useState(false);
  const [stageRejectMode,   setStageRejectMode]   = useState(false);
  const [stageRejectReason, setStageRejectReason] = useState("");

  /* ── Fetch ─────────────────────────────────────────────────────────────── */
  useEffect(() => {
    fetch("/api/admin-users/me", { credentials: "include" })
      .then((r) => r.json()).then((d) => { if (d.success) setAdminUser(d.user); }).catch(() => {});
    fetch("/api/admin/assets/employees", { credentials: "include" })
      .then((r) => r.json()).then((d) => { if (d.success) setEmployees(d.employees || []); }).catch(() => {});
  }, []);

  const fetchTask = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res  = await fetch(`/api/admin/tasks/${id}`, { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setTask(data.task);
        setComments(data.comments || []);
        setActivity(data.activity || []);
      } else toast.error("Failed to load task");
    } catch { toast.error("Network error"); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchTask(); }, [fetchTask]);

  // Auto-refresh when this task changes anywhere (socket + polling + tab visibility)
  useTaskSync(fetchTask, { room: "admin-tasks" });

  /* ── Stage helpers ─────────────────────────────────────────────────────── */
  const buildStages = (overrideIdx, overrideData) =>
    STAGE_NAMES.map((name, i) => {
      const s = task?.stages?.[i];
      const base = {
        name:         s?.name         || name,
        assignedTo:   normalizeAssignedTo(s?.assignedTo),
        deadline:     s?.deadline     || null,
        done:         s?.done         || false,
        doneAt:       s?.doneAt       || null,
        approved:     s?.approved     || false,
        rejected:     s?.rejected     || false,
        rejectReason: s?.rejectReason || "",
        proofUrls:    s?.proofUrls    || [],
      };
      return i === overrideIdx ? { ...base, ...overrideData } : base;
    });

  const openStageEditor = (i) => {
    const stg = task?.stages?.[i];
    setStageIdx(i);
    setStageForm({
      name:       stg?.name || STAGE_NAMES[i],
      assignedTo: normalizeAssignedTo(stg?.assignedTo),
      deadline:   fmtDateTimeInput(stg?.deadline) || "",
    });
    setStageRejectMode(false);
    setStageRejectReason("");
    setStageModal(true);
  };

  const saveStage = async () => {
    if (stageForm.assignedTo.length > 0 && !stageForm.deadline) {
      toast.error("Deadline is required when a stage has assignees"); return;
    }
    setStageSaving(true);
    try {
      const cur    = task?.stages?.[stageIdx] || {};
      const stages = buildStages(stageIdx, {
        name:         stageForm.name,
        assignedTo:   stageForm.assignedTo,
        deadline:     stageForm.deadline   || null,
        done:         cur.done         || false,
        doneAt:       cur.doneAt       || null,
        approved:     cur.approved     || false,
        rejected:     cur.rejected     || false,
        rejectReason: cur.rejectReason || "",
        proofUrls:    cur.proofUrls    || [],
      });
      const patchBody = { stages, performedByName: adminUser?.name || "Admin" };
      if (stageForm.deadline) patchBody.dueDate = new Date(stageForm.deadline).toISOString();
      const res  = await fetch(`/api/admin/tasks/${id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchBody),
      });
      const data = await res.json();
      if (data.success) { toast.success("Stage updated"); setStageModal(false); fetchTask(); }
      else toast.error(data.message || "Failed");
    } catch { toast.error("Network error"); }
    finally { setStageSaving(false); }
  };

  const approveStage = async (i) => {
    setStageSaving(true);
    try {
      const cur    = task?.stages?.[i] || {};
      const stages = buildStages(i, {
        done:         true,
        doneAt:       cur.doneAt || new Date().toISOString(),
        approved:     true,
        rejected:     false,
        rejectReason: "",
        proofUrls:    cur.proofUrls || [],
      });
      const isLast = i >= 3;
      let stageUpdate = {};
      let statusUpdate = {};
      let toastMsg = "";
      if (isLast) {
        statusUpdate = { status: "completed" };
        toastMsg = "Stage approved · Task completed!";
      } else {
        stageUpdate = { stage: `S${i + 2}` };
        if (i === 2) {
          // S3 approved → always goes to client review
          statusUpdate = { status: "review" };
          toastMsg = "Stage approved · Awaiting client review";
        } else if (i === 0) {
          // S1 (Content) approved → always in_progress, never direct to client
          statusUpdate = { status: "in_progress" };
          toastMsg = `Stage approved · S${i + 2} now active`;
        } else {
          // S2 approved → S3 (Edit/Develop) still needs to be done, so always in_progress
          // "review" (client) only happens after S3 is approved, not S2
          statusUpdate = { status: "in_progress" };
          toastMsg = `Stage approved · S${i + 2} now active`;
        }
      }
      const body = { stages, performedByName: adminUser?.name || "Admin", ...stageUpdate, ...statusUpdate };
      const res  = await fetch(`/api/admin/tasks/${id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(toastMsg);
        setStageModal(false);
        fetchTask();
      } else toast.error(data.message || "Failed");
    } catch { toast.error("Network error"); }
    finally { setStageSaving(false); }
  };

  const rejectStage = async () => {
    if (!stageRejectReason.trim()) return toast.error("Enter a rejection reason");
    setStageSaving(true);
    try {
      const cur      = task?.stages?.[stageIdx] || {};
      const stageKey = `S${stageIdx + 1}`; // S1/S2/S3/S4
      const stages = buildStages(stageIdx, {
        done:         false,
        doneAt:       null,
        approved:     false,
        rejected:     true,
        rejectReason: stageRejectReason.trim(),
        proofUrls:    cur.proofUrls || [],
      });
      const res  = await fetch(`/api/admin/tasks/${id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        // Reset task.stage to the rejected stage so employee resubmit sets isActiveStage=true
        body: JSON.stringify({ stages, stage: stageKey, status: "in_progress", performedByName: adminUser?.name || "Admin" }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Stage rejected · employee notified");
        setStageModal(false);
        setStageRejectMode(false);
        setStageRejectReason("");
        fetchTask();
      } else toast.error(data.message || "Failed");
    } catch { toast.error("Network error"); }
    finally { setStageSaving(false); }
  };

  /* ── Approve ────────────────────────────────────────────────────────────── */
  const handleApprove = async () => {
    if (!window.confirm("Mark this task as Completed?")) return;
    try {
      const now = new Date().toISOString();
      const updates = { status: "completed", performedByName: adminUser?.name || "Admin" };
      // For production tasks, also mark S1 stage as done + approved so calendars pick it up
      if (task?.taskType === "production" && task.stages?.length > 0) {
        updates.stages = (task.stages || []).map((s, i) =>
          i === 0 ? { ...s, done: true, approved: true, rejected: false, rejectReason: "", doneAt: s.doneAt || now } : s
        );
      }
      const res  = await fetch(`/api/admin/tasks/${id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success) { toast.success("Task approved!"); fetchTask(); }
      else toast.error("Failed");
    } catch { toast.error("Network error"); }
  };

  /* ── Reject ─────────────────────────────────────────────────────────────── */
  const handleReject = async () => {
    if (!rejectReason.trim()) return toast.error("Enter a reason");
    setSubmitting(true);
    try {
      const body = {
        status:          "blocked",
        reviewNote:      rejectReason.trim(),
        performedByName: adminUser?.name || "Admin",
      };
      if (rejectDeadline) body.dueDate = rejectDeadline;
      if (rejectAssign)   body.assignedTo = rejectAssign;
      const res  = await fetch(`/api/admin/tasks/${id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Task rejected · assignee notified");
        setShowReject(false);
        setRejectReason("");
        setRejectDeadline("");
        setRejectAssign("");
        fetchTask();
      } else toast.error("Failed");
    } catch { toast.error("Network error"); }
    finally { setSubmitting(false); }
  };


  /* ── Attachment upload ─────────────────────────────────────────────────── */
  const handleAttachmentUpload = async (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append("files", f));
      fd.append("uploadedByModel", "AdminUser");
      if (adminUser?.name) fd.append("uploadedByName", adminUser.name);
      if (adminUser?._id)  fd.append("uploadedById",   adminUser._id);
      const res  = await fetch(`/api/admin/tasks/${id}/attachments`, {
        method: "POST", credentials: "include", body: fd,
      });
      const data = await res.json();
      if (data.success) { setTask((t) => ({ ...t, attachments: data.attachments })); toast.success("Uploaded!"); }
      else toast.error(data.message || "Upload failed");
    } catch { toast.error("Upload error"); }
    finally { setUploading(false); e.target.value = ""; }
  };

  const handleAttachmentDelete = async (attachmentId) => {
    if (!window.confirm("Remove this file?")) return;
    try {
      const res  = await fetch(`/api/admin/tasks/${id}/attachments`, {
        method: "DELETE", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attachmentId }),
      });
      const data = await res.json();
      if (data.success) setTask((t) => ({ ...t, attachments: data.attachments }));
      else toast.error("Failed");
    } catch { toast.error("Network error"); }
  };

  /* ── Priority update ─────────────────────────────────────────────────────── */
  const handlePriorityChange = async (priority) => {
    try {
      const res  = await fetch(`/api/admin/tasks/${id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority, performedByName: adminUser?.name || "Admin" }),
      });
      const data = await res.json();
      if (data.success) { setTask((t) => ({ ...t, priority })); }
      else toast.error("Failed");
    } catch { toast.error("Network error"); }
  };

  /* ── Loading / not found ─────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="leaves-management-admin">
        <Head>
          <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
          <link rel="stylesheet" href="/asets/css/main.css" />
          <link rel="stylesheet" href="/asets/css/admin.css" />
        </Head>
        <div className="add-employee-area">
          <div className="main-nav">
            <SmartLeftbar /><LeftbarMobile /><Dashnav />
            <section className="content home">
              <div style={{ padding: 80, textAlign: "center", color: "#94A3B8" }}>
                <div className="spinner-border text-primary" />
                <div style={{ marginTop: 14 }}>Loading task…</div>
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="leaves-management-admin">
        <Head>
          <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
          <link rel="stylesheet" href="/asets/css/main.css" />
          <link rel="stylesheet" href="/asets/css/admin.css" />
        </Head>
        <div className="add-employee-area">
          <div className="main-nav">
            <SmartLeftbar /><LeftbarMobile /><Dashnav />
            <section className="content home">
              <div style={{ padding: 80, textAlign: "center", color: "#94A3B8" }}>
                <i className="bi bi-inbox" style={{ fontSize: 48 }} />
                <div style={{ marginTop: 14, fontSize: 15 }}>Task not found</div>
                <button className="btn btn-primary btn-sm" style={{ marginTop: 20 }} onClick={() => router.push("/dashboard/admin/tasks/list")}>
                  ← Back to Tasks
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  }

  /* ── Derived values ─────────────────────────────────────────────────────── */
  // If task shows "review" but is still on an internal stage (S1/S2/S3), the status
  // was set prematurely — display as "In Progress" until S3 is approved and client review begins
  const effectiveStatus = (
    task.status === "review" &&
    task.taskType === "production" &&
    task.stage && ["S1","S2","S3"].includes(task.stage) &&
    task.stages?.[2]?.approved !== true
  ) ? "in_progress" : task.status;

  const sm       = (task.status === "todo" && task.reviewNote && task.taskType === "production")
    ? { label: "Client Revision", bg: "#FEF3C7", color: "#B45309", border: "#FDE68A" }
    : STATUS_META[effectiveStatus] || {};
  const pm       = PRIORITY_META[task.priority] || {};
  const tm       = TYPE_META[task.taskType]     || {};
  // Use earliest undone stage deadline (S1–S3 only for production), fall back to task.dueDate.
  // S4 (Posted/Live) deadline is auto-set from brand schedule and should not drive overdue state.
  const effectiveDueDate = (() => {
    const stages = task.stages || [];
    const relevantStages = task.taskType === "production" ? stages.slice(0, 3) : stages;
    const stageDLs = relevantStages.filter(s => s.deadline && !s.done).map(s => new Date(s.deadline));
    if (stageDLs.length) return stageDLs.reduce((a, b) => a < b ? a : b);
    return task.dueDate ? new Date(task.dueDate) : null;
  })();
  const isOverdue = effectiveDueDate && effectiveDueDate < new Date() && task.status !== "completed";

  const stages4 = STAGE_NAMES.map((name, i) => task.stages?.[i] || { name, assignedTo: null, deadline: null, done: false });

  // Determine active stage index from task.stage ("S1"→0, "S2"→1 …)
  const activeStageIdx = task.stage ? parseInt(task.stage.replace("S", "")) - 1 : stages4.findIndex((s) => !s.done);

  const getStageAssigneeEmps = (stg) => getStageEmps(stg, employees);

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div className="leaves-management-admin">
      <Head>
        <title>{task.nomenclature || task.title} — Task Detail</title>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
        <style>{`
          .tdbg { background:#fff; border-radius:16px; border:1.5px solid #F1F5F9; padding:20px 22px; margin-bottom:16px; }
          .tdbadge { display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700; }
          .tdbtn { border:none;cursor:pointer;border-radius:10px;padding:8px 18px;font-size:13px;font-weight:700;display:inline-flex;align-items:center;gap:6px;transition:all .15s; }
          .tdbtn:disabled { opacity:.5;cursor:default; }
          .tdbtn-primary { background:#4F46E5;color:#fff; }
          .tdbtn-primary:hover:not(:disabled) { background:#4338CA; }
          .tdbtn-ghost { background:#F1F5F9;color:#475569; }
          .tdbtn-ghost:hover { background:#E2E8F0; }
          .tdbtn-green { background:#DCFCE7;color:#15803D; }
          .tdbtn-green:hover { background:#BBF7D0; }
          .tdbtn-red { background:#FEE2E2;color:#DC2626; }
          .tdbtn-red:hover { background:#FCA5A5; }
          .td-overlay { position:fixed;inset:0;background:rgba(15,15,35,.55);backdrop-filter:blur(4px);z-index:1050;display:flex;align-items:center;justify-content:center;padding:16px; }
          .td-modal { background:#fff;border-radius:20px;width:100%;max-width:460px;box-shadow:0 24px 64px rgba(0,0,0,.18);max-height:90vh;overflow-y:auto; }
          .td-select { padding:8px 12px;border-radius:10px;border:1.5px solid #E5E7EB;font-size:13px;outline:none;background:#fff;cursor:pointer;width:100%; }
          .td-input { padding:8px 12px;border-radius:10px;border:1.5px solid #E5E7EB;font-size:13px;outline:none;width:100%; }
          .td-input:focus,.td-select:focus { border-color:#6366F1; }
          .td-tab { padding:7px 16px;border-radius:8px;border:1.5px solid #E5E7EB;background:#fff;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s; }
          .td-tab.act { background:#4F46E5;color:#fff;border-color:#4F46E5; }
          .td-meta-label { font-size:10px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:3px; }
          .td-meta-val { font-size:13px;font-weight:600;color:#1E293B; }
          /* Stage cards */
          .stage-card { border-radius:10px;padding:12px 14px;margin-bottom:8px;cursor:pointer;transition:all .15s;border:1.5px solid #E5E7EB; }
          .stage-card:hover { box-shadow:0 4px 16px rgba(0,0,0,.07); }
          .stage-card.s-done { border-left:4px solid #10B981;background:#F0FDF4;border-color:#BBF7D0; }
          .stage-card.s-active { border-left:4px solid #F59E0B;background:#FFFBEB;border-color:#FDE68A; }
          .stage-card.s-blocked { border-left:4px solid #DC2626;background:#FEF2F2;border-color:#FCA5A5; }
          .stage-card.s-pending { background:#F8FAFC;border-color:#E5E7EB; }
          .stage-dot { width:26px;height:26px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:#fff;flex-shrink:0; }
          .comment-bubble { background:#F8FAFC;border-radius:12px;padding:12px 16px;margin-bottom:10px; }
          .act-item { display:flex;gap:12px;padding:10px 0;border-bottom:1px solid #F8FAFC; }
          .act-item:last-child { border-bottom:none; }
          .act-dot-ring { width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:#EEF2FF;font-size:13px; }
          .file-row { display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;background:#F8FAFC;border:1.5px solid #F1F5F9;margin-bottom:8px; }
        `}</style>
      </Head>

      <div className="add-employee-area">
        <div className="main-nav">
          <SmartLeftbar />
          <LeftbarMobile />
          <Dashnav />

          <section className="content home">
            {/* Breadcrumb */}
            <div className="breadcrum-bx">
              <ul className="breadcrumb bg-white">
                <li className="breadcrumb-item">
                  <Link href="/dashboard/dashboard"><img src="/icons/home.svg" alt="" /> Dashboard</Link>
                </li>
                <li className="breadcrumb-item"><Link href="/dashboard/admin/tasks/list">Tasks</Link></li>
                <li className="breadcrumb-item active">{task.nomenclature || task.title}</li>
              </ul>
            </div>

            <div className="block-header add-emp-area">

              {/* ── Page header ── */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
                <div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                    <span className="tdbadge" style={{ background: tm.bg, color: tm.color }}>{tm.label || task.taskType}</span>
                    <span className="tdbadge" style={{ background: sm.bg, color: sm.color }}>{sm.label || task.status}</span>
                    <span className="tdbadge" style={{ background: pm.bg, color: pm.color }}>{pm.label || task.priority}</span>
                    {isOverdue && <span className="tdbadge" style={{ background: "#FEE2E2", color: "#DC2626" }}><i className="bi bi-exclamation-circle-fill" /> Overdue</span>}
                  </div>
                  <h4 style={{ fontWeight: 800, color: "#1E293B", margin: 0, fontSize: 20 }}>
                    {task.nomenclature || task.title}
                  </h4>
                  {task.nomenclature && task.title !== task.nomenclature && (
                    <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>{task.title}</div>
                  )}
                  <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>Created {fmtDateTime(task.createdAt)}</div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button className="tdbtn tdbtn-ghost" onClick={() => router.push("/dashboard/admin/tasks/list")}>
                    <i className="bi bi-arrow-left" /> Back
                  </button>
                  {task.taskType === "production" && task.status === "in_progress" && (() => {
                    const stageNum = task.stage ? parseInt(task.stage.replace("S","")) : 1;
                    const activeIdx = stageNum - 1;
                    const prevStage = task.stages?.[activeIdx - 1];
                    const curStage  = task.stages?.[activeIdx];
                    const prevDoneApproved = prevStage?.done && prevStage?.approved;
                    const curUnassigned = !curStage?.assignedTo?.length;
                    if (stageNum >= 2 && (prevDoneApproved || curStage?.done) && curUnassigned) {
                      return (
                        <button className="tdbtn" onClick={async () => {
                          try {
                            const r = await fetch(`/api/admin/tasks/${id}`, { method:"PATCH", credentials:"include", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ status:"review", performedByName: adminUser?.name||"Admin" }) });
                            const d = await r.json();
                            if (d.success) { toast.success("Sent to client review"); fetchTask(); }
                            else toast.error(d.message||"Failed");
                          } catch { toast.error("Network error"); }
                        }} style={{ background:"#EEF2FF", color:"#4F46E5", border:"1.5px solid #A5B4FC" }}>
                          <i className="bi bi-send me-1" />Send to Client
                        </button>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>

              {/* ── Top meta strip ── */}
              <div className="tdbg" style={{ display: "flex", gap: 28, flexWrap: "wrap", padding: "14px 22px" }}>
                {task.brandId && (
                  <div>
                    <span className="td-meta-label">Brand</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <div style={{ width: 22, height: 22, borderRadius: 6, background: (task.brandId.color || "#6366F1") + "25", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: task.brandId.color || "#6366F1", flexShrink: 0 }}>
                        {task.brandId.name?.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="td-meta-val">{task.brandId.name}</span>
                    </div>
                  </div>
                )}
                <div>
                  <span className="td-meta-label">Type</span>
                  <span className="td-meta-val" style={{ textTransform: "capitalize" }}>{task.contentType || task.taskType}</span>
                </div>
                <div>
                  <span className="td-meta-label">Final Deadline</span>
                  {/* Only full admin (adminUser===null) can edit deadline for general tasks */}
                  {task.taskType !== "production" && !adminUser ? (
                    <input
                      type="datetime-local"
                      className="td-input"
                      defaultValue={fmtDateTimeInput(task.dueDate)}
                      style={{ fontSize: 12, padding: "3px 8px", fontFamily: "monospace", minWidth: 170 }}
                      onBlur={async (e) => {
                        const val = e.target.value;
                        if (!val || val === fmtDateTimeInput(task.dueDate)) return;
                        try {
                          const res = await fetch(`/api/admin/tasks/${id}`, {
                            method: "PATCH", credentials: "include",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ dueDate: new Date(val).toISOString(), performedByName: "Admin" }),
                          });
                          const data = await res.json();
                          if (data.success) { toast.success("Deadline updated"); fetchTask(); }
                          else toast.error(data.message || "Failed");
                        } catch { toast.error("Network error"); }
                      }}
                    />
                  ) : (
                    <span className="td-meta-val" style={{ fontFamily: "monospace", color: isOverdue ? "#DC2626" : "#1E293B" }}>
                      {isOverdue && <i className="bi bi-exclamation-triangle-fill me-1" style={{ color: "#DC2626" }} />}
                      {fmtDateTime(effectiveDueDate || task.dueDate)}
                      {task.taskType !== "production" && adminUser && (
                        <span style={{ fontSize: 9, color: "#9CA3AF", marginLeft: 6, fontFamily: "sans-serif" }}>
                          <i className="bi bi-lock-fill" /> Admin only
                        </span>
                      )}
                    </span>
                  )}
                </div>
                <div>
                  <span className="td-meta-label">Status</span>
                  <span className="tdbadge" style={{ background: sm.bg, color: sm.color }}>{sm.label || task.status}</span>
                </div>
                {task.projectId && (
                  <div>
                    <span className="td-meta-label">Project</span>
                    <span className="td-meta-val">{task.projectId.name}</span>
                  </div>
                )}
                {task.sprintId && (
                  <div>
                    <span className="td-meta-label">Sprint</span>
                    <span className="td-meta-val">{task.sprintId.name}</span>
                  </div>
                )}
                <div style={{ marginLeft: "auto" }}>
                  <span className="td-meta-label">Priority</span>
                  <select
                    className="td-select"
                    value={task.priority}
                    style={{ fontSize: 12, padding: "4px 8px", background: pm.bg, color: pm.color, width: "auto", border: "none", fontWeight: 700 }}
                    onChange={(e) => handlePriorityChange(e.target.value)}
                  >
                    {PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_META[p].label}</option>)}
                  </select>
                </div>
              </div>

              {/* ── Two-column layout ── */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 18, alignItems: "start" }}>

                {/* ─── LEFT: stage progression + tabs ─── */}
                <div>
                  {/* Stage progression — Social Media only */}
                  {task.taskType === "production" && <div className="tdbg">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                      <div style={{ fontWeight: 800, fontSize: 14, color: "#1E293B" }}>
                        <i className="bi bi-diagram-3-fill me-2" style={{ color: "#6366F1" }} />Stage Progression
                      </div>
                      <span style={{ fontSize: 11, color: "#94A3B8" }}>Click any stage to edit</span>
                    </div>

                    {stages4.map((stg, i) => {
                      const isDone         = stg.done;
                      const isApproved     = stg.approved;
                      const isRejected     = stg.rejected;
                      const isPendingReview= isDone && !isApproved && !isRejected;
                      const isActive       = !isDone && i === activeStageIdx;
                      const isBlocked      = task.status === "blocked" && isActive;
                      const cls            = isRejected ? "s-blocked" : isApproved ? "s-done" : isPendingReview ? "s-active" : isDone ? "s-done" : isBlocked ? "s-blocked" : isActive ? "s-active" : "s-pending";
                      const stageEmps      = getStageAssigneeEmps(stg);

                      return (
                        <div key={i} className={`stage-card ${cls}`} onClick={() => {
                          if (isApproved || (isDone && !isPendingReview && !isRejected)) {
                            setStageDetail({ idx: i, stg, stageEmps });
                          } else {
                            openStageEditor(i);
                          }
                        }}>
                          {/* Stage header */}
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                            <div className="stage-dot" style={{ background: STAGE_COLORS[i] }}>{i + 1}</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 700, fontSize: 13, color: "#1E293B" }}>{stg.name || STAGE_NAMES[i]}</div>
                              <div style={{ fontSize: 10, color: "#94A3B8" }}>{STAGE_TEAM_LABELS[i]}</div>
                            </div>
                            {isApproved      && <span className="tdbadge" style={{ background: "#DCFCE7", color: "#15803D" }}><i className="bi bi-check2-circle" /> Approved</span>}
                            {isPendingReview && <span className="tdbadge" style={{ background: "#FEF3C7", color: "#B45309" }}><i className="bi bi-hourglass-split" /> Review</span>}
                            {isRejected      && <span className="tdbadge" style={{ background: "#FEE2E2", color: "#DC2626" }}><i className="bi bi-x-circle" /> Rejected</span>}
                            {!isDone && isActive  && <span className="tdbadge" style={{ background: "#FEF3C7", color: "#B45309" }}>active</span>}
                            {!isDone && !isActive && !isRejected && <span className="tdbadge" style={{ background: "#F1F5F9", color: "#94A3B8" }}>pending</span>}
                          </div>

                          {/* Assignees + Deadline */}
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 12 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                              {stageEmps.length > 0 ? (
                                <>
                                  <div style={{ display: "flex", gap: 2 }}>
                                    {stageEmps.slice(0, 3).map(emp => {
                                      const n = getEmpName(emp);
                                      const [bg, fg] = avatarColor(n);
                                      return (
                                        <div key={emp._id} title={n}
                                          style={{ width: 22, height: 22, borderRadius: 6, background: bg, color: fg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, flexShrink: 0 }}>
                                          {getInitials(n)}
                                        </div>
                                      );
                                    })}
                                    {stageEmps.length > 3 && <span style={{ fontSize: 9, color: "#94A3B8", alignSelf: "center" }}>+{stageEmps.length - 3}</span>}
                                  </div>
                                  <span style={{ color: "#1E293B", fontWeight: 700, fontSize: 11 }}>
                                    {stageEmps.map(e => getEmpName(e)).join(", ")}
                                  </span>
                                </>
                              ) : (
                                <span style={{ color: "#94A3B8" }}>Unassigned</span>
                              )}
                            </div>
                            {/* S4 (Posted/Live) deadline is auto-set from brand schedule — not shown here */}
                            {i < 3 && (
                              <div>
                                <span style={{ color: "#94A3B8" }}>Deadline: </span>
                                <strong style={{ color: "#1E293B", fontFamily: "monospace" }}>{fmtDateTime(stg.deadline)}</strong>
                              </div>
                            )}
                          </div>

                          {/* Rejected reason */}
                          {isRejected && stg.rejectReason && (
                            <div style={{ marginTop: 8, padding: "6px 10px", background: "#FEE2E2", borderRadius: 7, fontSize: 11, color: "#DC2626" }}>
                              <i className="bi bi-exclamation-circle me-1" />Rejected: {stg.rejectReason}
                            </div>
                          )}

                          {/* Proof URLs — show whether pending review OR already approved */}
                          {stg.done && stg.proofUrls?.length > 0 && (
                            <div style={{ marginTop: 8, padding: "8px 12px", background: isApproved ? "#F0FDF4" : "#FFFBEB", borderRadius: 7, border: `1px solid ${isApproved ? "#BBF7D0" : "#FDE68A"}` }} onClick={e => e.stopPropagation()}>
                              <div style={{ fontSize: 10, color: isApproved ? "#15803D" : "#B45309", fontWeight: 700, marginBottom: 4 }}>
                                <i className={`bi ${isApproved ? "bi-check-circle-fill" : "bi-link-45deg"} me-1`} />
                                {isApproved ? "APPROVED SUBMISSION" : "PROOF SUBMITTED"}
                              </div>
                              {stg.proofUrls.map((url, idx) => (
                                <a key={idx} href={url} target="_blank" rel="noreferrer"
                                  style={{ display: "block", fontSize: 11, color: "#4F46E5", wordBreak: "break-all", marginBottom: 2 }}>
                                  <i className="bi bi-link-45deg me-1" />{url}
                                </a>
                              ))}
                              {stg.doneNote && (
                                <div style={{ marginTop: 6, fontSize: 11, color: "#64748B", background: "rgba(0,0,0,.04)", borderRadius: 5, padding: "5px 8px", lineHeight: 1.5 }}>
                                  <span style={{ fontWeight: 700 }}>Note: </span>{stg.doneNote}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Approve / Reject buttons (inline on card) */}
                          {isPendingReview && (
                            <div style={{ display: "flex", gap: 8, marginTop: 10 }} onClick={e => e.stopPropagation()}>
                              <button onClick={() => approveStage(i)} disabled={stageSaving}
                                style={{ flex: 1, background: "#10B981", color: "#fff", border: "none", borderRadius: 8, padding: "7px 0", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                                <i className="bi bi-check2-circle me-1" />Approve
                              </button>
                              <button onClick={() => { openStageEditor(i); }}
                                style={{ flex: 1, background: "#FEE2E2", color: "#DC2626", border: "1.5px solid #FCA5A5", borderRadius: 8, padding: "7px 0", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                                <i className="bi bi-x-circle me-1" />Reject
                              </button>
                            </div>
                          )}

                          {isDone && !isPendingReview && !isRejected && isApproved && stg.doneAt && (
                            <div style={{ marginTop: 6, fontSize: 11, color: "#15803D" }}>
                              <i className="bi bi-check-circle me-1" />Approved {fmtDateTime(stg.doneAt)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>}

                  {/* ── Non-SMM task details ── */}
                  {task.taskType !== "production" && (() => {
                    const SEO_CAT_META = {
                      blog:      { label: "Blog Post",     color: "#6366F1", bg: "#EEF2FF", icon: "bi-file-text" },
                      technical: { label: "Technical SEO", color: "#EF4444", bg: "#FEF2F2", icon: "bi-code-slash" },
                      onpage:    { label: "On-Page",       color: "#3B82F6", bg: "#EFF6FF", icon: "bi-file-earmark-richtext" },
                      offpage:   { label: "Off-Page",      color: "#F59E0B", bg: "#FFFBEB", icon: "bi-link-45deg" },
                      backlinks: { label: "Backlinks",     color: "#10B981", bg: "#ECFDF5", icon: "bi-arrow-left-right" },
                    };
                    const catMeta = task.seoCategory ? SEO_CAT_META[task.seoCategory] : null;
                    const isAds      = task.tags?.includes("ads");
                    const isBranding = task.tags?.includes("branding");
                    const isSeo      = task.tags?.includes("seo");
                    return (
                      <div className="tdbg">
                        <div style={{ fontWeight: 800, fontSize: 14, color: "#1E293B", marginBottom: 16, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <i className="bi bi-info-circle-fill" style={{ color: "#6366F1" }} />Task Details
                          {catMeta && (
                            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: catMeta.bg, color: catMeta.color }}>
                              <i className={`bi ${catMeta.icon} me-1`} />{catMeta.label}
                            </span>
                          )}
                          {isAds && !catMeta && (
                            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: "#FFFBEB", color: "#B45309" }}>
                              <i className="bi bi-megaphone me-1" />Ads Task
                            </span>
                          )}
                          {isBranding && !catMeta && (
                            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: "#FDF2F8", color: "#BE185D" }}>
                              <i className="bi bi-palette me-1" />Branding Task
                            </span>
                          )}
                          {isSeo && !catMeta && (
                            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: "#D1FAE5", color: "#065F46" }}>
                              <i className="bi bi-search me-1" />SEO Task
                            </span>
                          )}
                        </div>

                        {/* Assignee */}
                        {task.assignedTo && (() => {
                          const n = getEmpName(task.assignedTo);
                          const [bg, fg] = avatarColor(n);
                          return (
                            <div style={{ marginBottom: 14 }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 5 }}>Assigned To</div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ width: 30, height: 30, borderRadius: 8, background: bg, color: fg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                                  {getInitials(n)}
                                </div>
                                <span style={{ fontWeight: 700, fontSize: 13, color: "#1E293B" }}>{n}</span>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Primary Keywords (blog only) */}
                        {task.pillar && (
                          <div style={{ marginBottom: 14 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 5 }}>Primary Keywords</div>
                            <div style={{ fontSize: 13, color: "#4F46E5", fontWeight: 600, background: "#EEF2FF", borderRadius: 8, padding: "7px 12px" }}>
                              {task.pillar}
                            </div>
                          </div>
                        )}

                        {/* Description */}
                        {task.description ? (
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>Description / Notes</div>
                            <div style={{ fontSize: 13, color: "#374151", background: "#F8FAFC", borderRadius: 10, padding: "12px 14px", whiteSpace: "pre-wrap", lineHeight: 1.7, maxHeight: 320, overflowY: "auto", border: "1.5px solid #F1F5F9" }}>
                              {task.description}
                            </div>
                          </div>
                        ) : (
                          <div style={{ textAlign: "center", padding: "28px 0", color: "#94A3B8" }}>
                            <i className="bi bi-file-text" style={{ fontSize: 32, display: "block", marginBottom: 8 }} />
                            No description added
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* ── Activity Log — production tasks ── */}
                  {task.taskType === "production" && (
                    <div className="tdbg">
                      <div style={{ fontWeight: 800, fontSize: 14, color: "#1E293B", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                        <i className="bi bi-clock-history" style={{ color: "#6366F1" }} />Activity Log
                        {activity.length > 0 && <span style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8" }}>({activity.length})</span>}
                      </div>
                      {activity.length === 0 ? (
                        <div style={{ padding: "20px 0", textAlign: "center", color: "#94A3B8" }}>
                          <i className="bi bi-clock-history" style={{ fontSize: 28, display: "block", marginBottom: 8 }} />
                          No activity yet
                        </div>
                      ) : (
                        [...activity].reverse().map((a) => (
                          <div key={a._id} className="act-item">
                            <div className="act-dot-ring"><i className="bi bi-activity" style={{ color: "#6366F1" }} /></div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, color: "#1E293B", fontWeight: 600 }}>
                                {ACTION_LABELS[a.action] || a.action}
                                {a.from && a.to && (
                                  <span style={{ fontWeight: 400, color: "#64748B" }}>
                                    {" "}— <span style={{ textDecoration: "line-through", color: "#94A3B8" }}>{fmtStatusVal(a.from)}</span> → <strong>{fmtStatusVal(a.to)}</strong>
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>
                                by <strong>{a.performedByName}</strong> · {fmtDateTime(a.createdAt)}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* ── Activity Log — non-SMM tasks ── */}
                  {task.taskType !== "production" && (
                    <div className="tdbg">
                      <div style={{ fontWeight: 800, fontSize: 14, color: "#1E293B", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                        <i className="bi bi-clock-history" style={{ color: "#6366F1" }} />Activity Log
                        {activity.length > 0 && <span style={{ fontSize: 12, fontWeight: 600, color: "#94A3B8" }}>({activity.length})</span>}
                      </div>
                      {activity.length === 0 ? (
                        <div style={{ padding: "20px 0", textAlign: "center", color: "#94A3B8" }}>
                          <i className="bi bi-clock-history" style={{ fontSize: 28, display: "block", marginBottom: 8 }} />
                          No activity yet
                        </div>
                      ) : (
                        [...activity].reverse().map((a) => (
                          <div key={a._id} className="act-item">
                            <div className="act-dot-ring"><i className="bi bi-activity" style={{ color: "#6366F1" }} /></div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, color: "#1E293B", fontWeight: 600 }}>
                                {ACTION_LABELS[a.action] || a.action}
                                {a.from && a.to && (
                                  <span style={{ fontWeight: 400, color: "#64748B" }}>
                                    {" "}— <span style={{ textDecoration: "line-through", color: "#94A3B8" }}>{fmtStatusVal(a.from)}</span> → <strong>{fmtStatusVal(a.to)}</strong>
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>
                                by <strong>{a.performedByName}</strong> · {fmtDateTime(a.createdAt)}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* ─── RIGHT: sidebar ─── */}
                <div>

                  {/* Client Feedback Card — shown when client gave feedback */}
                  {task.reviewNote && task.status === "todo" && task.taskType === "production" && (
                    <div className="tdbg" style={{ border: "2px solid #FDE68A", background: "#FFFBEB", marginBottom: 14 }}>
                      <div style={{ fontWeight: 800, fontSize: 13, color: "#B45309", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                        <i className="bi bi-chat-left-text-fill" />Client Requested Changes
                      </div>
                      <div style={{ fontSize: 12, color: "#78350F", background: "#FEF3C7", borderRadius: 8, padding: "10px 12px", lineHeight: 1.7, whiteSpace: "pre-wrap", marginBottom: 10 }}>
                        {task.reviewNote}
                      </div>
                      <div style={{ fontSize: 11, color: "#B45309" }}>
                        <i className="bi bi-info-circle me-1" />Share this feedback with the team so they can revise and resubmit.
                      </div>
                    </div>
                  )}

                  {/* Content Review Card — shown for all production tasks that have content */}
                  {task.taskType === "production" && (task.description || task.caption || task.referenceLink || task.pillar) && (() => {
                    const s0           = task.stages?.[0];
                    const s1Approved   = s0?.approved === true;
                    const isApprovedState = s1Approved || task.status === "completed";
                    // Show approve/reject whenever S1 is submitted but not yet reviewed — regardless of task.status
                    const isPendingReview = !!s0?.done && !s1Approved && !s0?.rejected;
                    const borderColor  = isApprovedState ? "#BBF7D0" : isPendingReview ? "#FDE68A" : "#E0E7FF";
                    const bgColor      = isApprovedState ? "#F0FDF4"  : isPendingReview ? "#FFFBEB"  : "#EEF2FF";
                    const titleColor   = isApprovedState ? "#15803D"  : isPendingReview ? "#B45309"  : "#4338CA";
                    const titleIcon    = isApprovedState ? "bi-check-circle-fill" : isPendingReview ? "bi-hourglass-split" : "bi-file-text-fill";
                    const titleText    = isApprovedState ? "Approved Content" : isPendingReview ? "Content for Admin Review" : "Content";
                    return (
                    <div className="tdbg" style={{ border: `2px solid ${borderColor}`, background: bgColor, marginBottom: 14 }}>
                      <div style={{ fontWeight: 800, fontSize: 13, color: titleColor, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                        <i className={`bi ${titleIcon}`} />
                        {titleText}
                      </div>
                      {s1Approved && (
                        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10, padding:"6px 10px", background:"#DCFCE7", borderRadius:7, fontSize:11, fontWeight:700, color:"#15803D" }}>
                          <i className="bi bi-check-circle-fill" /> S1 Script/Concept approved by admin
                        </div>
                      )}
                      {task.submittedAt && (
                        <div style={{ fontSize: 10, color: "#92400E", marginBottom: 10 }}>
                          Submitted {fmtDateTime(task.submittedAt)}
                        </div>
                      )}
                      {task.description && (
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 10, color: "#92400E", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Script</div>
                          <div style={{ fontSize: 12, color: "#374151", background: "#FEF3C7", borderRadius: 7, padding: "8px 10px", maxHeight: 120, overflowY: "auto", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                            {task.description}
                          </div>
                        </div>
                      )}
                      {task.caption && (
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 10, color: "#92400E", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Caption</div>
                          <div style={{ fontSize: 12, color: "#374151", background: "#FEF3C7", borderRadius: 7, padding: "8px 10px", maxHeight: 80, overflowY: "auto", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                            {task.caption}
                          </div>
                        </div>
                      )}
                      {task.tags?.length > 0 && (
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 10, color: "#92400E", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Hashtags</div>
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                            {task.tags.map(tag => (
                              <span key={tag} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: "#FDE68A", color: "#92400E", fontWeight: 600 }}>#{tag}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {task.referenceLink && (
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 10, color: "#92400E", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Reference Link</div>
                          <a href={task.referenceLink} target="_blank" rel="noreferrer"
                            style={{ fontSize: 11, color: "#4F46E5", wordBreak: "break-all" }}>
                            <i className="bi bi-link-45deg me-1" />{task.referenceLink}
                          </a>
                        </div>
                      )}
                      {task.pillar && (
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 10, color: "#92400E", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Pillar</div>
                          <span style={{ fontSize: 11, color: "#374151", fontWeight: 600 }}>{task.pillar}</span>
                        </div>
                      )}
                      {isPendingReview && (
                        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                          <button onClick={handleApprove}
                            style={{ flex: 1, background: "#10B981", color: "#fff", border: "none", borderRadius: 8, padding: "8px 0", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                            <i className="bi bi-check2-circle me-1" />Approve
                          </button>
                          <button onClick={() => setShowReject(true)}
                            style={{ flex: 1, background: "#FEE2E2", color: "#DC2626", border: "1.5px solid #FCA5A5", borderRadius: 8, padding: "8px 0", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                            <i className="bi bi-x-circle me-1" />Reject
                          </button>
                        </div>
                      )}
                    </div>
                    );
                  })()}

                  {/* General / Manual task review card */}
                  {task.taskType !== "production" && task.status === "review" && (
                    <div className="tdbg" style={{ border: "2px solid #FDE68A", background: "#FFFBEB", marginBottom: 14 }}>
                      <div style={{ fontWeight: 800, fontSize: 13, color: "#B45309", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                        <i className="bi bi-hourglass-split" /> Awaiting Approval
                      </div>
                      <div style={{ fontSize: 11, color: "#92400E", marginBottom: 12 }}>
                        Submitted by employee{task.submittedAt ? ` · ${fmtDateTime(task.submittedAt)}` : ""}
                      </div>

                      {task.description && (
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 10, color: "#92400E", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Work Report / Notes</div>
                          <div style={{ fontSize: 12.5, color: "#374151", background: "#FEF3C7", borderRadius: 7, padding: "10px 12px", whiteSpace: "pre-wrap", lineHeight: 1.6, maxHeight: 200, overflowY: "auto" }}>
                            {task.description}
                          </div>
                        </div>
                      )}

                      {task.caption && (
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 10, color: "#92400E", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Caption</div>
                          <div style={{ fontSize: 12.5, color: "#374151", background: "#FEF3C7", borderRadius: 7, padding: "10px 12px", whiteSpace: "pre-wrap", lineHeight: 1.6, maxHeight: 120, overflowY: "auto" }}>
                            {task.caption}
                          </div>
                        </div>
                      )}

                      {task.referenceLink && (
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 10, color: "#92400E", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Reference / Proof Link</div>
                          <a href={task.referenceLink} target="_blank" rel="noreferrer"
                            style={{ fontSize: 12, color: "#4F46E5", wordBreak: "break-all", display: "flex", alignItems: "center", gap: 4 }}>
                            <i className="bi bi-link-45deg" />{task.referenceLink}
                          </a>
                        </div>
                      )}

                      {task.proofLink && (
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 10, color: "#92400E", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Proof Link</div>
                          <a href={task.proofLink} target="_blank" rel="noreferrer"
                            style={{ fontSize: 12, color: "#4F46E5", wordBreak: "break-all", display: "flex", alignItems: "center", gap: 4 }}>
                            <i className="bi bi-link-45deg" />{task.proofLink}
                          </a>
                        </div>
                      )}

                      {task.pillar && (
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 10, color: "#92400E", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Pillar / Keywords</div>
                          <div style={{ fontSize: 12, color: "#374151" }}>{task.pillar}</div>
                        </div>
                      )}

                      {task.tags?.filter(t => t !== "general").length > 0 && (
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 10, color: "#92400E", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>Tags</div>
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                            {task.tags.filter(t => t !== "general").map(tag => (
                              <span key={tag} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "#FDE68A", color: "#92400E", fontWeight: 600 }}>#{tag}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                        <button onClick={handleApprove}
                          style={{ flex: 1, background: "#10B981", color: "#fff", border: "none", borderRadius: 8, padding: "10px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                          <i className="bi bi-check2-circle me-1" /> Approve
                        </button>
                        <button onClick={() => setShowReject(true)}
                          style={{ flex: 1, background: "#FEE2E2", color: "#DC2626", border: "1.5px solid #FCA5A5", borderRadius: 8, padding: "10px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                          <i className="bi bi-x-circle me-1" /> Reject
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Completed general task confirmation */}
                  {task.taskType !== "production" && task.status === "completed" && (
                    <div className="tdbg" style={{ border: "2px solid #BBF7D0", background: "#F0FDF4", marginBottom: 14 }}>
                      <div style={{ fontWeight: 800, fontSize: 13, color: "#15803D", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                        <i className="bi bi-check-circle-fill" /> Task Approved &amp; Completed
                      </div>
                      {task.description && (
                        <div style={{ fontSize: 12, color: "#374151", background: "#DCFCE7", borderRadius: 7, padding: "8px 10px", whiteSpace: "pre-wrap", lineHeight: 1.5, maxHeight: 150, overflowY: "auto", marginBottom: 6 }}>
                          {task.description}
                        </div>
                      )}
                      {task.referenceLink && (
                        <a href={task.referenceLink} target="_blank" rel="noreferrer"
                          style={{ fontSize: 11, color: "#4F46E5", wordBreak: "break-all", display: "flex", alignItems: "center", gap: 4 }}>
                          <i className="bi bi-link-45deg" />{task.referenceLink}
                        </a>
                      )}
                      {task.proofLink && (
                        <a href={task.proofLink} target="_blank" rel="noreferrer"
                          style={{ fontSize: 11, color: "#4F46E5", wordBreak: "break-all", display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                          <i className="bi bi-link-45deg" />{task.proofLink}
                        </a>
                      )}
                    </div>
                  )}

                  {/* Rejected general task */}
                  {task.taskType !== "production" && task.status === "blocked" && (
                    <div className="tdbg" style={{ border: "2px solid #FCA5A5", background: "#FEF2F2", marginBottom: 14 }}>
                      <div style={{ fontWeight: 800, fontSize: 13, color: "#DC2626", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                        <i className="bi bi-x-octagon-fill" /> Task Rejected
                      </div>
                      {task.reviewNote && (
                        <div style={{ fontSize: 12, color: "#7F1D1D" }}>Reason: {task.reviewNote}</div>
                      )}
                      <button onClick={() => setShowReject(true)}
                        style={{ marginTop: 10, background: "transparent", color: "#DC2626", border: "1.5px solid #FCA5A5", borderRadius: 7, padding: "6px 14px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                        <i className="bi bi-pencil me-1" /> Edit Rejection Note
                      </button>
                    </div>
                  )}

                  {/* Task meta */}
                  <div className="tdbg">
                    <div style={{ fontWeight: 800, fontSize: 13, color: "#1E293B", marginBottom: 14 }}>
                      <i className="bi bi-info-circle me-2" style={{ color: "#94A3B8" }} />Task Details
                    </div>

                    {[
                      { label: "Task ID", value: task.taskId || task._id?.slice(-8).toUpperCase() },
                      { label: "Type", value: <span className="tdbadge" style={{ background: tm.bg, color: tm.color }}>{tm.label || task.taskType}</span> },
                      { label: "Status", value: <span className="tdbadge" style={{ background: sm.bg, color: sm.color }}>{sm.label || task.status}</span> },
                      task.projectId?.name && { label: "Project", value: <span style={{ color: "#4F46E5", fontWeight: 700 }}><i className="bi bi-folder2 me-1" />{task.projectId.name}</span> },
                      task.sprintId?.name && { label: "Sprint", value: <span style={{ color: "#7C3AED", fontWeight: 700 }}><i className="bi bi-lightning-charge me-1" />{task.sprintId.name}</span> },
                      task.estimatedHours && { label: "Est. Hours", value: `${task.estimatedHours}h` },
                      { label: "Created", value: fmtDate(task.createdAt) },
                      { label: "Updated", value: fmtDate(task.updatedAt) },
                    ].filter(Boolean).map((row) => (
                      <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #F8FAFC" }}>
                        <span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600 }}>{row.label}</span>
                        <span style={{ fontSize: 12, color: "#1E293B", fontWeight: 600 }}>{row.value}</span>
                      </div>
                    ))}

                    {/* Assigned by */}
                    {task.assignedBy && (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #F8FAFC" }}>
                        <span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600 }}>Assigned By</span>
                        <span style={{ fontSize: 12, color: "#1E293B", fontWeight: 600 }}>
                          {task.assignedBy.name || `${task.assignedBy.firstName || ""} ${task.assignedBy.lastName || ""}`.trim() || "—"}
                        </span>
                      </div>
                    )}

                    {/* Tags */}
                    {task.tags?.length > 0 && (
                      <div style={{ paddingTop: 10 }}>
                        <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 700, marginBottom: 6 }}>TAGS</div>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {task.tags.map((tag) => (
                            <span key={tag} className="tdbadge" style={{ background: "#EEF2FF", color: "#4F46E5" }}>#{tag}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Description — shown in right sidebar for SMM only (non-SMM shows it in left column) */}
                  {task.description && task.taskType === "production" && (
                    <div className="tdbg">
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#1E293B", marginBottom: 10 }}>
                        <i className="bi bi-card-text me-2" style={{ color: "#94A3B8" }} />Description
                      </div>
                      <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" }}>{task.description}</p>
                    </div>
                  )}

                  {/* Quick stats */}
                  {task.taskType === "production" ? (
                    <div className="tdbg" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: "14px 16px", textAlign: "center" }}>
                      <div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: "#10B981" }}>{stages4.filter(s => s.done).length}</div>
                        <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 600 }}>Stages Done</div>
                      </div>
                      <div style={{ borderLeft: "1px solid #F1F5F9" }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: "#6366F1" }}>{activity.length}</div>
                        <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 600 }}>Activity</div>
                      </div>
                    </div>
                  ) : (
                    <div className="tdbg" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: "14px 16px", textAlign: "center" }}>
                      <div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: "#6366F1" }}>{activity.length}</div>
                        <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 600 }}>Activity</div>
                      </div>
                      <div style={{ borderLeft: "1px solid #F1F5F9" }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: task.status === "completed" ? "#10B981" : task.status === "blocked" ? "#DC2626" : "#F59E0B" }}>
                          {task.status === "completed" ? <i className="bi bi-check-circle-fill" /> : task.status === "blocked" ? <i className="bi bi-x-circle-fill" /> : <i className="bi bi-hourglass-split" />}
                        </div>
                        <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 600 }}>Status</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* ════ STAGE DETAIL MODAL (read-only, for approved/done stages) ════ */}
      {stageDetail && (
        <div className="td-overlay" onClick={() => setStageDetail(null)}>
          <div className="td-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #F1F5F9" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className="stage-dot" style={{ background: STAGE_COLORS[stageDetail.idx], width: 30, height: 30, fontSize: 13 }}>{stageDetail.idx + 1}</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: "#1E293B" }}>{stageDetail.stg.name || STAGE_NAMES[stageDetail.idx]}</div>
                  <div style={{ fontSize: 11, color: "#94A3B8" }}>{STAGE_TEAM_LABELS[stageDetail.idx]}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button className="tdbtn tdbtn-ghost" style={{ padding: "5px 12px", fontSize: 11 }}
                  onClick={() => { setStageDetail(null); openStageEditor(stageDetail.idx); }}>
                  <i className="bi bi-pencil me-1" />Edit
                </button>
                <button className="tdbtn tdbtn-ghost" style={{ padding: "5px 9px" }} onClick={() => setStageDetail(null)}>
                  <i className="bi bi-x-lg" style={{ fontSize: 13 }} />
                </button>
              </div>
            </div>
            <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Status badge */}
              <div style={{ display: "flex", gap: 8 }}>
                {stageDetail.stg.approved
                  ? <span className="tdbadge" style={{ background: "#DCFCE7", color: "#15803D", fontSize: 12, padding: "4px 12px" }}><i className="bi bi-check-circle-fill me-1" />Admin Approved</span>
                  : <span className="tdbadge" style={{ background: "#FEF3C7", color: "#B45309", fontSize: 12, padding: "4px 12px" }}><i className="bi bi-hourglass-split me-1" />Pending Review</span>
                }
                {stageDetail.stg.doneAt && (
                  <span style={{ fontSize: 11, color: "#94A3B8", alignSelf: "center" }}>{fmtDateTime(stageDetail.stg.doneAt)}</span>
                )}
              </div>

              {/* Assignees */}
              {stageDetail.stageEmps.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", marginBottom: 6 }}>Submitted By</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {stageDetail.stageEmps.map(emp => {
                      const n = getEmpName(emp);
                      const [bg, fg] = avatarColor(n);
                      return (
                        <div key={emp._id} style={{ display: "flex", alignItems: "center", gap: 7, background: "#F8FAFC", borderRadius: 8, padding: "6px 10px", border: "1px solid #F1F5F9" }}>
                          <div style={{ width: 24, height: 24, borderRadius: 6, background: bg, color: fg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800 }}>{getInitials(n)}</div>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "#1E293B" }}>{n}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Submitted proof links */}
              {stageDetail.stg.proofUrls?.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", marginBottom: 6 }}>Submitted Work</div>
                  <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10, padding: "10px 14px" }}>
                    {stageDetail.stg.proofUrls.map((url, idx) => (
                      <a key={idx} href={url} target="_blank" rel="noreferrer"
                        style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#4F46E5", textDecoration: "none", marginBottom: idx < stageDetail.stg.proofUrls.length - 1 ? 6 : 0, wordBreak: "break-all", lineHeight: 1.4 }}>
                        <i className="bi bi-link-45deg" style={{ flexShrink: 0 }} />{url}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Employee notes */}
              {stageDetail.stg.doneNote && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", marginBottom: 6 }}>Employee Notes</div>
                  <div style={{ fontSize: 13, color: "#374151", background: "#F8FAFC", border: "1px solid #F1F5F9", borderRadius: 10, padding: "10px 14px", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                    {stageDetail.stg.doneNote}
                  </div>
                </div>
              )}

              {/* Deadline */}
              {stageDetail.stg.deadline && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid #F1F5F9" }}>
                  <span style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600 }}>Stage Deadline</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#1E293B", fontFamily: "monospace" }}>{fmtDateTime(stageDetail.stg.deadline)}</span>
                </div>
              )}

              {/* Approve button if pending review */}
              {stageDetail.stg.done && !stageDetail.stg.approved && !stageDetail.stg.rejected && (
                <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
                  <button onClick={() => { approveStage(stageDetail.idx); setStageDetail(null); }} disabled={stageSaving}
                    style={{ flex: 1, background: "#10B981", color: "#fff", border: "none", borderRadius: 10, padding: "10px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    <i className="bi bi-check2-circle me-1" />Approve Stage
                  </button>
                  <button onClick={() => { setStageDetail(null); openStageEditor(stageDetail.idx); }}
                    style={{ flex: 1, background: "#FEE2E2", color: "#DC2626", border: "1.5px solid #FCA5A5", borderRadius: 10, padding: "10px 0", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    <i className="bi bi-x-circle me-1" />Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════ STAGE EDITOR MODAL ════ */}
      {stageModal && (
        <div className="td-overlay" onClick={() => setStageModal(false)}>
          <div className="td-modal" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #F1F5F9" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div className="stage-dot" style={{ background: STAGE_COLORS[stageIdx], width: 30, height: 30, fontSize: 13 }}>{stageIdx + 1}</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: "#1E293B" }}>Edit Stage S{stageIdx + 1}</div>
                  <div style={{ fontSize: 11, color: "#94A3B8" }}>{STAGE_NAMES[stageIdx]}</div>
                </div>
              </div>
              <button className="tdbtn tdbtn-ghost" style={{ padding: "5px 9px" }} onClick={() => setStageModal(false)}>
                <i className="bi bi-x-lg" style={{ fontSize: 13 }} />
              </button>
            </div>

            <div style={{ padding: "18px 20px" }}>
              {/* Task info */}
              <div style={{ background: "#F8FAFC", borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 12 }}>
                <span style={{ color: "#94A3B8" }}>Task: </span>
                <strong style={{ color: "#1E293B" }}>{task.nomenclature || task.title}</strong>
                {task.brandId && <span style={{ color: "#6366F1", marginLeft: 8 }}>· {task.brandId.name}</span>}
              </div>

              {/* Stage name */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 10.5, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: 5 }}>Stage Name</label>
                <input className="td-input" value={stageForm.name} onChange={(e) => setStageForm((f) => ({ ...f, name: e.target.value }))} />
              </div>

              {/* Assignees (dept-filtered, checkbox list) */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 10.5, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: 5 }}>
                  Assignees · {STAGE_TEAM_LABELS[stageIdx]}
                </label>
                <div style={{ border: "1.5px solid #E5E7EB", borderRadius: 10, maxHeight: 140, overflowY: "auto", background: "#fff" }}>
                  {filterByDept(employees, STAGE_DEPT_KEYWORDS[stageIdx]).map((emp, ei, arr) => {
                    const n = `${emp.personal?.firstName || emp.firstName || ""} ${emp.personal?.lastName || emp.lastName || ""}`.trim();
                    const checked = stageForm.assignedTo.includes(emp._id);
                    return (
                      <label key={emp._id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", cursor: "pointer", borderBottom: ei < arr.length - 1 ? "1px solid #F8FAFC" : "none", background: checked ? STAGE_COLORS[stageIdx] + "12" : "transparent" }}>
                        <input type="checkbox" checked={checked} style={{ accentColor: STAGE_COLORS[stageIdx], width: 14, height: 14 }}
                          onChange={(e) => setStageForm((f) => ({
                            ...f,
                            assignedTo: e.target.checked ? [...f.assignedTo, emp._id] : f.assignedTo.filter(id => id !== emp._id)
                          }))} />
                        <span style={{ fontSize: 13, color: checked ? "#1E293B" : "#374151", fontWeight: checked ? 700 : 400 }}>{n || "Employee"}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Deadline */}
              {(() => {
                const origDL = task?.stages?.[stageIdx]?.deadline;
                const dlLocked = !!adminUser && !!origDL;
                return (
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 10.5, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: ".06em", display: "block", marginBottom: 5 }}>
                    Deadline {stageForm.assignedTo.length > 0 && !dlLocked && <span style={{ color: "#EF4444" }}>*</span>}
                  </label>
                  <input type="datetime-local" className="td-input" value={stageForm.deadline}
                    disabled={dlLocked}
                    style={{ borderColor: stageForm.assignedTo.length > 0 && !stageForm.deadline && !dlLocked ? "#FCA5A5" : "", opacity: dlLocked ? 0.55 : 1, cursor: dlLocked ? "not-allowed" : "auto", background: dlLocked ? "#F8FAFC" : "" }}
                    onChange={(e) => setStageForm((f) => ({ ...f, deadline: e.target.value }))} />
                  {dlLocked ? (
                    <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4, display:"flex", alignItems:"center", gap:4 }}>
                      <i className="bi bi-lock-fill" style={{ fontSize:10 }} /> Only admin can change an existing deadline
                    </div>
                  ) : adminUser && !origDL ? (
                    <div style={{ fontSize: 11, color: "#7C3AED", marginTop: 4, display:"flex", alignItems:"center", gap:4 }}>
                      <i className="bi bi-info-circle-fill" style={{ fontSize:10 }} /> Set once — only admin can change it after saving
                    </div>
                  ) : stageForm.assignedTo.length > 0 && !stageForm.deadline ? (
                    <div style={{ fontSize: 11, color: "#EF4444", marginTop: 4 }}>Required — stage has assignees</div>
                  ) : null}
                </div>
                );
              })()}

              {/* Status row (read-only for admin) */}
              {(() => {
                const stg = task.stages?.[stageIdx] || {};
                return (
                  <div style={{ background: "#F8FAFC", border: "1px solid #F1F5F9", borderRadius: 10, padding: "10px 14px", marginBottom: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      {stg.approved  ? <span style={{ color: "#15803D" }}><i className="bi bi-check-circle-fill me-1" />Approved</span>
                      : stg.rejected ? <span style={{ color: "#DC2626" }}><i className="bi bi-x-circle-fill me-1" />Rejected</span>
                      : stg.done     ? <span style={{ color: "#B45309" }}><i className="bi bi-hourglass-split me-1" />Pending Review</span>
                                     : <span style={{ color: "#94A3B8" }}><i className="bi bi-clock me-1" />Not started</span>}
                    </div>
                  </div>
                );
              })()}

              {/* Approve / Reject panel */}
              {(() => {
                const stg = task.stages?.[stageIdx] || {};
                if (!stg.done) return null;

                if (stg.approved) {
                  return (
                    <div style={{ background: "#F0FDF4", border: "1.5px solid #BBF7D0", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 13, fontWeight: 700, color: "#15803D" }}>
                      <i className="bi bi-check-circle-fill me-2" />Stage Approved
                    </div>
                  );
                }

                if (stg.rejected) {
                  return (
                    <div style={{ background: "#FEF2F2", border: "1.5px solid #FCA5A5", borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
                      <div style={{ fontWeight: 700, color: "#DC2626", fontSize: 13, marginBottom: 4 }}><i className="bi bi-x-circle-fill me-2" />Stage Rejected</div>
                      {stg.rejectReason && <div style={{ fontSize: 12, color: "#991B1B" }}>Reason: {stg.rejectReason}</div>}
                    </div>
                  );
                }

                /* Pending review */
                return (
                  <div style={{ background: "#FFFBEB", border: "1.5px solid #FDE68A", borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
                    <div style={{ fontWeight: 700, color: "#B45309", fontSize: 13, marginBottom: 8 }}>
                      <i className="bi bi-hourglass-split me-2" />Pending Admin Review
                    </div>

                    {stg.proofUrls?.length > 0 && (
                      <div style={{ marginBottom: 10, padding: "8px 10px", background: "#fff", borderRadius: 8, border: "1px solid #FDE68A" }}>
                        <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 700, marginBottom: 4 }}>PROOF SUBMITTED</div>
                        {stg.proofUrls.map((url, idx) => (
                          <a key={idx} href={url} target="_blank" rel="noreferrer"
                            style={{ display: "block", fontSize: 11, color: "#4F46E5", wordBreak: "break-all", marginBottom: 2 }}>
                            <i className="bi bi-link-45deg me-1" />{url}
                          </a>
                        ))}
                      </div>
                    )}

                    {!stageRejectMode ? (
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => approveStage(stageIdx)} disabled={stageSaving}
                          style={{ flex: 1, background: "#10B981", color: "#fff", border: "none", borderRadius: 8, padding: "8px 0", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                          <i className="bi bi-check2-circle me-1" />Approve
                        </button>
                        <button onClick={() => setStageRejectMode(true)}
                          style={{ flex: 1, background: "#FEE2E2", color: "#DC2626", border: "1.5px solid #FCA5A5", borderRadius: 8, padding: "8px 0", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                          <i className="bi bi-x-circle me-1" />Reject
                        </button>
                      </div>
                    ) : (
                      <div>
                        <textarea
                          placeholder="Rejection reason (e.g. Audio is off — needs re-edit)"
                          value={stageRejectReason}
                          onChange={(e) => setStageRejectReason(e.target.value)}
                          style={{ width: "100%", padding: "8px 10px", border: "1.5px solid #FCA5A5", borderRadius: 8, fontSize: 12, resize: "vertical", minHeight: 64, marginBottom: 8, outline: "none", fontFamily: "inherit" }}
                        />
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => { setStageRejectMode(false); setStageRejectReason(""); }}
                            style={{ flex: 1, background: "#F1F5F9", color: "#64748B", border: "none", borderRadius: 8, padding: "7px 0", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                            Cancel
                          </button>
                          <button onClick={rejectStage} disabled={stageSaving || !stageRejectReason.trim()}
                            style={{ flex: 1, background: "#DC2626", color: "#fff", border: "none", borderRadius: 8, padding: "7px 0", fontWeight: 700, fontSize: 12, cursor: "pointer", opacity: !stageRejectReason.trim() ? 0.5 : 1 }}>
                            Confirm Reject
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Footer */}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 14, borderTop: "1px solid #F1F5F9" }}>
                <button className="tdbtn tdbtn-ghost" onClick={() => { setStageModal(false); setStageRejectMode(false); setStageRejectReason(""); }}>Cancel</button>
                <button className="tdbtn tdbtn-primary" onClick={saveStage} disabled={stageSaving}>
                  {stageSaving ? "Saving…" : <><i className="bi bi-check2" /> Save Changes</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════ REJECT MODAL ════ */}
      {showReject && (
        <div className="td-overlay" onClick={() => setShowReject(false)}>
          <div className="td-modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #F1F5F9" }}>
              <h5 style={{ fontWeight: 800, color: "#DC2626", margin: 0, fontSize: 15 }}>
                <i className="bi bi-x-circle-fill me-2" />{task?.status === "review" ? "Reject Content — Send Back for Revision" : "Reject & Reassign"}
              </h5>
              <button className="tdbtn tdbtn-ghost" style={{ padding: "5px 9px" }} onClick={() => setShowReject(false)}>
                <i className="bi bi-x-lg" style={{ fontSize: 13 }} />
              </button>
            </div>
            <div style={{ padding: "18px 20px" }}>
              <div style={{ background: "#FFF1F2", border: "1px solid #FCA5A5", borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#DC2626" }}>
                <i className="bi bi-exclamation-triangle-fill me-2" />
                {task?.status === "review"
                  ? "The employee will see your feedback and can revise then resubmit."
                  : "Rejecting will set status to Rejected and notify the assignee."}
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#64748B", display: "block", marginBottom: 6 }}>
                  {task?.status === "review" ? "FEEDBACK FOR EMPLOYEE" : "REASON FOR REJECTION"} <span style={{ color: "#EF4444" }}>*</span>
                </label>
                <textarea
                  className="td-input"
                  rows={3}
                  placeholder={task?.status === "review" ? "e.g. Script hook needs to be stronger — revise opening line" : "e.g. Logo placement is off — needs revision"}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  style={{ resize: "vertical" }}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#64748B", display: "block", marginBottom: 6 }}>NEW DEADLINE</label>
                  <input type="datetime-local" className="td-input" value={rejectDeadline} onChange={(e) => setRejectDeadline(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "#64748B", display: "block", marginBottom: 6 }}>REASSIGN TO (optional)</label>
                  <select className="td-select" value={rejectAssign} onChange={(e) => setRejectAssign(e.target.value)}>
                    <option value="">Keep same assignee</option>
                    {employees.map((emp) => {
                      const n = `${emp.personal?.firstName || emp.firstName || ""} ${emp.personal?.lastName || emp.lastName || ""}`.trim();
                      return <option key={emp._id} value={emp._id}>{n || "Employee"}</option>;
                    })}
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button className="tdbtn tdbtn-ghost" onClick={() => setShowReject(false)}>Cancel</button>
                <button className="tdbtn tdbtn-red" onClick={handleReject} disabled={submitting || !rejectReason.trim()}>
                  {submitting ? "Saving…" : <><i className="bi bi-x-circle-fill" /> Reject &amp; Reassign</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState, useCallback } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import SmartLeftbar from "@/components/SmartLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import Dashnav from "@/components/Dashnav";

const STAGE_COLORS = ["#F59E0B", "#6366F1", "#10B981", "#EC4899"];
const STAGE_NAMES  = ["Script/Concept", "Shoot", "Design/Edit/Develop", "Posted/Live"];
const STAGE_KEYS   = ["S1", "S2", "S3", "S4"];

function fmtDateTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function ApprovalsPage() {
  const router = useRouter();
  const [allTasks, setAllTasks] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState({});
  const [expanded, setExpanded] = useState({});
  const [statusTab, setStatusTab] = useState("pending"); // pending | approved | rejected | all

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/tasks?limit=500&hideCompleted=false", { credentials: "include" });
      const d = await r.json();
      if (d.success) {
        // Show ALL tasks that have gone through any approval activity
        const relevant = (d.tasks || []).filter(t =>
          (t.stages || []).some(s => s.done || s.approved || s.rejected)
          || ["review", "completed", "blocked", "in_progress"].includes(t.status)
        );
        setAllTasks(relevant);
      }
    } catch { toast.error("Failed to load"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function approveStage(task, stageIdx) {
    const key = `${task._id}_${stageIdx}`;
    setSaving(p => ({ ...p, [key]: true }));
    try {
      const stages = (task.stages || []).map((s, i) =>
        i === stageIdx ? { ...s, done: true, approved: true, rejected: false, rejectReason: "", doneAt: s.doneAt || new Date().toISOString() } : s
      );
      const nextAssigned = (task.stages?.[stageIdx + 1]?.assignedTo || []);
      const isLast = stageIdx === 3;
      const updates = {
        stages,
        stage:  isLast ? "S4" : STAGE_KEYS[stageIdx + 1],
        status: isLast ? "completed"
               : (stageIdx === 0 && nextAssigned.length === 0) ? "completed"
               : nextAssigned.length > 0 ? "in_progress" : "review",
      };
      if (isLast || (stageIdx === 0 && nextAssigned.length === 0)) updates.stage = "S4";

      const res = await fetch(`/api/admin/tasks/${task._id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success) { toast.success("Approved!"); load(); }
      else toast.error(data.message || "Failed");
    } catch { toast.error("Network error"); }
    finally { setSaving(p => ({ ...p, [key]: false })); }
  }

  async function rejectStage(task, stageIdx, reason) {
    if (!reason?.trim()) return toast.error("Rejection reason required");
    const key = `${task._id}_${stageIdx}_rej`;
    setSaving(p => ({ ...p, [key]: true }));
    try {
      const stages = (task.stages || []).map((s, i) =>
        i === stageIdx ? { ...s, done: false, approved: false, rejected: true, rejectReason: reason, doneAt: null } : s
      );
      const res = await fetch(`/api/admin/tasks/${task._id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stages, status: "in_progress", stage: STAGE_KEYS[stageIdx] }),
      });
      const data = await res.json();
      if (data.success) { toast.success("Rejected & returned to employee"); load(); }
      else toast.error(data.message || "Failed");
    } catch { toast.error("Network error"); }
    finally { setSaving(p => ({ ...p, [key]: false })); }
  }

  async function approveTask(task) {
    const key = `${task._id}_task`;
    setSaving(p => ({ ...p, [key]: true }));
    try {
      const res = await fetch(`/api/admin/tasks/${task._id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      const data = await res.json();
      if (data.success) { toast.success("Task approved!"); load(); }
      else toast.error(data.message || "Failed");
    } catch { toast.error("Network error"); }
    finally { setSaving(p => ({ ...p, [key]: false })); }
  }

  async function rejectTask(task, reason) {
    if (!reason?.trim()) return toast.error("Rejection reason required");
    const key = `${task._id}_task_rej`;
    setSaving(p => ({ ...p, [key]: true }));
    try {
      const res = await fetch(`/api/admin/tasks/${task._id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "blocked", reviewNote: reason }),
      });
      const data = await res.json();
      if (data.success) { toast.success("Rejected & returned to employee"); load(); }
      else toast.error(data.message || "Failed");
    } catch { toast.error("Network error"); }
    finally { setSaving(p => ({ ...p, [key]: false })); }
  }

  // Build flat list of all approval items (one entry per stage, plus task-level reviews)
  function buildItems(taskList) {
    const items = [];
    taskList.forEach(t => {
      const stages = t.stages || [];
      if (stages.length > 0) {
        stages.forEach((s, i) => {
          if (s.done || s.approved || s.rejected) {
            items.push({ task: t, stageIdx: i, stg: s, type: "stage" });
          }
        });
      } else {
        // Non-production task (no stages) - show at task level
        if (["review", "completed", "blocked", "in_progress"].includes(t.status)) {
          items.push({ task: t, stageIdx: -1, stg: null, type: "task" });
        }
      }
    });
    return items;
  }

  const allItems     = buildItems(allTasks);
  const pendingItems = allItems.filter(({ stg, task, type }) =>
    type === "stage"
      ? (stg.done && !stg.approved && !stg.rejected)
      : task.status === "review"
  );
  const approvedItems = allItems.filter(({ stg, task, type }) =>
    type === "stage" ? stg.approved : task.status === "completed"
  );
  const rejectedItems = allItems.filter(({ stg, task, type }) =>
    type === "stage" ? stg.rejected : task.status === "blocked"
  );

  const displayedItems = statusTab === "pending"  ? pendingItems
                       : statusTab === "approved" ? approvedItems
                       : statusTab === "rejected" ? rejectedItems
                       : allItems;

  const pendingCount  = pendingItems.length;
  const approvedCount = approvedItems.length;
  const rejectedCount = rejectedItems.length;
  const totalCount    = allItems.length;

  return (
    <div className="leaves-management-admin">
      <Head>
        <title>Approvals — Task Management</title>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
        <style>{`
          .ap-card { background:#fff; border-radius:14px; border:1.5px solid #F1F5F9; padding:0; margin-bottom:14px; overflow:hidden; transition:box-shadow .12s; }
          .ap-card:hover { box-shadow:0 4px 20px rgba(99,102,241,.08); }
          .ap-card-head { padding:14px 18px; display:flex; align-items:center; gap:12px; cursor:pointer; }
          .ap-card-body { padding:0 18px 16px; border-top:1px solid #F8FAFC; }
          .ap-content-box { background:#F8FAFC; border-radius:10px; padding:12px 14px; margin-bottom:12px; font-size:13px; color:#374151; white-space:pre-wrap; line-height:1.65; max-height:200px; overflow-y:auto; }
          .ap-stage-badge { display:inline-flex; align-items:center; gap:4px; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700; }
          .ap-actions { display:flex; gap:8px; margin-top:10px; }
          .ap-btn-approve { flex:1; background:#10B981; color:#fff; border:none; border-radius:8px; padding:9px 0; font-size:12px; font-weight:700; cursor:pointer; font-family:inherit; }
          .ap-btn-reject  { flex:1; background:#FEE2E2; color:#DC2626; border:1.5px solid #FCA5A5; border-radius:8px; padding:9px 0; font-size:12px; font-weight:700; cursor:pointer; font-family:inherit; }
          .ap-btn-view    { padding:8px 14px; background:#EEF2FF; color:#4F46E5; border:none; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer; font-family:inherit; text-decoration:none; display:inline-flex; align-items:center; gap:4px; }
          .ap-reject-input { width:100%; padding:8px 10px; border:1.5px solid #FCA5A5; border-radius:8px; font-size:12px; outline:none; font-family:inherit; resize:vertical; min-height:52px; margin-top:8px; }
          .ap-tab { padding:6px 14px; border-radius:8px; border:1.5px solid #E5E7EB; background:#fff; font-size:12px; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:5px; }
          .ap-tab.active { background:#4F46E5; color:#fff; border-color:#4F46E5; }
          .ap-proof-link { display:flex; align-items:center; gap:6px; font-size:12px; color:#4F46E5; text-decoration:none; margin-bottom:4px; word-break:break-all; }
        `}</style>
      </Head>

      <div className="add-employee-area">
        <div className="main-nav">
          <SmartLeftbar />
          <LeftbarMobile />
          <Dashnav />

          <section className="content home">
            <div className="breadcrum-bx">
              <ul className="breadcrumb bg-white">
                <li className="breadcrumb-item">
                  <Link href="/dashboard/admin/tasks"><img src="/icons/home.svg" alt="" /> Task Management</Link>
                </li>
                <li className="breadcrumb-item active">Approvals</li>
              </ul>
            </div>

            <div className="block-header add-emp-area">
              {/* Header */}
              <div className="attendance-topbar leave-management-topbar" style={{ marginBottom: 20 }}>
                <div>
                  <h5 className="admin-main-heading">
                    Approvals
                    {pendingCount > 0 && <span style={{ marginLeft: 10, background: "#EF4444", color: "#fff", fontSize: 12, fontWeight: 800, borderRadius: 20, padding: "2px 9px" }}>{pendingCount}</span>}
                  </h5>
                  <p style={{ fontSize: 13, color: "#64748B", margin: 0 }}>Review and approve or reject submitted stage work</p>
                </div>
                <button onClick={load} style={{ background: "#F1F5F9", color: "#475569", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
                  <i className="bi bi-arrow-clockwise" /> Refresh
                </button>
              </div>

              {/* Status tabs */}
              <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
                {[
                  { key: "pending",  label: "Pending",  count: pendingCount,  color: "#EF4444", bg: "#FEE2E2"  },
                  { key: "approved", label: "Approved", count: approvedCount, color: "#10B981", bg: "#DCFCE7"  },
                  { key: "rejected", label: "Rejected", count: rejectedCount, color: "#DC2626", bg: "#FEE2E2"  },
                  { key: "all",      label: "All",      count: totalCount,    color: "#4F46E5", bg: "#EEF2FF"  },
                ].map(tab => (
                  <button key={tab.key}
                    className={`ap-tab ${statusTab === tab.key ? "active" : ""}`}
                    onClick={() => setStatusTab(tab.key)}
                    style={statusTab !== tab.key ? { borderColor: tab.color + "50", color: tab.color } : {}}>
                    {tab.label}
                    <span style={{ marginLeft: 4, fontSize: 11, fontWeight: 800,
                      background: statusTab === tab.key ? "rgba(255,255,255,.25)" : tab.bg,
                      color: statusTab === tab.key ? "#fff" : tab.color,
                      borderRadius: 20, padding: "1px 7px" }}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Content */}
              {loading ? (
                <div style={{ textAlign: "center", padding: 60, color: "#94A3B8" }}>
                  <div className="spinner-border spinner-border-sm text-primary" /> Loading…
                </div>
              ) : displayedItems.length === 0 ? (
                <div style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #F1F5F9", padding: "60px 40px", textAlign: "center", color: "#94A3B8" }}>
                  <i className="bi bi-check2-all" style={{ fontSize: 48, display: "block", marginBottom: 12 }} />
                  <div style={{ fontWeight: 700, color: "#1E293B", marginBottom: 4 }}>
                    {statusTab === "pending" ? "All caught up!" : `No ${statusTab} items`}
                  </div>
                  <div style={{ fontSize: 13 }}>
                    {statusTab === "pending" ? "No tasks are waiting for your approval" : `Nothing to show in this tab`}
                  </div>
                </div>
              ) : (
                displayedItems.map(({ task: t, stageIdx, stg, type }) => {
                  const key = stageIdx >= 0 ? `${t._id}_${stageIdx}` : t._id;
                  if (type === "stage") {
                    return (
                      <ApprovalCard
                        key={key}
                        task={t}
                        stageIdx={stageIdx}
                        stg={stg}
                        isOpen={!!expanded[key]}
                        onToggle={() => setExpanded(p => ({ ...p, [key]: !p[key] }))}
                        saving={!!saving[key] || !!saving[`${key}_rej`]}
                        onApprove={() => approveStage(t, stageIdx)}
                        onReject={(reason) => rejectStage(t, stageIdx, reason)}
                        readOnly={stg.approved || stg.rejected}
                      />
                    );
                  }
                  return (
                    <ReviewCard
                      key={key}
                      task={t}
                      isOpen={!!expanded[key]}
                      onToggle={() => setExpanded(p => ({ ...p, [key]: !p[key] }))}
                      saving={!!saving[`${t._id}_task`] || !!saving[`${t._id}_task_rej`]}
                      onApprove={() => approveTask(t)}
                      onReject={(reason) => rejectTask(t, reason)}
                      readOnly={["completed", "blocked"].includes(t.status)}
                    />
                  );
                })
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/* ── Review Card (non-production tasks with status=review) ─────────────── */
function ReviewCard({ task: t, isOpen, onToggle, saving, onApprove, onReject, readOnly }) {
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectText, setRejectText] = useState("");

  const TYPE_LABELS = { project: "Project", sprint: "Sprint", manual: "Task", production: "Production" };
  const TYPE_COLORS = { project: "#7C3AED", sprint: "#F59E0B", manual: "#64748B", production: "#10B981" };
  const color = TYPE_COLORS[t.taskType] || "#64748B";

  return (
    <div className="ap-card">
      <div className="ap-card-head" onClick={onToggle}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: color + "20", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <i className="bi bi-send-check-fill" style={{ fontSize: 14, color }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#1E293B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {t.nomenclature || t.title}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 3, flexWrap: "wrap", alignItems: "center" }}>
            {t.brandId?.name && (
              <span style={{ fontSize: 11, fontWeight: 700, background: (t.brandId.color || "#6366F1") + "20", color: t.brandId.color || "#6366F1", borderRadius: 20, padding: "1px 8px" }}>
                {t.brandId.name}
              </span>
            )}
            <span style={{ fontSize: 11, fontWeight: 700, background: color + "18", color, borderRadius: 20, padding: "2px 8px" }}>
              {TYPE_LABELS[t.taskType] || t.taskType}
            </span>
            <span style={{ fontSize: 10, background: "#FEF3C7", color: "#B45309", borderRadius: 20, padding: "2px 8px", fontWeight: 700 }}>
              Pending Review
            </span>
            {t.dueDate && (
              <span style={{ fontSize: 10, color: "#94A3B8" }}>Due {fmtDate(t.dueDate)}</span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <a href={`/dashboard/admin/tasks/${t._id}`} target="_blank" rel="noreferrer" className="ap-btn-view" onClick={e => e.stopPropagation()}>
            <i className="bi bi-box-arrow-up-right" />View
          </a>
          <i className={`bi bi-chevron-${isOpen ? "up" : "down"}`} style={{ color: "#94A3B8" }} />
        </div>
      </div>

      {isOpen && (
        <div className="ap-card-body" style={{ paddingTop: 14 }}>
          {t.description && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: .5, marginBottom: 5 }}>Work / Description</div>
              <div className="ap-content-box">{t.description}</div>
            </div>
          )}
          {t.reviewNote && (
            <div style={{ background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: 9, padding: "10px 12px", fontSize: 12, color: "#0369A1", marginBottom: 12 }}>
              <i className="bi bi-chat-text me-2" /><strong>Employee note:</strong> {t.reviewNote}
            </div>
          )}
          {t.proofLink && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: .5, marginBottom: 5 }}>Proof / Deliverable</div>
              <a href={t.proofLink} target="_blank" rel="noreferrer" className="ap-proof-link">
                <i className="bi bi-link-45deg" />{t.proofLink}
              </a>
            </div>
          )}

          {readOnly ? (
            t.status === "completed" ? (
              <div style={{ background: "#F0FDF4", border: "1.5px solid #BBF7D0", borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 700, color: "#15803D", display: "flex", alignItems: "center", gap: 6 }}>
                <i className="bi bi-check-circle-fill" /> Task Approved
              </div>
            ) : (
              <div style={{ background: "#FEF2F2", border: "1.5px solid #FCA5A5", borderRadius: 10, padding: "10px 14px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#DC2626", marginBottom: t.reviewNote ? 6 : 0, display: "flex", alignItems: "center", gap: 6 }}>
                  <i className="bi bi-x-circle-fill" /> Task Rejected
                </div>
                {t.reviewNote && <div style={{ fontSize: 12, color: "#991B1B" }}>Reason: {t.reviewNote}</div>}
              </div>
            )
          ) : !rejectMode ? (
            <div className="ap-actions">
              <button className="ap-btn-approve" onClick={onApprove} disabled={saving}>
                {saving ? "…" : <><i className="bi bi-check2-circle me-1" />Approve Task</>}
              </button>
              <button className="ap-btn-reject" onClick={() => setRejectMode(true)} disabled={saving}>
                <i className="bi bi-x-circle me-1" />Reject
              </button>
            </div>
          ) : (
            <div>
              <textarea
                className="ap-reject-input"
                placeholder="Enter rejection reason for the employee…"
                value={rejectText}
                onChange={e => setRejectText(e.target.value)}
              />
              <div className="ap-actions" style={{ marginTop: 6 }}>
                <button className="ap-btn-reject" onClick={() => onReject(rejectText)} disabled={saving || !rejectText.trim()}>
                  {saving ? "…" : <><i className="bi bi-send me-1" />Send Rejection</>}
                </button>
                <button onClick={() => { setRejectMode(false); setRejectText(""); }} style={{ flex: 1, background: "#F1F5F9", color: "#64748B", border: "none", borderRadius: 8, padding: "9px 0", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Approval Card ─────────────────────────────────────────────────────── */
function ApprovalCard({ task: t, stageIdx, stg, isOpen, onToggle, saving, onApprove, onReject, readOnly }) {
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectText, setRejectText] = useState("");
  const brand = t.brandId || {};
  const color = STAGE_COLORS[stageIdx];
  const router = useRouter();

  return (
    <div className="ap-card">
      {/* Header — always visible */}
      <div className="ap-card-head" onClick={onToggle}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: color + "20", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <span style={{ fontWeight: 900, fontSize: 14, color }}>{stageIdx + 1}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#1E293B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {t.nomenclature || t.title}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 3, flexWrap: "wrap", alignItems: "center" }}>
            {brand.color && (
              <span style={{ fontSize: 11, fontWeight: 700, background: (brand.color || "#6366F1") + "20", color: brand.color || "#6366F1", borderRadius: 20, padding: "1px 8px" }}>
                {brand.name}
              </span>
            )}
            <span className="ap-stage-badge" style={{ background: color + "18", color }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />{STAGE_NAMES[stageIdx]}
            </span>
            {stg.doneAt && (
              <span style={{ fontSize: 10, color: "#94A3B8" }}>Submitted {new Date(stg.doneAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <a href={`/dashboard/admin/tasks/${t._id}`} target="_blank" rel="noreferrer" className="ap-btn-view" onClick={e => e.stopPropagation()}>
            <i className="bi bi-box-arrow-up-right" />View
          </a>
          <i className={`bi bi-chevron-${isOpen ? "up" : "down"}`} style={{ color: "#94A3B8" }} />
        </div>
      </div>

      {/* Body — expanded */}
      {isOpen && (
        <div className="ap-card-body" style={{ paddingTop: 14 }}>
          {/* Content to review */}
          {stageIdx === 0 && (t.description || t.caption || t.referenceLink) && (
            <div style={{ marginBottom: 14 }}>
              {t.description && (
                <>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: .5, marginBottom: 5 }}>Script / Content</div>
                  <div className="ap-content-box">{t.description}</div>
                </>
              )}
              {t.caption && (
                <>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: .5, marginBottom: 5 }}>Caption</div>
                  <div className="ap-content-box">{t.caption}</div>
                </>
              )}
              {t.referenceLink && (
                <a href={t.referenceLink} target="_blank" rel="noreferrer" className="ap-proof-link" style={{ marginTop: 6 }}>
                  <i className="bi bi-link-45deg" />Reference: {t.referenceLink}
                </a>
              )}
            </div>
          )}

          {/* Proof links / attachments from stage */}
          {stg.proofUrls?.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: .5, marginBottom: 5 }}>Proof / Deliverables</div>
              {stg.proofUrls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noreferrer" className="ap-proof-link">
                  <i className="bi bi-link-45deg" />{url}
                </a>
              ))}
            </div>
          )}

          {/* Stage note */}
          {stg.doneNote && (
            <div style={{ background: "#F0F9FF", border: "1px solid #BAE6FD", borderRadius: 9, padding: "10px 12px", fontSize: 12, color: "#0369A1", marginBottom: 12 }}>
              <i className="bi bi-chat-text me-2" />{stg.doneNote}
            </div>
          )}

          {/* Action buttons or read-only status */}
          {readOnly ? (
            stg.approved ? (
              <div style={{ background: "#F0FDF4", border: "1.5px solid #BBF7D0", borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 700, color: "#15803D", display: "flex", alignItems: "center", gap: 6 }}>
                <i className="bi bi-check-circle-fill" /> Stage Approved
              </div>
            ) : (
              <div style={{ background: "#FEF2F2", border: "1.5px solid #FCA5A5", borderRadius: 10, padding: "10px 14px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#DC2626", marginBottom: stg.rejectReason ? 6 : 0, display: "flex", alignItems: "center", gap: 6 }}>
                  <i className="bi bi-x-circle-fill" /> Stage Rejected
                </div>
                {stg.rejectReason && <div style={{ fontSize: 12, color: "#991B1B" }}>Reason: {stg.rejectReason}</div>}
              </div>
            )
          ) : !rejectMode ? (
            <div className="ap-actions">
              <button className="ap-btn-approve" onClick={onApprove} disabled={saving}>
                {saving ? "…" : <><i className="bi bi-check2-circle me-1" />Approve</>}
              </button>
              <button className="ap-btn-reject" onClick={() => setRejectMode(true)} disabled={saving}>
                <i className="bi bi-x-circle me-1" />Reject
              </button>
            </div>
          ) : (
            <div>
              <textarea
                className="ap-reject-input"
                placeholder="Enter rejection reason for the employee…"
                value={rejectText}
                onChange={e => setRejectText(e.target.value)}
              />
              <div className="ap-actions" style={{ marginTop: 6 }}>
                <button className="ap-btn-reject" onClick={() => onReject(rejectText)} disabled={saving || !rejectText.trim()}>
                  {saving ? "…" : <><i className="bi bi-send me-1" />Send Rejection</>}
                </button>
                <button onClick={() => { setRejectMode(false); setRejectText(""); }} style={{ flex: 1, background: "#F1F5F9", color: "#64748B", border: "none", borderRadius: 8, padding: "9px 0", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

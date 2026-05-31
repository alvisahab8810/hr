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
  const [tasks,    setTasks]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState({});
  const [expanded, setExpanded] = useState({});
  const [stageFilter, setStageFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all non-completed tasks and filter client-side for pending stage approvals
      const r = await fetch("/api/admin/tasks?limit=500&hideCompleted=false", { credentials: "include" });
      const d = await r.json();
      if (d.success) {
        // Keep only tasks that have at least one stage pending approval
        const pending = (d.tasks || []).filter(t =>
          (t.stages || []).some(s => s.done && !s.approved && !s.rejected)
        );
        setTasks(pending);
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

  // Group tasks by their pending stage index
  const byStage = { S1: [], S2: [], S3: [], S4: [] };
  tasks.forEach(t => {
    (t.stages || []).forEach((s, i) => {
      if (s.done && !s.approved && !s.rejected) {
        byStage[STAGE_KEYS[i]]?.push({ task: t, stageIdx: i, stg: s });
      }
    });
  });

  const displayed = stageFilter === "all"
    ? Object.entries(byStage).flatMap(([, arr]) => arr)
    : (byStage[stageFilter] || []);

  const total = Object.values(byStage).reduce((s, a) => s + a.length, 0);

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
                    {total > 0 && <span style={{ marginLeft: 10, background: "#EF4444", color: "#fff", fontSize: 12, fontWeight: 800, borderRadius: 20, padding: "2px 9px" }}>{total}</span>}
                  </h5>
                  <p style={{ fontSize: 13, color: "#64748B", margin: 0 }}>Review and approve or reject submitted stage work</p>
                </div>
                <button onClick={load} style={{ background: "#F1F5F9", color: "#475569", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
                  <i className="bi bi-arrow-clockwise" /> Refresh
                </button>
              </div>

              {/* Stage filter tabs */}
              <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
                <button className={`ap-tab ${stageFilter === "all" ? "active" : ""}`} onClick={() => setStageFilter("all")}>
                  All ({total})
                </button>
                {STAGE_KEYS.map((key, i) => byStage[key].length > 0 && (
                  <button key={key} className={`ap-tab ${stageFilter === key ? "active" : ""}`}
                    onClick={() => setStageFilter(key)}
                    style={stageFilter !== key ? { borderColor: STAGE_COLORS[i] + "60", color: STAGE_COLORS[i] } : {}}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: STAGE_COLORS[i] }} />
                    {STAGE_NAMES[i]} ({byStage[key].length})
                  </button>
                ))}
              </div>

              {/* Content */}
              {loading ? (
                <div style={{ textAlign: "center", padding: 60, color: "#94A3B8" }}>
                  <div className="spinner-border spinner-border-sm text-primary" /> Loading…
                </div>
              ) : displayed.length === 0 ? (
                <div style={{ background: "#fff", borderRadius: 16, border: "1.5px solid #F1F5F9", padding: "60px 40px", textAlign: "center", color: "#94A3B8" }}>
                  <i className="bi bi-check2-all" style={{ fontSize: 48, display: "block", marginBottom: 12 }} />
                  <div style={{ fontWeight: 700, color: "#1E293B", marginBottom: 4 }}>All caught up!</div>
                  <div style={{ fontSize: 13 }}>No tasks are waiting for your approval</div>
                </div>
              ) : (
                displayed.map(({ task: t, stageIdx, stg }) => {
                  const key = `${t._id}_${stageIdx}`;
                  const isOpen = expanded[key];
                  const [rejectText, setRejectText] = useState ? expanded[`${key}_rej`] || "" : "";
                  const brand = t.brandId || {};
                  const isContent = stageIdx === 0;

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

/* ── Approval Card ─────────────────────────────────────────────────────── */
function ApprovalCard({ task: t, stageIdx, stg, isOpen, onToggle, saving, onApprove, onReject }) {
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

          {/* Action buttons */}
          {!rejectMode ? (
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

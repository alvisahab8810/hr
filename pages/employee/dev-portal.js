// pages/employee/dev-portal.js — Tech & Development Employee Portal
import React, { useState, useEffect, useCallback, useRef } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const getToken = () => (typeof window !== "undefined" ? localStorage.getItem("employeeToken") || "" : "");
const authH   = () => ({ Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" });

function fmtD(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function isOverdue(d) {
  if (!d) return false;
  const n = new Date(); n.setHours(0,0,0,0);
  const x = new Date(d); x.setHours(0,0,0,0);
  return x < n;
}

function ini(emp) {
  if (!emp) return "?";
  return `${(emp.firstName||"?")[0]}${(emp.lastName||"")[0]}`.toUpperCase();
}

const STATUS_COLOR = { todo:"#64748b", in_progress:"#3b82f6", review:"#f59e0b", completed:"#22c55e", blocked:"#ef4444" };
const STATUS_LABEL = { todo:"To Do", in_progress:"In Progress", review:"Review", completed:"Done", blocked:"Blocked" };
const PRIORITY_COLOR = { low:"#64748b", medium:"#3b82f6", high:"#f59e0b", urgent:"#ef4444" };
const PHASE_COLOR = { uiux:"#8b5cf6", development:"#3b82f6", testing:"#f59e0b", launch:"#22c55e", completed:"#64748b" };
const PHASE_LABEL = { uiux:"UI/UX", development:"Development", testing:"Testing", launch:"Launch", completed:"Completed" };

const KANBAN_COLS = [
  { key:"todo",        label:"Backlog",     color:"#64748b" },
  { key:"in_progress", label:"In Progress", color:"#3b82f6" },
  { key:"review",      label:"Review",      color:"#f59e0b" },
  { key:"completed",   label:"Done",        color:"#22c55e" },
];

const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg:#0a0c11; --surface:#10131a; --surface2:#161a24; --surface3:#1e2330;
    --border:#252a36; --amber:#f5a623; --amber-dim:rgba(245,166,35,.12);
    --text:#e2e8f0; --muted:#64748b; --green:#22c55e; --red:#ef4444;
    --blue:#3b82f6; --purple:#8b5cf6;
  }
  html, body { background:var(--bg); color:var(--text); font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; }

  .dp-layout { display:flex; min-height:100vh; }

  /* Sidebar */
  .dp-side { width:240px; background:var(--surface); border-right:1px solid var(--border);
    display:flex; flex-direction:column; position:fixed; top:0; left:0; height:100vh; z-index:100; }
  .dp-logo { padding:18px 18px 16px; border-bottom:1px solid var(--border); }
  .dp-logo span { font-size:18px; font-weight:800; color:var(--amber); }
  .dp-logo small { display:block; font-size:10px; color:var(--muted); margin-top:2px; text-transform:uppercase; letter-spacing:.5px; }
  .dp-projects { flex:1; overflow-y:auto; padding:8px 0; }
  .dp-proj-label { padding:10px 16px 6px; font-size:10px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:.8px; }
  .dp-proj-item { padding:10px 16px; cursor:pointer; border-left:3px solid transparent; transition:all .15s; }
  .dp-proj-item:hover { background:var(--surface2); }
  .dp-proj-item.active { background:var(--amber-dim); border-left-color:var(--amber); }
  .dp-proj-name { font-size:13px; font-weight:600; margin-bottom:3px; }
  .dp-proj-meta { font-size:11px; color:var(--muted); }
  .dp-side-footer { padding:14px 16px; border-top:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; gap:8px; }
  .dp-logout { background:transparent; border:1px solid var(--border); color:var(--muted); padding:6px 12px;
    border-radius:7px; cursor:pointer; font-size:12px; display:flex; align-items:center; gap:6px; transition:all .15s; }
  .dp-logout:hover { background:var(--surface2); color:var(--text); }
  .dp-ava { width:32px; height:32px; border-radius:50%; background:var(--amber-dim); border:2px solid var(--amber);
    display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:800; color:var(--amber); flex-shrink:0; }

  /* Main */
  .dp-main { flex:1; margin-left:240px; display:flex; flex-direction:column; min-height:100vh; }
  .dp-topbar { padding:14px 28px; border-bottom:1px solid var(--border); background:var(--surface);
    display:flex; align-items:center; justify-content:space-between; position:sticky; top:0; z-index:50; }
  .dp-topbar-title { font-size:15px; font-weight:700; }
  .dp-topbar-sub { font-size:12px; color:var(--muted); margin-top:2px; }
  .dp-content { padding:24px 28px; flex:1; }

  /* Sprint section */
  .dp-sprint-block { margin-bottom:28px; }
  .dp-sprint-hdr { display:flex; align-items:center; gap:10px; margin-bottom:14px; }
  .dp-sprint-name { font-size:14px; font-weight:700; }
  .dp-sprint-dates { font-size:11px; color:var(--muted); }
  .dp-sprint-badge { font-size:10px; font-weight:700; padding:3px 8px; border-radius:20px;
    background:var(--amber-dim); color:var(--amber); }

  /* Kanban */
  .dp-kanban { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
  .dp-col { background:var(--surface); border:1px solid var(--border); border-radius:10px; overflow:hidden; }
  .dp-col-hdr { padding:10px 14px; border-bottom:1px solid var(--border); display:flex; align-items:center; gap:8px;
    font-size:12px; font-weight:700; }
  .dp-col-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
  .dp-col-count { margin-left:auto; font-size:11px; color:var(--muted); }
  .dp-col-body { padding:10px; display:flex; flex-direction:column; gap:8px; min-height:60px; }

  /* Feature card */
  .dp-fcard { background:var(--surface2); border:1px solid var(--border); border-radius:8px; padding:12px;
    cursor:pointer; transition:all .15s; }
  .dp-fcard:hover { border-color:var(--amber); background:var(--surface3); }
  .dp-fcard-title { font-size:13px; font-weight:600; margin-bottom:8px; line-height:1.4; }
  .dp-fcard-meta { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
  .dp-badge { font-size:10px; font-weight:700; padding:2px 7px; border-radius:20px; }
  .dp-fcard-due { font-size:10px; color:var(--muted); margin-top:6px; }
  .dp-fcard-due.overdue { color:var(--red); }
  .dp-fcard-assignee { font-size:11px; color:var(--muted); margin-top:6px; display:flex; align-items:center; gap:5px; }

  /* Empty col */
  .dp-empty { text-align:center; padding:20px 10px; font-size:12px; color:var(--muted); }

  /* No project selected */
  .dp-placeholder { display:flex; flex-direction:column; align-items:center; justify-content:center;
    flex:1; gap:12px; color:var(--muted); padding:60px; text-align:center; }
  .dp-placeholder i { font-size:48px; }
  .dp-placeholder h3 { font-size:18px; font-weight:700; color:var(--text); }

  /* Modal overlay */
  .dp-overlay { position:fixed; inset:0; background:rgba(0,0,0,.75); z-index:200;
    display:flex; align-items:center; justify-content:center; padding:20px; }
  .dp-modal { background:var(--surface); border:1px solid var(--border); border-radius:14px;
    width:100%; max-width:540px; max-height:90vh; overflow-y:auto; }
  .dp-modal-hdr { padding:18px 20px 16px; border-bottom:1px solid var(--border); display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
  .dp-modal-title { font-size:15px; font-weight:700; }
  .dp-modal-sub { font-size:12px; color:var(--muted); margin-top:3px; }
  .dp-modal-body { padding:20px; }
  .dp-modal-footer { padding:16px 20px; border-top:1px solid var(--border); display:flex; gap:10px; justify-content:flex-end; }
  .dp-close { background:transparent; border:none; color:var(--muted); cursor:pointer; font-size:18px; }
  .dp-close:hover { color:var(--text); }

  /* Form */
  .dp-label { font-size:12px; font-weight:600; color:var(--muted); margin-bottom:6px; display:block; text-transform:uppercase; letter-spacing:.4px; }
  .dp-input { width:100%; background:var(--surface2); border:1px solid var(--border); color:var(--text);
    padding:10px 12px; border-radius:8px; font-size:13px; outline:none; resize:vertical;
    font-family:inherit; transition:border-color .15s; }
  .dp-input:focus { border-color:var(--amber); }
  .dp-input::placeholder { color:var(--muted); }
  .dp-field { margin-bottom:16px; }

  /* Buttons */
  .dp-btn { padding:9px 18px; border-radius:8px; border:none; cursor:pointer; font-size:13px; font-weight:600;
    display:inline-flex; align-items:center; gap:7px; transition:all .15s; }
  .dp-btn-primary { background:var(--amber); color:#000; }
  .dp-btn-primary:hover { opacity:.9; }
  .dp-btn-ghost { background:transparent; border:1px solid var(--border); color:var(--text); }
  .dp-btn-ghost:hover { background:var(--surface2); }
  .dp-btn-sm { padding:6px 12px; font-size:12px; }
  .dp-btn-danger { background:rgba(239,68,68,.15); border:1px solid var(--red); color:var(--red); }
  .dp-btn-success { background:rgba(34,197,94,.15); border:1px solid var(--green); color:var(--green); }

  /* Detail row */
  .dp-detail-row { display:flex; gap:8px; margin-bottom:10px; }
  .dp-detail-label { font-size:11px; color:var(--muted); width:110px; flex-shrink:0; padding-top:1px; }
  .dp-detail-val { font-size:13px; flex:1; word-break:break-all; }
  .dp-divider { height:1px; background:var(--border); margin:16px 0; }

  /* Phase indicator */
  .dp-phase { display:flex; align-items:center; gap:6px; padding:6px 12px; border-radius:8px;
    font-size:12px; font-weight:700; }

  @media (max-width:900px) {
    .dp-kanban { grid-template-columns:1fr 1fr; }
  }
  @media (max-width:600px) {
    .dp-kanban { grid-template-columns:1fr; }
    .dp-side { display:none; }
    .dp-main { margin-left:0; }
  }
`;

function StatusActionButtons({ feature, onAction }) {
  const { status } = feature;
  if (status === "todo") {
    return (
      <button className="dp-btn dp-btn-primary" onClick={() => onAction("in_progress")}>
        <i className="bi bi-play-fill" /> Start Task
      </button>
    );
  }
  if (status === "in_progress") {
    return (
      <button className="dp-btn dp-btn-primary" onClick={() => onAction("review")}>
        <i className="bi bi-send-fill" /> Submit for Review
      </button>
    );
  }
  if (status === "blocked") {
    return (
      <button className="dp-btn dp-btn-primary" onClick={() => onAction("in_progress")}>
        <i className="bi bi-arrow-counterclockwise" /> Resume Task
      </button>
    );
  }
  if (status === "review") {
    return (
      <span style={{ fontSize:12, color:"var(--muted)" }}>
        <i className="bi bi-hourglass-split" /> Awaiting client review
      </span>
    );
  }
  if (status === "completed") {
    return (
      <span style={{ fontSize:12, color:"var(--green)" }}>
        <i className="bi bi-check-circle-fill" /> Completed
      </span>
    );
  }
  return null;
}

function SubmitReviewModal({ feature, onClose, onSubmit, saving }) {
  const [workReport, setWorkReport] = useState(feature.workReport || "");
  const [proofLink,  setProofLink]  = useState(feature.proofLink  || "");

  function handleSubmit() {
    if (!workReport.trim()) { toast.error("Work report is required"); return; }
    if (!proofLink.trim())  { toast.error("Proof/staging link is required"); return; }
    onSubmit(workReport, proofLink);
  }

  return (
    <div className="dp-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="dp-modal">
        <div className="dp-modal-hdr">
          <div>
            <div className="dp-modal-title">Submit for Client Review</div>
            <div className="dp-modal-sub">{feature.title}</div>
          </div>
          <button className="dp-close" onClick={onClose}><i className="bi bi-x-lg" /></button>
        </div>
        <div className="dp-modal-body">
          <div className="dp-field">
            <label className="dp-label">Work Report *</label>
            <textarea
              className="dp-input"
              rows={5}
              placeholder="Describe what was done, decisions made, known limitations..."
              value={workReport}
              onChange={e => setWorkReport(e.target.value)}
            />
          </div>
          <div className="dp-field">
            <label className="dp-label">Staging / Proof Link *</label>
            <input
              className="dp-input"
              type="url"
              placeholder="https://staging.example.com or Loom/Figma link"
              value={proofLink}
              onChange={e => setProofLink(e.target.value)}
            />
          </div>
        </div>
        <div className="dp-modal-footer">
          <button className="dp-btn dp-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="dp-btn dp-btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? "Submitting..." : <><i className="bi bi-send-fill" /> Submit for Review</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function FeatureDetailModal({ feature, onClose, onAction, saving }) {
  const [showReviewModal, setShowReviewModal] = useState(false);

  function handleAction(newStatus) {
    if (newStatus === "review") {
      setShowReviewModal(true);
    } else {
      onAction(feature._id, newStatus, null, null);
    }
  }

  function handleReviewSubmit(workReport, proofLink) {
    onAction(feature._id, "review", workReport, proofLink);
    setShowReviewModal(false);
  }

  if (showReviewModal) {
    return <SubmitReviewModal
      feature={feature}
      onClose={() => setShowReviewModal(false)}
      onSubmit={handleReviewSubmit}
      saving={saving}
    />;
  }

  return (
    <div className="dp-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="dp-modal">
        <div className="dp-modal-hdr">
          <div>
            <div className="dp-modal-title">{feature.title}</div>
            <div style={{ display:"flex", gap:6, marginTop:6, flexWrap:"wrap" }}>
              <span
                className="dp-badge"
                style={{ background:`${STATUS_COLOR[feature.status]}22`, color:STATUS_COLOR[feature.status] }}
              >
                {STATUS_LABEL[feature.status]}
              </span>
              <span
                className="dp-badge"
                style={{ background:`${PRIORITY_COLOR[feature.priority]}22`, color:PRIORITY_COLOR[feature.priority] }}
              >
                {feature.priority}
              </span>
            </div>
          </div>
          <button className="dp-close" onClick={onClose}><i className="bi bi-x-lg" /></button>
        </div>

        <div className="dp-modal-body">
          {feature.description && (
            <div className="dp-field">
              <label className="dp-label">Description</label>
              <p style={{ fontSize:13, color:"var(--text)", lineHeight:1.6 }}>{feature.description}</p>
            </div>
          )}

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"8px 20px", marginBottom:16 }}>
            <div>
              <div className="dp-detail-label">Due Date</div>
              <div
                className="dp-detail-val"
                style={{ color: feature.dueDate && isOverdue(feature.dueDate) ? "var(--red)" : "var(--text)" }}
              >
                {fmtD(feature.dueDate)}
              </div>
            </div>
            {feature.estimatedHours && (
              <div>
                <div className="dp-detail-label">Est. Hours</div>
                <div className="dp-detail-val">{feature.estimatedHours}h</div>
              </div>
            )}
            {feature.assignedTo && (
              <div>
                <div className="dp-detail-label">Assigned To</div>
                <div className="dp-detail-val">
                  {feature.assignedTo.firstName} {feature.assignedTo.lastName}
                </div>
              </div>
            )}
          </div>

          {feature.tags?.length > 0 && (
            <div className="dp-field">
              <label className="dp-label">Tags</label>
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {feature.tags.map(t => (
                  <span key={t} className="dp-badge" style={{ background:"var(--surface3)", color:"var(--muted)" }}>{t}</span>
                ))}
              </div>
            </div>
          )}

          {(feature.workReport || feature.proofLink) && (
            <>
              <div className="dp-divider" />
              <label className="dp-label" style={{ marginBottom:10 }}>Last Submission</label>
              {feature.workReport && (
                <div className="dp-field">
                  <label className="dp-label">Work Report</label>
                  <p style={{ fontSize:12, color:"var(--text)", lineHeight:1.6, background:"var(--surface2)", padding:"10px 12px", borderRadius:8, border:"1px solid var(--border)" }}>
                    {feature.workReport}
                  </p>
                </div>
              )}
              {feature.proofLink && (
                <div className="dp-field">
                  <label className="dp-label">Proof Link</label>
                  <a href={feature.proofLink} target="_blank" rel="noopener noreferrer"
                    style={{ color:"var(--blue)", fontSize:13, wordBreak:"break-all" }}>
                    {feature.proofLink}
                  </a>
                </div>
              )}
            </>
          )}

          {feature.clientReviewNote && (
            <>
              <div className="dp-divider" />
              <div className="dp-field">
                <label className="dp-label" style={{ color:"var(--red)" }}>Client Feedback (Rejected)</label>
                <p style={{ fontSize:12, color:"var(--text)", lineHeight:1.6, background:"rgba(239,68,68,.08)", padding:"10px 12px", borderRadius:8, border:"1px solid rgba(239,68,68,.2)" }}>
                  {feature.clientReviewNote}
                </p>
              </div>
            </>
          )}
        </div>

        <div className="dp-modal-footer">
          <button className="dp-btn dp-btn-ghost dp-btn-sm" onClick={onClose}>Close</button>
          <StatusActionButtons feature={feature} onAction={handleAction} />
        </div>
      </div>
    </div>
  );
}

function KanbanBoard({ features, onCardClick }) {
  return (
    <div className="dp-kanban">
      {KANBAN_COLS.map(col => {
        const cards = features.filter(f => f.status === col.key);
        return (
          <div key={col.key} className="dp-col">
            <div className="dp-col-hdr">
              <div className="dp-col-dot" style={{ background:col.color }} />
              {col.label}
              <span className="dp-col-count">{cards.length}</span>
            </div>
            <div className="dp-col-body">
              {cards.length === 0 ? (
                <div className="dp-empty">No tasks</div>
              ) : cards.map(f => (
                <div key={f._id} className="dp-fcard" onClick={() => onCardClick(f)}>
                  <div className="dp-fcard-title">{f.title}</div>
                  <div className="dp-fcard-meta">
                    <span
                      className="dp-badge"
                      style={{ background:`${PRIORITY_COLOR[f.priority]}22`, color:PRIORITY_COLOR[f.priority] }}
                    >
                      {f.priority}
                    </span>
                    {f.estimatedHours && (
                      <span className="dp-badge" style={{ background:"var(--surface3)", color:"var(--muted)" }}>
                        {f.estimatedHours}h
                      </span>
                    )}
                  </div>
                  {f.dueDate && (
                    <div className={`dp-fcard-due${isOverdue(f.dueDate) && f.status !== "completed" ? " overdue" : ""}`}>
                      <i className="bi bi-calendar3" style={{ marginRight:4 }} />
                      {fmtD(f.dueDate)}
                      {isOverdue(f.dueDate) && f.status !== "completed" && " · Overdue"}
                    </div>
                  )}
                  {f.assignedTo && (
                    <div className="dp-fcard-assignee">
                      <i className="bi bi-person" />
                      {f.assignedTo.firstName} {f.assignedTo.lastName}
                    </div>
                  )}
                  {f.clientReviewNote && (
                    <div style={{ marginTop:6, fontSize:11, color:"var(--red)" }}>
                      <i className="bi bi-exclamation-circle" style={{ marginRight:3 }} />Client rejected
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function DevPortal() {
  const router = useRouter();

  const [emp, setEmp]               = useState(null);
  const [projects, setProjects]     = useState([]);
  const [sprints,  setSprints]      = useState([]);
  const [features, setFeatures]     = useState([]);
  const [activeProj, setActiveProj] = useState(null);
  const [loading,  setLoading]      = useState(true);
  const [saving,   setSaving]       = useState(false);
  const [selected, setSelected]     = useState(null);

  // Load employee info
  useEffect(() => {
    const token = getToken();
    if (!token) { router.replace("/employee/login"); return; }
    fetch("/api/employee/me", { headers: authH() })
      .then(r => r.json())
      .then(d => {
        if (!d.success) { router.replace("/employee/login"); return; }
        setEmp(d.employee);
      })
      .catch(() => router.replace("/employee/login"));
  }, []);

  // Load projects + features
  const loadData = useCallback(async (projectId) => {
    setLoading(true);
    try {
      const url = projectId
        ? `/api/employee/dev/features?projectId=${projectId}`
        : "/api/employee/dev/features";
      const r   = await fetch(url, { headers: authH() });
      const d   = await r.json();
      if (d.success) {
        setProjects(d.projects);
        setSprints(d.sprints);
        setFeatures(d.features);
        if (!activeProj && d.projects.length > 0) setActiveProj(d.projects[0]._id);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [activeProj]);

  useEffect(() => { loadData(null); }, []);

  async function handleAction(featureId, newStatus, workReport, proofLink) {
    setSaving(true);
    try {
      const body = { status: newStatus };
      if (workReport) body.workReport = workReport;
      if (proofLink)  body.proofLink  = proofLink;

      const r = await fetch(`/api/employee/dev/features/${featureId}`, {
        method:"PATCH", headers: authH(), body: JSON.stringify(body),
      });
      const d = await r.json();
      if (d.success) {
        setFeatures(prev => prev.map(f => f._id === featureId ? { ...f, ...d.feature } : f));
        setSelected(prev => prev?._id === featureId ? { ...prev, ...d.feature } : prev);
        toast.success("Feature updated");
      } else {
        toast.error(d.message || "Update failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  const activeSprints   = sprints.filter(s => s.projectId?.toString() === activeProj);
  const sprintlessFeats = features.filter(
    f => f.projectId?.toString() === activeProj && !f.sprintId
  );
  const activeProject = projects.find(p => p._id?.toString() === activeProj);

  const total     = features.filter(f => f.projectId?.toString() === activeProj).length;
  const done      = features.filter(f => f.projectId?.toString() === activeProj && f.status === "completed").length;
  const inReview  = features.filter(f => f.projectId?.toString() === activeProj && f.status === "review").length;
  const inProg    = features.filter(f => f.projectId?.toString() === activeProj && f.status === "in_progress").length;

  return (
    <>
      <Head>
        <title>Dev Portal — Viralon</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" />
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
      </Head>
      <ToastContainer position="top-right" theme="dark" autoClose={3000} />

      <div className="dp-layout">
        {/* Sidebar */}
        <div className="dp-side">
          <div className="dp-logo">
            <span>Viralon</span>
            <small>Dev Portal</small>
          </div>

          <div className="dp-projects">
            <div className="dp-proj-label">My Projects</div>
            {loading && projects.length === 0 ? (
              <div style={{ padding:"16px", fontSize:12, color:"var(--muted)" }}>Loading...</div>
            ) : projects.length === 0 ? (
              <div style={{ padding:"16px", fontSize:12, color:"var(--muted)" }}>No projects assigned</div>
            ) : projects.map(p => {
              const pfeat = features.filter(f => f.projectId?.toString() === p._id?.toString());
              const pdone = pfeat.filter(f => f.status === "completed").length;
              return (
                <div
                  key={p._id}
                  className={`dp-proj-item${activeProj === p._id?.toString() ? " active" : ""}`}
                  onClick={() => setActiveProj(p._id?.toString())}
                >
                  <div className="dp-proj-name">{p.name}</div>
                  <div className="dp-proj-meta">
                    <span
                      className="dp-badge"
                      style={{ background:`${PHASE_COLOR[p.currentPhase]}22`, color:PHASE_COLOR[p.currentPhase], marginRight:4 }}
                    >
                      {PHASE_LABEL[p.currentPhase] || p.currentPhase}
                    </span>
                    {pfeat.length > 0 && `${pdone}/${pfeat.length} done`}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="dp-side-footer">
            <div className="dp-ava">{emp ? ini(emp) : "?"}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {emp ? `${emp.firstName} ${emp.lastName}` : ""}
              </div>
              <div style={{ fontSize:10, color:"var(--muted)" }}>
                {emp?.professional?.designation || "Developer"}
              </div>
            </div>
            <button
              className="dp-logout"
              onClick={() => { localStorage.removeItem("employeeToken"); router.push("/employee/login"); }}
            >
              <i className="bi bi-box-arrow-right" />
            </button>
          </div>
        </div>

        {/* Main content */}
        <div className="dp-main">
          <div className="dp-topbar">
            <div>
              <div className="dp-topbar-title">
                {activeProject ? activeProject.name : "Dev Portal"}
              </div>
              {activeProject && (
                <div className="dp-topbar-sub">
                  Phase:&nbsp;
                  <span style={{ color:PHASE_COLOR[activeProject.currentPhase] }}>
                    {PHASE_LABEL[activeProject.currentPhase] || activeProject.currentPhase}
                  </span>
                  {activeProject.clientId && (
                    <>&nbsp;·&nbsp;Client: {activeProject.clientId?.name || "—"}</>
                  )}
                </div>
              )}
            </div>

            {activeProject && (
              <div style={{ display:"flex", gap:16 }}>
                {[
                  { label:"Total",      val:total,    color:"var(--muted)" },
                  { label:"In Progress",val:inProg,   color:"var(--blue)"  },
                  { label:"In Review",  val:inReview, color:"var(--amber)" },
                  { label:"Done",       val:done,     color:"var(--green)" },
                ].map(s => (
                  <div key={s.label} style={{ textAlign:"right" }}>
                    <div style={{ fontSize:18, fontWeight:800, color:s.color }}>{s.val}</div>
                    <div style={{ fontSize:10, color:"var(--muted)" }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="dp-content">
            {!activeProj ? (
              <div className="dp-placeholder">
                <i className="bi bi-kanban" />
                <h3>Select a project</h3>
                <p>Choose a project from the sidebar to view its sprints and tasks.</p>
              </div>
            ) : loading ? (
              <div className="dp-placeholder">
                <i className="bi bi-arrow-repeat" style={{ animation:"spin 1s linear infinite" }} />
                <p>Loading project data...</p>
              </div>
            ) : (
              <>
                {/* Sprint blocks */}
                {activeSprints.map(sprint => {
                  const sprintFeatures = features.filter(
                    f => f.sprintId?.toString() === sprint._id?.toString()
                  );
                  return (
                    <div key={sprint._id} className="dp-sprint-block">
                      <div className="dp-sprint-hdr">
                        <i className="bi bi-layers" style={{ color:"var(--amber)" }} />
                        <span className="dp-sprint-name">{sprint.name}</span>
                        {sprint.startDate && (
                          <span className="dp-sprint-dates">
                            {fmtD(sprint.startDate)} – {fmtD(sprint.endDate)}
                          </span>
                        )}
                        <span className="dp-sprint-badge">{sprintFeatures.length} tasks</span>
                      </div>
                      <KanbanBoard features={sprintFeatures} onCardClick={setSelected} />
                    </div>
                  );
                })}

                {/* Sprint-less features */}
                {sprintlessFeats.length > 0 && (
                  <div className="dp-sprint-block">
                    <div className="dp-sprint-hdr">
                      <i className="bi bi-list-task" style={{ color:"var(--muted)" }} />
                      <span className="dp-sprint-name" style={{ color:"var(--muted)" }}>Backlog / Unassigned</span>
                    </div>
                    <KanbanBoard features={sprintlessFeats} onCardClick={setSelected} />
                  </div>
                )}

                {activeSprints.length === 0 && sprintlessFeats.length === 0 && (
                  <div className="dp-placeholder" style={{ marginTop:40 }}>
                    <i className="bi bi-inbox" />
                    <h3>No tasks yet</h3>
                    <p>Tasks will appear here once assigned by your project manager.</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {selected && (
        <FeatureDetailModal
          feature={selected}
          onClose={() => setSelected(null)}
          onAction={handleAction}
          saving={saving}
        />
      )}

      <style>{`
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
      `}</style>
    </>
  );
}

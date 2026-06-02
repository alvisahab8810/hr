import { useEffect, useState, useCallback, useRef } from "react";
import Head from "next/head";
import SmartLeftbar from "@/components/SmartLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import Dashnav from "@/components/Dashnav";

const PRIORITY_META = {
  low:    { label: "Low",    color: "#16A34A", bg: "#DCFCE7" },
  medium: { label: "Medium", color: "#B45309", bg: "#FEF3C7" },
  high:   { label: "High",   color: "#DC2626", bg: "#FEE2E2" },
  urgent: { label: "Urgent", color: "#7C3AED", bg: "#EDE9FE" },
};

const STATUS_META = {
  pending:     { label: "Verifying",    color: "#B45309", bg: "#FEF3C7" },
  in_scope:    { label: "In Scope",     color: "#15803D", bg: "#DCFCE7" },
  out_of_scope:{ label: "Out of Scope", color: "#DC2626", bg: "#FEE2E2" },
};

const SERVICE_META = {
  socialMedia: "Social Media",
  website:     "Web Development",
  seo:         "SEO",
  ads:         "Ad Campaigns",
  branding:    "Branding",
};

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function fmtAgo(d) {
  if (!d) return "";
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function AdminTaskRequests() {
  const [requests,  setRequests]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [statusF,   setStatusF]   = useState("");
  const [selected,  setSelected]  = useState(null);

  // Review form state
  const [reviewStatus, setReviewStatus] = useState("in_scope");
  const [remark,       setRemark]       = useState("");
  const [quote,        setQuote]        = useState("");
  const [saving,       setSaving]       = useState(false);

  // Assign task step (shown after marking In Scope)
  const [assignStep,   setAssignStep]   = useState(false);
  const [employees,    setEmployees]    = useState([]);
  const [stageAssign,  setStageAssign]  = useState([
    { name: "Script/Concept",      assignedTo: [], deadline: "" },
    { name: "Shoot",               assignedTo: [], deadline: "" },
    { name: "Design/Edit/Develop", assignedTo: [], deadline: "" },
    { name: "Posted/Live",         assignedTo: [], deadline: "" },
  ]);
  const [taskTitle,    setTaskTitle]    = useState("");
  const [creating,     setCreating]     = useState(false);
  const [taskDone,     setTaskDone]     = useState(false);

  const STAGE_COLORS = ["#F59E0B", "#6366F1", "#10B981", "#EC4899"];
  const STAGE_DEPT_KEYWORDS = [
    { include: ["content team"],                          exclude: [] },
    { include: ["production"],                            exclude: ["design", "creative"] },
    { include: ["editing team", "design team", "tech"],   exclude: [] },
    { include: ["digital marketing"],                     exclude: [] },
  ];
  const STAGE_TEAM_LABELS = ["Content", "Production/Design", "Editing", "Digital Mktg"];

  function filterByDept(emps, { include, exclude }) {
    return emps.filter(emp => {
      const dept = (emp.dept || emp.professional?.department || "").toLowerCase();
      if (exclude.some(kw => dept.includes(kw))) return false;
      return include.some(kw => dept.includes(kw));
    });
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = `/api/admin/task-requests${statusF ? `?status=${statusF}` : ""}`;
      const d = await fetch(url).then(r => r.json());
      if (d.success) setRequests(d.requests);
    } finally { setLoading(false); }
  }, [statusF]);

  useEffect(() => { load(); }, [load]);

  function openReview(req) {
    setSelected(req);
    setReviewStatus(req.status === "pending" ? "in_scope" : req.status);
    setRemark(req.adminRemark || "");
    setQuote(req.quoteAmount != null ? String(req.quoteAmount) : "");
  }

  async function submitReview() {
    if (!selected) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/admin/task-requests/${selected._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: reviewStatus,
          adminRemark: remark,
          quoteAmount: quote !== "" ? Number(quote) : null,
        }),
      });
      const d = await r.json();
      if (d.success) {
        setRequests(prev => prev.map(x => x._id === d.request._id ? d.request : x));
        if (reviewStatus === "in_scope") {
          setTaskTitle(selected.title || "");
          setAssignStep(true);
          fetch("/api/team/members")
            .then(r => r.json())
            .then(d => { if (d.success) setEmployees(d.members || []); })
            .catch(() => {});
        } else {
          setSelected(null);
        }
      } else { alert(d.message || "Failed to update"); }
    } finally { setSaving(false); }
  }

  async function createTask() {
    if (!selected) return;
    // Validate: any stage with assignees must have a deadline
    const missing = stageAssign.some(s => s.assignedTo.length > 0 && !s.deadline);
    if (missing) { alert("Please set a deadline for every stage that has assignees."); return; }

    setCreating(true);

    // s.assignedTo is already an array — don't wrap it again
    const stages = stageAssign.map(s => ({
      name:       s.name,
      assignedTo: Array.isArray(s.assignedTo) ? s.assignedTo.filter(Boolean) : [],
      deadline:   s.deadline || null,
    }));

    // Task.contentType enum only allows reel/post/carousel/story/"" — request contentType is a service type, don't pass it
    const VALID_CONTENT_TYPES = ["reel", "post", "carousel", "story"];
    const contentType = VALID_CONTENT_TYPES.includes(selected.contentType) ? selected.contentType : "";

    try {
      const r = await fetch("/api/admin/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskType:    "production",
          title:       taskTitle,
          description: selected.brief || "",
          priority:    selected.priority || "medium",
          clientId:    selected.clientId?._id,
          brandId:     selected.brandId?._id,
          contentType,
          stages,
        }),
      });
      const d = await r.json();
      if (d.success) {
        setTaskDone(true);
        setTimeout(() => { closeModal(); }, 2200);
      } else { alert(d.message || "Failed to create task"); }
    } catch { alert("Network error"); }
    setCreating(false);
  }

  function closeModal() {
    setSelected(null);
    setAssignStep(false);
    setTaskDone(false);
    setStageAssign([
      { name: "Script/Concept",      assignedTo: [], deadline: "" },
      { name: "Shoot",               assignedTo: [], deadline: "" },
      { name: "Design/Edit/Develop", assignedTo: [], deadline: "" },
      { name: "Posted/Live",         assignedTo: [], deadline: "" },
    ]);
  }

  const pending    = requests.filter(r => r.status === "pending").length;
  const inScope    = requests.filter(r => r.status === "in_scope").length;
  const outScope   = requests.filter(r => r.status === "out_of_scope").length;

  return (
    <>
      <Head>
        <title>Task Requests · Admin</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" />
      </Head>

      <div className="theme-cyan">
        <LeftbarMobile />
        <SmartLeftbar />

        <section className="content">
          <Dashnav />

          <div className="container-fluid">
            {/* Page header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
              <div>
                <h4 style={{ fontWeight: 800, margin: 0, fontSize: 20, color: "#0f172a" }}>Client Task Requests</h4>
                <p style={{ margin: 0, fontSize: 13, color: "#64748b", marginTop: 2 }}>Review and scope client-submitted task requests</p>
              </div>
            </div>

            {/* Stat chips */}
            <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
              {[
                { label: "Pending Review", count: pending,  color: "#B45309", bg: "#FEF3C7", f: "" },
                { label: "In Scope",       count: inScope,  color: "#15803D", bg: "#DCFCE7", f: "in_scope" },
                { label: "Out of Scope",   count: outScope, color: "#DC2626", bg: "#FEE2E2", f: "out_of_scope" },
              ].map(({ label, count, color, bg, f }) => (
                <button key={f} onClick={() => setStatusF(statusF === f ? "" : f)}
                  style={{ padding: "10px 18px", border: `2px solid ${statusF === f ? color : "#E2E8F0"}`, borderRadius: 10, background: statusF === f ? bg : "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700, color: statusF === f ? color : "#374151", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8, transition: "all .12s" }}>
                  <span style={{ fontSize: 18, fontWeight: 800 }}>{count}</span>
                  {label}
                </button>
              ))}
              {statusF && (
                <button onClick={() => setStatusF("")} style={{ padding: "10px 14px", border: "1.5px solid #E2E8F0", borderRadius: 10, background: "#F8FAFC", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#64748b", fontFamily: "inherit" }}>
                  <i className="bi bi-x me-1" />Clear filter
                </button>
              )}
            </div>

            {/* Table */}
            <div style={{ background: "#fff", border: "1.5px solid #E2E8F0", borderRadius: 14, overflow: "hidden" }}>
              {loading ? (
                <div style={{ padding: "48px", textAlign: "center", color: "#94a3b8" }}>
                  <div className="spinner-border spinner-border-sm me-2" />Loading…
                </div>
              ) : requests.length === 0 ? (
                <div style={{ padding: "64px 32px", textAlign: "center" }}>
                  <i className="bi bi-inbox" style={{ fontSize: 40, color: "#CBD5E1", display: "block", marginBottom: 12 }} />
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#94a3b8" }}>No task requests</div>
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1.5px solid #F1F5F9", background: "#F8FAFC" }}>
                      <th style={TH}>Client / Brand</th>
                      <th style={TH}>Request Title</th>
                      <th style={TH}>Service</th>
                      <th style={TH}>Priority</th>
                      <th style={TH}>Need By</th>
                      <th style={TH}>Status</th>
                      <th style={TH}>Submitted</th>
                      <th style={TH}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map(req => {
                      const pm = PRIORITY_META[req.priority] || PRIORITY_META.medium;
                      const sm = STATUS_META[req.status]    || STATUS_META.pending;
                      const bc = req.brandId?.color || "#5A57FB";
                      return (
                        <tr key={req._id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                          <td style={TD}>
                            <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>{req.clientId?.name || "—"}</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
                              <span style={{ width: 8, height: 8, borderRadius: "50%", background: bc, display: "inline-block" }} />
                              <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>{req.brandId?.name || "—"}</span>
                            </div>
                          </td>
                          <td style={TD}>
                            <div style={{ fontWeight: 600, fontSize: 13, color: "#0f172a", maxWidth: 280 }}>{req.title}</div>
                            {req.brief && <div style={{ fontSize: 11, color: "#64748b", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 260 }}>{req.brief}</div>}
                          </td>
                          <td style={TD}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{SERVICE_META[req.contentType] || req.contentType || "—"}</span>
                          </td>
                          <td style={TD}>
                            <span style={{ padding: "3px 9px", borderRadius: 5, fontSize: 11, fontWeight: 700, background: pm.bg, color: pm.color }}>{pm.label}</span>
                          </td>
                          <td style={TD}>
                            <span style={{ fontSize: 12, color: "#374151" }}>{fmtDate(req.needBy)}</span>
                          </td>
                          <td style={TD}>
                            <span style={{ padding: "3px 9px", borderRadius: 5, fontSize: 11, fontWeight: 700, background: sm.bg, color: sm.color }}>{sm.label}</span>
                          </td>
                          <td style={TD}>
                            <span style={{ fontSize: 11, color: "#94a3b8" }}>{fmtAgo(req.createdAt)}</span>
                          </td>
                          <td style={TD}>
                            <button onClick={() => openReview(req)}
                              style={{ padding: "5px 14px", background: req.status === "pending" ? "linear-gradient(135deg,#5A57FB,#4845d4)" : "#F8FAFC", color: req.status === "pending" ? "#fff" : "#374151", border: "1.5px solid " + (req.status === "pending" ? "transparent" : "#E2E8F0"), borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                              {req.status === "pending" ? "Review" : "Update"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Review / Assign modal */}
      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={e => e.target === e.currentTarget && closeModal()}>
          <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: assignStep ? 680 : 560, boxShadow: "0 20px 60px rgba(0,0,0,.15)", overflow: "hidden", maxHeight: "92vh", display: "flex", flexDirection: "column", transition: "max-width .2s" }}>

            {/* Header */}
            <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
                  {assignStep ? "Assign Task to Team" : "Review Request"}
                </div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                  {selected.clientId?.name} · <span style={{ color: selected.brandId?.color || "#5A57FB" }}>{selected.brandId?.name}</span>
                  {assignStep && <span style={{ marginLeft: 8, background: "#DCFCE7", color: "#15803D", padding: "1px 8px", borderRadius: 20, fontWeight: 700, fontSize: 10 }}>✓ In Scope</span>}
                </div>
              </div>
              <button onClick={closeModal} style={{ border: "none", background: "none", cursor: "pointer", color: "#94a3b8", fontSize: 18 }}>
                <i className="bi bi-x-lg" />
              </button>
            </div>

            {/* ── Step 1: Review ── */}
            {!assignStep && (
              <>
                <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
                  {/* Request details */}
                  <div style={{ background: "#F8FAFC", border: "1.5px solid #E2E8F0", borderRadius: 10, padding: "14px 16px", marginBottom: 20 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", marginBottom: 6 }}>{selected.title}</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: selected.brief ? 10 : 0 }}>
                      {selected.contentType && (
                        <span style={{ fontSize: 11, fontWeight: 600, color: "#374151", background: "#E2E8F0", padding: "2px 8px", borderRadius: 5 }}>{SERVICE_META[selected.contentType] || selected.contentType}</span>
                      )}
                      {selected.priority && (
                        <span style={{ fontSize: 11, fontWeight: 700, background: PRIORITY_META[selected.priority]?.bg, color: PRIORITY_META[selected.priority]?.color, padding: "2px 8px", borderRadius: 5 }}>
                          {PRIORITY_META[selected.priority]?.label}
                        </span>
                      )}
                      {selected.needBy && (
                        <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>
                          <i className="bi bi-calendar3 me-1" />Need by {fmtDate(selected.needBy)}
                        </span>
                      )}
                    </div>
                    {selected.brief && <div style={{ fontSize: 13, color: "#374151", lineHeight: 1.6, marginTop: 8, whiteSpace: "pre-wrap" }}>{selected.brief}</div>}
                    {selected.referenceLinks?.length > 0 && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>References</div>
                        {selected.referenceLinks.map((link, i) => (
                          <a key={i} href={link} target="_blank" rel="noreferrer"
                            style={{ display: "block", fontSize: 12, color: "#5A57FB", fontWeight: 600, textDecoration: "none", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            <i className="bi bi-link-45deg me-1" />{link}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Scope decision */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 8 }}>Scope Decision *</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => setReviewStatus("in_scope")}
                        style={{ flex: 1, padding: "10px 12px", border: `2px solid ${reviewStatus === "in_scope" ? "#16A34A" : "#E2E8F0"}`, borderRadius: 8, background: reviewStatus === "in_scope" ? "#DCFCE7" : "#fff", color: reviewStatus === "in_scope" ? "#15803D" : "#64748b", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", transition: "all .12s" }}>
                        <i className="bi bi-check-circle me-2" />In Scope
                      </button>
                      <button onClick={() => setReviewStatus("out_of_scope")}
                        style={{ flex: 1, padding: "10px 12px", border: `2px solid ${reviewStatus === "out_of_scope" ? "#DC2626" : "#E2E8F0"}`, borderRadius: 8, background: reviewStatus === "out_of_scope" ? "#FEE2E2" : "#fff", color: reviewStatus === "out_of_scope" ? "#DC2626" : "#64748b", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit", transition: "all .12s" }}>
                        <i className="bi bi-x-circle me-2" />Out of Scope
                      </button>
                    </div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6 }}>
                      Remarks to client {reviewStatus === "out_of_scope" && <span style={{ color: "#DC2626" }}>*</span>}
                    </label>
                    <textarea value={remark} onChange={e => setRemark(e.target.value)} rows={3}
                      placeholder={reviewStatus === "in_scope" ? "Optional note — e.g. will be scheduled for next sprint…" : "Explain why this is out of scope…"}
                      style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 13, color: "#0f172a", outline: "none", fontFamily: "inherit", resize: "vertical", minHeight: 80 }} />
                  </div>

                  {reviewStatus === "out_of_scope" && (
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6 }}>Quote Amount (₹, optional)</label>
                      <input type="number" value={quote} onChange={e => setQuote(e.target.value)} placeholder="e.g. 15000"
                        style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 13, color: "#0f172a", outline: "none", fontFamily: "inherit" }} />
                    </div>
                  )}

                  {selected.status !== "pending" && <AdminRequestThread requestId={selected._id} />}
                </div>

                <div style={{ padding: "14px 24px", borderTop: "1px solid #F1F5F9", display: "flex", gap: 10, justifyContent: "flex-end", flexShrink: 0 }}>
                  <button onClick={closeModal} style={{ padding: "9px 20px", background: "none", color: "#64748b", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                  <button onClick={submitReview} disabled={saving || (reviewStatus === "out_of_scope" && !remark.trim())}
                    style={{ padding: "9px 20px", background: reviewStatus === "in_scope" ? "linear-gradient(135deg,#16A34A,#15803D)" : "linear-gradient(135deg,#DC2626,#B91C1C)", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: saving ? 0.7 : 1 }}>
                    {saving ? "Saving…" : reviewStatus === "in_scope" ? "Mark In Scope & Assign →" : "Mark Out of Scope & Notify"}
                  </button>
                </div>
              </>
            )}

            {/* ── Step 2: Assign Task ── */}
            {assignStep && (
              <>
                <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>

                  {taskDone ? (
                    <div style={{ textAlign: "center", padding: "48px 24px" }}>
                      <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                        <i className="bi bi-check-lg" style={{ fontSize: 32, color: "#15803D" }} />
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>Task Created!</div>
                      <div style={{ fontSize: 13, color: "#64748b" }}>The task has been assigned and emails sent to all employees.</div>
                    </div>
                  ) : (
                    <>
                      {/* Task title */}
                      <div style={{ marginBottom: 20 }}>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 6 }}>Task Title</label>
                        <input value={taskTitle} onChange={e => setTaskTitle(e.target.value)}
                          style={{ width: "100%", padding: "9px 12px", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 14, fontWeight: 600, color: "#0f172a", outline: "none", fontFamily: "inherit" }} />
                      </div>

                      {/* Stage assignment */}
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#374151", marginBottom: 12 }}>
                        Assign Stages
                        <span style={{ fontSize: 11, fontWeight: 400, color: "#94a3b8", marginLeft: 8 }}>— select employee + deadline for each stage</span>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
                        {stageAssign.map((s, i) => {
                          const stageEmps = filterByDept(employees, STAGE_DEPT_KEYWORDS[i]);
                          return (
                            <div key={i} style={{ background: "#F8FAFC", border: "1px solid #F1F5F9", borderRadius: 10, padding: "10px 14px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                                <div style={{ width: 26, height: 26, borderRadius: 7, background: STAGE_COLORS[i], color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, flexShrink: 0 }}>S{i+1}</div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{s.name}</div>
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                                {/* Assignees — checkbox list filtered by dept */}
                                <div>
                                  <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>
                                    Assignees · {STAGE_TEAM_LABELS[i]} team
                                  </div>
                                  {stageEmps.length === 0 ? (
                                    <div style={{ fontSize: 12, color: "#94a3b8", padding: "6px 10px", border: "1.5px solid #E2E8F0", borderRadius: 8, background: "#fff" }}>
                                      No employees in this department yet
                                    </div>
                                  ) : (
                                    <div style={{ border: "1.5px solid #E5E7EB", borderRadius: 10, maxHeight: 120, overflowY: "auto", background: "#fff" }}>
                                      {stageEmps.map((emp, ei) => {
                                        const checked = s.assignedTo.includes(emp._id);
                                        return (
                                          <label key={emp._id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", cursor: "pointer", borderBottom: ei < stageEmps.length - 1 ? "1px solid #F1F5F9" : "none", background: checked ? STAGE_COLORS[i] + "12" : "transparent" }}>
                                            <input
                                              type="checkbox"
                                              checked={checked}
                                              style={{ accentColor: STAGE_COLORS[i], width: 14, height: 14 }}
                                              onChange={e => setStageAssign(prev => prev.map((st, j) => {
                                                if (j !== i) return st;
                                                const curr = st.assignedTo || [];
                                                return { ...st, assignedTo: e.target.checked ? [...curr, emp._id] : curr.filter(id => id !== emp._id) };
                                              }))}
                                            />
                                            <span style={{ fontSize: 12, color: checked ? "#1E293B" : "#374151", fontWeight: checked ? 700 : 400 }}>
                                              {emp.name}
                                              {emp.dept ? <span style={{ fontSize: 11, color: "#94a3b8", marginLeft: 4 }}>({emp.dept})</span> : null}
                                            </span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                                {/* Deadline */}
                                <div>
                                  <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>
                                    Deadline {s.assignedTo.length > 0 && <span style={{ color: "#EF4444" }}>*</span>}
                                  </div>
                                  <input
                                    type="datetime-local"
                                    value={s.deadline}
                                    style={{ width: "100%", padding: "7px 10px", border: `1.5px solid ${s.assignedTo.length > 0 && !s.deadline ? "#FCA5A5" : "#E2E8F0"}`, borderRadius: 7, fontSize: 12.5, color: "#0f172a", outline: "none", fontFamily: "inherit" }}
                                    onChange={e => setStageAssign(prev => prev.map((st, j) => j === i ? { ...st, deadline: e.target.value } : st))}
                                  />
                                  {s.assignedTo.length > 0 && !s.deadline && (
                                    <div style={{ fontSize: 11, color: "#EF4444", marginTop: 3 }}>Deadline required when assignees are set</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Brief preview */}
                      {selected.brief && (
                        <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 4 }}>Client Brief</div>
                          <div style={{ fontSize: 12, color: "#374151", lineHeight: 1.6 }}>{selected.brief.slice(0, 300)}{selected.brief.length > 300 ? "…" : ""}</div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {!taskDone && (
                  <div style={{ padding: "14px 24px", borderTop: "1px solid #F1F5F9", display: "flex", gap: 10, justifyContent: "flex-end", flexShrink: 0 }}>
                    <button onClick={closeModal} style={{ padding: "9px 20px", background: "none", color: "#64748b", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                      Skip (scope saved)
                    </button>
                    <button onClick={createTask} disabled={creating || !taskTitle.trim()}
                      style={{ padding: "9px 24px", background: "linear-gradient(135deg,#4F46E5,#4338CA)", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: creating ? 0.7 : 1, display: "flex", alignItems: "center", gap: 8 }}>
                      {creating ? <><div className="spinner-border spinner-border-sm" style={{ width: 14, height: 14, borderWidth: 2 }} />Creating…</> : <><i className="bi bi-people-fill" />Create & Assign Task</>}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

const TH = { padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".5px", whiteSpace: "nowrap" };
const TD = { padding: "12px 14px", verticalAlign: "middle" };

function AdminRequestThread({ requestId }) {
  const [messages, setMessages] = useState([]);
  const [loaded,   setLoaded]   = useState(false);
  const [text,     setText]     = useState("");
  const [sending,  setSending]  = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    fetch(`/api/admin/task-requests/${requestId}/messages`)
      .then(r => r.json())
      .then(d => { if (d.success) setMessages(d.messages || []); })
      .finally(() => setLoaded(true));
  }, [requestId]);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const r = await fetch(`/api/admin/task-requests/${requestId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });
      const d = await r.json();
      if (d.success) { setMessages(d.messages); setText(""); }
    } finally { setSending(false); }
  }

  function onKey(e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }

  if (!loaded) return (
    <div style={{ display: "flex", justifyContent: "center", padding: "16px 0" }}>
      <div className="spinner-border spinner-border-sm text-primary" />
    </div>
  );

  return (
    <div style={{ marginTop: 6 }}>
      {/* Divider */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div style={{ height: 1, flex: 1, background: "#E2E8F0" }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".6px", whiteSpace: "nowrap" }}>
          <i className="bi bi-chat-dots me-1" />Client Conversation
        </span>
        <div style={{ height: 1, flex: 1, background: "#E2E8F0" }} />
      </div>

      {/* Messages */}
      {messages.length === 0 ? (
        <div style={{ textAlign: "center", padding: "10px 0 8px", color: "#94a3b8", fontSize: 12 }}>
          No messages yet — reply to the client below
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10, maxHeight: 220, overflowY: "auto" }}>
          {messages.map((msg, i) => {
            const isAdmin = msg.senderRole === "admin";
            return (
              <div key={i} style={{ display: "flex", flexDirection: isAdmin ? "row-reverse" : "row", gap: 8, alignItems: "flex-end" }}>
                <div style={{ width: 26, height: 26, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: "#fff", background: isAdmin ? "#5A57FB" : "#0f172a" }}>
                  {isAdmin ? "Me" : "C"}
                </div>
                <div style={{ maxWidth: "72%" }}>
                  <div style={{
                    padding: "8px 11px",
                    borderRadius: isAdmin ? "10px 10px 4px 10px" : "10px 10px 10px 4px",
                    background: isAdmin ? "#5A57FB" : "#F1F5F9",
                    color: isAdmin ? "#fff" : "#0f172a",
                    fontSize: 12, lineHeight: 1.5,
                  }}>
                    {msg.text}
                  </div>
                  <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2, textAlign: isAdmin ? "right" : "left" }}>
                    {!isAdmin && msg.senderName ? `${msg.senderName} · ` : ""}{fmtAgo(msg.sentAt)}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Input */}
      <div style={{ display: "flex", gap: 8 }}>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={onKey}
          rows={2}
          placeholder="Reply to client… (Enter to send)"
          style={{ flex: 1, padding: "8px 11px", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 12, color: "#0f172a", outline: "none", fontFamily: "inherit", resize: "none", lineHeight: 1.5 }}
        />
        <button onClick={send} disabled={!text.trim() || sending}
          style={{ flexShrink: 0, width: 38, height: 38, alignSelf: "flex-end", borderRadius: 8, border: "none", background: text.trim() ? "#5A57FB" : "#E2E8F0", color: text.trim() ? "#fff" : "#94a3b8", cursor: text.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, transition: "all .12s" }}>
          {sending
            ? <div className="spinner-border spinner-border-sm" style={{ width: 14, height: 14, borderWidth: 2 }} />
            : <i className="bi bi-send-fill" />}
        </button>
      </div>
    </div>
  );
}

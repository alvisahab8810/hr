import { useEffect, useState, useCallback, useRef } from "react";
import Head from "next/head";
import SmartLeftbar from "@/components/SmartLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import Dashnav from "@/components/Dashnav";
import TaskAssignDrawer from "@/components/TaskAssignDrawer";

const PRIORITY_META = {
  low:    { label: "Low",    color: "#16A34A", bg: "#DCFCE7" },
  medium: { label: "Medium", color: "#B45309", bg: "#FEF3C7" },
  high:   { label: "High",   color: "#DC2626", bg: "#FEE2E2" },
  urgent: { label: "Urgent", color: "#7C3AED", bg: "#EDE9FE" },
};
const STATUS_META = {
  pending:      { label: "Verifying",    color: "#B45309", bg: "#FEF3C7" },
  in_scope:     { label: "In Scope",     color: "#15803D", bg: "#DCFCE7" },
  out_of_scope: { label: "Out of Scope", color: "#DC2626", bg: "#FEE2E2" },
};
const SERVICE_META = {
  socialMedia: "Social Media",
  website:     "Web Development",
  seo:         "SEO",
  ads:         "Ad Campaigns",
  branding:    "Branding",
};

const TH = { padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".5px", whiteSpace: "nowrap" };
const TD = { padding: "12px 14px", verticalAlign: "middle" };

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
  const [brandF,    setBrandF]    = useState("");
  const [serviceF,  setServiceF]  = useState("");
  const [priorityF, setPriorityF] = useState("");
  const [searchF,   setSearchF]   = useState("");
  const [selected,  setSelected]  = useState(null);

  // Review form state (Step 1)
  const [reviewStatus, setReviewStatus] = useState("in_scope");
  const [remark,       setRemark]       = useState("");
  const [quote,        setQuote]        = useState("");
  const [saving,       setSaving]       = useState(false);

  // TaskAssignDrawer (Step 2)
  const [showDrawer, setShowDrawer] = useState(false);

  // Audio + notification polling
  const audioRef       = useRef(null);
  const lastPendingRef = useRef(null);
  const notifPollRef   = useRef(null);

  useEffect(() => {
    audioRef.current = new Audio("/sounds/client-music-sound.mp3");
    audioRef.current.volume = 0.7;
    const unlock = () => {
      if (!audioRef.current) return;
      audioRef.current.play()
        .then(() => { audioRef.current.pause(); audioRef.current.currentTime = 0; })
        .catch(() => {});
    };
    document.addEventListener("click", unlock, { once: true });
    document.addEventListener("keydown", unlock, { once: true });
    return () => {
      document.removeEventListener("click", unlock);
      document.removeEventListener("keydown", unlock);
    };
  }, []);

  function playNotif() {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play().catch(() => {});
  }

  // Poll for new pending requests every 15s
  useEffect(() => {
    notifPollRef.current = setInterval(async () => {
      const d = await fetch("/api/admin/task-requests?status=pending")
        .then(r => r.json()).catch(() => null);
      if (!d?.success) return;
      const count = (d.requests || []).length;
      if (lastPendingRef.current !== null && count > lastPendingRef.current) {
        playNotif();
        setRequests(prev => {
          const existingIds = new Set(prev.map(r => r._id));
          const newOnes = (d.requests || []).filter(r => !existingIds.has(r._id));
          return newOnes.length > 0 ? [...newOnes, ...prev] : prev;
        });
      }
      lastPendingRef.current = count;
    }, 15000);
    return () => clearInterval(notifPollRef.current);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = `/api/admin/task-requests${statusF ? `?status=${statusF}` : ""}`;
      const d = await fetch(url).then(r => r.json());
      if (d.success) {
        setRequests(d.requests);
        // Prime the pending count baseline for the sound poll
        if (lastPendingRef.current === null) {
          lastPendingRef.current = (d.requests || []).filter(r => r.status === "pending").length;
        }
      }
    } finally { setLoading(false); }
  }, [statusF]);

  useEffect(() => { load(); }, [load]);

  function openReview(req) {
    setSelected(req);
    setReviewStatus(req.status === "pending" ? "in_scope" : req.status);
    setRemark(req.adminRemark || "");
    setQuote(req.quoteAmount != null ? String(req.quoteAmount) : "");
    setShowDrawer(false);
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
        setSelected(prev => prev?._id === d.request._id ? { ...prev, ...d.request } : prev);
        if (reviewStatus === "in_scope") {
          setShowDrawer(true);
        } else {
          setSelected(null);
        }
      } else { alert(d.message || "Failed to update"); }
    } finally { setSaving(false); }
  }

  // ── TaskAssignDrawer API functions (admin-flavoured) ──
  async function adminCreateTask(body) {
    // Map employee drawer body → admin tasks API shape
    const { taskType, taskTitle, contentType, stages, ...rest } = body;
    const payload = taskType === "production"
      ? { taskType: "production", title: taskTitle, description: selected.brief || "", priority: selected.priority || "medium", clientId: selected.clientId?._id, brandId: selected.brandId?._id, contentType, stages }
      : taskType === "seo"
        ? { taskType: "seo", brandId: selected.brandId?._id, clientId: selected.clientId?._id, ...rest }
        : { taskType, title: body.taskTitle || body.title, description: body.description || selected.brief || "", priority: body.priority || selected.priority || "medium", assignedTo: body.assignedTo || null, brandId: selected.brandId?._id, clientId: selected.clientId?._id, dueDate: body.dueDate || null };
    const r = await fetch("/api/admin/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include",
    });
    return r.json();
  }
  async function adminFetchBrand(brandId) {
    const d = await fetch(`/api/admin/brands/${brandId}`, { credentials: "include" }).then(r => r.json());
    return d.success ? d.brand : null;
  }
  async function adminFetchNomenclature(brandId, contentType) {
    const d = await fetch(`/api/admin/tasks/nomenclature?brandId=${brandId}&contentType=${contentType}`, { credentials: "include" }).then(r => r.json());
    return d.success ? d.nomenclature : "";
  }
  async function adminFetchEmployees() {
    const d = await fetch("/api/team/members", { credentials: "include" }).then(r => r.json());
    return d.success ? d.members : [];
  }

  function closeDrawer() {
    setShowDrawer(false);
    setSelected(null);
  }

  const pending  = requests.filter(r => r.status === "pending").length;
  const inScope  = requests.filter(r => r.status === "in_scope").length;
  const outScope = requests.filter(r => r.status === "out_of_scope").length;

  const allBrands   = [...new Map(requests.filter(r => r.brandId).map(r => [String(r.brandId._id), r.brandId])).values()];
  const allServices = [...new Set(requests.map(r => r.contentType).filter(Boolean))];
  const hasFilter   = !!(brandF || serviceF || priorityF || searchF.trim());

  const filteredRequests = requests.filter(r => {
    if (statusF   && r.status      !== statusF)            return false;
    if (brandF    && String(r.brandId?._id) !== brandF)    return false;
    if (serviceF  && r.contentType !== serviceF)           return false;
    if (priorityF && r.priority    !== priorityF)          return false;
    if (searchF.trim()) {
      const q = searchF.trim().toLowerCase();
      if (!(r.title||"").toLowerCase().includes(q) &&
          !(r.brief||"").toLowerCase().includes(q) &&
          !(r.brandId?.name||"").toLowerCase().includes(q) &&
          !(r.clientId?.name||"").toLowerCase().includes(q)) return false;
    }
    return true;
  });

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
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
              <div>
                <h4 style={{ fontWeight: 800, margin: 0, fontSize: 20, color: "#0f172a" }}>Client Task Requests</h4>
                <p style={{ margin: 0, fontSize: 13, color: "#64748b", marginTop: 2 }}>Review and scope client-submitted task requests</p>
              </div>
            </div>

            {/* Stat chips */}
            <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
              {[
                { label: "Pending Review", count: pending,  color: "#B45309", bg: "#FEF3C7", f: "pending" },
                { label: "In Scope",       count: inScope,  color: "#15803D", bg: "#DCFCE7", f: "in_scope" },
                { label: "Out of Scope",   count: outScope, color: "#DC2626", bg: "#FEE2E2", f: "out_of_scope" },
              ].map(({ label, count, color, bg, f }) => (
                <button key={f} onClick={() => setStatusF(statusF === f ? "" : f)}
                  style={{ padding: "10px 18px", border: `2px solid ${statusF === f ? color : "#E2E8F0"}`, borderRadius: 10, background: statusF === f ? bg : "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700, color: statusF === f ? color : "#374151", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8, transition: "all .12s" }}>
                  <span style={{ fontSize: 18, fontWeight: 800 }}>{count}</span>
                  {label}
                </button>
              ))}
            </div>

            {/* Filter bar */}
            {(() => {
              const fs = { padding: "7px 11px", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 12.5, outline: "none", cursor: "pointer", background: "#fff", color: "#374151", fontFamily: "inherit" };
              return (
                <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
                  {/* Search */}
                  <div style={{ position: "relative", flex: "1 1 180px", minWidth: 160 }}>
                    <i className="bi bi-search" style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "#9CA3AF", fontSize: 12, pointerEvents: "none" }} />
                    <input value={searchF} onChange={e => setSearchF(e.target.value)} placeholder="Search title, brand, client…"
                      style={{ ...fs, paddingLeft: 28, width: "100%", boxSizing: "border-box" }} />
                  </div>
                  {/* Brand */}
                  {allBrands.length > 0 && (
                    <select value={brandF} onChange={e => setBrandF(e.target.value)} style={fs}>
                      <option value="">All Brands</option>
                      {allBrands.map(b => <option key={b._id} value={String(b._id)}>{b.name}</option>)}
                    </select>
                  )}
                  {/* Service */}
                  {allServices.length > 0 && (
                    <select value={serviceF} onChange={e => setServiceF(e.target.value)} style={fs}>
                      <option value="">All Services</option>
                      {allServices.map(s => <option key={s} value={s}>{SERVICE_META[s] || s}</option>)}
                    </select>
                  )}
                  {/* Priority */}
                  <select value={priorityF} onChange={e => setPriorityF(e.target.value)} style={fs}>
                    <option value="">All Priorities</option>
                    {Object.entries(PRIORITY_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                  {/* Clear */}
                  {(hasFilter || statusF) && (
                    <button onClick={() => { setSearchF(""); setBrandF(""); setServiceF(""); setPriorityF(""); setStatusF(""); }}
                      style={{ ...fs, background: "#FEF2F2", color: "#DC2626", border: "1.5px solid #FCA5A5", whiteSpace: "nowrap" }}>
                      <i className="bi bi-x-circle me-1" /> Clear
                    </button>
                  )}
                  <span style={{ marginLeft: "auto", fontSize: 12, color: "#9CA3AF", whiteSpace: "nowrap" }}>
                    {filteredRequests.length}{(hasFilter || statusF) ? ` of ${requests.length}` : ""} request{filteredRequests.length !== 1 ? "s" : ""}
                  </span>
                </div>
              );
            })()}

            {/* Table */}
            <div style={{ background: "#fff", border: "1.5px solid #E2E8F0", borderRadius: 14, overflow: "hidden" }}>
              {loading ? (
                <div style={{ padding: "48px", textAlign: "center", color: "#94a3b8" }}>
                  <div className="spinner-border spinner-border-sm me-2" />Loading…
                </div>
              ) : filteredRequests.length === 0 ? (
                <div style={{ padding: "64px 32px", textAlign: "center" }}>
                  <i className="bi bi-inbox" style={{ fontSize: 40, color: "#CBD5E1", display: "block", marginBottom: 12 }} />
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#94a3b8" }}>{hasFilter || statusF ? "No matching requests" : "No task requests"}</div>
                  {(hasFilter || statusF) && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>Try adjusting your filters</div>}
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "1.5px solid #F1F5F9", background: "#F8FAFC" }}>
                        {["Client / Brand","Request Title","Service","Priority","Need By","Status","Submitted","Action"].map(h => (
                          <th key={h} style={TH}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRequests.map(req => {
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
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* ── Step 1: Review modal (scope decision) ── */}
      {selected && !showDrawer && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 560, boxShadow: "0 20px 60px rgba(0,0,0,.15)", overflow: "hidden", maxHeight: "92vh", display: "flex", flexDirection: "column" }}>

            <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexShrink: 0 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>Review Request</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                  {selected.clientId?.name} · <span style={{ color: selected.brandId?.color || "#5A57FB" }}>{selected.brandId?.name}</span>
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ border: "none", background: "none", cursor: "pointer", color: "#94a3b8", fontSize: 18 }}>
                <i className="bi bi-x-lg" />
              </button>
            </div>

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
              <button onClick={() => setSelected(null)} style={{ padding: "9px 20px", background: "none", color: "#64748b", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
              <button onClick={submitReview} disabled={saving || (reviewStatus === "out_of_scope" && !remark.trim())}
                style={{ padding: "9px 20px", background: reviewStatus === "in_scope" ? "linear-gradient(135deg,#16A34A,#15803D)" : "linear-gradient(135deg,#DC2626,#B91C1C)", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving…" : reviewStatus === "in_scope" ? "Mark In Scope & Assign Task →" : "Mark Out of Scope & Notify"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2: TaskAssignDrawer (exact task management popup) ── */}
      {showDrawer && selected && (
        <TaskAssignDrawer
          request={selected}
          onClose={closeDrawer}
          onTaskCreated={() => { closeDrawer(); load(); }}
          createTask={adminCreateTask}
          fetchBrand={adminFetchBrand}
          fetchNomenclature={adminFetchNomenclature}
          fetchEmployees={adminFetchEmployees}
        />
      )}
    </>
  );
}

/* ── AdminRequestThread — unchanged ── */
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
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div style={{ height: 1, flex: 1, background: "#E2E8F0" }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".6px", whiteSpace: "nowrap" }}>
          <i className="bi bi-chat-dots me-1" />Client Conversation
        </span>
        <div style={{ height: 1, flex: 1, background: "#E2E8F0" }} />
      </div>
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
                  <div style={{ padding: "8px 11px", borderRadius: isAdmin ? "10px 10px 4px 10px" : "10px 10px 10px 4px", background: isAdmin ? "#5A57FB" : "#F1F5F9", color: isAdmin ? "#fff" : "#0f172a", fontSize: 12, lineHeight: 1.5 }}>
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
      <div style={{ display: "flex", gap: 8 }}>
        <textarea value={text} onChange={e => setText(e.target.value)} onKeyDown={onKey} rows={2}
          placeholder="Reply to client… (Enter to send)"
          style={{ flex: 1, padding: "8px 11px", border: "1.5px solid #E2E8F0", borderRadius: 8, fontSize: 12, color: "#0f172a", outline: "none", fontFamily: "inherit", resize: "none", lineHeight: 1.5 }} />
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

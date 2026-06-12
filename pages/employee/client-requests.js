import { useEffect, useState, useCallback, useRef } from "react";
import Head from "next/head";
import EmployeeLeftbar from "@/components/employee/Leftbar";
import LeftbarMobile from "@/components/employee/LeftbarMobile";
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

const getToken = () => (typeof window !== "undefined" ? localStorage.getItem("employeeToken") || "" : "");
const authH    = () => ({ Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" });

export default function EmployeeClientRequests() {
  // Access guard
  const [authorized, setAuthorized] = useState(null);

  const [requests,  setRequests]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [statusF,   setStatusF]   = useState("");
  const [brandF,    setBrandF]    = useState("");
  const [serviceF,  setServiceF]  = useState("");
  const [priorityF, setPriorityF] = useState("");
  const [searchF,   setSearchF]   = useState("");

  // Review modal (Step 1: scope decision)
  const [selected,     setSelected]     = useState(null);
  const [reviewStatus, setReviewStatus] = useState("in_scope");
  const [remark,       setRemark]       = useState("");
  const [saving,       setSaving]       = useState(false);

  // Assign drawer (Step 2: task creation)
  const [showDrawer, setShowDrawer] = useState(false);

  // Audio + polling refs
  const audioRef         = useRef(null);
  const lastPendingRef   = useRef(null);
  const notifPollRef     = useRef(null);

  // ── DM access check ──
  useEffect(() => {
    const token = getToken();
    if (!token) { setAuthorized(false); return; }
    fetch("/api/employee/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (!d.success) { setAuthorized(false); return; }
        const dept = (d.employee?.professional?.department || "").toLowerCase();
        setAuthorized(dept.includes("digital") || dept.includes("marketing"));
      })
      .catch(() => setAuthorized(false));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = `/api/employee/client-requests${statusF ? `?status=${statusF}` : ""}`;
      const d   = await fetch(url, { headers: authH() }).then(r => r.json());
      if (d.success) {
        const reqs = d.requests || [];
        setRequests(reqs);
        // Prime the pending count so polling knows baseline
        if (lastPendingRef.current === null) {
          lastPendingRef.current = reqs.filter(r => r.status === "pending").length;
        }
      }
    } finally { setLoading(false); }
  }, [statusF]);

  // Audio unlock
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

  useEffect(() => { if (authorized) load(); }, [load, authorized]);

  // Background poll — sound when new pending request arrives
  useEffect(() => {
    if (!authorized) return;
    notifPollRef.current = setInterval(async () => {
      const d = await fetch("/api/employee/client-requests?status=pending", { headers: authH() })
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
  }, [authorized]);

  function openReview(req) {
    setSelected(req);
    setReviewStatus(req.status === "pending" ? "in_scope" : req.status);
    setRemark(req.adminRemark || "");
    setShowDrawer(false);
  }

  async function submitReview() {
    if (!selected) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/employee/client-requests/${selected._id}`, {
        method: "PATCH",
        headers: authH(),
        body: JSON.stringify({ status: reviewStatus, adminRemark: remark }),
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
      } else { alert(d.message || "Failed"); }
    } finally { setSaving(false); }
  }

  // ── TaskAssignDrawer API functions (employee-flavoured) ──
  async function empCreateTask(body) {
    const r = await fetch(`/api/employee/client-requests/${selected._id}`, {
      method: "POST",
      headers: authH(),
      body: JSON.stringify(body),
    });
    return r.json();
  }
  async function empFetchBrand(brandId) {
    const d = await fetch(`/api/employee/brand/${brandId}`, { headers: authH() }).then(r => r.json());
    return d.success ? d.brand : null;
  }
  async function empFetchNomenclature(brandId, contentType) {
    const d = await fetch(`/api/employee/tasks/nomenclature?brandId=${brandId}&contentType=${contentType}`, { headers: authH() }).then(r => r.json());
    return d.success ? d.nomenclature : "";
  }
  async function empFetchEmployees() {
    const d = await fetch("/api/team/members", { headers: authH() }).then(r => r.json());
    return d.success ? d.members : [];
  }

  function closeDrawer() {
    setShowDrawer(false);
    setSelected(null);
  }

  const pending  = requests.filter(r => r.status === "pending").length;
  const inScope  = requests.filter(r => r.status === "in_scope").length;
  const outScope = requests.filter(r => r.status === "out_of_scope").length;

  // Derive filter options
  const allBrands = [...new Map(requests.filter(r => r.brandId).map(r => [String(r.brandId._id), r.brandId])).values()];
  const allServices = [...new Set(requests.map(r => r.contentType).filter(Boolean))];

  // Apply filters client-side
  const hasFilter = !!(brandF || serviceF || priorityF || searchF.trim());
  const filteredRequests = requests.filter(r => {
    if (statusF   && r.status      !== statusF)   return false;
    if (brandF    && String(r.brandId?._id) !== brandF) return false;
    if (serviceF  && r.contentType !== serviceF)  return false;
    if (priorityF && r.priority    !== priorityF) return false;
    if (searchF.trim()) {
      const q = searchF.trim().toLowerCase();
      if (!(r.title||"").toLowerCase().includes(q) &&
          !(r.brief||"").toLowerCase().includes(q) &&
          !(r.brandId?.name||"").toLowerCase().includes(q) &&
          !(r.clientId?.name||"").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // ── Access denied ──
  if (authorized === false) {
    return (
      <div className="add-employee-area">
        <div className="main-nav">
          <EmployeeLeftbar />
          <LeftbarMobile />
          <Dashnav />
          <section className="content home">
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: 12, color: "#64748b" }}>
              <i className="bi bi-lock-fill" style={{ fontSize: 40, color: "#CBD5E1" }} />
              <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Access Restricted</div>
              <div style={{ fontSize: 13 }}>This page is only accessible to Digital Marketing department employees.</div>
            </div>
          </section>
        </div>
      </div>
    );
  }
  if (authorized === null) return null;

  return (
    <>
      <Head>
        <title>Client Requests · Viralon</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" />
      </Head>

      <div className="add-employee-area">
        <div className="main-nav">
          <EmployeeLeftbar />
          <LeftbarMobile />
          <Dashnav />

          <section className="content home">
            <div className="container-fluid">

              {/* Header */}
              <div style={{ marginBottom: 22 }}>
                <h4 style={{ fontWeight: 800, margin: 0, fontSize: 20, color: "#0f172a" }}>
                  <i className="bi bi-inbox-fill" style={{ marginRight: 8, color: "#5A57FB" }} />
                  Client Requests
                </h4>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748b" }}>
                  Review client requests and assign tasks to the team
                </p>
              </div>

              {/* Stat chips */}
              <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
                {[
                  { label: "Pending Review", count: pending,  color: "#B45309", bg: "#FEF3C7", f: "pending" },
                  { label: "In Scope",       count: inScope,  color: "#15803D", bg: "#DCFCE7", f: "in_scope" },
                  { label: "Out of Scope",   count: outScope, color: "#DC2626", bg: "#FEE2E2", f: "out_of_scope" },
                ].map(({ label, count, color, bg, f }) => (
                  <button key={f} onClick={() => setStatusF(statusF === f ? "" : f)}
                    style={{ padding: "10px 18px", border: `2px solid ${statusF === f ? color : "#E2E8F0"}`, borderRadius: 10, background: statusF === f ? bg : "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700, color: statusF === f ? color : "#374151", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8 }}>
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
                      {filteredRequests.length} {(hasFilter || statusF) ? `of ${requests.length}` : ""} request{filteredRequests.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                );
              })()}

              {/* Table */}
              <div style={{ background: "#fff", border: "1.5px solid #E2E8F0", borderRadius: 14, overflow: "hidden" }}>
                {loading ? (
                  <div style={{ padding: 48, textAlign: "center", color: "#94a3b8" }}>
                    <div className="spinner-border spinner-border-sm me-2" />Loading…
                  </div>
                ) : filteredRequests.length === 0 ? (
                  <div style={{ padding: "64px 32px", textAlign: "center" }}>
                    <i className="bi bi-inbox" style={{ fontSize: 40, color: "#CBD5E1", display: "block", marginBottom: 12 }} />
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#94a3b8" }}>{hasFilter || statusF ? "No matching requests" : "No requests"}</div>
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
                                <div style={{ fontWeight: 600, fontSize: 13, color: "#0f172a", maxWidth: 240 }}>{req.title}</div>
                                {req.brief && <div style={{ fontSize: 11, color: "#64748b", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 220 }}>{req.brief}</div>}
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
                    style={{ flex: 1, padding: "10px 12px", border: `2px solid ${reviewStatus === "in_scope" ? "#16A34A" : "#E2E8F0"}`, borderRadius: 8, background: reviewStatus === "in_scope" ? "#DCFCE7" : "#fff", color: reviewStatus === "in_scope" ? "#15803D" : "#64748b", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                    <i className="bi bi-check-circle me-2" />In Scope
                  </button>
                  <button onClick={() => setReviewStatus("out_of_scope")}
                    style={{ flex: 1, padding: "10px 12px", border: `2px solid ${reviewStatus === "out_of_scope" ? "#DC2626" : "#E2E8F0"}`, borderRadius: 8, background: reviewStatus === "out_of_scope" ? "#FEE2E2" : "#fff", color: reviewStatus === "out_of_scope" ? "#DC2626" : "#64748b", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
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
          createTask={empCreateTask}
          fetchBrand={empFetchBrand}
          fetchNomenclature={empFetchNomenclature}
          fetchEmployees={empFetchEmployees}
        />
      )}
    </>
  );
}

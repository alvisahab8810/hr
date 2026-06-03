import { useState, useEffect, useCallback } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import EmployeeLeftbar from "@/components/employee/Leftbar";
import Dashnav from "@/components/Dashnav";
import LeftbarMobile from "@/components/employee/LeftbarMobile";

const getToken = () => (typeof window !== "undefined" ? localStorage.getItem("employeeToken") || "" : "");
const authH = () => ({ Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" });

const STATUS_META = {
  pending:   { label: "Pending",   bg: "#FEF9C3", color: "#A16207" },
  approved:  { label: "Approved",  bg: "#DCFCE7", color: "#15803D" },
  scheduled: { label: "Scheduled", bg: "#DCFCE7", color: "#15803D" },
  rejected:  { label: "Rescheduled", bg: "#FFF7ED", color: "#C2410C" },
};

function fmtDT(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function MeetingRequests() {
  const router = useRouter();
  const [brands,        setBrands]        = useState([]);
  const [selectedBrand, setSelectedBrand] = useState("");
  const [requests,      setRequests]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [authorized,    setAuthorized]    = useState(true);

  // Action modal
  const [modal,         setModal]         = useState(null); // { cr, actionType }
  const [schedDate,     setSchedDate]     = useState("");
  const [schedTime,     setSchedTime]     = useState("");
  const [adminNote,     setAdminNote]     = useState("");
  const [meetingLinkModal, setMeetingLinkModal] = useState("");
  const [saving,        setSaving]        = useState(false);

  // Load all brands to build filter
  useEffect(() => {
    fetch("/api/employee/client-messages", { headers: authH() })
      .then(r => r.json())
      .then(d => {
        if (d.success) setBrands(d.brands || []);
        else if (d.success === false) setAuthorized(false);
      })
      .catch(() => {});
  }, []);

  // Load requests when brand filter changes
  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const allBrands = selectedBrand ? [selectedBrand] : brands.map(b => b._id);
      const results = await Promise.all(
        allBrands.map(id =>
          fetch(`/api/employee/call-requests?brandId=${id}`, { headers: authH() })
            .then(r => r.json())
            .then(d => d.success ? d.requests || [] : [])
            .catch(() => [])
        )
      );
      const flat = results.flat().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setRequests(flat);
    } finally { setLoading(false); }
  }, [selectedBrand, brands]);

  useEffect(() => {
    if (brands.length > 0) loadRequests();
  }, [loadRequests, brands]);

  function openModal(cr, actionType) {
    setModal({ cr, actionType });
    setSchedDate(cr.preferredDate || "");
    setSchedTime(cr.preferredTime || "");
    setAdminNote("");
    setMeetingLinkModal("");
  }

  async function submitAction() {
    if (!modal) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/employee/call-requests/${modal.cr._id}`, {
        method: "PATCH", headers: authH(),
        body: JSON.stringify({ action: modal.actionType, scheduledDate: schedDate, scheduledTime: schedTime, adminNote, meetingLink: meetingLinkModal }),
      });
      const d = await r.json();
      if (d.success) {
        setRequests(prev => prev.map(cr => cr._id === modal.cr._id ? d.request : cr));
        setModal(null);
      } else alert(d.message || "Failed");
    } catch { alert("Network error"); }
    setSaving(false);
  }

  if (!authorized) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", flexDirection:"column", gap:10, color:"#64748b" }}>
      <i className="bi bi-lock" style={{ fontSize:36, color:"#CBD5E1" }} />
      <div style={{ fontSize:15, fontWeight:700, color:"#0f172a" }}>Access Restricted</div>
      <div style={{ fontSize:13 }}>This page is for Digital Marketing department only.</div>
    </div>
  );

  const pending   = requests.filter(r => r.status === "pending").length;
  const confirmed = requests.filter(r => r.status === "approved" || r.status === "scheduled").length;

  return (
    <div>
      <Head>
        <title>Meeting Requests — Viralon</title>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" />
      </Head>
      <style>{`
        .mr-card { background:#fff; border:1.5px solid #E2E8F0; border-radius:12px; padding:18px 20px; margin-bottom:12px; }
        .mr-card.pending   { border-left:4px solid #F59E0B; }
        .mr-card.approved, .mr-card.scheduled { border-left:4px solid #10B981; }
        .mr-card.rejected  { border-left:4px solid #F97316; }
        .mr-badge { display:inline-block; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:700; }
        .mr-type  { display:inline-block; padding:2px 8px; border-radius:6px; font-size:11px; font-weight:700; background:#EEF2FF; color:#4F46E5; margin-left:6px; }
        .mr-actions { display:flex; gap:8px; margin-top:12px; flex-wrap:wrap; }
        .mr-btn-sched { padding:7px 16px; background:#059669; color:#fff; border:none; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer; font-family:inherit; }
        .mr-btn-reschedule { padding:7px 16px; background:#F97316; color:#fff; border:none; border-radius:8px; font-size:12px; font-weight:700; cursor:pointer; font-family:inherit; }
        .mr-modal-bg { position:fixed; inset:0; background:rgba(0,0,0,.4); z-index:2000; display:flex; align-items:center; justify-content:center; padding:16px; }
        .mr-modal-box { background:#fff; border-radius:14px; padding:26px; width:100%; max-width:420px; }
        .mr-field { margin-bottom:12px; }
        .mr-field label { display:block; font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:.5px; margin-bottom:5px; }
        .mr-field input, .mr-field textarea { width:100%; padding:9px 12px; border:1.5px solid #E2E8F0; border-radius:8px; font-size:13px; font-family:inherit; outline:none; color:#0f172a; }
        .mr-field input:focus, .mr-field textarea:focus { border-color:#4F46E5; }
        .mr-modal-footer { display:flex; gap:8px; justify-content:flex-end; margin-top:16px; }
        .mr-btn-pri { padding:9px 20px; background:#4F46E5; color:#fff; border:none; border-radius:8px; font-size:13px; font-weight:700; cursor:pointer; font-family:inherit; }
        .mr-btn-sec { padding:9px 16px; background:#F1F5F9; color:#475569; border:1.5px solid #E2E8F0; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; }
      `}</style>

      <div className="add-employee-area">
        <div className="main-nav">
          <EmployeeLeftbar />
          <LeftbarMobile />
          <Dashnav />

          <section className="content home">
            <div className="container-fluid">

              {/* Header */}
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:12 }}>
                <div>
                  <h4 style={{ fontWeight:800, margin:0, fontSize:22, color:"#0f172a" }}>
                    <i className="bi bi-telephone-fill me-2" style={{ color:"#4F46E5" }} />
                    Meeting Requests
                  </h4>
                  <p style={{ margin:0, fontSize:13, color:"#64748b", marginTop:4 }}>Call and meeting requests from all clients</p>
                </div>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  <div style={{ padding:"7px 16px", background:"#FEF9C3", border:"1.5px solid #FCD34D", borderRadius:10, fontSize:13, fontWeight:700, color:"#A16207" }}>
                    {pending} Pending
                  </div>
                  <div style={{ padding:"7px 16px", background:"#DCFCE7", border:"1.5px solid #86EFAC", borderRadius:10, fontSize:13, fontWeight:700, color:"#15803D" }}>
                    {confirmed} Confirmed
                  </div>
                </div>
              </div>

              {/* Brand filter */}
              <div style={{ marginBottom:20 }}>
                <select
                  value={selectedBrand}
                  onChange={e => setSelectedBrand(e.target.value)}
                  style={{ padding:"9px 14px", border:"1.5px solid #E2E8F0", borderRadius:8, fontSize:13, color:"#0f172a", outline:"none", fontFamily:"inherit", background:"#fff", minWidth:180 }}
                >
                  <option value="">All Brands</option>
                  {brands.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                </select>
              </div>

              {/* Requests list */}
              {loading ? (
                <div style={{ textAlign:"center", padding:"48px", color:"#94a3b8" }}>
                  <div className="spinner-border spinner-border-sm me-2" />Loading…
                </div>
              ) : requests.length === 0 ? (
                <div style={{ textAlign:"center", padding:"64px 32px", background:"#fff", borderRadius:14, border:"1.5px solid #E2E8F0" }}>
                  <i className="bi bi-telephone" style={{ fontSize:40, color:"#CBD5E1", display:"block", marginBottom:12 }} />
                  <div style={{ fontSize:15, fontWeight:700, color:"#94a3b8" }}>No requests found</div>
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  {requests.map(cr => {
                    const sm  = STATUS_META[cr.status] || STATUS_META.pending;
                    const isMeeting = cr.requestType === "meeting";
                    return (
                      <div key={cr._id} className={`mr-card ${cr.status}`}>
                        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap", marginBottom:6 }}>
                              <span className="mr-badge" style={{ background:sm.bg, color:sm.color }}>{sm.label}</span>
                              <span className="mr-type">
                                {isMeeting ? "Meeting" : "Call"}
                              </span>
                            </div>
                            <div style={{ fontWeight:700, fontSize:14, color:"#0f172a" }}>{cr.clientName}</div>
                            <div style={{ fontSize:12, color:"#4F46E5", fontWeight:600, marginTop:2 }}>{cr.brandName}</div>
                            <div style={{ fontSize:12, color:"#64748b", marginTop:4 }}>
                              <i className="bi bi-calendar2 me-1" />
                              Preferred: {cr.preferredDate} · {cr.preferredTime}
                            </div>
                            {cr.note && <div style={{ fontSize:12, color:"#374151", marginTop:4 }}>{cr.note}</div>}
                            {(cr.status === "approved" || cr.status === "scheduled") && (
                              <div style={{ fontSize:12, color:"#059669", fontWeight:700, marginTop:6 }}>
                                <i className="bi bi-check-circle-fill me-1" />
                                Confirmed: {cr.scheduledDate || cr.preferredDate} · {cr.scheduledTime || cr.preferredTime}
                              </div>
                            )}
                            {cr.meetingLink && (
                              <div style={{ marginTop:6 }}>
                                <a href={cr.meetingLink} target="_blank" rel="noreferrer"
                                  style={{ fontSize:12, color:"#4F46E5", fontWeight:700, textDecoration:"none", display:"inline-flex", alignItems:"center", gap:4 }}>
                                  <i className="bi bi-camera-video-fill" />
                                  Join Meeting
                                </a>
                              </div>
                            )}
                            {cr.adminNote && (
                              <div style={{ fontSize:11.5, color:"#64748b", fontStyle:"italic", marginTop:4 }}>"{cr.adminNote}"</div>
                            )}
                          </div>
                          <div style={{ fontSize:11, color:"#94a3b8", whiteSpace:"nowrap" }}>
                            {fmtDT(cr.createdAt)}
                          </div>
                        </div>

                        {cr.status === "pending" && (
                          <div className="mr-actions">
                            <button className="mr-btn-sched" onClick={() => openModal(cr, "scheduled")}>
                              <i className="bi bi-calendar-check me-1" />
                              {isMeeting ? "Confirm Meeting" : "Schedule Call"}
                            </button>
                            <button className="mr-btn-reschedule" onClick={() => openModal(cr, "rejected")}>
                              <i className="bi bi-arrow-clockwise me-1" />
                              Can't Make It — Reschedule
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          </section>
        </div>
      </div>

      {/* Action modal */}
      {modal && (
        <div className="mr-modal-bg" onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="mr-modal-box">
            <div style={{ fontSize:16, fontWeight:800, color:"#0f172a", marginBottom:4 }}>
              {modal.actionType === "scheduled" ? (modal.cr.requestType === "meeting" ? "Confirm Meeting" : "Schedule Call") : "Can't Make It — Reschedule"}
            </div>
            <div style={{ fontSize:12, color:"#64748b", marginBottom:16 }}>
              {modal.cr.clientName} · Preferred: {modal.cr.preferredDate} at {modal.cr.preferredTime}
            </div>

            {modal.actionType === "scheduled" && (
              <>
                <div className="mr-field">
                  <label>Confirmed Date</label>
                  <input type="date" value={schedDate} onChange={e => setSchedDate(e.target.value)} />
                </div>
                <div className="mr-field">
                  <label>Confirmed Time</label>
                  <input type="time" value={schedTime} onChange={e => setSchedTime(e.target.value)} />
                </div>
                {modal.cr.requestType === "meeting" && (
                  <div className="mr-field">
                    <label>Meeting Link (optional)</label>
                    <input
                      type="url"
                      placeholder="https://meet.google.com/..."
                      value={meetingLinkModal}
                      onChange={e => setMeetingLinkModal(e.target.value)}
                    />
                  </div>
                )}
              </>
            )}

            <div className="mr-field">
              <label>{modal.actionType === "scheduled" ? "Note to client (optional)" : "Message to client (why rescheduling)"}</label>
              <textarea
                rows={3}
                placeholder={modal.actionType === "scheduled"
                  ? "e.g. Google Meet link or call details..."
                  : "e.g. I have a prior commitment — please suggest a new time"}
                value={adminNote}
                onChange={e => setAdminNote(e.target.value)}
              />
            </div>

            <div className="mr-modal-footer">
              <button className="mr-btn-sec" onClick={() => setModal(null)}>Cancel</button>
              <button
                className="mr-btn-pri"
                style={{ background: modal.actionType === "scheduled" ? "#059669" : "#F97316" }}
                onClick={submitAction}
                disabled={saving}
              >
                {saving ? "Saving…" : modal.actionType === "scheduled" ? "Confirm & Notify" : "Send Reschedule Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

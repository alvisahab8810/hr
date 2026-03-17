// pages/employee/overtime.js
import { toast } from "react-toastify";
import Dashnav from "@/components/Dashnav";
import LeftbarMobile from "@/components/employee/LeftbarMobile";
import React, { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import EmployeeLeftbar from "@/components/employee/Leftbar";

// Convert "HH:MM" → "10:30 AM"
function fmtTime(t) {
  if (!t) return "--";
  const [h, m] = t.split(":").map(Number);
  const suf = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${suf}`;
}

// Calculate duration handling overnight (e.g. 22:00 → 06:00)
function calcDuration(start, end) {
  if (!start || !end) return null;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff <= 0) diff += 24 * 60; // overnight
  const h  = Math.floor(diff / 60);
  const mn = diff % 60;
  return { label: h > 0 ? `${h}h ${mn > 0 ? mn + "m" : ""}`.trim() : `${mn}m`, overnight: diff > 12 * 60 || (eh * 60 + em) < (sh * 60 + sm) };
}

// ── Custom AM/PM Time Picker ──────────────────────────────────────────────────
// Returns value as "HH:MM" (24hr) so existing API is unchanged
function TimePicker({ value, onChange, label, required }) {
  // Use LOCAL state so hour/minute/ampm selections persist independently
  // This fixes: selecting hour clears minute (and vice versa)
  const { useState: useLocalState } = React;

  // Parse incoming HH:MM value into parts
  const parseVal = (v) => {
    if (!v) return { h12: "", min: "", ampm: "AM" };
    const [h, m] = v.split(":").map(Number);
    return {
      h12:  String(h % 12 || 12),
      min:  String(m).padStart(2, "0"),
      ampm: h >= 12 ? "PM" : "AM",
    };
  };

  const initial = parseVal(value);
  const [h12,  setH12]  = useLocalState(initial.h12);
  const [min,  setMin]  = useLocalState(initial.min);
  const [ampm, setAmpm] = useLocalState(initial.ampm);

  // Whenever any part changes, emit combined 24hr value upward
  const emit = (newH12, newMin, newAmpm) => {
    // Always update local state first so the select shows the chosen value
    // Only emit to parent if both hour AND minute are selected
    if (newH12 && newMin) {
      let h = Number(newH12) % 12;
      if (newAmpm === "PM") h += 12;
      onChange(`${String(h).padStart(2, "0")}:${newMin}`);
    }
    // If only one part filled, emit empty so parent knows incomplete
    else {
      onChange("");
    }
  };

  const handleH12 = (v) => { setH12(v);   emit(v,   min,  ampm);  };
  const handleMin = (v) => { setMin(v);   emit(h12,  v,    ampm);  };
  const handleAMPM= (v) => { setAmpm(v);  emit(h12,  min,  v);     };

  // Display value in the select — show selected value always
  const displayH  = h12  || "";
  const displayM  = min  || "";

  return (
    <div>
      <span style={{ fontSize:12.5, fontWeight:600, color:"#374151", display:"block", marginBottom:6 }}>
        {label} {required && <span style={{ color:"#DC2626" }}>*</span>}
      </span>
      <div style={{ display:"flex", gap:4, alignItems:"center" }}>
        {/* Hour dropdown */}
        <select
          className="reim-input"
          style={{ flex:1, padding:"9px 8px", textAlign:"center", minWidth:0 }}
          value={displayH}
          onChange={(e) => handleH12(e.target.value)}
        >
          <option value="">HH</option>
          {[1,2,3,4,5,6,7,8,9,10,11,12].map((h) => (
            <option key={h} value={String(h)}>{String(h).padStart(2,"0")}</option>
          ))}
        </select>

        <span style={{ fontWeight:700, color:"#9CA3AF", fontSize:18, flexShrink:0 }}>:</span>

        {/* Minute dropdown */}
        <select
          className="reim-input"
          style={{ flex:1, padding:"9px 8px", textAlign:"center", minWidth:0 }}
          value={displayM}
          onChange={(e) => handleMin(e.target.value)}
        >
          <option value="">MM</option>
          {["00","05","10","15","20","25","30","35","40","45","50","55"].map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        {/* AM / PM toggle */}
        <div style={{
          display:"flex", borderRadius:8, overflow:"hidden",
          border:"1.5px solid #E5E7EB", flexShrink:0,
        }}>
          {["AM","PM"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => handleAMPM(s)}
              style={{
                padding:"9px 12px", border:"none", cursor:"pointer",
                fontSize:12, fontWeight:700, transition:"all .15s",
                background: ampm === s ? "#4F46E5" : "#fff",
                color:      ampm === s ? "#fff"    : "#6B7280",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Preview selected time */}
      {h12 && min && (
        <div style={{ fontSize:11, color:"#4F46E5", fontWeight:600, marginTop:5 }}>
          ⏰ {h12.padStart(2,"0")}:{min} {ampm}
        </div>
      )}
    </div>
  );
}

export default function Overtime() {
  const [showOTModal,  setShowOTModal]  = useState(false);
  const [project,      setProject]      = useState("");
  const [date,         setDate]         = useState("");
  const [otType,       setOtType]       = useState("");
  const [startTime,    setStartTime]    = useState("");
  const [endTime,      setEndTime]      = useState("");
  const [reason,       setReason]       = useState("");
  const [otApprover,   setOtApprover]   = useState("");
  const [tasks,        setTasks]        = useState("");
  const [overtimeList, setOvertimeList] = useState([]);
  const [remarkModal,  setRemarkModal]  = useState(null);
  const [submitting,   setSubmitting]   = useState(false);

  // Holiday state
  const [holidays,       setHolidays]       = useState([]);
  const [holidayWarning, setHolidayWarning] = useState("");

  // ── Fetch OT list ────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchOT() {
      try {
        const token = localStorage.getItem("employeeToken");
        const res   = await fetch("/api/employee/overtime/list", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          console.error("OT list API error:", res.status);
          return;
        }
        const data = await res.json();
        if (data.success) setOvertimeList(data.overtimeRequests);
      } catch (err) {
        console.error("Failed to load OT list:", err);
      }
    }
    fetchOT();
  }, []);

  // ── Fetch public holidays once ────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/payroll/holidays/upcoming")
      .then((r) => r.json())
      .then((d) => { if (d.success) setHolidays(d.data || []); })
      .catch(() => {});
  }, []);

  // ── When date changes, check against holidays ────────────────────────────
  useEffect(() => {
    if (!date) { setHolidayWarning(""); return; }
    const matched = holidays.find((h) => {
      const s = new Date(h.startDate).toISOString().slice(0, 10);
      const e = new Date(h.endDate).toISOString().slice(0, 10);
      return date >= s && date <= e;
    });
    if (matched) {
      setHolidayWarning(`${matched.name} is a public holiday. OT on this date will be treated as Holiday OT.`);
      if (!otType) setOtType("Holiday OT");
    } else {
      setHolidayWarning("");
    }
  }, [date, holidays]);

  // Live duration preview
  const duration = calcDuration(startTime, endTime);

  const resetForm = () => {
    setProject(""); setDate(""); setOtType(""); setStartTime("");
    setEndTime(""); setReason(""); setTasks(""); setOtApprover("");
    setHolidayWarning("");
  };

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleCreateOT = async () => {
    if (!project || !date || !otType || !startTime || !endTime || !reason || !tasks || !otApprover) {
      toast.error("Please fill all required fields");
      return;
    }

    // ✅ FIX: proper overnight validation — never use string comparison
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const diffMins = (eh * 60 + em) - (sh * 60 + sm);
    const actualMins = diffMins === 0 ? 0 : diffMins > 0 ? diffMins : diffMins + 24 * 60;

    if (actualMins === 0) {
      toast.error("Start and end time cannot be the same");
      return;
    }
    if (actualMins > 16 * 60) {
      toast.error("OT duration cannot exceed 16 hours. Please check your times.");
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem("employeeToken");
      const res   = await fetch("/api/employee/overtime/create", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ project, date, otType, startTime, endTime, reason, tasks, otApprover }),
      });
      const data = await res.json();
      if (!data.success) { toast.error(data.message); return; }
      toast.success("Overtime request submitted");
      setOvertimeList((prev) => [data.overtime, ...prev]);
      setShowOTModal(false);
      resetForm();
    } catch { toast.error("Something went wrong"); }
    finally { setSubmitting(false); }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <section className="over-time-area">
      <Head>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
        <style>{`
          /* Holiday warning banner */
          .ot-holiday-banner {
            display: flex; align-items: flex-start; gap: 10px;
            background: #FFFBEB; border: 1.5px solid #FCD34D;
            border-radius: 10px; padding: 12px 14px; margin-bottom: 4px;
            font-size: 13px; color: #92400E; line-height: 1.5;
          }
          .ot-holiday-banner i { font-size: 16px; flex-shrink: 0; margin-top: 1px; color: #D97706; }

          /* AM/PM hint below time input */
          .ot-time-hint {
            font-size: 11px; color: #6B7280; margin-top: 4px;
            display: flex; align-items: center; gap: 4px;
          }
          .ot-time-hint .ampm { font-weight: 700; color: #4F46E5; }
          .ot-overnight-badge {
            font-size: 10px; background: #EEF2FF; color: #4F46E5;
            border-radius: 5px; padding: 1px 6px; font-weight: 700;
          }

          /* Duration preview */
          .ot-duration-row {
            display: flex; align-items: center; gap: 10px;
            background: #EEF2FF; border-radius: 10px;
            padding: 9px 14px; font-size: 13px; color: #4F46E5; font-weight: 600;
          }
          .ot-duration-row i { font-size: 14px; }
        `}</style>
      </Head>

      <div className="add-employee-area">
        <div className="main-nav">
          <EmployeeLeftbar />
          <LeftbarMobile />
          <Dashnav />

          <section className="content home">
            <div className="breadcrum-bx">
              <ul className="breadcrumb bg-white">
                <li className="breadcrumb-item">
                  <Link href="/dashboard/dashboard">
                    <img src="/icons/home.svg" alt="" /> Overtime
                  </Link>
                </li>
              </ul>
            </div>

            <div className="block-header add-emp-area">
              <div className="reim-page-head">
                <h2>Overtime</h2>
                <p>Request overtime approval</p>
              </div>

              <div className="reim-section">
                <div className="reim-section-head">
                  <div>
                    <h4>My Overtime Requests</h4>
                    <p>View your overtime request history</p>
                  </div>
                  <button className="reim-submit-btn" onClick={() => setShowOTModal(true)}>
                    <img src="/icons/employee/plus.svg" alt="" /> Submit Overtime
                  </button>
                </div>

                <table className="reim-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Project</th>
                      <th>OT Type</th>
                      <th>Time</th>
                      <th>Status</th>
                      <th>OT Access Given By</th>
                      <th>Approved By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overtimeList.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: "center" }}>No overtime requests found</td>
                      </tr>
                    ) : (
                      overtimeList.map((ot) => {
                        const dur = calcDuration(ot.startTime, ot.endTime);
                        return (
                          <tr key={ot._id}>
                            <td>{new Date(ot.date).toLocaleDateString("en-GB")}</td>
                            <td>{ot.project}</td>
                            <td><span className="tag blue">{ot.otType}</span></td>
                            <td>
                              {/* ✅ Shows AM/PM in table too */}
                              {fmtTime(ot.startTime)} – {fmtTime(ot.endTime)}
                              {dur?.overnight && (
                                <span style={{ fontSize: 10, background: "#EEF2FF", color: "#4F46E5", borderRadius: 4, padding: "1px 5px", marginLeft: 4, fontWeight: 700 }}>
                                  +1 day
                                </span>
                              )}
                              <br />
                              <small className="text-muted">{dur?.label || "--"}</small>
                            </td>
                            <td>
                              {ot.status === "Rejected" ? (
                                <button className="reim-view-remark-btn" onClick={() => setRemarkModal(ot)}>
                                  View Remark
                                </button>
                              ) : (
                                <span className={`tag ${ot.status === "Approved" ? "green" : ot.status === "Pending" ? "blue" : "red"}`}>
                                  {ot.status}
                                </span>
                              )}
                            </td>
                            <td><span className="tag blue">{ot.otApprover || "-"}</span></td>
                            <td>{ot.approvedBy?.name || "Admin"}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>

        {/* ═══════════════════════════════════════════
            OT MODAL — uses your existing reim-modal styles
        ═══════════════════════════════════════════ */}
        {showOTModal && (
          <div className="reim-modal-root">
            <div className="reim-modal-backdrop" onClick={() => { setShowOTModal(false); resetForm(); }} />
            <div className="reim-modal-card">
              <div className="reim-modal-header">
                <div className="reim-modal-title"><span>New OT Request</span></div>
                <button type="button" className="reim-modal-close" onClick={() => { setShowOTModal(false); resetForm(); }}>✕</button>
              </div>

              <form onSubmit={(e) => { e.preventDefault(); handleCreateOT(); }}>
                <div className="reim-modal-body">

                  {/* ✅ Holiday warning banner */}
                  {holidayWarning && (
                    <div className="ot-holiday-banner">
                      <i className="bi bi-exclamation-triangle-fill"></i>
                      <span><strong>Public Holiday:</strong> {holidayWarning}</span>
                    </div>
                  )}

                  {/* Brand */}
                  <div className="reim-form-group">
                    <label>Brand Name *</label>
                    <input type="text" className="reim-input" placeholder="Enter Brand name"
                      value={project} onChange={(e) => setProject(e.target.value)} required />
                  </div>

                  {/* Date + OT Type */}
                  <div className="reim-form-row date-amount-row">
                    <div className="reim-form-group">
                      <label>Date *</label>
                      <input type="date" className="reim-input" value={date}
                        onChange={(e) => setDate(e.target.value)} required />
                    </div>
                    <div className="reim-form-group">
                      <label>OT Type *</label>
                      <select className="reim-input" value={otType} onChange={(e) => setOtType(e.target.value)} required>
                        <option value="">Select type</option>
                        <option>Weekday OT</option>
                        <option>Weekend OT</option>
                        <option>Holiday OT</option>
                        <option>Client Deadline</option>
                        <option>Campaign Launch</option>
                        <option>Design Revisions</option>
                        <option>Content Shoot / Edit</option>
                        <option>Production Deployment</option>
                        <option>Bug Fix / Hotfix</option>
                        <option>Client Escalation</option>
                        <option>Emergency Fix</option>
                        <option>Late Night Work</option>
                        <option>Early Morning Work</option>
                      </select>
                    </div>
                  </div>

                  {/* Start + End Time — Custom AM/PM pickers */}
                  <div className="reim-form-row date-amount-row">
                    <TimePicker
                      label="Start Time"
                      required
                      value={startTime}
                      onChange={setStartTime}
                    />
                    <div>
                      <TimePicker
                        label="End Time"
                        required
                        value={endTime}
                        onChange={setEndTime}
                      />
                      {duration?.overnight && (
                        <div style={{ marginTop:4, display:"flex", alignItems:"center", gap:5, fontSize:11 }}>
                          <span className="ot-overnight-badge">+1 day (overnight)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ✅ Live duration preview */}
                  {duration && (
                    <div className="ot-duration-row">
                      <i className="bi bi-stopwatch-fill"></i>
                      <span>Duration: <strong>{duration.label}</strong></span>
                      {duration.overnight && (
                        <span style={{ fontSize: 11, background: "#C7D2FE", color: "#3730A3", borderRadius: 6, padding: "2px 8px", marginLeft: 4 }}>
                          Overnight shift
                        </span>
                      )}
                    </div>
                  )}

                  {/* Reason */}
                  <div className="reim-form-group">
                    <label>Reason *</label>
                    <textarea className="reim-input" rows="3" placeholder="Reason for OT request"
                      value={reason} onChange={(e) => setReason(e.target.value)} required />
                  </div>

                  {/* Tasks + Approver */}
                  <div className="reim-form-row date-amount-row">
                    <div className="reim-form-group">
                      <label>Tasks *</label>
                      <input type="text" className="reim-input" placeholder="Type task ID or name"
                        value={tasks} onChange={(e) => setTasks(e.target.value)} required />
                    </div>
                    <div className="reim-form-group">
                      <label>OT Access Given By *</label>
                      <select className="reim-input" value={otApprover} onChange={(e) => setOtApprover(e.target.value)} required>
                        <option value="">Select person</option>
                        <option value="Ivan Sinha">Ivan Sinha</option>
                        <option value="Ishan Sinha">Ishan Sinha</option>
                        <option value="Riya Tiwari">Riya Tiwari</option>
                      </select>
                    </div>
                  </div>

                </div>

                <div className="reim-modal-footer">
                  <button type="button" className="reim-cancel-btn" onClick={() => { setShowOTModal(false); resetForm(); }}>
                    Cancel
                  </button>
                  <button type="submit" className="reim-create-btn" disabled={submitting}>
                    {submitting ? "Submitting…" : "Create Request"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Remark modal — unchanged */}
      {remarkModal && (
        <div className="leave-modal-root">
          <div className="leave-modal-backdrop" onClick={() => setRemarkModal(null)} />
          <div className="leave-modal-card">
            <div className="leave-modal-header">
              <span>Rejection Remark</span>
              <button className="leave-modal-close" onClick={() => setRemarkModal(null)}>✕</button>
            </div>
            <div className="leave-modal-body">
              <p>{remarkModal.adminRemark || "No remark provided"}</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}


// import { toast } from "react-toastify";
// import Dashnav from "@/components/Dashnav";
// import LeftbarMobile from "@/components/employee/LeftbarMobile";
// import React, { useState, useEffect } from "react";
// import Head from "next/head";
// import Link from "next/link";
// import EmployeeLeftbar from "@/components/employee/Leftbar";

// export default function Overtime() {
//   const [showOTModal, setShowOTModal] = useState(false);
//   // Form states
//   const [project, setProject] = useState("");
//   const [date, setDate] = useState("");
//   const [otType, setOtType] = useState("");
//   const [startTime, setStartTime] = useState("");
//   const [endTime, setEndTime] = useState("");
//   const [reason, setReason] = useState("");
//   const [otApprover, setOtApprover] = useState("");

//   const [overtimeList, setOvertimeList] = useState([]);
//   const [tasks, setTasks] = useState("");
//   const [remarkModal, setRemarkModal] = useState(null);

//   const formatDate = (dateStr) => {
//     return new Date(dateStr).toLocaleDateString("en-GB");
//   };

//   const formatTime = (time) => {
//     const [h, m] = time.split(":");
//     const hour = Number(h);
//     const suffix = hour >= 12 ? "PM" : "AM";
//     const formattedHour = hour % 12 || 12;
//     return `${formattedHour}:${m} ${suffix}`;
//   };

//   const calculateHours = (start, end) => {
//     const [sh, sm] = start.split(":").map(Number);
//     const [eh, em] = end.split(":").map(Number);

//     const startMinutes = sh * 60 + sm;
//     const endMinutes = eh * 60 + em;

//     const diff = endMinutes - startMinutes;
//     const hours = diff / 60;

//     return `${hours}h`;
//   };

//   useEffect(() => {
//     async function fetchOT() {
//       const token = localStorage.getItem("employeeToken");
//       const res = await fetch("/api/employee/overtime/list", {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       const data = await res.json();
//       if (data.success) setOvertimeList(data.overtimeRequests);
//     }
//     fetchOT();
//   }, []);

//   const handleCreateOT = async () => {
//     if (
//       !project ||
//       !date ||
//       !otType ||
//       !startTime ||
//       !endTime ||
//       !reason ||
//       !tasks ||
//       !otApprover
//     ) {
//       toast.error("Please fill all required fields");
//       return;
//     }

//     if (startTime >= endTime) {
//       toast.error("End time must be after start time");
//       return;
//     }

//     try {
//       const token = localStorage.getItem("employeeToken");

//       const res = await fetch("/api/employee/overtime/create", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify({
//           project,
//           date,
//           otType,
//           startTime,
//           endTime,
//           reason,
//           tasks,
//            otApprover, // ✅ THIS WAS MISSING
//         }),
//       });

//       const data = await res.json();
//       if (!data.success) {
//         toast.error(data.message);
//         return;
//       }

//       toast.success("Overtime request submitted");
//       setOvertimeList((prev) => [data.overtime, ...prev]);
//       setShowOTModal(false);
//     } catch (err) {
//       toast.error("Something went wrong");
//     }
//   };

//   return (
//     <section className="over-time-area">
//       <Head>
//         <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
//         <link rel="stylesheet" href="/asets/css/main.css" />
//         <link rel="stylesheet" href="/asets/css/admin.css" />
//         <link
//           rel="stylesheet"
//           href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css"
//         />
//       </Head>

//       <div className="add-employee-area">
//         <div className="main-nav">
//           <EmployeeLeftbar />
//           <LeftbarMobile />
//           <Dashnav />

//           <section className="content home">
//             {/* Breadcrumb */}
//             <div className="breadcrum-bx">
//               <ul className="breadcrumb bg-white">
//                 <li className="breadcrumb-item">
//                   <Link href="/dashboard/dashboard">
//                     <img src="/icons/home.svg" /> Overtime
//                   </Link>
//                 </li>
//               </ul>
//             </div>

//             {/* Page Header */}
//             <div className="block-header add-emp-area">
//               <div className="reim-page-head">
//                 <h2>Overtime</h2>
//                 <p>Request overtime approval</p>
//               </div>

//               {/* Table Section */}
//               <div className="reim-section">
//                 <div className="reim-section-head">
//                   <div>
//                     <h4>My Overtime Requests</h4>
//                     <p>View your overtime request history</p>
//                   </div>

//                   <button
//                     className="reim-submit-btn"
//                     onClick={() => setShowOTModal(true)}
//                   >
//                     <img src="/icons/employee/plus.svg" /> Submit Overtime
//                   </button>
//                 </div>

//                 <table className="reim-table">
//                   <thead>
//                     <tr>
//                       <th>Date</th>
//                       <th>Project</th>
//                       <th>OT Type</th>
//                       <th>Time</th>
//                       <th>Status</th>
//                       <th>OT Access Given By</th>

//                       <th>Approved By</th>
                      
//                     </tr>
//                   </thead>

//                   <tbody>
//                     {overtimeList.length === 0 ? (
//                       <tr>
//                         <td colSpan="6" style={{ textAlign: "center" }}>
//                           No overtime requests found
//                         </td>
//                       </tr>
//                     ) : (
//                       overtimeList.map((ot) => (
//                         <tr key={ot._id}>
//                           {/* Date */}
//                           <td>{formatDate(ot.date)}</td>

//                           {/* Project */}
//                           <td>{ot.project}</td>

//                           {/* OT Type */}
//                           <td>
//                             <span className="tag blue">{ot.otType}</span>
//                           </td>

//                           {/* Time */}
//                           <td>
//                             {formatTime(ot.startTime)} –{" "}
//                             {formatTime(ot.endTime)}
//                             <br />
//                             <small className="text-muted">
//                               {calculateHours(ot.startTime, ot.endTime)}
//                             </small>
//                           </td>

//                           {/* Status */}

//                           <td>
//                             {ot.status === "Rejected" ? (
//                               <button
//                                 className="reim-view-remark-btn"
//                                 onClick={() => setRemarkModal(ot)}
//                               >
//                                 View Remark
//                               </button>
//                             ) : (
//                               <span
//                                 className={`tag ${
//                                   ot.status === "Approved"
//                                     ? "green"
//                                     : ot.status === "Pending"
//                                       ? "blue"
//                                       : "red"
//                                 }`}
//                               >
//                                 {ot.status}
//                               </span>
//                             )}
//                           </td>

//                           <td>
//   <span className="tag blue">
//     {ot.otApprover || "-"}
//   </span>
// </td>

//                           {/* Approved By */}
//                           <td>{ot.approvedBy?.name || "Admin"}</td>
//                         </tr>
//                       ))
//                     )}
//                   </tbody>
//                 </table>
//               </div>
//             </div>
//           </section>
//         </div>

//         {/* ================= OT MODAL ================= */}
//         {showOTModal && (
//           <div className="reim-modal-root">
//             <div
//               className="reim-modal-backdrop"
//               onClick={() => setShowOTModal(false)}
//             />

//             <div className="reim-modal-card">
//               {/* Header */}
//               <div className="reim-modal-header">
//                 <div className="reim-modal-title">
//                   <span>New OT Request</span>
//                 </div>

//                 <button
//                   type="button"
//                   className="reim-modal-close"
//                   onClick={() => setShowOTModal(false)}
//                 >
//                   ✕
//                 </button>
//               </div>

//               {/* ================= FORM START ================= */}
//               <form
//                 onSubmit={(e) => {
//                   e.preventDefault();
//                   handleCreateOT();
//                 }}
//               >
//                 {/* Body */}
//                 <div className="reim-modal-body">
//                   {/* Project */}
//                   <div className="reim-form-group">
//                     <label>Brand Name *</label>
//                     <input
//                       type="text"
//                       className="reim-input"
//                       placeholder="Enter Brand name"
//                       value={project}
//                       onChange={(e) => setProject(e.target.value)}
//                       required 
//                     />
//                   </div>

//                   {/* Date + OT Type */}
//                   <div className="reim-form-row date-amount-row">
//                     <div className="reim-form-group">
//                       <label>Date *</label>
//                       <input
//                         type="date"
//                         className="reim-input"
//                         value={date}
//                         onChange={(e) => setDate(e.target.value)}
//                         required
//                       />
//                     </div>

//                     <div className="reim-form-group">
//                       <label>OT Type *</label>
//                       <select
//                         className="reim-input"
//                         value={otType}
//                         onChange={(e) => setOtType(e.target.value)}
//                         required
//                       >
//                         <option value="">Select type</option>

//                         <option>Weekday OT</option>
//                         <option>Weekend OT</option>
//                         <option>Holiday OT</option>

//                         <option>Client Deadline</option>
//                         <option>Campaign Launch</option>
//                         <option>Design Revisions</option>
//                         <option>Content Shoot / Edit</option>
//                         <option>Production Deployment</option>

//                         <option>Bug Fix / Hotfix</option>
//                         <option>Client Escalation</option>
//                         <option>Emergency Fix</option>

//                         <option>Late Night Work</option>
//                         <option>Early Morning Work</option>
//                       </select>
//                     </div>
//                   </div>

//                   {/* Start + End Time */}
//                   <div className="reim-form-row date-amount-row">
//                     <div className="reim-form-group">
//                       <label>Start Time *</label>
//                       <input
//                         type="time"
//                         className="reim-input"
//                         value={startTime}
//                         onChange={(e) => setStartTime(e.target.value)}
//                         required
//                       />
//                     </div>

//                     <div className="reim-form-group">
//                       <label>End Time *</label>
//                       <input
//                         type="time"
//                         className="reim-input"
//                         value={endTime}
//                         onChange={(e) => setEndTime(e.target.value)}
//                         required
//                       />
//                     </div>
//                   </div>

//                   {/* Reason */}
//                   <div className="reim-form-group">
//                     <label>Reason *</label>
//                     <textarea
//                       className="reim-input"
//                       rows="3"
//                       placeholder="Reason for OT request"
//                       value={reason}
//                       onChange={(e) => setReason(e.target.value)}
//                       required
//                     />
//                   </div>

//                   <div className="reim-form-row date-amount-row">
                
                  
//                   {/* Tasks */}
//                   <div className="reim-form-group">
//                     <label>Tasks *</label>
//                     <input
//                       type="text"
//                       className="reim-input"
//                       placeholder="Type task ID or name"
//                       value={tasks}
//                       onChange={(e) => setTasks(e.target.value)}
//                       required
//                     />
//                   </div>


//                   {/* OT Approved By */}
//                       <div className="reim-form-group">
//                         <label>OT Access Given By *</label>
//                         <select
//                           className="reim-input"
//                           value={otApprover}
//                           onChange={(e) => setOtApprover(e.target.value)}
//                           required
//                         >
//                           <option value="">Select person</option>
//                           <option value="Ivan Sinha">Ivan Sinha</option>
//                           <option value="Ishan Sinha">Ishan Sinha</option>
//                           <option value="Riya Tiwari">Riya Tiwari</option>
//                         </select>
//                       </div>

//                       </div>


//                 </div>

//                 {/* Footer */}
//                 <div className="reim-modal-footer">
//                   <button
//                     type="button"
//                     className="reim-cancel-btn"
//                     onClick={() => setShowOTModal(false)}
//                   >
//                     Cancel
//                   </button>

//                   <button type="submit" className="reim-create-btn">
//                     Create Request
//                   </button>
//                 </div>
//               </form>
//               {/* ================= FORM END ================= */}
//             </div>
//           </div>
//         )}
//       </div>
//       {remarkModal && (
//         <div className="leave-modal-root">
//           <div
//             className="leave-modal-backdrop"
//             onClick={() => setRemarkModal(null)}
//           />

//           <div className="leave-modal-card">
//             <div className="leave-modal-header">
//               <span>Rejection Remark</span>
//               <button
//                 className="leave-modal-close"
//                 onClick={() => setRemarkModal(null)}
//               >
//                 ✕
//               </button>
//             </div>

//             <div className="leave-modal-body">
//               <p>{remarkModal.adminRemark || "No remark provided"}</p>
//             </div>
//           </div>
//         </div>
//       )}
//     </section>
//   );
// }

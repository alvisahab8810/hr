// components/employee/TimeTracker.js
import { toast } from "react-toastify";
import React, { useEffect, useState, useRef, useCallback, lazy, Suspense } from "react";
import dynamic from "next/dynamic";

// Face recognition modal — client-only, no SSR
const FaceRecognitionModal = dynamic(
  () => import("./FaceRecognitionModal"),
  { ssr: false }
);

// ── Helpers ──────────────────────────────────────────────────────────────────
function msToClock(ms) {
  if (!ms || ms < 0) return "00:00:00";
  const s = Math.floor(ms / 1000) % 60;
  const m = Math.floor(ms / 60000) % 60;
  const h = Math.floor(ms / 3600000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function msToMinSec(ms) {
  if (!ms || ms < 0) return "0:00";
  const s = Math.floor(ms / 1000) % 60;
  const m = Math.floor(ms / 60000);
  return `${m}:${String(s).padStart(2, "0")}`;
}

const LUNCH_ALLOW_MS    = 45 * 60 * 1000; // 45 min allowed
const LUNCH_WARN_MS     = 35 * 60 * 1000; // show "End Lunch" prominently at 35 min
const LUNCH_HOUR        = 13;
const LUNCH_MIN         = 30;

// ── Component ─────────────────────────────────────────────────────────────────
export default function TimeTracker() {
  const [attendance,    setAttendance]    = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [isClockedIn,   setIsClockedIn]   = useState(false);
  const [isOnBreak,     setIsOnBreak]     = useState(false);
  const [timerMs,       setTimerMs]       = useState(0);
  const [breakMs,       setBreakMs]       = useState(0);
  const [breakStart,    setBreakStart]    = useState(null);

  // Face modal
  const [showFace,      setShowFace]      = useState(false);
  const [faceMode,      setFaceMode]      = useState("verify"); // "verify" | "enroll"
  const [faceAction,    setFaceAction]    = useState(""); // "clock-in" | "clock-out" | "enroll"
  const [faceActionLabel, setFaceActionLabel] = useState("");
  const [storedDesc,    setStoredDesc]    = useState(null);
  const [faceEnrolled,  setFaceEnrolled]  = useState(false);

  // Auto lunch
  const [autoLunchFired,  setAutoLunchFired]  = useState(false);
  const [showLunchNotice, setShowLunchNotice] = useState(false);

  // Refs
  const workIntervalRef  = useRef(null);
  const breakIntervalRef = useRef(null);
  const lunchCheckRef    = useRef(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("employeeToken") : null;

  // ── API helpers ─────────────────────────────────────────────────────────────
  const apiPost = useCallback(async (url, body) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    return res.json();
  }, [token]);

  const apiGet = useCallback(async (url) => {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    return res.json();
  }, [token]);

  // ── Fetch today's summary ──────────────────────────────────────────────────
  const fetchSummary = useCallback(async () => {
    try {
      const data = await apiGet("/api/employee/time/summary");
      if (data.success && data.data?.attendance) {
        const att = data.data.attendance;
        setAttendance(att);
        const onBreak    = att.status === "on_break";
        const clockedIn  = !att.endTime && !!att.startTime;
        setIsOnBreak(onBreak);
        setIsClockedIn(clockedIn);
        setTimerMs(data.data.workedMs || 0);
        if (onBreak) {
          const last = att.breaks?.slice(-1)[0];
          if (last?.start && !last.end) setBreakStart(new Date(last.start));
        }
      } else {
        setAttendance(null); setIsOnBreak(false); setIsClockedIn(false); setTimerMs(0);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [apiGet]);

  // ── Fetch face descriptor ──────────────────────────────────────────────────
  const fetchFaceStatus = useCallback(async () => {
    try {
      const data = await apiGet("/api/employee/face/get");
      if (data.success) {
        setFaceEnrolled(data.enrolled);
        setStoredDesc(data.descriptor);
      }
    } catch { /* ignore */ }
  }, [apiGet]);

  // ── Boot ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchSummary();
    fetchFaceStatus();
    return () => {
      clearInterval(workIntervalRef.current);
      clearInterval(breakIntervalRef.current);
      clearInterval(lunchCheckRef.current);
    };
  }, []);

  // ── Work timer ─────────────────────────────────────────────────────────────
  useEffect(() => {
    clearInterval(workIntervalRef.current);
    if (isClockedIn && !isOnBreak) {
      workIntervalRef.current = setInterval(() => setTimerMs(p => p + 1000), 1000);
    }
    return () => clearInterval(workIntervalRef.current);
  }, [isClockedIn, isOnBreak]);

  // ── Break timer ────────────────────────────────────────────────────────────
  useEffect(() => {
    clearInterval(breakIntervalRef.current);
    if (isOnBreak && breakStart) {
      breakIntervalRef.current = setInterval(() =>
        setBreakMs(Date.now() - breakStart.getTime()), 1000);
    } else {
      setBreakMs(0);
    }
    return () => clearInterval(breakIntervalRef.current);
  }, [isOnBreak, breakStart]);

  // ── Auto lunch at 13:30 ────────────────────────────────────────────────────
  useEffect(() => {
    lunchCheckRef.current = setInterval(async () => {
      if (!isClockedIn || isOnBreak || autoLunchFired) return;
      const now = new Date();
      if (now.getHours() === LUNCH_HOUR && now.getMinutes() === LUNCH_MIN) {
        setAutoLunchFired(true);
        setShowLunchNotice(true);
        // Auto start lunch
        try {
          const r = await apiPost("/api/employee/time/break", { action: "start", type: "lunch" });
          if (r.success) {
            setAttendance(r.attendance);
            setIsOnBreak(true);
            const last = r.attendance.breaks?.slice(-1)[0];
            if (last?.start) setBreakStart(new Date(last.start));
            toast.info("Lunch time! Break started automatically (01:30 PM)", { autoClose: 8000 });
            new Audio("/sounds/lunch-warning.mp3").play().catch(() => {});
          }
        } catch { /* ignore */ }
        // Reset fired flag next day
        setTimeout(() => setAutoLunchFired(false), 86400000);
      }
    }, 15000); // check every 15 s
    return () => clearInterval(lunchCheckRef.current);
  }, [isClockedIn, isOnBreak, autoLunchFired, apiPost]);

  // ── Open face scan ─────────────────────────────────────────────────────────
  function openFaceScan(clockAction) {
    if (!faceEnrolled) {
      // No face enrolled — ask to enroll first
      toast.warning("Please set up your Face ID first", { autoClose: 4000 });
      setFaceMode("enroll");
      setFaceAction("enroll");
      setFaceActionLabel("Setup Face ID");
      setShowFace(true);
      return;
    }
    const label = clockAction === "clock-in" ? "Clock In"
      : clockAction === "clock-out" ? "Clock Out"
      : clockAction === "lunch-end" ? "End Lunch"
      : clockAction;
    setFaceMode("verify");
    setFaceAction(clockAction);
    setFaceActionLabel(label);
    setShowFace(true);
  }

  function openEnroll() {
    setFaceMode("enroll");
    setFaceAction("enroll");
    setFaceActionLabel("Setup Face ID");
    setShowFace(true);
  }

  // ── Face modal success ─────────────────────────────────────────────────────
  async function handleFaceSuccess(descriptorOrVoid) {
    setShowFace(false);

    if (faceAction === "enroll") {
      // Save descriptor to DB
      if (!descriptorOrVoid) return;
      try {
        const r = await apiPost("/api/employee/face/enroll", { descriptor: descriptorOrVoid });
        if (r.success) {
          setFaceEnrolled(true);
          setStoredDesc(descriptorOrVoid);
          toast.success("Face ID set up successfully! You can now use face scan to clock in/out.");
        } else {
          toast.error(r.message || "Failed to save Face ID");
        }
      } catch { toast.error("Failed to save Face ID"); }
      return;
    }

    // Verified — execute the action
    if (faceAction === "clock-in")    await execClockIn();
    if (faceAction === "clock-out")   await execClockOut();
    if (faceAction === "lunch-start") await execLunchStart();
    if (faceAction === "lunch-end")   await execLunchEnd();
  }

  // ── Clock actions ──────────────────────────────────────────────────────────
  async function execClockIn() {
    const r = await apiPost("/api/employee/time/clock", { action: "clock-in" });
    if (!r.success) {
      if (r.code === "ATTENDANCE_CLOSED") {
        toast.info("Attendance already completed for today.");
      } else if (r.code === "ALREADY_CLOCKED_IN") {
        toast.warning("You are already clocked in.");
      } else {
        toast.error(r.message || "Unable to clock in");
      }
      return;
    }
    setAttendance(r.attendance);
    setIsClockedIn(true);
    setTimerMs(0);
    toast.success(r.isLate ? "Clocked in (marked late)" : "Clocked in successfully");
  }

  async function execClockOut() {
    const r = await apiPost("/api/employee/time/clock", { action: "clock-out" });
    if (!r.success) {
      if (r.code === "ON_BREAK") {
        toast.warning("Please end your lunch break first before clocking out.");
      } else {
        toast.error(r.message || "Failed to clock out");
      }
      return;
    }
    setAttendance(r.attendance);
    setIsClockedIn(false);
    setIsOnBreak(false);
    setBreakMs(0);
    setBreakStart(null);
    if (r.deduction > 0) toast.warning(`Lunch exceeded. Deduction: ₹${r.deduction}`);
    else toast.success("Clocked out successfully");
  }

  async function execLunchStart() {
    const r = await apiPost("/api/employee/time/break", { action: "start", type: "lunch" });
    if (!r.success) { toast.error(r.message || "Failed to start lunch"); return; }
    setAttendance(r.attendance);
    setIsOnBreak(true);
    const last = r.attendance.breaks?.slice(-1)[0];
    if (last?.start) setBreakStart(new Date(last.start));
    toast.success("Lunch break started");
  }

  async function execLunchEnd() {
    const r = await apiPost("/api/employee/time/break", { action: "end" });
    if (!r.success) { toast.error(r.message || "Failed to end lunch"); return; }
    setAttendance(r.attendance);
    setIsOnBreak(false);
    setBreakMs(0);
    setBreakStart(null);
    if (r.deduction > 0) toast.warning(`Lunch exceeded by limit. Deduction: ₹${r.deduction}`);
    else toast.success("Lunch break ended");
  }

  // ── UI states ──────────────────────────────────────────────────────────────
  const clockedOut   = !isClockedIn;
  const lunchOverdue = isOnBreak && breakMs > LUNCH_ALLOW_MS;
  const lunchWarn    = isOnBreak && breakMs > LUNCH_WARN_MS;
  const lunchLeft    = isOnBreak ? Math.max(0, LUNCH_ALLOW_MS - breakMs) : 0;

  const statusLabel = attendance?.endTime ? "Clocked Out"
    : isOnBreak   ? "On Lunch Break"
    : isClockedIn ? "Working"
    : "Not Clocked In";

  const statusColor = attendance?.endTime ? "#6B7280"
    : isOnBreak   ? "#D97706"
    : isClockedIn ? "#10B981"
    : "#EF4444";

  const statusBg = attendance?.endTime ? "#F3F4F6"
    : isOnBreak   ? "#FEF3C7"
    : isClockedIn ? "#DCFCE7"
    : "#FEE2E2";

  if (loading) return (
    <div className="tt-loading">
      <div className="spinner-border spinner-border-sm text-primary" role="status" />
      <span>Loading…</span>
    </div>
  );

  // ── button helpers ────────────────────────────────────────────────────────
  const BtnClockIn = () => (
    <button className="tt-btn tt-btn-green" onClick={() => openFaceScan("clock-in")}>
      <i className="bi bi-camera-fill" /> Clock In
    </button>
  );
  const BtnClockOut = () => (
    isClockedIn && isOnBreak ? (
      <button className="tt-btn tt-btn-disabled" disabled title="End lunch first">
        <i className="bi bi-lock-fill" /> Clock Out
      </button>
    ) : (
      <button className="tt-btn tt-btn-red" onClick={() => openFaceScan("clock-out")}>
        <i className="bi bi-camera-fill" /> Clock Out
      </button>
    )
  );
  const BtnLunchStart = () => (
    <button className="tt-btn tt-btn-amber" onClick={() => openFaceScan("lunch-start")}>
      <i className="bi bi-cup-hot-fill" /> Lunch
    </button>
  );
  const BtnLunchEnd = () => (
    <button
      className={`tt-btn ${lunchWarn ? "tt-btn-red" : "tt-btn-green"}`}
      onClick={() => openFaceScan("lunch-end")}
      style={{ animation: lunchOverdue ? "lunchBlink 1s ease-in-out infinite" : "none" }}
    >
      <i className={`bi ${lunchWarn ? "bi-exclamation-triangle-fill" : "bi-check-circle-fill"}`} />
      {lunchWarn ? "End Lunch!" : "End Lunch"}
      {lunchWarn && !lunchOverdue && (
        <span className="tt-pill">{msToMinSec(lunchLeft)}</span>
      )}
    </button>
  );
  const BtnFaceSetup = () => faceEnrolled ? null : (
    <button className="tt-btn tt-btn-outline" onClick={openEnroll}>
      <i className="bi bi-shield-plus" /> Setup Face ID
    </button>
  );

  return (
    <>
      {/* ═══════════════════════════════════════════
          TRACKER CARD
          Desktop: inline flex in breadcrumb
          Mobile:  full-width card, stacked layout
      ═══════════════════════════════════════════ */}
      <div className="tt-card">

        {/* Row 1: Status + Timers */}
        <div className="tt-row-top">
          {/* Status badge */}
          <span className="tt-status" style={{ background:statusBg, color:statusColor }}>
            <span className="tt-dot" style={{ background:statusColor }} />
            {statusLabel}
          </span>

          {/* Timers */}
          <div className="tt-timers">
            <div className="tt-timer-block">
              <span className="tt-timer-label">Work</span>
              <span className="tt-timer-value">{msToClock(timerMs)}</span>
            </div>
            {isOnBreak && (
              <div className="tt-timer-block">
                <span className="tt-timer-label" style={{ color: lunchOverdue ? "#DC2626" : "#D97706" }}>
                  {lunchOverdue ? "⚠ Overtime" : "Lunch"}
                </span>
                <span className="tt-timer-value" style={{
                  color: lunchOverdue ? "#DC2626" : "#D97706",
                  animation: lunchOverdue ? "lunchBlink 1s ease-in-out infinite" : "none",
                }}>
                  {msToClock(breakMs)}
                </span>
              </div>
            )}
          </div>

          {/* Check-in time — desktop only */}
          {attendance?.startTime && (
            <span className="tt-checkin-time">
              <i className="bi bi-box-arrow-in-right" />
              {new Date(attendance.startTime).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}
            </span>
          )}
        </div>

        {/* Row 2: Action buttons */}
        <div className="tt-row-btns">
          {!isClockedIn && !attendance?.endTime && <BtnClockIn />}
          {isClockedIn && <BtnClockOut />}
          {isClockedIn && !isOnBreak && <BtnLunchStart />}
          {isOnBreak && <BtnLunchEnd />}
          <BtnFaceSetup />
        </div>

        {/* Re-enroll link — only shown when already enrolled */}
        {faceEnrolled && (
          <div style={{ textAlign:"right", marginTop:4 }}>
            <button
              onClick={openEnroll}
              style={{
                background:"none", border:"none", padding:0,
                fontSize:11, color:"#9CA3AF", cursor:"pointer",
                display:"inline-flex", alignItems:"center", gap:4,
              }}
            >
              <i className="bi bi-shield-check" style={{ color:"#10B981" }} />
              Face ID active · <span style={{ textDecoration:"underline" }}>Update</span>
            </button>
          </div>
        )}

        {/* Mobile check-in time */}
        {attendance?.startTime && (
          <div className="tt-checkin-mobile">
            <i className="bi bi-box-arrow-in-right" style={{ marginRight:4 }} />
            Checked in at {new Date(attendance.startTime).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}
          </div>
        )}
      </div>

      {/* ── Lunch auto-started notice ── */}
      {showLunchNotice && (
        <div style={{
          position:"fixed", inset:0, background:"rgba(0,0,0,0.5)",
          display:"flex", alignItems:"center", justifyContent:"center",
          zIndex:9990, padding:16,
        }}>
          <div style={{
            background:"#fff", borderRadius:20, padding:"28px 32px",
            maxWidth:360, width:"100%", textAlign:"center",
            boxShadow:"0 16px 48px rgba(0,0,0,0.25)",
          }}>
            <div style={{
              width:64, height:64, borderRadius:"50%",
              background:"#FEF3C7", display:"flex", alignItems:"center",
              justifyContent:"center", margin:"0 auto 16px", fontSize:30,
            }}>🍽️</div>
            <h5 style={{ fontWeight:800, color:"#111827", fontSize:18, marginBottom:6 }}>
              Lunch Time!
            </h5>
            <p style={{ fontSize:36, fontWeight:900, color:"#D97706", margin:"4px 0 8px", lineHeight:1 }}>
              01:30 PM
            </p>
            <p style={{ fontSize:13, color:"#6B7280", marginBottom:6 }}>
              Your lunch break has started automatically.
            </p>
            <p style={{ fontSize:12, color:"#9CA3AF", marginBottom:20 }}>
              Allowed: <strong style={{ color:"#374151" }}>45 minutes</strong> — deduction applies if exceeded.
            </p>
            <button
              onClick={() => setShowLunchNotice(false)}
              style={{
                background:"linear-gradient(135deg,#F59E0B,#D97706)",
                color:"#fff", border:"none", borderRadius:12,
                padding:"12px 28px", fontSize:14, fontWeight:700,
                cursor:"pointer", width:"100%",
              }}
            >
              Got it — Enjoy your lunch!
            </button>
          </div>
        </div>
      )}

      {/* ── Face Recognition Modal ── */}
      {showFace && (
        <FaceRecognitionModal
          mode={faceMode}
          storedDescriptor={storedDesc}
          onSuccess={handleFaceSuccess}
          onClose={() => setShowFace(false)}
          employeeName=""
          action={faceActionLabel}
        />
      )}

      <style>{`
        /* ── TimeTracker card ── */
        .tt-loading {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 12px; font-size: 12px; color: #9CA3AF;
        }
        .tt-card {
          background: #fff;
          border: 1.5px solid #E5E7EB;
          border-radius: 14px;
          padding: 10px 14px 10px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
          display: flex; flex-direction: column; gap: 8px;
        }
        .tt-row-top {
          display: flex; align-items: center;
          gap: 12px; flex-wrap: wrap;
        }
        .tt-status {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 4px 11px; border-radius: 20px;
          font-size: 11.5px; font-weight: 700; white-space: nowrap;
        }
        .tt-dot {
          width: 7px; height: 7px; border-radius: 50%;
          display: inline-block; flex-shrink: 0;
        }
        .tt-timers {
          display: flex; gap: 16px; align-items: center; flex-wrap: wrap;
        }
        .tt-timer-block { text-align: center; }
        .tt-timer-label {
          display: block; font-size: 10px; color: #9CA3AF;
          font-weight: 500; line-height: 1;
        }
        .tt-timer-value {
          display: block; font-size: 17px; font-weight: 800;
          color: #111827; letter-spacing: 1px;
          font-variant-numeric: tabular-nums; font-family: monospace;
          line-height: 1.2;
        }
        .tt-checkin-time {
          font-size: 11px; color: #9CA3AF; white-space: nowrap;
          display: inline-flex; align-items: center; gap: 4px;
        }
        .tt-row-btns {
          display: flex; gap: 7px; flex-wrap: wrap; align-items: center;
        }
        .tt-btn {
          display: inline-flex; align-items: center; gap: 6px;
          border: none; border-radius: 10px;
          padding: 8px 15px; font-size: 13px; font-weight: 700;
          cursor: pointer; white-space: nowrap; transition: opacity 0.15s;
        }
        .tt-btn:hover { opacity: 0.88; }
        .tt-btn-green  { background: linear-gradient(135deg,#10B981,#059669); color:#fff; box-shadow:0 3px 10px rgba(16,185,129,0.3); }
        .tt-btn-red    { background: linear-gradient(135deg,#EF4444,#DC2626); color:#fff; box-shadow:0 3px 10px rgba(239,68,68,0.3); }
        .tt-btn-amber  { background: linear-gradient(135deg,#F59E0B,#D97706); color:#fff; box-shadow:0 3px 10px rgba(245,158,11,0.3); }
        .tt-btn-outline { background:#EEF2FF; color:#4F46E5; border:1.5px solid #C7D2FE; box-shadow:none; font-size:12px; padding:8px 12px; }
        .tt-btn-disabled { background:#F3F4F6; color:#9CA3AF; border:1.5px solid #E5E7EB; cursor:not-allowed; }
        .tt-pill {
          font-size: 10px; background: rgba(0,0,0,0.15);
          padding: 1px 6px; border-radius: 8px;
        }
        .tt-checkin-mobile { display: none; }

        /* ── MOBILE ── */
        @media (max-width: 991px) {
          .tt-card {
            border-radius: 12px;
            padding: 12px 14px;
            gap: 10px;
          }
          .tt-row-top {
            justify-content: space-between;
          }
          .tt-checkin-time { display: none; }
          .tt-checkin-mobile {
            display: block;
            font-size: 11px; color: #9CA3AF;
            padding-top: 2px;
          }
          .tt-timers { gap: 20px; }
          .tt-timer-value { font-size: 18px; }
          .tt-row-btns {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }
          .tt-btn {
            width: 100%;
            justify-content: center;
            padding: 11px 10px;
            font-size: 13px;
            border-radius: 11px;
          }
          /* Setup Face ID spans full width on mobile */
          .tt-btn-outline {
            grid-column: 1 / -1;
            justify-content: center;
          }
        }
        @media (max-width: 400px) {
          .tt-row-btns { grid-template-columns: 1fr; }
          .tt-btn-outline { grid-column: unset; }
        }

        @keyframes lunchBlink {
          0%,100% { opacity:1; }
          50% { opacity:0.55; }
        }
      `}</style>
    </>
  );
}

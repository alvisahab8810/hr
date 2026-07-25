// components/employee/TimeTracker.js
import { toast } from "react-toastify";
import React, { useEffect, useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { preloadFaceModels } from "@/utils/faceModels";

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

  // Lunch reminder (13:30) — reminds only, never auto-starts the break
  const [showLunchNotice, setShowLunchNotice] = useState(false);

  // Refs
  const workIntervalRef  = useRef(null);
  const breakIntervalRef = useRef(null);
  const lunchCheckRef    = useRef(null);
  const lunchAudioRef    = useRef(null);
  const audioUnlockedRef = useRef(false);
  const isClockedInRef   = useRef(false);
  const isOnBreakRef     = useRef(false);

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
    // Preload face models silently so modal opens instantly when user clicks
    preloadFaceModels().catch(() => {}); // ignore errors — modal will retry
    return () => {
      clearInterval(workIntervalRef.current);
      clearInterval(breakIntervalRef.current);
      clearInterval(lunchCheckRef.current);
    };
  }, []);

  // Keep refs in sync so the lunch-reminder interval (mounted once, see below)
  // always reads current values without needing to be torn down/rebuilt.
  useEffect(() => { isClockedInRef.current = isClockedIn; }, [isClockedIn]);
  useEffect(() => { isOnBreakRef.current   = isOnBreak;   }, [isOnBreak]);

  // ── Unlock audio playback ────────────────────────────────────────────────
  // Browsers block programmatic Audio.play() until the page has seen a user
  // gesture. Without this, the 13:30 reminder sound silently fails unless the
  // employee happens to interact with the page (e.g. refresh) right at 13:30.
  // Priming a play()+pause() on the very first click/keydown/touch "unlocks"
  // playback for the rest of the session, so the later programmatic play()
  // at 13:30 actually produces sound.
  useEffect(() => {
    lunchAudioRef.current = new Audio("/sounds/lunch-warning.mp3");
    lunchAudioRef.current.load();

    const unlock = () => {
      if (audioUnlockedRef.current || !lunchAudioRef.current) return;
      lunchAudioRef.current.play()
        .then(() => {
          lunchAudioRef.current.pause();
          lunchAudioRef.current.currentTime = 0;
          audioUnlockedRef.current = true;
        })
        .catch(() => {}); // still locked — will retry on next gesture
    };

    document.addEventListener("click", unlock);
    document.addEventListener("keydown", unlock);
    document.addEventListener("touchstart", unlock);
    return () => {
      document.removeEventListener("click", unlock);
      document.removeEventListener("keydown", unlock);
      document.removeEventListener("touchstart", unlock);
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

  // ── Lunch reminder at 13:30 ─────────────────────────────────────────────────
  // Reminds the employee to take lunch — does NOT start the break automatically
  // anymore; the employee must tap "Lunch" themselves.
  // Mounted once (no isClockedIn/isOnBreak deps) so the interval is never torn
  // down/rebuilt mid-window — it reads live values via refs instead, which is
  // what made the old version fire unreliably.
  // Fires every 10s. Window: 13:28–13:35 to survive slow clocks & tab throttling.
  // Uses sessionStorage so re-checks within the same window don't repeat.
  useEffect(() => {
    lunchCheckRef.current = setInterval(() => {
      if (!isClockedInRef.current || isOnBreakRef.current) return;

      const now = new Date();
      const h = now.getHours(), m = now.getMinutes();
      const inWindow = h === LUNCH_HOUR && m >= (LUNCH_MIN - 2) && m <= (LUNCH_MIN + 5);
      if (!inWindow) return;

      // Deduplicate via sessionStorage (survives page refresh within same session)
      const todayKey = `lunchReminder_${now.getFullYear()}_${now.getMonth()}_${now.getDate()}`;
      if (sessionStorage.getItem(todayKey) === "fired") return;

      sessionStorage.setItem(todayKey, "fired");

      lunchAudioRef.current?.play().catch(() => {});

      setShowLunchNotice(true);
      setTimeout(() => setShowLunchNotice(false), 12000);
    }, 10000); // every 10s — reliable within the 7-min window
    return () => clearInterval(lunchCheckRef.current);
  }, []);

  // ── Open face scan ─────────────────────────────────────────────────────────
  function openFaceScan(clockAction) {
    // Block all clock actions on Sundays
    if (new Date().getDay() === 0) {
      toast.error("Today is Sunday — office is closed. Attendance is not available.", {
        autoClose: 5000,
        icon: "🚫",
      });
      return;
    }

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
  const isSunday     = new Date().getDay() === 0;
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
  const BtnClockIn = () => isSunday ? (
    <button className="tt-btn tt-btn-disabled" disabled title="Sunday — office closed">
      <i className="bi bi-moon-stars-fill" /> Sunday Off
    </button>
  ) : (
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
          TRACKER CARD — standalone full-width
      ═══════════════════════════════════════════ */}
      <div className="tt-card">

        {/* ── Left: status + timers ── */}
        <div className="tt-left">

          {/* Status badge */}
          <span className="tt-status" style={{ background:statusBg, color:statusColor }}>
            <span className="tt-dot" style={{ background:statusColor }} />
            {statusLabel}
          </span>

          {/* Main work clock */}
          <div className="tt-clock-wrap">
            <span className="tt-clock-label">Work Time</span>
            <span className="tt-clock-value">{msToClock(timerMs)}</span>
          </div>

          {/* Lunch timer — only when on break */}
          {isOnBreak && (
            <div className="tt-clock-wrap">
              <span className="tt-clock-label" style={{ color: lunchOverdue ? "#DC2626" : "#D97706" }}>
                {lunchOverdue ? "⚠ Lunch OT" : "Lunch"}
              </span>
              <span className="tt-clock-value" style={{
                color: lunchOverdue ? "#DC2626" : "#D97706",
                animation: lunchOverdue ? "lunchBlink 1s ease-in-out infinite" : "none",
              }}>
                {msToClock(breakMs)}
              </span>
            </div>
          )}

          {/* Check-in time */}
          {attendance?.startTime && (
            <div className="tt-checkin-chip">
              <i className="bi bi-box-arrow-in-right" />
              {new Date(attendance.startTime).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}
            </div>
          )}
        </div>

        {/* ── Divider ── */}
        <div className="tt-divider" />

        {/* ── Right: action buttons ── */}
        <div className="tt-right">
          <div className="tt-row-btns">
            {!isClockedIn && !attendance?.endTime && <BtnClockIn />}
            {isClockedIn && <BtnClockOut />}
            {isClockedIn && !isOnBreak && <BtnLunchStart />}
            {isOnBreak && <BtnLunchEnd />}
            <BtnFaceSetup />
          </div>

          {/* Face ID status */}
          {faceEnrolled && (
            <button onClick={openEnroll} className="tt-face-link">
              <i className="bi bi-shield-fill-check" style={{ color:"#10B981" }} />
              Face ID active · <span style={{ textDecoration:"underline" }}>Update</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Lunch banner notification (slide-in from top-right) ── */}
      <div style={{
        position:"fixed", top:18, right:18, zIndex:9990,
        transform: showLunchNotice ? "translateY(0) scale(1)" : "translateY(-120%) scale(0.95)",
        opacity: showLunchNotice ? 1 : 0,
        transition:"transform 0.42s cubic-bezier(0.34,1.56,0.64,1), opacity 0.35s ease",
        pointerEvents: showLunchNotice ? "auto" : "none",
        maxWidth: 340, width:"calc(100vw - 36px)",
      }}>
        <div style={{
          background:"linear-gradient(135deg,#1e1b4b 0%,#D97706 200%)",
          background:"#fff",
          borderRadius:18,
          boxShadow:"0 8px 40px rgba(0,0,0,0.18), 0 0 0 1.5px #FCD34D",
          overflow:"hidden",
        }}>
          {/* Amber top strip */}
          <div style={{
            background:"linear-gradient(90deg,#F59E0B,#D97706)",
            padding:"10px 16px",
            display:"flex", alignItems:"center", justifyContent:"space-between",
          }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:20 }}>🍽️</span>
              <span style={{ color:"#fff", fontWeight:800, fontSize:14 }}>Time for Lunch!</span>
            </div>
            <button
              onClick={() => setShowLunchNotice(false)}
              style={{
                background:"rgba(255,255,255,0.2)", border:"none", borderRadius:6,
                width:26, height:26, cursor:"pointer", color:"#fff",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:13, fontWeight:700, flexShrink:0,
              }}
            >×</button>
          </div>

          {/* Body */}
          <div style={{ padding:"14px 18px 16px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
              <div style={{
                width:44, height:44, borderRadius:12, flexShrink:0,
                background:"#FEF3C7",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:22,
              }}>⏰</div>
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:"#111827" }}>
                  01:30 PM — Lunch reminder
                </div>
                <div style={{ fontSize:11.5, color:"#6B7280", marginTop:2 }}>
                  Tap <strong style={{ color:"#D97706" }}>Lunch</strong> to start your break. You'll have 45 min before deduction applies.
                </div>
              </div>
            </div>

            {/* Progress bar — counts down 12s auto-dismiss */}
            <div style={{ height:3, background:"#F3F4F6", borderRadius:10, overflow:"hidden" }}>
              <div style={{
                height:"100%", borderRadius:10,
                background:"linear-gradient(90deg,#F59E0B,#D97706)",
                animation: showLunchNotice ? "lunchBarShrink 12s linear forwards" : "none",
              }} />
            </div>
          </div>
        </div>
      </div>

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
        /* ══════════════════════════════════════
           TIME TRACKER — standalone card
        ══════════════════════════════════════ */
        .tt-loading {
          display: flex; align-items: center; gap: 8px;
          padding: 14px 18px; font-size: 12px; color: #9CA3AF;
          background: #fff; border-radius: 16px;
          border: 1.5px solid #E5E7EB;
        }

        /* Card shell */
        .tt-card {
          background: #fff;
          border: 1.5px solid #E5E7EB;
          border-radius: 18px;
          padding: 18px 22px;
          box-shadow: 0 2px 16px rgba(0,0,0,0.07);
          display: flex;
          align-items: center;
          gap: 24px;
          flex-wrap: wrap;
        }

        /* Left section: status + clocks */
        .tt-left {
          display: flex; align-items: center;
          gap: 20px; flex-wrap: wrap; flex: 1; min-width: 0;
        }

        /* Status pill */
        .tt-status {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 14px; border-radius: 24px;
          font-size: 12px; font-weight: 700; white-space: nowrap;
          flex-shrink: 0;
        }
        .tt-dot {
          width: 8px; height: 8px; border-radius: 50%;
          display: inline-block; flex-shrink: 0;
        }

        /* Clock blocks */
        .tt-clock-wrap {
          display: flex; flex-direction: column;
          align-items: center; text-align: center;
          padding: 0 16px;
          border-left: 1.5px solid #F3F4F6;
        }
        .tt-clock-label {
          font-size: 10px; color: #9CA3AF; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.5px;
          margin-bottom: 2px;
        }
        .tt-clock-value {
          font-size: 22px; font-weight: 800; color: #111827;
          letter-spacing: 1.5px; font-family: monospace;
          font-variant-numeric: tabular-nums; line-height: 1.1;
        }

        /* Check-in chip */
        .tt-checkin-chip {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 5px 12px; border-radius: 20px;
          background: #F9FAFB; border: 1px solid #E5E7EB;
          font-size: 11.5px; font-weight: 600; color: #6B7280;
          white-space: nowrap; flex-shrink: 0;
        }

        /* Vertical divider (desktop) */
        .tt-divider {
          width: 1.5px; height: 56px; background: #F3F4F6;
          flex-shrink: 0;
        }

        /* Right section: buttons */
        .tt-right {
          display: flex; flex-direction: column;
          align-items: flex-end; gap: 8px; flex-shrink: 0;
        }
        .tt-row-btns {
          display: flex; gap: 8px; flex-wrap: wrap; align-items: center;
          justify-content: flex-end;
        }

        /* Buttons */
        .tt-btn {
          display: inline-flex; align-items: center; gap: 7px;
          border: none; border-radius: 11px;
          padding: 10px 18px; font-size: 13.5px; font-weight: 700;
          cursor: pointer; white-space: nowrap;
          transition: transform 0.1s, opacity 0.15s;
        }
        .tt-btn:active { transform: scale(0.97); }
        .tt-btn:hover  { opacity: 0.9; }
        .tt-btn-green    { background: linear-gradient(135deg,#10B981,#059669); color:#fff; box-shadow:0 4px 14px rgba(16,185,129,0.35); }
        .tt-btn-red      { background: linear-gradient(135deg,#EF4444,#DC2626); color:#fff; box-shadow:0 4px 14px rgba(239,68,68,0.35); }
        .tt-btn-amber    { background: linear-gradient(135deg,#F59E0B,#D97706); color:#fff; box-shadow:0 4px 14px rgba(245,158,11,0.35); }
        .tt-btn-outline  { background:#EEF2FF; color:#4F46E5; border:1.5px solid #C7D2FE; box-shadow:none; padding:9px 14px; font-size:12.5px; }
        .tt-btn-disabled { background:#F3F4F6; color:#9CA3AF; border:1.5px solid #E5E7EB; cursor:not-allowed; }
        .tt-pill { font-size:10px; background:rgba(0,0,0,0.15); padding:1px 7px; border-radius:8px; }

        /* Face ID link */
        .tt-face-link {
          background: none; border: none; padding: 0;
          font-size: 11px; color: #9CA3AF; cursor: pointer;
          display: inline-flex; align-items: center; gap: 4px;
        }

        /* ── MOBILE (≤ 991px) ── */
        @media (max-width: 991px) {
          .tt-card {
            flex-direction: column;
            align-items: stretch;
            padding: 16px;
            gap: 14px;
            border-radius: 16px;
          }
          .tt-left {
            gap: 14px;
            justify-content: space-between;
          }
          .tt-clock-wrap {
            padding: 0 12px;
          }
          .tt-clock-value { font-size: 20px; }
          .tt-divider { display: none; }
          .tt-right {
            align-items: stretch;
          }
          .tt-row-btns {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 9px;
            justify-content: stretch;
          }
          .tt-btn {
            width: 100%;
            justify-content: center;
            padding: 12px 10px;
            font-size: 13px;
            border-radius: 12px;
          }
          .tt-btn-outline {
            grid-column: 1 / -1;
          }
          .tt-face-link { justify-content: center; }
        }
        @media (max-width: 420px) {
          .tt-row-btns { grid-template-columns: 1fr; }
          .tt-btn-outline { grid-column: unset; }
          .tt-left { gap: 10px; }
          .tt-clock-wrap { padding: 0 8px; }
          .tt-clock-value { font-size: 18px; }
        }

        @keyframes lunchBlink     { 0%,100%{ opacity:1; } 50%{ opacity:0.5; } }
        @keyframes lunchBarShrink { from{ width:100%; } to{ width:0%; } }
      `}</style>
    </>
  );
}

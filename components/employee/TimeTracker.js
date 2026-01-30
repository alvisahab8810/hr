  // components/TimeTracker.jsx
import { toast } from "react-toastify";
import React, { useEffect, useState, useRef } from "react";


function getActiveBreakMs(attendance) {
  if (!attendance?.breaks?.length) return 0;

  const last = attendance.breaks[attendance.breaks.length - 1];
  if (!last || last.end) return 0;

  return new Date() - new Date(last.start);
}


function msToClock(ms) {
  if (!ms || ms < 0) return "00:00:00";
  const s = Math.floor(ms / 1000) % 60;
  const m = Math.floor(ms / (60 * 1000)) % 60;
  const h = Math.floor(ms / (60 * 60 * 1000));
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function TimeTracker() {
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [timerMs, setTimerMs] = useState(0);
  const intervalRef = useRef(null);
  const [breakMs, setBreakMs] = useState(0);
  const [breakStart, setBreakStart] = useState(null);




  const token = typeof window !== "undefined" ? localStorage.getItem("employeeToken") : null;

  async function fetchSummary() {
    try {
      const res = await fetch("/api/employee/time/summary", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success && data.data && data.data.attendance) {
        setAttendance(data.data.attendance);
        // setIsOnBreak(data.data.attendance.status === "on_break");
        const onBreak = data.data.attendance.status === "on_break";
setIsOnBreak(onBreak);

if (onBreak) {
  const lastBreak = data.data.attendance.breaks?.slice(-1)[0];
  if (lastBreak && lastBreak.start && !lastBreak.end) {
    setBreakStart(new Date(lastBreak.start));
  }
}

        setIsClockedIn(!data.data.attendance.endTime && !!data.data.attendance.startTime);
        setTimerMs(data.data.workedMs || 0);
      } else {
        setAttendance(null);
        setIsOnBreak(false);
        setIsClockedIn(false);
        setTimerMs(0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSummary();
    return () => clearInterval(intervalRef.current);
  }, []);

  // useEffect(() => {
  //   clearInterval(intervalRef.current);
  //   if (isClockedIn) {
  //     intervalRef.current = setInterval(async () => {
  //       // update local timer
  //       setTimerMs((prev) => prev + 1000);
  //     }, 1000);
  //   }


  //   return () => clearInterval(intervalRef.current);
  // }, [isClockedIn]);


  useEffect(() => {
  clearInterval(intervalRef.current);

  if (isClockedIn && !isOnBreak) {
    intervalRef.current = setInterval(() => {
      setTimerMs((prev) => prev + 1000);
    }, 1000);
  }

  return () => clearInterval(intervalRef.current);
}, [isClockedIn, isOnBreak]);

  // helper to call protected endpoints
  async function apiPost(url, body) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    return res.json();
  }

async function handleClockInOut() {
  if (!isClockedIn) {
    const r = await apiPost("/api/employee/time/clock", { action: "clock-in" });

    if (!r.success) {
      if (r.code === "ATTENDANCE_CLOSED") {
        toast.info("Attendance already completed for today. Please continue tomorrow.");
        return;
      }

      if (r.code === "ALREADY_CLOCKED_IN") {
        toast.warning("You are already clocked in.");
        return;
      }

      toast.error(r.message || "Unable to clock in");
      return;
    }

    setAttendance(r.attendance);
    setIsClockedIn(true);
    setTimerMs(0);

    toast.success("Clocked in successfully");
    return;
  }

  // CLOCK OUT
  const r = await apiPost("/api/employee/time/clock", { action: "clock-out" });

  if (!r.success) {
    toast.error(r.message || "Failed to clock out");
    return;
  }

  setAttendance(r.attendance);
  setIsClockedIn(false);
  setIsOnBreak(false);

  if (r.deduction > 0) {
    toast.warning(`Lunch exceeded. Deduction ₹${r.deduction}`);
  } else {
    toast.success("Clocked out successfully");
  }
}


  async function handleBreakToggle() {
  if (!isOnBreak) {
  const r = await apiPost("/api/employee/time/break", {
    action: "start",
    type: "lunch",
  });

  if (r.success) {
    setAttendance(r.attendance);
    setIsOnBreak(true);

    const last = r.attendance.breaks.slice(-1)[0];
    setBreakStart(new Date(last.start));
  }
}
else {
  const r = await apiPost("/api/employee/time/break", { action: "end" });

  if (r.success) {
    setAttendance(r.attendance);
    setIsOnBreak(false);
    setBreakStart(null);
    setBreakMs(0);
  }
}

  }

  // Shoot (focused session)
  const [shooting, setShooting] = useState(false);
  const [shootMs, setShootMs] = useState(0);
  const shootRef = useRef(null);

  async function toggleShoot() {
    if (!shooting) {
      await apiPost("/api/employee/time/shoot", { action: "start" });
      setShooting(true);
      shootRef.current = setInterval(() => setShootMs((s) => s + 1000), 1000);
    } else {
      await apiPost("/api/employee/time/shoot", { action: "stop" });
      setShooting(false);
      clearInterval(shootRef.current);
      // you can display shoot session summary here
      alert(`Shoot session duration: ${msToClock(shootMs)}`);
      setShootMs(0);
    }
  }

  // Simple minute-by-minute alert for over-lunch — client side monitoring
  useEffect(() => {
    let alertInterval;
    async function checkOverLunch() {
      if (!attendance) return;
      if (!attendance.breaks || attendance.breaks.length === 0) return;
      const last = attendance.breaks[attendance.breaks.length - 1];
      if (!last || last.end) return;
      // active break
      const started = new Date(last.start).getTime();
      const now = new Date().getTime();
      const diffMin = Math.floor((now - started) / 60000);
      const allowed = parseInt(process.env.NEXT_PUBLIC_LUNCH_DURATION_MINUTES || "45");
      if (diffMin > allowed) {
        // show notification once per minute
        if (Notification && Notification.permission === "granted") {
          new Notification("Lunch time exceeded", { body: `You have been on break for ${diffMin} minutes. Deduction will apply.` });
        } else {
          // fallback
          console.warn("Lunch exceeded: ", diffMin);
        }
      }
    }

    if (isOnBreak) {
      // run check every minute
      alertInterval = setInterval(checkOverLunch, 60000);
      // do one check immediately
      checkOverLunch();
    }

    return () => clearInterval(alertInterval);
  }, [attendance, isOnBreak]);


//   useEffect(() => {
//   if (!isOnBreak) {
//     setBreakMs(0);
//     return;
//   }

//   const interval = setInterval(() => {
//     setBreakMs(getActiveBreakMs(attendance));
//   }, 1000);

//   return () => clearInterval(interval);
// }, [isOnBreak, attendance]);


useEffect(() => {
  if (!isOnBreak || !breakStart) {
    setBreakMs(0);
    return;
  }

  const interval = setInterval(() => {
    setBreakMs(Date.now() - breakStart.getTime());
  }, 1000);

  return () => clearInterval(interval);
}, [isOnBreak, breakStart]);


  if (loading) return <div>Loading timer...</div>;

  return (
    <div className="time-tracker">
      <div className="d-flex align-items-center gap-3">
        {/* <div className="d-flex align-items-center gap-3">
          <div className="mb-0 text-dark">Work Timer</div>
          <div className="fw-bold fs-5 text-dark">{msToClock(timerMs)}</div>
        </div> */}


        <div className="d-flex align-items-center gap-4">
  {/* Work Timer */}
  <div>
    <div className="text-dark small">Work Timer</div>
    <div className="fw-bold fs-5 text-dark">
      {msToClock(timerMs)}
    </div>
  </div>

  {/* Lunch Timer */}
  {isOnBreak && (
    <div>
      <div className="text-danger small lunch-">Lunch Break</div>
      <div className="fw-bold fs-5 text-danger">
        {msToClock(breakMs)}
      </div>
    </div>
  )}
</div>


        <div>
          <button className="btn btn-primary me-2" onClick={handleClockInOut}>
            {isClockedIn ? "Clock Out" : "Clock In"}
          </button>

          {/* <button className={`btn ${isOnBreak ? "btn-warning" : "btn-outline-warning"} me-2`} onClick={handleBreakToggle} disabled={!isClockedIn}>
            {isOnBreak ? "Break Over" : "Start Break"}
          </button> */}


          <button
  className={`btn ${isOnBreak ? "lunch-btn" : "lunch-btn"  } me-2`}
  onClick={handleBreakToggle}
  disabled={!isClockedIn}
>
  {isOnBreak ? "⏹ End Lunch" : "🍴 Start Lunch"}
</button>


          {/* <button className={`btn ${shooting ? "btn-success" : "btn-outline-success"}`} onClick={toggleShoot} disabled={!isClockedIn}>
            {shooting ? "Stop Shoot" : "Start Shoot"}
          </button> */}
        </div>
      </div>

      {/* quick summary box */}
      {attendance && (
        <div className="mt-3 card p-3 d-none">
          <div>Today's status: <strong>{attendance.status}</strong></div>
          <div>Late: <strong>{attendance.isLate ? "Yes" : "No"}</strong></div>
          <div>Break minutes: <strong>{Math.round((attendance.breaks || []).reduce((acc,b)=>{ if(b.start && b.end) return acc + (new Date(b.end)-new Date(b.start)); return acc; },0)/60000) || 0}</strong></div>
          <div>Deductions: <strong>₹{attendance.deductions || 0}</strong></div>
        </div>
      )}
    </div>
  );
}

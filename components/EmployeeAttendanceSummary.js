






// import { FaCalendarAlt, FaChevronDown } from "react-icons/fa"; // add FaChevronDown
// import { useEffect, useState, useMemo } from "react";
// import Calendar from "react-calendar";
// import "react-calendar/dist/Calendar.css";
// import {
//   format,
//   getDaysInMonth,
//   startOfMonth,
//   getDay,
//   differenceInMinutes,
// } from "date-fns";

// export default function EmployeeAttendanceCalendar() {
//   const [employee, setEmployee] = useState(null);
//   const [attendance, setAttendance] = useState([]);
//   const [currentDate, setCurrentDate] = useState(new Date());
//   const [selectedRecord, setSelectedRecord] = useState(null);
//   const [showModal, setShowModal] = useState(false);
//   const [showCalendar, setShowCalendar] = useState(false);
//   const [summary, setSummary] = useState({
//     present: 0,
//     halfDay: 0,
//     onDuty: 0,
//     paidLeave: 0,
//     unpaidLeave: 0,
//     absent: 0,
//     payable: 0,
//     weekend: 0,
//   });

//   // 🔁 Fetch logged-in employee
//   useEffect(() => {
//     const fetchMe = async () => {
//       const res = await fetch("/api/payroll/me");
//       const data = await res.json();
//       if (data.success) {
//         setEmployee(data.employee);
//       }
//     };
//     fetchMe();
//   }, []);

//   // 🔁 Fetch attendance on load
//   useEffect(() => {
//     if (!employee?._id) return;
//     const year = currentDate.getFullYear();
//     const month = currentDate.getMonth() + 1;
//     const today = new Date();

//     const fetchAttendance = async () => {
//       const res = await fetch(
//         `/api/payroll/attendance/monthly?employeeId=${employee._id}&year=${year}&month=${month}`
//       );
//       const data = await res.json();
//       const list = data.data || [];
//       setAttendance(list);

//       // Summary Calculation
//       let present = 0,
//         halfDay = 0,
//         onDuty = 0,
//         paidLeave = 0,
//         unpaidLeave = 0;
//       let weekend = 0;
//       const totalDaysInMonth = getDaysInMonth(new Date(year, month - 1));
//       let workingDays = 0;

//       for (let i = 1; i <= totalDaysInMonth; i++) {
//         const dateObj = new Date(year, month - 1, i);
//         const day = getDay(dateObj);

//         if (dateObj > today) continue;

//         if (day === 0) {
//           weekend++;
//           continue;
//         }

//         workingDays++;

//         const record = list.find(
//           (r) => r.date === format(dateObj, "yyyy-MM-dd")
//         );
//         if (record) {
//           if (record.loginTime && !record.logoutTime) {
//             onDuty++;
//           } else if (record.status === "present") {
//             if (record.isHalfDay) halfDay++;
//             else present++;
//           } else if (record.status === "onDuty") {
//             onDuty++;
//           } else if (record.status === "paidLeave") {
//             paidLeave++;
//           } else if (record.status === "unpaidLeave") {
//             unpaidLeave++;
//           }
//         }
//       }

//       const totalLogged =
//         present + halfDay * 0.5 + onDuty + paidLeave + unpaidLeave;
//       const absent = Math.max(0, workingDays - totalLogged);
//       const payable = present + halfDay * 0.5 + onDuty + paidLeave;

//       setSummary({
//         present,
//         halfDay,
//         onDuty,
//         paidLeave,
//         unpaidLeave,
//         absent,
//         payable,
//         weekend,
//       });
//     };

//     fetchAttendance();
//   }, [employee, currentDate]);

//   const calendarDays = useMemo(() => {
//     const days = [];
//     const daysInMonth = getDaysInMonth(currentDate);
//     const firstDay = getDay(startOfMonth(currentDate));
//     for (let i = 0; i < firstDay; i++) days.push(null);
//     for (let i = 1; i <= daysInMonth; i++) days.push(i);
//     return days;
//   }, [currentDate]);

//   const getRecord = (day) => {
//     const dateStr = format(
//       new Date(currentDate.getFullYear(), currentDate.getMonth(), day),
//       "yyyy-MM-dd"
//     );
//     return attendance.find((a) => a.date === dateStr);
//   };

//   const getStatus = (record, dateObj) => {
//     const today = new Date();
//     if (dateObj > today) return null;
//     if (getDay(dateObj) === 0) return "weekend";
//     if (!record) return "absent";
//     if (record.loginTime && !record.logoutTime) return "half";
//     if (record.status === "present") return record.isHalfDay ? "half" : "present";
//     if (record.status === "onDuty") return "onDuty";
//     if (record.status === "paidLeave" || record.status === "unpaidLeave")
//       return record.status;
//     return "absent";
//   };

//   const getBadge = (status) => {
//     switch (status) {
//       case "present":
//         return <span className="badge bg-success">Present</span>;
//       case "half":
//         return <span className="badge bg-warning text-dark">Half Day</span>;
//       case "onDuty":
//         return <span className="badge bg-info text-white">On Duty</span>;
//       case "paidLeave":
//         return <span className="badge bg-warning text-dark">Paid Leave</span>;
//       case "unpaidLeave":
//         return <span className="badge bg-secondary">Unpaid Leave</span>;
//       case "weekend":
//         return <span className="badge bg-light text-muted">Weekend</span>;
//       case "absent":
//         return <span className="badge bg-danger">Absent</span>;
//       default:
//         return null;
//     }
//   };

//   const getDuration = (login, logout) => {
//     if (!login || !logout) return null;
//     const mins = differenceInMinutes(new Date(logout), new Date(login));
//     const hrs = Math.floor(mins / 60);
//     const rem = mins % 60;
//     return `${hrs}h ${rem}m`;
//   };

//   const openModal = (record, day) => {
//     if (!record) return;
//     setSelectedRecord({ ...record, displayDay: day });
//     setShowModal(true);
//   };

//   return (
//     <div className="mt-4 border rounded p-3 bg-white">
//    <div className="d-flex justify-content-between align-items-center mb-3">
//   <h5 className="fw-bold mb-0 text-dark">
//     {format(currentDate, "MMMM yyyy")} Attendance
//   </h5>

//   <div className="position-relative">
//   <div
//   className="btn btn-outline-secondary d-flex align-items-center gap-2 px-3 py-2"
//   onClick={() => setShowCalendar((prev) => !prev)}
//   style={{
//     borderRadius: "8px",
//     cursor: "pointer",
//     fontSize: "0.9rem",
//     color: "#333",
//   }}
// >
//   <FaCalendarAlt />
//   <span>{format(currentDate, "dd MMM yyyy")}</span>
//   <FaChevronDown style={{ fontSize: "0.8rem", marginLeft: "4px" }} />
// </div>

//     {showCalendar && (
//       <div
//         className="position-absolute calendar-dropdown shadow mt-2"
//         style={{
//           zIndex: 1000,
//           backgroundColor: "#ffffff",
//           border: "1px solid #dee2e6",
//           borderRadius: "10px",
//           padding: "12px",
//           minWidth: "280px",
//           fontSize: "0.85rem",
//           color: "#212529",
//         }}
//       >
//         <Calendar
//           onChange={(date) => {
//             setCurrentDate(date);
//             setShowCalendar(false);
//           }}
//           value={currentDate}
//           minDetail="month"
//           maxDetail="month"
//           showNeighboringMonth={false}
//           tileClassName={({ date, view }) =>
//             date.toDateString() === new Date().toDateString()
//               ? "today-highlight"
//               : ""
//           }
//           className="w-100 border-0"
//         />
//       </div>
//     )}
//   </div>
// </div>

// <style jsx global>{`
//   .react-calendar {
//     background: #fff;
//     border: none;
//     font-family: inherit;
//   }

//   .react-calendar__tile {
//     padding: 0.5rem 0.25rem;
//     font-size: 0.85rem;
//     color: #212529;
//     transition: background-color 0.2s ease;
//   }

//   .react-calendar__tile--active {
//     // background-color: #0d6efd !important;
//     color: #fff !important;
//     border-radius: 6px;
//   }

//   .react-calendar__tile--now {
//     background-color: #e7f1ff;
//     border-radius: 6px;
//     font-weight: bold;
//     // color: #0d6efd;
//   }

//   .react-calendar__navigation button {
//     // color: #0d6efd;
//     // font-weight: 500;
//     font-size:12px;
//   }

//   .today-highlight {
//     background-color: #ec6408 !important;
//     border-radius: 6px;
//     font-weight: 600;
//     // color: #;
//   }
// `}</style>

//       <div className="row g-3 mb-3">
//         {[
//           { label: "Payable Days", value: summary.payable, className: "text-primary" },
//           { label: "Present", value: `${summary.present} Full, ${summary.halfDay} Half`, className: "text-success" },
//           { label: "On-duty", value: summary.onDuty, className: "text-info" },
//           { label: "Paid Leaves", value: summary.paidLeave, className: "text-warning" },
//           { label: "Unpaid Leaves", value: summary.unpaidLeave, className: "text-secondary" },
//           { label: "Absent", value: summary.absent, className: "text-danger" },
//           { label: "Weekend", value: summary.weekend, className: "text-muted" },
//         ].map((item, i) => (
//           <div key={i} className="col-6 col-md-4 col-lg-2">
//             <div className="border rounded p-3 text-center bg-light h-100">
//               <div className="small text-muted">{item.label}</div>
//               <div className={`fw-bold fs-5 ${item.className}`}>{item.value}</div>
//             </div>
//           </div>
//         ))}
//       </div>

//       {/* 🗓️ Calendar */}
//       <table className="table table-borderless text-center mb-0">
//         <thead>
//           <tr className="table-light">
//             {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
//               <th key={d}>{d}</th>
//             ))}
//           </tr>
//         </thead>
//         <tbody>
//           {[...Array(Math.ceil(calendarDays.length / 7))].map((_, weekIdx) => (
//             <tr key={weekIdx}>
//               {[...Array(7)].map((_, dayIdx) => {
//                 const index = weekIdx * 7 + dayIdx;
//                 const day = calendarDays[index];
//                 const dateObj = day
//                   ? new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
//                   : null;
//                 const record = day ? getRecord(day) : null;
//                 const status = day ? getStatus(record, dateObj) : null;

//                 return (
//                   <td key={dayIdx}>
//                     {day ? (
//                       <div
//                         className="d-flex flex-column align-items-center justify-content-center"
//                         style={{
//                           border: "1px solid #dee2e6",
//                           borderRadius: 8,
//                           padding: 8,
//                           minHeight: 75,
//                           backgroundColor: "#fff",
//                           cursor: "pointer",
//                         }}
//                         onClick={() => openModal(record, day)}
//                       >
//                         <strong>{day}</strong>
//                         <div className="small mt-1">{getBadge(status)}</div>
//                       </div>
//                     ) : (
//                       ""
//                     )}
//                   </td>
//                 );
//               })}
//             </tr>
//           ))}
//         </tbody>
//       </table>

//       {/* Modal */}
//       {showModal && (
//         <div
//           className="modal fade show"
//           style={{
//             display: "block",
//             position: "fixed",
//             zIndex: 1055,
//             backgroundColor: "rgba(0, 0, 0, 0.5)",
//             top: 0,
//             left: 0,
//             width: "100vw",
//             height: "100vh",
//           }}
//           onClick={() => setShowModal(false)}
//         >
//           <div
//             className="modal-dialog modal-dialog-centered modal-md"
//             onClick={(e) => e.stopPropagation()}
//           >
//             <div className="modal-content">
//               <div className="modal-header bg-light">
//                 <h5 className="modal-title">
//                   🕒 {selectedRecord?.displayDay} {format(currentDate, "MMMM yyyy")}
//                 </h5>
//                 <button
//                   type="button"
//                   className="btn-close"
//                   onClick={() => setShowModal(false)}
//                 />
//               </div>
//               <div className="modal-body">
//                 <div className="row mb-3">
//                   <div className="col-6">Login: {selectedRecord?.loginTime ? new Date(selectedRecord.loginTime).toLocaleTimeString() : "—"}</div>
//                   <div className="col-6">Logout: {selectedRecord?.logoutTime ? new Date(selectedRecord.logoutTime).toLocaleTimeString() : "—"}</div>
//                 </div>
//                 <div className="row">
//                   <div className="col-6">Duration: {getDuration(selectedRecord?.loginTime, selectedRecord?.logoutTime) || "—"}</div>
//                   <div className="col-6">Status: {selectedRecord?.logoutTime ? (selectedRecord?.isHalfDay ? "Half Day" : selectedRecord?.status === "present" ? "Present" : "Absent") : "Working"}</div>
//                 </div>
//               </div>
//               <div className="modal-footer">
//                 <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>Close</button>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }





import { useEffect, useState, useMemo } from "react";
import { FaCalendarAlt, FaChevronDown } from "react-icons/fa";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import {
  format,
  getDaysInMonth,
  startOfMonth,
  getDay,
  differenceInMinutes,
} from "date-fns";

/* ---------- helpers ---------- */
function formatMinutes(m) {
  if (m == null) return "—";
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${h}h ${min}m`;
}

function getFirstIn(record) {
  if (record?.punches?.length) return record.punches[0].in;
  return record?.loginTime || null;
}

function getLastOut(record) {
  if (record?.punches?.length) {
    const last = record.punches[record.punches.length - 1];
    return last.out || null;
  }
  return record?.logoutTime || null;
}

export default function EmployeeAttendanceCalendar() {
  const [employee, setEmployee] = useState(null);
  const [attendance, setAttendance] = useState([]); // array of day records
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [summary, setSummary] = useState({
    present: 0,
    halfDay: 0,
    onDuty: 0,
    paidLeave: 0,
    unpaidLeave: 0,
    absent: 0,
    payable: 0,
    weekend: 0,
  });

  /* ---------- fetch logged-in employee ---------- */
  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch("/api/payroll/me");
        const data = await res.json();
        if (data.success) setEmployee(data.employee);
      } catch (e) {
        console.error("Fetch me failed:", e);
      }
    };
    fetchMe();
  }, []);

  /* ---------- fetch attendance + build summary ---------- */
  useEffect(() => {
    if (!employee?._id) return;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const today = new Date();

    const fetchAttendance = async () => {
  try {
    const res = await fetch(
      `/api/payroll/attendance/monthly?employeeId=${employee._id}&year=${year}&month=${month}`
    );
    const data = await res.json();
    const list = data.data || [];
    setAttendance(list);

    // --- summary counters ---
    let present = 0,
      halfDay = 0,
      onDuty = 0,
      paidLeave = 0,
      unpaidLeave = 0,
      weekend = 0,
      workingDays = 0;

    const totalDaysInMonth = getDaysInMonth(new Date(year, month - 1));
    const today = new Date();

    for (let i = 1; i <= totalDaysInMonth; i++) {
      const dateObj = new Date(year, month - 1, i);
      const day = getDay(dateObj);
      if (dateObj > today) continue; // Ignore future days

      if (day === 0) {
        weekend++;
        continue;
      }
      workingDays++;

      const dateStr = format(dateObj, "yyyy-MM-dd");
      const record = list.find((r) => r.date === dateStr);

      if (!record) {
        continue; // Will count as absent later
      }

      // --- Punches-based logic ---
      if (record.punches?.length) {
        const last = record.punches[record.punches.length - 1];

        // If open punch
        if (!last.out) {
          // Only current day counts as onDuty
          if (dateObj.toDateString() === today.toDateString()) {
            onDuty++;
          } else {
            // For past days, treat as full day if total worked >= 4 hours
            const worked = record.totalWorkedMinutes || 0;
            if (worked >= 240 && worked < 480) halfDay++;
            else if (worked >= 480) present++;
            else unpaidLeave++; // too short, treat as unpaid leave
          }
          continue;
        }

        // Closed day: check half-day/full-day
        if (record.isHalfDay) halfDay++;
        else present++;
        continue;
      }

      // --- Legacy fallback ---
      if (record.loginTime && !record.logoutTime) {
        if (dateObj.toDateString() === today.toDateString()) {
          onDuty++;
        } else {
          // Past day with no logout: same logic as above
          const worked = record.totalWorkedMinutes || 0;
          if (worked >= 240 && worked < 480) halfDay++;
          else if (worked >= 480) present++;
          else unpaidLeave++;
        }
        continue;
      }

      if (record.status === "present") {
        if (record.isHalfDay) halfDay++;
        else present++;
        continue;
      }

      if (record.status === "paidLeave") {
        paidLeave++;
        continue;
      }

      if (record.status === "unpaidLeave") {
        unpaidLeave++;
        continue;
      }
    }

    const totalLogged = present + halfDay * 0.5 + onDuty + paidLeave + unpaidLeave;
    const absent = Math.max(0, workingDays - totalLogged);
    const payable = present + halfDay * 0.5 + onDuty + paidLeave;

    setSummary({
      present,
      halfDay,
      onDuty,
      paidLeave,
      unpaidLeave,
      absent,
      payable,
      weekend,
    });
  } catch (err) {
    console.error("Fetch attendance failed:", err);
  }
};

  

    // const fetchAttendance = async () => {
    //   try {
    //     const res = await fetch(
    //       `/api/payroll/attendance/monthly?employeeId=${employee._id}&year=${year}&month=${month}`
    //     );
    //     const data = await res.json();
    //     const list = data.data || [];
    //     setAttendance(list);

    //     // --- summary build ---
    //     let present = 0,
    //       halfDay = 0,
    //       onDuty = 0,
    //       paidLeave = 0,
    //       unpaidLeave = 0,
    //       weekend = 0,
    //       workingDays = 0;

    //     const totalDaysInMonth = getDaysInMonth(new Date(year, month - 1));

    //     for (let i = 1; i <= totalDaysInMonth; i++) {
    //       const dateObj = new Date(year, month - 1, i);
    //       const day = getDay(dateObj);
    //       if (dateObj > today) continue; // future ignore

    //       if (day === 0) {
    //         weekend++;
    //         continue;
    //       }
    //       workingDays++;

    //       const dateStr = format(dateObj, "yyyy-MM-dd");
    //       const record = list.find((r) => r.date === dateStr);

    //       if (!record) {
    //         continue; // counts as absent later
    //       }

    //       // infer from punches first
    //       if (record.punches?.length) {
    //         const last = record.punches[record.punches.length - 1];
    //         if (!last.out) {
    //           onDuty++;
    //           continue;
    //         }
    //         // closed day: use isHalfDay
    //         if (record.isHalfDay) halfDay++;
    //         else present++;
    //         continue;
    //       }

    //       // legacy fallback
    //       if (record.loginTime && !record.logoutTime) {
    //         onDuty++;
    //         continue;
    //       }
    //       if (record.status === "present") {
    //         if (record.isHalfDay) halfDay++;
    //         else present++;
    //         continue;
    //       }
    //       if (record.status === "paidLeave") {
    //         paidLeave++;
    //         continue;
    //       }
    //       if (record.status === "unpaidLeave") {
    //         unpaidLeave++;
    //         continue;
    //       }
    //     }

    //     const totalLogged =
    //       present + halfDay * 0.5 + onDuty + paidLeave + unpaidLeave;
    //     const absent = Math.max(0, workingDays - totalLogged);
    //     const payable = present + halfDay * 0.5 + onDuty + paidLeave;

    //     setSummary({
    //       present,
    //       halfDay,
    //       onDuty,
    //       paidLeave,
    //       unpaidLeave,
    //       absent,
    //       payable,
    //       weekend,
    //     });
    //   } catch (err) {
    //     console.error("Fetch attendance failed:", err);
    //   }
    // };

    fetchAttendance();
  }, [employee, currentDate]);

  /* ---------- calendar layout cells ---------- */
  const calendarDays = useMemo(() => {
    const days = [];
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getDay(startOfMonth(currentDate));
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, [currentDate]);

  /* ---------- find record for a day ---------- */
  const getRecord = (day) => {
    const dateStr = format(
      new Date(currentDate.getFullYear(), currentDate.getMonth(), day),
      "yyyy-MM-dd"
    );
    return attendance.find((a) => a.date === dateStr);
  };

  /* ---------- calendar status logic ---------- */
  // const getStatus = (record, dateObj) => {
  //   const today = new Date();
  //   if (dateObj > today) return null;
  //   if (getDay(dateObj) === 0) return "weekend";
  //   if (!record) return "absent";

  //   // prefer punches
  //   if (record.punches?.length) {
  //     const last = record.punches[record.punches.length - 1];
  //     if (!last.out) return "onDuty";
  //     return record.isHalfDay ? "half" : "present";
  //   }

  //   // legacy
  //   if (record.loginTime && !record.logoutTime) return "onDuty";
  //   if (record.status === "present") return record.isHalfDay ? "half" : "present";
  //   if (record.status === "paidLeave") return "paidLeave";
  //   if (record.status === "unpaidLeave") return "unpaidLeave";

  //   return "absent";
  // };



  const getStatus = (record, dateObj) => {
  const today = new Date();
  const isToday = dateObj.toDateString() === today.toDateString();

  if (dateObj > today) return null; // Future dates
  if (getDay(dateObj) === 0) return "weekend"; // Sundays
  if (!record) return "absent";

  const workedMinutes = record.totalWorkedMinutes || 0;

  // Punch-based logic
  if (record.punches?.length) {
    const last = record.punches[record.punches.length - 1];
    const hasOutPunch = record.punches.some((p) => p.out);

    // For today
    if (isToday) {
      if (!hasOutPunch) return "onDuty"; // Still working
      return workedMinutes < 240 ? "half" : "present";
    }

    // For past days
    if (!hasOutPunch) {
      // Forgot punch-out
      return workedMinutes >= 240 ? "present" : "half";
    }
    return workedMinutes < 240 ? "half" : "present";
  }

  // Legacy fallbacks
  if (record.loginTime && !record.logoutTime) {
    return isToday ? "onDuty" : (record.totalWorkedMinutes >= 240 ? "present" : "half");
  }
  if (record.status === "present") return record.isHalfDay ? "half" : "present";
  if (record.status === "paidLeave") return "paidLeave";
  if (record.status === "unpaidLeave") return "unpaidLeave";

  return "absent";
};


  /* ---------- badge UI ---------- */
  const getBadge = (status) => {
    switch (status) {
      case "present":
        return <span className="badge bg-success">Present</span>;
      case "half":
        return <span className="badge bg-warning text-dark">Half Day</span>;
      case "onDuty":
        return <span className="badge bg-info text-white">On Duty</span>;
      case "paidLeave":
        return <span className="badge bg-warning text-dark">Paid Leave</span>;
      case "unpaidLeave":
        return <span className="badge bg-secondary">Unpaid Leave</span>;
      case "weekend":
        return <span className="badge bg-light text-muted">Weekend</span>;
      case "absent":
        return <span className="badge bg-danger">Absent</span>;
      default:
        return null;
    }
  };

  /* ---------- modal trigger ---------- */
  const openModal = (record, day) => {
    if (!record) return;
    setSelectedRecord({ ...record, displayDay: day });
    setShowModal(true);
  };

  const firstIn = selectedRecord ? getFirstIn(selectedRecord) : null;
  const lastOut = selectedRecord ? getLastOut(selectedRecord) : null;

  return (
    <div className="table-responsive mt-4 border rounded p-3 bg-white">
      {/* header / month picker */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="fw-bold mb-0 text-dark">
          {format(currentDate, "MMMM yyyy")} Attendance
        </h5>

        <div className="position-relative">
          <div
            className="btn btn-outline-secondary d-flex align-items-center gap-2 px-3 py-2 download-btn"
            onClick={() => setShowCalendar((prev) => !prev)}
            style={{
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "0.9rem",
              color: "#fff",
            }}
          >
            <FaCalendarAlt />
            <span>{format(currentDate, "dd MMM yyyy")}</span>
            <FaChevronDown style={{ fontSize: "0.8rem", marginLeft: 4 }} />
          </div>

          {showCalendar && (
            <div
              className="position-absolute calendar-dropdown shadow mt-2"
              style={{
                zIndex: 1000,
                backgroundColor: "#ffffff",
                border: "1px solid #dee2e6",
                borderRadius: "10px",
                padding: "12px",
                minWidth: "280px",
                fontSize: "0.85rem",
                color: "#212529",
              }}
            >
              <Calendar
                onChange={(date) => {
                  setCurrentDate(date);
                  setShowCalendar(false);
                }}
                value={currentDate}
                minDetail="month"
                maxDetail="month"
                showNeighboringMonth={false}
                tileClassName={({ date }) =>
                  date.toDateString() === new Date().toDateString()
                    ? "today-highlight"
                    : ""
                }
                className="w-100 border-0"
              />
            </div>
          )}
        </div>
      </div>

      {/* calendar style overrides */}
      <style jsx global>{`
        .react-calendar {
          background: #fff;
          border: none;
          font-family: inherit;
        }
        .react-calendar__tile {
          padding: 0.5rem 0.25rem;
          font-size: 0.85rem;
          color: #212529;
          transition: background-color 0.2s ease;
        }
        .react-calendar__tile--active {
          color: #fff !important;
          border-radius: 6px;
        }
        .react-calendar__tile--now {
          background-color: #e7f1ff;
          border-radius: 6px;
          font-weight: bold;
        }
        .react-calendar__navigation button {
          font-size: 12px;
        }
        .today-highlight {
          background-color: #ec6408 !important;
          border-radius: 6px;
          font-weight: 600;
        }
      `}</style>

      {/* summary tiles */}
      <div className="row g-3 mb-3 summary-tiles">
        {[
          { label: "Payable Days", value: summary.payable, className: "text-primary" },
          {
            label: "Present",
            value: `${summary.present} Full, ${summary.halfDay} Half`,
            className: "text-success",
          },
          { label: "On-duty", value: summary.onDuty, className: "text-info" },
          { label: "Paid Leaves", value: summary.paidLeave, className: "text-warning" },
          { label: "Unpaid Leaves", value: summary.unpaidLeave, className: "text-secondary" },
          { label: "Absent", value: summary.absent, className: "text-danger" },
          { label: "Weekend", value: summary.weekend, className: "text-muted" },
        ].map((item, i) => (
          <div key={i} className="col-6 col-md-4 col-lg-2">
            <div className="border rounded p-3 text-center bg-light h-100">
              <div className="small text-muted">{item.label}</div>
              <div className={`fw-bold fs-5 ${item.className}`}>{item.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* calendar grid */}
      <table className="table table-borderless text-center mb-0">
        <thead>
          <tr className="table-light">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <th key={d}>{d}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...Array(Math.ceil(calendarDays.length / 7))].map((_, weekIdx) => (
            <tr key={weekIdx}>
              {[...Array(7)].map((_, dayIdx) => {
                const index = weekIdx * 7 + dayIdx;
                const day = calendarDays[index];
                const dateObj = day
                  ? new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
                  : null;
                const record = day ? getRecord(day) : null;
                const status = day ? getStatus(record, dateObj) : null;

                return (
                  <td key={dayIdx}>
                    {day ? (
                      <div
                        className="d-flex flex-column align-items-center justify-content-center"
                        style={{
                          border: "1px solid #dee2e6",
                          borderRadius: 8,
                          padding: 8,
                          minHeight: 75,
                          backgroundColor: "#fff",
                          cursor: "pointer",
                        }}
                        onClick={() => openModal(record, day)}
                      >
                        <strong>{day}</strong>
                        <div className="small mt-1">{getBadge(status)}</div>
                      </div>
                    ) : (
                      ""
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {/* modal */}
      {showModal && (
        <div
          className="modal fade show"
          style={{
            display: "block",
            position: "fixed",
            zIndex: 1055,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="modal-dialog modal-dialog-centered modal-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content">
              <div className="modal-header bg-light">
                <h5 className="modal-title">
                  🕒 {selectedRecord?.displayDay} {format(currentDate, "MMMM yyyy")}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                />
              </div>

              <div className="modal-body">
                {/* quick summary row */}
                <div className="row mb-3">
                  <div className="col-6">
                    <span className="fw-semibold text-muted">First In:</span>
                    <div>
                      {firstIn ? new Date(firstIn).toLocaleTimeString() : "—"}
                    </div>
                  </div>
                  <div className="col-6">
                    <span className="fw-semibold text-muted">Last Out:</span>
                    <div>
                      {lastOut ? new Date(lastOut).toLocaleTimeString() : "—"}
                    </div>
                  </div>
                </div>

                {/* punches table */}
                {selectedRecord?.punches?.length ? (
                  <div className="mb-4">
                    <h6 className="fw-semibold mb-2">Punches</h6>
                    <div className="table-responsive">
                      <table className="table table-sm table-bordered align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>In</th>
                            <th>Out</th>
                            <th>Duration</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedRecord.punches.map((p, i) => {
                            const inDt = p.in ? new Date(p.in) : null;
                            const outDt = p.out ? new Date(p.out) : null;
                            const dur =
                              inDt && outDt
                                ? formatMinutes(
                                    Math.round((outDt - inDt) / 60000)
                                  )
                                : "—";
                            return (
                              <tr key={i}>
                                <td>{inDt ? inDt.toLocaleTimeString() : "—"}</td>
                                <td>{outDt ? outDt.toLocaleTimeString() : "—"}</td>
                                <td>{dur}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted">No punches recorded.</p>
                )}

                {/* totals */}
                <div className="row mb-2">
                  <div className="col-6">
                    <span className="fw-semibold text-muted">Total Worked:</span>
                    <div>{formatMinutes(selectedRecord?.totalWorkedMinutes)}</div>
                  </div>
                  <div className="col-6">
                    <span className="fw-semibold text-muted">Total Breaks:</span>
                    <div>
                      {formatMinutes(selectedRecord?.totalBreakMinutes)}
                      {selectedRecord?.lunchBreakExceeded && (
                        <span className="text-danger ms-1">(Lunch overage!)</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* status */}
                {/* <div className="row mt-3">
                  <div className="col-12">
                    <span className="fw-semibold text-muted">Day Status:</span>
                    <div className="fw-bold">
                      {(() => {
                        if (!selectedRecord) return "—";
                        const last = getLastOut(selectedRecord);
                        if (!last) return "Working";
                        if (selectedRecord.isHalfDay) return "Half Day";
                        if (selectedRecord.status === "present") return "Present";
                        if (selectedRecord.status === "paidLeave") return "Paid Leave";
                        if (selectedRecord.status === "unpaidLeave") return "Unpaid Leave";
                        return "Absent";
                      })()}
                    </div>
                  </div>
                </div> */}



                {/* status */}
<div className="row mt-3">
  <div className="col-12">
    <span className="fw-semibold text-muted">Day Status:</span>
    <div className="fw-bold">
      {(() => {
        if (!selectedRecord) return "—";

        const workedMinutes = selectedRecord.totalWorkedMinutes || 0;
        const hasOutPunch = selectedRecord.punches.some((p) => p.out);

        // 1. If no punches at all
        if (!selectedRecord.punches.length) return "Absent";

        // 2. If no punch out yet but shift day is over (after 8 PM)
        const now = new Date();
        const dayEnd = new Date(now);
        dayEnd.setHours(20, 0, 0, 0);
        if (!hasOutPunch && now > dayEnd) {
          return workedMinutes >= 240 ? "Present (Auto)" : "Half Day (Auto)";
        }

        // 3. Check existing status flags
        if (selectedRecord.isHalfDay || workedMinutes < 240) return "Half Day";
        if (selectedRecord.status === "present") return "Present";
        if (selectedRecord.status === "paidLeave") return "Paid Leave";
        if (selectedRecord.status === "unpaidLeave") return "Unpaid Leave";

        return "Absent";
      })()}
    </div>
  </div>
</div>

              </div>

              <div className="modal-footer">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// import { FaCalendarAlt } from "react-icons/fa"; // add this at the top of your file

// import { useMemo } from "react";
// import Calendar from "react-calendar";
// import "react-calendar/dist/Calendar.css"; // Don't forget to import this for styling

// import { useEffect, useState } from "react";
// import {
//   format,
//   getDaysInMonth,
//   startOfMonth,
//   getDay,
//   parseISO,
//   differenceInMinutes,
// } from "date-fns";

// export default function AttendanceCalendar({ employeeId }) {
//   const [attendance, setAttendance] = useState([]);
//   const [currentDate, setCurrentDate] = useState(new Date());
//   const [selectedRecord, setSelectedRecord] = useState(null);
//   const [showModal, setShowModal] = useState(false);

// const [showCalendar, setShowCalendar] = useState(false);

//   useEffect(() => {
//     if (!employeeId) return;
//     const year = currentDate.getFullYear();
//     const month = currentDate.getMonth() + 1;

//     const fetchAttendance = async () => {
//       const res = await fetch(
//         `/api/payroll/attendance/monthly?employeeId=${employeeId}&year=${year}&month=${month}`
//       );
//       const data = await res.json();
//       setAttendance(data.data || []);
//     };

//     fetchAttendance();
//   }, [employeeId, currentDate]);

//   const calendarDays = useMemo(() => {
//   const days = [];
//   const daysInMonth = getDaysInMonth(currentDate);
//   const firstDay = getDay(startOfMonth(currentDate));

//   for (let i = 0; i < firstDay; i++) days.push(null);
//   for (let i = 1; i <= daysInMonth; i++) days.push(i);

//   return days;
// }, [currentDate]);

// //   const daysInMonth = getDaysInMonth(currentDate);
// //   const firstDay = getDay(startOfMonth(currentDate));
// //   const calendarDays = [];

// //   for (let i = 0; i < firstDay; i++) calendarDays.push(null);
// //   for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

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

//     // ✅ If employee has loginTime but no logout yet (currently working)
//     if (record.loginTime && !record.logoutTime) return "half";

//     if (record.status === "present")
//       return record.isHalfDay ? "half" : "present";

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

// const getDuration = (login, logout) => {
//   if (!login || !logout) return null;

//   // Ensure both are Date objects
//   const loginDate = typeof login === 'string' ? new Date(login) : login;
//   const logoutDate = typeof logout === 'string' ? new Date(logout) : logout;

//   const mins = differenceInMinutes(logoutDate, loginDate);
//   const hrs = Math.floor(mins / 60);
//   const rem = mins % 60;
//   return `${hrs}h ${rem}m`;
// };

//   const openModal = (record, day) => {
//     if (!record) return;
//     setSelectedRecord({ ...record, displayDay: day });
//     setShowModal(true);
//   };

//   const [summary, setSummary] = useState({
//     present: 0,
//     halfDay: 0,
//     onDuty: 0,
//     paidLeave: 0,
//     unpaidLeave: 0,
//     absent: 0,
//     payable: 0,
//   });

//   useEffect(() => {
//     if (!employeeId) return;

//     const year = currentDate.getFullYear();
//     const month = currentDate.getMonth() + 1;
//     const today = new Date();

//     const fetchAttendance = async () => {
//       const res = await fetch(
//         `/api/payroll/attendance/monthly?employeeId=${employeeId}&year=${year}&month=${month}`
//       );
//       const data = await res.json();
//       const list = data.data || [];
//       setAttendance(list);

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

//         // Only count dates up to today
//         if (dateObj > today) continue;

//         if (day === 0) {
//           weekend += 1; // Sunday
//           continue;
//         }

//         workingDays += 1;

//         const record = list.find(
//           (r) => r.date === format(dateObj, "yyyy-MM-dd")
//         );
//         if (record) {
//           if (record.loginTime && !record.logoutTime) {
//             onDuty += 1;
//           } else if (record.status === "present") {
//             if (record.isHalfDay) halfDay += 1;
//             else present += 1;
//           } else if (record.status === "onDuty") {
//             onDuty += 1;
//           } else if (record.status === "paidLeave") {
//             paidLeave += 1;
//           } else if (record.status === "unpaidLeave") {
//             unpaidLeave += 1;
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
//   }, [employeeId, currentDate]);

//   return (
//     <div
//       className="mt-4"
//       style={{ border: "1px solid #dee2e6", borderRadius: 6, padding: 15 }}
//     >
//       <h5>{format(currentDate, "MMMM yyyy")} Attendance</h5>

//       <div className="table-responsive">
//         <div className="mb-4 p-3 border rounded bg-light">
//           <div className="d-flex justify-content-between align-items-center mb-3">
//             <h6 className="mb-0 fw-bold">Attendance Summary</h6>
//             {/* <div className="text-muted small">
//               Period: <strong>{format(currentDate, "MMM-yyyy")}</strong>
//             </div> */}

//           <div className="position-relative mb-4">
//   <div
//     className="btn btn-outline-secondary d-flex align-items-center gap-2"
//     onClick={() => setShowCalendar((prev) => !prev)}
//     style={{ borderRadius: "8px", cursor: "pointer" }}
//   >
//     <FaCalendarAlt />
//     <span>{format(currentDate, "dd MMM yyyy")}</span>
//     <span className="ms-auto dropdown-toggle" />
//   </div>

//   {showCalendar && (
//     <div
//       className="position-absolute calendar-dropdown shadow mt-2"
//       style={{
//         zIndex: 1000,
//         backgroundColor: "#f8f9fa", // Light gray
//         borderRadius: "10px",
//         padding: "10px",
//         minWidth: "260px",
//         fontSize: "0.85rem",
//       }}
//     >
//       <Calendar
//         onChange={(date) => {
//           setCurrentDate(date);
//           setShowCalendar(false);
//         }}
//         value={currentDate}
//         minDetail="month"
//         maxDetail="month"
//         showNeighboringMonth={false}
//         className="custom-calendar"
//         tileClassName={({ date, view }) => {
//           if (date.toDateString() === new Date().toDateString()) {
//             return "current-day";
//           }
//           return "";
//         }}
//       />
//     </div>
//   )}
// </div>

//           </div>

//           <div className="row g-3">
//             {[
//               {
//                 label: "Payable Days",
//                 value: summary.payable,
//                 className: "text-primary",
//               },
//               {
//                 label: "Present",
//                 value: `${summary.present} Full, ${summary.halfDay} Half`,
//                 className: "text-success",
//               },
//               {
//                 label: "On-duty",
//                 value: summary.onDuty,
//                 className: "text-info",
//               },
//               {
//                 label: "Paid Leaves",
//                 value: summary.paidLeave,
//                 className: "text-warning",
//               },
//               {
//                 label: "Unpaid Leaves",
//                 value: summary.unpaidLeave,
//                 className: "text-secondary",
//               },
//               {
//                 label: "Absent",
//                 value: summary.absent,
//                 className: "text-danger",
//               },
//               {
//                 label: "Weekend",
//                 value: summary.weekend,
//                 className: "text-muted",
//               },
//             ].map((item, i) => (
//               <div key={i} className="col-6 col-md-4 col-lg-2">
//                 <div className="border rounded p-3 text-center bg-white shadow-sm h-100">
//                   <div className="fw-semibold text-muted small">
//                     {item.label}
//                   </div>
//                   <div className={`fs-5 fw-bold ${item.className}`}>
//                     {item.value}
//                   </div>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>

//         <table className="table table-borderless text-center">
//           <thead>
//             <tr className="table-light">
//               <th>Sun</th>
//               <th>Mon</th>
//               <th>Tue</th>
//               <th>Wed</th>
//               <th>Thu</th>
//               <th>Fri</th>
//               <th>Sat</th>
//             </tr>
//           </thead>
//           <tbody>
//             {[...Array(Math.ceil(calendarDays.length / 7))].map(
//               (_, weekIdx) => (
//                 <tr key={weekIdx}>
//                   {[...Array(7)].map((_, dayIdx) => {
//                     const index = weekIdx * 7 + dayIdx;
//                     const day = calendarDays[index];
//                     const dateObj = day
//                       ? new Date(
//                           currentDate.getFullYear(),
//                           currentDate.getMonth(),
//                           day
//                         )
//                       : null;
//                     const record = day ? getRecord(day) : null;
//                     const status = day ? getStatus(record, dateObj) : null;

//                     return (
//                       <td key={dayIdx}>
//                         {day ? (
//                           <div
//                             onClick={() => openModal(record, day)}
//                             className="d-flex flex-column align-items-center justify-content-center"
//                             style={{
//                               border: "1px solid #dee2e6",
//                               borderRadius: 8,
//                               padding: 10,
//                               minHeight: 75,
//                               backgroundColor: "#fff",
//                               transition: "0.2s",
//                               cursor: "pointer",
//                               boxShadow: "0 0 0 rgba(0,0,0,0)",
//                             }}
//                             onMouseEnter={(e) =>
//                               (e.currentTarget.style.boxShadow =
//                                 "0 0 10px rgba(0,0,0,0.1)")
//                             }
//                             onMouseLeave={(e) =>
//                               (e.currentTarget.style.boxShadow =
//                                 "0 0 0 rgba(0,0,0,0)")
//                             }
//                           >
//                             <strong>{day}</strong>
//                             <div style={{ fontSize: "0.75rem", marginTop: 4 }}>
//                               {getBadge(status)}
//                             </div>
//                           </div>
//                         ) : (
//                           ""
//                         )}
//                       </td>
//                     );
//                   })}
//                 </tr>
//               )
//             )}
//           </tbody>
//         </table>
//       </div>

//       {/* Modal */}
//       {showModal && (
//         <div
//           className="modal fade show"
//           tabIndex="-1"
//           aria-modal="true"
//           role="dialog"
//           style={{
//             display: "block",
//             position: "fixed",
//             zIndex: 1055,
//             backgroundColor: "rgba(0, 0, 0, 0.5)",
//             top: 0,
//             left: 0,
//             width: "100vw",
//             height: "100vh",
//             overflow: "auto",
//           }}
//           onClick={() => setShowModal(false)}
//         >
//           <div
//             className="modal-dialog modal-dialog-centered modal-md"
//             onClick={(e) => e.stopPropagation()}
//           >
//             <div className="modal-content shadow-lg">
//               <div className="modal-header bg-light border-bottom-0">
//                 <h5 className="modal-title">
//                   🕒 Attendance – {selectedRecord?.displayDay}{" "}
//                   {format(currentDate, "MMMM yyyy")}
//                 </h5>
//                 <button
//                   type="button"
//                   className="btn-close"
//                   onClick={() => setShowModal(false)}
//                 />
//               </div>
//               <div className="modal-body">
//                 <div className="row mb-3">
//                   <div className="col-6">
//                     <span className="fw-semibold text-muted">Login Time:</span>
//                     <div className="text-dark">
//                       {selectedRecord?.loginTime
//                         ? new Date(
//                             selectedRecord.loginTime
//                           ).toLocaleTimeString()
//                         : "—"}
//                     </div>
//                   </div>
//                   <div className="col-6">
//                     <span className="fw-semibold text-muted">Logout Time:</span>
//                     <div className="text-dark">
//                       {selectedRecord?.logoutTime
//                         ? new Date(
//                             selectedRecord.logoutTime
//                           ).toLocaleTimeString()
//                         : "—"}
//                     </div>
//                   </div>
//                 </div>

//                 <div className="row mb-3">
//                   <div className="col-6">
//                     <span className="fw-semibold text-muted">Total Hours:</span>
//                     <div className="text-dark">
//                       {getDuration(
//                         selectedRecord?.loginTime,
//                         selectedRecord?.logoutTime
//                       ) || "—"}
//                     </div>
//                   </div>
//                   <div className="col-6">
//                     <span className="fw-semibold text-muted">Status:</span>
//                     <div className="fw-bold">
//                       {selectedRecord?.logoutTime
//                         ? selectedRecord?.isHalfDay
//                           ? "Half Day"
//                           : selectedRecord?.status === "present"
//                             ? "Present"
//                             : "Absent"
//                         : "Working (Logged in)"}
//                     </div>
//                   </div>
//                 </div>
//               </div>
//               <div className="modal-footer bg-light border-top-0">
//                 <button
//                   type="button"
//                   className="btn btn-sm btn-secondary"
//                   onClick={() => setShowModal(false)}
//                 >
//                   Close
//                 </button>
//               </div>
//             </div>

//             <td>
//   {att.punches.map((p, i) => (
//     <div key={i}>
//       In: {new Date(p.in).toLocaleTimeString()} &nbsp;
//       Out: {p.out ? new Date(p.out).toLocaleTimeString() : "--"}
//     </div>
//   ))}
//   <small className="text-muted">
//     Worked: {formatMinutes(att.totalWorkedMinutes)} • Break: {formatMinutes(att.totalBreakMinutes)}
//     {att.lunchBreakExceeded && <span className="text-danger ms-2">Lunch overage!</span>}
//   </small>
// </td>

//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

import { useEffect, useState, useMemo } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { FaCalendarAlt } from "react-icons/fa";
import {
  format,
  getDaysInMonth,
  startOfMonth,
  getDay,
  differenceInMinutes,
} from "date-fns";

/* --------------------------------------------------
   Helper: format minutes as "Xh Ym"
-------------------------------------------------- */
function formatMinutes(m) {
  if (m == null) return "—";
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${h}h ${min}m`;
}

/* --------------------------------------------------
   Main Component
-------------------------------------------------- */
export default function AttendanceCalendar({ employeeId }) {
  const [attendance, setAttendance] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  // calendar dropdown
  const [showCalendar, setShowCalendar] = useState(false);

  // modal state
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // monthly summary
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

  /* --------------------------------------------------
     Fetch monthly attendance when employee or month changes
  -------------------------------------------------- */
  useEffect(() => {
    if (!employeeId) return;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;

    const fetchAttendance = async () => {
      const res = await fetch(
        `/api/payroll/attendance/monthly?employeeId=${employeeId}&year=${year}&month=${month}`
      );
      const data = await res.json();
      const list = data.data || [];
      setAttendance(list);
      computeSummary(list, year, month);
    };

    fetchAttendance();
  }, [employeeId, currentDate]);

  /* --------------------------------------------------
     Build grid days for calendar view
  -------------------------------------------------- */
  const calendarDays = useMemo(() => {
    const days = [];
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getDay(startOfMonth(currentDate));
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, [currentDate]);

  /* --------------------------------------------------
     Helper: get record for day
  -------------------------------------------------- */
  const getRecord = (day) => {
    const dateStr = format(
      new Date(currentDate.getFullYear(), currentDate.getMonth(), day),
      "yyyy-MM-dd"
    );
    return attendance.find((a) => a.date === dateStr);
  };

  /* --------------------------------------------------
     Determine status for a given day + record
     (uses your existing logic; feel free to adjust)
  -------------------------------------------------- */
  const getStatus = (record, dateObj) => {
    const today = new Date();
    if (dateObj > today) return null;

    // Sunday?
    if (getDay(dateObj) === 0) return "weekend";

    if (!record) return "absent";

    // If punches → treat as working/present
    if (record.punches?.length > 0) {
      // Any open punch?
      const lastPunch = record.punches[record.punches.length - 1];
      if (!lastPunch.out) return "onDuty";
      // Completed day: half or full?
      return record.isHalfDay ? "half" : "present";
    }

    // Legacy fallbacks
    if (record.loginTime && !record.logoutTime) return "onDuty";
    if (record.status === "present")
      return record.isHalfDay ? "half" : "present";
    if (record.status === "leave") return "paidLeave"; // map if used
    return "absent";
  };

  /* --------------------------------------------------
     Badge renderer
  -------------------------------------------------- */
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

  /* --------------------------------------------------
     Summary calc (based on your existing approach)
  -------------------------------------------------- */
  const computeSummary = (list, year, month) => {
    const today = new Date();
    let present = 0,
      halfDay = 0,
      onDuty = 0,
      paidLeave = 0,
      unpaidLeave = 0,
      weekend = 0;

    const totalDaysInMonth = getDaysInMonth(new Date(year, month - 1));
    let workingDays = 0;

    for (let i = 1; i <= totalDaysInMonth; i++) {
      const dateObj = new Date(year, month - 1, i);
      if (dateObj > today) continue;
      const weekday = getDay(dateObj);
      if (weekday === 0) {
        weekend++;
        continue;
      }
      workingDays++;

      const record = list.find((r) => r.date === format(dateObj, "yyyy-MM-dd"));
      if (record) {
        if (record.loginTime && !record.logoutTime) {
          onDuty++;
        } else if (record.status === "present") {
          if (record.isHalfDay) halfDay++;
          else present++;
        } else if (record.status === "onDuty") {
          onDuty++;
        } else if (record.status === "paidLeave") {
          paidLeave++;
        } else if (record.status === "unpaidLeave") {
          unpaidLeave++;
        }
      }
    }

    const totalLogged =
      present + halfDay * 0.5 + onDuty + paidLeave + unpaidLeave;
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
  };

  /* --------------------------------------------------
     Modal open
  -------------------------------------------------- */
  const openModal = (record, day) => {
    if (!record) return;
    setSelectedRecord({ ...record, displayDay: day });
    setShowModal(true);
  };

  /* --------------------------------------------------
     Duration helper (legacy)
  -------------------------------------------------- */
  const getDuration = (login, logout) => {
    if (!login || !logout) return null;
    const loginDate = typeof login === "string" ? new Date(login) : login;
    const logoutDate = typeof logout === "string" ? new Date(logout) : logout;
    const mins = differenceInMinutes(logoutDate, loginDate);
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    return `${hrs}h ${rem}m`;
  };

  /* --------------------------------------------------
     Render
  -------------------------------------------------- */
  return (
    <div
      className="mt-4"
      style={{ border: "1px solid #dee2e6", borderRadius: 6, padding: 15 }}
    >
      <h5>{format(currentDate, "MMMM yyyy")} Attendance</h5>

      <div className="table-responsive">
        {/* Summary box */}
        <div className="mb-4 p-3 border rounded bg-light">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="mb-0 fw-bold">Attendance Summary</h6>

            {/* Month picker dropdown */}
            <div className="position-relative mb-4 mb-md-0">
              <div
                className="btn btn-outline-secondary d-flex align-items-center gap-2"
                onClick={() => setShowCalendar((prev) => !prev)}
                style={{ borderRadius: "8px", cursor: "pointer" }}
              >
                <FaCalendarAlt />
                <span>{format(currentDate, "dd MMM yyyy")}</span>
                <span className="ms-auto dropdown-toggle" />
              </div>

              {showCalendar && (
                <div
                  className="position-absolute calendar-dropdown shadow mt-2"
                  style={{
                    zIndex: 1000,
                    backgroundColor: "#f8f9fa",
                    borderRadius: "10px",
                    padding: "10px",
                    minWidth: "260px",
                    fontSize: "0.85rem",
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
                    className="custom-calendar"
                    tileClassName={({ date }) => {
                      if (date.toDateString() === new Date().toDateString()) {
                        return "current-day";
                      }
                      return "";
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Summary metrics */}
          <div className="row g-3">
            {[
              {
                label: "Payable Days",
                value: summary.payable,
                className: "text-primary",
              },
              {
                label: "Present",
                value: `${summary.present} Full, ${summary.halfDay} Half`,
                className: "text-success",
              },
              {
                label: "On-duty",
                value: summary.onDuty,
                className: "text-info",
              },
              {
                label: "Paid Leaves",
                value: summary.paidLeave,
                className: "text-warning",
              },
              {
                label: "Unpaid Leaves",
                value: summary.unpaidLeave,
                className: "text-secondary",
              },
              {
                label: "Absent",
                value: summary.absent,
                className: "text-danger",
              },
              {
                label: "Weekend",
                value: summary.weekend,
                className: "text-muted",
              },
            ].map((item, i) => (
              <div key={i} className="col-6 col-md-4 col-lg-2">
                <div className="border rounded p-3 text-center bg-white shadow-sm h-100">
                  <div className="fw-semibold text-muted small">
                    {item.label}
                  </div>
                  <div className={`fs-5 fw-bold ${item.className}`}>
                    {item.value}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Calendar grid */}
        <table className="table table-borderless text-center">
          <thead>
            <tr className="table-light">
              <th>Sun</th>
              <th>Mon</th>
              <th>Tue</th>
              <th>Wed</th>
              <th>Thu</th>
              <th>Fri</th>
              <th>Sat</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(Math.ceil(calendarDays.length / 7))].map(
              (_, weekIdx) => (
                <tr key={weekIdx}>
                  {[...Array(7)].map((_, dayIdx) => {
                    const index = weekIdx * 7 + dayIdx;
                    const day = calendarDays[index];
                    const dateObj = day
                      ? new Date(
                          currentDate.getFullYear(),
                          currentDate.getMonth(),
                          day
                        )
                      : null;
                    const record = day ? getRecord(day) : null;
                    const status = day ? getStatus(record, dateObj) : null;

                    return (
                      <td key={dayIdx}>
                        {day ? (
                          <div
                            onClick={() => openModal(record, day)}
                            className="d-flex flex-column align-items-center justify-content-center"
                            style={{
                              border: "1px solid #dee2e6",
                              borderRadius: 8,
                              padding: 10,
                              minHeight: 75,
                              backgroundColor: "#fff",
                              transition: "0.2s",
                              cursor: "pointer",
                              boxShadow: "0 0 0 rgba(0,0,0,0)",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.boxShadow =
                                "0 0 10px rgba(0,0,0,0.1)")
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.boxShadow =
                                "0 0 0 rgba(0,0,0,0)")
                            }
                          >
                            <strong>{day}</strong>
                            <div style={{ fontSize: "0.75rem", marginTop: 4 }}>
                              {getBadge(status)}
                            </div>
                          </div>
                        ) : (
                          ""
                        )}
                      </td>
                    );
                  })}
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

      {/* ---------------- Modal ---------------- */}
      {showModal && (
        <div
          className="modal fade show"
          tabIndex="-1"
          aria-modal="true"
          role="dialog"
          style={{
            display: "block",
            position: "fixed",
            zIndex: 1055,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            overflow: "auto",
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="modal-dialog modal-dialog-centered modal-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-content shadow-lg">
              <div className="modal-header bg-light border-bottom-0">
                <h5 className="modal-title">
                  🕒 Attendance – {selectedRecord?.displayDay}{" "}
                  {format(currentDate, "MMMM yyyy")}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                />
              </div>

              <div className="modal-body">
                {/* Punch table */}
                {selectedRecord?.punches?.length ? (
                  <div className="mb-4">
                    <h6 className="fw-semibold mb-2">Punches</h6>
                    <table className="table table-sm">
                      <thead>
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
                              <td>
                                {outDt ? outDt.toLocaleTimeString() : "—"}
                              </td>
                              <td>{dur}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted">No punches recorded.</p>
                )}

                <div className="row mb-2">
                  <div className="col-6">
                    <span className="fw-semibold text-muted">
                      Total Worked:
                    </span>
                    <div>
                      {formatMinutes(selectedRecord?.totalWorkedMinutes)}
                    </div>
                  </div>
                  <div className="col-6">
                    <span className="fw-semibold text-muted">
                      Total Breaks:
                    </span>
                    <div>
                      {formatMinutes(selectedRecord?.totalBreakMinutes)}
                      {selectedRecord?.lunchBreakExceeded && (
                        <span className="text-danger ms-1">
                          (Lunch overage!)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Totals i have to uncomment  this part if any issue will  appear on the dashbaord */}
                {/* <div className="row mb-2">
                  <div className="col-6">
                    <span className="fw-semibold text-muted">
                      Total Worked:
                    </span>
                    <div>
                      {formatMinutes(selectedRecord?.totalWorkedMinutes)}
                    </div>
                  </div>
                  <div className="col-6">
                    <span className="fw-semibold text-muted">
                      Total Breaks:
                    </span>
                    <div>
                      {formatMinutes(selectedRecord?.totalBreakMinutes)}
                      {selectedRecord?.lunchBreakExceeded && (
                        <span className="text-danger ms-1">
                          (Lunch overage!)
                        </span>
                      )}
                    </div>
                  </div>
                </div> */}

                {/* Legacy summary / fallback */}
                {!selectedRecord?.punches?.length && (
                  <div className="row mb-3">
                    <div className="col-6">
                      <span className="fw-semibold text-muted">
                        Login Time:
                      </span>
                      <div className="text-dark">
                        {selectedRecord?.loginTime
                          ? new Date(
                              selectedRecord.loginTime
                            ).toLocaleTimeString()
                          : "—"}
                      </div>
                    </div>
                    <div className="col-6">
                      <span className="fw-semibold text-muted">
                        Logout Time:
                      </span>
                      <div className="text-dark">
                        {selectedRecord?.logoutTime
                          ? new Date(
                              selectedRecord.logoutTime
                            ).toLocaleTimeString()
                          : "—"}
                      </div>
                    </div>
                    <div className="col-12 mt-2">
                      <span className="fw-semibold text-muted">
                        Total Hours:
                      </span>
                      <div className="text-dark">
                        {getDuration(
                          selectedRecord?.loginTime,
                          selectedRecord?.logoutTime
                        ) || "—"}
                      </div>
                    </div>
                  </div>
                )}

                {/* Status */}
                <div className="mt-3">
                  <span className="fw-semibold text-muted">Status:</span>{" "}
                  <span className="fw-bold">
                    {selectedRecord?.status === "present"
                      ? selectedRecord?.isHalfDay
                        ? "Half Day"
                        : "Present"
                      : selectedRecord?.status === "paidLeave"
                        ? "Paid Leave"
                        : selectedRecord?.status === "unpaidLeave"
                          ? "Unpaid Leave"
                          : selectedRecord?.status === "onDuty"
                            ? "On Duty"
                            : "Absent"}
                  </span>
                </div>
              </div>

              <div className="modal-footer bg-light border-top-0">
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* --------------- End Modal --------------- */}
    </div>
  );
}

// import { useEffect, useState } from "react";

// export default function MonthlyReportModal({ employeeId, month, onClose }) {
//   const [loading, setLoading] = useState(true);
//   const [report, setReport] = useState(null);
//   const [selectedMonth, setSelectedMonth] = useState(month);

// useEffect(() => {
//   if (!employeeId || !selectedMonth) return;

//   const fetchReport = async () => {
//     setLoading(true);
//     try {
//       const res = await fetch(
//         `/api/employee/monthly?employeeId=${employeeId}&month=${selectedMonth}`
//       );
//       const data = await res.json();
//       if (data.success) {
//         // 🧠 Generate all days in this month
//         const [year, monthPart] = selectedMonth.split("-");
//         const totalDays = new Date(year, parseInt(monthPart), 0).getDate();
//         const allDates = Array.from({ length: totalDays }, (_, i) => {
//           const d = new Date(year, parseInt(monthPart) - 1, i + 1);
//           return d.toISOString().split("T")[0];
//         });

//         // 🧩 Map existing records
//         const existingDates = new Set(data.records.map((r) => r.date));

//         const now = new Date();
//         const todayDate = now.toISOString().split("T")[0];
//         const currentHour = now.getHours();

//         // 🏖️ Add "Leave" only if:
//         // - date < today
//         // - OR (date === today && time >= 18)
//         const leaveRecords = allDates
//           .filter((d) => !existingDates.has(d))
//           .filter((d) => {
//             if (d < todayDate) return true; // past day
//             if (d === todayDate && currentHour >= 18) return true; // today after 6 PM
//             return false; // future day or before 6 PM
//           })
//           .map((d) => ({
//             date: d,
//             checkIn: "-",
//             checkOut: "-",
//             status: "Leave",
//           }));

//         const fullRecords = [...data.records, ...leaveRecords].sort(
//           (a, b) => new Date(a.date) - new Date(b.date)
//         );

//         setReport({
//           ...data,
//           records: fullRecords,
//         });
//       }
//     } catch (err) {
//       console.error("❌ Monthly report fetch error:", err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   fetchReport();
// }, [employeeId, selectedMonth]);


//   if (!employeeId) return null;

//   // 📤 Export CSV
//   const exportCSV = () => {
//     if (!report) return;
//     const header = ["Date,Check In,Check Out,Status\n"];
//     const rows = report.records.map(
//       (r) => `${r.date},${r.checkIn},${r.checkOut},${r.status}`
//     );
//     const csv = header + rows.join("\n");

//     const blob = new Blob([csv], { type: "text/csv" });
//     const url = window.URL.createObjectURL(blob);

//     const a = document.createElement("a");
//     a.href = url;
//     a.download = `${report.employee?.name || "employee"}_${selectedMonth}.csv`;
//     a.click();
//   };

//   return (
//     <div className="modal-backdrop">
//       <div className="modal-content">
//         {/* Header */}
//         <div className="modal-header">
//           <div className="employee-info">
//             {report?.employee?.avatar && (
//               <img
//                 src={report.employee.avatar}
//                 alt="avatar"
//                 className="avatar"
//               />
//             )}
//             <div>
//               <h3 className="mb-0">{report?.employee?.name || "Employee"}</h3>
//               <p className="designation mb-0">
//                 {report?.employee?.designation} • {report?.employee?.type}
//               </p>
//             </div>
//           </div>

//           <button className="close-btn" onClick={onClose}>
//             ✕
//           </button>
//         </div>

//         {/* Month Picker */}
//         <div className="controls">
//           <input
//             type="month"
//             value={selectedMonth}
//             onChange={(e) => setSelectedMonth(e.target.value)}
//           />
//           <button className="export-btn" onClick={exportCSV}>
//             ⬇ Export CSV
//           </button>
//         </div>

//         {/* Content */}
//         {loading ? (
//           <p>Loading...</p>
//         ) : report ? (
//           <>
//             {/* Summary */}
//             <div className="summary-cards">
//               <div className="card total">
//                 <h5>Total Days</h5>
//                 <p>{report.summary.totalDays}</p>
//               </div>
//               <div className="card on-time">
//                 <h5>On Time</h5>
//                 <p>{report.summary.onTime}</p>
//               </div>
//               <div className="card late">
//                 <h5>Late</h5>
//                 <p>{report.summary.late}</p>
//               </div>
//               <div className="card missing">
//                 <h5>Missing Checkout</h5>
//                 <p>{report.summary.missingCheckout}</p>
//               </div>
//               <div className="card gray">
//                 <h5>Not Clocked In</h5>
//                 <p>{report.summary.notClockedIn}</p>
//               </div>

//               <div className="card leave">
//                 <h5>Leave</h5>
//                 <p>{report.records.filter((r) => r.status === "Leave").length}</p>
//               </div>

//             </div>

//             {/* Records */}
//             <table className="styled-table">
//               <thead>
//                 <tr>
//                   <th>Date</th>
//                   <th>Check In</th>
//                   <th>Check Out</th>
//                   <th>Status</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {report.records.map((r, idx) => (
//                   <tr key={idx}>
//                     <td>{r.date}</td>
//                     <td>{r.checkIn}</td>
//                     <td>{r.checkOut}</td>
//                     <td className={`status ${r.status.toLowerCase()}`}>
//                       {r.status}
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </>
//         ) : (
//           <p>No report found.</p>
//         )}
//       </div>

//       <style jsx>{`
//         .modal-backdrop {
//           position: fixed;
//           inset: 0;
//           background: rgba(0, 0, 0, 0.5);
//           display: flex;
//           justify-content: center;
//           align-items: center;
//           z-index: 9999;
//         }
//         .modal-content {
//           background: #fff;
//           border-radius: 12px;
//           padding: 24px;
//           width: 95%;
//           max-width: 900px;
//           max-height: 90vh;
//           overflow-y: auto;
//           box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
//         }
//         .modal-header {
//           display: flex;
//           justify-content: space-between;
//           align-items: center;
//           margin-bottom: 20px;
//           padding-left: 0 !important;
//         }
//         .employee-info {
//           display: flex;
//           align-items: center;
//           gap: 12px;
//         }
//         .avatar {
//           width: 48px;
//           height: 48px;
//           border-radius: 50%;
//           object-fit: cover;
//         }
//         .designation {
//           font-size: 0.9rem;
//           color: #666;
//         }
//         .close-btn {
//           border: none;
//           background: #f45b69;
//           color: #fff;
//           border-radius: 50%;
//           width: 32px;
//           height: 32px;
//           font-size: 18px;
//           cursor: pointer;
//         }
//         .controls {
//           display: flex;
//           justify-content: space-between;
//           margin-bottom: 20px;
//         }
//         .controls input[type="month"] {
//           padding: 6px 12px;
//           border-radius: 6px;
//           border: 1px solid #ccc;
//         }
//         .export-btn {
//           background: #3fc28a;
//           color: #fff;
//           border: none;
//           padding: 6px 12px;
//           border-radius: 6px;
//           cursor: pointer;
//         }
//         .summary-cards {
//           display: grid;
//           grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
//           gap: 16px;
//           margin-bottom: 20px;
//         }
//         .summary-cards .card {
//           padding: 16px;
//           border-radius: 10px;
//           color: #fff;
//           text-align: center;
//           box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
//         }
//         .card.total {
//           background: #5a3fd8;
//         }
//         .card.on-time {
//           background: #3fc28a;
//         }
//         .card.late {
//           background: #f45b69;
//         }
//         .card.missing {
//           background: #ffc107;
//           color: #000;
//         }
//         .card.gray {
//           background: #6c757d;
//         }
//         .styled-table {
//           width: 100%;
//           border-collapse: collapse;
//         }
//         .styled-table th,
//         .styled-table td {
//           padding: 12px;
//           border-bottom: 1px solid #ddd;
//           text-align: center;
//         }
//         .styled-table tbody tr:hover {
//           background: #f9f9f9;
//         }
//         .status.on\ time {
//           color: #3fc28a;
//           font-weight: bold;
//         }
//         .status.late {
//           color: #f45b69;
//           font-weight: bold;
//         }
//         .status.missing\ checkout {
//           color: #ffc107;
//           font-weight: bold;
//         }
//         .status.not\ clocked\ in {
//           color: #6c757d;
//           font-weight: bold;
//         }
//         .card h5 {
//           font-size: 17px !important;
//           font-weight: bold;
//         }
//         .card p {
//           margin-bottom: 0 !important;
//         }
//       `}</style>
//     </div>
//   );
// }





import { useEffect, useState } from "react";

export default function MonthlyReportModal({ employeeId, month, onClose }) {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);

  // 👇 Initialize empty to avoid SSR default (which uses UTC)
const [selectedMonth, setSelectedMonth] = useState("");

// ✅ Always compute local month after mount (browser only)
useEffect(() => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  const localMonth = local.getMonth() + 1;
  const localYear = local.getFullYear();
  const formatted = `${localYear}-${String(localMonth).padStart(2, "0")}`;

  setSelectedMonth(month || formatted);
}, [month]);




  // Office time (24h format)
  const dutyStartHour = 10; // 10 AM
  const dutyEndHour = 18; // 6 PM

  // Local YYYY-MM-DD helper
  const getLocalDateString = (date = new Date()) => {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().split("T")[0];
  };

  useEffect(() => {
    if (!employeeId || !selectedMonth) return;

    const fetchReport = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/employee/monthly?employeeId=${employeeId}&month=${selectedMonth}`
        );
        const data = await res.json();

        if (!data.success) {
          setReport(null);
          setLoading(false);
          return;
        }

        const [yearStr, monthStr] = selectedMonth.split("-");
        const year = parseInt(yearStr);
        const monthIndex = parseInt(monthStr) - 1;

        const totalDays = new Date(year, monthIndex + 1, 0).getDate();
        const allDates = Array.from({ length: totalDays }, (_, i) => {
          const d = new Date(year, monthIndex, i + 1);
          return getLocalDateString(d);
        });

        const apiRecords = (data.records || []).filter((r) =>
          r.date.startsWith(selectedMonth)
        );

        const existing = new Map();
        apiRecords.forEach((r) => existing.set(r.date, r));

        const now = new Date();
        const today = getLocalDateString(now);

        const normalizeRecord = (r) => {
          const rec = { ...r };
          const hasCheckIn = r.checkIn && r.checkIn !== "-" && r.checkIn !== null;
          const hasCheckOut = r.checkOut && r.checkOut !== "-" && r.checkOut !== null;

          if (hasCheckIn && !hasCheckOut) {
            if (r.date === today) {
              // ✅ Today — not missing checkout yet, still on duty
              rec.computedStatus = "On Duty";
            } else {
              // ✅ Only mark Missing Checkout if the date is BEFORE today
              rec.computedStatus = "Missing Checkout";
            }
          } else if (!hasCheckIn) {
            rec.computedStatus = r.status || "Not Clocked In";
          } else {
            rec.computedStatus = r.status || "On Time";
          }

          return rec;
        };

        // ✅ Only mark leave for days before today (no future or today if not after dutyEnd)
        const leaveRecords = allDates
          .filter((d) => !existing.has(d))
          .filter((d) => d < today)
          .map((d) => ({
            date: d,
            checkIn: "-",
            checkOut: "-",
            status: "Leave",
            computedStatus: "Leave",
          }));

        const normalized = apiRecords.map(normalizeRecord);
        const merged = [...normalized, ...leaveRecords].sort(
          (a, b) => new Date(a.date) - new Date(b.date)
        );

        const summary = {
          totalDays,
          onTime: merged.filter((r) => (r.computedStatus || r.status) === "On Time").length,
          late: merged.filter((r) => (r.computedStatus || r.status) === "Late").length,
          missingCheckout: merged.filter(
            (r) => (r.computedStatus || r.status) === "Missing Checkout"
          ).length,
          notClockedIn: merged.filter((r) =>
            ["Not Clocked In", "Not ClockedIn"].includes(
              r.computedStatus || r.status
            )
          ).length,
          leave: merged.filter((r) => (r.computedStatus || r.status) === "Leave").length,
        };

        setReport({
          employee: data.employee,
          summary,
          records: merged,
        });
      } catch (err) {
        console.error("❌ Monthly report fetch error:", err);
        setReport(null);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [employeeId, selectedMonth]);

  const exportCSV = () => {
    if (!report) return;
    const header = "Date,Check In,Check Out,Status\n";
    const rows = report.records.map((r) => {
      const status = r.computedStatus || r.status || "";
      return `${r.date},${r.checkIn || "-"},${r.checkOut || "-"},${status}`;
    });
    const csv = header + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.employee?.name || "employee"}_${selectedMonth}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const statusClass = (s) => (s ? s.toLowerCase().replace(/\s+/g, "-") : "");

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <div className="modal-header">
          <div className="employee-info">
            {report?.employee?.avatar && (
              <img src={report.employee.avatar} alt="avatar" className="avatar" />
            )}
            <div>
              <h3 className="mb-0">{report?.employee?.name || "Employee"}</h3>
              <p className="designation mb-0">
                {report?.employee?.designation} • {report?.employee?.type}
              </p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="controls">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
          <button className="export-btn" onClick={exportCSV}>
            ⬇ Export CSV
          </button>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : report ? (
          <>
            <div className="summary-cards">
              <div className="card total"><h5>Total Days</h5><p>{report.summary.totalDays}</p></div>
              <div className="card on-time"><h5>On Time</h5><p>{report.summary.onTime}</p></div>
              <div className="card late"><h5>Late</h5><p>{report.summary.late}</p></div>
              <div className="card missing"><h5>Missing Checkout</h5><p>{report.summary.missingCheckout}</p></div>
              {/* <div className="card gray"><h5>Not Clocked In</h5><p>{report.summary.notClockedIn}</p></div> */}
              <div className="card leave"><h5>Leave</h5><p>{report.summary.leave}</p></div>
            </div>

            <table className="styled-table">
              <thead>
                <tr><th>Date</th><th>Check In</th><th>Check Out</th><th>Status</th></tr>
              </thead>
              <tbody>
                {report.records.map((r, idx) => (
                  <tr key={r.date + idx}>
                    <td>{r.date}</td>
                    <td>{r.checkIn || "-"}</td>
                    <td>{r.checkOut || "-"}</td>
                    <td className={`status ${statusClass(r.computedStatus || r.status)}`}>
                      {r.computedStatus || r.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <p>No report found.</p>
        )}
      </div>
      
         <style jsx>{`
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 9999;
        }
        .modal-content {
          background: #fff;
          border-radius: 12px;
          padding: 24px;
          width: 95%;
          max-width: 900px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-left: 0 !important;
        }
        .employee-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          object-fit: cover;
        }
        .designation {
          font-size: 0.9rem;
          color: #666;
        }
        .close-btn {
          border: none;
          background: #f45b69;
          color: #fff;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          font-size: 18px;
          cursor: pointer;
        }
        .controls {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .controls input[type="month"] {
          padding: 6px 12px;
          border-radius: 6px;
          border: 1px solid #ccc;
        }
        .export-btn {
          background: #3fc28a;
          color: #fff;
          border: none;
          padding: 6px 12px;
          border-radius: 6px;
          cursor: pointer;
        }
        .summary-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 16px;
          margin-bottom: 20px;
        }
        .summary-cards .card {
          padding: 16px;
          border-radius: 10px;
          color: #fff;
          text-align: center;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        .card.total {
          background: #5a3fd8;
        }
        .card.on-time {
          background: #3fc28a;
        }
        .card.late {
          background: #f45b69;
        }
        .card.missing {
          background: #ffc107;
          color: #000;
        }
        .card.gray {
          background: #6c757d;
        }
        .card.leave {
          background: #17a2b8;
        }
        .styled-table {
          width: 100%;
          border-collapse: collapse;
        }
        .styled-table th,
        .styled-table td {
          padding: 12px;
          border-bottom: 1px solid #ddd;
          text-align: center;
        }
        .styled-table tbody tr:hover {
          background: #f9f9f9;
        }

        /* status classes (use the normalized class names) */
        .status.on-time {
          color: #3fc28a;
          font-weight: bold;
        }
        .status.late {
          color: #f45b69;
          font-weight: bold;
        }
        .status.missing-checkout {
          color: #ffc107;
          font-weight: bold;
        }
        .status.not-clocked-in {
          color: #6c757d;
          font-weight: bold;
        }
        .status.leave {
          color: #17a2b8;
          font-weight: bold;
        }
        .status.on-duty {
          color: #0d6efd;
          font-weight: 600;
        }
        .card h5 {
          font-size: 17px !important;
          font-weight: bold;
        }
        .card p {
          margin-bottom: 0 !important;
        }

        /* responsive tweaks */
        @media (max-width: 640px) {
          .modal-content {
            padding: 16px;
          }
          .avatar {
            width: 40px;
            height: 40px;
          }
        }
      `}</style>

    </div>
  );
}

  

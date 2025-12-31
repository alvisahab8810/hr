// import { useEffect, useMemo, useState } from "react";

// const MONTH_NAMES = [
//   "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
//   "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
// ];

// // Try to extract {year, month} from slip data in any format
// function normalizeSlipPeriod(slip) {
//   let yr = slip.year;         // may exist
//   let mo = slip.month;        // might be "2025-06", "06", "June", "Jun"

//   // If month looks like YYYY-MM
//   if (typeof mo === "string" && /^\d{4}-\d{2}$/.test(mo)) {
//     const [y, m] = mo.split("-");
//     yr = Number(y);
//     mo = m;
//   }

//   // If month is numeric string but no year provided
//   if (typeof mo === "string" && /^\d{1,2}$/.test(mo) && !yr) {
//     mo = mo.padStart(2, "0");
//     yr = slip.createdAt ? new Date(slip.createdAt).getFullYear() : null;
//   }

//   // If month is a month name
//   if (typeof mo === "string" && /^[A-Za-z]+$/.test(mo)) {
//     const idx = MONTH_NAMES.findIndex(
//       (m) => m.toLowerCase() === mo.slice(0, 3).toLowerCase()
//     );
//     if (idx > 0) mo = String(idx).padStart(2, "0");
//     if (!yr && slip.createdAt) {
//       yr = new Date(slip.createdAt).getFullYear();
//     }
//   }

//   // Fallbacks
//   const monthNum = Number(mo) || null;
//   const yearNum = Number(yr) || null;

//   return {
//     monthNum,
//     yearNum,
//     // Display friendly string:
//     display: monthNum && yearNum
//       ? `${MONTH_NAMES[monthNum]} ${yearNum}`
//       : slip.month || "—"
//   };
// }

// export default function MySalarySlips() {
//   const [slips, setSlips] = useState([]);
//   const [loading, setLoading] = useState(true);

//   // Filters
//   const [filterMonth, setFilterMonth] = useState(""); // "06"
//   const [filterYear, setFilterYear] = useState("");   // "2025"

//   // Pagination
//   const [currentPage, setCurrentPage] = useState(1);
//   const rowsPerPage = 10;

//   useEffect(() => {
//     fetchSlips();
//   }, []);

//   const fetchSlips = async () => {
//     try {
//       const res = await fetch("/api/payroll/employees/salary-slip/list");
//       const data = await res.json();
//       if (data.success) {
//         setSlips(data.slips);
//       }
//     } catch (err) {
//       console.error("Error fetching slips:", err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const downloadSlip = async (slipId) => {
//     try {
//       const res = await fetch("/api/payroll/salary-slip/generate-pdf", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ slipId }),
//       });
//       const data = await res.json();
//       if (data.success) {
//         window.open(data.pdfUrl, "_blank");
//       }
//     } catch (err) {
//       console.error("Download error:", err);
//     }
//   };

//   // Build enriched slip objects once
//   const enrichedSlips = useMemo(() => {
//     return slips.map((slip) => {
//       const norm = normalizeSlipPeriod(slip);
//       return {
//         ...slip,
//         __monthNum: norm.monthNum,
//         __yearNum: norm.yearNum,
//         __display: norm.display,
//       };
//     });
//   }, [slips]);

//   // Apply filters
//   const filteredSlips = useMemo(() => {
//     return enrichedSlips.filter((slip) => {
//       const mOk = !filterMonth || slip.__monthNum === Number(filterMonth);
//       const yOk = !filterYear || slip.__yearNum === Number(filterYear);
//       return mOk && yOk;
//     });
//   }, [enrichedSlips, filterMonth, filterYear]);

//   // Pagination
//   const totalPages = Math.ceil(filteredSlips.length / rowsPerPage) || 1;
//   const currentSlips = filteredSlips.slice(
//     (currentPage - 1) * rowsPerPage,
//     currentPage * rowsPerPage
//   );

//   const handlePageChange = (page) => setCurrentPage(page);

//   // Build Year dropdown options from data
//   const yearOptions = Array.from(
//     new Set(enrichedSlips.map((s) => s.__yearNum).filter(Boolean))
//   ).sort((a, b) => b - a); // latest first

//   return (
//     <div className="container mt-4">
//       <h4 className="mb-4">My Salary Slips</h4>

//       {/* Filters Row */}
//       <div className="row g-2 mb-3">
//         {/* Month Filter */}
//         <div className="col-auto">
//           <select
//             className="form-select form-select-sm"
//             value={filterMonth}
//             onChange={(e) => {
//               setFilterMonth(e.target.value);
//               setCurrentPage(1);
//             }}
//           >
//             <option value="">All Months</option>
//             {MONTH_NAMES.map((name, idx) =>
//               idx === 0 ? null : (
//                 <option key={idx} value={String(idx).padStart(2, "0")}>
//                   {name}
//                 </option>
//               )
//             )}
//           </select>
//         </div>

//         {/* Year Filter */}
//         <div className="col-auto">
//           <select
//             className="form-select form-select-sm"
//             value={filterYear}
//             onChange={(e) => {
//               setFilterYear(e.target.value);
//               setCurrentPage(1);
//             }}
//           >
//             <option value="">All Years</option>
//             {yearOptions.map((y) => (
//               <option key={y} value={y}>
//                 {y}
//               </option>
//             ))}
//           </select>
//         </div>

//         {/* Combined month picker (optional convenience) */}
//         <div className="col-auto">
//           <input
//             type="month"
//             className="form-control form-control-sm"
//             onChange={(e) => {
//               if (!e.target.value) {
//                 setFilterMonth("");
//                 setFilterYear("");
//                 setCurrentPage(1);
//                 return;
//               }
//               const [y, m] = e.target.value.split("-");
//               setFilterMonth(m);
//               setFilterYear(y);
//               setCurrentPage(1);
//             }}
//           />
//         </div>

//         {/* Clear */}
//         <div className="col-auto">
//           <button
//             className="btn btn-outline-secondary btn-sm"
//             onClick={() => {
//               setFilterMonth("");
//               setFilterYear("");
//               setCurrentPage(1);
//             }}
//           >
//             Clear
//           </button>
//         </div>
//       </div>

//       {loading ? (
//         <p>Loading...</p>
//       ) : (
//         <>
//           <div className="table-responsive">
//             <table className="table table-sm table-striped align-middle">
//               <thead className="table-light">
//                 <tr>
//                   <th>Period</th>
//                   <th className="text-end">Net Pay (₹)</th>
//                   <th className="text-center">Action</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {currentSlips.length === 0 ? (
//                   <tr>
//                     <td colSpan="3" className="text-center py-4">
//                       No salary slips found.
//                     </td>
//                   </tr>
//                 ) : (
//                   currentSlips.map((slip) => (
//                     <tr key={slip._id}>
//                       <td>{slip.__display}</td>
//                       <td className="text-end">₹{slip.netPay}</td>
//                       <td className="text-center">
//                         <button
//                           className="btn btn-primary btn-sm"
//                           onClick={() => downloadSlip(slip._id)}
//                         >
//                           Download Slip
//                         </button>
//                       </td>
//                     </tr>
//                   ))
//                 )}
//               </tbody>
//             </table>
//           </div>

//           {/* Pagination */}
//           {totalPages > 1 && (
//             <nav className="mt-2">
//               <ul className="pagination pagination-sm justify-content-center mb-0">
//                 {Array.from({ length: totalPages }, (_, i) => i + 1).map(
//                   (p) => (
//                     <li
//                       key={p}
//                       className={`page-item ${currentPage === p ? "active" : ""}`}
//                     >
//                       <button
//                         className="page-link"
//                         onClick={() => handlePageChange(p)}
//                       >
//                         {p}
//                       </button>
//                     </li>
//                   )
//                 )}
//               </ul>
//             </nav>
//           )}
//         </>
//       )}
//     </div>
//   );
// }

import { useEffect, useMemo, useState } from "react";

const MONTH_NAMES = [
  "",
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function normalizeSlipPeriod(slip) {
  let yr = slip.year;
  let mo = slip.month;

  if (typeof mo === "string" && /^\d{4}-\d{2}$/.test(mo)) {
    const [y, m] = mo.split("-");
    yr = Number(y);
    mo = m;
  }

  if (typeof mo === "string" && /^\d{1,2}$/.test(mo) && !yr) {
    mo = mo.padStart(2, "0");
    yr = slip.createdAt ? new Date(slip.createdAt).getFullYear() : null;
  }

  if (typeof mo === "string" && /^[A-Za-z]+$/.test(mo)) {
    const idx = MONTH_NAMES.findIndex(
      (m) => m.toLowerCase() === mo.slice(0, 3).toLowerCase()
    );
    if (idx > 0) mo = String(idx).padStart(2, "0");
    if (!yr && slip.createdAt) {
      yr = new Date(slip.createdAt).getFullYear();
    }
  }

  const monthNum = Number(mo) || null;
  const yearNum = Number(yr) || null;

  return {
    monthNum,
    yearNum,
    display:
      monthNum && yearNum
        ? `${MONTH_NAMES[monthNum]} ${yearNum}`
        : slip.month || "—",
  };
}

export default function MySalarySlips() {
  const [slips, setSlips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null); // ✅ Track which slip is downloading

  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  useEffect(() => {
    fetchSlips();
  }, []);

  const fetchSlips = async () => {
    try {
      const res = await fetch("/api/payroll/employees/salary-slip/list");
      const data = await res.json();
      if (data.success) {
        setSlips(data.slips);
      }
    } catch (err) {
      console.error("Error fetching slips:", err);
    } finally {
      setLoading(false);
    }
  };

  const downloadSlip = async (slipId) => {
    try {
      setDownloadingId(slipId); // ✅ Show loading for this slip
      const res = await fetch("/api/payroll/salary-slip/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slipId }),
      });
      const data = await res.json();
      if (data.success) {
        window.open(data.pdfUrl, "_blank");
      } else {
        alert("Failed to generate PDF");
      }
    } catch (err) {
      console.error("Download error:", err);
      alert("Error generating PDF");
    } finally {
      setDownloadingId(null); // ✅ Reset after complete
    }
  };

  const enrichedSlips = useMemo(() => {
    return slips.map((slip) => {
      const norm = normalizeSlipPeriod(slip);
      return {
        ...slip,
        __monthNum: norm.monthNum,
        __yearNum: norm.yearNum,
        __display: norm.display,
      };
    });
  }, [slips]);

  const filteredSlips = useMemo(() => {
    return enrichedSlips.filter((slip) => {
      const mOk = !filterMonth || slip.__monthNum === Number(filterMonth);
      const yOk = !filterYear || slip.__yearNum === Number(filterYear);
      return mOk && yOk;
    });
  }, [enrichedSlips, filterMonth, filterYear]);

  const totalPages = Math.ceil(filteredSlips.length / rowsPerPage) || 1;
  const currentSlips = filteredSlips.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const handlePageChange = (page) => setCurrentPage(page);

  const yearOptions = Array.from(
    new Set(enrichedSlips.map((s) => s.__yearNum).filter(Boolean))
  ).sort((a, b) => b - a);

  return (
    <div className="container-salry">
      <h4 className="mb-3 fw-bold text-dark mt-0">My Salary Slips</h4>

      {/* Filters */}
      <div className="filters-bx row g-2 mb-3 mt-3">
        <div className="col-auto">
          <select
            className="form-select form-select-sm"
            value={filterMonth}
            onChange={(e) => {
              setFilterMonth(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All Months</option>
            {MONTH_NAMES.map((name, idx) =>
              idx === 0 ? null : (
                <option key={idx} value={String(idx).padStart(2, "0")}>
                  {name}
                </option>
              )
            )}
          </select>
        </div>

        <div className="col-auto">
          <select
            className="form-select form-select-sm"
            value={filterYear}
            onChange={(e) => {
              setFilterYear(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All Years</option>
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div className="col-auto">
          <input
            type="month"
            className="form-control form-control-sm"
            onChange={(e) => {
              if (!e.target.value) {
                setFilterMonth("");
                setFilterYear("");
                setCurrentPage(1);
                return;
              }
              const [y, m] = e.target.value.split("-");
              setFilterMonth(m);
              setFilterYear(y);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="col-auto mobile-none">
          <button
            className="circle-btn d-flex align-items-center"
            onClick={() => {
              setFilterMonth("");
              setFilterYear("");
              setCurrentPage(1);
            }}
            title="Clear Filters"
          >
            <i className="fas fa-times-circle"></i>
          </button>
        </div>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <div className="table-responsive">
            <table className="table table-sm table-striped align-middle">
              <thead className="table-light">
                <tr>
                  <th>Period</th>
                  <th className="text-end">Net Pay (₹)</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {currentSlips.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="text-center py-4">
                      No salary slips found.
                    </td>
                  </tr>
                ) : (
                  currentSlips.map((slip) => (
                    <tr key={slip._id}>
                      <td>{slip.__display}</td>
                      <td className="text-end">₹{slip.netPay}</td>
                      <td className="text-center">
                        <button
                          className="download-btn btn"
                          disabled={downloadingId === slip._id} // ✅ Disable during download
                          onClick={() => downloadSlip(slip._id)}
                        >
                          {downloadingId === slip._id
                            ? "Downloading..."
                            : "Download Slip"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <nav className="mt-2">
              <ul className="pagination pagination-sm justify-content-center mb-0">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (p) => (
                    <li
                      key={p}
                      className={`page-item ${
                        currentPage === p ? "active" : ""
                      }`}
                    >
                      <button
                        className="page-link"
                        onClick={() => handlePageChange(p)}
                      >
                        {p}
                      </button>
                    </li>
                  )
                )}
              </ul>
            </nav>
          )}
        </>
      )}
    </div>
  );
}

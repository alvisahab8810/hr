import { useState, useEffect } from "react";
import Dashnav from "@/components/Dashnav";
import Leftbar from "@/components/Leftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import Head from "next/head";
import Link from "next/link";

import { useRef } from "react";

export default function AttendanceDashboard() {
  const [view, setView] = useState("today"); // default = Today
  // const [date, setDate] = useState("2025-10-01");


  const dateInputRef = useRef(null);

  const [date, setDate] = useState(getTodayDateString());

  // ✅ DERIVED DATE VALUES (USED BY MONTHLY CALENDAR)
const year = Number(date.slice(0, 4));
const monthIndex = Number(date.slice(5, 7)) - 1; // 0-based


  const [todayEmployees, setTodayEmployees] = useState([]);
  const [loadingTodayTable, setLoadingTodayTable] = useState(false);

  const [todaySummary, setTodaySummary] = useState(null);
  const [loadingTodaySummary, setLoadingTodaySummary] = useState(false);

  const [monthlyData, setMonthlyData] = useState([]);
  const [loadingMonth, setLoadingMonth] = useState(false);

  const monthDays = getMonthDays(date);

  const [showFilter, setShowFilter] = useState(false);

  const [filters, setFilters] = useState({
    department: "",
    designation: "",
    employeeType: "",
    status: "",
  });

  // const isWeekend = ["Sat", "Sun"].includes(d.dayName);

  function getTodayDateString() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`; // YYYY-MM-DD
  }

  async function fetchTodaySummary() {
    try {
      setLoadingTodaySummary(true);
      const res = await fetch("/api/admin/attendance/today/summary", {
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        setTodaySummary(data);
      }
    } catch (err) {
      console.error("Today summary error", err);
    } finally {
      setLoadingTodaySummary(false);
    }
  }

  // useEffect(() => {
  //   if (view === "today") {
  //     fetchTodaySummary();
  //     fetchTodayAttendance();
  //   }
  // }, [view]);

  useEffect(() => {
    if (view === "today") {
      fetchTodaySummary();
      fetchTodayAttendance();
    }

    if (view === "month") {
      fetchMonthlyAttendance();
    }
  }, [view, date]);

  // async function fetchTodayAttendance() {
  //   try {
  //     setLoadingTodayTable(true);
  //     const res = await fetch("/api/admin/attendance/today/list", {
  //       credentials: "include",
  //     });
  //     const data = await res.json();
  //     if (data.success) {
  //       setTodayEmployees(data.employees);
  //     }
  //   } catch (err) {
  //     console.error("Today table error", err);
  //   } finally {
  //     setLoadingTodayTable(false);
  //   }
  // }

  async function fetchTodayAttendance() {
    try {
      setLoadingTodayTable(true);

      const query = new URLSearchParams(filters).toString();

      const res = await fetch(`/api/admin/attendance/today/list?${query}`, {
        credentials: "include",
      });

      const data = await res.json();
      if (data.success) {
        setTodayEmployees(data.employees);
      }
    } catch (err) {
      console.error("Today table error", err);
    } finally {
      setLoadingTodayTable(false);
    }
  }

  async function fetchMonthlyAttendance() {
    try {
      setLoadingMonth(true);

      const month = date.slice(0, 7); // YYYY-MM



      const res = await fetch(`/api/admin/attendance/monthly?month=${month}`, {
        credentials: "include",
      });

      const data = await res.json();

      if (data.success) {
        setMonthlyData(data.employees);
      }
    } catch (err) {
      console.error("Monthly attendance error", err);
    } finally {
      setLoadingMonth(false);
    }
  }

  function getMonthDays(dateStr) {
    const year = Number(dateStr.slice(0, 4));
    const month = Number(dateStr.slice(5, 7)) - 1; // 0-based

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day);

      const yyyy = year;
      const mm = String(month + 1).padStart(2, "0");
      const dd = String(day).padStart(2, "0");

      days.push({
        dayNumber: day,
        dateKey: `${yyyy}-${mm}-${dd}`, // ✅ LOCAL DATE (NO UTC SHIFT)
        dayName: d.toLocaleDateString("en-US", { weekday: "short" }),
      });
    }

    return days;
  }


  function getStatusClass(status) {
  switch (status) {
    case "On Time":
      return "ontime";
    case "Late":
      return "late";
    case "Absent":
      return "absent";
    case "Leave":
      return "leave";
    case "Half Day":
      return "halfday";
    case "Week Off":
      return "weekoff";
    case "Holiday":
      return "holiday";
    case "NA":
    default:
      return "na";
  }
}

// this is for sunday ////

function isSunday(dayName) {
  return dayName === "Sun";
}

function isThirdSaturday(year, monthIndex, dayNumber) {
  const d = new Date(year, monthIndex, dayNumber);
  if (d.getDay() !== 6) return false; // Saturday = 6

  // Count Saturdays up to this date
  let saturdayCount = 0;
  for (let i = 1; i <= dayNumber; i++) {
    const temp = new Date(year, monthIndex, i);
    if (temp.getDay() === 6) saturdayCount++;
  }

  return saturdayCount === 3;
}

  return (
    <>
      <Head>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css"
        />
      </Head>

      <div className="dashboard-container add-employee-area admin-attendance-page">
        <div className="main-nav">
          <Leftbar />
          <LeftbarMobile />
          <Dashnav />

          <section className="content home">
            {/* Breadcrumb */}
            <div className="breadcrum-bx">
              <ul className="breadcrumb bg-white">
                <li className="breadcrumb-item">
                  <Link href="/dashboard/dashboard">
                    <img src="/icons/attendance.svg" /> Attendance Summary
                  </Link>
                </li>
              </ul>
            </div>

            {/* ================= ADMIN ATTENDANCE HEADER ================= */}
            <div className="block-header add-emp-area">
              <div className="admin-attendance-summary">
                {/* Breadcrumb already exists above */}

                <div className="attendance-topbar">

           
                  {/* LEFT: TOGGLE */}
                  <div className="attendance-toggle">
                    <button
                      className={view === "today" ? "active" : ""}
                      onClick={() => setView("today")}
                    >
                      Today
                    </button>

                    <button
                      className={view === "month" ? "active" : ""}
                      onClick={() => setView("month")}
                    >
                      This month
                    </button>
                  </div>

                  {/* RIGHT: ACTIONS */}
                  <div className="attendance-actions">
                    <div
                      className="date-box"
                      onClick={() => dateInputRef.current?.showPicker()}
                      style={{ cursor: "pointer" }}
                    >
                      <input
                        ref={dateInputRef}
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        style={{
                          position: "absolute",
                          opacity: 0,
                          pointerEvents: "none",
                        }}
                      />

                      <i className="bi bi-calendar"></i>
                      {/* <span>01 October 2025</span> */}

                      <span>
                        {new Date(date).toLocaleDateString("en-US", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>

                      <i className="bi bi-chevron-down"></i>
                    </div>

                    <button
                      className="filter-btn"
                      onClick={() => setShowFilter(true)}
                    >
                      <i className="bi bi-funnel"></i> Filter
                    </button>

                    <button
                      className="export-btn"
                      onClick={() => {
                        const month = date.slice(0, 7); // YYYY-MM
                        window.open(
                          `/api/admin/attendance/export/monthly?month=${month}`,
                          "_blank"
                        );
                      }}
                    >
                      <i className="bi bi-download"></i> Attendance Export
                    </button>
                  </div>
                </div>

                {/* <h5 className="admin-main-heading">
                  Todays Attendance Highlights
                </h5> */}

                <h5 className="admin-main-heading">
                  Attendance –{" "}
                  {new Date(date).toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </h5>

                {/* ================= TODAY ATTENDANCE HIGHLIGHTS ================= */}
                <div className="today-attendance-cards">
                  {/* CARD 1 */}
                  <div className="attendance-card green">
                    <div className="card-left">
                      <div className="icon-circle green">
                        <img src="/icons/admin/icon1.svg"></img>
                      </div>
                      <div>
                        <h6>Total Present Today</h6>
                        {/* <p><span className="highlight-percentages">86.4% </span>of total days</p> */}

                        <p>
                          <span className="highlight-percentages">
                            {todaySummary?.presentPercentage ?? 0}%
                          </span>{" "}
                          of total days
                        </p>
                      </div>
                    </div>
                    {/* <div className="card-count">18</div> */}

                    <div className="card-count">
                      {loadingTodaySummary ? "--" : todaySummary?.present ?? 0}
                    </div>
                  </div>

                  {/* CARD 2 */}
                  <div className="attendance-card red">
                    <div className="card-left">
                      <div className="icon-circle red">
                        <img src="/icons/admin/icon2.svg"></img>
                      </div>
                      <div>
                        <h6>Total Absent Today</h6>
                        <p className="approval-pending">
                          1 leave approval pending
                        </p>
                      </div>
                    </div>
                    <div className="card-count">
                      <span className="approval-pending">
                        {loadingTodaySummary ? "--" : todaySummary?.absent ?? 0}
                      </span>
                    </div>
                  </div>

                  {/* CARD 3 */}
                  <div className="attendance-card orange">
                    <div className="card-left">
                      <div className="icon-circle orange">
                        <img src="/icons/admin/icon3.svg"></img>
                      </div>
                      <div>
                        <h6>Late Arrivals Today</h6>
                        {/* <p><span className="late-arrivals">3.1%</span> of total days</p> */}

                        <p>
                          <span className="late-arrivals">
                            {todaySummary?.latePercentage ?? 0}%
                          </span>{" "}
                          of total days
                        </p>
                      </div>
                    </div>
                    <div className="card-count">
                      {loadingTodaySummary ? "--" : todaySummary?.late ?? 0}
                    </div>
                  </div>

                  {/* CARD 4 */}
                  <div className="attendance-card blue">
                    <div className="card-left">
                      <div className="icon-circle blue">
                        <img src="/icons/admin/icon4.svg"></img>
                      </div>
                      <div>
                        <h6>Holidays This Month</h6>
                        {/* <p>2nd October</p>
                         */}

                        <p>{todaySummary?.holidayLabel ?? "--"}</p>
                      </div>
                    </div>
                    <div className="card-count">
                      {loadingTodaySummary ? "--" : todaySummary?.holidays ?? 0}
                    </div>
                  </div>
                </div>

                {view === "today" && (
                  <>
                    {/* ================= TODAY ATTENDANCE TABLE ================= */}
                    <div className="today-attendance-table">
                      <h5 className="admin-main-heading">
                        Attendance Status Legend
                      </h5>

                      <div className="table-wrapper">
                        <table>
                          <thead>
                            <tr>
                              <th>Employee Name</th>
                              <th>Designation</th>
                              <th>Type</th>
                              <th>Check In Time</th>
                              <th>Check Out Time</th>

                              <th>Status</th>
                            </tr>
                          </thead>

                          <tbody>
                            {loadingTodayTable ? (
                              <tr>
                                <td colSpan="5">Loading...</td>
                              </tr>
                            ) : todayEmployees.length === 0 ? (
                              <tr>
                                <td colSpan="5">No attendance found</td>
                              </tr>
                            ) : (
                              todayEmployees.map((emp, idx) => (
                                <tr key={idx}>
                                  <td>
                                    <div className="emp-cell">
                                      <div className="avatar">
                                        {(emp.name || "NA")
                                          .split(" ")
                                          .map((n) => n[0])
                                          .join("")}
                                      </div>
                                      <span>{emp.name || "N/A"}</span>
                                    </div>
                                  </td>
                                  <td>{emp.designation}</td>
                                  <td>{emp.type}</td>
                                  <td>{emp.checkIn || "--"}</td>
                                  <td>{emp.checkOut || "--"}</td>

                                  <td>
                                     <span
                                          className={`status-pill ${getStatusClass(emp.status)}`}
                                        >
                                          {emp.status}
                                        </span>

                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}

                {view === "month" && (
                  <>
                    {/* ================= THIS MONTH ATTENDANCE CALENDAR ================= */}
                    <div className="month-attendance-table">
                      <h5 className="admin-main-heading">
                        Attendance Status Legend
                      </h5>

                      <div className="calendar-wrapper">
                        <table className="calendar-table">
                          <thead>
                            <tr>
                              <th className="sticky-col name-col">
                                Employee Name
                              </th>
                              <th className="sticky-col">Designation</th>
                              <th className="sticky-col">Type</th>

                              {/* DAYS HEADER */}
                              {monthDays.map((d) => (
                                <th key={d.dateKey} className="day-head">
                                  <div className="day-number">
                                    {d.dayNumber}
                                  </div>
                                  <span className="day-name">{d.dayName}</span>
                                </th>
                              ))}
                            </tr>
                          </thead>

                          {/* <tbody>
                            <tr>
                              <td className="sticky-col name-col">
                                <div className="emp-cell">
                                  <div className="avatar">IS</div>
                                  <span>Ivan Sinha</span>
                                </div>
                              </td>
                              <td className="sticky-col">Founder & CEO</td>
                              <td className="sticky-col">Office</td>

                              {[...Array(18)].map((_, i) => (
                                <td key={i}>
                                  <span className="day-badge present">P</span>
                                </td>
                              ))}
                            </tr>

                            <tr>
                              <td className="sticky-col name-col">
                                <div className="emp-cell">
                                  <div className="avatar purple">IS</div>
                                  <span>Ishan Sinha</span>
                                </div>
                              </td>
                              <td className="sticky-col">Digital Strategist</td>
                              <td className="sticky-col">Office</td>

                              {[...Array(18)].map((_, i) => (
                                <td key={i}>
                                  <span className="day-badge late">L</span>
                                </td>
                              ))}
                            </tr>
                          </tbody> */}

                          <tbody>
                            {loadingMonth ? (
                              <tr>
                                <td colSpan="25">Loading...</td>
                              </tr>
                            ) : monthlyData.length === 0 ? (
                              <tr>
                                <td colSpan="25">No data</td>
                              </tr>
                            ) : (
                              monthlyData.map((emp, idx) => (
                                <tr key={idx}>
                                  <td className="sticky-col name-col">
                                    <div className="emp-cell">
                                      <div className="avatar">
                                        {emp.name
                                          .split(" ")
                                          .map((n) => n[0])
                                          .join("")}
                                      </div>
                                      <span>{emp.name}</span>
                                    </div>
                                  </td>

                                  <td className="sticky-col">
                                    {emp.designation}
                                  </td>
                                  <td className="sticky-col">{emp.type}</td>
                                   {monthDays.map((d) => {
  let status = emp.days[d.dateKey]; // P / L if exists

  // 🧠 APPLY CORPORATE RULES ONLY IF NO ATTENDANCE
  if (!status) {
    if (isSunday(d.dayName)) {
      status = "WO";
    } else if (isThirdSaturday(year, monthIndex, d.dayNumber)) {
      status = "HD";
    } else {
      status = "A";
    }
  }

  return (
    <td key={d.dateKey}>
      <span
        className={`day-badge ${
          status === "P"
            ? "present"
            : status === "L"
            ? "late"
            : status === "WO"
            ? "weekoff"
            : status === "HD"
            ? "halfday"
            : "absent"
        }`}
      >
        {status}
      </span>
    </td>
  );
})}

                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* FOOTER */}
                      <div className="calendar-footer">
                        <span>Showing 1 to 10 out of 60 records</span>

                        <div className="pagination">
                          <button>&lsaquo;</button>
                          <button className="active">1</button>
                          <button>2</button>
                          <button>3</button>
                          <button>&rsaquo;</button>
                        </div>
                      </div>
                    </div>

                    {/* ================= MONTH ATTENDANCE LEGEND ================= */}
                    <div className="month-attendance-legend">
                      <div className="legend-item">
                        <span className="legend-badge present">P</span>
                        <span>Present</span>
                      </div>

                      <div className="legend-item">
                        <span className="legend-badge absent">A</span>
                        <span>Absent</span>
                      </div>

                      <div className="legend-item">
                        <span className="legend-badge late">L</span>
                        <span>Late</span>
                      </div>

                      <div className="legend-item">
                        <span className="legend-badge holiday">H</span>
                        <span>Holiday</span>
                      </div>

                      <div className="legend-item">
                        <span className="legend-badge weekoff">WO</span>
                        <span>Week Off</span>
                      </div>

                      <div className="legend-item">
                        <span className="legend-badge halfday">HD</span>
                        <span>Half Day</span>
                      </div>

                      <div className="legend-item">
                        <span className="legend-badge leave">CL</span>
                        <span>Casual Leave</span>
                      </div>

                      <div className="legend-item">
                        <span className="legend-badge leave">SL</span>
                        <span>Sick Leave</span>
                      </div>

                      <div className="legend-item">
                        <span className="legend-badge na">NA</span>
                        <span>Not Applicable</span>
                      </div>
                    </div>
                  </>
                )}
              </div>


        
            </div>
          </section>


                        {/* ===== FILTER OVERLAY ===== */}
          <div
            className={`admin-filter-overlay ${showFilter ? "open" : ""}`}
            onClick={() => setShowFilter(false)}
          ></div>

          {/* ===== FILTER TOP PANEL ===== */}
          <div className={`admin-filter-panel ${showFilter ? "open" : ""}`}>
            <div className="admin-filter-header">
              <h6>Filter Employees</h6>
              <button
                className="close-btn"
                onClick={() => setShowFilter(false)}
              >
                ✕
              </button>
            </div>

            <div className="admin-filter-body">
              {/* Department */}
              <div className="filter-group">
                <label>Department *</label>
                <select
                  value={filters.department}
                  onChange={(e) =>
                    setFilters({ ...filters, department: e.target.value })
                  }
                >
                  <option value="">Select Department</option>
                  <option value="HR">HR</option>
                  <option value="IT">IT</option>
                  <option value="Marketing">Marketing</option>
                </select>
              </div>

              {/* Designation */}
              <div className="filter-group">
                <label>Designation *</label>
                <select
                  value={filters.designation}
                  onChange={(e) =>
                    setFilters({ ...filters, designation: e.target.value })
                  }
                >
                  <option value="">Select Designation</option>
                  <option value="Developer">Developer</option>
                  <option value="Designer">Designer</option>
                  <option value="Manager">Manager</option>
                </select>
              </div>

              {/* Employee Type */}
              <div className="filter-group">
                <label>Employee Type *</label>
                <select
                  value={filters.employeeType}
                  onChange={(e) =>
                    setFilters({ ...filters, employeeType: e.target.value })
                  }
                >
                  <option value="">Select Type</option>
                  <option value="Office">Office</option>
                  <option value="Remote">Remote</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
              </div>

              {/* Status */}
              <div className="filter-group">
                <label>Employment Status *</label>
                <select
                  value={filters.status}
                  onChange={(e) =>
                    setFilters({ ...filters, status: e.target.value })
                  }
                >
                  <option value="">Select Status</option>
                  <option value="Permanent">Permanent</option>
                  <option value="Probation">Probation</option>
                  <option value="Contract">Contract</option>
                  <option value="Intern">Intern</option>
                </select>
              </div>
            </div>

            <div className="admin-filter-footer">
              <button
                className="apply-btn"
                onClick={() => {
                  setShowFilter(false);
                  if (view === "today") fetchTodayAttendance();
                  if (view === "month") fetchMonthlyAttendance();
                }}
              >
                Apply Filters
              </button>

              <button
                className="reset-btn"
                onClick={() =>
                  setFilters({
                    department: "",
                    designation: "",
                    employeeType: "",
                    status: "",
                  })
                }
              >
                Reset
              </button>
            </div>
          </div>

         
        </div>
      </div>
    </>
  );
}

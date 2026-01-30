import { useRouter } from "next/router";
import { useState, useEffect, useRef } from "react";
import Head from "next/head";
import Link from "next/link";
import Leftbar from "@/components/Leftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import Dashnav from "@/components/Dashnav";

export default function EmployeeAttendance() {
  const router = useRouter();
  const { employeeId } = router.query;

  const monthInputRef = useRef(null);

  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  /* ================= FETCH ================= */

  useEffect(() => {
    if (!employeeId || !month) return;
    fetchAttendance();
  }, [employeeId, month]);

  async function fetchAttendance() {
    try {
      setLoading(true);

      const res = await fetch(
        `/api/admin/attendance/employee/monthly?employeeId=${employeeId}&month=${month}`,
        { credentials: "include" }
      );

      const json = await res.json();
      if (json?.success) setData(json);
      else setData(null);
    } catch (err) {
      console.error("Employee attendance error", err);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  /* ================= HELPERS ================= */

  function getMonthDays(month) {
    const [year, m] = month.split("-");
    const daysInMonth = new Date(year, m, 0).getDate();
    const days = [];

    for (let d = 1; d <= daysInMonth; d++) {
      days.push(
        `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`
      );
    }
    return days;
  }

  function formatTime(t) {
    if (!t) return "--";
    return new Date(t).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getStatusClass(status) {
    switch (status) {
      case "On Time":
      case "Present":
        return "ontime";
      case "Late":
        return "late";
      case "Half Day":
        return "halfday";
      case "Week Off":
        return "weekoff";
      case "Holiday":
        return "holiday";
      default:
        return "absent";
    }
  }

  /* ================= RENDER ================= */

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
            {/* ===== BREADCRUMB ===== */}
            <div className="breadcrum-bx">
              <ul className="breadcrumb bg-white">
                <li className="breadcrumb-item">
                  <Link href="/dashboard/admin/attendance">
                    <img src="/icons/attendance.svg" /> Attendance
                  </Link>
                </li>
                <li className="breadcrumb-item active">
                  Employee Attendance
                </li>
              </ul>
            </div>

            {/* ===== HEADER ===== */}
            <div className="block-header add-emp-area">
              <div className="admin-attendance-summary">
                <div className="attendance-topbar pb-0">
                  <div>
                    <h5 className="admin-main-heading mb-0">
                      {data?.employee?.name || "Employee Attendance"}
                    </h5>
                    <p className="text-muted">
                      {data?.employee?.designation} ·{" "}
                      {data?.employee?.type}
                    </p>
                  </div>

                  {/* MONTH PICKER */}
                  <div
                    className="date-box"
                    onClick={() => monthInputRef.current?.showPicker()}
                  >
                    <input
                      ref={monthInputRef}
                      type="month"
                      value={month}
                      onChange={(e) => setMonth(e.target.value)}
                      style={{ position: "absolute", opacity: 0 }}
                    />
                    <i className="bi bi-calendar"></i>
                    <span>
                      {new Date(`${month}-01`).toLocaleDateString("en-US", {
                        month: "long",
                        year: "numeric",
                      })}
                    </span>
                    <i className="bi bi-chevron-down"></i>
                  </div>
                </div>

                {/* ===== TABLE ===== */}
                <div className="today-attendance-table">
                  <h5 className="admin-main-heading">Monthly Attendance</h5>

                  <div className="table-wrapper">
                    <table>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Day</th>
                          <th>Status</th>
                          <th>Check In</th>
                          <th>Check Out</th>
                          <th>Lunch</th>
                        </tr>
                      </thead>

                      <tbody>
                        {loading ? (
                          <tr>
                            <td colSpan="6">Loading...</td>
                          </tr>
                        ) : !data?.days ? (
                          <tr>
                            <td colSpan="6">No data found</td>
                          </tr>
                        ) : (
                          getMonthDays(month).map((dateKey) => {
                            const rec = data.days[dateKey];
                            const dayName = new Date(dateKey).toLocaleDateString(
                              "en-US",
                              { weekday: "short" }
                            );

                            return (
                              <tr key={dateKey}>
                                <td>{dateKey}</td>
                                <td>{dayName}</td>

                                <td>
                                  <span
                                    className={`status-pill ${getStatusClass(
                                      rec?.status
                                    )}`}
                                  >
                                    {rec?.status || "Absent"}
                                  </span>
                                </td>

                                <td>{formatTime(rec?.checkIn)}</td>
                                <td>{formatTime(rec?.checkOut)}</td>

                                <td>
                                  {rec?.lunchStatus === "On Lunch" ? (
                                    <span className="lunch-pill active">
                                      {rec.lunch}
                                    </span>
                                  ) : rec?.lunch ? (
                                    <span className="lunch-pill done">
                                      {rec.lunch}
                                    </span>
                                  ) : (
                                    "--"
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

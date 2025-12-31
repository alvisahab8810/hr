import React, { useEffect, useState } from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import Leftbar from "@/components/Leftbar";
import LeftbarMobile from "@/components/employee/LeftbarMobile";
import Dashnav from "@/components/Dashnav";
import Head from "next/head";
import Link from "next/link";
import EmployeeLeftbar from "@/components/employee/Leftbar";


ChartJS.register(ArcElement, Tooltip, Legend);

export default function EmployeeAttendanceSummary() {
  const [month, setMonth] = useState("");
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // set current month (client-only safe)
  useEffect(() => {
    const d = new Date();
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }, []);

  async function fetchData(m) {
    if (!m) return;
    setLoading(true);

    const res = await fetch(
      `/api/employee/attendance/monthly/self?month=${m}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("employeeToken")}`,
        },
      }
    );

    const data = await res.json();
    if (data.success) {
      setRecords(data.days || []);
      setSummary({
        present: data.summary?.present || 0,
        onTime: data.summary?.onTime || 0,
        late: data.summary?.late || 0,
        absent: data.summary?.absent || 0,
        halfDay: data.summary?.halfDay || 0,
        leave: data.summary?.leave || 0,
      });
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchData(month);
  }, [month]);

  const todayISO = new Date().toISOString().slice(0, 10);
  const todayRecord = records.find((r) => r.date === todayISO);

  const donutData = summary
    ? {
        labels: ["Present", "Late Arrival", "Absent", "Half Day", "Leave"],
        datasets: [
          {
            data: [
              summary.present,
              summary.late,
              summary.absent,
              summary.halfDay,
              summary.leave,
            ],
            backgroundColor: [
              "#55C79A",
              "#FFB020",
              "#FF6B6B",
              "#FFD666",
              "#7DA0FA",
            ],
            borderColor: "#ffffff",
            borderWidth: 3,
          },
        ],
      }
    : null;

  return (
    <div className="employee-attendance-summary">
      <Head>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css"
        />
      </Head>

      <div className="main-nav">
        <EmployeeLeftbar />
        <LeftbarMobile />
        <Dashnav />

        <section className="content home">
          <div className="breadcrum-bx">
            <ul className="breadcrumb  bg-white d-flex align-items-center justify-content-between">
              <li className="breadcrumb-item">
                <Link href="/dashboard/dashboard">
                  <img src="/icons/attendance.svg"></img> Attendance Summary
                </Link>
              </li>
          
            </ul>
          </div>
          <div className="block-header">
            <div className="attendance-summary-page">
              {/* ================= TODAY SUMMARY ================= */}
              {/* <div className="card today-summary-card mb-4">
                <h6 className="fw-semibold mb-3">Today’s Summary</h6>

                <table className="table mb-0">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Check In</th>
                      <th>Check Out</th>
                      <th>Break</th>
                      <th>Working Hours</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayRecord ? (
                      <tr>
                        <td>{todayRecord.date}</td>
                        <td>{todayRecord.checkIn}</td>
                        <td>{todayRecord.checkOut}</td>
                        <td>{todayRecord.break}</td>
                        <td>{todayRecord.workingHours}</td>
                        <td>
                          <span
                            className={`status-badge ${todayRecord.status
                              .toLowerCase()
                              .replace(" ", "-")}`}
                          >
                            {todayRecord.status}
                          </span>
                        </td>
                      </tr>
                    ) : (
                      <tr>
                        <td colSpan="6" className="text-muted">
                          No attendance marked for today
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div> */}

              {/* ================= MAIN GRID ================= */}
              <div className="row">
                {/* LEFT TABLE */}
                 <div className="col-lg-8">

                      <div className="card today-summary-card mb-4">
                <h6 className="fw-semibold mb-3">Today’s Summary</h6>

                <table className="table mb-0">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Check In</th>
                      <th>Check Out</th>
                      <th>Break</th>
                      <th>Working Hours</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayRecord ? (
                      <tr>
                        <td>{todayRecord.date}</td>
                        <td>{todayRecord.checkIn}</td>
                        <td>{todayRecord.checkOut}</td>
                        <td>{todayRecord.break}</td>
                        <td>{todayRecord.workingHours}</td>
                        <td>
                          <span
                            className={`status-badge ${todayRecord.status
                              .toLowerCase()
                              .replace(" ", "-")}`}
                          >
                            {todayRecord.status}
                          </span>
                        </td>
                      </tr>
                    ) : (
                      <tr>
                        <td colSpan="6" className="text-muted">
                          No attendance marked for today
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
                    <div className="card attendance-table-card">
                    <table className="table align-middle mb-0">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Check In</th>
                          <th>Check Out</th>
                          <th>Break</th>
                          <th>Working Hours</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr>
                            <td colSpan="6">Loading...</td>
                          </tr>
                        ) : (
                          records.map((r, i) => (
                            <tr key={i}>
                              <td>{r.date}</td>
                              <td>{r.checkIn}</td>
                              <td>{r.checkOut}</td>
                              <td>{r.break}</td>
                              <td>{r.workingHours}</td>
                              <td>
                                <span
                                  className={`status-badge ${r.status
                                    .toLowerCase()
                                    .replace(" ", "-")}`}
                                >
                                  {r.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                    
                 </div>

                {/* RIGHT CHART */}
                <div className="col-lg-4">
                  <div className="card attendance-chart-card">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h6 className="fw-semibold mb-0">Attendance Summary</h6>
                      <input
                        type="month"
                        className="form-control form-control-sm w-auto"
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                      />
                    </div>

                    {summary && donutData && (
                      <>
                        <Doughnut
                          data={donutData}
                          options={{
                            cutout: "70%",
                            responsive: true,
                            plugins: {
                              legend: { display: false },
                              tooltip: {
                                backgroundColor: "#1f2937",
                                titleColor: "#fff",
                                bodyColor: "#fff",
                                padding: 10,
                                cornerRadius: 6,
                                callbacks: {
                                  label: (ctx) => `${ctx.label}: ${ctx.raw}`,
                                },
                              },
                            },
                          }}
                        />

                        {/* <div className="attendance-legend mt-4">
                          <div>
                            <span className="dot present"></span> Present (
                            {summary.present})
                          </div>
                          <div>
                            <span className="dot late"></span> Late arrival (
                            {summary.late})
                          </div>
                          <div>
                            <span className="dot absent"></span> Absent (
                            {summary.absent})
                          </div>
                          <div>
                            <span className="dot halfday"></span> Half Day (
                            {summary.halfDay})
                          </div>
                          <div>
                            <span className="dot leave"></span> Leave (
                            {summary.leave})
                          </div>
                        </div> */}


                        <div className="attendance-legend legend-bubbles mt-4">
  <div>
    <span className="dot present">{summary.present}</span>
    <span className="label">Present</span>
  </div>

  <div>
    <span className="dot absent">{summary.absent}</span>
    <span className="label">Absent</span>
  </div>

  <div>
    <span className="dot late">{summary.late}</span>
    <span className="label">Late arrival</span>
  </div>

  <div>
    <span className="dot leave">{summary.leave}</span>
    <span className="label">Casual leave</span>
  </div>

  <div>
    <span className="dot halfday">{summary.halfDay}</span>
    <span className="label">Half Day</span>
  </div>

  <div>
    <span className="dot weekoff">{summary.weekOff || 0}</span>
    <span className="label">Week off</span>
  </div>

  <div>
    <span className="dot holiday">{summary.holiday || 0}</span>
    <span className="label">Holiday</span>
  </div>
</div>

                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

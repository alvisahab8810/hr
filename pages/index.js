import React, { useEffect, useState } from "react";
import Link from "next/link";
import Dashnav from "../components/Dashnav";
import Leftbar from "../components/Leftbar";

import Head from "next/head";
import { getSocket } from "@/utils/socket";
import LeftbarMobile from "@/components/LeftbarMobile";
import DateTimeGreeting from "@/components/DateTimeGreeting";

export default function Admin() {
  const [announcements, setAnnouncements] = useState([]);

  const [employeeStatus, setEmployeeStatus] = useState({});
  const [holidays, setHolidays] = useState([]);
  const [loadingHolidays, setLoadingHolidays] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [today, setToday] = useState("");

  const [summary, setSummary] = useState({
    total: 0,
    checkedIn: 0,
    yetToCheckIn: 0,
    leaveTaken: 0,
  });
  const [pendingLeaves, setPendingLeaves] = useState([]);

  // ✅ Fetch all data on load
  useEffect(() => {
    fetchAttendanceOverview();
    fetchPendingLeaves();
  }, []);

  /** ✅ Fetch Attendance Summary */
  const fetchAttendanceOverview = async () => {
    try {
      const res = await fetch("/api/payroll/attendance/overview");
      const data = await res.json();
      if (data.success) setSummary(data.summary);
    } catch (error) {
      console.error("Error fetching overview:", error);
    }
  };

  /** ✅ Fetch Pending Leaves */
  const fetchPendingLeaves = async () => {
    try {
      const res = await fetch("/api/payroll/leave/pending");
      const data = await res.json();
      if (data.success) setPendingLeaves(data.data);
    } catch (error) {
      console.error("Error fetching pending leaves:", error);
    }
  };

  useEffect(() => {
    // Ensure socket API is initialized
    fetch("/api/socket");

    const socket = getSocket();

    const onConnect = () => {
      console.log("✅ Admin connected to socket server");

      // Request full snapshot when connected
      socket.emit("admin:requestSnapshot");
    };

    const onStatusUpdate = (data) => {
      setEmployeeStatus((prev) => ({
        ...prev,
        [data.employeeId]: data,
      }));
    };

    const onSnapshot = (snapshot) => {
      const statusMap = {};
      snapshot.forEach((item) => {
        statusMap[item.employeeId] = item;
      });
      setEmployeeStatus(statusMap);
    };

    socket.on("connect", onConnect);
    socket.on("employeeStatusUpdate", onStatusUpdate);
    socket.on("employeeStatusSnapshot", onSnapshot);

    return () => {
      socket.off("connect", onConnect);
      socket.off("employeeStatusUpdate", onStatusUpdate);
      socket.off("employeeStatusSnapshot", onSnapshot);
    };
  }, []);

  /** ✅ Fetch Upcoming Holidays */
  const fetchHolidays = async () => {
    try {
      setLoadingHolidays(true);
      const res = await fetch("/api/payroll/holidays/upcoming");
      const data = await res.json();

      if (data.success) {
        setHolidays(data.data);
      } else {
        setError("Failed to load holidays.");
      }
    } catch (err) {
      console.error("Error fetching holidays:", err);
      setError("Something went wrong while fetching holidays.");
    } finally {
      setLoadingHolidays(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const options = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      };
      const formattedDate = now.toLocaleDateString("en-US", options);
      setToday(formattedDate);
    }, 1000 * 60); // updates every minute

    // Initial run
    const now = new Date();
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    setToday(now.toLocaleDateString("en-US", options));

    return () => clearInterval(interval);
  }, []);

  // ---------------------for the announcements --------------/
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const res = await fetch("/api/announcements/active");
        const data = await res.json();
        if (data.success) {
          setAnnouncements(data.announcements);
        }
      } catch (error) {
        console.error("Failed to fetch announcements:", error);
      }
    };

    fetchAnnouncements();
  }, []);
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

      <div className="main-nav">
        <Leftbar />
        <LeftbarMobile />
        <Dashnav />

        <section className="content home">
          <div className="breadcrum-bx">
            <ul className="breadcrumb  bg-white">
              <li className="breadcrumb-item">
                <Link href="/dashboard/dashboard">
                  <img src="/icons/home.svg"></img> Home
                </Link>
              </li>
              {/* <li className="breadcrumb-item active">Dashboard</li> */}
            </ul>
          </div>
          <div className="block-header">
            <div className="greetings-box">
              <DateTimeGreeting />
            </div>

            {/* ✅ Upcoming Holidays */}
            <div className="holidays-row">
              <div className="row">
                <div className="col-md-7 pr-0">
                  <div className="col-md-12 pl-0">
                    <div className="card items-home p-4 mb-4">
                      <div className="d-flex justify-content-between align-items-center">
                        <h5 className="fw-bold mb-0">Attendance Summary</h5>
                        <span className="text-muted">
                          <i className="bi bi-calendar"></i> Today
                        </span>
                      </div>
                      <hr />
                      <p className="mb-2 text-dark">
                        Total Employees: <strong>{summary.total}</strong>
                      </p>
                      <div className="progress mb-3" style={{ height: "8px" }}>
                        <div
                          className="progress-bar bg-success"
                          style={{
                            width: `${
                              (summary.checkedIn / summary.total) * 100
                            }%`,
                          }}
                        ></div>
                        <div
                          className="progress-bar bg-warning"
                          style={{
                            width: `${
                              (summary.yetToCheckIn / summary.total) * 100
                            }%`,
                          }}
                        ></div>
                        <div
                          className="progress-bar bg-danger"
                          style={{
                            width: `${
                              (summary.leaveTaken / summary.total) * 100
                            }%`,
                          }}
                        ></div>
                      </div>
                      <div className="d-flex justify-content-between small">
                        <span className="text-success">
                          Checked In: {summary.checkedIn}
                        </span>
                        <span className="text-warning">
                          Yet to Check-in: {summary.yetToCheckIn}
                        </span>
                        <span className="text-danger">
                          Leave Taken: {summary.leaveTaken}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="col-md-12 pl-0">
                    <div className="card items-home  mb-4  border-0 p-4">
                      <h5 className="fw-bold mb-3">Recent Activites</h5>
                      <div className="row">
                        {Object.values(employeeStatus).length > 0 ? (
                          Object.values(employeeStatus).map((emp) => (
                            <div className="col-md-6 mb-4" key={emp.employeeId}>
                              <div className="card h-100 border-light shadow-sm ">
                                <div className="card-body">
                                  <div className="d-flex justify-content-between align-items-center mb-2">
                                    <div className="d-flex align-items-center gap-2">
                                      <div
                                        className="avatar bg-primary text-white rounded-circle d-flex align-items-center justify-content-center"
                                        style={{
                                          width: "36px",
                                          height: "36px",
                                          fontSize: "14px",
                                        }}
                                      >
                                        {emp.name
                                          .split(" ")
                                          .map((n) => n[0])
                                          .join("")
                                          .toUpperCase()}
                                      </div>
                                      <h6 className="mb-0 fw-semibold">
                                        {emp.name}
                                      </h6>
                                    </div>
                                    <span
                                      className={`badge rounded-pill px-3 ${
                                        emp.status === "online"
                                          ? "bg-success"
                                          : "bg-secondary"
                                      }`}
                                    >
                                      {emp.status}
                                    </span>
                                  </div>

                                  <ul className="list-unstyled small mb-0">
                                    <li className="mb-1">
                                      <i className="bi bi-clock me-2 text-primary"></i>
                                      <strong>Last Active:</strong>{" "}
                                      {new Date(
                                        emp.lastActive
                                      ).toLocaleTimeString()}
                                    </li>

                                    {emp.browser && (
                                      <li className="mb-1">
                                        <i className="bi bi-globe2 me-2 text-info"></i>
                                        <strong>Browser:</strong> {emp.browser}
                                      </li>
                                    )}

                                    {emp.url && (
                                      <li className="mb-1 text-truncate">
                                        <i className="bi bi-link-45deg me-2 text-warning"></i>
                                        <strong>Page:</strong>{" "}
                                        <span className="text-muted">
                                          {emp.url}
                                        </span>
                                      </li>
                                    )}

                                    {typeof emp.clicks !== "undefined" && (
                                      <li>
                                        <i className="bi bi-mouse3 me-2 text-secondary"></i>
                                        <strong>Clicks:</strong> {emp.clicks}
                                      </li>
                                    )}
                                  </ul>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-muted ps-3">No activity yet…</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-5 pl-0">
                  <div className="col-md-12 ">
                    <div className="items-home card border-0 rounded-4 p-4">
                      {/* Header */}
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5 className="fw-bold  mb-0">
                          Upcoming Holidays ({new Date().getFullYear()})
                        </h5>
                        <span className="badge">{holidays.length}</span>
                      </div>

                      {/* Content */}
                      {loadingHolidays ? (
                        <div className="text-center py-4">
                          <div
                            className="spinner-border text-primary"
                            role="status"
                          ></div>
                          <p className="mt-2 text-muted small">
                            Loading holidays...
                          </p>
                        </div>
                      ) : error ? (
                        <p className="text-danger text-center">{error}</p>
                      ) : holidays.length === 0 ? (
                        <div className="text-center py-4">
                          <img
                            src="/no-holidays.png"
                            alt="No Holidays"
                            style={{ width: "90px", opacity: 0.8 }}
                          />
                          <p className="mt-2 text-muted">
                            No holidays available
                          </p>
                        </div>
                      ) : (
                        <ul className="list-group list-group-flush">
                          {holidays.slice(0, 5).map((holiday, idx) => {
                            const isToday =
                              new Date(holiday.date).toDateString() ===
                              new Date().toDateString();
                            return (
                              <li
                                key={idx}
                                className="list-group-item border-0 d-flex justify-content-between align-items-center px-2 py-2 mt-2"
                                style={{
                                  backgroundColor: isToday
                                    ? "#F9FAFB"
                                    : "#F9FAFB",
                                  borderRadius: "8px",
                                }}
                              >
                                <div>
                                  <h6 className="mb-0 fw-semibold text-dark">
                                    {holiday.name}
                                  </h6>
                                  {holiday.description && (
                                    <small className="text-muted">
                                      {holiday.description}
                                    </small>
                                  )}
                                </div>
                                <span
                                  className={`badge ${
                                    isToday
                                      ? "bg-primary text-white"
                                      : "bg-light text-dark border"
                                  } px-3 py-2`}
                                >
                                  {new Date(holiday.date).toLocaleDateString(
                                    "en-IN",
                                    {
                                      day: "numeric",
                                      month: "short",
                                    }
                                  )}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      )}

                      {/* Footer Link */}
                      {holidays.length > 5 && (
                        <div className="text-center mt-3">
                          <a
                            href="/dashboard/admin/holidays"
                            className="text-primary fw-semibold text-decoration-none"
                          >
                            View All Holidays →
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="col-md-12  margin-t-mob">
                    <div className="card p-4 mb-4 items-home ">
                      <div className="d-flex justify-content-between align-items-center mb-4">
                        <h5 className="fw-bold text-dark d-flex align-items-center gap-2 mb-0">
                          Notice{" "}
                        </h5>

                        <Link
                          href="/dashboard/hr/announcement"
                          className="notice-btn"
                        >
                          Create Notice
                        </Link>
                      </div>

                      {announcements.length > 0 ? (
                        announcements.map((a) => (
                          <div key={a._id} className="intter">
                            <div className="mb-2">
                              <div>
                                <h6 className="fw-bold mb-1 text-dark">
                                  {a.title}
                                </h6>
                                <div className="d-flex justify-content-between align-items-center mt-3">
                                  <small className="text-muted">
                                    Posted on{" "}
                                    {new Date(a.createdAt).toLocaleDateString()}
                                  </small>

                                  <div className="d-flex gap-2 ">
                                    <span
                                      style={{
                                        backgroundColor:
                                          a.priority === "high"
                                            ? "#ff4d4d3d"
                                            : "#6c757d2d",
                                        color:
                                          a.priority === "high"
                                            ? "#ff4d4d"
                                            : "#6c757d",
                                        fontWeight: "700",
                                        padding: "4px 8px",
                                        borderRadius: "8px",
                                        fontSize: "10px",
                                      }}
                                    >
                                      {a.priority === "high"
                                        ? "High Priority"
                                        : "Normal"}
                                    </span>

                                    <span
                                      style={{
                                        backgroundColor:
                                          a.endDate &&
                                          new Date(a.endDate) < new Date()
                                            ? "#6c757d2d"
                                            : new Date(a.startDate) > new Date()
                                            ? "#0dcaf02d"
                                            : "#DCFCE7",
                                        color:
                                          a.endDate &&
                                          new Date(a.endDate) < new Date()
                                            ? "#6c757d"
                                            : new Date(a.startDate) > new Date()
                                            ? "#0dcaf0"
                                            : "#15803D",
                                        fontWeight: "700",
                                        padding: "4px 8px",
                                        borderRadius: "8px",
                                        fontSize: "10px",
                                      }}
                                    >
                                      {a.endDate &&
                                      new Date(a.endDate) < new Date()
                                        ? "Expired"
                                        : new Date(a.startDate) > new Date()
                                        ? "Scheduled"
                                        : "Active"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* <p className="mb-0 text-dark">{a.message} style={{ whiteSpace: "pre-line" }}</p> */}
                            <p className="mb-0 text-dark">{a.message}</p>

                            {a.endDate && (
                              <small className="text-muted d-block mt-2">
                                📅 Valid until{" "}
                                {new Date(a.endDate).toLocaleDateString()}
                              </small>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-muted">No announcements</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* <DashboardSummary /> */}
          </div>
        </section>

        {/* <Setting /> */}
      </div>
    </>
  );
}

// ✅ Protect this page
export async function getServerSideProps(context) {
  const { req } = context;
  const cookie = req.headers.cookie || "";

  if (!cookie.includes("admin_auth=true")) {
    return {
      redirect: {
        destination: "/dashboard/login",
        permanent: false,
      },
    };
  }

  return {
    props: {},
  };
}

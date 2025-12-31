import React, { useEffect, useState } from "react";
import Link from "next/link";
import Dashnav from "@/components/Dashnav";

import Head from "next/head";
import { getSocket } from "@/utils/socket";
import DateTimeGreeting from "@/components/DateTimeGreeting";
import Leftbar from "@/components/employee/Leftbar";
import LeftbarMobile from "@/components/employee/LeftbarMobile";
import TimeTracker from "@/components/employee/TimeTracker";

export default function Admin() {
  const [announcements, setAnnouncements] = useState([]);

  const [employeeStatus, setEmployeeStatus] = useState({});
  const [holidays, setHolidays] = useState([]);
  const [loadingHolidays, setLoadingHolidays] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [employee, setEmployee] = useState(null);
  const [today, setToday] = useState("");
  const [showReminder, setShowReminder] = useState(false);
  const [triggeredToday, setTriggeredToday] = useState(false);

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

  useEffect(() => {
    // format today’s date
    const date = new Date();
    const formatted = date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    setToday(formatted);

    // fetch employee profile
    const fetchEmployee = async () => {
      try {
        const token = localStorage.getItem("employeeToken"); // stored on login
        const res = await fetch("/api/employee/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (data.success) {
          setEmployee(data.employee);
        }
      } catch (err) {
        console.error("Failed to fetch employee:", err);
      }
    };

    fetchEmployee();
  }, []);

  // -----------------------lunch music warning -----------------

  useEffect(() => {
    const checkLunchWarning = () => {
      const now = new Date();

      // fire only once per day at 13:25
      if (now.getHours() === 13 && now.getMinutes() === 30 && !triggeredToday) {
        // Play sound
        const audio = new Audio("/sounds/lunch-warning.mp3");
        audio.play();

        // Show popup
        setShowReminder(true);
        setTriggeredToday(true); // prevent multiple triggers same day

        // Reset next day at midnight
        setTimeout(() => setTriggeredToday(false), 24 * 60 * 60 * 1000);
      }
    };

    const interval = setInterval(checkLunchWarning, 1000);
    return () => clearInterval(interval);
  }, [triggeredToday]);

  if (!employee) return <p className="text-white">Loading...</p>;
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
            <ul className="breadcrumb  bg-white d-flex align-items-center justify-content-between">
              <li className="breadcrumb-item">
                <Link href="/dashboard/dashboard">
                  <img src="/icons/home.svg"></img> Home
                </Link>
              </li>
              {/* <li className="breadcrumb-item active">Dashboard</li> */}
              <li>
                <TimeTracker />
              </li>
            </ul>
          </div>
          <div className="block-header">
            {/* <div className="greetings-box">
              <DateTimeGreeting />
            </div> */}

            <div className="emp-name-bx">
              <h3 className="fw-bold text-dark mb-0">
                Welcome back, {employee.firstName}!
              </h3>
              <span className="text-dark">{today}</span>
            </div>

            {/* ✅ Upcoming Holidays */}
            <div className="holidays-row">
              <div className="row">
                <div className="col-md-7 pr-0 pl-0">
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
                                className="list-group-item border-0 d-flex justify-content-between align-items-center px-3 py-3 mt-2"
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

            
                </div>
                <div className="col-md-5 pl-0">
                  

                  <div className="col-md-12  margin-t-mob">
                    <div className="card p-4 mb-4 items-home ">
                      <div className="d-flex justify-content-between align-items-center mb-4">
                        <h5 className="fw-bold text-dark d-flex align-items-center gap-2 mb-0">
                          Notice{" "}
                        </h5>
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

          {showReminder && (
            <>
              <div className="overlay">
                <div className="popup-card">
                  <h3 className="popup-title d-flex align-items-center gap-3">
                    <img src="/icons/alarm.png" alt="Alarm Icons" width="30"></img>
                     Lunch Time Alert</h3>
                  <div className="popup-time">
                    {/* <span className="popup-icon">🍴</span> */}
                    <span className="popup-text">01:30 PM</span>
                  </div>
                  <p className="popup-desc">
                    Your lunch break is starting now. <br />
                    Deductions will apply if you exceed the allowed break.
                  </p>
                  <button
                    className="popup-btn"
                    onClick={() => setShowReminder(false)}
                  >
                    Got it
                  </button>
                </div>
              </div>

              <style jsx>{`
                /* Dark overlay background */
                .overlay {
                  position: fixed;
                  inset: 0;
                  background: rgba(0, 0, 0, 0.5);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  z-index: 2000;
                }

                /* Card style */
                .popup-card {
                  background: #fff;
                  border-radius: 16px;
                  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
                  padding: 24px 28px;
                  width: 300px;
                  text-align: center;
                  animation: fadeIn 0.3s ease-out;
                }

                /* Title */
                .popup-title {
                  font-size: 1.4rem;
                  font-weight: bold;
                  margin: 0 0 16px;
                  color: #333;
                }

                /* Time section */
                .popup-time {
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 8px;
                  margin-bottom: 10px;
                }

                .popup-icon {
                  font-size: 1.5rem;
                  color: #6c63ff;
                }

                .popup-text {
                  font-size: 1.8rem;
                  font-weight: 600;
                  color: #222;
                }

                /* Description */
                .popup-desc {
                  font-size: 0.9rem;
                  color: #666;
                  margin: 10px 0 20px;
                }

                /* Button */
                .popup-btn {
                  background: #6c63ff;
                  color: #fff;
                  border: none;
                  border-radius: 8px;
                  padding: 10px 20px;
                  font-size: 1rem;
                  font-weight: 500;
                  cursor: pointer;
                  transition: background 0.3s ease;
                }

                .popup-btn:hover {
                  background: #5848d9;
                }

                /* Animation */
                @keyframes fadeIn {
                  from {
                    opacity: 0;
                    transform: translateY(-20px);
                  }
                  to {
                    opacity: 1;
                    transform: translateY(0);
                  }
                }
              `}</style>
            </>
          )}
        </section>

        {/* <Setting /> */}
      </div>
    </>
  );
}

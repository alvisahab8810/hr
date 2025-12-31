import { toast } from "react-toastify";
import Dashnav from "@/components/Dashnav";
import LeftbarMobile from "@/components/employee/LeftbarMobile";

import React, { useEffect, useState, useRef } from "react";
import Head from "next/head";
import Link from "next/link";
import EmployeeLeftbar from "@/components/employee/Leftbar";

export default function LeaveManagement() {
  const fileInputRef = useRef(null);

  const [retractRemark, setRetractRemark] = useState("");

  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showRetractModal, setShowRetractModal] = useState(false);
  // apply leave states
  const today = new Date().toISOString().split("T")[0];
  const [leaveType, setLeaveType] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [totalDays, setTotalDays] = useState(0);
  const [reason, setReason] = useState("");
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);

  const [leaveBalance, setLeaveBalance] = useState(null);
  const [loadingBalance, setLoadingBalance] = useState(true);

  const [leaveHistory, setLeaveHistory] = useState([]);
  const [loadingLeaves, setLoadingLeaves] = useState(true);

  // const [showRetractModal, setShowRetractModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);

  function resetLeaveForm() {
    setLeaveType("");
    setStartDate(today);
    setEndDate(today);
    setTotalDays(0);
    setReason("");
    setDocuments([]);
    setRetractRemark("");
  }

  useEffect(() => {
    if (!startDate || !endDate) return;

    const s = new Date(startDate);
    const e = new Date(endDate);

    if (e < s) {
      setTotalDays(0);
      return;
    }

    const days = Math.floor((e - s) / (1000 * 60 * 60 * 24)) + 1;

    setTotalDays(days);
  }, [startDate, endDate]);

  async function handleSubmit(status = "Pending") {
    const token = localStorage.getItem("employeeToken");

    if (!token) {
      toast.error("Session expired. Please login again.");
      return;
    }

    if (!leaveType || !startDate || !endDate || !reason) {
      toast.error("Please fill all required fields");
      return;
    }

    if (leaveType === "Sick Leave" && totalDays > 3 && documents.length === 0) {
      toast.error("Medical document required for sick leave above 3 days");
      return;
    }

    setLoading(true);

    try {
      const fd = new FormData();
      fd.append("leaveType", leaveType);
      fd.append("startDate", startDate);
      fd.append("endDate", endDate);
      fd.append("reason", reason);
      fd.append("status", status);

      documents.forEach((file) => {
        fd.append("documents", file);
      });

      const res = await fetch("/api/employee/leave/apply", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`, // ⚠️ DO NOT set Content-Type
        },
        body: fd,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.message || "Failed to apply leave");
        return;
      }

      toast.success(
        status === "Draft"
          ? "Leave saved as draft"
          : "Leave applied successfully"
      );

      resetLeaveForm();
      setShowLeaveModal(false);
    } catch (err) {
      console.error(err);
      toast.error("Server error");
    } finally {
      setLoading(false);
    }
  }

  // -------------- Fetch Leave Balence api ======================

  // useEffect(() => {
  //   async function fetchLeaveBalance() {
  //     try {
  //       const token = localStorage.getItem("employeeToken");

  //       const res = await fetch("/api/employee/leave/balance", {
  //         headers: {
  //           Authorization: `Bearer ${token}`,
  //         },
  //       });

  //       const data = await res.json();

  //       if (data.success) {
  //         setLeaveBalance(data.balance);
  //       }
  //     } catch (err) {
  //       console.error("Leave balance fetch error", err);
  //     } finally {
  //       setLoadingBalance(false);
  //     }
  //   }

  //   fetchLeaveBalance();
  // }, []);

  useEffect(() => {
    async function fetchLeaveBalance() {
      try {
        const token = localStorage.getItem("employeeToken");

        const res = await fetch("/api/employee/leave/balance", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (data.success) {
          setLeaveBalance(data.balance);
        }
      } catch (err) {
        console.error("Leave balance fetch error", err);
      } finally {
        setLoadingBalance(false);
      }
    }

    fetchLeaveBalance();
  }, [leaveHistory]);

  //  ======================== Fetch leave History ===============

  useEffect(() => {
    async function fetchLeaveHistory() {
      try {
        const token = localStorage.getItem("employeeToken");

        const res = await fetch("/api/employee/leave/list", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (data.success) {
          setLeaveHistory(data.leaves);
        }
      } catch (err) {
        console.error("Leave history fetch error", err);
      } finally {
        setLoadingLeaves(false);
      }
    }

    fetchLeaveHistory();
  }, []);

  // ================================= Retract sumbission =================

  async function handleRetract() {
    const token = localStorage.getItem("employeeToken");

    try {
      const res = await fetch("/api/employee/leave/retract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          leaveId: selectedLeave._id,
          remark: retractRemark,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Leave retracted successfully");
        setShowRetractModal(false);
        setSelectedLeave(null);

        // Refresh list
        setLeaveHistory((prev) =>
          prev.map((l) =>
            l._id === selectedLeave._id ? { ...l, status: "Retracted" } : l
          )
        );
      } else {
        toast.error(data.message || "Unable to retract leave");
      }
    } catch (err) {
      console.error(err);
      toast.error("Server error");
    }
  }

  return (
    <div>
      <Head>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css"
        />
      </Head>

      <div className="add-employee-area">
        <div className="main-nav">
          <EmployeeLeftbar />
          <LeftbarMobile />
          <Dashnav />

          <section className="content home">
            <div className="breadcrum-bx">
              <ul className="breadcrumb  bg-white">
                <li className="breadcrumb-item">
                  <Link href="/dashboard/dashboard">
                    <img
                      src="/icons/leaves-management.svg"
                      alt="Attendance Summary"
                    />{" "}
                    Leaves Management
                  </Link>
                </li>
              </ul>
            </div>

            <div className="block-header add-emp-area">
              <div className="viral-leaves-page">
                <div className="viral-leaves-grid">
                  {/* ================= LEFT COLUMN ================= */}
                  <div className="leaves-left">
                    {/* Quick Actions */}
                    <div className="vl-card vl-quick-actions">
                      <div className="vl-card-title">
                        <img src="/icons/employee/calender.svg"></img>
                        Quick Actions
                      </div>
                      {/* <button className="vl-primary-btn">
                        ＋ Apply for Leave
                      </button> */}

                      <button
                        className="vl-primary-btn"
                        onClick={() => setShowLeaveModal(true)}
                      >
                        ＋ Apply for Leave
                      </button>
                    </div>

                    {/* Upcoming Requests */}
                    <div className="vl-card">
                      <div className="vl-card-title">
                        Upcoming Recent Requests
                      </div>

                      {loadingLeaves ? (
                        <p>Loading...</p>
                      ) : (
                        leaveHistory
                          .filter(
                            (l) =>
                              l.status === "Pending" || l.status === "Draft"
                          )
                          .slice(0, 3)
                          .map((leave) => (
                            <div className="vl-leave-item" key={leave._id}>
                              <div>
                                <div className="vl-leave-name">
                                  {leave.leaveType}
                                </div>
                                <div className="vl-leave-date">
                                  {new Date(leave.startDate).toDateString()} –{" "}
                                  {new Date(leave.endDate).toDateString()} (
                                  {leave.totalDays} days)
                                </div>

                                {leave.adminRemark && (
                                  <div className="vl-admin-remark">
                                    <strong>Admin Remark:</strong>{" "}
                                    {leave.adminRemark}
                                  </div>
                                )}
                              </div>

                              <div className="vl-actions">
                                {/* <div
                                  className={`vl-badge ${leave.status.toLowerCase()}`}
                                >
                                  {leave.status}
                                </div> */}

                                <div className="vl-status-stack">
                                  <div
                                    className={`vl-badge ${leave.status.toLowerCase()}`}
                                  >
                                    {leave.status}
                                  </div>

                                  {leave.isSandwich && (
                                    <span className="vl-sandwich-badge">
                                      Sandwich Leave
                                    </span>
                                  )}
                                </div>

                                <button
                                  className="vl-retract-btn"
                                  onClick={() => {
                                    setSelectedLeave(leave); // ✅ VERY IMPORTANT
                                    setShowRetractModal(true); // ✅ OPEN MODAL
                                  }}
                                >
                                  Retract
                                </button>
                              </div>
                            </div>
                          ))
                      )}

                      {/* <div className="vl-leave-item">
                        <div>
                          <div className="vl-leave-name">Casual Leave</div>
                          <div className="vl-leave-date">
                            Dec 25–27, 2024 (3 days)
                          </div>
                        </div>
                        <div className="vl-badge pending">Pending</div>
                      </div>

                      <div className="vl-leave-item">
                        <div>
                          <div className="vl-leave-name">Casual Leave</div>
                          <div className="vl-leave-date">
                            Dec 01, 2024 (1 day)
                          </div>
                        </div>
                        <div className="vl-badge declined">Declined</div>
                      </div>

                      <div className="vl-leave-item">
                        <div>
                          <div className="vl-leave-name">Sick Leave</div>
                          <div className="vl-leave-date">
                            Dec 20, 2024 (1 day)
                          </div>
                        </div>
                        <div className="vl-actions">
                          <div className="vl-badge approved">Approved</div>
                          <button
                            className="vl-retract-btn"
                            onClick={() => setShowRetractModal(true)}
                          >
                            Retract
                          </button>
                        </div>
                      </div> */}
                    </div>

                    {/* Previous Leaves */}
                    <div className="vl-card">
                      <div className="vl-card-title">Previous Leaves</div>

                      {/* <div className="vl-leave-item">
                        <div>
                          <div className="vl-leave-name">Dec 25, 2024</div>
                          <div className="vl-leave-date">Casual Leave</div>
                        </div>
                        <div className="vl-actions">
                          <div className="vl-badge approved">Approved</div>
                          <button
                            className="vl-retract-btn"
                            onClick={() => setShowRetractModal(true)}
                          >
                            Retract
                          </button>
                        </div>
                      </div>

                      <div className="vl-leave-item">
                        <div>
                          <div className="vl-leave-name">Jan 15, 2025</div>
                          <div className="vl-leave-date">Earned Leave</div>
                        </div>
                        <div className="vl-badge declined">Declined</div>
                      </div> */}

                      {leaveHistory
                        .filter((l) =>
                          ["Approved", "Rejected", "Retracted"].includes(
                            l.status
                          )
                        )
                        .slice(0, 5)
                        .map((leave) => (
                          <div className="vl-leave-item" key={leave._id}>
                            <div>
                              <div className="vl-leave-name">
                                {new Date(leave.startDate).toDateString()}
                              </div>
                              <div className="vl-leave-date">
                                {leave.leaveType}
                              </div>

                              {leave.adminRemark && (
                                <div className="vl-admin-remark">
                                  <strong>Admin Remark:</strong>{" "}
                                  {leave.adminRemark}
                                </div>
                              )}
                            </div>

                            {/* <div
                              className={`vl-badge ${leave.status.toLowerCase()}`}
                            >
                              {leave.status}
                            </div> */}

                            <div className="vl-status-stack">
                              <div
                                className={`vl-badge ${leave.status.toLowerCase()}`}
                              >
                                {leave.status}
                              </div>

                              {leave.isSandwich && (
                                <span className="vl-sandwich-badge">
                                  Sandwich Leave
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* ================= RIGHT COLUMN ================= */}
                  <div className="leaves-right">
                    {/* Leave Balance */}
                    <div className="vl-card">
                      <div className="vl-card-title">
                        <img src="/icons/employee/calender.svg"></img>
                        Leave Balance Overview
                      </div>

                      {/* <div className="vl-balance-card blue">
                        <div className="vl-balance-top">
                          <div className="vl-balance-left">
                            <span className="vl-icon blue">
                              <img src="/icons/employee/calender-light.svg"></img>
                            </span>
                            <div>
                              <div className="vl-title">Casual Leave</div>
                              <div className="vl-sub">12 days remaining</div>
                            </div>
                          </div>
                          <div className="vl-right">
                            <strong>12/20</strong>
                            <span className="vl-available">Available</span>
                          </div>
                        </div>

                        <div className="vl-balance-meta" data-percent="40%">
                          Used: 8 days
                        </div>

                        <div className="vl-progress">
                          <span style={{ width: "40%" }}></span>
                        </div>
                      </div> */}

                      <div className="vl-balance-card blue">
                        <div className="vl-balance-top">
                          <div className="vl-balance-left">
                            <span className="vl-icon blue">
                              <img src="/icons/employee/calender-light.svg" />
                            </span>
                            <div>
                              <div className="vl-title">Casual Leave</div>
                              <div className="vl-sub">
                                {leaveBalance
                                  ? leaveBalance.casual.total -
                                    leaveBalance.casual.used
                                  : "--"}{" "}
                                days remaining
                              </div>
                            </div>
                          </div>

                          <div className="vl-right">
                            <strong>
                              {leaveBalance
                                ? `${
                                    leaveBalance.casual.total -
                                    leaveBalance.casual.used
                                  }/${leaveBalance.casual.total}`
                                : "--"}
                            </strong>
                            <span className="vl-available">Available</span>
                          </div>
                        </div>

                        <div className="vl-balance-meta">
                          Used: {leaveBalance ? leaveBalance.casual.used : "--"}{" "}
                          days
                        </div>

                        <div className="vl-progress">
                          <span
                            style={{
                              width: leaveBalance
                                ? `${
                                    leaveBalance.casual.total
                                      ? (leaveBalance.casual.used /
                                          leaveBalance.casual.total) *
                                        100
                                      : 0
                                  }%`
                                : "0%",
                            }}
                          ></span>
                        </div>
                      </div>

                      <div className="vl-balance-card green">
                        <div className="vl-balance-top">
                          <div className="vl-balance-left">
                            <span className="vl-icon green">
                              <img src="/icons/employee/watch.svg" />
                            </span>
                            <div>
                              <div className="vl-title">Sick Leave</div>
                              <div className="vl-sub">
                                {leaveBalance
                                  ? leaveBalance.sick.total -
                                    leaveBalance.sick.used
                                  : "--"}{" "}
                                days remaining
                              </div>
                            </div>
                          </div>

                          <div className="vl-right">
                            <strong>
                              {leaveBalance
                                ? `${
                                    leaveBalance.sick.total -
                                    leaveBalance.sick.used
                                  }/${leaveBalance.sick.total}`
                                : "--"}
                            </strong>
                            <span className="vl-available">Available</span>
                          </div>
                        </div>

                        <div className="vl-balance-meta">
                          Used: {leaveBalance ? leaveBalance.sick.used : "--"}{" "}
                          days
                        </div>

                        <div className="vl-progress">
                          <span
                            style={{
                              width: leaveBalance
                                ? `${
                                    (leaveBalance.sick.used /
                                      leaveBalance.sick.total) *
                                    100
                                  }%`
                                : "0%",
                            }}
                          ></span>
                        </div>
                      </div>

                      <div className="vl-balance-card purple">
                        <div className="vl-balance-top">
                          <div className="vl-balance-left">
                            <span className="vl-icon purple">
                              <img src="/icons/employee/grow.svg" />
                            </span>
                            <div>
                              <div className="vl-title">Earned Leave</div>
                              <div className="vl-sub">
                                {leaveBalance
                                  ? leaveBalance.earned.total -
                                    leaveBalance.earned.used
                                  : "--"}{" "}
                                days remaining
                              </div>
                            </div>
                          </div>

                          <div className="vl-right">
                            <strong>
                              {leaveBalance
                                ? `${
                                    leaveBalance.earned.total -
                                    leaveBalance.earned.used
                                  }/${leaveBalance.earned.total}`
                                : "--"}
                            </strong>
                            <span className="vl-available">Available</span>
                          </div>
                        </div>

                        <div className="vl-balance-meta">
                          Used: {leaveBalance ? leaveBalance.earned.used : "--"}{" "}
                          days
                        </div>

                        <div className="vl-progress">
                          <span
                            style={{
                              width: leaveBalance
                                ? `${
                                    (leaveBalance.earned.used /
                                      leaveBalance.earned.total) *
                                    100
                                  }%`
                                : "0%",
                            }}
                          ></span>
                        </div>
                      </div>
                    </div>

                    {/* Year To Date */}
                    <div className="vl-card">
                      <div className="vl-card-title">Year-to-Date Summary</div>

                      <div className="vl-ytd-grid">
                        {/* <div className="vl-ytd-box used">
                          <div className="vl-ytd-number">15</div>
                          <div className="vl-ytd-label">Total Used</div>
                        </div> */}

                        <div className="vl-ytd-box used">
                          <div className="vl-ytd-number">
                            {leaveBalance
                              ? leaveBalance.sick.used +
                                leaveBalance.earned.used
                              : "--"}
                          </div>
                          <div className="vl-ytd-label">Total Used</div>
                        </div>

                        <div className="vl-ytd-box available">
                          <div className="vl-ytd-number">
                            {leaveBalance
                              ? leaveBalance.sick.total +
                                leaveBalance.earned.total -
                                (leaveBalance.sick.used +
                                  leaveBalance.earned.used)
                              : "--"}
                          </div>
                          <div className="vl-ytd-label">Total Available</div>
                        </div>

                        {/* <div className="vl-ytd-box available">
                          <div className="vl-ytd-number">40</div>
                          <div className="vl-ytd-label">Total Available</div>
                        </div> */}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
      {/* ===================== Leave Apply Modal ================== */}
      {showLeaveModal && (
        <div className="leave-modal-root">
          {/* Backdrop */}
          <div
            className="leave-modal-backdrop"
            onClick={() => setShowLeaveModal(false)}
          ></div>

          {/* Modal */}
          <div className="leave-modal-card">
            {/* Header */}
            <div className="leave-modal-header">
              <div className="leave-modal-title">
                <img src="/icons/employee/calender.svg"></img>
                <span>Apply for Leave</span>
              </div>
              <button
                className="leave-modal-close"
                onClick={() => setShowLeaveModal(false)}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="leave-modal-body">
              {/* Leave Type */}
              <div className="form-group">
                <label>Leave Type *</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                >
                  <option value="">Select leave type</option>
                  <option>Casual Leave</option>
                  <option>Sick Leave</option>
                  <option>Earned Leave</option>
                </select>
              </div>

              {/* Dates */}
              <div className="row">
                <div className="col-md-6">
                  <div className="form-group">
                    <label>Start Date *</label>
                    <input
                      type="date"
                      value={startDate}
                      min={today}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="col-md-6">
                  <div className="form-group">
                    <label>End Date *</label>
                    <input
                      type="date"
                      value={endDate}
                      min={startDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Days */}
              <div className="form-group selected-leaves">
                <label>Number of Days</label>
                <input value={`${totalDays} days`} disabled />
              </div>

              {/* Reason */}
              <div className="form-group">
                <label>Reason for Leave *</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Please provide a brief reason for your leave request..."
                ></textarea>
              </div>

              {/* Upload */}
              {/* <div className="form-group">
                <label>Supporting Documents (if required)</label>
                <div className="file-upload-box">
                  <div className="upload-icon">
                    <img src="/icons/employee/upload.svg"></img>
                  </div>
                  <p>Click to upload or drag and drop</p>
                  <small>PDF, DOC, JPG up to 5MB</small>
                  <br />
                  <button type="button">Choose Files</button>
                </div>
              </div> */}

              {leaveType === "Sick Leave" && totalDays > 3 && (
                <div className="form-group">
                  <label>Supporting Documents *</label>

                  <div className="file-upload-box">
                    <div className="upload-icon">
                      <img src="/icons/employee/upload.svg" />
                    </div>

                    <p>Click to upload or drag and drop</p>
                    <small>PDF, DOC, JPG up to 5MB</small>
                    <br />

                    <button
                      type="button"
                      onClick={() => fileInputRef.current.click()}
                    >
                      Choose Files
                    </button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      hidden
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={(e) => setDocuments(Array.from(e.target.files))}
                    />
                  </div>

                  {documents.length > 0 && (
                    <ul className="uploaded-file-list">
                      {documents.map((file, i) => (
                        <li key={i}>📎 {file.name}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="leave-modal-footer">
              {/* <button className="submit-btn">
                <img src="/icons/employee/submit.svg" /> Submit Application
              </button> */}

              <button
                className="submit-btn"
                disabled={loading}
                onClick={() => handleSubmit("Pending")}
              >
                <img src="/icons/employee/submit.svg" />
                Submit Application
              </button>

              {/* <button className="draft-btn">Save as Draft</button> */}

              <button
                className="draft-btn"
                disabled={loading}
                onClick={() => handleSubmit("Draft")}
              >
                Save as Draft
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ===================== Leave Retract Modal ================== */}

      {showRetractModal && (
        <div className="retract-modal-root">
          {/* Backdrop */}
          <div
            className="retract-modal-backdrop"
            onClick={() => setShowRetractModal(false)}
          ></div>

          {/* Modal */}
          <div className="retract-modal-card">
            {/* Header */}
            <div className="retract-modal-header">
              <h3>Want To Retract Your Leave Application?</h3>
              <button
                className="retract-close-btn"
                onClick={() => setShowRetractModal(false)}
              >
                ✕
              </button>
            </div>

            {/* Illustration */}
            <div className="retract-illustration">
              <img
                src="/icons/employee/illustration.svg"
                alt="Retract Illustration"
              />
            </div>

            {/* Body */}
            <div className="retract-body">
              <label>Please describe your reason of leave retraction</label>

              {/* <textarea placeholder="Add some description of the request"></textarea> */}

              <textarea
                value={retractRemark}
                onChange={(e) => setRetractRemark(e.target.value)}
                placeholder="Add some description of the request"
              />
            </div>

            {/* Footer */}
            <div className="retract-footer">
              {/* <button className="retract-submit-btn">Send Request</button> */}

              <button className="retract-submit-btn" onClick={handleRetract}>
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

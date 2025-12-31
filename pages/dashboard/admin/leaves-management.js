import { toast } from "react-toastify";

import Dashnav from "@/components/Dashnav";
import Leftbar from "@/components/Leftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";

export default function LeaveManagement() {
  const [reasonModalData, setReasonModalData] = useState(null);

  const [expandedReason, setExpandedReason] = useState(null);

  const [showSandwichWarning, setShowSandwichWarning] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [showDocModal, setShowDocModal] = useState(false);

  const [actionLeave, setActionLeave] = useState(null);
  const [actionType, setActionType] = useState(""); // "approve" | "reject"
  const [adminRemark, setAdminRemark] = useState("");
  const [showActionModal, setShowActionModal] = useState(false);

  const [leaves, setLeaves] = useState([]);
  const [loadingLeaves, setLoadingLeaves] = useState(true);

  const pendingCount = leaves.filter((l) => l.status === "Pending").length;
  const approvedCount = leaves.filter((l) => l.status === "Approved").length;
  const rejectedCount = leaves.filter((l) => l.status === "Rejected").length;
  const totalLeaves = leaves.length;

  const [showFilter, setShowFilter] = useState(false);

  const [filters, setFilters] = useState({
    status: "",
    leaveType: "",
    sandwich: "",
    fromDate: "",
    toDate: "",
  });

  useEffect(() => {
    async function fetchLeaves() {
      try {
        const res = await fetch("/api/admin/leave/list", {
          credentials: "include", // admin auth
        });

        const data = await res.json();

        if (data.success) {
          setLeaves(data.leaves);
        }
      } catch (err) {
        console.error("Fetch admin leaves error", err);
        toast.error("Failed to load leave requests");
      } finally {
        setLoadingLeaves(false);
      }
    }

    fetchLeaves();
  }, []);

  function getWorkingDays(start, end) {
    let count = 0;
    let d = new Date(start);

    while (d <= new Date(end)) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) count++;
      d.setDate(d.getDate() + 1);
    }

    return count;
  }

  const filteredLeaves = leaves.filter((leave) => {
    if (filters.status && leave.status !== filters.status) return false;

    if (filters.leaveType && leave.leaveType !== filters.leaveType)
      return false;

    if (
      filters.sandwich &&
      String(!!leave.policyFlags?.sandwichLeave) !== filters.sandwich
    )
      return false;

    if (filters.fromDate) {
      if (new Date(leave.startDate) < new Date(filters.fromDate)) return false;
    }

    if (filters.toDate) {
      if (new Date(leave.endDate) > new Date(filters.toDate)) return false;
    }

    return true;
  });

  // =================================excel export button =====================

  const exportLeaves = () => {
    if (filteredLeaves.length === 0) {
      toast.error("No leave data available to export");
      return;
    }

    // 1️⃣ CSV Headers (ALL IMPORTANT DETAILS)
    const headers = [
      "Employee Name",
      // "Employee ID",
      "Leave Type",
      "Start Date",
      "End Date",
      "Total Days",
      "Sandwich Leave",
      "Reason",
      "Employee Remark",
      "Status",
      "Admin Remark",
      "Documents Count",
    ];

    // 2️⃣ Map filteredLeaves to rows
    const rows = filteredLeaves.map((leave) => [
      `${leave.employee?.firstName || ""} ${leave.employee?.lastName || ""}`,
      // leave.employee?.employeeId || "",
      leave.leaveType || "",
      new Date(leave.startDate).toLocaleDateString(),
      new Date(leave.endDate).toLocaleDateString(),
      leave.totalDays || 0,
      leave.policyFlags?.sandwichLeave ? "Yes" : "No",
      leave.reason || "",
      leave.employeeRemark || "",
      leave.status || "",
      leave.adminRemark || "",
      leave.documents?.length || 0,
    ]);

    // 3️⃣ Convert to CSV string
    const csvContent = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    // 4️⃣ Create file & download
    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `leave_export_${new Date().toISOString().slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="leaves-management-admin">
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
          <Leftbar />
          <LeftbarMobile />
          <Dashnav />

          <section className="content home admin-attendance-summary">
            <div className="breadcrum-bx">
              <ul className="breadcrumb  bg-white">
                <li className="breadcrumb-item">
                  <Link href="/dashboard/dashboard">
                    <img src="/icons/attendance.svg" alt="Attendance Summary" />{" "}
                    Leaves Management
                  </Link>
                </li>
              </ul>
            </div>

            <div className="block-header add-emp-area">
              <div className="attendance-topbar  leave-management-topbar">
                {/* LEFT: TOGGLE */}
                <h5 className="admin-main-heading">Leaves Management</h5>

                {/* RIGHT: ACTIONS */}
                <div className="attendance-actions">
                  {/* <div className="date-box" style={{ cursor: "pointer" }}>
                    <input
                      type="date"
                      style={{
                        position: "absolute",
                        opacity: 0,
                        pointerEvents: "none",
                      }}
                    />

                    <i className="bi bi-calendar"></i>

                    <span></span>

                    <i className="bi bi-chevron-down"></i>
                  </div> */}

                  <button
                    className="filter-btn"
                    onClick={() => setShowFilter(true)}
                  >
                    <i className="bi bi-funnel"></i> Filter
                  </button>

                  <button className="export-btn" onClick={exportLeaves}>
                    <i className="bi bi-download"></i> Attendance Export
                  </button>
                </div>
              </div>

              <h5 className="admin-main-heading">Summary View</h5>

              {/* ================= TODAY ATTENDANCE HIGHLIGHTS ================= */}
              <div className="today-attendance-cards">
                {/* CARD 1 */}
                <div className="attendance-card blue">
                  <div className="card-left">
                    <div className="icon-circle blue">
                      <img src="/icons/admin/icon4.svg" />
                    </div>
                    <div>
                      <h6>Total Leave Requests</h6>
                      <p>All submitted leaves</p>
                    </div>
                  </div>
                  <div className="card-count">{totalLeaves}</div>
                </div>

                {/* CARD 2 */}
                <div className="attendance-card red">
                  <div className="card-left">
                    <div className="icon-circle red">
                      <img src="/icons/admin/icon2.svg" />
                    </div>
                    <div>
                      <h6>Pending Leave Requests</h6>
                      <p className="approval-pending">Waiting for approval</p>
                    </div>
                  </div>
                  <div className="card-count">
                    <span className="approval-pending">{pendingCount}</span>
                  </div>
                </div>

                {/* CARD 3 */}
                <div className="attendance-card green">
                  <div className="card-left">
                    <div className="icon-circle green">
                      <img src="/icons/admin/icon1.svg" />
                    </div>
                    <div>
                      <h6>Approved Leaves</h6>
                      <p>Successfully approved</p>
                    </div>
                  </div>
                  <div className="card-count">{approvedCount}</div>
                </div>

                {/* CARD 4 */}
                <div className="attendance-card orange">
                  <div className="card-left">
                    <div className="icon-circle orange">
                      <img src="/icons/admin/icon3.svg" />
                    </div>
                    <div>
                      <h6>Rejected Leaves</h6>
                      <p>Not approved</p>
                    </div>
                  </div>
                  <div className="card-count">{rejectedCount}</div>
                </div>
              </div>

              {/* ================= LEAVE TABLE ================= */}
              <div className="admin-leave-table-wrap table-wrapper">
                <table className="admin-leave-table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Leave Type</th>
                      <th>Date</th>
                      <th>Days</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {loadingLeaves ? (
                      <tr>
                        <td colSpan="7">Loading...</td>
                      </tr>
                    ) : filteredLeaves.length === 0 ? (
                      <tr>
                        <td colSpan="7">No leave requests found</td>
                      </tr>
                    ) : (
                      filteredLeaves.map((leave) => (
                        <tr key={leave._id}>
                          <td>
                            <div className="emp-cell">
                              <div className="avatar">
                                {leave.employee?.firstName?.[0]}
                                {leave.employee?.lastName?.[0]}
                              </div>
                              {leave.employee?.firstName}{" "}
                              {leave.employee?.lastName}
                            </div>
                          </td>

                          <td>{leave.leaveType}</td>

                          <td>
                            {new Date(leave.startDate).toLocaleDateString()} →{" "}
                            {new Date(leave.endDate).toLocaleDateString()}
                          </td>

                          {/* <td>{leave.totalDays}</td> */}

                          <td>
                            <div className="days-cell">
                              <strong>{leave.totalDays}</strong>

                              {leave.policyFlags?.sandwichLeave && (
                                <small className="extra-days">
                                  + Weekend Deduction
                                </small>
                              )}
                            </div>
                          </td>

                          {/* <td className="reason">
                            <div>{leave.reason}</div>

                            {leave.employeeRemark && (
                              <div className="employee-remark">
                                <strong>Employee Remark:</strong>{" "}
                                {leave.employeeRemark}
                              </div>
                            )}
                          </td> */}

                          {/* <td className="reason">
                            <div
                              className={`reason-text ${
                                expandedReason === leave._id ? "expanded" : ""
                              }`}
                            >
                              {leave.reason}
                            </div>

                            {leave.reason.length > 60 && (
                              <button
                                className="reason-toggle"
                                onClick={() =>
                                  setExpandedReason(
                                    expandedReason === leave._id
                                      ? null
                                      : leave._id
                                  )
                                }
                              >
                                {expandedReason === leave._id
                                  ? "Show less"
                                  : "Read more"}
                              </button>
                            )}

                            {leave.employeeRemark && (
                              <div className="employee-remark">
                                <strong>Employee Remark:</strong>{" "}
                                {leave.employeeRemark}
                              </div>
                            )}
                          </td> */}

                          <td className="reason">
                            <button
                              className="view-reason-btn"
                              onClick={() => setReasonModalData(leave)}
                            >
                              <i className="bi bi-eye"></i> View Reason
                            </button>
                          </td>

                          {/* 
                          <td>
                            <span
                              className={`status-pill ${
                                leave.status === "Pending"
                                  ? "pending"
                                  : leave.status === "Approved"
                                  ? "approved"
                                  : "rejected"
                              }`}
                            >
                              {leave.status}
                            </span>
                          </td> */}

                          <td>
                            <div className="leave-status-stack">
                              <span
                                className={`status-pill ${
                                  leave.status === "Pending"
                                    ? "pending"
                                    : leave.status === "Approved"
                                    ? "approved"
                                    : "rejected"
                                }`}
                              >
                                {leave.status}
                              </span>

                              {leave.policyFlags?.sandwichLeave && (
                                <span className="sandwich-badge">
                                  Sandwich Leave
                                </span>
                              )}
                            </div>
                          </td>

                          <td>
                            {/* VIEW DOCUMENT */}
                            {leave.documents?.length > 0 && (
                              <button
                                className="view-btn"
                                onClick={() => {
                                  setSelectedDocs(leave.documents);
                                  setShowDocModal(true);
                                }}
                              >
                                View Document
                              </button>
                            )}

                            {/* ACTIONS ONLY FOR PENDING */}
                            {leave.status === "Pending" && (
                              <>
                                <button
                                  className="approve-btn"
                                  onClick={async () => {
                                    try {
                                      const res = await fetch(
                                        "/api/admin/leave/approve",
                                        {
                                          method: "POST",
                                          headers: {
                                            "Content-Type": "application/json",
                                          },
                                          credentials: "include",
                                          body: JSON.stringify({
                                            leaveId: leave._id,
                                            remark: "", // no remark on approve
                                          }),
                                        }
                                      );

                                      const data = await res.json();

                                      if (data.success) {
                                        toast.success("Leave approved");

                                        setLeaves((prev) =>
                                          prev.map((l) =>
                                            l._id === leave._id
                                              ? { ...l, status: "Approved" }
                                              : l
                                          )
                                        );
                                      } else {
                                        toast.error(
                                          data.message || "Approve failed"
                                        );
                                      }
                                    } catch {
                                      toast.error("Server error");
                                    }
                                  }}
                                >
                                  Approve
                                </button>

                                <button
                                  className="reject-btn"
                                  onClick={() => {
                                    setActionLeave(leave);
                                    setActionType("reject");
                                    setShowActionModal(true);
                                  }}
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </div>

      {showDocModal && (
        <div className="leave-modal-root">
          <div
            className="leave-modal-backdrop"
            onClick={() => setShowDocModal(false)}
          />

          <div className="leave-modal-card">
            <div className="leave-modal-header">
              <span>Supporting Documents</span>
              <button
                className="leave-modal-close"
                onClick={() => setShowDocModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="leave-modal-body">
              {selectedDocs.map((doc, idx) => (
                <div key={idx} className="document-item">
                  <a href={doc} target="_blank" rel="noreferrer">
                    📄 View Document {idx + 1}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showActionModal && (
        <div className="leave-modal-root">
          <div
            className="leave-modal-backdrop"
            onClick={() => setShowActionModal(false)}
          />

          <div className="leave-modal-card">
            <div className="leave-modal-header">
              <span>
                {actionType === "approve" ? "Approve Leave" : "Reject Leave"}
              </span>
              <button
                className="leave-modal-close"
                onClick={() => setShowActionModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="leave-modal-body">
              <div className="form-group">
                <label>Admin Remark *</label>
                <textarea
                  value={adminRemark}
                  onChange={(e) => setAdminRemark(e.target.value)}
                  placeholder="Add remark for employee"
                />
              </div>
            </div>

            <div className="leave-modal-footer">
              <button
                className="submit-btn"
                onClick={async () => {
                  if (!adminRemark.trim()) {
                    toast.error("Remark is required");
                    return;
                  }

                  try {
                    const endpoint =
                      actionType === "approve"
                        ? "/api/admin/leave/approve"
                        : "/api/admin/leave/reject";

                    const res = await fetch(endpoint, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      credentials: "include",
                      body: JSON.stringify({
                        leaveId: actionLeave._id,
                        remark: adminRemark,
                      }),
                    });

                    const data = await res.json();

                    if (data.success) {
                      toast.success(
                        actionType === "approve"
                          ? "Leave approved"
                          : "Leave rejected"
                      );

                      setLeaves((prev) =>
                        prev.map((l) =>
                          l._id === actionLeave._id
                            ? {
                                ...l,
                                status:
                                  actionType === "approve"
                                    ? "Approved"
                                    : "Rejected",
                                adminRemark,
                              }
                            : l
                        )
                      );

                      setShowActionModal(false);
                      setAdminRemark("");
                      setActionLeave(null);
                    } else {
                      toast.error(data.message || "Action failed");
                    }
                  } catch (err) {
                    toast.error("Server error");
                  }
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {showSandwichWarning && (
        <div className="leave-warning-overlay">
          <div className="leave-warning-card">
            <h4>Sandwich Leave Warning</h4>

            <p>
              This leave includes <strong>weekend days</strong>. Extra leave
              balance will be deducted.
            </p>

            <p className="warning-highlight">
              Total Deduction: {actionLeave?.totalDays} days
            </p>

            <div className="warning-actions">
              <button
                className="confirm-btn"
                onClick={() => {
                  setShowSandwichWarning(false);
                  setShowActionModal(true);
                }}
              >
                Proceed to Approve
              </button>

              <button
                className="cancel-btn"
                onClick={() => {
                  setShowSandwichWarning(false);
                  setActionLeave(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== LEAVE FILTER PANEL ===== */}
      <div className={`admin-filter-panel ${showFilter ? "open" : ""}`}>
        <div className="admin-filter-header">
          <h6>Filter Leaves</h6>
          <button className="close-btn" onClick={() => setShowFilter(false)}>
            ✕
          </button>
        </div>

        <div className="admin-filter-body">
          {/* Status */}
          <div className="filter-group">
            <label>Leave Status</label>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters({ ...filters, status: e.target.value })
              }
            >
              <option value="">All</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {/* Leave Type */}
          <div className="filter-group">
            <label>Leave Type</label>
            <select
              value={filters.leaveType}
              onChange={(e) =>
                setFilters({ ...filters, leaveType: e.target.value })
              }
            >
              <option value="">All</option>
              <option value="Casual Leave">Casual Leave</option>
              <option value="Sick Leave">Sick Leave</option>
              <option value="Paid Leave">Paid Leave</option>
            </select>
          </div>

          {/* Sandwich Leave */}
          <div className="filter-group">
            <label>Sandwich Leave</label>
            <select
              value={filters.sandwich}
              onChange={(e) =>
                setFilters({ ...filters, sandwich: e.target.value })
              }
            >
              <option value="">All</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>

          {/* Date Range */}
          <div className="filter-group">
            <label>From Date</label>
            <input
              type="date"
              value={filters.fromDate}
              onChange={(e) =>
                setFilters({ ...filters, fromDate: e.target.value })
              }
            />
          </div>

          <div className="filter-group">
            <label>To Date</label>
            <input
              type="date"
              value={filters.toDate}
              onChange={(e) =>
                setFilters({ ...filters, toDate: e.target.value })
              }
            />
          </div>
        </div>

        <div className="admin-filter-footer">
          <button className="apply-btn" onClick={() => setShowFilter(false)}>
            Apply Filters
          </button>

          <button
            className="reset-btn"
            onClick={() =>
              setFilters({
                status: "",
                leaveType: "",
                sandwich: "",
                fromDate: "",
                toDate: "",
              })
            }
          >
            Reset
          </button>
        </div>
      </div>

      {/* =========================== reason model ===================== */}

      {reasonModalData && (
        <div className="leave-modal-root">
          <div
            className="leave-modal-backdrop"
            onClick={() => setReasonModalData(null)}
          />

          <div className="leave-modal-card">
            <div className="leave-modal-header">
              <span>Leave Reason</span>
              <button
                className="leave-modal-close"
                onClick={() => setReasonModalData(null)}
              >
                ✕
              </button>
            </div>

            <div className="leave-modal-body">
              <p>
                <strong>Reason:</strong>
              </p>
              <p>{reasonModalData.reason}</p>

              {reasonModalData.employeeRemark && (
                <>
                  <hr />
                  <p>
                    <strong>Employee Remark:</strong>
                  </p>
                  <p>{reasonModalData.employeeRemark}</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState, useMemo } from "react";

import Head from "next/head";
import Link from "next/link";
import Dashnav from "@/components/Dashnav";
import Leftbar from "@/components/Leftbar";
import { toast } from "react-toastify";
import LeftbarMobile from "@/components/LeftbarMobile";

export default function LeaveAttendanceOverview() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const [loading, setLoading] = useState(false);
      const [holidays, setHolidays] = useState([]);
  

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



  /** ✅ Approve or Reject Leave */
  // const handleAction = async (leaveId, action) => {
  //   setLoading(true);
  //   try {
  //     const res = await fetch("/api/payroll/leave/action", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({ leaveId, action }),
  //     });

  //     const data = await res.json();
  //     if (data.success) {
  //       toast.success(`Leave ${action} successfully`);

  //       // ✅ Update status in UI without removing row
  //       setPendingLeaves((prev) =>
  //         prev.map((leave) =>
  //           leave._id === leaveId ? { ...leave, status: action } : leave
  //         )
  //       );
  //     } else {
  //       toast.error(data.message || "Action failed");
  //     }
  //   } catch (err) {
  //     console.error("Action error:", err);
  //     toast.error("Server error");
  //   }
  //   setLoading(false);
  // };

  const handleAction = async (leaveId, action) => {
    setLoading(true);
    try {
      const res = await fetch("/api/payroll/leave/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leaveId, action }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Leave marked as ${action}`);
        // ✅ Update state (only status changes, row stays)
        setPendingLeaves((prev) =>
          prev.map((leave) =>
            leave._id === leaveId ? { ...leave, status: action } : leave
          )
        );
      } else {
        toast.error(data.message || "Action failed");
      }
    } catch (err) {
      console.error("Action error:", err);
      toast.error("Server error");
    }
    setLoading(false);
  };

  const filteredLeaves = useMemo(() => {
    return pendingLeaves.filter((leave) => {
      const fullName = `${leave.employeeId?.firstName || ""} ${
        leave.employeeId?.lastName || ""
      }`.toLowerCase();
      const matchName = fullName.includes(search.toLowerCase());
      const matchStatus =
        statusFilter === "All" || leave.status === statusFilter;
      return matchName && matchStatus;
    });
  }, [pendingLeaves, search, statusFilter]);

  const totalPages = Math.ceil(filteredLeaves.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentLeaves = filteredLeaves.slice(
    startIndex,
    startIndex + rowsPerPage
  );

  const handlePageChange = (page) => setCurrentPage(page);
  return (
    <div className="career-response add-employee leave-and-attendance">
      <Head>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
      </Head>

      <div className="main-nav">
        <Dashnav />
        <Leftbar />
        <LeftbarMobile/>

        <section className="content home">
          <div className="block-header">
            <div className="row pt-50 pb-20 main-row-bx1 mt-3">
              <div className="col-lg-7 col-md-6 col-sm-12">
                <h2>
                  Leave & Attendance Overview
                  <small className="text-white">Welcome to Viralon</small>
                </h2>
              </div>
              <div className="col-lg-5 col-md-6 col-sm-12">
                <ul className="breadcrumb float-md-right">
                  <li className="breadcrumb-item">
                    <Link href="/dashboard/dashboard">
                      <i className="zmdi zmdi-home"></i> Viralon 
                    </Link>
                  </li>
                  <li className="breadcrumb-item active">
                    Leave & Attendance Overview
                  </li>
                </ul>
              </div>
            </div>

            {/* ✅ Attendance Summary */}
            <div className="container-emp mt-4">
              <div className="row">
                <div className="col-md-12">
                  <div className="card shadow-sm p-4 mb-4 items-home">
                    <div className="d-flex justify-content-between align-items-center">
                      <h5 className="fw-bold mb-0">Attendance Summary</h5>
                      <span className="text-muted">
                        <i className="bi bi-calendar"></i> Today
                      </span>
                    </div>
                    <hr />
                    <p className="mb-2">
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
                    <div className="d-flex justify-content-between small small-fonts">
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

              
              </div>

              <div className="row">
                <div className="col-md-12">
                  <div className="card  p-4 mb-4 items-home">
                    {/* Header with Filters */}
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <h5 className="fw-bold mb-0">Approval Requests</h5>
                      <div className="d-flex gap-2 filters-name">
                        {/* Search Filter */}
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Search by name"
                          style={{ width: 200 }}
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                        />
                        {/* Status Filter */}
                        <select
                          className="form-select form-select-sm"
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                        >
                          <option value="All">All</option>
                          <option value="Pending">Pending</option>
                          <option value="Approved">Approved</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                      </div>
                    </div>

                    {/* Table Section */}
                    {filteredLeaves.length === 0 ? (
                      <p className="text-center text-muted py-3">
                        No requests found
                      </p>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-hover align-middle table-striped">
                          <thead style={{ backgroundColor: "#f8f9fa" }}>
                            <tr>
                              <th>Employee</th>
                              <th>Type</th>
                              <th>From</th>
                              <th>To</th>
                              <th style={{ minWidth: "200px" }}>Reason</th>
                              <th>Status</th>
                              <th>Action</th>
                              <th>Medical Reports</th>
                              <th>Policy Flags</th>
                            </tr>
                          </thead>
                          <tbody>
                            {currentLeaves.map((leave, idx) => {
                              const getStatusStyles = (status) => {
                                if (status === "Approved") {
                                  return {
                                    backgroundColor: "#d1f7d6",
                                    color: "#237e39",
                                  };
                                } else if (status === "Rejected") {
                                  return {
                                    backgroundColor: "#5a57fb3d",
                                    color: "#5a57fb",
                                  };
                                } else {
                                  return {
                                    backgroundColor: "#fff3cd",
                                    color: "#856404",
                                  };
                                }
                              };

                              const statusStyle = getStatusStyles(leave.status);

                              return (
                                <tr key={idx}>
                                  <td>
                                    <strong>
                                      {leave.employeeId
                                        ? `${leave.employeeId.firstName} ${leave.employeeId.lastName}`
                                        : "Unknown"}
                                    </strong>
                                  </td>
                                  <td>
                                    <span className="badge bg-grey text-dark">
                                      {leave.type}
                                    </span>
                                  </td>
                                  <td>
                                    {new Date(leave.from).toLocaleDateString()}
                                  </td>
                                  <td>
                                    {new Date(leave.to).toLocaleDateString()}
                                  </td>
                                  <td>{leave.reason || "-"}</td>
                                  <td>
                                    <span
                                      style={{
                                        padding: "4px 12px",
                                        borderRadius: "999px",
                                        fontSize: "0.75rem",
                                        fontWeight: 600,
                                        backgroundColor:
                                          statusStyle.backgroundColor,
                                        color: statusStyle.color,
                                      }}
                                    >
                                      {leave.status}
                                    </span>
                                  </td>
                                  <td className="d-flex align-items-center w-200">
                                    {/* Approve Button */}
                                    <button
                                      style={{
                                        backgroundColor:
                                          leave.status === "Approved"
                                            ? "#e0f3e5"
                                            : "#02EBAD",
                                        color:
                                          leave.status === "Approved"
                                            ? "#02EBAD"
                                            : "#fff",
                                        border: "none",
                                        borderRadius: "30px",
                                        padding: "4px 12px",
                                        fontWeight: "600",
                                        fontSize: "11px",
                                        marginRight: "6px",
                                        boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                                        cursor:
                                          leave.status === "Approved" || loading
                                            ? "not-allowed"
                                            : "pointer",
                                      }}
                                      disabled={
                                        loading || leave.status === "Approved"
                                      }
                                      onClick={() =>
                                        handleAction(leave._id, "Approved")
                                      }
                                    >
                                      {leave.status === "Approved"
                                        ? "✓ Approved"
                                        : "Approve"}
                                    </button>

                                    {/* Reject Button */}
                                    <button
                                      style={{
                                        backgroundColor:
                                          leave.status === "Rejected"
                                            ? "#5a57fb3d"
                                            : "#5a57fb",
                                        color:
                                          leave.status === "Rejected"
                                            ? "#5a57fb"
                                            : "#fff",
                                        border: "none",
                                        borderRadius: "30px",
                                        padding: "4px 12px",
                                        fontWeight: "600",
                                        fontSize: "11px",
                                        boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                                        cursor:
                                          leave.status === "Rejected" || loading
                                            ? "not-allowed"
                                            : "pointer",
                                      }}
                                      disabled={
                                        loading || leave.status === "Rejected"
                                      }
                                      onClick={() =>
                                        handleAction(leave._id, "Rejected")
                                      }
                                    >
                                      {leave.status === "Rejected"
                                        ? "✗ Rejected"
                                        : "Reject"}
                                    </button>
                                  </td>

                                  <td>
                                    {leave.policyMeta?.medicalCertUrl ? (
                                      <a
                                        href={leave.policyMeta.medicalCertUrl}
                                        target="_blank"
                                        className="btn btn-sm btn-outline-primary"
                                      >
                                        <i className="bi bi-file-earmark-medical me-1"></i>{" "}
                                        View Certificate
                                      </a>
                                    ) : (
                                      <span className="text-muted">—</span>
                                    )}
                                  </td>

                                 

                                  <td style={{ whiteSpace: 'nowrap' }}>
                                    {leave.policyMeta?.policyWarnings
                                      ?.length ? (
                                      <ul className="small text-danger mb-0 ps-3">
                                        {leave.policyMeta.policyWarnings.map(
                                          (w, i) => (
                                            <li key={i}>{w}</li>
                                          )
                                        )}
                                      </ul>
                                    ) : (
                                      <span className="text-muted small">
                                        No flags.
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <nav className="mt-3">
                        <ul className="pagination justify-content-center">
                          {Array.from({ length: totalPages }, (_, i) => (
                            <li
                              key={i}
                              className={`page-item ${
                                currentPage === i + 1 ? "active" : ""
                              }`}
                            >
                              <button
                                className="page-link"
                                onClick={() => handlePageChange(i + 1)}
                              >
                                {i + 1}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </nav>
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

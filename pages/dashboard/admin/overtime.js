import { toast } from "react-toastify";

import React, { useEffect, useState } from "react";
import Dashnav from "@/components/Dashnav";
import Leftbar from "@/components/Leftbar";
import Head from "next/head";
import Link from "next/link";

export default function AdminOvertime() {
  const [loading, setLoading] = useState(true);
  const [overtimeList, setOvertimeList] = useState([]);

  const [rejectModal, setRejectModal] = useState(null);
  const [rejectRemark, setRejectRemark] = useState("");

  useEffect(() => {
    async function fetchAdminOT() {
      try {
        const token = localStorage.getItem("employeeToken");

        const res = await fetch("/api/admin/overtime/list", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();
        if (data.success) {
          setOvertimeList(data.overtimeRequests);
        }
      } catch (err) {
        console.error("Failed to load admin OT", err);
      } finally {
        setLoading(false);
      }
    }

    fetchAdminOT();
  }, []);

  //  this is reject ot

  const handleRejectOT = async (id, remark) => {
    if (!remark || remark.trim() === "") {
      toast.error("Please enter a rejection remark");
      return;
    }

    try {
      const res = await fetch("/api/admin/overtime/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, remark }),
      });

      const data = await res.json();
      if (!data.success) {
        toast.error("Failed to reject overtime");
        return;
      }

      // ✅ Update UI
      setOvertimeList((prev) =>
        prev.map((ot) =>
          ot._id === id
            ? { ...ot, status: "Rejected", adminRemark: remark }
            : ot,
        ),
      );

      setRejectModal(null);
      setRejectRemark("");
      toast.success("Overtime rejected successfully");
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong");
    }
  };

  //  this is approve  ot

  const handleApproveOT = async (id) => {
    try {
      const res = await fetch("/api/admin/overtime/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const data = await res.json();
      if (!data.success) {
        toast.error("Failed to approve overtime");
        return;
      }

      // ✅ Update UI instantly
      setOvertimeList((prev) =>
        prev.map((ot) => (ot._id === id ? { ...ot, status: "Approved" } : ot)),
      );

      toast.success("Overtime approved successfully");
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong");
    }
  };

  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString("en-GB");

  const formatTime = (time) => {
    const [h, m] = time.split(":");
    const hour = Number(h);
    const suffix = hour >= 12 ? "PM" : "AM";
    return `${hour % 12 || 12}:${m} ${suffix}`;
  };

  const calculateHours = (start, end) => {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    return `${(eh * 60 + em - (sh * 60 + sm)) / 60}h`;
  };

  return (
    <section className="over-time-area">
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
        <Dashnav />

        <section className="content home">
          {/* Breadcrumb */}
          <div className="breadcrum-bx">
            <ul className="breadcrumb bg-white">
              <li className="breadcrumb-item">
                <Link href="/dashboard/dashboard">
                  <img src="/icons/home.svg" /> Dashboard
                </Link>
              </li>
              <li className="breadcrumb-item active">Overtime Requests</li>
            </ul>
          </div>

          {/* Page Header */}
          <div className="block-header add-emp-area">
            <div className="reim-page-head">
              <h2>Overtime Requests</h2>
              <p>Review and manage employee overtime requests</p>
            </div>

            {/* Table */}
            <div className="reim-section">
              <div className="reim-section-head">
                <div>
                  <h4>All Overtime Requests</h4>
                  <p>Pending, approved, and rejected overtime entries</p>
                </div>
              </div>
             <div className="table-scroll-x">
              <table className="reim-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Date</th>
                    <th>Project</th>
                    <th>OT Type</th>
                    <th>Time</th>
                     <th>OT Access Given By</th> {/* ✅ NEW */}
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: "center" }}>
                        Loading overtime requests...
                      </td>
                    </tr>
                  ) : overtimeList.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: "center" }}>
                        No overtime requests found
                      </td>
                    </tr>
                  ) : (
                    overtimeList.map((ot) => (
                      <tr key={ot._id}>
                        {/* Employee */}
                        <td>
                          {ot.employee?.personal?.firstName}{" "}
                          {ot.employee?.personal?.lastName}
                        </td>

                        {/* Date */}
                        <td>{formatDate(ot.date)}</td>

                        {/* Project */}
                        <td>{ot.project}</td>

                        {/* OT Type */}
                        <td>
                          <span className="tag blue">{ot.otType}</span>
                        </td>

                        {/* Time */}
                        <td>
                          {formatTime(ot.startTime)} – {formatTime(ot.endTime)}
                          <br />
                          <small className="text-muted">
                            {calculateHours(ot.startTime, ot.endTime)}
                          </small>
                        </td>

                        <td>
  <span className="tag blue">
    {ot.otApprover || "-"}
  </span>
</td>

                        {/* Status */}
                        <td>
                          <span
                            className={`tag ${
                              ot.status === "Approved"
                                ? "green"
                                : ot.status === "Rejected"
                                  ? "red"
                                  : "blue"
                            }`}
                          >
                            {ot.status}
                          </span>
                        </td>

                        {/* Actions (UI only for now) */}
                        <td>
                          <div className="admin-reim-actions">
                            {ot.status === "Pending" ? (
                              <>
                                <button
                                  className="btn-approve"
                                  onClick={() => handleApproveOT(ot._id)}
                                >
                                  <i className="bi bi-check-circle"></i>
                                  Approve
                                </button>

                                <button
                                  className="btn-reject"
                                  onClick={() => setRejectModal(ot)}
                                >
                                  <i className="bi bi-x-circle"></i>
                                  Reject
                                </button>
                              </>
                            ) : (
                              <span
                                className={`status-pill ${
                                  ot.status === "Approved"
                                    ? "approved"
                                    : "rejected"
                                }`}
                              >
                                <i className="bi bi-check-circle"></i>
                                {ot.status}
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              </div>
            </div>
          </div>
        </section>

        {rejectModal && (
          <div className="leave-modal-root">
            <div
              className="leave-modal-backdrop"
              onClick={() => setRejectModal(null)}
            />

            <div className="leave-modal-card">
              <div className="leave-modal-header">
                <span>Reject Overtime Request</span>
                <button
                  className="leave-modal-close"
                  onClick={() => setRejectModal(null)}
                >
                  ✕
                </button>
              </div>

              <div className="leave-modal-body">
                <textarea
                  className="reim-input"
                  placeholder="Enter rejection reason"
                  value={rejectRemark}
                  onChange={(e) => setRejectRemark(e.target.value)}
                />
              </div>

              <div className="leave-modal-footer">
                <button
                  className="reim-cancel-btn"
                  onClick={() => setRejectModal(null)}
                >
                  Cancel
                </button>

                <button
                  className="reim-create-btn"
                  onClick={() => handleRejectOT(rejectModal._id, rejectRemark)}
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

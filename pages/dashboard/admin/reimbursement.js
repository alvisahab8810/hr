import { toast } from "react-toastify";

import Dashnav from "@/components/Dashnav";
import Leftbar from "@/components/Leftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";

export default function reimbursement() {
  const [docModal, setDocModal] = useState(null);
  const [reimbursements, setReimbursements] = useState([]);
  const [loading, setLoading] = useState(true);

  const [rejectModal, setRejectModal] = useState(null);
  const [rejectRemark, setRejectRemark] = useState("");

  useEffect(() => {
    async function fetchData() {
      const res = await fetch("/api/admin/reimbursement/list");
      const data = await res.json();
      if (data.success) setReimbursements(data.data);
      setLoading(false);
    }
    fetchData();
  }, []);

  const handleApprove = async (id) => {
    await fetch("/api/admin/reimbursement/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    setReimbursements((prev) =>
      prev.map((r) => (r._id === id ? { ...r, status: "Approved" } : r))
    );
  };



  const handleReject = async (id, remark) => {
  if (!remark || remark.trim() === "") {
    toast.error("Please enter a rejection remark");
    return;
  }

  try {
    const res = await fetch("/api/admin/reimbursement/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, remark }),
    });

    const data = await res.json();

    if (!data.success) {
      toast.error("Failed to reject reimbursement");
      return;
    }

    // ✅ Update UI status
    setReimbursements((prev) =>
      prev.map((r) =>
        r._id === id ? { ...r, status: "Rejected", adminRemark: remark } : r
      )
    );

    // ✅ CLOSE MODAL
    setRejectModal(null);
    setRejectRemark("");

    // ✅ SHOW TOAST
    toast.success("Reimbursement rejected successfully");

  } catch (err) {
    console.error(err);
    toast.error("Something went wrong");
  }
};



// ===============  Pending Counter ======================

const pendingCount = reimbursements.filter(
  (r) => r.status === "Pending"
).length


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
                    Reimbursement
                  </Link>
                </li>
              </ul>
            </div>

            <div className="block-header add-emp-area">
                {/* Reimbursement Requests<span className="re-alert">1</span> */}

                <h5 className="admin-main-heading">
                  Reimbursement Requests
                  {pendingCount > 0 && (
                    <span className="re-alert">{pendingCount}</span>
                  )}

              </h5>

              <div className="admin-reim-root">
                <table className="admin-reim-table">
                  <thead>
                    <tr>
                      <th>Employee Name</th>
                      <th>Expense Category</th>
                      <th>Payment Date</th>
                      <th>Amount</th>
                      <th>Description</th>
                      <th>Submitted</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="7">Loading...</td>
                      </tr>
                    ) : reimbursements.length === 0 ? (
                      <tr>
                        <td colSpan="7">No reimbursement requests</td>
                      </tr>
                    ) : (
                      reimbursements.map((item) => (
                        <tr key={item._id}>
                          <td className="emp-name">
                            {item.employee?.personal?.firstName
                              ? `${item.employee.personal.firstName} ${
                                  item.employee.personal.lastName || ""
                                }`
                              : item.employee?.firstName
                              ? `${item.employee.firstName} ${
                                  item.employee.lastName || ""
                                }`
                              : item.employee?.email || "—"}
                          </td>

                          <td>{item.category}</td>

                          <td>
                            {new Date(item.paymentDate).toLocaleDateString()}
                          </td>

                          <td>₹ {item.amount}</td>

                          <td className="desc-cell">{item.description}</td>

                          <td>
                            {new Date(item.createdAt).toLocaleDateString()}
                          </td>

                          <td>
                            <div className="admin-reim-actions">
                              {/* View Docs */}
                              <button
                                className="btn-doc"
                                onClick={() => setDocModal(item)}
                              >
                                <i className="bi bi-download"></i>
                                View Documents
                              </button>

                              {/* Status / Actions */}
                              {item.status === "Pending" ? (
                                <>
                                  <button
                                    className="btn-approve"
                                    onClick={() => handleApprove(item._id)}
                                  >
                                    <i className="bi bi-check-circle"></i>
                                    Approve
                                  </button>

                                  <button
                                    className="btn-reject"
                                    onClick={() => setRejectModal(item)}
                                  >
                                    <i className="bi bi-x-circle"></i>
                                    Reject
                                  </button>
                                </>
                              ) : (
                                <span
                                  className={`status-pill ${
                                    item.status === "Approved"
                                      ? "approved"
                                      : "rejected"
                                  }`}
                                >
                                  <i className="bi bi-check-circle"></i>
                                  {item.status}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {/* Manager instructions */}
                <div className="admin-reim-instructions">
                  <h6>Instructions</h6>
                  <ul>
                    <li>
                      Review each reimbursement request carefully, including
                      confirmation documents
                    </li>
                    <li>
                      Approved requests move to Finance queue automatically
                    </li>
                    <li>
                      Rejected requests are returned to employee with
                      notification
                    </li>
                    <li>Use “View Documents” before decision</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {docModal && (
            <div className="leave-modal-root">
              <div
                className="leave-modal-backdrop"
                onClick={() => setDocModal(null)}
              />

              <div className="leave-modal-card">
                <div className="leave-modal-header">
                  <span>Uploaded Documents</span>
                  <button
                    className="leave-modal-close"
                    onClick={() => setDocModal(null)}
                  >
                    ✕
                  </button>
                </div>

                <div className="leave-modal-body">
                  {docModal.attachments.length === 0 ? (
                    <p>No documents uploaded</p>
                  ) : (
                    <ul>
                      {docModal.attachments.map((doc, i) => (
                        <li key={i}>
                          <a href={doc} target="_blank">
                            View Document {i + 1}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ======== Reject Model ================ */}

          {rejectModal && (
            <div className="leave-modal-root">
              <div
                className="leave-modal-backdrop"
                onClick={() => setRejectModal(null)}
              />

              <div className="leave-modal-card">
                <div className="leave-modal-header">
                  <span>Reject Reimbursement</span>
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
                    onClick={() => handleReject(rejectModal._id, rejectRemark)}
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

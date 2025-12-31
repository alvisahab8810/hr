import { toast } from "react-toastify";
import Dashnav from "@/components/Dashnav";
import LeftbarMobile from "@/components/employee/LeftbarMobile";

import React, { useEffect, useState, useRef } from "react";
import Head from "next/head";
import Link from "next/link";
import EmployeeLeftbar from "@/components/employee/Leftbar";

export default function Reimbursement() {
  const [remarkModal, setRemarkModal] = useState(null);
  const fileInputRef = useRef(null);
  const [attachments, setAttachments] = useState([]);
  const [showReimModal, setShowReimModal] = useState(false);
  const [reimbursements, setReimbursements] = useState([]);
  const [loadingReim, setLoadingReim] = useState(true);

  const [category, setCategory] = useState("Office Expense");
  const [paymentDate, setPaymentDate] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const thisMonthReims = reimbursements.filter((r) => {
    const d = new Date(r.paymentDate);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const approvedAmount = thisMonthReims
    .filter((r) => r.status === "Approved" || r.status === "Processed")
    .reduce((sum, r) => sum + Number(r.amount), 0);

  const rejectedAmount = thisMonthReims
    .filter((r) => r.status === "Rejected")
    .reduce((sum, r) => sum + Number(r.amount), 0);

  const paidAmount = thisMonthReims
    .filter((r) => r.status === "Processed")
    .reduce((sum, r) => sum + Number(r.amount), 0);

  const pendingAmount = thisMonthReims
    .filter((r) => r.status === "Pending")
    .reduce((sum, r) => sum + Number(r.amount), 0);

  useEffect(() => {
    async function fetchReimbursements() {
      try {
        const token = localStorage.getItem("employeeToken");

        const res = await fetch("/api/employee/reimbursement/list", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();
        if (data.success) {
          setReimbursements(data.reimbursements);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingReim(false);
      }
    }

    fetchReimbursements();
  }, []);

  const handleCreateReimbursement = async () => {
    if (!category || !paymentDate || !amount || !description) {
      toast.error("Please fill all required fields");
      return;
    }

    if (attachments.length === 0) {
      toast.error("Please attach at least one bill");
      return;
    }

    try {
      setSubmitting(true);

      const token = localStorage.getItem("employeeToken");

      // 🔹 FormData for files + fields
      const formData = new FormData();
      formData.append("category", category);
      formData.append("paymentDate", paymentDate);
      formData.append("amount", amount);
      formData.append("description", description);

      attachments.forEach((file) => {
        formData.append("attachments", file);
      });

      const res = await fetch("/api/employee/reimbursement/create", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (!data.success) {
        toast.error(data.message || "Failed to submit request");
        return;
      }

      toast.success("Reimbursement request submitted");

      // 🔹 Refresh list
      setReimbursements((prev) => [data.reimbursement, ...prev]);

      // 🔹 Reset form
      setCategory("Office Expense");
      setPaymentDate("");
      setAmount("");
      setDescription("");
      setAttachments([]);
      setShowReimModal(false);
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

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
                      src="/icons/reimbursement.svg"
                      alt="Attendance Summary"
                    />{" "}
                    Reimbursement
                  </Link>
                </li>
              </ul>
            </div>

            <div className="block-header add-emp-area">
              <div className="reim-page-head">
                <h2>Expense Reimbursement</h2>
                <p>Submit and track your expense reimbursement requests</p>
              </div>

              <div className="reim-summary-grid">
                {/* Card 1 */}
                <div className="reim-card">
                  <div>
                    <p className="reim-card-title">Approved Reimbursements</p>
                    <h3>₹ {approvedAmount}</h3>
                    <span>This month</span>
                  </div>
                  <div className="reim-icon green">
                    <img src="/icons/employee/done.svg" alt="approved" />
                  </div>
                </div>

                {/* Card 2 */}

                <div className="reim-card">
                  <div>
                    <p className="reim-card-title">Rejected Requests</p>
                    <h3>₹ {rejectedAmount}</h3>
                    <span>This month</span>
                  </div>
                  <div className="reim-icon red">
                    <img src="/icons/employee/cancel.svg" alt="rejected" />
                  </div>
                </div>

                {/* Card 3 */}
                <div className="reim-card">
                  <div>
                    {/* <p className="reim-card-title">Total Paid</p>
                    <h3 className="green-text">₹ {paidAmount}</h3>
                    <span>This month</span> */}

                    <p className="reim-card-title">Pending Amount</p>
                    <h3 className="green-text">₹ {pendingAmount}</h3>
                    <span>This month</span>
                  </div>
                  <div className="reim-icon blue">
                    <img src="/icons/employee/rupee.svg" alt="paid" />
                  </div>
                </div>
              </div>

              <div className="reim-section">
                <div className="reim-section-head">
                  <div>
                    <h4>My Expense Requests</h4>
                    <p>View your expense request history and status</p>
                  </div>

                  <button
                    className="reim-submit-btn"
                    onClick={() => setShowReimModal(true)}
                  >
                    <img src="/icons/employee/plus.svg"></img> Submit Expense
                  </button>
                </div>

                <table className="reim-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Description</th>
                      <th>Amount</th>
                      <th>Payment Date</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  {/* <tbody>
                    <tr>
                      <td>
                        <span className="tag blue">Travel</span>
                      </td>
                      <td>Visit at colomoto and lunch</td>
                      <td>₹ 1500</td>
                      <td>9/15/2024</td>
                      <td>
                        <span className="tag green">Approved</span>
                      </td>
                      <td>
                        <img src="/icons/employee/upload-dark.svg" alt="file" />

                      </td>
                    </tr>
                  </tbody> */}

                  <tbody>
                    {loadingReim ? (
                      <tr>
                        <td colSpan="6">Loading...</td>
                      </tr>
                    ) : reimbursements.length === 0 ? (
                      <tr>
                        <td colSpan="6">No reimbursement requests found</td>
                      </tr>
                    ) : (
                      reimbursements.map((item) => (
                        <tr key={item._id}>
                          <td>
                            <span className="tag blue">{item.category}</span>
                          </td>

                          <td>{item.description}</td>

                          <td>₹ {item.amount}</td>

                          <td>
                            {new Date(item.paymentDate).toLocaleDateString()}
                          </td>

                          <td>
                            <span
                              className={`tag ${
                                item.status === "Approved"
                                  ? "green"
                                  : item.status === "Rejected"
                                  ? "red"
                                  : "blue"
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>

                          {/* <td>
                            <img
                              src="/icons/employee/upload-dark.svg"
                              alt="file"
                              style={{ cursor: "pointer" }}
                            />
                          </td> */}

                          {/* <td>
                          {item.status === "Rejected" ? (
                            <img
                              src="/icons/employee/upload-dark.svg"
                              alt="remark"
                              style={{ cursor: "pointer" }}
                              onClick={() => setRemarkModal(item)}
                            />
                          ) : (
                            "-"
                          )}
                            
                        </td> */}

                          <td>
                            {item.status === "Rejected" ? (
                              <button
                                className="reim-view-remark-btn"
                                onClick={() => setRemarkModal(item)}
                              >
                                View Remark
                              </button>
                            ) : (
                              "-"
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

        {showReimModal && (
          <div className="reim-modal-root">
            <div
              className="reim-modal-backdrop"
              onClick={() => setShowReimModal(false)}
            />

            <div className="reim-modal-card">
              {/* Header */}
              <div className="reim-modal-header">
                <div className="reim-modal-title">
                  <img src="/icons/employee/upload-dark.svg" alt="file" />

                  <span>Submit Reimbursement Request</span>
                </div>

                <button
                  className="reim-modal-close"
                  onClick={() => setShowReimModal(false)}
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <div className="reim-modal-body">
                {/* Category */}
                <div className="reim-form-group">
                  <label>Expense Category</label>
                  <select
                    className="reim-input"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option>Office Expense</option>
                    <option>Travel</option>
                    <option>Food</option>
                  </select>
                </div>

                <div className="others-fields-r">
                  {/* Date + Amount */}
                  <div className="reim-form-row date-amount-row">
                    <div className="reim-form-group">
                      <label>Payment Date *</label>
                      <input
                        type="date"
                        className="reim-input"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                      />
                    </div>

                    <div className="reim-form-group">
                      <label>Amount *</label>
                      <input
                        type="number"
                        className="reim-input"
                        placeholder="400"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="reim-form-group">
                    <label>Description *</label>

                    <textarea
                      className="reim-input"
                      rows="3"
                      value={description}
                      placeholder="Bought decoration items for christmas celebration at office"
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>

                  {/* Upload */}
                  <div className="reim-form-group">
                    <label>Attach Bill/Invoice (PDF/JPG)</label>
                    <div className="reim-upload-box">
                      {/* Uploaded previews (LEFT SIDE) */}
                      {attachments.map((file, index) => (
                        <div className="reim-upload-preview" key={index}>
                          <img
                            src={URL.createObjectURL(file)}
                            alt="preview"
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        </div>
                      ))}

                      {/* Add button */}
                      <button
                        type="button"
                        className="reim-upload-btn"
                        onClick={() => fileInputRef.current.click()}
                      >
                        +
                      </button>

                      {/* Hidden file input */}
                      <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: "none" }}
                        accept=".pdf,.jpg,.jpeg,.png"
                        multiple
                        onChange={(e) => {
                          const files = Array.from(e.target.files);
                          setAttachments((prev) => [...prev, ...files]);
                          e.target.value = null;
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="reim-modal-footer">
                <button
                  className="reim-cancel-btn"
                  onClick={() => setShowReimModal(false)}
                >
                  Cancel
                </button>

                <button
                  className="reim-create-btn"
                  onClick={handleCreateReimbursement}
                  disabled={submitting}
                >
                  {submitting ? "Submitting..." : "Create Request"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================== Reject Model --=================== */}

        {remarkModal && (
          <div className="leave-modal-root">
            <div
              className="leave-modal-backdrop"
              onClick={() => setRemarkModal(null)}
            />

            <div className="leave-modal-card">
              <div className="leave-modal-header">
                <span>Rejection Remark</span>
                <button
                  className="leave-modal-close"
                  onClick={() => setRemarkModal(null)}
                >
                  ✕
                </button>
              </div>

              <div className="leave-modal-body">
                <p>{remarkModal.adminRemark || "No remark provided"}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

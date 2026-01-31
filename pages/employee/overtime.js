import { toast } from "react-toastify";
import Dashnav from "@/components/Dashnav";
import LeftbarMobile from "@/components/employee/LeftbarMobile";
import React, { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import EmployeeLeftbar from "@/components/employee/Leftbar";

export default function Overtime() {
  const [showOTModal, setShowOTModal] = useState(false);
  // Form states
  const [project, setProject] = useState("");
  const [date, setDate] = useState("");
  const [otType, setOtType] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");
  const [otApprover, setOtApprover] = useState("");

  const [overtimeList, setOvertimeList] = useState([]);
  const [tasks, setTasks] = useState("");
  const [remarkModal, setRemarkModal] = useState(null);

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("en-GB");
  };

  const formatTime = (time) => {
    const [h, m] = time.split(":");
    const hour = Number(h);
    const suffix = hour >= 12 ? "PM" : "AM";
    const formattedHour = hour % 12 || 12;
    return `${formattedHour}:${m} ${suffix}`;
  };

  const calculateHours = (start, end) => {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);

    const startMinutes = sh * 60 + sm;
    const endMinutes = eh * 60 + em;

    const diff = endMinutes - startMinutes;
    const hours = diff / 60;

    return `${hours}h`;
  };

  useEffect(() => {
    async function fetchOT() {
      const token = localStorage.getItem("employeeToken");
      const res = await fetch("/api/employee/overtime/list", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setOvertimeList(data.overtimeRequests);
    }
    fetchOT();
  }, []);

  const handleCreateOT = async () => {
    if (
      !project ||
      !date ||
      !otType ||
      !startTime ||
      !endTime ||
      !reason ||
      !tasks ||
      !otApprover
    ) {
      toast.error("Please fill all required fields");
      return;
    }

    if (startTime >= endTime) {
      toast.error("End time must be after start time");
      return;
    }

    try {
      const token = localStorage.getItem("employeeToken");

      const res = await fetch("/api/employee/overtime/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          project,
          date,
          otType,
          startTime,
          endTime,
          reason,
          tasks,
           otApprover, // ✅ THIS WAS MISSING
        }),
      });

      const data = await res.json();
      if (!data.success) {
        toast.error(data.message);
        return;
      }

      toast.success("Overtime request submitted");
      setOvertimeList((prev) => [data.overtime, ...prev]);
      setShowOTModal(false);
    } catch (err) {
      toast.error("Something went wrong");
    }
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

      <div className="add-employee-area">
        <div className="main-nav">
          <EmployeeLeftbar />
          <LeftbarMobile />
          <Dashnav />

          <section className="content home">
            {/* Breadcrumb */}
            <div className="breadcrum-bx">
              <ul className="breadcrumb bg-white">
                <li className="breadcrumb-item">
                  <Link href="/dashboard/dashboard">
                    <img src="/icons/home.svg" /> Overtime
                  </Link>
                </li>
              </ul>
            </div>

            {/* Page Header */}
            <div className="block-header add-emp-area">
              <div className="reim-page-head">
                <h2>Overtime</h2>
                <p>Request overtime approval</p>
              </div>

              {/* Table Section */}
              <div className="reim-section">
                <div className="reim-section-head">
                  <div>
                    <h4>My Overtime Requests</h4>
                    <p>View your overtime request history</p>
                  </div>

                  <button
                    className="reim-submit-btn"
                    onClick={() => setShowOTModal(true)}
                  >
                    <img src="/icons/employee/plus.svg" /> Submit Overtime
                  </button>
                </div>

                <table className="reim-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Project</th>
                      <th>OT Type</th>
                      <th>Time</th>
                      <th>Status</th>
                      <th>OT Access Given By</th>

                      <th>Approved By</th>
                      
                    </tr>
                  </thead>

                  <tbody>
                    {overtimeList.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: "center" }}>
                          No overtime requests found
                        </td>
                      </tr>
                    ) : (
                      overtimeList.map((ot) => (
                        <tr key={ot._id}>
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
                            {formatTime(ot.startTime)} –{" "}
                            {formatTime(ot.endTime)}
                            <br />
                            <small className="text-muted">
                              {calculateHours(ot.startTime, ot.endTime)}
                            </small>
                          </td>

                          {/* Status */}

                          <td>
                            {ot.status === "Rejected" ? (
                              <button
                                className="reim-view-remark-btn"
                                onClick={() => setRemarkModal(ot)}
                              >
                                View Remark
                              </button>
                            ) : (
                              <span
                                className={`tag ${
                                  ot.status === "Approved"
                                    ? "green"
                                    : ot.status === "Pending"
                                      ? "blue"
                                      : "red"
                                }`}
                              >
                                {ot.status}
                              </span>
                            )}
                          </td>

                          <td>
  <span className="tag blue">
    {ot.otApprover || "-"}
  </span>
</td>

                          {/* Approved By */}
                          <td>{ot.approvedBy?.name || "Admin"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>

        {/* ================= OT MODAL ================= */}
        {showOTModal && (
          <div className="reim-modal-root">
            <div
              className="reim-modal-backdrop"
              onClick={() => setShowOTModal(false)}
            />

            <div className="reim-modal-card">
              {/* Header */}
              <div className="reim-modal-header">
                <div className="reim-modal-title">
                  <span>New OT Request</span>
                </div>

                <button
                  type="button"
                  className="reim-modal-close"
                  onClick={() => setShowOTModal(false)}
                >
                  ✕
                </button>
              </div>

              {/* ================= FORM START ================= */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCreateOT();
                }}
              >
                {/* Body */}
                <div className="reim-modal-body">
                  {/* Project */}
                  <div className="reim-form-group">
                    <label>Brand Name *</label>
                    <input
                      type="text"
                      className="reim-input"
                      placeholder="Enter Brand name"
                      value={project}
                      onChange={(e) => setProject(e.target.value)}
                      required 
                    />
                  </div>

                  {/* Date + OT Type */}
                  <div className="reim-form-row date-amount-row">
                    <div className="reim-form-group">
                      <label>Date *</label>
                      <input
                        type="date"
                        className="reim-input"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        required
                      />
                    </div>

                    <div className="reim-form-group">
                      <label>OT Type *</label>
                      <select
                        className="reim-input"
                        value={otType}
                        onChange={(e) => setOtType(e.target.value)}
                        required
                      >
                        <option value="">Select type</option>

                        <option>Weekday OT</option>
                        <option>Weekend OT</option>
                        <option>Holiday OT</option>

                        <option>Client Deadline</option>
                        <option>Campaign Launch</option>
                        <option>Design Revisions</option>
                        <option>Content Shoot / Edit</option>
                        <option>Production Deployment</option>

                        <option>Bug Fix / Hotfix</option>
                        <option>Client Escalation</option>
                        <option>Emergency Fix</option>

                        <option>Late Night Work</option>
                        <option>Early Morning Work</option>
                      </select>
                    </div>
                  </div>

                  {/* Start + End Time */}
                  <div className="reim-form-row date-amount-row">
                    <div className="reim-form-group">
                      <label>Start Time *</label>
                      <input
                        type="time"
                        className="reim-input"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        required
                      />
                    </div>

                    <div className="reim-form-group">
                      <label>End Time *</label>
                      <input
                        type="time"
                        className="reim-input"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Reason */}
                  <div className="reim-form-group">
                    <label>Reason *</label>
                    <textarea
                      className="reim-input"
                      rows="3"
                      placeholder="Reason for OT request"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      required
                    />
                  </div>

                  <div className="reim-form-row date-amount-row">
                
                  
                  {/* Tasks */}
                  <div className="reim-form-group">
                    <label>Tasks *</label>
                    <input
                      type="text"
                      className="reim-input"
                      placeholder="Type task ID or name"
                      value={tasks}
                      onChange={(e) => setTasks(e.target.value)}
                      required
                    />
                  </div>


                  {/* OT Approved By */}
                      <div className="reim-form-group">
                        <label>OT Access Given By *</label>
                        <select
                          className="reim-input"
                          value={otApprover}
                          onChange={(e) => setOtApprover(e.target.value)}
                          required
                        >
                          <option value="">Select person</option>
                          <option value="Ivan Sinha">Ivan Sinha</option>
                          <option value="Ishan Sinha">Ishan Sinha</option>
                          <option value="Riya Tiwari">Riya Tiwari</option>
                        </select>
                      </div>

                      </div>


                </div>

                {/* Footer */}
                <div className="reim-modal-footer">
                  <button
                    type="button"
                    className="reim-cancel-btn"
                    onClick={() => setShowOTModal(false)}
                  >
                    Cancel
                  </button>

                  <button type="submit" className="reim-create-btn">
                    Create Request
                  </button>
                </div>
              </form>
              {/* ================= FORM END ================= */}
            </div>
          </div>
        )}
      </div>
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
    </section>
  );
}

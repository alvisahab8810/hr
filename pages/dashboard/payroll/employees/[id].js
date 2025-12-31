

"use client";

import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import Image from "next/image";
import { FaEdit, FaEye, FaEyeSlash } from "react-icons/fa";
import Dashnav from "../../../../components/Dashnav";
import Leftbar from "../../../../components/Leftbar";
import AttendanceCalendar from "../../../../components/AttendanceCalendar";
import MySalarySlips from "../../../../components/SalarySlip";

export default function EmployeeProfile() {


  const router = useRouter();
  const { id } = router.query;
  // const router = useRouter();
  const { id: employeeId } = router.query;

  const [employee, setEmployee] = useState(null);
  const [editingSection, setEditingSection] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [showAccount, setShowAccount] = useState(false);
  const [formData, setFormData] = useState({});
  const fileInputRef = useRef();

  const [leaves, setLeaves] = useState([]);
  const [loadingLeaves, setLoadingLeaves] = useState(false);





  const handleProfileImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const form = new FormData();
    form.append("profile", file);

    try {
      const res = await fetch(`/api/payroll/employees/${id}/upload`, {
        method: "POST",
        body: form,
      });

      const data = await res.json();
      if (data.success) {
        setEmployee((prev) => ({
          ...prev,
          profileImage: data.imageUrl,
        }));
      } else {
        alert("Failed to upload profile image.");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Upload failed.");
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      const res = await fetch(`/api/payroll/employees/${id}`);
      const data = await res.json();
      if (data.success) {
        setEmployee(data.employee);
        setFormData(data.employee);
      }
    };
    if (id) fetchProfile();
  }, [id]);

  const handleEdit = (section) => setEditingSection(section);
  const handleCancel = () => {
    setEditingSection(null);
    setFormData(employee);
  };

  const handleSave = async () => {
    const res = await fetch(`/api/payroll/employees/edit/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    const data = await res.json();
    if (data.success) {
      setEmployee(data.employee);
      setEditingSection(null);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const getInitials = (name) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();

  const fetchLeaves = async () => {
    setLoadingLeaves(true);
    try {
      const res = await fetch(
        `/api/payroll/leave/byEmployee?employeeId=${employee._id}`
      );
      const data = await res.json();
      if (data.success) setLeaves(data.data);
    } catch (err) {
      console.error("Error fetching leaves:", err);
    }
    setLoadingLeaves(false);
  };

  // Call when active tab is leave
  useEffect(() => {
    if (activeTab === "leave") {
      fetchLeaves();
    }
  }, [activeTab]);




  if (!employee) return <div className="container py-5">Loading...</div>;

  return (
    <div className="employees-profile add-employee">
      <Head>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
      </Head>

      <div className="main-nav">
        <Dashnav />
        <Leftbar />

        <section className="content home">
          <div className="block-header">
            <div className="main-row-bx1 row ptb-50">
              <div className="col-lg-7 col-md-6 col-sm-12">
                <h2>
                  Employee Profile{" "}
                  <small className="text-white">
                    Welcome to Viralon{" "}
                    <b>
                      {employee.firstName} {employee.lastName}
                    </b>
                  </small>
                </h2>
              </div>
            </div>

            {/* Tabs */}
            {/* Tabs */}
            <ul className="nav nav-tabs">
              {[
                "overview",
                "salary Details",
                // "payslip",
                "leave",
                "attendance",
              ].map((tab) => (
                <li key={tab} className="nav-item">
                  <button
                    className={`nav-link ${activeTab === tab ? "active" : ""}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                </li>
              ))}
            </ul>

            <div className="tab-content mt-3">
              {activeTab === "overview" && (
                <div className=" profile-container">
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className="position-relative profile-po"
                      style={{ width: 70, height: 70 }}
                    >
                      {employee.profileImage ? (
                        <Image
                          src={employee.profileImage}
                          alt="Profile"
                          fill
                          className="rounded-circle object-fit-cover"
                        />
                      ) : (
                        <div
                          className="rounded-circle bg-profile text-white d-flex align-items-center justify-content-center fw-bold fs-3"
                          style={{ width: 70, height: 70 }}
                        >
                          {getInitials(
                            `${employee.firstName} ${employee.lastName}`
                          )}
                        </div>
                      )}
                      <button
                        className=" btn-sm  position-absolute bottom-0 end-0 "
                        onClick={() => fileInputRef.current.click()}
                      >
                        <FaEdit />
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="d-none"
                        onChange={handleProfileImageUpload}
                        accept="image/*"
                      />
                    </div>
                    <div>
                      <h4 className="m-0">
                        {employee.firstName} {employee.lastName} (
                        {employee.employeeId})
                      </h4>
                      <div className="text-muted">{employee.designation}</div>
                    </div>
                  </div>
                  <div className="row">
                    {/* Basic Info */}
                    <div className="col-md-6 mt-4">
                      <div className="card-header d-flex justify-content-between align-items-center">
                        <strong>Basic Information</strong>
                        {editingSection !== "basic" ? (
                          <FaEdit
                            onClick={() => handleEdit("basic")}
                            className="cursor-pointer"
                          />
                        ) : (
                          <div>
                            <button
                              className="btn btn-sm btn-success me-2"
                              onClick={handleSave}
                            >
                              Save
                            </button>
                            <button
                              className="btn btn-sm btn-outline-secondary"
                              onClick={handleCancel}
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="card-body">
                        <div className="row">
                          <div className="col-md-6">
                            <label>Email</label>
                            {editingSection === "basic" ? (
                              <input
                                name="email"
                                className="form-control"
                                value={formData.email || ""}
                                onChange={handleInputChange}
                              />
                            ) : (
                              <p>{employee.email}</p>
                            )}
                          </div>
                          <div className="col-md-6">
                            <label>Mobile</label>
                            {editingSection === "basic" ? (
                              <input
                                name="mobile"
                                className="form-control"
                                value={formData.mobile || ""}
                                onChange={handleInputChange}
                              />
                            ) : (
                              <p>{employee.mobile}</p>
                            )}
                          </div>
                          <div className="col-md-6 mt-3">
                            <label>Joining Date</label>
                            {editingSection === "basic" ? (
                              <input
                                type="date"
                                name="joiningDate"
                                className="form-control"
                                value={formData.joiningDate || ""}
                                onChange={handleInputChange}
                              />
                            ) : (
                              <p>
                                {new Date(
                                  employee.joiningDate
                                ).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <div className="col-md-6 mt-3">
                            <label>Gender</label>
                            {editingSection === "basic" ? (
                              <select
                                name="gender"
                                className="form-control"
                                value={formData.gender || ""}
                                onChange={handleInputChange}
                              >
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                              </select>
                            ) : (
                              <p>{employee.gender}</p>
                            )}
                          </div>
                          <div className="col-md-6 mt-3">
                            <label>Department</label>
                            {editingSection === "basic" ? (
                              <input
                                name="department"
                                className="form-control"
                                value={formData.department || ""}
                                onChange={handleInputChange}
                              />
                            ) : (
                              <p>{employee.department}</p>
                            )}
                          </div>
                          <div className="col-md-6 mt-3">
                            <label>Location</label>
                            {editingSection === "basic" ? (
                              <input
                                name="location"
                                className="form-control"
                                value={formData.location || ""}
                                onChange={handleInputChange}
                              />
                            ) : (
                              <p>{employee.location}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Personal Info */}
                    <div className="col-md-6 mt-4">
                      <div className="card-header d-flex justify-content-between align-items-center">
                        <strong>Personal Info</strong>
                        {editingSection !== "personal" ? (
                          <FaEdit
                            onClick={() => handleEdit("personal")}
                            className="cursor-pointer"
                          />
                        ) : (
                          <div>
                            <button
                              className="btn btn-sm btn-success me-2"
                              onClick={handleSave}
                            >
                              Save
                            </button>
                            <button
                              className="btn btn-sm btn-outline-secondary"
                              onClick={handleCancel}
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="card-body">
                        <div className="row">
                          <div className="col-md-6">
                            <label>DOB</label>
                            {editingSection === "personal" ? (
                              <input
                                type="date"
                                name="dob"
                                className="form-control"
                                value={formData.dob || ""}
                                onChange={handleInputChange}
                              />
                            ) : (
                              <p>
                                {new Date(employee.dob).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <div className="col-md-6">
                            <label>Father's Name</label>
                            {editingSection === "personal" ? (
                              <input
                                name="fatherName"
                                className="form-control"
                                value={formData.fatherName || ""}
                                onChange={handleInputChange}
                              />
                            ) : (
                              <p>{employee.fatherName}</p>
                            )}
                          </div>
                          <div className="col-md-6 mt-3">
                            <label>Mother's Name</label>
                            {editingSection === "personal" ? (
                              <input
                                name="motherName"
                                className="form-control"
                                value={formData.motherName || ""}
                                onChange={handleInputChange}
                              />
                            ) : (
                              <p>{employee.motherName}</p>
                            )}
                          </div>
                          <div className="col-md-6 mt-3">
                            <label>Marital Status</label>
                            {editingSection === "personal" ? (
                              <select
                                name="maritalStatus"
                                className="form-control"
                                value={formData.maritalStatus || ""}
                                onChange={handleInputChange}
                              >
                                <option value="Single">Single</option>
                                <option value="Married">Married</option>
                              </select>
                            ) : (
                              <p>{employee.maritalStatus}</p>
                            )}
                          </div>
                          <div className="col-12 mt-3">
                            <label>Address</label>
                            {editingSection === "personal" ? (
                              <textarea
                                name="address"
                                className="form-control"
                                value={formData.address || ""}
                                onChange={handleInputChange}
                              />
                            ) : (
                              <p>{employee.address}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Payment Info */}
                    <div className="col-md-6 mt-4">
                      <div className="card-header d-flex justify-content-between align-items-center">
                        <strong>Payment Information</strong>
                        {editingSection !== "payment" ? (
                          <FaEdit
                            onClick={() => handleEdit("payment")}
                            className="cursor-pointer"
                          />
                        ) : (
                          <div>
                            <button
                              className="btn btn-sm btn-success me-2"
                              onClick={handleSave}
                            >
                              Save
                            </button>
                            <button
                              className="btn btn-sm btn-outline-secondary"
                              onClick={handleCancel}
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="card-body">
                        <div className="row">
                          <div className="col-md-6">
                            <label>Account Number</label>
                            <div className="d-flex align-items-center gap-2">
                              {editingSection === "payment" ? (
                                <input
                                  name="accountNumber"
                                  className="form-control"
                                  value={formData.accountNumber || ""}
                                  onChange={handleInputChange}
                                />
                              ) : (
                                <span>
                                  {showAccount
                                    ? employee.accountNumber
                                    : "XXXX" +
                                      employee.accountNumber?.slice(-4)}
                                </span>
                              )}
                              {editingSection !== "payment" && (
                                <button
                                  className="show-acc-btn"
                                  onClick={() =>
                                    setShowAccount((prev) => !prev)
                                  }
                                >
                                  {showAccount ? <FaEyeSlash /> : <FaEye />}{" "}
                                  Show
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="col-md-6">
                            <label>IFSC</label>
                            {editingSection === "payment" ? (
                              <input
                                name="ifscCode"
                                className="form-control"
                                value={formData.ifscCode || ""}
                                onChange={handleInputChange}
                              />
                            ) : (
                              <p>{employee.ifscCode}</p>
                            )}
                          </div>
                          <div className="col-md-6 mt-3">
                            <label>Bank Name</label>
                            {editingSection === "payment" ? (
                              <input
                                name="bankName"
                                className="form-control"
                                value={formData.bankName || ""}
                                onChange={handleInputChange}
                              />
                            ) : (
                              <p>{employee.bankName}</p>
                            )}
                          </div>
                          <div className="col-md-6 mt-3">
                            <label>UPI ID</label>
                            {editingSection === "payment" ? (
                              <input
                                name="upiId"
                                className="form-control"
                                value={formData.upiId || ""}
                                onChange={handleInputChange}
                              />
                            ) : (
                              <p>{employee.upiId}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "salary Details" && (
                <div className="col-12 mt-4 p-0 profile-container">
                  <div className="card-header d-flex justify-content-between align-items-center">
                    <strong>Salary Details</strong>
                    {editingSection !== "salary" ? (
                      <FaEdit
                        onClick={() => handleEdit("salary")}
                        className="cursor-pointer"
                      />
                    ) : (
                      <div>
                        <button
                          className="btn btn-sm btn-success me-2"
                          onClick={handleSave}
                        >
                          Save
                        </button>
                        <button
                          className="btn btn-sm btn-outline-secondary"
                          onClick={handleCancel}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-6">
                        <label>Type</label>
                        {editingSection === "salary" ? (
                          <select
                            name="salaryType"
                            className="form-control"
                            value={formData.salaryType || ""}
                            onChange={handleInputChange}
                          >
                            <option value="Monthly">Monthly</option>
                            <option value="Weekly">Weekly</option>
                            <option value="Hourly">Hourly</option>
                          </select>
                        ) : (
                          <p>{employee.salaryType}</p>
                        )}
                      </div>
                      <div className="col-md-6">
                        <label>Amount</label>
                        {editingSection === "salary" ? (
                          <input
                            name="salary"
                            className="form-control"
                            value={formData.salary || ""}
                            onChange={handleInputChange}
                          />
                        ) : (
                          <p>₹{employee.salary}</p>
                        )}
                      </div>
                      <div className="col-md-6 mt-3">
                        <label>Bank</label>
                        <p>{employee.bankName}</p>
                      </div>
                      <div className="col-md-6 mt-3">
                        <label>Account</label>
                        <p>{employee.accountNumber}</p>
                      </div>
                      <div className="col-md-6">
                        <label>IFSC</label>
                        <p>{employee.ifscCode}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
{/* 
              {activeTab === "payslip" && (
                <div className="mt-4">
                  <MySalarySlips/>
                </div>
              )} */}
              {activeTab === "leave" && (
                <div className="mt-4">
                  <h5 className="fw-semibold mb-3">Leave History</h5>
                  {loadingLeaves ? (
                    <p>Loading leaves...</p>
                  ) : leaves.length === 0 ? (
                    <p className="text-muted">No leave records found.</p>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-striped align-middle">
                        <thead className="table-light">
                          <tr>
                            <th>Type</th>
                            <th>From</th>
                            <th>To</th>
                            <th>Reason</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {leaves.map((leave) => (
                            <tr key={leave._id}>
                              <td>{leave.type}</td>
                              <td>
                                {new Date(leave.from).toLocaleDateString()}
                              </td>
                              <td>{new Date(leave.to).toLocaleDateString()}</td>
                              <td>{leave.reason}</td>
                              <td>
                                <span
                                  className={`badge ${
                                    leave.status === "Approved"
                                      ? "bg-success"
                                      : leave.status === "Rejected"
                                        ? "bg-danger"
                                        : "bg-warning text-dark"
                                  }`}
                                >
                                  {leave.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "attendance" && employeeId && (
                <div className="mt-4">
                  <AttendanceCalendar employeeId={employeeId} />
                </div>
              )}
            </div>

            
          </div>
        </section>
      </div>
    </div>
  );
}

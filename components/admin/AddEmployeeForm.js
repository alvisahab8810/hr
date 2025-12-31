"use client";
import { useState } from "react";

export default function AddEmployeeForm() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    officialEmail: "",
    employeeId: "",
    password: "",
    confirmPassword: "",

    monthlySalary: "",
    annualSalary: "",

    // 🔽 NEW
    dateOfJoining: "",
    department: "",
    designation: "",
    employeeType: "",
    status: "",
  });

  const departments = [
    "Management",
    "Digital Marketing",
    "Content Team",
    "Production",
    "Editing Team",
    "Tech & Development",
    "Design Team",
  ];

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "monthlySalary") {
      const monthly = Number(value) || 0;
      setFormData({
        ...formData,
        monthlySalary: value,
        annualSalary: monthly * 12,
      });
      return;
    }

    if (name === "annualSalary") {
      const annual = Number(value) || 0;
      setFormData({
        ...formData,
        annualSalary: value,
        monthlySalary: Math.round(annual / 12),
      });
      return;
    }

    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setMessage({ type: "danger", text: "Passwords do not match" });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/hr/invite-employee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ type: "success", text: "Employee invited successfully!" });
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          employeeId: "",
          password: "",
          confirmPassword: "",
        });
      } else {
        setMessage({
          type: "danger",
          text: data.message || "Something went wrong",
        });
      }
    } catch (err) {
      setMessage({ type: "danger", text: "Server error. Try again later." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-new-employee-area">
      <div className="card">
        <div className="card-header card-custom-header">
          <h5 className="mb-0">
            <img src="/icons/lock.svg"></img>
            Log in formation
          </h5>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="row">
              {/* First Name */}
              <div className="col-md-6 mb-3">
                <label className="form-label">
                  First Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="form-control"
                  required
                  placeholder="First Name"
                />
              </div>

              {/* Last Name */}
              <div className="col-md-6 mb-3">
                <label className="form-label">
                  Last Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="form-control"
                  required
                  placeholder="Last Name"
                />
              </div>
            </div>


            <div className="row">


            {/* Email */}
            <div className="col-md-6 mb-3">
              <label className="form-label">
                Official Email ID <span className="text-danger">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="form-control"
                required
                placeholder="Official Email ID"
              />
            </div>

            {/* Employee ID */} 
            <div className="col-md-6 mb-3">
              <label className="form-label">
                Employee ID <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                name="employeeId"
                value={formData.employeeId}
                onChange={handleChange}
                className="form-control"
                required
                placeholder="Employee ID"
              />
            </div>

            </div>

            <div className="row">
             

              <div className="col-md-6 mb-3">
                <label className="form-label">
                  Department <span className="text-danger">*</span>
                </label>

                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="form-select"
                  required
                >
                  <option value="">Select Department</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-6 mb-3">
                <label className="form-label">Designation *</label>
                <input
                  type="text"
                  name="designation"
                  value={formData.designation}
                  onChange={handleChange}
                  className="form-control"
                  placeholder="Designation"
                  required
                />
              </div>

              <div className="col-md-6 mb-3">
                <label className="form-label">Employee Type *</label>
                <select
                  name="employeeType"
                  value={formData.employeeType}
                  onChange={handleChange}
                  className="form-select"
                  required
                >
                  <option value="">Select</option>
                  <option value="Remote">Remote</option>
                  <option value="Office">Office</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
              </div>

              <div className="col-md-6 mb-3">
                <label className="form-label">Employment Status *</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="form-select"
                  required
                >
                  <option value="">Select</option>
                  <option value="Probation">Probation</option>
                  <option value="Permanent">Permanent</option>
                  <option value="Contract">Contract</option>
                  <option value="Intern">Intern</option>
                </select>
              </div>
            </div>

            {/* Monthly Salary */}

            <div className="row">
              {/* First Name */}
              <div className="col-md-6 mb-3">
                <label className="form-label">
                  Monthly Salary <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  name="monthlySalary"
                  value={formData.monthlySalary}
                  onChange={handleChange}
                  className="form-control"
                  placeholder="Monthly Salary"
                  required
                />
              </div>

              {/* Last Name */}
              <div className="col-md-6 mb-3">
                <label className="form-label">
                  Annual Salary <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  name="annualSalary"
                  value={formData.annualSalary}
                  onChange={handleChange}
                  className="form-control"
                  placeholder="Annual Salary"
                  required
                />
              </div>
            </div>


            <div className="row">
               <div className="col-md-12 mb-3">
                <label className="form-label">Date of Joining *</label>
                <input
                  type="date"
                  name="dateOfJoining"
                  value={formData.dateOfJoining}
                  onChange={handleChange}
                  className="form-control"
                  required
                />
              </div>
            </div>



        <div className="row">
            {/* Password */}
            <div className="col-md-6 mb-3">
              <label className="form-label">
                Password <span className="text-danger">*</span>
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="form-control"
                required
                placeholder="Password"
              />
            </div>

            {/* Confirm Password */}
            <div className="col-md-6 mb-3">
              <label className="form-label">
                Confirm Password <span className="text-danger">*</span>
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="form-control"
                required
                placeholder="Confirm Password"
              />
            </div>


             </div>
            {/* Buttons */}
            <div className="d-flex justify-content-end gap-2 mt-2">
              <button
                type="button"
                onClick={() =>
                  setFormData({
                    firstName: "",
                    lastName: "",
                    email: "",
                    employeeId: "",
                    password: "",
                    confirmPassword: "",
                  })
                }
                className="cancel-btn"
              >
                Cancel
              </button>
              <button type="submit" disabled={loading} className="invite-btn">
                {loading ? "Inviting..." : "Invite"}
              </button>
            </div>

            {/* Status Message */}
            {message && (
              <div className={`alert alert-${message.type} mt-3`}>
                {message.text}
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

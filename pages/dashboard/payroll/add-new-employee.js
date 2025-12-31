import React from "react";
import Link from "next/link";
import Dashnav from "../../../components/Dashnav";
import Leftbar from "../../../components/Leftbar";
import Head from "next/head";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
// for select dropdown -----

import { useState } from "react";
import LeftbarMobile from "@/components/LeftbarMobile";


export default function NewCustomers() {



  const [currentStep, setCurrentStep] = useState(1);
  const defaultFormData = {
  firstName: "",
  middleName: "",
  lastName: "",
  employeeId: "",
  joiningDate: "",
  email: "",
  mobile: "",
  gender: "",
  location: "Head Office ( Uttar Pradesh )", // default value
  designation: "",
  department: "",
};

    const [formData, setFormData] = useState(defaultFormData);
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNext = (e) => {
    e.preventDefault();
    if (validateStep()) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const validateStep = () => {
    if (currentStep === 1) {
      const requiredFields = [
        "firstName",
        "lastName",
        "employeeId",
        "joiningDate",
        "email",
        "mobile",
        "gender",
        "location",
        "designation",
        "department",
      ];
      for (const field of requiredFields) {
        if (!formData[field]) {
          toast.error("Please fill all required fields in Step 1");
          return false;
        }
      }
    }
    return true;
  };

const handleSubmit = async (e) => {
  e.preventDefault();

  try {
    const res = await fetch('/api/payroll/employees/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    const result = await res.json();

    if (!res.ok) {
      // Handle HTTP errors like 400, 500, etc.
      toast.error(result.error || 'Something went wrong.');
      return;
    }

    if (result.success) {
      toast.success('Employee saved successfully!');
      setFormData(defaultFormData); // reset form properly
      setCurrentStep(1);
    } else {
      toast.error(result.error || 'Something went wrong.');
    }
  } catch (error) {
    toast.error('Failed to submit form.');
    console.error(error);
  }
};



  return (
    <div className="career-response add-employee">
      <Head>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
      </Head>

      <div className="main-nav">
        <LeftbarMobile/>
        <Dashnav />
        <Leftbar />

        <section className="content home">
          <div className="block-header">
            <div className="main-row-bx1 row ptb-50 mt-3">
              <div className="col-lg-7 col-md-6 col-sm-12">
                <h2>
                  Add Employee<br/>
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
                  <li className="breadcrumb-item active">New Employee</li>
                </ul>
              </div>

            </div>

            <div className="admin">
              <div className="container-pad mt-4">
                <form onSubmit={handleSubmit}>
                  <div className="row mb-4">
                    <div className="col-12">
                      <div className="stepper d-flex justify-content-between mb-5 px-3 align-items-center">
                        {[
                          "Basic Details",
                          "Salary Details",
                          "Personal Details",
                          "Payment Info",
                        ].map((label, idx) => (
                          <React.Fragment key={idx}>
                            <div className="step-item text-center flex-fill">
                              <div
                                className={`step-circle ${currentStep === idx + 1 ? " text-white" : "bg-light border text-dark"} mx-auto`}
                              >
                                {idx + 1}
                              </div>
                              <div className="step-label mt-2">{label}</div>
                            </div>
                            {idx !== 3 && <div className="step-line"></div>}
                          </React.Fragment>
                        ))}
                      </div>

                      <div className="tab-content">
                        {currentStep === 1 && (
                          <div className="tab-pane fade show active">
                            <div className="row">
                              <div className="col-md-6 mb-3">
                                <label>First Name *</label>
                                <input
                                  type="text"
                                  className="form-control"
                                  name="firstName"
                                  value={formData.firstName}
                                  onChange={handleChange}
                                />
                              </div>
                              <div className="col-md-6 mb-3">
                                <label>Last Name *</label>
                                <input
                                  type="text"
                                  className="form-control"
                                  name="lastName"
                                  value={formData.lastName}
                                  onChange={handleChange}
                                />
                              </div>
                              <div className="col-md-6 mb-3">
                                <label>Employee ID *</label>
                                <input
                                  type="text"
                                  className="form-control"
                                  name="employeeId"
                                  value={formData.employeeId}
                                  onChange={handleChange}
                                />
                              </div>
                              <div className="col-md-6 mb-3">
                                <label>Date of Joining *</label>
                                <input
                                  type="date"
                                  className="form-control"
                                  name="joiningDate"
                                  value={formData.joiningDate}
                                  onChange={handleChange}
                                />
                              </div>

                              <div className="col-md-6 mb-3">
                                <label>Mobile *</label>
                                <input
                                  type="mobile"
                                  className="form-control"
                                  name="mobile"
                                  value={formData.mobile || ""}
                                  onChange={handleChange}
                                  required
                                />
                              </div>

                              <div className="col-md-6 mb-3">
                                <label>Email *</label>
                                <input
                                  type="email"
                                  className="form-control"
                                  name="email"
                                  value={formData.email}
                                  onChange={handleChange}
                                />
                              </div>
                              <div className="col-md-6 mb-3">
                                <label>Gender *</label>
                                <select
                                  className="form-select"
                                  name="gender"
                                  value={formData.gender}
                                  onChange={handleChange}
                                >
                                  <option value="">Select</option>
                                  <option>Male</option>
                                  <option>Female</option>
                                  <option>Other</option>
                                </select>
                              </div>

                              <div className="col-md-6 mb-3">
                                <label>Designation *</label>
                                <select
                                  name="designation"
                                  className="form-select"
                                  onChange={handleChange}
                                  value={formData.designation}
                                  required
                                >
                                  <option value="">Select</option>
                                  <option value="Software Engineer">
                                    Software Engineer
                                  </option>
                                  <option value="Senior Developer">
                                    Senior Developer
                                  </option>
                                  <option value="Team Lead">Team Lead</option>
                                  <option value="Project Manager">
                                    Project Manager
                                  </option>
                                  <option value="HR Executive">
                                    HR Executive
                                  </option>
                                  <option value="Business Analyst">
                                    Business Analyst
                                  </option>
                                  <option value="QA Engineer">
                                    QA Engineer
                                  </option>
                                  <option value="DevOps Engineer">
                                    DevOps Engineer
                                  </option>
                                  <option value="Product Manager">
                                    Product Manager
                                  </option>
                                  <option value="Intern">Intern</option>
                                  <option value="UI/UX Designer">
                                    UI/UX Designer
                                  </option>
                                  <option value="Content Strategist">
                                    Content Strategist
                                  </option>
                                  <option value="SEO Specialist">
                                    SEO Specialist
                                  </option>
                                </select>
                              </div>
                              <div className="col-md-6 mb-3">
                                <label>Department *</label>
                                <select
                                  name="department"
                                  className="form-select"
                                  onChange={handleChange}
                                  value={formData.department}
                                  required
                                >
                                  <option value="">Select</option>
                                  <option value="Engineering">
                                    Engineering
                                  </option>
                                  <option value="Human Resources">
                                    Human Resources
                                  </option>
                                  <option value="Marketing">Marketing</option>
                                  <option value="Finance">Finance</option>
                                  <option value="Sales">Sales</option>
                                  <option value="Operations">Operations</option>
                                  <option value="Customer Support">
                                    Customer Support
                                  </option>
                                  <option value="Legal">Legal</option>
                                  <option value="Administration">
                                    Administration
                                  </option>
                                  <option value="Design">Design</option>
                                  <option value="Content">Content</option>
                                </select>
                              </div>
                            </div>

                            <div className="col-12 d-flex gap-2 mt-4">
                              <button
                                type="button"
                                className="btn btn-primary px-4"
                                onClick={handleNext}
                              >
                                Save and Continue
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary px-4"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}

                        {currentStep === 2 && (
                          <div
                            className="tab-pane fade show active"
                            id="step2"
                            role="tabpanel"
                          >
                            <div className="row">
                              <div className="col-md-6 mb-3">
                                <label>Salary Amount *</label>
                                <input
                                  type="number"
                                  name="salary"
                                  className="form-control"
                                  placeholder="Monthly Salary"
                                  value={formData.salary}
                                  onChange={handleChange}
                                />
                              </div>
                              <div className="col-md-6 mb-3">
                                <label>Salary Type *</label>
                                <select
                                  name="salaryType"
                                  className="form-select"
                                  value={formData.salaryType}
                                  onChange={handleChange}
                                >
                                  <option value="">Select Type</option>
                                  <option value="Fixed">Fixed</option>
                                  <option value="Hourly">Hourly</option>
                                  <option value="Commission">Commission</option>
                                </select>
                              </div>
                              <div className="col-md-6 mb-3">
                                <label>Bank Name</label>
                                <input
                                  type="text"
                                  name="bankName"
                                  className="form-control"
                                  placeholder="e.g. HDFC Bank"
                                  value={formData.bankName}
                                  onChange={handleChange}
                                />
                              </div>
                              <div className="col-md-6 mb-3">
                                <label>Account Number</label>
                                <input
                                  type="text"
                                  name="accountNumber"
                                  className="form-control"
                                  placeholder="Account Number"
                                  value={formData.accountNumber}
                                  onChange={handleChange}
                                />
                              </div>
                              <div className="col-md-6 mb-3">
                                <label>IFSC Code</label>
                                <input
                                  type="text"
                                  name="ifscCode"
                                  className="form-control"
                                  placeholder="IFSC Code"
                                  value={formData.ifscCode}
                                  onChange={handleChange}
                                />
                              </div>
                            </div>

                            <div className="col-12 d-flex gap-2 mt-4">
                              <button
                                type="button"
                                className="btn btn-secondary px-4"
                                onClick={handleBack}
                              >
                                Back
                              </button>
                              <button
                                type="button"
                                className="btn btn-primary px-4"
                                onClick={handleNext}
                              >
                                Save and Continue
                              </button>
                            </div>
                          </div>
                        )}

                        {currentStep === 3 && (
                          <div
                            className="tab-pane fade show active"
                            id="step3"
                            role="tabpanel"
                          >
                            <div className="row">
                              <div className="col-md-6 mb-3">
                                <label>Father's Name</label>
                                <input
                                  type="text"
                                  name="fatherName"
                                  className="form-control"
                                  placeholder="Father's Name"
                                  value={formData.fatherName || ""}
                                  onChange={handleChange}
                                />
                              </div>
                              <div className="col-md-6 mb-3">
                                <label>Mother's Name</label>
                                <input
                                  type="text"
                                  name="motherName"
                                  className="form-control"
                                  placeholder="Mother's Name"
                                  value={formData.motherName || ""}
                                  onChange={handleChange}
                                />
                              </div>
                              <div className="col-md-6 mb-3">
                                <label>Date of Birth</label>
                                <input
                                  type="date"
                                  name="dob"
                                  className="form-control"
                                  value={formData.dob || ""}
                                  onChange={handleChange}
                                />
                              </div>
                              <div className="col-md-6 mb-3">
                                <label>Marital Status</label>
                                <select
                                  name="maritalStatus"
                                  className="form-select"
                                  value={formData.maritalStatus || ""}
                                  onChange={handleChange}
                                >
                                  <option value="">Select</option>
                                  <option value="Single">Single</option>
                                  <option value="Married">Married</option>
                                  <option value="Divorced">Divorced</option>
                                  <option value="Widowed">Widowed</option>
                                </select>
                              </div>
                              <div className="col-md-12 mb-3">
                                <label>Permanent Address</label>
                                <textarea
                                  name="address"
                                  className="form-control"
                                  rows="3"
                                  value={formData.address || ""}
                                  onChange={handleChange}
                                ></textarea>
                              </div>
                            </div>

                            <div className="col-12 d-flex gap-2 mt-4">
                              <button
                                type="button"
                                className="btn btn-secondary px-4"
                                onClick={handleBack}
                              >
                                Back
                              </button>
                              <button
                                type="button"
                                className="btn btn-primary px-4"
                                onClick={handleNext}
                              >
                                Save and Continue
                              </button>
                            </div>
                          </div>
                        )}

                        {currentStep === 4 && (
                          <div
                            className="tab-pane fade show active"
                            id="step4"
                            role="tabpanel"
                          >
                            <div className="row">
                              <div className="col-md-6 mb-3">
                                <label>Payment Mode *</label>
                                <select
                                  name="paymentMode"
                                  className="form-select"
                                  value={formData.paymentMode || ""}
                                  onChange={handleChange}
                                  required
                                >
                                  <option value="">Select</option>
                                  <option value="Bank Transfer">
                                    Bank Transfer
                                  </option>
                                  <option value="Cheque">Cheque</option>
                                  <option value="Cash">Cash</option>
                                </select>
                              </div>
                              <div className="col-md-6 mb-3">
                                <label>UPI ID</label>
                                <input
                                  type="text"
                                  name="upiId"
                                  className="form-control"
                                  placeholder="example@upi"
                                  value={formData.upiId || ""}
                                  onChange={handleChange}
                                />
                              </div>
                              <div className="col-md-6 mb-3">
                                <label>PAN Number</label>
                                <input
                                  type="text"
                                  name="panNumber"
                                  className="form-control"
                                  placeholder="ABCDE1234F"
                                  value={formData.panNumber || ""}
                                  onChange={handleChange}
                                />
                              </div>
                            </div>

                            <div className="col-12 d-flex gap-2 mt-4">
                              <button
                                type="button"
                                className="btn btn-secondary px-4"
                                onClick={handleBack}
                              >
                                Back
                              </button>
                              <button
                                type="submit"
                                className="btn btn-success px-4"
                              >
                                Submit
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </section>
      </div>
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}

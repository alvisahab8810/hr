"use client";
import { toast } from "react-toastify";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/employee/Navbar";
import Head from "next/head";
import {
  FaUser,
  FaBriefcase,
  FaMoneyBillWave,
  FaFileAlt,
} from "react-icons/fa";

// const departments = [
//   "Management",
//   "Digital Marketing",
//   "Content Team",
//   "Production",
//   "Editing Team",
//   "Tech & Development",
//   "Design Team",
// ];
const statesIN = [
  "Andhra Pradesh",
  "Bihar",
  "Delhi",
  "Gujarat",
  "Karnataka",
  "Kerala",
  "Maharashtra",
  "Rajasthan",
  "Tamil Nadu",
  "Telangana",
  "Uttar Pradesh",
  "West Bengal",
];
const maritalStatuses = ["Single", "Married", "Divorced", "Widowed"];

export default function CompleteProfilePage() {
  const router = useRouter();
  const tokenRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem("employeeToken");
    if (!token) {
      router.replace("/employee/login");
      return;
    }
    tokenRef.current = token;

    // fetch employee info
    fetch("/api/employee/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setPersonal((p) => ({
            ...p,
            firstName: data.employee.firstName,
            lastName: data.employee.lastName,
            email: data.employee.personal?.email || "", // ✅ personal email
          }));

          setProfessional((p) => ({
            ...p,
            employeeId: data.employee.employeeId,

            officialEmail:
              data.employee.professional?.officialEmail ||
              data.employee.email ||
              "", // fallback safety

            dateOfJoining: data.employee.professional?.dateOfJoining
              ? data.employee.professional.dateOfJoining.split("T")[0]
              : "",

            department: data.employee.professional?.department || "",
            designation: data.employee.professional?.designation || "",
            employeeType: data.employee.professional?.employeeType || "",
            status: data.employee.professional?.status || "",
          }));

          setSalary((s) => ({
            ...s,
            monthlySalary: data.employee.salary?.monthlySalary || "",
            annualSalary: data.employee.salary?.annualSalary || "",
          }));
        }
      });
  }, [router]);

  useEffect(() => {
    tokenRef.current = localStorage.getItem("employeeToken");
    if (!tokenRef.current) router.replace("/employee/login");
  }, [router]);

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  // const [alert, setAlert] = useState(null);

  // ---- FORM STATE ----
  const [personal, setPersonal] = useState({
    firstName: "",
    lastName: "",
    mobile: "",
    email: "",
    fatherName: "",
    motherName: "",
    dob: "",
    maritalStatus: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    avatar: null,
  });

  const [professional, setProfessional] = useState({
    employeeId: "",
    dateOfJoining: "",
    officialEmail: "",
    department: "",
    designation: "",
    employeeType: "",
    status: "",
  });

  const [salary, setSalary] = useState({
    monthlySalary: "",
    annualSalary: "",
    accountHolderName: "",
    bankName: "",
    branch: "",
    accountNumber: "",
    ifscCode: "",
    panNumber: "",
    upiId: "",
  });

  const [docs, setDocs] = useState({
    appointmentLetter: null,
    salarySlips: [], // multiple
    relievingLetter: null,
    experienceLetter: null,
  });

  // ---- VALIDATION HELPERS ----
  const required = (v) =>
    v !== null && v !== undefined && String(v).trim() !== "";
  const emailOk = (v) => /^\S+@\S+\.\S+$/.test(v);
  const ifscOk = (v) => /^[A-Z]{4}0[A-Z0-9]{6}$/.test(v); // basic IFSC check
  const panOk = (v) => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(v); // basic PAN check
  const isPdfOrJpeg = (f) =>
    f && ["application/pdf", "image/jpeg", "image/jpg"].includes(f.type);

  const validateStep = () => {
    if (step === 1) {
      const p = personal;
      if (
        ![
          p.firstName,
          p.lastName,
          p.mobile,
          p.email,
          p.dob,
          p.address,
          p.city,
          p.state,
          p.zip,
          p.maritalStatus,
        ].every(required)
      )
        return "Please fill all required Personal Information fields.";
      if (!emailOk(p.email)) return "Enter a valid Email Address.";
      if (p.avatar && !isPdfOrJpeg(p.avatar))
        return "Profile photo must be JPEG.";
    }
    if (step === 2) {
      const x = professional;
      if (
        ![
          x.employeeId,
          x.dateOfJoining,
          x.officialEmail,
          x.department,
          x.designation,
        ].every(required)
      )
        return "Please complete all Professional Information fields.";
      if (!emailOk(x.officialEmail)) return "Enter a valid Official Email.";
    }
    if (step === 3) {
      const b = salary;
      if (
        ![
          b.monthlySalary,
          b.annualSalary,
          b.accountHolderName,
          b.bankName,
          b.branch,
          b.accountNumber,
          b.ifscCode,
        ].every(required)
      )
        return "Please complete all Salary/Bank fields.";
      if (
        !/^\d+(\.\d+)?$/.test(b.monthlySalary) ||
        !/^\d+(\.\d+)?$/.test(b.annualSalary)
      )
        return "Monthly/Annual Salary must be numeric.";
      if (!ifscOk(b.ifscCode)) return "Invalid IFSC code.";
      if (b.panNumber && !panOk(b.panNumber)) return "Invalid PAN number.";
    }
    if (step === 4) {
      // All docs optional per your UI; validate types if provided
      const all = [
        docs.appointmentLetter,
        docs.relievingLetter,
        docs.experienceLetter,
        ...(docs.salarySlips || []),
      ].filter(Boolean);
      if (all.some((f) => !isPdfOrJpeg(f)))
        return "Uploads must be JPEG or PDF.";
    }
    return null;
  };

  const nextStep = () => {
    const err = validateStep();
    if (err) {
      toast.error(err);
      return;
    }
    setStep((s) => Math.min(4, s + 1));
  };

  const prevStep = () => setStep((s) => Math.max(1, s - 1));

  // ---- SUBMIT ----
  // const handleSubmit = async () => {
  //   const err = validateStep();
  //   if (err) return setAlert({ type: "danger", text: err });
  //   setAlert(null);
  //   setSubmitting(true);
  //   try {
  //     const fd = new FormData();

  //     // Personal
  //     Object.entries(personal).forEach(([k, v]) => {
  //       if (k === "avatar") {
  //         if (v) fd.append("avatar", v);
  //       } else fd.append(k, v ?? "");
  //     });

  //     // Professional
  //     Object.entries(professional).forEach(([k, v]) => fd.append(k, v ?? ""));

  //     // Salary
  //     Object.entries(salary).forEach(([k, v]) => fd.append(k, v ?? ""));

  //     // Documents
  //     if (docs.appointmentLetter)
  //       fd.append("appointmentLetter", docs.appointmentLetter);
  //     if (docs.relievingLetter)
  //       fd.append("relievingLetter", docs.relievingLetter);
  //     if (docs.experienceLetter)
  //       fd.append("experienceLetter", docs.experienceLetter);
  //     (docs.salarySlips || []).forEach((f) => fd.append("salarySlips", f));

  //     const res = await fetch("/api/employee/complete-profile", {
  //       method: "POST",
  //       headers: { Authorization: `Bearer ${tokenRef.current}` }, // JWT
  //       body: fd,
  //     });
  //     const data = await res.json();
  //     if (data.success) {
  //       router.push(data.redirectUrl || "/employee/profile");
  //     } else {
  //       setAlert({ type: "danger", text: data.message || "Submission failed" });
  //     }
  //   } catch (e) {
  //     setAlert({ type: "danger", text: "Server error. Try again later." });
  //   } finally {
  //     setSubmitting(false);
  //   }
  // };


  
  const handleSubmit = async () => {


    // 🔐 Documents validation
if (!docs.appointmentLetter) {
  toast.error("Appointment Letter is required");
  return;
}

if (!docs.salarySlips || docs.salarySlips.length === 0) {
  toast.error("At least one Salary Slip is required");
  return;
}

if (!docs.relievingLetter) {
  toast.error("Relieving Letter is required");
  return;
}

if (!docs.experienceLetter) {
  toast.error("Experience Letter is required");
  return;
}


    const err = validateStep();
    if (err) {
      toast.error(err);
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();

      Object.entries(personal).forEach(([k, v]) => {
        if (k === "avatar") {
          if (v) fd.append("avatar", v);
        } else fd.append(k, v ?? "");
      });

      Object.entries(professional).forEach(([k, v]) => fd.append(k, v ?? ""));
      Object.entries(salary).forEach(([k, v]) => fd.append(k, v ?? ""));

      if (docs.appointmentLetter)
        fd.append("appointmentLetter", docs.appointmentLetter);
      if (docs.relievingLetter)
        fd.append("relievingLetter", docs.relievingLetter);
      if (docs.experienceLetter)
        fd.append("experienceLetter", docs.experienceLetter);
      (docs.salarySlips || []).forEach((f) => fd.append("salarySlips", f));

      const res = await fetch("/api/employee/complete-profile", {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenRef.current}` },
        body: fd,
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Profile completed successfully 🎉");
        setTimeout(() => {
          router.push(data.redirectUrl || "/employee/profile");
        }, 1200);
      } else {
        toast.error(data.message || "Submission failed");
      }
    } catch (e) {
      toast.error("Server error. Try again later.");
    } finally {
      setSubmitting(false);
    }
  };

  // ---- UI HELPERS ----
  // const StepTab = ({ n, label, icon }) => (
  //   <li className="nav-item" role="presentation">
  //     <button
  //       className={`nav-link ${step === n ? "active" : ""}`}
  //       type="button"
  //       onClick={() => setStep(n)}
  //       aria-current={step === n ? "page" : undefined}
  //     >
  //       {icon ? <span className="me-2">{icon}</span> : null}
  //       {label}
  //     </button>
  //   </li>
  // );


  const StepTab = ({ n, label, icon }) => (
  <li className="nav-item" role="presentation">
    <button
      className={`nav-link ${step === n ? "active" : ""}`}
      type="button"
      disabled
      style={{
        cursor: "not-allowed",
        opacity: step === n ? 1 : 0.6,
      }}
      aria-current={step === n ? "page" : undefined}
    >
      {icon ? <span className="me-2">{icon}</span> : null}
      {label}
    </button>
  </li>
);


  return (
    <div className="container complete-profile-area">
      <Head>
        <link rel="stylesheet" href="/asets/css/admin.css" />
      </Head>
      <div className="complete-profile-header ">
        <Navbar />
      </div>
      <div className="card  complete-profile-form add-emp-area">
        <div className="card-body">
          <ul className="nav nav-tabs mb-4">
            <StepTab
              n={1}
              label="Personal Information"
              icon={<FaUser className="" />}
            />
            <StepTab
              n={2}
              label="Professional Information"
              icon={<FaBriefcase className="" />}
            />
            <StepTab
              n={3}
              label="Salary Details"
              icon={<FaMoneyBillWave className="" />}
            />
            <StepTab
              n={4}
              label="Documents"
              icon={<FaFileAlt className="" />}
            />
          </ul>

          {/* {alert && (
            <div className={`alert alert-${alert.type}`}>{alert.text}</div>
          )} */}

          {/* ---------------- Step 1 ---------------- */}
          {step === 1 && (
            <div>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">First Name*</label>
                  <input
                    className="form-control"
                    value={personal.firstName}
                    readOnly
                    disabled
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Last Name*</label>
                  <input
                    className="form-control"
                    value={personal.lastName}
                    readOnly
                    disabled
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Mobile Number*</label>
                  <input
                    className="form-control"
                    value={personal.mobile}
                    onChange={(e) =>
                      setPersonal((p) => ({ ...p, mobile: e.target.value }))
                    }
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Email Address*</label>

                  <input
                    type="email"
                    className="form-control"
                    value={personal.email}
                    onChange={(e) =>
                      setPersonal((p) => ({ ...p, email: e.target.value }))
                    }
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Father’s Name*</label>
                  <input
                    className="form-control"
                    value={personal.fatherName}
                    onChange={(e) =>
                      setPersonal((p) => ({ ...p, fatherName: e.target.value }))
                    }
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Mother’s Name*</label>
                  <input
                    className="form-control"
                    value={personal.motherName}
                    onChange={(e) =>
                      setPersonal((p) => ({ ...p, motherName: e.target.value }))
                    }
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Date of Birth*</label>
                  <input
                    type="date"
                    className="form-control"
                    value={personal.dob}
                    onChange={(e) =>
                      setPersonal((p) => ({ ...p, dob: e.target.value }))
                    }
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Marital Status*</label>
                  <select
                    className="form-select"
                    value={personal.maritalStatus}
                    onChange={(e) =>
                      setPersonal((p) => ({
                        ...p,
                        maritalStatus: e.target.value,
                      }))
                    }
                  >
                    <option value="">Select</option>
                    {maritalStatuses.map((ms) => (
                      <option key={ms} value={ms}>
                        {ms}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-12">
                  <label className="form-label">Address*</label>
                  <input
                    className="form-control"
                    value={personal.address}
                    onChange={(e) =>
                      setPersonal((p) => ({ ...p, address: e.target.value }))
                    }
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">City*</label>
                  <input
                    className="form-control"
                    value={personal.city}
                    onChange={(e) =>
                      setPersonal((p) => ({ ...p, city: e.target.value }))
                    }
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label">State*</label>
                  <select
                    className="form-select"
                    value={personal.state}
                    onChange={(e) =>
                      setPersonal((p) => ({ ...p, state: e.target.value }))
                    }
                  >
                    <option value="">State</option>
                    {statesIN.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Zip Code*</label>
                  <input
                    className="form-control"
                    value={personal.zip}
                    onChange={(e) =>
                      setPersonal((p) => ({ ...p, zip: e.target.value }))
                    }
                  />
                </div>
                {/* <div className="col-12">
                  <label className="form-label">Profile Photo (JPEG)</label>
                  <input
                    type="file"
                    accept="image/jpeg"
                    className="form-control"
                    onChange={(e) =>
                      setPersonal((p) => ({
                        ...p,
                        avatar: e.target.files?.[0] || null,
                      }))
                    }
                  />
                </div> */}
              </div>

              <div className="d-flex justify-content-end mt-4">
                <button className="invite-btn" onClick={nextStep}>
                  Next
                </button>
              </div>
            </div>
          )}

          {/* ---------------- Step 2 ---------------- */}
          {step === 2 && (
            <div>
              {/* <small class="text-muted mb-3">These fields is assigned by HR and cannot be edited.</small> */}
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Official Email Address*</label>

                  <input
                    type="email"
                    className="form-control"
                    value={professional.officialEmail}
                    readOnly
                    disabled
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Employee ID*</label>
                  <input
                    className="form-control"
                    value={professional.employeeId}
                    readOnly
                    disabled
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Select Department*</label>
                  <input
                    className="form-control"
                    value={professional.department}
                    readOnly
                    disabled
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Designation*</label>

                  <input
                    className="form-control"
                    value={professional.designation}
                    readOnly
                    disabled
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Employee Type*</label>

                  <input
                    className="form-control"
                    value={professional.employeeType}
                    readOnly
                    disabled
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Employment Status*</label>
                  <input
                    className="form-control"
                    value={professional.status}
                    readOnly
                    disabled
                  />
                </div>
              </div>
              <div className="row mt-3">
                <div className="col-md-12">
                  <label className="form-label">Date of Joining*</label>
                  <input
                    className="form-control"
                    value={professional.dateOfJoining}
                    readOnly
                    disabled
                  />
                </div>
              </div>

              <div className="d-flex justify-content-end gap-2 mt-4">
                <button className="cancel-btn" onClick={prevStep}>
                  Back
                </button>
                <button className="invite-btn" onClick={nextStep}>
                  Next
                </button>
              </div>
            </div>
          )}

          {/* ---------------- Step 3 ---------------- */}
          {step === 3 && (
            <div>
              <div className="row g-3">
                {/* <div className="col-md-6">
                  <label className="form-label">Monthly Salary*</label>
                  <input
                    className="form-control"
                    value={salary.monthlySalary}
                    onChange={(e) =>
                      setSalary((s) => ({
                        ...s,
                        monthlySalary: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Annual Salary (LPA)*</label>
                  <input
                    className="form-control"
                    value={salary.annualSalary}
                    onChange={(e) =>
                      setSalary((s) => ({ ...s, annualSalary: e.target.value }))
                    }
                  />
                </div> */}

                <div className="col-md-6">
                  <label className="form-label">Monthly Salary*</label>
                  <input
                    type="number"
                    className="form-control"
                    value={salary.monthlySalary}
                    readOnly
                    disabled
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Annual Salary*</label>
                  <input
                    type="number"
                    className="form-control"
                    value={salary.annualSalary}
                    readOnly
                    disabled
                  />
                </div>

                <small className="text-muted">
                  Salary is assigned by HR and cannot be edited.
                </small>

                <div className="col-12">
                  <label className="form-label">Account Holder name*</label>
                  <input
                    className="form-control"
                    value={salary.accountHolderName}
                    onChange={(e) =>
                      setSalary((s) => ({
                        ...s,
                        accountHolderName: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Bank Name*</label>
                  <input
                    className="form-control"
                    value={salary.bankName}
                    onChange={(e) =>
                      setSalary((s) => ({ ...s, bankName: e.target.value }))
                    }
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Branch*</label>
                  <input
                    className="form-control"
                    value={salary.branch}
                    onChange={(e) =>
                      setSalary((s) => ({ ...s, branch: e.target.value }))
                    }
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Account Number*</label>
                  <input
                    className="form-control"
                    value={salary.accountNumber}
                    onChange={(e) =>
                      setSalary((s) => ({
                        ...s,
                        accountNumber: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">IFSC Code*</label>
                  <input
                    className="form-control text-uppercase"
                    value={salary.ifscCode}
                    onChange={(e) =>
                      setSalary((s) => ({
                        ...s,
                        ifscCode: e.target.value.toUpperCase(),
                      }))
                    }
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">PAN Number</label>
                  <input
                    className="form-control text-uppercase"
                    value={salary.panNumber}
                    onChange={(e) =>
                      setSalary((s) => ({
                        ...s,
                        panNumber: e.target.value.toUpperCase(),
                      }))
                    }
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">UPI ID</label>
                  <input
                    className="form-control"
                    value={salary.upiId}
                    onChange={(e) =>
                      setSalary((s) => ({ ...s, upiId: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="d-flex justify-content-end gap-2 mt-4">
                <button className="cancel-btn" onClick={prevStep}>
                  Back
                </button>
                <button className="invite-btn" onClick={nextStep}>
                  Next
                </button>
              </div>
            </div>
          )}

          {/* ---------------- Step 4 ---------------- */}
          {step === 4 && (
            <div>
              {/* <div className="row g-4">
                <div className="col-md-6">
                  <label className="form-label">
                    Upload Appointment Letter
                  </label>
                  <input
                    type="file"
                    accept="application/pdf,image/jpeg"
                    className="form-control"
                    onChange={(e) =>
                      setDocs((d) => ({
                        ...d,
                        appointmentLetter: e.target.files?.[0] || null,
                      }))
                    }
                  />
                  <small className="text-muted">Supported: JPEG, PDF</small>
                </div>

                <div className="col-md-6">
                  <label className="form-label">Upload Salary Slips</label>
                  <input
                    multiple
                    type="file"
                    accept="application/pdf,image/jpeg"
                    className="form-control"
                    onChange={(e) =>
                      setDocs((d) => ({
                        ...d,
                        salarySlips: Array.from(e.target.files || []),
                      }))
                    }
                  />
                  <small className="text-muted">
                    You can select multiple files
                  </small>
                </div>

                <div className="col-md-6">
                  <label className="form-label">Upload Relieving Letter</label>
                  <input
                    type="file"
                    accept="application/pdf,image/jpeg"
                    className="form-control"
                    onChange={(e) =>
                      setDocs((d) => ({
                        ...d,
                        relievingLetter: e.target.files?.[0] || null,
                      }))
                    }
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label">Upload Experience Letter</label>
                  <input
                    type="file"
                    accept="application/pdf,image/jpeg"
                    className="form-control"
                    onChange={(e) =>
                      setDocs((d) => ({
                        ...d,
                        experienceLetter: e.target.files?.[0] || null,
                      }))
                    }
                  />
                </div>
              </div> */}

              <div className="row g-4">
                {/* Appointment Letter */}
                <div className="col-md-6">
                  <label className="form-label fw-semibold text-dark">
                    Upload Appointment Letter
                  </label>
                  <div
                    className="upload-box"
                    onClick={() =>
                      document.getElementById("appointmentLetterInput").click()
                    }
                  >
                    <div className="upload-icon">
                      <img src="/icons/upload-icon.png"></img>
                    </div>
                    <p className="mb-1">
                      Drag & Drop or{" "}
                      <span className="choose-file">choose file</span> to upload
                    </p>
                    <small className="text-muted">
                      Supported formats: JPEG, PDF
                    </small>
                  </div>
                  <input
                    id="appointmentLetterInput"
                    type="file"
                    accept="application/pdf,image/jpeg"
                    className="d-none"
                    onChange={(e) =>
                      setDocs((d) => ({
                        ...d,
                        appointmentLetter: e.target.files?.[0] || null,
                      }))
                    }
                  />

                  {docs.appointmentLetter && (
                      <p className="mt-2 text-success small">
                        Selected: {docs.appointmentLetter.name}
                      </p>
                    )}

                </div>

                {/* Salary Slips */}
                <div className="col-md-6">
                  <label className="form-label fw-semibold text-dark">
                    Upload Salary Slips
                  </label>
                  <div
                    className="upload-box"
                    onClick={() =>
                      document.getElementById("salarySlipsInput").click()
                    }
                  >
                    <div className="upload-icon">
                      <img src="/icons/upload-icon.png"></img>
                    </div>
                    <p className="mb-1">
                      Drag & Drop or{" "}
                      <span className="choose-file">choose file</span> to upload
                    </p>
                    <small className="text-muted">
                      You can select multiple files
                    </small>
                  </div>
                  <input
                    id="salarySlipsInput"
                    multiple
                    type="file"
                    accept="application/pdf,image/jpeg"
                    className="d-none"
                    onChange={(e) =>
                      setDocs((d) => ({
                        ...d,
                        salarySlips: Array.from(e.target.files || []),
                      }))
                    }
                  />

                  {docs.salarySlips?.length > 0 && (
                    <ul className="mt-2 small text-success">
                      {docs.salarySlips.map((file, i) => (
                        <li key={i}>{file.name}</li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Relieving Letter */}
                <div className="col-md-6">
                  <label className="form-label fw-semibold text-dark">
                    Upload Relieving Letter
                  </label>
                  <div
                    className="upload-box"
                    onClick={() =>
                      document.getElementById("relievingLetterInput").click()
                    }
                  >
                    <div className="upload-icon">
                      <img src="/icons/upload-icon.png"></img>
                    </div>
                    <p className="mb-1">
                      Drag & Drop or{" "}
                      <span className="choose-file">choose file</span> to upload
                    </p>
                    <small className="text-muted">
                      Supported formats: JPEG, PDF
                    </small>
                  </div>
                  <input
                    id="relievingLetterInput"
                    type="file"
                    accept="application/pdf,image/jpeg"
                    className="d-none"
                    onChange={(e) =>
                      setDocs((d) => ({
                        ...d,
                        relievingLetter: e.target.files?.[0] || null,
                      }))
                    }
                  />

                  {docs.relievingLetter && (
                      <p className="mt-2 text-success small">
                        Selected: {docs.relievingLetter.name}
                      </p>
                    )}
                </div>

                {/* Experience Letter */}
                <div className="col-md-6">
                  <label className="form-label fw-semibold text-dark">
                    Upload Experience Letter
                  </label>
                  <div
                    className="upload-box"
                    onClick={() =>
                      document.getElementById("experienceLetterInput").click()
                    }
                  >
                    <div className="upload-icon">
                      <img src="/icons/upload-icon.png"></img>
                    </div>
                    <p className="mb-1">
                      Drag & Drop or{" "}
                      <span className="choose-file">choose file</span> to upload
                    </p>
                    <small className="text-muted">
                      Supported formats: JPEG, PDF
                    </small>
                  </div>
                  <input
                    id="experienceLetterInput"
                    type="file"
                    accept="application/pdf,image/jpeg"
                    className="d-none"
                    onChange={(e) =>
                      setDocs((d) => ({
                        ...d,
                        experienceLetter: e.target.files?.[0] || null,
                      }))
                    }
                  />


                  {docs.experienceLetter && (
                      <p className="mt-2 text-success small">
                        Selected: {docs.experienceLetter.name}
                      </p>
                    )}
                </div>
              </div>

              <style jsx>{`
                .upload-box {
                  border: 2px dashed #9b8afc;
                  border-radius: 8px;
                  padding: 30px 20px;
                  text-align: center;
                  cursor: pointer;
                  transition: all 0.3s ease;
                }
                .upload-box:hover {
                  background-color: #f8f9ff;
                  border-color: #6f58e9;
                }
                .upload-icon {
                  width: 50px;
                  height: 50px;
                  background: #6f58e9;
                  color: #fff;
                  border-radius: 12px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  margin: 0 auto 10px auto;
                  font-size: 22px;
                }
                .choose-file {
                  color: #6f58e9;
                  font-weight: 600;
                  cursor: pointer;
                }
              `}</style>

              <div className="d-flex justify-content-end gap-2 mt-4">
                <button className="cancel-btn" onClick={prevStep}>
                  Back
                </button>
                <button
                  className="invite-btn"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? "Finishing..." : "Finish"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

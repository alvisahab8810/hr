import { toast } from "react-toastify";

import AddEmployeeForm from "@/components/admin/AddEmployeeForm";
import Dashnav from "@/components/Dashnav";
import SmartLeftbar from "@/components/SmartLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { FaEye, FaEdit, FaTrash } from "react-icons/fa";

export default function AddEmployee() {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // you can change to 5, 20, etc.

  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // for status or department

  const [statusFilter, setStatusFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");

  // For modals
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Deactivate modal state
  const [exitStatus, setExitStatus] = useState("Resigned");
  const [exitDate,   setExitDate]   = useState(new Date().toISOString().slice(0,10));
  const [exitReason, setExitReason] = useState("");
  const [formData, setFormData] = useState({
    personal: { firstName: "", lastName: "" },
    professional: {
      employeeId: "",
      department: "",
      designation: "",
      employeeType: "",
      status: "",
    },
  });
  const [alert, setAlert] = useState(null);
  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/employee/all", {
        credentials: "include", // 🔑 send the authToken cookie
      });

      const data = await res.json();
      if (data.success) {
        setEmployees(data.employees || []);
      } else {
        console.warn("⚠️ Employee fetch failed:", data.message);
      }
    } catch (err) {
      console.error("Error fetching employees:", err);
    } finally {
      setLoading(false);
    }
  };

  // 🔎 filter employees
  // const filtered = employees.filter(
  //   (emp) =>
  //     emp.personal?.firstName?.toLowerCase().includes(search.toLowerCase()) ||
  //     emp.personal?.lastName?.toLowerCase().includes(search.toLowerCase()) ||
  //     emp.professional?.employeeId?.toLowerCase().includes(search.toLowerCase())
  // );

  const filtered = employees.filter((emp) => {
    const matchesSearch =
      emp.personal?.firstName?.toLowerCase().includes(search.toLowerCase()) ||
      emp.personal?.lastName?.toLowerCase().includes(search.toLowerCase()) ||
      emp.professional?.employeeId
        ?.toLowerCase()
        .includes(search.toLowerCase());

    const matchesStatus = statusFilter
      ? emp.professional?.status === statusFilter
      : true;

    const matchesDepartment = departmentFilter
      ? emp.professional?.department === departmentFilter
      : true;

    return matchesSearch && matchesStatus && matchesDepartment;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const paginatedEmployees = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, departmentFilter]);

  // Handle deactivate (soft delete — data is never lost)
  const handleDelete = async () => {
    if (!selectedEmployee) return;
    try {
      const res = await fetch(`/api/employee/delete/${selectedEmployee._id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ exitStatus, exitDate, exitReason }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`${selectedEmployee.personal?.firstName || "Employee"} moved to Former Employees`);
        setEmployees(employees.filter((e) => e._id !== selectedEmployee._id));
      } else {
        toast.error(data.message || "Deactivation failed");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error deactivating employee");
    } finally {
      setShowDeleteModal(false);
      setExitReason("");
    }
  };

  // Handle edit save
  // When opening the modal → prefill ALL employee data
  const handleEditClick = (employee) => {
    setSelectedEmployee(employee);

    setFormData({
      personal: {
        firstName: employee.personal?.firstName || "",
        lastName: employee.personal?.lastName || "",
        avatar: employee.personal?.avatar || "",
        phone: employee.personal?.phone || "",
        address: employee.personal?.address || "",
        // add all personal fields you want preserved
      },
      professional: {
        employeeId: employee.professional?.employeeId || "",
        department: employee.professional?.department || "",
        designation: employee.professional?.designation || "",
        employeeType: employee.professional?.employeeType || "",
        status: employee.professional?.status || "",
        dateOfJoining: employee.professional?.dateOfJoining || "",
        officialEmail: employee.professional?.officialEmail || "",
        // add the rest if needed
      },
    });

    setShowEditModal(true);
  };

  // Save handler → send FULL formData
  const handleEditSave = async (e) => {
    e.preventDefault();
    if (!selectedEmployee) return;

    try {
      const res = await fetch(`/api/employee/update/${selectedEmployee._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        toast.success("Employee updated successfully");
        await fetchEmployees(); // refresh list immediately
      } else {
        toast.error(data.message || "Update failed");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error updating employee");
    } finally {
      setShowEditModal(false);
    }
  };

  // 🔹 Attendance highlights (derived from DB data)
  const attendanceStats = {
    active: employees.filter((e) => e.professional?.status === "Permanent")
      .length,

    probation: employees.filter((e) => e.professional?.status === "Probation")
      .length,

    resigned: employees.filter((e) => e.professional?.status === "Contract")
      .length,

    inactive: employees.filter((e) => e.professional?.status === "Intern")
      .length,

    total: employees.length,
  };

  // 🔹 Unique status & department from DB data
  const statusOptions = [
    ...new Set(employees.map((e) => e.professional?.status).filter(Boolean)),
  ];

  const departmentOptions = [
    ...new Set(
      employees.map((e) => e.professional?.department).filter(Boolean)
    ),
  ];

  const STATUS_COLOR = {
    Permanent: { bg: "#DCFCE7", color: "#16A34A" },
    Probation: { bg: "#FFEDD5", color: "#EA580C" },
    Contract:  { bg: "#DBEAFE", color: "#1D4ED8" },
    Intern:    { bg: "#EDE9FE", color: "#7C3AED" },
  };
  const badgeStyle = (status) => STATUS_COLOR[status] || { bg: "#F1F5F9", color: "#64748B" };

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
        <style>{`
          .kpi-card { transition: transform .2s ease, box-shadow .2s ease; }
          .kpi-card:hover { transform: translateY(-3px); box-shadow: 0 12px 28px rgba(15,23,42,.12); }
        `}</style>
      </Head>

      <div className="add-employee-area">
        <div className="main-nav">
          <SmartLeftbar />
          <LeftbarMobile />
          <Dashnav />

          <section className="content home">
            <div className="breadcrum-bx">
              <ul className="breadcrumb  bg-white">
                <li className="breadcrumb-item">
                  <Link href="/dashboard/dashboard">
                    <img src="/icons/menu-user.svg"></img> Employee Management
                  </Link>
                </li>
              </ul>
            </div>

            <div className="block-header add-emp-area">
              {/* 🔹 Header */}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12, marginBottom:20 }}>
                <div style={{ position:"relative", flex:"1 1 260px", maxWidth:360 }}>
                  <i className="bi bi-search" style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:"#94A3B8", fontSize:14 }} />
                  <input
                    type="text"
                    placeholder="Search by name or employee ID"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{
                      width:"100%", boxSizing:"border-box", padding:"10px 14px 10px 38px",
                      border:"1px solid #E5E7EB", borderRadius:10, fontSize:13, outline:"none",
                      background:"#fff",
                    }}
                  />
                </div>
                <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                  <Link
                    href="/dashboard/admin/former-employees"
                    style={{
                      display:"flex", alignItems:"center", gap:6,
                      background:"#FEE2E2", color:"#DC2626",
                      border:"1.5px solid #FECACA", borderRadius:10,
                      padding:"9px 16px", fontSize:13, fontWeight:700,
                      textDecoration:"none",
                    }}
                  >
                    <i className="bi bi-person-dash-fill" /> Former Employees
                  </Link>
                  <Link
                    href="/dashboard/admin/add-employee"
                    style={{
                      display:"flex", alignItems:"center", gap:6,
                      background:"linear-gradient(135deg,#6366F1,#818CF8)", color:"#fff",
                      border:"none", borderRadius:10,
                      padding:"9px 16px", fontSize:13, fontWeight:700,
                      textDecoration:"none", boxShadow:"0 4px 12px rgba(99,102,241,.3)",
                    }}
                  >
                    <i className="bi bi-plus-circle-fill" /> Add New Employee
                  </Link>
                </div>
              </div>

              {/* 🔔 Alert */}
              {alert && (
                <div
                  className={`alert alert-${alert.type} alert-dismissible fade show`}
                  role="alert"
                >
                  {alert.msg}
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setAlert(null)}
                  ></button>
                </div>
              )}

              <h5 style={{ fontSize:15, fontWeight:800, color:"#0F172A", marginBottom:14 }}>Employee Management Highlights</h5>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:22 }}>
                {[
                  { label:"Active Employees",   value:attendanceStats.active,    icon:"bi-people-fill",           accent:{ bg:"#DCFCE7", icon:"#16A34A", shadow:"rgba(34,197,94,.18)"  } },
                  { label:"On Probation",       value:attendanceStats.probation, icon:"bi-hourglass-split",       accent:{ bg:"#FFEDD5", icon:"#EA580C", shadow:"rgba(249,115,22,.18)" } },
                  { label:"Contract Employees", value:attendanceStats.resigned,  icon:"bi-file-earmark-text-fill",accent:{ bg:"#EEF2FF", icon:"#6366F1", shadow:"rgba(99,102,241,.18)" } },
                  { label:"Interns",            value:attendanceStats.inactive,  icon:"bi-mortarboard-fill",      accent:{ bg:"#F3E8FF", icon:"#9333EA", shadow:"rgba(168,85,247,.18)" } },
                ].map((c) => {
                  const pct = attendanceStats.total ? Math.round((c.value / attendanceStats.total) * 100) : 0;
                  return (
                    <div key={c.label} className="kpi-card" style={{
                      background:`linear-gradient(160deg, #fff 55%, ${c.accent.bg} 165%)`,
                      borderRadius:16, border:`1px solid ${c.accent.bg}`,
                      boxShadow:"0 3px 12px rgba(15,23,42,.06)", padding:"17px 18px 16px",
                      position:"relative", overflow:"hidden",
                    }}>
                      <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:c.accent.icon }} />
                      <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:14 }}>
                        <div style={{
                          width:46, height:46, borderRadius:13, flexShrink:0,
                          background:c.accent.icon,
                          display:"flex", alignItems:"center", justifyContent:"center",
                          boxShadow:`0 6px 16px ${c.accent.shadow}`,
                        }}>
                          <i className={`bi ${c.icon}`} style={{ fontSize:19, color:"#fff" }} />
                        </div>
                        <div style={{ minWidth:0 }}>
                          <div style={{ fontSize:26, fontWeight:900, color:"#0F172A", lineHeight:1.05, letterSpacing:"-0.8px" }}>{c.value}</div>
                          <div style={{ fontSize:12, color:"#475569", fontWeight:700, marginTop:3, whiteSpace:"nowrap" }}>{c.label}</div>
                        </div>
                      </div>
                      <div style={{ height:6, background:"#F1F5F9", borderRadius:6 }}>
                        <div style={{ height:6, width:`${pct}%`, borderRadius:6, background:c.accent.icon, transition:"width .4s" }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{
                    padding:"9px 14px", borderRadius:10, border:"1px solid #E5E7EB",
                    fontSize:13, fontWeight:600, color:"#374151", background:"#fff", outline:"none", minWidth:160,
                  }}
                >
                  <option value="">All Status</option>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>

                {/* Department Filter */}
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  style={{
                    padding:"9px 14px", borderRadius:10, border:"1px solid #E5E7EB",
                    fontSize:13, fontWeight:600, color:"#374151", background:"#fff", outline:"none", minWidth:160,
                  }}
                >
                  <option value="">All Departments</option>
                  {departmentOptions.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              {/* 📊 Table */}
              <div style={{
                background:"#fff", borderRadius:16, border:"1px solid #F0F0F8",
                boxShadow:"0 2px 10px rgba(15,23,42,.05)", overflow:"hidden",
              }}>
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse" }}>
                    <thead>
                      <tr style={{ background:"#F8FAFC", borderBottom:"1px solid #F0F0F8" }}>
                        {["Employee Name","Employee ID","Department","Designation","Type","Status","Action"].map((h) => (
                          <th key={h} style={{
                            textAlign: h === "Action" ? "right" : "left", padding:"12px 18px",
                            fontSize:11, fontWeight:800, color:"#64748B", textTransform:"uppercase", letterSpacing:"0.04em",
                            whiteSpace:"nowrap",
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedEmployees.map((emp) => {
                        const badge = badgeStyle(emp.professional?.status);
                        return (
                        <tr key={emp._id} style={{ borderBottom:"1px solid #F4F4FD" }}>
                          <td style={{ padding:"12px 18px" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                              {emp.personal?.avatar ? (
                                <img
                                  src={emp.personal.avatar}
                                  alt=""
                                  width="35"
                                  height="35"
                                  style={{ borderRadius:"50%", objectFit:"cover", flexShrink:0 }}
                                  onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }}
                                />
                              ) : null}
                              <div
                                style={{
                                  width:35, height:35, borderRadius:"50%", background:"#EEF2FF",
                                  display: emp.personal?.avatar ? "none" : "flex",
                                  alignItems:"center", justifyContent:"center", color:"#4338CA",
                                  fontWeight:800, fontSize:13, flexShrink:0,
                                }}
                              >
                                {emp.personal?.firstName?.charAt(0).toUpperCase() || "?"}
                              </div>
                              <span style={{ fontSize:13, fontWeight:700, color:"#0F172A" }}>
                                {emp.personal?.firstName} {emp.personal?.lastName}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding:"12px 18px", fontSize:13, color:"#475569" }}>{emp.professional?.employeeId}</td>
                          <td style={{ padding:"12px 18px", fontSize:13, color:"#475569" }}>{emp.professional?.department || "-"}</td>
                          <td style={{ padding:"12px 18px", fontSize:13, color:"#475569" }}>{emp.professional?.designation || "-"}</td>
                          <td style={{ padding:"12px 18px", fontSize:13, color:"#475569" }}>{emp.professional?.employeeType || "-"}</td>
                          <td style={{ padding:"12px 18px" }}>
                            <span style={{
                              fontSize:11, fontWeight:700, padding:"4px 11px", borderRadius:20,
                              background:badge.bg, color:badge.color, whiteSpace:"nowrap",
                            }}>
                              {emp.professional?.status || "-"}
                            </span>
                          </td>
                          <td style={{ padding:"12px 18px" }}>
                            <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
                              <Link
                                href={`/dashboard/admin/employee-profile/${emp._id}`}
                                style={{
                                  display:"flex", alignItems:"center", gap:5, textDecoration:"none",
                                  background:"#EEF2FF", color:"#4338CA", border:"1px solid #E0E7FF",
                                  borderRadius:8, padding:"6px 11px", fontSize:12, fontWeight:700, whiteSpace:"nowrap",
                                }}
                              >
                                <FaEye size={11} /> View
                              </Link>
                              <button
                                style={{
                                  display:"flex", alignItems:"center", gap:5, cursor:"pointer",
                                  background:"#FFFBEB", color:"#B45309", border:"1px solid #FDE68A",
                                  borderRadius:8, padding:"6px 11px", fontSize:12, fontWeight:700, whiteSpace:"nowrap",
                                }}
                                onClick={() => {
                                  setSelectedEmployee(emp);
                                  setFormData({
                                    personal: {
                                      firstName: emp.personal?.firstName || "",
                                      lastName: emp.personal?.lastName || "",
                                    },
                                    professional: {
                                      employeeId:
                                        emp.professional?.employeeId || "",
                                      department:
                                        emp.professional?.department || "",
                                      designation:
                                        emp.professional?.designation || "",
                                      employeeType:
                                        emp.professional?.employeeType || "",
                                      status: emp.professional?.status || "",
                                    },
                                  });
                                  setShowEditModal(true);
                                }}
                              >
                                <FaEdit size={11} /> Edit
                              </button>
                              <button
                                style={{
                                  display:"flex", alignItems:"center", gap:5, cursor:"pointer",
                                  background:"#FEE2E2", color:"#DC2626", border:"1px solid #FECACA",
                                  borderRadius:8, padding:"6px 11px", fontSize:12, fontWeight:700, whiteSpace:"nowrap",
                                }}
                                onClick={() => {
                                  setSelectedEmployee(emp);
                                  setExitStatus("Resigned");
                                  setExitDate(new Date().toISOString().slice(0,10));
                                  setExitReason("");
                                  setShowDeleteModal(true);
                                }}
                              >
                                <FaTrash size={11} /> Deactivate
                              </button>
                            </div>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div style={{
                    display:"flex", justifyContent:"space-between", alignItems:"center",
                    flexWrap:"wrap", gap:10, padding:"14px 18px", borderTop:"1px solid #F0F0F8",
                  }}>
                    <span style={{ fontSize:12, color:"#94A3B8" }}>
                      Showing {(currentPage - 1) * itemsPerPage + 1}–
                      {Math.min(currentPage * itemsPerPage, filtered.length)}{" "}
                      of {filtered.length}
                    </span>

                    <div style={{ display:"flex", gap:6 }}>
                      <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                        style={{
                          padding:"6px 12px", borderRadius:8, fontSize:12, fontWeight:700,
                          border:"1px solid #E5E7EB", background:"#fff", color:currentPage===1?"#CBD5E1":"#374151",
                          cursor:currentPage===1?"default":"pointer",
                        }}
                      >
                        Prev
                      </button>

                      {[...Array(totalPages)].map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentPage(i + 1)}
                          style={{
                            width:32, height:32, borderRadius:8, fontSize:12, fontWeight:700,
                            border:"1px solid " + (currentPage === i + 1 ? "#6366F1" : "#E5E7EB"),
                            background: currentPage === i + 1 ? "#6366F1" : "#fff",
                            color: currentPage === i + 1 ? "#fff" : "#374151",
                            cursor:"pointer",
                          }}
                        >
                          {i + 1}
                        </button>
                      ))}

                      <button
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                        style={{
                          padding:"6px 12px", borderRadius:8, fontSize:12, fontWeight:700,
                          border:"1px solid #E5E7EB", background:"#fff",
                          color:currentPage===totalPages?"#CBD5E1":"#374151",
                          cursor:currentPage===totalPages?"default":"pointer",
                        }}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* ✏️ Edit Modal */}
      {showEditModal && (
        <div
          className="modal fade show d-block edit-employee-modal"
          tabIndex="-1"
        >
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <form onSubmit={handleEditSave}>
                <div className="modal-header">
                  <h5 className="modal-title">Edit Employee</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowEditModal(false)}
                  ></button>
                </div>

                <div className="modal-body row g-3">
                  {/* Personal Info */}
                  <div className="col-md-6">
                    <label className="form-label">First Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.personal.firstName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          personal: {
                            ...formData.personal,
                            firstName: e.target.value,
                          },
                        })
                      }
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Last Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.personal.lastName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          personal: {
                            ...formData.personal,
                            lastName: e.target.value,
                          },
                        })
                      }
                      required
                    />
                  </div>

                  {/* Professional Info */}
                  <div className="col-md-6">
                    <label className="form-label">Employee ID</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.professional.employeeId}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          professional: {
                            ...formData.professional,
                            employeeId: e.target.value,
                          },
                        })
                      }
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Department</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.professional.department}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          professional: {
                            ...formData.professional,
                            department: e.target.value,
                          },
                        })
                      }
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Designation</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.professional.designation}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          professional: {
                            ...formData.professional,
                            designation: e.target.value,
                          },
                        })
                      }
                    />
                  </div>

                  {/* Employee Type */}
                  <div className="col-md-6">
                    <label className="form-label">Employee Type</label>
                    <select
                      className="form-select"
                      value={formData.professional.employeeType}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          professional: {
                            ...formData.professional,
                            employeeType: e.target.value,
                          },
                        })
                      }
                      required
                    >
                      <option value="">Select</option>
                      <option value="Remote">Remote</option>
                      <option value="Office">Office</option>
                      <option value="Hybrid">Hybrid</option>
                    </select>
                  </div>

                  {/* Status */}
                  <div className="col-md-12">
                    <label className="form-label">Status</label>
                    <select
                      className="form-select"
                      value={formData.professional.status}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          professional: {
                            ...formData.professional,
                            status: e.target.value,
                          },
                        })
                      }
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

                <div className="modal-footer">
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowEditModal(false)}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button className="btn btn-primary" type="submit">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div style={{ position:"fixed", inset:0, zIndex:1050, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div onClick={() => setShowDeleteModal(false)} style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.45)" }} />
          <div style={{ position:"relative", background:"#fff", borderRadius:20, width:"100%", maxWidth:460, boxShadow:"0 20px 60px rgba(0,0,0,0.25)", padding:"28px 28px 24px" }}>

            {/* Header */}
            <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:20 }}>
              <div style={{ width:50, height:50, borderRadius:14, background:"#FEE2E2", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <i className="bi bi-person-dash-fill" style={{ fontSize:22, color:"#DC2626" }} />
              </div>
              <div>
                <h5 style={{ fontWeight:800, color:"#111827", margin:0, fontSize:16 }}>Deactivate Employee</h5>
                <p style={{ margin:"3px 0 0", fontSize:12, color:"#9CA3AF" }}>
                  {selectedEmployee?.personal?.firstName} {selectedEmployee?.personal?.lastName} · {selectedEmployee?.professional?.employeeId}
                </p>
              </div>
              <button onClick={() => setShowDeleteModal(false)} style={{ marginLeft:"auto", background:"#F3F4F6", border:"none", borderRadius:8, padding:"6px 10px", cursor:"pointer", fontSize:14, color:"#374151" }}>
                <i className="bi bi-x-lg" />
              </button>
            </div>

            {/* Info banner */}
            <div style={{ background:"#ECFDF5", border:"1.5px solid #6EE7B7", borderRadius:10, padding:"10px 14px", marginBottom:18, display:"flex", gap:8, fontSize:12, color:"#065F46" }}>
              <i className="bi bi-shield-check-fill" style={{ flexShrink:0, marginTop:1 }} />
              <span>Employee data is <strong>never deleted</strong>. All history, salary records and attendance will be preserved and accessible from the Former Employees page.</span>
            </div>

            {/* Exit Status */}
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, fontWeight:700, color:"#374151", display:"block", marginBottom:6 }}>Reason for Leaving *</label>
              <div style={{ display:"flex", gap:8 }}>
                {["Resigned","Fired","Retired","Other"].map(s => (
                  <button key={s} type="button" onClick={() => setExitStatus(s)}
                    style={{
                      flex:1, padding:"8px 6px", borderRadius:9, fontSize:12, fontWeight:700, cursor:"pointer", border:"1.5px solid",
                      background: exitStatus === s ? (s === "Fired" ? "#FEE2E2" : s === "Resigned" ? "#FEF3C7" : "#EEF2FF") : "#fff",
                      color: exitStatus === s ? (s === "Fired" ? "#DC2626" : s === "Resigned" ? "#B45309" : "#4F46E5") : "#9CA3AF",
                      borderColor: exitStatus === s ? (s === "Fired" ? "#FCA5A5" : s === "Resigned" ? "#FCD34D" : "#C7D2FE") : "#E5E7EB",
                    }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Exit Date */}
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, fontWeight:700, color:"#374151", display:"block", marginBottom:6 }}>Last Working Date *</label>
              <input type="date" value={exitDate} onChange={e => setExitDate(e.target.value)}
                style={{ width:"100%", padding:"9px 12px", fontSize:13, borderRadius:8, border:"1.5px solid #E5E7EB", outline:"none", boxSizing:"border-box" }} />
            </div>

            {/* Exit Reason */}
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:12, fontWeight:700, color:"#374151", display:"block", marginBottom:6 }}>Notes / Remarks (optional)</label>
              <textarea rows={3} value={exitReason} onChange={e => setExitReason(e.target.value)}
                placeholder="e.g. Better opportunity, performance issues, contract end…"
                style={{ width:"100%", padding:"9px 12px", fontSize:13, borderRadius:8, border:"1.5px solid #E5E7EB", outline:"none", resize:"vertical", boxSizing:"border-box" }} />
            </div>

            {/* Footer */}
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <button onClick={() => setShowDeleteModal(false)}
                style={{ background:"#F3F4F6", border:"none", borderRadius:9, padding:"9px 18px", fontSize:13, fontWeight:600, cursor:"pointer" }}>
                Cancel
              </button>
              <button onClick={handleDelete}
                style={{ background:"#DC2626", color:"#fff", border:"none", borderRadius:9, padding:"9px 20px", fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:6 }}>
                <i className="bi bi-person-dash-fill" /> Deactivate Employee
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

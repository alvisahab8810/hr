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
              <div className="search-bar-bx d-flex justify-content-between align-items-center ">
                <div className="search-bx-img">
                  <input
                    type="text"
                    placeholder="Search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="form-control border-light"
                  />
                  <img src="/icons/search.png" alt=""></img>
                </div>
                <div className="d-flex gap-2 filter-bx-row">
                  <Link
                    href="/dashboard/admin/former-employees"
                    style={{
                      display:"flex", alignItems:"center", gap:6,
                      background:"#FEE2E2", color:"#DC2626",
                      border:"1.5px solid #FECACA", borderRadius:10,
                      padding:"8px 14px", fontSize:13, fontWeight:700,
                      textDecoration:"none",
                    }}
                  >
                    <i className="bi bi-person-dash-fill" /> Former Employees
                  </Link>
                  <a
                    href="/dashboard/admin/add-employee"
                    className="invite-btn "
                  >
                    <img
                      src="/icons/add-circle.svg"
                      alt="Add Employee Icon"
                    ></img>
                    Add New Employee
                  </a>
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

              <h5 class="admin-main-heading">Employee Management Highlights</h5>
              <div className="attendance-highlight-wrap">
                <div className="attendance-card active">
                  <div className="card-left">
                    <div className="icon green">
                      <img src="/icons/active-employee.svg"></img>
                    </div>
                    <div>
                      <span>Active Employees</span>
                      <div className="bar">
                        <span
                          style={{
                            width: `${
                              (attendanceStats.active / attendanceStats.total) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <h3>{attendanceStats.active}</h3>
                </div>

                <div className="attendance-card probation">
                  <div className="card-left">
                    <div className="icon orange">
                      <img src="/icons/on-probation.svg"></img>
                    </div>
                    <div>
                      <span>On Probation</span>
                      <div className="bar">
                        <span
                          style={{
                            width: `${
                              (attendanceStats.probation /
                                attendanceStats.total) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <h3>{attendanceStats.probation}</h3>
                </div>

                <div className="attendance-card resigned">
                  <div className="card-left">
                    <div className="icon red">
                      <img src="/icons/redisgned.svg"></img>
                    </div>
                    <div>
                      {/* <span>Resigned / Notice</span> */}
                      <span>Contract Employees</span>
                      <div className="bar">
                        <span
                          style={{
                            width: `${
                              (attendanceStats.resigned /
                                attendanceStats.total) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <h3>{attendanceStats.resigned}</h3>
                </div>

                <div className="attendance-card inactive">
                  <div className="card-left">
                    <div className="icon purple">
                      <img src="/icons/inactive.svg"></img>
                    </div>
                    <div>
                      {/* <span>Inactive</span> */}
                      <span>Interns</span>
                      <div className="bar">
                        <span
                          style={{
                            width: `${
                              (attendanceStats.inactive /
                                attendanceStats.total) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  <h3>{attendanceStats.inactive}</h3>
                </div>
              </div>

              <div className="d-flex gap-2 filter-bx-row1">
                {/* Status Filter */}
                <select
                  className="form-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
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
                  className="form-select"
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
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
              <div className="custom-table-area table-responsive">
                <table className="table  table-hover align-middle ">
                  <thead>
                    <tr>
                      <th>Employee Name</th>
                      <th>Employee ID</th>
                      <th>Department</th>
                      <th>Designation</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedEmployees.map((emp) => (
                      <tr key={emp._id}>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            {emp.personal?.avatar ? (
                              <img
                                src={emp.personal.avatar}
                                alt="avatar"
                                className="rounded-circle"
                                width="35"
                                height="35"
                              />
                            ) : (
                              <div
                                className="rounded-circle bg-primary d-flex justify-content-center align-items-center text-white"
                                style={{ width: 35, height: 35 }}
                              >
                                {emp.personal?.firstName
                                  ?.charAt(0)
                                  .toUpperCase()}
                              </div>
                            )}
                            <span>
                              {emp.personal?.firstName} {emp.personal?.lastName}
                            </span>
                          </div>
                        </td>
                        <td>{emp.professional?.employeeId}</td>
                        <td>{emp.professional?.department || "-"}</td>
                        <td>{emp.professional?.designation || "-"}</td>
                        <td>{emp.professional?.employeeType || "-"}</td>
                        <td>
                          <span className="emp-badge">
                            {emp.professional?.status || "-"}
                          </span>
                        </td>
                        <td>
                          <div className="d-flex gap-2 actions-btn">
                            <Link
                              href={`/dashboard/admin/employee-profile/${emp._id}`}
                              className="btn btn-sm btn-outline-light"
                            >
                              <FaEye /> View
                            </Link>
                            <button
                              className="btn btn-sm btn-outline-light"
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
                              <FaEdit /> Edit
                            </button>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => {
                                setSelectedEmployee(emp);
                                setExitStatus("Resigned");
                                setExitDate(new Date().toISOString().slice(0,10));
                                setExitReason("");
                                setShowDeleteModal(true);
                              }}
                            >
                              <FaTrash /> Deactivate
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>

                  {totalPages > 1 && (
                    <div className="pagination-area d-flex justify-content-between align-items-center mt-3">
                      <span className="text-muted small">
                        Showing {(currentPage - 1) * itemsPerPage + 1}–
                        {Math.min(currentPage * itemsPerPage, filtered.length)}{" "}
                        of {filtered.length}
                      </span>

                      <ul className="pagination mb-0">
                        {/* Previous */}
                        <li
                          className={`page-item ${
                            currentPage === 1 ? "disabled" : ""
                          }`}
                        >
                          <button
                            className="page-link"
                            onClick={() =>
                              setCurrentPage((p) => Math.max(p - 1, 1))
                            }
                          >
                            Prev
                          </button>
                        </li>

                        {/* Page Numbers */}
                        {[...Array(totalPages)].map((_, i) => (
                          <li
                            key={i}
                            className={`page-item ${
                              currentPage === i + 1 ? "active" : ""
                            }`}
                          >
                            <button
                              className="page-link"
                              onClick={() => setCurrentPage(i + 1)}
                            >
                              {i + 1}
                            </button>
                          </li>
                        ))}

                        {/* Next */}
                        <li
                          className={`page-item ${
                            currentPage === totalPages ? "disabled" : ""
                          }`}
                        >
                          <button
                            className="page-link"
                            onClick={() =>
                              setCurrentPage((p) => Math.min(p + 1, totalPages))
                            }
                          >
                            Next
                          </button>
                        </li>
                      </ul>
                    </div>
                  )}
                </table>
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

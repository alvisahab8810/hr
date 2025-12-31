import { toast } from "react-toastify";

import AddEmployeeForm from "@/components/admin/AddEmployeeForm";
import Dashnav from "@/components/Dashnav";
import Leftbar from "@/components/Leftbar";
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

  // Handle delete confirm
  const handleDelete = async () => {
    if (!selectedEmployee) return;
    try {
      const res = await fetch(`/api/employee/delete/${selectedEmployee._id}`, {
        method: "DELETE",
        credentials: "include", // ✅ IMPORTANT
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Employee deleted successfully");
        setEmployees(employees.filter((e) => e._id !== selectedEmployee._id));
      } else {
        toast.error(data.message || "Delete failed");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error deleting employee");
    } finally {
      setShowDeleteModal(false);
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
          <Leftbar />
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
                  {/* <button className="cancel-btn">
                    <img src="/icons/filter1.svg" alt="Filter Icon"></img>{" "}
                    Filter
                  </button> */}

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
                            {/* <Link
                              href={`/dashboard/employees/${emp._id}`}
                              className="btn btn-sm btn-outline-light"
                            >
                              <FaEye />
                            </Link> */}
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
                                setShowDeleteModal(true);
                              }}
                            >
                              <FaTrash /> Remove
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
        <div className="show-delete-modal">
          <div
            className="modal fade show d-block edit-employee-modal"
            tabIndex="-1"
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Delete Employee</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowDeleteModal(false)}
                  ></button>
                </div>

                <div className="modal-body">
                  <p className="mb-0">
                    Are you sure you want to delete{" "}
                    <strong>
                      {selectedEmployee?.personal?.firstName}{" "}
                      {selectedEmployee?.personal?.lastName}
                    </strong>
                    ?
                  </p>
                  <p className="text-muted mt-2 mb-0">
                    This action cannot be undone.
                  </p>
                </div>

                <div className="modal-footer">
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => setShowDeleteModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    type="button"
                    onClick={handleDelete}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

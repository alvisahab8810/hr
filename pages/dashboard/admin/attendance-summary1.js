import Dashnav from "@/components/Dashnav";
import Leftbar from "@/components/Leftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import MonthlyReportModal from "@/components/attenance/MonthlyReportModal";
import { useRouter } from "next/router";
export default function AttendanceDashboard() {
  const router = useRouter();
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  const [selectedEmployee, setSelectedEmployee] = useState(null);
  // const [selectedMonth, setSelectedMonth] = useState("2025-09"); // you can make this dynamic

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    const year = local.getFullYear();
    const month = String(local.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  });

  // Summary stats
  const totalEmployees = employees.length;
  const totalOnTime = employees.filter((e) => e.status === "On Time").length;
  const totalLate = employees.filter((e) => e.status === "Late").length;
  const totalMissingCheckout = employees.filter(
    (e) => e.status === "Missing Checkout"
  ).length;

  const [open, setOpen] = useState(false);

  const handleChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const resetFilters = () => {
    setFilters({ status: "", type: "", designation: "", date: "" });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/employee/attendance");
        const data = await res.json();
        setEmployees(data.employees || []);
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };
    fetchData();
  }, []);
  // ✅ define filters state here
  // ✅ define filters state here

  // ✅ Get today's date in YYYY-MM-DD format (local timezone)
  const getToday = () => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().split("T")[0];
  };

  // ✅ Default filter to today's date
  const [filters, setFilters] = useState({
    status: "",
    type: "",
    designation: "",
    date: getToday(), // ✅ only show today’s attendance initially
  });

  const filteredEmployees = employees
    // 🔍 Search
    .filter((emp) => emp?.name?.toLowerCase().includes(search.toLowerCase()))
    // 🎯 Status filter
    .filter((emp) => (filters.status ? emp?.status === filters.status : true))
    // 🏢 Type filter
    .filter((emp) => (filters.type ? emp?.type === filters.type : true))
    // 👔 Designation filter
    .filter((emp) =>
      filters.designation
        ? emp?.designation
            ?.toLowerCase()
            .includes(filters.designation.toLowerCase())
        : true
    )
    // 📅 Date filter (only if you add date in API)
    // .filter((emp) =>
    //   filters.date ? emp?.date === filters.date : true
    // )
    .filter((emp) =>
      filters.date ? emp?.attendanceDate === filters.date : true
    )

    // ⏰ Sort by earliest check-in
    .sort((a, b) => {
      if (!a?.checkInTime) return 1;
      if (!b?.checkInTime) return -1;
      return (
        new Date(`1970/01/01 ${a.checkInTime}`) -
        new Date(`1970/01/01 ${b.checkInTime}`)
      );
    });

  const indexOfLast = currentPage * recordsPerPage;
  const indexOfFirst = indexOfLast - recordsPerPage;
  const currentRecords = filteredEmployees.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredEmployees.length / recordsPerPage);

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
      <div className="dashboard-container add-employee-area">
        <div className="main-nav">
          <Leftbar />
          <LeftbarMobile />
          <Dashnav />

          <section className="content home">
            <div className="breadcrum-bx">
              <ul className="breadcrumb  bg-white">
                <li className="breadcrumb-item">
                  <Link href="/dashboard/dashboard">
                    <img src="/icons/home.svg"></img> Attendance Summary
                  </Link>
                </li>
              </ul>
            </div>
            <div className="block-header add-emp-area">
              {/* Summary Cards */}
              <div className="summary-cards mb-4">
                <div className="card total">
                  <h5>Total Employees</h5>
                  <p>{totalEmployees}</p>
                </div>
                <div className="card on-time">
                  <h5>On Time</h5>
                  <p>{totalOnTime}</p>
                </div>
                <div className="card late">
                  <h5>Late</h5>
                  <p>{totalLate}</p>
                </div>
                <div className="card missing">
                  <h5>Missing Checkout</h5>
                  <p>{totalMissingCheckout}</p>
                </div>
              </div>

              {/* Search + Filter */}
              <div className="header search-bar-bx mb-4 mt-4">
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

                {/*                 
                <input
                  type="text"
                  placeholder="Search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                /> */}
                <button className="cancel-btn" onClick={() => setOpen(true)}>
                  <img src="/icons/filter.png" width="20" alt="Filter Icon" />{" "}
                  Filter
                </button>

                {open && (
                  <div className="filter-drawer">
                    <div className="filter-header">
                      <h4>Filters</h4>
                      <button
                        className="close-btn"
                        onClick={() => setOpen(false)}
                      >
                        ✕
                      </button>
                    </div>

                    <div className="filter-body">
                      {/* Date */}
                      <label>Date</label>
                      <input
                        type="date"
                        value={filters.date}
                        onChange={(e) => handleChange("date", e.target.value)}
                      />

                      {/* Status */}
                      <label>Status</label>
                      <select
                        value={filters.status}
                        onChange={(e) => handleChange("status", e.target.value)}
                      >
                        <option value="">All</option>
                        <option value="On Time">On Time</option>
                        <option value="Late">Late</option>
                        <option value="On Break">On Break</option>
                        <option value="Missing Checkout">
                          Missing Checkout
                        </option>
                        <option value="Clocked Out">Clocked Out</option>
                        <option value="Not Clocked In">Not Clocked In</option>
                      </select>

                      {/* Employee Type */}
                      <label>Employee Type</label>
                      <select
                        value={filters.type}
                        onChange={(e) => handleChange("type", e.target.value)}
                      >
                        <option value="">All</option>
                        <option value="Office">Office</option>
                        <option value="Remote">Remote</option>
                        <option value="Contract">Contract</option>
                      </select>

                      {/* Designation */}
                      <label>Designation</label>
                      <input
                        type="text"
                        value={filters.designation}
                        onChange={(e) =>
                          handleChange("designation", e.target.value)
                        }
                        placeholder="e.g. Developer"
                      />
                    </div>

                    <div className="filter-footer">
                      <button className="reset-btn" onClick={resetFilters}>
                        Reset
                      </button>
                      <button
                        className="apply-btn"
                        onClick={() => setOpen(false)}
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Table */}
              <table className="attendance-table table table-hover align-middle ">
                <thead>
                  <tr>
                    <th>Employee Name</th>
                    <th>Designation</th>
                    <th>Type</th>
                    <th>Check In Time</th>
                    <th>Clock Out Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {currentRecords.map((emp, idx) => {
                    // 🧩 Normalize status for better UX
                    let displayStatus = emp.status;

                    // 🛠️ Remove temporary "On Break" state
                    if (emp.status === "On Break") {
                      // If they have clocked in but no checkout → “On Duty”
                      if (emp.checkInTime && !emp.clockOutTime) {
                        displayStatus = "On Duty";
                      } else if (!emp.checkInTime) {
                        displayStatus = "Not Clocked In";
                      } else {
                        displayStatus = "Clocked Out";
                      }
                    }

                    return (
                      <tr
                        key={idx}
                        onClick={() =>
                          router.push(`/dashboard/admin/attendance/${emp.id}`)
                        }
                        style={{ cursor: "pointer" }}
                      >
                        <td>
                          <div className="emp-info">
                            {emp.avatar ? (
                              <img
                                src={emp.avatar}
                                alt={emp.name}
                                className="avatar"
                              />
                            ) : (
                              <div className="avatar initials">
                                {emp.name?.[0] || "?"}
                              </div>
                            )}
                            <span>{emp.name}</span>
                          </div>
                        </td>
                        <td>{emp.designation}</td>
                        <td>{emp.type}</td>
                        <td>{emp.checkInTime || "--"}</td>
                        <td>{emp.clockOutTime || "--"}</td>

                        <td>
                          <span
                            className={`status ${displayStatus
                              .replace(/\s+/g, "-")
                              .toLowerCase()}`}
                          >
                            {displayStatus}
                          </span>
                        </td>

                        {/* <td>
          <button
            onClick={() => setSelectedEmployee(emp.id)}
            className="btn btn-sm btn-outline-primary"
          >
            View Monthly
          </button>
        </td> */}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="pagination">
                <span>
                  Showing {indexOfFirst + 1} to{" "}
                  {Math.min(indexOfLast, filteredEmployees.length)} of{" "}
                  {filteredEmployees.length} records
                </span>
                <div className="pages">
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i}
                      className={currentPage === i + 1 ? "active" : ""}
                      onClick={() => setCurrentPage(i + 1)}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              </div>

              <style jsx>{`
                .dashboard-container {
                  // background: #000;
                  // color: #fff;
                  padding: 20px;
                  border-radius: 12px;
                }
                .header {
                  display: flex;
                  justify-content: space-between;
                  margin-bottom: 15px;
                }
                input {
                  // padding: 8px 12px;
                  // border-radius: 6px;
                  // border: 1px solid #444;
                  // background: #ffffffff;
                  // color: #fff;
                }
                .filter-btn {
                  padding: 8px 12px;
                  border: 1px solid #444;
                  border-radius: 6px;
                  background: #5a3fd8;
                  color: #fff;
                  cursor: pointer;
                }
                .attendance/-table {
                  width: 100%;
                  border-collapse: collapse;
                }
                .attendance-table th,
                .attendance-table td {
                  padding: 12px;
                  text-align: left;
                  // border-bottom: 1px solid #222;
                }
                .emp-info {
                  display: flex;
                  align-items: center;
                  gap: 10px;
                }
                .avatar {
                  width: 32px;
                  height: 32px;
                  border-radius: 50%;
                  object-fit: cover;
                }
                .avatar.initials {
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  background: #5a3fd8;
                  color: #fff;
                  font-size: 14px;
                  font-weight: bold;
                }
                // .status {
                //   display: inline-block;
                //   // width: 16px;
                //   // height: 16px;
                //   border-radius: 50%;
                // }
                // .status.green {
                //   background: #28a745;
                // }
                // .status.red {
                //   background: #dc3545;
                // // }
                // .status.yellow {
                //   background: #ffc107;
                // }
                .pagination {
                  margin-top: 15px;
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                }
                .pages button {
                  margin: 0 3px;
                  padding: 5px 10px;
                  border: 1px solid #5a3fd8;
                  background: none;
                  color: #000000ff;
                  border-radius: 4px;
                  cursor: pointer;
                }
                .pages .active {
                  background: #5a3fd8;
                  color: #fff;
                }

                .status {
                  padding: 4px 10px;
                  border-radius: 4px;
                  font-size: 12px;
                  font-weight: 500;
                  display: inline-block;
                }

                /* On Time */
                .status.on-time {
                  background: rgba(63, 194, 138, 0.1); /* 10% of #3FC28A */
                  color: #3fc28a;
                }

                /* Late */
                .status.late {
                  background: rgba(244, 91, 105, 0.1); /* 10% of #F45B69 */
                  color: #f45b69;
                }

                /* On Break */
                .status.on-break {
                  background: rgba(255, 193, 7, 0.1); /* 10% of yellow */
                  color: #ffc107;
                }

                /* Clocked Out */
                .status.clocked-out {
                  background: rgba(108, 117, 125, 0.1); /* 10% of gray */
                  color: #6c757d;
                }

                /* Not Clocked In */
                .status.not-clocked-in {
                  background: rgba(153, 153, 153, 0.1); /* 10% of light gray */
                  color: #999999;
                }

                .filter-drawer {
                  position: fixed;
                  top: 0;
                  right: 0;
                  width: 300px;
                  height: 100%;
                  background: #fff;
                  border-left: 1px solid #ddd;
                  box-shadow: -2px 0 6px rgba(0, 0, 0, 0.1);
                  padding: 20px;
                  display: flex;
                  flex-direction: column;
                  z-index: 999;
                  padding-top: 50px !important;
                }

                .filter-drawer .close-btn {
                  height: 28px;
                  background: #5a3fd8;
                  width: 28px;
                  border: none;
                  color: #fff;
                  border-radius: 50px;
                }
                .filter-header {
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  margin-bottom: 20px;
                }
                .filter-body {
                  flex: 1;
                  display: flex;
                  flex-direction: column;
                  gap: 15px;
                }
                .filter-body label {
                  font-weight: 500;
                  font-size: 14px;
                  margin-bottom: 5px;
                }
                .filter-body select,
                .filter-body input {
                  padding: 8px;
                  border: 1px solid #ccc;
                  border-radius: 6px;
                }
                .filter-footer {
                  display: flex;
                  justify-content: space-between;
                }
                .reset-btn {
                  background: #f1f1f1;
                  border: none;
                  padding: 8px 12px;
                  border-radius: 6px;
                  cursor: pointer;
                }
                .apply-btn {
                  background: #5a3fd8;
                  border: none;
                  color: #fff;
                  padding: 8px 12px;
                  border-radius: 6px;
                  cursor: pointer;
                }

                .summary-cards {
                  display: grid;
                  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                  gap: 15px;
                  margin-bottom: 20px;
                }

                .summary-cards .card {
                  padding: 15px;
                  border-radius: 12px;
                  color: #fff;
                  text-align: center;
                  font-weight: 500;
                  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
                }

                .summary-cards .card h5 {
                  margin: 0 0 8px;
                  font-size: 16px;
                  font-weight: bold;
                }

                .summary-cards .card p {
                  margin: 0;
                  font-size: 22px;
                  font-weight: bold;
                }

                /* Colors */
                .summary-cards .card.total {
                  background: #5a3fd8; /* purple */
                }

                .summary-cards .card.on-time {
                  background: #3fc28a; /* green */
                }

                .summary-cards .card.late {
                  background: #f45b69; /* red */
                }

                .summary-cards .card.missing {
                  background: #ffc107; /* yellow */
                  color: #000; /* better contrast */
                }
              `}</style>
            </div>
          </section>
        </div>
      </div>
      {/* {selectedEmployee && (
        <MonthlyReportModal
          employeeId={selectedEmployee}
          month={selectedMonth}
          onClose={() => setSelectedEmployee(null)}
        />
      )} */}
    </div>
  );
}

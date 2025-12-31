import Dashnav from "@/components/Dashnav";
import Leftbar from "@/components/Leftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import Head from "next/head";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "react-toastify";

import * as XLSX from "xlsx";

export default function SalaryReport() {
  const [salaries, setSalaries] = useState([]);
  const [loading, setLoading] = useState(false);

  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());

  const fetchSalaries = async () => {
    const res = await fetch(
      `/api/admin/salary/list?month=${month}&year=${year}`
    );
    const data = await res.json();

    if (data.success) {
      setSalaries(data.data);
    }
  };

  const handleGenerate = async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/admin/salary/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year }),
      });

      const data = await res.json();

      if (!data.success) {
        toast.error("Salary generation failed");
        return;
      }

      await fetchSalaries(); // ✅ IMPORTANT
      toast.success("Salary generated successfully");
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalaries();
  }, []);

  const handleProcess = async (id) => {
    await fetch("/api/admin/salary/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    setSalaries((prev) =>
      prev.map((s) => (s._id === id ? { ...s, status: "Processed" } : s))
    );

    toast.success("Salary processed");
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      salaries.map((s) => ({
        PayrollID: s.payrollId,
        Employee: s.employee?.personal?.firstName
          ? `${s.employee.personal.firstName} ${
              s.employee.personal.lastName || ""
            }`
          : `${s.employee?.firstName || ""} ${s.employee?.lastName || ""}`,

        Department: s.employee?.professional?.department || "-",

        BasicSalary: s.basicSalary,

        LateDeduction: s.deductions?.late || 0,
        UnpaidLeaveDeduction: s.deductions?.unpaidLeave || 0,
        OtherDeduction: s.deductions?.other || 0,
        TotalDeduction: s.deductions?.total || 0,

        ReimPending: s.reimbursement?.pending || 0,
        ReimApproved: s.reimbursement?.approved || 0,
        ReimPaid: s.reimbursement?.paid || 0,

        NetPay: s.netPay,
        Status: s.status,
      }))
    );

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Salary Report");
    XLSX.writeFile(wb, `salary_${month + 1}_${year}.xlsx`);
  };

  return (
    <div className="leaves-management-admin">
      <Head>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
      </Head>

      <div className="add-employee-area">
        <div className="main-nav">
          <Leftbar />
          <LeftbarMobile />
          <Dashnav />

          <section className="content home admin-attendance-summary">
            <div className="breadcrum-bx">
              <ul className="breadcrumb bg-white">
                <li className="breadcrumb-item">
                  <Link href="/dashboard/dashboard">Salary Report</Link>
                </li>
              </ul>
            </div>

            <div className="block-header add-emp-area">
              <h5 className="admin-main-heading">Salary Report</h5>

              <div className="salary-filter-bar">
                <select
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                >
                  {Array.from({ length: 12 }).map((_, i) => (
                    <option key={i} value={i}>
                      {new Date(0, i).toLocaleString("default", {
                        month: "long",
                      })}
                    </option>
                  ))}
                </select>

                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                >
                  {[year - 1, year, year + 1].map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>

                <button className="btn btn-primary" onClick={handleGenerate}>
                  Generate Salary
                </button>

                <button className="btn btn-secondary" onClick={exportExcel}>
                  Export Excel
                </button>
              </div>

              {/* Table comes next */}

              <div className="admin-reim-root">
                <table className="admin-reim-table">
                  <thead>
                    <tr>
                      <th>Emp. ID</th>
                      <th>Employee</th>
                      <th>Department</th>

                      <th>Basic Salary</th>
                      <th>Late Deduction</th>
                      <th>Unpaid Leave</th>
                      <th>Other Deduction</th>
                      <th>Total Deduction</th>

                      <th>Pending Reimbursement</th>

                      <th>Net Pay</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="10">Loading...</td>
                      </tr>
                    ) : salaries.length === 0 ? (
                      <tr>
                        <td colSpan="10">No salary records</td>
                      </tr>
                    ) : (
                      salaries.map((s) => (
                        <tr key={s._id}>
                          <td>{s.payrollId}</td>

                          <td>
                            {s.employee?.personal?.firstName
                              ? `${s.employee.personal.firstName} ${
                                  s.employee.personal.lastName || ""
                                }`
                              : s.employee?.firstName
                              ? `${s.employee.firstName} ${
                                  s.employee.lastName || ""
                                }`
                              : "-"}
                          </td>

                          <td>{s.employee?.professional?.department || "-"}</td>

                          <td>₹ {s.basicSalary}</td>

                          <td className="text-danger">
                            ₹ {s.deductions?.late || 0}
                          </td>
                          <td className="text-danger">
                            ₹ {s.deductions?.unpaidLeave || 0}
                          </td>
                          <td className="text-danger">
                            ₹ {s.deductions?.other || 0}
                          </td>

                          <td className="text-danger fw-bold">
                            ₹ {s.deductions?.total || 0}
                          </td>

                          {/* ONLY PENDING REIMBURSEMENT */}
                          <td className="text-warning fw-bold">
                            ₹ {s.reimbursement?.pending || 0}
                          </td>

                          {/* NET PAY (includes pending reimbursement) */}
                          <td className="fw-bold text-success">₹ {s.netPay}</td>

                          <td>
                            <span
                              className={`status-pill ${
                                s.status === "Processed" ? "approved" : ""
                              }`}
                            >
                              {s.status}
                            </span>
                          </td>

                          <td>
                            {s.status === "Pending" && (
                              <button
                                className="btn-approve"
                                onClick={() => handleProcess(s._id)}
                              >
                                Process
                              </button>
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
      </div>
    </div>
  );
}

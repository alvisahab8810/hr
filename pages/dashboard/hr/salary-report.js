import { useEffect, useState } from "react";
import Head from "next/head";
import Dashnav from "@/components/Dashnav";
import Leftbar from "@/components/Leftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
// Utility to format currency
const formatCurrency = (amount) =>
  `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

export default function SalaryReport() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/payroll/monthly-data");
        if (!res.ok) {
          throw new Error("Failed to fetch monthly data");
        }
        const data = await res.json();
        setEmployees(data);
      } catch (error) {
        console.error("Error fetching monthly payroll data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="container mt-5">
        <h4>Loading Salary Report...</h4>
      </div>
    );
  }

  return (
    <div>
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
            <div className="container-salary ">
              {/* Header */}
              <div className="main-row-bx1 mt-3 d-flex justify-content-between align-items-center mb-4">
                <h2 className="fw-bold text-white">Monthly Salary Report</h2>
                <button
                  className="btn bg-white text-dark fw-bold "
                  onClick={() => window.print()}
                >
                  <i className="bi bi-printer me-2"></i> Print Report
                </button>
              </div>

              {/* Salary Table */}
              {employees.length === 0 ? (
                <div className="text-center text-muted">
                  <p>No salary data available for this month.</p>
                </div>
              ) : (
                <div className="table-responsive shadow-sm rounded">
                  <table className="table table-bordered table-hover align-middle text-nowrap">
                    <thead className="table-light">
                      <tr>
                        <th>Employee</th>
                        <th>Base Salary</th>
                        <th>Late Marks</th>
                        <th>Late Penalty</th>
                        <th>Lunch Penalty</th>
                        <th>LOP Days</th>
                        <th>Half-Days</th>
                        <th>Total Deduction</th>
                        <th>Net Payable</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map((emp) => {
                        const {
                          fullName,
                          salary,
                          lateMarks,
                          lunchPenalty,
                          lopDays,
                          halfDays,
                          totalDeduction,
                          netPayable,
                        } = emp;

                        return (
                          <tr key={emp.employeeId}>
                            <td>
                              <strong>{fullName}</strong>
                              <br />
                              <small className="text-muted">
                                {emp.employeeId}
                              </small>
                            </td>
                            <td>{formatCurrency(salary)}</td>
                            <td>
                              {lateMarks} {lateMarks > 0 ? "days" : ""}
                            </td>

                            <td>{formatCurrency(emp.latePenalty || 0)}</td>
                            <td>{formatCurrency(lunchPenalty || 0)}</td>
                            <td>{lopDays}</td>
                            <td>{halfDays}</td>
                            <td className="text-danger fw-semibold">
                              {formatCurrency(totalDeduction)}
                            </td>
                            <td className="text-success fw-bold">
                              {formatCurrency(netPayable)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

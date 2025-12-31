"use client";

import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import Dashnav from "../../../../components/Dashnav";
import Leftbar from "../../../../components/Leftbar";
import LeftbarMobile from "@/components/LeftbarMobile";

export default function EmployeeList() {
  const [employees, setEmployees] = useState([]);


  const handleInvite = async (emp) => {
  const res = await fetch("/api/payroll/invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: emp.email, employeeId: emp._id }),
  });

  const data = await res.json();
  if (data.success) {
    alert(`Invitation sent to ${emp.email}`);
  } else {
    alert(`Failed to send invitation: ${data.message}`);
  }
};


  useEffect(() => {
    const fetchEmployees = async () => {
      const res = await fetch("/api/payroll/employees");
      const data = await res.json();
      if (data.success) {
        setEmployees(data.employees);
      }
    };
    fetchEmployees();
  }, []);

  return (
    <div className="career-response add-employee">
      <Head>
        <link rel="stylesheet" href="/asets/css/bootstrap.min.css" />
        <link rel="stylesheet" href="/asets/css/main.css" />
        <link rel="stylesheet" href="/asets/css/admin.css" />
      </Head>

      <div className="main-nav">
        <Dashnav />
        <Leftbar />
        <LeftbarMobile/>

        <section className="content home">
          <div className="block-header">
            <div className="row ptb-50 main-row-bx1 mt-3">
              <div className="col-lg-7 col-md-6 col-sm-12">
                <h2>
                  Employee List<br/>
                  <small className="text-white">Welcome to Viralon </small>
                </h2>
              </div>
              <div className="col-lg-5 col-md-6 col-sm-12">
                <ul className="breadcrumb float-md-right">
                  <li className="breadcrumb-item">
                    <Link href="/dashboard/dashboard">
                      <i className="zmdi zmdi-home"></i> Viralon 
                    </Link>
                  </li>
                  <li className="breadcrumb-item active">Employee List</li>
                </ul>
              </div>
            </div>
            <div className="container-emp">
              <div className="table-responsive">
                <table className="table table-bordered align-middle text-nowrap"
                style={{ width: "100%" }}
                >
                  <thead className="table-light">
                    <tr>
                      <th>Employee ID</th>
                      <th>Name</th>
                      <th>Department</th>
                      <th>Designation</th>
                      <th>Joining Date</th>
                      <th>Email</th>
                      <th>Mobile</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp) => (
                      <tr key={emp._id}>
                        <td>{emp.employeeId}</td>
                        <td>
                          {emp.firstName} {emp.lastName}
                        </td>
                        <td>{emp.department}</td>
                        <td>{emp.designation}</td>
                        <td>
                          {new Date(emp.joiningDate).toLocaleDateString()}
                        </td>
                        <td>{emp.email}</td>
                        <td>{emp.mobile}</td>

                        <td>
                          <Link
                            href={`/dashboard/payroll/employees/${emp._id}`}
                            className="btn btn-sm  me-2"
                          >
                            View Profile
                          </Link>
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => handleInvite(emp)}
                          >
                            Invite
                          </button>
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

// import { useEffect, useState } from "react";

// export default function SalarySlips() {
//   const [slips, setSlips] = useState([]);
//   const [loading, setLoading] = useState(false);

//   // Fields for Generate Slip
//   const [employees, setEmployees] = useState([]);
//   const [employeeId, setEmployeeId] = useState("");
//   const [month, setMonth] = useState("");
//   const [basicPay, setBasicPay] = useState(0);
//   const [allowances, setAllowances] = useState(0);
//   const [deductions, setDeductions] = useState(0);

//   useEffect(() => {
//     fetchSlips();
//     fetchEmployees();
//   }, []);

//   const fetchSlips = async () => {
//     try {
//       setLoading(true);
//       const res = await fetch("/api/payroll/salary-slip/list");
//       const data = await res.json();
//       if (data.success) setSlips(data.slips);
//     } catch (err) {
//       console.error("Error fetching slips:", err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const fetchEmployees = async () => {
//     try {
//       const res = await fetch("/api/payroll/employees");
//       const data = await res.json();
//       if (data.success) setEmployees(data.employees);
//     } catch (err) {
//       console.error("Error fetching employees:", err);
//     }
//   };

//   const downloadPDF = async (slipId) => {
//     try {
//       const res = await fetch("/api/payroll/salary-slip/generate-pdf", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ slipId }),
//       });
//       const data = await res.json();
//       if (data.success) {
//         window.open(data.pdfUrl, "_blank");
//       }
//     } catch (error) {
//       console.error("PDF Error:", error);
//     }
//   };

//   const sendEmail = async (email, pdfUrl) => {
//     try {
//       const res = await fetch("/api/payroll/salary-slip/email", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ email, pdfUrl }),
//       });
//       const data = await res.json();
//       alert(data.message);
//     } catch (error) {
//       console.error("Email Error:", error);
//     }
//   };

//   const createSalarySlip = async () => {
//     if (!employeeId || !month) {
//       alert("Please select employee and month");
//       return;
//     }
//     try {
//       const res = await fetch("/api/payroll/salary-slip/create", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           employeeId,
//           month,
//           basicPay,
//           allowances,
//           deductions,
//         }),
//       });
//       const data = await res.json();
//       if (data.success) {
//         alert("Salary Slip Created");
//         fetchSlips();
//         document.getElementById("salarySlipForm").reset();
//         setBasicPay(0);
//         setAllowances(0);
//         setDeductions(0);
//         setEmployeeId("");
//         setMonth("");
//       }
//     } catch (err) {
//       console.error("Error creating slip:", err);
//     }
//   };

//   return (
//     <div className="container mt-4">
//       <div className="d-flex justify-content-between align-items-center mb-3">
//         <h4>Salary Slips</h4>
//         <button
//           className="btn btn-primary"
//           data-bs-toggle="modal"
//           data-bs-target="#generateSlipModal"
//         >
//           + Generate Salary Slip
//         </button>
//       </div>

//       {loading ? (
//         <p>Loading...</p>
//       ) : (
//         <div className="table-responsive">
//           <table className="table table-hover align-middle">
//             <thead>
//               <tr>
//                 <th>Employee</th>
//                 <th>Month</th>
//                 <th>Net Pay</th>
//                 <th>Actions</th>
//               </tr>
//             </thead>
//             <tbody>
//               {slips.length === 0 ? (
//                 <tr>
//                   <td colSpan="4" className="text-center">
//                     No salary slips found
//                   </td>
//                 </tr>
//               ) : (
//                 slips.map((slip) => (
//                   <tr key={slip._id}>
//                     <td>{slip.employeeName}</td>
//                     <td>{slip.month}</td>
//                     <td>₹{slip.netPay}</td>
//                     <td>
//                       <button
//                         className="btn btn-sm btn-outline-primary me-2"
//                         onClick={() => downloadPDF(slip._id)}
//                       >
//                         Download PDF
//                       </button>
//                       <button
//                         className="btn btn-sm btn-outline-success"
//                         onClick={() =>
//                           sendEmail(slip.email, slip.pdfUrl || "")
//                         }
//                       >
//                         Send Email
//                       </button>
//                     </td>
//                   </tr>
//                 ))
//               )}
//             </tbody>
//           </table>
//         </div>
//       )}

//       {/* ✅ Generate Salary Slip Modal */}
//       <div className="modal fade" id="generateSlipModal" tabIndex="-1">
//         <div className="modal-dialog modal-lg">
//           <div className="modal-content">
//             <div className="modal-header">
//               <h5 className="modal-title">Generate Salary Slip</h5>
//               <button
//                 type="button"
//                 className="btn-close"
//                 data-bs-dismiss="modal"
//               ></button>
//             </div>
//             <div className="modal-body">
//               <form id="salarySlipForm">
//                 <div className="row mb-3">
//                   <div className="col-md-6">
//                     <label className="form-label">Employee</label>
//                     <select
//                       className="form-select"
//                       onChange={(e) => setEmployeeId(e.target.value)}
//                     >
//                       <option value="">Select Employee</option>
//                       {employees.map((emp) => (
//                         <option key={emp._id} value={emp._id}>
//                           {emp.firstName} {emp.lastName}
//                         </option>
//                       ))}
//                     </select>
//                   </div>
//                   <div className="col-md-6">
//                     <label className="form-label">Month</label>
//                     <input
//                       type="month"
//                       className="form-control"
//                       onChange={(e) => setMonth(e.target.value)}
//                     />
//                   </div>
//                 </div>

//                 <div className="row mb-3">
//                   <div className="col-md-4">
//                     <label className="form-label">Basic Pay</label>
//                     <input
//                       type="number"
//                       className="form-control"
//                       onChange={(e) => setBasicPay(Number(e.target.value))}
//                     />
//                   </div>
//                   <div className="col-md-4">
//                     <label className="form-label">Allowances</label>
//                     <input
//                       type="number"
//                       className="form-control"
//                       onChange={(e) => setAllowances(Number(e.target.value))}
//                     />
//                   </div>
//                   <div className="col-md-4">
//                     <label className="form-label">Deductions</label>
//                     <input
//                       type="number"
//                       className="form-control"
//                       onChange={(e) => setDeductions(Number(e.target.value))}
//                     />
//                   </div>
//                 </div>

//                 <div className="mb-3">
//                   <label className="form-label fw-bold">
//                     Net Pay: ₹{basicPay + allowances - deductions}
//                   </label>
//                 </div>
//               </form>
//             </div>
//             <div className="modal-footer">
//               <button
//                 className="btn btn-secondary"
//                 data-bs-dismiss="modal"
//               >
//                 Cancel
//               </button>
//               <button
//                 className="btn btn-primary"
//                 onClick={createSalarySlip}
//               >
//                 Generate
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }



import { useEffect, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function SalarySlips() {
  const [slips, setSlips] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fields for Generate Slip
  const [employees, setEmployees] = useState([]);
  const [employeeId, setEmployeeId] = useState("");
  const [month, setMonth] = useState("");
  const [basicPay, setBasicPay] = useState(0);
  const [allowances, setAllowances] = useState(0);
  const [deductions, setDeductions] = useState(0);

  useEffect(() => {
    fetchSlips();
    fetchEmployees();
  }, []);

  const fetchSlips = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/payroll/salary-slip/list");
      const data = await res.json();
      if (data.success) setSlips(data.slips);
    } catch (err) {
      toast.error("Error fetching salary slips.");
      console.error("Error fetching slips:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch("/api/payroll/employees");
      const data = await res.json();
      if (data.success) setEmployees(data.employees);
    } catch (err) {
      toast.error("Error fetching employees.");
      console.error("Error fetching employees:", err);
    }
  };

  const downloadPDF = async (slipId) => {
    try {
      const res = await fetch("/api/payroll/salary-slip/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slipId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("PDF generated successfully!");
        window.open(data.pdfUrl, "_blank");
      } else {
        toast.error(data.message || "Failed to generate PDF");
      }
    } catch (error) {
      toast.error("Error generating PDF.");
      console.error("PDF Error:", error);
    }
  };

const sendEmail = async (slipId, email) => {
  try {
    // 1️⃣ Generate PDF first
    const pdfRes = await fetch("/api/payroll/salary-slip/generate-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slipId }),
    });
    const pdfData = await pdfRes.json();

    if (!pdfData.success) {
      toast.error("Failed to generate PDF.");
      return;
    }

    // 2️⃣ Send email with PDF URL
    const emailRes = await fetch("/api/payroll/salary-slip/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        pdfUrl: pdfData.pdfUrl, // use generated PDF URL
      }),
    });

    const emailData = await emailRes.json();
    if (emailData.success) {
      toast.success("Email sent successfully!");
    } else {
      toast.error(emailData.message || "Failed to send email.");
    }
  } catch (error) {
    console.error("Email Error:", error);
    toast.error("Error sending email.");
  }
};


  const createSalarySlip = async () => {
    if (!employeeId || !month) {
      toast.warn("Please select employee and month.");
      return;
    }
    try {
      const res = await fetch("/api/payroll/salary-slip/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          month,
          basicPay,
          allowances,
          deductions,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Salary slip created successfully!");
        fetchSlips();
        document.getElementById("salarySlipForm").reset();
        setBasicPay(0);
        setAllowances(0);
        setDeductions(0);
        setEmployeeId("");
        setMonth("");
      } else {
        toast.error(data.message || "Failed to create salary slip");
      }
    } catch (err) {
      toast.error("Error creating salary slip.");
      console.error("Error creating slip:", err);
    }
  };

  return (
    <div className="container mt-4">
      {/* ✅ Toast Container */}
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4>Salary Slips</h4>
        <button
          className="btn btn-primary"
          data-bs-toggle="modal"
          data-bs-target="#generateSlipModal"
        >
          + Generate Salary Slip
        </button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Month</th>
                <th>Net Pay</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {slips.length === 0 ? (
                <tr>
                  <td colSpan="4" className="text-center">
                    No salary slips found
                  </td>
                </tr>
              ) : (
                slips.map((slip) => (
                  <tr key={slip._id}>
                    <td>{slip.employeeName}</td>
                    <td>{slip.month}</td>
                    <td>₹{slip.netPay}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline-primary me-2"
                        onClick={() => downloadPDF(slip._id)}
                      >
                        Download PDF
                      </button>
                     <button
  className="btn btn-sm btn-outline-success"
  onClick={() => sendEmail(slip._id, slip.email)}
>
  Send Email
</button>

                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ✅ Generate Salary Slip Modal */}
      <div className="modal fade" id="generateSlipModal" tabIndex="-1">
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Generate Salary Slip</h5>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
              ></button>
            </div>
            <div className="modal-body">
              <form id="salarySlipForm">
                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label">Employee</label>
                    <select
                      className="form-select"
                      onChange={(e) => setEmployeeId(e.target.value)}
                    >
                      <option value="">Select Employee</option>
                      {employees.map((emp) => (
                        <option key={emp._id} value={emp._id}>
                          {emp.firstName} {emp.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Month</label>
                    <input
                      type="month"
                      className="form-control"
                      onChange={(e) => setMonth(e.target.value)}
                    />
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-md-4">
                    <label className="form-label">Basic Pay</label>
                    <input
                      type="number"
                      className="form-control"
                      onChange={(e) => setBasicPay(Number(e.target.value))}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Allowances</label>
                    <input
                      type="number"
                      className="form-control"
                      onChange={(e) => setAllowances(Number(e.target.value))}
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Deductions</label>
                    <input
                      type="number"
                      className="form-control"
                      onChange={(e) => setDeductions(Number(e.target.value))}
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-bold">
                    Net Pay: ₹{basicPay + allowances - deductions}
                  </label>
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" data-bs-dismiss="modal">
                Cancel
              </button>
              <button className="btn btn-primary" onClick={createSalarySlip}>
                Generate
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

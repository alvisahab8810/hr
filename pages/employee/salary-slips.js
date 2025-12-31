import { useEffect, useState } from "react";

export default function MySalarySlips() {
  const [slips, setSlips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSlips();
  }, []);

  const fetchSlips = async () => {
    try {
      const res = await fetch("/api/payroll/employees/salary-slip/list");
      const data = await res.json();
      if (data.success) {
        setSlips(data.slips);
      }
    } catch (err) {
      console.error("Error fetching slips:", err);
    } finally {
      setLoading(false);
    }
  };

  const downloadSlip = async (slipId) => {
    try {
      const res = await fetch("/api/payroll/salary-slip/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slipId }),
      });
      const data = await res.json();
      if (data.success) {
        window.open(data.pdfUrl, "_blank");
      }
    } catch (err) {
      console.error("Download error:", err);
    }
  };

  return (
    <div className="container mt-4">
      <h4 className="mb-4">My Salary Slips</h4>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table className="table table-striped">
          <thead>
            <tr>
              <th>Month</th>
              <th>Year</th>
              <th>Net Pay</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {slips.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center">No salary slips found</td>
              </tr>
            ) : (
              slips.map((slip) => (
                <tr key={slip._id}>
                  <td>{slip.month}</td>
                  <td>{slip.year}</td>
                  <td>₹{slip.netPay}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => downloadSlip(slip._id)}
                    >
                      Download PDF
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

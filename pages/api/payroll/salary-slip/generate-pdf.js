import dbConnect from "@/utils/dbConnect";
import SalarySlip from "@/models/payroll/SalarySlip";
import Employee from "@/models/payroll/Employee";
import puppeteer from "puppeteer";
import path from "path";
import fs from "fs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  await dbConnect();

  try {
    const { slipId } = req.body;
    if (!slipId) return res.status(400).json({ success: false, message: "Slip ID is required" });

    const slip = await SalarySlip.findById(slipId);
    if (!slip) return res.status(404).json({ success: false, message: "Salary slip not found" });

    const employee = await Employee.findById(slip.employeeId);
    if (!employee) return res.status(404).json({ success: false, message: "Employee not found" });

    // ✅ HTML template for PDF
  const html = `
<html>
  <head>
    <style>
      body {
        font-family: 'Segoe UI', Tahoma, sans-serif;
        padding: 20px;
        color: #333;
      }
      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 2px solid #007bff;
        padding-bottom: 10px;
      }
      .header img {
        max-height: 50px;
      }
      .company-details {
        text-align: right;
        font-size: 14px;
      }
      h2 {
        text-align: center;
        color: #007bff;
        margin: 20px 0;
      }
      .details {
        margin: 15px 0;
        font-size: 14px;
      }
      .details p {
        margin: 4px 0;
      }
      .pay-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 20px;
      }
      .pay-table th, .pay-table td {
        border: 1px solid #ddd;
        padding: 10px;
        font-size: 14px;
      }
      .pay-table th {
        background-color: #007bff;
        color: white;
        text-align: left;
      }
      .footer {
        margin-top: 30px;
        text-align: center;
        font-size: 12px;
        color: gray;
      }
      .net-pay {
        text-align: right;
        font-weight: bold;
        font-size: 16px;
        margin-top: 15px;
      }
    </style>
  </head>
  <body>
    <div class="header">
      <div>
        <img src="https://viralon.in/themes/viralon/images/logo.png" alt="Company Logo" />
      </div>
      <div class="company-details">
        <strong>Viralon Pvt Ltd</strong><br/>
        Payroll Department<br/>
        support@viralon.in
      </div>
    </div>
    <h2>Salary Slip - ${slip.month} ${slip.year}</h2>

    <div class="details">
      <p><strong>Employee Name:</strong> ${employee.firstName} ${employee.lastName}</p>
      <p><strong>Employee ID:</strong> ${employee.employeeId || "-"}</p>
      <p><strong>Department:</strong> ${employee.department || "-"}</p>
      <p><strong>Date of Joining:</strong> ${employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString() : "-"}</p>
    </div>

    <table class="pay-table">
      <thead>
        <tr>
          <th>Earnings</th>
          <th>Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Basic Pay</td>
          <td>${slip.basicPay.toFixed(2)}</td>
        </tr>
        <tr>
          <td>HRA</td>
          <td>${slip.hra.toFixed(2)}</td>
        </tr>
        <tr>
          <td>Allowances</td>
          <td>${slip.allowances.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>

    <table class="pay-table" style="margin-top:10px;">
      <thead>
        <tr>
          <th>Deductions</th>
          <th>Amount (₹)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Deductions</td>
          <td>${slip.deductions.toFixed(2)}</td>
        </tr>
      </tbody>
    </table>

    <div class="net-pay">
      Net Pay: ₹${slip.netPay.toFixed(2)}
    </div>

    <div class="footer">This is a system-generated salary slip. No signature required.</div>
  </body>
</html>
`;


    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    // ✅ Save PDF in public folder
    const fileName = `SalarySlip-${slip._id}.pdf`;
    const pdfPath = path.join(process.cwd(), "public", "salary-slips", fileName);

    // Create folder if not exists
    if (!fs.existsSync(path.join(process.cwd(), "public", "salary-slips"))) {
      fs.mkdirSync(path.join(process.cwd(), "public", "salary-slips"));
    }

    await page.pdf({ path: pdfPath, format: "A4", printBackground: true });
    await browser.close();

    return res.status(200).json({
      success: true,
      pdfUrl: `/salary-slips/${fileName}`,
    });
  } catch (error) {
    console.error("Error generating PDF:", error);
    return res.status(500).json({ success: false, message: "Error generating PDF" });
  }
}

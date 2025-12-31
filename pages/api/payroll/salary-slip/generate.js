import dbConnect from "@/utils/dbConnect";
import SalarySlip from "@/models/payroll/SalarySlip";
import Employee from "@/models/payroll/Employee";
import puppeteer from "puppeteer";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  await dbConnect();

  try {
    const { slipId } = req.body;
    if (!slipId) return res.status(400).json({ message: "Slip ID is required" });

    // Fetch slip and employee details
    const slip = await SalarySlip.findById(slipId);
    const employee = await Employee.findById(slip.employeeId);

    if (!slip || !employee) return res.status(404).json({ message: "Slip or Employee not found" });

    // ✅ Professional HTML Template
    const html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            .header { text-align: center; margin-bottom: 20px; }
            .header img { width: 120px; }
            h2 { margin: 5px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            td, th { border: 1px solid #ccc; padding: 8px; text-align: left; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: gray; }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="https://your-company-logo-url" />
            <h2>Salary Slip</h2>
            <p>${slip.month}, ${slip.year}</p>
          </div>
          <table>
            <tr><th>Employee Name</th><td>${employee.firstName} ${employee.lastName}</td></tr>
            <tr><th>Employee ID</th><td>${employee.employeeId}</td></tr>
            <tr><th>Department</th><td>${employee.department || "-"}</td></tr>
          </table>
          <h3>Earnings & Deductions</h3>
          <table>
            <tr><th>Earnings</th><th>Amount (₹)</th></tr>
            <tr><td>Basic Pay</td><td>${slip.basicPay}</td></tr>
            <tr><td>HRA</td><td>${slip.hra}</td></tr>
            <tr><td>Allowances</td><td>${slip.allowances}</td></tr>
            <tr><th>Deductions</th><th>${slip.deductions}</th></tr>
            <tr><th>Net Pay</th><th>₹${slip.netPay}</th></tr>
          </table>
          <div class="footer">
            This is a system-generated salary slip.
          </div>
        </body>
      </html>
    `;

    // ✅ Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true });

    await browser.close();

    // ✅ Return as downloadable PDF
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="SalarySlip-${slip.month}.pdf"`);
    return res.send(pdfBuffer);
  } catch (error) {
    console.error("PDF Generation Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

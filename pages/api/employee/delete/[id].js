// Soft-deactivate: sets isActive=false + exit info. Data is never lost.
import dbConnect from "@/utils/dbConnect";
import Employee from "@/models/hr/Employee";

export default async function handler(req, res) {
  await dbConnect();
  const { id } = req.query;

  if (req.method === "DELETE") {
    try {
      const { exitStatus = "Resigned", exitDate, exitReason } = req.body || {};

      const employee = await Employee.findByIdAndUpdate(
        id,
        {
          $set: {
            isActive:   false,
            exitStatus: exitStatus || "Resigned",
            exitDate:   exitDate ? new Date(exitDate) : new Date(),
            exitReason: exitReason || "",
          },
        },
        { new: true }
      );

      if (!employee) {
        return res.status(404).json({ success: false, message: "Employee not found" });
      }

      return res.status(200).json({ success: true, message: "Employee deactivated", employee });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: "Deactivation failed" });
    }
  }

  return res.status(405).json({ success: false, message: "Method not allowed" });
}

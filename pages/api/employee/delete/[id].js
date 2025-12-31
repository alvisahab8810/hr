// pages/api/employee/delete/[id].js
import dbConnect from "@/utils/dbConnect";
import Employee from "@/models/hr/Employee";

export default async function handler(req, res) {
  await dbConnect();

  const { id } = req.query;

  if (req.method === "DELETE") {
    try {
      const deleted = await Employee.findByIdAndDelete(id);

      if (!deleted) {
        return res.status(404).json({ success: false, message: "Employee not found" });
      }

      return res.status(200).json({ success: true, message: "Employee deleted" });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: "Delete failed" });
    }
  } else {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }
}

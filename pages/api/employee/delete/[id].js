// Soft-deactivate: sets isActive=false + exit info. Data is never lost.
// The top-level `email` (unique index) is suffixed so the same address can be
// re-used when inviting a replacement employee. The real email is preserved in
// professional.officialEmail and personal.email for record-keeping.
import dbConnect from "@/utils/dbConnect";
import Employee from "@/models/hr/Employee";

export default async function handler(req, res) {
  await dbConnect();
  const { id } = req.query;

  if (req.method === "DELETE") {
    try {
      const { exitStatus = "Resigned", exitDate, exitReason } = req.body || {};

      const existing = await Employee.findById(id);
      if (!existing) {
        return res.status(404).json({ success: false, message: "Employee not found" });
      }

      // Suffix the unique login email so it can be reused for a new hire.
      // Format: original_deactivated_<timestamp>@deactivated.invalid
      const ts = Date.now();
      const suffixedEmail = `${existing.email.replace(/@.*$/, "")}_deactivated_${ts}@deactivated.invalid`;

      const employee = await Employee.findByIdAndUpdate(
        id,
        {
          $set: {
            isActive:   false,
            email:      suffixedEmail,   // frees unique constraint for reuse
            exitStatus: exitStatus || "Resigned",
            exitDate:   exitDate ? new Date(exitDate) : new Date(),
            exitReason: exitReason || "",
          },
        },
        { new: true }
      );

      return res.status(200).json({ success: true, message: "Employee deactivated", employee });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: "Deactivation failed" });
    }
  }

  return res.status(405).json({ success: false, message: "Method not allowed" });
}

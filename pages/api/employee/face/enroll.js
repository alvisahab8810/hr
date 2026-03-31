import dbConnect from "@/utils/dbConnect";
import Employee from "@/models/hr/Employee";
import { getEmployeeFromReq } from "@/utils/employees/getEmployeeFromReq";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  await dbConnect();

  const employee = await getEmployeeFromReq(req, res);
  if (!employee) return;

  const { descriptor } = req.body;
  if (!descriptor || !Array.isArray(descriptor) || descriptor.length !== 128) {
    return res.status(400).json({ success: false, message: "Invalid face descriptor" });
  }

  await Employee.findByIdAndUpdate(employee._id, {
    faceDescriptor: descriptor,
    faceEnrolled: true,
  });

  return res.json({ success: true, message: "Face ID enrolled successfully" });
}

import dbConnect from "@/utils/dbConnect";
import Employee from "@/models/hr/Employee";
import { getEmployeeFromReq } from "@/utils/employees/getEmployeeFromReq";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  await dbConnect();

  const employee = await getEmployeeFromReq(req, res);
  if (!employee) return;

  const emp = await Employee.findById(employee._id).select("faceDescriptor faceEnrolled firstName");

  return res.json({
    success: true,
    enrolled: !!emp?.faceEnrolled,
    descriptor: emp?.faceDescriptor?.length ? emp.faceDescriptor : null,
  });
}

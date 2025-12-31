// import dbConnect from '@/utils/dbConnect';
// import Employee from '@/models/payroll/Employee';

// export default async function handler(req, res) {
//   await dbConnect();

//   if (req.method === 'POST') {
//     try {
//       const newEmployee = new Employee(req.body);
//       await newEmployee.save();
//       return res.status(201).json({ success: true, message: 'Employee added successfully.' });
//     } catch (error) {
//       return res.status(400).json({ success: false, error: error.message });
//     }
//   }

//   return res.status(405).json({ success: false, message: 'Method not allowed' });
// }



import dbConnect from '@/utils/dbConnect';
import Employee from "@/models/payroll/Employee"; // your schema file

export default async function handler(req, res) {
  if (req.method === "POST") {
    await dbConnect();

    try {
      const newEmployee = new Employee(req.body);
      await newEmployee.save();
      return res.status(201).json({ success: true });
    } catch (err) {
      if (err.code === 11000) {
        // Duplicate key error (e.g., employeeId already exists)
        return res.status(400).json({
          success: false,
          error: "Employee ID already exists.",
        });
      }

      return res.status(500).json({
        success: false,
        error: "Server error. Please try again later.",
      });
    }
  } else {
    res.status(405).json({ success: false, error: "Method Not Allowed" });
  }
}

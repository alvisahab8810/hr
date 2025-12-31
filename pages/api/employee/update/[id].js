// // pages/api/employee/update/[id].js
// import dbConnect from "@/utils/dbConnect";
// import Employee from "@/models/hr/Employee";


// export default async function handler(req, res) {
//   await dbConnect();

//   const { id } = req.query;

//   if (req.method === "PUT") {
//     try {
//       const updated = await Employee.findByIdAndUpdate(
//         id,
//         { $set: req.body }, // ✅ Updates nested objects
//         { new: true }
//       );

//       if (!updated) {
//         return res.status(404).json({ success: false, message: "Employee not found" });
//       }

//       res.status(200).json({ success: true, employee: updated });
//     } catch (err) {
//       res.status(500).json({ success: false, message: err.message });
//     }
//   } else {
//     res.setHeader("Allow", ["PUT"]);
//     res.status(405).end(`Method ${req.method} Not Allowed`);
//   }
// }




// pages/api/employee/update/[id].js
import dbConnect from "@/utils/dbConnect";
import Employee from "@/models/hr/Employee";

// Utility: flatten nested objects to dot notation
function flattenObject(obj, parentKey = "", res = {}) {
  for (let key in obj) {
    const propName = parentKey ? `${parentKey}.${key}` : key;
    if (
      typeof obj[key] === "object" &&
      obj[key] !== null &&
      !Array.isArray(obj[key])
    ) {
      flattenObject(obj[key], propName, res);
    } else {
      res[propName] = obj[key];
    }
  }
  return res;
}

export default async function handler(req, res) {
  await dbConnect();

  const { id } = req.query;

  if (req.method === "PUT") {
    try {
      // ✅ flatten request body so only provided fields are updated
      const flattenedUpdate = flattenObject(req.body);

      const updated = await Employee.findByIdAndUpdate(
        id,
        { $set: flattenedUpdate },
        { new: true }
      );

      if (!updated) {
        return res
          .status(404)
          .json({ success: false, message: "Employee not found" });
      }

      res.status(200).json({ success: true, employee: updated });
    } catch (err) {
      console.error("Update error:", err);
      res
        .status(500)
        .json({ success: false, message: err.message || "Server error" });
    }
  } else {
    res.setHeader("Allow", ["PUT"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

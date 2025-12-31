// scripts/addSlugs.mjs
import dbConnect from "@/utils/dbConnect";
import Employee from "@/models/hr/Employee";

async function addSlugs() {
  await dbConnect();
  const employees = await Employee.find({ slug: { $exists: false } });

  for (let emp of employees) {
    emp.slug = emp.employeeId.toLowerCase();
    await emp.save();
    console.log(`Added slug: ${emp.slug}`);
  }

  console.log("✅ All slugs updated!");
  process.exit();
}

addSlugs();

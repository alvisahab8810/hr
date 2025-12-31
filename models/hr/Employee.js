// import mongoose from "mongoose";

// const EmployeeSchema = new mongoose.Schema(
//   {
//     firstName: {
//       type: String,
//       required: true,
//       trim: true,
//     },
//     lastName: {
//       type: String,
//       required: true,
//       trim: true,
//     },
//     email: {
//       type: String,
//       required: true,
//       unique: true,
//       lowercase: true,
//     },
//     employeeId: {
//       type: String,
//       required: true,
//       unique: true,
//     },
//     password: {
//       type: String,
//       required: true,
//     },
//     isActive: {
//       type: Boolean,
//       default: true,
//     },
//     hasCompletedProfile: {
//       type: Boolean,
//       default: false, // when first login, employee fills rest details
//     },
//   },
//   { timestamps: true }
// );

// export default mongoose.models.Employee ||
//   mongoose.model("Employee", EmployeeSchema);







import mongoose from "mongoose";

const DocumentSchema = new mongoose.Schema({
  appointmentLetter: String,
  salarySlips: [String],          // allow multiple
  relievingLetter: String,
  experienceLetter: String,
}, { _id: false });

const BankSchema = new mongoose.Schema({
  monthlySalary: Number,
  annualSalary: Number,
  accountHolderName: String,
  bankName: String,
  branch: String,
  accountNumber: String,
  ifscCode: String,
  panNumber: String,
  upiId: String,
}, { _id: false });

const ProfessionalSchema = new mongoose.Schema({
  employeeId: { type: String, index: true },
  dateOfJoining: Date,
  officialEmail: String,
  department: String,
  designation: String,
   // 🔽 NEW FIELDS
  employeeType: {
    type: String,
    enum: ["Remote", "Office", "Hybrid"], // You can expand later
    default: "Office",
  },
  status: {
    type: String,
    enum: ["Probation", "Permanent", "Contract", "Intern"],
    default: "Probation",
  },
}, { _id: false });

const PersonalSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  mobile: String,
  email: String,
  fatherName: String,
  motherName: String,
  dob: Date,
  maritalStatus: String,
  address: String,
  city: String,
  state: String,
  zip: String,
  avatar: String,                 // profile photo path
}, { _id: false });

const EmployeeSchema = new mongoose.Schema({
  // created earlier
  firstName: { type: String, required: true, trim: true },
  lastName:  { type: String, required: true, trim: true },
  email:     { type: String, required: true, unique: true, lowercase: true },
  employeeId:{ type: String, required: true, unique: true },
  password:  { type: String, required: true },

    slug: { type: String, unique: true, index: true }, // <-- add this

  // completion
  personal: PersonalSchema,
  professional: ProfessionalSchema,
  salary: BankSchema,
  documents: DocumentSchema,

  isActive: { type: Boolean, default: true },
  hasCompletedProfile: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.models.Employee ||
  mongoose.model("Employee", EmployeeSchema);

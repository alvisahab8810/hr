import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    employeeId: { type: String, required: true, unique: true },
    joiningDate: { type: Date, required: true },
    mobile: { type: String, required: true },
    email: { type: String, required: true },
    gender: { type: String },
    designation: { type: String },
    department: { type: String },

    // Salary Details
    salary: { type: Number },
    salaryType: { type: String, enum: ['Fixed', 'Hourly', 'Commission'] },
    bankName: { type: String },
    accountNumber: { type: String },
    ifscCode: { type: String },

    // Personal Details
    profileImage: { type: String, default: "" },

    fatherName: { type: String },
    motherName: { type: String },
    dob: { type: Date },
    maritalStatus: { type: String, enum: ['Single', 'Married', 'Divorced', 'Widowed'] },
    address: { type: String },

    // Payment Info
    paymentMode: { type: String, enum: ['Bank Transfer', 'Cheque', 'Cash'] },
    upiId: { type: String },
    panNumber: { type: String },
  },
  { timestamps: true }
);

export default mongoose.models.Employee || mongoose.model('Employee', employeeSchema);




// models/AdminUser.js
import mongoose from "mongoose";

const permSchema = {
  dashboard:    { type: Boolean, default: false },
  employees:    { type: Boolean, default: false },
  attendance:   { type: Boolean, default: false },
  leaves:       { type: Boolean, default: false },
  salaryReport: { type: Boolean, default: false },
  reimbursement:{ type: Boolean, default: false },
  overtime:     { type: Boolean, default: false },
  deductions:   { type: Boolean, default: false },
  holidays:     { type: Boolean, default: false },
  tasks:        { type: Boolean, default: false },
  projects:     { type: Boolean, default: false },
  clients:      { type: Boolean, default: false },
  blogs:        { type: Boolean, default: false },
};

const AdminUserSchema = new mongoose.Schema(
  {
    name:              { type: String, required: true, trim: true },
    email:             { type: String, required: true, unique: true, lowercase: true, trim: true },
    role:              { type: String, enum: ["Manager", "HR", "Accountant", "Viewer"], required: true },
    password:          { type: String, select: false },
    permissions:       { type: permSchema, default: {} },
    status:            { type: String, enum: ["Active", "Pending"], default: "Pending" },
    inviteToken:       { type: String,  select: false },
    inviteTokenExpiry: { type: Date,    select: false },
    passwordSet:       { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.AdminUser || mongoose.model("AdminUser", AdminUserSchema);

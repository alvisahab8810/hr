// models/Salesperson.js — the CRM's own sales team.
// These are not payroll employees and not admin users: the admin onboards them
// from Website → Sales team, hands them a username and password by mail, and
// ticks exactly which CRM menus they may open.
import mongoose from "mongoose";

// One flag per entry in the website sidebar. Everything is off until the
// admin ticks it on the invite form.
const permSchema = {
  home:        { type: Boolean, default: false },
  blogs:       { type: Boolean, default: false },
  careers:     { type: Boolean, default: false },
  positions:   { type: Boolean, default: false },
  pages:       { type: Boolean, default: false },
  faqs:        { type: Boolean, default: false },
  leads:       { type: Boolean, default: true },
  proposals:   { type: Boolean, default: false },
  invoices:    { type: Boolean, default: false },
  leadProfile: { type: Boolean, default: false },
  salesTeam:   { type: Boolean, default: false },
  reports:     { type: Boolean, default: false },
  slots:       { type: Boolean, default: false },
  settings:    { type: Boolean, default: false },
};

const SalespersonSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true },
    role:     { type: String, default: "Sales Executive", trim: true },
    email:    { type: String, required: true, lowercase: true, trim: true },
    phone:    { type: String, default: "", trim: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Kept as the admin typed it, on purpose: the admin issues the password and
    // can read or change it later. No hashing, by design.
    password: { type: String, required: true },
    target:   { type: Number, default: 0 },
    color:    { type: String, default: "#6366F1" },
    permissions: { type: permSchema, default: {} },
    active:   { type: Boolean, default: true },
    lastLogin:{ type: Date },
  },
  { timestamps: true, collection: "salespersons" }
);

export default mongoose.models.Salesperson || mongoose.model("Salesperson", SalespersonSchema);

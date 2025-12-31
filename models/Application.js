// models/Application.js

import mongoose from 'mongoose';

const ApplicationSchema = new mongoose.Schema({
  name: String,
  email: String,
  mobile: String,
  portfolioLink: String,
  appliedPosition: String,
  resumePath: String,

  
}, { timestamps: true });

export default mongoose.models.Application || mongoose.model('Application', ApplicationSchema);

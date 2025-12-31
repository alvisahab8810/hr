    // import mongoose from "mongoose";

    // const CustomerSchema = new mongoose.Schema({
    // customerType: String,
    // salutation: String,
    // firstName: String,
    // lastName: String,
    // companyName: String,
    // displayName: String,
    // email: String,
    // workPhone: String,
    // mobile: String,
    // // New fields
    // pan: String,
    // documents: [String], // or you can use [{ name: String, url: String }] for more detail
    // });

    // export default mongoose.models.Customer ||
    // mongoose.model("Customer", CustomerSchema);




    import mongoose from "mongoose";

const CustomerSchema = new mongoose.Schema({
  customerType: String,
  salutation: String,
  firstName: String,
  lastName: String,
  companyName: String,
  displayName: String,
  email: String,
  workPhone: String,
  mobile: String,
  pan: String,
  gst: String,

  documents: [String], // or [{ name: String, url: String }] if more details needed

  // Billing Address fields
  billingAddress: {
    attention: String,
    country: String,   // Store country code or name
    address1: String,
    address2: String,
    city: String,
    state: String,     // Store state code or name
    pincode: String,
    phone: String,
    fax: String,
  },
},{
  timestamps: true // ✅ This adds createdAt and updatedAt fields
});

export default mongoose.models.Customer ||
  mongoose.model("Customer", CustomerSchema);

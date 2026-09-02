import mongoose from "mongoose";

// Explicit subdocument schemas prevent Mongoose from misinterpreting
// a field named "type" as a discriminator key (which crashes on $set).
const SchemaBlockSchema = new mongoose.Schema({
  type:    { type: String },
  content: { type: String },
}, { _id: false });

const FaqItemSchema = new mongoose.Schema({
  question: { type: String },
  answer:   { type: String },
}, { _id: false });

const BlogSchema = new mongoose.Schema(
  {
    _id:             { type: String },
    title:           { type: String, required: true },
    slug:            { type: String, required: true },
    coverImage:      { src: String, alt: String },
    cardImage:       { src: String, alt: String },
    content:         String,
    summary:         String,
    schema:          String,
    schemaType:      { type: String, default: "BlogPosting" },
    status:          { type: String, default: "draft" },
    publishDate:     String,
    allowComments:   { type: Boolean, default: true },
    categories:      [String],
    tags:            [String],
    metaTitle:       String,
    metaKeywords:    String,
    metaDescription: String,
    authorName:      String,
    views:           { type: Number, default: 0 },
    metaRobots:      { type: String, default: "index, follow, max-image-preview:large, max-snippet:-1" },
    xRobotsTag:      { type: String, default: "index, follow, max-image-preview:large, max-snippet:-1" },
    schemas:         [SchemaBlockSchema],
    faqs:            [FaqItemSchema],
  },
  { timestamps: true }
);

BlogSchema.index({ createdAt: -1 });

// Delete cached model so schema changes are always picked up without restarting.
// Safe: the JS module itself is cached by Node, so this file only runs once per process.
delete mongoose.models.Blog;
export default mongoose.model("Blog", BlogSchema);

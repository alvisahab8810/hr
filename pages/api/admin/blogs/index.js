// pages/api/admin/blogs/index.js
// Blog admin — list (GET) and create (POST). Blogs live in the same shared
// MongoDB database as the main site (viralon-new), so anything created here
// shows up on viralon.in/blogs immediately.
import crypto from "crypto";
import dbConnect from "@/utils/dbConnect";
import Blog from "@/models/Blog";
import { saveImage, normalizeImageSrc } from "@/utils/blogImageStore";
import { adminGuard } from "@/utils/admin/adminAuthGuard";

export const config = { api: { bodyParser: { sizeLimit: "20mb" } } };

async function processImages(body, blogId) {
  if (body.coverImage?.src?.startsWith("data:"))
    body.coverImage.src = await saveImage(body.coverImage.src, blogId, "cover") || body.coverImage.src;
  if (body.cardImage?.src?.startsWith("data:"))
    body.cardImage.src = await saveImage(body.cardImage.src, blogId, "card") || body.cardImage.src;
}

function withNormalizedImages(blog) {
  if (blog.coverImage?.src) blog.coverImage.src = normalizeImageSrc(blog.coverImage.src);
  if (blog.cardImage?.src)  blog.cardImage.src  = normalizeImageSrc(blog.cardImage.src);
  return blog;
}

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  await dbConnect();

  if (req.method === "GET") {
    const blogs = await Blog.find({})
      .select("title slug status cardImage coverImage categories authorName views createdAt updatedAt")
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json(blogs.map(b => ({ ...withNormalizedImages(b), id: b._id })));
  }

  if (req.method === "POST") {
    const id = crypto.randomUUID();
    const body = { ...req.body };
    await processImages(body, id);
    const blog = await Blog.create({ ...body, _id: id });
    const obj  = blog.toObject();
    return res.status(201).json({ ...obj, id: obj._id });
  }

  res.status(405).end();
}

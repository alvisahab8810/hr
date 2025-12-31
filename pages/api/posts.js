import dbConnect from "@/utils/dbConnect";
import Post from "@/models/Post";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === "POST") {
    try {
      const { title, content, image, postType } = req.body;
      const newPost = new Post({ title, content, image, postType });
      await newPost.save();
      res.status(201).json({ message: "Post created successfully" }); // Sending only the message
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === "GET") {
    try {
      const posts = await Post.find();
      res.status(200).json(posts);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ message: "Method Not Allowed" });
  }
}

// utils/mongoClient.js
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("❌  MONGODB_URI missing in .env.local");

let client;
let clientPromise;

if (process.env.NODE_ENV === "development") {
  // Re‑use the cached promise in next.js hot‑reload
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  // In prod create a new client once
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

export default clientPromise;   // 🔑  MUST be a Promise<MongoClient>

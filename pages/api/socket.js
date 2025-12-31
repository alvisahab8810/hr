// pages/api/socket.js
import { Server } from "socket.io";
import dbConnect from "@/utils/dbConnect";
import Employee from "@/models/payroll/Employee";

let ioInstance;

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (!res.socket.server.io) {
    console.log("✅ Initializing Socket.IO Server...");

    const io = new Server(res.socket.server, {
      path: "/api/socket",
      cors: {
        origin: "*", // tighten in prod
      },
    });

    // in-memory cache of statuses
    const employeeStatus = new Map(); // key = _id.toString()

    // Helper: broadcast updated map
    const broadcastAllStatuses = () => {
      const payload = [...employeeStatus.values()];
      io.emit("employeeStatusSnapshot", payload);
    };

    io.on("connection", (socket) => {
      console.log("👤 New client connected:", socket.id);

      // Client identifies: { employeeId, name }
      socket.on("employee:identify", ({ employeeId, name }) => {
        if (!employeeId) return;
        const now = new Date();
        employeeStatus.set(employeeId, {
          employeeId,
          name: name || "Unknown",
          status: "online",
          lastActive: now.toISOString(),
        });
        // send single update
        io.emit("employeeStatusUpdate", employeeStatus.get(employeeId));
      });

      // Heartbeat ping from employee clients
      socket.on(
        "employee:heartbeat",
        ({ employeeId, browser, url, clicks }) => {
          const rec = employeeStatus.get(employeeId);
          if (!rec) return;
          rec.lastActive = new Date().toISOString();
          rec.status = "online";
          if (browser) rec.browser = browser;
          if (url) rec.url = url;
          if (typeof clicks !== "undefined") rec.clicks = clicks;
          io.emit("employeeStatusUpdate", rec);
        }
      );

      // Employee explicitly goes idle / offline (optional)
      socket.on("employee:setStatus", ({ employeeId, status }) => {
        const rec = employeeStatus.get(employeeId);
        if (!rec) return;
        rec.status = status;
        rec.lastActive = new Date().toISOString();
        io.emit("employeeStatusUpdate", rec);
      });

      // Admin requested full snapshot
      socket.on("admin:requestSnapshot", () => {
        socket.emit("employeeStatusSnapshot", [...employeeStatus.values()]);
      });

      // When socket disconnects, mark user offline *if* we know who they are
      socket.on("disconnect", () => {
        console.log("❌ Client disconnected:", socket.id);
        // we don't know which employeeId unless socket stored it
        // store it when identified:
      });
    });

    res.socket.server.io = io;
    ioInstance = io;
  } else {
    // already initialized
  }

  res.end();
}

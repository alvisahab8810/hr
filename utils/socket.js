// utils/socket.js
import { io } from "socket.io-client";

let socketInstance;

export function getSocket() {
  if (!socketInstance) {
    socketInstance = io({
      path: "/api/socket", // Next.js socket path
      transports: ["websocket", "polling"],
      reconnection: true,
    });
  }
  return socketInstance;
}

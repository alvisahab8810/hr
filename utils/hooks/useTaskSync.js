/**
 * useTaskSync — auto-refresh tasks without page reload.
 *
 * Combines three strategies:
 *  1. Socket.IO events  — instant push when any task changes on the server
 *  2. Tab visibility    — refetch when user switches back to the tab
 *  3. Polling fallback  — refetch every 20s as a safety net
 *
 * Usage:
 *   useTaskSync(fetchTasks, { room: "admin-tasks", empId: null })
 *   useTaskSync(fetchTasks, { room: null, empId: "abc123" })
 */
import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

let _socket = null;

function getSocket() {
  if (!_socket) {
    _socket = io({ path: "/api/socket", transports: ["websocket", "polling"], reconnection: true });
  }
  return _socket;
}

export function useTaskSync(onRefresh, { room = null, empId = null, pollMs = 20000 } = {}) {
  const onRefreshRef = useRef(onRefresh);
  useEffect(() => { onRefreshRef.current = onRefresh; }, [onRefresh]);

  useEffect(() => {
    const socket = getSocket();

    // Join the appropriate room(s) for targeted broadcasts
    if (room) socket.emit("task:joinRoom", room);
    if (empId) socket.emit("task:joinRoom", `employee-${empId}`);

    // Listen for any task change event → refetch
    const handler = () => { onRefreshRef.current?.(); };
    socket.on("task:created", handler);
    socket.on("task:updated", handler);
    socket.on("task:deleted", handler);

    // Tab becomes visible → refetch immediately
    const onVisible = () => { if (document.visibilityState === "visible") onRefreshRef.current?.(); };
    document.addEventListener("visibilitychange", onVisible);

    // Polling fallback every `pollMs` ms
    const timer = setInterval(() => { onRefreshRef.current?.(); }, pollMs);

    return () => {
      socket.off("task:created", handler);
      socket.off("task:updated", handler);
      socket.off("task:deleted", handler);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(timer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, empId, pollMs]);
}

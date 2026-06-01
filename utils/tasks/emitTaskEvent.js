/**
 * Emit a task-change event via the global Socket.IO instance.
 * Call from any API route after a task is created or updated.
 *
 * @param {"task:created"|"task:updated"|"task:deleted"} event
 * @param {{ taskId?: string, employeeIds?: string[] }} meta
 */
export function emitTaskEvent(event, meta = {}) {
  try {
    const io = global._io;
    if (!io) return; // socket server not initialised yet — safe to skip

    // Broadcast to all admins watching the task list
    io.to("admin-tasks").emit(event, meta);

    // Notify specific employees
    if (meta.employeeIds?.length) {
      meta.employeeIds.forEach(id => {
        io.to(`employee-${String(id)}`).emit(event, meta);
      });
    }

    // Also emit to everyone (catch-all for pages that haven't joined a room)
    io.emit(event, meta);
  } catch (e) {
    // Never block API responses for a socket error
    console.error("[emitTaskEvent] error:", e.message);
  }
}

/**
 * utils/socket.js  —  SkillTrack Socket.IO client v3
 *
 * FIX: transports: ["polling"] only + upgrade: false
 * The Flask-SocketIO threading backend does NOT support WebSocket upgrades.
 * Attempting the upgrade causes: "RuntimeError: You need to use the eventlet server"
 * Polling is perfectly fine for real-time notifications at this scale.
 */

import { io } from "socket.io-client";

let socket = null;

// =============================================================================
// CONNECT
// =============================================================================
export function connectSocket(userId, role = "student") {
  if (socket && socket.connected) return socket;

  socket = io("http://localhost:5000", {
    transports:           ["polling"],  // polling only — no WebSocket upgrade
    upgrade:              false,        // never attempt upgrade
    reconnection:         true,
    reconnectionAttempts: 5,
    reconnectionDelay:    2000,
    timeout:              10000,
  });

  socket.on("connect", () => {
    console.log("[SOCKET] Connected:", socket.id);
    socket.emit("join", { user_id: userId, role });
  });

  socket.on("disconnect", (reason) => {
    console.log("[SOCKET] Disconnected:", reason);
  });

  socket.on("connect_error", (err) => {
    console.warn("[SOCKET] Connection error:", err.message);
  });

  return socket;
}

// =============================================================================
// DISCONNECT
// =============================================================================
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log("[SOCKET] Disconnected");
  }
}

// =============================================================================
// EVENT LISTENERS
// =============================================================================

/** New notification pushed from server  →  { title, message, type } */
export function onNotification(callback) {
  if (!socket) return;
  socket.off("notification_new");
  socket.on("notification_new", callback);
}

/** Skill score updated  →  { course_id, course_name, new_score } */
export function onSkillUpdate(callback) {
  if (!socket) return;
  socket.off("skill_score_update");
  socket.on("skill_score_update", callback);
}

/** Skill decay alert  →  { course_name, old_score, new_score, drop } */
export function onDecayAlert(callback) {
  if (!socket) return;
  socket.off("decay_alert");
  socket.on("decay_alert", callback);
}

/** Admin stats update  →  { total_students, total_submissions, pending_tasks } */
export function onAdminStats(callback) {
  if (!socket) return;
  socket.off("admin_stats_update");
  socket.on("admin_stats_update", callback);
}

export function getSocket() {
  return socket;
}
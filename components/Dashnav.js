"use client";

import { confirmAlert } from "react-confirm-alert";
import "react-confirm-alert/src/react-confirm-alert.css";
import { toast } from "react-toastify";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";

function useNotif() {
  const [count, setCount] = useState(0);
  const [recent, setRecent] = useState([]);
  const [commPath, setCommPath] = useState("/employee/community");

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("employeeToken") : null;
    setCommPath(token ? "/employee/community" : "/dashboard/admin/community");

    async function fetchNotif() {
      try {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const r = await fetch("/api/team/notifications", { headers, credentials: "include" });
        if (r.ok) {
          const d = await r.json();
          if (d.success) { setCount(d.total || 0); setRecent(d.recent || []); }
        }
      } catch {}
    }
    fetchNotif();
    const t = setInterval(fetchNotif, 30000);
    return () => clearInterval(t);
  }, []);

  return { count, recent, commPath };
}

function useCommunitySound() {
  const audioRef = useRef(null);

  // Set up audio + autoplay unlock on first user gesture
  useEffect(() => {
    const audio = new Audio("/sounds/notification.mp3");
    audio.volume = 0.6;
    audioRef.current = audio;

    const unlock = () => {
      audio.play().then(() => { audio.pause(); audio.currentTime = 0; }).catch(() => {});
    };
    document.addEventListener("click",   unlock, { once: true });
    document.addEventListener("keydown", unlock, { once: true });
    return () => {
      document.removeEventListener("click",   unlock);
      document.removeEventListener("keydown", unlock);
    };
  }, []);

  // Socket.IO real-time listener for instant notification (like Teams)
  useEffect(() => {
    // Request OS notification permission
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    // Detect own user ID to skip self-notification
    const token = typeof window !== "undefined" ? localStorage.getItem("employeeToken") : null;
    let ownId = null;
    if (token) {
      try {
        const p = JSON.parse(atob(token.split(".")[1]));
        ownId = p.id || p._id || p.sub;
      } catch {}
    }

    let socket = null;
    let cancelled = false;

    // Init socket server then connect
    fetch("/api/socket").finally(() => {
      if (cancelled) return;
      socket = io({ path: "/api/socket", transports: ["websocket", "polling"] });

      socket.on("connect", () => console.log("[Dashnav] socket connected", socket.id));
      socket.on("connect_error", (e) => console.error("[Dashnav] socket error", e.message));

      socket.on("community:message", (msg) => {
        console.log("[Dashnav] got community:message", msg);
        // Skip own messages
        if (ownId && String(msg.senderId) === String(ownId)) return;

        // Play notification sound
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {});
        }

        // OS notification (like Teams)
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          const n = new Notification(msg.senderName || "Team", {
            body:      msg.text || "Sent a message in Community",
            icon:      "/favicon.ico",
            tag:       "community",
            renotify:  true,
          });
          n.onclick = () => { window.focus(); };
        }
      });
    });

    return () => {
      cancelled = true;
      if (socket) socket.disconnect();
    };
  }, []);
}

export default function Dashnav() {
  const router = useRouter();
  const { count: notifCount, recent, commPath } = useNotif();
  const [showBell, setShowBell] = useState(false);
  useCommunitySound();

  return (
    <div className="main-nav dash-nav">
      <nav className="navbar">
        <div className="main-container">
          <div className="col-12">
            <div className="navbar-header">
              <Link href="#" className="bars"></Link>
              <Link className="navbar-brand" href="#">
                <img src="/assets/images/logo.png" width="100" alt="Viralon" />
              </Link>
            </div>

            <ul className="nav navbar-nav navbar-left"></ul>

            <ul className="nav navbar-nav navbar-right mobile-none"
              style={{ display: "flex", alignItems: "center", gap: 6 }}>

              {/* Notification bell */}
              <li style={{ listStyle: "none" }}>
                <div
                  style={{ position: "relative" }}
                  onMouseEnter={() => setShowBell(true)}
                  onMouseLeave={() => setShowBell(false)}
                >
                  <a
                    href={commPath}
                    onClick={e => { e.preventDefault(); router.push(commPath); }}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      width: 36, height: 36, borderRadius: 8,
                      background: notifCount > 0 ? "#EEF2FF" : "rgba(255,255,255,.15)",
                      border: "1.5px solid rgba(255,255,255,.25)",
                      position: "relative", textDecoration: "none", cursor: "pointer",
                    }}
                    title="Notifications"
                  >
                    <i className="bi bi-bell-fill" style={{ fontSize: 15, color: notifCount > 0 ? "#4F46E5" : "#fff" }} />
                    {notifCount > 0 && (
                      <span style={{
                        position: "absolute", top: -5, right: -5,
                        background: "#EF4444", color: "#fff",
                        fontSize: 9, fontWeight: 800,
                        minWidth: 16, height: 16, borderRadius: "50%",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        border: "2px solid #fff", padding: "0 3px",
                      }}>
                        {notifCount > 99 ? "99+" : notifCount}
                      </span>
                    )}
                  </a>

                  {showBell && notifCount > 0 && (
                    <div style={{
                      position: "absolute", top: "calc(100% + 10px)", right: 0,
                      background: "#fff", border: "1.5px solid #E2E8F0",
                      borderRadius: 12, minWidth: 260, maxWidth: 320,
                      boxShadow: "0 8px 28px rgba(0,0,0,.14)", zIndex: 9999,
                      overflow: "hidden",
                    }}>
                      <div style={{ padding: "10px 16px 8px", fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".06em", borderBottom: "1px solid #F1F5F9" }}>
                        New Messages
                      </div>
                      {recent.length === 0 ? (
                        <div style={{ padding: "12px 16px", fontSize: 12, color: "#94a3b8" }}>No recent messages</div>
                      ) : (
                        recent.map((n, i) => (
                          <div key={i}
                            onClick={() => { router.push(commPath); setShowBell(false); }}
                            style={{ padding: "10px 16px", cursor: "pointer", borderBottom: i < recent.length - 1 ? "1px solid #F8FAFC" : "none" }}
                            onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                          >
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a", marginBottom: 2 }}>{n.senderName}</div>
                            <div style={{ fontSize: 11, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {n.preview || "Sent a message"}
                            </div>
                          </div>
                        ))
                      )}
                      <div style={{ padding: "8px 16px 10px", borderTop: "1px solid #F1F5F9" }}>
                        <span onClick={() => { router.push(commPath); setShowBell(false); }}
                          style={{ fontSize: 12, fontWeight: 700, color: "#4F46E5", cursor: "pointer" }}>
                          View all messages
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </li>

              {/* Admin / brand logo chip */}
              {/* <li style={{ listStyle: "none" }} className="log-out-btn">
                <img src="/assets/images/admin/admin-logo.svg"
                  style={{ height: 36, width: "auto", display: "block" }} />
              </li> */}

            </ul>
          </div>
        </div>
      </nav>
    </div>
  );
}

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

// ---------------------------------------------------------------------------
// Web Audio API beep — works in background tabs, zero file dependency
// ---------------------------------------------------------------------------
function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
    console.log("[Dashnav] playBeep: Web Audio oscillator fired");
  } catch (err) {
    console.warn("[Dashnav] playBeep failed:", err);
  }
}

function useCommunitySound() {
  const audioRef        = useRef(null);
  const audioUnlocked   = useRef(false);

  // ---------------------------------------------------------------------------
  // 1. Set up <Audio> element with correct filename + autoplay-unlock gesture
  //    The actual file on disk is "nortification.mp3" (legacy typo kept as-is).
  //    We try it first; if it fails we fall back to the Web Audio beep.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const audio = new Audio("/sounds/nortification.mp3");
    audio.volume = 0.6;
    audio.preload = "auto";
    audioRef.current = audio;

    audio.addEventListener("canplaythrough", () => {
      console.log("[Dashnav] audio file loaded OK: nortification.mp3");
    }, { once: true });

    audio.addEventListener("error", (e) => {
      console.warn("[Dashnav] audio file failed to load — will use Web Audio beep", e);
    }, { once: true });

    // Unlock autoplay on first user gesture (required by browsers)
    const unlock = () => {
      if (audioUnlocked.current) return;
      audio.play()
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
          audioUnlocked.current = true;
          console.log("[Dashnav] audio autoplay unlocked via user gesture");
        })
        .catch((err) => {
          console.warn("[Dashnav] audio unlock attempt failed (will use beep):", err);
        });
    };
    document.addEventListener("click",   unlock, { once: true });
    document.addEventListener("keydown", unlock, { once: true });

    return () => {
      document.removeEventListener("click",   unlock);
      document.removeEventListener("keydown", unlock);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // 2. Socket.IO real-time listener — works on ANY page (Teams-like global)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    console.log("[Dashnav] useCommunitySound: mounting socket listener");

    // Request OS notification permission
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission()
        .then((p) => console.log("[Dashnav] Notification permission:", p))
        .catch(() => {});
    }

    // Detect own user ID to skip self-notification
    const token = typeof window !== "undefined" ? localStorage.getItem("employeeToken") : null;
    let ownId = null;
    if (token) {
      try {
        const p = JSON.parse(atob(token.split(".")[1]));
        ownId = p.id || p._id || p.sub;
        console.log("[Dashnav] own user id:", ownId);
      } catch (err) {
        console.warn("[Dashnav] could not decode token:", err);
      }
    }

    let socket = null;
    let cancelled = false;

    // ---------------------------------------------------------------------------
    // Ensure the Socket.IO HTTP server is bootstrapped before connecting.
    // In Next.js the server only initialises when /api/socket is first hit.
    // ---------------------------------------------------------------------------
    console.log("[Dashnav] pinging /api/socket to ensure server is up...");
    fetch("/api/socket")
      .then(() => {
        console.log("[Dashnav] /api/socket ping done, connecting socket client...");
      })
      .catch((err) => {
        console.warn("[Dashnav] /api/socket ping error (still trying):", err);
      })
      .finally(() => {
        if (cancelled) return;

        socket = io({
          path: "/api/socket",          // must match server: path: "/api/socket"
          transports: ["websocket", "polling"],
          reconnection: true,
          reconnectionAttempts: Infinity,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
        });

        socket.on("connect", () => {
          console.log("[Dashnav] socket connected, id:", socket.id);
        });

        socket.on("disconnect", (reason) => {
          console.log("[Dashnav] socket disconnected:", reason);
        });

        socket.on("connect_error", (err) => {
          console.error("[Dashnav] socket connect_error:", err.message);
        });

        socket.on("community:message", (msg) => {
          console.log("[Dashnav] community:message received:", msg);

          // Skip own messages
          if (ownId && String(msg.senderId) === String(ownId)) {
            console.log("[Dashnav] skipping own message");
            return;
          }

          // ---------------------------------------------------------------
          // Play sound: try <Audio> element first, fall back to Web Audio beep
          // (Web Audio works even when the tab is in the background)
          // ---------------------------------------------------------------
          let played = false;
          if (audioRef.current && audioUnlocked.current && audioRef.current.readyState >= 2) {
            audioRef.current.currentTime = 0;
            audioRef.current.play()
              .then(() => {
                played = true;
                console.log("[Dashnav] played notification.mp3");
              })
              .catch((err) => {
                console.warn("[Dashnav] <Audio>.play() failed, using beep:", err);
                playBeep();
              });
          } else {
            // Audio not unlocked yet or file missing — use oscillator beep
            console.log("[Dashnav] <Audio> not ready/unlocked, using Web Audio beep");
            playBeep();
          }

          // ---------------------------------------------------------------
          // OS / browser notification (like Teams toast)
          // ---------------------------------------------------------------
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            try {
              const n = new Notification(msg.senderName || "Team", {
                body:     msg.text || "Sent a message in Community",
                icon:     "/favicon.ico",
                tag:      "community-msg",
                renotify: true,
              });
              n.onclick = () => { window.focus(); };
              console.log("[Dashnav] OS notification shown");
            } catch (err) {
              console.warn("[Dashnav] OS notification failed:", err);
            }
          }
        });
      });

    return () => {
      console.log("[Dashnav] useCommunitySound: unmounting, disconnecting socket");
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

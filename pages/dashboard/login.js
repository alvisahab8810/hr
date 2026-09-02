import React, { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";

function getGreeting() {
  try {
    const h = parseInt(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata", hour: "2-digit", hour12: false }),
      10
    );
    if (h >= 5 && h < 12)  return "morning";
    if (h >= 12 && h < 17) return "afternoon";
    if (h >= 17 && h < 20) return "evening";
    return "night";
  } catch {
    return "day";
  }
}

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [status,   setStatus]   = useState("idle"); // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState("");
  const [shake,    setShake]    = useState(false);
  const [greeting, setGreeting] = useState("day");
  const router = useRouter();

  useEffect(() => { setGreeting(getGreeting()); }, []);

  const showError = (msg) => {
    setErrorMsg(msg);
    setStatus("error");
    setShake(true);
    setTimeout(() => setShake(false), 450);
  };

  const clearError = () => {
    if (status === "error") { setStatus("idle"); setErrorMsg(""); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (data.success) {
        setStatus("success");
        setTimeout(() => router.push("/dashboard/hub"), 950);
      } else {
        showError("Incorrect username or password");
      }
    } catch {
      showError("Network error — please try again");
    }
  };

  return (
    <>
      <Head>
        <title>Admin Login — Viralon</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
        <style>{`
          * { box-sizing: border-box; }
          html, body { margin:0; padding:0; }
          body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif; background:#fff; }

          @keyframes vl-in { 0% { opacity:0; transform:translateY(18px); } 100% { opacity:1; transform:translateY(0); } }
          @keyframes vl-glow { 0%,100% { opacity:.5; transform:scale(1); } 50% { opacity:.95; transform:scale(1.08); } }
          .vl-wrap { min-height:100vh; width:100%; position:relative; overflow:hidden;
            display:flex; align-items:center; justify-content:center; padding:24px 16px; background:#fff; }

          .vl-fade-corner { position:absolute; border-radius:50%; filter:blur(90px); pointer-events:none;
            animation: vl-glow 7s ease-in-out infinite; }

          .vl-dotgrid { position:absolute; inset:0; pointer-events:none; opacity:.5;
            background-image: radial-gradient(#E5E7EB 1px, transparent 1px);
            background-size: 26px 26px;
            -webkit-mask-image: radial-gradient(circle at 50% 40%, #000 0%, transparent 72%);
            mask-image: radial-gradient(circle at 50% 40%, #000 0%, transparent 72%); }

          .vl-card { position:relative; z-index:3; width:100%; max-width:398px;
            animation: vl-in .5s cubic-bezier(.16,1,.3,1);
            background:rgba(255,255,255,.72); backdrop-filter:blur(18px); -webkit-backdrop-filter:blur(18px);
            border-radius:22px; padding:36px 32px 30px;
            border:1px solid rgba(255,255,255,.6);
            box-shadow: 0 4px 16px rgba(15,23,42,.04), 0 24px 60px rgba(79,70,229,.14); }

          .vl-logo-wrap { margin:0 auto 30px; display:flex; align-items:center; justify-content:center; }

          .vl-input-group { position:relative; margin-bottom:16px; }
          .vl-input { width:100%; padding:12px 16px 12px 42px; border-radius:12px;
            border:1.5px solid #E5E7EB; font-size:14px; outline:none;
            transition: border-color .15s, box-shadow .15s; background:#F9FAFB; color:#111827; }
          .vl-input::placeholder { color:#9CA3AF; }
          .vl-input:focus { border-color:#4F46E5; box-shadow:0 0 0 3px rgba(79,70,229,.13); background:#fff; }
          .vl-icon { position:absolute; left:14px; top:50%; transform:translateY(-50%);
            font-size:14px; color:#9CA3AF; pointer-events:none; }
          .vl-eye { position:absolute; right:13px; top:50%; transform:translateY(-50%);
            background:none; border:none; cursor:pointer; color:#9CA3AF; font-size:14px; padding:4px; }
          .vl-eye:hover { color:#4F46E5; }

          .vl-btn { width:100%; padding:13px; border:none; border-radius:12px; cursor:pointer;
            font-size:14.5px; font-weight:700; color:#fff; margin-top:6px;
            background: linear-gradient(145deg,#6366F1 0%,#4F46E5 60%,#7C3AED 100%);
            box-shadow: 0 8px 22px rgba(79,70,229,.3);
            transition: filter .15s, box-shadow .15s, transform .15s;
            display:flex; align-items:center; justify-content:center; gap:8px; }
          .vl-btn:hover:not(:disabled) { filter:brightness(1.06); box-shadow:0 10px 26px rgba(79,70,229,.38); transform:translateY(-1px); }
          .vl-btn:disabled { opacity:.7; cursor:default; }

          @media (max-width:420px) { .vl-card { padding:30px 22px 26px; border-radius:18px; } }

          /* ── Inline status feedback (no toast) ──────────────────── */
          @keyframes vl-shake {
            10%,90% { transform:translateX(-1px); }
            20%,80% { transform:translateX(2px); }
            30%,50%,70% { transform:translateX(-5px); }
            40%,60% { transform:translateX(5px); }
          }
          @keyframes vl-alert-in { 0% { opacity:0; transform:translateY(-6px); max-height:0; }
            100% { opacity:1; transform:translateY(0); max-height:60px; } }
          @keyframes vl-pop { 0% { transform:scale(.92); } 60% { transform:scale(1.03); } 100% { transform:scale(1); } }

          .vl-card.vl-shake { animation: vl-shake .4s cubic-bezier(.36,.07,.19,.97); }

          .vl-alert { display:flex; align-items:center; gap:9px;
            background:#FEF2F2; border:1px solid #FECACA; color:#B91C1C;
            font-size:12.5px; font-weight:600; line-height:1.35;
            padding:10px 12px; border-radius:10px; margin-bottom:16px;
            animation: vl-alert-in .25s ease; overflow:hidden; }
          .vl-alert i { font-size:15px; flex-shrink:0; }

          .vl-btn.vl-btn-success { background:#16A34A; box-shadow:0 8px 22px rgba(22,163,74,.32); animation: vl-pop .35s ease; }
        `}</style>
      </Head>

      <div className="vl-wrap">
        {/* Faint dotted grid, masked to fade toward edges */}
        <div className="vl-dotgrid" />

        {/* Soft glassmorphism glow blobs, kept light so bg still reads as white */}
        <div className="vl-fade-corner" style={{ width:440, height:440, top:-170, left:-150, background:"radial-gradient(circle, rgba(99,102,241,.13), transparent 70%)" }} />
        <div className="vl-fade-corner" style={{ width:440, height:440, bottom:-170, right:-150, background:"radial-gradient(circle, rgba(249,115,22,.11), transparent 70%)", animationDelay:"-2.5s" }} />
        <div className="vl-fade-corner" style={{ width:320, height:320, top:"20%", right:-110, background:"radial-gradient(circle, rgba(124,58,237,.10), transparent 70%)", animationDelay:"-4.5s" }} />
        <div className="vl-fade-corner" style={{ width:280, height:280, bottom:"12%", left:-100, background:"radial-gradient(circle, rgba(165,180,252,.14), transparent 70%)", animationDelay:"-1.2s" }} />

        {/* ── Card ───────────────────────────────────────────────── */}
        <div className={`vl-card${shake ? " vl-shake" : ""}`}>
          <div style={{ textAlign: "center", marginBottom: 22 }}>
            <div className="vl-logo-wrap">
              <img src="/assets/images/logo.png" alt="Viralon" width={100} />
            </div>
            <h2 style={{ margin: 0, fontSize: 21, fontWeight: 800, color: "#111827" }}>
              Good {greeting}, Admin
            </h2>
            <p style={{ margin: "5px 0 0", fontSize: 13, color: "#6B7280" }}>
              Sign in to the Viralon payroll dashboard
            </p>
          </div>

          {status === "error" && (
            <div className="vl-alert">
              <i className="bi bi-exclamation-circle-fill" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="vl-input-group">
              <i className="bi bi-person-fill vl-icon" />
              <input
                type="text"
                className="vl-input"
                placeholder="Enter user name"
                value={username}
                onChange={(e) => { setUsername(e.target.value); clearError(); }}
                autoFocus
                required
              />
            </div>

            <div className="vl-input-group">
              <i className="bi bi-lock-fill vl-icon" />
              <input
                type={showPw ? "text" : "password"}
                className="vl-input"
                placeholder="Password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); clearError(); }}
                style={{ paddingRight: 40 }}
                required
              />
              <button type="button" className="vl-eye" onClick={() => setShowPw(!showPw)} tabIndex={-1}>
                <i className={`bi bi-eye${showPw ? "-slash" : ""}-fill`} />
              </button>
            </div>

            <button
              type="submit"
              className={`vl-btn${status === "success" ? " vl-btn-success" : ""}`}
              disabled={status === "loading" || status === "success"}
            >
              {status === "loading" && (
                <><span className="spinner-border spinner-border-sm" style={{ width: 15, height: 15 }} /> Signing in…</>
              )}
              {status === "success" && (
                <><i className="bi bi-check-lg" /> Signed in</>
              )}
              {(status === "idle" || status === "error") && (
                <><i className="bi bi-box-arrow-in-right" /> Sign In</>
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

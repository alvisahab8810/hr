import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";

export default function ClientLogin() {
  const router    = useRouter();
  const { brand } = router.query;
  const [form,      setForm]      = useState({ email: "", password: "" });
  const [error,     setError]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [brandInfo, setBrandInfo] = useState(null);
  const [showPass,  setShowPass]  = useState(false);

  useEffect(() => {
    if (!brand) return;
    fetch(`/api/client/brand-info?slug=${brand}`)
      .then(r => r.json())
      .then(d => { if (d.success) setBrandInfo(d.brand); })
      .catch(() => {});
  }, [brand]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const r = await fetch("/api/client/auth/login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ ...form, brandSlug: brand }),
      });
      const d = await r.json();
      if (!d.success) { setError(d.message); return; }
      router.push(`/client/${brand}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const bc       = brandInfo?.color || "#5A57FB";
  const brandName = brandInfo?.name || (brand ? brand.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "Your Brand");

  const FEATURES = [
    { icon: "bi-check2-circle",            text: "Real-time content approvals"         },
    { icon: "bi-bar-chart-line-fill",      text: "Performance & analytics overview"    },
    { icon: "bi-calendar3",               text: "Content calendar & weekly slate"     },
    { icon: "bi-chat-dots-fill",           text: "Direct messaging with your team"    },
    { icon: "bi-file-earmark-arrow-down", text: "Download brand assets & invoices"   },
  ];

  return (
    <>
      <Head>
        <title>{brandName} · Client Portal · Viralon</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" />
      </Head>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }

        .cl-wrap {
          min-height: 100vh;
          display: flex;
        }

        /* ── LEFT PANEL ── */
        .cl-left {
          flex: 1;
          position: relative;
          background: linear-gradient(155deg, #0A0820 0%, #160D40 35%, #0D1B45 65%, #07111E 100%);
          display: flex;
          flex-direction: column;
          padding: 52px 56px;
          overflow: hidden;
        }
        /* decorative orbs */
        .cl-left::before {
          content: "";
          position: absolute;
          top: -120px; left: -120px;
          width: 480px; height: 480px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(90,87,251,.25) 0%, transparent 70%);
          pointer-events: none;
        }
        .cl-left::after {
          content: "";
          position: absolute;
          bottom: -80px; right: -60px;
          width: 360px; height: 360px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(2,235,173,.15) 0%, transparent 70%);
          pointer-events: none;
        }
        .cl-orb-mid {
          position: absolute;
          top: 52%; right: 18%;
          width: 200px; height: 200px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(129,140,248,.12) 0%, transparent 70%);
          pointer-events: none;
        }

        /* Viralon logo block */
        .cl-logo-block {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 64px;
          position: relative;
          z-index: 1;
        }
        .cl-logo-img {
          width: 48px;
          height: 48px;
          object-fit: contain;
          filter: drop-shadow(0 4px 12px rgba(90,87,251,.5));
        }
        .cl-logo-wordmark {
          display: flex;
          flex-direction: column;
        }
        .cl-logo-name {
          font-size: 22px;
          font-weight: 900;
          letter-spacing: 2px;
          background: linear-gradient(90deg, #ffffff 0%, #A5B4FC 50%, #02EBAD 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          line-height: 1;
        }
        .cl-logo-tagline {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 2.5px;
          color: rgba(255,255,255,.35);
          text-transform: uppercase;
          margin-top: 3px;
        }

        /* Hero section */
        .cl-hero { position: relative; z-index: 1; flex: 1; }
        .cl-hero-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #02EBAD;
          margin-bottom: 20px;
        }
        .cl-hero-eyebrow::before {
          content: "";
          display: block;
          width: 20px; height: 2px;
          background: #02EBAD;
          border-radius: 2px;
        }
        .cl-hero-title {
          font-size: 46px;
          font-weight: 900;
          line-height: 1.08;
          color: #fff;
          letter-spacing: -1.5px;
          margin-bottom: 18px;
        }
        .cl-hero-title .accent {
          background: linear-gradient(90deg, #818CF8, #02EBAD);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .cl-hero-sub {
          font-size: 15px;
          color: rgba(255,255,255,.5);
          line-height: 1.7;
          max-width: 340px;
          margin-bottom: 44px;
        }

        /* Features */
        .cl-features { display: flex; flex-direction: column; gap: 12px; margin-bottom: 56px; }
        .cl-feat-item {
          display: flex;
          align-items: center;
          gap: 14px;
          font-size: 14px;
          font-weight: 500;
          color: rgba(255,255,255,.75);
        }
        .cl-feat-icon {
          width: 36px; height: 36px;
          border-radius: 10px;
          background: rgba(255,255,255,.06);
          border: 1px solid rgba(255,255,255,.1);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: background .2s;
        }

        /* Brand chip */
        .cl-brand-chip {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 10px 18px;
          background: rgba(255,255,255,.06);
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 100px;
          backdrop-filter: blur(8px);
          position: relative;
          z-index: 1;
          width: fit-content;
        }
        .cl-brand-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: .6; transform: scale(.85); }
        }
        .cl-brand-chip span {
          font-size: 13px;
          color: rgba(255,255,255,.55);
        }
        .cl-brand-chip strong {
          color: #fff;
          font-weight: 700;
        }

        /* ── RIGHT PANEL ── */
        .cl-right {
          width: 480px;
          background: #fff;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 52px 48px;
          position: relative;
        }
        /* subtle right-side top arc */
        .cl-right::before {
          content: "";
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 4px;
          background: linear-gradient(90deg, #5A57FB, #02EBAD);
        }

        .cl-form-wrap { width: 100%; max-width: 360px; }

        /* powered-by mark */
        .cl-powered {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px 6px 8px;
          background: #F0F0FF;
          border-radius: 100px;
          margin-bottom: 36px;
        }
        .cl-powered-logo {
          width: 28px; height: 28px;
          object-fit: contain;
        }
        .cl-powered-text {
          font-size: 12px;
          font-weight: 700;
          color: #4F46E5;
          letter-spacing: .5px;
        }
        .cl-powered-sep {
          width: 1px; height: 14px;
          background: #C7D2FE;
        }
        .cl-powered-sub {
          font-size: 11px;
          color: #94A3B8;
          font-weight: 500;
        }

        .cl-form-title {
          font-size: 28px;
          font-weight: 900;
          color: #0F172A;
          letter-spacing: -0.5px;
          margin-bottom: 6px;
        }
        .cl-form-sub {
          font-size: 14px;
          color: #64748B;
          margin-bottom: 36px;
          line-height: 1.5;
        }
        .cl-form-sub strong { color: #1E293B; }

        /* Error */
        .cl-error {
          display: flex; align-items: flex-start; gap: 10px;
          background: #FEF2F2;
          border: 1.5px solid #FECACA;
          color: #DC2626;
          border-radius: 12px;
          padding: 12px 14px;
          font-size: 13px;
          margin-bottom: 20px;
          line-height: 1.5;
        }

        /* Fields */
        .cl-field { margin-bottom: 20px; }
        .cl-label { display: block; font-size: 12px; font-weight: 700; color: #374151; margin-bottom: 7px; letter-spacing: .3px; text-transform: uppercase; }
        .cl-input-wrap { position: relative; }
        .cl-input-wrap i { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #94A3B8; font-size: 16px; pointer-events: none; }
        .cl-input-wrap .cl-pass-toggle { left: auto; right: 14px; cursor: pointer; pointer-events: all; transition: color .15s; }
        .cl-input-wrap .cl-pass-toggle:hover { color: #5A57FB; }
        .cl-input {
          width: 100%;
          padding: 14px 14px 14px 44px;
          border: 2px solid #E5E7EB;
          border-radius: 12px;
          font-size: 14.5px;
          color: #0F172A;
          outline: none;
          transition: border-color .2s, box-shadow .2s;
          font-family: inherit;
          background: #FAFAFA;
        }
        .cl-input::placeholder { color: #CBD5E1; }
        .cl-input:focus { border-color: #5A57FB; box-shadow: 0 0 0 4px rgba(90,87,251,.1); background: #fff; }
        .cl-input.pass-input { padding-right: 44px; }

        /* CTA */
        .cl-btn {
          width: 100%;
          padding: 15px;
          border: none;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
          transition: all .18s;
          font-family: inherit;
          letter-spacing: .2px;
          margin-top: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #fff;
          box-shadow: 0 6px 20px rgba(90,87,251,.3);
        }
        .cl-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 10px 28px rgba(90,87,251,.4); }
        .cl-btn:active:not(:disabled) { transform: translateY(0); }
        .cl-btn:disabled { opacity: .65; cursor: not-allowed; }

        /* Divider */
        .cl-divider { display: flex; align-items: center; gap: 12px; margin: 28px 0; }
        .cl-divider::before, .cl-divider::after {
          content: ""; flex: 1;
          height: 1px; background: #F1F5F9;
        }
        .cl-divider span { font-size: 12px; color: #CBD5E1; font-weight: 600; }

        /* Footer */
        .cl-footer {
          margin-top: 32px;
          font-size: 12px;
          color: #94A3B8;
          text-align: center;
          line-height: 1.6;
        }
        .cl-footer a { color: #5A57FB; font-weight: 600; text-decoration: none; }

        /* Responsive */
        @media (max-width: 820px) {
          .cl-left  { display: none; }
          .cl-right { width: 100%; padding: 40px 28px; }
        }
      `}</style>

      <div className="cl-wrap">

        {/* ── LEFT BRAND PANEL ── */}
        <div className="cl-left">
          <div className="cl-orb-mid" />

          {/* Viralon Logo */}
          <div className="cl-logo-block">
            <img src="/asets/images/logo.png" alt="Viralon" className="cl-logo-img"
              onError={e => { e.target.style.display="none"; }} />
            <div className="cl-logo-wordmark">
              <div className="cl-logo-name">VIRALON</div>
              <div className="cl-logo-tagline">Digital Growth Partner</div>
            </div>
          </div>

          {/* Hero */}
          <div className="cl-hero">
            <div className="cl-hero-eyebrow">Client Portal</div>
            <h1 className="cl-hero-title">
              Your brand.<br />
              <span className="accent">Your results.</span><br />
              All in one place.
            </h1>
            <p className="cl-hero-sub">
              Track every deliverable, approve content, and stay in sync with your Viralon team — in real time.
            </p>

            <ul className="cl-features">
              {FEATURES.map(({ icon, text }) => (
                <li key={text} className="cl-feat-item">
                  <div className="cl-feat-icon">
                    <i className={`bi ${icon}`} style={{ color: "#02EBAD", fontSize: 15 }} />
                  </div>
                  {text}
                </li>
              ))}
            </ul>
          </div>

          {/* Brand identification chip */}
          <div className="cl-brand-chip">
            <span className="cl-brand-dot" style={{ background: bc }} />
            <span>Signing in as <strong>{brandName}</strong></span>
          </div>
        </div>

        {/* ── RIGHT FORM PANEL ── */}
        <div className="cl-right">
          <div className="cl-form-wrap">

            {/* Powered-by mark */}
            <div className="cl-powered">
              <img src="/asets/images/logo.png" alt="" className="cl-powered-logo"
                onError={e => { e.target.style.display="none"; }} />
              <span className="cl-powered-text">VIRALON</span>
              <div className="cl-powered-sep" />
              <span className="cl-powered-sub">Client Portal</span>
            </div>

            <div className="cl-form-title">Welcome back</div>
            <div className="cl-form-sub">
              Sign in to your <strong>{brandName}</strong> dashboard
            </div>

            {error && (
              <div className="cl-error">
                <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: 15, marginTop: 1, flexShrink: 0 }} />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="cl-field">
                <label className="cl-label">Email address</label>
                <div className="cl-input-wrap">
                  <i className="bi bi-envelope-fill" />
                  <input
                    className="cl-input"
                    type="email"
                    placeholder="you@company.com"
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="cl-field">
                <label className="cl-label">Password</label>
                <div className="cl-input-wrap">
                  <i className="bi bi-lock-fill" />
                  <input
                    className={`cl-input pass-input`}
                    type={showPass ? "text" : "password"}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    required
                  />
                  <i
                    className={`bi ${showPass ? "bi-eye-slash" : "bi-eye"} cl-pass-toggle`}
                    onClick={() => setShowPass(v => !v)}
                  />
                </div>
              </div>

              <button
                className="cl-btn"
                type="submit"
                disabled={loading}
                style={{ background: `linear-gradient(135deg, ${bc}, ${bc}cc)` }}>
                {loading ? (
                  <>
                    <span style={{ width:16, height:16, border:"2.5px solid rgba(255,255,255,.3)",
                      borderTopColor:"#fff", borderRadius:"50%",
                      animation:"spin .7s linear infinite", display:"inline-block" }} />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign in to portal
                    <i className="bi bi-arrow-right-short" style={{ fontSize: 18 }} />
                  </>
                )}
              </button>
            </form>

            <div className="cl-divider"><span>SECURE LOGIN</span></div>

            <div className="cl-footer">
              Having trouble?{" "}
              <a href="mailto:info@viralon.in">Contact us at info@viralon.in</a>
              <br />
              <span style={{ fontSize: 11 }}>
                © {new Date().getFullYear()} Viralon · All rights reserved
              </span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}

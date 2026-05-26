import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";

export default function ClientLogin() {
  const router     = useRouter();
  const { brand }  = router.query;
  const [form,     setForm]     = useState({ email: "", password: "" });
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [brandInfo,setBrandInfo]= useState(null);
  const [showPass, setShowPass] = useState(false);

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
      router.push(`/${brand}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const bc        = brandInfo?.color || "#5A57FB";
  const brandName = brandInfo?.name  || (brand ? brand.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "Your Brand");

  return (
    <>
      <Head>
        <title>{brandName} · Client Portal · Viralon</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" />
      </Head>

      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; overflow: hidden; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }

        /* ── WRAPPER — fills viewport, no scroll ── */
        .pg {
          height: 100vh;
          display: flex;
          overflow: hidden;
        }

        /* ════════════════ LEFT ════════════════ */
        .pg-l {
          flex: 1;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 44px 52px 44px;
          background: #07051C;
        }

        /* layered gradient blobs */
        .pg-l::before {
          content: "";
          position: absolute; inset: 0;
          background:
            radial-gradient(ellipse 75% 60% at 0% 10%,   rgba(90,87,251,.3)  0%, transparent 55%),
            radial-gradient(ellipse 55% 45% at 100% 90%,  rgba(2,235,173,.2)  0%, transparent 55%),
            radial-gradient(ellipse 40% 35% at 65%  50%,  rgba(139,92,246,.1) 0%, transparent 50%);
          pointer-events: none;
        }

        /* subtle dot grid */
        .pg-l::after {
          content: "";
          position: absolute; inset: 0;
          background-image: radial-gradient(rgba(255,255,255,.07) 1px, transparent 1px);
          background-size: 28px 28px;
          pointer-events: none;
          mask-image: linear-gradient(135deg, transparent 25%, rgba(0,0,0,.6) 70%);
          -webkit-mask-image: linear-gradient(135deg, transparent 25%, rgba(0,0,0,.6) 70%);
        }

        /* decorative rings bottom-right */
        .ring {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
        }
        .r1 { width:480px; height:480px; bottom:-170px; right:-110px; border:1px solid rgba(255,255,255,.045); }
        .r2 { width:340px; height:340px; bottom:-110px; right: -50px; border:1px solid rgba(2,235,173,.07); }
        .r3 { width:200px; height:200px; bottom: -50px; right:  10px; border:1px solid rgba(90,87,251,.1); }

        /* ── LOGO — big, standalone ── */
        .logo-area {
          position: relative; z-index: 2;
          display: flex; align-items: center; gap: 0;
        }
        .logo-img {
          width: 72px; height: 72px;
          object-fit: contain;
          filter: drop-shadow(0 0 20px rgba(90,87,251,.55));
        }

        /* ── HERO ── */
        .hero { position: relative; z-index: 2; }
        .hero-label {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 10.5px; font-weight: 700; letter-spacing: 2.5px;
          text-transform: uppercase; color: #02EBAD; margin-bottom: 18px;
        }
        .hero-label::before {
          content: ""; width: 20px; height: 2px;
          background: #02EBAD; border-radius: 2px; display: inline-block;
        }
        .hero-title {
          font-size: 48px; font-weight: 900;
          line-height: 1.06; color: #fff;
          letter-spacing: -2px; margin-bottom: 14px;
        }
        .hero-title .hl {
          background: linear-gradient(90deg, #818CF8, #02EBAD);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .hero-sub {
          font-size: 14px; color: rgba(255,255,255,.4);
          line-height: 1.75; max-width: 340px;
        }

        /* ── FEATURE LIST ── */
        .feats {
          position: relative; z-index: 2;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        .feat {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 12px;
          background: rgba(255,255,255,.04);
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 10px;
        }
        .feat-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: #02EBAD; flex-shrink: 0;
          box-shadow: 0 0 6px rgba(2,235,173,.7);
        }
        .feat-text { font-size: 12.5px; font-weight: 500; color: rgba(255,255,255,.65); }

        /* ── BRAND CHIP ── */
        .brand-chip {
          position: relative; z-index: 2;
          display: inline-flex; align-items: center; gap: 9px;
          padding: 9px 18px;
          background: rgba(255,255,255,.05);
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 100px;
          width: fit-content;
        }
        .bdot {
          width: 8px; height: 8px; border-radius: 50%;
          animation: blink 2s infinite;
        }
        @keyframes blink {
          0%,100% { opacity:1; }
          50%      { opacity:.4; }
        }
        .brand-chip span { font-size: 12.5px; color: rgba(255,255,255,.45); }
        .brand-chip strong { color: rgba(255,255,255,.9); font-weight: 700; }

        /* ════════════════ RIGHT ════════════════ */
        .pg-r {
          width: 460px;
          flex-shrink: 0;
          background: #fff;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px 44px;
          position: relative;
          overflow: hidden;
        }

        /* top gradient bar */
        .pg-r::before {
          content: "";
          position: absolute; top: 0; left: 0; right: 0;
          height: 3px;
          background: linear-gradient(90deg, #5A57FB 0%, #818CF8 50%, #02EBAD 100%);
        }

        /* subtle bg texture */
        .pg-r::after {
          content: "";
          position: absolute; inset: 0;
          background: radial-gradient(ellipse 80% 60% at 100% 0%, rgba(90,87,251,.04) 0%, transparent 60%);
          pointer-events: none;
        }

        .form-box { width: 100%; max-width: 360px; position: relative; z-index: 1; }

        /* small logo mark at top of form */
        .form-logo {
          display: flex; align-items: center; gap: 8px;
          margin-bottom: 30px;
        }
        .form-logo-img {
          width: 34px; height: 34px;
          object-fit: contain; border-radius: 8px;
        }
        .form-logo-label {
          font-size: 11px; font-weight: 700;
          letter-spacing: 1.5px; color: #94A3B8;
          text-transform: uppercase;
        }
        .form-logo-dot { width:1px; height:14px; background:#E2E8F0; }

        /* heading */
        .f-heading {
          font-size: 28px; font-weight: 900;
          color: #0F172A; letter-spacing: -0.7px;
          margin-bottom: 5px;
        }
        .f-sub {
          font-size: 13.5px; color: #64748B;
          margin-bottom: 28px; line-height: 1.5;
        }
        .f-sub strong { color: #1E293B; }

        /* error */
        .f-err {
          display: flex; align-items: center; gap: 9px;
          background: #FFF1F2; border: 1.5px solid #FECDD3;
          color: #BE123C; border-radius: 10px;
          padding: 11px 14px; font-size: 13px; margin-bottom: 16px;
        }

        /* fields */
        .field      { margin-bottom: 16px; }
        .f-label    { display: block; font-size: 11.5px; font-weight: 700; letter-spacing: .4px; text-transform: uppercase; color: #475569; margin-bottom: 7px; }
        .f-shell    { position: relative; }
        .f-ico      { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #94A3B8; font-size: 15px; pointer-events: none; }
        .f-eye      { left: auto; right: 14px; cursor: pointer; pointer-events: all; transition: color .15s; }
        .f-eye:hover { color: #5A57FB; }
        .f-inp {
          width: 100%;
          padding: 14px 14px 14px 43px;
          border: 1.5px solid #E2E8F0;
          border-radius: 12px;
          font-size: 14px; color: #0F172A;
          background: #F8FAFC;
          font-family: inherit; outline: none;
          transition: border-color .2s, box-shadow .2s, background .2s;
        }
        .f-inp::placeholder { color: #C8D5E0; }
        .f-inp:focus { border-color: #5A57FB; box-shadow: 0 0 0 3px rgba(90,87,251,.1); background: #fff; }
        .f-inp.eye-pad { padding-right: 43px; }

        /* button */
        .f-btn {
          width: 100%; margin-top: 6px;
          padding: 15px;
          border: none; border-radius: 12px;
          font-size: 14.5px; font-weight: 800; letter-spacing: .2px;
          color: #fff; cursor: pointer;
          font-family: inherit;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: transform .18s, box-shadow .18s;
          box-shadow: 0 6px 22px rgba(90,87,251,.35);
        }
        .f-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(90,87,251,.4); }
        .f-btn:active:not(:disabled) { transform: translateY(0); }
        .f-btn:disabled { opacity: .6; cursor: not-allowed; }

        .spin-ico {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,.3); border-top-color: #fff;
          border-radius: 50%; animation: spin .7s linear infinite; display: inline-block;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* divider */
        .divider { display: flex; align-items: center; gap: 12px; margin: 22px 0 18px; }
        .divider::before, .divider::after { content:""; flex:1; height:1px; background:#F1F5F9; }
        .divider span { font-size: 10.5px; font-weight: 700; letter-spacing: 1px; color: #CBD5E1; }

        /* footer */
        .f-footer { text-align: center; font-size: 12px; color: #94A3B8; line-height: 1.6; }
        .f-footer a { color: #5A57FB; font-weight: 600; text-decoration: none; }

        /* responsive */
        @media (max-width: 820px) {
          html, body { overflow: auto; }
          .pg { height: auto; }
          .pg-l  { display: none; }
          .pg-r  { width: 100%; min-height: 100vh; }
        }
      `}</style>

      <div className="pg">

        {/* ══ LEFT ══ */}
        <div className="pg-l">
          <div className="ring r1" /><div className="ring r2" /><div className="ring r3" />

          {/* Big logo — no text next to it */}
          <div className="logo-area">
            <img
              src="/asets/images/logo.png"
              alt="Viralon"
              className="logo-img"
              onError={e => { e.target.style.display = "none"; }}
            />
          </div>

          {/* Hero */}
          <div className="hero">
            <div className="hero-label">Client Portal</div>
            <h1 className="hero-title">
              Your brand.<br />
              <span className="hl">Your results.</span><br />
              All in one place.
            </h1>
            <p className="hero-sub">
              Track every deliverable, approve content, and stay in sync with your Viralon team — in real time.
            </p>
          </div>

          {/* Features 2-column */}
          <div className="feats">
            {[
              "Real-time approvals",
              "Analytics overview",
              "Content calendar",
              "Team messaging",
              "Asset downloads",
              "Task requests",
            ].map(t => (
              <div key={t} className="feat">
                <span className="feat-dot" />
                <span className="feat-text">{t}</span>
              </div>
            ))}
          </div>

          {/* Brand chip */}
          <div className="brand-chip">
            <span className="bdot" style={{ background: bc, boxShadow: `0 0 6px ${bc}` }} />
            <span>Signing in as <strong>{brandName}</strong></span>
          </div>
        </div>

        {/* ══ RIGHT ══ */}
        <div className="pg-r">
          <div className="form-box">

            {/* Small logo mark */}
            <div className="form-logo">
              <img
                src="/asets/images/logo.png"
                alt="Viralon"
                className="form-logo-img"
                onError={e => { e.target.style.display = "none"; }}
              />
              <div className="form-logo-dot" />
              <span className="form-logo-label">Client Portal</span>
            </div>

            <div className="f-heading">Welcome back</div>
            <div className="f-sub">
              Sign in to your <strong>{brandName}</strong> dashboard
            </div>

            {error && (
              <div className="f-err">
                <i className="bi bi-exclamation-circle-fill" style={{ fontSize: 14, flexShrink: 0 }} />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="field">
                <label className="f-label">Email address</label>
                <div className="f-shell">
                  <i className="bi bi-envelope-fill f-ico" />
                  <input
                    className="f-inp"
                    type="email"
                    placeholder="you@company.com"
                    value={form.email}
                    onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                    required autoFocus
                  />
                </div>
              </div>

              <div className="field">
                <label className="f-label">Password</label>
                <div className="f-shell">
                  <i className="bi bi-lock-fill f-ico" />
                  <input
                    className="f-inp eye-pad"
                    type={showPass ? "text" : "password"}
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    required
                  />
                  <i
                    className={`bi ${showPass ? "bi-eye-slash-fill" : "bi-eye-fill"} f-ico f-eye`}
                    onClick={() => setShowPass(v => !v)}
                  />
                </div>
              </div>

              <button
                className="f-btn"
                type="submit"
                disabled={loading}
                style={{ background: `linear-gradient(135deg, ${bc} 0%, ${bc}dd 100%)` }}
              >
                {loading
                  ? <><span className="spin-ico" />Signing in…</>
                  : <>Sign in to portal <i className="bi bi-arrow-right" style={{ fontSize: 14 }} /></>
                }
              </button>
            </form>

            <div className="divider"><span>SECURE · ENCRYPTED</span></div>

            <div className="f-footer">
              Having trouble?{" "}
              <a href="mailto:info@viralon.in">Contact info@viralon.in</a>
              <br />
              <span style={{ fontSize: 11, color: "#CBD5E1" }}>
                © {new Date().getFullYear()} Viralon · All rights reserved
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

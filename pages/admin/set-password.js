// pages/admin/set-password.js
import Head from "next/head";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { toast } from "react-toastify";

export default function SetPassword() {
  const router = useRouter();
  const { token } = router.query;

  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [showPw,    setShowPw]    = useState(false);
  const [showCf,    setShowCf]    = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [done,      setDone]      = useState(false);

  const strength = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 6)  s++;
    if (password.length >= 10) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();

  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong", "Very Strong"][strength];
  const strengthColor = ["", "#EF4444", "#F59E0B", "#3B82F6", "#10B981", "#059669"][strength];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) return toast.error("Invalid invitation link");
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    if (password !== confirm)  return toast.error("Passwords do not match");

    setLoading(true);
    try {
      const res  = await fetch("/api/admin-users/set-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (data.success) {
        setDone(true);
        toast.success("Password set! Redirecting to login…");
        setTimeout(() => router.push("/dashboard/admin-login"), 2000);
      } else {
        toast.error(data.message || "Failed to set password");
      }
    } catch { toast.error("Network error"); }
    finally { setLoading(false); }
  };

  return (
    <>
      <Head>
        <title>Set Your Password — Viralon</title>
        <style>{`
          * { box-sizing: border-box; }
          body { margin: 0; background: linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 50%, #EDE9FE 100%);
                 min-height: 100vh; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; }
          .sp-input { width:100%; padding:11px 42px 11px 14px; border-radius:10px;
                      border:1.5px solid #E5E7EB; font-size:14px; outline:none; transition:border .15s; }
          .sp-input:focus { border-color:#6366F1; box-shadow: 0 0 0 3px rgba(99,102,241,.12); }
          .sp-btn { width:100%; padding:13px; border:none; border-radius:12px; cursor:pointer;
                    font-size:15px; font-weight:700; transition:all .2s; }
          .sp-btn:disabled { opacity:.6; cursor:default; }
          .eye-btn { position:absolute; right:12px; top:50%; transform:translateY(-50%);
                     background:none; border:none; cursor:pointer; color:#9CA3AF; padding:0; font-size:15px; }
          .strength-bar { height:4px; border-radius:4px; transition:width .3s, background .3s; }
        `}</style>
      </Head>

      <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:"24px 16px" }}>
        <div style={{ width:"100%", maxWidth:420 }}>

          {/* Logo */}
          <div style={{ textAlign:"center", marginBottom:28 }}>
            <div style={{ width:52, height:52, borderRadius:14, background:"linear-gradient(135deg,#4F46E5,#818CF8)",
              display:"inline-flex", alignItems:"center", justifyContent:"center", marginBottom:12,
              boxShadow:"0 8px 24px rgba(99,102,241,.3)" }}>
              <i className="bi bi-shield-lock-fill" style={{ fontSize:24, color:"#fff" }} />
            </div>
            <h2 style={{ margin:0, fontSize:24, fontWeight:800, color:"#111827" }}>Set Your Password</h2>
            <p style={{ margin:"6px 0 0", fontSize:14, color:"#6B7280" }}>Create a secure password for your Viralon account</p>
          </div>

          {/* Card */}
          <div style={{ background:"#fff", borderRadius:20, padding:"32px 28px",
            boxShadow:"0 8px 40px rgba(99,102,241,.12), 0 1px 0 rgba(0,0,0,.04)" }}>

            {done ? (
              <div style={{ textAlign:"center", padding:"8px 0" }}>
                <div style={{ width:64, height:64, borderRadius:"50%", background:"#DCFCE7",
                  display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px" }}>
                  <i className="bi bi-check-circle-fill" style={{ fontSize:32, color:"#22C55E" }} />
                </div>
                <h3 style={{ margin:0, fontSize:18, fontWeight:800, color:"#111827" }}>Password Set!</h3>
                <p style={{ margin:"8px 0 0", fontSize:14, color:"#6B7280" }}>Redirecting you to login…</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {/* New Password */}
                <div style={{ marginBottom:18 }}>
                  <label style={{ fontSize:13, fontWeight:700, color:"#374151", display:"block", marginBottom:6 }}>
                    New Password
                  </label>
                  <div style={{ position:"relative" }}>
                    <input
                      type={showPw ? "text" : "password"}
                      className="sp-input"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      required
                      autoFocus
                    />
                    <button type="button" className="eye-btn" onClick={() => setShowPw(!showPw)}>
                      <i className={`bi bi-eye${showPw ? "-slash" : ""}`} />
                    </button>
                  </div>

                  {/* Strength bar */}
                  {password && (
                    <div style={{ marginTop:8 }}>
                      <div style={{ height:4, background:"#F3F4F6", borderRadius:4, overflow:"hidden" }}>
                        <div className="strength-bar" style={{ width:`${(strength / 5) * 100}%`, background: strengthColor }} />
                      </div>
                      <span style={{ fontSize:11, color: strengthColor, fontWeight:700, marginTop:4, display:"block" }}>
                        {strengthLabel}
                      </span>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div style={{ marginBottom:24 }}>
                  <label style={{ fontSize:13, fontWeight:700, color:"#374151", display:"block", marginBottom:6 }}>
                    Confirm Password
                  </label>
                  <div style={{ position:"relative" }}>
                    <input
                      type={showCf ? "text" : "password"}
                      className="sp-input"
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="Re-enter your password"
                      required
                      style={{ borderColor: confirm && confirm !== password ? "#EF4444" : "" }}
                    />
                    <button type="button" className="eye-btn" onClick={() => setShowCf(!showCf)}>
                      <i className={`bi bi-eye${showCf ? "-slash" : ""}`} />
                    </button>
                  </div>
                  {confirm && confirm !== password && (
                    <span style={{ fontSize:11, color:"#EF4444", fontWeight:600, marginTop:4, display:"block" }}>
                      Passwords do not match
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  className="sp-btn"
                  disabled={loading || !token}
                  style={{ background:"linear-gradient(135deg,#4F46E5,#818CF8)", color:"#fff",
                    boxShadow:"0 4px 14px rgba(99,102,241,.35)" }}
                >
                  {loading
                    ? <><span className="spinner-border spinner-border-sm" style={{ marginRight:8 }} />Setting password…</>
                    : "Set Password"}
                </button>
              </form>
            )}
          </div>

          <p style={{ textAlign:"center", marginTop:20, fontSize:13, color:"#9CA3AF" }}>
            Already have an account?{" "}
            <a href="/dashboard/admin-login" style={{ color:"#6366F1", fontWeight:700, textDecoration:"none" }}>
              Login
            </a>
          </p>
        </div>
      </div>
    </>
  );
}

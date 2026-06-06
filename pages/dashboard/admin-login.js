// pages/dashboard/admin-login.js  — Login for invited admin users
import Head from "next/head";
import { useState } from "react";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import Link from "next/link";

export default function AdminUserLogin() {
  const router = useRouter();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error("Please enter email and password");
    setLoading(true);
    try {
      const res  = await fetch("/api/admin-users/login", {
        method:      "POST",
        headers:     { "Content-Type": "application/json" },
        credentials: "include",
        body:        JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Welcome back, ${data.user.name}!`);
        setTimeout(() => router.push("/dashboard/admin-user/home"), 800);
      } else {
        toast.error(data.message || "Login failed");
      }
    } catch { toast.error("Network error"); }
    finally { setLoading(false); }
  };

  return (
    <>
      <Head>
        <title>Admin Login — Viralon HQ</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
        <style>{`
          * { box-sizing: border-box; }
          body { margin:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;
                 background: linear-gradient(135deg,#EEF2FF 0%,#F5F3FF 50%,#EDE9FE 100%); min-height:100vh; }
          .al-input { width:100%; padding:11px 42px 11px 40px; border-radius:10px;
                      border:1.5px solid #E5E7EB; font-size:14px; outline:none; transition:border .15s; }
          .al-input:focus { border-color:#6366F1; box-shadow:0 0 0 3px rgba(99,102,241,.12); }
          .al-btn { width:100%; padding:13px; border:none; border-radius:12px; cursor:pointer;
                    font-size:15px; font-weight:700; transition:all .2s; }
          .al-btn:disabled { opacity:.6; cursor:default; }
        `}</style>
      </Head>

      <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:"24px 16px" }}>
        <div style={{ width:"100%", maxWidth:400 }}>

          {/* Logo */}
          <div style={{ textAlign:"center", marginBottom:28 }}>
            <div style={{ width:56, height:56, borderRadius:16, background:"linear-gradient(135deg,#4F46E5,#818CF8)",
              display:"inline-flex", alignItems:"center", justifyContent:"center", marginBottom:14,
              boxShadow:"0 8px 24px rgba(99,102,241,.3)" }}>
              <i className="bi bi-shield-fill-check" style={{ fontSize:26, color:"#fff" }} />
            </div>
            <h2 style={{ margin:0, fontSize:26, fontWeight:800, color:"#111827" }}>Viralon HQ</h2>
            <p style={{ margin:"6px 0 0", fontSize:14, color:"#6B7280" }}>Sign in to your admin account</p>
          </div>

          {/* Card */}
          <div style={{ background:"#fff", borderRadius:20, padding:"32px 28px",
            boxShadow:"0 8px 40px rgba(99,102,241,.12), 0 1px 0 rgba(0,0,0,.04)" }}>

            <form onSubmit={handleLogin}>
              {/* Email */}
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:13, fontWeight:700, color:"#374151", display:"block", marginBottom:6 }}>
                  Email Address
                </label>
                <div style={{ position:"relative" }}>
                  <i className="bi bi-envelope" style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)",
                    fontSize:14, color:"#9CA3AF" }} />
                  <input
                    type="email"
                    className="al-input"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* Password */}
              <div style={{ marginBottom:24 }}>
                <label style={{ fontSize:13, fontWeight:700, color:"#374151", display:"block", marginBottom:6 }}>
                  Password
                </label>
                <div style={{ position:"relative" }}>
                  <i className="bi bi-lock" style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)",
                    fontSize:14, color:"#9CA3AF" }} />
                  <input
                    type={showPw ? "text" : "password"}
                    className="al-input"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={{ paddingRight:42 }}
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)",
                      background:"none", border:"none", cursor:"pointer", color:"#9CA3AF", fontSize:15 }}>
                    <i className={`bi bi-eye${showPw ? "-slash" : ""}`} />
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="al-btn"
                disabled={loading}
                style={{ background:"linear-gradient(135deg,#4F46E5,#818CF8)", color:"#fff",
                  boxShadow:"0 4px 14px rgba(99,102,241,.35)" }}
              >
                {loading
                  ? <><span className="spinner-border spinner-border-sm" style={{ marginRight:8 }} />Signing in…</>
                  : <><i className="bi bi-box-arrow-in-right" style={{ marginRight:8 }} />Sign In</>}
              </button>
            </form>
          </div>

          <p style={{ textAlign:"center", marginTop:16, fontSize:13, color:"#9CA3AF" }}>
            Super admin?{" "}
            <Link href="/dashboard/login" style={{ color:"#6366F1", fontWeight:700, textDecoration:"none" }}>
              Admin login
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}

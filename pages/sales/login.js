// pages/sales/login.js — where an onboarded salesperson signs in.
// Same look as the admin login, but it authenticates against the CRM's own
// sales team, not the payroll admin.
import { useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";

const FIRST = [
  ["leads", "/dashboard/website/leads"],
  ["proposals", "/dashboard/website/proposals"],
  ["invoices", "/dashboard/website/invoices"],
  ["leadProfile", "/dashboard/website/lead-profile"],
  ["salesTeam", "/dashboard/website/sales-team"],
  ["home", "/dashboard/website"],
];

export default function SalesLogin() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const r = await fetch("/api/sales/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.message || "Could not sign you in");
      // Land on the first thing this person is actually allowed to open.
      const go = FIRST.find(([k]) => j.perms?.[k]);
      router.push(go ? go[1] : "/dashboard/website/leads");
    } catch (e2) { setErr(e2.message); setBusy(false); }
  };

  return (
    <>
      <Head>
        <title>Sales Login — Viralon</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" />
      </Head>
      <div style={S.wrap}>
        <div style={S.dots} />
        <form onSubmit={submit} style={S.card}>
          <div style={{ textAlign: "center", marginBottom: 22 }}>
            <img src="/assets/images/logo.png" alt="Viralon" width={100} />
            <div style={{ marginTop: 14, fontSize: 17, fontWeight: 800, color: "#0F172A" }}>Sales CRM</div>
            <div style={{ fontSize: 12.5, color: "#94A3B8", marginTop: 3 }}>Sign in with the login the admin sent you.</div>
          </div>

          <div style={{ position: "relative", marginBottom: 14 }}>
            <i className="bi bi-person" style={S.icon} />
            <input style={S.input} placeholder="Username" value={username} autoFocus
                   onChange={(e) => setUsername(e.target.value)} />
          </div>

          <div style={{ position: "relative", marginBottom: 14 }}>
            <i className="bi bi-lock" style={S.icon} />
            <input style={S.input} placeholder="Password" type={show ? "text" : "password"} value={password}
                   onChange={(e) => setPassword(e.target.value)} />
            <button type="button" onClick={() => setShow((v) => !v)} style={S.eye}>
              <i className={`bi ${show ? "bi-eye-slash" : "bi-eye"}`} />
            </button>
          </div>

          {err ? (
            <div style={S.err}><i className="bi bi-exclamation-circle-fill" /> {err}</div>
          ) : null}

          <button type="submit" disabled={busy} style={{ ...S.btn, opacity: busy ? 0.7 : 1 }}>
            {busy ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </>
  );
}

const S = {
  wrap: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
          padding: "24px 16px", background: "#fff", position: "relative", overflow: "hidden",
          fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif" },
  dots: { position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.5,
          backgroundImage: "radial-gradient(#E5E7EB 1px, transparent 1px)", backgroundSize: "26px 26px",
          WebkitMaskImage: "radial-gradient(circle at 50% 40%, #000 0%, transparent 72%)",
          maskImage: "radial-gradient(circle at 50% 40%, #000 0%, transparent 72%)" },
  card: { position: "relative", zIndex: 2, width: "100%", maxWidth: 398, background: "#fff",
          borderRadius: 22, padding: "36px 32px 30px", border: "1px solid #F0F0F8",
          boxShadow: "0 4px 16px rgba(15,23,42,.04), 0 24px 60px rgba(79,70,229,.14)" },
  input: { width: "100%", padding: "12px 40px 12px 42px", borderRadius: 12, border: "1.5px solid #E5E7EB",
           fontSize: 14, outline: "none", background: "#F9FAFB", color: "#111827" },
  icon: { position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#9CA3AF" },
  eye: { position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", background: "none",
         border: "none", cursor: "pointer", color: "#9CA3AF", fontSize: 14, padding: 4 },
  err: { background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C", fontSize: 12.5,
         borderRadius: 10, padding: "9px 12px", marginBottom: 12, display: "flex", gap: 7, alignItems: "center" },
  btn: { width: "100%", padding: 13, border: "none", borderRadius: 12, cursor: "pointer", fontSize: 14.5,
         fontWeight: 700, color: "#fff", marginTop: 6,
         background: "linear-gradient(145deg,#6366F1 0%,#4F46E5 60%,#7C3AED 100%)",
         boxShadow: "0 8px 22px rgba(79,70,229,.3)" },
};

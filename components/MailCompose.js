// components/MailCompose.js — the compose box a document goes out from.
// It opens on the draft the server builds, lets the sender change the address,
// the subject and the body, shows the PDF that will ride along, and sends.
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function MailCompose({ url, kind, markSent, title, extra, onPreview, onClose, onSent }) {
  const [f, setF] = useState({ to: "", subject: "", body: "" });
  const [file, setFile] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);

  // Anything the caller needs the server to know about — an invoice's payment
  // record, say — rides along on the draft request and on the send.
  const qs = Object.entries(extra || {})
    .map(([k, v]) => `&${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("");

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const r = await fetch(`${url}${url.includes("?") ? "&" : "?"}kind=${kind}${qs}`, { credentials: "include" });
        const j = await r.json();
        if (!j.success) throw new Error(j.message || "Could not build the mail");
        if (dead) return;
        setF({ to: j.draft.to || "", subject: j.draft.subject || "", body: j.draft.body || "" });
        setFile(j.draft.fileName || "");
      } catch (e) {
        toast.error(e.message);
        onClose?.();
      }
      if (!dead) setLoading(false);
    })();
    return () => { dead = true; };
  }, [url, kind, qs]);

  useEffect(() => {
    const esc = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", esc); document.body.style.overflow = ""; };
  }, [onClose]);

  const send = async () => {
    if (!f.to.trim()) return toast.error("Add an address to send it to");
    setBusy(true);
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ kind, markSent: !!markSent, ...(extra || {}), ...f }),
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.message || "The mail did not go out");
      toast.success("Sent");
      onSent?.();
      onClose?.();
    } catch (e) {
      toast.error(e.message);
    }
    setBusy(false);
  };

  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  return (
    <div onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
         style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.45)", zIndex: 2400,
                  display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "28px 16px", overflowY: "auto" }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 760,
                    boxShadow: "0 24px 60px rgba(15,23,42,.28)", overflow: "hidden" }}>
        <div style={{ padding: "15px 20px", borderBottom: "1px solid #F1F1FA", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={S.icon}><i className="bi bi-envelope-paper-fill" style={{ fontSize: 14 }} /></div>
          <span style={{ fontWeight: 800, fontSize: 14, color: "#0F172A", flex: 1 }}>{title || "Send it to the client"}</span>
          <button onClick={onClose} style={S.iconBtn} title="Close"><i className="bi bi-x-lg" style={{ fontSize: 12 }} /></button>
        </div>

        <div className="lp-scroll" style={{ padding: 20, maxHeight: "calc(100vh - 190px)", overflowY: "auto" }}>
          {loading ? (
            <div style={{ padding: 30, textAlign: "center", color: "#94A3B8", fontSize: 13 }}>Building the mail…</div>
          ) : (
            <>
              <Row label="To">
                <input className="lp-in" style={S.input} value={f.to} onChange={(e) => set("to", e.target.value)}
                       placeholder="client@company.com" />
              </Row>
              <Row label="Subject">
                <input className="lp-in" style={S.input} value={f.subject} onChange={(e) => set("subject", e.target.value)} />
              </Row>

              <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "4px 0 10px" }}>
                <div style={S.label}>Message</div>
                <div style={{ flex: 1 }} />
                <button onClick={() => setPreview((v) => !v)} style={{ ...S.miniBtn, height: 26 }}>
                  {preview ? "Edit" : "Preview"}
                </button>
              </div>

              {preview ? (
                <div style={{ border: "1px solid #F0F0F8", borderRadius: 12, padding: 16, background: "#FAFAFD",
                              fontSize: 14, lineHeight: 1.65, color: "#0F172A", minHeight: 200 }}
                     dangerouslySetInnerHTML={{ __html: f.body }} />
              ) : (
                <textarea className="lp-in" value={f.body} onChange={(e) => set("body", e.target.value)}
                          style={{ ...S.input, height: 300, padding: "11px 13px", resize: "vertical",
                                   fontFamily: "ui-monospace,Menlo,Consolas,monospace", fontSize: 12.5, lineHeight: 1.6 }} />
              )}
              <div style={{ fontSize: 11.5, color: "#94A3B8", marginTop: 6 }}>
                Plain HTML — it goes out inside the Viralon mail template, logo and all.
              </div>

              {file ? (
                <div style={{ marginTop: 14, display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 12px",
                              borderRadius: 10, background: "#EEF2FF", color: "#4338CA", fontSize: 12.5, fontWeight: 700 }}>
                  <i className="bi bi-file-earmark-pdf-fill" /> {file}
                  <span style={{ color: "#818CF8", fontWeight: 600 }}>attached</span>
                  {onPreview ? (
                    <button onClick={onPreview} style={{ ...S.miniBtn, height: 26, padding: "0 10px", fontSize: 11.5 }}
                            title="See the document that will be attached">
                      <i className="bi bi-eye-fill" style={{ fontSize: 11, marginRight: 5 }} /> Preview
                    </button>
                  ) : null}
                </div>
              ) : null}
            </>
          )}
        </div>

        <div style={{ padding: "13px 20px", borderTop: "1px solid #F1F1FA", display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} disabled={busy} style={S.miniBtn}>Cancel</button>
          <button onClick={send} disabled={busy || loading} style={S.primaryBtn}>
            <i className="bi bi-send-fill" style={{ fontSize: 12 }} /> {busy ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={S.label}>{label}</div>
      {children}
    </div>
  );
}

const S = {
  label: { fontSize: 11, fontWeight: 800, color: "#64748B", letterSpacing: .3, textTransform: "uppercase", marginBottom: 6 },
  input: {
    width: "100%", height: 38, borderRadius: 10, border: "1px solid #E6E6F2", padding: "0 12px",
    fontSize: 13, color: "#0F172A", background: "#fff", outline: "none",
  },
  icon: {
    width: 30, height: 30, borderRadius: 9, display: "grid", placeItems: "center",
    background: "#EEF2FF", color: "#4338CA",
  },
  iconBtn: {
    width: 30, height: 30, borderRadius: 9, border: "1px solid #E6E6F2", background: "#fff",
    color: "#475569", cursor: "pointer", display: "grid", placeItems: "center",
  },
  miniBtn: {
    height: 34, padding: "0 13px", borderRadius: 10, border: "1px solid #E6E6F2", background: "#fff",
    color: "#334155", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
  },
  primaryBtn: {
    height: 34, padding: "0 15px", borderRadius: 10, border: "none",
    background: "linear-gradient(120deg,#4338CA,#6366F1 70%)", color: "#fff",
    fontSize: 12.5, fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
  },
};

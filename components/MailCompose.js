// components/MailCompose.js — the compose box a document goes out from.
// It opens on the draft the server builds, lets the sender change the address,
// the subject and the wording, shows the PDF that will ride along, and sends.
//
// The people who send these are salespeople, so nothing here asks anyone to
// write HTML: the draft arrives as parts (utils/docMail.js), the prose ones
// open in the same rich editor the rest of the dashboard uses, and the figures
// are shown read-only so the mail can never disagree with the attached PDF.
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import MailAttach from "@/components/MailAttach";
import RichFieldEditor from "@/components/RichFieldEditor";

export default function MailCompose({ url, kind, markSent, title, extra, onPreview, onClose, onSent }) {
  const [f, setF] = useState({ to: "", subject: "" });
  const [parts, setParts] = useState([]);
  const [file, setFile] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const [files, setFiles] = useState([]);

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
        setF({ to: j.draft.to || "", subject: j.draft.subject || "" });
        // An older route that only knows about `body` still composes, as one
        // editable block.
        setParts(
          Array.isArray(j.draft.parts) && j.draft.parts.length
            ? j.draft.parts
            : [{ k: "body", label: "Message", html: j.draft.body || "" }]
        );
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

  // What actually goes out: the parts in the order the server put them in.
  const body = useMemo(() => parts.map((p) => p.html || "").join("\n"), [parts]);

  const setPart = (i, html) => setParts((ps) => ps.map((p, n) => (n === i ? { ...p, html } : p)));

  const send = async () => {
    if (!f.to.trim()) return toast.error("Add an address to send it to");
    setBusy(true);
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ kind, markSent: !!markSent, ...(extra || {}), ...f, body, files }),
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
                  {preview ? "Back to editing" : "Preview"}
                </button>
              </div>

              {preview ? (
                <div style={{ border: "1px solid #F0F0F8", borderRadius: 12, padding: 16, background: "#FAFAFD",
                              fontSize: 14, lineHeight: 1.65, color: "#0F172A", minHeight: 200 }}
                     dangerouslySetInnerHTML={{ __html: body }} />
              ) : (
                parts.map((p, i) =>
                  p.lock ? (
                    // The numbers come straight off the document. Showing them
                    // here is the point — they just are not typed again.
                    <div key={p.k || i} style={{ marginBottom: 14 }}>
                      <div style={S.partLabel}>
                        {p.label}
                        <span style={S.lockTag}><i className="bi bi-lock-fill" style={{ fontSize: 9 }} /> filled in for you</span>
                      </div>
                      <div style={{ border: "1px solid #F0F0F8", borderRadius: 12, padding: "2px 14px", background: "#FAFAFD",
                                    fontSize: 13.5, lineHeight: 1.6, color: "#334155" }}
                           dangerouslySetInnerHTML={{ __html: p.html }} />
                    </div>
                  ) : (
                    <div key={p.k || i} style={{ marginBottom: 14 }}>
                      <div style={S.partLabel}>{p.label}</div>
                      <RichFieldEditor value={p.html} onChange={(html) => setPart(i, html)} minHeight={90} withLink />
                    </div>
                  )
                )
              )}
              <div style={{ fontSize: 11.5, color: "#94A3B8", marginTop: 6 }}>
                Write it the way you would say it — it goes out inside the Viralon mail template, logo and all.
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

              <MailAttach files={files} setFiles={setFiles} />
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
  partLabel: {
    fontSize: 11, fontWeight: 800, color: "#94A3B8", letterSpacing: .3, textTransform: "uppercase",
    marginBottom: 6, display: "flex", alignItems: "center", gap: 7,
  },
  lockTag: {
    display: "inline-flex", alignItems: "center", gap: 4, padding: "1px 7px", borderRadius: 20,
    background: "#F1F5F9", color: "#64748B", fontSize: 9.5, fontWeight: 700, letterSpacing: .2, textTransform: "none",
  },
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

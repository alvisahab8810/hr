// components/NewsletterCompose.js — the compose box the newsletter goes out
// from. Same box as the one a proposal is mailed with (components/MailCompose),
// with the one thing a newsletter needs instead of a single address: who it is
// going to — everyone on the list, or only the people the page is showing.
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { confirmDialog } from "./ConfirmDialog";

// `only` is one subscriber's address — the box then writes to that person
// alone, with no way to pick the whole list by mistake.
export default function NewsletterCompose({ shown = [], only = "", onClose, onSent }) {
  const [f, setF] = useState({ subject: "", body: "" });
  const [audience, setAudience] = useState(only || shown.length ? "shown" : "all");
  const picked = only ? [only] : shown;   // what "on screen" means for this box
  const [testTo, setTestTo] = useState("");
  const [total, setTotal] = useState(null);      // everyone subscribed, per the server
  const [templates, setTemplates] = useState([]);
  const [tpl, setTpl] = useState("blank");
  const [files, setFiles] = useState([]);        // { filename, type, size, data }
  const filePick = useRef(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);

  const URL = "/api/admin/newsletter/mail";

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const r = await fetch(URL, { credentials: "include" });
        const j = await r.json();
        if (!j.success) throw new Error(j.message || "Could not build the mail");
        if (dead) return;
        setF({ subject: j.draft.subject || "", body: j.draft.body || "" });
        setTemplates(j.draft.templates || []);
        setTotal(j.subscribed ?? 0);
      } catch (e) {
        toast.error(e.message);
        onClose?.();
      }
      if (!dead) setLoading(false);
    })();
    return () => { dead = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const esc = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", esc); document.body.style.overflow = ""; };
  }, [onClose]);

  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const count = audience === "shown" ? picked.length : (total ?? 0);

  // Picking a template fills the subject and the message; it is a starting
  // point, everything in it is still editable below.
  const useTemplate = (t) => {
    setTpl(t.id);
    setF({ subject: t.subject, body: t.body });
    setPreview(false);
  };

  const addFiles = async (picked) => {
    const room = 5 - files.length;
    if (room <= 0) return toast.error("Five files is the limit for one mail");
    const chosen = Array.from(picked).slice(0, room);
    const read = await Promise.all(chosen.map((file) => new Promise((done) => {
      const fr = new FileReader();
      fr.onload = () => done({ filename: file.name, type: file.type, size: file.size, data: String(fr.result) });
      fr.onerror = () => done(null);
      fr.readAsDataURL(file);
    })));
    const good = read.filter(Boolean);
    const bytes = [...files, ...good].reduce((n, x) => n + x.size, 0);
    if (bytes > 8 * 1024 * 1024) return toast.error("The files add up to more than 8 MB — send a link instead");
    setFiles((list) => [...list, ...good]);
  };

  const post = async (payload) => {
    const r = await fetch(URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        ...f,
        attachments: files.map(({ filename, type, data }) => ({ filename, type, data })),
        ...payload,
      }),
    });
    const j = await r.json();
    if (!j.success) throw new Error(j.message || "The mail did not go out");
    return j;
  };

  // A test copy first is the whole point of a compose box — it goes to one
  // address, list or no list, and nobody else sees it.
  const sendTest = async () => {
    if (!testTo.trim()) return toast.error("Add an address to send the test to");
    setBusy(true);
    try {
      await post({ testTo: testTo.trim() });
      toast.success(`Test sent to ${testTo.trim()}`);
    } catch (e) { toast.error(e.message); }
    setBusy(false);
  };

  const send = async () => {
    if (!f.subject.trim()) return toast.error("Give the mail a subject");
    if (!count) return toast.error("Nobody on the list to send this to");
    if (!(await confirmDialog({
      title: only ? `Send this to ${only}?` : `Send this to ${count} subscriber${count === 1 ? "" : "s"}?`,
      message: "It goes out straight away and cannot be pulled back.",
      confirmText: "Yes, send it",
      tone: "danger",
    }))) return;

    setBusy(true);
    try {
      const j = await post(audience === "shown" ? { emails: picked } : {});
      toast.success(
        `Sent to ${j.sent}${j.failed ? ` · ${j.failed} failed` : ""}` +
        (j.skipped ? ` · ${j.skipped} left for the next send` : "")
      );
      onSent?.();
      onClose?.();
    } catch (e) { toast.error(e.message); }
    setBusy(false);
  };

  return (
    <div onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
         style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.45)", zIndex: 2400,
                  display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "28px 16px", overflowY: "auto" }}>
      <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 760,
                    boxShadow: "0 24px 60px rgba(15,23,42,.28)", overflow: "hidden" }}>
        <div style={{ padding: "15px 20px", borderBottom: "1px solid #F1F1FA", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={S.icon}><i className="bi bi-send-fill" style={{ fontSize: 14 }} /></div>
          <span style={{ fontWeight: 800, fontSize: 14, color: "#0F172A", flex: 1 }}>
            {only ? `Write to ${only}` : "Write the newsletter"}
          </span>
          <button onClick={onClose} style={S.iconBtn} title="Close"><i className="bi bi-x-lg" style={{ fontSize: 12 }} /></button>
        </div>

        <div className="lp-scroll" style={{ padding: 20, maxHeight: "calc(100vh - 190px)", overflowY: "auto" }}>
          {loading ? (
            <div style={{ padding: 30, textAlign: "center", color: "#94A3B8", fontSize: 13 }}>Building the mail…</div>
          ) : (
            <>
              <div style={{ marginBottom: 12 }}>
                <div style={S.label}>Sending to</div>
                {only ? (
                  <div style={{ ...S.pick(true), display: "inline-flex", alignItems: "center", gap: 7 }}>
                    <i className="bi bi-person-fill" /> {only}
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button onClick={() => setAudience("all")} style={S.pick(audience === "all")}>
                      Everyone subscribed ({total ?? 0})
                    </button>
                    <button onClick={() => setAudience("shown")} disabled={!shown.length} style={{
                      ...S.pick(audience === "shown"), opacity: shown.length ? 1 : .5,
                      cursor: shown.length ? "pointer" : "not-allowed",
                    }}>
                      Only what&apos;s on screen ({shown.length})
                    </button>
                  </div>
                )}
                <div style={{ fontSize: 11.5, color: "#94A3B8", marginTop: 6 }}>
                  Anyone who unsubscribed is left out, whichever one is picked.
                </div>
              </div>

              {templates.length > 1 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={S.label}>Start from</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {templates.map((t) => (
                      <button key={t.id} onClick={() => useTemplate(t)} style={S.pick(tpl === t.id)}>
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginBottom: 12 }}>
                <div style={S.label}>Subject</div>
                <input className="lp-in" style={S.input} value={f.subject} onChange={(e) => set("subject", e.target.value)}
                       placeholder="What lands in their inbox" />
              </div>

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
                Plain HTML — it goes out inside the Viralon mail template, logo and unsubscribe link and all.
              </div>

              {/* ── Attachments ── */}
              <div style={{ marginTop: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={() => filePick.current?.click()} style={S.miniBtn}>
                    <i className="bi bi-paperclip" style={{ marginRight: 6 }} /> Attach a file
                  </button>
                  <span style={{ fontSize: 11.5, color: "#94A3B8" }}>
                    Up to five files, 8 MB in all — a PDF, a deck, an image.
                  </span>
                  <input ref={filePick} type="file" multiple hidden
                         onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
                </div>
                {files.length ? (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                    {files.map((x, i) => (
                      <span key={`${x.filename}-${i}`} style={{
                        display: "inline-flex", alignItems: "center", gap: 8, padding: "7px 10px",
                        borderRadius: 10, background: "#EEF2FF", color: "#4338CA", fontSize: 12.5, fontWeight: 700,
                      }}>
                        <i className="bi bi-paperclip" /> {x.filename}
                        <span style={{ color: "#818CF8", fontWeight: 600 }}>{Math.max(1, Math.round(x.size / 1024))} KB</span>
                        <button onClick={() => setFiles((l) => l.filter((_, k) => k !== i))}
                                style={{ border: "none", background: "none", color: "#6366F1", cursor: "pointer", padding: 0 }}
                                title="Remove">
                          <i className="bi bi-x-lg" style={{ fontSize: 11 }} />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <div style={{ marginTop: 16, padding: 13, borderRadius: 12, background: "#FAFAFD", border: "1px solid #F0F0F8",
                            display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <i className="bi bi-eyeglasses" style={{ color: "#6366F1" }} />
                <span style={{ fontSize: 12.5, fontWeight: 700, color: "#475569" }}>Send yourself a test first</span>
                <input className="lp-in" value={testTo} onChange={(e) => setTestTo(e.target.value)}
                       placeholder="you@viralon.in" style={{ ...S.input, flex: "1 1 200px", height: 34 }} />
                <button onClick={sendTest} disabled={busy} style={S.miniBtn}>Send test</button>
              </div>
            </>
          )}
        </div>

        <div style={{ padding: "13px 20px", borderTop: "1px solid #F1F1FA", display: "flex", gap: 8, alignItems: "center", justifyContent: "flex-end" }}>
          <span style={{ marginRight: "auto", fontSize: 12.5, color: "#64748B", fontWeight: 600 }}>
            {loading ? "" : `${count} recipient${count === 1 ? "" : "s"}`}
          </span>
          <button onClick={onClose} disabled={busy} style={S.miniBtn}>Cancel</button>
          <button onClick={send} disabled={busy || loading} style={S.primaryBtn}>
            <i className="bi bi-send-fill" style={{ fontSize: 12 }} /> {busy ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
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
  pick: (on) => ({
    height: 34, padding: "0 14px", borderRadius: 10, fontSize: 12.5, fontWeight: 700, cursor: "pointer",
    border: `1px solid ${on ? "#6366F1" : "#E6E6F2"}`,
    background: on ? "#6366F118" : "#fff", color: on ? "#4F46E5" : "#475569",
  }),
};

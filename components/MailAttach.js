// components/MailAttach.js — pick files to go out with a mail, and take them
// back off again. The file is read here and travels with the send request.
import { useRef, useState } from "react";

const MAX_TOTAL = 12 * 1024 * 1024;

const size = (n) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1048576).toFixed(1)} MB`);

/* A web page is printed to PDF on the way out — nobody wants raw HTML in
   their inbox. Saying so here means it is not a surprise afterwards. */
const isHtml = (f) => /html/i.test(f.type || "") || /\.x?html?$/i.test(f.name || "");

export default function MailAttach({ files, setFiles }) {
  const input = useRef(null);
  const [err, setErr] = useState("");

  const add = async (picked) => {
    setErr("");
    const next = [...files];
    for (const f of picked) {
      const data = await new Promise((done) => {
        const r = new FileReader();
        r.onload = () => done(String(r.result).split(",")[1] || "");
        r.onerror = () => done("");
        r.readAsDataURL(f);
      });
      if (!data) continue;
      next.push({ name: f.name, type: f.type || "application/octet-stream", size: f.size, data });
    }
    if (next.reduce((n, f) => n + (f.size || 0), 0) > MAX_TOTAL) {
      setErr("Those files add up to more than 12 MB. Remove one and try again.");
      return;
    }
    setFiles(next);
  };

  return (
    <div style={{ marginTop: 12 }}>
      <input ref={input} type="file" multiple hidden
             onChange={(e) => { add([...e.target.files]); e.target.value = ""; }} />

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={() => input.current?.click()}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 10,
                         border: "1px solid #E7E7F2", background: "#fff", color: "#4338CA", fontSize: 12,
                         fontWeight: 800, cursor: "pointer" }}>
          <i className="bi bi-paperclip" style={{ fontSize: 13 }} /> Attach a file
        </button>
        {files.length > 0 && (
          <span style={{ fontSize: 11.5, color: "#94A3B8", fontWeight: 700 }}>
            {files.length} file{files.length > 1 ? "s" : ""} · {size(files.reduce((n, f) => n + (f.size || 0), 0))}
          </span>
        )}
      </div>

      {files.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 9 }}>
          {files.map((f, i) => (
            <span key={`${f.name}-${i}`}
                  style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 9px", borderRadius: 10,
                           border: "1px solid #F0F0F8", background: "#FBFBFE", fontSize: 11.5, fontWeight: 700,
                           color: "#0F172A", maxWidth: 260 }}>
              <i className={`bi ${/pdf$/i.test(f.type) || isHtml(f) ? "bi-filetype-pdf" : "bi-file-earmark"}`}
                 style={{ fontSize: 12, color: "#6366F1" }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
              <span style={{ color: "#94A3B8", fontWeight: 600 }}>{size(f.size || 0)}</span>
              {isHtml(f) && (
                <span style={{ color: "#4338CA", fontWeight: 700 }} title="A web page cannot be read in a mail, so it goes out as a PDF">
                  → PDF
                </span>
              )}
              <button type="button" title="Remove this file"
                      onClick={() => setFiles(files.filter((_, n) => n !== i))}
                      style={{ border: "none", background: "transparent", color: "#9CA3AF", cursor: "pointer",
                               padding: 0, lineHeight: 1 }}>
                <i className="bi bi-x-lg" style={{ fontSize: 10 }} />
              </button>
            </span>
          ))}
        </div>
      )}

      {err && <div style={{ marginTop: 7, fontSize: 11.5, color: "#DC2626", fontWeight: 700 }}>{err}</div>}
    </div>
  );
}

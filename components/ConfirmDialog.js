// components/ConfirmDialog.js — the one "are you sure?" dialog for the whole app.
//
// Replaces window.confirm(), which the browser draws itself: a grey system box
// with the domain name on it, no branding, and no way to tell a delete from a
// harmless question. Call sites change by one word:
//
//     if (!confirm("Delete this?")) return;
//     if (!(await confirmDialog("Delete this?"))) return;
//
// and the enclosing handler becomes async. It returns a promise of true/false
// exactly like confirm() returns a boolean, so nothing else about a handler
// has to change.
//
// The text is split the way the existing messages are already written —
// "Delete VP-44E3? This cannot be undone." becomes a heading and a line under
// it — so no call site needs its wording rewritten. Pass an object instead
// ({ title, message, confirmText, tone }) when a call wants to be explicit.
//
// <ConfirmHost /> is mounted once in pages/_app.js. There is no provider and no
// context: the queue is a module-level variable, which is what lets any file
// call confirmDialog() without importing a hook or being inside a tree.
import React, { useEffect, useState } from "react";

let publish = null;          // set by the mounted host
let pending = null;          // resolve() of the dialog currently on screen

/* Words that mean "this destroys something", which is the only cue the dialog
   needs to switch from indigo to red. */
const DANGER = /\b(delete|remove|disconnect|revoke|cancel|clear|reset|replace|deactivate|permanently)\b/i;

function normalise(input) {
  const o = typeof input === "string" ? { message: input } : { ...(input || {}) };
  let title = o.title;
  let message = o.message || "";

  // "Delete X? This cannot be undone." → title "Delete X?", body the rest.
  if (!title) {
    const q = message.indexOf("?");
    if (q > -1) {
      title = message.slice(0, q + 1).trim();
      message = message.slice(q + 1).trim();
    } else {
      title = "Are you sure?";
    }
  }

  const danger = o.tone ? o.tone === "danger" : DANGER.test(title);
  return {
    title,
    message,
    // A bin only where something is actually thrown away; everything else that
    // is merely irreversible gets the warning mark.
    icon: o.icon || (/(delete|remove)/i.test(title) ? "bi-trash3-fill" : danger ? "bi-exclamation-triangle-fill" : "bi-question-lg"),
    confirmText:
      o.confirmText ||
      (/delete/i.test(title) ? "Yes, delete" : danger ? "Yes, continue" : "Continue"),
    cancelText: o.cancelText || "Cancel",
    danger,
  };
}

/**
 * Ask the person to confirm. Resolves true if they go ahead, false if not.
 * Falls back to the browser's own confirm() if the host is not mounted, so a
 * page can never lose its guard.
 */
export function confirmDialog(input) {
  const o = normalise(input);
  if (!publish) {
    if (typeof window === "undefined") return Promise.resolve(false);
    return Promise.resolve(
      window.confirm([o.title, o.message].filter(Boolean).join("\n\n"))
    );
  }
  // A second ask while one is open answers the first with "no" rather than
  // losing its promise for ever.
  if (pending) {
    pending(false);
    pending = null;
  }
  return new Promise((resolve) => {
    pending = resolve;
    publish(o);
  });
}

export default function ConfirmHost() {
  const [dialog, setDialog] = useState(null);

  useEffect(() => {
    publish = setDialog;
    return () => {
      publish = null;
    };
  }, []);

  const answer = (ok) => {
    const resolve = pending;
    pending = null;
    setDialog(null);
    if (resolve) resolve(ok);
  };

  // Esc says no, Enter says yes — the same keys the browser's own box answers
  // to, so the habit carries over.
  useEffect(() => {
    if (!dialog) return;
    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); answer(false); }
      if (e.key === "Enter")  { e.preventDefault(); answer(true); }
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [dialog]);

  if (!dialog) return null;

  const accent = dialog.danger ? "#DC2626" : "#6366F1";

  return (
    <div
      className="vcf-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vcf-title"
      onMouseDown={(e) => {
        // Backdrop only — a drag that ends outside must not count as an answer.
        if (e.target === e.currentTarget) answer(false);
      }}
    >
      <div className="vcf-card">
        <div className="vcf-head">
          <span className="vcf-icon" style={{ background: accent + "16", color: accent }}>
            <i className={"bi " + dialog.icon} />
          </span>
          <div>
            <h3 className="vcf-title" id="vcf-title">{dialog.title}</h3>
            {dialog.message && <p className="vcf-msg">{dialog.message}</p>}
          </div>
        </div>

        <div className="vcf-actions">
          <button type="button" className="vcf-btn vcf-cancel" onClick={() => answer(false)}>
            {dialog.cancelText}
          </button>
          <button
            type="button"
            className="vcf-btn vcf-go"
            style={{ background: accent, borderColor: accent }}
            onClick={() => answer(true)}
            autoFocus
          >
            {dialog.confirmText}
          </button>
        </div>
      </div>

      <style jsx>{`
        .vcf-overlay {
          position: fixed;
          inset: 0;
          z-index: 20000;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(15, 23, 42, 0.46);
          backdrop-filter: blur(2px);
          animation: vcf-fade 0.16s ease-out;
        }
        .vcf-card {
          width: 100%;
          max-width: 420px;
          padding: 22px 22px 18px;
          border-radius: 16px;
          background: #ffffff;
          box-shadow: 0 24px 60px rgba(15, 23, 42, 0.22);
          animation: vcf-rise 0.18s ease-out;
        }
        .vcf-head {
          display: flex;
          gap: 14px;
          align-items: flex-start;
        }
        .vcf-icon {
          flex: 0 0 40px;
          width: 40px;
          height: 40px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          font-size: 17px;
        }
        .vcf-title {
          margin: 2px 0 0;
          font-size: 16.5px;
          font-weight: 800;
          line-height: 1.35;
          color: #0F172A;
          overflow-wrap: anywhere;
        }
        .vcf-msg {
          margin: 7px 0 0;
          font-size: 13px;
          line-height: 1.6;
          color: #64748B;
          white-space: pre-line;
          overflow-wrap: anywhere;
        }
        .vcf-actions {
          display: flex;
          justify-content: flex-end;
          gap: 9px;
          margin-top: 22px;
        }
        .vcf-btn {
          height: 38px;
          padding: 0 18px;
          border-radius: 10px;
          border: 1px solid transparent;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: filter 0.16s ease, background 0.16s ease;
        }
        .vcf-cancel {
          background: #ffffff;
          border-color: #E2E8F0;
          color: #475569;
        }
        .vcf-cancel:hover { background: #F8FAFC; }
        .vcf-go { color: #ffffff; }
        .vcf-go:hover { filter: brightness(1.07); }
        .vcf-btn:focus-visible { outline: 2px solid #0F172A; outline-offset: 2px; }

        @keyframes vcf-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes vcf-rise {
          from { opacity: 0; transform: translateY(10px) scale(0.985); }
          to   { opacity: 1; transform: none; }
        }
        @media (max-width: 480px) {
          .vcf-card { padding: 18px 16px 16px; }
          .vcf-actions { flex-direction: column-reverse; }
          .vcf-btn { width: 100%; }
        }
      `}</style>
    </div>
  );
}

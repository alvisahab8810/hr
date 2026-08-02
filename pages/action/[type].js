import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";

const TYPE_META = {
  overtime: { icon: "⏱️", label: "Overtime request" },
  leave: { icon: "📅", label: "Leave application" },
  reimbursement: { icon: "🧾", label: "Reimbursement request" },
};

export default function ActionPage() {
  const router = useRouter();
  const { type, id, token, action: initialAction } = router.query;

  const [phase, setPhase] = useState("loading"); // loading | invalid | pending | done
  const [details, setDetails] = useState(null);
  const [invalidInfo, setInvalidInfo] = useState(null);
  const [remark, setRemark] = useState("");
  const [busyAction, setBusyAction] = useState(null); // "approve" | "reject" | null
  const [submitError, setSubmitError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!router.isReady || !type || !id || !token) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(
          `/api/public/request-details?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`
        );
        const data = await res.json();
        if (cancelled) return;
        if (!data.valid) {
          setInvalidInfo(data);
          setPhase("invalid");
        } else {
          setDetails(data);
          setPhase("pending");
        }
      } catch {
        if (!cancelled) {
          setInvalidInfo({ reason: "network" });
          setPhase("invalid");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router.isReady, type, id, token]);

  async function submitAction(chosenAction) {
    if (chosenAction === "reject" && !remark.trim()) {
      setSubmitError("A remark is required when rejecting a request.");
      return;
    }
    setSubmitError("");
    setBusyAction(chosenAction);
    try {
      const res = await fetch("/api/public/request-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id, token, action: chosenAction, remark }),
      });
      const data = await res.json();
      if (!data.success) {
        setSubmitError(
          data.code === "insufficient_balance"
            ? "Cannot approve — employee's leave balance is insufficient."
            : data.code === "already_actioned"
            ? "This request was already actioned elsewhere."
            : "Something went wrong. Please try again or use the dashboard."
        );
        setBusyAction(null);
        return;
      }
      setResult({ ...data, remark });
      setPhase("done");
    } catch {
      setSubmitError("Network error. Please try again.");
      setBusyAction(null);
    }
  }

  const meta = TYPE_META[type] || { icon: "🔔", label: "Request" };

  return (
    <>
      <Head>
        <title>Viralon HRMS — Request Action</title>
      </Head>
      <div className="wrap">
        <div className="topbar">
          <div className="brand">
            <span className="mark" />
            Viralon HRMS
          </div>
          <div className="secure">🔒 Secure request link</div>
        </div>

        <div className="card">
          {phase === "loading" && <div className="loading">Loading request…</div>}

          {phase === "invalid" && (
            <div className="expired">
              <div className="lock">🔒</div>
              <h3>
                {invalidInfo?.reason === "already_actioned"
                  ? "This request has already been actioned"
                  : invalidInfo?.reason === "expired"
                  ? "This link has expired"
                  : "This link is no longer valid"}
              </h3>
              <p>
                {invalidInfo?.reason === "already_actioned"
                  ? `Current status: ${invalidInfo.status}. Open the dashboard to review it.`
                  : "It may have already been used, or a newer request may have replaced it. Open the dashboard to review pending requests."}
              </p>
            </div>
          )}

          {phase === "pending" && details && (
            <>
              <div className="eyebrow">
                <span className="chip">{meta.icon}</span>
                <span className="typeName">{details.typeLabel}</span>
              </div>
              <p className="headline">{details.employeeName}</p>
              <span className="pill">● Pending approval</span>

              <div className="grid">
                {details.fields.map((f, i) => (
                  <div className={`row ${f.full ? "full" : ""}`} key={i}>
                    <div className="lbl">{f.label}</div>
                    <div className="val">{f.value}</div>
                  </div>
                ))}
              </div>

              <div className="remarkField">
                <label htmlFor="remark">
                  Remark <span className="hint">(shown to {details.employeeName.split(" ")[0]})</span>
                </label>
                <textarea
                  id="remark"
                  rows={3}
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="Optional for approvals, required for rejections…"
                  disabled={!!busyAction}
                />
                <p className="hintSmall">Optional for approvals, recommended for rejections.</p>
              </div>

              {submitError && <p className="error">{submitError}</p>}

              <div className="btnRow">
                <button
                  className="btn approve"
                  disabled={!!busyAction}
                  onClick={() => submitAction("approve")}
                >
                  {busyAction === "approve" ? "Approving…" : "✓ Approve request"}
                </button>
                <button
                  className="btn reject"
                  disabled={!!busyAction}
                  onClick={() => submitAction("reject")}
                  autoFocus={initialAction === "reject"}
                >
                  {busyAction === "reject" ? "Rejecting…" : "✕ Reject request"}
                </button>
              </div>
            </>
          )}

          {phase === "done" && result && (
            <div className="confirm">
              <div className={`confirmIcon ${result.status === "Approved" ? "approved" : "rejected"}`}>
                {result.status === "Approved" ? "✓" : "✕"}
              </div>
              <p className="confirmTitle">
                {meta.label} {result.status === "Approved" ? "approved" : "rejected"}
              </p>
              <p className="confirmMeta">
                {result.employeeName} · {new Date(result.actionedAt).toLocaleString("en-IN")}
              </p>
              {result.remark?.trim() && (
                <div className="remarkEcho">
                  <span className="who">Your remark</span>
                  “{result.remark}”
                </div>
              )}
              <div className="notify">
                ✉️ {result.employeeName} has been emailed the outcome{result.remark?.trim() ? " and remark" : ""}. This link is now closed.
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        :root {
          --bg: #eef1f8;
          --surface: #ffffff;
          --surface-2: #f8fafc;
          --ink: #1f2333;
          --ink-muted: #6b7280;
          --ink-faint: #9aa1b8;
          --border: #e5e9f2;
          --border-strong: #d7ddec;
          --accent: #4f46e5;
          --accent-2: #5a57fb;
          --approve: #15803d;
          --approve-wash: #dcfce7;
          --approve-line: #bbf0ce;
          --reject: #dc2626;
          --reject-wash: #fee2e2;
          --reject-line: #f6c6c6;
          --pending: #b45309;
          --pending-wash: #fef3c7;
          --pending-line: #f3dfa1;
        }
        @media (prefers-color-scheme: dark) {
          :root {
            --bg: #0e1120;
            --surface: #161a2c;
            --surface-2: #1c2136;
            --ink: #eef0fa;
            --ink-muted: #a2a9c4;
            --ink-faint: #6e759a;
            --border: #2a2f4a;
            --border-strong: #363c5c;
            --accent: #8481ff;
            --accent-2: #9c99ff;
            --approve: #4ade80;
            --approve-wash: #123321;
            --approve-line: #1f5636;
            --reject: #f87171;
            --reject-wash: #3a1a1c;
            --reject-line: #5c2a2c;
            --pending: #fbbf24;
            --pending-wash: #3a2e0e;
            --pending-line: #5c4a16;
          }
        }
        .wrap {
          min-height: 100vh;
          background: var(--bg);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: var(--ink);
          padding: 32px 16px 64px;
        }
        .topbar,
        .card {
          max-width: 480px;
          margin: 0 auto;
        }
        .topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 4px 16px;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 800;
          font-size: 14px;
          letter-spacing: -0.01em;
        }
        .mark {
          width: 20px;
          height: 20px;
          border-radius: 6px;
          background: linear-gradient(135deg, var(--accent), var(--accent-2));
          display: inline-block;
        }
        .secure {
          font-size: 11px;
          font-weight: 600;
          color: var(--ink-faint);
        }
        .card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px;
          box-shadow: 0 1px 2px rgba(31, 35, 51, 0.04), 0 12px 32px -16px rgba(31, 35, 51, 0.18);
          padding: 26px 28px 30px;
        }
        .loading {
          padding: 40px 0;
          text-align: center;
          color: var(--ink-muted);
          font-size: 13.5px;
        }
        .eyebrow {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 6px;
        }
        .chip {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--surface-2);
          font-size: 16px;
        }
        .typeName {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          color: var(--ink-faint);
        }
        .headline {
          font-size: 18.5px;
          font-weight: 700;
          letter-spacing: -0.01em;
          margin: 2px 0 16px;
        }
        .pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          padding: 5px 11px;
          border-radius: 100px;
          margin-bottom: 18px;
          color: var(--pending);
          background: var(--pending-wash);
          border: 1px solid var(--pending-line);
        }
        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          border: 1px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
          background: var(--surface-2);
        }
        .row {
          padding: 12px 16px;
          border-top: 1px solid var(--border);
          border-right: 1px solid var(--border);
        }
        .row:nth-child(-n + 2) {
          border-top: none;
        }
        .row:nth-child(2n) {
          border-right: none;
        }
        .row.full {
          grid-column: 1 / -1;
          border-right: none;
        }
        .lbl {
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--ink-faint);
          margin-bottom: 4px;
        }
        .val {
          font-size: 13.5px;
          font-weight: 600;
          color: var(--ink);
        }
        .remarkField {
          margin-top: 20px;
        }
        .remarkField label {
          display: block;
          font-size: 11.5px;
          font-weight: 700;
          color: var(--ink-muted);
          margin-bottom: 7px;
        }
        .hint {
          font-weight: 500;
          color: var(--ink-faint);
          text-transform: none;
          letter-spacing: 0;
        }
        .remarkField textarea {
          width: 100%;
          border: 1.5px solid var(--border-strong);
          border-radius: 10px;
          padding: 11px 13px;
          font-size: 13.5px;
          font-family: inherit;
          color: var(--ink);
          background: var(--surface);
          resize: vertical;
          line-height: 1.5;
        }
        .hintSmall {
          font-size: 11px;
          color: var(--ink-faint);
          margin-top: 6px;
        }
        .error {
          font-size: 12.5px;
          color: var(--reject);
          margin-top: 12px;
        }
        .btnRow {
          display: flex;
          flex-direction: column;
          gap: 9px;
          margin-top: 20px;
        }
        .btn {
          padding: 14px 20px;
          border-radius: 11px;
          font-size: 14.5px;
          font-weight: 700;
          border: 1.5px solid transparent;
          cursor: pointer;
          font-family: inherit;
        }
        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .btn.approve {
          background: var(--approve);
          color: #fff;
        }
        .btn.reject {
          background: transparent;
          color: var(--reject);
          border-color: var(--reject-line);
        }
        .confirm {
          text-align: left;
        }
        .confirmIcon {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 4px 0 16px;
          font-size: 22px;
        }
        .confirmIcon.approved {
          background: var(--approve-wash);
          color: var(--approve);
        }
        .confirmIcon.rejected {
          background: var(--reject-wash);
          color: var(--reject);
        }
        .confirmTitle {
          font-size: 17px;
          font-weight: 700;
          margin: 0 0 4px;
        }
        .confirmMeta {
          font-size: 12.5px;
          color: var(--ink-faint);
          margin: 0 0 18px;
        }
        .remarkEcho {
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-left: 3px solid var(--reject);
          border-radius: 8px;
          padding: 13px 15px;
          font-size: 13px;
          color: var(--ink);
          line-height: 1.55;
          margin-bottom: 16px;
        }
        .remarkEcho .who {
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--ink-faint);
          margin-bottom: 6px;
          display: block;
        }
        .notify {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: var(--ink-muted);
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: 9px;
          padding: 10px 13px;
        }
        .expired {
          text-align: center;
          padding: 8px 4px;
        }
        .expired .lock {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: var(--surface-2);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 14px;
          font-size: 18px;
        }
        .expired h3 {
          font-size: 15px;
          font-weight: 700;
          margin: 0 0 6px;
        }
        .expired p {
          font-size: 13px;
          color: var(--ink-muted);
          max-width: 38ch;
          margin: 0 auto;
          line-height: 1.55;
        }
      `}</style>
    </>
  );
}

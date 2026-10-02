// pages/dashboard/finance/sender.js — Finance → Invoice sender.
//
// The one screen that decides when invoice mail leaves the building. It is set
// once: from then on the pass in utils/invoiceAutomation.js reads these values
// and nothing else, so changing the time here changes every mail that follows.
// The sentence under the form is the whole setting read back in English —
// nobody should have to guess what they have just switched on.
import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import WebsiteLeftbar from "@/components/WebsiteLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";
import Dashnav from "@/components/Dashnav";
import { clearCrmSettings } from "@/utils/crmSettings";

const DAYS = [
  { v: 1, n: "Mon" }, { v: 2, n: "Tue" }, { v: 3, n: "Wed" }, { v: 4, n: "Thu" },
  { v: 5, n: "Fri" }, { v: 6, n: "Sat" }, { v: 0, n: "Sun" },
];

const BLANK = {
  autoSend: false, sendHour: 10, sendMinute: 0, sendDays: [1, 2, 3, 4, 5],
  dueReminders: true, beforeDays: [3, 1], onDue: true, afterEvery: 7, afterMax: 4, cc: "",
};

// "3, 1" in the box becomes [3, 1] on the way out, biggest first and no repeats.
const parseDays = (txt) =>
  Array.from(new Set(String(txt).split(/[,\s]+/).map((x) => parseInt(x, 10)).filter((x) => x > 0 && x < 366)))
    .sort((a, b) => b - a);

export default function InvoiceSenderPage() {
  const [f, setF] = useState(BLANK);
  const [beforeTxt, setBeforeTxt] = useState("3, 1");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [next, setNext] = useState("");
  const [ran, setRan] = useState(null);

  const load = async () => {
    try {
      const r = await fetch("/api/admin/finance/summary", { credentials: "include" });
      const j = await r.json();
      if (!j.success) throw new Error(j.message || "Could not load the sender settings");
      const b = { ...BLANK, ...(j.billing || {}) };
      setF(b);
      setBeforeTxt((b.beforeDays || []).join(", "));
      setNext(j.sender?.next || "");
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const toggleDay = (v) =>
    setF((p) => {
      const have = (p.sendDays || []).map(Number);
      return { ...p, sendDays: have.includes(v) ? have.filter((x) => x !== v) : have.concat(v).sort() };
    });

  const save = async () => {
    const days = (f.sendDays || []).map(Number);
    if (!days.length) return toast.error("Pick at least one day for the sender to run on");
    setBusy(true);
    try {
      const billing = {
        autoSend: !!f.autoSend,
        sendHour: Math.min(23, Math.max(0, Number(f.sendHour) || 0)),
        sendMinute: Math.min(59, Math.max(0, Number(f.sendMinute) || 0)),
        sendDays: days,
        dueReminders: !!f.dueReminders,
        beforeDays: parseDays(beforeTxt),
        onDue: !!f.onDue,
        afterEvery: Math.max(1, Number(f.afterEvery) || 7),
        afterMax: Math.max(0, Number(f.afterMax) || 0),
        cc: String(f.cc || "").trim(),
      };
      const r = await fetch("/api/admin/settings", {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billing }),
      });
      const j = await r.json();
      if (!j.success) throw new Error(j.message || "Could not save the sender settings");
      clearCrmSettings();
      toast.success("Saved — the sender follows this from now on");
      load();
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  const runNow = async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/admin/finance/run", { method: "POST", credentials: "include" });
      const j = await r.json();
      if (!j.success) throw new Error(j.message || "The sender did not run");
      setRan(j);
      toast.success(j.sent?.length ? `${j.sent.length} mail${j.sent.length === 1 ? "" : "s"} sent` : "Nothing was due — no mail sent");
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  const at = `${String(Number(f.sendHour) || 0).padStart(2, "0")}:${String(Number(f.sendMinute) || 0).padStart(2, "0")}`;
  const dayNames = DAYS.filter((x) => (f.sendDays || []).map(Number).includes(x.v)).map((x) => x.n).join(", ");
  const before = parseDays(beforeTxt);

  return (
    <section className="main-dashboard-area">
      <Head><title>Invoice sender — Finance</title></Head>

      <div className="main-nav">
        <WebsiteLeftbar /><LeftbarMobile /><Dashnav />

        <section className="content home">
          <div className="block-header">

            <div style={s.head}>
              <div>
                <h2 style={s.h1}>Invoice sender</h2>
                <p style={s.sub}>Set the time once. Every invoice mail and every due reminder goes out on it from then on.</p>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Link href="/dashboard/finance" style={{ ...s.ghost, textDecoration: "none" }}>
                  <i className="bi bi-cash-coin" style={{ marginRight: 6 }} />Financial Hub
                </Link>
                <button style={s.ghost} onClick={runNow} disabled={busy}>
                  <i className="bi bi-lightning-charge-fill" style={{ marginRight: 6 }} />Run now
                </button>
                <button style={s.primary} onClick={save} disabled={busy || loading}>
                  <i className="bi bi-check2 " style={{ marginRight: 6 }} />{busy ? "Saving…" : "Save"}
                </button>
              </div>
            </div>

            {loading ? (
              <div style={s.empty}>Loading…</div>
            ) : (
              <>
                <div style={s.cols2}>

                  {/* ── when it runs ── */}
                  <div style={s.panel}>
                    <div style={s.panelHead}>
                      <i className="bi bi-clock-fill" style={{ color: "#7C3AED" }} />
                      <b style={{ fontSize: 13 }}>When mail goes out</b>
                    </div>
                    <div style={{ padding: "14px 16px" }}>
                      <label style={s.lbl}>Sending time (IST)</label>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input type="number" min="0" max="23" style={{ ...s.inp, width: 80 }}
                          value={f.sendHour} onChange={(e) => set("sendHour", e.target.value)} />
                        <span style={{ fontWeight: 800, color: "#94A3B8" }}>:</span>
                        <input type="number" min="0" max="59" step="5" style={{ ...s.inp, width: 80 }}
                          value={f.sendMinute} onChange={(e) => set("sendMinute", e.target.value)} />
                        <span style={s.hint}>the first run of the day after this time sends whatever is due</span>
                      </div>

                      <label style={{ ...s.lbl, marginTop: 16 }}>Days it may send on</label>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {DAYS.map((x) => {
                          const on = (f.sendDays || []).map(Number).includes(x.v);
                          return (
                            <button key={x.v} type="button" onClick={() => toggleDay(x.v)}
                              style={{ ...s.chip, ...(on ? s.chipOn : null) }}>{x.n}</button>
                          );
                        })}
                      </div>
                      <p style={s.hint}>Nothing is mailed on a day left off — it waits for the next one it is allowed.</p>

                      <label style={{ ...s.lbl, marginTop: 16 }}>Copy accounts on every mail</label>
                      <input style={s.inp} placeholder="accounts@viralon.in — leave blank for none"
                        value={f.cc} onChange={(e) => set("cc", e.target.value)} />

                      <div style={s.nextBox}>
                        <span style={s.mk}>Next run</span>
                        <b style={{ fontSize: 13, color: "#0F172A" }}>{next || "—"}</b>
                      </div>
                    </div>
                  </div>

                  {/* ── what it sends ── */}
                  <div style={s.panel}>
                    <div style={s.panelHead}>
                      <i className="bi bi-envelope-paper-fill" style={{ color: "#7C3AED" }} />
                      <b style={{ fontSize: 13 }}>What it sends</b>
                    </div>
                    <div style={{ padding: "14px 16px" }}>

                      <Toggle
                        on={!!f.autoSend}
                        onClick={() => set("autoSend", !f.autoSend)}
                        title="Send a new invoice by itself"
                        note="A draft invoice with an address on it is mailed to the client on the next run and marked Sent. With this off, invoices wait for someone to press Send on the board."
                      />

                      <div style={s.rule} />

                      <Toggle
                        on={!!f.dueReminders}
                        onClick={() => set("dueReminders", !f.dueReminders)}
                        title="Chase what is due"
                        note="Reminders before the due date, on the day, and then a recurring chase while the money is still out."
                      />

                      {f.dueReminders && (
                        <div style={{ paddingLeft: 4, marginTop: 12 }}>
                          <label style={s.lbl}>Days before the due date</label>
                          <input style={s.inp} placeholder="3, 1" value={beforeTxt}
                            onChange={(e) => setBeforeTxt(e.target.value)} />
                          <p style={s.hint}>
                            {before.length
                              ? `A reminder ${before.join(" and ")} day${before.length === 1 && before[0] === 1 ? "" : "s"} before it falls due.`
                              : "No reminder before the due date."}
                          </p>

                          <label style={{ ...s.lbl, marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
                            <input type="checkbox" checked={!!f.onDue} onChange={(e) => set("onDue", e.target.checked)} />
                            One on the due date itself
                          </label>

                          <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                            <div>
                              <label style={s.lbl}>Then chase every</label>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <input type="number" min="1" style={{ ...s.inp, width: 80 }}
                                  value={f.afterEvery} onChange={(e) => set("afterEvery", e.target.value)} />
                                <span style={s.hint}>days</span>
                              </div>
                            </div>
                            <div>
                              <label style={s.lbl}>Stop after</label>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <input type="number" min="0" style={{ ...s.inp, width: 80 }}
                                  value={f.afterMax} onChange={(e) => set("afterMax", e.target.value)} />
                                <span style={s.hint}>chases</span>
                              </div>
                            </div>
                          </div>
                          <p style={s.hint}>
                            A chase stops the moment the invoice is paid or cancelled, and each one is sent once —
                            a run that catches up after downtime cannot repeat it.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── the whole setting, read back ── */}
                <div style={{ ...s.panel, borderColor: "#DDD6FE" }}>
                  <div style={s.panelHead}>
                    <i className="bi bi-info-circle-fill" style={{ color: "#7C3AED" }} />
                    <b style={{ fontSize: 13 }}>In plain words</b>
                  </div>
                  <div style={{ padding: "14px 16px", fontSize: 13, color: "#334155", lineHeight: 1.7 }}>
                    {!f.autoSend && !f.dueReminders ? (
                      <>Nothing is mailed automatically. Invoices and reminders only go out when somebody sends them from the invoices board.</>
                    ) : (
                      <>
                        The sender runs from <b>{at} IST</b>{dayNames ? <> on <b>{dayNames}</b></> : null}.
                        {f.autoSend
                          ? <> A newly raised invoice is mailed to the client on the first run after it is raised, and marked Sent.</>
                          : <> New invoices are left alone.</>}
                        {f.dueReminders
                          ? <> {before.length ? <>A reminder goes out <b>{before.join(" and ")} day(s) before</b> the due date</> : <>No reminder goes out before the due date</>}
                            {f.onDue ? <>, one <b>on the day</b></> : null}
                            , and then a chase <b>every {Math.max(1, Number(f.afterEvery) || 7)} days</b>
                            {Number(f.afterMax) > 0 ? <> up to <b>{Number(f.afterMax)} times</b></> : <> — never, because the limit is 0</>}
                            {" "}while money is still owed.</>
                          : <> Due dates are not chased.</>}
                        {f.cc ? <> Every one of them is copied to <b>{f.cc}</b>.</> : null}
                      </>
                    )}
                  </div>
                </div>

                {ran && (
                  <div style={{ ...s.panel, marginTop: 14 }}>
                    <div style={s.panelHead}>
                      <i className="bi bi-list-check" style={{ color: "#7C3AED" }} />
                      <b style={{ fontSize: 13 }}>Last run</b>
                    </div>
                    <div style={{ padding: "12px 16px", fontSize: 12.5, color: "#475569" }}>
                      {ran.sent?.length || 0} sent · {ran.skipped?.length || 0} failed · {ran.marked || 0} marked overdue
                      {(ran.sent || []).map((x) => (
                        <div key={x.invoice + x.key} style={{ marginTop: 5 }}>
                          <b>{x.key}</b> → {x.to}
                        </div>
                      ))}
                      {(ran.skipped || []).map((x) => (
                        <div key={x.invoice + x.key} style={{ marginTop: 5, color: "#DC2626" }}>
                          <b>{x.key}</b> — {x.error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

          </div>
        </section>
      </div>
      <ToastContainer position="bottom-right" autoClose={2600} hideProgressBar newestOnTop closeOnClick theme="light" />
    </section>
  );
}

function Toggle({ on, onClick, title, note }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <button type="button" onClick={onClick} aria-pressed={on}
        style={{ ...s.sw, background: on ? "#7C3AED" : "#E2E8F0" }}>
        <span style={{ ...s.swDot, transform: on ? "translateX(18px)" : "translateX(0)" }} />
      </button>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: "#0F172A" }}>{title}</div>
        <div style={{ fontSize: 12, color: "#64748B", marginTop: 3, lineHeight: 1.6 }}>{note}</div>
      </div>
    </div>
  );
}

const s = {
  head: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 },
  h1: { margin: 0, fontSize: 22, fontWeight: 900, color: "#0F172A" },
  sub: { margin: "3px 0 0", fontSize: 12.5, color: "#94A3B8" },
  primary: { background: "#7C3AED", color: "#fff", border: "none", borderRadius: 10, padding: "9px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" },
  ghost: { background: "#fff", color: "#475569", border: "1px solid #E5E7EB", borderRadius: 10, padding: "9px 14px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center" },
  cols2: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))", gap: 14, alignItems: "start", marginBottom: 14 },
  panel: { background: "#fff", borderRadius: 16, border: "1px solid #F0F0F8", boxShadow: "0 2px 8px rgba(124,58,237,.06)", overflow: "hidden" },
  panelHead: { padding: "12px 16px", borderBottom: "1px solid #F4F4FD", display: "flex", alignItems: "center", gap: 9 },
  lbl: { display: "block", fontSize: 11, fontWeight: 800, letterSpacing: ".03em", textTransform: "uppercase", color: "#94A3B8", marginBottom: 6 },
  inp: { width: "100%", border: "1px solid #E5E7EB", borderRadius: 10, padding: "9px 11px", fontSize: 13, color: "#0F172A", background: "#fff" },
  hint: { fontSize: 11.5, color: "#94A3B8", margin: "6px 0 0", lineHeight: 1.6 },
  chip: { border: "1px solid #E5E7EB", background: "#fff", color: "#64748B", borderRadius: 999, padding: "6px 13px", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  chipOn: { background: "#7C3AED", borderColor: "#7C3AED", color: "#fff" },
  rule: { height: 1, background: "#F4F4FD", margin: "14px 0" },
  sw: { width: 38, height: 20, borderRadius: 999, border: "none", padding: 2, cursor: "pointer", flexShrink: 0, display: "block" },
  swDot: { display: "block", width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "transform .15s", boxShadow: "0 1px 3px rgba(0,0,0,.2)" },
  nextBox: { marginTop: 16, padding: "10px 12px", background: "#FAFAFE", border: "1px solid #F0F0F8", borderRadius: 10,
             display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 },
  mk: { fontSize: 10, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase", color: "#94A3B8" },
  empty: { background: "#fff", border: "1px solid #F0F0F8", borderRadius: 16, padding: 28, textAlign: "center", fontSize: 13, color: "#94A3B8" },
};

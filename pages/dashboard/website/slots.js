// pages/dashboard/website/slots.js — call-slot schedule (Website → Slots).
// The website's "Ready to collaborate" form is a two-step booking form: step 1
// captures the lead (it lands in the CRM immediately), step 2 lets them pick
// one of the slots opened here. Slots are opened a month at a time; a slot a
// lead has taken shows as booked on the site, greyed out.
import { useEffect, useState, useCallback, useMemo } from "react";
import Head from "next/head";
import toast, { Toaster } from "react-hot-toast";
import Dashnav from "@/components/Dashnav";
import WebsiteLeftbar from "@/components/WebsiteLeftbar";
import LeftbarMobile from "@/components/LeftbarMobile";

const WEEKDAYS = [
  { n: 1, label: "Mon" }, { n: 2, label: "Tue" }, { n: 3, label: "Wed" },
  { n: 4, label: "Thu" }, { n: 5, label: "Fri" }, { n: 6, label: "Sat" },
  { n: 0, label: "Sun" },
];

const DEFAULT_TIMES = ["10:00", "11:30", "14:00", "16:30"];
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

const thisMonth = () => new Date().toISOString().slice(0, 7);
const todayStr = () => new Date().toISOString().slice(0, 10);

const shiftMonth = (month, by) => {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};

const monthLabel = (month) => {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
};

const dateLabel = (date) => {
  const d = new Date(`${date}T00:00:00Z`);
  return {
    day: d.getUTCDate(),
    weekday: d.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" }).toUpperCase(),
    month: d.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }).toUpperCase(),
  };
};

// "16:30" → "4:30 PM", the way the slot reads on the website.
const prettyTime = (t) => {
  const [h, m] = t.split(":").map(Number);
  const ampm = h < 12 ? "AM" : "PM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, "0")} ${ampm}`;
};

const _v = (n) => (n === null || n === undefined ? "…" : n);

function KpiCard({ icon, label, value, accent }) {
  return (
    <div className="kpi-card" style={{
      background: `linear-gradient(160deg, #fff 55%, ${accent.bg} 165%)`,
      borderRadius: 16, padding: "17px 18px 16px",
      border: `1px solid ${accent.bg}`, boxShadow: "0 3px 12px rgba(15,23,42,.06)",
      display: "flex", alignItems: "center", gap: 14, height: "100%",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent.icon }} />
      <div style={{
        width: 46, height: 46, borderRadius: 13, flexShrink: 0, background: accent.icon,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: `0 6px 16px ${accent.shadow}`,
      }}>
        <i className={`bi ${icon}`} style={{ fontSize: 19, color: "#fff" }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 26, fontWeight: 900, color: "#0F172A", lineHeight: 1.05, letterSpacing: "-0.8px" }}>{value}</div>
        <div style={{ fontSize: 12, color: "#475569", fontWeight: 700, marginTop: 3 }}>{label}</div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div style={s.field}>
      <label style={s.fieldLabel}>{label}</label>
      {children}
      {hint && <div style={s.fieldHint}>{hint}</div>}
    </div>
  );
}

export default function CallSlots() {
  const [month, setMonth]     = useState(thisMonth());
  const [slots, setSlots]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy]       = useState(false);

  // Bulk opener
  const [times, setTimes]       = useState(DEFAULT_TIMES);
  const [newTime, setNewTime]   = useState("");
  const [days, setDays]         = useState([1, 2, 3, 4, 5]);
  // One-off slot
  const [oneDate, setOneDate]   = useState(todayStr());
  const [oneTime, setOneTime]   = useState("");

  const fetchSlots = useCallback(async (m) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/slots?month=${m}`);
      const json = await res.json();
      if (json.success) setSlots(json.data || []);
      else toast.error(json.message || "Could not load slots");
    } catch {
      toast.error("Could not load slots");
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSlots(month); }, [month, fetchSlots]);

  const counts = useMemo(() => ({
    open: slots.filter((x) => x.status === "open").length,
    booked: slots.filter((x) => x.status === "booked").length,
    blocked: slots.filter((x) => x.status === "blocked").length,
  }), [slots]);

  // Group by date so each day gets its own card.
  const byDate = useMemo(() => {
    const g = {};
    slots.forEach((x) => { (g[x.date] = g[x.date] || []).push(x); });
    Object.values(g).forEach((list) => list.sort((a, b) => a.time.localeCompare(b.time)));
    return Object.entries(g).sort(([a], [b]) => a.localeCompare(b));
  }, [slots]);

  const addTime = () => {
    const t = newTime.trim();
    if (!TIME_RE.test(t)) return toast.error("Time must be HH:MM, e.g. 16:30");
    if (times.includes(t)) return toast.error("That time is already in the list");
    setTimes([...times, t].sort());
    setNewTime("");
  };

  const toggleDay = (n) =>
    setDays((d) => (d.includes(n) ? d.filter((x) => x !== n) : [...d, n].sort()));

  const openBulk = async () => {
    if (!times.length) return toast.error("Add at least one time");
    if (!days.length) return toast.error("Pick at least one weekday");
    setBusy(true);
    try {
      const res = await fetch("/api/admin/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "bulk", month, times, days }),
      });
      const json = await res.json();
      if (json.success) { toast.success(json.message); fetchSlots(month); }
      else toast.error(json.message || "Could not open slots");
    } catch { toast.error("Could not open slots"); }
    setBusy(false);
  };

  const addOne = async () => {
    if (!TIME_RE.test(oneTime.trim())) return toast.error("Time must be HH:MM, e.g. 16:30");
    setBusy(true);
    try {
      const res = await fetch("/api/admin/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: oneDate, time: oneTime.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Slot added");
        setOneTime("");
        // Jump to the month the slot landed in, so it's visible straight away.
        const m = oneDate.slice(0, 7);
        if (m !== month) setMonth(m); else fetchSlots(month);
      } else toast.error(json.message || "Could not add slot");
    } catch { toast.error("Could not add slot"); }
    setBusy(false);
  };

  const setStatus = async (slot, status) => {
    if (slot.status === "booked" && status === "open") {
      if (!confirm(`Cancel the booking of ${slot.booking?.name || "this lead"} at ${prettyTime(slot.time)}? The slot becomes available again.`)) return;
    }
    try {
      const res = await fetch(`/api/admin/slots/${slot._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (json.success) fetchSlots(month);
      else toast.error(json.message || "Could not update");
    } catch { toast.error("Could not update"); }
  };

  const removeSlot = async (slot) => {
    if (!confirm(`Remove the ${prettyTime(slot.time)} slot on ${slot.date}?`)) return;
    try {
      const res = await fetch(`/api/admin/slots/${slot._id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) fetchSlots(month);
      else toast.error(json.message || "Could not remove");
    } catch { toast.error("Could not remove"); }
  };

  const tone = {
    open:    { bg: "#DCFCE7", fg: "#15803D", border: "#BBF7D0", label: "Open" },
    booked:  { bg: "#EEF2FF", fg: "#4F46E5", border: "#C7D2FE", label: "Booked" },
    blocked: { bg: "#F1F5F9", fg: "#94A3B8", border: "#E2E8F0", label: "Closed" },
  };

  return (
    <section className="main-dashboard-area">
      <Head><title>Call Slots — Website</title></Head>
      <Toaster position="top-right" />

      <div className="main-nav">
        <WebsiteLeftbar /><LeftbarMobile /><Dashnav />

        <section className="content home">
          <div className="block-header">

            {/* ── Header ── */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                  background: "linear-gradient(135deg,#6366F1,#818CF8)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 5px 14px rgba(99,102,241,.25)",
                }}>
                  <i className="bi bi-calendar2-check-fill" style={{ fontSize: 17, color: "#fff" }} />
                </div>
                <div>
                  <div style={{ fontSize: 19, fontWeight: 900, color: "#0F172A", lineHeight: 1.15 }}>Call Slots</div>
                  <div style={{ fontSize: 12, color: "#64748B", fontWeight: 600, marginTop: 1 }}>
                    Open the times leads can book from the website form — month by month.
                  </div>
                </div>
              </div>

              {/* Month switcher */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button onClick={() => setMonth(shiftMonth(month, -1))} title="Previous month" style={s.navBtn}>
                  <i className="bi bi-chevron-left" style={{ fontSize: 14 }} />
                </button>
                <div style={{
                  height: 38, minWidth: 160, padding: "0 14px", borderRadius: 10,
                  border: "1px solid #E2E8F0", background: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13.5, fontWeight: 800, color: "#0F172A",
                }}>
                  {monthLabel(month)}
                </div>
                <button onClick={() => setMonth(shiftMonth(month, 1))} title="Next month" style={s.navBtn}>
                  <i className="bi bi-chevron-right" style={{ fontSize: 14 }} />
                </button>
                <button onClick={() => setMonth(thisMonth())} style={{
                  height: 38, padding: "0 14px", borderRadius: 10, border: "1px solid #E2E8F0",
                  background: "#fff", color: "#475569", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                }}>
                  Today
                </button>
              </div>
            </div>

            {/* ── KPIs ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginTop: 22, marginBottom: 20 }}>
              <KpiCard icon="bi-calendar2-week-fill"  label="Slots This Month" value={_v(loading ? null : slots.length)} accent={{ bg: "#EEF2FF", icon: "#6366F1", shadow: "rgba(99,102,241,.18)" }} />
              <KpiCard icon="bi-unlock-fill"          label="Open"             value={_v(loading ? null : counts.open)}    accent={{ bg: "#DCFCE7", icon: "#16A34A", shadow: "rgba(34,197,94,.18)" }} />
              <KpiCard icon="bi-person-check-fill"    label="Booked"           value={_v(loading ? null : counts.booked)}  accent={{ bg: "#E0E7FF", icon: "#4F46E5", shadow: "rgba(79,70,229,.18)" }} />
              <KpiCard icon="bi-slash-circle"         label="Closed"           value={_v(loading ? null : counts.blocked)} accent={{ bg: "#FFEDD5", icon: "#EA580C", shadow: "rgba(249,115,22,.18)" }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,340px)", gap: 16, alignItems: "start" }} className="slots-grid">

              {/* ── The month's slots ── */}
              <div style={s.panel}>
                <div style={s.panelHead}>
                  <div style={s.panelIcon}><i className="bi bi-calendar3" style={{ fontSize: 14, color: "#6366F1" }} /></div>
                  <span style={{ fontWeight: 800, fontSize: 13, color: "#0F172A" }}>{monthLabel(month)}</span>
                  <span style={s.countChip}>{loading ? "…" : `${byDate.length} day${byDate.length === 1 ? "" : "s"}`}</span>
                  <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
                    {["open", "booked", "blocked"].map((k) => (
                      <span key={k} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700, color: "#64748B" }}>
                        <span style={{ width: 9, height: 9, borderRadius: 3, background: tone[k].fg, display: "inline-block" }} />
                        {tone[k].label}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ padding: 18 }}>
                  {loading ? (
                    <div style={s.emptyCell}>Loading slots…</div>
                  ) : byDate.length === 0 ? (
                    <div style={s.emptyCell}>
                      No slots this month — use <b>Open slots in bulk</b> on the right to set up the whole month at once.
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 12 }}>
                      {byDate.map(([date, list]) => {
                        const d = dateLabel(date);
                        const past = date < todayStr();
                        return (
                          <div key={date} style={{
                            border: "1px solid #EEF0F7", borderRadius: 12, overflow: "hidden",
                            background: past ? "#FCFCFE" : "#fff", opacity: past ? 0.72 : 1,
                          }}>
                            <div style={{
                              display: "flex", alignItems: "center", gap: 9,
                              padding: "10px 12px", background: "#FAFAFF", borderBottom: "1px solid #F1F1FA",
                            }}>
                              <div style={{
                                width: 34, height: 34, borderRadius: 9, background: "#EEF2FF",
                                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                                lineHeight: 1, flexShrink: 0,
                              }}>
                                <span style={{ fontSize: 14, fontWeight: 900, color: "#4F46E5" }}>{d.day}</span>
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 12.5, fontWeight: 800, color: "#0F172A" }}>{d.weekday} {d.month}</div>
                                <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600 }}>
                                  {list.filter((x) => x.status === "open").length} open · {list.length} total
                                </div>
                              </div>
                            </div>

                            <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 7 }}>
                              {list.map((slot) => {
                                const t = tone[slot.status];
                                return (
                                  <div key={slot._id} style={{
                                    border: `1px solid ${t.border}`, background: t.bg, borderRadius: 9,
                                    padding: "7px 9px", display: "flex", alignItems: "center", gap: 8,
                                  }}>
                                    <div style={{ minWidth: 0, flex: 1 }}>
                                      <div style={{ fontSize: 12.5, fontWeight: 800, color: t.fg }}>
                                        {prettyTime(slot.time)}
                                      </div>
                                      {slot.status === "booked" && (
                                        <div style={{ fontSize: 10.5, color: "#64748B", fontWeight: 600, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                                             title={`${slot.booking?.name || ""} · ${slot.booking?.phone || ""}`}>
                                          {slot.booking?.name || "Booked"}
                                        </div>
                                      )}
                                    </div>
                                    {slot.status === "open" && (
                                      <button onClick={() => setStatus(slot, "blocked")} title="Close this slot" style={s.pillBtn}>
                                        <i className="bi bi-slash-circle" style={{ fontSize: 11 }} />
                                      </button>
                                    )}
                                    {slot.status === "blocked" && (
                                      <button onClick={() => setStatus(slot, "open")} title="Re-open this slot" style={s.pillBtn}>
                                        <i className="bi bi-arrow-counterclockwise" style={{ fontSize: 11 }} />
                                      </button>
                                    )}
                                    {slot.status === "booked" && (
                                      <button onClick={() => setStatus(slot, "open")} title="Cancel booking" style={s.pillBtn}>
                                        <i className="bi bi-x-lg" style={{ fontSize: 11 }} />
                                      </button>
                                    )}
                                    {slot.status !== "booked" && (
                                      <button onClick={() => removeSlot(slot)} title="Remove slot"
                                              style={{ ...s.pillBtn, color: "#DC2626" }}>
                                        <i className="bi bi-trash-fill" style={{ fontSize: 11 }} />
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Add slots ── */}
              <div>
                <div style={s.panel}>
                  <div style={s.panelHead}>
                    <div style={s.panelIcon}><i className="bi bi-lightning-charge-fill" style={{ fontSize: 14, color: "#6366F1" }} /></div>
                    <span style={{ fontWeight: 800, fontSize: 13, color: "#0F172A" }}>Open slots in bulk</span>
                  </div>
                  <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{ fontSize: 12, color: "#64748B", fontWeight: 600, lineHeight: 1.6 }}>
                      Opens the same times on every chosen weekday of <b>{monthLabel(month)}</b>.
                      Dates already gone and slots that exist are skipped.
                    </div>

                    <Field label="Times">
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                        {times.map((t) => (
                          <span key={t} style={{
                            display: "inline-flex", alignItems: "center", gap: 6,
                            background: "#EEF2FF", color: "#4F46E5", borderRadius: 999,
                            padding: "5px 8px 5px 11px", fontSize: 12, fontWeight: 800,
                          }}>
                            {prettyTime(t)}
                            <button onClick={() => setTimes(times.filter((x) => x !== t))} title="Remove" style={{
                              border: "none", background: "transparent", color: "#818CF8",
                              cursor: "pointer", padding: 0, lineHeight: 1, fontSize: 12,
                            }}>
                              <i className="bi bi-x-lg" />
                            </button>
                          </span>
                        ))}
                        {!times.length && <span style={{ fontSize: 12, color: "#94A3B8" }}>No times yet</span>}
                      </div>
                      <div style={{ display: "flex", gap: 7, marginTop: 8 }}>
                        <input
                          type="time" className="sp-input" style={{ ...s.input, flex: 1 }}
                          value={newTime} onChange={(e) => setNewTime(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTime(); } }}
                        />
                        <button onClick={addTime} style={{
                          height: 40, padding: "0 14px", borderRadius: 10, border: "1px dashed #C7D2FE",
                          background: "#F8FAFF", color: "#6366F1", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                        }}>
                          Add
                        </button>
                      </div>
                    </Field>

                    <Field label="Weekdays">
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {WEEKDAYS.map((d) => {
                          const on = days.includes(d.n);
                          return (
                            <button key={d.n} onClick={() => toggleDay(d.n)} style={{
                              padding: "7px 12px", borderRadius: 999, cursor: "pointer",
                              border: `1px solid ${on ? "#C7D2FE" : "#E2E8F0"}`,
                              background: on ? "#EEF2FF" : "#fff",
                              color: on ? "#4F46E5" : "#94A3B8",
                              fontSize: 12, fontWeight: 800,
                            }}>
                              {d.label}
                            </button>
                          );
                        })}
                      </div>
                    </Field>

                    <button onClick={openBulk} disabled={busy} style={{
                      border: "none", borderRadius: 10, height: 40,
                      background: "linear-gradient(135deg,#6366F1,#818CF8)",
                      color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                      boxShadow: "0 4px 12px rgba(99,102,241,.3)", opacity: busy ? 0.6 : 1,
                    }}>
                      <i className="bi bi-calendar2-plus-fill" style={{ fontSize: 14 }} />
                      {busy ? "Working…" : `Open ${monthLabel(month).split(" ")[0]} slots`}
                    </button>
                  </div>
                </div>

                <div style={s.panel}>
                  <div style={s.panelHead}>
                    <div style={s.panelIcon}><i className="bi bi-plus-circle-fill" style={{ fontSize: 14, color: "#6366F1" }} /></div>
                    <span style={{ fontWeight: 800, fontSize: 13, color: "#0F172A" }}>Add one slot</span>
                  </div>
                  <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
                    <Field label="Date">
                      <input type="date" className="sp-input" style={s.input}
                             value={oneDate} onChange={(e) => setOneDate(e.target.value)} />
                    </Field>
                    <Field label="Time">
                      <input type="time" className="sp-input" style={s.input}
                             value={oneTime} onChange={(e) => setOneTime(e.target.value)}
                             onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addOne(); } }} />
                    </Field>
                    <button onClick={addOne} disabled={busy} style={{
                      height: 40, borderRadius: 10, border: "1px solid #C7D2FE",
                      background: "#F8FAFF", color: "#6366F1", fontSize: 13, fontWeight: 700,
                      cursor: "pointer", opacity: busy ? 0.6 : 1,
                    }}>
                      Add slot
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <style jsx global>{`
        .sp-input:focus { border-color: #818CF8 !important; box-shadow: 0 0 0 3px rgba(99,102,241,.12); }
        @media (max-width: 1100px) {
          .slots-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}

export async function getServerSideProps({ req }) {
  const cookie = req.headers.cookie || "";
  if (!cookie.includes("admin_auth=true") && !cookie.includes("admin_user_token=")) {
    return { redirect: { destination: "/dashboard/login", permanent: false } };
  }
  return { props: {} };
}

const s = {
  panel: {
    background: "#fff", borderRadius: 16, border: "1px solid #F0F0F8",
    boxShadow: "0 2px 8px rgba(99,102,241,.06)", overflow: "hidden", marginBottom: 16,
  },
  panelHead: {
    padding: "14px 18px 12px", borderBottom: "1px solid #F4F4FD",
    display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap",
  },
  panelIcon: {
    width: 30, height: 30, borderRadius: 9, background: "#6366F118",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  countChip: {
    fontSize: 11, fontWeight: 800, background: "#EEF2FF", color: "#6366F1",
    borderRadius: 20, padding: "2px 10px",
  },
  navBtn: {
    width: 38, height: 38, borderRadius: 10, border: "1px solid #E2E8F0",
    background: "#fff", color: "#475569", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  pillBtn: {
    width: 24, height: 24, borderRadius: 7, border: "none", background: "rgba(255,255,255,.75)",
    color: "#475569", cursor: "pointer", flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  field:      { display: "flex", flexDirection: "column", gap: 6, minWidth: 0 },
  fieldLabel: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "#64748B" },
  fieldHint:  { fontSize: 11.5, color: "#94A3B8", fontWeight: 500, marginTop: -2 },
  input:      { height: 40, border: "1px solid #E2E8F0", borderRadius: 10, padding: "0 12px", fontSize: 13.5, color: "#1E293B", background: "#fff", outline: "none", boxSizing: "border-box", width: "100%" },
  emptyCell:  { textAlign: "center", padding: "40px 16px", color: "#94A3B8", fontSize: 13.5 },
};

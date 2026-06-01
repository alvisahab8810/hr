/**
 * DateTimeInput — custom DD/MM/YYYY HH:MM input with:
 *  - 24-hour time
 *  - Auto-advance between segments on completion
 *  - Backspace moves to previous segment
 *  - Accepts/returns value as "YYYY-MM-DDTHH:mm" (datetime-local format)
 */
import { useEffect, useRef, useState } from "react";

export default function DateTimeInput({ value, onChange, style, className, placeholder = "DD/MM/YYYY  HH:MM" }) {
  const [dd,  setDd]  = useState("");
  const [mm,  setMm]  = useState("");
  const [yy,  setYy]  = useState("");
  const [hh,  setHh]  = useState("");
  const [min, setMin] = useState("");

  const mmRef  = useRef(null);
  const yyRef  = useRef(null);
  const hhRef  = useRef(null);
  const minRef = useRef(null);

  // Parse incoming YYYY-MM-DDTHH:mm value
  useEffect(() => {
    if (!value) { setDd(""); setMm(""); setYy(""); setHh(""); setMin(""); return; }
    const [datePart = "", timePart = ""] = value.split("T");
    const [y = "", mo = "", d = ""] = datePart.split("-");
    const [h = "", mi = ""] = timePart.split(":");
    setYy(y); setMm(mo); setDd(d); setHh(h); setMin(mi);
  }, [value]);

  // Emit combined value upward
  function emit(nDd, nMm, nYy, nHh, nMin) {
    if (!nDd || !nMm || !nYy || nHh === "" || nMin === "") return;
    const combined = `${nYy.padStart(4, "0")}-${nMm.padStart(2, "0")}-${nDd.padStart(2, "0")}T${nHh.padStart(2, "0")}:${nMin.padStart(2, "0")}`;
    onChange({ target: { value: combined } });
  }

  function clamp(v, lo, hi) {
    const n = parseInt(v, 10);
    if (isNaN(n)) return v;
    return String(Math.min(Math.max(n, lo), hi)).padStart(2, "0");
  }

  // DD handler
  function onDd(e) {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 2);
    setDd(raw);
    emit(raw, mm, yy, hh, min);
    // Auto-advance: if 2 digits entered OR first digit > 3 (impossible for day)
    if (raw.length === 2 || (raw.length === 1 && parseInt(raw) > 3)) {
      mmRef.current?.focus();
      mmRef.current?.select();
    }
  }
  function onDdBlur() {
    if (dd) { const v = clamp(dd, 1, 31); setDd(v); emit(v, mm, yy, hh, min); }
  }
  function onDdKey(e) {
    if (e.key === "ArrowRight" && (e.target.selectionStart >= dd.length)) { e.preventDefault(); mmRef.current?.focus(); mmRef.current?.select(); }
  }

  // MM handler
  function onMm(e) {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 2);
    setMm(raw);
    emit(dd, raw, yy, hh, min);
    if (raw.length === 2 || (raw.length === 1 && parseInt(raw) > 1)) {
      yyRef.current?.focus();
      yyRef.current?.select();
    }
  }
  function onMmBlur() {
    if (mm) { const v = clamp(mm, 1, 12); setMm(v); emit(dd, v, yy, hh, min); }
  }
  function onMmKey(e) {
    if (e.key === "Backspace" && mm === "") { e.preventDefault(); const el = mmRef.current?.previousElementSibling?.previousElementSibling; el?.focus(); el?.select(); }
    if (e.key === "ArrowLeft")  { e.preventDefault(); const el = mmRef.current?.previousElementSibling?.previousElementSibling; el?.focus(); el?.select(); }
    if (e.key === "ArrowRight" && (e.target.selectionStart >= mm.length)) { e.preventDefault(); yyRef.current?.focus(); yyRef.current?.select(); }
  }

  // YYYY handler
  function onYy(e) {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 4);
    setYy(raw);
    emit(dd, mm, raw, hh, min);
    if (raw.length === 4) { hhRef.current?.focus(); hhRef.current?.select(); }
  }
  function onYyKey(e) {
    if (e.key === "Backspace" && yy === "") { e.preventDefault(); mmRef.current?.focus(); mmRef.current?.select(); }
    if (e.key === "ArrowLeft")  { e.preventDefault(); mmRef.current?.focus(); mmRef.current?.select(); }
    if (e.key === "ArrowRight" && (e.target.selectionStart >= yy.length)) { e.preventDefault(); hhRef.current?.focus(); hhRef.current?.select(); }
  }

  // HH handler (24-hour, 00-23)
  function onHh(e) {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 2);
    setHh(raw);
    emit(dd, mm, yy, raw, min);
    if (raw.length === 2 || (raw.length === 1 && parseInt(raw) > 2)) {
      minRef.current?.focus();
      minRef.current?.select();
    }
  }
  function onHhBlur() {
    if (hh) { const v = clamp(hh, 0, 23); setHh(v); emit(dd, mm, yy, v, min); }
  }
  function onHhKey(e) {
    if (e.key === "Backspace" && hh === "") { e.preventDefault(); yyRef.current?.focus(); yyRef.current?.select(); }
    if (e.key === "ArrowLeft")  { e.preventDefault(); yyRef.current?.focus(); yyRef.current?.select(); }
    if (e.key === "ArrowRight" && (e.target.selectionStart >= hh.length)) { e.preventDefault(); minRef.current?.focus(); minRef.current?.select(); }
  }

  // MM (minutes) handler (00-59)
  function onMin(e) {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 2);
    setMin(raw);
    emit(dd, mm, yy, hh, raw);
  }
  function onMinBlur() {
    if (min) { const v = clamp(min, 0, 59); setMin(v); emit(dd, mm, yy, hh, v); }
  }
  function onMinKey(e) {
    if (e.key === "Backspace" && min === "") { e.preventDefault(); hhRef.current?.focus(); hhRef.current?.select(); }
    if (e.key === "ArrowLeft") { e.preventDefault(); hhRef.current?.focus(); hhRef.current?.select(); }
  }

  // Shared input style
  const seg = {
    border: "none", outline: "none", background: "transparent",
    fontFamily: "inherit", fontSize: 13.5, color: "#1e293b",
    textAlign: "center", padding: 0,
  };
  const sep = { color: "#94a3b8", fontSize: 13, userSelect: "none", flexShrink: 0 };

  return (
    <div
      className={className}
      style={{
        display: "flex", alignItems: "center", gap: 2,
        border: "1.5px solid #E5E7EB", borderRadius: 8,
        padding: "9px 12px", background: "#fff", cursor: "text",
        ...style,
      }}
      onClick={() => !dd && document.activeElement !== mmRef.current && document.activeElement !== yyRef.current && document.activeElement !== hhRef.current && document.activeElement !== minRef.current && mmRef.current?.previousElementSibling?.previousElementSibling?.focus()}
    >
      {/* Day */}
      <input type="text" inputMode="numeric" maxLength={2} value={dd}
        onChange={onDd} onBlur={onDdBlur} onKeyDown={onDdKey}
        placeholder="DD" style={{ ...seg, width: 22 }} />
      <span style={sep}>/</span>
      {/* Month */}
      <input ref={mmRef} type="text" inputMode="numeric" maxLength={2} value={mm}
        onChange={onMm} onBlur={onMmBlur} onKeyDown={onMmKey}
        placeholder="MM" style={{ ...seg, width: 22 }} />
      <span style={sep}>/</span>
      {/* Year */}
      <input ref={yyRef} type="text" inputMode="numeric" maxLength={4} value={yy}
        onChange={onYy} onKeyDown={onYyKey}
        placeholder="YYYY" style={{ ...seg, width: 38 }} />

      {/* Spacer */}
      <span style={{ ...sep, margin: "0 4px" }}>·</span>

      {/* Hours */}
      <input ref={hhRef} type="text" inputMode="numeric" maxLength={2} value={hh}
        onChange={onHh} onBlur={onHhBlur} onKeyDown={onHhKey}
        placeholder="HH" style={{ ...seg, width: 22 }} />
      <span style={sep}>:</span>
      {/* Minutes */}
      <input ref={minRef} type="text" inputMode="numeric" maxLength={2} value={min}
        onChange={onMin} onBlur={onMinBlur} onKeyDown={onMinKey}
        placeholder="MM" style={{ ...seg, width: 22 }} />
    </div>
  );
}

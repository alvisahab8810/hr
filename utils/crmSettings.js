// utils/crmSettings.js — the client side of /api/admin/settings.
// One fetch per page load, cached in the module, shared by every component that
// asks. Lists edited in Settings show up in the dropdowns the moment the page
// is opened again, and the document branding is pushed into DocPreview so the
// printed invoice and proposal carry whatever Settings holds.
import { useEffect, useState } from "react";
import { applyDocBranding } from "@/components/DocPreview";

let CACHE = null;
let INFLIGHT = null;
const subs = new Set();

export function loadCrmSettings() {
  if (CACHE) return Promise.resolve(CACHE);
  if (!INFLIGHT) {
    INFLIGHT = fetch("/api/admin/settings", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => {
        CACHE = j?.success ? j.data : {};
        applyDocBranding(CACHE.company, CACHE.docs?.terms);
        subs.forEach((fn) => fn(CACHE));
        return CACHE;
      })
      .catch(() => (CACHE = {}))
      .finally(() => { INFLIGHT = null; });
  }
  return INFLIGHT;
}

// Called after a save so the next reader gets the new values.
export function clearCrmSettings() { CACHE = null; }

export function useCrmSettings() {
  const [v, setV] = useState(CACHE);
  useEffect(() => {
    subs.add(setV);
    loadCrmSettings().then(setV);
    return () => subs.delete(setV);
  }, []);
  return v || {};
}

// The saved list wins; the built-in list is the fallback until it loads.
export function useList(key, fallback) {
  const s = useCrmSettings();
  const a = s?.lists?.[key];
  return Array.isArray(a) && a.length ? a : fallback;
}

// utils/proposalItems.js — a proposal can carry more than one service, and the
// total is simply what the lines add up to. Older proposals have a single
// `svc` + `amount` and no lines at all, so everything that reads a proposal
// goes through here and gets the same shape either way.

export function cleanItems(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((x) => ({
      svc: String(x?.svc || "").trim(),
      note: String(x?.note || "").trim(),
      amount: Math.max(0, Math.round(Number(x?.amount || 0))),
    }))
    .filter((x) => x.svc || x.amount);
}

// What the lines add up to.
export const itemsTotal = (list) =>
  cleanItems(list).reduce((a, x) => a + x.amount, 0);

// The lines to show, whether the proposal is new-style or old.
export function docItems(d) {
  const items = cleanItems(d?.items);
  if (items.length) return items;
  return [{ svc: String(d?.svc || "Service"), note: "", amount: Number(d?.amount || 0) }];
}

// The one-line summary that sits in the Service column and in the PDF prose.
export const itemsLabel = (list) => {
  const names = cleanItems(list).map((x) => x.svc).filter(Boolean);
  return names.join(", ");
};

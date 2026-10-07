// utils/proposalItems.js — a proposal can carry more than one service, and the
// total is simply what the lines add up to. Older proposals have a single
// `svc` + `amount` and no lines at all, so everything that reads a proposal
// goes through here and gets the same shape either way.

export function cleanItems(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((x) => {
      // An invoice line is quantity x unit price; a proposal line is just a
      // value. Where a rate is typed it decides the amount, so the two can
      // never disagree on the sheet; where it is not, the line keeps the
      // amount it was saved with and prints as one unit of it.
      const qty = Math.max(0, Number(x?.qty || 0));
      const rate = Math.max(0, Math.round(Number(x?.rate || 0)));
      const amount = rate
        ? Math.round((qty || 1) * rate)
        : Math.max(0, Math.round(Number(x?.amount || 0)));
      return {
        svc: String(x?.svc || "").trim(),
        note: String(x?.note || "").trim(),
        qty: qty || 1,
        rate: rate || amount,
        amount,
        // Only an invoice fills this in; a proposal line simply carries "".
        hsn: String(x?.hsn || "").trim(),
      };
    })
    .filter((x) => x.svc || x.amount);
}

// What the lines add up to.
export const itemsTotal = (list) =>
  cleanItems(list).reduce((a, x) => a + x.amount, 0);

// The lines to show, whether the proposal is new-style or old.
export function docItems(d) {
  const items = cleanItems(d?.items);
  if (items.length) return items;
  const amount = Number(d?.amount || 0);
  return [{ svc: String(d?.svc || "Service"), note: "", qty: 1, rate: amount, amount, hsn: "" }];
}

// The one-line summary that sits in the Service column and in the PDF prose.
export const itemsLabel = (list) => {
  const names = cleanItems(list).map((x) => x.svc).filter(Boolean);
  return names.join(", ");
};

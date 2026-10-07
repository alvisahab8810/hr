// utils/invoiceNo.js — the serial printed on the face of a tax invoice.
//
// A GST invoice number has to be a consecutive serial, unique for the whole
// financial year, and it has to stay quotable: once a client has the bill, the
// number on it can never move. That rules out anything worked out from the row
// id, which is what the board used to show -- those are neither consecutive
// nor in the order the invoices were raised. So the serial is handed out once,
// when the invoice is created, and stored on it.
//
// Shape: VIR/26-27/001 — the prefix comes from Settings so the business can
// change what it bills under without the numbers already issued moving.

// India's financial year runs April to March, so an invoice raised in January
// belongs to the year that started the previous April.
export function fyOf(issued) {
  const d = issued ? new Date(`${String(issued).slice(0, 10)}T00:00:00Z`) : new Date();
  const y = d.getUTCFullYear();
  const start = d.getUTCMonth() >= 3 ? y : y - 1;
  return `${String(start % 100).padStart(2, "0")}-${String((start + 1) % 100).padStart(2, "0")}`;
}

export const serialPrefix = (prefix, issued) => `${prefix || "VIR"}/${fyOf(issued)}/`;

// The next serial in that year's run. Taken from the highest one already
// issued rather than from a count, because a count would repeat a number the
// moment an invoice is ever deleted.
export async function nextInvoiceNo(Invoice, issued, prefix) {
  const head = serialPrefix(prefix, issued);
  const rows = await Invoice.find({ no: { $regex: `^${head.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}` } })
    .select("no")
    .lean();
  const top = rows.reduce(
    (n, r) => Math.max(n, parseInt(String(r.no).slice(head.length), 10) || 0),
    0
  );
  return `${head}${String(top + 1).padStart(3, "0")}`;
}

// What to print for an invoice. Rows raised before serials existed keep the
// id-derived code the client was already quoted.
export const invoiceNo = (i) =>
  String(i?.no || "").trim() || `INV-${String(i?._id || "").slice(-4).toUpperCase()}`;

/**
 * Static mock data standing in for the not-yet-built Invoice Flags backend.
 * Shaped the way the real API is expected to respond (see
 * docs/invoice-flags-api-contract.md) so swapping
 * Services/apis/invoiceFlagsApi.js from `queryFn` to a real `query` later
 * needs no changes to anything that reads it.
 */

/** "Other invoices in the system" — the dataset duplicate-checking runs against. */
export const MOCK_OTHER_INVOICES = [
  {
    id: "inv-9001",
    invoiceNumber: "JBC/25-26/116",
    vendorId: "vendor-201",
    vendorName: "Everest Office Supplies",
    amount: 18500,
    currency: "INR",
    invoiceDate: "2026-03-10",
    createdAt: "2026-03-10T16:25:00Z",
    status: "Approved",
  },
  {
    id: "inv-9002",
    invoiceNumber: "JBC/25-26/116",
    vendorId: "vendor-201",
    vendorName: "Everest Office Supplies",
    amount: 18500,
    currency: "INR",
    invoiceDate: "2026-03-12",
    createdAt: "2026-03-12T11:56:00Z",
    status: "Rejected",
  },
  {
    id: "inv-9003",
    invoiceNumber: "JBC/24-25/882",
    vendorId: "vendor-201",
    vendorName: "Everest Office Supplies",
    amount: 18500,
    currency: "INR",
    invoiceDate: "2025-11-02",
    createdAt: "2025-11-02T09:15:00Z",
    status: "Approved",
  },
  {
    id: "inv-9004",
    invoiceNumber: "NIM-4471",
    vendorId: "vendor-118",
    vendorName: "Nimbus Logistics Pvt Ltd",
    amount: 74250,
    currency: "INR",
    invoiceDate: "2026-05-14",
    createdAt: "2026-05-14T10:02:00Z",
    status: "Approved",
  },
];

/**
 * §5.4 threshold defaults — org-configurable per the MD's §9 ("stale invoice
 * days" and friends), mocked here as fixed numbers until a real settings
 * backend exists. Exported (not inlined) so flagRules/datesAccountingPeriod.js
 * can fall back to these exact values when reference data hasn't loaded yet,
 * rather than a second hardcoded copy of the same number.
 */
export const DEFAULT_STALE_INVOICE_THRESHOLD_DAYS = 90; // MD §5.4: "90 days by default"
export const DEFAULT_FUTURE_DATED_TOLERANCE_DAYS = 0; // MD §9: Future-Dated Invoice has configurable strictness
// Placeholder only — no real GST ITC filing-calendar backend exists anywhere
// in this codebase. A real implementation needs the actual statutory
// deadline (tied to GSTR-3B/annual-return filing dates), not a fixed day
// count from the invoice date. See docs/invoice-flags-api-contract.md.
export const DEFAULT_ITC_CLAIM_WINDOW_WARNING_DAYS = 180;

/** "The accounting period that's currently open" — no real period-lock concept exists yet; mocked as the current calendar month. */
export const getMockCurrentAccountingPeriod = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const toIso = (date) => date.toISOString().slice(0, 10);
  return { start: toIso(start), end: toIso(end) };
};

/**
 * Shared duplicate-detection logic — used both by the DUPLICATE_INVOICE rule
 * (flagRules/duplicates.js, reading the already-fetched candidates) and by
 * the mock queryFn in Services/apis/invoiceFlagsApi.js (computing those
 * candidates against the mock "other invoices" dataset). Kept in one place
 * so a real backend implementation has a single, precise spec to match.
 *
 * Four layers per the spec, exact to loosest:
 *   exact        — same vendor, same invoice number, same financial year
 *   crossYear    — same vendor, same invoice number, different financial year
 *   economic     — same vendor, same amount, invoice dates within a week, different number
 *   sameFile     — identical uploaded file, any vendor
 * Cancelled/rejected invoices never count as real duplicates but still show
 * in the evidence list, marked `deemphasized: true`.
 */

const CANCELLED_OR_REJECTED_STATUSES = new Set(["cancelled", "canceled", "rejected"]);

const isDeemphasizedStatus = (status) =>
  CANCELLED_OR_REJECTED_STATUSES.has(String(status ?? "").trim().toLowerCase());

/** Whitespace/case-insensitive, but slashes and hyphens are kept — JBC/25-26/116 !== JBC2526116. */
export const normalizeInvoiceNumberForCompare = (value) =>
  String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

/** April-March Indian financial year, e.g. 2026-03-15 -> "2025-26". */
export const getFinancialYearForDate = (dateStr) => {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-based, 0 = Jan
  const startYear = month >= 3 ? year : year - 1; // FY starts in April (month index 3)
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
};

const daysBetween = (a, b) => {
  const dateA = new Date(a);
  const dateB = new Date(b);
  if (Number.isNaN(dateA.getTime()) || Number.isNaN(dateB.getTime())) return Infinity;
  return Math.abs(dateA.getTime() - dateB.getTime()) / (1000 * 60 * 60 * 24);
};

const isSameVendor = (invoice, { vendorId, vendorName }) => {
  if (vendorId && invoice.vendorId) return invoice.vendorId === vendorId;
  return (
    !!vendorName &&
    !!invoice.vendorName &&
    String(invoice.vendorName).trim().toLowerCase() === String(vendorName).trim().toLowerCase()
  );
};

const markDeemphasized = (rows) =>
  rows.map((row) => ({ ...row, deemphasized: isDeemphasizedStatus(row.status) }));

/**
 * params: { vendorId, vendorName, invoiceNumber, amount, invoiceDate, fileHash, excludeInvoiceId }
 * allInvoices: mock/real dataset of other invoices already in the system.
 * returns: { exactMatches, crossYearMatches, economicMatches, sameFileMatches } — each an array,
 * already including cancelled/rejected rows (with `deemphasized: true`), not excluding them.
 */
export const computeDuplicateCandidates = (params = {}, allInvoices = []) => {
  const { vendorId, vendorName, invoiceNumber, amount, invoiceDate, fileHash, excludeInvoiceId } = params;
  const normalizedNumber = normalizeInvoiceNumberForCompare(invoiceNumber);
  const financialYear = getFinancialYearForDate(invoiceDate);
  const candidates = allInvoices.filter((invoice) => invoice.id !== excludeInvoiceId);

  const numberMatches = normalizedNumber
    ? candidates.filter(
        (invoice) =>
          isSameVendor(invoice, { vendorId, vendorName }) &&
          normalizeInvoiceNumberForCompare(invoice.invoiceNumber) === normalizedNumber,
      )
    : [];

  const exactMatches = numberMatches.filter(
    (invoice) => getFinancialYearForDate(invoice.invoiceDate) === financialYear,
  );
  const crossYearMatches = numberMatches.filter(
    (invoice) => getFinancialYearForDate(invoice.invoiceDate) !== financialYear,
  );

  const numericAmount = Number(amount);
  const economicMatches =
    Number.isFinite(numericAmount) && invoiceDate
      ? candidates.filter(
          (invoice) =>
            isSameVendor(invoice, { vendorId, vendorName }) &&
            normalizeInvoiceNumberForCompare(invoice.invoiceNumber) !== normalizedNumber &&
            Number(invoice.amount) === numericAmount &&
            daysBetween(invoice.invoiceDate, invoiceDate) <= 7,
        )
      : [];

  const sameFileMatches = fileHash
    ? candidates.filter((invoice) => invoice.fileHash && invoice.fileHash === fileHash)
    : [];

  return {
    exactMatches: markDeemphasized(exactMatches),
    crossYearMatches: markDeemphasized(crossYearMatches),
    economicMatches: markDeemphasized(economicMatches),
    sameFileMatches: markDeemphasized(sameFileMatches),
  };
};

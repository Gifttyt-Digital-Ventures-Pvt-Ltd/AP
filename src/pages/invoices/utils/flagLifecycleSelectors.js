import { INVOICE_FLAG_SEVERITY, INVOICE_FLAG_STATUS } from "../constants/invoiceFlags";

/**
 * Pure derivations over already-merged flag lists (useInvoiceFlags.js's own
 * activeFlags/resolvedFlags) — kept dependency-free (no React, no RTK
 * Query) on purpose, same principle as invoiceFlagsEngine.js/flagRules/*.js,
 * specifically so these stay importable by
 * scripts/verify-invoice-flags-engine.mjs without pulling in
 * useInvoiceFlags.js's own RTK Query API imports (which reach
 * import.meta.env.VITE_BACKEND_URL — not available outside a Vite runtime).
 */
export const BLOCKING_SEVERITIES = new Set([
  INVOICE_FLAG_SEVERITY.MUST_FIX,
  INVOICE_FLAG_SEVERITY.MUST_EXPLAIN,
]);

/**
 * "N blocking flags resolved by maker" (MD §8).
 *
 * Counts flag *instances* (not catalog entries), so two per-line instances
 * of the same flag key each count separately. AUTO_CLEARED is deliberately
 * excluded — its underlying problem is already gone, nothing live for a
 * reviewer to second-guess. This app doesn't tag a resolution record with
 * "maker" vs "checker" — only resolvedBy {id, name} — so "resolved by
 * someone other than whoever is currently looking at this" is the honest,
 * available proxy for the MD's "by maker" framing; it will read "resolved
 * by maker" in the UI even in the (currently unreachable in practice) case
 * where a checker resolved something an approver is now reviewing. A
 * missing/legacy resolvedBy must never be treated as "resolved by the
 * current viewer" (that would silently hide a real resolution from the
 * callout) — the truthy check on resolvedById before comparing guards
 * exactly that.
 */
export const selectBlockingFlagsResolvedByOthers = (resolvedFlags = [], currentUserId = null) =>
  resolvedFlags.filter((flag) => {
    if (flag.status !== INVOICE_FLAG_STATUS.RESOLVED) return false;
    if (!BLOCKING_SEVERITIES.has(flag.severity)) return false;
    const resolvedById = flag.record?.resolvedBy?.id;
    const resolvedByCurrentUser = Boolean(resolvedById) && resolvedById === currentUserId;
    return !resolvedByCurrentUser;
  });

import React from "react";
import { Badge } from "../../../../components/ui/badge";
import { INVOICE_FLAG_SEVERITY } from "../../constants/invoiceFlags";

/**
 * Severity-colored pill — colorMap-as-prop convention this app already uses
 * everywhere else for status badges (e.g. pages/order-tracking/components/StatusBadge.jsx),
 * scoped locally here rather than a new shared cross-app component.
 */
const SEVERITY_COLOR_MAP = {
  [INVOICE_FLAG_SEVERITY.MUST_FIX]: "border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
  [INVOICE_FLAG_SEVERITY.MUST_EXPLAIN]: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
  [INVOICE_FLAG_SEVERITY.WORTH_CHECKING]: "border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300",
  [INVOICE_FLAG_SEVERITY.JUST_SO_YOU_KNOW]: "border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300",
};

const InvoiceFlagChip = ({ flag, onClick, className = "", ...props }) => (
  <button
    type="button"
    onClick={onClick}
    className={`inline-flex ${className}`}
    data-testid={`invoice-flag-chip-${flag.key}`}
    {...props}
  >
    <Badge
      variant="outline"
      className={`cursor-pointer border font-medium ${SEVERITY_COLOR_MAP[flag.severity] || SEVERITY_COLOR_MAP[INVOICE_FLAG_SEVERITY.WORTH_CHECKING]}`}
    >
      {flag.title}
    </Badge>
  </button>
);

export default InvoiceFlagChip;

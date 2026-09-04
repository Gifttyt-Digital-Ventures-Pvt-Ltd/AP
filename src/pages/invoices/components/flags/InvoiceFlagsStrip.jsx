import React from "react";
import { AlertTriangle } from "lucide-react";
import InvoiceFlagChip from "./InvoiceFlagChip";

/**
 * Top-of-form yellow strip. Modeled on components/AccountingLockBanner.jsx's
 * visual language (full-width amber flex strip, leading icon, pill chips)
 * since no generic reusable "warning strip" component exists in this app yet.
 *
 * Every chip — including "+N more" — opens the same Flags dialog; a chip is
 * a label, not a per-flag shortcut, per spec. Wording softens when only
 * low-priority (Worth checking / Just so you know) flags remain, since
 * those never block submission.
 */
const InvoiceFlagsStrip = ({ activeFlags = [], isLowPriorityOnly = false, onOpen }) => {
  if (activeFlags.length === 0) return null;

  const visibleFlags = activeFlags.slice(0, 2);
  const remainingCount = activeFlags.length - visibleFlags.length;

  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
      data-testid="invoice-flags-strip"
    >
      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <span className="font-medium">
        {isLowPriorityOnly
          ? "You can submit, but please review."
          : "This Invoice Has Open Flags, Please Review Before Submission."}
      </span>
      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        {visibleFlags.map((flag) => (
          <InvoiceFlagChip key={flag.instanceId} flag={flag} onClick={onOpen} />
        ))}
        {remainingCount > 0 ? (
          <button
            type="button"
            onClick={onOpen}
            className="rounded-full border border-amber-300 bg-white px-2 py-0.5 text-xs font-medium text-amber-900 hover:bg-amber-100 dark:border-amber-800 dark:bg-transparent dark:text-amber-200"
            data-testid="invoice-flags-more-chip"
          >
            +{remainingCount} more
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default InvoiceFlagsStrip;

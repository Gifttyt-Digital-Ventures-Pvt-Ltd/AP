import React from "react";
import { format } from "date-fns";
import { INVOICE_FLAG_ACTION, INVOICE_FLAG_STATUS } from "../../constants/invoiceFlags";

/** Row shape modeled on InvoiceLinkedTaxInvoicesPanel.jsx's card-in-a-list pattern. */
const InvoiceFlagCard = ({ flag, onResolveClick, onFixInFormClick, onViewAndResolveClick, onReopenClick }) => {
  const isResolvedTab = flag.status !== INVOICE_FLAG_STATUS.ACTIVE;
  const description = flag.describe ? flag.describe(flag.evidence) : "";

  const actionLabel =
    flag.actionKind === INVOICE_FLAG_ACTION.FIX_IN_FORM
      ? "Fix in form"
      : flag.actionKind === INVOICE_FLAG_ACTION.VIEW_AND_RESOLVE
        ? "View and Resolve"
        : "Resolve";

  // Whichever callback actually corresponds to this flag's own actionKind —
  // not just "is any callback present." A caller that wants a fully
  // read-only card (e.g. the View Invoice page) simply omits all three
  // callbacks, and the action row disappears on its own; a caller that only
  // wants some actions (already true for onReopenClick below, which has
  // always been conditional) gets that for free too, with no separate
  // "read-only mode" flag anywhere.
  const relevantActionCallback =
    flag.actionKind === INVOICE_FLAG_ACTION.FIX_IN_FORM
      ? onFixInFormClick
      : flag.actionKind === INVOICE_FLAG_ACTION.VIEW_AND_RESOLVE
        ? onViewAndResolveClick
        : onResolveClick;

  const handleActionClick = () => {
    if (flag.actionKind === INVOICE_FLAG_ACTION.FIX_IN_FORM) {
      onFixInFormClick?.(flag);
    } else if (flag.actionKind === INVOICE_FLAG_ACTION.VIEW_AND_RESOLVE) {
      onViewAndResolveClick?.(flag);
    } else {
      onResolveClick?.(flag);
    }
  };

  return (
    <div
      className="space-y-2 rounded-lg border border-border p-3"
      data-testid={`invoice-flag-card-${flag.key}`}
    >
      <p className="text-sm font-semibold text-foreground">{flag.title}</p>
      {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}

      {isResolvedTab ? (
        <div className="space-y-1 rounded-md bg-muted/50 px-2.5 py-2 text-xs text-muted-foreground">
          {flag.status === INVOICE_FLAG_STATUS.AUTO_CLEARED ? (
            <p className="font-medium text-green-700 dark:text-green-400">Auto-cleared</p>
          ) : (
            <>
              <p>
                <span className="font-medium text-foreground">{flag.record?.resolvedBy?.name || "Unknown"}</span>
                {flag.record?.resolvedAt ? (
                  <> · {format(new Date(flag.record.resolvedAt), "d MMM yyyy, h:mm a")}</>
                ) : null}
              </p>
              {flag.record?.reason ? <p className="whitespace-pre-line">{flag.record.reason}</p> : null}
              {/* Reopen only ever shows for a genuinely RESOLVED flag — never
                  AUTO_CLEARED, since this whole branch is already gated on
                  that above. onReopenClick is only passed by the
                  reviewer/checker-approver surface; the maker's own dialog
                  never receives it, so this stays hidden there. */}
              {onReopenClick ? (
                <button
                  type="button"
                  onClick={() => onReopenClick(flag)}
                  className="pt-1 text-sm font-medium text-button-primary underline-offset-2 hover:underline"
                  data-testid={`invoice-flag-reopen-${flag.key}`}
                >
                  Reopen
                </button>
              ) : null}
            </>
          )}
        </div>
      ) : relevantActionCallback ? (
        <button
          type="button"
          onClick={handleActionClick}
          className="text-sm font-medium text-button-primary underline-offset-2 hover:underline"
          data-testid={`invoice-flag-action-${flag.key}`}
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
};

export default InvoiceFlagCard;

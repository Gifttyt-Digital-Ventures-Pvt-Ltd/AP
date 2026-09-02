import React from "react";
import { format } from "date-fns";
import { INVOICE_FLAG_ACTION, INVOICE_FLAG_STATUS } from "../../constants/invoiceFlags";

/** Row shape modeled on InvoiceLinkedTaxInvoicesPanel.jsx's card-in-a-list pattern. */
const InvoiceFlagCard = ({ flag, onResolveClick, onFixInFormClick, onViewAndResolveClick, onReopenClick }) => {
  const isResolvedTab = flag.status !== INVOICE_FLAG_STATUS.ACTIVE;
  const description = flag.describe ? flag.describe(flag.evidence) : "";

  // Each possible action is independently gated on (a) this flag's own
  // actionKind actually offering it, and (b) the caller having actually
  // supplied the matching callback — not just "is any callback present." A
  // caller that wants a fully read-only card (e.g. the View Invoice page)
  // simply omits all callbacks, and every action row disappears on its own;
  // a caller that only wants some actions (already true for onReopenClick
  // below, which has always been conditional) gets that for free too, with
  // no separate "read-only mode" flag anywhere. FIX_OR_RESOLVE is the only
  // actionKind where more than one of these can be true at once — Due Date
  // Not Set is the first flag to use it, so both buttons render side by side.
  const showFixInForm =
    (flag.actionKind === INVOICE_FLAG_ACTION.FIX_IN_FORM ||
      flag.actionKind === INVOICE_FLAG_ACTION.FIX_OR_RESOLVE) &&
    Boolean(onFixInFormClick);
  const showResolve =
    (flag.actionKind === INVOICE_FLAG_ACTION.RESOLVE ||
      flag.actionKind === INVOICE_FLAG_ACTION.FIX_OR_RESOLVE) &&
    Boolean(onResolveClick);
  const showViewAndResolve =
    flag.actionKind === INVOICE_FLAG_ACTION.VIEW_AND_RESOLVE && Boolean(onViewAndResolveClick);
  const hasAnyAction = showFixInForm || showResolve || showViewAndResolve;

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
      ) : hasAnyAction ? (
        <div className="flex items-center gap-4">
          {showFixInForm ? (
            <button
              type="button"
              onClick={() => onFixInFormClick(flag)}
              className="text-sm font-medium text-button-primary underline-offset-2 hover:underline"
              data-testid={`invoice-flag-action-${flag.key}`}
            >
              Fix in form
            </button>
          ) : null}
          {showResolve ? (
            <button
              type="button"
              onClick={() => onResolveClick(flag)}
              className="text-sm font-medium text-button-primary underline-offset-2 hover:underline"
              data-testid={`invoice-flag-resolve-action-${flag.key}`}
            >
              Resolve
            </button>
          ) : null}
          {showViewAndResolve ? (
            <button
              type="button"
              onClick={() => onViewAndResolveClick(flag)}
              className="text-sm font-medium text-button-primary underline-offset-2 hover:underline"
              data-testid={`invoice-flag-action-${flag.key}`}
            >
              View and Resolve
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export default InvoiceFlagCard;

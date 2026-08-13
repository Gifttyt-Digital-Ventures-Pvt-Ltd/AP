import React from "react";
import { Badge } from "../../../components/ui/badge";
import { formatCurrency } from "../../../utils/currency";
import { formatDate } from "../utils";

/**
 * Advance balances (spec §12.6). Reuses the same data shape already shipped
 * elsewhere in this app for PO/vendor advances (normalizeAdvanceContext /
 * AdvanceContextPanel — src/utils/vendorAdvanceContext.js), re-scoped to
 * this order rather than inventing a new one. Per spec §3's v1 constraint,
 * this only ever reflects pre-pool, per-order advances — cross-order pooled
 * advances don't exist until CR-001 Phase 2.
 */
const OrderTrackingAdvancesSection = ({ advances, currency }) => {
  if (advances.advanceBalance === 0 && advances.advances.length === 0) {
    return <p className="text-sm text-muted-foreground">No advances recorded against this order.</p>;
  }

  return (
    <div className="space-y-3" data-testid="order-tracking-advances-section">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md border border-border p-2.5">
          <p className="text-xs text-muted-foreground">Advance Balance</p>
          <p className="mt-0.5 text-sm font-semibold">{formatCurrency(advances.advanceBalance, currency)}</p>
        </div>
        <div className="rounded-md border border-border p-2.5">
          <p className="text-xs text-muted-foreground">Outstanding Advance</p>
          <p className="mt-0.5 text-sm font-semibold">{formatCurrency(advances.outstandingAdvanceBalance, currency)}</p>
        </div>
      </div>
      {advances.advances.length > 0 ? (
        <div className="space-y-1.5">
          {advances.advances.map((advance) => (
            <div key={advance.id} className="rounded-md border border-border p-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">{advance.id}</span>
                {advance.status ? <Badge variant="outline">{advance.status}</Badge> : null}
              </div>
              <div className="mt-1.5 grid grid-cols-2 gap-1 text-muted-foreground sm:grid-cols-4">
                <span>Paid: {formatCurrency(advance.paidAmount ?? 0, currency)}</span>
                <span>Adjusted: {formatCurrency(advance.adjustedAmount ?? 0, currency)}</span>
                <span>Refunded: {formatCurrency(advance.refundedAmount ?? 0, currency)}</span>
                <span>Outstanding: {formatCurrency(advance.outstandingAmount ?? 0, currency)}</span>
              </div>
              {advance.paidAt ? <p className="mt-1 text-muted-foreground">Paid on {formatDate(advance.paidAt)}</p> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default OrderTrackingAdvancesSection;

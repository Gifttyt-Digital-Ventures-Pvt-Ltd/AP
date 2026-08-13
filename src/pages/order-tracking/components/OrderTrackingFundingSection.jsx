import React from "react";
import { Badge } from "../../../components/ui/badge";
import { formatCurrency } from "../../../utils/currency";
import { formatDate } from "../utils";
import { FUNDING_STATUS_OPTIONS, fundingStatusColors } from "../constants";

/** Praxia Amount / Financier Amount + change history (spec §12.6 — the header/list-level badge alone was called out as insufficient). */
const OrderTrackingFundingSection = ({ funding, currency }) => (
  <div className="space-y-3" data-testid="order-tracking-funding-section">
    <div className="flex items-center gap-2">
      <Badge variant="outline" className={`border-0 font-semibold ${fundingStatusColors[funding.status] || ""}`}>
        {FUNDING_STATUS_OPTIONS.find((option) => option.value === funding.status)?.label || funding.status}
      </Badge>
    </div>
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-md border border-border p-2.5">
        <p className="text-xs text-muted-foreground">Praxia Amount</p>
        <p className="mt-0.5 text-sm font-semibold">{formatCurrency(funding.praxiaAmount, currency)}</p>
      </div>
      <div className="rounded-md border border-border p-2.5">
        <p className="text-xs text-muted-foreground">Financier Amount</p>
        <p className="mt-0.5 text-sm font-semibold">{formatCurrency(funding.financierAmount, currency)}</p>
      </div>
    </div>
    {funding.history.length > 0 ? (
      <div>
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">Change history</p>
        <div className="space-y-1.5">
          {funding.history.map((entry, index) => (
            <div key={index} className="rounded-md border border-border p-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">{formatDate(entry.date)}</span>
                <span className="text-muted-foreground">{entry.changedBy?.name || "-"}</span>
              </div>
              <p className="mt-0.5 text-muted-foreground">
                Praxia {formatCurrency(entry.praxiaAmount, currency)} · Financier {formatCurrency(entry.financierAmount, currency)}
              </p>
              {entry.reason ? <p className="mt-0.5 text-muted-foreground">{entry.reason}</p> : null}
            </div>
          ))}
        </div>
      </div>
    ) : null}
  </div>
);

export default OrderTrackingFundingSection;

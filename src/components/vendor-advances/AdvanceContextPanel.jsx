import React from "react";
import { WalletCards } from "lucide-react";
import { Badge } from "../ui/badge";
import { formatCurrency } from "../../utils/currency";
import { normalizeAdvanceContext } from "../../utils/vendorAdvanceContext";

const hasValue = (value) =>
  value !== undefined && value !== null && value !== "";

const formatDate = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
};

const Stat = ({ label, value, currency, description }) => {
  if (!hasValue(value)) return null;

  return (
    <div className="rounded-md border border-border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">
        {formatCurrency(value, currency)}
      </p>
      {description ? (
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
};

const AdvanceRows = ({ rows, currency, showPo = false }) => {
  if (!rows.length) return null;

  return (
    <div className="space-y-2">
      {rows.map((row, index) => (
        <div
          key={`${row.id ?? row.poNumber ?? index}`}
          className="rounded-md border border-border bg-background p-3 text-xs"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">
                {showPo ? row.poNumber || "Purchase Order" : row.id || row.poNumber || "Advance"}
              </p>
              <p className="text-muted-foreground">
                {row.origin || "Advance"}{row.createdAt ? ` · ${formatDate(row.createdAt)}` : ""}
              </p>
            </div>
            {row.status ? <Badge variant="outline">{row.status}</Badge> : null}
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <span>Paid: {formatCurrency(row.paidAmount ?? 0, currency)}</span>
            <span>Adjusted: {formatCurrency(row.adjustedAmount ?? 0, currency)}</span>
            <span>Outstanding: {formatCurrency(row.outstandingAmount ?? 0, currency)}</span>
          </div>
          {row.paidAt ? (
            <p className="mt-1 text-muted-foreground">Paid on {formatDate(row.paidAt)}</p>
          ) : null}
        </div>
      ))}
    </div>
  );
};

const AdvanceContextPanel = ({
  source,
  title = "Advance Balance",
  description = "Read-only advance context returned by backend.",
  currency = "INR",
  className = "",
  showRows = true,
}) => {
  const context = normalizeAdvanceContext(source);
  if (!context.hasContext) return null;
  const totalCashAdvanced = context.totalAdvancesPaid ?? context.advanceBalance;

  return (
    <section className={className}>
      <div className="rounded-lg border border-border bg-muted/20 p-4">
        <div className="mb-3 flex items-start gap-2">
          <WalletCards className="mt-0.5 h-4 w-4 text-primary" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Stat
            label="Cash Advanced"
            value={totalCashAdvanced}
            currency={currency}
            description="Total advance cash already paid to this vendor."
          />
          <Stat
            label="Recovered via Net-off"
            value={context.totalAdvancesAdjusted}
            currency={currency}
            description="Advance recovered by reducing later invoice, GRN, or PI payments."
          />
          <Stat
            label="Still Recoverable"
            value={context.outstandingAdvanceBalance}
            currency={currency}
            description="Unused advance still with the vendor, including PO-held and pool balances."
          />
          <Stat
            label="Free Pool Balance"
            value={context.poolOutstandingBalance}
            currency={currency}
            description="Unallocated advance usable across this vendor's future payables."
          />
          <Stat label="Manual Advances" value={context.manualAdvancesTotal} currency={currency} />
          <Stat
            label="Milestone Advances"
            value={context.milestoneAdvancesTotal}
            currency={currency}
          />
        </div>

        {showRows ? (
          <div className="mt-3">
            <AdvanceRows rows={context.advancesByPo} currency={currency} showPo />
            <AdvanceRows rows={context.advances} currency={currency} />
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default AdvanceContextPanel;

import { DEFAULT_CURRENCY, formatCurrency } from "../../../utils/currency";

const hasValue = (value) => value !== undefined && value !== null && value !== "";

const money = (value, currency) => formatCurrency(Number(value || 0), currency || DEFAULT_CURRENCY);

const BreakdownLine = ({ label, value, currency, muted = false, strong = false, negative = false }) => (
  <div className={`flex min-w-0 items-center justify-between gap-3 ${muted ? "text-muted-foreground" : ""}`}>
    <span className="truncate text-[11px] font-normal">{label}</span>
    <span className={`shrink-0 text-[11px] ${strong ? "font-semibold text-foreground" : "font-normal"}`}>
      {negative ? "-" : ""}
      {money(value, currency)}
    </span>
  </div>
);

const NetPayableBreakdown = ({ payable }) => {
  const currency = payable?.currency || DEFAULT_CURRENCY;
  const advanceAdjustedAmount = Number(payable?.advanceAdjustedAmount ?? payable?.advanceAdjustedTotal ?? 0);
  const hasAdvanceAdjustment = advanceAdjustedAmount > 0;
  const isAdvanceRow = payable?.sourceType === "ADVANCE" || (payable?.sourceType === "OBLIGATION" && payable?.isAdvance);

  if (isAdvanceRow) {
    return (
      <div className="min-w-0 space-y-0.5 leading-tight">
        <BreakdownLine label="Scheduled" value={payable?.scheduledAmount ?? payable?.grossAmount} currency={currency} muted />
        <BreakdownLine label="Triggered" value={payable?.triggeredAmount ?? payable?.payableAmount} currency={currency} muted />
        {Number(payable?.paidAmount || 0) > 0 ? (
          <BreakdownLine label="Already paid" value={payable.paidAmount} currency={currency} muted />
        ) : null}
        <BreakdownLine label="Payable" value={payable?.payableAmount} currency={currency} muted />
        <BreakdownLine label="Less TDS" value={payable?.tdsAmount} currency={currency} muted negative />
        <BreakdownLine label="Net payable" value={payable?.netPayableAmount ?? payable?.amount} currency={currency} strong />
      </div>
    );
  }

  if (hasAdvanceAdjustment || hasValue(payable?.tdsAmount)) {
    return (
      <div className="min-w-0 space-y-0.5 leading-tight">
        <BreakdownLine label="Gross" value={payable?.grossAmount ?? payable?.originalAmount} currency={currency} muted />
        {hasAdvanceAdjustment ? (
          <BreakdownLine label="Advance adjusted" value={advanceAdjustedAmount} currency={currency} muted negative />
        ) : null}
        <BreakdownLine label="Payable" value={payable?.payableAmount ?? payable?.amount} currency={currency} muted />
        <BreakdownLine label="Less TDS" value={payable?.tdsAmount} currency={currency} muted negative />
        <BreakdownLine label="Net payable" value={payable?.netPayableAmount ?? payable?.amount} currency={currency} strong />
      </div>
    );
  }

  return (
    <span className="font-semibold">
      {money(payable?.netPayableAmount ?? payable?.amount, currency)}
    </span>
  );
};

export default NetPayableBreakdown;


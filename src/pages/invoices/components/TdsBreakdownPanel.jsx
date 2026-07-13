import React from "react";
import { Button } from "../../../components/ui/button";
import { formatCurrency, normalizeCurrencyCode } from "../../../utils/currency";

const formatRate = (value) => {
  const rate = Number(value);
  if (!Number.isFinite(rate)) return "-";
  return `${Number.isInteger(rate) ? rate : Number(rate.toFixed(3))}%`;
};

const resolvePreviewValue = (preview = {}, camelKey, snakeKey, fallback = 0) =>
  preview?.[camelKey] ?? preview?.[snakeKey] ?? fallback;

const getCertificate = (preview = {}) => preview.certificate || preview.cert || {};
const getNormal = (preview = {}) => preview.normal || preview.normalTreatment || {};

const TdsBreakdownPanel = ({
  preview,
  currency = "INR",
  loading = false,
  error = null,
  onRetry,
  fallbackAmount = 0,
  enabled = true,
}) => {
  const invoiceCurrency = normalizeCurrencyCode(currency);
  const formatAmount = (value) => formatCurrency(Number(value) || 0, invoiceCurrency);

  if (!enabled) {
    return (
      <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
        TDS backend preview will be available after the TDS subscription is enabled.
        {fallbackAmount ? ` Current fallback TDS: ${formatAmount(fallbackAmount)}.` : ""}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
        Loading backend TDS estimate...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>TDS estimate unavailable. Backend preview will be authoritative.</span>
          {onRetry ? (
            <Button type="button" variant="outline" size="sm" className="h-7 bg-white" onClick={onRetry}>
              Retry
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
        TDS preview will appear after the invoice is saved and backend preview is available.
        {fallbackAmount ? ` Current fallback TDS: ${formatAmount(fallbackAmount)}.` : ""}
      </div>
    );
  }

  const certificate = getCertificate(preview);
  const normal = getNormal(preview);
  const provisional = preview.provisional ?? !preview.finalTotalTds;
  const totalTds =
    resolvePreviewValue(preview, "totalTds", "total_tds", null) ??
    resolvePreviewValue(preview, "finalTotalTds", "final_total_tds", null) ??
    fallbackAmount;
  const taxableBase = resolvePreviewValue(preview, "taxableBase", "taxable_base", 0);
  const netPayable = resolvePreviewValue(preview, "netPayableEstimate", "net_payable_estimate", null);
  const certCoveredBase = resolvePreviewValue(certificate, "coveredBase", "covered_base", 0);
  const certRate = resolvePreviewValue(certificate, "rate", "rate", null);
  const certTds = resolvePreviewValue(certificate, "tds", "tds", 0);
  const normalBase = resolvePreviewValue(normal, "base", "base", 0);
  const normalTds = resolvePreviewValue(normal, "tds", "tds", 0);
  const thresholdCrossed = Boolean(preview.thresholdCrossed ?? preview.threshold_crossed);
  const shortfall = Number(preview.tdsShortfall ?? preview.tds_shortfall ?? 0) || 0;

  return (
    <div className="space-y-2 rounded-lg border border-border bg-background p-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">Backend TDS breakdown</span>
        <span className={`rounded-full px-2 py-0.5 font-medium ${provisional ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"}`}>
          {provisional ? "Provisional" : "Final"}
        </span>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">Taxable base ex-GST</span>
          <span>{formatAmount(taxableBase)}</span>
        </div>
        {certCoveredBase > 0 ? (
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Certificate coverage @ {formatRate(certRate)}</span>
            <span>{formatAmount(certCoveredBase)} = {formatAmount(certTds)}</span>
          </div>
        ) : null}
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">Normal TDS</span>
          <span>{formatAmount(normalBase)} = {formatAmount(normalTds)}</span>
        </div>
        <div className="flex justify-between border-t border-border pt-1 font-semibold">
          <span>TDS this invoice</span>
          <span>{formatAmount(totalTds)}</span>
        </div>
        {netPayable !== null && netPayable !== undefined ? (
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Estimated net payable</span>
            <span>{formatAmount(netPayable)}</span>
          </div>
        ) : null}
      </div>
      {thresholdCrossed ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-amber-800">
          Threshold crossed — includes catch-up recovery.
        </div>
      ) : null}
      {shortfall > 0 ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-amber-800">
          {formatAmount(shortfall)} TDS shortfall carries to the next invoice.
        </div>
      ) : null}
    </div>
  );
};

export const getTdsPreviewAmount = (preview, fallback = 0) => {
  if (!preview) return fallback;
  const final = preview.finalTotalTds ?? preview.final_total_tds;
  const total = preview.totalTds ?? preview.total_tds;
  const provisional = preview.provisionalTds ?? preview.provisional_tds;
  const value = final ?? total ?? provisional;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

export const getTdsPreviewNetPayable = (preview, fallback = 0) => {
  if (!preview) return fallback;
  const value = preview.netPayableEstimate ?? preview.net_payable_estimate;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

export default TdsBreakdownPanel;

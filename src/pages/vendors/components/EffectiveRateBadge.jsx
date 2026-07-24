import React from "react";

const formatRate = (value) => {
  const rate = Number(value);
  if (!Number.isFinite(rate)) return "-";
  return `${Number.isInteger(rate) ? rate : Number(rate.toFixed(3))}%`;
};

const sourceLabel = {
  CERTIFICATE: "Sec 197 certificate",
  CUSTOM: "Custom rate",
  SECTION: "Section default",
};

const getErrorMessage = (error) =>
  error?.data?.message ||
  error?.data?.detail ||
  error?.message ||
  error?.error ||
  "";

const EffectiveRateBadge = ({
  rateInfo,
  fallbackRate,
  fallbackSection,
  loading = false,
  error = null,
}) => {
  if (loading) {
    return (
      <span className="inline-flex rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground">
        Loading effective TDS rate...
      </span>
    );
  }

  const errorMessage = getErrorMessage(error);
  if (errorMessage) {
    return (
      <span className="inline-flex flex-col rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        <span className="font-semibold">TDS section validation failed</span>
        <span>{errorMessage}</span>
      </span>
    );
  }

  const source = String(rateInfo?.rateSource || rateInfo?.source || "").toUpperCase();
  const rate = rateInfo?.rate ?? rateInfo?.effectiveRate ?? fallbackRate;
  const originalRate = rateInfo?.originalRate ?? rateInfo?.sectionRate ?? rateInfo?.defaultRate;
  const certificateNumber =
    rateInfo?.certificate?.certificateNumber ??
    rateInfo?.certificateNumber ??
    rateInfo?.certNumber;
  const validTo = rateInfo?.certificate?.validTo ?? rateInfo?.validTo;

  return (
    <span className="inline-flex flex-col rounded-lg border border-border bg-background px-3 py-2 text-xs">
      <span className="font-semibold text-foreground">
        {source === "CERTIFICATE" && originalRate ? (
          <>
            <span className="mr-1 text-muted-foreground line-through">{formatRate(originalRate)}</span>
            {formatRate(rate)}
          </>
        ) : (
          formatRate(rate)
        )}
      </span>
      <span className="text-muted-foreground">
        {sourceLabel[source] || (fallbackSection ? `${fallbackSection} default` : "TDS rate")}
        {certificateNumber ? ` · cert #${certificateNumber}` : ""}
        {validTo ? ` · valid to ${new Date(validTo).toLocaleDateString("en-IN")}` : ""}
      </span>
    </span>
  );
};

export default EffectiveRateBadge;

import React from "react";
import { Badge } from "../../../components/ui/badge";
import {
  campaignStatusBadgeClass,
  formatCampaignStatus,
  formatInvoiceStatus,
  invoiceStatusBadgeClass,
} from "../utils/campaignFormatters";

export const CampaignStatusBadge = ({ status }) => (
  <Badge variant="outline" className={campaignStatusBadgeClass(status)}>
    {formatCampaignStatus(status)}
  </Badge>
);

export const InvoiceStatusBadge = ({ status }) => (
  <Badge variant="outline" className={invoiceStatusBadgeClass(status)}>
    {formatInvoiceStatus(status)}
  </Badge>
);

export const FieldError = ({ children }) =>
  children ? <p className="text-xs text-destructive">{children}</p> : null;

export const SummaryTile = ({
  label,
  value,
  className = "",
  compact = false,
  inline = false,
}) => {
  if (inline) {
    return (
      <div
        className={`flex min-w-0 items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 ${className}`}
      >
        <span className="truncate text-xs text-muted-foreground">{label}</span>
        <span className="shrink-0 text-sm font-semibold tabular-nums">{value}</span>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border border-border bg-card ${
        compact ? "p-2.5" : "p-4"
      } ${className}`}
    >
      <p
        className={`uppercase tracking-wide text-muted-foreground ${
          compact ? "text-[10px] leading-tight" : "text-xs"
        }`}
      >
        {label}
      </p>
      <p
        className={`font-semibold ${
          compact ? "mt-0.5 text-lg leading-tight" : "mt-1 text-2xl"
        }`}
      >
        {value}
      </p>
    </div>
  );
};

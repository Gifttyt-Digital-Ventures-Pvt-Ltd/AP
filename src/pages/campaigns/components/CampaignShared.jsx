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

export const SummaryTile = ({ label, value, className = "" }) => (
  <div className={`rounded-lg border border-border bg-card p-4 ${className}`}>
    <p className="text-xs uppercase tracking-wide text-muted-foreground">
      {label}
    </p>
    <p className="mt-1 text-2xl font-semibold">{value}</p>
  </div>
);

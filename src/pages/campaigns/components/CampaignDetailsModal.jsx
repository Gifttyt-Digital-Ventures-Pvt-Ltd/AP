import React, { useState } from "react";
import { ChevronDown, ChevronRight, Copy } from "lucide-react";
import { Button } from "../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import AppDataTable from "../../../components/common/AppDataTable";
import { TableCell, TableRow } from "../../../components/ui/table";
import { CampaignStatusBadge, InvoiceStatusBadge, SummaryTile } from "./CampaignShared";
import {
  formatCurrency,
  formatDate,
  PAYMENT_MODE_LABELS,
} from "../utils/campaignFormatters";
import { getVendorRowActions } from "../utils/campaignPermissions";

const vendorBreakdownHeader = [
  { key: "expand", title: "", cellClassName: "w-8" },
  { key: "vendor", title: "Vendor", cellClassName: "font-medium" },
  { key: "campaignCost", title: "Campaign Cost" },
  { key: "invoiceNo", title: "Invoice No." },
  { key: "invoiceAmount", title: "Invoice Amount" },
  { key: "advances", title: "Advances" },
  { key: "outstanding", title: "Outstanding" },
  { key: "status", title: "Status" },
  {
    key: "actions",
    title: "Actions",
    headerClassName: "text-left",
    cellClassName: "text-left",
  },
];

const CampaignDetailsModal = ({
  open,
  onOpenChange,
  campaign,
  access,
  onRecordAdvance,
  onSubmitInvoice,
  onReviewInvoice,
  onMarkPaid,
}) => {
  const [expandedRows, setExpandedRows] = useState([]);
  if (!campaign) return null;

  const toggleExpanded = (vendorId) => {
    setExpandedRows((prev) =>
      prev.includes(vendorId)
        ? prev.filter((id) => id !== vendorId)
        : [...prev, vendorId],
    );
  };

  const summary = campaign.invoiceSummary || {};
  const isApproved = campaign.status === "approved";

  const renderVendorRow = (row, rowIndex, headers) => {
    const isExpanded = expandedRows.includes(row.vendorId);
    const invoice = row.invoice;
    const actions = getVendorRowActions({ row, campaign, access });
    const payments = [
      ...(row.advances || []),
      ...(invoice?.payments || []).filter(
        (payment) => payment.paymentType !== "advance",
      ),
    ];

    return (
      <React.Fragment key={row.vendorId || rowIndex}>
        <TableRow
          className="cursor-pointer hover:bg-muted/30"
          onClick={() => toggleExpanded(row.vendorId)}
        >
          {headers.map((header) => {
            let value;
            switch (header.key) {
              case "expand":
                value = isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                );
                break;
              case "vendor":
                value = row.vendorName;
                break;
              case "campaignCost":
                value = formatCurrency(row.cost);
                break;
              case "invoiceNo":
                value = invoice?.invoiceNumber || "—";
                break;
              case "invoiceAmount":
                value = invoice ? formatCurrency(invoice.amount) : "—";
                break;
              case "advances":
                value = formatCurrency(row.advancesTotal);
                break;
              case "outstanding":
                value = formatCurrency(row.outstanding);
                break;
              case "status":
                value = <InvoiceStatusBadge status={row.status} />;
                break;
              case "actions":
                value = (
                  <div className="flex flex-wrap gap-2">
                    {actions.recordAdvance && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onRecordAdvance(row)}
                      >
                        Record Advance
                      </Button>
                    )}
                    {actions.submitInvoice && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(event) => {
                          event.stopPropagation();
                          onSubmitInvoice(row);
                        }}
                      >
                        Submit Invoice
                      </Button>
                    )}
                    {actions.markPaid && (
                      <Button size="sm" onClick={() => onMarkPaid(row)}>
                        Mark Paid
                      </Button>
                    )}
                    {!Object.values(actions).some(Boolean) && (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                );
                break;
              default:
                value = row?.[header.key] || "—";
            }

            return (
              <TableCell
                key={header.key}
                className={header.cellClassName}
                onClick={
                  header.key === "actions"
                    ? (event) => event.stopPropagation()
                    : undefined
                }
              >
                {value}
              </TableCell>
            );
          })}
        </TableRow>
        {isExpanded && (
          <TableRow>
            <TableCell />
            <TableCell colSpan={headers.length - 1} className="bg-muted/20">
              {payments.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Payments</p>
                  {payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="text-sm text-muted-foreground"
                    >
                      {PAYMENT_MODE_LABELS[payment.mode] || payment.mode} ·{" "}
                      {formatCurrency(payment.amount)} ·{" "}
                      {payment.referenceNo || "No ref"} ·{" "}
                      {formatDate(payment.paymentDate)} ·{" "}
                      {payment.recordedBy || "-"}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No payments recorded.
                </p>
              )}
            </TableCell>
          </TableRow>
        )}
      </React.Fragment>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[92vh] overflow-y-auto" 
        onInteractOutside={(event) => event.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {campaign.name}
            <CampaignStatusBadge status={campaign.status} />
          </DialogTitle>
          <DialogDescription>
            Campaign and per-vendor invoice/payment breakdown.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Reference No.</span>
            <span className="font-medium">{campaign.referenceCode || "—"}</span>
            {campaign.referenceCode && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigator.clipboard?.writeText(campaign.referenceCode)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
            <p><span className="text-muted-foreground">Created:</span> {formatDate(campaign.createdDate)}</p>
            <p><span className="text-muted-foreground">Created By:</span> {campaign.createdBy || "-"}</p>
            <p><span className="text-muted-foreground">Approved By:</span> {campaign.approvedBy || "-"}</p>
            <p><span className="text-muted-foreground">Period:</span> {formatDate(campaign.startDate)} - {formatDate(campaign.endDate)}</p>
            <p><span className="text-muted-foreground">Budget:</span> {formatCurrency(campaign.budget)}</p>
            <p><span className="text-muted-foreground">Total Cost:</span> {formatCurrency(campaign.totalCost)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
          <SummaryTile label="Total Vendors" value={summary.totalVendors || 0} />
          <SummaryTile label="No Invoice" value={summary.noInvoice || 0} />
          <SummaryTile label="Pending Check" value={summary.pendingCheck || 0} />
          <SummaryTile label="Pending Approval" value={summary.pendingApproval || 0} />
          <SummaryTile label="Pending Payment" value={summary.pendingPayment || 0} />
          <SummaryTile label="Paid" value={summary.paid || 0} />
          <SummaryTile label="Rejected" value={summary.rejected || 0} />
        </div>

        {!isApproved && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Invoice and advance actions are available only after campaign approval.
          </div>
        )}

        <div className="rounded-lg border border-border overflow-hidden">
          <AppDataTable
            tableHeader={vendorBreakdownHeader}
            tableData={campaign.vendorBreakdown || []}
            renderRow={renderVendorRow}
            emptyMessage="No campaign vendors found"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CampaignDetailsModal;

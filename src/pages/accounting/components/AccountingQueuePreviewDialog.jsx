import React, { useMemo, useState } from "react";
import { FileText } from "lucide-react";

import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { getInvoiceStatusBadgeClass } from "../../../utils/approvalWorkflow";
import { formatCurrency as formatMoney } from "../../../utils/currency";
import GrnDetailDialog from "../../goods-receipt/components/GrnDetailDialog";
import ViewDialog from "../../invoices/components/ViewDialog";
import PoDetailsDialog from "../../purchase-orders/components/PoDetailsDialog";
import { statusColors as poStatusColors } from "../../purchase-orders/constants";
import { normalizePurchaseOrder } from "../../purchase-orders/utils";
import ViewVendorDialog from "../../vendors/components/ViewVendorDialog";
import { formatDateTime } from "../utils/coaUtils";

const OBJECT_LABELS = {
  PO: "Purchase Order",
  GRN: "Goods Receipt",
  INVOICE: "Invoice",
  PI: "Proforma Invoice",
  VENDOR: "Vendor",
  COA: "Chart of Accounts",
  CHART_OF_ACCOUNTS: "Chart of Accounts",
};

const getPayloadRecord = (detail) =>
  detail?.data ?? detail?.record ?? detail?.item ?? detail?.details ?? null;

const getDisplayValue = (value) => {
  if (value === true) return "Yes";
  if (value === false) return "No";
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
};

const renderNoDocumentPreview = () => (
  <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-2 bg-muted/30 p-6 text-center text-sm text-muted-foreground">
    <FileText className="h-8 w-8" />
    <p>Document preview is not included in the accounting queue payload.</p>
  </div>
);

const getStatusClass = (status) => getInvoiceStatusBadgeClass(status);

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatCurrency = (value, currency = "INR") => formatMoney(Number(value) || 0, currency);

const normalizeGrnLineItem = (item = {}) => ({
  ...item,
  item_description:
    item.item_description ||
    item.itemDescription ||
    item.description ||
    item.name ||
    "—",
  received_quantity:
    item.received_quantity ??
    item.receivedQuantity ??
    item.quantity ??
    item.qty ??
    0,
  accepted_quantity:
    item.accepted_quantity ??
    item.acceptedQuantity ??
    item.receivedQuantity ??
    item.received_quantity ??
    0,
  rejected_quantity:
    item.rejected_quantity ?? item.rejectedQuantity ?? 0,
  rejection_reason: item.rejection_reason ?? item.rejectionReason ?? "",
  unit_price: item.unit_price ?? item.unitPrice ?? item.rate ?? 0,
  line_amount: item.line_amount ?? item.amount ?? item.lineTotal ?? 0,
  gst_rate: item.gst_rate ?? item.gstRate ?? 0,
  uom: item.uom ?? item.unit ?? "",
});

const normalizeGrnRecord = (record = {}) => ({
  ...record,
  grn_number: record.grn_number || record.grnNumber || record.docNo,
  source_type: record.source_type || record.sourceType,
  po_id: record.po_id || record.poId,
  po_number: record.po_number || record.poNumber,
  vendor_id: record.vendor_id || record.vendorId,
  vendor_name: record.vendor_name || record.vendorName,
  receipt_date: record.receipt_date || record.receiptDate,
  total_received_value:
    record.total_received_value ??
    record.totalReceivedValue ??
    record.amount ??
    0,
  grn_format_id: record.grn_format_id || record.grnFormatId,
  template_code: record.template_code || record.templateCode,
  config_snapshot: record.config_snapshot || record.configSnapshot,
  submitted_by: record.submitted_by || record.submittedBy,
  approved_by: record.approved_by || record.approvedBy,
  approved_at: record.approved_at || record.approvedAt,
  created_at: record.created_at || record.createdAt,
  created_by: record.created_by || record.createdBy,
  created_by_name: record.created_by_name || record.createdByName,
  posted_at: record.posted_at || record.postedAt,
  posted_by: record.posted_by || record.postedBy,
  accounting_ready: record.accounting_ready ?? record.accountingReady,
  accounting_ready_id: record.accounting_ready_id || record.accountingReadyId,
  eligible_for_sync: record.eligible_for_sync ?? record.eligibleForSync,
  eligible_for_accounting_ready:
    record.eligible_for_accounting_ready ?? record.eligibleForAccountingReady,
  edit_policy: record.edit_policy || record.editPolicy,
  erp_status: record.erp_status || record.erpStatus,
  sync_status: record.sync_status || record.syncStatus,
  changed_after_last_sync:
    record.changed_after_last_sync ?? record.changedAfterLastSync,
  line_items: Array.isArray(record.line_items)
    ? record.line_items.map(normalizeGrnLineItem)
    : Array.isArray(record.lineItems)
      ? record.lineItems.map(normalizeGrnLineItem)
      : [],
});

const AccountingMetadata = ({ detail }) => {
  const metadata = detail?.accountingMetadata ?? detail?.accounting ?? detail?.queue ?? {};
  const rows = [
    ["Object Type", detail?.objectType],
    ["Object ID", detail?.objectId],
    ["Queue Stage", metadata.stage ?? detail?.stage],
    ["Accounting Status", metadata.accountingStatus ?? metadata.accStatus ?? detail?.accountingStatus],
    ["ERP Status", metadata.erpStatus ?? detail?.erpStatus],
    ["Locked", metadata.locked ?? detail?.locked],
    ["Source", metadata.source ?? metadata.sourceSystem ?? detail?.source],
    ["Last Sync", metadata.lastSyncAt ?? detail?.lastSyncAt],
  ].filter(([, value]) => value !== undefined && value !== null && value !== "");

  if (rows.length === 0) return null;

  return (
    <div className="rounded-lg border bg-muted/20 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Accounting Metadata</h3>
        <Badge variant="outline">Read only</Badge>
      </div>
      <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        {rows.map(([label, value]) => (
          <div key={label}>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-1 font-medium">
              {label === "Last Sync" ? formatDateTime(value) : getDisplayValue(value)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

const GenericPreviewDialog = ({ open, onOpenChange, detail }) => {
  const record = getPayloadRecord(detail) || {};
  const entries = Object.entries(record).filter(([, value]) => {
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== null && typeof value !== "object";
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{OBJECT_LABELS[detail?.objectType] || "Queue Item"} Preview</DialogTitle>
          <DialogDescription>
            Read-only preview loaded from the accounting queue item-detail API.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <AccountingMetadata detail={detail} />
          <div className="rounded-lg border p-4">
            <h3 className="mb-3 text-sm font-semibold">Source Details</h3>
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              {entries.map(([key, value]) => (
                <div key={key}>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {key.replace(/_/g, " ")}
                  </p>
                  <p className="mt-1 font-medium">{getDisplayValue(value)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const AccountingQueuePreviewDialog = ({ open, onOpenChange, detail }) => {
  const [invoiceTab, setInvoiceTab] = useState("details");
  const record = useMemo(() => getPayloadRecord(detail), [detail]);
  const objectType = detail?.objectType;

  if (!record) {
    return <GenericPreviewDialog open={open} onOpenChange={onOpenChange} detail={detail} />;
  }

  if (objectType === "PO") {
    return (
      <PoDetailsDialog
        showViewDialog={open}
        setShowViewDialog={onOpenChange}
        selectedPO={normalizePurchaseOrder(record)}
        statusColors={poStatusColors}
        formatDate={formatDate}
        formatCurrency={formatCurrency}
        handleDownloadPO={() => {}}
        handleSubmitForApproval={() => {}}
        downloadingPoId={null}
        submitting={false}
        setShowApprovalDialog={() => {}}
        canManagePo={false}
        canApprovePo={false}
        onEditPO={() => {}}
      />
    );
  }

  if (objectType === "GRN") {
    return (
      <GrnDetailDialog
        grn={normalizeGrnRecord(record)}
        open={open}
        onOpenChange={onOpenChange}
        canApprove={false}
        canPost={false}
        onDownloadPdf={() => {}}
        downloadingPdf={false}
      />
    );
  }

  if (objectType === "INVOICE" || objectType === "PI") {
    return (
      <ViewDialog
        viewDialogOpen={open}
        setViewDialogOpen={onOpenChange}
        selectedInvoice={record}
        renderPdfPreview={renderNoDocumentPreview}
        pdfZoom={100}
        viewPreviewError={false}
        setViewPreviewError={() => {}}
        getStatusBadgeClass={getStatusClass}
        viewTab={invoiceTab}
        setViewTab={setInvoiceTab}
        invoiceHistory={record.approvalHistory ?? record.approval_history ?? record.approvals ?? []}
        loadingHistory={false}
        canEdit={() => false}
        handleEditInvoice={() => {}}
        canCancel={() => false}
        handleCancelInvoice={() => {}}
        showProformaInvoiceFields={objectType === "PI"}
        showAccountingLockBanner={false}
      />
    );
  }

  if (objectType === "VENDOR") {
    return (
      <ViewVendorDialog
        open={open}
        onOpenChange={onOpenChange}
        vendor={record}
        canApprove={false}
        isPendingApproval={false}
        onApproveAction={() => {}}
      />
    );
  }

  return <GenericPreviewDialog open={open} onOpenChange={onOpenChange} detail={detail} />;
};

export default AccountingQueuePreviewDialog;

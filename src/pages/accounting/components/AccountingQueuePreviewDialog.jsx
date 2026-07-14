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
import ViewVendorDialog from "../../vendors/components/ViewVendorDialog";
import { formatDateTime } from "../utils/coaUtils";

const OBJECT_LABELS = {
  PO: "Purchase Order",
  GRN: "Goods Receipt",
  INVOICE: "Invoice",
  PI: "Proforma Invoice",
  VENDOR: "Vendor",
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
        selectedPO={record}
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
        grn={record}
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

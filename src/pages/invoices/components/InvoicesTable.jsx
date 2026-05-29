import React from "react";
import { Eye, Mail, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { TableCell, TableRow } from "../../../components/ui/table";
import { cn } from "../../../lib/utils";
import { Search } from "lucide-react";
import AppDataTable from "../../../components/common/AppDataTable";
import { formatWorkflowStatus } from "../../../utils/approvalWorkflow";

const toNumber = (value) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
};

const formatCurrency = (amount) =>
  `₹${toNumber(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const getInvoiceGrossAmount = (invoice) =>
  toNumber(
    invoice.gross_amount ??
      invoice.grossAmount ??
      invoice.subtotal ??
      invoice.subTotal ??
      invoice.taxable_amount ??
      invoice.taxableAmount ??
      invoice.amount,
  );

const getInvoiceGstAmount = (invoice) =>
  toNumber(
    invoice.gst_amount ??
      invoice.gstAmount ??
      invoice.tax_amount ??
      invoice.taxAmount ??
      toNumber(invoice.cgst_amount ?? invoice.cgstAmount) +
        toNumber(invoice.sgst_amount ?? invoice.sgstAmount) +
        toNumber(invoice.igst_amount ?? invoice.igstAmount),
  );

const getInvoiceTdsAmount = (invoice) =>
  toNumber(invoice.tds_amount ?? invoice.tdsAmount ?? invoice.tds);

const getInvoiceNetAmount = (invoice) => {
  const explicitNetAmount = invoice.net_amount ?? invoice.netAmount ?? invoice.net_payable ?? invoice.netPayable;
  if (explicitNetAmount !== undefined && explicitNetAmount !== null && explicitNetAmount !== "") {
    return toNumber(explicitNetAmount);
  }

  const grossAmount = getInvoiceGrossAmount(invoice);
  const gstAmount = getInvoiceGstAmount(invoice);
  const tdsAmount = getInvoiceTdsAmount(invoice);
  return Math.max(grossAmount + gstAmount - tdsAmount, 0);
};

const getApprovalWorkflowName = (invoice) =>
  invoice.approval_workflow_name ??
  invoice.approvalWorkflowName ??
  invoice.workflow_name ??
  invoice.workflowName ??
  invoice.approvalWorkflow?.name ??
  "-";

const invoiceTableHeader = [
  { key: "srNo", title: "Sr. No", headerClassName: "p-3 text-left text-xs font-medium", cellClassName: "p-3 text-sm font-medium" },
  { key: "source", title: "Source", headerClassName: "p-3 text-left text-xs font-medium", cellClassName: "p-3" },
  { key: "invoice_number", title: "Invoice #", headerClassName: "p-3 text-left text-xs font-medium", cellClassName: "p-3 font-['JetBrains_Mono'] text-sm font-medium" },
  { key: "vendor_name", title: "Vendor", headerClassName: "p-3 text-left text-xs font-medium", cellClassName: "p-3 text-sm" },
  { key: "original_file_name", title: "Original File Name", headerClassName: "p-3 text-left text-xs font-medium", cellClassName: "p-3 text-xs font-['JetBrains_Mono'] text-muted-foreground" },
  { key: "file_category", title: "File Category", headerClassName: "p-3 text-left text-xs font-medium", cellClassName: "p-3" },
  { key: "gross_amount", title: "Gross Amount", headerClassName: "p-3 text-right text-xs font-medium", cellClassName: "p-3 font-['JetBrains_Mono'] text-sm font-semibold text-right" },
  { key: "gst_amount", title: "GST", headerClassName: "p-3 text-right text-xs font-medium", cellClassName: "p-3 font-['JetBrains_Mono'] text-sm text-right" },
  { key: "tds_amount", title: "TDS", headerClassName: "p-3 text-right text-xs font-medium", cellClassName: "p-3 font-['JetBrains_Mono'] text-sm text-right" },
  { key: "net_amount", title: "Net Amount", headerClassName: "p-3 text-right text-xs font-medium", cellClassName: "p-3 font-['JetBrains_Mono'] text-sm font-semibold text-right" },
  { key: "approval_workflow_name", title: "Approval Workflow", headerClassName: "p-3 text-left text-xs font-medium", cellClassName: "p-3 text-sm whitespace-nowrap" },
  { key: "invoice_date", title: "Invoice Date", headerClassName: "p-3 text-left text-xs font-medium", cellClassName: "p-3 text-xs text-muted-foreground whitespace-nowrap" },
  { key: "status", title: "Status", headerClassName: "p-3 text-left text-xs font-medium", cellClassName: "p-3" },
  { key: "created_at", title: "Created At", headerClassName: "p-3 text-left text-xs font-medium", cellClassName: "p-3 text-xs text-muted-foreground whitespace-nowrap" },
  { key: "actions", title: "Actions", headerClassName: "p-3 text-right text-xs font-medium", cellClassName: "p-3 text-right" },
];

const InvoicesTable = ({
  searchTerm,
  setSearchTerm,
  filteredInvoices,
  getStatusBadgeClass,
  handleViewInvoice,
  canEdit,
  handleEditInvoice,
  canDelete,
  handleDeleteInvoice,
}) => {
  const renderInvoiceRow = (invoice, rowIndex, headers) => (
    <TableRow
      key={invoice.id ?? rowIndex}
      className={cn(
        rowIndex % 2 === 1 && "bg-muted/20",
        "border-b border-border transition-colors hover:bg-muted/50",
      )}
      data-testid={`invoice-row-${invoice.id}`}
    >
      {headers.map((header) => {
        let value;

        switch (header.key) {
          case "srNo":
            value = rowIndex + 1;
            break;
          case "source":
            value = (
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${invoice.source === "Email" ? "bg-blue-100 text-blue-700 border border-blue-200" : "bg-green-100 text-green-700 border border-green-200"}`}>
                {invoice.source === "Email" && <Mail className="h-3 w-3" />}
                {invoice.source || "Upload"}
              </span>
            );
            break;
          case "original_file_name":
            value = invoice.original_file_name || "-";
            break;
          case "file_category":
            value = (
              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200">
                {invoice.file_category || "Expense Invoice"}
              </span>
            );
            break;
          case "gross_amount":
            value = formatCurrency(getInvoiceGrossAmount(invoice));
            break;
          case "gst_amount":
            value = formatCurrency(getInvoiceGstAmount(invoice));
            break;
          case "tds_amount":
            value = formatCurrency(getInvoiceTdsAmount(invoice));
            break;
          case "net_amount":
            value = formatCurrency(getInvoiceNetAmount(invoice));
            break;
          case "approval_workflow_name":
            value = getApprovalWorkflowName(invoice);
            break;
          case "invoice_date":
            value = invoice.invoice_date ? format(new Date(invoice.invoice_date), "dd MMM yy") : "-";
            break;
          case "status":
            value = (
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${getStatusBadgeClass(invoice.status)}`}>
                {formatWorkflowStatus(invoice.status)}
              </span>
            );
            break;
          case "created_at":
            value = invoice.created_at ? format(new Date(invoice.created_at), "dd MMM yy, hh:mm a") : "-";
            break;
          case "actions":
            value = (
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="sm" onClick={() => handleViewInvoice(invoice)} data-testid={`view-invoice-${invoice.id}`} title="View Invoice" className="h-8 w-8 p-0">
                  <Eye className="h-4 w-4" />
                </Button>
                {canEdit(invoice) && (
                  <Button variant="ghost" size="sm" onClick={() => handleEditInvoice(invoice)} data-testid={`edit-invoice-${invoice.id}`} title="Edit Invoice" className="h-8 w-8 p-0">
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {canDelete(invoice.status) && (
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteInvoice(invoice)} data-testid={`delete-invoice-${invoice.id}`} title="Delete Invoice" className="h-8 w-8 p-0">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            );
            break;
          default:
            value = invoice?.[header.key] || "-";
        }

        return (
          <TableCell key={header.key} className={header.cellClassName}>
            {value}
          </TableCell>
        );
      })}
    </TableRow>
  );

  return (
    <>
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search invoices..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" data-testid="invoice-search-input" />
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg shadow-sm overflow-x-auto" data-testid="invoices-table">
        <AppDataTable
          tableHeader={invoiceTableHeader}
          tableData={filteredInvoices}
          renderRow={renderInvoiceRow}
          tableClassName="min-w-[1900px]"
          headClassName="border-b border-border bg-muted/50"
          emptyMessage="No invoices found. Upload your first invoice to get started!"
          emptyTestId="no-invoices"
        />
      </div>
    </>
  );
};

export default InvoicesTable;

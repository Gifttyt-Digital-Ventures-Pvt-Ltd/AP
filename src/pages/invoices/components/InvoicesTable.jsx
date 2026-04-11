import React from "react";
import { Eye, Mail, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Search } from "lucide-react";
import AppDataTable from "../../../components/common/AppDataTable";

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
          rows={filteredInvoices}
          rowKey="id"
          tableClassName="min-w-[1400px]"
          headClassName="border-b border-border bg-muted/50"
          rowClassName="border-b border-border hover:bg-muted/50 transition-colors"
          getRowProps={(invoice) => ({ "data-testid": `invoice-row-${invoice.id}` })}
          emptyMessage="No invoices found. Upload your first invoice to get started!"
          emptyTestId="no-invoices"
          columns={[
            { key: "srNo", header: "Sr. No", headerClassName: "p-3 text-left text-xs font-medium", cellClassName: "p-3 text-sm font-medium", render: (_row, index) => index + 1 },
            {
              key: "source",
              header: "Source",
              headerClassName: "p-3 text-left text-xs font-medium",
              cellClassName: "p-3",
              render: (invoice) => (
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${invoice.source === "Email" ? "bg-blue-100 text-blue-700 border border-blue-200" : "bg-green-100 text-green-700 border border-green-200"}`}>
                  {invoice.source === "Email" && <Mail className="h-3 w-3" />}
                  {invoice.source || "Upload"}
                </span>
              ),
            },
            { key: "branch_name", header: "Branch Name", headerClassName: "p-3 text-left text-xs font-medium", cellClassName: "p-3 text-sm", render: (invoice) => invoice.branch_name || "-" },
            { key: "invoice_number", header: "Invoice #", headerClassName: "p-3 text-left text-xs font-medium", cellClassName: "p-3 font-['JetBrains_Mono'] text-sm font-medium" },
            { key: "vendor_name", header: "Vendor", headerClassName: "p-3 text-left text-xs font-medium", cellClassName: "p-3 text-sm" },
            { key: "current_file_name", header: "Current File Name", headerClassName: "p-3 text-left text-xs font-medium", cellClassName: "p-3 text-xs font-['JetBrains_Mono'] text-muted-foreground", render: (invoice) => invoice.current_file_name || "-" },
            { key: "original_file_name", header: "Original File Name", headerClassName: "p-3 text-left text-xs font-medium", cellClassName: "p-3 text-xs font-['JetBrains_Mono'] text-muted-foreground", render: (invoice) => invoice.original_file_name || "-" },
            { key: "work_item_id", header: "Work Item ID", headerClassName: "p-3 text-left text-xs font-medium", cellClassName: "p-3 text-xs font-['JetBrains_Mono']", render: (invoice) => invoice.work_item_id || "-" },
            {
              key: "file_category",
              header: "File Category",
              headerClassName: "p-3 text-left text-xs font-medium",
              cellClassName: "p-3",
              render: (invoice) => (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200">
                  {invoice.file_category || "Expense Invoice"}
                </span>
              ),
            },
            { key: "amount", header: "Amount", headerClassName: "p-3 text-right text-xs font-medium", cellClassName: "p-3 font-['JetBrains_Mono'] text-sm font-semibold text-right", render: (invoice) => `₹${invoice.amount.toLocaleString("en-IN")}` },
            { key: "invoice_date", header: "Invoice Date", headerClassName: "p-3 text-left text-xs font-medium", cellClassName: "p-3 text-xs text-muted-foreground whitespace-nowrap", render: (invoice) => format(new Date(invoice.invoice_date), "dd MMM yy") },
            {
              key: "status",
              header: "Status",
              headerClassName: "p-3 text-left text-xs font-medium",
              cellClassName: "p-3",
              render: (invoice) => (
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${getStatusBadgeClass(invoice.status)}`}>
                  {invoice.status}
                </span>
              ),
            },
            { key: "created_at", header: "Created At", headerClassName: "p-3 text-left text-xs font-medium", cellClassName: "p-3 text-xs text-muted-foreground whitespace-nowrap", render: (invoice) => format(new Date(invoice.created_at), "dd MMM yy, hh:mm a") },
            {
              key: "actions",
              header: "Actions",
              headerClassName: "p-3 text-right text-xs font-medium",
              cellClassName: "p-3 text-right",
              render: (invoice) => (
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleViewInvoice(invoice)} data-testid={`view-invoice-${invoice.id}`} title="View Invoice" className="h-8 w-8 p-0">
                    <Eye className="h-4 w-4" />
                  </Button>
                  {canEdit(invoice.status) && (
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
              ),
            },
          ]}
        />
      </div>
    </>
  );
};

export default InvoicesTable;

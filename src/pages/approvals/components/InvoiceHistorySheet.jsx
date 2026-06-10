import React from 'react';
import { X } from 'lucide-react';
import ApprovalHistoryTimeline from '../../../components/common/ApprovalHistoryTimeline';
import { formatWorkflowStatus } from '../../../utils/approvalWorkflow';

const InvoiceHistorySheet = ({
  open,
  onOpenChange,
  invoice,
  history,
  loading,
  getStatusBadgeClass,
}) => {
  if (!open) return null;

  return (
    <aside
      className="fixed inset-y-0 right-0 z-40 flex w-[min(560px,92vw)] animate-in slide-in-from-right duration-300 flex-col overflow-hidden border-l bg-background shadow-xl"
      data-testid="approval-history-sheet"
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="shrink-0 border-b px-6 py-5 pr-12">
          <button
            type="button"
            className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            onClick={() => onOpenChange(false)}
            aria-label="Close history"
          >
            <X className="h-4 w-4" />
          </button>
          <h2 className="text-lg font-semibold text-foreground">Invoice history</h2>
          <p className="text-sm text-muted-foreground">
            {invoice?.invoiceNumber ? `Invoice ${invoice.invoiceNumber}` : 'Approval activity'}
          </p>
          {invoice && (
            <div className="flex flex-wrap items-center gap-2 pt-2 text-sm">
              <span className="font-medium text-foreground">
                {invoice.vendorName || invoice.vendorName || '-'}
              </span>
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getStatusBadgeClass(invoice.status)}`}
              >
                {formatWorkflowStatus(invoice.status)}
              </span>
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 scrollbar-thin-muted">
          <ApprovalHistoryTimeline
            history={history}
            loading={loading}
            emptyMessage="No invoice history found"
          />
        </div>
      </div>
    </aside>
  );
};

export default InvoiceHistorySheet;

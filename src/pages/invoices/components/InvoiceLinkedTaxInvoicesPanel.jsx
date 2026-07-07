import React from 'react';
import { format } from 'date-fns';
import { Ban, Eye } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { formatWorkflowStatus } from '../../../utils/approvalWorkflow';
import InvoiceDocumentTypeBadge from './InvoiceDocumentTypeBadge';
import { isLinkedTaxInvoice } from '../constants/proformaInvoice';
import {
  formatInvoiceAmount,
  getInvoiceGrossAmount,
  getInvoiceNetAmount,
} from '../utils/invoiceAmounts';

const formatLinkedDate = (value) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return format(parsed, 'dd MMM yyyy');
};

const LinkedTaxInvoiceChildRow = ({
  linkedInvoice,
  onViewInvoice,
  onCancelLinkedInvoice,
  canCancelLinkedInvoice,
  getStatusBadgeClass,
}) => {
  const invoiceNumber =
    linkedInvoice.invoiceNumber ?? linkedInvoice.invoice_number ?? 'Tax invoice';
  const status = linkedInvoice.status ?? '-';
  const showCancel =
    Boolean(onCancelLinkedInvoice) &&
    isLinkedTaxInvoice(linkedInvoice) &&
    canCancelLinkedInvoice?.(linkedInvoice);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-background px-3 py-3 lg:flex-row lg:items-center">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-sm">{invoiceNumber}</span>
          <InvoiceDocumentTypeBadge invoice={linkedInvoice} />
          {status !== '-' && (
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${getStatusBadgeClass?.(status) ?? ''}`}
            >
              {formatWorkflowStatus(status)}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>
            Invoice date:{' '}
            {formatLinkedDate(linkedInvoice.invoiceDate ?? linkedInvoice.invoice_date)}
          </span>
          <span>
            Gross:{' '}
            {formatInvoiceAmount(linkedInvoice, getInvoiceGrossAmount(linkedInvoice))}
          </span>
          <span>
            Net: {formatInvoiceAmount(linkedInvoice, getInvoiceNetAmount(linkedInvoice))}
          </span>
          {linkedInvoice.vendorName && <span>Vendor: {linkedInvoice.vendorName}</span>}
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {onViewInvoice ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onViewInvoice(linkedInvoice)}
            data-testid={`view-linked-tax-invoice-${linkedInvoice?.id ?? 'unknown'}`}
          >
            <Eye className="mr-1.5 h-3.5 w-3.5" />
            View invoice
          </Button>
        ) : null}
        {showCancel ? (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => onCancelLinkedInvoice(linkedInvoice)}
            data-testid={`cancel-linked-tax-invoice-${linkedInvoice?.id ?? 'unknown'}`}
          >
            <Ban className="mr-1.5 h-3.5 w-3.5" />
            Cancel invoice
          </Button>
        ) : null}
      </div>
    </div>
  );
};

const InvoiceLinkedTaxInvoicesPanel = ({
  linkedInvoices = [],
  onViewInvoice,
  onCancelLinkedInvoice,
  canCancelLinkedInvoice,
  getStatusBadgeClass,
  title = 'Linked Tax Invoices',
  className = '',
  inset = false,
}) => {
  if (!Array.isArray(linkedInvoices) || linkedInvoices.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No tax invoices linked yet.</p>
    );
  }

  return (
    <div className={className}>
      <div
        className={`mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground ${
          inset ? 'pl-12' : ''
        }`}
      >
        {title}
      </div>
      <p className={`mb-2 text-xs text-muted-foreground ${inset ? 'pl-12' : ''}`}>
        Linked tax invoices can be cancelled individually. They cannot be unlinked.
      </p>
      <div className={`space-y-2 ${inset ? 'pl-12' : ''}`}>
        {linkedInvoices.map((linkedInvoice) => (
          <LinkedTaxInvoiceChildRow
            key={linkedInvoice.id ?? linkedInvoice.invoiceNumber}
            linkedInvoice={linkedInvoice}
            onViewInvoice={onViewInvoice}
            onCancelLinkedInvoice={onCancelLinkedInvoice}
            canCancelLinkedInvoice={canCancelLinkedInvoice}
            getStatusBadgeClass={getStatusBadgeClass}
          />
        ))}
      </div>
    </div>
  );
};

export default InvoiceLinkedTaxInvoicesPanel;

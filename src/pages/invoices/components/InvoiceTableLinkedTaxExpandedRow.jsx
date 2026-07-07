import React from 'react';
import { TableCell, TableRow } from '../../../components/ui/table';
import InvoiceLinkedTaxInvoicesPanel from './InvoiceLinkedTaxInvoicesPanel';

const InvoiceTableLinkedTaxExpandedRow = ({
  parentInvoice,
  linkedInvoices = [],
  colSpan,
  onViewInvoice,
  onCancelLinkedInvoice,
  canCancelLinkedInvoice,
  getStatusBadgeClass,
}) => (
  <TableRow className="border-b border-border bg-muted/30 hover:bg-muted/30">
    <TableCell colSpan={colSpan} className="px-4 py-3">
      <InvoiceLinkedTaxInvoicesPanel
        linkedInvoices={linkedInvoices}
        onViewInvoice={onViewInvoice}
        onCancelLinkedInvoice={
          onCancelLinkedInvoice
            ? (linkedInvoice) => onCancelLinkedInvoice(linkedInvoice, parentInvoice)
            : undefined
        }
        canCancelLinkedInvoice={canCancelLinkedInvoice}
        getStatusBadgeClass={getStatusBadgeClass}
        inset
      />
    </TableCell>
  </TableRow>
);

export default InvoiceTableLinkedTaxExpandedRow;

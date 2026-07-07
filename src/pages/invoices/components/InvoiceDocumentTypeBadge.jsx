import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  getDocumentTypeBadgeClassName,
  getDocumentTypeLabel,
  isProformaInvoice,
} from '../constants/proformaInvoice';
import { getLinkedTaxInvoiceCount } from '../utils/proformaInvoiceListing';

const InvoiceDocumentTypeBadge = ({
  invoice,
  showLinkedCount = false,
  expandable = false,
  isExpanded = false,
  onToggleExpand,
  className = '',
}) => {
  const label = getDocumentTypeLabel(invoice);
  const linkedCount = getLinkedTaxInvoiceCount(invoice);
  const canExpand =
    expandable && isProformaInvoice(invoice) && linkedCount > 0 && onToggleExpand;

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center gap-1.5">
        {canExpand ? (
          <button
            type="button"
            onClick={onToggleExpand}
            className="inline-flex items-center gap-1.5 text-left"
            data-testid={`toggle-linked-tax-invoices-${invoice?.id ?? 'unknown'}`}
          >
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium leading-tight whitespace-nowrap ${getDocumentTypeBadgeClassName(invoice)}`}
            >
              {label}
            </span>
            {isExpanded ? (
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>
        ) : (
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium leading-tight whitespace-nowrap ${getDocumentTypeBadgeClassName(invoice)}`}
            data-testid={`invoice-document-type-${invoice?.id ?? 'unknown'}`}
          >
            {label}
          </span>
        )}
      </div>
      {showLinkedCount && isProformaInvoice(invoice) && linkedCount > 0 && (
        <button
          type="button"
          onClick={canExpand ? onToggleExpand : undefined}
          className={`block text-xs text-muted-foreground ${canExpand ? 'text-left hover:text-foreground' : ''}`}
        >
          Linked: {linkedCount}
          {canExpand ? (isExpanded ? ' · Hide' : ' · Show') : ''}
        </button>
      )}
    </div>
  );
};

export default InvoiceDocumentTypeBadge;

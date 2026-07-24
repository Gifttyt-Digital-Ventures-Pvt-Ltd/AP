import React from 'react';
import MsmePaymentDueBadge from './MsmePaymentDueBadge';
import { shouldShowMsmePaymentDue } from '../utils/msmePaymentDue';
import {
  getInvoiceDueDateIndicatorClassName,
  getInvoiceDueDateIndicatorLabel,
  shouldShowInvoicePaymentOverdueIndicator,
} from '../utils/invoiceDueDate';

const InvoiceDueDateIndicators = ({ invoice, className = '' }) => {
  const showMsmeBadge = shouldShowMsmePaymentDue(invoice);
  const showOverdueIndicator =
    !showMsmeBadge && shouldShowInvoicePaymentOverdueIndicator(invoice);
  const overdueLabel = showOverdueIndicator
    ? getInvoiceDueDateIndicatorLabel(invoice)
    : '';

  if (!showMsmeBadge && !showOverdueIndicator) {
    return null;
  }

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`.trim()}>
      <MsmePaymentDueBadge invoice={invoice} />
      {showOverdueIndicator && overdueLabel ? (
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium leading-tight ${getInvoiceDueDateIndicatorClassName()}`}
        >
          {overdueLabel}
        </span>
      ) : null}
    </div>
  );
};

export default InvoiceDueDateIndicators;

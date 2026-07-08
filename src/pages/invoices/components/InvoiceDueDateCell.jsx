import React from 'react';
import InvoiceDueDateIndicators from './InvoiceDueDateIndicators';

const InvoiceDueDateCell = ({ invoice, formattedDueDate }) => {
  const dueDateLabel = formattedDueDate || '-';
  const hasDueDate = Boolean(invoice?.dueDate || invoice?.due_date);

  return (
    <div className="space-y-1">
      <span className="whitespace-nowrap">{dueDateLabel}</span>
      {hasDueDate ? <InvoiceDueDateIndicators invoice={invoice} /> : null}
    </div>
  );
};

export default InvoiceDueDateCell;

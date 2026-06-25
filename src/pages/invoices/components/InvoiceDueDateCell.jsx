import React from 'react';
import InvoiceDueDateIndicators from './InvoiceDueDateIndicators';

const InvoiceDueDateCell = ({ invoice, formattedDueDate }) => {
  const dueDateLabel = formattedDueDate || '-';

  return (
    <div className="space-y-1">
      <span className="whitespace-nowrap">{dueDateLabel}</span>
      <InvoiceDueDateIndicators invoice={invoice} />
    </div>
  );
};

export default InvoiceDueDateCell;

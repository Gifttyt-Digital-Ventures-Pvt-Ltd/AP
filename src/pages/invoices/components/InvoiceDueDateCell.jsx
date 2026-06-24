import React from 'react';
import MsmePaymentDueBadge from './MsmePaymentDueBadge';

const InvoiceDueDateCell = ({ invoice, formattedDueDate }) => {
  const dueDateLabel = formattedDueDate || '-';

  return (
    <div className="space-y-1">
      <span>{dueDateLabel}</span>
      <MsmePaymentDueBadge invoice={invoice} />
    </div>
  );
};

export default InvoiceDueDateCell;

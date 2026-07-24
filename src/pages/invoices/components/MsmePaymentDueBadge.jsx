import React from 'react';
import {
  getMsmePaymentDueBadgeClassName,
  normalizeMsmePaymentDue,
  shouldShowMsmePaymentDue,
} from '../utils/msmePaymentDue';

const MsmePaymentDueBadge = ({ invoice, className = '' }) => {
  if (!shouldShowMsmePaymentDue(invoice)) return null;

  const { msmePaymentDueLabel, msmePaymentDueStatus } = normalizeMsmePaymentDue(invoice);

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium leading-tight ${getMsmePaymentDueBadgeClassName(msmePaymentDueStatus)} ${className}`}
      data-testid="msme-payment-due-badge"
    >
      {msmePaymentDueLabel}
    </span>
  );
};

export default MsmePaymentDueBadge;

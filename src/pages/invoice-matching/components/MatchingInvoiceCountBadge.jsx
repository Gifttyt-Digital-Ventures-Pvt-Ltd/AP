import React from 'react';
import { FileText } from 'lucide-react';
import { cn } from '../../../lib/utils';

const MatchingInvoiceCountBadge = ({ count = 0, className }) => {
  if (!count) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary whitespace-nowrap',
        className,
      )}
    >
      <FileText className="h-3 w-3 shrink-0" />
      {count} Invoice{count !== 1 ? 's' : ''}
    </span>
  );
};

export default MatchingInvoiceCountBadge;

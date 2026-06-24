import React from 'react';
import { Globe } from 'lucide-react';
import { cn } from '../../../lib/utils';

const VendorMultiGstBadge = ({ count = 0, states = [], className }) => {
  if (!count) return null;

  const uniqueStates = [...new Set(states.filter(Boolean))];
  const isMultiState = uniqueStates.length > 1;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary whitespace-nowrap',
        className,
      )}
    >
      <Globe className="h-3 w-3 shrink-0" />
      {count} GSTIN{count !== 1 ? 's' : ''}
      {isMultiState && count > 1 ? ' · Multi-State' : ''}
    </span>
  );
};

export default VendorMultiGstBadge;

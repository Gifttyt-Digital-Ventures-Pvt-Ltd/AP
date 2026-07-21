import React from 'react';
import { AlertTriangle, CheckCircle2, CircleDashed, HelpCircle, XCircle } from 'lucide-react';
import { Badge } from '../../../../components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../../components/ui/tooltip';
import { cn } from '../../../../lib/utils';

/**
 * Exact-match status config (not substring heuristics like TaxStatusBadge) so the
 * 6 canonical GST Overview ReconStatus values map to the exact tone the spec requires.
 */
const GST_RECON_STATUS_CONFIG = {
  MATCHED: {
    label: 'Matched',
    icon: CheckCircle2,
    className: 'border-green-200 bg-green-50 text-green-700',
  },
  MATCHED_MANUAL: {
    label: 'Matched · Manual',
    icon: CheckCircle2,
    className: 'border-green-200 bg-green-50/60 text-green-700',
  },
  MISMATCH: {
    label: 'Mismatch',
    icon: AlertTriangle,
    className: 'border-amber-200 bg-amber-50 text-amber-700',
  },
  NO_INVOICE_FOUND: {
    label: 'No Invoice Found',
    icon: HelpCircle,
    className: 'border-blue-200 bg-blue-50 text-blue-700',
  },
  NOT_IN_GST: {
    label: 'Not in GST',
    icon: XCircle,
    className: 'border-red-200 bg-red-50 text-red-700',
  },
  NOT_RECONCILED: {
    label: 'Not Reconciled',
    icon: CircleDashed,
    className: 'border-slate-200 bg-slate-50 text-slate-600',
  },
};

const DEFAULT_STATUS_CONFIG = {
  label: 'Unknown',
  icon: HelpCircle,
  className: 'border-slate-200 bg-slate-50 text-slate-600',
};

/** GST Overview status chip — icon + label per status, not color alone. */
export const GstReconStatusChip = ({ status }) => {
  const config = GST_RECON_STATUS_CONFIG[status] ?? DEFAULT_STATUS_CONFIG;
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn('gap-1 whitespace-nowrap font-medium', config.className)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};

/**
 * GST Overview differ-badge — shown only when the row's 2A and 2B statuses disagree.
 * Note: the overview list API (BE §10.2 / FE §8 OverviewRow) does not return the individual
 * status_2A/status_2B values, only the `differBadge` flag and `statusSource`, so the tooltip
 * is limited to what the contract actually provides.
 */
export const GstReconDifferBadge = ({ differBadge, statusSource }) => {
  if (!differBadge) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className="ml-1 inline-flex cursor-default items-center rounded-full border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700"
        >
          2A≠2B
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs break-words">
        2A and 2B reconciliation status differ for this invoice. Showing {statusSource || 'resolved'} status.
      </TooltipContent>
    </Tooltip>
  );
};

/** True when a row's values are sourced from the GST portal, not the platform (FE §2.2/§2.3). */
export const isPortalOnlyRow = (row) => row?.valueSource === 'GST_PORTAL';

/** Subtle background tint for portal-only rows, applied to the row (e.g. <TableRow>). */
export const getReconRowClassName = (row) =>
  cn(isPortalOnlyRow(row) && 'bg-blue-50/40');

/** Small tag marking invoice/vendor/date/amount values as sourced from the GST portal, not the platform. */
export const GstPortalSourceTag = () => (
  <Badge
    variant="outline"
    className="ml-1.5 whitespace-nowrap border-blue-200 bg-blue-50 px-1.5 py-0 text-[10px] font-medium text-blue-600"
  >
    GST Portal
  </Badge>
);

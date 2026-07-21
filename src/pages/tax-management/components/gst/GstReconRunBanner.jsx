import React from 'react';
import { Loader2 } from 'lucide-react';
import { Badge } from '../../../../components/ui/badge';
import { TaxMiniMetric } from '../TaxUi';
import { cn } from '../../../../lib/utils';

// Exact-match run-state config — BE §10.1's PENDING/RUNNING/DONE/FAILED vocabulary isn't
// covered by TaxStatusBadge's substring heuristic (no rule for "running"/"done"/"failed"),
// so this mirrors B5's dedicated exact-match approach, scoped only to this component.
const RUN_STATE_CONFIG = {
  PENDING: { label: 'Queued', className: 'border-amber-200 bg-amber-50 text-amber-700', active: true },
  RUNNING: { label: 'Running', className: 'border-blue-200 bg-blue-50 text-blue-700', active: true },
  DONE: { label: 'Completed', className: 'border-green-200 bg-green-50 text-green-700', active: false },
  FAILED: { label: 'Failed', className: 'border-red-200 bg-red-50 text-red-700', active: false },
};

/**
 * GST Overview "Run In Progress" banner (FE §2.4 / §6).
 * Purely presentational and controlled entirely through props — no API calls, no polling,
 * no internal state. Renders nothing when there is no active run (`state` is falsy).
 */
const GstReconRunBanner = ({ state, counts }) => {
  if (!state) return null;

  const config = RUN_STATE_CONFIG[state] ?? RUN_STATE_CONFIG.RUNNING;
  const safeCounts = counts ?? {};

  return (
    <div className="rounded-md border bg-muted/20 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">GST Reconciliation Run</p>
          {config.active ? (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Reconciling invoices in the background…
            </p>
          ) : null}
        </div>
        <Badge variant="outline" className={cn('whitespace-nowrap font-medium', config.className)}>
          {config.label}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <TaxMiniMetric label="Matched" value={safeCounts.matched ?? 0} tone="green" />
        <TaxMiniMetric label="Mismatch" value={safeCounts.mismatch ?? 0} tone="amber" />
        <TaxMiniMetric label="No Invoice Found" value={safeCounts.noInvoiceFound ?? 0} tone="primary" />
        <TaxMiniMetric label="Not in GST" value={safeCounts.notInGst ?? 0} tone="red" />
        <TaxMiniMetric label="Total" value={safeCounts.total ?? 0} tone="default" />
      </div>
    </div>
  );
};

export default GstReconRunBanner;

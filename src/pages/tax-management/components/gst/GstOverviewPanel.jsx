import React, { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { toast } from 'sonner';
import { TabsContent } from '../../../../components/ui/tabs';
import { Button } from '../../../../components/ui/button';
import { Skeleton } from '../../../../components/ui/skeleton';
import { TaxEmptyState } from '../TaxUi';
import GstReconFilterBar from './GstReconFilterBar';
import GstReconRunBanner from './GstReconRunBanner';
import GstReconOverviewTable from './GstReconOverviewTable';
import GstReconViewPanel from './GstReconViewPanel';
import { useGstReconOverview } from '../../hooks/useGstReconOverview';
import { GST_RECON_OVERVIEW_DATE_FILTERS } from '../../data/taxStaticData';

// FE §2.4 — skeleton row count for the initial-load state.
const GST_RECON_OVERVIEW_SKELETON_ROWS = 10;

const GstOverviewPanel = () => {
  const {
    dateFilter,
    onDateFilterChange,
    source,
    onSourceChange,
    statusFilter,
    onStatusFilterChange,
    search,
    onSearchChange,
    onRefresh,
    refreshing,
    runState,
    runCounts,
    rows,
    page,
    totalPages,
    onPreviousPage,
    onNextPage,
    isLoading,
    isError,
  } = useGstReconOverview();

  // FE §2.4 — "Error: retryable toast + inline retry." Fires once per error occurrence.
  useEffect(() => {
    if (!isError) return;
    toast.error('Unable to load GST reconciliation overview.', {
      action: { label: 'Retry', onClick: onRefresh },
    });
  }, [isError, onRefresh]);

  // True only before the first successful load for the current filters — RTK Query keeps
  // the previous page's rows in place during a refetch, so this doesn't re-trigger on
  // pagination/refresh once data has loaded at least once.
  const isInitialLoading = isLoading && rows.length === 0;

  const dateFilterLabel =
    GST_RECON_OVERVIEW_DATE_FILTERS.find((option) => option.value === dateFilter)?.label ?? 'the selected period';

  // FE §3 — the View CTA opens the Reconciliation View (checklist/split/no-invoice-found/
  // override) in place of the list, for any row (platform-linked or portal-only).
  const [activeRow, setActiveRow] = useState(null);

  if (activeRow) {
    return (
      <TabsContent value="overview" className="flex h-full min-h-0 flex-col gap-6">
        <GstReconViewPanel row={activeRow} source={source} onBack={() => setActiveRow(null)} />
      </TabsContent>
    );
  }

  return (
    <TabsContent value="overview" className="flex h-full min-h-0 flex-col gap-6">
      <div className="shrink-0">
        <GstReconFilterBar
          dateFilter={dateFilter}
          onDateFilterChange={onDateFilterChange}
          source={source}
          onSourceChange={onSourceChange}
          statusFilter={statusFilter}
          onStatusFilterChange={onStatusFilterChange}
          search={search}
          onSearchChange={onSearchChange}
          onRefresh={onRefresh}
          refreshing={refreshing}
        />
      </div>

      <div className="shrink-0">
        <GstReconRunBanner state={runState} counts={runCounts} />
      </div>

      {isError ? (
        <div className="flex shrink-0 items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
          <p className="text-sm text-destructive">Unable to load GST reconciliation overview. Try refreshing.</p>
          <Button type="button" variant="outline" size="sm" onClick={onRefresh}>
            Retry
          </Button>
        </div>
      ) : null}

      {/* Bounded to the remaining height so GstReconOverviewTable can scroll its rows
          internally with a docked pagination footer, matching Approvals > All. */}
      <div className="min-h-0 flex-1">
        {isInitialLoading ? (
          <div className="space-y-2 rounded-md border p-3">
            {Array.from({ length: GST_RECON_OVERVIEW_SKELETON_ROWS }).map((_, index) => (
              <Skeleton key={index} className="h-9 w-full" />
            ))}
          </div>
        ) : isError ? null : rows.length === 0 ? (
          <TaxEmptyState
            icon={FileText}
            title="No invoices found"
            description={`No invoices for ${dateFilterLabel}. Run a GSTR2A/2B fetch to populate.`}
          />
        ) : (
          <GstReconOverviewTable
            rows={rows}
            page={page}
            totalPages={totalPages}
            loading={isLoading}
            selectedSource={source}
            onPreviousPage={onPreviousPage}
            onNextPage={onNextPage}
            onView={setActiveRow}
          />
        )}
      </div>
    </TabsContent>
  );
};

export default GstOverviewPanel;

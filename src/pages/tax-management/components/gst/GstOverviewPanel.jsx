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
import { useGstReconOverview } from '../../hooks/useGstReconOverview';
import { GST_RECON_OVERVIEW_DATE_FILTERS } from '../../data/taxStaticData';
import {
  useLazyGetInvoiceQuery,
  useLazyGetInvoiceHistoryQuery,
} from '../../../../Services/apis/invoicesVendorsApi';
import { getInvoiceStatusBadgeClass } from '../../../../utils/approvalWorkflow';
import ViewDialog from '../../../invoices/components/ViewDialog';
import { InvoicePdfPreview } from '../../../invoices/components/InvoicePdfPreview';
import { getInvoiceFileUrl } from '../../../invoices/utils/invoicePreview';

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

  // View flow — reuses the existing Invoices ViewDialog, fetched by platformInvoiceId via the
  // same lazy queries InvoicesPage.jsx uses (getInvoice / getInvoiceHistory), not a new dialog.
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [viewTab, setViewTab] = useState('details');
  const [invoiceHistory, setInvoiceHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [pdfZoom, setPdfZoom] = useState(100);
  const [viewPreviewError, setViewPreviewError] = useState(false);

  const [getInvoice] = useLazyGetInvoiceQuery();
  const [getInvoiceHistory] = useLazyGetInvoiceHistoryQuery();

  const handleViewInvoice = async (row) => {
    if (!row.platformInvoiceId) {
      toast.info('No platform invoice is linked to this GST record yet.');
      return;
    }

    try {
      const invoice = await getInvoice(row.platformInvoiceId).unwrap();
      setSelectedInvoice(invoice);
      setViewTab('details');
      setViewPreviewError(false);
      setInvoiceHistory([]);
      setViewDialogOpen(true);

      setLoadingHistory(true);
      try {
        const history = await getInvoiceHistory(row.platformInvoiceId).unwrap();
        setInvoiceHistory(Array.isArray(history) ? history : []);
      } finally {
        setLoadingHistory(false);
      }
    } catch {
      toast.error('Unable to load the linked invoice.');
    }
  };

  const renderPdfPreview = (props = {}) => (
    <InvoicePdfPreview {...props} setPdfZoom={setPdfZoom} getInvoiceFileUrl={getInvoiceFileUrl} />
  );

  return (
    <TabsContent value="overview" className="space-y-6">
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

      <GstReconRunBanner state={runState} counts={runCounts} />

      {isError ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
          <p className="text-sm text-destructive">Unable to load GST reconciliation overview. Try refreshing.</p>
          <Button type="button" variant="outline" size="sm" onClick={onRefresh}>
            Retry
          </Button>
        </div>
      ) : null}

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
          onPreviousPage={onPreviousPage}
          onNextPage={onNextPage}
          onView={handleViewInvoice}
        />
      )}

      <ViewDialog
        viewDialogOpen={viewDialogOpen}
        setViewDialogOpen={setViewDialogOpen}
        selectedInvoice={selectedInvoice}
        renderPdfPreview={renderPdfPreview}
        pdfZoom={pdfZoom}
        viewPreviewError={viewPreviewError}
        setViewPreviewError={setViewPreviewError}
        getStatusBadgeClass={getInvoiceStatusBadgeClass}
        viewTab={viewTab}
        setViewTab={setViewTab}
        invoiceHistory={invoiceHistory}
        loadingHistory={loadingHistory}
        canEdit={() => false}
        canCancel={() => false}
        showRefNoField={false}
        showAccountingLockBanner={false}
      />
    </TabsContent>
  );
};

export default GstOverviewPanel;

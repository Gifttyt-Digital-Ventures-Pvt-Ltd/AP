import React, { useEffect, useState } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { Skeleton } from '../../../../components/ui/skeleton';
import { TaxDetailGrid, TaxAlertBanner, TaxEmptyState } from '../TaxUi';
import { GstReconStatusChip } from './gstReconTableHelpers';
import { GstReconChecklistTable, GstReconSplitPanel, GstReconScorePill } from './GstReconChecklistPanel';
import GstReconNoInvoiceFoundFlow from './GstReconNoInvoiceFoundFlow';
import GstReconOverrideDialog from './GstReconOverrideDialog';
import { useGstReconDetail } from '../../hooks/useGstReconDetail';
import { getApiErrorMessage } from '../../hooks/useGstTaxpayerSession';
import { formatCurrency, formatDate } from '../../utils/taxFormatting';
import {
  useLazyGetInvoiceQuery,
  useLazyGetInvoiceHistoryQuery,
} from '../../../../Services/apis/invoicesVendorsApi';
import { getInvoiceStatusBadgeClass } from '../../../../utils/approvalWorkflow';
import ViewDialog from '../../../invoices/components/ViewDialog';
import { InvoicePdfPreview } from '../../../invoices/components/InvoicePdfPreview';
import { getInvoiceFileUrl } from '../../../invoices/utils/invoicePreview';

const PAIRING_METHOD_LABELS = {
  AUTO_FUZZY: 'Auto-paired',
  MANUAL_SELECT: 'Manually linked',
  MANUAL_UPLOAD: 'Linked via upload',
};

const GST_SOURCE_LABELS = {
  EFFECTIVE: 'Effective',
  SOURCE_2A: '2A',
  SOURCE_2B: '2B',
};
const formatGstSourceLabel = (source) => GST_SOURCE_LABELS[source] ?? source ?? '-';

const OVERRIDABLE_STATUSES = ['MISMATCH', 'NOT_IN_GST', 'NO_INVOICE_FOUND'];

/**
 * FE §3-§6 — Reconciliation View for a single Overview row. Adapts the spec's standalone
 * `/gst/recon/view` route into an in-place panel swap within the Overview tab (this app keeps
 * GST sub-tab/detail navigation as local state rather than nested routes — see GstDocumentsPanels'
 * B2bReconciliationDetail for the same pattern).
 */
const GstReconViewPanel = ({ row, source, onBack }) => {
  const {
    detail,
    isLoading,
    isError,
    refetch,
    period,
    source: detailSource,
    linkInvoice,
    linking,
    uploadInvoice,
    uploading,
    uploadJob,
    overrideRecon,
    overriding,
  } = useGstReconDetail({ row, source, enabled: true });

  const [overrideOpen, setOverrideOpen] = useState(false);

  useEffect(() => {
    if (!isError) return;
    toast.error('Unable to load reconciliation detail for this invoice.');
  }, [isError]);

  // Secondary action — view the original platform invoice (PDF + fields), reusing the same
  // ViewDialog/lazy queries the Overview table used before this panel existed.
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [viewTab, setViewTab] = useState('details');
  const [invoiceHistory, setInvoiceHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [pdfZoom, setPdfZoom] = useState(100);
  const [viewPreviewError, setViewPreviewError] = useState(false);
  const [getInvoice] = useLazyGetInvoiceQuery();
  const [getInvoiceHistory] = useLazyGetInvoiceHistoryQuery();

  const handleViewOriginalInvoice = async () => {
    if (!row?.platformInvoiceId) return;
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

  const handleOverrideSubmit = async (reason) => {
    try {
      await overrideRecon(reason);
      toast.success('Status overridden to Matched · Manual.');
      setOverrideOpen(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  const status = detail?.header?.status ?? row?.status;
  const pairingLabel = PAIRING_METHOD_LABELS[detail?.pairing?.method] ?? detail?.pairing?.method;
  const similarity = detail?.pairing?.similarity;
  const pairingStatus = detail?.pairing?.status;
  const pairingValue = pairingLabel
    ? [pairingLabel, similarity != null ? `similarity ${similarity}` : null, pairingStatus]
        .filter(Boolean)
        .join(' · ')
    : '-';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" />
          Back to Overview
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          {row?.platformInvoiceId ? (
            <Button type="button" variant="outline" size="sm" onClick={handleViewOriginalInvoice}>
              View original invoice
            </Button>
          ) : null}
          <Button type="button" variant="outline" size="sm" onClick={refetch} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Re-run
          </Button>
          {OVERRIDABLE_STATUSES.includes(status) ? (
            <Button type="button" size="sm" onClick={() => setOverrideOpen(true)}>
              Override
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">{row?.invoiceNo || 'GST Invoice'}</h2>
        <GstReconStatusChip status={status} />
        {detail?.header ? (
          <GstReconScorePill passed={detail.header.scorePassed} evaluated={detail.header.scoreEvaluated} />
        ) : null}
      </div>

      <TaxDetailGrid
        items={[
          { label: 'Vendor', value: row?.vendorName },
          { label: 'Invoice Date', value: formatDate(row?.invoiceDate) },
          { label: 'Invoice Amount', value: formatCurrency(row?.invoiceAmount) },
          { label: 'Period', value: period },
          {
            label: 'Source',
            value: <Badge variant="outline">{formatGstSourceLabel(detailSource)}</Badge>,
          },
          { label: 'Pairing', value: pairingValue },
        ]}
      />

      {isLoading ? (
        <div className="space-y-2 rounded-md border p-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-9 w-full" />
          ))}
        </div>
      ) : status === 'NO_INVOICE_FOUND' ? (
        <div className="space-y-3">
          <TaxAlertBanner tone="blue">
            No platform invoice is linked to this GST record yet. Link an existing invoice or upload one below.
          </TaxAlertBanner>
          <GstReconNoInvoiceFoundFlow
            row={row}
            linkInvoice={linkInvoice}
            linking={linking}
            uploadInvoice={uploadInvoice}
            uploading={uploading}
            uploadJob={uploadJob}
            onLinked={refetch}
          />
        </div>
      ) : status === 'NOT_IN_GST' ? (
        <TaxAlertBanner tone="red">
          Not reported by the supplier in {detailSource} for {period} — ITC at risk.
        </TaxAlertBanner>
      ) : status === 'NOT_RECONCILED' ? (
        <TaxEmptyState
          title="Not reconciled yet"
          description="Run a GSTR-2A/2B fetch for this period to reconcile this invoice."
        />
      ) : (
        <div className="space-y-4">
          {status === 'MATCHED_MANUAL' && detail?.header?.staleManual ? (
            <TaxAlertBanner tone="amber">
              This invoice was manually matched, but the underlying values have changed since — consider
              re-running reconciliation.
            </TaxAlertBanner>
          ) : null}
          {(() => {
            const hasCriteria = Boolean(detail?.criteria?.length);
            const hasSplitData = Boolean(
              detail?.split || detail?.slabs?.platform?.length || detail?.slabs?.gst?.length,
            );
            if (!hasCriteria && !hasSplitData) {
              return (
                <TaxEmptyState title="No checklist data" description="Reconciliation detail is not available yet." />
              );
            }
            return (
              <>
                {hasCriteria ? <GstReconChecklistTable criteria={detail.criteria} /> : null}
                {hasSplitData ? <GstReconSplitPanel split={detail.split} slabs={detail.slabs} /> : null}
              </>
            );
          })()}
        </div>
      )}

      <ViewDialog
        viewDialogOpen={viewDialogOpen}
        setViewDialogOpen={setViewDialogOpen}
        selectedInvoice={selectedInvoice}
        renderPdfPreview={(props = {}) => (
          <InvoicePdfPreview {...props} setPdfZoom={setPdfZoom} getInvoiceFileUrl={getInvoiceFileUrl} />
        )}
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

      <GstReconOverrideDialog
        open={overrideOpen}
        onOpenChange={setOverrideOpen}
        currentStatus={status}
        submitting={overriding}
        onSubmit={handleOverrideSubmit}
      />
    </div>
  );
};

export default GstReconViewPanel;

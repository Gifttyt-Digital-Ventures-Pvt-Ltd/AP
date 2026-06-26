import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpDown,
  BarChart2,
  Calendar,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Loader2,
  Play,
} from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/ui/tabs';
import { cn } from '../../../../lib/utils';
import {
  GST_DOC_FY_OPTIONS,
  GST_DOC_MONTHS,
  DEFAULT_GST_DOC_FY,
} from '../../data/taxStaticData';
import { useOrganisationGstCredentials } from '../../hooks/useOrganisationGstCredentials';
import { useGstVendors } from '../../hooks/useGstVendors';
import { useGstTaxpayerSession } from '../../hooks/useGstTaxpayerSession';
import {
  useReconcileGstr2aMutation,
  useFetchGstr2aReconcileHistoryMutation,
  useFetchGstr2aDocumentsMutation,
  useFetchGstr2aDocumentsHistoryMutation,
  useFetchGstr2bDocumentsMutation,
  useFetchGstr2bDocumentsHistoryMutation,
} from '../../../../Services/apis/taxApi';
import { buildGstPortalFetchCredentials } from '../../../../utils/organisationGst';
import {
  buildGstrDocumentsRequestPayload,
  buildReconcileRequestPayload,
  humanizeGstEnum,
  isAmendedGstInvoice,
  isGstMatchStatus,
  mapHistoryEntriesToSnapshots,
} from '../../utils/gstApiMappers';
import OrgGstCredentialFields from './OrgGstCredentialFields';
import GstPortalOtpDialog from './GstPortalOtpDialog';
import { getApiErrorMessage } from '../../hooks/useGstTaxpayerSession';
import { toast } from 'sonner';
import { formatCurrency } from '../../utils/taxFormatting';
import {
  TaxAlertBanner,
  TaxApiMeta,
  TaxCompactTable,
  TaxDetailGrid,
  TaxDrawer,
  TaxEmptyState,
  TaxGstAvailBadge,
  TaxMiniMetric,
  TaxPagination,
  TaxProgressRow,
  TaxSectionCard,
  TaxSelect,
  TaxStatusBadge,
  TaxViewFilterPills,
} from '../TaxUi';

const docTotalGst = (doc) => {
  const split = Number(doc.cgst || 0) + Number(doc.sgst || 0) + Number(doc.igst || 0) + Number(doc.cess || 0);
  if (split > 0) return split;
  return Number(doc.totalGstAmount ?? doc.gstAmount ?? 0);
};

const b2bRowClass = (row) => {
  if (isGstMatchStatus(row, 'MISSING_IN_OPTIFII') || isGstMatchStatus(row, 'MISSING_IN_GSTR2A')) return 'bg-red-50/80';
  if (isGstMatchStatus(row, 'MISMATCHED') || isGstMatchStatus(row, 'AMOUNT_MISMATCH')) return 'bg-amber-50/80';
  if (isAmendedGstInvoice(row)) return 'bg-amber-50/40';
  return '';
};

const GstFormField = ({ label, required, optional, children, className }) => (
  <div className={cn('flex min-w-[160px] flex-col gap-1.5', className)}>
    <label className="text-xs font-semibold">
      {label}
      {required ? <span className="text-destructive"> *</span> : null}
      {optional ? <span className="font-normal text-muted-foreground"> (optional)</span> : null}
    </label>
    {children}
  </div>
);

const getHistoryEntryResponse = (entry) => entry?.response?.currentData ?? entry?.response ?? {};
const getDocumentHistoryDocs = (entry) => {
  const response = getGstDocumentsPayload(getHistoryEntryResponse(entry));
  return response?.documents ?? [];
};
const getGstDocumentsPayload = (response) => response?.currentData ?? response?.data?.currentData ?? response?.data ?? response ?? {};
const getGstDocuments = (response) => getGstDocumentsPayload(response)?.documents ?? [];

const formatHistoryRequestedAt = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const GstFetchLoading = ({ message, subMessage }) => (
  <TaxSectionCard>
    <div className="flex flex-col items-center gap-3 py-10 text-sm text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
      <p>{message}</p>
      {subMessage ? <p className="text-xs">{subMessage}</p> : null}
    </div>
  </TaxSectionCard>
);

const HISTORY_PAGE_SIZE = 20;
const getHistoryTotal = (items) => Number(items?.total ?? items?.length ?? 0);
const getHistoryTotalPages = (total) => Math.max(1, Math.ceil(Number(total || 0) / HISTORY_PAGE_SIZE));

const B2bInvoiceDrawerContent = ({ record, vendor }) => {
  const totalGst = docTotalGst(record);
  const amendments = record.amendmentHistory?.amendments ?? [];
  const hasAmends = amendments.length > 0;

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">1 · Current GST Record</p>
        <div className="rounded-md border bg-muted/20 p-4">
          <p className="font-semibold">{vendor?.name}</p>
          <p className="font-mono text-xs text-muted-foreground">{vendor?.gstin}</p>
          <TaxDetailGrid
            items={[
              { label: 'Invoice Number', value: record.invoiceNumber, mono: true },
              { label: 'Invoice Date', value: record.invoiceDate },
              { label: 'ITC Eligibility', value: humanizeGstEnum(record.itcEligibility) },
              { label: 'Amendment Status', value: humanizeGstEnum(record.amendmentStatus) },
            ]}
          />
          <div className="mt-3 space-y-1 text-sm">
            {[
              ['Taxable Value', formatCurrency(record.taxableValue)],
              ['CGST', formatCurrency(record.cgst)],
              ['SGST', formatCurrency(record.sgst)],
              ['IGST', formatCurrency(record.igst)],
              ['CESS', formatCurrency(record.cess)],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between border-b py-1.5 last:border-0">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
            <div className="flex justify-between pt-1 font-semibold text-primary">
              <span>Total GST</span>
              <span>{formatCurrency(totalGst)}</span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">2 · Amendment History</p>
        {!hasAmends ? (
          <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            No amendments found for this invoice.
          </div>
        ) : (
          <div className="space-y-3">
            {amendments.map((entry, index) => (
              <div key={index} className="rounded-md border border-amber-200 bg-amber-50/60 p-3 text-sm">
                <p className="font-semibold text-amber-900">Amendment {index + 1} · {entry.invoiceDate ?? entry.date}</p>
                <p className="mt-1 text-amber-900/90">{entry.reason ?? entry.amend_note ?? ''}</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <p>Taxable: {formatCurrency(entry.originalTaxableValue ?? entry.taxable_orig)} → <strong>{formatCurrency(entry.taxableValue ?? entry.taxable_new)}</strong></p>
                  <p>GST: {formatCurrency(entry.originalTotalGstAmount ?? entry.gst_orig)} → <strong>{formatCurrency(entry.gstAmount ?? entry.gst_new)}</strong></p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">3 · AP Reconciliation</p>
        <div className={cn('rounded-md border p-4', isGstMatchStatus(record, 'MATCHED') ? 'border-green-200 bg-green-50/60' : 'border-amber-200 bg-amber-50/60')}>
          <div className="mb-3 flex items-center gap-2">
            <span className="text-sm">Status:</span>
            <TaxStatusBadge status={record.matchStatus} />
          </div>
          {record.apInvoiceNumber ? (
            <TaxDetailGrid
              items={[
                { label: 'AP Invoice', value: record.apInvoiceNumber, mono: true },
                { label: 'GST Portal Amount', value: formatCurrency(totalGst) },
                { label: 'Amount Difference', value: Number(record.amountVariance ?? record.ap_diff) > 0 ? formatCurrency(record.amountVariance ?? record.ap_diff) : 'No variance' },
              ]}
            />
          ) : (
            <p className="text-sm">
              {isGstMatchStatus(record, 'MISSING_IN_OPTIFII')
                ? 'This invoice is in the GST portal but has no corresponding record in AP. Verify with the finance team.'
                : 'This invoice is in AP but has not been uploaded to the GST portal by the supplier.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const Gst2ADocDrawerContent = ({ doc, vendor }) => {
  const totalGst = docTotalGst(doc);
  const vendorInfo = vendor || { name: doc.vendor, gstin: doc.gstin ?? doc.supplierGstin };

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-muted/20 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vendor Information</p>
        <p className="mt-2 font-semibold">{vendorInfo?.name ?? 'All Vendors'}</p>
        <p className="font-mono text-xs text-muted-foreground">{vendorInfo?.gstin ?? '—'}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <TaxStatusBadge status={doc.documentType} />
          <TaxStatusBadge status={doc.documentStatus} />
          <TaxStatusBadge status={doc.amendmentStatus} />
        </div>
      </div>

      <TaxDetailGrid
        items={[
          { label: 'Document Number', value: doc.invoiceNumber, mono: true },
          { label: 'Document Date', value: doc.documentDate },
          { label: 'Document Type', value: doc.documentType },
          { label: 'Source', value: 'GST Portal (GSTR-2A)' },
        ]}
      />

      <div className="space-y-1 text-sm">
        {[
          ['Taxable Value', formatCurrency(doc.taxableValue)],
          ['CGST', formatCurrency(doc.cgst)],
          ['SGST', formatCurrency(doc.sgst)],
          ['IGST', formatCurrency(doc.igst)],
          ['CESS', formatCurrency(doc.cess)],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between border-b py-1.5 last:border-0">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium">{value}</span>
          </div>
        ))}
        <div className="flex justify-between pt-1 font-semibold text-primary">
          <span>Total GST</span>
          <span>{formatCurrency(totalGst)}</span>
        </div>
      </div>

      <div className={cn('rounded-md border p-4', doc.apStatus === 'Matched' ? 'border-green-200 bg-green-50/60' : 'border-amber-200 bg-amber-50/60')}>
        <div className="mb-2 flex items-center gap-2">
          <span className="text-sm">AP Match:</span>
          <TaxStatusBadge status={doc.apStatus} />
        </div>
        {doc.apInvoiceNumber ? (
          <TaxDetailGrid
            items={[
              { label: 'AP Invoice', value: doc.apInvoiceNumber, mono: true },
              { label: 'AP Amount', value: formatCurrency(doc.apAmount) },
              { label: 'ITC Eligibility', value: humanizeGstEnum(doc.itcEligibility) },
            ]}
          />
        ) : (
          <p className="text-sm text-muted-foreground">No matching AP invoice found for this document.</p>
        )}
      </div>
    </div>
  );
};

const Gst2BDocDrawerContent = ({ doc }) => {
  const vendor = { name: doc.vendor, gstin: doc.gstin ?? doc.supplierGstin };
  const totalGst = docTotalGst(doc);
  const itcStatus = doc.itcEligibility ?? doc.itc_status;

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-muted/20 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vendor Information</p>
        <p className="mt-2 font-semibold">{vendor?.name ?? '—'}</p>
        <p className="font-mono text-xs text-muted-foreground">{vendor?.gstin ?? '—'}</p>
        <TaxDetailGrid
          items={[
            { label: 'Document Number', value: doc.invoiceNumber, mono: true },
            { label: 'Document Date', value: doc.documentDate },
            { label: 'Document Type', value: doc.documentType },
            { label: 'Source', value: 'GSTR-2B (Finalized)' },
          ]}
        />
      </div>

      <div className="space-y-1 text-sm">
        {[
          ['Taxable Value', formatCurrency(doc.taxableValue)],
          ['CGST', formatCurrency(doc.cgst)],
          ['SGST', formatCurrency(doc.sgst)],
          ['IGST', formatCurrency(doc.igst)],
          ['CESS', formatCurrency(doc.cess)],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between border-b py-1.5 last:border-0">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium">{value}</span>
          </div>
        ))}
        <div className="flex justify-between pt-1 font-semibold text-primary">
          <span>Total GST</span>
          <span>{formatCurrency(totalGst)}</span>
        </div>
      </div>

      <div className={cn(
        'rounded-md border p-4',
        itcStatus === 'Eligible' ? 'border-green-200 bg-green-50/60' :
          itcStatus === 'Blocked' ? 'border-red-200 bg-red-50/60' :
            'border-amber-200 bg-amber-50/60',
      )}
      >
        <div className="mb-3 flex items-center gap-2">
          <span className="text-sm">ITC Status:</span>
          <TaxStatusBadge status={itcStatus} />
        </div>
        <TaxDetailGrid
          items={[
            { label: 'Claimable ITC', value: formatCurrency(doc.claimable) },
            { label: 'Blocked ITC', value: formatCurrency(doc.blocked) },
            { label: 'Block Reason', value: doc.blockReason ?? doc.block_reason ?? '—' },
          ]}
        />
      </div>

      <div className={cn('rounded-md border p-4', doc.apStatus === 'Matched' ? 'border-green-200 bg-green-50/60' : 'border-amber-200 bg-amber-50/60')}>
        <div className="mb-2 flex items-center gap-2">
          <span className="text-sm">AP Match:</span>
          <TaxStatusBadge status={doc.apStatus} />
        </div>
        {doc.apInvoiceNumber ? (
          <TaxDetailGrid
            items={[
              { label: 'AP Invoice', value: doc.apInvoiceNumber, mono: true },
              { label: 'AP Amount', value: formatCurrency(doc.apAmount) },
            ]}
          />
        ) : (
          <p className="text-sm text-muted-foreground">No AP invoice linked — pending review.</p>
        )}
      </div>
    </div>
  );
};

const b2bSnapshotKey = (vendorId, month, fy, orgGst) => `${orgGst}-${vendorId}-${month}-${fy}`;

const computeB2bMetrics = (records, apCount) => {
  const totalTaxable = records.reduce((sum, row) => sum + Number(row.taxableValue ?? 0), 0);
  const totalGst = records.reduce((sum, row) => sum + docTotalGst(row), 0);
  const eligibleItc = records
    .filter((row) => String(row.itcEligibility ?? '').toUpperCase() === 'ELIGIBLE')
    .reduce((sum, row) => sum + Number(row.cgst ?? 0) + Number(row.sgst ?? 0) + Number(row.igst ?? 0), 0);
  const amendedCount = records.filter(isAmendedGstInvoice).length;
  const needsReview = records.filter((row) => !isGstMatchStatus(row, 'MATCHED') || isAmendedGstInvoice(row)).length;
  const matched = records.filter((row) => isGstMatchStatus(row, 'MATCHED')).length;
  const missingAP = records.filter((row) => isGstMatchStatus(row, 'MISSING_IN_OPTIFII')).length;
  const missingGST = records.filter((row) => isGstMatchStatus(row, 'MISSING_IN_GSTR2A')).length;
  const mismatch = records.filter((row) => isGstMatchStatus(row, 'MISMATCHED') || isGstMatchStatus(row, 'AMOUNT_MISMATCH')).length;

  const syncStatus = records.length === 0
    ? 'No Records Found'
    : (missingAP > 0 || mismatch > 0 || amendedCount > 0) ? 'Partial Records' : 'Complete Records';

  const gstAvailStatus = records.length === 0
    ? 'No Records Found'
    : (missingAP > 0 || mismatch > 0 || amendedCount > 0) ? 'Partial Records' : 'GST Data Available';

  const matchParts = [];
  if (matched) matchParts.push(`${matched} Matched`);
  if (missingAP) matchParts.push(`${missingAP} Missing in AP`);
  if (missingGST) matchParts.push(`${missingGST} Missing in GST`);
  if (mismatch) matchParts.push(`${mismatch} Mismatch`);

  return {
    totalTaxable,
    totalGst,
    eligibleItc,
    amendedCount,
    needsReview,
    matched,
    missingAP,
    missingGST,
    mismatch,
    apCount,
    syncStatus,
    gstAvailStatus,
    matchStatusSummary: matchParts.length ? matchParts.join(' · ') : '—',
    totalSupplierInvoices: records.length,
  };
};

const formatB2bFetchedOn = (iso) =>
  new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const formatB2bDateRange = (dateFrom, dateTo) => {
  if (dateFrom && dateTo) return `${dateFrom} to ${dateTo}`;
  if (dateFrom || dateTo) return dateFrom || dateTo;
  return 'Full month';
};

const createB2bSnapshot = ({
  vendorId,
  month,
  fy,
  records,
  apCount,
  dateFrom,
  dateTo,
  orgGst,
  orgUserName,
  existingId,
  fetchedAt,
  getVendor,
}) => {
  const vendor = getVendor(vendorId);
  return {
    id: existingId ?? `snap-${orgGst}-${vendorId}-${month}-${fy}-${Date.now()}`,
    vendorId,
    vendorName: vendor?.name ?? 'All Vendors',
    gstin: vendor?.gstin ?? '—',
    orgGst,
    orgUserName,
    month,
    fy,
    dateFrom: dateFrom || '',
    dateTo: dateTo || '',
    records,
    apCount,
    fetchedAt: fetchedAt ?? new Date().toISOString(),
    ...computeB2bMetrics(records, apCount),
  };
};

const buildB2bSnapshotFromReconcileData = (responseData, params, fetchedAt) => {
  const records = responseData?.invoices ?? [];
  const apCount = responseData?.summary?.optifiiInvoiceCount ?? 0;
  return createB2bSnapshot({
    ...params,
    records,
    apCount,
    fetchedAt: fetchedAt ?? new Date().toISOString(),
  });
};

const buildSnapshotsFromReconcileResponse = (result, params) => {
  const current = buildB2bSnapshotFromReconcileData(
    result?.currentData ?? {},
    params,
    new Date().toISOString(),
  );
  const historical = mapHistoryEntriesToSnapshots({
    history: result?.history ?? [],
    mapResponseToSnapshot: (response, meta) => buildB2bSnapshotFromReconcileData(response, {
      ...params,
      existingId: meta.idSuffix,
    }, meta.fetchedAt),
  });
  return [current, ...historical];
};

const B2bReconciliationDetail = ({ snapshot, onBack, getVendor }) => {
  const [viewFilter, setViewFilter] = useState('All Invoices');
  const [selected, setSelected] = useState(null);

  const selectedVendor = getVendor(snapshot.vendorId);
  const records = snapshot.records ?? [];
  const metrics = useMemo(() => computeB2bMetrics(records, snapshot.apCount), [records, snapshot.apCount]);

  const matchRate = records.length > 0
    ? Math.round((metrics.matched / records.length) * 100)
    : 0;

  const filterOptions = useMemo(() => [
    { value: 'All Invoices', label: 'All Invoices', count: records.length },
    { value: 'Amended Only', label: 'Amended Only', count: metrics.amendedCount },
    { value: 'Needs Review', label: 'Needs Review', count: metrics.needsReview },
  ], [records.length, metrics.amendedCount, metrics.needsReview]);

  const visibleRecords = records.filter((row) => {
    if (viewFilter === 'Amended Only') return isAmendedGstInvoice(row);
    if (viewFilter === 'Needs Review') return !isGstMatchStatus(row, 'MATCHED') || isAmendedGstInvoice(row);
    return true;
  });

  const b2bColumns = useMemo(() => [
    {
      key: 'row_num',
      title: '#',
      className: 'w-10',
      cellClassName: 'text-xs text-muted-foreground',
      render: (_row, index) => index + 1,
    },
    {
      key: 'invoiceNumber',
      title: 'Invoice Number',
      render: (row) => (
        <div>
          <p className="font-mono text-xs font-semibold text-primary">{row.invoiceNumber}</p>
          {isAmendedGstInvoice(row) ? (
            <p className="mt-0.5 text-[10px] font-semibold text-amber-600">
              {(row.amendmentHistory?.amendments?.length ?? 0) > 1 ? `${row.amendmentHistory.amendments.length} Amendments` : 'Amended'}
            </p>
          ) : null}
        </div>
      ),
    },
    { key: 'vendor', title: 'Vendor', render: (row) => row.vendor ?? selectedVendor?.name ?? snapshot.vendorName ?? 'All Vendors' },
    { key: 'invoiceDate', title: 'Invoice Date', cellClassName: 'text-muted-foreground' },
    { key: 'taxableValue', title: 'Taxable Value', render: (row) => formatCurrency(row.taxableValue), cellClassName: 'text-right font-medium' },
    { key: 'gst', title: 'GST Amount', render: (row) => formatCurrency(docTotalGst(row)), cellClassName: 'text-right font-semibold text-primary' },
    { key: 'itcEligibility', title: 'ITC Eligibility', render: (row) => <TaxStatusBadge status={row.itcEligibility} /> },
    { key: 'amendmentStatus', title: 'Amendment Status', render: (row) => <TaxStatusBadge status={row.amendmentStatus} /> },
    { key: 'matchStatus', title: 'Match Status', render: (row) => <TaxStatusBadge status={row.matchStatus} /> },
    {
      key: 'actions',
      title: 'Actions',
      className: 'text-right',
      cellClassName: 'text-right',
      render: (row) => (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8"
          onClick={(event) => {
            event.stopPropagation();
            setSelected(row);
          }}
        >
          <Eye className="mr-1.5 h-3.5 w-3.5" />
          View
        </Button>
      ),
    },
  ], [selectedVendor?.name, snapshot.vendorName]);

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <div className="border-b px-4 py-4 sm:px-5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="-ml-2 mb-3 h-8 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Fetch History
          </Button>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">GSTR-2A B2B Reconciliation</p>
              <h3 className="mt-1 text-lg font-semibold tracking-tight">
                {snapshot.vendorName}
                <span className="font-normal text-muted-foreground"> · {snapshot.month} FY {snapshot.fy}</span>
              </h3>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                Org GSTIN: {snapshot.orgGst ?? '—'} · Vendor GSTIN: {snapshot.gstin}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <TaxGstAvailBadge status={metrics.gstAvailStatus} />
              <TaxStatusBadge status={snapshot.syncStatus} />
            </div>
          </div>
        </div>

        <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: 'Organisation GSTIN', value: snapshot.orgGst, icon: FileText },
            { label: 'Reporting Period', value: `${snapshot.month} FY ${snapshot.fy}`, icon: Calendar },
            { label: 'Date Range', value: formatB2bDateRange(snapshot.dateFrom, snapshot.dateTo), icon: ArrowUpDown },
            { label: 'Fetched On', value: formatB2bFetchedOn(snapshot.fetchedAt), icon: Clock },
            { label: 'Source', value: 'GST Portal · GSTR-2A B2B + B2BA', icon: ArrowUpDown },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-start gap-3 bg-card px-4 py-3 sm:px-5">
              <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className="mt-0.5 text-sm font-medium leading-snug">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <TaxSectionCard
          title="Vendor Summary"
          description="Supplier-reported invoice totals for this reconciliation snapshot"
          meta={<TaxApiMeta synced={formatB2bFetchedOn(snapshot.fetchedAt)} count={`${records.length} invoices`} />}
        >
          <div className="mb-4 flex items-center gap-3 border-b pb-4">
            <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary/10 text-base font-bold text-primary">
              {snapshot.vendorName?.[0]}
            </div>
            <div>
              <p className="font-semibold">{snapshot.vendorName}</p>
              <p className="font-mono text-xs text-muted-foreground">{snapshot.gstin}</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <TaxMiniMetric label="Total Supplier Invoices" value={String(metrics.totalSupplierInvoices)} />
            <TaxMiniMetric label="Amended Invoices" value={String(metrics.amendedCount)} tone={metrics.amendedCount > 0 ? 'amber' : 'default'} />
            <TaxMiniMetric label="Eligible ITC" value={formatCurrency(metrics.eligibleItc)} tone="green" />
            <TaxMiniMetric label="Invoices Requiring Review" value={String(metrics.needsReview)} tone={metrics.needsReview > 0 ? 'red' : 'green'} />
          </div>
        </TaxSectionCard>

        <TaxSectionCard title="Match Rate" description="AP vs GST portal alignment for this snapshot">
          <div className="space-y-4">
            <div className="text-center">
              <p className={cn(
                'text-4xl font-bold tabular-nums',
                matchRate >= 80 ? 'text-green-600' : matchRate >= 50 ? 'text-amber-600' : 'text-red-600',
              )}
              >
                {matchRate}%
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {metrics.matched} of {records.length} invoices matched
              </p>
            </div>
            <TaxProgressRow
              value={matchRate}
              progressClassName={cn(
                matchRate >= 80 ? '[&>div]:bg-green-500' : matchRate >= 50 ? '[&>div]:bg-amber-500' : '[&>div]:bg-red-500',
              )}
            />
            <div className="space-y-2 text-sm">
              {[
                { label: 'Matched', value: metrics.matched, tone: 'text-green-700' },
                { label: 'Missing in AP', value: metrics.missingAP, tone: 'text-red-600' },
                { label: 'Missing in GST', value: metrics.missingGST, tone: 'text-red-600' },
                { label: 'Amount Mismatch', value: metrics.mismatch, tone: 'text-amber-600' },
              ].map(({ label, value, tone }) => (
                <div key={label} className="flex items-center justify-between border-b border-dashed py-1.5 last:border-0">
                  <span className="text-muted-foreground">{label}</span>
                  <span className={cn('font-semibold tabular-nums', tone)}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </TaxSectionCard>
      </div>

      <TaxSectionCard title="AP Reconciliation Summary" description={`Invoices in AP system vs GST portal — ${snapshot.month} FY ${snapshot.fy}`}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <TaxMiniMetric label="Invoices in AP System" value={metrics.apCount} className="border-slate-200" />
          <TaxMiniMetric label="Invoices in GSTR-2A" value={records.length} className="border-slate-200" />
          <TaxMiniMetric label="Matched" value={metrics.matched} tone="green" className="border-green-200 bg-green-50/60" />
          <TaxMiniMetric label="Missing in GST" value={metrics.missingGST} tone="red" className="border-red-200 bg-red-50/60" />
          <TaxMiniMetric label="Missing in AP" value={metrics.missingAP} tone="red" className="border-red-200 bg-red-50/60" />
        </div>
        {(metrics.missingAP > 0 || metrics.missingGST > 0 || metrics.mismatch > 0 || metrics.amendedCount > 0) ? (
          <div className="mt-3">
            <TaxAlertBanner>
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <div>
                {metrics.amendedCount > 0 ? `${metrics.amendedCount} invoice(s) have supplier amendments — review ITC impact. ` : ''}
                {metrics.missingAP > 0 ? `${metrics.missingAP} invoice(s) in GST portal not in AP. ` : ''}
                {metrics.missingGST > 0 ? `${metrics.missingGST} AP invoice(s) not uploaded by supplier. ` : ''}
                {metrics.mismatch > 0 ? `${metrics.mismatch} invoice(s) with amount mismatch.` : ''}
              </div>
            </TaxAlertBanner>
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-2 rounded-md border border-green-200 bg-green-50/60 px-3 py-2 text-sm text-green-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            All invoices are reconciled for this snapshot. No action required.
          </div>
        )}
      </TaxSectionCard>

      <TaxSectionCard
        title="Fetched Records"
        description={`GSTR-2A B2B invoices for ${snapshot.vendorName} · ${snapshot.month} FY ${snapshot.fy}`}
        meta={<TaxApiMeta synced={formatB2bFetchedOn(snapshot.fetchedAt)} count={`${visibleRecords.length} shown`} />}
        actions={
          <TaxViewFilterPills
            value={viewFilter}
            onChange={setViewFilter}
            options={filterOptions}
          />
        }
      >
        {records.length === 0 ? (
          <TaxEmptyState
            icon={FileText}
            title="No GSTR-2A records found for this vendor and period"
            description="Try fetching again from the history page with a different reporting period."
          />
        ) : (
          <>
            <TaxCompactTable
              rows={visibleRecords}
              columns={b2bColumns}
              getRowKey={(row) => row.invoiceNumber}
              getRowClassName={b2bRowClass}
              onRowClick={setSelected}
              emptyMessage={
                viewFilter === 'Amended Only'
                  ? 'No amended invoices match the current filter.'
                  : viewFilter === 'Needs Review'
                    ? 'No invoices require review under the current filter.'
                    : 'No records to display.'
              }
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
              <span>
                Showing <strong className="text-foreground">{visibleRecords.length}</strong> of{' '}
                <strong className="text-foreground">{records.length}</strong> fetched invoice
                {records.length === 1 ? '' : 's'}
              </span>
              <span>
                Taxable <strong className="text-foreground">{formatCurrency(metrics.totalTaxable)}</strong>
                {' · '}
                GST <strong className="text-primary">{formatCurrency(metrics.totalGst)}</strong>
              </span>
            </div>
            <TaxPagination />
          </>
        )}
      </TaxSectionCard>

      <TaxDrawer
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(null)}
        title={selected ? `Invoice — ${selected.invoiceNumber}` : 'Invoice Details'}
      >
        {selected ? <B2bInvoiceDrawerContent record={selected} vendor={selectedVendor} /> : null}
      </TaxDrawer>
    </div>
  );
};

const GstB2bTab = ({ orgGst, runWithSession }) => {
  const {
    credentials,
    credentialsLoading,
    selectedOrgGst,
    onOrgGstChange,
    selectedOrgCredential,
    canFetchWithOrgGst,
    vendors,
    getVendor,
  } = orgGst;

  const [vendorId, setVendorId] = useState('');
  const [month, setMonth] = useState('Sep');
  const [fy, setFy] = useState(DEFAULT_GST_DOC_FY);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchHistory, setFetchHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [viewMode, setViewMode] = useState('history');
  const [activeSnapshotId, setActiveSnapshotId] = useState(null);
  const [reconcileGstr2a] = useReconcileGstr2aMutation();
  const [fetchReconcileHistory] = useFetchGstr2aReconcileHistoryMutation();

  const selectedVendor = getVendor(vendorId);
  const activeSnapshot = fetchHistory.find((entry) => entry.id === activeSnapshotId) ?? null;

  const filteredHistory = fetchHistory;

  const upsertSnapshot = (snapshot) => {
    const key = b2bSnapshotKey(snapshot.vendorId, snapshot.month, snapshot.fy, snapshot.orgGst);
    setFetchHistory((prev) => {
      const existing = prev.find((entry) => b2bSnapshotKey(entry.vendorId, entry.month, entry.fy, entry.orgGst) === key);
      const nextSnapshot = existing
        ? { ...snapshot, id: existing.id }
        : snapshot;
      const withoutKey = prev.filter((entry) => b2bSnapshotKey(entry.vendorId, entry.month, entry.fy, entry.orgGst) !== key);
      return [nextSnapshot, ...withoutKey];
    });
    return snapshot;
  };

  const loadReconcileHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const offset = (historyPage - 1) * HISTORY_PAGE_SIZE;
      const history = await fetchReconcileHistory({ limit: HISTORY_PAGE_SIZE, offset }).unwrap();
      const snapshots = mapHistoryEntriesToSnapshots({
        history: Array.isArray(history) ? history : [],
        mapResponseToSnapshot: (response, meta) => {
          const currentData = response?.currentData ?? response;
          return buildB2bSnapshotFromReconcileData(currentData, {
          vendorId: currentData?.vendorId ?? currentData?.vendor_id ?? '',
          month: currentData?.month ?? '',
          fy: currentData?.fy ?? currentData?.financialYear ?? currentData?.financial_year ?? '',
          dateFrom: currentData?.dateFrom ?? currentData?.startDate ?? '',
          dateTo: currentData?.dateTo ?? currentData?.endDate ?? '',
          orgGst: currentData?.orgGst ?? currentData?.gstin ?? currentData?.gstIn ?? '',
          orgUserName: currentData?.orgUserName ?? currentData?.username ?? '',
          existingId: meta.idSuffix,
          getVendor,
        }, meta.fetchedAt);
        },
      });
      setFetchHistory(snapshots);
      setHistoryTotal(getHistoryTotal(history));
    } catch (error) {
      toast.error(getApiErrorMessage(error));
      setFetchHistory([]);
      setHistoryTotal(0);
    } finally {
      setHistoryLoading(false);
    }
  }, [fetchReconcileHistory, getVendor, historyPage]);

  useEffect(() => {
    loadReconcileHistory();
  }, [loadReconcileHistory]);

  const runFetch = async ({
    targetVendorId,
    targetMonth,
    targetFy,
    targetDateFrom,
    targetDateTo,
    targetOrgCredential,
    existingId,
    onComplete,
    otp,
  }) => {
    const portalCredentials = buildGstPortalFetchCredentials(targetOrgCredential);
    const vendor = getVendor(targetVendorId);
    if (!portalCredentials) return;

    setLoading(true);
    try {
      const payload = buildReconcileRequestPayload({
        month: targetMonth,
        financialYear: targetFy,
        gstin: portalCredentials.gst,
        username: portalCredentials.userName,
        supplierGstin: vendor?.gstin,
        vendor: vendor?.name,
        startDate: targetDateFrom || undefined,
        endDate: targetDateTo || undefined,
        otp,
      });

      const result = await reconcileGstr2a(payload).unwrap();
      const snapshotParams = {
        vendorId: targetVendorId,
        month: targetMonth,
        fy: targetFy,
        dateFrom: targetDateFrom,
        dateTo: targetDateTo,
        orgGst: portalCredentials.gst,
        orgUserName: portalCredentials.userName,
        existingId,
        getVendor,
      };
      const snapshots = buildSnapshotsFromReconcileResponse(result, snapshotParams);
      setFetchHistory(snapshots);
      loadReconcileHistory();
      onComplete?.(snapshots[0]);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleFetch = async () => {
    if (!canFetchWithOrgGst || loading) return;

    setLoading(true);
    try {
      await runWithSession({
        orgCredential: selectedOrgCredential,
        contextLabel: 'GSTR-2A B2B Reconciliation',
        execute: (otp) => runFetch({
          targetVendorId: vendorId,
          targetMonth: month,
          targetFy: fy,
          targetDateFrom: dateFrom,
          targetDateTo: dateTo,
          targetOrgCredential: selectedOrgCredential,
          onComplete: () => {
            setViewMode('history');
            setActiveSnapshotId(null);
          },
          otp,
        }),
      });
    } finally {
      setLoading(false);
    }
  };

  const openSnapshotDetails = useCallback((entryId) => {
    setActiveSnapshotId(entryId);
    setViewMode('detail');
  }, []);

  const historyColumns = useMemo(() => [
    {
      key: 'row_num',
      title: '#',
      className: 'w-10',
      cellClassName: 'text-xs text-muted-foreground',
      render: (_row, index) => index + 1,
    },
    { key: 'vendor', title: 'Vendor', render: (row) => row.vendorName },
    { key: 'org_gst', title: 'Organisation GSTIN', render: (row) => row.orgGst, cellClassName: 'font-mono text-xs' },
    { key: 'gstin', title: 'Vendor GSTIN', cellClassName: 'font-mono text-xs' },
    { key: 'month', title: 'Month' },
    { key: 'fy', title: 'Financial Year' },
    {
      key: 'date_range',
      title: 'Date Range',
      cellClassName: 'text-xs text-muted-foreground',
      render: (row) => formatB2bDateRange(row.dateFrom, row.dateTo),
    },
    { key: 'total', title: 'Total Supplier Invoices', render: (row) => row.totalSupplierInvoices, cellClassName: 'text-right font-medium' },
    { key: 'amended', title: 'Amended Invoices', render: (row) => row.amendedCount, cellClassName: 'text-right' },
    { key: 'itc', title: 'Eligible ITC', render: (row) => formatCurrency(row.eligibleItc), cellClassName: 'text-right font-medium text-green-700' },
    {
      key: 'review',
      title: 'Invoices Requiring Review',
      cellClassName: 'text-right font-medium',
      render: (row) => (
        <span className={row.needsReview > 0 ? 'text-red-600' : 'text-green-700'}>
          {row.needsReview}
        </span>
      ),
    },
    {
      key: 'match_summary',
      title: 'Match Status Summary',
      cellClassName: 'max-w-[180px] text-xs text-muted-foreground',
      render: (row) => row.matchStatusSummary,
    },
    {
      key: 'sync',
      title: 'Sync Status',
      render: (row) => <TaxStatusBadge status={row.syncStatus} />,
    },
    {
      key: 'fetched_on',
      title: 'Fetched On',
      cellClassName: 'text-xs text-muted-foreground whitespace-nowrap',
      render: (row) => formatB2bFetchedOn(row.fetchedAt),
    },
    {
      key: 'actions',
      title: 'Actions',
      className: 'text-right w-[130px]',
      cellClassName: 'text-right',
      render: (row) => (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8"
          onClick={(event) => {
            event.stopPropagation();
            openSnapshotDetails(row.id);
          }}
        >
          <Eye className="mr-1.5 h-3.5 w-3.5" />
          View Details
        </Button>
      ),
    },
  ], [openSnapshotDetails]);

  if (viewMode === 'detail' && activeSnapshot) {
    return (
      <B2bReconciliationDetail
        snapshot={activeSnapshot}
        getVendor={getVendor}
        onBack={() => {
          setViewMode('history');
          setActiveSnapshotId(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">GSTR-2A Supplier Invoice Reconciliation</h3>
        <p className="text-sm text-muted-foreground">View supplier invoices reported in GST and track amendments affecting invoice values, GST amounts, or ITC eligibility.</p>
      </div>

      <TaxSectionCard title="Fetch GST Records" description="Fetches GSTR-2A B2B + B2BA simultaneously">
        <div className="flex flex-wrap items-end gap-4">
          <OrgGstCredentialFields
            credentials={credentials}
            loading={credentialsLoading}
            selectedGst={selectedOrgGst}
            onGstChange={onOrgGstChange}
          />
          <GstFormField label="Vendor" optional className="min-w-[220px]">
            <TaxSelect
              value={vendorId || 'all'}
              onValueChange={(value) => setVendorId(value === 'all' ? '' : value)}
              placeholder="All Vendors"
              options={[{ value: 'all', label: 'All Vendors' }, ...vendors.map((vendor) => ({ value: vendor.id, label: vendor.name }))]}
            />
          </GstFormField>
          <GstFormField label="Vendor GSTIN">
            <Input readOnly value={selectedVendor?.gstin ?? ''} placeholder="Auto-populated from vendor" className="font-mono text-xs bg-muted/40" />
          </GstFormField>
          <GstFormField label="Month" required>
            <TaxSelect value={month} onValueChange={setMonth} options={GST_DOC_MONTHS} />
          </GstFormField>
          <GstFormField label="Financial Year" required>
            <TaxSelect value={fy} onValueChange={setFy} options={GST_DOC_FY_OPTIONS} />
          </GstFormField>
          <GstFormField label="Date Range" optional>
            <div className="flex items-center gap-2">
              <Input type="date" className="text-xs" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              <span className="text-xs text-muted-foreground">to</span>
              <Input type="date" className="text-xs" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </GstFormField>
          <Button onClick={handleFetch} disabled={!canFetchWithOrgGst || loading} className="self-end">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            {loading ? 'Fetching…' : 'Fetch GST Records'}
          </Button>
        </div>
      </TaxSectionCard>

      {loading ? (
        <GstFetchLoading message="Fetching GSTR-2A B2B records…" subMessage="Also checking GSTR-2A B2BA for amendments…" />
      ) : null}

      {historyLoading && !loading ? (
        <div className="flex items-center gap-2 rounded-md border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Loading fetch history…
        </div>
      ) : null}

      {!loading && !canFetchWithOrgGst ? (
        <TaxEmptyState
          icon={ArrowUpDown}
          title="Select organisation GSTIN and reporting period"
          description="Vendor is optional. Leave it as All Vendors to fetch the full GSTR-2A B2B reconciliation for the organisation GSTIN."
        >
          <Button onClick={handleFetch} disabled={!canFetchWithOrgGst}><Play className="mr-2 h-4 w-4" />Fetch GST Records</Button>
        </TaxEmptyState>
      ) : null}

      {!loading && !historyLoading && fetchHistory.length === 0 && canFetchWithOrgGst ? (
        <TaxEmptyState
          icon={FileText}
          title="No GSTR-2A B2B records fetched yet"
          description="Select an organisation GSTIN and reporting period above, then click Fetch GST Records to create a reconciliation snapshot."
        >
          <Button onClick={handleFetch} disabled={!canFetchWithOrgGst || loading}><Play className="mr-2 h-4 w-4" />Fetch GST Records</Button>
        </TaxEmptyState>
      ) : null}

      {!loading && !historyLoading && filteredHistory.length > 0 ? (
        <TaxSectionCard
          title="Fetch History"
          description="Previously fetched GSTR-2A B2B snapshots across organisation GSTINs"
          meta={<TaxApiMeta synced={formatB2bFetchedOn(filteredHistory[0].fetchedAt)} count={`${filteredHistory.length} snapshot${filteredHistory.length === 1 ? '' : 's'}`} />}
        >
          <TaxCompactTable
            rows={filteredHistory}
            columns={historyColumns}
            getRowKey={(row) => row.id}
            onRowClick={(row) => openSnapshotDetails(row.id)}
            emptyMessage="No fetch history found."
          />
          <TaxPagination
            page={historyPage}
            totalPages={getHistoryTotalPages(historyTotal)}
            loading={historyLoading}
            onPrevious={() => setHistoryPage((page) => Math.max(1, page - 1))}
            onNext={() => setHistoryPage((page) => Math.min(getHistoryTotalPages(historyTotal), page + 1))}
          />
        </TaxSectionCard>
      ) : null}
    </div>
  );
};

const Gst2ADocumentsTab = ({ orgGst, runWithSession }) => {
  const {
    credentials,
    credentialsLoading,
    selectedOrgGst,
    onOrgGstChange,
    selectedOrgCredential,
    canFetchWithOrgGst,
    vendors,
    getVendor,
  } = orgGst;

  const [vendorId, setVendorId] = useState('');
  const [month, setMonth] = useState('Sep');
  const [fy, setFy] = useState(DEFAULT_GST_DOC_FY);
  const [docType, setDocType] = useState('All Documents');
  const [itcFilter, setItcFilter] = useState('All');
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [docs, setDocs] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [quickFilter, setQuickFilter] = useState('All Documents');
  const [selected, setSelected] = useState(null);
  const [fetchGstr2aDocuments] = useFetchGstr2aDocumentsMutation();
  const [fetchGstr2aDocumentsHistory] = useFetchGstr2aDocumentsHistoryMutation();

  const selectedVendor = vendorId ? getVendor(vendorId) : null;
  const apiKey = vendorId ? `${vendorId}-${month}-${fy}` : `all-${month}-${fy}`;

  const loadDocumentsHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const offset = (historyPage - 1) * HISTORY_PAGE_SIZE;
      const result = await fetchGstr2aDocumentsHistory({ limit: HISTORY_PAGE_SIZE, offset }).unwrap();
      setHistory(Array.isArray(result) ? result : []);
      setHistoryTotal(getHistoryTotal(result));
    } catch (error) {
      toast.error(getApiErrorMessage(error));
      setHistory([]);
      setHistoryTotal(0);
    } finally {
      setHistoryLoading(false);
    }
  }, [fetchGstr2aDocumentsHistory, historyPage]);

  useEffect(() => {
    loadDocumentsHistory();
  }, [loadDocumentsHistory]);

  const handleFetch = async () => {
    if (!canFetchWithOrgGst || loading) return;

    const portalCredentials = buildGstPortalFetchCredentials(selectedOrgCredential);
    if (!portalCredentials) return;

    setLoading(true);
    setFetched(false);
    setQuickFilter('All Documents');
    try {
      await runWithSession({
        orgCredential: selectedOrgCredential,
        contextLabel: 'GSTR-2A Documents',
        execute: async (otp) => {
          try {
            const payload = buildGstrDocumentsRequestPayload({
              month,
              financialYear: fy,
              gstin: portalCredentials.gst,
              username: portalCredentials.userName,
              vendorName: selectedVendor?.name,
              supplierGstin: selectedVendor?.gstin,
              otp,
            });
            const result = await fetchGstr2aDocuments(payload).unwrap();
            let resultDocs = getGstDocuments(result);
            if (docType !== 'All Documents') resultDocs = resultDocs.filter((doc) => doc.documentType === docType);
            if (itcFilter !== 'All') resultDocs = resultDocs.filter((doc) => humanizeGstEnum(doc.itcEligibility) === itcFilter);
            setDocs(resultDocs);
            setFetched(true);
            loadDocumentsHistory();
          } catch (error) {
            toast.error(getApiErrorMessage(error));
          }
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const totalTaxable = docs.reduce((sum, doc) => sum + Number(doc.taxableValue ?? 0), 0);
  const totalGst = docs.reduce((sum, doc) => sum + docTotalGst(doc), 0);
  const eligibleItc = docs.filter((doc) => String(doc.itcEligibility ?? '').toUpperCase() === 'ELIGIBLE').reduce((sum, doc) => sum + Number(doc.cgst ?? 0) + Number(doc.sgst ?? 0) + Number(doc.igst ?? 0), 0);
  const ineligibleCnt = docs.filter((doc) => String(doc.itcEligibility ?? '').toUpperCase() === 'INELIGIBLE').length;

  const quickFilters = ['All Documents', 'Invoices', 'Credit Notes', 'Debit Notes', 'Amended', 'Active', 'Cancelled', 'Eligible ITC', 'Ineligible ITC', 'Matched', 'Missing in AP'];

  const visible = docs.filter((doc) => {
    if (quickFilter === 'Invoices') return doc.documentType === 'Invoice' || doc.documentType === 'Amended Invoice';
    if (quickFilter === 'Credit Notes') return doc.documentType === 'Credit Note';
    if (quickFilter === 'Debit Notes') return doc.documentType === 'Debit Note';
    if (quickFilter === 'Amended') return doc.documentType === 'Amended Invoice' || doc.documentStatus === 'Amended';
    if (quickFilter === 'Eligible ITC') return String(doc.itcEligibility ?? '').toUpperCase() === 'ELIGIBLE';
    if (quickFilter === 'Ineligible ITC') return String(doc.itcEligibility ?? '').toUpperCase() === 'INELIGIBLE';
    if (quickFilter === 'Matched') return doc.apStatus === 'Matched';
    if (quickFilter === 'Missing in AP') return doc.apStatus === 'Missing in Optifii AP';
    if (quickFilter === 'Active') return doc.documentStatus === 'Active';
    if (quickFilter === 'Cancelled') return doc.documentStatus === 'Cancelled';
    return true;
  });

  const docColumns = [
    { key: 'documentType', title: 'Type', render: (row) => <TaxStatusBadge status={row.documentType} /> },
    { key: 'invoiceNumber', title: 'Document No.', cellClassName: 'font-mono text-xs' },
    { key: 'vendor', title: 'Vendor', render: (row) => row.vendor ?? getVendor(row.vendor_id)?.name ?? '—' },
    { key: 'documentDate', title: 'Date' },
    { key: 'taxableValue', title: 'Taxable', render: (row) => formatCurrency(row.taxableValue), cellClassName: 'text-right' },
    { key: 'gst', title: 'GST', render: (row) => formatCurrency(docTotalGst(row)), cellClassName: 'text-right font-medium text-primary' },
    { key: 'itcEligibility', title: 'ITC', render: (row) => <TaxStatusBadge status={row.itcEligibility} /> },
    { key: 'documentStatus', title: 'Status', render: (row) => <TaxStatusBadge status={row.documentStatus} /> },
    { key: 'apStatus', title: 'AP Match', render: (row) => <TaxStatusBadge status={row.apStatus} /> },
  ];

  const historyColumns = [
    {
      key: 'requestedAt',
      title: 'Fetched On',
      render: (row) => formatHistoryRequestedAt(row.requestedAt),
    },
    {
      key: 'count',
      title: 'Documents',
      cellClassName: 'text-right font-medium',
      render: (row) => getDocumentHistoryDocs(row).length,
    },
    {
      key: 'actions',
      title: 'Actions',
      cellClassName: 'text-right',
      render: (row) => (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={(event) => {
            event.stopPropagation();
            setDocs(getDocumentHistoryDocs(row));
            setFetched(true);
            setQuickFilter('All Documents');
          }}
        >
          <Eye className="mr-1.5 h-3.5 w-3.5" />
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">GSTR-2A Documents</h3>
        <p className="text-sm text-muted-foreground">View supplier-reported GST documents available in GSTR-2A and verify ITC eligibility.</p>
      </div>

      <TaxSectionCard title="Fetch GST Documents">
        <div className="flex flex-wrap items-end gap-4">
          <OrgGstCredentialFields
            credentials={credentials}
            loading={credentialsLoading}
            selectedGst={selectedOrgGst}
            onGstChange={onOrgGstChange}
          />
          <GstFormField label="Vendor" optional className="min-w-[210px]">
            <TaxSelect
              value={vendorId || 'all'}
              onValueChange={(value) => { setVendorId(value === 'all' ? '' : value); setFetched(false); }}
              placeholder="All Vendors"
              options={[{ value: 'all', label: 'All Vendors' }, ...vendors.map((vendor) => ({ value: vendor.id, label: vendor.name }))]}
            />
          </GstFormField>
          <GstFormField label="Vendor GSTIN">
            <Input readOnly value={selectedVendor?.gstin ?? ''} placeholder="Auto-populated" className="font-mono text-xs bg-muted/40" />
          </GstFormField>
          <GstFormField label="Month" required>
            <TaxSelect value={month} onValueChange={(value) => { setMonth(value); setFetched(false); }} options={GST_DOC_MONTHS} />
          </GstFormField>
          <GstFormField label="Financial Year" required>
            <TaxSelect value={fy} onValueChange={(value) => { setFy(value); setFetched(false); }} options={GST_DOC_FY_OPTIONS} />
          </GstFormField>
          <GstFormField label="Document Type">
            <TaxSelect value={docType} onValueChange={setDocType} options={['All Documents', 'Invoice', 'Credit Note', 'Debit Note', 'Amended Invoice']} />
          </GstFormField>
          <GstFormField label="ITC Eligibility">
            <TaxSelect value={itcFilter} onValueChange={setItcFilter} options={['All', 'Eligible', 'Ineligible']} />
          </GstFormField>
          <Button onClick={handleFetch} disabled={!canFetchWithOrgGst || loading} className="self-end">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            {loading ? 'Fetching…' : 'Fetch GST Documents'}
          </Button>
        </div>
      </TaxSectionCard>

      {!fetched && !loading && history.length === 0 ? (
        <TaxEmptyState
          icon={FileText}
          title="Select organisation GSTIN and reporting period"
          description="Organisation GSTIN is required. You can fetch documents for a specific vendor or leave vendor blank to retrieve all supplier documents for the period."
        >
          <Button onClick={handleFetch} disabled={!canFetchWithOrgGst}><Play className="mr-2 h-4 w-4" />Fetch GST Documents</Button>
        </TaxEmptyState>
      ) : null}

      {loading ? <GstFetchLoading message="Fetching GSTR-2A documents from GST portal…" /> : null}

      {historyLoading && !loading ? (
        <div className="flex items-center gap-2 rounded-md border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Loading GSTR-2A document history…
        </div>
      ) : null}

      {!loading && !historyLoading && history.length > 0 ? (
        <TaxSectionCard
          title="Fetch History"
          description="Previously fetched GSTR-2A document responses. Open a run to review its document register."
          meta={<TaxApiMeta synced={formatHistoryRequestedAt(history[0]?.requestedAt)} count={`${history.length} run${history.length === 1 ? '' : 's'}`} />}
        >
          <TaxCompactTable
            rows={history}
            columns={historyColumns}
            getRowKey={(row, index) => row.requestedAt ?? `gstr2a-history-${index}`}
            onRowClick={(row) => {
              setDocs(getDocumentHistoryDocs(row));
              setFetched(true);
              setQuickFilter('All Documents');
            }}
            emptyMessage="No GSTR-2A document fetch history found."
          />
          <TaxPagination
            page={historyPage}
            totalPages={getHistoryTotalPages(historyTotal)}
            loading={historyLoading}
            onPrevious={() => setHistoryPage((page) => Math.max(1, page - 1))}
            onNext={() => setHistoryPage((page) => Math.min(getHistoryTotalPages(historyTotal), page + 1))}
          />
        </TaxSectionCard>
      ) : null}

      {fetched && !loading ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <TaxMiniMetric label="Total Documents" value={String(docs.length)} />
            <TaxMiniMetric label="Taxable Amount" value={formatCurrency(totalTaxable)} />
            <TaxMiniMetric label="GST Amount" value={formatCurrency(totalGst)} tone="primary" />
            <TaxMiniMetric label="Eligible ITC" value={formatCurrency(eligibleItc)} tone="green" />
            <TaxMiniMetric label="Ineligible Documents" value={String(ineligibleCnt)} tone={ineligibleCnt > 0 ? 'red' : 'default'} />
          </div>

          <TaxSectionCard
            title="GSTR-2A Document Register"
            description={selectedVendor ? `${selectedVendor.name} · ${month} FY ${fy}` : `All vendors · ${month} FY ${fy}`}
            actions={(
              <Button type="button" variant="outline" size="sm" onClick={() => setFetched(false)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to History
              </Button>
            )}
          >
            <div className="mb-4 flex flex-wrap gap-2">
              {quickFilters.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setQuickFilter(filter)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-medium transition',
                    quickFilter === filter ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/30',
                  )}
                >
                  {filter}
                </button>
              ))}
            </div>
            <TaxCompactTable rows={visible} columns={docColumns} getRowKey={(row) => row.invoiceNumber} onRowClick={setSelected} />
            <TaxPagination />
          </TaxSectionCard>
        </>
      ) : null}

      <TaxDrawer open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)} title="GST Document Details">
        {selected ? <Gst2ADocDrawerContent doc={selected} vendor={selectedVendor} /> : null}
      </TaxDrawer>
    </div>
  );
};

const Gst2BDocumentsTab = ({ orgGst, runWithSession }) => {
  const {
    credentials,
    credentialsLoading,
    selectedOrgGst,
    onOrgGstChange,
    selectedOrgCredential,
    canFetchWithOrgGst,
    vendors,
    getVendor,
  } = orgGst;

  const [month, setMonth] = useState('Sep');
  const [fy, setFy] = useState(DEFAULT_GST_DOC_FY);
  const [vendorId, setVendorId] = useState('');
  const [docTypeF, setDocTypeF] = useState('All Documents');
  const [itcF, setItcF] = useState('All');
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [docs, setDocs] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [quickFilter, setQuickFilter] = useState('All Documents');
  const [selected, setSelected] = useState(null);
  const [fetchGstr2bDocuments] = useFetchGstr2bDocumentsMutation();
  const [fetchGstr2bDocumentsHistory] = useFetchGstr2bDocumentsHistoryMutation();

  const selectedVendor = vendorId ? getVendor(vendorId) : null;
  const stmtKey = `${month}-${fy}`;

  const loadDocumentsHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const offset = (historyPage - 1) * HISTORY_PAGE_SIZE;
      const result = await fetchGstr2bDocumentsHistory({ limit: HISTORY_PAGE_SIZE, offset }).unwrap();
      setHistory(Array.isArray(result) ? result : []);
      setHistoryTotal(getHistoryTotal(result));
    } catch (error) {
      toast.error(getApiErrorMessage(error));
      setHistory([]);
      setHistoryTotal(0);
    } finally {
      setHistoryLoading(false);
    }
  }, [fetchGstr2bDocumentsHistory, historyPage]);

  useEffect(() => {
    loadDocumentsHistory();
  }, [loadDocumentsHistory]);

  const handleFetch = async () => {
    if (!canFetchWithOrgGst || loading) return;

    const portalCredentials = buildGstPortalFetchCredentials(selectedOrgCredential);
    if (!portalCredentials) return;

    setLoading(true);
    setFetched(false);
    setQuickFilter('All Documents');
    try {
      await runWithSession({
        orgCredential: selectedOrgCredential,
        contextLabel: 'GSTR-2B Documents',
        execute: async (otp) => {
          try {
            const payload = buildGstrDocumentsRequestPayload({
              month,
              financialYear: fy,
              gstin: portalCredentials.gst,
              username: portalCredentials.userName,
              vendorName: selectedVendor?.name,
              supplierGstin: selectedVendor?.gstin,
              otp,
            });
            const result = await fetchGstr2bDocuments(payload).unwrap();
            let resultDocs = getGstDocuments(result);
            if (vendorId) resultDocs = resultDocs.filter((doc) => (doc.gstin ?? doc.supplierGstin) === selectedVendor?.gstin);
            if (docTypeF !== 'All Documents') resultDocs = resultDocs.filter((doc) => doc.documentType === docTypeF);
            if (itcF !== 'All') resultDocs = resultDocs.filter((doc) => humanizeGstEnum(doc.itcEligibility ?? doc.itc_status) === itcF);
            setDocs(resultDocs);
            setFetched(true);
            loadDocumentsHistory();
          } catch (error) {
            toast.error(getApiErrorMessage(error));
          }
        },
      });
    } finally {
      setLoading(false);
    }
  };

  const docItcStatus = (doc) => doc.itcEligibility ?? doc.itc_status;

  const totalGst = docs.reduce((sum, doc) => sum + docTotalGst(doc), 0);
  const eligibleItc = docs.filter((doc) => {
    const status = String(docItcStatus(doc) ?? '').toUpperCase();
    return status === 'ELIGIBLE' || status === 'PARTIALLY_ELIGIBLE';
  }).reduce((sum, doc) => sum + Number(doc.cgst ?? 0) + Number(doc.sgst ?? 0) + Number(doc.igst ?? 0), 0);
  const claimableItc = docs.reduce((sum, doc) => sum + Number(doc.claimable ?? 0), 0);
  const blockedItc = docs.reduce((sum, doc) => sum + Number(doc.blocked ?? 0), 0);

  const quickFilters = ['All Documents', 'Eligible ITC', 'Ineligible ITC', 'Blocked ITC', 'Invoices', 'Credit Notes', 'Debit Notes', 'Matched', 'Needs Review'];

  const countMap = useMemo(() => ({
    'All Documents': docs.length,
    'Eligible ITC': docs.filter((doc) => {
      const status = String(docItcStatus(doc) ?? '').toUpperCase();
      return status === 'ELIGIBLE' || status === 'PARTIALLY_ELIGIBLE';
    }).length,
    'Ineligible ITC': docs.filter((doc) => String(docItcStatus(doc) ?? '').toUpperCase() === 'INELIGIBLE').length,
    'Blocked ITC': docs.filter((doc) => String(docItcStatus(doc) ?? '').toUpperCase() === 'BLOCKED' || Number(doc.blocked) > 0).length,
    Invoices: docs.filter((doc) => doc.documentType === 'Invoice').length,
    'Credit Notes': docs.filter((doc) => doc.documentType === 'Credit Note').length,
    'Debit Notes': docs.filter((doc) => doc.documentType === 'Debit Note').length,
    Matched: docs.filter((doc) => doc.apStatus === 'Matched').length,
    'Needs Review': docs.filter((doc) => doc.apStatus !== 'Matched' || ['BLOCKED', 'INELIGIBLE'].includes(String(docItcStatus(doc) ?? '').toUpperCase())).length,
  }), [docs]);

  const visible = docs.filter((doc) => {
    const status = String(docItcStatus(doc) ?? '').toUpperCase();
    if (quickFilter === 'Eligible ITC') return status === 'ELIGIBLE' || status === 'PARTIALLY_ELIGIBLE';
    if (quickFilter === 'Ineligible ITC') return status === 'INELIGIBLE';
    if (quickFilter === 'Blocked ITC') return status === 'BLOCKED' || Number(doc.blocked) > 0;
    if (quickFilter === 'Invoices') return doc.documentType === 'Invoice';
    if (quickFilter === 'Credit Notes') return doc.documentType === 'Credit Note';
    if (quickFilter === 'Debit Notes') return doc.documentType === 'Debit Note';
    if (quickFilter === 'Matched') return doc.apStatus === 'Matched';
    if (quickFilter === 'Needs Review') return doc.apStatus !== 'Matched' || status === 'BLOCKED' || status === 'INELIGIBLE';
    return true;
  });

  const b2bColumns = [
    { key: 'documentType', title: 'Type', render: (row) => <TaxStatusBadge status={row.documentType} /> },
    { key: 'invoiceNumber', title: 'Document No.', cellClassName: 'font-mono text-xs' },
    { key: 'vendor', title: 'Vendor', render: (row) => row.vendor ?? '—' },
    { key: 'documentDate', title: 'Date' },
    { key: 'taxableValue', title: 'Taxable', render: (row) => formatCurrency(row.taxableValue), cellClassName: 'text-right' },
    { key: 'gst', title: 'GST', render: (row) => formatCurrency(docTotalGst(row)), cellClassName: 'text-right font-medium text-primary' },
    { key: 'itcEligibility', title: 'ITC Status', render: (row) => <TaxStatusBadge status={docItcStatus(row)} /> },
    { key: 'claimable', title: 'Claimable', render: (row) => formatCurrency(row.claimable), cellClassName: 'text-right text-green-600 font-medium' },
    { key: 'blocked', title: 'Blocked', render: (row) => formatCurrency(row.blocked), cellClassName: 'text-right text-red-600' },
    { key: 'apStatus', title: 'AP Match', render: (row) => <TaxStatusBadge status={row.apStatus} /> },
  ];

  const historyColumns = [
    {
      key: 'requestedAt',
      title: 'Fetched On',
      render: (row) => formatHistoryRequestedAt(row.requestedAt),
    },
    {
      key: 'count',
      title: 'Documents',
      cellClassName: 'text-right font-medium',
      render: (row) => getDocumentHistoryDocs(row).length,
    },
    {
      key: 'actions',
      title: 'Actions',
      cellClassName: 'text-right',
      render: (row) => (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={(event) => {
            event.stopPropagation();
            setDocs(getDocumentHistoryDocs(row));
            setFetched(true);
            setQuickFilter('All Documents');
          }}
        >
          <Eye className="mr-1.5 h-3.5 w-3.5" />
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">GSTR-2B Documents</h3>
        <p className="text-sm text-muted-foreground">Review finalized GST documents and determine eligible Input Tax Credit for the selected tax period.</p>
      </div>

      <TaxSectionCard title="Fetch GSTR-2B Statement" description="Static monthly statement · finalized by GST Portal">
        <div className="flex flex-wrap items-end gap-4">
          <OrgGstCredentialFields
            credentials={credentials}
            loading={credentialsLoading}
            selectedGst={selectedOrgGst}
            onGstChange={onOrgGstChange}
          />
          <GstFormField label="Month" required>
            <TaxSelect value={month} onValueChange={(value) => { setMonth(value); setFetched(false); }} options={GST_DOC_MONTHS} />
          </GstFormField>
          <GstFormField label="Financial Year" required>
            <TaxSelect value={fy} onValueChange={(value) => { setFy(value); setFetched(false); }} options={GST_DOC_FY_OPTIONS} />
          </GstFormField>
          <GstFormField label="Vendor" optional className="min-w-[200px]">
            <TaxSelect
              value={vendorId || 'all'}
              onValueChange={(value) => { setVendorId(value === 'all' ? '' : value); setFetched(false); }}
              placeholder="All Vendors"
              options={[{ value: 'all', label: 'All Vendors' }, ...vendors.map((vendor) => ({ value: vendor.id, label: vendor.name }))]}
            />
          </GstFormField>
          <GstFormField label="Vendor GSTIN">
            <Input readOnly value={selectedVendor?.gstin ?? ''} placeholder="Auto-populated" className="font-mono text-xs bg-muted/40" />
          </GstFormField>
          <GstFormField label="Document Type">
            <TaxSelect value={docTypeF} onValueChange={setDocTypeF} options={['All Documents', 'Invoice', 'Credit Note', 'Debit Note']} />
          </GstFormField>
          <GstFormField label="ITC Status">
            <TaxSelect value={itcF} onValueChange={setItcF} options={['All', 'Eligible', 'Ineligible', 'Blocked', 'Partially Eligible']} />
          </GstFormField>
          <Button onClick={handleFetch} disabled={!canFetchWithOrgGst || loading} className="self-end">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            {loading ? 'Fetching…' : 'Fetch GSTR-2B Statement'}
          </Button>
        </div>
      </TaxSectionCard>

      {!fetched && !loading && history.length === 0 ? (
        <TaxEmptyState
          icon={BarChart2}
          title="Select organisation GSTIN and tax period"
          description="Organisation GSTIN is required. GSTR-2B is a static, finalized document generated by the GST portal for each tax period."
        >
          <Button onClick={handleFetch} disabled={!canFetchWithOrgGst}><Play className="mr-2 h-4 w-4" />Fetch GSTR-2B Statement</Button>
        </TaxEmptyState>
      ) : null}

      {loading ? <GstFetchLoading message="Fetching GSTR-2B statement from GST portal…" /> : null}

      {historyLoading && !loading ? (
        <div className="flex items-center gap-2 rounded-md border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Loading GSTR-2B document history…
        </div>
      ) : null}

      {!loading && !historyLoading && history.length > 0 ? (
        <TaxSectionCard
          title="Fetch History"
          description="Previously fetched GSTR-2B document responses. Open a run to review its document register."
          meta={<TaxApiMeta synced={formatHistoryRequestedAt(history[0]?.requestedAt)} count={`${history.length} run${history.length === 1 ? '' : 's'}`} />}
        >
          <TaxCompactTable
            rows={history}
            columns={historyColumns}
            getRowKey={(row, index) => row.requestedAt ?? `gstr2b-history-${index}`}
            onRowClick={(row) => {
              setDocs(getDocumentHistoryDocs(row));
              setFetched(true);
              setQuickFilter('All Documents');
            }}
            emptyMessage="No GSTR-2B document fetch history found."
          />
          <TaxPagination
            page={historyPage}
            totalPages={getHistoryTotalPages(historyTotal)}
            loading={historyLoading}
            onPrevious={() => setHistoryPage((page) => Math.max(1, page - 1))}
            onNext={() => setHistoryPage((page) => Math.min(getHistoryTotalPages(historyTotal), page + 1))}
          />
        </TaxSectionCard>
      ) : null}

      {fetched && !loading ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <TaxMiniMetric label="Total Documents" value={String(docs.length)} />
            <TaxMiniMetric label="Total GST" value={formatCurrency(totalGst)} tone="primary" />
            <TaxMiniMetric label="Eligible ITC" value={formatCurrency(eligibleItc)} tone="green" />
            <TaxMiniMetric label="Claimable ITC" value={formatCurrency(claimableItc)} tone="green" />
            <TaxMiniMetric label="Blocked ITC" value={formatCurrency(blockedItc)} tone={blockedItc > 0 ? 'red' : 'default'} className="sm:col-span-2 xl:col-span-1" />
          </div>

          <TaxSectionCard
            title="GSTR-2B Document Register"
            description={`${month} FY ${fy}${selectedVendor ? ` · ${selectedVendor.name}` : ' · All vendors'}`}
            actions={(
              <Button type="button" variant="outline" size="sm" onClick={() => setFetched(false)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to History
              </Button>
            )}
          >
            <div className="mb-4">
              <TaxViewFilterPills
                value={quickFilter}
                onChange={setQuickFilter}
                options={quickFilters.map((filter) => ({ value: filter, label: filter, count: countMap[filter] }))}
              />
            </div>
            <TaxCompactTable rows={visible} columns={b2bColumns} getRowKey={(row) => row.invoiceNumber} onRowClick={setSelected} />
            <TaxPagination />
          </TaxSectionCard>
        </>
      ) : null}

      <TaxDrawer open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)} title="GSTR-2B Document Details">
        {selected ? <Gst2BDocDrawerContent doc={selected} /> : null}
      </TaxDrawer>
    </div>
  );
};

export const GstDocumentsPanel = () => {
  const [subTab, setSubTab] = useState('b2b');
  const session = useGstTaxpayerSession();
  const { credentials, isLoading: credentialsLoading } = useOrganisationGstCredentials();
  const { vendors } = useGstVendors();
  const [selectedOrgGst, setSelectedOrgGst] = useState('');

  useEffect(() => {
    if (!selectedOrgGst && credentials.length === 1) {
      setSelectedOrgGst(credentials[0].gst);
    }
  }, [credentials, selectedOrgGst]);

  const selectedOrgCredential = credentials.find((entry) => entry.gst === selectedOrgGst) ?? null;
  const getVendor = useCallback(
    (id) => vendors.find((vendor) => vendor.id === id) ?? null,
    [vendors],
  );
  const orgGst = {
    credentials,
    credentialsLoading,
    selectedOrgGst,
    onOrgGstChange: setSelectedOrgGst,
    selectedOrgCredential,
    canFetchWithOrgGst: Boolean(selectedOrgCredential?.gst && selectedOrgCredential?.userName),
    vendors,
    getVendor,
  };

  return (
    <TabsContent value="documents" className="space-y-4">
      <GstPortalOtpDialog {...session.otpDialogProps} />
      <Tabs value={subTab} onValueChange={setSubTab} className="space-y-4">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="b2b">GSTR-2A B2B</TabsTrigger>
          <TabsTrigger value="2a-docs">GSTR-2A Documents</TabsTrigger>
          <TabsTrigger value="2b-docs">GSTR-2B Documents</TabsTrigger>
        </TabsList>
        {subTab === 'b2b' ? <GstB2bTab orgGst={orgGst} runWithSession={session.runWithSession} /> : null}
        {subTab === '2a-docs' ? <Gst2ADocumentsTab orgGst={orgGst} runWithSession={session.runWithSession} /> : null}
        {subTab === '2b-docs' ? <Gst2BDocumentsTab orgGst={orgGst} runWithSession={session.runWithSession} /> : null}
      </Tabs>
    </TabsContent>
  );
};

import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowUpDown,
  BarChart2,
  CheckCircle2,
  Eye,
  FileText,
  Loader2,
  Play,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/ui/tabs';
import { cn } from '../../../../lib/utils';
import {
  GST_DOC_FY_OPTIONS,
  GST_DOC_MONTHS,
  GST_VENDOR_MASTER,
  MOCK_AP_INVOICE_COUNTS,
  MOCK_GSTR2A_B2B_API,
  MOCK_GSTR2A_DOCUMENTS_API,
  MOCK_GSTR2B_STATEMENT,
} from '../../data/taxStaticData';
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
  TaxSectionCard,
  TaxSelect,
  TaxStatusBadge,
  TaxViewFilterPills,
} from '../TaxUi';

const getVendor = (id) => GST_VENDOR_MASTER.find((vendor) => vendor.id === id);

const docTotalGst = (doc) =>
  Number(doc.cgst || 0) + Number(doc.sgst || 0) + Number(doc.igst || 0) + Number(doc.cess || 0);

const b2bRowClass = (row) => {
  if (row.match === 'Missing in AP' || row.match === 'Missing in GST') return 'bg-red-50/80';
  if (row.match === 'Amount Mismatch') return 'bg-amber-50/80';
  if (row.amend !== 'No Amendment') return 'bg-amber-50/40';
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

const GstFetchLoading = ({ message, subMessage }) => (
  <TaxSectionCard>
    <div className="flex flex-col items-center gap-3 py-10 text-sm text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin text-primary" />
      <p>{message}</p>
      {subMessage ? <p className="text-xs">{subMessage}</p> : null}
    </div>
  </TaxSectionCard>
);

const B2bInvoiceDrawerContent = ({ record, vendor }) => {
  const totalGst = docTotalGst(record);
  const amendments = record.amendments || [];
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
              { label: 'Invoice Number', value: record.inv_num, mono: true },
              { label: 'Invoice Date', value: record.inv_date },
              { label: 'ITC Eligibility', value: record.itc },
              { label: 'Amendment Status', value: record.amend },
            ]}
          />
          <div className="mt-3 space-y-1 text-sm">
            {[
              ['Taxable Value', formatCurrency(record.taxable)],
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
                <p className="font-semibold text-amber-900">Amendment {index + 1} · {entry.date}</p>
                <p className="mt-1 text-amber-900/90">{entry.reason}</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <p>Taxable: {formatCurrency(entry.taxable_orig)} → <strong>{formatCurrency(entry.taxable_new)}</strong></p>
                  <p>GST: {formatCurrency(entry.gst_orig)} → <strong>{formatCurrency(entry.gst_new)}</strong></p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">3 · AP Reconciliation</p>
        <div className={cn('rounded-md border p-4', record.match === 'Matched' ? 'border-green-200 bg-green-50/60' : 'border-amber-200 bg-amber-50/60')}>
          <div className="mb-3 flex items-center gap-2">
            <span className="text-sm">Status:</span>
            <TaxStatusBadge status={record.match} />
          </div>
          {record.ap_inv ? (
            <TaxDetailGrid
              items={[
                { label: 'AP Invoice', value: record.ap_inv, mono: true },
                { label: 'GST Portal Amount', value: formatCurrency(totalGst) },
                { label: 'Amount Difference', value: record.ap_diff > 0 ? formatCurrency(record.ap_diff) : 'No variance' },
              ]}
            />
          ) : (
            <p className="text-sm">
              {record.match === 'Missing in AP'
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
  const vendorInfo = vendor || getVendor(doc.vendor_id);

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-muted/20 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vendor Information</p>
        <p className="mt-2 font-semibold">{vendorInfo?.name ?? 'All Vendors'}</p>
        <p className="font-mono text-xs text-muted-foreground">{vendorInfo?.gstin ?? '—'}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <TaxStatusBadge status={doc.doc_type} />
          <TaxStatusBadge status={doc.doc_status} />
          <TaxStatusBadge status={doc.amend_rev} />
        </div>
      </div>

      <TaxDetailGrid
        items={[
          { label: 'Document Number', value: doc.doc_num, mono: true },
          { label: 'Document Date', value: doc.doc_date },
          { label: 'Document Type', value: doc.doc_type },
          { label: 'Source', value: 'GST Portal (GSTR-2A)' },
        ]}
      />

      <div className="space-y-1 text-sm">
        {[
          ['Taxable Value', formatCurrency(doc.taxable)],
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

      {doc.amend_history?.length ? (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Amendment History</p>
          <div className="space-y-2">
            {doc.amend_history.map((entry, index) => (
              <div key={index} className="rounded-md border border-amber-200 bg-amber-50/60 p-3 text-sm">
                <p className="font-semibold text-amber-900">{entry.label} · {entry.date}</p>
                <p className="mt-1 text-amber-900/90">{entry.note}</p>
                <p className="mt-1">Taxable: {formatCurrency(entry.taxable)} · GST: {formatCurrency(entry.gst)}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className={cn('rounded-md border p-4', doc.ap_match === 'Matched' ? 'border-green-200 bg-green-50/60' : 'border-amber-200 bg-amber-50/60')}>
        <div className="mb-2 flex items-center gap-2">
          <span className="text-sm">AP Match:</span>
          <TaxStatusBadge status={doc.ap_match} />
        </div>
        {doc.ap_inv_num ? (
          <TaxDetailGrid
            items={[
              { label: 'AP Invoice', value: doc.ap_inv_num, mono: true },
              { label: 'AP Amount', value: formatCurrency(doc.ap_amount) },
              { label: 'ITC Eligibility', value: doc.itc },
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
  const vendor = getVendor(doc.vendor_id);
  const totalGst = docTotalGst(doc);

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-muted/20 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vendor Information</p>
        <p className="mt-2 font-semibold">{vendor?.name ?? '—'}</p>
        <p className="font-mono text-xs text-muted-foreground">{vendor?.gstin ?? '—'}</p>
        <TaxDetailGrid
          items={[
            { label: 'Document Number', value: doc.doc_num, mono: true },
            { label: 'Document Date', value: doc.doc_date },
            { label: 'Document Type', value: doc.doc_type },
            { label: 'Source', value: 'GSTR-2B (Finalized)' },
          ]}
        />
      </div>

      <div className="space-y-1 text-sm">
        {[
          ['Taxable Value', formatCurrency(doc.taxable)],
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
        doc.itc_status === 'Eligible' ? 'border-green-200 bg-green-50/60' :
          doc.itc_status === 'Blocked' ? 'border-red-200 bg-red-50/60' :
            'border-amber-200 bg-amber-50/60',
      )}
      >
        <div className="mb-3 flex items-center gap-2">
          <span className="text-sm">ITC Status:</span>
          <TaxStatusBadge status={doc.itc_status} />
        </div>
        <TaxDetailGrid
          items={[
            { label: 'Claimable ITC', value: formatCurrency(doc.claimable) },
            { label: 'Blocked ITC', value: formatCurrency(doc.blocked) },
            { label: 'Block Reason', value: doc.block_reason || '—' },
          ]}
        />
      </div>

      <div className={cn('rounded-md border p-4', doc.ap_match === 'Matched' ? 'border-green-200 bg-green-50/60' : 'border-amber-200 bg-amber-50/60')}>
        <div className="mb-2 flex items-center gap-2">
          <span className="text-sm">AP Match:</span>
          <TaxStatusBadge status={doc.ap_match} />
        </div>
        {doc.ap_inv_num ? (
          <TaxDetailGrid
            items={[
              { label: 'AP Invoice', value: doc.ap_inv_num, mono: true },
              { label: 'AP Amount', value: formatCurrency(doc.ap_amount) },
            ]}
          />
        ) : (
          <p className="text-sm text-muted-foreground">No AP invoice linked — pending review.</p>
        )}
      </div>
    </div>
  );
};

const GstB2bTab = () => {
  const [vendorId, setVendorId] = useState('');
  const [month, setMonth] = useState('Sep');
  const [fy, setFy] = useState('2024-25');
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [records, setRecords] = useState([]);
  const [viewFilter, setViewFilter] = useState('All Invoices');
  const [selected, setSelected] = useState(null);

  const selectedVendor = getVendor(vendorId);
  const apiKey = vendorId ? `${vendorId}-${month}-${fy}` : '';

  const handleFetch = () => {
    if (!vendorId) return;
    setLoading(true);
    setFetched(false);
    setViewFilter('All Invoices');
    window.setTimeout(() => {
      setRecords(MOCK_GSTR2A_B2B_API[apiKey] ?? []);
      setFetched(true);
      setLoading(false);
    }, 900);
  };

  const totalTaxable = records.reduce((sum, row) => sum + row.taxable, 0);
  const totalGst = records.reduce((sum, row) => sum + docTotalGst(row), 0);
  const eligibleItc = records.filter((row) => row.itc === 'Eligible').reduce((sum, row) => sum + row.cgst + row.sgst + row.igst, 0);
  const amendedCount = records.filter((row) => row.amend !== 'No Amendment').length;
  const needsReview = records.filter((row) => row.match !== 'Matched' || row.amend !== 'No Amendment').length;
  const matched = records.filter((row) => row.match === 'Matched').length;
  const missingAP = records.filter((row) => row.match === 'Missing in AP').length;
  const missingGST = records.filter((row) => row.match === 'Missing in GST').length;
  const mismatch = records.filter((row) => row.match === 'Amount Mismatch').length;
  const apCount = MOCK_AP_INVOICE_COUNTS[apiKey] ?? 0;

  const gstAvailStatus = records.length === 0
    ? 'No Records Found'
    : (missingAP > 0 || mismatch > 0 || amendedCount > 0) ? 'Partial Records' : 'GST Data Available';

  const visibleRecords = records.filter((row) => {
    if (viewFilter === 'Amended Only') return row.amend !== 'No Amendment';
    if (viewFilter === 'Needs Review') return row.match !== 'Matched' || row.amend !== 'No Amendment';
    return true;
  });

  const openRecordDrawer = (row) => setSelected(row);

  const b2bColumns = useMemo(() => [
    {
      key: 'row_num',
      title: '#',
      className: 'w-10',
      cellClassName: 'text-xs text-muted-foreground',
      render: (_row, index) => index + 1,
    },
    {
      key: 'inv_num',
      title: 'Invoice Number',
      render: (row) => (
        <div>
          <p className="font-mono text-xs font-semibold text-primary">{row.inv_num}</p>
          {row.amend !== 'No Amendment' ? (
            <p className="mt-0.5 text-[10px] font-semibold text-amber-600">
              {(row.amendments?.length ?? 0) > 1 ? `${row.amendments.length} Amendments` : 'Amended'}
            </p>
          ) : null}
        </div>
      ),
    },
    { key: 'vendor', title: 'Vendor', render: () => selectedVendor?.name ?? '—' },
    { key: 'inv_date', title: 'Invoice Date', cellClassName: 'text-muted-foreground' },
    { key: 'taxable', title: 'Taxable Value', render: (row) => formatCurrency(row.taxable), cellClassName: 'text-right font-medium' },
    { key: 'gst', title: 'GST Amount', render: (row) => formatCurrency(docTotalGst(row)), cellClassName: 'text-right font-semibold text-primary' },
    { key: 'itc', title: 'ITC Eligibility', render: (row) => <TaxStatusBadge status={row.itc} /> },
    { key: 'amend', title: 'Amendment Status', render: (row) => <TaxStatusBadge status={row.amend} /> },
    { key: 'match', title: 'Match Status', render: (row) => <TaxStatusBadge status={row.match} /> },
    {
      key: 'actions',
      title: 'Actions',
      className: 'text-right',
      cellClassName: 'text-right',
      render: (row) => (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2.5"
          onClick={(event) => {
            event.stopPropagation();
            openRecordDrawer(row);
          }}
        >
          <Eye className="mr-1.5 h-4 w-4" />
          View
        </Button>
      ),
    },
  ], [selectedVendor?.name]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">GSTR-2A Supplier Invoice Reconciliation</h3>
        <p className="text-sm text-muted-foreground">View supplier invoices reported in GST and track amendments affecting invoice values, GST amounts, or ITC eligibility.</p>
      </div>

      <TaxSectionCard title="Fetch GST Records" description="Fetches GSTR-2A B2B + B2BA simultaneously">
        <div className="flex flex-wrap items-end gap-4">
          <GstFormField label="Vendor" required className="min-w-[220px]">
            <TaxSelect
              value={vendorId || 'placeholder'}
              onValueChange={(value) => { setVendorId(value === 'placeholder' ? '' : value); setFetched(false); }}
              placeholder="Search or select vendor…"
              options={[{ value: 'placeholder', label: 'Search or select vendor…' }, ...GST_VENDOR_MASTER.map((vendor) => ({ value: vendor.id, label: vendor.name }))]}
            />
          </GstFormField>
          <GstFormField label="GSTIN">
            <Input readOnly value={selectedVendor?.gstin ?? ''} placeholder="Auto-populated from vendor" className="font-mono text-xs bg-muted/40" />
          </GstFormField>
          <GstFormField label="Month" required>
            <TaxSelect value={month} onValueChange={(value) => { setMonth(value); setFetched(false); }} options={GST_DOC_MONTHS} />
          </GstFormField>
          <GstFormField label="Financial Year" required>
            <TaxSelect value={fy} onValueChange={(value) => { setFy(value); setFetched(false); }} options={GST_DOC_FY_OPTIONS} />
          </GstFormField>
          <GstFormField label="Date Range" optional>
            <div className="flex items-center gap-2">
              <Input type="date" className="text-xs" />
              <span className="text-xs text-muted-foreground">to</span>
              <Input type="date" className="text-xs" />
            </div>
          </GstFormField>
          <Button onClick={handleFetch} disabled={!vendorId || loading} className="self-end">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            {loading ? 'Fetching…' : 'Fetch GST Records'}
          </Button>
        </div>
      </TaxSectionCard>

      {!fetched && !loading ? (
        <TaxEmptyState
          icon={ArrowUpDown}
          title="Select a vendor and reporting period to fetch GSTR-2A records"
          description="Both GSTR-2A B2B and B2BA (amendments) are fetched together in a single reconciliation view."
        >
          <Button onClick={handleFetch} disabled={!vendorId}><Play className="mr-2 h-4 w-4" />Fetch GST Records</Button>
        </TaxEmptyState>
      ) : null}

      {loading ? (
        <GstFetchLoading message="Fetching GSTR-2A B2B records…" subMessage="Also checking GSTR-2A B2BA for amendments…" />
      ) : null}

      {fetched && !loading ? (
        <>
          <TaxSectionCard
            title="Vendor Summary"
            meta={<TaxApiMeta synced="Just now" status="live" count={`${records.length} invoices`} />}
          >
            <div className="mb-4 flex items-center gap-3 border-b pb-4">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                {selectedVendor?.name?.[0]}
              </div>
              <div>
                <p className="font-semibold">{selectedVendor?.name}</p>
                <p className="font-mono text-xs text-muted-foreground">{selectedVendor?.gstin}</p>
              </div>
              <div className="ml-auto"><TaxGstAvailBadge status={gstAvailStatus} /></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <TaxMiniMetric label="Total Supplier Invoices" value={String(records.length)} />
              <TaxMiniMetric label="Amended Invoices" value={String(amendedCount)} tone={amendedCount > 0 ? 'amber' : 'default'} />
              <TaxMiniMetric label="Eligible ITC" value={formatCurrency(eligibleItc)} tone="green" />
              <TaxMiniMetric label="Invoices Requiring Review" value={String(needsReview)} tone={needsReview > 0 ? 'red' : 'green'} />
            </div>
          </TaxSectionCard>

          <TaxSectionCard title="AP Reconciliation Summary" description={`Invoices in AP system vs GST portal — ${month} FY ${fy}`}>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <TaxMiniMetric label="Invoices in AP System" value={apCount} className="border-slate-200" />
              <TaxMiniMetric label="Invoices in GSTR-2A" value={records.length} className="border-slate-200" />
              <TaxMiniMetric label="Matched" value={matched} tone="green" className="border-green-200 bg-green-50/60" />
              <TaxMiniMetric label="Missing in GST" value={missingGST} tone="red" className="border-red-200 bg-red-50/60" />
              <TaxMiniMetric label="Missing in AP" value={missingAP} tone="red" className="border-red-200 bg-red-50/60" />
            </div>
            {(missingAP > 0 || missingGST > 0 || mismatch > 0 || amendedCount > 0) ? (
              <div className="mt-3">
                <TaxAlertBanner>
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <div>
                  {amendedCount > 0 ? `${amendedCount} invoice(s) have supplier amendments — review ITC impact. ` : ''}
                  {missingAP > 0 ? `${missingAP} invoice(s) in GST portal not in AP. ` : ''}
                  {missingGST > 0 ? `${missingGST} AP invoice(s) not uploaded by supplier. ` : ''}
                  {mismatch > 0 ? `${mismatch} invoice(s) with amount mismatch.` : ''}
                </div>
                </TaxAlertBanner>
              </div>
            ) : null}
          </TaxSectionCard>

          <TaxSectionCard
            title="Fetched Records"
            description={`GSTR-2A B2B invoices for ${selectedVendor?.name ?? 'vendor'} · ${month} FY ${fy}`}
            meta={<TaxApiMeta synced="Just now" status="live" count={`${visibleRecords.length} shown`} />}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <TaxViewFilterPills
                  value={viewFilter}
                  onChange={setViewFilter}
                  options={['All Invoices', 'Amended Only', 'Needs Review']}
                />
                <Button variant="outline" size="sm" onClick={handleFetch}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh
                </Button>
              </div>
            }
          >
            {records.length === 0 ? (
              <TaxEmptyState
                icon={FileText}
                title="No GSTR-2A records found for this vendor and period"
                description="Try a different month, financial year, or vendor. Records appear here after a successful fetch."
              />
            ) : (
              <>
                <TaxCompactTable
                  rows={visibleRecords}
                  columns={b2bColumns}
                  getRowKey={(row) => row.inv_num}
                  getRowClassName={b2bRowClass}
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
                    Taxable <strong className="text-foreground">{formatCurrency(totalTaxable)}</strong>
                    {' · '}
                    GST <strong className="text-primary">{formatCurrency(totalGst)}</strong>
                  </span>
                </div>
                <TaxPagination />
              </>
            )}
          </TaxSectionCard>
        </>
      ) : null}

      <TaxDrawer
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(null)}
        title={selected ? `Invoice — ${selected.inv_num}` : 'Invoice Details'}
      >
        {selected ? <B2bInvoiceDrawerContent record={selected} vendor={selectedVendor} /> : null}
      </TaxDrawer>
    </div>
  );
};

const Gst2ADocumentsTab = () => {
  const [vendorId, setVendorId] = useState('');
  const [month, setMonth] = useState('Sep');
  const [fy, setFy] = useState('2024-25');
  const [docType, setDocType] = useState('All Documents');
  const [itcFilter, setItcFilter] = useState('All');
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [docs, setDocs] = useState([]);
  const [quickFilter, setQuickFilter] = useState('All Documents');
  const [selected, setSelected] = useState(null);

  const selectedVendor = vendorId ? getVendor(vendorId) : null;
  const apiKey = vendorId ? `${vendorId}-${month}-${fy}` : `all-${month}-${fy}`;

  const handleFetch = () => {
    setLoading(true);
    setFetched(false);
    setQuickFilter('All Documents');
    window.setTimeout(() => {
      let result = MOCK_GSTR2A_DOCUMENTS_API[apiKey] ?? [];
      if (docType !== 'All Documents') result = result.filter((doc) => doc.doc_type === docType);
      if (itcFilter !== 'All') result = result.filter((doc) => doc.itc === itcFilter);
      setDocs(result);
      setFetched(true);
      setLoading(false);
    }, 800);
  };

  const totalTaxable = docs.reduce((sum, doc) => sum + doc.taxable, 0);
  const totalGst = docs.reduce((sum, doc) => sum + docTotalGst(doc), 0);
  const eligibleItc = docs.filter((doc) => doc.itc === 'Eligible').reduce((sum, doc) => sum + doc.cgst + doc.sgst + doc.igst, 0);
  const ineligibleCnt = docs.filter((doc) => doc.itc === 'Ineligible').length;

  const quickFilters = ['All Documents', 'Invoices', 'Credit Notes', 'Debit Notes', 'Amended', 'Active', 'Cancelled', 'Eligible ITC', 'Ineligible ITC', 'Matched', 'Missing in AP'];

  const visible = docs.filter((doc) => {
    if (quickFilter === 'Invoices') return doc.doc_type === 'Invoice' || doc.doc_type === 'Amended Invoice';
    if (quickFilter === 'Credit Notes') return doc.doc_type === 'Credit Note';
    if (quickFilter === 'Debit Notes') return doc.doc_type === 'Debit Note';
    if (quickFilter === 'Amended') return doc.amended || doc.doc_status === 'Amended';
    if (quickFilter === 'Eligible ITC') return doc.itc === 'Eligible';
    if (quickFilter === 'Ineligible ITC') return doc.itc === 'Ineligible';
    if (quickFilter === 'Matched') return doc.ap_match === 'Matched';
    if (quickFilter === 'Missing in AP') return doc.ap_match === 'Missing in AP';
    if (quickFilter === 'Active') return doc.doc_status === 'Active';
    if (quickFilter === 'Cancelled') return doc.doc_status === 'Cancelled';
    return true;
  });

  const docColumns = [
    { key: 'doc_type', title: 'Type', render: (row) => <TaxStatusBadge status={row.doc_type} /> },
    { key: 'doc_num', title: 'Document No.', cellClassName: 'font-mono text-xs' },
    { key: 'vendor', title: 'Vendor', render: (row) => getVendor(row.vendor_id)?.name ?? '—' },
    { key: 'doc_date', title: 'Date' },
    { key: 'taxable', title: 'Taxable', render: (row) => formatCurrency(row.taxable), cellClassName: 'text-right' },
    { key: 'gst', title: 'GST', render: (row) => formatCurrency(docTotalGst(row)), cellClassName: 'text-right font-medium text-primary' },
    { key: 'itc', title: 'ITC', render: (row) => <TaxStatusBadge status={row.itc} /> },
    { key: 'doc_status', title: 'Status', render: (row) => <TaxStatusBadge status={row.doc_status} /> },
    { key: 'ap_match', title: 'AP Match', render: (row) => <TaxStatusBadge status={row.ap_match} /> },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">GSTR-2A Documents</h3>
        <p className="text-sm text-muted-foreground">View supplier-reported GST documents available in GSTR-2A and verify ITC eligibility.</p>
      </div>

      <TaxSectionCard title="Fetch GST Documents">
        <div className="flex flex-wrap items-end gap-4">
          <GstFormField label="Vendor" optional className="min-w-[210px]">
            <TaxSelect
              value={vendorId || 'all'}
              onValueChange={(value) => { setVendorId(value === 'all' ? '' : value); setFetched(false); }}
              placeholder="All Vendors"
              options={[{ value: 'all', label: 'All Vendors' }, ...GST_VENDOR_MASTER.map((vendor) => ({ value: vendor.id, label: vendor.name }))]}
            />
          </GstFormField>
          <GstFormField label="GSTIN">
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
          <Button onClick={handleFetch} disabled={loading} className="self-end">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            {loading ? 'Fetching…' : 'Fetch GST Documents'}
          </Button>
        </div>
      </TaxSectionCard>

      {!fetched && !loading ? (
        <TaxEmptyState
          icon={FileText}
          title="Select a reporting period to fetch GSTR-2A documents"
          description="You can fetch documents for a specific vendor or leave vendor blank to retrieve all supplier documents for the period."
        >
          <Button onClick={handleFetch}><Play className="mr-2 h-4 w-4" />Fetch GST Documents</Button>
        </TaxEmptyState>
      ) : null}

      {loading ? <GstFetchLoading message="Fetching GSTR-2A documents from GST portal…" /> : null}

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
            <TaxCompactTable rows={visible} columns={docColumns} getRowKey={(row) => row.doc_num} onRowClick={setSelected} />
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

const Gst2BDocumentsTab = () => {
  const [month, setMonth] = useState('Sep');
  const [fy, setFy] = useState('2024-25');
  const [vendorId, setVendorId] = useState('');
  const [docTypeF, setDocTypeF] = useState('All Documents');
  const [itcF, setItcF] = useState('All');
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [docs, setDocs] = useState([]);
  const [quickFilter, setQuickFilter] = useState('All Documents');
  const [selected, setSelected] = useState(null);

  const selectedVendor = vendorId ? getVendor(vendorId) : null;
  const stmtKey = `${month}-${fy}`;

  const handleFetch = () => {
    setLoading(true);
    setFetched(false);
    setQuickFilter('All Documents');
    window.setTimeout(() => {
      let result = (MOCK_GSTR2B_STATEMENT[stmtKey] ?? []).filter((doc) => {
        if (vendorId && doc.vendor_id !== vendorId) return false;
        if (docTypeF !== 'All Documents' && doc.doc_type !== docTypeF) return false;
        if (itcF !== 'All' && doc.itc_status !== itcF) return false;
        return true;
      });
      setDocs(result);
      setFetched(true);
      setLoading(false);
    }, 820);
  };

  const totalGst = docs.reduce((sum, doc) => sum + docTotalGst(doc), 0);
  const eligibleItc = docs.filter((doc) => doc.itc_status === 'Eligible' || doc.itc_status === 'Partially Eligible').reduce((sum, doc) => sum + doc.cgst + doc.sgst + doc.igst, 0);
  const claimableItc = docs.reduce((sum, doc) => sum + doc.claimable, 0);
  const blockedItc = docs.reduce((sum, doc) => sum + doc.blocked, 0);

  const quickFilters = ['All Documents', 'Eligible ITC', 'Ineligible ITC', 'Blocked ITC', 'Invoices', 'Credit Notes', 'Debit Notes', 'Matched', 'Needs Review'];

  const countMap = useMemo(() => ({
    'All Documents': docs.length,
    'Eligible ITC': docs.filter((doc) => doc.itc_status === 'Eligible' || doc.itc_status === 'Partially Eligible').length,
    'Ineligible ITC': docs.filter((doc) => doc.itc_status === 'Ineligible').length,
    'Blocked ITC': docs.filter((doc) => doc.itc_status === 'Blocked' || doc.blocked > 0).length,
    Invoices: docs.filter((doc) => doc.doc_type === 'Invoice').length,
    'Credit Notes': docs.filter((doc) => doc.doc_type === 'Credit Note').length,
    'Debit Notes': docs.filter((doc) => doc.doc_type === 'Debit Note').length,
    Matched: docs.filter((doc) => doc.ap_match === 'Matched').length,
    'Needs Review': docs.filter((doc) => doc.ap_match !== 'Matched' || doc.itc_status === 'Blocked' || doc.itc_status === 'Ineligible').length,
  }), [docs]);

  const visible = docs.filter((doc) => {
    if (quickFilter === 'Eligible ITC') return doc.itc_status === 'Eligible' || doc.itc_status === 'Partially Eligible';
    if (quickFilter === 'Ineligible ITC') return doc.itc_status === 'Ineligible';
    if (quickFilter === 'Blocked ITC') return doc.itc_status === 'Blocked' || doc.blocked > 0;
    if (quickFilter === 'Invoices') return doc.doc_type === 'Invoice';
    if (quickFilter === 'Credit Notes') return doc.doc_type === 'Credit Note';
    if (quickFilter === 'Debit Notes') return doc.doc_type === 'Debit Note';
    if (quickFilter === 'Matched') return doc.ap_match === 'Matched';
    if (quickFilter === 'Needs Review') return doc.ap_match !== 'Matched' || doc.itc_status === 'Blocked' || doc.itc_status === 'Ineligible';
    return true;
  });

  const b2bColumns = [
    { key: 'doc_type', title: 'Type', render: (row) => <TaxStatusBadge status={row.doc_type} /> },
    { key: 'doc_num', title: 'Document No.', cellClassName: 'font-mono text-xs' },
    { key: 'vendor', title: 'Vendor', render: (row) => getVendor(row.vendor_id)?.name ?? '—' },
    { key: 'doc_date', title: 'Date' },
    { key: 'taxable', title: 'Taxable', render: (row) => formatCurrency(row.taxable), cellClassName: 'text-right' },
    { key: 'gst', title: 'GST', render: (row) => formatCurrency(docTotalGst(row)), cellClassName: 'text-right font-medium text-primary' },
    { key: 'itc_status', title: 'ITC Status', render: (row) => <TaxStatusBadge status={row.itc_status} /> },
    { key: 'claimable', title: 'Claimable', render: (row) => formatCurrency(row.claimable), cellClassName: 'text-right text-green-600 font-medium' },
    { key: 'blocked', title: 'Blocked', render: (row) => formatCurrency(row.blocked), cellClassName: 'text-right text-red-600' },
    { key: 'ap_match', title: 'AP Match', render: (row) => <TaxStatusBadge status={row.ap_match} /> },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">GSTR-2B Documents</h3>
        <p className="text-sm text-muted-foreground">Review finalized GST documents and determine eligible Input Tax Credit for the selected tax period.</p>
      </div>

      <TaxSectionCard title="Fetch GSTR-2B Statement" description="Static monthly statement · finalized by GST Portal">
        <div className="flex flex-wrap items-end gap-4">
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
              options={[{ value: 'all', label: 'All Vendors' }, ...GST_VENDOR_MASTER.map((vendor) => ({ value: vendor.id, label: vendor.name }))]}
            />
          </GstFormField>
          <GstFormField label="GSTIN">
            <Input readOnly value={selectedVendor?.gstin ?? ''} placeholder="Auto-populated" className="font-mono text-xs bg-muted/40" />
          </GstFormField>
          <GstFormField label="Document Type">
            <TaxSelect value={docTypeF} onValueChange={setDocTypeF} options={['All Documents', 'Invoice', 'Credit Note', 'Debit Note']} />
          </GstFormField>
          <GstFormField label="ITC Status">
            <TaxSelect value={itcF} onValueChange={setItcF} options={['All', 'Eligible', 'Ineligible', 'Blocked', 'Partially Eligible']} />
          </GstFormField>
          <Button onClick={handleFetch} disabled={loading} className="self-end">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            {loading ? 'Fetching…' : 'Fetch GSTR-2B Statement'}
          </Button>
        </div>
      </TaxSectionCard>

      {!fetched && !loading ? (
        <TaxEmptyState
          icon={BarChart2}
          title="Select a tax period to fetch the GSTR-2B statement"
          description="GSTR-2B is a static, finalized document generated by the GST portal for each tax period."
        >
          <Button onClick={handleFetch}><Play className="mr-2 h-4 w-4" />Fetch GSTR-2B Statement</Button>
        </TaxEmptyState>
      ) : null}

      {loading ? <GstFetchLoading message="Fetching GSTR-2B statement from GST portal…" /> : null}

      {fetched && !loading ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <TaxMiniMetric label="Total Documents" value={String(docs.length)} />
            <TaxMiniMetric label="Total GST" value={formatCurrency(totalGst)} tone="primary" />
            <TaxMiniMetric label="Eligible ITC" value={formatCurrency(eligibleItc)} tone="green" />
            <TaxMiniMetric label="Claimable ITC" value={formatCurrency(claimableItc)} tone="green" />
            <TaxMiniMetric label="Blocked ITC" value={formatCurrency(blockedItc)} tone={blockedItc > 0 ? 'red' : 'default'} className="sm:col-span-2 xl:col-span-1" />
          </div>

          <TaxSectionCard title="GSTR-2B Document Register" description={`${month} FY ${fy}${selectedVendor ? ` · ${selectedVendor.name}` : ' · All vendors'}`}>
            <div className="mb-4">
              <TaxViewFilterPills
                value={quickFilter}
                onChange={setQuickFilter}
                options={quickFilters.map((filter) => ({ value: filter, label: filter, count: countMap[filter] }))}
              />
            </div>
            <TaxCompactTable rows={visible} columns={b2bColumns} getRowKey={(row) => row.doc_num} onRowClick={setSelected} />
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

  return (
    <TabsContent value="documents" className="space-y-4">
      <Tabs value={subTab} onValueChange={setSubTab} className="space-y-4">
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="b2b">GSTR-2A B2B</TabsTrigger>
          <TabsTrigger value="2a-docs">GSTR-2A Documents</TabsTrigger>
          <TabsTrigger value="2b-docs">GSTR-2B Documents</TabsTrigger>
        </TabsList>
        <TabsContent value="b2b"><GstB2bTab /></TabsContent>
        <TabsContent value="2a-docs"><Gst2ADocumentsTab /></TabsContent>
        <TabsContent value="2b-docs"><Gst2BDocumentsTab /></TabsContent>
      </Tabs>
    </TabsContent>
  );
};

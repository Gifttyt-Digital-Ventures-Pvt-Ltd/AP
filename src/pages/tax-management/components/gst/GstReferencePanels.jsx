import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  BarChart2,
  BarChart3,
  Building2,
  CheckCircle2,
  DollarSign,
  Download,
  FileSearch,
  FileText,
  Info,
  Layers,
  Loader2,
  Play,
  Receipt,
  RefreshCw,
  Search,
  TrendingUp,
  WalletCards,
} from 'lucide-react';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/ui/tabs';
import { cn } from '../../../../lib/utils';
import {
  TaxAlertBanner,
  TaxApiMeta,
  TaxCompactTable,
  TaxComplianceIndicator,
  TaxDetailGrid,
  TaxDrawer,
  TaxEmptyState,
  TaxFilterBar,
  TaxFilterChip,
  TaxKpiCard,
  TaxPagination,
  TaxPeriodSelect,
  TaxProgressRow,
  TaxSearchInput,
  TaxSectionCard,
  TaxSelect,
  TaxStatusBadge,
  TaxValidBadge,
  TaxVendorSelector,
} from '../TaxUi';
import {
  DEFAULT_TAX_PERIOD,
  GST_VENDOR_MASTER,
  MOCK_GSTR_RETURNS_API,
  gstReconciliationRows2A,
  gstReconciliationRows2B,
  gstVendorBalances,
  TAX_PERIODS,
} from '../../data/taxStaticData';
import { formatCurrency, formatLakhs, formatRetPeriod } from '../../utils/taxFormatting';

const sum = (items, key) => items.reduce((total, item) => total + Number(item[key] || 0), 0);

const deriveLedgerAggregates = (vendors) => {
  const cgst = sum(vendors, 'cgst');
  const sgst = sum(vendors, 'sgst');
  const igst = sum(vendors, 'igst');
  const cess = sum(vendors, 'cess');
  const cash = sum(vendors, 'cash');
  const itc = sum(vendors, 'itc');
  return { cgst, sgst, igst, cess, cash, itc, total: cash + itc };
};

const deriveLedgerComposition = (aggregate) => {
  const totalItc = aggregate.cgst + aggregate.sgst + aggregate.igst + aggregate.cess;
  const pct = (amount) => (totalItc > 0 ? Math.round((amount / totalItc) * 100) : 0);
  return [
    { label: 'IGST Credit', amount: aggregate.igst, pct: pct(aggregate.igst), dotClass: 'bg-green-500', progressClassName: '[&>div]:bg-green-500' },
    { label: 'CGST Credit', amount: aggregate.cgst, pct: pct(aggregate.cgst), dotClass: 'bg-violet-600', progressClassName: '[&>div]:bg-violet-600' },
    { label: 'SGST Credit', amount: aggregate.sgst, pct: pct(aggregate.sgst), dotClass: 'bg-blue-500', progressClassName: '[&>div]:bg-blue-500' },
    { label: 'CESS', amount: aggregate.cess, pct: pct(aggregate.cess), dotClass: 'bg-amber-500', progressClassName: '[&>div]:bg-amber-500' },
  ];
};

const deriveLedgerInsights = (aggregate, count) => {
  const composition = deriveLedgerComposition(aggregate);
  const top = [...composition].sort((a, b) => b.amount - a.amount)[0];
  const insights = [
    { text: `${top.label} is the largest available balance at ${formatLakhs(top.amount)} (${top.pct}% of total ITC) across ${count} GSTIN${count === 1 ? '' : 's'}.`, icon: TrendingUp, className: 'border-green-200 bg-green-50' },
    { text: `CGST and SGST balances (${formatLakhs(aggregate.cgst)} + ${formatLakhs(aggregate.sgst)}) are sufficient for upcoming tax liabilities.`, icon: CheckCircle2, className: 'border-blue-200 bg-blue-50' },
  ];
  if (aggregate.cess < 0.5) {
    insights.push({
      text: `CESS balance is low at ${formatLakhs(aggregate.cess)} and should be monitored before the next filing.`,
      icon: AlertCircle,
      className: 'border-amber-200 bg-amber-50',
    });
  }
  return insights;
};

const LedgerSummaryCard = ({ label, value, sub, className, icon: Icon }) => (
  <div className={cn('rounded-lg border p-4', className)}>
    <div className="mb-2 flex items-start justify-between gap-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide opacity-90">{label}</p>
      {Icon ? <Icon className="h-4 w-4 shrink-0 opacity-80" /> : null}
    </div>
    <p className="text-2xl font-bold">{value}</p>
    <p className="mt-1 text-xs opacity-80">{sub}</p>
  </div>
);

const RECON_SUGGESTED_ACTIONS = {
  Matched: null,
  'Amount Mismatch': 'Request supplier to re-upload corrected invoice on GST portal or adjust ITC claim in GSTR-3B.',
  Partial: 'Follow up with supplier to upload the missing invoice on the GST portal before claiming ITC.',
  'Missing in Books': 'Record the supplier invoice in AP books or verify if the portal entry belongs to another entity.',
  'Missing in AP': 'Create the corresponding AP invoice or confirm with the supplier whether this is a valid purchase.',
  'Missing in GST': 'This invoice is in AP but not on the GST portal. Request the supplier to upload GSTR-1.',
};

const getReconTaxBreakup = (row) => {
  const taxable = formatCurrency(row.taxable);
  const totalGst = formatCurrency(row.gst);
  const diff = formatCurrency(row.difference);
  const portalMissing = row.portalStatus === 'Missing';
  const booksMissing = row.booksStatus === 'Missing';
  const halfGst = row.gst / 2;
  const cgst = formatCurrency(halfGst);
  const sgst = formatCurrency(halfGst);
  const portalCgst = portalMissing ? '—' : cgst;
  const portalSgst = portalMissing ? '—' : sgst;
  const booksCgst = booksMissing ? '—' : cgst;
  const booksSgst = booksMissing ? '—' : sgst;
  const cgstDiff = row.difference && !portalMissing && !booksMissing ? diff : '₹0.00';
  const sgstDiff = row.difference && !portalMissing && !booksMissing ? diff : '₹0.00';

  return [
    { component: 'Taxable Value', books: taxable, portal: taxable, difference: row.difference ? diff : '₹0.00' },
    { component: 'CGST (9%)', books: booksCgst, portal: portalCgst, difference: cgstDiff },
    { component: 'SGST (9%)', books: booksSgst, portal: portalSgst, difference: sgstDiff },
    { component: 'Total GST', books: totalGst, portal: portalMissing ? '—' : totalGst, difference: diff },
  ];
};

const GstReconciliationDrawerContent = ({ row }) => {
  const breakup = getReconTaxBreakup(row);
  const suggestedAction = RECON_SUGGESTED_ACTIONS[row.result];

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-muted/20 p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Invoice Details</p>
        <TaxDetailGrid
          items={[
            { label: 'Invoice No.', value: row.invoiceNo, mono: true },
            { label: 'Vendor', value: row.vendor },
            { label: 'GSTIN', value: row.gstin, mono: true },
            { label: 'Invoice Date', value: row.date },
          ]}
        />
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tax Breakup</p>
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                {['Component', 'Books', 'GST Portal', 'Difference'].map((heading) => (
                  <TableHead key={heading} className="text-xs">{heading}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {breakup.map((line) => (
                <TableRow key={line.component}>
                  <TableCell className="text-sm">{line.component}</TableCell>
                  <TableCell className="text-sm font-medium">{line.books}</TableCell>
                  <TableCell className="text-sm font-medium">{line.portal}</TableCell>
                  <TableCell className={`text-sm font-semibold ${line.difference !== '₹0.00' ? 'text-red-600' : 'text-green-600'}`}>
                    {line.difference}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="rounded-md border bg-muted/20 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Match Result</p>
        <div className="mb-2 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Overall Status:</span>
          <TaxStatusBadge status={row.result} />
        </div>
        <p className="text-xs text-muted-foreground">Matching history: Reconciled on 15 Feb 2024 · Auto-matched by system</p>
      </div>

      {suggestedAction ? (
        <TaxAlertBanner>
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div>
            <p className="font-semibold">Suggested Action</p>
            <p className="mt-1">{suggestedAction}</p>
          </div>
        </TaxAlertBanner>
      ) : null}

      <div className="flex gap-2">
        <Button size="sm"><Download className="mr-2 h-4 w-4" />Download Report</Button>
        <Button size="sm" variant="outline">Mark Resolved</Button>
      </div>
    </div>
  );
};

export const GstReconciliationPanel = () => {
  const [subTab, setSubTab] = useState('GSTR-2A');
  const [status, setStatus] = useState('All');
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState(DEFAULT_TAX_PERIOD);
  const [selectedRow, setSelectedRow] = useState(null);

  const type = subTab === 'GSTR-2A' ? '2A' : '2B';
  const sourceRows = type === '2A' ? gstReconciliationRows2A : gstReconciliationRows2B;
  const matchPct = type === '2A' ? 73 : 81;
  const totalInvoices = type === '2A' ? 248 : 186;

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sourceRows.filter((row) => {
      const matchesStatus = status === 'All' || row.result === status;
      const matchesSearch =
        !query ||
        row.invoiceNo.toLowerCase().includes(query) ||
        row.vendor.toLowerCase().includes(query) ||
        row.gstin.toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [search, sourceRows, status]);

  const matchedCount = filteredRows.filter((row) => row.result === 'Matched').length;
  const partialCount = filteredRows.filter((row) => row.result === 'Partial').length;
  const missingBooks = filteredRows.filter((row) => row.result === 'Missing in Books').length;
  const missingPortal = filteredRows.filter((row) => row.result.includes('Missing') && row.result !== 'Missing in Books').length;

  return (
    <TabsContent value="reconciliation" className="space-y-4">
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="GSTR-2A">GSTR-2A</TabsTrigger>
          <TabsTrigger value="GSTR-2B">GSTR-2B</TabsTrigger>
        </TabsList>
      </Tabs>

      <TaxSectionCard
        icon={FileSearch}
        title={`GSTR-${type} Reconciliation`}
        description={type === '2A' ? 'Match purchase register with supplier uploaded invoices.' : 'Compare purchase register with static GSTR-2B statement.'}
        meta={<TaxApiMeta synced="Today, 09:42 AM" status="live" count={String(totalInvoices)} />}
        actions={
          <>
            <Button variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button variant="outline" size="sm">
              Export Report
            </Button>
            <Button size="sm">
              <Play className="mr-2 h-4 w-4" />
              Run Reconciliation
            </Button>
          </>
        }
      >
        <TaxFilterBar className="mb-4 md:grid-cols-6">
          <TaxPeriodSelect value={period} onValueChange={setPeriod} periods={TAX_PERIODS} />
          <TaxSelect value={status} onValueChange={setStatus} options={['All', 'Matched', 'Partial', 'Amount Mismatch', 'Missing in Books', 'Missing in AP', 'Missing in GST']} />
          <TaxSearchInput value={search} onChange={setSearch} placeholder="Search invoice, vendor, GSTIN" />
        </TaxFilterBar>

        <div className="mb-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <TaxKpiCard label="Total Invoices" value={String(totalInvoices)} icon={FileText} />
          <TaxKpiCard label="Matched" value={String(matchedCount)} tone="green" icon={FileSearch} />
          <TaxKpiCard label="Partial Match" value={String(partialCount)} tone="amber" icon={Search} />
          <TaxKpiCard label="Missing in Books" value={String(missingBooks)} tone="red" icon={Layers} />
          <TaxKpiCard label="Missing in Portal" value={String(missingPortal)} tone="red" icon={Layers} />
          <TaxKpiCard label="Match %" value={`${matchPct}%`} tone={matchPct >= 80 ? 'green' : 'amber'} icon={BarChart3} />
        </div>

        <div className="mb-4 px-1">
          <p className="mb-2 text-xs text-muted-foreground">Overall Match Progress</p>
          <TaxProgressRow label="Reconciliation progress" value={matchPct} />
        </div>

        <TaxCompactTable
          rows={filteredRows}
          onRowClick={setSelectedRow}
          columns={[
            { key: 'invoiceNo', title: 'Invoice No.' },
            { key: 'vendor', title: 'Vendor' },
            { key: 'gstin', title: 'GSTIN', cellClassName: 'font-mono text-xs' },
            { key: 'date', title: 'Invoice Date' },
            { key: 'taxable', title: 'Taxable Value', render: (row) => formatCurrency(row.taxable), cellClassName: 'text-right' },
            { key: 'gst', title: 'GST Amount', render: (row) => formatCurrency(row.gst), cellClassName: 'text-right' },
            { key: 'itcEligible', title: 'ITC Eligible', render: (row) => <TaxStatusBadge status={row.itcEligible} /> },
            { key: 'booksStatus', title: 'Books Status', render: (row) => <TaxStatusBadge status={row.booksStatus} /> },
            { key: 'portalStatus', title: 'GST Portal Status', render: (row) => <TaxStatusBadge status={row.portalStatus} /> },
            { key: 'difference', title: 'Difference', render: (row) => formatCurrency(row.difference), cellClassName: 'text-right' },
            { key: 'result', title: 'Match Result', render: (row) => <TaxStatusBadge status={row.result} /> },
          ]}
        />
        <TaxPagination />
      </TaxSectionCard>

      <TaxDrawer open={Boolean(selectedRow)} onOpenChange={(open) => !open && setSelectedRow(null)} title={`Invoice Details — ${selectedRow?.invoiceNo || ''}`}>
        {selectedRow ? <GstReconciliationDrawerContent row={selectedRow} /> : null}
      </TaxDrawer>
    </TabsContent>
  );
};

const FY_OPTIONS = ['FY 2025-26', 'FY 2024-25', 'FY 2023-24'];
const RETURN_TYPE_OPTIONS = ['All Returns', 'GSTR-1', 'GSTR-3B', 'GSTR-9'];

export const GstReturnsPanel = () => {
  const [vendorId, setVendorId] = useState('');
  const [returnType, setReturnType] = useState('All Returns');
  const [fy, setFy] = useState('FY 2024-25');
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [records, setRecords] = useState([]);

  const selectedVendor = GST_VENDOR_MASTER.find((vendor) => vendor.id === vendorId);
  const fyKey = fy === 'FY 2024-25' ? '2024-25' : fy === 'FY 2023-24' ? '2023-24' : '2025-26';
  const apiKey = vendorId ? `${vendorId}-${fyKey}` : '';

  const handleTrack = () => {
    if (!vendorId) return;
    setLoading(true);
    setFetched(false);
    window.setTimeout(() => {
      const raw = MOCK_GSTR_RETURNS_API[apiKey] ?? [];
      const filtered = returnType === 'All Returns' ? raw : raw.filter((row) => row.ret_typ === returnType);
      setRecords(filtered);
      setFetched(true);
      setLoading(false);
    }, 900);
  };

  const filedCount = records.filter((row) => row.status === 'Filed').length;
  const invalidCount = records.filter((row) => row.valid === 'N').length;
  const lastFiled = records.find((row) => row.status === 'Filed');
  const complianceRating =
    !fetched || records.length === 0
      ? 'none'
      : invalidCount > 0 || filedCount < records.length * 0.8
        ? 'irregular'
        : 'regular';
  const vendorStatus =
    !fetched || records.length === 0
      ? 'No Records Found'
      : complianceRating === 'regular'
        ? 'Compliant'
        : 'Partial Compliance';

  return (
    <TabsContent value="returns" className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">GST Return Compliance Tracker</h3>
        <p className="text-sm text-muted-foreground">Track vendor GST return filing history and compliance status using Sandbox Track GSTRs API.</p>
      </div>

      <TaxSectionCard icon={Building2} title="Select Vendor & Filter" description="Vendor selection is required before fetching filing history.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Vendor *</label>
            <TaxSelect
              value={vendorId || 'placeholder'}
              onValueChange={(value) => {
                if (value === 'placeholder') return;
                setVendorId(value);
                setFetched(false);
              }}
              placeholder="Search or select vendor…"
              options={[
                { value: 'placeholder', label: 'Search or select vendor…' },
                ...GST_VENDOR_MASTER.map((vendor) => ({ value: vendor.id, label: vendor.name })),
              ]}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">GSTIN</label>
            <Input readOnly value={selectedVendor?.gstin || ''} placeholder="Auto-populated from vendor" className="font-mono text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Return Type</label>
            <TaxSelect value={returnType} onValueChange={setReturnType} options={RETURN_TYPE_OPTIONS} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Financial Year</label>
            <TaxSelect value={fy} onValueChange={setFy} options={FY_OPTIONS} />
          </div>
          <div className="flex items-end">
            <Button onClick={handleTrack} disabled={!vendorId || loading} className="w-full">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              {loading ? 'Fetching…' : 'Track Returns'}
            </Button>
          </div>
        </div>
      </TaxSectionCard>

      {!fetched && !loading ? (
        <TaxEmptyState
          icon={Building2}
          title="Select a vendor to view GST filing history"
          description="Choose a vendor from your vendor master. The GSTIN will be auto-populated and filing history fetched from the GST portal."
        />
      ) : null}

      {loading ? (
        <TaxEmptyState
          icon={RefreshCw}
          title="Fetching GST filing history from portal…"
          description="Please wait while filing records are retrieved."
        />
      ) : null}

      {fetched && !loading ? (
        <>
          <TaxSectionCard
            icon={FileText}
            title="Vendor Compliance Summary"
            meta={<TaxApiMeta synced="Just now" status="live" count={String(records.length)} />}
          >
            <div className="mb-4 flex flex-wrap items-center gap-4 border-b pb-4">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                {selectedVendor?.name?.[0] || 'V'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{selectedVendor?.name}</p>
                <p className="font-mono text-xs text-muted-foreground">{selectedVendor?.gstin}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <TaxStatusBadge status={vendorStatus} />
                <TaxComplianceIndicator rating={complianceRating} />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <TaxKpiCard label="Returns Found" value={String(records.length)} sub={`${returnType} · ${fy}`} icon={FileText} />
              <TaxKpiCard label="Last Filed Return" value={lastFiled?.ret_typ || '—'} sub={lastFiled ? formatRetPeriod(lastFiled.ret_prd) : 'No filings found'} icon={CheckCircle2} tone="green" />
              <TaxKpiCard label="Last Filing Date" value={lastFiled?.dof || '—'} sub={`Mode: ${lastFiled?.filing_mode || '—'}`} icon={Layers} />
              <TaxKpiCard label="Filing Validity" value={invalidCount > 0 ? `${invalidCount} Invalid` : 'All Valid'} sub={`${filedCount} filed of ${records.length}`} icon={AlertCircle} tone={invalidCount > 0 ? 'red' : 'green'} />
            </div>
          </TaxSectionCard>

          <TaxSectionCard
            icon={FileSearch}
            title="Filing History"
            description="Source: Sandbox Track GSTRs API · Read-only"
            actions={
              <Button variant="outline" size="sm" onClick={handleTrack}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            }
          >
            {records.length === 0 ? (
              <TaxEmptyState
                icon={FileText}
                title="No GST return records found"
                description="No GST return records found for the selected vendor and financial year."
              />
            ) : (
              <>
                <TaxCompactTable
                  rows={records}
                  getRowKey={(row, index) => `${row.ret_typ}-${row.ret_prd}-${index}`}
                  columns={[
                    { key: 'ret_typ', title: 'Return Type', cellClassName: 'font-medium text-primary' },
                    { key: 'ret_prd', title: 'Return Period', render: (row) => formatRetPeriod(row.ret_prd) },
                    { key: 'arn', title: 'ARN', render: (row) => row.arn || '—', cellClassName: 'font-mono text-xs' },
                    { key: 'dof', title: 'Filed Date' },
                    { key: 'filing_mode', title: 'Filing Mode', cellClassName: 'text-muted-foreground' },
                    { key: 'status', title: 'Status', render: (row) => <TaxStatusBadge status={row.status} /> },
                    { key: 'valid', title: 'Valid', render: (row) => <TaxValidBadge valid={row.valid} /> },
                  ]}
                />
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <Info className="h-3.5 w-3.5" />
                  This is a read-only view of GST filing history retrieved from the GST portal.
                </div>
              </>
            )}
          </TaxSectionCard>
        </>
      ) : null}
    </TabsContent>
  );
};

export const GstLedgersPanel = () => {
  const [selMode, setSelMode] = useState('all');
  const [selectedIds, setSelectedIds] = useState([]);

  const activeVendors = useMemo(() => {
    if (selMode === 'all') return gstVendorBalances;
    return gstVendorBalances.filter((vendor) => selectedIds.includes(vendor.id));
  }, [selMode, selectedIds]);

  const hasSelection = selMode === 'all' || selectedIds.length > 0;
  const aggregate = deriveLedgerAggregates(activeVendors);
  const composition = deriveLedgerComposition(aggregate);
  const insights = deriveLedgerInsights(aggregate, activeVendors.length);
  const totalVendors = activeVendors.length;

  return (
    <TabsContent value="ledgers" className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">GST Cash & ITC Balance</h3>
        <p className="text-sm text-muted-foreground">View available GST cash balances and Input Tax Credit across CGST, SGST, IGST and CESS heads.</p>
      </div>

      <TaxSectionCard icon={WalletCards} title="Vendor & GSTIN Filter">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <TaxVendorSelector
            vendors={gstVendorBalances}
            mode={selMode}
            onModeChange={setSelMode}
            selectedIds={selectedIds}
            onSelectedIdsChange={setSelectedIds}
          />
          <div className="flex flex-wrap items-center gap-2">
            {hasSelection ? (
              <span className="text-xs text-muted-foreground">
                Showing <strong>{totalVendors}</strong> vendor{totalVendors === 1 ? '' : 's'} · <strong>{totalVendors}</strong> GSTIN{totalVendors === 1 ? '' : 's'}
              </span>
            ) : null}
            <Button variant="outline" size="sm"><RefreshCw className="mr-2 h-4 w-4" />Refresh Balances</Button>
            <Button variant="outline" size="sm"><Download className="mr-2 h-4 w-4" />Export Balance Summary</Button>
            <Button size="sm"><Play className="mr-2 h-4 w-4" />Sync GST Balances</Button>
          </div>
        </div>
      </TaxSectionCard>

      {!hasSelection ? (
        <TaxEmptyState
          icon={Building2}
          title="Select one or more vendors to view GST Cash and ITC balances"
          description="Use the vendor filter above to select a single vendor, multiple vendors, or view all GSTINs at once."
        />
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <LedgerSummaryCard label="Cash Ledger Balance" value={formatLakhs(aggregate.cash)} sub="Available GST cash balance" icon={DollarSign} className="border-violet-200 bg-violet-50 text-violet-700" />
            <LedgerSummaryCard label="ITC Balance" value={formatLakhs(aggregate.itc)} sub="Available input tax credit" icon={CheckCircle2} className="border-green-200 bg-green-50 text-green-700" />
            <LedgerSummaryCard label="Net Available Credit" value={formatLakhs(aggregate.total)} sub="Total GST funds available for offset" icon={TrendingUp} className="border-blue-200 bg-blue-50 text-blue-700" />
            <LedgerSummaryCard label="CESS Balance" value={formatLakhs(aggregate.cess)} sub="Available cess balance" icon={Receipt} className="border-slate-200 bg-slate-100 text-slate-700" />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_1fr_300px]">
            <TaxSectionCard icon={Layers} title="Balance by Tax Head" description={`Aggregated across ${totalVendors} GSTIN${totalVendors === 1 ? '' : 's'}`}>
              <div className="space-y-3">
                {[
                  { head: 'CGST', cash: aggregate.cgst, itc: aggregate.cgst, totalClass: 'text-violet-600' },
                  { head: 'SGST', cash: aggregate.sgst, itc: aggregate.sgst, totalClass: 'text-blue-600' },
                  { head: 'IGST', cash: aggregate.igst, itc: aggregate.igst, totalClass: 'text-green-600' },
                  { head: 'CESS', cash: aggregate.cess, itc: 0, totalClass: 'text-amber-600' },
                ].map((row) => (
                  <div key={row.head} className="rounded-md border bg-muted/20 p-3">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="font-semibold">{row.head}</span>
                      <span className={cn('font-semibold', row.totalClass)}>{formatLakhs(row.cash + row.itc)}</span>
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>Cash: <strong className="text-violet-600">{formatLakhs(row.cash)}</strong></span>
                      <span>ITC: <strong className="text-green-600">{formatLakhs(row.itc)}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </TaxSectionCard>

            <TaxSectionCard icon={BarChart3} title="Credit Composition" description="Percentage contribution by GST head">
              <div className="space-y-4">
                {composition.map((item) => (
                  <div key={item.label}>
                    <div className="mb-1.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className={cn('h-2.5 w-2.5 rounded-full', item.dotClass)} />
                        <span className="text-sm font-medium">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="font-semibold">{formatLakhs(item.amount)}</span>
                        <span className="min-w-[2rem] text-right text-muted-foreground">{item.pct}%</span>
                      </div>
                    </div>
                    <TaxProgressRow label="" value={item.pct} progressClassName={item.progressClassName} />
                  </div>
                ))}
              </div>
            </TaxSectionCard>

            <TaxSectionCard icon={TrendingUp} title="GST Position Summary" description="Snapshot of tax balance position">
              <div className="space-y-2">
                {[
                  { label: 'Cash Available', value: formatLakhs(aggregate.cash), className: 'text-violet-600' },
                  { label: 'ITC Available', value: formatLakhs(aggregate.itc), className: 'text-green-600' },
                  { label: 'Net Available', value: formatLakhs(aggregate.total), className: 'text-blue-600 font-bold text-base' },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2 text-sm">
                    <span>{row.label}</span>
                    <span className={cn('font-semibold', row.className)}>{row.value}</span>
                  </div>
                ))}
                <div className="space-y-1.5 border-t pt-3">
                  {[
                    { label: 'Total Vendors', value: String(totalVendors) },
                    { label: 'Total GSTINs', value: String(totalVendors) },
                    { label: 'Last Synced', value: 'Today, 09:42 AM' },
                    { label: 'Status', value: 'Current', green: true },
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between text-xs text-muted-foreground">
                      <span>{row.label}</span>
                      <span className={cn('font-medium', row.green ? 'text-green-600' : 'text-foreground')}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </TaxSectionCard>
          </div>

          <TaxSectionCard
            icon={BarChart2}
            title="GST Balance Breakdown"
            description="Cash and ITC balances by vendor and GSTIN from GST portal"
            meta={<TaxApiMeta synced="Today, 09:42 AM" status="live" count={`${totalVendors} vendor${totalVendors === 1 ? '' : 's'}`} />}
          >
            {activeVendors.length === 0 ? (
              <TaxEmptyState
                title="No GST balance information found for the selected vendors"
                description="Try selecting a different vendor or refreshing balances."
              />
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      {['Vendor', 'GSTIN', 'CGST Balance', 'SGST Balance', 'IGST Balance', 'CESS Balance', 'Cash Ledger', 'ITC Ledger', 'Total Available', 'Last Synced'].map((heading) => (
                        <TableHead key={heading} className="whitespace-nowrap text-xs">{heading}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeVendors.map((vendor) => (
                      <TableRow key={vendor.id}>
                        <TableCell className="whitespace-nowrap font-semibold">{vendor.name || vendor.vendor}</TableCell>
                        <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">{vendor.gstin}</TableCell>
                        <TableCell className="font-semibold text-violet-600">{formatLakhs(vendor.cgst)}</TableCell>
                        <TableCell className="font-semibold text-blue-600">{formatLakhs(vendor.sgst)}</TableCell>
                        <TableCell className="font-semibold text-green-600">{formatLakhs(vendor.igst)}</TableCell>
                        <TableCell className={vendor.cess > 0 ? 'text-amber-600' : 'text-muted-foreground'}>{formatLakhs(vendor.cess)}</TableCell>
                        <TableCell className="font-semibold text-violet-600">{formatLakhs(vendor.cash)}</TableCell>
                        <TableCell className="font-semibold text-green-600">{formatLakhs(vendor.itc)}</TableCell>
                        <TableCell className="font-bold text-blue-600">{formatLakhs(vendor.cash + vendor.itc)}</TableCell>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{vendor.synced}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  {activeVendors.length > 1 ? (
                    <tfoot>
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell colSpan={2}>Total ({totalVendors} vendors)</TableCell>
                        <TableCell className="text-violet-600">{formatLakhs(aggregate.cgst)}</TableCell>
                        <TableCell className="text-blue-600">{formatLakhs(aggregate.sgst)}</TableCell>
                        <TableCell className="text-green-600">{formatLakhs(aggregate.igst)}</TableCell>
                        <TableCell className="text-amber-600">{formatLakhs(aggregate.cess)}</TableCell>
                        <TableCell className="text-violet-600">{formatLakhs(aggregate.cash)}</TableCell>
                        <TableCell className="text-green-600">{formatLakhs(aggregate.itc)}</TableCell>
                        <TableCell className="text-base text-blue-600">{formatLakhs(aggregate.total)}</TableCell>
                        <TableCell />
                      </TableRow>
                    </tfoot>
                  ) : null}
                </Table>
              </div>
            )}
          </TaxSectionCard>

          <TaxSectionCard icon={TrendingUp} title="GST Credit Insights" description="Key observations on current balance position">
            <div className="space-y-3">
              {insights.map((item) => (
                <div key={item.text} className={cn('flex items-start gap-3 rounded-md border p-3 text-sm', item.className)}>
                  <item.icon className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{item.text}</p>
                </div>
              ))}
            </div>
          </TaxSectionCard>
        </>
      )}
    </TabsContent>
  );
};

import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  Building2,
  CheckCircle2,
  Download,
  FileSearch,
  FileText,
  Info,
  Layers,
  Loader2,
  Play,
  RefreshCw,
  Search,
  TrendingUp,
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
} from '../TaxUi';
import {
  DEFAULT_TAX_PERIOD,
  TAX_PERIODS,
} from '../../data/taxStaticData';
import { useTrackGstReturnsMutation } from '../../../../Services/apis/taxApi';
import { buildReturnsTrackPayload } from '../../utils/gstApiMappers';
import { getApiErrorMessage } from '../../hooks/useGstTaxpayerSession';
import { useGstVendors } from '../../hooks/useGstVendors';
import { toast } from 'sonner';
import { formatCurrency, formatRetPeriod } from '../../utils/taxFormatting';
import {
  getCurrentIndianFinancialYear,
  getIndianFinancialYearReturnsOptions,
  toIndianFinancialYearReturnsLabel,
} from '../../utils/gstPeriod';

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
  const sourceRows = [];
  const matchPct = 0;
  const totalInvoices = 0;

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
        meta={<TaxApiMeta synced="Today, 09:42 AM" count={String(totalInvoices)} />}
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

        {filteredRows.length === 0 ? (
          <TaxEmptyState
            icon={FileSearch}
            title="No reconciliation data"
            description="Run GSTR-2A B2B reconcile from the Documents tab to populate reconciliation results."
          />
        ) : (
          <>
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
          </>
        )}
      </TaxSectionCard>

      <TaxDrawer open={Boolean(selectedRow)} onOpenChange={(open) => !open && setSelectedRow(null)} title={`Invoice Details — ${selectedRow?.invoiceNo || ''}`}>
        {selectedRow ? <GstReconciliationDrawerContent row={selectedRow} /> : null}
      </TaxDrawer>
    </TabsContent>
  );
};

const FY_OPTIONS = getIndianFinancialYearReturnsOptions();
const DEFAULT_GST_RETURNS_FY = toIndianFinancialYearReturnsLabel(getCurrentIndianFinancialYear());
const RETURN_TYPE_OPTIONS = ['All Returns', 'GSTR-1', 'GSTR-3B', 'GSTR-9'];

export const GstReturnsPanel = () => {
  const { vendors } = useGstVendors();
  const [vendorId, setVendorId] = useState('');
  const [returnType, setReturnType] = useState('All Returns');
  const [fy, setFy] = useState(DEFAULT_GST_RETURNS_FY);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [records, setRecords] = useState([]);
  const [trackReturns] = useTrackGstReturnsMutation();

  const selectedVendor = vendors.find((vendor) => vendor.id === vendorId);

  const handleTrack = async () => {
    if (!vendorId || !selectedVendor) return;
    setLoading(true);
    setFetched(false);
    try {
      const result = await trackReturns(buildReturnsTrackPayload({
        vendorName: selectedVendor.name,
        gstin: selectedVendor.gstin,
        returnType,
        financialYear: fy,
      })).unwrap();
      const rows = result?.returns ?? [];
      const filtered = returnType === 'All Returns'
        ? rows
        : rows.filter((row) => row.returnType === returnType.replace(/-/g, ''));
      setRecords(filtered);
      setFetched(true);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
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
                ...vendors.map((vendor) => ({ value: vendor.id, label: vendor.name })),
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
            meta={<TaxApiMeta synced="Just now" count={String(records.length)} />}
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
              <TaxKpiCard label="Last Filed Return" value={lastFiled?.returnType || '—'} sub={lastFiled ? formatRetPeriod(lastFiled.returnPeriod) : 'No filings found'} icon={CheckCircle2} tone="green" />
              <TaxKpiCard label="Last Filing Date" value={lastFiled?.dof || '—'} sub={`Mode: ${lastFiled?.filing_mode || '—'}`} icon={Layers} />
              <TaxKpiCard label="Filing Validity" value={invalidCount > 0 ? `${invalidCount} Invalid` : 'All Valid'} sub={`${filedCount} filed of ${records.length}`} icon={AlertCircle} tone={invalidCount > 0 ? 'red' : 'green'} />
            </div>
          </TaxSectionCard>

          <TaxSectionCard
            icon={FileSearch}
            title="Filing History"
            description="Source: Sandbox Track GSTRs API · Read-only"
            actions={
              <Button variant="outline" size="sm" onClick={handleTrack} disabled={!vendorId || loading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Refreshing…' : 'Refresh'}
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
                  getRowKey={(row, index) => `${row.returnType}-${row.returnPeriod}-${index}`}
                  columns={[
                    { key: 'returnType', title: 'Return Type', cellClassName: 'font-medium text-primary' },
                    { key: 'returnPeriod', title: 'Return Period', render: (row) => formatRetPeriod(row.returnPeriod) },
                    { key: 'arn', title: 'ARN', render: (row) => row.arn || '—', cellClassName: 'font-mono text-xs' },
                    { key: 'filedDate', title: 'Filed Date' },
                    { key: 'filingMode', title: 'Filing Mode', cellClassName: 'text-muted-foreground' },
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

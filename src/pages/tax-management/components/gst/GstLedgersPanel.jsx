import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  BarChart2,
  Calendar,
  CheckCircle2,
  DollarSign,
  Download,
  Eye,
  FileText,
  Filter,
  Info,
  Loader2,
  Shield,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../../../components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../../components/ui/table';
import { TabsContent } from '../../../../components/ui/tabs';
import { cn } from '../../../../lib/utils';
import {
  useFetchCashItcBalanceMutation,
  useFetchCashItcBalanceHistoryMutation,
} from '../../../../Services/apis/taxApi';
import {
  TaxApiMeta,
  TaxEmptyState,
  TaxPagination,
  TaxProgressRow,
  TaxSearchInput,
  TaxSectionCard,
  TaxSelect,
  TaxStatusBadge,
} from '../TaxUi';
import GstPortalOtpDialog from './GstPortalOtpDialog';
import OrgGstCredentialFields from './OrgGstCredentialFields';
import { useOrganisationGstCredentials } from '../../hooks/useOrganisationGstCredentials';
import { useGstTaxpayerSession, getApiErrorMessage } from '../../hooks/useGstTaxpayerSession';
import { buildGstPortalFetchCredentials } from '../../../../utils/organisationGst';
import {
  buildCashItcBalanceRequestPayload,
  mapCashItcBalanceResponseToUi,
} from '../../utils/gstApiMappers';
import {
  GST_LEDGER_MONTHS,
  GST_LEDGER_YEARS,
  resolveLedgerHistoryPeriod,
} from '../../data/taxStaticData';
import { formatCurrency, formatDate, formatLakhsFromRupees } from '../../utils/taxFormatting';
import MeteredActionCostHint from '../../../../components/credits/MeteredActionCostHint';
import { CREDIT_ACTION_CODES } from '../../../../constants/creditActions';

const LEDGER_TONE = {
  green: { dot: 'bg-green-500', text: 'text-green-600', card: 'border-green-200 bg-green-50 text-green-700' },
  primary: { dot: 'bg-primary', text: 'text-primary', card: 'border-primary/20 bg-primary/5 text-primary' },
  blue: { dot: 'bg-blue-500', text: 'text-blue-600', card: 'border-blue-200 bg-blue-50 text-blue-700' },
  amber: { dot: 'bg-amber-500', text: 'text-amber-600', card: 'border-amber-200 bg-amber-50 text-amber-700' },
};

const LEDGER_HISTORY_MONTH_OPTIONS = [
  { value: 'all', label: 'All Months' },
  ...GST_LEDGER_MONTHS.map((month) => ({ value: month, label: month })),
];

const LEDGER_HISTORY_YEAR_OPTIONS = [
  { value: 'all', label: 'All Years' },
  ...GST_LEDGER_YEARS.map((year) => ({ value: year, label: year })),
];

const LEDGER_HISTORY_STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'success', label: 'Success' },
  { value: 'failed', label: 'Failed' },
];

const HISTORY_PAGE_SIZE = 20;
const getHistoryTotalPages = (total) => Math.max(1, Math.ceil(Number(total || 0) / HISTORY_PAGE_SIZE));

const GstFormField = ({ label, required, children, className }) => (
  <div className={cn('flex min-w-[160px] flex-col gap-1.5', className)}>
    <label className="text-xs font-semibold">
      {label}
      {required ? <span className="text-destructive"> *</span> : null}
    </label>
    {children}
  </div>
);

const LedgerSummaryCard = ({ label, value, sub, icon: Icon, tone = 'primary', extra }) => {
  const styles = LEDGER_TONE[tone] || LEDGER_TONE.primary;
  return (
    <div className={cn('rounded-lg border p-4', styles.card)}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide opacity-90">{label}</p>
        {Icon ? <Icon className="h-4 w-4 shrink-0 opacity-80" /> : null}
      </div>
      <p className="text-2xl font-bold">{value}</p>
      {sub ? <p className="mt-1 text-xs opacity-80">{sub}</p> : null}
      {extra?.length ? (
        <div className="mt-2 flex flex-wrap gap-2 text-[10.5px] font-semibold opacity-90">
          {extra.map((row) => (
            <span key={row.head}>
              {row.head}: {formatCurrency(row.itcAvail)}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
};

function formatLastSynced(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const GstLedgersPanel = () => {
  const { credentials, isLoading: credentialsLoading } = useOrganisationGstCredentials();
  const session = useGstTaxpayerSession();
  const [fetchCashItcBalance] = useFetchCashItcBalanceMutation();
  const [fetchCashItcBalanceHistory] = useFetchCashItcBalanceHistoryMutation();
  const [selectedOrgGst, setSelectedOrgGst] = useState('');
  const [selMonth, setSelMonth] = useState('June');
  const [selYear, setSelYear] = useState('2026');
  const [isFetching, setIsFetching] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [ledgerData, setLedgerData] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [histTotal, setHistTotal] = useState(0);
  const [histSearch, setHistSearch] = useState('');
  const [histMonth, setHistMonth] = useState('all');
  const [histYear, setHistYear] = useState('all');
  const [histStatus, setHistStatus] = useState('all');

  useEffect(() => {
    if (!selectedOrgGst && credentials.length === 1) {
      setSelectedOrgGst(credentials[0].gst);
    }
  }, [credentials, selectedOrgGst]);

  const selectedOrgCredential = credentials.find((entry) => entry.gst === selectedOrgGst) ?? null;
  const portalCredentials = buildGstPortalFetchCredentials(selectedOrgCredential);
  const canFetchWithOrgGst = Boolean(portalCredentials?.gst && portalCredentials?.userName);

  const hasActiveHistoryFilters = histSearch.trim() !== ''
    || histMonth !== 'all'
    || histYear !== 'all'
    || histStatus !== 'all';

  const period = `${selMonth} ${selYear}`;
  const rows = ledgerData?.rows ?? [];
  const totals = ledgerData?.totals ?? {
    totalCash: 0,
    totalItcAvail: 0,
    totalBlocked: 0,
    totalAvail: 0,
    grandTotal: 0,
  };
  const itcComposition = ledgerData?.itcComposition ?? [];
  const gstPosition = ledgerData?.gstPosition ?? {};
  const displayGstin = gstPosition.gstin || selectedOrgGst;
  const displayPeriod = gstPosition.selectedMonth || period;

  const filteredHistory = useMemo(() => history.filter((entry) => {
    const { periodMonth, periodYear } = resolveLedgerHistoryPeriod(entry);
    const query = histSearch.trim().toLowerCase();
    const matchQuery = !query || [
      entry.dateRetrieved,
      entry.month,
      periodMonth,
      periodYear,
      entry.gstin,
      entry.legalName,
      entry.status,
    ].some((field) => String(field || '').toLowerCase().includes(query));
    const matchMonth = histMonth === 'all' || periodMonth === histMonth;
    const matchYear = histYear === 'all' || periodYear === histYear;
    const matchStatus = histStatus === 'all' || entry.status === histStatus;
    return matchQuery && matchMonth && matchYear && matchStatus;
  }), [history, histSearch, histMonth, histYear, histStatus]);

  const clearHistoryFilters = () => {
    setHistSearch('');
    setHistMonth('all');
    setHistYear('all');
    setHistStatus('all');
  };

  const applyLedgerResult = (uiData) => {
    setLedgerData(uiData);
    if (uiData.history?.length) setHistory(uiData.history);
    setFetched(true);
    toast.success('GST Ledger Balance retrieved successfully.');
  };

  const loadLedgerHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const offset = (historyPage - 1) * HISTORY_PAGE_SIZE;
      const result = await fetchCashItcBalanceHistory({ limit: HISTORY_PAGE_SIZE, offset }).unwrap();
      const historyPayload = Array.isArray(result) ? { history: result } : result;
      setHistory(mapCashItcBalanceResponseToUi(historyPayload).history ?? []);
      setHistTotal(Number(result?.total ?? historyPayload?.history?.length ?? 0));
    } catch (error) {
      toast.error(getApiErrorMessage(error));
      setHistory([]);
      setHistTotal(0);
    } finally {
      setHistoryLoading(false);
    }
  }, [fetchCashItcBalanceHistory, historyPage]);

  useEffect(() => {
    loadLedgerHistory();
  }, [loadLedgerHistory]);

  const handleFetch = async () => {
    if (!canFetchWithOrgGst || isFetching) return;

    setIsFetching(true);
    try {
      await session.runWithSession({
        orgCredential: selectedOrgCredential,
        contextLabel: 'GST Ledger Balance',
        execute: async (otp, portalCredentials) => {
          try {
            const payload = buildCashItcBalanceRequestPayload({
              gstin: portalCredentials.gst,
              username: portalCredentials.userName,
              month: selMonth,
              year: selYear,
              otp,
            });
            const result = await fetchCashItcBalance(payload).unwrap();
            applyLedgerResult(mapCashItcBalanceResponseToUi(result));
            loadLedgerHistory();
            return result;
          } catch (error) {
            toast.error(getApiErrorMessage(error));
            return null;
          }
        },
      });
    } finally {
      setIsFetching(false);
    }
  };

  const handleViewHistory = (entry) => {
    setFetched(true);
    if (entry.gstin) setSelectedOrgGst(entry.gstin);
    const { periodMonth, periodYear } = resolveLedgerHistoryPeriod(entry);
    if (periodMonth && GST_LEDGER_MONTHS.includes(periodMonth)) setSelMonth(periodMonth);
    if (periodYear) setSelYear(periodYear);
    if (ledgerData) {
      setLedgerData({
        ...ledgerData,
        gstPosition: {
          ...ledgerData.gstPosition,
          gstin: entry.gstin || ledgerData.gstPosition.gstin,
          legalName: entry.legalName || ledgerData.gstPosition.legalName,
          selectedMonth: entry.month || ledgerData.gstPosition.selectedMonth,
          cashAvailable: entry.cash,
          itcAvailable: entry.itcAvail,
          totalAvailable: entry.totalBalance || entry.cash + entry.itcAvail,
        },
      });
    }
  };

  const itcBreakdownRows = rows.filter((row) => row.itcAvail > 0);

  return (
    <TabsContent value="ledgers" className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">GST Cash &amp; ITC Balance</h3>
        <p className="text-sm text-muted-foreground">
          View Electronic Cash Ledger and ITC Balance from the GST Portal.
        </p>
      </div>

      <TaxSectionCard
        icon={Calendar}
        title="Fetch GST Ledger Balance"
        description="Select a period and authenticate with the GST Portal to retrieve your ledger balances."
      >
        <MeteredActionCostHint actionCode={CREDIT_ACTION_CODES.GST_LEDGER_API} className="mb-4" />
        <div className="flex flex-wrap items-end gap-4">
          <OrgGstCredentialFields
            credentials={credentials}
            loading={credentialsLoading}
            selectedGst={selectedOrgGst}
            onGstChange={setSelectedOrgGst}
          />
          <GstFormField label="Month" required className="min-w-[140px]">
            <TaxSelect value={selMonth} onValueChange={setSelMonth} options={GST_LEDGER_MONTHS} />
          </GstFormField>
          <GstFormField label="Year" required className="min-w-[100px]">
            <TaxSelect value={selYear} onValueChange={setSelYear} options={GST_LEDGER_YEARS} />
          </GstFormField>
          <Button
            type="button"
            onClick={handleFetch}
            disabled={!canFetchWithOrgGst || isFetching}
            className="self-end shrink-0"
          >
            {isFetching ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Shield className="mr-2 h-4 w-4" />
            )}
            {isFetching ? 'Fetching…' : 'Fetch GST Balance'}
          </Button>
          {fetched ? (
            <div className="flex shrink-0 items-center gap-2 self-center rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              Last fetched: {displayPeriod}
            </div>
          ) : null}
        </div>
      </TaxSectionCard>

      {!fetched ? (
        <TaxEmptyState
          icon={BarChart2}
          title="No GST ledger data retrieved yet"
          description={
            <>
              Select an organisation GSTIN, month and year above, then click <strong>Fetch GST Balance</strong> to authenticate
              with the GST Portal and retrieve your Electronic Cash Ledger and ITC Balance.
            </>
          }
        >
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={handleFetch}
            disabled={!canFetchWithOrgGst || isFetching}
          >
            {isFetching ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Shield className="mr-2 h-4 w-4" />
            )}
            {isFetching ? 'Fetching…' : `Fetch GST Balance — ${period}`}
          </Button>
        </TaxEmptyState>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <LedgerSummaryCard
              label="Electronic Cash Ledger"
              value={formatLakhsFromRupees(totals.totalCash)}
              sub="Total cash available with GSTN"
              icon={DollarSign}
              tone="primary"
            />
            <LedgerSummaryCard
              label="Available ITC"
              value={formatLakhsFromRupees(totals.totalItcAvail)}
              icon={CheckCircle2}
              tone="green"
              extra={itcBreakdownRows}
            />
            <LedgerSummaryCard
              label="Blocked ITC"
              value={formatCurrency(totals.totalBlocked)}
              sub="ITC currently unavailable for utilization"
              icon={AlertCircle}
              tone="amber"
            />
            <LedgerSummaryCard
              label="Total Available Balance"
              value={formatLakhsFromRupees(totals.totalAvail)}
              sub="Cash + Available ITC"
              icon={TrendingUp}
              tone="blue"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
            <TaxSectionCard
              title="ITC Composition"
              description="Available ITC contribution by tax head"
            >
              <div className="space-y-4">
                {itcComposition.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No available ITC for this period.</p>
                ) : itcComposition.map((item) => {
                  const tone = LEDGER_TONE[item.tone] || LEDGER_TONE.primary;
                  return (
                    <div key={item.label}>
                      <div className="mb-1.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className={cn('h-2.5 w-2.5 rounded-full', tone.dot)} />
                          <span className="text-sm font-medium">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <span className="font-semibold">{formatCurrency(item.amount)}</span>
                          <span className="min-w-[2rem] text-right text-muted-foreground">{item.pct}%</span>
                        </div>
                      </div>
                      <TaxProgressRow
                        label=""
                        value={item.pct}
                        progressClassName={cn(
                          item.tone === 'green' && '[&>div]:bg-green-500',
                          item.tone === 'primary' && '[&>div]:bg-primary',
                          item.tone === 'blue' && '[&>div]:bg-blue-500',
                          item.tone === 'amber' && '[&>div]:bg-amber-500',
                        )}
                      />
                    </div>
                  );
                })}
              </div>
            </TaxSectionCard>

            <TaxSectionCard title="GST Position" description={`Balance snapshot for ${displayPeriod}`}>
              <div className="space-y-2">
                {[
                  { label: 'Cash Available', value: formatLakhsFromRupees(gstPosition.cashAvailable ?? totals.totalCash), className: 'text-primary' },
                  { label: 'ITC Available', value: formatLakhsFromRupees(gstPosition.itcAvailable ?? totals.totalItcAvail), className: 'text-green-600' },
                  { label: 'Total Available', value: formatLakhsFromRupees(gstPosition.totalAvailable ?? totals.totalAvail), className: 'text-blue-600 font-bold text-base' },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2 text-sm">
                    <span>{row.label}</span>
                    <span className={cn('font-semibold', row.className)}>{row.value}</span>
                  </div>
                ))}
                <div className="space-y-1.5 border-t pt-3">
                  {[
                    { label: 'GSTIN', value: displayGstin || '—', mono: true },
                    { label: 'Legal Name', value: gstPosition.legalName || '—' },
                    { label: 'Selected Month', value: displayPeriod },
                    { label: 'Last Synced', value: formatLastSynced(gstPosition.lastSynced) },
                    {
                      label: 'Auth Status',
                      value: gstPosition.authStatus || 'Verified',
                      green: String(gstPosition.authStatus || '').toLowerCase().includes('verified'),
                    },
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between text-xs text-muted-foreground">
                      <span>{row.label}</span>
                      <span
                        className={cn(
                          'font-medium',
                          row.green ? 'text-green-600' : 'text-foreground',
                          row.mono && 'font-mono text-[11px]',
                        )}
                      >
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </TaxSectionCard>
          </div>

          <TaxSectionCard
            icon={BarChart2}
            title="GST Ledger Balance"
            description={`Electronic Cash Ledger and ITC Balance · ${displayGstin || '—'} · ${displayPeriod}`}
            meta={<TaxApiMeta synced={formatLastSynced(gstPosition.lastSynced)} count={`${rows.length} tax heads`} />}
            actions={(
              <Button type="button" variant="outline" size="sm" onClick={() => toast.success('Export started')}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            )}
          >
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    {['Tax Head', 'Cash Balance', 'Available ITC', 'Blocked ITC', 'Total Balance'].map((heading, index) => (
                      <TableHead
                        key={heading}
                        className={cn('whitespace-nowrap text-xs', index > 0 && 'text-right')}
                      >
                        {heading}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const tone = LEDGER_TONE[row.tone] || LEDGER_TONE.primary;
                    const rowTotal = row.cash + row.itcAvail + row.itcBlocked;
                    return (
                      <TableRow key={row.head}>
                        <TableCell>
                          <span className="inline-flex items-center gap-2 font-semibold">
                            <span className={cn('h-2.5 w-2.5 rounded-full', tone.dot)} />
                            {row.head}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-primary">{formatCurrency(row.cash)}</TableCell>
                        <TableCell className={cn('text-right font-semibold', row.itcAvail > 0 ? 'text-green-600' : 'text-muted-foreground')}>
                          {formatCurrency(row.itcAvail)}
                        </TableCell>
                        <TableCell className={cn('text-right', row.itcBlocked > 0 ? 'text-amber-600' : 'text-muted-foreground')}>
                          {formatCurrency(row.itcBlocked)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-blue-600">{formatCurrency(rowTotal)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                <tfoot>
                  <TableRow className="bg-muted/50 font-bold">
                    <TableCell>Grand Total</TableCell>
                    <TableCell className="text-right text-primary">{formatCurrency(totals.totalCash)}</TableCell>
                    <TableCell className="text-right text-green-600">{formatCurrency(totals.totalItcAvail)}</TableCell>
                    <TableCell className={cn('text-right', totals.totalBlocked > 0 ? 'text-amber-600' : 'text-muted-foreground')}>
                      {formatCurrency(totals.totalBlocked)}
                    </TableCell>
                    <TableCell className="text-right text-base text-blue-600">{formatCurrency(totals.grandTotal)}</TableCell>
                  </TableRow>
                </tfoot>
              </Table>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5" />
              Blocked ITC is excluded from Total Available Balance. Grand Total includes blocked ITC for reference.
            </div>
          </TaxSectionCard>
        </>
      )}

      <TaxSectionCard
        icon={FileText}
        title="GST Ledger History"
        description="History of previously retrieved GST ledger balances"
        actions={(
          <Button type="button" variant="outline" size="sm" onClick={() => toast.success('Export started')}>
            <Download className="mr-2 h-4 w-4" />
            Export History
          </Button>
        )}
      >
        <div className="mb-4 flex items-center gap-2 overflow-x-auto rounded-md border bg-muted/20 p-3">
          <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="w-[200px] shrink-0">
            <TaxSearchInput value={histSearch} onChange={setHistSearch} placeholder="Search history…" />
          </div>
          <TaxSelect
            value={histMonth}
            onValueChange={setHistMonth}
            options={LEDGER_HISTORY_MONTH_OPTIONS}
            placeholder="Month"
            className="h-9 w-[132px] shrink-0"
          />
          <TaxSelect
            value={histYear}
            onValueChange={setHistYear}
            options={LEDGER_HISTORY_YEAR_OPTIONS}
            placeholder="Year"
            className="h-9 w-[108px] shrink-0"
          />
          <TaxSelect
            value={histStatus}
            onValueChange={setHistStatus}
            options={LEDGER_HISTORY_STATUS_OPTIONS}
            placeholder="Status"
            className="h-9 w-[124px] shrink-0"
          />
          {hasActiveHistoryFilters ? (
            <Button type="button" variant="ghost" size="sm" className="shrink-0" onClick={clearHistoryFilters}>
              Clear
            </Button>
          ) : null}
        </div>

        {historyLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Loading ledger history…
          </div>
        ) : filteredHistory.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            {history.length === 0
              ? 'Fetch a ledger balance to populate history.'
              : 'No history records match your filters.'}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  {[
                    'Date Retrieved',
                    'Selected Month',
                    'GSTIN',
                    'Legal Name',
                    'Cash Ledger',
                    'Available ITC',
                    'Blocked ITC',
                    'Total Balance',
                    'Status',
                    'Actions',
                  ].map((heading, index) => (
                    <TableHead
                      key={heading}
                      className={cn(
                        'whitespace-nowrap text-xs',
                        index >= 4 && index <= 7 ? 'text-right' : 'text-left',
                      )}
                    >
                      {heading}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {entry.dateRetrieved.includes('T') ? formatDate(entry.dateRetrieved) : entry.dateRetrieved}
                    </TableCell>
                    <TableCell className="font-semibold">{entry.month}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{entry.gstin}</TableCell>
                    <TableCell>{entry.legalName}</TableCell>
                    <TableCell className="text-right font-semibold text-primary">
                      {entry.status === 'success' ? formatLakhsFromRupees(entry.cash) : '—'}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      {entry.status === 'success' ? formatLakhsFromRupees(entry.itcAvail) : '—'}
                    </TableCell>
                    <TableCell className={cn('text-right', entry.itcBlocked > 0 ? 'text-amber-600' : 'text-muted-foreground')}>
                      {entry.status === 'success' ? formatCurrency(entry.itcBlocked) : '—'}
                    </TableCell>
                    <TableCell className="text-right font-bold text-blue-600">
                      {entry.status === 'success'
                        ? formatLakhsFromRupees(entry.totalBalance || entry.cash + entry.itcAvail)
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <TaxStatusBadge status={entry.status === 'success' ? 'Success' : 'Failed'} />
                    </TableCell>
                    <TableCell>
                      {entry.status === 'success' ? (
                        <Button type="button" variant="ghost" size="sm" onClick={() => handleViewHistory(entry)}>
                          <Eye className="mr-1.5 h-4 w-4" />
                          View
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <TaxPagination
          page={historyPage}
          totalPages={getHistoryTotalPages(histTotal)}
          loading={historyLoading}
          onPrevious={() => setHistoryPage((page) => Math.max(1, page - 1))}
          onNext={() => setHistoryPage((page) => Math.min(getHistoryTotalPages(histTotal), page + 1))}
        />
      </TaxSectionCard>

      <GstPortalOtpDialog {...session.otpDialogProps} />
    </TabsContent>
  );
};

export default GstLedgersPanel;

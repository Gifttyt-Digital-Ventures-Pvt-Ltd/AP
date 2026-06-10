import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { useGetInvoicesQuery } from '../../../Services/apis/invoicesVendorsApi';
import { EMPTY_INVOICE_LIST_RESPONSE, getInvoiceListItems } from '../../../Services/utils/payloadMappers';
import {
  useGetTdsEntriesQuery,
  useGetTdsSummaryQuery,
  useGetTdsSectionsQuery,
  useCalculateTdsMutation,
} from '../../../Services/apis/taxApi';
import { Button } from '../../../components/ui/button';
import { TabsContent } from '../../../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { TableCell, TableRow } from '../../../components/ui/table';
import AppDataTable from '../../../components/common/AppDataTable';
import { cn } from '../../../lib/utils';
import { toast } from 'sonner';
import {
  Calculator,
  CheckCircle,
  Clock,
  IndianRupee,
  Loader2,
  Receipt,
} from 'lucide-react';
import TdsCalculationDialog from './TdsCalculationDialog';
import { useActionGuard } from '../../../hooks/useActionGuard';
import { formatCurrency } from '../utils/taxFormatting';

const TDS_SECTIONS_TABLE_HEADER = [
  { key: 'section_code', title: 'Section', cellClassName: 'font-medium' },
  { key: 'description', title: 'Description' },
  { key: 'rate_individual', title: 'Individual Rate' },
  { key: 'rate_company', title: 'Company Rate' },
  { key: 'threshold_single', title: 'Single Threshold' },
  { key: 'threshold_annual', title: 'Annual Threshold' },
];

const TDS_ENTRIES_TABLE_HEADER = [
  { key: 'section_code', title: 'Section', cellClassName: 'font-medium' },
  { key: 'vendor_name', title: 'Vendor' },
  { key: 'base_amount', title: 'Base Amount' },
  { key: 'tds_rate', title: 'TDS Rate' },
  { key: 'tds_amount', title: 'TDS Amount' },
  { key: 'total_tds', title: 'Total TDS', cellClassName: 'font-medium' },
  { key: 'status', title: 'Status' },
  { key: 'challan_number', title: 'Challan', cellClassName: 'font-mono text-xs' },
  { key: 'quarter', title: 'Quarter' },
];

const DEFAULT_TDS_FORM = {
  invoice_id: '',
  section_code: '194C',
  base_amount: 0,
  is_company: false,
};

const renderTdsSectionRow = (section, rowIndex, headers) => (
  <TableRow
    key={section.id ?? rowIndex}
    className={cn(rowIndex % 2 === 1 && 'bg-muted/20')}
    data-testid={`tds-section-row-${section.id}`}
  >
    {headers.map((header) => {
      let value;

      switch (header.key) {
        case 'rate_individual':
          value = `${section.rate_individual}%`;
          break;
        case 'rate_company':
          value = `${section.rate_company}%`;
          break;
        case 'threshold_single':
          value = formatCurrency(section.threshold_single);
          break;
        case 'threshold_annual':
          value = formatCurrency(section.threshold_annual);
          break;
        default:
          value = section?.[header.key] ?? '-';
      }

      return (
        <TableCell key={header.key} className={cn('px-3 py-3', header.cellClassName)}>
          {value}
        </TableCell>
      );
    })}
  </TableRow>
);

const renderTdsEntryRow = (entry, rowIndex, headers) => (
  <TableRow
    key={entry.id ?? rowIndex}
    className={cn(rowIndex % 2 === 1 && 'bg-muted/20')}
    data-testid={`tds-entry-row-${entry.id}`}
  >
    {headers.map((header) => {
      let value;

      switch (header.key) {
        case 'vendor_name':
          value = entry.vendor_name || '-';
          break;
        case 'base_amount':
          value = formatCurrency(entry.base_amount);
          break;
        case 'tds_rate':
          value = `${entry.tds_rate}%`;
          break;
        case 'tds_amount':
          value = formatCurrency(entry.tds_amount);
          break;
        case 'total_tds':
          value = formatCurrency(entry.total_tds);
          break;
        case 'status':
          value = (
            <Badge
              variant={entry.status === 'Deposited' ? 'default' : 'secondary'}
              className={entry.status === 'Deposited' ? 'bg-green-500' : ''}
            >
              {entry.status}
            </Badge>
          );
          break;
        case 'challan_number':
          value = entry.challan_number || '-';
          break;
        default:
          value = entry?.[header.key] ?? '-';
      }

      return (
        <TableCell key={header.key} className={cn('px-3 py-3', header.cellClassName)}>
          {value}
        </TableCell>
      );
    })}
  </TableRow>
);

const TdsTab = forwardRef(({ enabled = true }, ref) => {
  const { guardAction, canPerformAction } = useActionGuard();
  const [showTdsCalcDialog, setShowTdsCalcDialog] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [tdsForm, setTdsForm] = useState(DEFAULT_TDS_FORM);
  const [calculateTds] = useCalculateTdsMutation();

  const {
    data: tdsEntriesData = [],
    isLoading: tdsEntriesLoading,
    isFetching: tdsEntriesFetching,
    refetch: refetchTdsEntries,
  } = useGetTdsEntriesQuery(undefined, { skip: !enabled });
  const {
    data: tdsSummary = null,
    isLoading: tdsSummaryLoading,
    isFetching: tdsSummaryFetching,
    refetch: refetchTdsSummary,
  } = useGetTdsSummaryQuery(undefined, { skip: !enabled });
  const {
    data: tdsSectionsData = [],
    isLoading: tdsSectionsLoading,
    isFetching: tdsSectionsFetching,
    refetch: refetchTdsSections,
  } = useGetTdsSectionsQuery(undefined, { skip: !enabled });
  const {
    data: invoicesListData = EMPTY_INVOICE_LIST_RESPONSE,
    isLoading: invoicesLoading,
    isFetching: invoicesFetching,
    refetch: refetchInvoices,
  } = useGetInvoicesQuery(undefined, { skip: !enabled });

  const tdsEntries = Array.isArray(tdsEntriesData) ? tdsEntriesData : [];
  const tdsSections = Array.isArray(tdsSectionsData) ? tdsSectionsData : [];
  const invoices = getInvoiceListItems(invoicesListData);
  const canManageTds = canPerformAction('tax.calculateTds') && enabled;
  const loading = enabled && (tdsEntriesLoading || tdsSummaryLoading || tdsSectionsLoading || invoicesLoading);
  const isFetching =
    tdsEntriesFetching || tdsSummaryFetching || tdsSectionsFetching || invoicesFetching;

  const refetch = async () => {
    await Promise.all([
      refetchTdsEntries(),
      refetchTdsSummary(),
      refetchTdsSections(),
      refetchInvoices(),
    ]);
  };

  useImperativeHandle(ref, () => ({
    refetch,
    isFetching,
  }));

  const handleCalculateTDS = async () => {
    if (!guardAction('tax.calculateTds')) return;
    if (!tdsForm.invoice_id || !tdsForm.section_code || tdsForm.base_amount <= 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    setCalculating(true);
    try {
      const data = await calculateTds(tdsForm).unwrap();
      toast.success(`TDS calculated: ${formatCurrency(data?.entry?.total_tds)}`);
      setShowTdsCalcDialog(false);
      setTdsForm(DEFAULT_TDS_FORM);
      await refetch();
    } catch (error) {
      toast.error(error?.data?.detail || 'Failed to calculate TDS');
    } finally {
      setCalculating(false);
    }
  };

  if (loading) {
    return (
      <TabsContent value="tds" className="space-y-6">
        <div className="min-h-[40vh] flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="mt-3 text-sm text-muted-foreground">Loading TDS data...</p>
          </div>
        </div>
      </TabsContent>
    );
  }

  return (
    <TabsContent value="tds" className="space-y-6">
      {tdsSummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Base Amount</p>
                  <p className="text-xl font-bold">{formatCurrency(tdsSummary.total_base_amount)}</p>
                </div>
                <IndianRupee className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">TDS Deducted</p>
                  <p className="text-xl font-bold">{formatCurrency(tdsSummary.total_tds_deducted)}</p>
                </div>
                <Receipt className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">TDS Deposited</p>
                  <p className="text-xl font-bold">{formatCurrency(tdsSummary.total_tds_deposited)}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Deposit</p>
                  <p className="text-xl font-bold">{formatCurrency(tdsSummary.pending_deposit)}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex gap-2">
        <Button onClick={() => setShowTdsCalcDialog(true)} data-testid="calc-tds-btn" disabled={!canManageTds}>
          <Calculator className="h-4 w-4 mr-2" />
          Calculate TDS
        </Button>
      </div>

      {/* <Card>
        <CardHeader>
          <CardTitle>TDS Sections Reference</CardTitle>
          <CardDescription>Applicable TDS rates by section</CardDescription>
        </CardHeader>
        <CardContent>
          <AppDataTable
            tableHeader={TDS_SECTIONS_TABLE_HEADER}
            tableData={tdsSections}
            renderRow={renderTdsSectionRow}
            emptyMessage="No TDS sections found."
          />
        </CardContent>
      </Card> */}

      <Card>
        <CardHeader>
          <CardTitle>TDS Entries</CardTitle>
          <CardDescription>TDS deductions and deposits</CardDescription>
        </CardHeader>
        <CardContent>
          <AppDataTable
            tableHeader={TDS_ENTRIES_TABLE_HEADER}
            tableData={tdsEntries}
            renderRow={renderTdsEntryRow}
            emptyMessage="No TDS entries found. Calculate TDS for an invoice to create entries."
          />
        </CardContent>
      </Card>

      <TdsCalculationDialog
        open={showTdsCalcDialog}
        setOpen={setShowTdsCalcDialog}
        tdsForm={tdsForm}
        setTdsForm={setTdsForm}
        invoices={invoices}
        tdsSections={tdsSections}
        formatCurrency={formatCurrency}
        calculating={calculating}
        handleCalculateTDS={handleCalculateTDS}
        canManageTax={canManageTds}
      />
    </TabsContent>
  );
});

TdsTab.displayName = 'TdsTab';

export default TdsTab;

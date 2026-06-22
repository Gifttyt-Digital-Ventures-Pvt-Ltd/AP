import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { useGetInvoicesQuery } from '../../../../Services/apis/invoicesVendorsApi';
import { EMPTY_INVOICE_LIST_RESPONSE, getInvoiceListItems } from '../../../../Services/utils/payloadMappers';
import {
  useCalculateTdsMutation,
  useGetTdsEntriesQuery,
  useGetTdsSectionsQuery,
  useGetTdsSummaryQuery,
} from '../../../../Services/apis/taxApi';
import { Button } from '../../../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../../components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../../components/ui/card';
import AppDataTable from '../../../../components/common/AppDataTable';
import { toast } from 'sonner';
import {
  Calculator,
  CheckCircle,
  Clock,
  IndianRupee,
  Loader2,
  Receipt,
} from 'lucide-react';
import TdsCalculationDialog from '../TdsCalculationDialog';
import { useActionGuard } from '../../../../hooks/useActionGuard';
import { useCreditErrorHandler } from '../../../../contexts/CreditErrorContext';
import { formatCurrency } from '../../utils/taxFormatting';
import {
  TdsAnalyticsPanel,
  TdsCalculatorPanel,
  TdsCsiPanel,
  TdsForm16aPanel,
  TdsFvuPanel,
  TdsOverviewPanels,
  TdsReportsPanel,
} from './TdsReferencePanels';
import {
  DEFAULT_TDS_FORM,
  renderTdsEntryRow,
  renderTdsSectionRow,
  TDS_ENTRIES_TABLE_HEADER,
  TDS_SECTIONS_TABLE_HEADER,
} from './tdsTableHelpers';

const TDS_SUB_TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'calculator', label: 'Calculator' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'reports', label: 'Reports' },
  { value: 'form16a', label: 'Form 16A' },
  { value: 'fvu', label: 'FVU' },
  { value: 'csi', label: 'CSI' },
];

const TdsSection = forwardRef(({ enabled = true, onOpenCertificates }, ref) => {
  const { guardAction, canPerformAction } = useActionGuard();
  const { handleCreditError } = useCreditErrorHandler();
  const [tdsSubTab, setTdsSubTab] = useState('overview');
  const [showTdsCalcDialog, setShowTdsCalcDialog] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [tdsForm, setTdsForm] = useState(DEFAULT_TDS_FORM);
  const [calculateTds] = useCalculateTdsMutation();

  const overviewActive = enabled && tdsSubTab === 'overview';
  const calculatorActive = enabled && tdsSubTab === 'calculator';
  const dialogDataActive = enabled && showTdsCalcDialog;

  const {
    data: tdsEntriesData = [],
    isLoading: tdsEntriesLoading,
    isFetching: tdsEntriesFetching,
    refetch: refetchTdsEntries,
  } = useGetTdsEntriesQuery(undefined, { skip: !overviewActive });
  const {
    data: tdsSummary = null,
    isLoading: tdsSummaryLoading,
    isFetching: tdsSummaryFetching,
    refetch: refetchTdsSummary,
  } = useGetTdsSummaryQuery(undefined, { skip: !overviewActive });
  const {
    data: tdsSectionsData = [],
    isLoading: tdsSectionsLoading,
    isFetching: tdsSectionsFetching,
    refetch: refetchTdsSections,
  } = useGetTdsSectionsQuery(undefined, { skip: !calculatorActive && !dialogDataActive });
  const {
    data: invoicesListData = EMPTY_INVOICE_LIST_RESPONSE,
    isLoading: invoicesLoading,
    isFetching: invoicesFetching,
    refetch: refetchInvoices,
  } = useGetInvoicesQuery(undefined, { skip: !dialogDataActive });

  const tdsEntries = Array.isArray(tdsEntriesData) ? tdsEntriesData : [];
  const tdsSections = Array.isArray(tdsSectionsData) ? tdsSectionsData : [];
  const invoices = getInvoiceListItems(invoicesListData);
  const canManageTds = canPerformAction('tax.calculateTds') && enabled;
  const loading = overviewActive && (tdsEntriesLoading || tdsSummaryLoading);
  const isFetching =
    tdsEntriesFetching || tdsSummaryFetching || tdsSectionsFetching || invoicesFetching;

  const refetch = async () => {
    const tasks = [];
    if (overviewActive) {
      tasks.push(refetchTdsEntries(), refetchTdsSummary());
    }
    if (calculatorActive) {
      tasks.push(refetchTdsSections());
    }
    if (dialogDataActive) {
      tasks.push(refetchInvoices());
    }
    await Promise.all(tasks);
  };

  useImperativeHandle(ref, () => ({ refetch, isFetching }));

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
      if (overviewActive) {
        await Promise.all([refetchTdsEntries(), refetchTdsSummary()]);
      }
    } catch (error) {
      if (handleCreditError(error)) return;
      toast.error(error?.data?.detail || 'Failed to calculate TDS');
    } finally {
      setCalculating(false);
    }
  };

  if (!enabled) return null;

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
      <Tabs value={tdsSubTab} onValueChange={setTdsSubTab} className="space-y-5">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-7">
          {TDS_SUB_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {tdsSubTab === 'overview' ? (
          <div className="space-y-6">
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

            <TdsOverviewPanels />

            <div className="flex gap-2">
              <Button onClick={() => setShowTdsCalcDialog(true)} data-testid="calc-tds-btn" disabled={!canManageTds}>
                <Calculator className="h-4 w-4 mr-2" />
                Calculate TDS
              </Button>
            </div>

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
          </div>
        ) : null}

        {tdsSubTab === 'calculator' ? (
          <div className="space-y-6">
            <TdsCalculatorPanel onCalculate={() => setShowTdsCalcDialog(true)} disabled={!canManageTds} />
            <Card>
              <CardHeader>
                <CardTitle>TDS Sections Reference</CardTitle>
                <CardDescription>Applicable TDS rates by section from API.</CardDescription>
              </CardHeader>
              <CardContent>
                {tdsSectionsLoading ? (
                  <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading TDS sections…
                  </div>
                ) : (
                  <AppDataTable
                    tableHeader={TDS_SECTIONS_TABLE_HEADER}
                    tableData={tdsSections}
                    renderRow={renderTdsSectionRow}
                    emptyMessage="No TDS sections found."
                  />
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}

        {tdsSubTab === 'analytics' ? <TdsAnalyticsPanel /> : null}
        {tdsSubTab === 'reports' ? <TdsReportsPanel /> : null}
        {tdsSubTab === 'form16a' ? <TdsForm16aPanel onOpenCertificates={onOpenCertificates} /> : null}
        {tdsSubTab === 'fvu' ? <TdsFvuPanel /> : null}
        {tdsSubTab === 'csi' ? <TdsCsiPanel /> : null}
      </Tabs>

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

TdsSection.displayName = 'TdsSection';

export default TdsSection;

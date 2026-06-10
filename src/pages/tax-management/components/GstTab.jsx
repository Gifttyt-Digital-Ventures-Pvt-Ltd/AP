import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { useGetInvoicesQuery } from '../../../Services/apis/invoicesVendorsApi';
import { EMPTY_INVOICE_LIST_RESPONSE, getInvoiceListItems } from '../../../Services/utils/payloadMappers';
import {
  useGetGstEntriesQuery,
  useGetGstSummaryQuery,
  useCalculateGstMutation,
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
  IndianRupee,
  Loader2,
  Receipt,
  AlertCircle,
} from 'lucide-react';
import GstCalculationDialog from './GstCalculationDialog';
import { useActionGuard } from '../../../hooks/useActionGuard';
import { formatCurrency, INDIAN_STATES } from '../utils/taxFormatting';

const GST_ENTRIES_TABLE_HEADER = [
  { key: 'invoice_number', title: 'Invoice', cellClassName: 'font-medium' },
  { key: 'vendor_name', title: 'Vendor' },
  { key: 'vendor_gstin', title: 'GSTIN', cellClassName: 'font-mono text-xs' },
  { key: 'place_of_supply', title: 'Place of Supply' },
  { key: 'taxable_amount', title: 'Taxable Amt' },
  { key: 'cgst_amount', title: 'CGST' },
  { key: 'sgst_amount', title: 'SGST' },
  { key: 'igst_amount', title: 'IGST' },
  { key: 'total_gst', title: 'Total GST', cellClassName: 'font-medium' },
  { key: 'itc_eligible', title: 'ITC' },
  { key: 'gstr2a_matched', title: 'GSTR-2A' },
];

const DEFAULT_GST_FORM = {
  invoice_id: '',
  vendor_gstin: '',
  place_of_supply: '',
  taxable_amount: 0,
  gst_rate: 18,
  is_reverse_charge: false,
};

const renderGstEntryRow = (entry, rowIndex, headers) => (
  <TableRow
    key={entry.id ?? rowIndex}
    className={cn(rowIndex % 2 === 1 && 'bg-muted/20')}
    data-testid={`gst-entry-row-${entry.id}`}
  >
    {headers.map((header) => {
      let value;

      switch (header.key) {
        case 'invoice_number':
          value = entry.invoice_number || '-';
          break;
        case 'vendor_name':
          value = entry.vendor_name || '-';
          break;
        case 'vendor_gstin':
          value = entry.vendor_gstin || '-';
          break;
        case 'place_of_supply':
          value = entry.place_of_supply || '-';
          break;
        case 'taxable_amount':
          value = formatCurrency(entry.taxable_amount);
          break;
        case 'cgst_amount':
          value = formatCurrency(entry.cgst_amount);
          break;
        case 'sgst_amount':
          value = formatCurrency(entry.sgst_amount);
          break;
        case 'igst_amount':
          value = formatCurrency(entry.igst_amount);
          break;
        case 'total_gst':
          value = formatCurrency(entry.total_gst);
          break;
        case 'itc_eligible':
          value = entry.itc_eligible ? (
            <Badge variant="outline" className="text-green-600 border-green-600">
              Eligible
            </Badge>
          ) : (
            <Badge variant="outline" className="text-red-600 border-red-600">
              Not Eligible
            </Badge>
          );
          break;
        case 'gstr2a_matched':
          value = entry.gstr2a_matched ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          );
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

const GstTab = forwardRef(({ enabled = true }, ref) => {
  const { guardAction, canPerformAction } = useActionGuard();
  const [showGstCalcDialog, setShowGstCalcDialog] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [gstForm, setGstForm] = useState(DEFAULT_GST_FORM);
  const [calculateGst] = useCalculateGstMutation();

  const {
    data: gstEntriesData = [],
    isLoading: gstEntriesLoading,
    isFetching: gstEntriesFetching,
    refetch: refetchGstEntries,
  } = useGetGstEntriesQuery(undefined, { skip: !enabled });
  const {
    data: gstSummary = null,
    isLoading: gstSummaryLoading,
    isFetching: gstSummaryFetching,
    refetch: refetchGstSummary,
  } = useGetGstSummaryQuery(undefined, { skip: !enabled });
  const {
    data: invoicesListData = EMPTY_INVOICE_LIST_RESPONSE,
    isLoading: invoicesLoading,
    isFetching: invoicesFetching,
    refetch: refetchInvoices,
  } = useGetInvoicesQuery(undefined, { skip: !enabled });

  const gstEntries = Array.isArray(gstEntriesData) ? gstEntriesData : [];
  const invoices = getInvoiceListItems(invoicesListData);
  const canManageGst = canPerformAction('tax.calculateGst') && enabled;
  const loading = enabled && (gstEntriesLoading || gstSummaryLoading || invoicesLoading);
  const isFetching = gstEntriesFetching || gstSummaryFetching || invoicesFetching;

  const refetch = async () => {
    await Promise.all([refetchGstEntries(), refetchGstSummary(), refetchInvoices()]);
  };

  useImperativeHandle(ref, () => ({
    refetch,
    isFetching,
  }));

  const handleCalculateGST = async () => {
    if (!guardAction('tax.calculateGst')) return;
    if (!gstForm.invoice_id || !gstForm.place_of_supply || gstForm.taxable_amount <= 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    setCalculating(true);
    try {
      const data = await calculateGst(gstForm).unwrap();
      toast.success(`GST calculated: ${formatCurrency(data?.entry?.total_gst)}`);
      setShowGstCalcDialog(false);
      setGstForm(DEFAULT_GST_FORM);
      await refetch();
    } catch (error) {
      toast.error(error?.data?.detail || 'Failed to calculate GST');
    } finally {
      setCalculating(false);
    }
  };

  if (loading) {
    return (
      <TabsContent value="gst" className="space-y-6">
        <div className="min-h-[40vh] flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="mt-3 text-sm text-muted-foreground">Loading GST data...</p>
          </div>
        </div>
      </TabsContent>
    );
  }

  return (
    <TabsContent value="gst" className="space-y-6">
      {gstSummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Taxable</p>
                  <p className="text-xl font-bold">{formatCurrency(gstSummary.total_taxable)}</p>
                </div>
                <IndianRupee className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">CGST Collected</p>
                  <p className="text-xl font-bold">{formatCurrency(gstSummary.total_cgst)}</p>
                </div>
                <Receipt className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">SGST Collected</p>
                  <p className="text-xl font-bold">{formatCurrency(gstSummary.total_sgst)}</p>
                </div>
                <Receipt className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">IGST Collected</p>
                  <p className="text-xl font-bold">{formatCurrency(gstSummary.total_igst)}</p>
                </div>
                <Receipt className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex gap-2">
        <Button onClick={() => setShowGstCalcDialog(true)} data-testid="calc-gst-btn" disabled={!canManageGst}>
          <Calculator className="h-4 w-4 mr-2" />
          Calculate GST
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>GST Entries</CardTitle>
          <CardDescription>Input Tax Credit (ITC) eligible entries</CardDescription>
        </CardHeader>
        <CardContent>
          <AppDataTable
            tableHeader={GST_ENTRIES_TABLE_HEADER}
            tableData={gstEntries}
            renderRow={renderGstEntryRow}
            emptyMessage="No GST entries found. Calculate GST for an invoice to create entries."
          />
        </CardContent>
      </Card>

      <GstCalculationDialog
        open={showGstCalcDialog}
        setOpen={setShowGstCalcDialog}
        gstForm={gstForm}
        setGstForm={setGstForm}
        invoices={invoices}
        formatCurrency={formatCurrency}
        indianStates={INDIAN_STATES}
        calculating={calculating}
        handleCalculateGST={handleCalculateGST}
        canManageTax={canManageGst}
      />
    </TabsContent>
  );
});

GstTab.displayName = 'GstTab';

export default GstTab;

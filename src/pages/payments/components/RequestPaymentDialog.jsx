import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { Checkbox } from '../../../components/ui/checkbox';
import AppDataTable from '../../../components/common/AppDataTable';
import { TableCell, TableRow } from '../../../components/ui/table';
import { cn } from '../../../lib/utils';
import { DEFAULT_CURRENCY, formatCurrency, normalizeCurrencyCode } from '../../../utils/currency';
import PayableSourceBadge from './PayableSourceBadge';
import MilestoneStageChip from './MilestoneStageChip';
import NetPayableBreakdown from './NetPayableBreakdown';
import {
  canAdjustFromVendorAdvance,
  getAvailableVendorAdvance,
  getGrossPayableAmount,
  getVendorAdvanceAdjustmentPreview,
} from '../utils/vendorAdvanceNetoff';

const preventDialogOutsideDismiss = (event) => {
  event.preventDefault();
};

const formatMoney = (value, currency = DEFAULT_CURRENCY) =>
  formatCurrency(Number(value || 0), currency);

const getInvoiceCurrency = (invoice = {}) =>
  normalizeCurrencyCode(invoice.currency ?? invoice.currencyCode ?? invoice.currency_code);

const getPaymentCurrency = (row = {}) =>
  row.convertToInr ? DEFAULT_CURRENCY : getInvoiceCurrency(row);

const isInrRow = (row = {}) => getInvoiceCurrency(row) === DEFAULT_CURRENCY;

const getConvertedInrAmount = (invoice = {}) =>
  Number(invoice.matchingInrValue ?? invoice.matching_inr_value ?? 0);

const getInvoiceActualInrAmount = (invoice = {}) =>
  Number(invoice.actualInrAmount ?? invoice.actual_inr_amount ?? 0);

const getInvoiceRequestedAmount = (invoice = {}, amountDue = 0, convertToInr = false) => {
  if (!convertToInr) return amountDue;

  const actualInrAmount = getInvoiceActualInrAmount(invoice);
  if (actualInrAmount > 0) return actualInrAmount;

  const requestedAmount = Number(
    invoice.requestedAmount ??
      invoice.requested_amount ??
      invoice.paymentAmount ??
      invoice.payment_amount ??
      0,
  );

  if (requestedAmount > 0) return requestedAmount;

  return getConvertedInrAmount(invoice);
};

const resolvePayrunCurrency = (rows = []) => {
  if (rows.some((row) => row.convertToInr)) return DEFAULT_CURRENCY;

  const currencies = [...new Set(rows.map((row) => getPaymentCurrency(row)))];
  return currencies.length === 1 ? currencies[0] : DEFAULT_CURRENCY;
};

const clippedTableText = (value, className = '') => {
  const text = String(value || '-');
  return (
    <span className={cn('block min-w-0 truncate text-left', className)} title={text}>
      {text}
    </span>
  );
};

const getInvoiceAmount = (invoice = {}) =>
  Number(
    invoice.netPayableAmount ??
      invoice.net_payable_amount ??
      invoice.payableAmount ??
      invoice.payable_amount ??
      invoice.netPayableAfterAdvance ??
      invoice.net_payable_after_advance ??
      invoice.netAmount ??
      invoice.net_amount ??
      invoice.netPayable ??
      invoice.net_payable ??
      invoice.amount ??
      invoice.totalAmount ??
      invoice.total_amount ??
      invoice.amountDue ??
      0,
  );

const isAdvanceStageRow = (row = {}) =>
  row.sourceType === 'ADVANCE' ||
  (row.sourceType === 'OBLIGATION' && row.isAdvance !== false && row.triggerStage !== 'TI');

const getAdvanceAdjustedTotal = (invoice = {}) =>
  Number(invoice.advanceAdjustedTotal ?? invoice.advance_adjusted_total ?? 0);

const getNetPayableAfterAdvance = (invoice = {}) =>
  Number(invoice.netPayableAfterAdvance ?? invoice.net_payable_after_advance ?? 0);

const getInvoiceGstAmount = (invoice = {}) =>
  Number(
    invoice.gstAmount ??
      invoice.gst_amount ??
      invoice.taxAmount ??
      invoice.tax_amount ??
      Math.round(getInvoiceAmount(invoice) * 0.18),
  );

const RequestPaymentDialog = ({
  open,
  onOpenChange,
  invoices,
  onCreate,
  submitting = false,
}) => {
  const [rows, setRows] = useState([]);
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    if (!open) return;
    setRemarks('');
    setRows(
      invoices.map((invoice) => {
        const amountDue = getInvoiceAmount(invoice);
        const gstAmount = getInvoiceGstAmount(invoice);
        const currency = getInvoiceCurrency(invoice);
        const convertToInr = Boolean(invoice.convertToInr ?? invoice.convert_to_inr);
        const matchingInrValue = getConvertedInrAmount(invoice);
        const requestedAmount = getInvoiceRequestedAmount(invoice, amountDue, convertToInr);
        return {
          id: invoice.id,
          isAdvance: invoice.isAdvance,
          triggerStage: invoice.triggerStage,
          sharePct: invoice.sharePct,
          milestoneLabel: invoice.milestoneLabel,
          orderNumber: invoice.orderNumber,
          paymentScheduleId: invoice.paymentScheduleId,
          scheduleRowId: invoice.scheduleRowId,
          scheduledAmount: invoice.scheduledAmount,
          triggeredAmount: invoice.triggeredAmount,
          rolledInAmount: invoice.rolledInAmount,
          paidAmount: invoice.paidAmount,
          earlierMilestonesPaidAmount: invoice.earlierMilestonesPaidAmount,
          priorMilestonePaidAmount: invoice.priorMilestonePaidAmount,
          totalPaidAgainstOrder: invoice.totalPaidAgainstOrder,
          orderGrossAmount: invoice.orderGrossAmount,
          remainingOrderAmount: invoice.remainingOrderAmount,
          milestoneBreakdown: invoice.milestoneBreakdown,
          grossAmount: invoice.grossAmount,
          advanceAdjustedAmount: invoice.advanceAdjustedAmount,
          payableAmount: invoice.payableAmount,
          tdsAmount: invoice.tdsAmount,
          vendorName: invoice.vendorName || '-',
          invoiceNumber:
            invoice.invoiceNumber ||
            invoice.milestoneLabel ||
            invoice.advanceNumber ||
            invoice.orderNumber ||
            '-',
          currency,
          convertToInr,
          matchingInrValue,
          gstValid: true,
          holdGst: false,
          gstAmount: isAdvanceStageRow(invoice) ? 0 : gstAmount,
          amountDue,
          requestedAmount,
          originalAmount:
            invoice.originalAmount ??
            invoice.original_amount ??
            invoice.totalAmount ??
            invoice.total_amount ??
            invoice.amount,
          advanceAdjustedTotal: getAdvanceAdjustedTotal(invoice),
          netPayableAfterAdvance: getNetPayableAfterAdvance(invoice),
          netPayableAmount:
            invoice.netPayableAmount ??
            invoice.net_payable_amount ??
            requestedAmount,
          sourceType: invoice.sourceType || 'INVOICE',
          sourceId: invoice.sourceId || invoice.source_id,
          payableKey: invoice.payableKey,
          invoiceId: invoice.invoiceId || invoice.id,
          obligationId:
            invoice.obligationId ||
            invoice.obligation_id ||
            ((invoice.sourceType || 'INVOICE') === 'OBLIGATION' ? invoice.sourceId || invoice.source_id || invoice.id : undefined),
          advanceId:
            invoice.advanceId ||
            invoice.advance_id ||
            ((invoice.sourceType || 'INVOICE') === 'ADVANCE' ? invoice.sourceId || invoice.source_id || invoice.id : undefined),
          hasAdvanceAdjustment: Boolean(
            invoice.hasAdvanceAdjustment ||
              invoice.advanceAdjustedTotal != null ||
              invoice.advance_adjusted_total != null ||
              invoice.netPayableAfterAdvance != null ||
              invoice.net_payable_after_advance != null,
          ),
          bankDetails: invoice.accountNumber || invoice.bankAccount || 'Beneficiary verified',
          availableVendorAdvance: getAvailableVendorAdvance(invoice),
          canAdjustFromVendorAdvance: canAdjustFromVendorAdvance(invoice),
          grossPayableAmount: getGrossPayableAmount(invoice),
          bankPaymentAmount: invoice.bankPaymentAmount ?? invoice.bank_payment_amount ?? requestedAmount,
          adjustFromVendorAdvance: false,
        };
      }),
    );
  }, [invoices, open]);

  const getPayableAmount = (row) =>
    Math.max(0, Number(row.amountDue || 0) - (row.holdGst ? Number(row.gstAmount || 0) : 0));

  const getAdvancePreview = (row) =>
    getVendorAdvanceAdjustmentPreview({
      payable: row,
      enabled: row.adjustFromVendorAdvance,
      amount: null,
      grossPayable: row.requestedAmount,
    });

  const getPaymentAmount = (row) => Number(row.requestedAmount || 0);

  const getPreviewPaymentAmount = (row) => getAdvancePreview(row).bankPaymentAmount;

  const totalRequested = rows.reduce((sum, row) => sum + Number(row.requestedAmount || 0), 0);
  const totalBankPayment = rows.reduce((sum, row) => sum + getPreviewPaymentAmount(row), 0);
  const totalAdvanceApplied = rows.reduce((sum, row) => sum + getAdvancePreview(row).advanceAppliedAmount, 0);

  const updateRow = (rowId, updater) => {
    setRows((prev) => prev.map((row) => (row.id === rowId ? updater(row) : row)));
  };

  const submit = () => {
    if (rows.length === 0) {
      toast.error('Add at least one invoice');
      return;
    }

    const missingInrAmountRow = rows.find(
      (row) => row.convertToInr && Number(row.requestedAmount || 0) <= 0,
    );
    if (missingInrAmountRow) {
      toast.error(`Actual INR Amount is required for ${missingInrAmountRow.invoiceNumber}`);
      return;
    }

    onCreate({
      currency: resolvePayrunCurrency(rows),
      remarks,
      items: rows.map((row) => {
        const sourceType = row.sourceType || 'INVOICE';
        const sourceId =
          row.sourceId ||
          (sourceType === 'OBLIGATION' ? row.obligationId : undefined) ||
          (sourceType === 'ADVANCE' ? row.advanceId : undefined) ||
          row.invoiceId ||
          row.id;

        return {
          sourceType,
          ...(sourceType === 'OBLIGATION'
            ? { sourceId, obligationId: row.obligationId || sourceId }
            : sourceType === 'ADVANCE'
              ? { sourceId, advanceId: row.advanceId || sourceId }
              : { invoiceId: row.invoiceId || row.id }),
          invoiceNumber: row.invoiceNumber,
          currency: getPaymentCurrency(row),
          requestedAmount: Number(row.requestedAmount || 0),
          netPayableAmount: Number(row.requestedAmount || 0),
          holdGst: row.holdGst,
          gstAmount: row.holdGst ? Number(row.gstAmount || 0) : 0,
          paymentAmount: getPaymentAmount(row),
          ...(getAdvancePreview(row).adjustFromVendorAdvance
            ? {
                adjustFromVendorAdvance: true,
              }
            : {}),
          ...(row.convertToInr
            ? { actualInrAmount: Number(row.requestedAmount || 0) }
            : {}),
        };
      }),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] max-w-6xl flex-col overflow-hidden"
        onInteractOutside={preventDialogOutsideDismiss}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle>Review & Confirm Payment Request</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          <div className="min-w-0 overflow-hidden rounded-lg border">
            <AppDataTable
              tableHeader={[
                { key: 'vendorName', title: 'Vendor', headerClassName: 'w-[140px] min-w-[140px] text-left' },
                { key: 'source', title: 'Source', headerClassName: 'w-[120px] min-w-[120px] text-left' },
                { key: 'invoiceNumber', title: 'Reference', headerClassName: 'w-[170px] min-w-[170px] text-left' },
                { key: 'gstValidation', title: 'GST Validation', headerClassName: 'w-[130px] min-w-[130px] text-left' },
                { key: 'gstAmount', title: 'Tax Amount', headerClassName: 'w-[120px] min-w-[120px] text-left', cellClassName: 'text-left' },
                { key: 'amountDue', title: 'Net Payable', headerClassName: 'w-[180px] min-w-[180px] text-left', cellClassName: 'text-left font-medium' },
                { key: 'vendorAdvance', title: 'Vendor Advance', headerClassName: 'w-[170px] min-w-[170px] text-left', cellClassName: 'text-left' },
                { key: 'requestedAmount', title: 'Requested Amount', headerClassName: 'w-[160px] min-w-[160px] text-left', cellClassName: 'text-left' },
                { key: 'bankPaymentAmount', title: 'Estimated Bank Amount', headerClassName: 'w-[200px] min-w-[200px] text-left', cellClassName: 'text-left' },
                { key: 'actions', title: 'Action', headerClassName: 'w-[100px] min-w-[100px] text-left' },
              ]}
              tableData={rows}
              rowKey="id"
              tableClassName="min-w-[1490px] text-sm"
              tableContainerClassName="max-w-full overflow-x-auto"
              emptyMessage="No invoices selected"
              renderRow={(row) => (
                <TableRow key={row.id}>
                  <TableCell className="w-[140px] min-w-[140px] overflow-hidden whitespace-nowrap px-3 py-3 text-left font-medium">
                    {clippedTableText(row.vendorName)}
                  </TableCell>
                  <TableCell className="w-[120px] min-w-[120px] overflow-hidden px-3 py-3 text-left">
                    <div className="space-y-1">
                      <PayableSourceBadge sourceType={row.sourceType} isAdvance={row.isAdvance} />
                      <MilestoneStageChip stage={row.triggerStage} sharePct={row.sharePct} />
                    </div>
                  </TableCell>
                  <TableCell className="w-[170px] min-w-[170px] overflow-hidden whitespace-nowrap px-3 py-3 text-left">
                    <div className="min-w-0 space-y-0.5">
                      {clippedTableText(row.invoiceNumber)}
                      {row.orderNumber ? (
                        <span className="block truncate text-[11px] text-muted-foreground" title={row.orderNumber}>
                          {row.orderNumber}
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="w-[130px] min-w-[130px] overflow-hidden whitespace-nowrap px-3 py-3 text-left">
                    {isAdvanceStageRow(row) ? (
                      <span className="text-muted-foreground">-</span>
                    ) : (
                      <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2 py-1 text-xs font-medium text-green-800">
                        Pass
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="w-[120px] min-w-[120px] overflow-hidden whitespace-nowrap px-3 py-3 text-left">
                    {clippedTableText(formatMoney(row.gstAmount, row.currency))}
                  </TableCell>
                  <TableCell className="w-[180px] min-w-[180px] overflow-hidden px-3 py-3 text-left font-medium">
                    <div className="min-w-0 space-y-1 leading-tight">
                      <NetPayableBreakdown payable={row} />
                      {row.convertToInr && row.matchingInrValue > 0 ? (
                        <span className="block truncate text-[11px] font-normal text-muted-foreground">
                          INR: {formatMoney(row.matchingInrValue, DEFAULT_CURRENCY)}
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="w-[170px] min-w-[170px] overflow-hidden whitespace-nowrap px-3 py-3 text-left">
                    {row.canAdjustFromVendorAdvance ? (
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-xs font-medium">
                          <Checkbox
                            checked={row.adjustFromVendorAdvance}
                            onCheckedChange={(checked) =>
                              updateRow(row.id, (current) => ({
                                ...current,
                                adjustFromVendorAdvance: Boolean(checked),
                              }))
                            }
                          />
                          Adjust
                        </label>
                        <span className="block text-[11px] text-muted-foreground">
                          Available {formatMoney(row.availableVendorAdvance, row.currency)}
                        </span>
                        {row.adjustFromVendorAdvance ? (
                          <span className="block text-[11px] text-muted-foreground">
                            Estimated apply up to {formatMoney(getAdvancePreview(row).advanceAppliedAmount, row.currency)}
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">No advance</span>
                    )}
                  </TableCell>
                  <TableCell className="w-[160px] min-w-[160px] overflow-hidden whitespace-nowrap px-3 py-3 text-left">
                    <span className="font-medium text-slate-900">
                      {formatMoney(row.requestedAmount, getPaymentCurrency(row))}
                    </span>
                  </TableCell>
                  <TableCell className="w-[200px] min-w-[200px] overflow-hidden whitespace-nowrap px-3 py-3 text-left">
                    <div className="space-y-0.5">
                      <span className="font-medium text-slate-900">
                        {formatMoney(getPreviewPaymentAmount(row), getPaymentCurrency(row))}
                      </span>
                      {getAdvancePreview(row).advanceAppliedAmount > 0 ? (
                        <span className="block text-[11px] text-muted-foreground">
                          Estimated advance -{formatMoney(getAdvancePreview(row).advanceAppliedAmount, getPaymentCurrency(row))}
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="w-[100px] min-w-[100px] overflow-hidden whitespace-nowrap px-3 py-3 text-left">
                    {isInrRow(row) ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setRows((prev) => prev.filter((item) => item.id !== row.id))}
                      >
                        Remove
                      </Button>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              )}
            />
          </div>
          <div className="flex items-center justify-end rounded-lg bg-muted px-4 py-3">
            <div className="text-right text-sm">
              <div>
                <span className="text-muted-foreground">Total Requested Amount:&nbsp;</span>
                <strong>{formatMoney(totalRequested, resolvePayrunCurrency(rows))}</strong>
              </div>
              {totalAdvanceApplied > 0 ? (
                <>
                  <div className="text-muted-foreground">
                    Vendor Advance Applied: -{formatMoney(totalAdvanceApplied, resolvePayrunCurrency(rows))}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Estimated Bank Payment Amount:&nbsp;</span>
                    <strong>{formatMoney(totalBankPayment, resolvePayrunCurrency(rows))}</strong>
                  </div>
                </>
              ) : null}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Remarks</Label>
            <Textarea
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              placeholder="Optional notes for approval"
            />
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
           This payment request will follow your organization's Payment Approval Workflow. If no approvers are configured, it will be routed to the Generic Admin for approval.
          </div>
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={rows.length === 0 || submitting}>
            {submitting ? 'Creating...' : 'Create Payrun'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RequestPaymentDialog;

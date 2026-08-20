import React, { useMemo } from 'react';
import { Button } from '../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '../../../components/ui/tooltip';
import { formatCurrency } from '../../../utils/currency';
import PayableSourceBadge from './PayableSourceBadge';
import MilestoneStageChip from './MilestoneStageChip';

const ClippedInvoiceLabel = ({ invoice }) => {
  const invoiceNumber = String(
    invoice?.invoiceNumber ||
      invoice?.milestoneLabel ||
      invoice?.advanceNumber ||
      invoice?.orderNumber ||
      invoice?.referenceNumber ||
      '',
  ).trim() || '-';
  const vendorName = String(invoice?.vendorName || '').trim();
  const label = vendorName
    ? `${invoiceNumber} · ${vendorName}`
    : invoiceNumber;

  if (label === '-') return label;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="block min-w-0 truncate font-medium">{label}</span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs break-words">
        {label}
      </TooltipContent>
    </Tooltip>
  );
};

const preventDialogOutsideDismiss = (event) => {
  event.preventDefault();
};

const getNetPayableAmount = (invoice = {}) =>
  Number(invoice.netPayableAmount ?? invoice.net_payable_amount ?? invoice.amount ?? 0);

// Confirm record-payment for invoices selected on the pending list.
const RecordPaymentDialog = ({
  open,
  onOpenChange,
  formData,
  setFormData,
  selectedInvoices = [],
  handleSubmit,
  submitting = false,
}) => {
  const selectedTotal = selectedInvoices.reduce((sum, invoice) => sum + getNetPayableAmount(invoice), 0);
  const hasConvertedInvoice = selectedInvoices.some((invoice) => Boolean(invoice.convertToInr));
  const maxPaymentDate = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[calc(100vw-2rem)] max-w-lg overflow-hidden"
        data-testid="record-payment-dialog"
        onInteractOutside={preventDialogOutsideDismiss}
      >
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="min-w-0 space-y-4">
          <div className="min-w-0">
            <Label>Selected Payables ({selectedInvoices.length})</Label>
            <div className="mt-2 max-h-32 max-w-full overflow-x-hidden overflow-y-auto rounded-md border border-input bg-muted/30 px-3 py-2 text-sm">
              {selectedInvoices.length > 0 ? (
                <ul className="min-w-0 space-y-1">
                  {selectedInvoices.map((invoice) => (
                    <li
                      key={invoice.id}
                      className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-1">
                          <PayableSourceBadge sourceType={invoice.sourceType} isAdvance={invoice.isAdvance} />
                          <MilestoneStageChip stage={invoice.triggerStage} sharePct={invoice.sharePct} />
                        </div>
                        <ClippedInvoiceLabel invoice={invoice} />
                      </div>
                      <span className="shrink-0 whitespace-nowrap text-muted-foreground">
                        {formatCurrency(getNetPayableAmount(invoice), invoice.currency || 'INR')}
                      </span>
                      {Number(invoice.advanceAdjustedAmount ?? invoice.advanceAdjustedTotal ?? 0) > 0 || Number(invoice.tdsAmount ?? 0) > 0 ? (
                        <span className="col-span-2 text-xs text-muted-foreground">
                          Gross: {formatCurrency(
                            invoice.grossAmount ?? invoice.originalAmount ?? invoice.totalAmount ?? invoice.amount ?? 0,
                            invoice.currency || 'INR',
                          )} · Advance Adjusted: -{formatCurrency(
                            invoice.advanceAdjustedAmount ?? invoice.advanceAdjustedTotal ?? invoice.advance_adjusted_total ?? 0,
                            invoice.currency || 'INR',
                          )} · TDS: -{formatCurrency(
                            invoice.tdsAmount ?? invoice.tds_amount ?? 0,
                            invoice.currency || 'INR',
                          )} · Net Payable: {formatCurrency(
                            getNetPayableAmount(invoice),
                            invoice.currency || 'INR',
                          )}
                        </span>
                      ) : null}
                      {invoice.convertToInr && Number(invoice.matchingInrValue) > 0 ? (
                        <span className="col-span-2 text-xs text-muted-foreground">
                          Converted INR Amount: {formatCurrency(invoice.matchingInrValue, 'INR')}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">No invoices selected</p>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Total: {hasConvertedInvoice ? 'INR payment required' : formatCurrency(selectedTotal, selectedInvoices[0]?.currency || 'INR')} · Status will be set to <strong>PAID</strong>
            </p>
          </div>

          <div>
            <Label htmlFor="record-payment-date">Payment Date *</Label>
            <Input
              id="record-payment-date"
              type="date"
              value={formData.paymentDate}
              max={maxPaymentDate}
              onChange={(e) => setFormData((prev) => ({ ...prev, paymentDate: e.target.value }))}
              required
              data-testid="record-payment-date-input"
            />
          </div>

          <div>
            <Label htmlFor="record-payment-method">Payment Method *</Label>
            <Select
              value={formData.payment_method || 'Bank Transfer'}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, payment_method: value }))}
            >
              <SelectTrigger id="record-payment-method" data-testid="record-payment-method-select">
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                <SelectItem value="Cheque">Cheque</SelectItem>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Credit Card">Credit Card</SelectItem>
                <SelectItem value="NEFT">NEFT</SelectItem>
                <SelectItem value="RTGS">RTGS</SelectItem>
                <SelectItem value="IMPS">IMPS</SelectItem>
                <SelectItem value="UPI">UPI</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="record-payment-reference">Reference Number</Label>
            <Input
              id="record-payment-reference"
              value={formData.reference_number || ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, reference_number: e.target.value }))
              }
              placeholder="UTR / transaction reference"
              data-testid="record-payment-reference-input"
            />
          </div>

          {hasConvertedInvoice ? (
            <div>
              <Label htmlFor="record-payment-actual-inr">Actual INR Amount *</Label>
              <Input
                id="record-payment-actual-inr"
                type="number"
                min="0"
                step="0.01"
                value={formData.actualInrAmount || ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, actualInrAmount: e.target.value }))
                }
                placeholder="Enter settlement amount in INR"
                data-testid="record-payment-actual-inr-input"
              />
            </div>
          ) : null}

          <Button
            type="submit"
            className="w-full"
            disabled={submitting || selectedInvoices.length === 0}
            data-testid="record-payment-submit-button"
          >
            {submitting ? 'Recording...' : 'Record Payment'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RecordPaymentDialog;

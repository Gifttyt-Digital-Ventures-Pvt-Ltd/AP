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

const ClippedInvoiceLabel = ({ invoice }) => {
  const invoiceNumber = String(invoice?.invoiceNumber || '').trim() || '-';
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
  const selectedTotal = selectedInvoices.reduce((sum, invoice) => sum + (invoice.amount || 0), 0);
  const maxPaymentDate = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="record-payment-dialog">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Selected Invoices ({selectedInvoices.length})</Label>
            <div className="mt-2 max-h-32 overflow-x-hidden overflow-y-auto rounded-md border border-input bg-muted/30 px-3 py-2 text-sm">
              {selectedInvoices.length > 0 ? (
                <ul className="space-y-1">
                  {selectedInvoices.map((invoice) => (
                    <li
                      key={invoice.id}
                      className="flex min-w-0 items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <ClippedInvoiceLabel invoice={invoice} />
                      </div>
                      <span className="shrink-0 text-muted-foreground">
                        ₹{Number(invoice.amount || 0).toLocaleString('en-IN')}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">No invoices selected</p>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Total: ₹{selectedTotal.toLocaleString('en-IN')} · Status will be set to <strong>PAID</strong>
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

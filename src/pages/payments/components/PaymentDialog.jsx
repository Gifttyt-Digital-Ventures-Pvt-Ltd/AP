import React, { useMemo } from 'react';
import { Button } from '../../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { Plus } from 'lucide-react';
import BankAccountSelectField from '../../../components/banking/BankAccountSelectField';

const getInvoiceOptionLabel = (invoice) =>
  `${invoice?.invoiceNumber || '-'} - ${invoice?.vendorName || '-'} - ₹${Number(
    invoice?.amount || 0,
  ).toLocaleString('en-IN')}`;

// Dialog used to record a single payment against a pending invoice.
const PaymentDialog = ({
  dialogOpen,
  setDialogOpen,
  resetForm,
  formData,
  setFormData,
  invoices,
  bankAccounts,
  showBankAccountField = false,
  handleSubmit,
  canCreatePayment,
}) => {
  const selectedInvoice = useMemo(
    () => invoices.find((invoice) => String(invoice.id) === String(formData.invoice_id)),
    [formData.invoice_id, invoices],
  );
  const selectedInvoiceLabel = selectedInvoice
    ? getInvoiceOptionLabel(selectedInvoice)
    : '';

  if (!canCreatePayment) return null;

  return (
  <Dialog
    open={dialogOpen}
    onOpenChange={(open) => {
      setDialogOpen(open);
      if (!open) resetForm();
    }}
  >
    <DialogTrigger asChild>
      <Button variant="outline" data-testid="new-payment-button">
        <Plus className="h-4 w-4 mr-2" />
        Single Payment
      </Button>
    </DialogTrigger>
    <DialogContent className="max-w-lg overflow-hidden" data-testid="payment-dialog">
      <DialogHeader>
        <DialogTitle>Record Payment</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="min-w-0">
          <Label htmlFor="invoice_id">Invoice *</Label>
          <Select
            value={formData.invoice_id || ""}
            onValueChange={(value) => setFormData({ ...formData, invoice_id: value })}
          >
            <SelectTrigger
              id="invoice_id"
              data-testid="payment-invoice-select"
              title={selectedInvoiceLabel || undefined}
              className="min-w-0 overflow-hidden [&>span]:min-w-0 [&>span]:max-w-[calc(100%-1.25rem)] [&>span]:truncate"
            >
              <SelectValue placeholder="Select invoice" />
            </SelectTrigger>
            <SelectContent className="max-w-[var(--radix-select-trigger-width)]">
              {invoices.map((invoice) => {
                const label = getInvoiceOptionLabel(invoice);
                return (
                  <SelectItem
                    key={invoice.id}
                    value={invoice.id}
                    className="items-start py-2"
                    title={label}
                  >
                    <span className="block whitespace-normal break-words pr-6">
                      {label}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="paymentDate">Payment Date *</Label>
          <Input
            id="paymentDate"
            type="date"
            value={formData.paymentDate}
            onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
            required
            data-testid="payment-date-input"
          />
        </div>

        <div>
          <Label htmlFor="payment_method">Payment Method *</Label>
          <Select
            value={formData.payment_method || "Bank Transfer"}
            onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
          >
            <SelectTrigger id="payment_method" data-testid="payment-method-select">
              <SelectValue placeholder="Select payment method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
              <SelectItem value="Cheque">Cheque</SelectItem>
              <SelectItem value="Cash">Cash</SelectItem>
              <SelectItem value="Credit Card">Credit Card</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {showBankAccountField && (
          <BankAccountSelectField
            id="bank_account_id"
            value={formData.bank_account_id || ''}
            onChange={(value) => setFormData({ ...formData, bank_account_id: value })}
            accounts={bankAccounts}
            activeOnly
            testId="payment-bank-select"
          />
        )}

        <div>
          <Label htmlFor="reference_number">Reference Number</Label>
          <Input
            id="reference_number"
            value={formData.reference_number}
            onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
            data-testid="payment-reference-input"
          />
        </div>

        <div>
          <Label htmlFor="notes">Notes</Label>
          <textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
            data-testid="payment-notes-input"
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          data-testid="payment-submit-button"
          disabled={!canCreatePayment}
        >
          Record Payment
      </Button>
    </form>
  </DialogContent>
</Dialog>
  );
};

export default PaymentDialog;

import React from 'react';
import { Button } from '../../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Plus } from 'lucide-react';

// Dialog used to record a single payment against a pending invoice.
const PaymentDialog = ({
  dialogOpen,
  setDialogOpen,
  resetForm,
  formData,
  setFormData,
  invoices,
  bankAccounts,
  handleSubmit,
  canCreatePayment,
}) => {
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
    <DialogContent data-testid="payment-dialog">
      <DialogHeader>
        <DialogTitle>Record Payment</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="invoice_id">Invoice *</Label>
          <select
            id="invoice_id"
            value={formData.invoice_id}
            onChange={(e) => setFormData({ ...formData, invoice_id: e.target.value })}
            className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            required
            data-testid="payment-invoice-select"
          >
            <option value="">Select invoice</option>
            {invoices.map((invoice) => (
              <option key={invoice.id} value={invoice.id}>
                {invoice.invoice_number} - {invoice.vendor_name} - {'\u20B9'}{invoice.amount.toLocaleString('en-IN')}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="payment_date">Payment Date *</Label>
          <Input
            id="payment_date"
            type="date"
            value={formData.payment_date}
            onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
            required
            data-testid="payment-date-input"
          />
        </div>

        <div>
          <Label htmlFor="payment_method">Payment Method *</Label>
          <select
            id="payment_method"
            value={formData.payment_method}
            onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
            className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            data-testid="payment-method-select"
          >
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Check">Check</option>
            <option value="Cash">Cash</option>
            <option value="Credit Card">Credit Card</option>
          </select>
        </div>

        <div>
          <Label htmlFor="bank_account_id">Bank Account</Label>
          <select
            id="bank_account_id"
            value={formData.bank_account_id}
            onChange={(e) => setFormData({ ...formData, bank_account_id: e.target.value })}
            className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            data-testid="payment-bank-select"
          >
            <option value="">Select bank account</option>
            {bankAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.account_name} - {account.bank_name}
              </option>
            ))}
          </select>
        </div>

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

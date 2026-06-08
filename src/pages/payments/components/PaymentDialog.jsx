import React from 'react';
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
          <Select
            value={formData.invoice_id || ""}
            onValueChange={(value) => setFormData({ ...formData, invoice_id: value })}
          >
            <SelectTrigger id="invoice_id" data-testid="payment-invoice-select">
              <SelectValue placeholder="Select invoice" />
            </SelectTrigger>
            <SelectContent>
            {invoices.map((invoice) => (
              <SelectItem key={invoice.id} value={invoice.id}>
                {invoice.invoiceNumber} - {invoice.vendorName} - {'\u20B9'}{invoice.amount.toLocaleString('en-IN')}
              </SelectItem>
            ))}
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
          <div>
            <Label htmlFor="bank_account_id">Bank Account *</Label>
            <Select
              value={formData.bank_account_id || ""}
              onValueChange={(value) => setFormData({ ...formData, bank_account_id: value })}
            >
              <SelectTrigger id="bank_account_id" data-testid="payment-bank-select">
                <SelectValue placeholder="Select bank account" />
              </SelectTrigger>
              <SelectContent>
              {bankAccounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.account_name || account.bank_name} - {account.account_number || account.bank_name}
                </SelectItem>
              ))}
              </SelectContent>
            </Select>
          </div>
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

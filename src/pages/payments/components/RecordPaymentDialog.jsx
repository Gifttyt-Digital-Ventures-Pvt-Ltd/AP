import React from 'react';
import { Button } from '../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';

// Confirm record-payment for invoices selected on the pending list (API: invoiceNumbers only).
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="record-payment-dialog">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Selected Invoices ({selectedInvoices.length})</Label>
            <div className="mt-2 max-h-32 overflow-y-auto rounded-md border border-input bg-muted/30 px-3 py-2 text-sm">
              {selectedInvoices.length > 0 ? (
                <ul className="space-y-1">
                  {selectedInvoices.map((invoice) => (
                    <li key={invoice.id} className="flex justify-between gap-2">
                      <span className="font-medium">{invoice.invoice_number || '-'}</span>
                      <span className="text-muted-foreground shrink-0">
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
              value={formData.payment_date}
              onChange={(e) => setFormData((prev) => ({ ...prev, payment_date: e.target.value }))}
              required
              data-testid="record-payment-date-input"
            />
          </div>

          <div>
            <Label htmlFor="record-payment-method">Payment Method *</Label>
            <select
              id="record-payment-method"
              value={formData.payment_method}
              onChange={(e) => setFormData((prev) => ({ ...prev, payment_method: e.target.value }))}
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              data-testid="record-payment-method-select"
            >
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Check">Check</option>
              <option value="Cash">Cash</option>
              <option value="Credit Card">Credit Card</option>
              <option value="NEFT">NEFT</option>
              <option value="RTGS">RTGS</option>
              <option value="IMPS">IMPS</option>
              <option value="UPI">UPI</option>
            </select>
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

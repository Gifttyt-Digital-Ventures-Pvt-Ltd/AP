import React from 'react';
import { Button } from '../../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Plus } from 'lucide-react';

// Dialog for creating a connected bank account.
const BankAccountDialog = ({ dialogOpen, setDialogOpen, resetForm, formData, setFormData, handleSubmit }) => (
  <Dialog
    open={dialogOpen}
    onOpenChange={(open) => {
      setDialogOpen(open);
      if (!open) resetForm();
    }}
  >
    <DialogTrigger asChild>
      <Button data-testid="add-bank-account-button">
        <Plus className="h-4 w-4 mr-2" />
        Add Bank Account
      </Button>
    </DialogTrigger>
    <DialogContent data-testid="bank-account-dialog">
      <DialogHeader>
        <DialogTitle>Add Bank Account</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="account_name">Account Name *</Label>
          <Input
            id="account_name"
            value={formData.account_name}
            onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
            required
            data-testid="account-name-input"
          />
        </div>
        <div>
          <Label htmlFor="bank_name">Bank Name *</Label>
          <Input
            id="bank_name"
            value={formData.bank_name}
            onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
            required
            data-testid="bank-name-input"
          />
        </div>
        <div>
          <Label htmlFor="account_number">Account Number *</Label>
          <Input
            id="account_number"
            value={formData.account_number}
            onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
            required
            data-testid="account-number-input"
          />
        </div>
        <div>
          <Label htmlFor="account_type">Account Type</Label>
          <select
            id="account_type"
            value={formData.account_type}
            onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
            className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            data-testid="account-type-select"
          >
            <option value="Checking">Checking</option>
            <option value="Savings">Savings</option>
            <option value="Business">Business</option>
          </select>
        </div>
        <div>
          <Label htmlFor="currency">Currency</Label>
          <select
            id="currency"
            value={formData.currency}
            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
            className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            data-testid="account-currency-select"
          >
            <option value="INR">INR</option>
            <option value="USD">USD</option>
            <option value="AUD">AUD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </select>
        </div>
        <Button type="submit" className="w-full" data-testid="bank-account-submit-button">
          Add Account
        </Button>
      </form>
    </DialogContent>
  </Dialog>
);

export default BankAccountDialog;

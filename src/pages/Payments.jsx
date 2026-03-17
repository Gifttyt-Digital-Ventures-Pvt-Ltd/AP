import React, { useEffect, useState } from 'react';
import {
  useGetPaymentsQuery,
  useGetInvoicesQuery,
  useGetBankAccountsQuery,
  useBulkReleasePaymentsMutation,
  useCreatePaymentMutation,
} from '../Services/apiSlice';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const safeLower = (value) => String(value ?? '').toLowerCase();

const safeFormatDate = (value, pattern = 'dd MMM yy') => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : format(date, pattern);
};

export const Payments = () => {
  const {
    data: paymentsData = [],
    isError: paymentsError,
  } = useGetPaymentsQuery();
  const {
    data: invoicesData = [],
    isError: invoicesError,
  } = useGetInvoicesQuery({ status: 'Pending Payment' });
  const {
    data: bankAccountsData = [],
    isError: bankAccountsError,
  } = useGetBankAccountsQuery();
  const [bulkReleasePayments] = useBulkReleasePaymentsMutation();
  const [createPayment] = useCreatePaymentMutation();
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    invoice_id: '',
    payment_date: '',
    payment_method: 'Bank Transfer',
    bank_account_id: '',
    reference_number: '',
    notes: ''
  });

  const normalizePayment = (payment = {}) => ({
    ...payment,
    invoice_number: payment.invoice_number ?? payment.invoiceNumber,
    vendor_name: payment.vendor_name ?? payment.vendorName,
    payment_date: payment.payment_date ?? payment.paymentDate,
    payment_method: payment.payment_method ?? payment.paymentMethod,
    reference_number: payment.reference_number ?? payment.referenceNumber,
  });

  const normalizeInvoice = (invoice = {}) => ({
    ...invoice,
    invoice_number: invoice.invoice_number ?? invoice.invoiceNumber,
    vendor_name: invoice.vendor_name ?? invoice.vendorName,
    invoice_date: invoice.invoice_date ?? invoice.invoiceDate,
    due_date: invoice.due_date ?? invoice.dueDate,
  });

  const payments = Array.isArray(paymentsData)
    ? paymentsData.map(normalizePayment)
    : [];
  const invoices = Array.isArray(invoicesData)
    ? invoicesData.map(normalizeInvoice)
    : [];
  const bankAccounts = Array.isArray(bankAccountsData) ? bankAccountsData : [];

  useEffect(() => {
    if (paymentsError) toast.error('Failed to load payments');
  }, [paymentsError]);

  useEffect(() => {
    if (invoicesError) toast.error('Failed to load invoices');
  }, [invoicesError]);

  useEffect(() => {
    if (bankAccountsError) toast.error('Failed to load bank accounts');
  }, [bankAccountsError]);

  const handleBulkRelease = async () => {
    if (invoices.length === 0) {
      toast.error('No pending payments to release');
      return;
    }

    const confirmed = window.confirm(`Are you sure you want to release payments for ${invoices.length} invoices?`);
    if (!confirmed) return;

    try {
      const response = await bulkReleasePayments().unwrap();
      toast.success(response?.message || 'Bulk payments released');
    } catch (error) {
      toast.error('Failed to release bulk payments');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createPayment({
        ...formData,
        payment_date: new Date(formData.payment_date).toISOString()
      }).unwrap();
      toast.success('Payment recorded successfully');
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error?.data?.detail || 'Failed to record payment');
    }
  };

  const resetForm = () => {
    setFormData({
      invoice_id: '',
      payment_date: '',
      payment_method: 'Bank Transfer',
      bank_account_id: '',
      reference_number: '',
      notes: ''
    });
  };

  const filteredPayments = payments.filter(payment =>
    safeLower(payment.vendor_name).includes(safeLower(searchTerm)) ||
    safeLower(payment.invoice_number).includes(safeLower(searchTerm))
  );

  const filteredPendingInvoices = invoices.filter(invoice =>
    safeLower(invoice.vendor_name).includes(safeLower(searchTerm)) ||
    safeLower(invoice.invoice_number).includes(safeLower(searchTerm))
  );

  const totalPendingAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <div data-testid="payments-page">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold font-['Manrope'] text-primary mb-2" data-testid="payments-title">
            Payments
          </h1>
          <p className="text-muted-foreground">Track and release payments</p>
        </div>
        <div className="flex gap-2">
          {invoices.length > 0 && (
            <Button
              variant="default"
              size="lg"
              onClick={handleBulkRelease}
              data-testid="bulk-release-button"
              className="bg-accent hover:bg-accent/90"
            >
              Release All Payments ({invoices.length})
            </Button>
          )}
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
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
                  {invoices.map(invoice => (
                    <option key={invoice.id} value={invoice.id}>
                      {invoice.invoice_number} - {invoice.vendor_name} - ₹{invoice.amount.toLocaleString('en-IN')}
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
                  {bankAccounts.map(account => (
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

              <Button type="submit" className="w-full" data-testid="payment-submit-button">
                Record Payment
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="payment-search-input"
          />
        </div>
      </div>

      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pending" data-testid="tab-pending-payments">
            Pending Payments ({invoices.length})
          </TabsTrigger>
          <TabsTrigger value="released" data-testid="tab-released-payments">
            Released Payments ({payments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {invoices.length > 0 && (
            <div className="bg-accent/10 border border-accent/30 rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">Total Pending Amount</p>
                  <p className="text-2xl font-bold font-['JetBrains_Mono'] text-accent">
                    ₹{totalPendingAmount.toLocaleString('en-IN')}
                  </p>
                </div>
                <Button onClick={handleBulkRelease} size="lg">
                  Release All Payments
                </Button>
              </div>
            </div>
          )}

          <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
            <table className="w-full" data-testid="pending-invoices-table">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="p-4 text-left text-sm font-medium">Invoice #</th>
                  <th className="p-4 text-left text-sm font-medium">Vendor</th>
                  <th className="p-4 text-left text-sm font-medium">Amount</th>
                  <th className="p-4 text-left text-sm font-medium">Invoice Date</th>
                  <th className="p-4 text-left text-sm font-medium">Due Date</th>
                  <th className="p-4 text-left text-sm font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredPendingInvoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="border-b border-border hover:bg-muted/50 transition-colors"
                    data-testid={`pending-invoice-row-${invoice.id}`}
                  >
                    <td className="p-4 font-['JetBrains_Mono'] font-medium">{invoice.invoice_number}</td>
                    <td className="p-4">{invoice.vendor_name}</td>
                    <td className="p-4 font-['JetBrains_Mono'] font-semibold">
                      ₹{invoice.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {safeFormatDate(invoice.invoice_date)}
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {safeFormatDate(invoice.due_date)}
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border bg-blue-100 text-blue-800 border-blue-200">
                        Pending Payment
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredPendingInvoices.length === 0 && (
              <div className="text-center py-8 text-muted-foreground" data-testid="no-pending-payments">
                No pending payments. All invoices need approval first.
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="released">
          <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
            <table className="w-full" data-testid="payments-table">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="p-4 text-left text-sm font-medium">Invoice #</th>
                  <th className="p-4 text-left text-sm font-medium">Vendor</th>
                  <th className="p-4 text-left text-sm font-medium">Amount</th>
                  <th className="p-4 text-left text-sm font-medium">Payment Date</th>
                  <th className="p-4 text-left text-sm font-medium">Method</th>
                  <th className="p-4 text-left text-sm font-medium">Reference</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-b border-border hover:bg-muted/50 transition-colors"
                    data-testid={`payment-row-${payment.id}`}
                  >
                    <td className="p-4 font-['JetBrains_Mono'] font-medium">{payment.invoice_number}</td>
                    <td className="p-4">{payment.vendor_name}</td>
                    <td className="p-4 font-['JetBrains_Mono'] font-semibold">
                      ₹{payment.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {safeFormatDate(payment.payment_date)}
                    </td>
                    <td className="p-4 text-sm">{payment.payment_method}</td>
                    <td className="p-4 text-sm font-['JetBrains_Mono']">{payment.reference_number || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredPayments.length === 0 && (
              <div className="text-center py-8 text-muted-foreground" data-testid="no-payments">
                No payments released yet. Click "Release All Payments" to process pending invoices.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};


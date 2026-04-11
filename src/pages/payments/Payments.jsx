import React, { useEffect, useState } from 'react';
import {
  useGetPaymentsQuery,
  useGetInvoicesQuery,
  useGetBankAccountsQuery,
  useBulkReleasePaymentsMutation,
  useCreatePaymentMutation,
} from '../../Services/apiSlice';
import { Input } from '../../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import PaymentsHeader from './components/PaymentsHeader';
import PaymentDialog from './components/PaymentDialog';
import PendingPaymentsTab from './components/PendingPaymentsTab';
import ReleasedPaymentsTab from './components/ReleasedPaymentsTab';

const safeLower = (value) => String(value ?? '').toLowerCase();

const safeFormatDate = (value, pattern = 'dd MMM yy') => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : format(date, pattern);
};

const Payments = () => {
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
    notes: '',
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

  const payments = Array.isArray(paymentsData) ? paymentsData.map(normalizePayment) : [];
  const invoices = Array.isArray(invoicesData) ? invoicesData.map(normalizeInvoice) : [];
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

  const resetForm = () => {
    setFormData({
      invoice_id: '',
      payment_date: '',
      payment_method: 'Bank Transfer',
      bank_account_id: '',
      reference_number: '',
      notes: '',
    });
  };

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
    } catch {
      toast.error('Failed to release bulk payments');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createPayment({
        ...formData,
        payment_date: new Date(formData.payment_date).toISOString(),
      }).unwrap();
      toast.success('Payment recorded successfully');
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error?.data?.detail || 'Failed to record payment');
    }
  };

  const filteredPayments = payments.filter(
    (payment) =>
      safeLower(payment.vendor_name).includes(safeLower(searchTerm)) ||
      safeLower(payment.invoice_number).includes(safeLower(searchTerm))
  );

  const filteredPendingInvoices = invoices.filter(
    (invoice) =>
      safeLower(invoice.vendor_name).includes(safeLower(searchTerm)) ||
      safeLower(invoice.invoice_number).includes(safeLower(searchTerm))
  );

  const totalPendingAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <div data-testid="payments-page">
      <PaymentsHeader
        invoicesCount={invoices.length}
        handleBulkRelease={handleBulkRelease}
        paymentDialog={(
          <PaymentDialog
            dialogOpen={dialogOpen}
            setDialogOpen={setDialogOpen}
            resetForm={resetForm}
            formData={formData}
            setFormData={setFormData}
            invoices={invoices}
            bankAccounts={bankAccounts}
            handleSubmit={handleSubmit}
          />
        )}
      />

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

      {/* Tabs are composed from feature components to keep page orchestration small. */}
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
          <PendingPaymentsTab
            invoices={invoices}
            filteredPendingInvoices={filteredPendingInvoices}
            totalPendingAmount={totalPendingAmount}
            handleBulkRelease={handleBulkRelease}
            safeFormatDate={safeFormatDate}
          />
        </TabsContent>

        <TabsContent value="released">
          <ReleasedPaymentsTab filteredPayments={filteredPayments} safeFormatDate={safeFormatDate} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Payments;

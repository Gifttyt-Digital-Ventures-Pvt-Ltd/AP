import React, { useEffect, useState } from 'react';
import { useGetInvoicesQuery } from '../../Services/apis/invoicesVendorsApi';
import {
  useGetPaymentsQuery,
  useGetBankAccountsQuery,
  useBulkReleasePaymentsMutation,
  useCreatePaymentMutation,
} from '../../Services/apis/approvalsPaymentsBankingApi';
import { useCreatePaymentBatchMutation } from '../../Services/apis/paymentBatchesApi';
import { Button } from '../../components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { Checkbox } from '../../components/ui/checkbox';
import AppDataTable from '../../components/common/AppDataTable';
import { TableCell, TableRow } from '../../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Search, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import PaymentsHeader from './components/PaymentsHeader';
import PaymentDialog from './components/PaymentDialog';
import PendingPaymentsTab from './components/PendingPaymentsTab';
import ReleasedPaymentsTab from './components/ReleasedPaymentsTab';
import { useActionGuard } from '../../hooks/useActionGuard';
import { useRBAC } from '../../contexts/RBACContext';

const safeLower = (value) => String(value ?? '').toLowerCase();

const safeFormatDate = (value, pattern = 'dd MMM yy') => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : format(date, pattern);
};

const batchInvoiceTableHeader = [
  { key: 'select', title: '', headerClassName: 'w-[48px]' },
  { key: 'invoice_number', title: 'Invoice', cellClassName: 'font-medium' },
  { key: 'vendor_name', title: 'Vendor' },
  { key: 'amount', title: 'Amount' },
  { key: 'status', title: 'Status' },
];

const Payments = () => {
  const { isPaymentBatchesFeatureEnabled, isConnectedBankingEnabled } = useRBAC();
  const {
    data: paymentsData = [],
    isError: paymentsError,
  } = useGetPaymentsQuery();
  const {
    data: invoicesData = [],
    isError: invoicesError,
    refetch: refetchPendingPaymentInvoices,
  } = useGetInvoicesQuery({ status: 'Pending Payment' });
  const {
    data: pendingApproverInvoicesData = [],
    isError: pendingApproverInvoicesError,
    refetch: refetchPendingApproverInvoices,
  } = useGetInvoicesQuery(
    { status: 'Pending Approver' },
    { skip: !isPaymentBatchesFeatureEnabled },
  );
  const {
    data: bankAccountsData = [],
    isError: bankAccountsError,
  } = useGetBankAccountsQuery(undefined, { skip: !isConnectedBankingEnabled });

  const [bulkReleasePayments] = useBulkReleasePaymentsMutation();
  const [createPayment] = useCreatePaymentMutation();
  const [createPaymentBatch] = useCreatePaymentBatchMutation();
  const { guardAction, canPerformAction } = useActionGuard();
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createBatchDialogOpen, setCreateBatchDialogOpen] = useState(false);
  const [bulkReleaseConfirmOpen, setBulkReleaseConfirmOpen] = useState(false);
  const [creatingBatch, setCreatingBatch] = useState(false);
  const [formData, setFormData] = useState({
    invoice_id: '',
    payment_date: '',
    payment_method: 'Bank Transfer',
    bank_account_id: '',
    reference_number: '',
    notes: '',
  });
  const [createBatchForm, setCreateBatchForm] = useState({
    payment_method: 'NEFT',
    bank_account_id: '',
    invoice_ids: [],
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
  const pendingPaymentInvoices = Array.isArray(invoicesData) ? invoicesData.map(normalizeInvoice) : [];
  const pendingApproverInvoices = Array.isArray(pendingApproverInvoicesData)
    ? pendingApproverInvoicesData.map(normalizeInvoice)
    : [];
  const invoices = pendingPaymentInvoices;
  const batchEligibleInvoices = [...pendingPaymentInvoices, ...pendingApproverInvoices];
  const bankAccounts = Array.isArray(bankAccountsData) ? bankAccountsData : [];
  const canManagePayments = canPerformAction('payments.create');
  const canBulkRelease = canPerformAction('payments.releaseBulk');
  const canCreateBatch =
    isPaymentBatchesFeatureEnabled && canPerformAction('payments.createBatch');

  useEffect(() => {
    if (paymentsError) toast.error('Failed to load payments');
  }, [paymentsError]);

  useEffect(() => {
    if (invoicesError) toast.error('Failed to load invoices');
  }, [invoicesError]);

  useEffect(() => {
    if (pendingApproverInvoicesError) toast.error('Failed to load pending approver invoices');
  }, [pendingApproverInvoicesError]);

  useEffect(() => {
    if (isConnectedBankingEnabled && bankAccountsError) {
      toast.error('Failed to load bank accounts');
    }
  }, [bankAccountsError, isConnectedBankingEnabled]);

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
    if (!guardAction('payments.releaseBulk')) return;
    if (invoices.length === 0) {
      toast.error('No pending payments to release');
      return;
    }

    setBulkReleaseConfirmOpen(true);
  };

  const confirmBulkRelease = async () => {
    setBulkReleaseConfirmOpen(false);

    try {
      const response = await bulkReleasePayments().unwrap();
      toast.success(response?.message || 'Bulk payments released');
    } catch {
      toast.error('Failed to release bulk payments');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!guardAction('payments.create')) return;
    if (isConnectedBankingEnabled && !formData.bank_account_id) {
      toast.error('Please select a bank account');
      return;
    }
    try {
      const paymentPayload = {
        ...formData,
        payment_date: new Date(formData.payment_date).toISOString(),
      };
      if (!isConnectedBankingEnabled) {
        delete paymentPayload.bank_account_id;
      }
      await createPayment(paymentPayload).unwrap();
      toast.success('Payment recorded successfully');
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error?.data?.detail || 'Failed to record payment');
    }
  };

  const resetCreateBatchForm = () => {
    setCreateBatchForm({
      payment_method: 'NEFT',
      bank_account_id: '',
      invoice_ids: [],
      notes: '',
    });
  };

  const toggleInvoiceSelection = (invoiceId) => {
    setCreateBatchForm((prev) => {
      const invoiceIds = prev.invoice_ids.includes(invoiceId)
        ? prev.invoice_ids.filter((id) => id !== invoiceId)
        : [...prev.invoice_ids, invoiceId];
      return { ...prev, invoice_ids: invoiceIds };
    });
  };

  const selectAllInvoices = () => {
    setCreateBatchForm((prev) => ({
      ...prev,
      invoice_ids: prev.invoice_ids.length === batchEligibleInvoices.length
        ? []
        : batchEligibleInvoices.map((invoice) => invoice.id),
    }));
  };

  const selectedBatchTotal = batchEligibleInvoices
    .filter((invoice) => createBatchForm.invoice_ids.includes(invoice.id))
    .reduce((sum, invoice) => sum + (invoice.amount || 0), 0);

  const handleCreateBatch = async () => {
    if (!guardAction('payments.createBatch')) return;
    if (isConnectedBankingEnabled && !createBatchForm.bank_account_id) {
      toast.error('Please select a bank account');
      return;
    }
    if (createBatchForm.invoice_ids.length === 0) {
      toast.error('Please select at least one invoice');
      return;
    }

    setCreatingBatch(true);
    try {
      const batchPayload = { ...createBatchForm };
      if (!isConnectedBankingEnabled) {
        delete batchPayload.bank_account_id;
      }
      const response = await createPaymentBatch(batchPayload).unwrap();
      toast.success(response?.message || 'Batch created');
      await Promise.all([refetchPendingPaymentInvoices(), refetchPendingApproverInvoices()]);
      setCreateBatchDialogOpen(false);
      resetCreateBatchForm();
    } catch (error) {
      toast.error(error?.data?.detail || 'Failed to create batch');
    } finally {
      setCreatingBatch(false);
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

  const renderBatchInvoiceRow = (invoice, rowIndex, headers) => (
    <TableRow
      key={invoice.id ?? rowIndex}
      className={createBatchForm.invoice_ids.includes(invoice.id) ? 'bg-primary/10' : ''}
      onClick={() => toggleInvoiceSelection(invoice.id)}
    >
      {headers.map((header) => {
        let value;

        switch (header.key) {
          case 'select':
            value = (
              <div onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={createBatchForm.invoice_ids.includes(invoice.id)}
                  onCheckedChange={() => toggleInvoiceSelection(invoice.id)}
                  disabled={!canCreateBatch}
                />
              </div>
            );
            break;
          case 'amount':
            value = `₹${Number(invoice.amount || 0).toLocaleString('en-IN')}`;
            break;
          default:
            value = invoice?.[header.key] || '-';
        }

        return (
          <TableCell key={header.key} className={header.cellClassName}>
            {value}
          </TableCell>
        );
      })}
    </TableRow>
  );

  return (
    <div data-testid="payments-page">
      <PaymentsHeader
        invoicesCount={invoices.length}
        handleBulkRelease={handleBulkRelease}
        canBulkRelease={canBulkRelease}
        batchDialogTrigger={canCreateBatch ? (
          <Button
            variant="default"
            onClick={() => setCreateBatchDialogOpen(true)}
            data-testid="open-create-batch-dialog"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Batch
          </Button>
        ) : null}
        paymentDialog={(
          <PaymentDialog
            dialogOpen={dialogOpen}
            setDialogOpen={setDialogOpen}
            resetForm={resetForm}
            formData={formData}
            setFormData={setFormData}
            invoices={invoices}
            bankAccounts={bankAccounts}
            showBankAccountField={isConnectedBankingEnabled}
            handleSubmit={handleSubmit}
            canCreatePayment={canManagePayments}
          />
        )}
      />

      {isPaymentBatchesFeatureEnabled && (
        <Dialog
          open={createBatchDialogOpen}
          onOpenChange={(open) => {
            if (!open) resetCreateBatchForm();
            setCreateBatchDialogOpen(open);
          }}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Payment Batch</DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              <div
                className={`grid grid-cols-1 gap-4 ${
                  isConnectedBankingEnabled ? 'md:grid-cols-2' : ''
                }`}
              >
                <div className="space-y-2">
                  <Label>Payment Method *</Label>
                  <Select
                    value={createBatchForm.payment_method}
                    onValueChange={(value) => setCreateBatchForm((prev) => ({ ...prev, payment_method: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NEFT">NEFT</SelectItem>
                      <SelectItem value="RTGS">RTGS</SelectItem>
                      <SelectItem value="IMPS">IMPS</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {isConnectedBankingEnabled && (
                  <div className="space-y-2">
                    <Label>Bank Account *</Label>
                    <Select
                      value={createBatchForm.bank_account_id}
                      onValueChange={(value) =>
                        setCreateBatchForm((prev) => ({ ...prev, bank_account_id: value }))
                      }
                    >
                      <SelectTrigger data-testid="create-batch-bank-select">
                        <SelectValue placeholder="Select bank account" />
                      </SelectTrigger>
                      <SelectContent>
                        {bankAccounts.map((bank) => (
                          <SelectItem key={bank.id} value={String(bank.id)}>
                            {bank.bank_name} - {bank.account_number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Select Invoices</Label>
                  <div className="flex items-center gap-4 text-sm">
                    <Button variant="outline" size="sm" onClick={selectAllInvoices} disabled={!canCreateBatch}>
                      {createBatchForm.invoice_ids.length === batchEligibleInvoices.length ? 'Deselect All' : 'Select All'}
                    </Button>
                    <span>
                      Selected: <strong>{createBatchForm.invoice_ids.length}</strong> | Total: <strong>{'\u20B9'}{selectedBatchTotal.toLocaleString('en-IN')}</strong>
                    </span>
                  </div>
                </div>

                <div className="border rounded-lg max-h-80 overflow-y-auto">
                  <AppDataTable
                    tableHeader={batchInvoiceTableHeader}
                    tableData={batchEligibleInvoices}
                    renderRow={renderBatchInvoiceRow}
                    emptyMessage="No invoices available for batch creation"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={createBatchForm.notes}
                  placeholder="Additional notes..."
                  onChange={(e) => setCreateBatchForm((prev) => ({ ...prev, notes: e.target.value }))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateBatchDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateBatch} disabled={creatingBatch || !canCreateBatch}>
                {creatingBatch && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Batch
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

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

      <AlertDialog open={bulkReleaseConfirmOpen} onOpenChange={setBulkReleaseConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Release All Pending Payments?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to release payments for {invoices.length} invoices?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkRelease}>Release Payments</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Payments;

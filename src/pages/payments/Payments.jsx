import React, { useEffect, useMemo, useState } from 'react';
import {
  useGetInvoicesQuery,
  useCancelInvoiceMutation,
  useLazyGetInvoiceHistoryQuery,
} from '../../Services/apis/invoicesVendorsApi';
import { toInvoiceUiPayload, EMPTY_INVOICE_LIST_RESPONSE, getInvoiceListItems } from '../../Services/utils/payloadMappers';
import {
  useGetPaymentsQuery,
  useGetBankAccountsQuery,
  useBulkReleasePaymentsMutation,
  useCreatePaymentMutation,
  useGeneratePendingPaymentInvoiceReportMutation,
  useRecordPaymentsMutation,
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
import RecordPaymentDialog from './components/RecordPaymentDialog';
import PendingPaymentsTab from './components/PendingPaymentsTab';
import PendingPaymentReportDialog from './components/PendingPaymentReportDialog';
import ReleasedPaymentsTab from './components/ReleasedPaymentsTab';
import CancelInvoiceDialog from '../invoices/components/CancelInvoiceDialog';
import ConnectedBankAccountsPanel from '../../components/banking/ConnectedBankAccountsPanel';
import BankAccountSelectField from '../../components/banking/BankAccountSelectField';
import { getDefaultBankAccountId } from '../banking/utils/bankAccounts';
import ViewDialog from '../invoices/components/ViewDialog';
import { InvoicePdfPreview } from '../invoices/components/InvoicePdfPreview';
import { getInvoiceFileUrl, openInvoiceFileDownload } from '../invoices/utils/invoicePreview';
import { normalizeInvoiceHistoryEntries } from '../invoices/utils/invoiceHistory';
import { getInvoiceStatusBadgeClass } from '../../utils/approvalWorkflow';
import { useActionGuard } from '../../hooks/useActionGuard';
import { useCreditErrorHandler } from '../../contexts/CreditErrorContext';
import MeteredActionCostHint from '../../components/credits/MeteredActionCostHint';
import { CREDIT_ACTION_CODES } from '../../constants/creditActions';
import { useMeteredActionEstimate } from '../../hooks/useMeteredActionEstimate';
import { useRBAC } from '../../contexts/RBACContext';
import { useCurrencyFilter } from '../../hooks/useCurrencyFilter';
import { CURRENCY_SCREENS } from '../../utils/currency';

const safeLower = (value) => String(value ?? '').toLowerCase();

const safeFormatDate = (value, pattern = 'dd MMM yy') => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : format(date, pattern);
};

const batchInvoiceTableHeader = [
  { key: 'invoiceNumber', title: 'Invoice', cellClassName: 'font-medium' },
  { key: 'vendorName', title: 'Vendor' },
  { key: 'amount', title: 'Amount' },
  { key: 'status', title: 'Status' },
];

const getPaymentReportResponseData = (response = {}) => response.data ?? response;

const FINAL_NON_CANCELLABLE_STATUSES = new Set(['PAID', 'CANCELLED', 'CANCELED']);

const getInvoiceCancelCapability = (invoice = {}) =>
  invoice.canCancel ??
  invoice.can_cancel ??
  invoice.cancellable ??
  invoice.isCancellable;

const isInvoiceCancellable = (invoice = {}, canCancelByRole = false) => {
  const capability = getInvoiceCancelCapability(invoice);
  if (capability !== undefined && capability !== null) return capability === true;
  if (!canCancelByRole) return false;

  const status = String(invoice.status || '').trim().toUpperCase();
  return !FINAL_NON_CANCELLABLE_STATUSES.has(status);
};

const downloadSignedReport = async (downloadUrl, fileName) => {
  const fallbackName = `pending-payment-invoice-report-${new Date().toISOString().slice(0, 10)}.xlsx`;
  const resolvedFileName = fileName || fallbackName;

  try {
    const response = await fetch(downloadUrl);
    if (!response.ok) throw new Error('Download request failed');

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = resolvedFileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
    return;
  } catch {
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = resolvedFileName;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }
};

const Payments = () => {
  const {
    isPaymentBatchesFeatureEnabled,
    isConnectedBankingEnabled,
    isCategoryFeatureEnabled,
    isCampaignFeatureEnabled,
    isCorporateAdmin,
    hasPermission,
  } = useRBAC();
  const {
    currencies,
    selectedCurrency,
    setSelectedCurrency,
    queryArgs: paymentQueryArgs,
  } = useCurrencyFilter(CURRENCY_SCREENS.PAYMENT, { excludeAll: true });
  const invoiceQueryWithStatus = (status) => ({
    ...paymentQueryArgs,
    status,
  });
  const {
    data: paymentsData = [],
    isError: paymentsError,
    isFetching: paymentsFetching,
    refetch: refetchPayments,
  } = useGetPaymentsQuery(paymentQueryArgs);
  const {
    data: pendingPaymentInvoicesListData = EMPTY_INVOICE_LIST_RESPONSE,
    isError: invoicesError,
    isFetching: pendingPaymentInvoicesFetching,
    refetch: refetchPendingPaymentInvoices,
  } = useGetInvoicesQuery(invoiceQueryWithStatus('Pending Payment'));
  const {
    data: allInvoicesListData = EMPTY_INVOICE_LIST_RESPONSE,
    isFetching: allInvoicesFetching,
    refetch: refetchAllInvoices,
  } = useGetInvoicesQuery(paymentQueryArgs);
  const {
    data: pendingApproverInvoicesListData = EMPTY_INVOICE_LIST_RESPONSE,
    isError: pendingApproverInvoicesError,
    isFetching: pendingApproverInvoicesFetching,
    refetch: refetchPendingApproverInvoices,
  } = useGetInvoicesQuery(
    invoiceQueryWithStatus('Pending Approver'),
    { skip: !isPaymentBatchesFeatureEnabled },
  );
  const {
    data: bankAccountsData = [],
    isError: bankAccountsError,
    isFetching: bankAccountsFetching,
    refetch: refetchBankAccounts,
  } = useGetBankAccountsQuery(undefined, { skip: !isConnectedBankingEnabled });

  const [bulkReleasePayments] = useBulkReleasePaymentsMutation();
  const [createPayment] = useCreatePaymentMutation();
  const [recordPayments] = useRecordPaymentsMutation();
  const [generatePendingPaymentInvoiceReport] = useGeneratePendingPaymentInvoiceReportMutation();
  const [createPaymentBatch] = useCreatePaymentBatchMutation();
  const [cancelInvoice, { isLoading: cancelInvoiceLoading }] = useCancelInvoiceMutation();
  const [getInvoiceHistory] = useLazyGetInvoiceHistoryQuery();
  const { guardAction, canPerformAction } = useActionGuard();
  const { handleCreditError } = useCreditErrorHandler();
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [createBatchDialogOpen, setCreateBatchDialogOpen] = useState(false);
  const [recordPaymentDialogOpen, setRecordPaymentDialogOpen] = useState(false);
  const [paymentReportDialogOpen, setPaymentReportDialogOpen] = useState(false);
  const [invoiceCancelTarget, setInvoiceCancelTarget] = useState(null);
  const [invoiceCancelReason, setInvoiceCancelReason] = useState('');
  const [bulkReleaseConfirmOpen, setBulkReleaseConfirmOpen] = useState(false);
  const [creatingBatch, setCreatingBatch] = useState(false);
  const [recordingPayments, setRecordingPayments] = useState(false);
  const [downloadingPaymentReport, setDownloadingPaymentReport] = useState(false);
  const [recordPaymentInvoiceIds, setRecordPaymentInvoiceIds] = useState([]);
  const [paymentReportInvoiceIds, setPaymentReportInvoiceIds] = useState([]);
  const [recordPaymentForm, setRecordPaymentForm] = useState({
    paymentDate: '',
    payment_method: 'Bank Transfer',
    reference_number: '',
  });
  const [formData, setFormData] = useState({
    invoice_id: '',
    paymentDate: '',
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
  const [viewInvoice, setViewInvoice] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewTab, setViewTab] = useState('details');
  const [invoiceHistory, setInvoiceHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [viewPreviewError, setViewPreviewError] = useState(false);
  const [pdfZoom, setPdfZoom] = useState(100);

  const normalizePayment = (payment = {}) => ({
    ...payment,
    invoice_id: payment.invoice_id ?? payment.invoiceId,
    invoiceNumber: payment.invoiceNumber ?? payment.invoiceNumber,
    vendorName: payment.vendorName ?? payment.vendorName,
    paymentDate: payment.paymentDate ?? payment.paymentDate,
    payment_method: payment.payment_method ?? payment.paymentMethod,
    reference_number: payment.reference_number ?? payment.referenceNumber,
  });

  const normalizeInvoice = (invoice = {}) => ({
    ...invoice,
    invoiceNumber: invoice.invoiceNumber ?? invoice.invoiceNumber,
    vendorName: invoice.vendorName ?? invoice.vendorName,
    invoiceDate: invoice.invoiceDate ?? invoice.invoiceDate,
    dueDate: invoice.dueDate ?? invoice.dueDate,
  });

  const payments = Array.isArray(paymentsData) ? paymentsData.map(normalizePayment) : [];
  const pendingPaymentInvoices = getInvoiceListItems(pendingPaymentInvoicesListData).map(normalizeInvoice);
  const allInvoices = useMemo(
    () => getInvoiceListItems(allInvoicesListData).map((invoice) => toInvoiceUiPayload(invoice)),
    [allInvoicesListData],
  );
  const pendingApproverInvoices = getInvoiceListItems(pendingApproverInvoicesListData).map(normalizeInvoice);
  const invoices = pendingPaymentInvoices;
  const bulkPaymentEstimate = useMeteredActionEstimate(
    CREDIT_ACTION_CODES.PAYMENT_PROCESSING,
    invoices.length,
  );
  const batchEligibleInvoices = [...pendingPaymentInvoices, ...pendingApproverInvoices];
  const bankAccounts = Array.isArray(bankAccountsData) ? bankAccountsData : [];

  useEffect(() => {
    if (!createBatchDialogOpen || !isConnectedBankingEnabled || createBatchForm.bank_account_id) {
      return;
    }

    const defaultBankAccountId = getDefaultBankAccountId(bankAccounts);
    if (!defaultBankAccountId) return;

    setCreateBatchForm((prev) => ({
      ...prev,
      bank_account_id: defaultBankAccountId,
    }));
  }, [
    bankAccounts,
    createBatchDialogOpen,
    createBatchForm.bank_account_id,
    isConnectedBankingEnabled,
  ]);

  const canManagePayments = canPerformAction('payments.create');
  const canCancelInvoicesByRole = isCorporateAdmin || hasPermission('master-admin');
  const canBulkRelease = canPerformAction('payments.releaseBulk');
  const canCreateBatch =
    isPaymentBatchesFeatureEnabled && canPerformAction('payments.createBatch');
  const showBankingBatchPaymentActions =
    isConnectedBankingEnabled || isPaymentBatchesFeatureEnabled;
  const showRecordPaymentFlow = !showBankingBatchPaymentActions;
  const canShowSinglePayment = showBankingBatchPaymentActions && canManagePayments;
  const canShowBulkRelease = showBankingBatchPaymentActions && canBulkRelease;
  const canShowRecordPayment = showRecordPaymentFlow && canManagePayments;
  const paymentsRefreshing =
    paymentsFetching ||
    pendingPaymentInvoicesFetching ||
    allInvoicesFetching ||
    pendingApproverInvoicesFetching ||
    bankAccountsFetching;

  const handleRefreshPayments = async () => {
    try {
      await Promise.all([
        refetchPayments(),
        refetchPendingPaymentInvoices(),
        refetchAllInvoices(),
        isPaymentBatchesFeatureEnabled
          ? refetchPendingApproverInvoices()
          : Promise.resolve(),
        isConnectedBankingEnabled ? refetchBankAccounts() : Promise.resolve(),
      ]);
      toast.success('Payments refreshed');
    } catch {
      toast.error('Failed to refresh payments');
    }
  };

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
      paymentDate: '',
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
    } catch (error) {
      if (handleCreditError(error)) return;
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
        paymentDate: new Date(formData.paymentDate).toISOString(),
      };
      if (!isConnectedBankingEnabled) {
        delete paymentPayload.bank_account_id;
      }
      await createPayment(paymentPayload).unwrap();
      toast.success('Payment recorded successfully');
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      if (handleCreditError(error)) return;
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
  const allBatchInvoicesSelected =
    batchEligibleInvoices.length > 0 &&
    createBatchForm.invoice_ids.length === batchEligibleInvoices.length;

  const resetRecordPaymentForm = () => {
    setRecordPaymentInvoiceIds([]);
    setRecordPaymentForm({
      paymentDate: '',
      payment_method: 'Bank Transfer',
      reference_number: '',
    });
  };

  const selectedRecordPaymentInvoices = invoices.filter((invoice) =>
    recordPaymentInvoiceIds.includes(invoice.id),
  );

  const openPaymentReportDialog = () => {
    if (!guardAction('payments.create')) return;
    if (invoices.length === 0) {
      toast.error('No pending invoices available for report');
      return;
    }

    setPaymentReportInvoiceIds((prev) =>
      prev.length > 0 ? prev : invoices.map((invoice) => invoice.id),
    );
    setPaymentReportDialogOpen(true);
  };

  const togglePaymentReportInvoice = (invoiceId) => {
    setPaymentReportInvoiceIds((prev) =>
      prev.includes(invoiceId)
        ? prev.filter((id) => id !== invoiceId)
        : [...prev, invoiceId],
    );
  };

  const selectPaymentReportInvoices = (visibleInvoiceIds = []) => {
    setPaymentReportInvoiceIds((prev) => {
      const visibleSet = new Set(visibleInvoiceIds);
      const allVisibleSelected =
        visibleInvoiceIds.length > 0 && visibleInvoiceIds.every((id) => prev.includes(id));

      if (allVisibleSelected) {
        return prev.filter((id) => !visibleSet.has(id));
      }

      return Array.from(new Set([...prev, ...visibleInvoiceIds]));
    });
  };

  const handleDownloadPaymentReport = async () => {
    if (!guardAction('payments.create')) return;
    if (paymentReportInvoiceIds.length === 0) {
      toast.error('Please select at least one invoice');
      return;
    }

    setDownloadingPaymentReport(true);
    try {
      const response = await generatePendingPaymentInvoiceReport({
        invoiceIds: paymentReportInvoiceIds,
        format: 'XLSX',
      }).unwrap();
      const reportData = getPaymentReportResponseData(response);
      const downloadUrl =
        reportData.downloadUrl ||
        reportData.signedUrl ||
        reportData.fileUrl ||
        reportData.url;
      const fileName =
        reportData.fileName ||
        reportData.filename ||
        reportData.reportFileName;

      if (!downloadUrl) {
        toast.error('Report link was not returned by the server');
        return;
      }

      await downloadSignedReport(downloadUrl, fileName);
      toast.success('Bank invoice report is downloading');
      setPaymentReportDialogOpen(false);
    } catch (error) {
      toast.error(error?.data?.detail || error?.data?.message || 'Failed to download report');
    } finally {
      setDownloadingPaymentReport(false);
    }
  };

  const handleCancelInvoice = (invoice) => {
    if (!isInvoiceCancellable(invoice, canCancelInvoicesByRole)) {
      toast.error(
        invoice?.cancelDisabledReason ||
          invoice?.cancel_disabled_reason ||
          'This invoice cannot be cancelled',
      );
      return;
    }
    setInvoiceCancelTarget(invoice);
    setInvoiceCancelReason('');
  };

  const confirmCancelInvoice = async () => {
    if (!invoiceCancelTarget) return;
    const reason = invoiceCancelReason.trim();
    if (reason.length < 5) {
      toast.error('Please enter a cancellation reason');
      return;
    }

    try {
      const response = await cancelInvoice({
        id: invoiceCancelTarget.id,
        reason,
      }).unwrap();
      toast.success(response?.message || 'Invoice cancelled successfully');
      setInvoiceCancelTarget(null);
      setInvoiceCancelReason('');
      await Promise.all([refetchPendingPaymentInvoices(), refetchAllInvoices()]);
    } catch (error) {
      toast.error(error?.data?.detail || error?.data?.message || 'Failed to cancel invoice');
    }
  };

  const openRecordPaymentDialog = () => {
    if (recordPaymentInvoiceIds.length === 0) {
      toast.error('Please select at least one invoice from the list');
      return;
    }
    setRecordPaymentForm((prev) => ({
      ...prev,
      payment_method: prev.payment_method || 'Bank Transfer',
      paymentDate: prev.paymentDate || new Date().toISOString().slice(0, 10),
    }));
    setRecordPaymentDialogOpen(true);
  };

  const toggleRecordPaymentInvoice = (invoiceId) => {
    setRecordPaymentInvoiceIds((prev) =>
      prev.includes(invoiceId)
        ? prev.filter((id) => id !== invoiceId)
        : [...prev, invoiceId],
    );
  };

  const selectAllRecordPaymentInvoices = () => {
    setRecordPaymentInvoiceIds((prev) =>
      prev.length === invoices.length ? [] : invoices.map((invoice) => invoice.id),
    );
  };

  const handleRecordPayments = async (event) => {
    event.preventDefault();
    if (!guardAction('payments.create')) return;

    const invoiceNumbers = selectedRecordPaymentInvoices
      .map((invoice) => String(invoice.invoiceNumber || '').trim())
      .filter(Boolean);

    if (invoiceNumbers.length === 0) {
      toast.error('Please select at least one invoice');
      return;
    }

    if (!recordPaymentForm.paymentDate) {
      toast.error('Payment date is required');
      return;
    }

    const now = new Date();
    const maxPaymentDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (recordPaymentForm.paymentDate > maxPaymentDate) {
      toast.error('Payment date cannot be in the future');
      return;
    }

    if (!recordPaymentForm.payment_method) {
      toast.error('Payment method is required');
      return;
    }

    const referenceNumber = String(recordPaymentForm.reference_number || '').trim();

    setRecordingPayments(true);
    try {
      const response = await recordPayments({
        invoiceNumbers,
        paymentDate: new Date(recordPaymentForm.paymentDate).toISOString(),
        paymentMethod: recordPaymentForm.payment_method,
        ...(referenceNumber ? { referenceNumber } : {}),
      }).unwrap();
      toast.success(response?.message || 'Payments recorded successfully (PAID)');
      await refetchPendingPaymentInvoices();
      setRecordPaymentDialogOpen(false);
      resetRecordPaymentForm();
    } catch (error) {
      toast.error(error?.data?.detail || error?.data?.message || 'Failed to record payments');
    } finally {
      setRecordingPayments(false);
    }
  };

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
      safeLower(payment.vendorName).includes(safeLower(searchTerm)) ||
      safeLower(payment.invoiceNumber).includes(safeLower(searchTerm))
  );

  const resolvePaymentInvoice = (payment) => {
    const normalizedPayment = normalizePayment(payment);
    if (normalizedPayment.invoice_id) {
      const matchById = allInvoices.find((invoice) => invoice.id === normalizedPayment.invoice_id);
      if (matchById) return matchById;
    }
    if (normalizedPayment.invoiceNumber) {
      return allInvoices.find(
        (invoice) => invoice.invoiceNumber === normalizedPayment.invoiceNumber,
      );
    }
    return null;
  };

  const handleViewInvoice = async (invoice, initialTab = 'details') => {
    const preparedInvoice = toInvoiceUiPayload(invoice);
    setViewInvoice(preparedInvoice);
    setViewDialogOpen(true);
    setViewTab(initialTab);
    setViewPreviewError(false);
    setInvoiceHistory([]);
    setLoadingHistory(true);

    try {
      const response = await getInvoiceHistory(invoice.id).unwrap();
      let historyEntries = Array.isArray(response)
        ? response
        : normalizeInvoiceHistoryEntries(response);

      if (historyEntries.length === 0) {
        const approvalRecords =
          preparedInvoice.approvalRecords ||
          preparedInvoice.approvalRecords ||
          invoice.approvalRecords ||
          invoice.approvalRecords;
        if (Array.isArray(approvalRecords) && approvalRecords.length > 0) {
          historyEntries = normalizeInvoiceHistoryEntries(approvalRecords);
        }
      }

      setInvoiceHistory(historyEntries);
    } catch (error) {
      console.error('Failed to fetch invoice history:', error);
      toast.error('Failed to load invoice history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleViewPaymentInvoice = async (payment, initialTab = 'details') => {
    const invoice = resolvePaymentInvoice(payment);
    if (!invoice) {
      toast.error('Invoice details are not available');
      return;
    }
    await handleViewInvoice(invoice, initialTab);
  };

  const handleDownloadInvoice = (invoice) => {
    const preparedInvoice = toInvoiceUiPayload(invoice);
    if (!openInvoiceFileDownload(preparedInvoice)) {
      toast.error('No invoice file available for download');
    }
  };

  const handleDownloadPaymentInvoice = (payment) => {
    const invoice = resolvePaymentInvoice(payment);
    if (!invoice) {
      toast.error('Invoice file is not available');
      return;
    }
    handleDownloadInvoice(invoice);
  };

  const getStatusBadgeClass = (status) => getInvoiceStatusBadgeClass(status);

  const renderPdfPreview = (props = {}) => (
    <InvoicePdfPreview
      {...props}
      setPdfZoom={setPdfZoom}
      getInvoiceFileUrl={getInvoiceFileUrl}
    />
  );

  const filteredPendingInvoices = invoices.filter(
    (invoice) =>
      safeLower(invoice.vendorName).includes(safeLower(searchTerm)) ||
      safeLower(invoice.invoiceNumber).includes(safeLower(searchTerm))
  );

  const renderBatchInvoiceRow = (invoice, rowIndex, headers) => (
    <TableRow
      key={invoice.id ?? rowIndex}
      className={createBatchForm.invoice_ids.includes(invoice.id) ? 'bg-primary/10' : ''}
      onClick={() => toggleInvoiceSelection(invoice.id)}
    >
      {headers.map((header) => {
        let value;

        switch (header.key) {
          case 'invoiceNumber':
            value = (
              <div className="flex items-center gap-2">
                <div onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={createBatchForm.invoice_ids.includes(invoice.id)}
                    onCheckedChange={() => toggleInvoiceSelection(invoice.id)}
                    disabled={!canCreateBatch}
                  />
                </div>
                <span>{invoice.invoiceNumber || '-'}</span>
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
        canBulkRelease={canShowBulkRelease}
        currencies={currencies}
        selectedCurrency={selectedCurrency}
        onCurrencyChange={setSelectedCurrency}
        onRefresh={handleRefreshPayments}
        refreshing={paymentsRefreshing}
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
        paymentDialog={
          canShowSinglePayment ? (
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
          ) : null
        }
      />

      {isConnectedBankingEnabled ? (
        <ConnectedBankAccountsPanel
          accounts={bankAccounts}
          loading={bankAccountsFetching}
          className="mb-6"
        />
      ) : null}

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
                  <BankAccountSelectField
                    value={createBatchForm.bank_account_id}
                    onChange={(value) =>
                      setCreateBatchForm((prev) => ({ ...prev, bank_account_id: value }))
                    }
                    accounts={bankAccounts}
                    activeOnly
                    testId="create-batch-bank-select"
                  />
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Select Invoices</Label>
                  <span className="text-sm">
                    Selected: <strong>{createBatchForm.invoice_ids.length}</strong> | Total:{' '}
                    <strong>{'\u20B9'}{selectedBatchTotal.toLocaleString('en-IN')}</strong>
                  </span>
                </div>

                <div className="border rounded-lg max-h-80 overflow-y-auto">
                  <AppDataTable
                    tableHeader={batchInvoiceTableHeader}
                    tableData={batchEligibleInvoices}
                    renderRow={renderBatchInvoiceRow}
                    showCheckbox
                    isChecked={allBatchInvoicesSelected}
                    onSelectAllChange={selectAllInvoices}
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
            handleBulkRelease={handleBulkRelease}
            canBulkRelease={canShowBulkRelease}
            showRecordPaymentSelection={canShowRecordPayment}
            selectedInvoiceIds={recordPaymentInvoiceIds}
            onToggleInvoice={toggleRecordPaymentInvoice}
            onSelectAllInvoices={selectAllRecordPaymentInvoices}
            onOpenRecordPayment={openRecordPaymentDialog}
            onOpenInvoiceReport={openPaymentReportDialog}
            canRecordPayment={canShowRecordPayment}
            canDownloadInvoiceReport={canManagePayments}
            safeFormatDate={safeFormatDate}
            handleViewInvoice={handleViewInvoice}
            handleDownloadInvoice={handleDownloadInvoice}
            canCancelInvoice={(invoice) =>
              Boolean(invoice?.id) &&
              isInvoiceCancellable(invoice, canCancelInvoicesByRole)
            }
            handleCancelInvoice={handleCancelInvoice}
          />
        </TabsContent>

        <TabsContent value="released">
          <ReleasedPaymentsTab
            filteredPayments={filteredPayments}
            safeFormatDate={safeFormatDate}
            resolvePaymentInvoice={resolvePaymentInvoice}
            handleViewPaymentInvoice={handleViewPaymentInvoice}
            handleDownloadPaymentInvoice={handleDownloadPaymentInvoice}
          />
        </TabsContent>
      </Tabs>

      {canShowRecordPayment && (
        <RecordPaymentDialog
          open={recordPaymentDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setRecordPaymentDialogOpen(false);
            }
          }}
          formData={recordPaymentForm}
          setFormData={setRecordPaymentForm}
          selectedInvoices={selectedRecordPaymentInvoices}
          handleSubmit={handleRecordPayments}
          submitting={recordingPayments}
        />
      )}

      <PendingPaymentReportDialog
        open={paymentReportDialogOpen}
        onOpenChange={setPaymentReportDialogOpen}
        invoices={invoices}
        selectedInvoiceIds={paymentReportInvoiceIds}
        onToggleInvoice={togglePaymentReportInvoice}
        onSelectAllInvoices={selectPaymentReportInvoices}
        onDownload={handleDownloadPaymentReport}
        downloading={downloadingPaymentReport}
      />

      <CancelInvoiceDialog
        open={Boolean(invoiceCancelTarget)}
        onOpenChange={(open) => {
          if (!open) setInvoiceCancelTarget(null);
        }}
        invoice={invoiceCancelTarget}
        reason={invoiceCancelReason}
        onReasonChange={setInvoiceCancelReason}
        onSubmit={confirmCancelInvoice}
        submitting={cancelInvoiceLoading}
      />

      <AlertDialog open={bulkReleaseConfirmOpen} onOpenChange={setBulkReleaseConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Release All Pending Payments?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to release payments for {invoices.length} invoices?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <MeteredActionCostHint
            actionCode={CREDIT_ACTION_CODES.PAYMENT_PROCESSING}
            unitCount={invoices.length}
            className="mx-6 mb-2"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkRelease}
              disabled={bulkPaymentEstimate.isDisabled}
            >
              Release Payments
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ViewDialog
        viewDialogOpen={viewDialogOpen}
        setViewDialogOpen={setViewDialogOpen}
        selectedInvoice={viewInvoice}
        renderPdfPreview={renderPdfPreview}
        pdfZoom={pdfZoom}
        viewPreviewError={viewPreviewError}
        setViewPreviewError={setViewPreviewError}
        getStatusBadgeClass={getStatusBadgeClass}
        viewTab={viewTab}
        setViewTab={setViewTab}
        invoiceHistory={invoiceHistory}
        loadingHistory={loadingHistory}
        canEdit={() => false}
        handleEditInvoice={() => {}}
        showCategoryField={isCategoryFeatureEnabled}
        isCategoryFeatureEnabled={isCategoryFeatureEnabled}
        showCampaignField={isCampaignFeatureEnabled}
        isCampaignFeatureEnabled={isCampaignFeatureEnabled}
      />
    </div>
  );
};

export default Payments;

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  useGetInvoicesQuery,
  useCancelInvoiceMutation,
  useLazyGetInvoiceQuery,
  useLazyGetInvoiceHistoryQuery,
} from '../../Services/apis/invoicesVendorsApi';
import { toInvoiceUiPayload, EMPTY_INVOICE_LIST_RESPONSE, getInvoiceListItems } from '../../Services/utils/payloadMappers';
import {
  useGetPendingPaymentsQuery,
  useGetPayablesQuery,
  useGetReleasedPaymentsQuery,
  useLazyGetPaymentQuery,
  useBulkReleasePaymentsMutation,
  useGeneratePendingPaymentInvoiceReportMutation,
  useRecordPaymentsMutation,
  useApprovePayrunMutation,
  useCancelPayrunMutation,
  useCreatePayrunMutation,
  useGetPayrunsQuery,
  useLazyGetPayrunQuery,
  useRejectPayrunMutation,
  useRetryPayrunMutation,
} from '../../Services/apis/approvalsPaymentsBankingApi';
import { useCreatePaymentBatchMutation } from '../../Services/apis/paymentBatchesApi';
import { useLazyGetPurchaseOrderByIdQuery } from '../../Services/apis/purchaseOrdersMasterDataApi';
import { useLazyGetGrnByIdQuery } from '../../Services/apis/goodsReceiptApi';
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
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '../../components/ui/pagination';
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
import { cn } from '../../lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import PaymentsHeader from './components/PaymentsHeader';
import RecordPaymentDialog from './components/RecordPaymentDialog';
import RequestPaymentDialog from './components/RequestPaymentDialog';
import useBankingSetup from '../banking/hooks/useBankingSetup';
import { getLinkedAccounts } from '../banking/utils/accountFormatters';
import PendingPaymentsTab from './components/PendingPaymentsTab';
import PendingPaymentReportDialog from './components/PendingPaymentReportDialog';
import ReleasedPaymentsTab from './components/ReleasedPaymentsTab';
import PayrunsTab from './components/PayrunsTab';
import PayrunDetailsSheet from './components/PayrunDetailsSheet';
import ReleasePaymentDialog from './components/ReleasePaymentDialog';
import {
  DEFAULT_PAYRUN_APPROVAL_ROUTE,
  getPayrunApprovalRecords,
  normalizePayrun,
  normalizePayrunStatus,
} from './components/payrunUtils';
import CancelInvoiceDialog from '../invoices/components/CancelInvoiceDialog';
import BankAccountSelectField from '../../components/banking/BankAccountSelectField';
import ViewDialog from '../invoices/components/ViewDialog';
import PoDetailsDialog from '../purchase-orders/components/PoDetailsDialog';
import GrnDetailDialog from '../goods-receipt/components/GrnDetailDialog';
import { statusColors as poStatusColors } from '../purchase-orders/constants';
import { InvoicePdfPreview } from '../invoices/components/InvoicePdfPreview';
import { getInvoiceFileUrl, openInvoiceFileDownload } from '../invoices/utils/invoicePreview';
import { normalizeInvoiceHistoryEntries } from '../invoices/utils/invoiceHistory';
import { formatInvoiceAmount } from '../invoices/utils/invoiceAmounts';
import { getInvoiceStatusBadgeClass } from '../../utils/approvalWorkflow';
import { useActionGuard } from '../../hooks/useActionGuard';
import { useCreditErrorHandler } from '../../contexts/CreditErrorContext';
import MeteredActionCostHint from '../../components/credits/MeteredActionCostHint';
import { CREDIT_ACTION_CODES } from '../../constants/creditActions';
import { useMeteredActionEstimate } from '../../hooks/useMeteredActionEstimate';
import { useRBAC } from '../../contexts/RBACContext';
import { useCurrencyFilter } from '../../hooks/useCurrencyFilter';
import { CURRENCY_SCREENS, formatCurrency } from '../../utils/currency';
import { isInvoiceFundingEnabled as isInvoiceFundingEnabledForCorporate } from '../../utils/invoiceConfiguration';
import { OrgBranchCell, VendorWithBranchCell } from '../../components/common/BranchTableCells';
import { clearNotificationQueryParams } from '../../utils/notificationQueryParams';
import {
  getPayableSelectionKey,
  getSelectablePayableRows,
  isPayableSelectable,
  normalizePayableRow,
} from './utils/payableRows';
import usePayablesSelection from './hooks/usePayablesSelection';

const safeLower = (value) => String(value ?? '').toLowerCase();

const preventDialogOutsideDismiss = (event) => {
  event.preventDefault();
};

const safeFormatDate = (value, pattern = 'dd MMM yy') => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : format(date, pattern);
};

const clippedTableText = (value, className = '') => {
  const text = String(value || '-');
  return (
    <span className={cn('block min-w-0 truncate text-left', className)} title={text}>
      {text}
    </span>
  );
};

const getRecordBranchLabel = (record = {}) => {
  const name = record.branchName ?? record.branch_name ?? '';
  const code = record.branchCode ?? record.branch_code ?? '';
  if (name && code) return `${name} (${code})`;
  return name || code || '-';
};

const getRecordVendorLabel = (record = {}) => {
  const name = record.vendorName ?? record.vendor_name ?? '-';
  const branchName = record.vendorBranchName ?? record.vendor_branch_name ?? '';
  const branchCode = record.vendorBranchCode ?? record.vendor_branch_code ?? '';
  const branch = branchName && branchCode ? `${branchName} (${branchCode})` : branchName || branchCode;
  return branch ? `${name} - ${branch}` : name;
};

const baseBatchInvoiceTableHeader = [
  { key: 'invoiceNumber', title: 'Invoice', headerClassName: 'text-left', cellClassName: 'font-medium text-left' },
  { key: 'orgBranch', title: 'Branch', headerClassName: 'text-left', cellClassName: 'text-sm text-left' },
  { key: 'vendorName', title: 'Vendor', headerClassName: 'text-left', cellClassName: 'text-left' },
  { key: 'amount', title: 'Amount', headerClassName: 'text-left', cellClassName: 'text-left' },
  { key: 'status', title: 'Status' },
];

const getPaymentReportResponseData = (response = {}) => response.data ?? response;

const getInvoiceCancelCapability = (invoice = {}) =>
  invoice.canCancel ??
  invoice.can_cancel ??
  invoice.cancellable ??
  invoice.isCancellable;

const isInvoiceCancellable = (invoice = {}) => {
  const capability = getInvoiceCancelCapability(invoice);
  return capability === true;
};

const PAYMENTS_TAB_PAGE_SIZE = 25;

const formatMoney = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const getPaymentTabPagination = (pageData = {}, fallbackLimit = PAYMENTS_TAB_PAGE_SIZE, itemCount = 0) => {
  const normalizedPageData = pageData && typeof pageData === 'object' ? pageData : {};
  const total = Number(normalizedPageData.total ?? itemCount) || 0;
  const limit = Number(normalizedPageData.limit ?? fallbackLimit) || fallbackLimit;
  const offset = Number(normalizedPageData.offset ?? 0) || 0;
  const currentPage = limit > 0 ? Math.floor(offset / limit) : 0;
  const totalPages = Number(normalizedPageData.totalPages) || (total > 0 ? Math.ceil(total / limit) : 0);

  return {
    total,
    limit,
    offset,
    currentPage,
    totalPages,
    hasMore: Boolean(normalizedPageData.hasMore ?? offset + itemCount < total),
    startRecord: total === 0 ? 0 : offset + 1,
    endRecord: total === 0 ? 0 : Math.min(offset + itemCount, total),
  };
};

const getVisiblePaymentPageNumbers = (currentPage, totalPages, maxVisible = 5) => {
  if (totalPages <= 0) return [];
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, index) => index);
  }
  const start = Math.min(Math.max(currentPage - 2, 0), totalPages - maxVisible);
  return Array.from({ length: maxVisible }, (_, index) => start + index);
};

const PaymentsTabPagination = ({ pagination, onPageChange, testIdPrefix }) => {
  if (!pagination) return null;

  if (pagination.totalPages <= 1) {
    return (
      <div className="flex shrink-0 border-t border-border p-4">
        <p className="text-sm text-muted-foreground" data-testid={`${testIdPrefix}-pagination-summary`}>
          Showing {pagination.startRecord}-{pagination.endRecord} of{' '}
          {pagination.total.toLocaleString('en-IN')}
        </p>
      </div>
    );
  }

  const visiblePageNumbers = getVisiblePaymentPageNumbers(
    pagination.currentPage,
    pagination.totalPages,
  );

  return (
    <div className="flex shrink-0 flex-col gap-3 border-t border-border p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground" data-testid={`${testIdPrefix}-pagination-summary`}>
        Showing {pagination.startRecord}-{pagination.endRecord} of{' '}
        {pagination.total.toLocaleString('en-IN')}
      </p>
      <Pagination className="mx-0 w-auto justify-start sm:justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(event) => {
                event.preventDefault();
                onPageChange?.(pagination.currentPage - 1);
              }}
              className={pagination.currentPage === 0 ? 'pointer-events-none opacity-50' : undefined}
              data-testid={`${testIdPrefix}-pagination-previous`}
            />
          </PaginationItem>
          {visiblePageNumbers.map((pageNumber) => (
            <PaginationItem key={pageNumber}>
              <PaginationLink
                href="#"
                isActive={pageNumber === pagination.currentPage}
                onClick={(event) => {
                  event.preventDefault();
                  onPageChange?.(pageNumber);
                }}
                data-testid={`${testIdPrefix}-pagination-page-${pageNumber + 1}`}
              >
                {pageNumber + 1}
              </PaginationLink>
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(event) => {
                event.preventDefault();
                onPageChange?.(pagination.currentPage + 1);
              }}
              className={
                !pagination.hasMore && pagination.currentPage >= pagination.totalPages - 1
                  ? 'pointer-events-none opacity-50'
                  : undefined
              }
              data-testid={`${testIdPrefix}-pagination-next`}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
};

const ApprovalDecisionDialog = ({ decision, open, onOpenChange, onConfirm }) => {
  const [comments, setComments] = useState('');

  useEffect(() => {
    if (open) setComments('');
  }, [open]);

  if (!decision?.payrun) return null;
  const isReject = decision.type === 'reject';

  const submit = () => {
    onConfirm(decision.payrun, decision.type, comments.trim());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" onInteractOutside={preventDialogOutsideDismiss}>
        <DialogHeader>
          <DialogTitle>{isReject ? 'Reject Payrun' : 'Approve Payrun'} - {decision.payrun.batchId}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label>{isReject ? 'Rejection Comments' : 'Approval Comments'}</Label>
          <Textarea
            value={comments}
            onChange={(event) => setComments(event.target.value)}
            placeholder={isReject ? 'Add reason for rejection' : 'Add approval comments'}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant={isReject ? 'destructive' : 'default'} onClick={submit}>
            {isReject ? 'Reject' : 'Approve'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const getPayrunActionCopy = (action) => {
  const status = normalizePayrunStatus(action?.payrun?.status);
  if (action?.type === 'retry') {
    return {
      title: 'Retry Failed Payments?',
      description: 'Only failed items from this payrun will be retried. Successfully paid items will not be included.',
      cancelLabel: 'Close',
      actionLabel: 'Retry Failed Items',
    };
  }

  if (status === 'Partially Completed') {
    return {
      title: 'Cancel Partially Completed Payrun?',
      description: 'Only failed items will be released back to Payables. Successfully paid items will remain in Released Payments.',
      cancelLabel: 'Keep Payrun',
      actionLabel: 'Cancel Payrun',
    };
  }

  if (status === 'Failed') {
    return {
      title: 'Cancel Failed Payrun?',
      description: 'This will cancel the payrun and release failed items back to Payables. Paid items, if any, will remain in Released Payments.',
      cancelLabel: 'Keep Payrun',
      actionLabel: 'Cancel Payrun',
    };
  }

  return {
    title: 'Cancel Payrun?',
    description: 'This will discard the payrun and release all items back to Payables so they can be included in a new payrun.',
    cancelLabel: 'Keep Payrun',
    actionLabel: 'Cancel Payrun',
  };
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
  const [searchParams, setSearchParams] = useSearchParams();
  const handledNotificationRef = useRef(null);
  const {
    isPaymentBatchesFeatureEnabled,
    isConnectedBankingEnabled,
    isCategoryFeatureEnabled,
    isCampaignFeatureEnabled,
    isBranchEnabled,
    corporateScreens,
    hasPermission,
  } = useRBAC();
  const showInvoiceFunding = useMemo(
    () =>
      isInvoiceFundingEnabledForCorporate(
        corporateScreens?.activeInvoiceConfiguration ?? [],
      ),
    [corporateScreens?.activeInvoiceConfiguration],
  );
  const {
    currencies,
    selectedCurrency,
    setSelectedCurrency,
    queryArgs: paymentQueryArgs,
  } = useCurrencyFilter(CURRENCY_SCREENS.PAYMENT, { excludeAll: true });
  const [activePaymentTab, setActivePaymentTab] = useState('pending');
  const [pendingPaymentsOffset, setPendingPaymentsOffset] = useState(0);
  const [payrunsOffset, setPayrunsOffset] = useState(0);
  const [releasedPaymentsOffset, setReleasedPaymentsOffset] = useState(0);
  const shouldFetchPendingPayments = activePaymentTab === 'pending';
  const shouldFetchPayruns = isConnectedBankingEnabled && activePaymentTab === 'payruns';
  const shouldFetchReleasedPayments = activePaymentTab === 'released';
  const pendingPaymentsQueryArgs = {
    ...paymentQueryArgs,
    limit: PAYMENTS_TAB_PAGE_SIZE,
    offset: pendingPaymentsOffset,
  };
  const payrunsQueryArgs = {
    ...paymentQueryArgs,
    limit: PAYMENTS_TAB_PAGE_SIZE,
    offset: payrunsOffset,
  };
  const releasedPaymentsQueryArgs = {
    ...paymentQueryArgs,
    limit: PAYMENTS_TAB_PAGE_SIZE,
    offset: releasedPaymentsOffset,
  };
  const paymentCountQueryArgs = {
    ...paymentQueryArgs,
    limit: 1,
    offset: 0,
  };
  const invoiceQueryWithStatus = (status) => ({
    ...paymentQueryArgs,
    status,
  });
  const {
    data: pendingPaymentInvoicesListData = [],
    isError: invoicesError,
    isFetching: pendingPaymentInvoicesFetching,
    refetch: refetchPendingPaymentInvoices,
  } = useGetPayablesQuery(pendingPaymentsQueryArgs, { skip: !shouldFetchPendingPayments });
  const {
    data: pendingPaymentCountData = null,
  } = useGetPayablesQuery(paymentCountQueryArgs, { skip: shouldFetchPendingPayments });
  const {
    data: paymentsData = [],
    isError: paymentsError,
    isFetching: paymentsFetching,
    refetch: refetchPayments,
  } = useGetReleasedPaymentsQuery(releasedPaymentsQueryArgs, { skip: !shouldFetchReleasedPayments });
  const {
    data: releasedPaymentsCountData = null,
  } = useGetReleasedPaymentsQuery(paymentCountQueryArgs, { skip: shouldFetchReleasedPayments });
  const {
    data: payrunsData = [],
    isFetching: payrunsFetching,
    refetch: refetchPayruns,
  } = useGetPayrunsQuery(payrunsQueryArgs, { skip: !shouldFetchPayruns });
  const {
    data: payrunsCountData = null,
  } = useGetPayrunsQuery(paymentCountQueryArgs, { skip: !isConnectedBankingEnabled || shouldFetchPayruns });
  const {
    data: pendingApproverInvoicesListData = EMPTY_INVOICE_LIST_RESPONSE,
    isError: pendingApproverInvoicesError,
    refetch: refetchPendingApproverInvoices,
  } = useGetInvoicesQuery(
    invoiceQueryWithStatus('Pending Approver'),
    { skip: !isPaymentBatchesFeatureEnabled || !shouldFetchPendingPayments },
  );
  const [bulkReleasePayments] = useBulkReleasePaymentsMutation();
  const [recordPayments] = useRecordPaymentsMutation();
  const [generatePendingPaymentInvoiceReport] = useGeneratePendingPaymentInvoiceReportMutation();
  const [createPaymentBatch] = useCreatePaymentBatchMutation();
  const [cancelInvoice, { isLoading: cancelInvoiceLoading }] = useCancelInvoiceMutation();
  const [getInvoice] = useLazyGetInvoiceQuery();
  const [getPayment] = useLazyGetPaymentQuery();
  const [getInvoiceHistory] = useLazyGetInvoiceHistoryQuery();
  const { guardAction, canPerformAction } = useActionGuard();
  const { handleCreditError } = useCreditErrorHandler();
  const {
    accounts,
  } = useBankingSetup({ skip: !isConnectedBankingEnabled });
  const [searchTerm, setSearchTerm] = useState('');
  const [createBatchDialogOpen, setCreateBatchDialogOpen] = useState(false);
  const [recordPaymentDialogOpen, setRecordPaymentDialogOpen] = useState(false);
  const [paymentReportDialogOpen, setPaymentReportDialogOpen] = useState(false);
  const [invoiceCancelTarget, setInvoiceCancelTarget] = useState(null);
  const [invoiceCancelReason, setInvoiceCancelReason] = useState('');
  const [bulkReleaseConfirmOpen, setBulkReleaseConfirmOpen] = useState(false);
  const [creatingBatch, setCreatingBatch] = useState(false);
  const [recordingPayments, setRecordingPayments] = useState(false);
  const [downloadingPaymentReport, setDownloadingPaymentReport] = useState(false);
  const [paymentReportInvoiceIds, setPaymentReportInvoiceIds] = useState([]);
  const [recordPaymentForm, setRecordPaymentForm] = useState({
    paymentDate: '',
    payment_method: 'Bank Transfer',
    reference_number: '',
    actualInrAmount: '',
    advanceAdjustments: {},
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
  const [requestPaymentOpen, setRequestPaymentOpen] = useState(false);
  const [selectedPayrun, setSelectedPayrun] = useState(null);
  const [payrunDetailsOpen, setPayrunDetailsOpen] = useState(false);
  const [approvalDecision, setApprovalDecision] = useState(null);
  const [approvalDecisionOpen, setApprovalDecisionOpen] = useState(false);
  const [payrunActionConfirm, setPayrunActionConfirm] = useState(null);
  const [releasePayrun, setReleasePayrun] = useState(null);
  const [releasePayrunOpen, setReleasePayrunOpen] = useState(false);
  const [createPayrun, { isLoading: creatingPayrun }] = useCreatePayrunMutation();
  const [approvePayrun] = useApprovePayrunMutation();
  const [rejectPayrun] = useRejectPayrunMutation();
  const [cancelPayrun, { isLoading: cancellingPayrun }] = useCancelPayrunMutation();
  const [retryPayrun, { isLoading: retryingPayrun }] = useRetryPayrunMutation();
  const [getPayrun] = useLazyGetPayrunQuery();
  const [getPurchaseOrderById] = useLazyGetPurchaseOrderByIdQuery();
  const [getGrnById] = useLazyGetGrnByIdQuery();
  const [releasedPaymentPo, setReleasedPaymentPo] = useState(null);
  const [releasedPaymentGrn, setReleasedPaymentGrn] = useState(null);
  const [releasedPaymentPoOpen, setReleasedPaymentPoOpen] = useState(false);
  const [releasedPaymentGrnOpen, setReleasedPaymentGrnOpen] = useState(false);
  const [loadingReleasedPaymentSource, setLoadingReleasedPaymentSource] = useState(false);

  const normalizePayment = (payment = {}) => {
    const payable = normalizePayableRow(payment);
    const backendSourceType = payment.sourceType ?? payment.source_type ?? payment.payableType ?? payment.payable_type;
    const sourceDocumentType =
      payment.sourceDocumentType ??
      payment.source_document_type ??
      payment.documentType ??
      payment.document_type ??
      payment.releasedSourceType ??
      payment.released_source_type;
    const invoiceId = payment.invoice_id ?? payment.invoiceId;
    const poId = payment.poId ?? payment.po_id ?? payment.orderId ?? payment.order_id;
    const grnId = payment.grnId ?? payment.grn_id;
    const piId = payment.piId ?? payment.pi_id;
    const obligationId = payment.obligationId ?? payment.obligation_id;
    const advanceId = payment.advanceId ?? payment.advance_id;
    const releasedSourceType = backendSourceType
      ? String(backendSourceType).toUpperCase()
      : invoiceId
        ? 'INVOICE'
        : obligationId
          ? 'OBLIGATION'
          : advanceId
            ? 'ADVANCE'
            : '';

    return {
      ...payable,
      releasedSourceType,
      sourceDocumentType: sourceDocumentType ? String(sourceDocumentType).toUpperCase() : '',
      sourceType: releasedSourceType || payable.sourceType,
      sourceId: payment.sourceId ?? payment.source_id ?? payable.sourceId,
      invoice_id: invoiceId,
      invoiceId,
      poId,
      grnId,
      piId,
      obligationId,
      advanceId,
      triggerStage: payment.triggerStage ?? payment.trigger_stage ?? payable.triggerStage,
      milestoneLabel: payment.milestoneLabel ?? payment.milestone_label ?? payable.milestoneLabel,
      orderId: payment.orderId ?? payment.order_id ?? payable.orderId,
      orderNumber: payment.orderNumber ?? payment.order_number ?? payment.poNumber ?? payment.po_number ?? payable.orderNumber,
      poNumber: payment.poNumber ?? payment.po_number ?? payable.poNumber,
      paymentScheduleId: payment.paymentScheduleId ?? payment.payment_schedule_id ?? payable.paymentScheduleId,
      scheduleRowId: payment.scheduleRowId ?? payment.schedule_row_id ?? payable.scheduleRowId,
      invoiceNumber: payment.invoiceNumber ?? payment.invoice_number ?? payable.invoiceNumber,
      vendorName: payment.vendorName ?? payment.vendor_name ?? payable.vendorName,
      batchId:
        payment.batchId ??
        payment.batch_id ??
        payment.batchNumber ??
        payment.batch_number ??
        payment.payrunNumber ??
        payment.payrun_number ??
        payment.payrunId ??
        payment.payrun_id ??
        payment.paymentBatchId ??
        payment.payment_batch_id,
      paymentDate: payment.paymentDate ?? payment.payment_date ?? payment.paidOn ?? payment.paid_on,
      payment_method: payment.payment_method ?? payment.paymentMethod,
      reference_number:
        payment.reference_number ??
        payment.referenceNumber ??
        payment.utrNumber ??
        payment.utr_number ??
        payment.utr,
      actualInrAmount: payment.actualInrAmount ?? payment.actual_inr_amount,
    };
  };

  const normalizeInvoice = (invoice = {}) => ({
    ...invoice,
    invoiceNumber: invoice.invoiceNumber ?? invoice.invoice_number,
    vendorName: invoice.vendorName ?? invoice.vendor_name,
    invoiceDate: invoice.invoiceDate ?? invoice.invoice_date,
    dueDate: invoice.dueDate ?? invoice.due_date,
  });
  const normalizePendingPaymentInvoice = (invoice = {}) => {
    const normalized = toInvoiceUiPayload(invoice);
    const payable = normalizePayableRow({
      ...normalized,
      ...invoice,
    });

    return {
      ...normalized,
      ...payable,
      grossAmount:
        invoice.totalAmount ??
        invoice.total_amount ??
        normalized.totalAmount ??
        normalized.total_amount,
      originalAmount: payable.originalAmount ?? invoice.amount ?? normalized.originalAmount,
      amount: Number(payable.netPayableAmount ?? 0),
      netAmount: Number(payable.netPayableAmount ?? 0),
      netPayable: Number(payable.netPayableAmount ?? 0),
      netPayableAmount: Number(payable.netPayableAmount ?? 0),
      gstAmount: Number(invoice.gstAmount ?? invoice.gst_amount ?? normalized.gstAmount ?? 0),
      vendorBankName: invoice.vendorBankName ?? invoice.vendor_bank_name ?? normalized.vendorBankName,
      vendorAccountNumber:
        invoice.vendorAccountNumber ??
        invoice.vendor_account_number ??
        normalized.vendorAccountNumber,
      vendorIfscCode: invoice.vendorIfscCode ?? invoice.vendor_ifsc_code ?? normalized.vendorIfscCode,
    };
  };

  const releasedPaymentItems = Array.isArray(paymentsData?.items) ? paymentsData.items : paymentsData;
  const pendingPaymentItems = Array.isArray(pendingPaymentInvoicesListData?.items)
    ? pendingPaymentInvoicesListData.items
    : getInvoiceListItems(pendingPaymentInvoicesListData);
  const payrunItems = Array.isArray(payrunsData?.items) ? payrunsData.items : payrunsData;
  const payments = Array.isArray(releasedPaymentItems)
    ? releasedPaymentItems.map(normalizePayment)
    : [];
  const pendingPaymentInvoices = pendingPaymentItems.map((invoice) =>
    invoice?.payableKey ? invoice : normalizePendingPaymentInvoice(invoice),
  );
  const pendingApproverInvoices = getInvoiceListItems(pendingApproverInvoicesListData).map((invoice) =>
    toInvoiceUiPayload(invoice),
  );
  const invoices = pendingPaymentInvoices;
  const payruns = useMemo(
    () => (Array.isArray(payrunItems) ? payrunItems.map(normalizePayrun) : []),
    [payrunItems],
  );
  const payableInvoices = useMemo(
    () => invoices,
    [invoices],
  );
  const selectablePayableInvoices = useMemo(
    () => getSelectablePayableRows(payableInvoices),
    [payableInvoices],
  );
  const reportableInvoiceRows = useMemo(
    () => selectablePayableInvoices.filter((invoice) => (invoice.sourceType || 'INVOICE') === 'INVOICE'),
    [selectablePayableInvoices],
  );
  const payableSelection = usePayablesSelection(payableInvoices);
  const recordPaymentInvoiceIds = payableSelection.selectedKeys;
  const pendingPaymentsPagination = useMemo(
    () =>
      getPaymentTabPagination(
        pendingPaymentInvoicesListData,
        PAYMENTS_TAB_PAGE_SIZE,
        payableInvoices.length,
      ),
    [pendingPaymentInvoicesListData, payableInvoices.length],
  );
  const payrunsPagination = useMemo(
    () => getPaymentTabPagination(payrunsData, PAYMENTS_TAB_PAGE_SIZE, payruns.length),
    [payrunsData, payruns.length],
  );
  const releasedPaymentsPagination = useMemo(
    () => getPaymentTabPagination(paymentsData, PAYMENTS_TAB_PAGE_SIZE, payments.length),
    [paymentsData, payments.length],
  );
  const pendingPaymentsCountPagination = useMemo(
    () => getPaymentTabPagination(pendingPaymentCountData, PAYMENTS_TAB_PAGE_SIZE, payableInvoices.length),
    [pendingPaymentCountData, payableInvoices.length],
  );
  const payrunsCountPagination = useMemo(
    () => getPaymentTabPagination(payrunsCountData, PAYMENTS_TAB_PAGE_SIZE, payruns.length),
    [payrunsCountData, payruns.length],
  );
  const releasedPaymentsCountPagination = useMemo(
    () => getPaymentTabPagination(releasedPaymentsCountData, PAYMENTS_TAB_PAGE_SIZE, payments.length),
    [releasedPaymentsCountData, payments.length],
  );
  const pendingPaymentsTabTotal = shouldFetchPendingPayments
    ? pendingPaymentsPagination.total
    : pendingPaymentsCountPagination.total;
  const payrunsTabTotal = shouldFetchPayruns
    ? payrunsPagination.total
    : payrunsCountPagination.total;
  const releasedPaymentsTabTotal = shouldFetchReleasedPayments
    ? releasedPaymentsPagination.total
    : releasedPaymentsCountPagination.total;
  const goToPendingPaymentsPage = useCallback((pageIndex) => {
    setPendingPaymentsOffset(Math.max(0, pageIndex) * PAYMENTS_TAB_PAGE_SIZE);
  }, []);
  const goToPayrunsPage = useCallback((pageIndex) => {
    setPayrunsOffset(Math.max(0, pageIndex) * PAYMENTS_TAB_PAGE_SIZE);
  }, []);
  const goToReleasedPaymentsPage = useCallback((pageIndex) => {
    setReleasedPaymentsOffset(Math.max(0, pageIndex) * PAYMENTS_TAB_PAGE_SIZE);
  }, []);
  const bulkPaymentEstimate = useMeteredActionEstimate(
    CREDIT_ACTION_CODES.PAYMENT_PROCESSING,
    selectablePayableInvoices.length,
  );
  const batchEligibleInvoices = [...selectablePayableInvoices, ...pendingApproverInvoices];
  const bankAccounts = useMemo(
    () => getLinkedAccounts(accounts),
    [accounts],
  );
  const batchInvoiceTableHeader = useMemo(
    () =>
      isBranchEnabled
        ? baseBatchInvoiceTableHeader
        : baseBatchInvoiceTableHeader.filter((header) => header.key !== 'orgBranch'),
    [isBranchEnabled],
  );

  const hasLegacyPaymentManage = hasPermission('payments-manage');
  const canPaymentAdmin = hasPermission('payments-admin') || hasLegacyPaymentManage;
  const canPaymentRequester = hasPermission('payments-requester') || hasLegacyPaymentManage;
  const canPaymentApprover = hasPermission('payments-approver') || canPaymentAdmin;
  const canManagePayments = hasLegacyPaymentManage;
  const canBulkRelease = canPerformAction('payments.releaseBulk');
  const canCreateBatch =
    isPaymentBatchesFeatureEnabled && canPerformAction('payments.createBatch');
  const canCreatePayrun = canPaymentRequester && canPerformAction('payments.createPayrun');
  const canApprovePayrun = canPaymentApprover && canPerformAction('payments.approvePayrun');
  const canCancelPayrun = canPaymentRequester && canPerformAction('payments.cancelPayrun');
  const canReleasePayrun = canPaymentAdmin && canPerformAction('payments.releasePayrun');
  const showPayrunFlow = isConnectedBankingEnabled;
  const showRecordPaymentFlow = !showPayrunFlow && !isPaymentBatchesFeatureEnabled;
  const canShowBulkRelease = isPaymentBatchesFeatureEnabled && canBulkRelease;
  const canShowRecordPayment = showRecordPaymentFlow && canManagePayments;
  const paymentsRefreshing =
    (shouldFetchReleasedPayments && paymentsFetching) ||
    (shouldFetchPendingPayments && pendingPaymentInvoicesFetching) ||
    (shouldFetchPayruns && payrunsFetching);

  useEffect(() => {
    if (!showPayrunFlow && activePaymentTab === 'payruns') {
      setActivePaymentTab('pending');
    }
  }, [activePaymentTab, showPayrunFlow]);

  useEffect(() => {
    setPendingPaymentsOffset(0);
    setPayrunsOffset(0);
    setReleasedPaymentsOffset(0);
  }, [selectedCurrency]);

  const handleRefreshPayments = async () => {
    try {
      if (shouldFetchPendingPayments) {
        await refetchPendingPaymentInvoices();
      } else if (shouldFetchPayruns) {
        await refetchPayruns();
      } else if (shouldFetchReleasedPayments) {
        await refetchPayments();
      }
      toast.success('Payments refreshed');
    } catch {
      toast.error('Failed to refresh payments');
    }
  };

  const refreshPayrunRelatedData = useCallback(async (payrunId = null) => {
    const refreshes = [];
    if (shouldFetchPayruns) refreshes.push(refetchPayruns());
    if (shouldFetchPendingPayments) refreshes.push(refetchPendingPaymentInvoices());
    if (shouldFetchReleasedPayments) refreshes.push(refetchPayments());
    if (payrunId && payrunDetailsOpen) {
      refreshes.push(
        getPayrun(payrunId)
          .unwrap()
          .then((freshPayrun) => {
            setSelectedPayrun(freshPayrun);
          }),
      );
    }
    await Promise.allSettled(refreshes);
  }, [
    getPayrun,
    payrunDetailsOpen,
    refetchPayments,
    refetchPayruns,
    refetchPendingPaymentInvoices,
    shouldFetchPayruns,
    shouldFetchPendingPayments,
    shouldFetchReleasedPayments,
  ]);

  useEffect(() => {
    if (paymentsError) toast.error('Failed to load payments');
  }, [paymentsError]);

  useEffect(() => {
    if (invoicesError) toast.error('Failed to load invoices');
  }, [invoicesError]);

  useEffect(() => {
    if (pendingApproverInvoicesError) toast.error('Failed to load pending approver invoices');
  }, [pendingApproverInvoicesError]);

  const handleBulkRelease = async () => {
    if (!guardAction('payments.releaseBulk')) return;
    if (selectablePayableInvoices.length === 0) {
      toast.error('No pending payments to release');
      return;
    }
    if (payableInvoices.some((invoice) => !isPayableSelectable(invoice))) {
      toast.error('Some payable rows need backend source-aware payment support before release');
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

  const resetCreateBatchForm = () => {
    setCreateBatchForm({
      payment_method: 'NEFT',
      bank_account_id: '',
      invoice_ids: [],
      notes: '',
    });
  };

  const toggleInvoiceSelection = (payableKey) => {
    setCreateBatchForm((prev) => {
      const invoiceIds = prev.invoice_ids.includes(payableKey)
        ? prev.invoice_ids.filter((id) => id !== payableKey)
        : [...prev.invoice_ids, payableKey];
      return { ...prev, invoice_ids: invoiceIds };
    });
  };

  const selectAllInvoices = () => {
    setCreateBatchForm((prev) => ({
      ...prev,
      invoice_ids: prev.invoice_ids.length === batchEligibleInvoices.length
        ? []
        : batchEligibleInvoices.map(getPayableSelectionKey),
    }));
  };

  const selectedBatchTotal = batchEligibleInvoices
    .filter((invoice) => createBatchForm.invoice_ids.includes(getPayableSelectionKey(invoice)))
    .reduce((sum, invoice) => sum + (invoice.amount || 0), 0);
  const allBatchInvoicesSelected =
    batchEligibleInvoices.length > 0 &&
    createBatchForm.invoice_ids.length === batchEligibleInvoices.length;

  const resetRecordPaymentForm = () => {
    payableSelection.clear();
    setRecordPaymentForm({
      paymentDate: '',
      payment_method: 'Bank Transfer',
      reference_number: '',
      actualInrAmount: '',
      advanceAdjustments: {},
    });
  };

  const selectedRecordPaymentInvoices = payableSelection.selectedRows;
  const selectedRecordPaymentHasConvertedInvoice = selectedRecordPaymentInvoices.some(
    (invoice) => Boolean(invoice.convertToInr),
  );

  const openPaymentReportDialog = () => {
    if (!guardAction('payments.create')) return;
    if (reportableInvoiceRows.length === 0) {
      toast.error('No pending invoices available for report');
      return;
    }

    setPaymentReportInvoiceIds((prev) =>
      prev.length > 0 ? prev : reportableInvoiceRows
        .map((invoice) => invoice.invoiceId || invoice.id),
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
    if (!isInvoiceCancellable(invoice)) {
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
      await refetchPendingPaymentInvoices();
    } catch (error) {
      toast.error(error?.data?.detail || error?.data?.message || 'Failed to cancel invoice');
    }
  };

  const openRecordPaymentDialog = () => {
    if (recordPaymentInvoiceIds.length === 0) {
      toast.error('Please select at least one payable row from the list');
      return;
    }
    setRecordPaymentForm((prev) => ({
      ...prev,
      payment_method: prev.payment_method || 'Bank Transfer',
      paymentDate: prev.paymentDate || new Date().toISOString().slice(0, 10),
    }));
    setRecordPaymentDialogOpen(true);
  };

  const openRequestPaymentDialog = () => {
    if (!guardAction('payments.createPayrun')) return;
    if (!canCreatePayrun) {
      toast.error('You do not have permission to create payruns');
      return;
    }
    if (recordPaymentInvoiceIds.length === 0) {
      toast.error('Please select at least one payable row from the list');
      return;
    }
    setRequestPaymentOpen(true);
  };

  const handleCreatePayrun = async (payload) => {
    let response;
    try {
      response = await createPayrun(payload).unwrap();
    } catch (error) {
      toast.error(error?.data?.detail || error?.data?.message || 'Failed to create payrun');
      return;
    }

    payableSelection.clear();
    setRequestPaymentOpen(false);
    setActivePaymentTab('payruns');
    toast.success(`${response?.payrunNumber || response?.payrun_number || response?.data?.payrunNumber || response?.data?.payrun_number || 'Payrun'} created`);

    try {
      await refetchPayruns();
    } catch (error) {
      console.error('Failed to refresh payruns after create:', error);
      toast.error('Payrun created, but the list could not be refreshed. Please refresh.');
    }
  };

  const openApprovalDecision = (payrun, type) => {
    if (!guardAction(type === 'reject' ? 'payments.rejectPayrun' : 'payments.approvePayrun')) return;
    const actionKey = type === 'reject' ? 'reject' : 'approve';
    if (!payrun.allowedActions?.[actionKey]) {
      toast.error(`This payrun is not available to ${type}`);
      return;
    }
    if (payrun.approvalRoute === DEFAULT_PAYRUN_APPROVAL_ROUTE && !canPaymentAdmin) {
      toast.error('Only Admin or Master Admin can approve the generic admin route');
      return;
    }
    const pendingApprovals = getPayrunApprovalRecords(payrun).filter((approval) => approval.status === 'Pending');
    if (payrun.status !== 'Waiting For Approval' || pendingApprovals.length === 0) {
      toast.error('This payrun has already been actioned');
      return;
    }
    setApprovalDecision({ payrun, type });
    setApprovalDecisionOpen(true);
  };

  const confirmApprovalDecision = async (payrun, type, comments) => {
    const isReject = type === 'reject';
    const pendingApproval = getPayrunApprovalRecords(payrun).find((approval) => approval.status === 'Pending');
    const invoiceIds = (payrun.invoices || [])
      .map((invoice) => invoice.invoiceId || invoice.invoice_id || invoice.id)
      .filter((id) => id !== undefined && id !== null);
    try {
      const action = isReject ? rejectPayrun : approvePayrun;
      await action({
        payrunId: payrun.payrunId || payrun.id,
        approvalId: pendingApproval?.id,
        invoiceIds,
        comments,
      }).unwrap();
      setApprovalDecisionOpen(false);
      setApprovalDecision(null);
      await refetchPayruns();
      toast[isReject ? 'error' : 'success'](isReject ? 'Payrun rejected' : 'Payrun approved');
    } catch (error) {
      toast.error(error?.data?.detail || error?.data?.message || `Failed to ${isReject ? 'reject' : 'approve'} payrun`);
    }
  };

  const openPayrunCancelConfirmation = (payrun) => {
    if (!guardAction('payments.cancelPayrun')) return;
    if (!payrun.allowedActions?.cancel) {
      toast.error('This payrun cannot be cancelled');
      return;
    }
    setPayrunActionConfirm({ type: 'cancel', payrun });
  };

  const openPayrunRetryConfirmation = (payrun) => {
    if (!guardAction('payments.releasePayrun')) return;
    if (!payrun.allowedActions?.retry) {
      toast.error('This payrun cannot be retried');
      return;
    }
    setPayrunActionConfirm({ type: 'retry', payrun });
  };

  const confirmPayrunAction = async () => {
    if (!payrunActionConfirm?.payrun) return;
    const { payrun, type } = payrunActionConfirm;
    const payrunId = payrun.payrunId || payrun.id;
    if (!payrunId) {
      toast.error('Payrun id is missing');
      return;
    }
    try {
      const action = type === 'retry' ? retryPayrun : cancelPayrun;
      const payload = type === 'retry'
        ? {
            payrunId,
            ...(Array.isArray(payrun.retryableItemIds) && payrun.retryableItemIds.length
              ? { itemIds: payrun.retryableItemIds }
              : {}),
          }
        : {
            payrunId,
            comments: 'Cancelled by user',
          };
      const response = await action(payload).unwrap();
      const normalizedResponsePayrun = response?.payrun || response?.data?.payrun || response?.data || response;
      if (normalizedResponsePayrun && typeof normalizedResponsePayrun === 'object') {
        setSelectedPayrun(normalizePayrun(normalizedResponsePayrun));
      }
      setPayrunActionConfirm(null);
      await refreshPayrunRelatedData(payrunId);
      toast.success(response?.message || response?.data?.message || (type === 'retry' ? 'Payrun retry initiated' : 'Payrun cancelled'));
    } catch (error) {
      toast.error(error?.data?.detail || error?.data?.message || (type === 'retry' ? 'Failed to retry payrun' : 'Failed to cancel payrun'));
    }
  };

  const openPayrunDetails = (payrun) => {
    setSelectedPayrun(payrun);
    setPayrunDetailsOpen(true);
  };

  const openReleasePayrun = async (payrun) => {
    if (!guardAction('payments.releasePayrun')) return;
    if (!payrun.allowedActions?.release) {
      toast.error('This payrun is not available for release');
      return;
    }
    const payrunId = payrun.payrunId || payrun.id;
    if (!payrunId) {
      toast.error('Payrun id is missing');
      return;
    }
    try {
      const freshPayrun = await getPayrun(payrunId).unwrap();
      setReleasePayrun(freshPayrun);
    } catch (error) {
      toast.error(error?.data?.message || error?.data?.detail || 'Could not load latest payrun details. Using current payrun data.');
      setReleasePayrun(payrun);
    }
    setReleasePayrunOpen(true);
  };

  const handlePayrunPaid = async (paidPayrun) => {
    const normalized = normalizePayrun(paidPayrun);
    setReleasePayrun(normalized);
    setSelectedPayrun(normalized);
    await refreshPayrunRelatedData(normalized.payrunId || normalized.id);
  };

  const toggleRecordPaymentInvoice = (payableKey) => {
    const result = payableSelection.toggle(payableKey);
    if (!result.ok) toast.error(result.error || 'This payable row is not available for payment yet');
  };

  const selectAllRecordPaymentInvoices = (visibleRows = selectablePayableInvoices) => {
    const result = payableSelection.selectAll(visibleRows);
    if (!result.ok) toast.error(result.error || 'Unable to select all payable rows');
  };

  const handleRecordPayments = async (event) => {
    event.preventDefault();
    if (!guardAction('payments.create')) return;

    const allSelectedRowsInvoiceBacked = selectedRecordPaymentInvoices.every(
      (invoice) => (invoice.sourceType || 'INVOICE') === 'INVOICE',
    );
    const invoiceNumbers = allSelectedRowsInvoiceBacked ? selectedRecordPaymentInvoices
      .map((invoice) => String(invoice.invoiceNumber || '').trim())
      .filter(Boolean) : [];
    const sourceItems = selectedRecordPaymentInvoices.map((invoice) => {
      const sourceType = invoice.sourceType || 'INVOICE';
      const sourceId =
        invoice.sourceId ||
        (sourceType === 'OBLIGATION' ? invoice.obligationId : undefined) ||
        (sourceType === 'ADVANCE' ? invoice.advanceId : undefined) ||
        invoice.invoiceId ||
        invoice.id;
      const advanceAdjustment = recordPaymentForm.advanceAdjustments?.[invoice.id] || {};
      const adjustFromVendorAdvance = Boolean(advanceAdjustment.adjustFromVendorAdvance);

      return {
        sourceType,
        ...(sourceType === 'OBLIGATION'
          ? { sourceId, obligationId: invoice.obligationId || sourceId }
          : sourceType === 'ADVANCE'
            ? { sourceId, advanceId: invoice.advanceId || sourceId }
            : { invoiceId: invoice.invoiceId || invoice.id }),
        netPayableAmount: Number(invoice.netPayableAmount ?? invoice.amount ?? 0),
        ...(adjustFromVendorAdvance
          ? {
              adjustFromVendorAdvance: true,
            }
          : {}),
      };
    });

    if (sourceItems.length === 0) {
      toast.error('Please select at least one payable row');
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
    if (selectedRecordPaymentHasConvertedInvoice) {
      const actualInrAmount = Number(recordPaymentForm.actualInrAmount);
      if (!Number.isFinite(actualInrAmount) || actualInrAmount <= 0) {
        toast.error('Actual INR Amount is required for converted foreign invoices');
        return;
      }
    }

    const referenceNumber = String(recordPaymentForm.reference_number || '').trim();

    setRecordingPayments(true);
    try {
      const actualInrAmount = selectedRecordPaymentHasConvertedInvoice
        ? Number(recordPaymentForm.actualInrAmount)
        : null;
      const response = await recordPayments({
        items: sourceItems,
        invoiceNumbers,
        paymentDate: new Date(recordPaymentForm.paymentDate).toISOString(),
        paymentMethod: recordPaymentForm.payment_method,
        ...(referenceNumber ? { referenceNumber } : {}),
        ...(selectedRecordPaymentHasConvertedInvoice
          ? {
              currency: 'INR',
              amount: actualInrAmount,
              paymentAmount: actualInrAmount,
              actualInrAmount,
            }
          : {}),
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
      const selectedBatchRows = batchEligibleInvoices.filter((invoice) =>
        createBatchForm.invoice_ids.includes(getPayableSelectionKey(invoice)),
      );
      const batchPayload = {
        ...createBatchForm,
        invoice_ids: selectedBatchRows
          .filter((invoice) => (invoice.sourceType || 'INVOICE') === 'INVOICE')
          .map((invoice) => invoice.invoiceId || invoice.id),
        items: selectedBatchRows.map((invoice) => {
          const sourceType = invoice.sourceType || 'INVOICE';
          const sourceId =
            invoice.sourceId ||
            (sourceType === 'OBLIGATION' ? invoice.obligationId : undefined) ||
            (sourceType === 'ADVANCE' ? invoice.advanceId : undefined) ||
            invoice.invoiceId ||
            invoice.id;

          return {
            sourceType,
            ...(sourceType === 'OBLIGATION'
              ? { sourceId, obligationId: invoice.obligationId || sourceId }
              : sourceType === 'ADVANCE'
                ? { sourceId, advanceId: invoice.advanceId || sourceId }
                : { invoiceId: invoice.invoiceId || invoice.id }),
            netPayableAmount: Number(invoice.netPayableAmount ?? invoice.amount ?? 0),
          };
        }),
      };
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
    const embeddedInvoice =
      normalizedPayment.invoice ??
      normalizedPayment.invoiceDetails ??
      normalizedPayment.invoice_details;
    if (embeddedInvoice) return toInvoiceUiPayload(embeddedInvoice);
    return null;
  };

  const getInvoicePreviewId = (invoice) => (
    invoice?.id ??
    invoice?.invoiceId ??
    invoice?.invoice_id
  );

  const getPaymentInvoicePreviewId = (payment) => (
    payment?.invoice_id ??
    payment?.invoiceId ??
    payment?.invoice?.id ??
    payment?.invoice?.invoiceId ??
    payment?.invoice?.invoice_id ??
    payment?.invoiceDetails?.id ??
    payment?.invoiceDetails?.invoiceId ??
    payment?.invoiceDetails?.invoice_id ??
    payment?.invoice_details?.id ??
    payment?.invoice_details?.invoiceId ??
    payment?.invoice_details?.invoice_id
  );

  const loadInvoiceDetailsForPreview = async (invoiceId, fallbackInvoice = null) => {
    const preparedFallback = fallbackInvoice ? toInvoiceUiPayload(fallbackInvoice) : null;
    if (!invoiceId) return preparedFallback;

    try {
      const invoiceDetails = await getInvoice(invoiceId).unwrap();
      return {
        ...(preparedFallback || {}),
        ...toInvoiceUiPayload(invoiceDetails),
      };
    } catch (error) {
      console.error('Failed to fetch invoice details:', error);
      toast.error('Failed to load invoice details');
      return preparedFallback;
    }
  };

  const loadPaymentInvoice = async (payment) => {
    const fallbackInvoice = resolvePaymentInvoice(payment);
    const normalizedPayment = normalizePayment(payment);
    const invoiceId =
      normalizedPayment.piId ??
      normalizedPayment.invoiceId ??
      getPaymentInvoicePreviewId(payment) ??
      getInvoicePreviewId(fallbackInvoice);
    return loadInvoiceDetailsForPreview(invoiceId, fallbackInvoice);
  };

  const getReleasedPaymentSourceDocumentType = (payment = {}) => {
    const normalizedPayment = normalizePayment(payment);
    const explicitType = normalizedPayment.sourceDocumentType;
    if (explicitType) return explicitType;

    const sourceType = String(normalizedPayment.releasedSourceType || normalizedPayment.sourceType || '').toUpperCase();
    if (sourceType === 'INVOICE') return normalizedPayment.triggerStage === 'PI' ? 'PI' : 'INVOICE';
    if (normalizedPayment.grnId) return 'GRN';
    if (normalizedPayment.poId) return 'PO';
    if (normalizedPayment.piId) return 'PI';
    if (normalizedPayment.advanceId) return 'ADVANCE';
    return sourceType || '';
  };

  const getReleasedPaymentSourceId = (payment = {}, sourceDocumentType = '') => {
    const normalizedPayment = normalizePayment(payment);
    switch (sourceDocumentType) {
      case 'PO':
        return normalizedPayment.poId || normalizedPayment.orderId;
      case 'GRN':
        return normalizedPayment.grnId;
      case 'PI':
        return normalizedPayment.piId || normalizedPayment.invoiceId || normalizedPayment.sourceId;
      case 'TI':
      case 'INVOICE':
        return normalizedPayment.invoiceId || normalizedPayment.sourceId;
      case 'ADVANCE':
        return normalizedPayment.advanceId || normalizedPayment.sourceId;
      default:
        return normalizedPayment.sourceId || normalizedPayment.invoiceId;
    }
  };

  const handleViewInvoice = async (invoice, initialTab = 'details', options = {}) => {
    const preparedInvoice = options.skipDetailFetch
      ? toInvoiceUiPayload(invoice)
      : await loadInvoiceDetailsForPreview(
        getInvoicePreviewId(invoice),
        invoice,
      );
    if (!preparedInvoice) {
      toast.error('Invoice details are not available');
      return;
    }

    setViewInvoice(preparedInvoice);
    setViewDialogOpen(true);
    setViewTab(initialTab);
    setViewPreviewError(false);
    setInvoiceHistory([]);
    setLoadingHistory(true);

    try {
      const historyInvoiceId = getInvoicePreviewId(preparedInvoice) ?? getInvoicePreviewId(invoice);
      if (!historyInvoiceId) {
        setInvoiceHistory([]);
        return;
      }

      const response = await getInvoiceHistory(historyInvoiceId).unwrap();
      let historyEntries = Array.isArray(response)
        ? response
        : normalizeInvoiceHistoryEntries(response);

      if (historyEntries.length === 0) {
        const approvalRecords =
          preparedInvoice.approvalRecords ||
          invoice?.approvalRecords;
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
    const invoice = await loadPaymentInvoice(payment);
    if (!invoice) {
      toast.error('Invoice details are not available');
      return;
    }
    await handleViewInvoice(invoice, initialTab, { skipDetailFetch: true });
  };

  const handleViewReleasedPaymentSource = async (payment, initialTab = 'details') => {
    const sourceDocumentType = getReleasedPaymentSourceDocumentType(payment);
    const sourceId = getReleasedPaymentSourceId(payment, sourceDocumentType);

    if (['INVOICE', 'PI', 'TI'].includes(sourceDocumentType)) {
      await handleViewPaymentInvoice(payment, initialTab);
      return;
    }

    if (!sourceId) {
      toast.error('Source details are not available');
      return;
    }

    setLoadingReleasedPaymentSource(true);
    try {
      if (sourceDocumentType === 'PO') {
        const po = await getPurchaseOrderById(sourceId).unwrap();
        setReleasedPaymentPo(po);
        setReleasedPaymentPoOpen(true);
        return;
      }

      if (sourceDocumentType === 'GRN') {
        const grn = await getGrnById(sourceId).unwrap();
        setReleasedPaymentGrn(grn);
        setReleasedPaymentGrnOpen(true);
        return;
      }

      toast.error('This payment source type is not available for preview yet');
    } catch (error) {
      console.error('Failed to load released payment source:', error);
      toast.error('Failed to load source details');
    } finally {
      setLoadingReleasedPaymentSource(false);
    }
  };

  const closePaymentViewDialog = useCallback((open) => {
    setViewDialogOpen(open);
    if (!open) {
      clearNotificationQueryParams(searchParams, setSearchParams);
    }
  }, [searchParams, setSearchParams]);

  const notificationSource = searchParams.get('source');
  const notificationAction = searchParams.get('action');
  const notificationInvoiceId = searchParams.get('invoiceId');
  const notificationPaymentId = searchParams.get('paymentId');
  const notificationWeakEntity = searchParams.get('weakEntity') === '1';

  useEffect(() => {
    if (notificationSource !== 'notification' || notificationAction !== 'preview') return;

    const targetId = notificationInvoiceId || notificationPaymentId;
    if (!targetId) return;

    const notificationKey = notificationInvoiceId
      ? `payment-invoice:${notificationInvoiceId}`
      : `payment:${notificationPaymentId}`;
    if (handledNotificationRef.current === notificationKey) return;
    handledNotificationRef.current = notificationKey;

    if (notificationInvoiceId) {
      const loadedInvoice = [
        ...pendingPaymentInvoices,
        ...pendingApproverInvoices,
      ].find((invoice) => String(invoice.id) === String(notificationInvoiceId));

      if (loadedInvoice) {
        handleViewInvoice(loadedInvoice);
        return;
      }

      if (notificationWeakEntity) {
        toast.warning('Invoice details are not available yet.');
        return;
      }

      getInvoice(notificationInvoiceId)
        .unwrap()
        .then((invoice) => handleViewInvoice(invoice))
        .catch(() => {
          toast.warning('Invoice details are not available yet.');
        });
      return;
    }

    const loadedPayment = payments.find((payment) => (
      String(payment.id ?? payment.paymentId ?? payment.payment_id) === String(notificationPaymentId)
    ));

    if (loadedPayment) {
      handleViewPaymentInvoice(loadedPayment);
      return;
    }

    if (notificationWeakEntity) {
      toast.warning('Payment details are not available yet.');
      return;
    }

    getPayment(notificationPaymentId)
      .unwrap()
      .then((payment) => handleViewPaymentInvoice(payment))
      .catch(() => {
        toast.warning('Payment details are not available yet.');
      });
  }, [
    getInvoice,
    getPayment,
    notificationAction,
    notificationInvoiceId,
    notificationPaymentId,
    notificationSource,
    notificationWeakEntity,
    payments,
    pendingApproverInvoices,
    pendingPaymentInvoices,
  ]);

  const handleDownloadInvoice = (invoice) => {
    const preparedInvoice = toInvoiceUiPayload(invoice);
    if (!openInvoiceFileDownload(preparedInvoice)) {
      toast.error('No invoice file available for download');
    }
  };

  const handleDownloadPaymentInvoice = async (payment) => {
    const invoice = await loadPaymentInvoice(payment);
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

  const filteredPendingInvoices = payableInvoices.filter(
    (invoice) =>
      safeLower(invoice.vendorName).includes(safeLower(searchTerm)) ||
      safeLower(invoice.invoiceNumber).includes(safeLower(searchTerm)) ||
      safeLower(invoice.referenceNumber).includes(safeLower(searchTerm)) ||
      safeLower(invoice.poNumber).includes(safeLower(searchTerm)) ||
      safeLower(invoice.orderNumber).includes(safeLower(searchTerm)) ||
      safeLower(invoice.advanceNumber).includes(safeLower(searchTerm)) ||
      safeLower(invoice.milestoneLabel).includes(safeLower(searchTerm))
  );
  const filteredPayruns = payruns.filter((payrun) =>
    safeLower(payrun.batchId).includes(safeLower(searchTerm)) ||
    safeLower(payrun.createdBy).includes(safeLower(searchTerm)) ||
    safeLower(payrun.admin?.name).includes(safeLower(searchTerm)),
  );
  const activePayruns = filteredPayruns.filter((payrun) => payrun.status !== 'Paid');

  const renderBatchInvoiceRow = (invoice, rowIndex, headers) => (
    <TableRow
      key={getPayableSelectionKey(invoice) || invoice.id || rowIndex}
      className={createBatchForm.invoice_ids.includes(getPayableSelectionKey(invoice)) ? 'bg-primary/10' : ''}
      onClick={() => toggleInvoiceSelection(getPayableSelectionKey(invoice))}
    >
      {headers.map((header) => {
        let value;

        switch (header.key) {
          case 'invoiceNumber':
            value = (
              <div className="flex items-center gap-2">
                <div onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={createBatchForm.invoice_ids.includes(getPayableSelectionKey(invoice))}
                    onCheckedChange={() => toggleInvoiceSelection(getPayableSelectionKey(invoice))}
                    disabled={!canCreateBatch}
                  />
                </div>
                {clippedTableText(invoice.invoiceNumber)}
              </div>
            );
            break;
          case 'amount':
            value = (
              <div className="space-y-0.5">
                {clippedTableText(formatInvoiceAmount(invoice, invoice.amount || 0))}
                {invoice.convertToInr && Number(invoice.matchingInrValue) > 0 ? (
                  <div className="text-xs text-muted-foreground">
                    Converted INR Amount: {formatInvoiceAmount(
                      { currency: 'INR' },
                      invoice.matchingInrValue,
                    )}
                  </div>
                ) : null}
              </div>
            );
            break;
          case 'vendorName':
            value = clippedTableText(getRecordVendorLabel(invoice));
            break;
          case 'orgBranch':
            value = clippedTableText(getRecordBranchLabel(invoice));
            break;
          default:
            value = clippedTableText(invoice?.[header.key]);
        }

        return (
          <TableCell
            key={header.key}
            className={cn('max-w-[180px] overflow-hidden whitespace-nowrap border border-table-border text-left align-middle', header.cellClassName)}
          >
            {value}
          </TableCell>
        );
      })}
    </TableRow>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3" data-testid="payments-page">
      <div className="shrink-0">
        <PaymentsHeader
          currencies={currencies}
          selectedCurrency={selectedCurrency}
          onCurrencyChange={setSelectedCurrency}
          onRefresh={handleRefreshPayments}
          refreshing={paymentsRefreshing}
        />
      </div>

      {isPaymentBatchesFeatureEnabled && (
        <Dialog
          open={createBatchDialogOpen}
          onOpenChange={(open) => {
            if (!open) resetCreateBatchForm();
            setCreateBatchDialogOpen(open);
          }}
        >
          <DialogContent
            className="max-w-4xl max-h-[90vh] overflow-y-auto"
            onInteractOutside={preventDialogOutsideDismiss}
          >
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
                    tableClassName="table-fixed"
                    bordered
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

      <div className="shrink-0 relative max-w-sm">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by vendor, invoice, PO, advance, or milestone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
          data-testid="payment-search-input"
        />
      </div>

      {/* Tabs are composed from feature components to keep page orchestration small. */}
      <Tabs value={activePaymentTab} onValueChange={setActivePaymentTab} className="flex min-h-0 flex-1 flex-col gap-3">
        <TabsList className="shrink-0 w-fit">
          <TabsTrigger value="pending" data-testid="tab-pending-payments">
            Pending Payments ({pendingPaymentsTabTotal})
          </TabsTrigger>
          {showPayrunFlow && (
            <TabsTrigger value="payruns" data-testid="tab-payruns">
              Payruns ({payrunsTabTotal})
            </TabsTrigger>
          )}
          <TabsTrigger value="released" data-testid="tab-released-payments">
            Released Payments ({releasedPaymentsTabTotal})
          </TabsTrigger>
        </TabsList>

        <div className="relative min-h-0 flex-1">
          <TabsContent
            value="pending"
            className="absolute inset-0 mt-0 flex min-h-0 flex-col focus-visible:outline-none data-[state=inactive]:hidden"
          >
            <PendingPaymentsTab
              invoices={payableInvoices}
              filteredPendingInvoices={filteredPendingInvoices}
              handleBulkRelease={handleBulkRelease}
              canBulkRelease={showPayrunFlow ? false : canShowBulkRelease}
              showRecordPaymentSelection={
                canShowRecordPayment ||
                (!showPayrunFlow && canCreateBatch) ||
                (showPayrunFlow && canCreatePayrun)
              }
              selectedInvoiceIds={recordPaymentInvoiceIds}
              onToggleInvoice={toggleRecordPaymentInvoice}
              onSelectAllInvoices={selectAllRecordPaymentInvoices}
              onOpenRecordPayment={showPayrunFlow ? openRequestPaymentDialog : openRecordPaymentDialog}
              onOpenCreateBatch={() => {
                setCreateBatchForm((prev) => ({
                  ...prev,
                  invoice_ids: recordPaymentInvoiceIds,
                }));
                setCreateBatchDialogOpen(true);
              }}
              onOpenInvoiceReport={openPaymentReportDialog}
              canRecordPayment={canShowRecordPayment || (showPayrunFlow && canCreatePayrun)}
              canCreateBatch={!showPayrunFlow && canCreateBatch}
              paymentActionLabel={showPayrunFlow ? 'Request Payment' : 'Record Payment'}
              canDownloadInvoiceReport={canManagePayments}
              safeFormatDate={safeFormatDate}
              handleViewInvoice={handleViewInvoice}
              handleDownloadInvoice={handleDownloadInvoice}
              canCancelInvoice={(invoice) =>
                Boolean(invoice?.id) && isInvoiceCancellable(invoice)
              }
              handleCancelInvoice={handleCancelInvoice}
              showBranchField={isBranchEnabled}
              paginationFooter={
                <PaymentsTabPagination
                  pagination={pendingPaymentsPagination}
                  onPageChange={goToPendingPaymentsPage}
                  testIdPrefix="pending-payments"
                />
              }
            />
          </TabsContent>

          {showPayrunFlow && (
            <TabsContent
              value="payruns"
              className="absolute inset-0 mt-0 flex min-h-0 flex-col focus-visible:outline-none data-[state=inactive]:hidden"
            >
              <PayrunsTab
                payruns={activePayruns}
                onView={openPayrunDetails}
                onApprove={(payrun) => openApprovalDecision(payrun, 'approve')}
                onReject={(payrun) => openApprovalDecision(payrun, 'reject')}
                onRelease={openReleasePayrun}
                onRetry={openPayrunRetryConfirmation}
                onCancel={openPayrunCancelConfirmation}
                canApprovePayrun={canApprovePayrun}
                canReleasePayrun={canReleasePayrun}
                canCancelPayrun={canCancelPayrun}
                paginationFooter={
                  <PaymentsTabPagination
                    pagination={payrunsPagination}
                    onPageChange={goToPayrunsPage}
                    testIdPrefix="payruns"
                  />
                }
              />
            </TabsContent>
          )}

          <TabsContent
            value="released"
            className="absolute inset-0 mt-0 flex min-h-0 flex-col focus-visible:outline-none data-[state=inactive]:hidden"
          >
            <ReleasedPaymentsTab
              filteredPayments={filteredPayments}
              totalPayments={payments.length}
              safeFormatDate={safeFormatDate}
              resolvePaymentInvoice={resolvePaymentInvoice}
              handleViewPaymentInvoice={handleViewReleasedPaymentSource}
              handleDownloadPaymentInvoice={handleDownloadPaymentInvoice}
              showBranchField={isBranchEnabled}
              showBatchField={isConnectedBankingEnabled || isPaymentBatchesFeatureEnabled}
              paginationFooter={
                <PaymentsTabPagination
                  pagination={releasedPaymentsPagination}
                  onPageChange={goToReleasedPaymentsPage}
                  testIdPrefix="released-payments"
                />
              }
            />
          </TabsContent>
        </div>
      </Tabs>

      <RequestPaymentDialog
        open={requestPaymentOpen}
        onOpenChange={setRequestPaymentOpen}
        invoices={selectedRecordPaymentInvoices}
        onCreate={handleCreatePayrun}
        submitting={creatingPayrun}
      />

      <PayrunDetailsSheet
        payrun={selectedPayrun}
        open={payrunDetailsOpen}
        onOpenChange={setPayrunDetailsOpen}
        onRelease={openReleasePayrun}
        onRetry={openPayrunRetryConfirmation}
        onCancel={openPayrunCancelConfirmation}
        onViewInvoice={handleViewInvoice}
        canReleasePayrun={canReleasePayrun}
        canCancelPayrun={canCancelPayrun}
      />

      <ApprovalDecisionDialog
        decision={approvalDecision}
        open={approvalDecisionOpen}
        onOpenChange={(open) => {
          setApprovalDecisionOpen(open);
          if (!open) setApprovalDecision(null);
        }}
        onConfirm={confirmApprovalDecision}
      />

      <ReleasePaymentDialog
        payrun={releasePayrun}
        open={releasePayrunOpen}
        onOpenChange={setReleasePayrunOpen}
        bankAccounts={bankAccounts}
        showBatchField={isConnectedBankingEnabled || isPaymentBatchesFeatureEnabled}
        onPaid={handlePayrunPaid}
      />

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
        invoices={reportableInvoiceRows}
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

      <AlertDialog
        open={Boolean(payrunActionConfirm)}
        onOpenChange={(open) => {
          if (!open) setPayrunActionConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{getPayrunActionCopy(payrunActionConfirm).title}</AlertDialogTitle>
            <AlertDialogDescription>
              {getPayrunActionCopy(payrunActionConfirm).description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancellingPayrun || retryingPayrun}>
              {getPayrunActionCopy(payrunActionConfirm).cancelLabel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                confirmPayrunAction();
              }}
              disabled={cancellingPayrun || retryingPayrun}
              className={payrunActionConfirm?.type === 'cancel' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : undefined}
            >
              {cancellingPayrun || retryingPayrun ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {getPayrunActionCopy(payrunActionConfirm).actionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkReleaseConfirmOpen} onOpenChange={setBulkReleaseConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Release All Pending Payments?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to release payments for {selectablePayableInvoices.length} invoices?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <MeteredActionCostHint
            actionCode={CREDIT_ACTION_CODES.PAYMENT_PROCESSING}
            unitCount={selectablePayableInvoices.length}
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
        setViewDialogOpen={closePaymentViewDialog}
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
        showInvoiceFunding={showInvoiceFunding}
      />

      <PoDetailsDialog
        showViewDialog={releasedPaymentPoOpen}
        setShowViewDialog={(open) => {
          setReleasedPaymentPoOpen(open);
          if (!open) setReleasedPaymentPo(null);
        }}
        selectedPO={releasedPaymentPo}
        loadingDetails={loadingReleasedPaymentSource}
        statusColors={poStatusColors}
        formatDate={safeFormatDate}
        formatCurrency={formatCurrency}
        handleDownloadPO={() => toast.error('PO download is not available from released payments yet')}
        handleSubmitForApproval={() => {}}
        downloadingPoId={null}
        submitting={false}
        setShowApprovalDialog={() => {}}
        canManagePo={false}
        canApprovePo={false}
        onEditPO={() => {}}
        onSaveDeliveryStatus={() => {}}
        savingDeliveryStatus={false}
        canRaiseAdvance={false}
        onRaiseAdvance={() => {}}
        onCancelPO={() => {}}
        cancelling={false}
        canEditPaymentSchedule={false}
        onSavePaymentSchedule={() => {}}
        savingPaymentSchedule={false}
      />

      <GrnDetailDialog
        grn={releasedPaymentGrn}
        open={releasedPaymentGrnOpen}
        onOpenChange={(open) => {
          setReleasedPaymentGrnOpen(open);
          if (!open) setReleasedPaymentGrn(null);
        }}
        formatConfig={null}
        vendors={[]}
        initialEditMode={false}
        canApprove={false}
        canPost={false}
        posting={false}
        saving={false}
        onOpenReview={() => {}}
        onPost={() => {}}
        onSaveDraft={() => {}}
        onSaveAndSubmit={() => {}}
        onDownloadPdf={() => toast.error('GRN download is not available from released payments yet')}
        downloadingPdf={false}
      />
    </div>
  );
};

export default Payments;

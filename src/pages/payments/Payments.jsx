import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  useGetInvoicesQuery,
  useCancelInvoiceMutation,
  useLazyGetInvoiceQuery,
  useLazyGetInvoiceHistoryQuery,
} from '../../Services/apis/invoicesVendorsApi';
import { toInvoiceUiPayload, EMPTY_INVOICE_LIST_RESPONSE, getInvoiceListItems } from '../../Services/utils/payloadMappers';
import {
  useGetPendingPaymentsQuery,
  useGetReleasedPaymentsQuery,
  useLazyGetPaymentQuery,
  useBulkReleasePaymentsMutation,
  useGeneratePendingPaymentInvoiceReportMutation,
  useRecordPaymentsMutation,
  useApprovePayrunMutation,
  useCancelPayrunMutation,
  useCreatePayrunMutation,
  useGetPayrunsQuery,
  useReleasePayrunMutation,
  useRequestPayrunReleaseOtpMutation,
  useRejectPayrunMutation,
  useResendPayrunReleaseOtpMutation,
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
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '../../components/ui/sheet';
import { Textarea } from '../../components/ui/textarea';
import { Checkbox } from '../../components/ui/checkbox';
import AppDataTable from '../../components/common/AppDataTable';
import { TableCell, TableRow } from '../../components/ui/table';
import { cn } from '../../lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Search, Loader2, Send, Eye, CheckCircle2, XCircle, RotateCcw, Download } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import PaymentsHeader from './components/PaymentsHeader';
import RecordPaymentDialog from './components/RecordPaymentDialog';
import useBankingSetup from '../banking/hooks/useBankingSetup';
import { getLinkedAccounts } from '../banking/utils/accountFormatters';
import { useGetBankingAccountBalanceQuery } from '../../Services/apis/connectedBankingApi';
import PendingPaymentsTab from './components/PendingPaymentsTab';
import PendingPaymentReportDialog from './components/PendingPaymentReportDialog';
import ReleasedPaymentsTab from './components/ReleasedPaymentsTab';
import CancelInvoiceDialog from '../invoices/components/CancelInvoiceDialog';
import BankAccountSelectField from '../../components/banking/BankAccountSelectField';
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
import { isInvoiceFundingEnabled as isInvoiceFundingEnabledForCorporate } from '../../utils/invoiceConfiguration';
import { OrgBranchCell, VendorWithBranchCell } from '../../components/common/BranchTableCells';
import { clearNotificationQueryParams } from '../../utils/notificationQueryParams';

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

// TODO(payment-workflow-api): replace this generic local route after payrun
// creation resolves approval routing from Payment Approval Workflow.
const GENERIC_ADMIN_PAYRUN_ROUTE = {
  workflowId: 'generic-admin-payrun-route',
  name: 'Generic Admin Approval',
  admin: {
    id: 'generic-admin-master-admin',
    name: 'Admin / Master Admin',
    role: 'Admin / Master Admin',
  },
  approvers: [],
};

const DEFAULT_PAYRUN_APPROVAL_OWNER = {
  id: GENERIC_ADMIN_PAYRUN_ROUTE.admin.id,
  name: GENERIC_ADMIN_PAYRUN_ROUTE.admin.name,
  role: GENERIC_ADMIN_PAYRUN_ROUTE.admin.role,
};

const DEFAULT_PAYRUN_APPROVAL_ROUTE = GENERIC_ADMIN_PAYRUN_ROUTE.name;

const OTP_RESEND_COOLDOWN_SECONDS = 30;
const PAYMENTS_TAB_PAGE_SIZE = 25;

const PAYRUN_STATUS_CLASS = {
  'Waiting For Approval': 'bg-amber-100 text-amber-800 border-amber-200',
  Approved: 'bg-blue-100 text-blue-800 border-blue-200',
  'Waiting For Payment': 'bg-purple-100 text-purple-800 border-purple-200',
  Processing: 'bg-sky-100 text-sky-800 border-sky-200',
  Paid: 'bg-green-100 text-green-800 border-green-200',
  Failed: 'bg-red-100 text-red-800 border-red-200',
  Rejected: 'bg-slate-100 text-slate-700 border-slate-200',
  Cancelled: 'bg-slate-100 text-slate-700 border-slate-200',
};

const formatMoney = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const getInvoiceAmount = (invoice = {}) =>
  Number(
    invoice.netAmount ??
      invoice.net_amount ??
      invoice.netPayable ??
      invoice.net_payable ??
      invoice.amount ??
      invoice.totalAmount ??
      invoice.total_amount ??
      invoice.amountDue ??
      0,
  );

const getInvoiceGstAmount = (invoice = {}) =>
  Number(
    invoice.gstAmount ??
      invoice.gst_amount ??
      invoice.taxAmount ??
      invoice.tax_amount ??
      Math.round(getInvoiceAmount(invoice) * 0.18),
  );

const getPaymentModeRecommendation = (amount = 0) => {
  const total = Number(amount || 0);
  if (total < 200000) {
    return {
      recommendedMode: 'IMPS',
      enabledModes: ['IMPS', 'NEFT', 'RTGS'],
      reason: 'Fastest option',
    };
  }
  if (total < 500000) {
    return {
      recommendedMode: 'IMPS',
      enabledModes: ['IMPS', 'NEFT'],
      reason: 'Fastest eligible option',
    };
  }
  if (total < 1000000) {
    return {
      recommendedMode: 'NEFT',
      enabledModes: ['NEFT', 'RTGS'],
      reason: 'IMPS limit exceeded',
    };
  }
  return {
    recommendedMode: 'RTGS',
    enabledModes: ['RTGS'],
    reason: 'Only eligible payment mode',
  };
};

const getBeneficiaryReleaseStatusMeta = (status = '') => {
  const normalized = String(status || 'UNVERIFIED').trim().toUpperCase();
  if (normalized === 'VERIFIED') {
    return {
      label: 'Verified',
      ready: true,
      className: 'bg-emerald-100 text-emerald-800',
    };
  }

  return {
    label: 'Unverified',
    ready: false,
    className: 'bg-amber-100 text-amber-800',
  };
};

const getInvoiceBeneficiaryAccounts = (invoice = {}) => {
  const accounts =
    invoice.beneficiaryAccounts ||
    invoice.beneficiary_accounts ||
    invoice.vendorAccounts ||
    invoice.vendor_accounts ||
    invoice.bankAccounts ||
    invoice.bank_accounts ||
    [];

  if (Array.isArray(accounts) && accounts.length > 0) {
    return accounts.map((account, index) => {
      const status = account.status || account.validationStatus || account.validation_status || 'UNVERIFIED';
      const statusMeta = getBeneficiaryReleaseStatusMeta(status);
      return {
        id:
          account.id ||
          account.beneficiaryId ||
          account.beneficiary_id ||
          account.accountId ||
          account.account_id ||
          `${invoice.id || invoice.invoiceNumber}-beneficiary-${index}`,
        bankName: account.bankName || account.bank_name || account.bank || invoice.vendorBankName || '-',
        accountNumber:
          account.accountNumber ||
          account.account_number ||
          account.vendorAccountNumber ||
          account.vendor_account_number ||
          '-',
        ifsc:
          account.ifsc ||
          account.ifscCode ||
          account.ifsc_code ||
          account.vendorIfscCode ||
          account.vendor_ifsc_code ||
          '-',
        status,
        statusLabel: statusMeta.label,
        statusClassName: statusMeta.className,
        releaseReady: statusMeta.ready,
      };
    });
  }

  const bankName = invoice.vendorBankName || invoice.vendor_bank_name || invoice.bankName || invoice.bank_name;
  const accountNumber =
    invoice.vendorAccountNumber ||
    invoice.vendor_account_number ||
    invoice.accountNumber ||
    invoice.account_number;
  const ifsc =
    invoice.vendorIfscCode ||
    invoice.vendor_ifsc_code ||
    invoice.ifscCode ||
    invoice.ifsc_code ||
    invoice.ifsc;

  if (!bankName && !accountNumber && !ifsc) return [];

  return [{
    id: `${invoice.id || invoice.invoiceNumber}-default-beneficiary`,
    bankName: bankName || '-',
    accountNumber: accountNumber || '-',
    ifsc: ifsc || '-',
    status: 'UNVERIFIED',
    statusLabel: 'Unverified',
    statusClassName: 'bg-amber-100 text-amber-800',
    releaseReady: false,
  }];
};

const getBeneficiaryAccountKey = (invoiceId, accountId) => `${invoiceId}::${accountId}`;

const getReleaseBankAccountId = (account) =>
  account?.id || account?.bankAccountId || account?.accountNumber || account?.account_number;

const PayrunStatusBadge = ({ status }) => (
  <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-1 text-xs font-medium ${PAYRUN_STATUS_CLASS[status] || PAYRUN_STATUS_CLASS.Processing}`}>
    {status}
  </span>
);

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

const normalizePayrunStatus = (status = '') => {
  const value = String(status || '').trim().toLowerCase();
  if (['waiting_approval', 'waiting for approval', 'pending_approval'].includes(value)) return 'Waiting For Approval';
  if (['approved'].includes(value)) return 'Approved';
  if (['waiting_payment', 'waiting for payment', 'pending_payment'].includes(value)) return 'Waiting For Payment';
  if (['rejected'].includes(value)) return 'Rejected';
  if (['cancelled', 'canceled'].includes(value)) return 'Cancelled';
  if (['paid', 'released', 'completed', 'success'].includes(value)) return 'Paid';
  if (['failed', 'release_failed'].includes(value)) return 'Failed';
  if (['processing', 'release_initiated', 'payment_initiated'].includes(value)) return 'Processing';
  if (!status) return 'Waiting For Approval';
  return String(status);
};

const normalizeApprovalStatus = (status = '') => {
  const value = String(status || '').trim().toLowerCase();
  if (value === 'approved') return 'Approved';
  if (value === 'rejected') return 'Rejected';
  return 'Pending';
};

const PAYRUN_AUDIT_LABELS = {
  payrun_created: 'Batch Created',
  sent_for_approval: 'Sent for Approval',
  payrun_approved: 'Payrun Approved',
  payrun_rejected: 'Payrun Rejected',
  payrun_cancelled: 'Payrun Cancelled',
  payrun_canceled: 'Payrun Cancelled',
  payrun_release_otp_requested: 'Release OTP Requested',
  release_otp_requested: 'Release OTP Requested',
  payrun_release_otp_resent: 'Release OTP Resent',
  release_otp_resent: 'Release OTP Resent',
  payrun_release_initiated: 'Payment Release Initiated',
  release_initiated: 'Payment Release Initiated',
  payment_initiated: 'Payment Initiated',
  payrun_released: 'Payment Released',
  payrun_paid: 'Payment Released',
  payrun_release_failed: 'Payment Release Failed',
  release_failed: 'Payment Release Failed',
};

const PAYRUN_TIMELINE_STEPS = [
  {
    id: 'batch-created',
    label: 'Batch Created',
    fallbackActor: (payrun) => payrun.createdBy || '-',
    fallbackAt: (payrun) => payrun.createdOn,
  },
  {
    id: 'sent-for-approval',
    label: 'Sent for Approval',
    fallbackActor: (payrun) => payrun.createdBy || '-',
    fallbackAt: (payrun) => payrun.createdOn,
  },
  {
    id: 'under-review',
    label: 'Under Review',
    fallbackActor: (payrun, approvals) => {
      const firstPending = approvals.find((approval) => approval.status === 'Pending');
      const firstApproved = approvals.find((approval) => approval.status === 'Approved');
      const firstRejected = approvals.find((approval) => approval.status === 'Rejected');
      return firstPending?.name || firstApproved?.name || firstRejected?.name || payrun.admin?.name || '-';
    },
    fallbackAt: (_payrun, approvals) => {
      const firstApproved = approvals.find((approval) => approval.status === 'Approved');
      const firstRejected = approvals.find((approval) => approval.status === 'Rejected');
      return firstApproved?.actedAt || firstRejected?.actedAt;
    },
    fallbackComments: (_payrun, approvals) => {
      const firstApproved = approvals.find((approval) => approval.status === 'Approved');
      const firstRejected = approvals.find((approval) => approval.status === 'Rejected');
      return firstApproved?.comments || firstRejected?.comments;
    },
  },
  {
    id: 'approved',
    label: 'Payrun Approved',
    fallbackActor: (payrun, approvals) => {
      const firstApproved = approvals.find((approval) => approval.status === 'Approved');
      return firstApproved?.name || payrun.admin?.name || '-';
    },
    fallbackAt: (_payrun, approvals) => approvals.find((approval) => approval.status === 'Approved')?.actedAt,
    fallbackComments: (_payrun, approvals) => approvals.find((approval) => approval.status === 'Approved')?.comments,
  },
  {
    id: 'release-otp-requested',
    label: 'Release OTP Requested',
    fallbackActor: (payrun) => payrun.admin?.name || '-',
  },
  {
    id: 'payment-released',
    label: 'Payment Released',
    fallbackActor: (payrun) => payrun.admin?.name || '-',
    fallbackAt: (payrun) => payrun.paidOn,
  },
  {
    id: 'utr-captured',
    label: 'UTR Captured',
    fallbackActor: () => 'System',
    fallbackAt: (payrun) => {
      const invoiceWithUtr = payrun.invoices?.find((invoice) => invoice.utr && invoice.paidOn);
      return invoiceWithUtr?.paidOn || payrun.paidOn;
    },
  },
];

const formatPayrunAuditLabel = (value = '') => {
  const key = String(value || '').trim();
  const normalizedKey = key.toLowerCase();
  if (PAYRUN_AUDIT_LABELS[normalizedKey]) return PAYRUN_AUDIT_LABELS[normalizedKey];
  if (!key) return 'Payrun Activity';
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const getTimelineStatusClass = (status) => {
  if (status === 'Completed') return 'bg-emerald-100 text-emerald-800';
  if (status === 'In Progress') return 'bg-blue-100 text-blue-700';
  if (status === 'Rejected') return 'bg-red-100 text-red-700';
  return 'bg-slate-100 text-slate-600';
};

const getTimelineNodeClass = (status) => {
  if (status === 'Completed') return 'border-emerald-600 bg-emerald-600 text-white';
  if (status === 'In Progress') return 'border-violet-700 bg-violet-700 text-white';
  if (status === 'Rejected') return 'border-red-600 bg-red-600 text-white';
  return 'border-slate-200 bg-slate-200 text-slate-500';
};

const getTimelineConnectorClass = (status) =>
  status === 'Completed'
    ? 'w-0.5 bg-emerald-600'
    : 'w-0 border-l-2 border-dotted border-slate-300 bg-transparent';

const getPayrunTimelineStepId = (label = '') => {
  const value = String(label || '').toLowerCase();
  if (value.includes('created')) return 'batch-created';
  if (value.includes('sent')) return 'sent-for-approval';
  if (value.includes('review') || value.includes('approval pending')) return 'under-review';
  if (value.includes('approved')) return 'approved';
  if (value.includes('otp')) return 'release-otp-requested';
  if (value.includes('utr')) return 'utr-captured';
  if (value.includes('payment released') || value.includes('payment release') || value.includes('paid')) return 'payment-released';
  return null;
};

const getStopTimelineEntry = (payrun = {}, approvals = []) => {
  const payrunStatus = String(payrun.status || '').trim().toLowerCase();
  const isCancelled = ['cancelled', 'canceled'].includes(payrunStatus);
  const firstRejected = approvals.find((approval) => approval.status === 'Rejected');
  const isRejected = payrunStatus === 'rejected' || Boolean(firstRejected);

  if (!isCancelled && !isRejected) return null;

  return {
    id: isCancelled ? 'payrun-cancelled' : 'payrun-rejected',
    label: isCancelled ? 'Payrun Cancelled' : 'Payrun Rejected',
    actor: isCancelled
      ? payrun.cancelledBy || payrun.createdBy || '-'
      : firstRejected?.name || payrun.rejectedBy || payrun.admin?.name || '-',
    at: payrun.cancelledOn || payrun.rejectedOn || firstRejected?.actedAt || payrun.updatedAt,
    comments: payrun.cancellationReason || payrun.rejectionReason || firstRejected?.comments || payrun.remarks,
    status: 'Rejected',
  };
};

const getPredefinedTimelineStatus = (stepId, payrun = {}, approvals = [], hasAuditStep = false) => {
  const status = normalizePayrunStatus(payrun.status);
  const stoppedEntry = getStopTimelineEntry(payrun, approvals);
  const released = status === 'Paid';
  const hasApproved = approvals.some((approval) => approval.status === 'Approved');
  const hasUtr = payrun.invoices?.some((invoice) => Boolean(invoice.utr));

  if (stepId === 'batch-created' || stepId === 'sent-for-approval') return 'Completed';
  if (stoppedEntry && ['approved', 'release-otp-requested', 'payment-released', 'utr-captured'].includes(stepId)) return 'Pending';

  if (stepId === 'under-review') {
    if (status === 'Waiting For Approval') return 'In Progress';
    return 'Completed';
  }

  if (stepId === 'approved') {
    return hasApproved || ['Approved', 'Waiting For Payment', 'Processing', 'Paid', 'Failed'].includes(status)
      ? 'Completed'
      : 'Pending';
  }

  if (stepId === 'release-otp-requested') {
    if (hasAuditStep) return 'Completed';
    if (status === 'Processing') return 'In Progress';
    return released ? 'Completed' : 'Pending';
  }

  if (stepId === 'payment-released') {
    if (status === 'Failed') return 'Rejected';
    if (released) return 'Completed';
    return status === 'Processing' ? 'In Progress' : 'Pending';
  }

  if (stepId === 'utr-captured') {
    return released || hasUtr ? 'Completed' : 'Pending';
  }

  return 'Pending';
};

const getPayrunAuditTimeline = (payrun = {}, approvals = []) => {
  const auditEntries = Array.isArray(payrun.timeline) ? payrun.timeline : [];
  const eventsByStep = auditEntries.reduce((acc, entry) => {
    const label = entry.label || 'Payrun Activity';
    const stepId = getPayrunTimelineStepId(label);
    if (!stepId || acc[stepId]) return acc;
    acc[stepId] = {
      label,
      actor: entry.actor || '-',
      at: entry.at,
      comments: entry.comments,
    };
    return acc;
  }, {});

  const stoppedStep = getStopTimelineEntry(payrun, approvals);

  return PAYRUN_TIMELINE_STEPS.flatMap((step) => {
    const event = eventsByStep[step.id];
    const entry = {
      id: step.id,
      label: step.label,
      actor: event?.actor || step.fallbackActor?.(payrun, approvals) || '-',
      at: event?.at || step.fallbackAt?.(payrun, approvals),
      comments: event?.comments || step.fallbackComments?.(payrun, approvals),
      status: getPredefinedTimelineStatus(step.id, payrun, approvals, Boolean(event)),
    };

    if (step.id === 'under-review' && stoppedStep) {
      return [entry, stoppedStep];
    }

    return [entry];
  });
};

const TimelineStatusPill = ({ status }) => (
  <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${getTimelineStatusClass(status)}`}>
    <span className="h-1.5 w-1.5 rounded-full bg-current" />
    {status}
  </span>
);

const PayrunAuditTimeline = ({ payrun, approvals }) => {
  const entries = getPayrunAuditTimeline(payrun, approvals);

  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
        Approval Timeline
      </h3>
      <div className="space-y-0">
        {entries.map((entry, index) => {
          const isLast = index === entries.length - 1;
          const nodeClass = getTimelineNodeClass(entry.status);
          return (
            <div key={entry.id} className="relative grid grid-cols-[28px_1fr] gap-3 pb-6 last:pb-0">
              {!isLast && (
                <span
                  className={`absolute left-[11px] top-6 bottom-0 translate-x-px ${getTimelineConnectorClass(entry.status)}`}
                />
              )}
              <span className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 shadow-[0_0_0_4px_hsl(var(--card))] ${nodeClass}`}>
                {entry.status === 'Completed' ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : entry.status === 'Rejected' ? (
                  <XCircle className="h-3.5 w-3.5" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-current" />
                )}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className={`text-sm font-semibold ${entry.status === 'In Progress' ? 'text-violet-700' : entry.status === 'Pending' ? 'text-slate-400' : 'text-foreground'}`}>
                    {entry.label}
                  </p>
                  <TimelineStatusPill status={entry.status} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{entry.actor || '-'}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {entry.at ? (
                    <span className="text-xs text-muted-foreground">
                      {safeFormatDate(entry.at, 'dd MMM yyyy')} · {safeFormatDate(entry.at, 'hh:mm a')}
                    </span>
                  ) : null}
                </div>
                {entry.comments ? (
                  <p className="mt-2 text-xs text-muted-foreground">{entry.comments}</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const normalizePayrun = (payrun = {}) => {
  const route = payrun.approvalRoute || payrun.approval_route || {};
  const admin = route.admin || payrun.admin || payrun.paymentAdmin || payrun.payment_admin || null;
  const items = payrun.items || payrun.invoices || payrun.payrunItems || payrun.payrun_items || [];
  const approvals = payrun.approvals || payrun.approvalRecords || payrun.approval_records || [];
  const auditLog = payrun.auditLog || payrun.audit_log || payrun.timeline || [];

  return {
    ...payrun,
    id: payrun.payrunId || payrun.payrun_id || payrun.id,
    payrunId: payrun.payrunId || payrun.payrun_id || payrun.id,
    batchId: payrun.payrunNumber || payrun.payrun_number || payrun.batchId || payrun.batch_id || '-',
    createdBy:
      payrun.createdBy?.name ||
      payrun.created_by?.name ||
      payrun.createdByName ||
      payrun.created_by_name ||
      payrun.createdBy ||
      '-',
    createdOn: payrun.createdAt || payrun.created_at || payrun.createdOn || payrun.created_on,
    admin: admin
      ? {
          id: admin.userId || admin.user_id || admin.employeeId || admin.id,
          name: admin.name || admin.userName || admin.user_name || admin.email || 'Admin / Master Admin',
          role: admin.role || 'Admin / Master Admin',
        }
      : DEFAULT_PAYRUN_APPROVAL_OWNER,
    approvers: (route.approvers || payrun.approvers || []).map((approver) => ({
      id: approver.userId || approver.user_id || approver.approverId || approver.id,
      name: approver.name || approver.userName || approver.user_name || approver.approverName || '-',
      role: approver.role || 'Approver',
    })),
    approvals: approvals.map((approval) => ({
      id: approval.approvalId || approval.approval_id || approval.id,
      name: approval.name || approval.userName || approval.user_name || approval.approverName || approval.actorName || '-',
      role: approval.role || 'Approver',
      status: normalizeApprovalStatus(approval.status),
      comments: approval.comments || approval.comment || '',
      actedAt: approval.actedAt || approval.acted_at,
    })),
    approvalRoute: route.workflowName || route.workflow_name || payrun.approvalRoute || payrun.approval_route || DEFAULT_PAYRUN_APPROVAL_ROUTE,
    workflowId: route.workflowId || route.workflow_id || payrun.workflowId || payrun.workflow_id,
    status: normalizePayrunStatus(payrun.status),
    invoices: items.map((item) => ({
      ...item,
      id: item.invoiceId || item.invoice_id || item.id || item.payrunItemId || item.payrun_item_id,
      payrunItemId: item.payrunItemId || item.payrun_item_id,
      invoiceNumber: item.invoiceNumber || item.invoice_number || '-',
      vendorId: item.vendorId || item.vendor_id,
      vendorName: item.vendorName || item.vendor_name || item.vendor?.name || '-',
      requestedAmount: Number(item.requestedAmount || item.requested_amount || item.paymentAmount || item.payment_amount || item.amount || 0),
      gstAmount: Number(item.gstAmount || item.gst_amount || 0),
      holdGst: Boolean(item.holdGst ?? item.hold_gst),
      bankDetails: item.bankDetails || item.bank_details,
      vendorBankName: item.vendorBankName || item.vendor_bank_name || item.bankName || item.bank_name,
      vendorAccountNumber:
        item.vendorAccountNumber ||
        item.vendor_account_number ||
        item.accountNumber ||
        item.account_number,
      vendorIfscCode:
        item.vendorIfscCode ||
        item.vendor_ifsc_code ||
        item.ifscCode ||
        item.ifsc_code ||
        item.ifsc,
      beneficiaryAccounts:
        item.beneficiaryAccounts ||
        item.beneficiary_accounts ||
        item.vendorAccounts ||
        item.vendor_accounts ||
        item.bankAccounts ||
        item.bank_accounts ||
        [],
      utr: item.utr || item.utrNumber || item.utr_number,
      paidOn: item.paidOn || item.paid_on,
    })),
    totalAmount: Number(payrun.totalPaymentAmount || payrun.total_payment_amount || payrun.totalAmount || payrun.total_amount || 0),
    timeline: auditLog.map((entry) => ({
      label: formatPayrunAuditLabel(entry.label || entry.event || entry.action),
      actor: entry.actorName || entry.actor_name || entry.actor || '-',
      at: entry.createdAt || entry.created_at || entry.at,
      comments: entry.comments || entry.comment,
      status: entry.status,
    })),
  };
};

const getPayrunApprovalRecords = (payrun = {}) => {
  if (Array.isArray(payrun.approvals) && payrun.approvals.length > 0) {
    return payrun.approvals;
  }
  const approvers = Array.isArray(payrun.approvers) ? payrun.approvers : [];
  if (approvers.length > 0) {
    return approvers.map((approver) => ({
      id: approver.id,
      name: approver.name,
      role: 'Approver',
      status: 'Pending',
      comments: '',
      actedAt: null,
    }));
  }
  if (payrun.admin) {
    return [{
      id: payrun.admin.id,
      name: payrun.admin.name,
      role: payrun.admin.role || 'Admin / Master Admin',
      status: 'Pending',
      comments: '',
      actedAt: null,
    }];
  }
  return [];
};

const RequestPaymentDialog = ({
  open,
  onOpenChange,
  invoices,
  onCreate,
  submitting = false,
}) => {
  const [rows, setRows] = useState([]);
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    if (!open) return;
    setRemarks('');
    setRows(
      invoices.map((invoice) => {
        const amountDue = getInvoiceAmount(invoice);
        const gstAmount = getInvoiceGstAmount(invoice);
        return {
          id: invoice.id,
          vendorName: invoice.vendorName || '-',
          invoiceNumber: invoice.invoiceNumber || '-',
          gstValid: true,
          holdGst: false,
          gstAmount,
          amountDue,
          requestedAmount: amountDue,
          bankDetails: invoice.accountNumber || invoice.bankAccount || 'Beneficiary verified',
        };
      }),
    );
  }, [invoices, open]);

  const totalRequested = rows.reduce((sum, row) => sum + Number(row.requestedAmount || 0), 0);

  const updateRow = (rowId, updater) => {
    setRows((prev) => prev.map((row) => (row.id === rowId ? updater(row) : row)));
  };

  const submit = () => {
    if (rows.length === 0) {
      toast.error('Add at least one invoice');
      return;
    }

    onCreate({
      currency: 'INR',
      remarks,
      items: rows.map((row) => ({
        invoiceId: row.id,
        invoiceNumber: row.invoiceNumber,
        requestedAmount: Number(row.requestedAmount || 0),
        holdGst: row.holdGst,
        gstAmount: row.holdGst ? Number(row.gstAmount || 0) : 0,
        paymentAmount: Number(row.requestedAmount || 0) - (row.holdGst ? Number(row.gstAmount || 0) : 0),
      })),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] max-w-6xl overflow-y-auto"
        onInteractOutside={preventDialogOutsideDismiss}
      >
        <DialogHeader>
          <DialogTitle>Review & Confirm Payment Request</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
            <div className="overflow-hidden rounded-lg border">
              <AppDataTable
                tableHeader={[
                  { key: 'vendorName', title: 'Vendor' },
                  { key: 'invoiceNumber', title: 'Invoice' },
                  { key: 'gstValidation', title: 'GST Validation' },
                  { key: 'holdGst', title: 'Hold GST' },
                  { key: 'gstAmount', title: 'GST Amount', headerClassName: 'text-left', cellClassName: 'text-left' },
                  { key: 'amountDue', title: 'Net Payable', headerClassName: 'text-left', cellClassName: 'text-left font-medium' },
                  { key: 'requestedAmount', title: 'Requested Amount', headerClassName: 'text-left', cellClassName: 'text-left' },
                  { key: 'actions', title: '' },
                ]}
                tableData={rows}
                rowKey="id"
                tableClassName="min-w-[980px] table-fixed text-sm"
                tableContainerClassName="overflow-x-auto"
                emptyMessage="No invoices selected"
                renderRow={(row) => (
                  <TableRow key={row.id}>
                    <TableCell className="max-w-[180px] overflow-hidden whitespace-nowrap px-3 py-3 text-left font-medium">
                      {clippedTableText(row.vendorName)}
                    </TableCell>
                    <TableCell className="max-w-[180px] overflow-hidden whitespace-nowrap px-3 py-3 text-left">
                      {clippedTableText(row.invoiceNumber)}
                    </TableCell>
                    <TableCell className="max-w-[180px] overflow-hidden whitespace-nowrap px-3 py-3 text-left">
                      <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2 py-1 text-xs font-medium text-green-800">
                        Pass
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[180px] overflow-hidden whitespace-nowrap px-3 py-3 text-left">
                      <Checkbox
                        checked={row.holdGst}
                        onCheckedChange={(checked) =>
                          updateRow(row.id, (current) => ({
                            ...current,
                            holdGst: Boolean(checked),
                            requestedAmount: Boolean(checked)
                              ? Math.max(0, current.amountDue - current.gstAmount)
                              : current.amountDue,
                          }))
                        }
                      />
                    </TableCell>
                    <TableCell className="max-w-[180px] overflow-hidden whitespace-nowrap px-3 py-3 text-left">
                      {clippedTableText(formatMoney(row.gstAmount))}
                    </TableCell>
                    <TableCell className="max-w-[180px] overflow-hidden whitespace-nowrap px-3 py-3 text-left font-medium">
                      {clippedTableText(formatMoney(row.amountDue))}
                    </TableCell>
                    <TableCell className="max-w-[180px] overflow-hidden whitespace-nowrap px-3 py-3 text-left">
                      <span className="font-medium text-slate-900">
                        {formatMoney(row.requestedAmount)}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[180px] overflow-hidden whitespace-nowrap px-3 py-3 text-left">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setRows((prev) => prev.filter((item) => item.id !== row.id))}
                      >
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                )}
              />
            </div>
            <div className="flex items-center justify-end rounded-lg bg-muted px-4 py-3">
              <span className="text-sm text-muted-foreground">Total Requested Amount:&nbsp;</span>
              <strong>{formatMoney(totalRequested)}</strong>
            </div>
            <div className="space-y-2">
              <Label>Remarks</Label>
              <Textarea
                value={remarks}
                onChange={(event) => setRemarks(event.target.value)}
                placeholder="Optional notes for approval"
              />
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
              Approval will be routed by Payment Approval Workflow. Until backend workflow resolution is available, Generic Admin Approval applies with no approvers.
            </div>
          </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={rows.length === 0 || submitting}>
            {submitting ? 'Creating...' : 'Create Payrun'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const PayrunsTab = ({
  payruns,
  onView,
  onApprove,
  onReject,
  onRelease,
  onRetry,
  canApprovePayrun,
  canReleasePayrun,
  paginationFooter = null,
}) => (
  <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm">
    <AppDataTable
      tableHeader={[
        { key: 'batchId', title: 'Batch ID' },
        { key: 'createdBy', title: 'Created By' },
        { key: 'invoices', title: 'Invoices', headerClassName: 'text-left', cellClassName: 'text-left' },
        { key: 'totalAmount', title: 'Total Amount', headerClassName: 'text-left', cellClassName: 'text-left font-semibold' },
        { key: 'approvalRoute', title: 'Approval Route' },
        { key: 'approvalStatus', title: 'Approval Status' },
        { key: 'status', title: 'Status' },
        { key: 'actions', title: 'Actions' },
      ]}
      tableData={payruns}
      rowKey="id"
      tableClassName="min-w-[1360px] table-auto text-sm"
      tableContainerClassName="min-h-0 flex-1 overflow-auto scrollbar-thin-muted"
      emptyMessage="No payruns yet. Select invoices from Pending Payments and request payment."
      renderRow={(payrun) => {
            const approvals = getPayrunApprovalRecords(payrun);
            const pendingApprovals = approvals.filter((approval) => approval.status === 'Pending');
            const approvedCount = approvals.filter((approval) => approval.status === 'Approved').length;
            const isDefaultAdminRoute = payrun.approvalRoute === DEFAULT_PAYRUN_APPROVAL_ROUTE;
            const canActOnApproval =
              payrun.status === 'Waiting For Approval' &&
              pendingApprovals.length > 0 &&
              (isDefaultAdminRoute ? canReleasePayrun : canApprovePayrun);
            return (
              <TableRow key={payrun.id}>
                <TableCell className="max-w-[180px] overflow-hidden whitespace-nowrap px-3 py-3 text-left font-semibold text-primary">
                  {clippedTableText(payrun.batchId)}
                </TableCell>
                <TableCell className="max-w-[180px] overflow-hidden whitespace-nowrap px-3 py-3 text-left">
                  {clippedTableText(payrun.createdBy)}
                </TableCell>
                <TableCell className="max-w-[180px] overflow-hidden whitespace-nowrap px-3 py-3 text-left">
                  {clippedTableText(payrun.invoices.length)}
                </TableCell>
                <TableCell className="max-w-[180px] overflow-hidden whitespace-nowrap px-3 py-3 text-left font-semibold">
                  {clippedTableText(formatMoney(payrun.totalAmount))}
                </TableCell>
                <TableCell className="max-w-[180px] overflow-hidden whitespace-nowrap px-3 py-3 text-left">
                  {clippedTableText(payrun.approvalRoute || payrun.admin?.name || '-')}
                </TableCell>
                <TableCell className="max-w-[180px] overflow-hidden whitespace-nowrap px-3 py-3 text-left">
                  {clippedTableText(
                    `Approved ${approvedCount}/${approvals.length || 1}`,
                    'font-medium text-foreground',
                  )}
                </TableCell>
                <TableCell className="max-w-[180px] overflow-hidden whitespace-nowrap px-3 py-3 text-left"><PayrunStatusBadge status={payrun.status} /></TableCell>
                <TableCell className="w-[360px] min-w-[360px] whitespace-nowrap px-3 py-3 text-left">
                  <div className="flex flex-nowrap gap-1">
                    <Button variant="ghost" size="sm" onClick={() => onView(payrun)}>
                      <Eye className="mr-1 h-4 w-4" /> View
                    </Button>
                    {canActOnApproval && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => onApprove(payrun)}>
                          <CheckCircle2 className="mr-1 h-4 w-4" /> Approve
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => onReject(payrun)}>
                          <XCircle className="mr-1 h-4 w-4" /> Reject
                        </Button>
                      </>
                    )}
                    {payrun.status === 'Approved' && canReleasePayrun && (
                      <Button size="sm" onClick={() => onRelease(payrun)}>
                        <Send className="mr-1 h-4 w-4" /> Release
                      </Button>
                    )}
                    {payrun.status === 'Failed' && canReleasePayrun && (
                      <Button size="sm" onClick={() => onRetry(payrun)}>
                        <RotateCcw className="mr-1 h-4 w-4" /> Retry
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          }}
    />
    {paginationFooter}
  </div>
);

const PayrunDetailsSheet = ({ payrun, open, onOpenChange, onRelease, canReleasePayrun }) => {
  if (!payrun) return null;
  const approvals = getPayrunApprovalRecords(payrun);
  const detailRows = [
    ['Created By', payrun.createdBy],
    ['Created On', safeFormatDate(payrun.createdOn, 'dd MMM yyyy')],
    ['Approval Route', payrun.approvalRoute || '-'],
    ['Approval Owner', payrun.admin?.name || '-'],
    ['Approvers', payrun.approvers?.length ? payrun.approvers.map((item) => item.name).join(', ') : '-'],
    ['Comments', payrun.remarks || '-'],
  ];

  const renderDrawerSection = (title, children) => (
    <section className="mb-6">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.09em] text-slate-400">
        {title}
      </p>
      <div className="overflow-hidden rounded-[10px] border border-slate-200 bg-white">
        {children}
      </div>
    </section>
  );

  const renderDrawerRow = (label, value, { alignTop = false, mono = false } = {}) => (
    <div className={`flex justify-between gap-4 border-b border-slate-100 px-3.5 py-2.5 last:border-b-0 ${alignTop ? 'items-start' : 'items-center'}`}>
      <span className="shrink-0 text-[13px] text-slate-500">{label}</span>
      <span className={`min-w-0 text-right text-[13px] font-medium text-slate-900 ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="flex h-full w-full flex-col gap-0 p-0 sm:w-[560px] sm:max-w-[560px]"
        onInteractOutside={preventDialogOutsideDismiss}
      >
        <SheetHeader className="shrink-0 border-b border-slate-200 px-6 py-[22px] pr-14">
          <div className="flex flex-wrap items-center gap-2">
            <SheetTitle className="text-base font-semibold text-slate-900">Payrun Details</SheetTitle>
            <PayrunStatusBadge status={payrun.status} />
          </div>
          <p className="mt-1 text-[13px] text-slate-500">
            {payrun.batchId} · {payrun.invoices.length} invoice{payrun.invoices.length === 1 ? '' : 's'}
          </p>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-[18px] py-4">
            <div>
              <p className="mb-0.5 text-xs text-slate-500">Amount</p>
              <p className="m-0 text-[22px] font-extrabold text-slate-900">{formatMoney(payrun.totalAmount)}</p>
            </div>
          </div>

          <PayrunAuditTimeline payrun={payrun} approvals={approvals} />

          {renderDrawerSection(
            'Payrun Summary',
            detailRows.map(([label, value]) =>
              renderDrawerRow(label, value, { alignTop: label === 'Comments' || label === 'Approvers' }),
            ),
          )}

          {renderDrawerSection(
            'Invoices',
            <>
              {payrun.invoices.map((invoice) => (
                <div key={invoice.id} className="border-b border-slate-100 px-3.5 py-3 last:border-b-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="m-0 truncate text-[13px] font-semibold text-primary">{invoice.invoiceNumber}</p>
                      <p className="mt-0.5 truncate text-[13px] font-medium text-slate-900">{invoice.vendorName}</p>
                    </div>
                    <p className="shrink-0 text-right text-[13px] font-bold text-slate-900">
                      {formatMoney(invoice.requestedAmount)}
                    </p>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500">
                    <span>GST Held: {invoice.holdGst ? formatMoney(invoice.gstAmount) : '-'}</span>
                    <span className="text-right">UTR: {invoice.utr || '-'}</span>
                    <span className="col-span-2 truncate">Bank: {invoice.bankDetails || '-'}</span>
                    <span className="col-span-2">Status: {invoice.status || 'Ready'}</span>
                  </div>
                </div>
              ))}
            </>,
          )}
        </div>

        <SheetFooter className="shrink-0 border-t border-slate-200 px-6 pb-6 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          {payrun.status === 'Approved' && canReleasePayrun && (
            <Button onClick={() => onRelease(payrun)}>Release Payment</Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
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

const ReleasePaymentDialog = ({ payrun, open, onOpenChange, bankAccounts, onPaid }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [bankAccountId, setBankAccountId] = useState('');
  const [mode, setMode] = useState('NEFT');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCooldownSeconds, setOtpCooldownSeconds] = useState(0);
  const [otp, setOtp] = useState('');
  const [otpRequestId, setOtpRequestId] = useState('');
  const [selectedBeneficiaryAccounts, setSelectedBeneficiaryAccounts] = useState({});
  const [requestReleaseOtp, { isLoading: requestingOtp }] = useRequestPayrunReleaseOtpMutation();
  const [resendReleaseOtp, { isLoading: resendingOtp }] = useResendPayrunReleaseOtpMutation();
  const [releasePayrunPayment, { isLoading: releasingPayrun }] = useReleasePayrunMutation();
  const totalDebitAmount = Number(payrun?.totalAmount || 0);
  const paymentModeRecommendation = getPaymentModeRecommendation(totalDebitAmount);
  const selectedAccount = bankAccounts.find((account) => String(getReleaseBankAccountId(account)) === String(bankAccountId));
  const selectedBalanceAccountId = selectedAccount ? String(getReleaseBankAccountId(selectedAccount)) : '';
  const {
    data: selectedAccountBalance,
    isFetching: isBalanceFetching,
    refetch: refetchSelectedAccountBalance,
  } = useGetBankingAccountBalanceQuery(selectedBalanceAccountId, {
    skip: !open || !selectedBalanceAccountId,
  });

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setBankAccountId('');
    setMode(paymentModeRecommendation.recommendedMode);
    setOtpSent(false);
    setOtpCooldownSeconds(0);
    setOtp('');
    setOtpRequestId('');
    setSelectedBeneficiaryAccounts(
      Object.fromEntries(
        (payrun?.invoices || []).map((invoice) => {
          const accounts = getInvoiceBeneficiaryAccounts(invoice);
          return [invoice.id, accounts[0]?.id || ''];
        }),
      ),
    );
  }, [open, paymentModeRecommendation.recommendedMode, payrun]);

  useEffect(() => {
    if (!open) return;
    if (!paymentModeRecommendation.enabledModes.includes(mode)) {
      setMode(paymentModeRecommendation.recommendedMode);
    }
  }, [mode, open, paymentModeRecommendation.enabledModes, paymentModeRecommendation.recommendedMode]);

  useEffect(() => {
    if (!open || !bankAccountId) return;
    const stillEligible = bankAccounts.some(
      (account) => String(getReleaseBankAccountId(account)) === String(bankAccountId),
    );
    if (!stillEligible) {
      setBankAccountId('');
      setOtpSent(false);
      setOtp('');
      setOtpRequestId('');
      toast.error('The selected bank account is no longer active. Select another active verified account and request a new OTP.');
    }
  }, [bankAccountId, bankAccounts, open]);

  useEffect(() => {
    if (!open) return;
    setOtpSent(false);
    setOtp('');
    setOtpRequestId('');
    setOtpCooldownSeconds(0);
  }, [bankAccountId, open]);

  useEffect(() => {
    if (!open || !otpSent || otpCooldownSeconds <= 0) return undefined;
    const timer = window.setTimeout(() => {
      setOtpCooldownSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [open, otpCooldownSeconds, otpSent]);

  if (!payrun) return null;
  const hasEligibleBankAccount = bankAccounts.length > 0;
  const releaseSteps = ['Verify Beneficiaries', 'Debit Account', 'Review & Release'];
  const paymentModes = ['IMPS', 'NEFT', 'RTGS'];
  const chargeAmount = 0;
  const fallbackAvailableBalance = selectedAccount?.availableBalance ?? selectedAccount?.available_balance ?? selectedAccount?.balance;
  const availableBalance =
    selectedAccountBalance?.availableBalance ??
    selectedAccountBalance?.available_balance ??
    selectedAccountBalance?.balance ??
    fallbackAvailableBalance;
  const balanceAfter =
    availableBalance === undefined || availableBalance === null
      ? null
      : Number(availableBalance || 0) - totalDebitAmount - chargeAmount;
  const bankName = selectedAccount?.label || selectedAccount?.bankName || selectedAccount?.bank || 'IDFC Bank';
  const accountNumber = selectedAccount?.maskedAccountNumber || selectedAccount?.accountNumber || 'Account';
  const bankInitials = String(bankName)
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const renderReleaseSection = (title, children) => (
    <section>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.09em] text-slate-400">
        {title}
      </p>
      <div className="overflow-hidden rounded-[10px] border border-slate-200 bg-white">
        {children}
      </div>
    </section>
  );

  const renderReleaseRow = (label, value, { mono = false } = {}) => (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-3.5 py-2.5 last:border-b-0">
      <span className="shrink-0 text-[13px] text-slate-500">{label}</span>
      <span className={`min-w-0 text-right text-[13px] font-medium text-slate-900 ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  );

  const getSelectedBeneficiaryForInvoice = (invoice) => {
    const beneficiaryAccounts = getInvoiceBeneficiaryAccounts(invoice);
    const selectedBeneficiaryId = selectedBeneficiaryAccounts[invoice.id] || beneficiaryAccounts[0]?.id || '';

    return (
      beneficiaryAccounts.find((account) => String(account.id) === String(selectedBeneficiaryId)) ||
      beneficiaryAccounts[0] ||
      null
    );
  };

  const hasReleaseInvoices = Array.isArray(payrun.invoices) && payrun.invoices.length > 0;
  const canContinueReleaseStep =
    (step === 1 && hasReleaseInvoices) || (step === 2 && hasEligibleBankAccount && selectedAccount && !isBalanceFetching);

  const getPayrunId = () => payrun.payrunId || payrun.id;
  const getOtpRequestId = (response) =>
    response?.otpRequestId ||
    response?.data?.otpRequestId ||
    response?.otp_request_id ||
    response?.data?.otp_request_id ||
    '';
  const requestOtp = async ({ resend = false } = {}) => {
    if (!selectedAccount) {
      toast.error('Select an active verified bank account before requesting OTP');
      return false;
    }
    const payrunId = getPayrunId();
    if (!payrunId) {
      toast.error('Payrun id is missing');
      return false;
    }
    try {
      if (selectedBalanceAccountId) {
        const balanceResult = await refetchSelectedAccountBalance();
        const latestBalance =
          balanceResult?.data?.availableBalance ??
          balanceResult?.data?.available_balance ??
          balanceResult?.data?.balance ??
          null;

        if (latestBalance === null || latestBalance === undefined) {
          toast.error('Unable to fetch the latest bank balance. Please try again.');
          return false;
        }

        if (Number(latestBalance || 0) < totalDebitAmount + chargeAmount) {
          toast.error('Insufficient bank balance for this payment release.');
          return false;
        }
      }

      const payload = {
        payrunId,
        bankAccountId: getReleaseBankAccountId(selectedAccount),
        paymentMode: mode,
        amount: Number(payrun.totalAmount || 0),
      };
      const response = resend
        ? await resendReleaseOtp({ ...payload, otpRequestId }).unwrap()
        : await requestReleaseOtp(payload).unwrap();
      setOtpRequestId(getOtpRequestId(response));
      setOtpSent(true);
      setOtp('');
      setOtpCooldownSeconds(OTP_RESEND_COOLDOWN_SECONDS);
      toast.success(response?.message || response?.data?.message || 'OTP sent');
      return true;
    } catch (error) {
      toast.error(error?.data?.message || error?.data?.detail || 'Failed to send OTP');
      return false;
    }
  };

  const payNow = async () => {
    if (!selectedAccount) {
      toast.error('Select an active verified bank account before releasing payment');
      return;
    }
    if (!otpSent) {
      await requestOtp();
      return;
    }
    if (otp.trim().length < 4) {
      toast.error('Enter the OTP to release payment');
      return;
    }
    const payrunId = getPayrunId();
    if (!payrunId) {
      toast.error('Payrun id is missing');
      return;
    }
    let releaseResponse;
    try {
      releaseResponse = await releasePayrunPayment({
        payrunId,
        bankAccountId: getReleaseBankAccountId(selectedAccount),
        paymentMode: mode,
        otpRequestId,
        otp: otp.trim(),
      }).unwrap();
    } catch (error) {
      toast.error(error?.data?.message || error?.data?.detail || 'Failed to release payment');
      return;
    }
    const paidAt = new Date().toISOString();
    const releaseItems =
      releaseResponse?.items ||
      releaseResponse?.data?.items ||
      releaseResponse?.transfers ||
      releaseResponse?.data?.transfers ||
      [];
    const paidInvoices = payrun.invoices.map((invoice, index) => ({
      ...invoice,
      status: 'Paid',
      utr:
        releaseItems[index]?.utr ||
        releaseItems[index]?.utrNumber ||
        releaseItems[index]?.utr_number ||
        invoice.utr ||
        '-',
      paidOn: paidAt,
    }));
    onPaid({
      ...payrun,
      status: 'Paid',
      paidOn: paidAt,
      mode,
      bank: selectedAccount?.label || selectedAccount?.bankName || selectedAccount?.bank || 'IDFC Bank',
      invoices: paidInvoices,
      timeline: [
        ...(payrun.timeline || []),
        { label: 'Payment released', actor: payrun.admin?.name || 'Admin / Master Admin', at: paidAt },
      ],
    });
    toast.success(releaseResponse?.message || releaseResponse?.data?.message || 'Payment released');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] max-w-5xl flex-col overflow-hidden"
        onInteractOutside={preventDialogOutsideDismiss}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle>Release Payment - {payrun.batchId}</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1 pb-2">
          <div className="flex flex-wrap gap-2">
            {releaseSteps.map((label, index) => {
              const stepNumber = index + 1;
              const active = step === stepNumber;
              const done = step > stepNumber;
              return (
                <span
                  key={label}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    active
                      ? 'border-primary bg-primary/10 text-primary'
                      : done
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        : 'border-border text-muted-foreground'
                  }`}
                >
                  {stepNumber}. {label}
                </span>
              );
            })}
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 px-[18px] py-4">
            <p className="mb-0.5 text-xs text-slate-500">Total Debit</p>
            <p className="m-0 text-[22px] font-extrabold text-slate-900">{formatMoney(totalDebitAmount)}</p>
          </div>

          {step === 1 && (
            <div className="space-y-5">
              {renderReleaseSection(
                'Invoice Details',
                <AppDataTable
                  tableHeader={[
                    { key: 'vendorName', title: 'Vendor' },
                    { key: 'invoiceNumber', title: 'Invoice' },
                    { key: 'beneficiaryAccount', title: 'Beneficiary Account' },
                    { key: 'bank', title: 'Bank' },
                    { key: 'ifsc', title: 'IFSC' },
                    { key: 'amount', title: 'Amount', headerClassName: 'text-left', cellClassName: 'text-left' },
                    { key: 'status', title: 'Status' },
                  ]}
                  tableData={payrun.invoices}
                  rowKey="id"
                  tableClassName="min-w-[920px] table-fixed text-sm"
                  tableContainerClassName="max-h-[360px] overflow-auto"
                  emptyMessage="No invoices in this payrun"
                  renderRow={(invoice) => {
                        const beneficiaryAccounts = getInvoiceBeneficiaryAccounts(invoice);
                        const selectedBeneficiaryId = selectedBeneficiaryAccounts[invoice.id] || beneficiaryAccounts[0]?.id || '';
                        const selectedBeneficiary = getSelectedBeneficiaryForInvoice(invoice) || {};
                        const hasMultipleAccounts = beneficiaryAccounts.length > 1;

                        return (
                          <TableRow key={invoice.id} className="align-top">
                            <TableCell className="max-w-[180px] overflow-hidden whitespace-nowrap px-3.5 py-3 text-left font-medium text-slate-900">
                              {clippedTableText(invoice.vendorName)}
                            </TableCell>
                            <TableCell className="max-w-[180px] overflow-hidden whitespace-nowrap px-3.5 py-3 text-left text-primary">
                              {clippedTableText(invoice.invoiceNumber)}
                            </TableCell>
                            <TableCell className="max-w-[220px] overflow-hidden whitespace-nowrap px-3.5 py-3 text-left">
                              {hasMultipleAccounts ? (
                                <Select
                                  value={String(selectedBeneficiaryId)}
                                  onValueChange={(value) =>
                                    setSelectedBeneficiaryAccounts((prev) => ({
                                      ...prev,
                                      [invoice.id]: value,
                                    }))
                                  }
                                >
                                  <SelectTrigger className="h-9 min-w-[220px]">
                                    <SelectValue placeholder="Select account" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {beneficiaryAccounts.map((account) => (
                                      <SelectItem
                                        key={getBeneficiaryAccountKey(invoice.id, account.id)}
                                        value={String(account.id)}
                                      >
                                        {account.accountNumber}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <span
                                  className="block min-w-0 truncate font-mono text-xs text-slate-700"
                                  title={selectedBeneficiary.accountNumber || '-'}
                                >
                                  {selectedBeneficiary.accountNumber || '-'}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="max-w-[180px] overflow-hidden whitespace-nowrap px-3.5 py-3 text-left text-slate-700">
                              {clippedTableText(selectedBeneficiary.bankName)}
                            </TableCell>
                            <TableCell className="max-w-[180px] overflow-hidden whitespace-nowrap px-3.5 py-3 text-left font-mono text-xs text-slate-700">
                              {clippedTableText(selectedBeneficiary.ifsc)}
                            </TableCell>
                            <TableCell className="max-w-[180px] overflow-hidden whitespace-nowrap px-3.5 py-3 text-left font-semibold text-slate-900">
                              {clippedTableText(formatMoney(invoice.requestedAmount))}
                            </TableCell>
                            <TableCell className="max-w-[180px] overflow-hidden whitespace-nowrap px-3.5 py-3 text-left">
                              <span
                                className={`rounded-full px-2 py-1 text-xs font-medium ${
                                  selectedBeneficiary.statusClassName || 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {selectedBeneficiary.statusLabel || selectedBeneficiary.status || 'Not Verified'}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      }}
                />,
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              {renderReleaseSection(
                'Payment Details',
                <div className="space-y-4 p-3.5">
                  {!hasEligibleBankAccount ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                      <p className="font-medium">No active verified bank account is available.</p>
                      <p className="mt-1">
                        Activate an approved account or submit a new bank account for verification before releasing this payment.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-3 bg-white"
                        onClick={() => {
                          onOpenChange(false);
                          navigate('/settings?tab=banking');
                        }}
                      >
                        Manage Bank Accounts
                      </Button>
                    </div>
                  ) : null}

                  <div>
                    <Label className="text-[13px] font-medium text-slate-700">Pay From</Label>
                    <div className="mt-2 max-h-56 space-y-2 overflow-y-auto pr-1">
                      {bankAccounts.map((account) => {
                        const accountId = String(getReleaseBankAccountId(account));
                        const active = String(bankAccountId) === accountId;
                        const accountBankName = account.label || account.bankName || account.bank || 'IDFC Bank';
                        const accountDisplay = account.maskedAccountNumber || account.accountNumber || 'Account';
                        const fallbackAccountBalance = account.availableBalance ?? account.available_balance ?? account.balance;
                        const accountBalance = active ? availableBalance : fallbackAccountBalance;
                        const accountInitials = String(accountBankName)
                          .split(/\s+/)
                          .map((part) => part[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase();

                        return (
                          <button
                            key={accountId}
                            type="button"
                            onClick={() => setBankAccountId(accountId)}
                            className={`flex w-full items-center gap-3 rounded-[10px] border p-3 text-left transition ${
                              active
                                ? 'border-primary bg-primary/5'
                                : 'border-slate-200 bg-white hover:border-primary/50 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-orange-500 text-[11px] font-extrabold text-white">
                              {accountInitials}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="m-0 truncate text-[13.5px] font-semibold text-slate-900">
                                {accountBankName} · {accountDisplay}
                              </p>
                              <p className="mt-0.5 text-xs text-slate-500">
                                Available:{' '}
                                {active && isBalanceFetching
                                  ? 'Fetching...'
                                  : accountBalance === undefined || accountBalance === null
                                    ? '-'
                                    : formatMoney(accountBalance)}
                              </p>
                            </div>
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-medium ${
                                active
                                  ? 'bg-primary/10 text-primary'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {active ? 'Selected' : 'Active'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <Label className="text-[13px] font-medium text-slate-700">Payment Mode</Label>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {paymentModes.map((paymentMode) => {
                        const active = mode === paymentMode;
                        const enabled = paymentModeRecommendation.enabledModes.includes(paymentMode);
                        return (
                          <button
                            key={paymentMode}
                            type="button"
                            onClick={() => {
                              if (enabled) setMode(paymentMode);
                            }}
                            disabled={!hasEligibleBankAccount || !enabled}
                            className={`rounded-[10px] border-2 px-3 py-2 text-left transition ${
                              !enabled
                                ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 opacity-70'
                                : active
                                ? 'border-primary bg-primary/5 text-primary'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-primary/50'
                            }`}
                          >
                            <span className="block text-[12.5px] font-bold">{paymentMode}</span>
                            <span className="mt-0.5 block text-xs text-slate-500">
                              {paymentMode === 'IMPS' ? '<₹5L' : paymentMode === 'RTGS' ? '₹2L+' : 'Any'}
                            </span>
                            {paymentMode === paymentModeRecommendation.recommendedMode ? (
                              <span className="mt-1 block text-[11px] font-semibold text-primary">
                                Recommended
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-[12.5px] text-blue-900">
                      Recommended: <strong>{paymentModeRecommendation.recommendedMode}</strong> for this batch amount of{' '}
                      <strong>{formatMoney(totalDebitAmount)}</strong> ({paymentModeRecommendation.reason})
                    </div>
                  </div>
                </div>,
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              {renderReleaseSection(
                'Review',
                <>
                  {renderReleaseRow('Debit Account', selectedAccount ? `${bankName} · ${accountNumber}` : '-')}
                  {renderReleaseRow('Payment Mode', mode)}
                  {renderReleaseRow('Invoice Amount', formatMoney(totalDebitAmount))}
                  {renderReleaseRow(`Charges (${mode})`, chargeAmount > 0 ? formatMoney(chargeAmount) : 'Free')}
                  {renderReleaseRow('Total Debit', formatMoney(totalDebitAmount + chargeAmount))}
                  {renderReleaseRow(
                    'Balance After',
                    isBalanceFetching
                      ? 'Fetching...'
                      : balanceAfter === null
                      ? '-'
                      : balanceAfter < 0
                        ? 'Insufficient funds'
                        : formatMoney(balanceAfter),
                  )}
                </>,
              )}

              {otpSent && (
                <div className="space-y-2">
                  <Label>OTP</Label>
                  <Input value={otp} onChange={(event) => setOtp(event.target.value)} placeholder="Enter OTP" />
                  <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span>OTP sent.</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => requestOtp({ resend: true })}
                      disabled={otpCooldownSeconds > 0 || requestingOtp || resendingOtp}
                    >
                      {resendingOtp
                        ? 'Sending...'
                        : otpCooldownSeconds > 0
                        ? `Resend OTP (${otpCooldownSeconds}s)`
                        : 'Resend OTP'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t pt-4">
          {step > 1 && <Button variant="outline" onClick={() => setStep((prev) => prev - 1)}>Back</Button>}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {step < 3 ? (
            <Button onClick={() => setStep((prev) => prev + 1)} disabled={!canContinueReleaseStep}>
              Continue
            </Button>
          ) : (
            <Button onClick={payNow} disabled={!selectedAccount || requestingOtp || resendingOtp || releasingPayrun}>
              {releasingPayrun
                ? 'Releasing...'
                : requestingOtp
                  ? 'Sending OTP...'
                  : otpSent ? 'Verify OTP & Release' : 'Release Payment'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
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
  } = useGetPendingPaymentsQuery(pendingPaymentsQueryArgs, { skip: !shouldFetchPendingPayments });
  const {
    data: pendingPaymentCountData = null,
  } = useGetPendingPaymentsQuery(paymentCountQueryArgs, { skip: shouldFetchPendingPayments });
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
  const [recordPaymentInvoiceIds, setRecordPaymentInvoiceIds] = useState([]);
  const [paymentReportInvoiceIds, setPaymentReportInvoiceIds] = useState([]);
  const [recordPaymentForm, setRecordPaymentForm] = useState({
    paymentDate: '',
    payment_method: 'Bank Transfer',
    reference_number: '',
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
  const [releasePayrun, setReleasePayrun] = useState(null);
  const [releasePayrunOpen, setReleasePayrunOpen] = useState(false);
  const [createPayrun, { isLoading: creatingPayrun }] = useCreatePayrunMutation();
  const [approvePayrun] = useApprovePayrunMutation();
  const [rejectPayrun] = useRejectPayrunMutation();
  const [cancelPayrun] = useCancelPayrunMutation();

  const normalizePayment = (payment = {}) => ({
    ...payment,
    invoice_id: payment.invoice_id ?? payment.invoiceId,
    invoiceNumber: payment.invoiceNumber ?? payment.invoice_number,
    vendorName: payment.vendorName ?? payment.vendor_name,
    paymentDate: payment.paymentDate ?? payment.payment_date ?? payment.paidOn ?? payment.paid_on,
    payment_method: payment.payment_method ?? payment.paymentMethod,
    reference_number:
      payment.reference_number ??
      payment.referenceNumber ??
      payment.utrNumber ??
      payment.utr_number ??
      payment.utr,
  });

  const normalizeInvoice = (invoice = {}) => ({
    ...invoice,
    invoiceNumber: invoice.invoiceNumber ?? invoice.invoice_number,
    vendorName: invoice.vendorName ?? invoice.vendor_name,
    invoiceDate: invoice.invoiceDate ?? invoice.invoice_date,
    dueDate: invoice.dueDate ?? invoice.due_date,
  });
  const normalizePendingPaymentInvoice = (invoice = {}) => {
    const normalized = toInvoiceUiPayload(invoice);
    const netPayable =
      invoice.netAmount ??
      invoice.net_amount ??
      invoice.netPayable ??
      invoice.net_payable ??
      normalized.netAmount ??
      normalized.net_amount ??
      normalized.amount;

    return {
      ...normalized,
      grossAmount:
        invoice.totalAmount ??
        invoice.total_amount ??
        normalized.totalAmount ??
        normalized.total_amount,
      originalAmount: invoice.amount ?? invoice.originalAmount ?? normalized.originalAmount,
      amount: Number(netPayable ?? 0),
      netAmount: Number(netPayable ?? 0),
      netPayable: Number(netPayable ?? 0),
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
    normalizePendingPaymentInvoice(invoice),
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
    payableInvoices.length,
  );
  const batchEligibleInvoices = [...pendingPaymentInvoices, ...pendingApproverInvoices];
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
    if (payableInvoices.length === 0) {
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

  const selectedRecordPaymentInvoices = payableInvoices.filter((invoice) =>
    recordPaymentInvoiceIds.includes(invoice.id),
  );

  const openPaymentReportDialog = () => {
    if (!guardAction('payments.create')) return;
    if (payableInvoices.length === 0) {
      toast.error('No pending invoices available for report');
      return;
    }

    setPaymentReportInvoiceIds((prev) =>
      prev.length > 0 ? prev : payableInvoices.map((invoice) => invoice.id),
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

  const openRequestPaymentDialog = () => {
    if (!guardAction('payments.createPayrun')) return;
    if (!canCreatePayrun) {
      toast.error('You do not have permission to create payruns');
      return;
    }
    if (recordPaymentInvoiceIds.length === 0) {
      toast.error('Please select at least one invoice from the list');
      return;
    }
    setRequestPaymentOpen(true);
  };

  const handleCreatePayrun = async (payload) => {
    try {
      const response = await createPayrun(payload).unwrap();
      setRecordPaymentInvoiceIds([]);
      setRequestPaymentOpen(false);
      setActivePaymentTab('payruns');
      toast.success(`${response?.payrunNumber || response?.payrun_number || 'Payrun'} created`);
    } catch (error) {
      toast.error(error?.data?.detail || error?.data?.message || 'Failed to create payrun');
    }
  };

  const openApprovalDecision = (payrun, type) => {
    if (!guardAction(type === 'reject' ? 'payments.rejectPayrun' : 'payments.approvePayrun')) return;
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
    try {
      const action = isReject ? rejectPayrun : approvePayrun;
      await action({
        payrunId: payrun.payrunId || payrun.id,
        approvalId: pendingApproval?.id,
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

  const handleCancelPayrun = async (payrun) => {
    if (!guardAction('payments.cancelPayrun')) return;
    if (payrun.status !== 'Waiting For Approval') {
      toast.error('Only payruns waiting for approval can be cancelled');
      return;
    }
    try {
      await cancelPayrun({
        payrunId: payrun.payrunId || payrun.id,
        comments: 'Cancelled by requester',
      }).unwrap();
      await refetchPayruns();
      toast.success('Payrun cancelled');
    } catch (error) {
      toast.error(error?.data?.detail || error?.data?.message || 'Failed to cancel payrun');
    }
  };

  const openPayrunDetails = (payrun) => {
    setSelectedPayrun(payrun);
    setPayrunDetailsOpen(true);
  };

  const openReleasePayrun = (payrun) => {
    if (!guardAction('payments.releasePayrun')) return;
    if (payrun.status !== 'Approved') {
      toast.error('Payrun must be approved before release');
      return;
    }
    setReleasePayrun(payrun);
    setReleasePayrunOpen(true);
  };

  const handlePayrunPaid = async (paidPayrun) => {
    setActivePaymentTab('released');
    toast.success(`${paidPayrun.batchId} paid successfully`);
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
      prev.length === payableInvoices.length ? [] : payableInvoices.map((invoice) => invoice.id),
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
    const embeddedInvoice =
      normalizedPayment.invoice ??
      normalizedPayment.invoiceDetails ??
      normalizedPayment.invoice_details;
    if (embeddedInvoice) return toInvoiceUiPayload(embeddedInvoice);
    return null;
  };

  const loadPaymentInvoice = async (payment) => {
    const invoice = resolvePaymentInvoice(payment);
    if (invoice) return invoice;

    const invoiceId = payment?.invoice_id ?? payment?.invoiceId;
    if (!invoiceId) return null;

    try {
      return toInvoiceUiPayload(await getInvoice(invoiceId).unwrap());
    } catch {
      return null;
    }
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
    const invoice = await loadPaymentInvoice(payment);
    if (!invoice) {
      toast.error('Invoice details are not available');
      return;
    }
    await handleViewInvoice(invoice, initialTab);
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
      safeLower(invoice.invoiceNumber).includes(safeLower(searchTerm))
  );
  const filteredPayruns = payruns.filter((payrun) =>
    safeLower(payrun.batchId).includes(safeLower(searchTerm)) ||
    safeLower(payrun.createdBy).includes(safeLower(searchTerm)) ||
    safeLower(payrun.admin?.name).includes(safeLower(searchTerm)),
  );
  const activePayruns = filteredPayruns.filter((payrun) => payrun.status !== 'Paid');

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
                {clippedTableText(invoice.invoiceNumber)}
              </div>
            );
            break;
          case 'amount':
            value = clippedTableText(`₹${Number(invoice.amount || 0).toLocaleString('en-IN')}`);
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
          placeholder="Search by vendor or invoice #..."
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
                onRetry={openReleasePayrun}
                canApprovePayrun={canApprovePayrun}
                canReleasePayrun={canReleasePayrun}
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
              handleViewPaymentInvoice={handleViewPaymentInvoice}
              handleDownloadPaymentInvoice={handleDownloadPaymentInvoice}
              showBranchField={isBranchEnabled}
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
        canReleasePayrun={canReleasePayrun}
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
        invoices={payableInvoices}
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
              Are you sure you want to release payments for {payableInvoices.length} invoices?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <MeteredActionCostHint
            actionCode={CREDIT_ACTION_CODES.PAYMENT_PROCESSING}
            unitCount={payableInvoices.length}
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
    </div>
  );
};

export default Payments;

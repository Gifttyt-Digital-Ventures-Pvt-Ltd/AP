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
  useGetPaymentsQuery,
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
import { Search, Loader2, Send, Eye, CheckCircle2, XCircle, RotateCcw, Download } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import PaymentsHeader from './components/PaymentsHeader';
import RecordPaymentDialog from './components/RecordPaymentDialog';
import useBankingSetup from '../banking/hooks/useBankingSetup';
import { getLinkedAccounts } from '../banking/utils/accountFormatters';
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

const baseBatchInvoiceTableHeader = [
  { key: 'invoiceNumber', title: 'Invoice', cellClassName: 'font-medium' },
  { key: 'orgBranch', title: 'Branch', cellClassName: 'text-sm' },
  { key: 'vendorName', title: 'Vendor' },
  { key: 'amount', title: 'Amount' },
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
  Number(invoice.amount || invoice.totalAmount || invoice.total_amount || invoice.amountDue || 0);

const getInvoiceGstAmount = (invoice = {}) =>
  Number(
    invoice.gstAmount ||
      invoice.gst_amount ||
      invoice.taxAmount ||
      invoice.tax_amount ||
      Math.round(getInvoiceAmount(invoice) * 0.18),
  );

const PayrunStatusBadge = ({ status }) => (
  <span className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium ${PAYRUN_STATUS_CLASS[status] || PAYRUN_STATUS_CLASS.Processing}`}>
    {status}
  </span>
);

const normalizePayrunStatus = (status = '') => {
  const value = String(status || '').trim().toLowerCase();
  if (['waiting_approval', 'waiting for approval', 'pending_approval'].includes(value)) return 'Waiting For Approval';
  if (['approved'].includes(value)) return 'Approved';
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
  payrun_created: 'Payrun Created',
  payrun_approved: 'Payrun Approved',
  payrun_rejected: 'Payrun Rejected',
  payrun_cancelled: 'Payrun Cancelled',
  payrun_canceled: 'Payrun Cancelled',
  payrun_release_otp_requested: 'Release OTP Requested',
  payrun_release_otp_resent: 'Release OTP Resent',
  payrun_release_initiated: 'Payment Release Initiated',
  payment_initiated: 'Payment Initiated',
  payrun_released: 'Payment Released',
  payrun_paid: 'Payment Released',
  payrun_release_failed: 'Payment Release Failed',
};

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
      utr: item.utr || item.utrNumber || item.utr_number,
      paidOn: item.paidOn || item.paid_on,
    })),
    totalAmount: Number(payrun.totalPaymentAmount || payrun.total_payment_amount || payrun.totalAmount || payrun.total_amount || 0),
    timeline: auditLog.map((entry) => ({
      label: formatPayrunAuditLabel(entry.label || entry.event || entry.action),
      actor: entry.actorName || entry.actor_name || entry.actor || '-',
      at: entry.createdAt || entry.created_at || entry.at,
      comments: entry.comments || entry.comment,
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
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="bg-muted text-left">
                  <tr>
                    <th className="p-3">Vendor</th>
                    <th className="p-3">Invoice</th>
                    <th className="p-3">GST Validation</th>
                    <th className="p-3">Hold GST</th>
                    <th className="p-3 text-right">GST Amount</th>
                    <th className="p-3 text-right">Amount Due</th>
                    <th className="p-3 text-right">Requested Amount</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-t">
                      <td className="p-3 font-medium">{row.vendorName}</td>
                      <td className="p-3">{row.invoiceNumber}</td>
                      <td className="p-3">
                        <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2 py-1 text-xs font-medium text-green-800">
                          Pass
                        </span>
                      </td>
                      <td className="p-3">
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
                      </td>
                      <td className="p-3 text-right">{formatMoney(row.gstAmount)}</td>
                      <td className="p-3 text-right font-medium">{formatMoney(row.amountDue)}</td>
                      <td className="p-3 text-right">
                        <Input
                          type="number"
                          min="0"
                          max={row.holdGst ? Math.max(0, row.amountDue - row.gstAmount) : row.amountDue}
                          value={row.requestedAmount}
                          onChange={(event) =>
                            updateRow(row.id, (current) => ({
                              ...current,
                              requestedAmount: Number(event.target.value || 0),
                            }))
                          }
                          className="ml-auto w-36 text-right"
                        />
                      </td>
                      <td className="p-3">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setRows((prev) => prev.filter((item) => item.id !== row.id))}
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
  onCancel,
  onRelease,
  onRetry,
  canApprovePayrun,
  canCancelPayrun,
  canReleasePayrun,
}) => (
  <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm">
    <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
      <table className="w-full min-w-[1120px] text-sm">
        <thead className="sticky top-0 border-b bg-muted text-left">
          <tr>
            <th className="p-3">Batch ID</th>
            <th className="p-3">Created By</th>
            <th className="p-3 text-right">Invoices</th>
            <th className="p-3 text-right">Total Amount</th>
            <th className="p-3">Approval Route</th>
            <th className="p-3">Approval Status</th>
            <th className="p-3">Status</th>
            <th className="p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {payruns.map((payrun) => {
            const approvals = getPayrunApprovalRecords(payrun);
            const pendingApprovals = approvals.filter((approval) => approval.status === 'Pending');
            const approvedCount = approvals.filter((approval) => approval.status === 'Approved').length;
            const isDefaultAdminRoute = payrun.approvalRoute === DEFAULT_PAYRUN_APPROVAL_ROUTE;
            const canActOnApproval =
              payrun.status === 'Waiting For Approval' &&
              pendingApprovals.length > 0 &&
              (isDefaultAdminRoute ? canReleasePayrun : canApprovePayrun);
            const canCancel = payrun.status === 'Waiting For Approval' && canCancelPayrun;
            return (
              <tr key={payrun.id} className="border-b">
                <td className="p-3 font-semibold text-primary">{payrun.batchId}</td>
                <td className="p-3">{payrun.createdBy}</td>
                <td className="p-3 text-right">{payrun.invoices.length}</td>
                <td className="p-3 text-right font-semibold">{formatMoney(payrun.totalAmount)}</td>
                <td className="p-3">{payrun.approvalRoute || payrun.admin?.name || '-'}</td>
                <td className="p-3">
                  <div>{payrun.approvers?.length ? payrun.approvers.map((item) => item.name).join(', ') : payrun.admin?.name || '-'}</div>
                  <div className="text-xs text-muted-foreground">
                    Approved {approvedCount}/{approvals.length} · Pending {pendingApprovals.length}
                  </div>
                </td>
                <td className="p-3"><PayrunStatusBadge status={payrun.status} /></td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-1">
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
                    {canCancel && (
                      <Button variant="outline" size="sm" onClick={() => onCancel(payrun)}>
                        Cancel
                      </Button>
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
                </td>
              </tr>
            );
          })}
          {payruns.length === 0 && (
            <tr>
              <td colSpan={8} className="p-10 text-center text-muted-foreground">
                No payruns yet. Select invoices from Pending Payments and request payment.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

const PayrunDetailsDialog = ({ payrun, open, onOpenChange, onRelease, canReleasePayrun }) => {
  if (!payrun) return null;
  const approvals = getPayrunApprovalRecords(payrun);
  const auditLog = Array.isArray(payrun.timeline) ? payrun.timeline : [];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] max-w-5xl overflow-y-auto"
        onInteractOutside={preventDialogOutsideDismiss}
      >
        <DialogHeader>
          <DialogTitle>Payrun Details - {payrun.batchId}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 rounded-lg border p-4 text-sm md:grid-cols-2">
          <div><span className="text-muted-foreground">Created By:</span> {payrun.createdBy}</div>
          <div><span className="text-muted-foreground">Created On:</span> {safeFormatDate(payrun.createdOn, 'dd MMM yyyy')}</div>
          <div><span className="text-muted-foreground">Approval Route:</span> {payrun.approvalRoute || '-'}</div>
          <div><span className="text-muted-foreground">Approval Owner:</span> {payrun.admin?.name || '-'}</div>
          <div><span className="text-muted-foreground">Approvers:</span> {payrun.approvers?.length ? payrun.approvers.map((item) => item.name).join(', ') : '-'}</div>
          <div className="md:col-span-2"><span className="text-muted-foreground">Comments:</span> {payrun.remarks || '-'}</div>
        </div>
        <div className="rounded-lg border">
          <div className="border-b bg-muted px-4 py-3">
            <h3 className="font-semibold">Approval Status</h3>
          </div>
          <div className="divide-y">
            {approvals.map((approval) => (
              <div key={approval.id} className="grid gap-2 px-4 py-3 text-sm md:grid-cols-[1fr_140px_1fr]">
                <div>
                  <p className="font-medium">{approval.name}</p>
                  <p className="text-xs text-muted-foreground">{approval.role}</p>
                </div>
                <div>
                  <PayrunStatusBadge status={approval.status === 'Pending' ? 'Waiting For Approval' : approval.status} />
                </div>
                <div className="text-muted-foreground">
                  {approval.comments || '-'}
                  {approval.actedAt ? (
                    <span className="block text-xs">{safeFormatDate(approval.actedAt, 'dd MMM yyyy')}</span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-muted text-left">
              <tr>
                <th className="p-3">Vendor</th>
                <th className="p-3">Invoice</th>
                <th className="p-3 text-right">Requested Amount</th>
                <th className="p-3 text-right">GST Held</th>
                <th className="p-3">UTR</th>
                <th className="p-3">Bank Details</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {payrun.invoices.map((invoice) => (
                <tr key={invoice.id} className="border-t">
                  <td className="p-3 font-medium">{invoice.vendorName}</td>
                  <td className="p-3">{invoice.invoiceNumber}</td>
                  <td className="p-3 text-right">{formatMoney(invoice.requestedAmount)}</td>
                  <td className="p-3 text-right">{invoice.holdGst ? formatMoney(invoice.gstAmount) : '-'}</td>
                  <td className="p-3">{invoice.utr || '-'}</td>
                  <td className="p-3">{invoice.bankDetails}</td>
                  <td className="p-3">{invoice.status || 'Ready'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="rounded-lg border">
          <div className="border-b bg-muted px-4 py-3">
            <h3 className="font-semibold">Audit Log</h3>
          </div>
          <div className="divide-y">
            {auditLog.length > 0 ? (
              auditLog.map((entry, index) => (
                <div key={`${entry.label || 'audit'}-${entry.at || index}`} className="grid gap-2 px-4 py-3 text-sm md:grid-cols-[170px_1fr_1fr]">
                  <div className="text-muted-foreground">
                    {safeFormatDate(entry.at, 'dd MMM yyyy')}
                    <span className="block text-xs">{safeFormatDate(entry.at, 'hh:mm a')}</span>
                  </div>
                  <div>
                    <p className="font-medium">{entry.label || '-'}</p>
                    <p className="text-xs text-muted-foreground">{entry.actor || '-'}</p>
                  </div>
                  <div className="text-muted-foreground">{entry.comments || '-'}</div>
                </div>
              ))
            ) : (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                No audit events recorded.
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          {payrun.status === 'Approved' && canReleasePayrun && (
            <Button onClick={() => onRelease(payrun)}>Release Payment</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  const [requestReleaseOtp, { isLoading: requestingOtp }] = useRequestPayrunReleaseOtpMutation();
  const [resendReleaseOtp, { isLoading: resendingOtp }] = useResendPayrunReleaseOtpMutation();
  const [releasePayrunPayment, { isLoading: releasingPayrun }] = useReleasePayrunMutation();

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setBankAccountId('');
    setMode((payrun?.totalAmount || 0) >= 200000 ? 'RTGS' : 'NEFT');
    setOtpSent(false);
    setOtpCooldownSeconds(0);
    setOtp('');
    setOtpRequestId('');
  }, [open, payrun]);

  useEffect(() => {
    if (!open || !bankAccountId) return;
    const stillEligible = bankAccounts.some(
      (account) => String(account.id || account.accountNumber) === String(bankAccountId),
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
    if (!open || !otpSent || otpCooldownSeconds <= 0) return undefined;
    const timer = window.setTimeout(() => {
      setOtpCooldownSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [open, otpCooldownSeconds, otpSent]);

  if (!payrun) return null;
  const selectedAccount = bankAccounts.find((account) => String(account.id || account.accountNumber) === String(bankAccountId));
  const hasEligibleBankAccount = bankAccounts.length > 0;

  const getPayrunId = () => payrun.payrunId || payrun.id;
  const getOtpRequestId = (response) =>
    response?.otpRequestId ||
    response?.data?.otpRequestId ||
    response?.otp_request_id ||
    response?.data?.otp_request_id ||
    '';
  const getBankAccountId = (account) =>
    account?.id || account?.bankAccountId || account?.accountNumber || account?.account_number;
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
      const payload = {
        payrunId,
        bankAccountId: getBankAccountId(selectedAccount),
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
        bankAccountId: getBankAccountId(selectedAccount),
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
        className="max-h-[90vh] max-w-4xl overflow-y-auto"
        onInteractOutside={preventDialogOutsideDismiss}
      >
        <DialogHeader>
          <DialogTitle>Release Payment - {payrun.batchId}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          {['Verify Vendors', 'Debit Account', 'Review'].map((label, index) => (
            <span key={label} className={`rounded-full border px-3 py-1 text-xs font-medium ${step === index + 1 ? 'border-primary bg-primary/10 text-primary' : index + 1 < step ? 'border-green-200 bg-green-50 text-green-800' : 'border-border text-muted-foreground'}`}>
              {index + 1}. {label}
            </span>
          ))}
        </div>
        {step === 1 && (
          <div className="space-y-2">
            {payrun.invoices.map((invoice) => (
              <div key={invoice.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <span>{invoice.vendorName} - {invoice.invoiceNumber}</span>
                <span className="text-green-700">Beneficiary verified</span>
              </div>
            ))}
          </div>
        )}
        {step === 2 && (
          <div className="space-y-4">
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
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Debit Account</Label>
                <Select value={bankAccountId} onValueChange={setBankAccountId} disabled={!hasEligibleBankAccount}>
                  <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((account) => (
                      <SelectItem key={account.id || account.accountNumber} value={String(account.id || account.accountNumber)}>
                        {account.label || account.bankName || account.bank || 'IDFC Bank'} · {account.maskedAccountNumber || account.accountNumber || 'Account'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Payment Mode</Label>
                <Select value={mode} onValueChange={setMode} disabled={!hasEligibleBankAccount}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IMPS">IMPS</SelectItem>
                    <SelectItem value="NEFT">NEFT</SelectItem>
                    <SelectItem value="RTGS">RTGS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-lg border p-4 text-sm">
              <p><strong>Debit Account:</strong> {selectedAccount?.label || selectedAccount?.bankName || selectedAccount?.bank || 'IDFC Bank'}</p>
              <p><strong>Payment Mode:</strong> {mode}</p>
              <p><strong>Total:</strong> {formatMoney(payrun.totalAmount)}</p>
            </div>
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
        <DialogFooter>
          {step > 1 && <Button variant="outline" onClick={() => setStep((prev) => prev - 1)}>Back</Button>}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {step < 3 ? (
            <Button onClick={() => setStep((prev) => prev + 1)} disabled={step === 2 && (!hasEligibleBankAccount || !selectedAccount)}>
              Continue
            </Button>
          ) : (
            <Button onClick={payNow} disabled={!selectedAccount || requestingOtp || resendingOtp || releasingPayrun}>
              {releasingPayrun
                ? 'Releasing...'
                : requestingOtp
                  ? 'Sending OTP...'
                  : otpSent ? 'Verify OTP & Release' : 'Pay Now'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ReleasedPayrunsTab = ({ payruns }) => {
  const releasedRows = payruns.flatMap((payrun) =>
    payrun.invoices.map((invoice) => ({
      ...invoice,
      batchId: payrun.batchId,
      bank: payrun.bank,
      paidOn: invoice.paidOn || payrun.paidOn,
      mode: payrun.mode,
      admin: payrun.admin,
    })),
  );

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto">
        <table className="w-full min-w-[1080px] text-sm">
          <thead className="sticky top-0 border-b bg-muted text-left">
            <tr>
              <th className="p-3">Batch ID</th>
              <th className="p-3">Invoice</th>
              <th className="p-3">Vendor</th>
              <th className="p-3">UTR</th>
              <th className="p-3">Bank</th>
              <th className="p-3">Payment Date</th>
              <th className="p-3 text-right">Amount</th>
              <th className="p-3">Status</th>
              <th className="p-3">Payment Mode</th>
              <th className="p-3">Released By</th>
              <th className="p-3">Download Advice</th>
            </tr>
          </thead>
          <tbody>
            {releasedRows.map((row) => (
              <tr key={`${row.batchId}-${row.id}`} className="border-b">
                <td className="p-3 font-semibold text-primary">{row.batchId}</td>
                <td className="p-3">{row.invoiceNumber}</td>
                <td className="p-3">{row.vendorName}</td>
                <td className="p-3 font-medium">{row.utr}</td>
                <td className="p-3">{row.bank}</td>
                <td className="p-3">{safeFormatDate(row.paidOn, 'dd MMM yyyy')}</td>
                <td className="p-3 text-right font-semibold">{formatMoney(row.requestedAmount)}</td>
                <td className="p-3"><PayrunStatusBadge status="Paid" /></td>
                <td className="p-3">{row.mode}</td>
                <td className="p-3">{row.admin?.name || '-'}</td>
                <td className="p-3"><Button variant="ghost" size="sm"><Download className="mr-1 h-4 w-4" /> Advice</Button></td>
              </tr>
            ))}
            {releasedRows.length === 0 && (
              <tr>
                <td colSpan={11} className="p-10 text-center text-muted-foreground">
                  No released payments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
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
    data: payrunsData = [],
    isFetching: payrunsFetching,
    refetch: refetchPayruns,
  } = useGetPayrunsQuery(paymentQueryArgs, { skip: !isConnectedBankingEnabled });
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
    accountsFetching,
    refetchAccounts,
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
  const [activePaymentTab, setActivePaymentTab] = useState('pending');
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
  const pendingPaymentInvoices = getInvoiceListItems(pendingPaymentInvoicesListData).map((invoice) =>
    toInvoiceUiPayload(invoice),
  );
  const allInvoices = useMemo(
    () => getInvoiceListItems(allInvoicesListData).map((invoice) => toInvoiceUiPayload(invoice)),
    [allInvoicesListData],
  );
  const pendingApproverInvoices = getInvoiceListItems(pendingApproverInvoicesListData).map((invoice) =>
    toInvoiceUiPayload(invoice),
  );
  const invoices = pendingPaymentInvoices;
  const payruns = useMemo(
    () => (Array.isArray(payrunsData) ? payrunsData.map(normalizePayrun) : []),
    [payrunsData],
  );
  const payrunInvoiceIds = useMemo(
    () => new Set(payruns.flatMap((payrun) => payrun.invoices.map((invoice) => invoice.id))),
    [payruns],
  );
  const payableInvoices = useMemo(
    () => invoices.filter((invoice) => !payrunInvoiceIds.has(invoice.id)),
    [payrunInvoiceIds, invoices],
  );
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
    paymentsFetching ||
    pendingPaymentInvoicesFetching ||
    allInvoicesFetching ||
    pendingApproverInvoicesFetching ||
    (isConnectedBankingEnabled && payrunsFetching) ||
    (isConnectedBankingEnabled && accountsFetching);

  useEffect(() => {
    if (!showPayrunFlow && activePaymentTab === 'payruns') {
      setActivePaymentTab('pending');
    }
  }, [activePaymentTab, showPayrunFlow]);

  const handleRefreshPayments = async () => {
    try {
      await Promise.all([
        refetchPayments(),
        refetchPendingPaymentInvoices(),
        refetchAllInvoices(),
        isPaymentBatchesFeatureEnabled
          ? refetchPendingApproverInvoices()
          : Promise.resolve(),
        isConnectedBankingEnabled ? refetchAccounts() : Promise.resolve(),
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
      await Promise.all([refetchPayruns(), refetchPendingPaymentInvoices()]);
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
      await Promise.all([refetchPayruns(), refetchPendingPaymentInvoices()]);
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
    await Promise.all([refetchPayruns(), refetchPendingPaymentInvoices(), refetchPayments()]);
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
        ...allInvoices,
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
    allInvoices,
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
  const releasedPayruns = filteredPayruns.filter((payrun) => payrun.status === 'Paid');

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
          case 'vendorName':
            value = <VendorWithBranchCell record={invoice} />;
            break;
          case 'orgBranch':
            value = <OrgBranchCell record={invoice} />;
            break;
          default:
            value = invoice?.[header.key] || '-';
        }

        return (
          <TableCell
            key={header.key}
            className={cn('border border-table-border', header.cellClassName)}
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
            Pending Payments ({payableInvoices.length})
          </TabsTrigger>
          {showPayrunFlow && (
            <TabsTrigger value="payruns" data-testid="tab-payruns">
              Payruns ({activePayruns.length})
            </TabsTrigger>
          )}
          <TabsTrigger value="released" data-testid="tab-released-payments">
            Released Payments ({showPayrunFlow ? releasedPayruns.length : payments.length})
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
                onCancel={handleCancelPayrun}
                onRelease={openReleasePayrun}
                onRetry={openReleasePayrun}
                canApprovePayrun={canApprovePayrun}
                canCancelPayrun={canCancelPayrun}
                canReleasePayrun={canReleasePayrun}
              />
            </TabsContent>
          )}

          <TabsContent
            value="released"
            className="absolute inset-0 mt-0 flex min-h-0 flex-col focus-visible:outline-none data-[state=inactive]:hidden"
          >
            {showPayrunFlow ? (
              <ReleasedPayrunsTab payruns={releasedPayruns} />
            ) : (
              <ReleasedPaymentsTab
                filteredPayments={filteredPayments}
                totalPayments={payments.length}
                safeFormatDate={safeFormatDate}
                resolvePaymentInvoice={resolvePaymentInvoice}
                handleViewPaymentInvoice={handleViewPaymentInvoice}
                handleDownloadPaymentInvoice={handleDownloadPaymentInvoice}
                showBranchField={isBranchEnabled}
              />
            )}
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

      <PayrunDetailsDialog
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

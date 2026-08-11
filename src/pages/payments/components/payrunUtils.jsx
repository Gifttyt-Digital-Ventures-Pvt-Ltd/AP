import React from 'react';
import { format } from 'date-fns';
import { CheckCircle2, XCircle } from 'lucide-react';
import { normalizePayableRow } from '../utils/payableRows';

export const GENERIC_ADMIN_PAYRUN_ROUTE = {
  workflowId: 'generic-admin-payrun-route',
  name: 'Generic Admin Approval',
  admin: {
    id: 'generic-admin-master-admin',
    name: 'Admin / Master Admin',
    role: 'Admin / Master Admin',
  },
  approvers: [],
};

export const DEFAULT_PAYRUN_APPROVAL_OWNER = {
  id: GENERIC_ADMIN_PAYRUN_ROUTE.admin.id,
  name: GENERIC_ADMIN_PAYRUN_ROUTE.admin.name,
  role: GENERIC_ADMIN_PAYRUN_ROUTE.admin.role,
};

export const DEFAULT_PAYRUN_APPROVAL_ROUTE = GENERIC_ADMIN_PAYRUN_ROUTE.name;

const PAYRUN_STATUS_CLASS = {
  'Waiting For Approval': 'bg-amber-100 text-amber-800 border-amber-200',
  Approved: 'bg-blue-100 text-blue-800 border-blue-200',
  'Waiting For Payment': 'bg-purple-100 text-purple-800 border-purple-200',
  'Payment Initiated': 'bg-sky-100 text-sky-800 border-sky-200',
  Paid: 'bg-green-100 text-green-800 border-green-200',
  Failed: 'bg-red-100 text-red-800 border-red-200',
  Rejected: 'bg-slate-100 text-slate-700 border-slate-200',
  Cancelled: 'bg-slate-100 text-slate-700 border-slate-200',
};

const safeFormatDate = (value, pattern = 'dd MMM yy') => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : format(date, pattern);
};

export const PayrunStatusBadge = ({ status }) => (
  <span className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-1 text-xs font-medium ${PAYRUN_STATUS_CLASS[status] || PAYRUN_STATUS_CLASS['Waiting For Approval']}`}>
    {status}
  </span>
);

export const normalizePayrunStatus = (status = '') => {
  const value = String(status || '').trim().toLowerCase();
  if (['waiting_approval', 'waiting for approval', 'pending_approval'].includes(value)) return 'Waiting For Approval';
  if (['approved'].includes(value)) return 'Approved';
  if (['waiting_payment', 'waiting for payment', 'pending_payment'].includes(value)) return 'Waiting For Payment';
  if (['rejected'].includes(value)) return 'Rejected';
  if (['cancelled', 'canceled'].includes(value)) return 'Cancelled';
  if (['paid', 'released', 'completed', 'success'].includes(value)) return 'Paid';
  if (['failed', 'release_failed'].includes(value)) return 'Failed';
  if (['payment_initiated', 'processing', 'release_initiated'].includes(value)) return 'Payment Initiated';
  if (!status) return 'Waiting For Approval';
  return String(status);
};

export const normalizeApprovalStatus = (status = '') => {
  const value = String(status || '').trim().toLowerCase();
  if (value === 'approved') return 'Approved';
  if (value === 'rejected') return 'Rejected';
  return 'Pending';
};

const toActionFlags = (actions = {}) => ({
  view: Boolean(actions.view ?? actions.canView),
  approve: Boolean(actions.approve ?? actions.canApprove),
  reject: Boolean(actions.reject ?? actions.canReject),
  release: Boolean(actions.release ?? actions.canRelease),
  retry: Boolean(actions.retry ?? actions.canRetry),
  cancel: Boolean(actions.cancel ?? actions.canCancel),
});

const getBeneficiaryAccounts = (item = {}) => {
  const accounts =
    item.beneficiaryAccounts ||
    item.beneficiary_accounts ||
    item.vendorAccounts ||
    item.vendor_accounts ||
    item.bankAccounts ||
    item.bank_accounts ||
    [];

  return Array.isArray(accounts) ? accounts : accounts ? [accounts] : [];
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
  payrun_payment_initiated: 'Payment Initiated',
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
    id: 'payment-initiated',
    label: 'Payment Initiated',
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

export const formatPayrunAuditLabel = (value = '') => {
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
  if (value.includes('payment initiated') || value.includes('release initiated')) return 'payment-initiated';
  if (value.includes('payment released') || value.includes('paid')) return 'payment-released';
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
  if (stoppedEntry && ['approved', 'release-otp-requested', 'payment-initiated', 'payment-released', 'utr-captured'].includes(stepId)) return 'Pending';

  if (stepId === 'under-review') {
    if (status === 'Waiting For Approval') return 'In Progress';
    return 'Completed';
  }

  if (stepId === 'approved') {
    return hasApproved || ['Approved', 'Waiting For Payment', 'Payment Initiated', 'Paid', 'Failed'].includes(status)
      ? 'Completed'
      : 'Pending';
  }

  if (stepId === 'release-otp-requested') {
    if (hasAuditStep) return 'Completed';
    if (status === 'Waiting For Payment') return 'In Progress';
    if (['Payment Initiated', 'Paid', 'Failed'].includes(status)) return 'Completed';
    return released ? 'Completed' : 'Pending';
  }

  if (stepId === 'payment-initiated') {
    if (status === 'Failed') return 'Rejected';
    if (['Payment Initiated', 'Paid'].includes(status)) return status === 'Payment Initiated' ? 'In Progress' : 'Completed';
    return 'Pending';
  }

  if (stepId === 'payment-released') {
    if (status === 'Failed') return 'Rejected';
    if (released) return 'Completed';
    return 'Pending';
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

export const PayrunAuditTimeline = ({ payrun, approvals }) => {
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

export const normalizePayrun = (payrun = {}) => {
  const route = payrun.approvalRoute || payrun.approval_route || {};
  const admin = route.admin || payrun.admin || payrun.paymentAdmin || payrun.payment_admin || null;
  const items = payrun.items || payrun.invoices || payrun.payrunItems || payrun.payrun_items || [];
  const approvals = payrun.approvals || payrun.approvalRecords || payrun.approval_records || [];
  const auditLog = payrun.auditLog || payrun.audit_log || payrun.timeline || [];
  const createdEvent = auditLog.find((entry) =>
    ['payrun_created', 'batch_created', 'created'].includes(
      String(entry.event || entry.action || entry.label || '').trim().toLowerCase(),
    ),
  );
  const allowedActions =
    payrun.allowedActions ||
    payrun.allowed_actions ||
    payrun.actions ||
    payrun.actionControls ||
    payrun.action_controls ||
    {};

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
    createdOn:
      payrun.createdAt ||
      payrun.created_at ||
      payrun.createdOn ||
      payrun.created_on ||
      createdEvent?.createdAt ||
      createdEvent?.created_at ||
      createdEvent?.at,
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
    allowedActions: toActionFlags(allowedActions),
    invoices: items.map((item) => {
      const beneficiaryAccounts = getBeneficiaryAccounts(item);
      const primaryBeneficiaryAccount = beneficiaryAccounts[0] || {};
      const vendorBankName =
        item.vendorBankName ||
        item.vendor_bank_name ||
        item.bankName ||
        item.bank_name ||
        primaryBeneficiaryAccount.bankName ||
        primaryBeneficiaryAccount.bank_name;
      const vendorAccountNumber =
        item.vendorAccountNumber ||
        item.vendor_account_number ||
        item.accountNumber ||
        item.account_number ||
        primaryBeneficiaryAccount.accountNumber ||
        primaryBeneficiaryAccount.account_number;
      const vendorIfscCode =
        item.vendorIfscCode ||
        item.vendor_ifsc_code ||
        item.ifscCode ||
        item.ifsc_code ||
        item.ifsc ||
        primaryBeneficiaryAccount.ifscCode ||
        primaryBeneficiaryAccount.ifsc_code ||
        primaryBeneficiaryAccount.ifsc;
      const beneficiaryStatus =
        item.beneficiaryStatus ||
        item.beneficiary_status ||
        primaryBeneficiaryAccount.status;
      const bankDetails =
        item.bankDetails ||
        item.bank_details ||
        [vendorBankName, vendorAccountNumber, vendorIfscCode].filter(Boolean).join(' · ');

      const payable = normalizePayableRow({
        ...item,
        currency: item.currency || item.currency_code || payrun.currency || payrun.currency_code,
      });

      return {
        ...item,
        ...payable,
        id: item.invoiceId || item.invoice_id || item.id || item.payrunItemId || item.payrun_item_id,
        payrunItemId: item.payrunItemId || item.payrun_item_id,
        invoiceNumber: item.invoiceNumber || item.invoice_number || payable.invoiceNumber || '-',
        vendorId: item.vendorId || item.vendor_id,
        vendorName: item.vendorName || item.vendor_name || item.vendor?.name || '-',
        currency: item.currency || item.currency_code || payrun.currency || payrun.currency_code,
        requestedAmount: Number(
          item.requestedAmount ||
            item.requested_amount ||
            payable.payableAmount ||
            item.paymentAmount ||
            item.payment_amount ||
            item.amount ||
            0,
        ),
        convertToInr: Boolean(item.convertToInr ?? item.convert_to_inr ?? false),
        matchingInrValue: item.matchingInrValue ?? item.matching_inr_value,
        actualInrAmount: item.actualInrAmount ?? item.actual_inr_amount,
        gstAmount: Number(item.gstAmount || item.gst_amount || 0),
        holdGst: Boolean(item.holdGst ?? item.hold_gst),
        bankDetails,
        vendorBankName,
        vendorAccountNumber,
        vendorIfscCode,
        beneficiaryStatus,
        beneficiaryAccounts,
        utr: item.utr || item.utrNumber || item.utr_number,
        paidOn: item.paidOn || item.paid_on,
      };
    }),
    currency: payrun.currency || payrun.currency_code || items.find((item) => item.currency || item.currency_code)?.currency || items.find((item) => item.currency || item.currency_code)?.currency_code,
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

export const getPayrunApprovalRecords = (payrun = {}) => {
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

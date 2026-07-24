import { differenceInCalendarDays, isValid, parseISO, startOfDay } from 'date-fns';
import {
  isInvoicePaid,
  normalizeWorkflowStatus,
} from '../../../utils/approvalWorkflow';

export const PENDING_PAYMENT_STATUS = 'Pending Payment';

export const NON_OVERDUE_STATUSES = new Set([
  'Paid',
  'Rejected',
  'Draft',
  'Saved',
]);

export const parseInvoiceDueDate = (value) => {
  if (!value) return null;
  const date = parseISO(String(value).slice(0, 10));
  return isValid(date) ? startOfDay(date) : null;
};

export const normalizeInvoiceOverdueFields = (invoice = {}) => {
  const daysOverdueRaw =
    invoice.daysOverdue ?? invoice.days_overdue ?? null;
  const parsedDays =
    daysOverdueRaw === null || daysOverdueRaw === undefined || daysOverdueRaw === ''
      ? null
      : Number(daysOverdueRaw);

  return {
    daysOverdue: Number.isFinite(parsedDays) ? parsedDays : null,
    isOverdue: Boolean(invoice.isOverdue ?? invoice.is_overdue ?? false),
  };
};

export const isInvoicePendingPayment = (invoice = {}) =>
  normalizeWorkflowStatus(invoice.status) === PENDING_PAYMENT_STATUS;

export const computeClientDaysOverdue = (invoice = {}) => {
  const dueDate = parseInvoiceDueDate(invoice.dueDate ?? invoice.due_date);
  if (!dueDate) return 0;

  const diff = differenceInCalendarDays(startOfDay(new Date()), dueDate);
  return diff > 0 ? diff : 0;
};

/** Whole days past due — prefers API `days_overdue`, else client calc when pending payment. */
export const getInvoiceDaysOverdue = (invoice = {}) => {
  const { daysOverdue, isOverdue } = normalizeInvoiceOverdueFields(invoice);

  if (Number.isFinite(daysOverdue) && daysOverdue > 0) {
    return daysOverdue;
  }

  if (!isInvoicePendingPayment(invoice) && !isOverdue) {
    return 0;
  }

  if (isOverdue) {
    return computeClientDaysOverdue(invoice) || 1;
  }

  if (!isInvoicePendingPayment(invoice)) {
    return 0;
  }

  return computeClientDaysOverdue(invoice);
};

export const isInvoicePaymentOverdue = (invoice = {}) => {
  if (isInvoicePaid(invoice.status)) return false;

  const status = normalizeWorkflowStatus(invoice.status);
  if (NON_OVERDUE_STATUSES.has(status)) return false;

  const { isOverdue } = normalizeInvoiceOverdueFields(invoice);
  if (isOverdue && isInvoicePendingPayment(invoice)) return true;

  return isInvoicePendingPayment(invoice) && getInvoiceDaysOverdue(invoice) > 0;
};

export const getInvoiceDueDateIndicatorLabel = (invoice = {}) => {
  const daysOverdue = getInvoiceDaysOverdue(invoice);
  if (daysOverdue <= 0) return '';

  return `${daysOverdue} day${daysOverdue === 1 ? '' : 's'} overdue`;
};

export const getInvoiceDueDateIndicatorClassName = () =>
  'border-red-200 bg-red-50 text-red-800';

export const shouldShowInvoicePaymentOverdueIndicator = (invoice = {}) =>
  isInvoicePaymentOverdue(invoice);

export const getInvoiceDueDateOrderValidationError = ({
  invoiceDate,
  dueDate,
} = {}) => {
  if (!invoiceDate || !dueDate) return null;

  const billingDate = parseInvoiceDueDate(invoiceDate);
  const paymentDueDate = parseInvoiceDueDate(dueDate);
  if (!billingDate || !paymentDueDate) return null;

  if (paymentDueDate < billingDate) {
    return 'Due date cannot be earlier than the invoice date.';
  }

  return null;
};

export const clampDueDateToInvoiceDate = ({ invoiceDate, dueDate } = {}) => {
  const billingDay = String(invoiceDate || '').trim();
  const dueDay = String(dueDate || '').trim();
  if (!billingDay || !dueDay) return dueDay;
  return dueDay < billingDay ? billingDay : dueDay;
};

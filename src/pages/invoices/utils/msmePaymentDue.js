import { addDays, format, isValid, parseISO } from 'date-fns';

export const MSME_MAX_PAYMENT_DAYS = 45;

export const MSME_PAYMENT_DUE_STATUS = {
  NOT_APPLICABLE: 'NOT_APPLICABLE',
  ON_TRACK: 'ON_TRACK',
  DUE_SOON: 'DUE_SOON',
  DUE_TODAY: 'DUE_TODAY',
  OVERDUE: 'OVERDUE',
  PAID: 'PAID',
};

const pickField = (source, camelKey, snakeKey) =>
  source?.[camelKey] ?? source?.[snakeKey];

const parseInvoiceDateValue = (value) => {
  if (!value) return null;
  const date = parseISO(String(value).slice(0, 10));
  return isValid(date) ? date : null;
};

const formatInvoiceDateValue = (date) => {
  if (!date || !isValid(date)) return '';
  return format(date, 'yyyy-MM-dd');
};

export const computeMsmeMaxDueDate = (invoiceDate) => {
  const base = parseInvoiceDateValue(invoiceDate);
  if (!base) return '';
  return formatInvoiceDateValue(addDays(base, MSME_MAX_PAYMENT_DAYS));
};

export const resolveVendorIsMsme = (payload = {}, vendor = null) =>
  Boolean(vendor?.msme) ||
  Boolean(
    pickField(payload, 'vendorIsMsme', 'vendor_is_msme') ??
      pickField(payload, 'vendorMsme', 'vendor_msme'),
  );

export const capMsmeDueDate = ({ invoiceDate, dueDate, vendorIsMsme } = {}) => {
  if (!vendorIsMsme) return dueDate || '';

  const maxDueDate = computeMsmeMaxDueDate(invoiceDate);
  if (!maxDueDate) return dueDate || '';
  if (!dueDate) return dueDate || '';

  return dueDate > maxDueDate ? maxDueDate : dueDate;
};

export const getMsmeDueDateValidationError = ({
  invoiceDate,
  dueDate,
  vendorIsMsme,
} = {}) => {
  if (!vendorIsMsme || !dueDate || !invoiceDate) return null;

  const maxDueDate = computeMsmeMaxDueDate(invoiceDate);
  if (!maxDueDate) return null;

  if (dueDate > maxDueDate) {
    return `MSME vendors require payment due within ${MSME_MAX_PAYMENT_DAYS} days of the invoice date (latest due date: ${maxDueDate}).`;
  }

  return null;
};

export const getMsmeDueDateValidationErrorForInvoice = (
  payload = {},
  { findVendorById, findVendorByName } = {},
) => {
  const vendor =
    payload.vendorId && typeof findVendorById === 'function'
      ? findVendorById(payload.vendorId)
      : payload.vendorName && typeof findVendorByName === 'function'
        ? findVendorByName(payload.vendorName)
        : null;

  return getMsmeDueDateValidationError({
    invoiceDate: payload.invoiceDate,
    dueDate: payload.dueDate,
    vendorIsMsme: resolveVendorIsMsme(payload, vendor),
  });
};

export const normalizeMsmePaymentDue = (invoice = {}) => {
  const vendorIsMsme = resolveVendorIsMsme(invoice);

  const msmePaymentTermDaysRaw = pickField(
    invoice,
    'msmePaymentTermDays',
    'msme_payment_term_days',
  );
  const msmePaymentTermDays =
    msmePaymentTermDaysRaw === null || msmePaymentTermDaysRaw === undefined
      ? vendorIsMsme
        ? MSME_MAX_PAYMENT_DAYS
        : null
      : Number(msmePaymentTermDaysRaw);

  const msmeMaxDueDate =
    pickField(invoice, 'msmeMaxDueDate', 'msme_max_due_date') ||
    (vendorIsMsme ? computeMsmeMaxDueDate(invoice.invoiceDate) : null) ||
    null;

  const daysRemainingRaw = pickField(
    invoice,
    'msmePaymentDueDaysRemaining',
    'msme_payment_due_days_remaining',
  );
  const msmePaymentDueDaysRemaining =
    daysRemainingRaw === null || daysRemainingRaw === undefined
      ? null
      : Number(daysRemainingRaw);

  const msmePaymentDueStatus =
    pickField(invoice, 'msmePaymentDueStatus', 'msme_payment_due_status') ||
    (vendorIsMsme ? MSME_PAYMENT_DUE_STATUS.ON_TRACK : MSME_PAYMENT_DUE_STATUS.NOT_APPLICABLE);

  const msmePaymentDueLabel =
    pickField(invoice, 'msmePaymentDueLabel', 'msme_payment_due_label') || '';

  return {
    vendorIsMsme,
    msmePaymentTermDays: Number.isFinite(msmePaymentTermDays) ? msmePaymentTermDays : null,
    msmeMaxDueDate,
    msmePaymentDueDaysRemaining: Number.isFinite(msmePaymentDueDaysRemaining)
      ? msmePaymentDueDaysRemaining
      : null,
    msmePaymentDueStatus,
    msmePaymentDueLabel,
  };
};

export const getMsmePaymentDueBadgeClassName = (status) => {
  switch (status) {
    case MSME_PAYMENT_DUE_STATUS.OVERDUE:
      return 'border-red-200 bg-red-50 text-red-800';
    case MSME_PAYMENT_DUE_STATUS.DUE_TODAY:
      return 'border-amber-300 bg-amber-50 text-amber-900';
    case MSME_PAYMENT_DUE_STATUS.DUE_SOON:
      return 'border-amber-200 bg-amber-50 text-amber-800';
    case MSME_PAYMENT_DUE_STATUS.PAID:
      return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    case MSME_PAYMENT_DUE_STATUS.ON_TRACK:
      return 'border-blue-200 bg-blue-50 text-blue-800';
    default:
      return 'border-border bg-muted/30 text-muted-foreground';
  }
};

export const shouldShowMsmePaymentDue = (invoice = {}) => {
  const msme = normalizeMsmePaymentDue(invoice);
  return msme.vendorIsMsme && Boolean(msme.msmePaymentDueLabel);
};

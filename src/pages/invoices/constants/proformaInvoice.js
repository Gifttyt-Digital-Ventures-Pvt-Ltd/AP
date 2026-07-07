import { normalizeWorkflowStatus } from '../../../utils/approvalWorkflow';

export const DOCUMENT_TYPE = {
  TAX_INVOICE: 'TAX_INVOICE',
  PROFORMA_INVOICE: 'PROFORMA_INVOICE',
};

export const DOCUMENT_TYPE_OPTIONS = [
  { value: DOCUMENT_TYPE.TAX_INVOICE, label: 'Tax Invoice' },
  { value: DOCUMENT_TYPE.PROFORMA_INVOICE, label: 'Proforma Invoice' },
];

export const DOCUMENT_TYPE_LABELS = {
  [DOCUMENT_TYPE.TAX_INVOICE]: 'Tax Invoice',
  [DOCUMENT_TYPE.PROFORMA_INVOICE]: 'Proforma Invoice',
};

export const INVOICE_DOCUMENT_TYPE_TABS = [
  { value: 'all', label: 'All' },
  { value: 'tax', label: 'Tax Invoices' },
  { value: 'proforma', label: 'Proforma Invoices' },
];

export const PI_MATCH_LABELS = {
  STRONG_MATCH: 'Strong Match',
  GOOD_MATCH: 'Good Match',
  PARTIAL_MATCH: 'Partial Match',
  WEAK_MATCH: 'Weak Match',
  PERFECT_MATCH: 'Perfect Match',
  AMOUNT_EXCEEDS_BALANCE: 'Amount Exceeds Balance',
  PI_NOT_APPROVED: 'PI Not Approved',
};

export const normalizeDocumentType = (value) => {
  const raw = String(value || '').trim().toUpperCase();
  if (raw === DOCUMENT_TYPE.PROFORMA_INVOICE || raw === 'PROFORMA' || raw === 'PI') {
    return DOCUMENT_TYPE.PROFORMA_INVOICE;
  }
  return DOCUMENT_TYPE.TAX_INVOICE;
};

const toInvoiceRecord = (invoice) => invoice ?? {};

export const isProformaInvoice = (invoice) => {
  const record = toInvoiceRecord(invoice);
  return (
    normalizeDocumentType(record.documentType ?? record.document_type) ===
    DOCUMENT_TYPE.PROFORMA_INVOICE
  );
};

export const isLinkedTaxInvoice = (invoice) => {
  const record = toInvoiceRecord(invoice);
  return (
    normalizeDocumentType(record.documentType ?? record.document_type) ===
      DOCUMENT_TYPE.TAX_INVOICE &&
    Boolean(
      record.isLinkedToProforma ??
        record.is_linked_to_proforma ??
        record.linkedProformaInvoiceId ??
        record.linked_proforma_invoice_id,
    )
  );
};

export const getDocumentTypeLabel = (invoice) => {
  const record = toInvoiceRecord(invoice);
  return DOCUMENT_TYPE_LABELS[
    normalizeDocumentType(record.documentType ?? record.document_type)
  ];
};

export const getDocumentTypeBadgeClassName = (invoice) =>
  isProformaInvoice(invoice)
    ? 'border-violet-200 bg-violet-50 text-violet-800'
    : 'border-slate-200 bg-slate-50 text-slate-700';

/** Tax invoice → PI linking is allowed only when the PI has reached Approved status. */
export const isProformaInvoiceApprovedForLinking = (invoice) => {
  const record = toInvoiceRecord(invoice);
  if (!isProformaInvoice(record)) return false;
  return normalizeWorkflowStatus(record.status) === 'Approved';
};

export const canMapTaxInvoiceToProforma = (invoice) =>
  isProformaInvoice(invoice) && isProformaInvoiceApprovedForLinking(invoice);

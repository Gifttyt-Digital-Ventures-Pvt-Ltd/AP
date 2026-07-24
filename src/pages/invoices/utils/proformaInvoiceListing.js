import {
  DOCUMENT_TYPE,
  isLinkedTaxInvoice,
  isProformaInvoice,
  normalizeDocumentType,
} from '../constants/proformaInvoice';

export const filterInvoicesForDocumentTab = (invoices = [], tab = 'all') => {
  const list = Array.isArray(invoices) ? invoices : [];

  if (tab === 'proforma') {
    return list.filter((invoice) => isProformaInvoice(invoice));
  }

  if (tab === 'tax') {
    return list.filter(
      (invoice) =>
        normalizeDocumentType(invoice.documentType ?? invoice.document_type) ===
          DOCUMENT_TYPE.TAX_INVOICE && !isLinkedTaxInvoice(invoice),
    );
  }

  // All: standalone tax invoices + all proforma invoices
  return list.filter(
    (invoice) => isProformaInvoice(invoice) || !isLinkedTaxInvoice(invoice),
  );
};

export const getLinkedTaxInvoiceCount = (invoice = {}) =>
  Number(
    invoice.linkedTaxInvoiceCount ??
      invoice.linked_tax_invoice_count ??
      (Array.isArray(invoice.linkedTaxInvoices)
        ? invoice.linkedTaxInvoices.length
        : Array.isArray(invoice.linked_tax_invoices)
          ? invoice.linked_tax_invoices.length
          : 0),
  );

export const getLinkedTaxInvoiceSummaries = (invoice = {}) => {
  const linked =
    invoice.linkedTaxInvoices ?? invoice.linked_tax_invoices ?? [];
  return Array.isArray(linked) ? linked : [];
};

/** Merge PI linked summaries with full invoice records from the list when available. */
export const resolveLinkedTaxInvoiceRecords = (pi = {}, allInvoices = []) => {
  const summaries = getLinkedTaxInvoiceSummaries(pi);
  if (summaries.length === 0) return [];

  const byId = new Map(
    (Array.isArray(allInvoices) ? allInvoices : []).map((item) => [
      String(item.id),
      item,
    ]),
  );

  return summaries.map((summary) => {
    const summaryId = summary.id ?? summary.invoice_id;
    const full = summaryId ? byId.get(String(summaryId)) : null;
    return full ? { ...summary, ...full } : summary;
  });
};

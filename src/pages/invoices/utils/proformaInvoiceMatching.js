import { DOCUMENT_TYPE, isProformaInvoiceApprovedForLinking } from '../constants/proformaInvoice';

const tokenize = (value = '') =>
  String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

const jaccardSimilarity = (a = [], b = []) => {
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = [...setA].filter((token) => setB.has(token)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
};

const normalizePiRecord = (pi = {}) => ({
  id: pi.id ?? pi.proformaInvoiceId ?? pi.proforma_invoice_id,
  invoiceNumber:
    pi.invoiceNumber ??
    pi.invoice_number ??
    pi.piRef ??
    pi.pi_ref ??
    pi.pi_number ??
    pi.piNumber ??
    '',
  vendorName: pi.vendorName ?? pi.vendor_name ?? pi.vendor ?? '',
  vendorId: pi.vendorId ?? pi.vendor_id,
  piRemainingBalance: Number(
    pi.piRemainingBalance ??
      pi.pi_remaining_balance ??
      pi.remainingBalance ??
      pi.remaining_balance ??
      pi.amount ??
      pi.netAmount ??
      pi.net_amount ??
      0,
  ),
  piTotalAmount: Number(
    pi.piTotalAmount ??
      pi.pi_total_amount ??
      pi.netAmount ??
      pi.net_amount ??
      pi.amount ??
      0,
  ),
  currency: pi.currency ?? 'INR',
  poNumber: pi.poNumber ?? pi.po_number ?? '',
  poId: pi.poId ?? pi.po_id,
  invoiceDate: pi.invoiceDate ?? pi.invoice_date ?? pi.date ?? pi.pi_date,
  status: pi.status,
  lineItems: Array.isArray(pi.lineItems)
    ? pi.lineItems
    : Array.isArray(pi.line_items)
      ? pi.line_items
      : [],
});

const scoreLineItems = (draftItems = [], piItems = []) => {
  if (!draftItems.length || !piItems.length) return 0;
  const draftText = draftItems
    .map((item) =>
      [
        item.description,
        item.itemDescription,
        item.item_description,
        item.sku,
        item.hsnSacCode,
        item.hsn_sac_code,
      ].join(' '),
    )
    .join(' ');
  const piText = piItems
    .map((item) =>
      [
        item.description,
        item.itemDescription,
        item.item_description,
        item.sku,
        item.hsnSacCode,
        item.hsn_sac_code,
      ].join(' '),
    )
    .join(' ');
  return Math.round(jaccardSimilarity(tokenize(draftText), tokenize(piText)) * 100);
};

const resolveMatchLabel = (score) => {
  if (score >= 0.85) return 'STRONG_MATCH';
  if (score >= 0.7) return 'GOOD_MATCH';
  if (score >= 0.5) return 'PARTIAL_MATCH';
  return 'WEAK_MATCH';
};

export const rankProformaInvoiceSuggestions = (
  candidates = [],
  {
    vendorId,
    vendorName,
    invoiceAmount = 0,
    currency,
    billingGstin,
    vendorGstin,
    poId,
    poNumber,
    invoiceDate,
    lineItems = [],
  } = {},
) => {
  const normalizedVendor = String(vendorName || '').trim().toLowerCase();
  const amount = Number(invoiceAmount) || 0;

  return candidates
    .map(normalizePiRecord)
    .filter((pi) => {
      if (!pi.id) return false;
      if (pi.piRemainingBalance <= 0) return false;
      if (
        !isProformaInvoiceApprovedForLinking({
          documentType: DOCUMENT_TYPE.PROFORMA_INVOICE,
          status: pi.status,
        })
      ) {
        return false;
      }
      if (vendorId && pi.vendorId) return String(pi.vendorId) === String(vendorId);
      if (normalizedVendor) {
        return String(pi.vendorName || '').trim().toLowerCase() === normalizedVendor;
      }
      return true;
    })
    .map((pi) => {
      const poMatch =
        Boolean(poId && pi.poId && String(poId) === String(pi.poId)) ||
        Boolean(
          poNumber &&
            pi.poNumber &&
            String(poNumber).trim().toLowerCase() === String(pi.poNumber).trim().toLowerCase(),
        );
      const lineItemMatchPercent = scoreLineItems(lineItems, pi.lineItems);
      const amountDelta = Math.abs(amount - pi.piRemainingBalance);
      const amountScore =
        amount > 0 && pi.piRemainingBalance > 0
          ? Math.max(0, 1 - amountDelta / Math.max(pi.piRemainingBalance, amount))
          : 0.5;
      const currencyMatch = !currency || !pi.currency || currency === pi.currency ? 1 : 0;
      const gstinMatch = billingGstin && vendorGstin ? 0.5 : 0.25;
      const dateScore =
        invoiceDate && pi.invoiceDate
          ? new Date(pi.invoiceDate) <= new Date(invoiceDate)
            ? 1
            : 0.3
          : 0.5;

      const confidenceScore =
        (poMatch ? 0.25 : 0) +
        (lineItemMatchPercent / 100) * 0.3 +
        amountScore * 0.25 +
        currencyMatch * 0.1 +
        gstinMatch * 0.05 +
        dateScore * 0.05;

      return {
        ...pi,
        poMatch,
        lineItemMatchPercent,
        amountDelta,
        confidenceScore: Math.min(1, Math.max(0, confidenceScore)),
        matchLabel: resolveMatchLabel(confidenceScore),
      };
    })
    .sort((a, b) => b.confidenceScore - a.confidenceScore);
};

export const buildLocalLinkValidation = (
  selectedPi = {},
  {
    vendorId,
    vendorName,
    invoiceAmount = 0,
    poId,
    poNumber,
    lineItems = [],
  } = {},
) => {
  const amount = Number(invoiceAmount) || 0;
  const remaining = Number(selectedPi.piRemainingBalance ?? 0);
  const piApproved = isProformaInvoiceApprovedForLinking({
    documentType: DOCUMENT_TYPE.PROFORMA_INVOICE,
    status: selectedPi.status,
  });

  if (!piApproved) {
    return {
      vendorMatch: false,
      poMatch: false,
      lineItemMatchPercent: 0,
      invoiceAmount: amount,
      piRemainingBalance: remaining,
      amountExceedsBalance: false,
      amountExcess: 0,
      statusLabel: 'PI_NOT_APPROVED',
      warnings: ['Proforma Invoice must be Approved before linking a tax invoice.'],
    };
  }

  const vendorMatch =
    (vendorId && selectedPi.vendorId && String(vendorId) === String(selectedPi.vendorId)) ||
    String(vendorName || '').trim().toLowerCase() ===
      String(selectedPi.vendorName || '').trim().toLowerCase();
  const poMatch =
    Boolean(poId && selectedPi.poId && String(poId) === String(selectedPi.poId)) ||
    Boolean(
      poNumber &&
        selectedPi.poNumber &&
        String(poNumber).trim().toLowerCase() ===
          String(selectedPi.poNumber).trim().toLowerCase(),
    );
  const lineItemMatchPercent = scoreLineItems(lineItems, selectedPi.lineItems ?? []);
  const amountExceedsBalance = amount > remaining && remaining > 0;
  const amountExcess = amountExceedsBalance ? amount - remaining : 0;
  const warnings = [];

  if (!vendorMatch) warnings.push('Vendor does not match the selected Proforma Invoice.');
  if (amountExceedsBalance) {
    warnings.push(`Invoice exceeds remaining PI balance by ₹${amountExcess.toLocaleString('en-IN')}.`);
  }

  let statusLabel = 'GOOD_MATCH';
  if (!vendorMatch) statusLabel = 'VENDOR_MISMATCH';
  else if (amountExceedsBalance) statusLabel = 'AMOUNT_EXCEEDS_BALANCE';
  else if (lineItemMatchPercent >= 95 && amount <= remaining) statusLabel = 'PERFECT_MATCH';

  return {
    vendorMatch,
    poMatch,
    lineItemMatchPercent,
    invoiceAmount: amount,
    piRemainingBalance: remaining,
    amountExceedsBalance,
    amountExcess,
    statusLabel,
    warnings,
  };
};

const mapLineItemForPiValidation = (item = {}) => ({
  description:
    item.description ?? item.itemDescription ?? item.item_description ?? '',
  quantity: Number(item.quantity) || 0,
  unitRate: Number(item.unitRate ?? item.unit_rate ?? item.rate) || 0,
  netAmount: Number(
    item.netAmount ?? item.net_amount ?? item.lineTotal ?? item.line_total ?? 0,
  ),
  hsnSacCode: item.hsnSacCode ?? item.hsn_sac_code ?? '',
});

/** Request body for POST /invoices/proforma/validate-link (contract §6). */
export const buildProformaLinkValidateRequest = ({
  proformaInvoiceId,
  vendorId,
  vendorName,
  invoiceAmount = 0,
  currency,
  poId,
  poNumber,
  lineItems = [],
} = {}) => ({
  proformaInvoiceId,
  ...(vendorId ? { vendorId } : {}),
  ...(vendorName ? { vendorName } : {}),
  invoiceAmount: Number(invoiceAmount) || 0,
  ...(currency ? { currency } : {}),
  ...(poId ? { poId } : {}),
  ...(poNumber ? { poNumber } : {}),
  lineItems: lineItems.map(mapLineItemForPiValidation),
});

export const resolveInvoiceDocumentType = (invoice = {}) =>
  invoice.documentType ?? invoice.document_type ?? DOCUMENT_TYPE.TAX_INVOICE;

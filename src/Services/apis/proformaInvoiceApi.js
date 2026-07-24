import { serviceApi } from '../serviceApi';
import { extractListResponse } from '../utils/payloadMappers';

const normalizeSuggestion = (item = {}) => ({
  id: item.id ?? item.proformaInvoiceId ?? item.proforma_invoice_id,
  invoiceNumber:
    item.invoiceNumber ??
    item.invoice_number ??
    item.piNumber ??
    item.pi_number ??
    item.piRef ??
    item.pi_ref ??
    '',
  vendorName: item.vendorName ?? item.vendor_name ?? item.vendor ?? '',
  vendorId: item.vendorId ?? item.vendor_id,
  piRemainingBalance: Number(
    item.piRemainingBalance ??
      item.pi_remaining_balance ??
      item.remainingBalance ??
      item.remaining_balance ??
      0,
  ),
  currency: item.currency ?? 'INR',
  poNumber: item.poNumber ?? item.po_number ?? '',
  poId: item.poId ?? item.po_id,
  poMatch: Boolean(item.poMatch ?? item.po_match),
  lineItemMatchPercent: Number(
    item.lineItemMatchPercent ?? item.line_item_match_percent ?? 0,
  ),
  amountDelta: Number(item.amountDelta ?? item.amount_delta ?? 0),
  confidenceScore: Number(item.confidenceScore ?? item.confidence_score ?? 0),
  matchLabel: item.matchLabel ?? item.match_label ?? 'GOOD_MATCH',
  invoiceDate: item.invoiceDate ?? item.invoice_date ?? item.date ?? item.pi_date,
});

const normalizeValidation = (response = {}) => ({
  vendorMatch: Boolean(response.vendorMatch ?? response.vendor_match ?? true),
  poMatch: Boolean(response.poMatch ?? response.po_match),
  lineItemMatchPercent: Number(
    response.lineItemMatchPercent ?? response.line_item_match_percent ?? 0,
  ),
  invoiceAmount: Number(response.invoiceAmount ?? response.invoice_amount ?? 0),
  piRemainingBalance: Number(
    response.piRemainingBalance ?? response.pi_remaining_balance ?? 0,
  ),
  amountExceedsBalance: Boolean(
    response.amountExceedsBalance ?? response.amount_exceeds_balance,
  ),
  amountExcess: Number(response.amountExcess ?? response.amount_excess ?? 0),
  statusLabel: response.statusLabel ?? response.status_label ?? 'GOOD_MATCH',
  warnings: Array.isArray(response.warnings) ? response.warnings : [],
});

export const proformaInvoiceApi = serviceApi.injectEndpoints({
  endpoints: (builder) => ({
    getProformaInvoiceSuggestions: builder.query({
      query: (params = {}) => ({
        url: '/invoices/proforma/suggestions',
        method: 'GET',
        params,
      }),
      transformResponse: (response) => {
        if (Array.isArray(response?.items)) {
          return response.items.map(normalizeSuggestion);
        }
        return extractListResponse(response).map(normalizeSuggestion);
      },
    }),
    validateProformaInvoiceLink: builder.mutation({
      query: (body) => ({
        url: '/invoices/proforma/validate-link',
        method: 'POST',
        body,
      }),
      transformResponse: normalizeValidation,
    }),
  }),
});

export const {
  useGetProformaInvoiceSuggestionsQuery,
  useLazyGetProformaInvoiceSuggestionsQuery,
  useValidateProformaInvoiceLinkMutation,
} = proformaInvoiceApi;

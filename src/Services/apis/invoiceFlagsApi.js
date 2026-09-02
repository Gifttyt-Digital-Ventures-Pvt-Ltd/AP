import { serviceApi } from "../serviceApi";

/**
 * Both Invoice Flags endpoints are now real, implemented by the backend per
 * docs/invoice-flags-api-contract.md §2 (reference data) and §5 (duplicate
 * candidates) — bare-object responses, no envelope, no transformResponse
 * needed. No caller (useInvoiceFlags, any component) needed to change when
 * these went live, since they only ever read the response envelope below.
 *
 * Most flag *rules* just read formData + this reference data synchronously
 * (see invoiceFlagsEngine.js) — these two endpoints only cover the pieces
 * that genuinely need a network round-trip: org-wide flag settings, and a
 * duplicate-candidate lookup against a dataset beyond the current form.
 */
export const invoiceFlagsApi = serviceApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * response: { aiConfidenceThreshold, currentAccountingPeriod: {start,end},
     * disabledFlagKeys: [], staleInvoiceThresholdDays, futureDatedToleranceDays,
     * itcClaimWindowWarningDays } — bare object, no wrapper, per
     * docs/invoice-flags-api-contract.md §2.
     */
    getInvoiceFlagReferenceData: builder.query({
      query: () => ({ url: "/invoices/flags/reference-data", method: "GET" }),
      providesTags: [{ type: "InvoiceFlags", id: "REFERENCE_DATA" }],
    }),

    /**
     * params: { vendorId, vendorName, invoiceNumber, amount, invoiceDate, fileHash, excludeInvoiceId }
     * — excludeInvoiceId omitted entirely by callers (useInvoiceFlags.js) when
     * there's no real invoice id yet, rather than sent as a literal "null".
     * response: { exactMatches, crossYearMatches, economicMatches, sameFileMatches } — each
     * an array of { id, invoiceNumber, vendorName, amount, invoiceDate, createdAt, status, deemphasized },
     * bare object, no wrapper, per docs/invoice-flags-api-contract.md §5.
     */
    getDuplicateInvoiceCandidates: builder.query({
      query: (params) => ({ url: "/invoices/flags/duplicate-candidates", method: "GET", params }),
      providesTags: [{ type: "InvoiceFlags", id: "DUPLICATE_CANDIDATES" }],
    }),
  }),
});

export const {
  useGetInvoiceFlagReferenceDataQuery,
  useGetDuplicateInvoiceCandidatesQuery,
} = invoiceFlagsApi;

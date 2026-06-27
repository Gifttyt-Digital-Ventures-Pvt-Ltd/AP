import { serviceApi } from "../serviceApi";
import { CREDIT_INVALIDATION_TAGS } from "../../constants/creditActions";
import { normalizeOrganisationGstCredentialsList } from "../../utils/organisationGst";
import { unwrapGstApiResponse } from "../../pages/tax-management/utils/gstApiMappers";

const gstMutationResponse = (response) => unwrapGstApiResponse(response);
const withHistoryMeta = (items, response = {}) => Object.assign(items, {
  total: Number(response?.total ?? items.length),
  limit: Number(response?.limit ?? items.length),
  offset: Number(response?.offset ?? 0),
});

const gstHistoryResponse = (response) => {
  if (Array.isArray(response)) return withHistoryMeta(response, response);
  if (Array.isArray(response?.data)) return withHistoryMeta(response.data, response);
  return withHistoryMeta(response?.data?.history ?? response?.history ?? [], response);
};

const gstAnalyticsHistoryResponse = (response) => {
  if (Array.isArray(response)) return withHistoryMeta(response, response);
  if (Array.isArray(response?.data)) return withHistoryMeta(response.data, response);
  return withHistoryMeta([], response);
};

export const taxApi = serviceApi.injectEndpoints({
  endpoints: (builder) => ({
    getOrganisationGstCredentials: builder.query({
      query: () => ({ url: "/tax/gst/registrations", method: "GET" }),
      transformResponse: (response) => normalizeOrganisationGstCredentialsList(response),
      providesTags: ["Tax", "Settings"],
    }),
    checkGstSession: builder.mutation({
      query: (body) => ({
        url: "/tax/gst/session/status",
        method: "POST",
        body,
      }),
    }),
    getVendorGstDetails: builder.mutation({
      query: (body) => ({
        url: "/tax/gst/vendor/details",
        method: "POST",
        body,
      }),
      transformResponse: gstMutationResponse,
      invalidatesTags: ["Tax", ...CREDIT_INVALIDATION_TAGS],
    }),
    getVendorReturnPreference: builder.mutation({
      query: (body) => ({
        url: "/tax/gst/getReturnPreference",
        method: "POST",
        body,
      }),
      transformResponse: gstMutationResponse,
      invalidatesTags: ["Tax", ...CREDIT_INVALIDATION_TAGS],
    }),
    trackGstReturns: builder.mutation({
      query: (body) => {
        const { financialYear, ...restBody } = body ?? {};
        return {
          url: "/tax/gst/returns/track",
          method: "POST",
          params: financialYear ? { financial_year: financialYear } : undefined,
          body: {
            ...restBody,
            ...(financialYear ? { financialYear } : {}),
          },
        };
      },
      transformResponse: (response) => response?.returns ? response : response?.data ?? response,
      invalidatesTags: ["Tax", ...CREDIT_INVALIDATION_TAGS],
    }),
    reconcileGstr2a: builder.mutation({
      query: (body) => ({
        url: "/tax/gst/gstr-2a/reconcile",
        method: "POST",
        body,
      }),
      transformResponse: gstMutationResponse,
      invalidatesTags: ["Tax", ...CREDIT_INVALIDATION_TAGS],
    }),
    fetchGstr2aReconcileHistory: builder.mutation({
      query: ({ limit = 20, offset = 0 } = {}) => ({
        url: "/tax/gst/gstr-2a/reconcile/history",
        method: "GET",
        params: { limit, offset },
      }),
      transformResponse: gstHistoryResponse,
    }),
    submitGstr2aAnalyticsReconciliation: builder.mutation({
      query: (body) => ({
        url: "/tax/gst/analytics/gstr-2a/reconciliation",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Tax", ...CREDIT_INVALIDATION_TAGS],
    }),
    getGstr2aAnalyticsReconciliationJob: builder.mutation({
      query: (jobId) => ({
        url: `/tax/gst/analytics/gstr-2a/reconciliation/${jobId}`,
        method: "GET",
      }),
    }),
    fetchGstr2aAnalyticsReconciliationHistory: builder.mutation({
      query: ({ limit = 20, offset = 0 } = {}) => ({
        url: "/tax/gst/analytics/gstr-2a/reconciliation/history",
        method: "GET",
        params: { limit, offset },
      }),
      transformResponse: gstAnalyticsHistoryResponse,
    }),
    submitGstr2bAnalyticsReconciliation: builder.mutation({
      query: (body) => ({
        url: "/tax/gst/analytics/gstr-2b/reconciliation",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Tax", ...CREDIT_INVALIDATION_TAGS],
    }),
    getGstr2bAnalyticsReconciliationJob: builder.mutation({
      query: (jobId) => ({
        url: `/tax/gst/analytics/gstr-2b/reconciliation/${jobId}`,
        method: "GET",
      }),
    }),
    fetchGstr2bAnalyticsReconciliationHistory: builder.mutation({
      query: ({ limit = 20, offset = 0 } = {}) => ({
        url: "/tax/gst/analytics/gstr-2b/reconciliation/history",
        method: "GET",
        params: { limit, offset },
      }),
      transformResponse: gstAnalyticsHistoryResponse,
    }),
    getGstr2aInvoiceDetails: builder.mutation({
      query: (body) => ({
        url: "/tax/gst/gstr-2a/invoices/details",
        method: "POST",
        body,
      }),
      transformResponse: (response) => response?.invoiceNumber ? response : response?.data ?? response,
      invalidatesTags: ["Tax", ...CREDIT_INVALIDATION_TAGS],
    }),
    fetchGstr2aDocuments: builder.mutation({
      query: (body) => ({
        url: "/tax/gst/gstr-2a/documents",
        method: "POST",
        body,
      }),
      transformResponse: gstMutationResponse,
      invalidatesTags: ["Tax", ...CREDIT_INVALIDATION_TAGS],
    }),
    fetchGstr2aDocumentsHistory: builder.mutation({
      query: ({ limit = 20, offset = 0 } = {}) => ({
        url: "/tax/gst/gstr-2a/documents/history",
        method: "GET",
        params: { limit, offset },
      }),
      transformResponse: gstHistoryResponse,
    }),
    fetchGstr2bDocuments: builder.mutation({
      query: (body) => ({
        url: "/tax/gst/gstr-2b/documents",
        method: "POST",
        body,
      }),
      transformResponse: gstMutationResponse,
      invalidatesTags: ["Tax", ...CREDIT_INVALIDATION_TAGS],
    }),
    fetchGstr2bDocumentsHistory: builder.mutation({
      query: ({ limit = 20, offset = 0 } = {}) => ({
        url: "/tax/gst/gstr-2b/documents/history",
        method: "GET",
        params: { limit, offset },
      }),
      transformResponse: gstHistoryResponse,
    }),
    fetchCashItcBalance: builder.mutation({
      query: (body) => ({
        url: "/tax/gst/ledger/cash-itc-balance",
        method: "POST",
        body,
      }),
      transformResponse: (response) => (
        response?.overallStats ? response : response?.data ?? response
      ),
      invalidatesTags: ["Tax", ...CREDIT_INVALIDATION_TAGS],
    }),
    fetchCashItcBalanceHistory: builder.mutation({
      query: ({ limit = 20, offset = 0 } = {}) => ({
        url: "/tax/gst/ledger/cash-itc-balance/history",
        method: "GET",
        params: { limit, offset },
      }),
      transformResponse: (response) => {
        const payload = response?.data ?? response;
        if (!payload || Array.isArray(payload)) return payload;
        return Object.assign(payload, {
          total: Number(response?.total ?? payload?.total ?? payload?.history?.length ?? 0),
          limit: Number(response?.limit ?? payload?.limit ?? payload?.history?.length ?? 0),
          offset: Number(response?.offset ?? payload?.offset ?? 0),
        });
      },
    }),
    getGstEntries: builder.query({
      query: () => ({ url: "/tax/gst/entries", method: "GET" }),
      providesTags: ["Tax"],
    }),
    createGstEntry: builder.mutation({
      query: (body) => ({
        url: "/tax/gst/entries",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Tax"],
    }),
    getGstSummary: builder.query({
      query: () => ({ url: "/tax/gst/summary", method: "GET" }),
      providesTags: ["Tax"],
    }),
    getTdsEntries: builder.query({
      query: () => ({ url: "/tax/tds/entries", method: "GET" }),
      providesTags: ["Tax"],
    }),
    getTdsSummary: builder.query({
      query: () => ({ url: "/tax/tds/summary", method: "GET" }),
      providesTags: ["Tax"],
    }),
    getTdsSections: builder.query({
      query: () => ({ url: "/tax/tds/sections", method: "GET" }),
      providesTags: ["Tax"],
    }),
    calculateTds: builder.mutation({
      query: (body) => ({
        url: "/tax/tds/calculate",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Tax", ...CREDIT_INVALIDATION_TAGS],
    }),
    generateForm16a: builder.mutation({
      query: (body) => ({ url: "/tax/tds/form16a", method: "POST", body }),
      invalidatesTags: ["Tax", ...CREDIT_INVALIDATION_TAGS],
    }),
  }),
});

export const {
  useGetOrganisationGstCredentialsQuery,
  useCheckGstSessionMutation,
  useGetVendorGstDetailsMutation,
  useGetVendorReturnPreferenceMutation,
  useTrackGstReturnsMutation,
  useReconcileGstr2aMutation,
  useFetchGstr2aReconcileHistoryMutation,
  useSubmitGstr2aAnalyticsReconciliationMutation,
  useGetGstr2aAnalyticsReconciliationJobMutation,
  useFetchGstr2aAnalyticsReconciliationHistoryMutation,
  useSubmitGstr2bAnalyticsReconciliationMutation,
  useGetGstr2bAnalyticsReconciliationJobMutation,
  useFetchGstr2bAnalyticsReconciliationHistoryMutation,
  useGetGstr2aInvoiceDetailsMutation,
  useFetchGstr2aDocumentsMutation,
  useFetchGstr2aDocumentsHistoryMutation,
  useFetchGstr2bDocumentsMutation,
  useFetchGstr2bDocumentsHistoryMutation,
  useFetchCashItcBalanceMutation,
  useFetchCashItcBalanceHistoryMutation,
  useGetGstEntriesQuery,
  useCreateGstEntryMutation,
  useGetGstSummaryQuery,
  useGetTdsEntriesQuery,
  useGetTdsSummaryQuery,
  useGetTdsSectionsQuery,
  useCalculateTdsMutation,
  useGenerateForm16aMutation,
} = taxApi;

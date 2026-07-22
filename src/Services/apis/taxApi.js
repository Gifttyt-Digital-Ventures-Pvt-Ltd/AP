import { serviceApi } from "../serviceApi";
import { extractListResponse } from "../utils/payloadMappers";
import { CREDIT_INVALIDATION_TAGS } from "../../constants/creditActions";
import { normalizeOrganisationGstCredentialsList } from "../../utils/organisationGst";
import {
  unwrapGstApiResponse,
  mapReconDetailResponse,
} from "../../pages/tax-management/utils/gstApiMappers";

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

const normalizeTdsEntriesExportResponse = (response) => {
  const payload =
    response?.downloadUrl || response?.download_url || response?.url
      ? response
      : response?.data ?? response;

  return {
    downloadUrl:
      payload?.downloadUrl ??
      payload?.download_url ??
      payload?.url ??
      payload?.fileUrl ??
      payload?.file_url ??
      null,
    fileName:
      payload?.fileName ??
      payload?.file_name ??
      payload?.name ??
      null,
  };
};

const normalizeTdsEntriesResponse = (response) => {
  const payload = response?.data ?? response;
  const items = Array.isArray(payload)
    ? payload
    : payload?.items ??
      payload?.entries ??
      payload?.data ??
      [];
  const list = Array.isArray(items) ? items : [];

  return Object.assign(list, {
    total: Number(payload?.total ?? payload?.totalCount ?? payload?.count ?? list.length),
    limit: Number(payload?.limit ?? list.length),
    offset: Number(payload?.offset ?? 0),
    fromDate: payload?.fromDate ?? payload?.from_date ?? null,
    toDate: payload?.toDate ?? payload?.to_date ?? null,
    hasMore: Boolean(payload?.hasMore ?? payload?.has_more),
  });
};

// Base path for the GST 2A/2B reconciliation engine (Overview list + run status).
// Centralized so a backend path change only needs to be made in one place.
const GST_RECON_API_BASE = "/tax/gst/recon";

const compactQueryParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  );

const buildQueryUrl = (url, params = {}) => {
  const query = new URLSearchParams(compactQueryParams(params)).toString();
  return query ? `${url}?${query}` : url;
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
      transformResponse: (response) => extractListResponse(response, ['entries']),
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
    getReconOverview: builder.query({
      query: (params = {}) => ({
        url: buildQueryUrl(`${GST_RECON_API_BASE}/overview`, {
          dateFilter: params.dateFilter,
          source: params.source,
          status: params.status,
          search: params.search,
          page: params.page,
          size: params.size,
          sort: params.sort,
        }),
        method: "GET",
      }),
      providesTags: ["Tax"],
    }),
    getReconRunStatus: builder.query({
      query: (runId) => ({
        url: `${GST_RECON_API_BASE}/run/${runId}`,
        method: "GET",
      }),
      providesTags: ["Tax"],
    }),
    getReconDetail: builder.query({
      query: ({ platformInvoiceId, portalInvoiceId, source, period } = {}) => ({
        url: buildQueryUrl(`${GST_RECON_API_BASE}/detail`, {
          platformInvoiceId,
          portalInvoiceId,
          source,
          period,
        }),
        method: "GET",
      }),
      transformResponse: mapReconDetailResponse,
      providesTags: ["Tax"],
    }),
    linkReconInvoice: builder.mutation({
      query: (body) => ({
        url: `${GST_RECON_API_BASE}/link`,
        method: "POST",
        body,
      }),
      transformResponse: gstMutationResponse,
      invalidatesTags: ["Tax", ...CREDIT_INVALIDATION_TAGS],
    }),
    uploadReconInvoice: builder.mutation({
      query: (formData) => ({
        url: `${GST_RECON_API_BASE}/upload`,
        method: "POST",
        body: formData,
      }),
      transformResponse: gstMutationResponse,
      invalidatesTags: ["Tax", ...CREDIT_INVALIDATION_TAGS],
    }),
    getReconUploadJobStatus: builder.query({
      query: (jobId) => ({
        url: `${GST_RECON_API_BASE}/upload/${jobId}`,
        method: "GET",
      }),
      providesTags: ["Tax"],
    }),
    overrideRecon: builder.mutation({
      query: (body) => ({
        url: `${GST_RECON_API_BASE}/override`,
        method: "POST",
        body,
      }),
      transformResponse: gstMutationResponse,
      invalidatesTags: ["Tax", ...CREDIT_INVALIDATION_TAGS],
    }),
    getTdsEntries: builder.query({
      query: (params = {}) => ({
        url: buildQueryUrl("/tax/tds/entries", params),
        method: "GET",
      }),
      transformResponse: normalizeTdsEntriesResponse,
      providesTags: ["Tax"],
    }),
    getTdsEntriesExport: builder.query({
      query: (params = {}) => ({
        url: buildQueryUrl("/tax/tds/entries/export", {
          rangeType: params.rangeType,
          fromDate: params.fromDate,
          toDate: params.toDate,
          search: params.search,
          sortBy: params.sortBy,
          sortDirection: params.sortDirection,
          format: params.format ?? "xlsx",
          includeInvoiceDetails:
            params.includeInvoiceDetails ?? params.include_invoice_details ?? true,
        }),
        method: "GET",
      }),
      transformResponse: normalizeTdsEntriesExportResponse,
    }),
    getTdsSummary: builder.query({
      query: () => ({ url: "/tax/tds/summary", method: "GET" }),
      providesTags: ["Tax"],
    }),
    getTdsSections: builder.query({
      query: () => ({ url: "/tax/tds/sections", method: "GET" }),
      transformResponse: extractListResponse,
      providesTags: ["Tax"],
    }),
    getVendorTdsEffectiveRate: builder.query({
      query: ({ vendorId, sectionCode } = {}) => ({
        url: `/vendors/${vendorId}/tds/effective-rate`,
        method: "GET",
        params: sectionCode ? { section: sectionCode } : undefined,
      }),
      transformResponse: (response) => response?.data ?? response,
      providesTags: (_result, _error, arg = {}) => [
        { type: "Tax", id: `VENDOR_TDS_RATE_${arg.vendorId || "UNKNOWN"}` },
      ],
    }),
    getVendorTdsCertificates: builder.query({
      query: (vendorId) => ({ url: `/vendors/${vendorId}/tds/certificates`, method: "GET" }),
      transformResponse: (response) => extractListResponse(response, ["certificates"]),
      providesTags: (_result, _error, vendorId) => [
        { type: "Tax", id: `VENDOR_TDS_CERTS_${vendorId || "UNKNOWN"}` },
      ],
    }),
    revokeVendorTdsCertificate: builder.mutation({
      query: ({ vendorId, certificateId }) => ({
        url: `/vendors/${vendorId}/tds/certificates/${certificateId}/revoke`,
        method: "POST",
      }),
      invalidatesTags: (_result, _error, arg = {}) => [
        { type: "Tax", id: `VENDOR_TDS_CERTS_${arg.vendorId || "UNKNOWN"}` },
        { type: "Tax", id: `VENDOR_TDS_RATE_${arg.vendorId || "UNKNOWN"}` },
        "Tax",
        "Invoices",
      ],
    }),
    getInvoiceTdsPreview: builder.query({
      query: ({ invoiceId, sectionCode, rateOverride } = {}) => ({
        url: `/invoices/${invoiceId}/tds/preview`,
        method: "GET",
        params: {
          ...(sectionCode ? { section: sectionCode } : {}),
          ...(rateOverride !== undefined && rateOverride !== null && rateOverride !== ""
            ? { rateOverride }
            : {}),
        },
      }),
      transformResponse: (response) => response?.data ?? response,
      providesTags: (_result, _error, arg = {}) => [
        { type: "Tax", id: `INVOICE_TDS_PREVIEW_${arg.invoiceId || "UNKNOWN"}` },
      ],
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
  useGetReconOverviewQuery,
  useGetReconRunStatusQuery,
  useGetReconDetailQuery,
  useLazyGetReconDetailQuery,
  useLinkReconInvoiceMutation,
  useUploadReconInvoiceMutation,
  useGetReconUploadJobStatusQuery,
  useOverrideReconMutation,
  useGetTdsEntriesQuery,
  useLazyGetTdsEntriesExportQuery,
  useGetTdsSummaryQuery,
  useGetTdsSectionsQuery,
  useGetVendorTdsEffectiveRateQuery,
  useGetVendorTdsCertificatesQuery,
  useRevokeVendorTdsCertificateMutation,
  useGetInvoiceTdsPreviewQuery,
  useCalculateTdsMutation,
  useGenerateForm16aMutation,
} = taxApi;

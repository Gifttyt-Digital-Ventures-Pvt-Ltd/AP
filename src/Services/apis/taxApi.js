import { serviceApi } from "../serviceApi";
import { CREDIT_INVALIDATION_TAGS } from "../../constants/creditActions";
import { normalizeOrganisationGstCredentialsList } from "../../utils/organisationGst";
import { unwrapGstApiResponse } from "../../pages/tax-management/utils/gstApiMappers";

const gstMutationResponse = (response) => unwrapGstApiResponse(response);

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
    }),
    getVendorReturnPreference: builder.mutation({
      query: (body) => ({
        url: "/tax/gst/getReturnPreference",
        method: "POST",
        body,
      }),
      transformResponse: gstMutationResponse,
    }),
    trackGstReturns: builder.mutation({
      query: (body) => ({
        url: "/tax/gst/returns/track",
        method: "POST",
        body,
      }),
      transformResponse: (response) => response?.returns ? response : response?.data ?? response,
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
    fetchGstr2bDocuments: builder.mutation({
      query: (body) => ({
        url: "/tax/gst/gstr-2b/documents",
        method: "POST",
        body,
      }),
      transformResponse: gstMutationResponse,
      invalidatesTags: ["Tax", ...CREDIT_INVALIDATION_TAGS],
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
    calculateGst: builder.mutation({
      query: (body) => ({
        url: "/tax/gst/calculate",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Tax", ...CREDIT_INVALIDATION_TAGS],
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
  useGetGstr2aInvoiceDetailsMutation,
  useFetchGstr2aDocumentsMutation,
  useFetchGstr2bDocumentsMutation,
  useFetchCashItcBalanceMutation,
  useGetGstEntriesQuery,
  useCreateGstEntryMutation,
  useGetGstSummaryQuery,
  useGetTdsEntriesQuery,
  useGetTdsSummaryQuery,
  useGetTdsSectionsQuery,
  useCalculateGstMutation,
  useCalculateTdsMutation,
  useGenerateForm16aMutation,
} = taxApi;

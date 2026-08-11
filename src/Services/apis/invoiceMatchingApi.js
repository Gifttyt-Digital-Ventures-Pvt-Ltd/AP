import { serviceApi } from "../serviceApi";
import { CREDIT_INVALIDATION_TAGS } from "../../constants/creditActions";
import { extractListResponse } from "../utils/payloadMappers";

export const invoiceMatchingApi = serviceApi.injectEndpoints({
  endpoints: (builder) => ({
    getInvoiceMatchingSummary: builder.query({
      query: () => ({ url: "/invoice-matching", method: "GET" }),
      providesTags: ["Matching"],
    }),
    getInvoiceMatchingList: builder.query({
      query: (params = {}) => ({
        url: "/invoice-matching/list",
        method: "GET",
        params,
      }),
      transformResponse: extractListResponse,
      providesTags: ["Matching"],
    }),
    getInvoiceMatchingDetail: builder.query({
      query: (id) => ({ url: `/invoice-matching/${id}`, method: "GET" }),
      providesTags: ["Matching"],
    }),
    getInvoiceMatchingChecklist: builder.query({
      query: (id) => ({ url: `/invoice-matching/${id}/checklist`, method: "GET" }),
      providesTags: (_result, _error, id) => [
        { type: "Matching", id: `CHECKLIST-${id}` },
      ],
    }),
    getInvoiceMatchingQtyReconciliation: builder.query({
      query: (id) => ({ url: `/invoice-matching/${id}/qty-reconciliation`, method: "GET" }),
      providesTags: (_result, _error, id) => [
        { type: "Reconciliation", id },
      ],
    }),
    getInvoiceMatchingLineItems: builder.query({
      query: ({ id, ...params }) => ({
        url: `/invoice-matching/${id}/line-items`,
        method: "GET",
        params,
      }),
      providesTags: (_result, _error, args) => [
        { type: "Matching", id: `LINE-ITEMS-${args?.id}` },
      ],
    }),
    getInvoiceMatchingVarianceReport: builder.query({
      query: ({ id, ...params }) => ({
        url: `/invoice-matching/${id}/variance-report`,
        method: "GET",
        params,
      }),
      providesTags: (_result, _error, args) => [
        { type: "Matching", id: `VARIANCE-REPORT-${args?.id}` },
      ],
    }),
    getInvoiceMatchingAcceptanceLog: builder.query({
      query: (id) => ({ url: `/invoice-matching/${id}/acceptance-log`, method: "GET" }),
      providesTags: (_result, _error, id) => [
        { type: "Matching", id: `ACCEPTANCE-LOG-${id}` },
      ],
    }),
    getInvoiceMatchingGroupChecklist: builder.query({
      query: (groupId) => ({ url: `/invoice-matching/groups/${groupId}/checklist`, method: "GET" }),
      providesTags: (_result, _error, groupId) => [
        { type: "Matching", id: `GROUP-CHECKLIST-${groupId}` },
      ],
    }),
    getInvoiceMatchingGroupAcceptanceLog: builder.query({
      query: (groupId) => ({ url: `/invoice-matching/groups/${groupId}/acceptance-log`, method: "GET" }),
      providesTags: (_result, _error, groupId) => [
        { type: "Matching", id: `GROUP-ACCEPTANCE-LOG-${groupId}` },
      ],
    }),
    getInvoiceMatchingGroupQtyReconciliation: builder.query({
      query: (groupId) => ({ url: `/invoice-matching/groups/${groupId}/qty-reconciliation`, method: "GET" }),
      providesTags: (_result, _error, groupId) => [
        { type: "Matching", id: `GROUP-QTY-RECONCILIATION-${groupId}` },
      ],
    }),
    getAvailableMatchingInvoices: builder.query({
      query: (params = {}) => ({
        url: "/invoice-matching/invoices/available",
        method: "GET",
        params,
      }),
      providesTags: ["Matching"],
    }),
    getAvailablePurchaseOrders: builder.query({
      query: (args) => {
        const params =
          args && typeof args === "object" && !Array.isArray(args)
            ? args
            : { invoiceId: args };

        return {
          url: "/invoice-matching/purchase-orders/available",
          method: "GET",
          params,
        };
      },
      providesTags: ["Matching"],
    }),
    getAvailableGrns: builder.query({
      query: (args) => {
        const params =
          args && typeof args === "object" && !Array.isArray(args)
            ? args
            : { poId: args };

        return {
          url: "/invoice-matching/grns/available",
          method: "GET",
          params,
        };
      },
      providesTags: ["Matching"],
    }),
    getAvailableMatchesForGrn: builder.query({
      query: (grnId) => ({
        url: `/invoice-matching/grn/${grnId}/available-matches`,
        method: "GET",
      }),
      providesTags: (_result, _error, grnId) => [
        { type: "Matching", id: `GRN-MATCH-TYPES-${grnId}` },
      ],
    }),
    getInvoiceMatchingThresholds: builder.query({
      query: () => ({
        url: "/invoice-matching/config/thresholds",
        method: "GET",
      }),
      providesTags: [{ type: "Matching", id: "THRESHOLDS" }],
    }),
    updateInvoiceMatchingThresholds: builder.mutation({
      query: (body) => ({
        url: "/invoice-matching/config/thresholds",
        method: "PUT",
        body,
      }),
      invalidatesTags: [{ type: "Matching", id: "THRESHOLDS" }],
    }),
    performInvoiceMatch: builder.mutation({
      query: (body) => ({
        url: "/invoice-matching/perform",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Matching", "Invoices", ...CREDIT_INVALIDATION_TAGS],
    }),
    editInvoiceMatch: builder.mutation({
      query: ({ id, body }) => ({
        url: `/invoice-matching/${id}/edit`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Matching", "Invoices"],
    }),
    markInvoiceMatchException: builder.mutation({
      query: ({ id, body }) => ({
        url: `/invoice-matching/${id}/exception`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Matching", "Invoices"],
    }),
    acceptInvoiceMatchCriterion: builder.mutation({
      query: ({ matchId, criterionType, reason }) => ({
        url: `/invoice-matching/${matchId}/criteria/${criterionType}/accept`,
        method: "PATCH",
        body: { reason },
      }),
      invalidatesTags: (_result, _error, { matchId }) => [
        "Matching",
        { type: "Matching", id: `CHECKLIST-${matchId}` },
        { type: "Matching", id: `ACCEPTANCE-LOG-${matchId}` },
      ],
    }),
    acceptInvoiceMatchOverall: builder.mutation({
      query: ({ matchId, reason }) => ({
        url: `/invoice-matching/${matchId}/accept-overall`,
        method: "PATCH",
        body: { reason },
      }),
      invalidatesTags: (_result, _error, { matchId }) => [
        "Matching",
        "Invoices",
        { type: "Matching", id: `CHECKLIST-${matchId}` },
        { type: "Matching", id: `ACCEPTANCE-LOG-${matchId}` },
      ],
    }),
    acceptInvoiceMatchGroupCriterion: builder.mutation({
      query: ({ groupId, criterionType, reason }) => ({
        url: `/invoice-matching/groups/${groupId}/criteria/${criterionType}/accept`,
        method: "PATCH",
        body: { reason },
      }),
      invalidatesTags: (_result, _error, { groupId }) => [
        "Matching",
        { type: "Matching", id: `GROUP-CHECKLIST-${groupId}` },
        { type: "Matching", id: `GROUP-ACCEPTANCE-LOG-${groupId}` },
      ],
    }),
    acceptInvoiceMatchGroupOverall: builder.mutation({
      query: ({ groupId, reason }) => ({
        url: `/invoice-matching/groups/${groupId}/accept-overall`,
        method: "PATCH",
        body: { reason },
      }),
      invalidatesTags: (_result, _error, { groupId }) => [
        "Matching",
        "Invoices",
        { type: "Matching", id: `GROUP-CHECKLIST-${groupId}` },
        { type: "Matching", id: `GROUP-ACCEPTANCE-LOG-${groupId}` },
      ],
    }),
  }),
});

export const {
  useGetInvoiceMatchingSummaryQuery,
  useGetInvoiceMatchingListQuery,
  useGetInvoiceMatchingDetailQuery,
  useLazyGetInvoiceMatchingDetailQuery,
  useGetInvoiceMatchingChecklistQuery,
  useGetInvoiceMatchingQtyReconciliationQuery,
  useGetInvoiceMatchingLineItemsQuery,
  useLazyGetInvoiceMatchingLineItemsQuery,
  useGetInvoiceMatchingVarianceReportQuery,
  useLazyGetInvoiceMatchingVarianceReportQuery,
  useGetInvoiceMatchingAcceptanceLogQuery,
  useGetInvoiceMatchingGroupChecklistQuery,
  useGetInvoiceMatchingGroupAcceptanceLogQuery,
  useGetInvoiceMatchingGroupQtyReconciliationQuery,
  useGetAvailableMatchingInvoicesQuery,
  useGetAvailablePurchaseOrdersQuery,
  useGetAvailableGrnsQuery,
  useGetAvailableMatchesForGrnQuery,
  useLazyGetAvailableMatchesForGrnQuery,
  useGetInvoiceMatchingThresholdsQuery,
  useUpdateInvoiceMatchingThresholdsMutation,
  usePerformInvoiceMatchMutation,
  useEditInvoiceMatchMutation,
  useMarkInvoiceMatchExceptionMutation,
  useAcceptInvoiceMatchCriterionMutation,
  useAcceptInvoiceMatchOverallMutation,
  useAcceptInvoiceMatchGroupCriterionMutation,
  useAcceptInvoiceMatchGroupOverallMutation,
} = invoiceMatchingApi;

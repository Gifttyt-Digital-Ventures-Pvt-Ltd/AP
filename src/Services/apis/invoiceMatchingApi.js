import { serviceApi } from "../serviceApi";

export const invoiceMatchingApi = serviceApi.injectEndpoints({
  endpoints: (builder) => ({
    getInvoiceMatching: builder.query({
      query: () => ({ url: "/invoice-matching", method: "GET" }),
      providesTags: ["Matching"],
    }),
    getPendingInvoiceMatching: builder.query({
      query: () => ({ url: "/invoice-matching/pending", method: "GET" }),
      providesTags: ["Matching"],
    }),
    getInvoiceMatchingStats: builder.query({
      query: () => ({ url: "/invoice-matching/stats", method: "GET" }),
      providesTags: ["Matching"],
    }),
    getInvoiceMatchingCandidates: builder.query({
      query: (invoiceId) => ({
        url: `/invoices/${invoiceId}/matching-candidates`,
        method: "GET",
      }),
      providesTags: ["Matching"],
    }),
    matchInvoice: builder.mutation({
      query: (body) => ({
        url: "/invoice-matching/match",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Matching", "Invoices"],
    }),
    resolveInvoiceMatch: builder.mutation({
      query: ({ id, body }) => ({
        url: `/invoice-matching/${id}/resolve`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Matching", "Invoices"],
    }),
  }),
});

export const {
  useGetInvoiceMatchingQuery,
  useGetPendingInvoiceMatchingQuery,
  useGetInvoiceMatchingStatsQuery,
  useGetInvoiceMatchingCandidatesQuery,
  useLazyGetInvoiceMatchingCandidatesQuery,
  useMatchInvoiceMutation,
  useResolveInvoiceMatchMutation,
} = invoiceMatchingApi;

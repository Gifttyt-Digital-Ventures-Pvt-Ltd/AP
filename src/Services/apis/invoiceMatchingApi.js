import { serviceApi } from "../serviceApi";

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
      providesTags: ["Matching"],
    }),
    getInvoiceMatchingDetail: builder.query({
      query: (id) => ({ url: `/invoice-matching/${id}`, method: "GET" }),
      providesTags: ["Matching"],
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
      query: (invoiceId) => ({
        url: "/invoice-matching/purchase-orders/available",
        method: "GET",
        params: { invoiceId },
      }),
      providesTags: ["Matching"],
    }),
    getAvailableGrns: builder.query({
      query: (poId) => ({
        url: "/invoice-matching/grns/available",
        method: "GET",
        params: { poId },
      }),
      providesTags: ["Matching"],
    }),
    performInvoiceMatch: builder.mutation({
      query: (body) => ({
        url: "/invoice-matching/perform",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Matching", "Invoices"],
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
  }),
});

export const {
  useGetInvoiceMatchingSummaryQuery,
  useGetInvoiceMatchingListQuery,
  useGetInvoiceMatchingDetailQuery,
  useLazyGetInvoiceMatchingDetailQuery,
  useGetAvailableMatchingInvoicesQuery,
  useGetAvailablePurchaseOrdersQuery,
  useGetAvailableGrnsQuery,
  usePerformInvoiceMatchMutation,
  useEditInvoiceMatchMutation,
  useMarkInvoiceMatchExceptionMutation,
} = invoiceMatchingApi;

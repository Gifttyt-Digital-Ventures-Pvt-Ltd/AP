import { serviceApi } from "../serviceApi";

export const transactionsApi = serviceApi.injectEndpoints({
  endpoints: (builder) => ({
    getStatements: builder.query({
      query: () => ({ url: "/statements", method: "GET" }),
      providesTags: ["Transactions"],
    }),
    uploadStatement: builder.mutation({
      query: (body) => ({
        url: "/statements/upload",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Transactions"],
    }),
    deleteStatement: builder.mutation({
      query: (statementId) => ({
        url: `/statements/${statementId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Transactions"],
    }),
    getLedgers: builder.query({
      query: () => ({ url: "/ledgers", method: "GET" }),
      providesTags: ["Transactions"],
    }),
    getTransactions: builder.query({
      query: (params) => ({ url: "/transactions", method: "GET", params }),
      providesTags: ["Transactions"],
    }),
    getTransactionInvoice: builder.query({
      query: (transactionId) => ({
        url: `/transactions/${transactionId}/invoice`,
        method: "GET",
      }),
      providesTags: ["Transactions", "Invoices"],
    }),
    updateTransaction: builder.mutation({
      query: ({ transactionId, body }) => ({
        url: `/transactions/${transactionId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Transactions"],
    }),
    reviewTransaction: builder.mutation({
      query: (transactionId) => ({
        url: `/transactions/${transactionId}/review`,
        method: "POST",
      }),
      invalidatesTags: ["Transactions"],
    }),
    undoTransaction: builder.mutation({
      query: (transactionId) => ({
        url: `/transactions/${transactionId}/undo`,
        method: "POST",
      }),
      invalidatesTags: ["Transactions"],
    }),
    uploadTransactionVoucher: builder.mutation({
      query: ({ transactionId, body }) => ({
        url: `/transactions/${transactionId}/upload-voucher`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Transactions"],
    }),
    linkTransactionInvoice: builder.mutation({
      query: ({ transactionId, invoiceId }) => ({
        url: `/transactions/${transactionId}/link-invoice`,
        method: "POST",
        params: { invoice_id: invoiceId },
      }),
      invalidatesTags: ["Transactions", "Invoices"],
    }),
  }),
});

export const {
  useGetStatementsQuery,
  useUploadStatementMutation,
  useDeleteStatementMutation,
  useGetLedgersQuery,
  useGetTransactionsQuery,
  useGetTransactionInvoiceQuery,
  useLazyGetTransactionInvoiceQuery,
  useUpdateTransactionMutation,
  useReviewTransactionMutation,
  useUndoTransactionMutation,
  useUploadTransactionVoucherMutation,
  useLinkTransactionInvoiceMutation,
} = transactionsApi;

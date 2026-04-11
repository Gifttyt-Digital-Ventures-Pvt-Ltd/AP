import { serviceApi } from "../serviceApi";

export const paymentBatchesApi = serviceApi.injectEndpoints({
  endpoints: (builder) => ({
    getPaymentBatches: builder.query({
      query: () => ({ url: "/payment-batches", method: "GET" }),
      providesTags: ["Batches"],
    }),
    getPendingPaymentBatchApprovals: builder.query({
      query: () => ({
        url: "/payment-batches/pending-approval",
        method: "GET",
      }),
      providesTags: ["Batches", "Approvals"],
    }),
    getPaymentBatchStats: builder.query({
      query: () => ({ url: "/payment-batches/stats", method: "GET" }),
      providesTags: ["Batches"],
    }),
    createPaymentBatch: builder.mutation({
      query: (body) => ({ url: "/payment-batches", method: "POST", body }),
      invalidatesTags: ["Batches"],
    }),
    submitPaymentBatch: builder.mutation({
      query: (id) => ({
        url: `/payment-batches/${id}/submit`,
        method: "POST",
      }),
      invalidatesTags: ["Batches", "Approvals"],
    }),
    approvePaymentBatch: builder.mutation({
      query: ({ id, body }) => ({
        url: `/payment-batches/${id}/approve`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Batches", "Approvals"],
    }),
    processPaymentBatch: builder.mutation({
      query: (id) => ({
        url: `/payment-batches/${id}/process`,
        method: "POST",
      }),
      invalidatesTags: ["Batches", "Payments", "Invoices", "Dashboard", "Reports"],
    }),
    generatePaymentBatchFile: builder.mutation({
      query: (id) => ({
        url: `/payment-batches/${id}/generate-file`,
        method: "POST",
      }),
      invalidatesTags: ["Batches"],
    }),
  }),
});

export const {
  useGetPaymentBatchesQuery,
  useGetPendingPaymentBatchApprovalsQuery,
  useGetPaymentBatchStatsQuery,
  useCreatePaymentBatchMutation,
  useSubmitPaymentBatchMutation,
  useApprovePaymentBatchMutation,
  useProcessPaymentBatchMutation,
  useGeneratePaymentBatchFileMutation,
} = paymentBatchesApi;

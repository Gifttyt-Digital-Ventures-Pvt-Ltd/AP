import { serviceApi } from "../serviceApi";
import { CREDIT_INVALIDATION_TAGS } from "../../constants/creditActions";

export const paymentBatchesApi = serviceApi.injectEndpoints({
  endpoints: (builder) => ({
    getPaymentBatches: builder.query({
      query: () => ({ url: "/payment-batches", method: "GET" }),
      providesTags: ["Batches"],
    }),
    getPaymentBatchStats: builder.query({
      query: () => ({ url: "/payment-batches/stats", method: "GET" }),
      providesTags: ["Batches"],
    }),
    getPaymentBatch: builder.query({
      query: (batchId) => ({ url: `/payment-batches/${batchId}`, method: "GET" }),
      providesTags: ["Batches"],
    }),
    createPaymentBatch: builder.mutation({
      query: (body) => ({ url: "/payment-batches", method: "POST", body }),
      invalidatesTags: ["Batches"],
    }),
    processPaymentBatch: builder.mutation({
      query: (id) => ({
        url: `/payment-batches/${id}/process`,
        method: "POST",
      }),
      invalidatesTags: ["Batches", "Payments", "Invoices", "Dashboard", "Reports", ...CREDIT_INVALIDATION_TAGS],
    }),
    markProcessedPaymentBatch: builder.mutation({
      query: (body) => ({
        url: "/payment-batches/mark-processed",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Batches", "Payments", "Invoices", "Dashboard", "Reports", ...CREDIT_INVALIDATION_TAGS],
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
  useGetPaymentBatchStatsQuery,
  useGetPaymentBatchQuery,
  useLazyGetPaymentBatchQuery,
  useCreatePaymentBatchMutation,
  useProcessPaymentBatchMutation,
  useMarkProcessedPaymentBatchMutation,
  useGeneratePaymentBatchFileMutation,
} = paymentBatchesApi;

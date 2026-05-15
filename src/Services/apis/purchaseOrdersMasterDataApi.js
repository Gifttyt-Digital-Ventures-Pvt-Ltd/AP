import { serviceApi } from "../serviceApi";

export const purchaseOrdersMasterDataApi = serviceApi.injectEndpoints({
  endpoints: (builder) => ({
    getPurchaseOrders: builder.query({
      query: (params) => ({
        url: "/purchase-orders",
        method: "GET",
        params,
      }),
      providesTags: ["PurchaseOrders"],
    }),
    getPendingPurchaseOrderApprovals: builder.query({
      query: () => ({
        url: "/purchase-orders/pending-approvals",
        method: "GET",
      }),
      providesTags: ["PurchaseOrders", "Approvals"],
    }),
    getPurchaseOrderById: builder.query({
      query: (id) => ({ url: `/purchase-orders/${id}`, method: "GET" }),
      providesTags: ["PurchaseOrders"],
    }),
    getPurchaseOrderDownloadUrl: builder.query({
      query: (id) => ({ url: `/purchase-orders/${id}/download`, method: "GET" }),
      providesTags: ["PurchaseOrders"],
    }),
    savePurchaseOrderDraft: builder.mutation({
      query: (body) => ({ url: "/purchase-orders/draft", method: "POST", body }),
      invalidatesTags: ["PurchaseOrders"],
    }),
    createPurchaseOrder: builder.mutation({
      query: (body) => ({ url: "/purchase-orders", method: "POST", body }),
      invalidatesTags: ["PurchaseOrders"],
    }),
    submitPurchaseOrder: builder.mutation({
      query: (id) => ({
        url: `/purchase-orders/${id}/submit`,
        method: "POST",
      }),
      invalidatesTags: ["PurchaseOrders", "Approvals"],
    }),
    approvePurchaseOrder: builder.mutation({
      query: ({ id, body }) => ({
        url: `/purchase-orders/${id}/approve`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["PurchaseOrders", "Approvals"],
    }),
  }),
});

export const {
  useGetPurchaseOrdersQuery,
  useGetPendingPurchaseOrderApprovalsQuery,
  useGetPurchaseOrderByIdQuery,
  useLazyGetPurchaseOrderByIdQuery,
  useLazyGetPurchaseOrderDownloadUrlQuery,
  useSavePurchaseOrderDraftMutation,
  useCreatePurchaseOrderMutation,
  useSubmitPurchaseOrderMutation,
  useApprovePurchaseOrderMutation,
} = purchaseOrdersMasterDataApi;

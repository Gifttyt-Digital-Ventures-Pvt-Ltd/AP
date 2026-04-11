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
    getGlAccounts: builder.query({
      query: () => ({ url: "/master/gl-accounts", method: "GET" }),
      providesTags: ["MasterData"],
    }),
    getCostCenters: builder.query({
      query: () => ({ url: "/master/cost-centers", method: "GET" }),
      providesTags: ["MasterData"],
    }),
    getHsnSacCodes: builder.query({
      query: () => ({ url: "/master/hsn-sac", method: "GET" }),
      providesTags: ["MasterData"],
    }),
    seedMasterData: builder.mutation({
      query: () => ({ url: "/master/seed", method: "POST" }),
      invalidatesTags: ["MasterData"],
    }),
  }),
});

export const {
  useGetPurchaseOrdersQuery,
  useGetPendingPurchaseOrderApprovalsQuery,
  useGetPurchaseOrderByIdQuery,
  useLazyGetPurchaseOrderByIdQuery,
  useCreatePurchaseOrderMutation,
  useSubmitPurchaseOrderMutation,
  useApprovePurchaseOrderMutation,
  useGetGlAccountsQuery,
  useGetCostCentersQuery,
  useGetHsnSacCodesQuery,
  useSeedMasterDataMutation,
} = purchaseOrdersMasterDataApi;

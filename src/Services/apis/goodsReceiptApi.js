import { serviceApi } from "../serviceApi";

export const goodsReceiptApi = serviceApi.injectEndpoints({
  endpoints: (builder) => ({
    getGrns: builder.query({
      query: () => ({ url: "/grn", method: "GET" }),
      providesTags: ["GoodsReceipt"],
    }),
    createGrn: builder.mutation({
      query: (body) => ({ url: "/grn", method: "POST", body }),
      invalidatesTags: ["GoodsReceipt", "PurchaseOrders"],
    }),
    postGrn: builder.mutation({
      query: (id) => ({ url: `/grn/${id}/post`, method: "POST" }),
      invalidatesTags: ["GoodsReceipt"],
    }),
  }),
});

export const {
  useGetGrnsQuery,
  useCreateGrnMutation,
  usePostGrnMutation,
} = goodsReceiptApi;

import { serviceApi } from "../serviceApi";
import { CREDIT_INVALIDATION_TAGS } from "../../constants/creditActions";

export const goodsReceiptApi = serviceApi.injectEndpoints({
  endpoints: (builder) => ({
    getGrns: builder.query({
      query: () => ({ url: "/grn", method: "GET" }),
      providesTags: ["GoodsReceipt"],
    }),
    createGrn: builder.mutation({
      query: (body) => ({ url: "/grn", method: "POST", body }),
      invalidatesTags: ["GoodsReceipt", "PurchaseOrders", ...CREDIT_INVALIDATION_TAGS],
    }),
    postGrn: builder.mutation({
      query: (id) => ({ url: `/grn/${id}/post`, method: "POST" }),
      invalidatesTags: ["GoodsReceipt", ...CREDIT_INVALIDATION_TAGS],
    }),
  }),
});

export const {
  useGetGrnsQuery,
  useCreateGrnMutation,
  usePostGrnMutation,
} = goodsReceiptApi;

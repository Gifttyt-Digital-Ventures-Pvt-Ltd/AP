import { serviceApi } from "../serviceApi";
import { CREDIT_INVALIDATION_TAGS } from "../../constants/creditActions";
import { extractListResponse } from "../utils/payloadMappers";

const grnTags = ["GoodsReceipt"];

const getListData = extractListResponse;

const grnFormatTags = [{ type: "GoodsReceipt", id: "CONFIG" }];

const getGrnFormatId = (entity) => entity?.id ?? entity?.grnFormatConfigId ?? entity?.grn_format_config_id;

const unwrapGrnDetailResponse = (response) => response?.grn ?? response?.data ?? response;

const normalizeGrnDetailResponse = (response) => {
  const grn = unwrapGrnDetailResponse(response);
  if (!grn || typeof grn !== "object") return grn;

  const configSnapshot =
    grn.config_snapshot ??
    grn.configSnapshot ??
    grn.format_config_snapshot ??
    grn.formatConfigSnapshot;
  const formatConfigId =
    grn.grn_format_id ??
    grn.grnFormatId ??
    grn.formatConfigId ??
    configSnapshot?.id ??
    "";

  return {
    ...grn,
    grn_format_id: formatConfigId,
    grnFormatId: grn.grnFormatId ?? formatConfigId,
    formatConfigId: grn.formatConfigId ?? formatConfigId,
    config_snapshot: configSnapshot,
    configSnapshot,
  };
};

const provideGrnFormatListTags = (result) => [
  { type: "GoodsReceipt", id: "CONFIG_LIST" },
  ...getListData(result)
    .map(getGrnFormatId)
    .filter((id) => id !== undefined && id !== null)
    .map((id) => ({ type: "GoodsReceipt", id: `CONFIG_${id}` })),
];

export const goodsReceiptApi = serviceApi.injectEndpoints({
  endpoints: (builder) => ({
    getGrns: builder.query({
      query: (params = {}) => ({
        url: "/grn",
        method: "GET",
        params,
      }),
      providesTags: grnTags,
    }),
    getGrnById: builder.query({
      query: (id) => ({ url: `/grn/${id}`, method: "GET" }),
      transformResponse: normalizeGrnDetailResponse,
      providesTags: (_result, _error, id) => [{ type: "GoodsReceipt", id }],
    }),
    getGrnDownloadUrl: builder.mutation({
      query: (id) => ({
        url: `/grn/${id}/download`,
        method: "GET",
        params: { format: "pdf" },
      }),
    }),
    getGrnFormatConfig: builder.query({
      query: () => ({ url: "/grn/config", method: "GET" }),
      providesTags: grnFormatTags,
    }),
    updateGrnFormatConfig: builder.mutation({
      query: (body) => ({ url: "/grn/config", method: "PUT", body }),
      invalidatesTags: [...grnFormatTags, { type: "GoodsReceipt", id: "CONFIG_LIST" }],
    }),
    getGrnFormatConfigs: builder.query({
      query: () => ({ url: "/grn-format-configs", method: "GET" }),
      transformResponse: extractListResponse,
      providesTags: (result) => provideGrnFormatListTags(result),
    }),
    getGrnFormatConfigById: builder.query({
      query: (id) => ({ url: `/grn-format-configs/${id}`, method: "GET" }),
      providesTags: (_result, _error, id) => [{ type: "GoodsReceipt", id: `CONFIG_${id}` }],
    }),
    createGrnFormatConfig: builder.mutation({
      query: (body) => ({ url: "/grn-format-configs", method: "POST", body }),
      invalidatesTags: [...grnFormatTags, { type: "GoodsReceipt", id: "CONFIG_LIST" }],
    }),
    updateGrnFormatConfigById: builder.mutation({
      query: ({ id, body }) => ({
        url: `/grn-format-configs/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        ...grnFormatTags,
        { type: "GoodsReceipt", id: "CONFIG_LIST" },
        { type: "GoodsReceipt", id: `CONFIG_${id}` },
      ],
    }),
    deleteGrnFormatConfig: builder.mutation({
      query: (id) => ({ url: `/grn-format-configs/${id}`, method: "DELETE" }),
      invalidatesTags: (_result, _error, id) => [
        ...grnFormatTags,
        { type: "GoodsReceipt", id: "CONFIG_LIST" },
        { type: "GoodsReceipt", id: `CONFIG_${id}` },
      ],
    }),
    setDefaultGrnFormatConfig: builder.mutation({
      query: (id) => ({ url: `/grn-format-configs/${id}/default`, method: "POST" }),
      invalidatesTags: [...grnFormatTags, { type: "GoodsReceipt", id: "CONFIG_LIST" }],
    }),
    getOpenPosForGrn: builder.query({
      query: (params = {}) => ({
        url: "/grn/po/open",
        method: "GET",
        params,
      }),
      transformResponse: extractListResponse,
      providesTags: ["PurchaseOrders"],
    }),
    getPoLinesReceiptState: builder.query({
      query: (poId) => ({
        url: `/grn/po/${poId}/lines-receipt-state`,
        method: "GET",
      }),
    }),
    getEligiblePisForGrn: builder.query({
      query: () => ({ url: "/grn/pi/eligible", method: "GET" }),
      transformResponse: extractListResponse,
    }),
    createGrn: builder.mutation({
      query: (body) => ({ url: "/grn", method: "POST", body }),
      invalidatesTags: ["GoodsReceipt", "PurchaseOrders", ...CREDIT_INVALIDATION_TAGS],
    }),
    updateGrn: builder.mutation({
      query: ({ id, body }) => ({ url: `/grn/${id}`, method: "PUT", body }),
      invalidatesTags: ["GoodsReceipt", "PurchaseOrders", ...CREDIT_INVALIDATION_TAGS],
    }),
    submitGrn: builder.mutation({
      query: (id) => ({ url: `/grn/${id}/submit`, method: "POST" }),
      invalidatesTags: ["GoodsReceipt", "PurchaseOrders", ...CREDIT_INVALIDATION_TAGS],
    }),
    approveGrn: builder.mutation({
      query: (id) => ({ url: `/grn/${id}/approve`, method: "POST" }),
      invalidatesTags: ["GoodsReceipt", "PurchaseOrders", ...CREDIT_INVALIDATION_TAGS],
    }),
    rejectGrn: builder.mutation({
      query: ({ id, reason }) => ({
        url: `/grn/${id}/reject`,
        method: "POST",
        body: { reason },
      }),
      invalidatesTags: ["GoodsReceipt", ...CREDIT_INVALIDATION_TAGS],
    }),
    sendBackGrn: builder.mutation({
      query: ({ id, reason, comments }) => ({
        url: `/grn/${id}/send-back`,
        method: "POST",
        body: { reason: reason || comments, comments },
      }),
      invalidatesTags: ["GoodsReceipt", ...CREDIT_INVALIDATION_TAGS],
    }),
    postGrn: builder.mutation({
      query: (id) => ({ url: `/grn/${id}/post`, method: "POST" }),
      invalidatesTags: ["GoodsReceipt", "PurchaseOrders", ...CREDIT_INVALIDATION_TAGS],
    }),
    cancelGrn: builder.mutation({
      query: (id) => ({ url: `/grn/${id}/cancel`, method: "POST" }),
      invalidatesTags: ["GoodsReceipt", ...CREDIT_INVALIDATION_TAGS],
    }),
    extractGrnDocument: builder.mutation({
      query: (formData) => ({
        url: "/grn/extract",
        method: "POST",
        body: formData,
      }),
      invalidatesTags: CREDIT_INVALIDATION_TAGS,
    }),
    getGrnExtractJob: builder.query({
      query: (jobId) => ({ url: `/grn/extract/${jobId}`, method: "GET" }),
    }),
    createGrnFromPi: builder.mutation({
      query: (piId) => ({ url: `/grn/from-pi/${piId}`, method: "POST" }),
      invalidatesTags: ["GoodsReceipt", ...CREDIT_INVALIDATION_TAGS],
    }),
  }),
});

export const {
  useGetGrnsQuery,
  useGetGrnByIdQuery,
  useLazyGetGrnByIdQuery,
  useGetGrnDownloadUrlMutation,
  useGetGrnFormatConfigQuery,
  useUpdateGrnFormatConfigMutation,
  useGetGrnFormatConfigsQuery,
  useGetGrnFormatConfigByIdQuery,
  useLazyGetGrnFormatConfigByIdQuery,
  useCreateGrnFormatConfigMutation,
  useUpdateGrnFormatConfigByIdMutation,
  useDeleteGrnFormatConfigMutation,
  useSetDefaultGrnFormatConfigMutation,
  useGetOpenPosForGrnQuery,
  useGetPoLinesReceiptStateQuery,
  useLazyGetPoLinesReceiptStateQuery,
  useGetEligiblePisForGrnQuery,
  useCreateGrnMutation,
  useUpdateGrnMutation,
  useSubmitGrnMutation,
  useApproveGrnMutation,
  useRejectGrnMutation,
  useSendBackGrnMutation,
  usePostGrnMutation,
  useCancelGrnMutation,
  useExtractGrnDocumentMutation,
  useLazyGetGrnExtractJobQuery,
  useCreateGrnFromPiMutation,
} = goodsReceiptApi;

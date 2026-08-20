import { serviceApi } from "../serviceApi";
import { normalizeOrderTrackingRow } from "../../pages/order-tracking/utils";

const provideListTags = (type, result) => [
  { type, id: "LIST" },
  ...(Array.isArray(result) ? result : []).map((row) => ({ type, id: row.id })),
];

/**
 * Live as of the backend team completing docs/order-tracking-api-contract.md.
 * Response shapes here must keep matching that doc — it's the source of
 * truth both sides agreed on.
 */
export const orderTrackingApi = serviceApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * params: { page, size, sortBy, sortDirection, poDateFrom, poDateTo,
     * vendorId, documentStatus, paymentStatus, deliveryStatus,
     * fundingStatus, currency } — see DEFAULT_ORDER_TRACKING_PARAMS.
     * response: { items, page, size, totalElements, totalPages }.
     */
    getOrderTracking: builder.query({
      query: (params) => ({ url: "/order-tracking", method: "GET", params }),
      transformResponse: (response) => ({
        ...response,
        items: Array.isArray(response?.items) ? response.items.map(normalizeOrderTrackingRow) : [],
      }),
      providesTags: (result) => provideListTags("OrderTracking", result?.items),
    }),

    /**
     * Independent of the current list filters/pagination — always the full
     * universe of vendors/delivery statuses/funding statuses.
     * response: { vendors, deliveryStatuses, fundingStatuses } — each an
     * array of { value, label }.
     */
    getOrderTrackingFilterOptions: builder.query({
      query: () => ({ url: "/order-tracking/filter-options", method: "GET" }),
      providesTags: [{ type: "OrderTracking", id: "FILTER-OPTIONS" }],
    }),

    /**
     * Takes the same filter shape as getOrderTracking (minus page/size/sort).
     * response: { status, downloadUrl, message }.
     */
    exportOrderTrackingReport: builder.mutation({
      query: (params) => ({ url: "/order-tracking/export", method: "POST", body: params }),
    }),
  }),
});

export const {
  useGetOrderTrackingQuery,
  useGetOrderTrackingFilterOptionsQuery,
  useExportOrderTrackingReportMutation,
} = orderTrackingApi;

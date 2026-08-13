import { serviceApi } from "../serviceApi";
import {
  mapOrderTrackingRow,
  mapOrderTrackingDetail,
  mapOrderTrackingSummary,
  mapOrderTrackingFilterOptions,
} from "../../pages/order-tracking/utils";

/**
 * Live backend integration for the v4 Order Tracking screen, per
 * docs/order-tracking-api-contract.md. Every endpoint here is a real
 * `query:` — no `queryFn` mocks remain. All filtering/sorting/pagination
 * happens server-side; this file never slices or filters an array itself.
 * The mapper (src/pages/order-tracking/utils/index.js) is the only place
 * backend field names/casing are read — every `transformResponse` below
 * routes through it, so OrderTrackingTable/FilterBar/SummaryCards/
 * DetailDrawer/DocumentChainCell/DeliveryStatusSelect only ever see the
 * normalized OrderTrackingRow/OrderTrackingDetail models.
 */
const provideListTags = (type, result) => [
  { type, id: "LIST" },
  ...(Array.isArray(result) ? result : []).map((row) => ({ type, id: row.id })),
];

export const orderTrackingApi = serviceApi.injectEndpoints({
  endpoints: (builder) => ({
    /** params: docs/order-tracking-api-contract.md §3.1. response: { items, page, size, totalElements, totalPages }. */
    getOrderTracking: builder.query({
      query: (params = {}) => ({ url: "/order-tracking", method: "GET", params }),
      transformResponse: (response) => ({
        ...response,
        items: Array.isArray(response?.items) ? response.items.map(mapOrderTrackingRow) : [],
      }),
      providesTags: (result) => provideListTags("OrderTracking", result?.items),
    }),

    /**
     * No params — always the whole, unfiltered dataset, so summary-card
     * counts never collapse when a grid filter is applied (docs §3.2).
     * response: { openOrders, overduePayments, pendingDelivery, fullyClosed }.
     */
    getOrderTrackingSummary: builder.query({
      query: () => ({ url: "/order-tracking/summary", method: "GET" }),
      transformResponse: (response) => mapOrderTrackingSummary(response),
      providesTags: [{ type: "OrderTracking", id: "SUMMARY" }],
    }),

    /** response: full detail payload — docs/order-tracking-api-contract.md §5. */
    getOrderTrackingDetail: builder.query({
      query: (orderId) => ({ url: `/order-tracking/${orderId}`, method: "GET" }),
      transformResponse: (response) => mapOrderTrackingDetail(response),
      providesTags: (result, error, orderId) => [{ type: "OrderTracking", id: orderId }],
    }),

    /**
     * body: { deliveryStatus, remarks } — remarks always sent as a string,
     * never omitted, matching the existing PO deliveryRemarks convention
     * (docs §3.4). response: updated delivery state; not consumed directly
     * by any caller today (they rely on invalidatesTags to refetch), so no
     * transformResponse needed here.
     */
    updateOrderTrackingDeliveryStatus: builder.mutation({
      query: ({ orderId, deliveryStatus, remarks = "" }) => ({
        url: `/order-tracking/${orderId}/delivery-status`,
        method: "PATCH",
        body: { deliveryStatus, remarks },
      }),
      invalidatesTags: (result, error, { orderId }) => [
        { type: "OrderTracking", id: "LIST" },
        { type: "OrderTracking", id: "SUMMARY" },
        { type: "OrderTracking", id: orderId },
      ],
    }),

    /** response: { vendors } — deliveryStatuses/fundingStatuses dropped, both closed frontend enums now (docs §3.5). */
    getOrderTrackingFilterOptions: builder.query({
      query: () => ({ url: "/order-tracking/filter-options", method: "GET" }),
      transformResponse: (response) => mapOrderTrackingFilterOptions(response),
      providesTags: [{ type: "OrderTracking", id: "FILTER-OPTIONS" }],
    }),

    /** Takes the same filter shape as getOrderTracking (minus page/size/sort). response: { status, downloadUrl, message }. */
    exportOrderTrackingReport: builder.mutation({
      query: (params = {}) => ({ url: "/order-tracking/export", method: "POST", body: params }),
    }),
  }),
});

export const {
  useGetOrderTrackingQuery,
  useGetOrderTrackingSummaryQuery,
  useGetOrderTrackingDetailQuery,
  useUpdateOrderTrackingDeliveryStatusMutation,
  useGetOrderTrackingFilterOptionsQuery,
  useExportOrderTrackingReportMutation,
} = orderTrackingApi;

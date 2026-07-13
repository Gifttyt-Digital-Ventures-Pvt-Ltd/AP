import { serviceApi } from "../serviceApi";
import {
  toInvoiceApiPayload,
  toInvoiceUiPayload,
  toVendorApiPayload,
  toVendorRequestApiPayload,
  toVendorUiPayload,
  extractListResponse,
  normalizeInvoiceListResponse,
  normalizeInvoiceFilterOptions,
} from "../utils/payloadMappers";
import { normalizeApprovalHistoryEntries } from "../../pages/invoices/utils/invoiceHistory";
import { CREDIT_INVALIDATION_TAGS } from "../../constants/creditActions";

const unwrapVendorList = extractListResponse;

const normalizeVendorListResponse = (response) => {
  const vendors = unwrapVendorList(response).map(toVendorUiPayload);
  const payload = response?.data && !Array.isArray(response.data) ? response.data : response;

  return Object.assign(vendors, {
    total: Number(payload?.total ?? payload?.totalCount ?? payload?.count ?? vendors.length),
    limit: Number(payload?.limit ?? payload?.size ?? vendors.length),
    offset: Number(payload?.offset ?? 0),
    hasMore: Boolean(payload?.hasMore ?? payload?.has_more ?? false),
  });
};

export const invoicesVendorsApi = serviceApi.injectEndpoints({
  endpoints: (builder) => ({
    getInvoiceMandatoryFields: builder.query({
      query: ({ userEmail } = {}) => ({
        url: "/invoice/mandatory-fields",
        method: "GET",
        params: userEmail ? { userEmail } : {},
      }),
    }),
    getInvoices: builder.query({
      query: (params) => ({ url: "/invoices", method: "GET", params }),
      transformResponse: normalizeInvoiceListResponse,
      providesTags: ["Invoices"],
    }),
    getInvoice: builder.query({
      query: (id) => ({ url: `/invoices/${id}`, method: "GET" }),
      transformResponse: toInvoiceUiPayload,
      providesTags: (_result, _error, id) => [{ type: "Invoices", id }],
    }),
    getInvoiceFilterOptions: builder.query({
      query: (params = {}) => ({
        url: "/invoices/filter-options",
        method: "GET",
        params,
      }),
      transformResponse: normalizeInvoiceFilterOptions,
      providesTags: [{ type: "Invoices", id: "FILTER_OPTIONS" }],
    }),
    createInvoice: builder.mutation({
      query: (body) => ({
        url: "/invoices",
        method: "POST",
        body: body instanceof FormData ? body : toInvoiceApiPayload(body),
      }),
      invalidatesTags: ["Invoices", "Dashboard", "Reports"],
    }),
    updateInvoice: builder.mutation({
      query: ({ id, body }) => ({
        url: `/invoices/${id}`,
        method: "PUT",
        body: toInvoiceApiPayload(body),
      }),
      invalidatesTags: ["Invoices", "Dashboard", "Reports"],
    }),
    forwardInvoice: builder.mutation({
      query: (body) => ({
        url: "/invoices/forward",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Invoices", "Approvals", "Dashboard", "Reports"],
    }),
    deleteInvoice: builder.mutation({
      query: (id) => ({ url: `/invoices/${id}`, method: "DELETE" }),
      invalidatesTags: ["Invoices", "Dashboard", "Reports"],
    }),
    cancelInvoice: builder.mutation({
      query: ({ id, reason }) => ({
        url: `/invoices/${id}/cancel`,
        method: "POST",
        body: { reason },
      }),
      invalidatesTags: ["Invoices", "Approvals", "Payments", "Dashboard", "Reports"],
    }),
    scanInvoice: builder.mutation({
      query: (body) => ({
        url: "/scan/extract-invoice-data",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Invoices", "Dashboard", "Reports", ...CREDIT_INVALIDATION_TAGS],
    }),
    bulkUploadInvoices: builder.mutation({
      query: (body) => ({
        url: "/scan/bulk-extract-invoice-data",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Invoices", "Dashboard", "Reports", ...CREDIT_INVALIDATION_TAGS],
    }),
    approveInvoice: builder.mutation({
      query: ({ id, body }) => ({
        url: `/invoices/${id}/approve`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Invoices", "Approvals", "Dashboard", "Reports"],
    }),
    getInvoiceHistory: builder.query({
      query: (id) => ({ url: `/invoices/${id}/history`, method: "GET" }),
      transformResponse: (response) => normalizeApprovalHistoryEntries(response),
      providesTags: ["Invoices"],
    }),
    getPendingCheckerInvoices: builder.query({
      query: (params) => ({ url: "/checker/pending", method: "GET", params }),
      transformResponse: (response) =>
        extractListResponse(response).map(toInvoiceUiPayload),
      providesTags: ["Invoices", "Approvals"],
    }),
    checkInvoice: builder.mutation({
      query: ({ id, body }) => ({
        url: `/invoices/${id}/check`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Invoices", "Approvals", "Dashboard", "Reports"],
    }),
    getVendors: builder.query({
      query: (params) => ({ url: "/vendors", method: "GET", params }),
      transformResponse: normalizeVendorListResponse,
      providesTags: (result) => {
        if (Array.isArray(result)) {
          return [
            { type: "Vendors", id: "LIST" },
            ...result
              .filter(
                (vendor) => vendor?.id !== undefined && vendor?.id !== null,
              )
              .map((vendor) => ({ type: "Vendors", id: vendor.id })),
          ];
        }
        if (result?.id !== undefined && result?.id !== null) {
          return [
            { type: "Vendors", id: "LIST" },
            { type: "Vendors", id: result.id },
          ];
        }
        return [{ type: "Vendors", id: "LIST" }];
      },
    }),
    createVendor: builder.mutation({
      query: (body) => ({
        url: "/vendors",
        method: "POST",
        body: body instanceof FormData
          ? body
          : Array.isArray(body)
          ? body.map(toVendorApiPayload)
          : [toVendorApiPayload(body)],
      }),
      invalidatesTags: [
        { type: "Vendors", id: "LIST" },
        "Dashboard",
        "Reports",
        ...CREDIT_INVALIDATION_TAGS,
      ],
    }),
    requestVendorAddition: builder.mutation({
      query: (body) => ({
        url: "/vendors/request",
        method: "POST",
        body: toVendorRequestApiPayload(body),
      }),
      transformResponse: (response) => {
        const payload = response?.vendor ?? response?.data ?? response;
        return toVendorUiPayload(payload);
      },
      invalidatesTags: ["Vendors"],
    }),
    updateVendor: builder.mutation({
      query: ({ id, body }) => ({
        url: `/vendors/${id}`,
        method: "PUT",
        body: body instanceof FormData ? body : toVendorApiPayload(body),
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Vendors", id: "LIST" },
        { type: "Vendors", id },
        "Dashboard",
        "Reports",
      ],
    }),
    deleteVendor: builder.mutation({
      query: (id) => ({ url: `/vendors/${id}`, method: "DELETE" }),
      invalidatesTags: (result, error, id) => [
        { type: "Vendors", id: "LIST" },
        { type: "Vendors", id },
        "Dashboard",
        "Reports",
      ],
    }),
    getPendingVendorApprovals: builder.query({
      query: () => ({ url: "/vendors/approvals/pending", method: "GET" }),
      transformResponse: (response) =>
        unwrapVendorList(response).map(toVendorUiPayload),
      providesTags: [{ type: "Vendors", id: "PENDING" }],
    }),
    approveVendor: builder.mutation({
      query: ({ id, body }) => ({
        url: `/vendors/${id}/approve`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Vendors", id: "LIST" },
        { type: "Vendors", id: "PENDING" },
        { type: "Vendors", id },
        "Dashboard",
        "Reports",
      ],
    }),
    getVendorHistory: builder.query({
      query: (id) => ({ url: `/vendor/${id}/history`, method: "GET" }),
      transformResponse: (response) => normalizeApprovalHistoryEntries(response),
      providesTags: (result, error, id) => [{ type: "Vendors", id }],
    }),
  }),
});

export const {
  useGetInvoiceMandatoryFieldsQuery,
  useGetInvoiceFilterOptionsQuery,
  useGetInvoicesQuery,
  useGetInvoiceQuery,
  useLazyGetInvoiceQuery,
  useCreateInvoiceMutation,
  useUpdateInvoiceMutation,
  useForwardInvoiceMutation,
  useDeleteInvoiceMutation,
  useCancelInvoiceMutation,
  useScanInvoiceMutation,
  useBulkUploadInvoicesMutation,
  useApproveInvoiceMutation,
  useGetInvoiceHistoryQuery,
  useLazyGetInvoiceHistoryQuery,
  useGetPendingCheckerInvoicesQuery,
  useCheckInvoiceMutation,
  useGetVendorsQuery,
  useCreateVendorMutation,
  useRequestVendorAdditionMutation,
  useUpdateVendorMutation,
  useDeleteVendorMutation,
  useGetPendingVendorApprovalsQuery,
  useApproveVendorMutation,
  useGetVendorHistoryQuery,
  useLazyGetVendorHistoryQuery,
} = invoicesVendorsApi;

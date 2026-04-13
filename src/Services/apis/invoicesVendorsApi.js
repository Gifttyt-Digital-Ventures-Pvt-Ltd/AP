import { serviceApi } from "../serviceApi";
import {
  toInvoiceApiPayload,
  toInvoiceUiPayload,
  toVendorApiPayload,
  toVendorUiPayload,
} from "../utils/payloadMappers";

export const invoicesVendorsApi = serviceApi.injectEndpoints({
  endpoints: (builder) => ({
    getInvoices: builder.query({
      query: (params) => ({ url: "/invoices", method: "GET", params }),
      transformResponse: (response) =>
        Array.isArray(response)
          ? response.map(toInvoiceUiPayload)
          : toInvoiceUiPayload(response),
      providesTags: ["Invoices"],
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
    deleteInvoice: builder.mutation({
      query: (id) => ({ url: `/invoices/${id}`, method: "DELETE" }),
      invalidatesTags: ["Invoices", "Dashboard", "Reports"],
    }),
    scanInvoice: builder.mutation({
      query: (body) => ({
        url: "/scan/extract-invoice-data",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Invoices", "Dashboard", "Reports"],
    }),
    bulkUploadInvoices: builder.mutation({
      query: (body) => ({
        url: "/scan/bulk-extract-invoice-data",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Invoices", "Dashboard", "Reports"],
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
      providesTags: ["Invoices"],
    }),
    getVendors: builder.query({
      query: () => ({ url: "/vendors", method: "GET" }),
      transformResponse: (response) =>
        Array.isArray(response)
          ? response.map(toVendorUiPayload)
          : toVendorUiPayload(response),
      providesTags: (result) => {
        if (Array.isArray(result)) {
          return [
            { type: "Vendors", id: "LIST" },
            ...result
              .filter((vendor) => vendor?.id !== undefined && vendor?.id !== null)
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
        body: toVendorApiPayload(body),
      }),
      invalidatesTags: [{ type: "Vendors", id: "LIST" }, "Dashboard", "Reports"],
    }),
    updateVendor: builder.mutation({
      query: ({ id, body }) => ({
        url: `/vendors/${id}`,
        method: "PUT",
        body: toVendorApiPayload(body),
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
  }),
});

export const {
  useGetInvoicesQuery,
  useCreateInvoiceMutation,
  useUpdateInvoiceMutation,
  useDeleteInvoiceMutation,
  useScanInvoiceMutation,
  useBulkUploadInvoicesMutation,
  useApproveInvoiceMutation,
  useGetInvoiceHistoryQuery,
  useLazyGetInvoiceHistoryQuery,
  useGetVendorsQuery,
  useCreateVendorMutation,
  useUpdateVendorMutation,
  useDeleteVendorMutation,
} = invoicesVendorsApi;

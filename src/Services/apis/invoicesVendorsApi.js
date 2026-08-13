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
import { normalizeAdvanceAdjustmentProposal } from "../../pages/invoices/utils/advanceAdjustment";
import { CREDIT_INVALIDATION_TAGS } from "../../constants/creditActions";

const unwrapVendorList = extractListResponse;

const normalizeMsmeVerificationResponse = (response = {}) => {
  const payload = response?.data ?? response?.result ?? response;
  return {
    ...payload,
    verificationMode: payload?.verificationMode ?? payload?.verification_mode ?? "",
    verified: Boolean(payload?.verified),
    msmeStatus: payload?.msmeStatus ?? payload?.msme_status ?? "",
    enterpriseName: payload?.enterpriseName ?? payload?.enterprise_name ?? "",
    udyamRegistrationNo: payload?.udyamRegistrationNo ?? payload?.udyam_registration_no ?? "",
    msmeCategory: payload?.msmeCategory ?? payload?.msme_category ?? "",
    verificationStatus: payload?.verificationStatus ?? payload?.verification_status ?? "",
    verificationMessage: payload?.verificationMessage ?? payload?.verification_message ?? payload?.message ?? "",
    verifiedAt: payload?.verifiedAt ?? payload?.verified_at ?? "",
    providerReferenceId: payload?.providerReferenceId ?? payload?.provider_reference_id ?? "",
  };
};

const normalizeVendorBankVerificationResponse = (response = {}) => {
  const payload = response?.data ?? response?.result ?? response;
  return {
    ...payload,
    verified: Boolean(payload?.verified),
    verificationStatus:
      payload?.verificationStatus ??
      payload?.verification_status ??
      payload?.bankVerificationStatus ??
      payload?.bank_verification_status ??
      "",
    verificationMessage:
      payload?.verificationMessage ??
      payload?.verification_message ??
      payload?.message ??
      "",
    accountNumber:
      payload?.accountNumber ??
      payload?.account_number ??
      "",
    ifsc:
      payload?.ifsc ??
      payload?.ifscCode ??
      payload?.ifsc_code ??
      "",
    accountHolderName:
      payload?.accountHolderName ??
      payload?.account_holder_name ??
      payload?.accountName ??
      payload?.account_name ??
      "",
    bankName:
      payload?.bankName ??
      payload?.bank_name ??
      payload?.bank ??
      "",
    verifiedAt:
      payload?.verifiedAt ??
      payload?.verified_at ??
      "",
    providerReferenceId:
      payload?.providerReferenceId ??
      payload?.provider_reference_id ??
      "",
  };
};

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
    // PUT /invoices/{id}/internal-checklist
    // Dedicated endpoint for updating only the Internal Checklist, independent
    // of the normal invoice-editable-status gate. Body is sent as-is
    // ({ internalChecklist: [...] }), deliberately NOT run through
    // toInvoiceApiPayload — that whitelist represents a full invoice update
    // and this endpoint must never touch any other invoice field.
    updateInvoiceInternalChecklist: builder.mutation({
      query: ({ id, body }) => ({
        url: `/invoices/${id}/internal-checklist`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { id } = {}) => [
        { type: "Invoices", id },
        "Invoices",
      ],
    }),
    // PUT /invoices/{id}/funding
    // Dedicated endpoint for updating only the invoice funding split,
    // independent of the full invoice editable-status gate.
    updateInvoiceFunding: builder.mutation({
      query: ({ id, body }) => ({
        url: `/invoices/${id}/funding`,
        method: "PUT",
        body,
      }),
      transformResponse: (response) => {
        const payload = response?.invoice ?? response?.data ?? response;
        return payload ? toInvoiceUiPayload(payload) : payload;
      },
      invalidatesTags: (_result, _error, { id } = {}) => [
        { type: "Invoices", id },
        "Invoices",
        "Approvals",
        "Dashboard",
        "Reports",
      ],
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
    getInvoiceAdvanceAdjustmentProposal: builder.query({
      query: (id) => ({
        url: `/invoices/${id}/advance-adjustments/propose`,
        method: "GET",
      }),
      transformResponse: normalizeAdvanceAdjustmentProposal,
      providesTags: (_result, _error, id) => [{ type: "Invoices", id }],
    }),
    confirmInvoiceAdvanceAdjustment: builder.mutation({
      query: ({ id, body }) => ({
        url: `/invoices/${id}/advance-adjustments/confirm`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Invoices", id },
        "Invoices",
        "Approvals",
        "Dashboard",
        "Reports",
        "VendorAdvances",
      ],
    }),
    getInvoiceHistory: builder.query({
      query: (id) => ({ url: `/invoices/${id}/history`, method: "GET" }),
      transformResponse: (response) => normalizeApprovalHistoryEntries(response),
      providesTags: (_result, _error, id) => [{ type: "Invoices", id }, "Invoices"],
    }),
    getInvoiceFundingHistory: builder.query({
      query: (id) => ({
        url: `/invoices/${id}/funding-history`,
        method: "GET",
      }),
      transformResponse: (response) => {
        if (Array.isArray(response)) return response;
        if (Array.isArray(response?.data)) return response.data;
        if (Array.isArray(response?.history)) return response.history;
        return [];
      },
      providesTags: (_result, _error, id) => [{ type: "Invoices", id }],
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
    getVendor: builder.query({
      query: (id) => ({ url: `/vendors/${id}`, method: "GET" }),
      transformResponse: (response) => {
        const payload = response?.vendor ?? response?.data ?? response;
        return toVendorUiPayload(payload);
      },
      providesTags: (_result, _error, id) => [{ type: "Vendors", id }],
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
    verifyVendorMsme: builder.mutation({
      query: (body) => ({
        url: "/vendors/verify/msme",
        method: "POST",
        body,
      }),
      transformResponse: normalizeMsmeVerificationResponse,
    }),
    verifyVendorBankAccount: builder.mutation({
      query: (body) => ({
        url: "/vendors/verify/bank-account",
        method: "POST",
        body,
      }),
      transformResponse: normalizeVendorBankVerificationResponse,
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
        "Invoices",
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
  useUpdateInvoiceInternalChecklistMutation,
  useUpdateInvoiceFundingMutation,
  useForwardInvoiceMutation,
  useDeleteInvoiceMutation,
  useCancelInvoiceMutation,
  useScanInvoiceMutation,
  useBulkUploadInvoicesMutation,
  useApproveInvoiceMutation,
  useGetInvoiceAdvanceAdjustmentProposalQuery,
  useConfirmInvoiceAdvanceAdjustmentMutation,
  useGetInvoiceHistoryQuery,
  useLazyGetInvoiceHistoryQuery,
  useGetInvoiceFundingHistoryQuery,
  useGetPendingCheckerInvoicesQuery,
  useCheckInvoiceMutation,
  useGetVendorsQuery,
  useGetVendorQuery,
  useLazyGetVendorQuery,
  useCreateVendorMutation,
  useVerifyVendorMsmeMutation,
  useVerifyVendorBankAccountMutation,
  useRequestVendorAdditionMutation,
  useUpdateVendorMutation,
  useDeleteVendorMutation,
  useGetPendingVendorApprovalsQuery,
  useApproveVendorMutation,
  useGetVendorHistoryQuery,
  useLazyGetVendorHistoryQuery,
} = invoicesVendorsApi;

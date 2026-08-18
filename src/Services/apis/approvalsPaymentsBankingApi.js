import { serviceApi } from "../serviceApi";
import {
  extractListResponse,
  toBankAccountApiPayload,
  toBankAccountUiPayload,
  toInvoiceUiPayload,
  toPaymentCreateApiPayload,
  toRecordPaymentsApiPayload,
} from "../utils/payloadMappers";
import { CREDIT_INVALIDATION_TAGS } from "../../constants/creditActions";
import { normalizePayablesResponse } from "../../pages/payments/utils/payableNormalizers";
import { normalizePayrun } from "../../pages/payments/components/payrunUtils";

const normalizePaginatedListResponse = (response, extraKeys = [], mapItem = (item) => item) => {
  const items = extractListResponse(response, extraKeys).map(mapItem);
  const source = response && typeof response === "object" ? response : {};
  const nested = source.data && !Array.isArray(source.data) && typeof source.data === "object"
    ? source.data
    : {};
  const total = Number(
    source.total ??
      source.totalElements ??
      source.total_elements ??
      source.totalCount ??
      source.total_count ??
      nested.total ??
      nested.totalElements ??
      nested.total_elements ??
      nested.totalCount ??
      nested.total_count ??
      items.length,
  ) || 0;
  const limit = Number(source.limit ?? source.size ?? source.pageSize ?? nested.limit ?? nested.size ?? nested.pageSize ?? items.length) || items.length;
  const offset = Number(source.offset ?? nested.offset ?? ((source.page ?? source.number ?? nested.page ?? nested.number ?? 0) * limit)) || 0;
  const totalPages = Number(source.totalPages ?? source.total_pages ?? nested.totalPages ?? nested.total_pages) || (limit > 0 ? Math.ceil(total / limit) : 0);

  return {
    items,
    data: items,
    total,
    limit,
    offset,
    totalPages,
    hasMore: Boolean(source.hasMore ?? source.has_more ?? nested.hasMore ?? nested.has_more ?? offset + items.length < total),
  };
};

const normalizePayablesListResponse = (response) => {
  const page = normalizePaginatedListResponse(response, ["payables", "pendingPayments", "pending_payments"]);
  const items = normalizePayablesResponse(response, { strictMoney: true });
  return {
    ...page,
    items,
    data: items,
  };
};

export const approvalsPaymentsBankingApi = serviceApi.injectEndpoints({
  endpoints: (builder) => ({
    getPendingApprovals: builder.query({
      query: (params) => ({ url: "/approvals/pending", method: "GET", params }),
      transformResponse: (response) =>
        extractListResponse(response).map(toInvoiceUiPayload),
      providesTags: ["Approvals"],
    }),
    getPayments: builder.query({
      query: (params) => ({ url: "/payments", method: "GET", params }),
      transformResponse: extractListResponse,
      providesTags: ["Payments"],
    }),
    getPendingPayments: builder.query({
      query: (params) => ({ url: "/payments/pending", method: "GET", params }),
      transformResponse: (response) =>
        normalizePaginatedListResponse(
          response,
          ["invoices", "pendingPayments", "pending_payments"],
          toInvoiceUiPayload,
        ),
      providesTags: ["Invoices", "Payments"],
    }),
    getPayables: builder.query({
      query: (params) => ({ url: "/payments/payables", method: "GET", params }),
      transformResponse: normalizePayablesListResponse,
      providesTags: ["Payments"],
    }),
    getPayablesSummary: builder.query({
      query: (params) => ({ url: "/payments/payables/summary", method: "GET", params }),
      transformResponse: (response) => response?.data ?? response ?? {},
      providesTags: ["Payments"],
    }),
    getReleasedPayments: builder.query({
      query: (params) => ({ url: "/payments/released", method: "GET", params }),
      transformResponse: (response) =>
        normalizePaginatedListResponse(response, ["payments", "releasedPayments", "released_payments"]),
      providesTags: ["Payments"],
    }),
    getBankingPortalTransactions: builder.query({
      query: (params) => ({ url: "/banking/portal-transactions", method: "GET", params }),
      transformResponse: (response) =>
        normalizePaginatedListResponse(response, [
          "transactions",
          "portalTransactions",
          "portal_transactions",
        ]),
      providesTags: ["Payments", "Banking"],
    }),
    getPayment: builder.query({
      query: (id) => ({ url: `/payments/${id}`, method: "GET" }),
      transformResponse: (response) => response?.payment ?? response?.data ?? response,
      providesTags: (_result, _error, id) => [{ type: "Payments", id }],
    }),
    createPayment: builder.mutation({
      query: (body) => ({
        url: "/payments",
        method: "POST",
        body: toPaymentCreateApiPayload(body),
      }),
      invalidatesTags: ["Payments", "Invoices", "Dashboard", "Reports", ...CREDIT_INVALIDATION_TAGS],
    }),
    bulkReleasePayments: builder.mutation({
      query: () => ({ url: "/payments/bulk-release", method: "POST" }),
      invalidatesTags: ["Payments", "Invoices", "Dashboard", "Reports", ...CREDIT_INVALIDATION_TAGS],
    }),
    recordPayments: builder.mutation({
      query: (body) => ({
        url: "/payments/record",
        method: "POST",
        body: toRecordPaymentsApiPayload(body),
      }),
      invalidatesTags: ["Payments", "Invoices", "Dashboard", "Reports", ...CREDIT_INVALIDATION_TAGS],
    }),
    generatePendingPaymentInvoiceReport: builder.mutation({
      query: (body) => ({
        url: "/payments/pending-invoices/report",
        method: "POST",
        body,
      }),
    }),
    getPayruns: builder.query({
      query: (params) => ({ url: "/payruns", method: "GET", params }),
      transformResponse: (response) =>
        normalizePaginatedListResponse(response, ["payruns", "paymentRuns", "payment_runs"]),
      providesTags: ["Payments"],
    }),
    getPayrun: builder.query({
      query: (payrunId) => ({ url: `/payruns/${payrunId}`, method: "GET" }),
      transformResponse: (response) => {
        const payload = Array.isArray(response?.data)
          ? response.data[0]
          : response?.data?.payrun || response?.payrun || response?.data || response;
        return normalizePayrun(payload || {});
      },
      providesTags: (_result, _error, payrunId) => [
        "Payments",
        { type: "Payments", id: `payrun-${payrunId}` },
      ],
    }),
    createPayrun: builder.mutation({
      query: (body) => ({
        url: "/payruns",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Payments", "Invoices", "Dashboard", "Reports", ...CREDIT_INVALIDATION_TAGS],
    }),
    approvePayrun: builder.mutation({
      query: ({ payrunId, invoiceIds: _invoiceIds, ...body }) => ({
        url: `/payruns/${payrunId}/approve`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { invoiceIds = [] } = {}) => [
        "Payments",
        "Invoices",
        ...invoiceIds.map((id) => ({ type: "Invoices", id })),
        "Dashboard",
        "Reports",
      ],
    }),
    rejectPayrun: builder.mutation({
      query: ({ payrunId, invoiceIds: _invoiceIds, ...body }) => ({
        url: `/payruns/${payrunId}/reject`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { invoiceIds = [] } = {}) => [
        "Payments",
        "Invoices",
        ...invoiceIds.map((id) => ({ type: "Invoices", id })),
        "Dashboard",
        "Reports",
      ],
    }),
    cancelPayrun: builder.mutation({
      query: ({ payrunId, ...body }) => ({
        url: `/payruns/${payrunId}/cancel`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Payments", "Invoices", "Dashboard", "Reports", ...CREDIT_INVALIDATION_TAGS],
    }),
    requestPayrunReleaseOtp: builder.mutation({
      query: ({ payrunId, ...body }) => ({
        url: `/payruns/${payrunId}/release-otp`,
        method: "POST",
        body,
      }),
    }),
    resendPayrunReleaseOtp: builder.mutation({
      query: ({ payrunId, ...body }) => ({
        url: `/payruns/${payrunId}/release-otp/resend`,
        method: "POST",
        body,
      }),
    }),
    releasePayrun: builder.mutation({
      query: ({ payrunId, ...body }) => ({
        url: `/payruns/${payrunId}/release`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Payments", "Invoices", "Dashboard", "Reports", ...CREDIT_INVALIDATION_TAGS],
    }),
    getBankAccounts: builder.query({
      query: () => ({ url: "/bank-accounts", method: "GET" }),
      transformResponse: (response) =>
        extractListResponse(response).map(toBankAccountUiPayload),
      providesTags: ["Banking"],
    }),
    createBankAccount: builder.mutation({
      query: (body) => ({
        url: "/bank-accounts",
        method: "POST",
        body: toBankAccountApiPayload(body),
      }),
      invalidatesTags: ["Banking"],
    }),
  }),
});

export const {
  useGetPendingApprovalsQuery,
  useGetPaymentsQuery,
  useGetPendingPaymentsQuery,
  useGetPayablesQuery,
  useGetPayablesSummaryQuery,
  useGetReleasedPaymentsQuery,
  useGetBankingPortalTransactionsQuery,
  useGetPaymentQuery,
  useLazyGetPaymentQuery,
  useCreatePaymentMutation,
  useBulkReleasePaymentsMutation,
  useRecordPaymentsMutation,
  useGeneratePendingPaymentInvoiceReportMutation,
  useGetPayrunsQuery,
  useLazyGetPayrunQuery,
  useCreatePayrunMutation,
  useApprovePayrunMutation,
  useRejectPayrunMutation,
  useCancelPayrunMutation,
  useRequestPayrunReleaseOtpMutation,
  useResendPayrunReleaseOtpMutation,
  useReleasePayrunMutation,
  useGetBankAccountsQuery,
  useCreateBankAccountMutation,
} = approvalsPaymentsBankingApi;

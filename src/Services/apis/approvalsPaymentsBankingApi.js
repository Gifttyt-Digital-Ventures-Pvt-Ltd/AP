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
  useGetPaymentQuery,
  useLazyGetPaymentQuery,
  useCreatePaymentMutation,
  useBulkReleasePaymentsMutation,
  useRecordPaymentsMutation,
  useGeneratePendingPaymentInvoiceReportMutation,
  useGetBankAccountsQuery,
  useCreateBankAccountMutation,
} = approvalsPaymentsBankingApi;

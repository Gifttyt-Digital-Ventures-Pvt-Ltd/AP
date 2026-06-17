import { serviceApi } from "../serviceApi";
import {
  toBankAccountApiPayload,
  toBankAccountUiPayload,
  toInvoiceUiPayload,
} from "../utils/payloadMappers";
import { CREDIT_INVALIDATION_TAGS } from "../../constants/creditActions";

export const approvalsPaymentsBankingApi = serviceApi.injectEndpoints({
  endpoints: (builder) => ({
    getPendingApprovals: builder.query({
      query: (params) => ({ url: "/approvals/pending", method: "GET", params }),
      transformResponse: (response) =>
        Array.isArray(response) ? response.map(toInvoiceUiPayload) : [],
      providesTags: ["Approvals"],
    }),
    getPayments: builder.query({
      query: (params) => ({ url: "/payments", method: "GET", params }),
      providesTags: ["Payments"],
    }),
    createPayment: builder.mutation({
      query: (body) => ({ url: "/payments", method: "POST", body }),
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
        body,
      }),
      invalidatesTags: ["Payments", "Invoices", "Dashboard", "Reports", ...CREDIT_INVALIDATION_TAGS],
    }),
    getBankAccounts: builder.query({
      query: () => ({ url: "/bank-accounts", method: "GET" }),
      transformResponse: (response) =>
        Array.isArray(response)
          ? response.map(toBankAccountUiPayload)
          : toBankAccountUiPayload(response),
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
  useCreatePaymentMutation,
  useBulkReleasePaymentsMutation,
  useRecordPaymentsMutation,
  useGetBankAccountsQuery,
  useCreateBankAccountMutation,
} = approvalsPaymentsBankingApi;

import { serviceApi } from "../serviceApi";
import {
  toBankAccountApiPayload,
  toBankAccountUiPayload,
} from "../utils/payloadMappers";

export const approvalsPaymentsBankingApi = serviceApi.injectEndpoints({
  endpoints: (builder) => ({
    getPendingApprovals: builder.query({
      query: () => ({ url: "/approvals/pending", method: "GET" }),
      providesTags: ["Approvals"],
    }),
    getPayments: builder.query({
      query: () => ({ url: "/payments", method: "GET" }),
      providesTags: ["Payments"],
    }),
    createPayment: builder.mutation({
      query: (body) => ({ url: "/payments", method: "POST", body }),
      invalidatesTags: ["Payments", "Invoices", "Dashboard", "Reports"],
    }),
    bulkReleasePayments: builder.mutation({
      query: () => ({ url: "/payments/bulk-release", method: "POST" }),
      invalidatesTags: ["Payments", "Invoices", "Dashboard", "Reports"],
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
  useGetBankAccountsQuery,
  useCreateBankAccountMutation,
} = approvalsPaymentsBankingApi;

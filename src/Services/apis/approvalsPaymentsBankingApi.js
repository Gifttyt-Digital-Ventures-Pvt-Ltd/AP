import { serviceApi } from "../serviceApi";
import { toInvoiceUiPayload } from "../utils/payloadMappers";

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
      invalidatesTags: ["Payments", "Invoices", "Dashboard", "Reports"],
    }),
    bulkReleasePayments: builder.mutation({
      query: () => ({ url: "/payments/bulk-release", method: "POST" }),
      invalidatesTags: ["Payments", "Invoices", "Dashboard", "Reports"],
    }),
    recordPayments: builder.mutation({
      query: (body) => ({
        url: "/payments/record",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Payments", "Invoices", "Dashboard", "Reports"],
    }),
  }),
});

export const {
  useGetPendingApprovalsQuery,
  useGetPaymentsQuery,
  useCreatePaymentMutation,
  useBulkReleasePaymentsMutation,
  useRecordPaymentsMutation,
} = approvalsPaymentsBankingApi;

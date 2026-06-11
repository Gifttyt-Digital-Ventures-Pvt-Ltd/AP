import { serviceApi } from "../serviceApi";

const asList = (response, key) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.[key])) return response[key];
  return [];
};

export const connectedBankingApi = serviceApi.injectEndpoints({
  endpoints: (builder) => ({
    getBankingCapabilities: builder.query({
      query: () => ({ url: "/banking/capabilities", method: "GET" }),
      providesTags: ["ConnectedBanking"],
    }),
    getLinkedBankingAccounts: builder.query({
      query: () => ({ url: "/banking/accounts", method: "GET" }),
      transformResponse: (response) => asList(response, "accounts"),
      providesTags: ["ConnectedBanking"],
    }),
    linkBankingAccount: builder.mutation({
      query: (body) => ({
        url: "/banking/accounts/link",
        method: "POST",
        body,
      }),
      invalidatesTags: ["ConnectedBanking"],
    }),
    getCibRegistrationStatus: builder.query({
      query: () => ({ url: "/banking/cib-registration/status", method: "GET" }),
      providesTags: ["ConnectedBanking"],
    }),
    registerCib: builder.mutation({
      query: () => ({ url: "/banking/cib-registration", method: "POST" }),
      invalidatesTags: ["ConnectedBanking"],
    }),
    getBeneficiaries: builder.query({
      query: () => ({ url: "/banking/beneficiaries", method: "GET" }),
      transformResponse: (response) => asList(response, "beneficiaries"),
      providesTags: ["ConnectedBanking"],
    }),
    registerBeneficiary: builder.mutation({
      query: (body) => ({
        url: "/banking/beneficiaries",
        method: "POST",
        body,
      }),
      invalidatesTags: ["ConnectedBanking", "Vendors"],
    }),
    getBeneficiaryStatus: builder.query({
      query: (bnfId) => ({
        url: `/banking/beneficiaries/${bnfId}/status`,
        method: "GET",
      }),
      providesTags: (_result, _error, bnfId) => [
        { type: "ConnectedBanking", id: `bene-${bnfId}` },
      ],
    }),
    getBankingPayouts: builder.query({
      query: () => ({ url: "/banking/payouts", method: "GET" }),
      transformResponse: (response) => asList(response, "payouts"),
      providesTags: ["ConnectedBanking"],
    }),
    getBankingPayoutById: builder.query({
      query: (payoutId) => ({
        url: `/banking/payouts/${payoutId}`,
        method: "GET",
      }),
      providesTags: (_result, _error, payoutId) => [
        { type: "ConnectedBanking", id: `payout-${payoutId}` },
      ],
    }),
    createBankingPayout: builder.mutation({
      query: (body) => ({
        url: "/banking/payouts",
        method: "POST",
        body,
      }),
      invalidatesTags: ["ConnectedBanking", "Payments", "Invoices", "Dashboard"],
    }),
    createBulkBankingPayouts: builder.mutation({
      query: (body) => ({
        url: "/banking/payouts/bulk",
        method: "POST",
        body,
      }),
      invalidatesTags: ["ConnectedBanking", "Payments", "Invoices", "Dashboard"],
    }),
  }),
});

export const {
  useGetBankingCapabilitiesQuery,
  useGetLinkedBankingAccountsQuery,
  useLinkBankingAccountMutation,
  useGetCibRegistrationStatusQuery,
  useRegisterCibMutation,
  useGetBeneficiariesQuery,
  useRegisterBeneficiaryMutation,
  useGetBeneficiaryStatusQuery,
  useGetBankingPayoutsQuery,
  useGetBankingPayoutByIdQuery,
  useCreateBankingPayoutMutation,
  useCreateBulkBankingPayoutsMutation,
} = connectedBankingApi;

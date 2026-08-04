import { serviceApi } from "../serviceApi";

const asList = (response, key) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.[key])) return response[key];
  return [];
};

const normalizeBankingAccount = (account = {}) => ({
  ...account,
  id: account.id ?? account.accountId ?? account.account_id ?? account.bankAccountId,
  bank: account.bank ?? account.bankCode ?? account.bank_code,
  bankName: account.bankName ?? account.bank_name ?? account.bank,
  accountName: account.accountName ?? account.account_name,
  accountType: account.accountType ?? account.account_type,
  accountNumber: account.accountNumber ?? account.account_number,
  maskedAccountNumber:
    account.maskedAccountNumber ?? account.masked_account_number,
  ifsc: account.ifsc ?? account.ifscCode ?? account.ifsc_code,
  status: account.status ?? account.linkStatus ?? account.link_status,
  verificationStatus:
    account.verificationStatus ??
    account.verification_status ??
    account.reviewStatus ??
    account.review_status,
  isActive: account.isActive ?? account.is_active,
  submittedBy: account.submittedBy ?? account.submitted_by,
  submittedAt: account.submittedAt ?? account.submitted_at,
  reviewedBy: account.reviewedBy ?? account.reviewed_by,
  reviewedAt: account.reviewedAt ?? account.reviewed_at,
  reviewComment: account.reviewComment ?? account.review_comment,
  availableBalance:
    account.availableBalance ??
    account.available_balance ??
    account.balance ??
    account.currentBalance,
});

const normalizeBankingBalance = (balance = {}) => ({
  ...balance,
  accountId:
    balance.accountId ??
    balance.account_id ??
    balance.bankAccountId ??
    balance.bank_account_id,
  availableBalance:
    balance.availableBalance ??
    balance.available_balance ??
    balance.balance ??
    balance.currentBalance,
  balanceFetchedAt:
    balance.balanceFetchedAt ??
    balance.balance_fetched_at ??
    balance.fetchedAt ??
    balance.fetched_at ??
    balance.updatedAt ??
    balance.updated_at,
  balanceStatus:
    balance.balanceStatus ??
    balance.balance_status ??
    balance.status,
  balanceMessage:
    balance.balanceMessage ??
    balance.balance_message ??
    balance.message,
});

const normalizeBankingStatementTransaction = (transaction = {}) => ({
  ...transaction,
  id:
    transaction.id ??
    transaction.transactionId ??
    transaction.transaction_id ??
    transaction.referenceNumber ??
    transaction.reference_number ??
    transaction.utr,
  transactionDate:
    transaction.transactionDate ??
    transaction.transaction_date ??
    transaction.date ??
    transaction.valueDate ??
    transaction.value_date,
  description:
    transaction.description ??
    transaction.narration ??
    transaction.remarks ??
    transaction.type,
  referenceNumber:
    transaction.referenceNumber ??
    transaction.reference_number ??
    transaction.bankReference ??
    transaction.bank_reference,
  utr:
    transaction.utr ??
    transaction.utrNumber ??
    transaction.utr_number,
  type:
    transaction.type ??
    transaction.transactionType ??
    transaction.transaction_type,
  amount: transaction.amount,
  rawStatus:
    transaction.rawStatus ??
    transaction.raw_status ??
    transaction.status,
});

const normalizeBeneficiary = (beneficiary = {}) => ({
  ...beneficiary,
  id:
    beneficiary.id ??
    beneficiary.bnfId ??
    beneficiary.beneficiaryId ??
    beneficiary.beneficiary_id,
  bnfId:
    beneficiary.bnfId ??
    beneficiary.beneficiaryId ??
    beneficiary.beneficiary_id ??
    beneficiary.id,
  bankAccountId:
    beneficiary.bankAccountId ??
    beneficiary.bank_account_id ??
    beneficiary.sourceBankAccountId,
  vendorId: beneficiary.vendorId ?? beneficiary.vendor_id,
  name:
    beneficiary.name ??
    beneficiary.beneficiaryName ??
    beneficiary.beneficiary_name,
  accountNumber:
    beneficiary.accountNumber ??
    beneficiary.account_number ??
    beneficiary.creditAccountNumber,
  ifsc: beneficiary.ifsc ?? beneficiary.ifscCode ?? beneficiary.ifsc_code,
  status:
    beneficiary.status ??
    beneficiary.normalizedStatus ??
    beneficiary.normalized_status ??
    "PENDING",
  availableAt: beneficiary.availableAt ?? beneficiary.available_at,
  verified:
    beneficiary.verified ??
    beneficiary.isVerified ??
    beneficiary.validationStatus === "SUCCESS",
});

export const connectedBankingApi = serviceApi.injectEndpoints({
  endpoints: (builder) => ({
    getLinkedBankingAccounts: builder.query({
      query: () => ({ url: "/banking/accounts", method: "GET" }),
      transformResponse: (response) =>
        asList(response, "accounts").map(normalizeBankingAccount),
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
    updateBankingAccount: builder.mutation({
      query: ({ accountId, ...body }) => ({
        url: `/banking/accounts/${accountId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["ConnectedBanking"],
    }),
    deleteBankingAccount: builder.mutation({
      query: (accountId) => ({
        url: `/banking/accounts/${accountId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["ConnectedBanking"],
    }),
    updateBankingAccountStatus: builder.mutation({
      query: ({ accountId, isActive, reason }) => ({
        url: `/banking/accounts/${accountId}/status`,
        method: "PATCH",
        body: {
          isActive,
          ...(reason ? { reason } : {}),
        },
      }),
      invalidatesTags: ["ConnectedBanking"],
    }),
    getBankingAccountBalance: builder.query({
      query: (accountId) => ({
        url: `/banking/accounts/${accountId}/balance`,
        method: "POST",
      }),
      transformResponse: (response) =>
        normalizeBankingBalance(response?.balance ?? response),
      providesTags: (_result, _error, accountId) => [
        { type: "ConnectedBanking", id: `balance-${accountId}` },
      ],
    }),
    getBankingAccountStatement: builder.query({
      query: ({ accountId, fromDate, toDate, cursor } = {}) => ({
        url: `/banking/accounts/${accountId}/statement`,
        method: "GET",
        params: {
          ...(fromDate ? { fromDate } : {}),
          ...(toDate ? { toDate } : {}),
          ...(cursor ? { cursor } : {}),
        },
      }),
      transformResponse: (response) => ({
        ...(response || {}),
        transactions: asList(response, "transactions").map(normalizeBankingStatementTransaction),
      }),
      providesTags: (_result, _error, args) => [
        { type: "ConnectedBanking", id: `statement-${args?.accountId}` },
      ],
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
      transformResponse: (response) =>
        asList(response, "beneficiaries").map(normalizeBeneficiary),
      providesTags: ["ConnectedBanking"],
    }),
    validateBeneficiary: builder.mutation({
      query: (body) => ({
        url: "/banking/beneficiaries/validate",
        method: "POST",
        body,
      }),
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
  }),
});

export const {
  useGetLinkedBankingAccountsQuery,
  useLinkBankingAccountMutation,
  useUpdateBankingAccountMutation,
  useDeleteBankingAccountMutation,
  useUpdateBankingAccountStatusMutation,
  useGetBankingAccountBalanceQuery,
  useGetBankingAccountStatementQuery,
  useGetCibRegistrationStatusQuery,
  useRegisterCibMutation,
  useGetBeneficiariesQuery,
  useValidateBeneficiaryMutation,
  useRegisterBeneficiaryMutation,
  useGetBeneficiaryStatusQuery,
} = connectedBankingApi;

import { serviceApi } from "../serviceApi";
import { asCreditItems, toCreditDecimalString } from "../../utils/creditMath";

const CLIENT_CREDITS_BASE = "/client";

const withParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  );

const normalizeLedgerResponse = (response = {}) => ({
  items: asCreditItems(response),
  page: Number(response?.page) || 1,
  pageSize: Number(response?.pageSize) || asCreditItems(response).length || 25,
  total: Number.isFinite(response?.total) ? response.total : asCreditItems(response).length,
});

const normalizeActionTypesResponse = (response = {}) => {
  const items = asCreditItems(response).map((item) => ({
    ...item,
    isEnabled: item.enabled ?? item.isEnabled ?? true,
    currentRate: item.currentRate ?? item.creditsPerUnit ?? item.rate ?? "0",
  }));

  return {
    items,
    total: Number.isFinite(response?.total) ? response.total : items.length,
  };
};

const buildWalletSettingsBody = (body = {}) => ({
  lowBalanceThreshold: toCreditDecimalString(body?.lowBalanceThreshold),
  lowBalanceAlertEmails: String(body?.lowBalanceAlertEmails || "").trim(),
  lowBalanceAlertRecipientIds: Array.isArray(body?.lowBalanceAlertRecipientIds)
    ? body.lowBalanceAlertRecipientIds
    : [],
  lowBalanceAlertRecipients: Array.isArray(body?.lowBalanceAlertRecipients)
    ? body.lowBalanceAlertRecipients
    : [],
});

const buildTokenTopUpBody = (body = {}) => ({
  amount: toCreditDecimalString(body?.amount),
  utr: String(body?.utr || "").trim(),
  accountNumber: String(body?.accountNumber || "").trim(),
});

export const creditsApi = serviceApi.injectEndpoints({
  endpoints: (builder) => ({
    getClientWallet: builder.query({
      query: () => ({
        url: `${CLIENT_CREDITS_BASE}/wallet`,
        method: "GET",
      }),
      providesTags: ["Credits"],
    }),
    getClientWalletSummary: builder.query({
      query: () => ({
        url: `${CLIENT_CREDITS_BASE}/wallet/summary`,
        method: "GET",
      }),
      providesTags: ["Credits"],
    }),
    getClientLedger: builder.query({
      query: (params = {}) => ({
        url: `${CLIENT_CREDITS_BASE}/ledger`,
        method: "GET",
        params: withParams({
          ...params,
          type:
            params?.type && String(params.type).toUpperCase() !== "ALL"
              ? params.type
              : undefined,
        }),
      }),
      transformResponse: normalizeLedgerResponse,
      providesTags: ["Credits"],
    }),
    getClientActionTypes: builder.query({
      query: () => ({
        url: `${CLIENT_CREDITS_BASE}/action-types`,
        method: "GET",
      }),
      transformResponse: normalizeActionTypesResponse,
      providesTags: ["Credits"],
    }),
    updateClientWalletSettings: builder.mutation({
      query: (body) => ({
        url: `${CLIENT_CREDITS_BASE}/wallet/settings`,
        method: "PATCH",
        body: buildWalletSettingsBody(body),
      }),
      invalidatesTags: ["Credits"],
    }),
    requestClientTokenTopUp: builder.mutation({
      query: (body) => ({
        url: `${CLIENT_CREDITS_BASE}/ap/token-requests`,
        method: "POST",
        body: buildTokenTopUpBody(body),
      }),
      invalidatesTags: ["Credits"],
    }),
  }),
});

export const {
  useGetClientWalletQuery,
  useGetClientWalletSummaryQuery,
  useGetClientLedgerQuery,
  useGetClientActionTypesQuery,
  useUpdateClientWalletSettingsMutation,
  useRequestClientTokenTopUpMutation,
} = creditsApi;

import { serviceApi } from "../serviceApi";
import {
  normalizeCoaTreeResponse,
  normalizeLedgerDetailResponse,
  normalizeReadyQueueResponse,
} from "../../pages/accounting/utils/coaUtils";

const ACCOUNTING_BASE = "/accounting";

const withParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => {
      if (value === undefined || value === null || value === "") return false;
      if (typeof value === "string" && value.toUpperCase() === "ALL") return false;
      return true;
    }),
  );

export const accountingApi = serviceApi.injectEndpoints({
  endpoints: (builder) => ({
    getCoaTree: builder.query({
      query: () => ({ url: `${ACCOUNTING_BASE}/coa/tree`, method: "GET" }),
      transformResponse: (response) => normalizeCoaTreeResponse(response),
      providesTags: ["Accounting"],
    }),
    syncCoa: builder.mutation({
      query: () => ({ url: `${ACCOUNTING_BASE}/coa/sync`, method: "POST" }),
      transformResponse: (response) => normalizeCoaTreeResponse(response),
      invalidatesTags: ["Accounting"],
    }),
    getLedger: builder.query({
      query: (ledgerId) => ({
        url: `${ACCOUNTING_BASE}/ledgers/${ledgerId}`,
        method: "GET",
      }),
      transformResponse: (response) => normalizeLedgerDetailResponse(response),
      providesTags: (_result, _error, ledgerId) => [{ type: "Accounting", id: ledgerId }],
    }),
    getAccountingReadyQueue: builder.query({
      query: (params = {}) => ({
        url: `${ACCOUNTING_BASE}/ready`,
        method: "GET",
        params: withParams(params),
      }),
      transformResponse: (response) => normalizeReadyQueueResponse(response),
      providesTags: ["Accounting"],
    }),
    syncAccountingReadyItem: builder.mutation({
      query: ({ id }) => ({
        url: `${ACCOUNTING_BASE}/ready/${id}/sync`,
        method: "POST",
      }),
      invalidatesTags: ["Accounting"],
    }),
    bulkSyncAccountingReadyItems: builder.mutation({
      query: ({ ids = [], mode = "SYNC" } = {}) => ({
        url: `${ACCOUNTING_BASE}/ready/bulk-sync`,
        method: "POST",
        body: { ids, mode },
      }),
      invalidatesTags: ["Accounting"],
    }),
    retryAccountingReadyItem: builder.mutation({
      query: ({ id }) => ({
        url: `${ACCOUNTING_BASE}/ready/${id}/retry`,
        method: "POST",
      }),
      invalidatesTags: ["Accounting"],
    }),
    requestAccountingReadyUnlock: builder.mutation({
      query: ({ id, objectType, objectId } = {}) => ({
        url: id
          ? `${ACCOUNTING_BASE}/ready/${id}/unlock-request`
          : `${ACCOUNTING_BASE}/ready/unlock-request`,
        method: "POST",
        body: id ? undefined : { objectType, objectId },
      }),
      invalidatesTags: ["Accounting"],
    }),
    approveAccountingReadyUnlock: builder.mutation({
      query: ({ id }) => ({
        url: `${ACCOUNTING_BASE}/ready/${id}/unlock-approve`,
        method: "POST",
      }),
      invalidatesTags: ["Accounting"],
    }),
    getAccountingSyncLogs: builder.query({
      query: () => ({
        url: `${ACCOUNTING_BASE}/sync-logs`,
        method: "GET",
      }),
      providesTags: ["Accounting"],
    }),
    downloadAccountingSyncLogs: builder.mutation({
      query: () => ({
        url: `${ACCOUNTING_BASE}/sync-logs/export`,
        method: "GET",
        responseHandler: async (response) => response.blob(),
      }),
    }),
  }),
});

export const {
  useGetCoaTreeQuery,
  useSyncCoaMutation,
  useGetLedgerQuery,
  useLazyGetLedgerQuery,
  useGetAccountingReadyQueueQuery,
  useSyncAccountingReadyItemMutation,
  useBulkSyncAccountingReadyItemsMutation,
  useRetryAccountingReadyItemMutation,
  useRequestAccountingReadyUnlockMutation,
  useApproveAccountingReadyUnlockMutation,
  useGetAccountingSyncLogsQuery,
  useDownloadAccountingSyncLogsMutation,
} = accountingApi;

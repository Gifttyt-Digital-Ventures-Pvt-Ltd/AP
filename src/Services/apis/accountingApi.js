import { serviceApi } from "../serviceApi";
import {
  normalizeCoaTreeResponse,
  normalizeLedgerDetailResponse,
  normalizeReadyQueueResponse,
} from "../../pages/accounting/utils/coaUtils";
import { normalizeVoucherTypeOptions } from "../../pages/invoices/utils/invoiceAccountingFields";

const ACCOUNTING_BASE = "/accounting";
const COA_SYNC_OBJECT = "CHART_OF_ACCOUNTS";
const COA_SYNC_DIRECTION = "PULL";

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
      query: ({ erpSource, direction = COA_SYNC_DIRECTION } = {}) => ({
        url: `${ACCOUNTING_BASE}/coa/sync`,
        method: "POST",
        body: withParams({
          object: COA_SYNC_OBJECT,
          direction,
          erpSource,
        }),
      }),
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
    createLedger: builder.mutation({
      query: (body = {}) => ({
        url: `${ACCOUNTING_BASE}/ledgers`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Accounting"],
    }),
    updateLedger: builder.mutation({
      query: ({ ledgerId, body } = {}) => ({
        url: `${ACCOUNTING_BASE}/ledgers/${ledgerId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, arg = {}) => [
        "Accounting",
        { type: "Accounting", id: arg.ledgerId },
      ],
    }),
    createAccountCategory: builder.mutation({
      query: (body = {}) => ({
        url: `${ACCOUNTING_BASE}/categories`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Accounting"],
    }),
    updateAccountCategory: builder.mutation({
      query: ({ categoryId, body } = {}) => ({
        url: `${ACCOUNTING_BASE}/categories/${categoryId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Accounting"],
    }),
    createAccountGroup: builder.mutation({
      query: (body = {}) => ({
        url: `${ACCOUNTING_BASE}/groups`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Accounting"],
    }),
    updateAccountGroup: builder.mutation({
      query: ({ groupId, body } = {}) => ({
        url: `${ACCOUNTING_BASE}/groups/${groupId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Accounting"],
    }),
    getAccountingVoucherTypes: builder.query({
      query: () => ({ url: `${ACCOUNTING_BASE}/voucher-types`, method: "GET" }),
      transformResponse: (response) => normalizeVoucherTypeOptions(response),
      providesTags: [{ type: "Accounting", id: "VOUCHER_TYPES" }],
    }),
    getAccountingReadyQueue: builder.query({
      query: (params = {}) => ({
        url: `${ACCOUNTING_BASE}/queue`,
        method: "GET",
        params: withParams(params),
      }),
      transformResponse: (response) => normalizeReadyQueueResponse(response),
      providesTags: ["Accounting"],
    }),
    getAccountingQueueItemDetail: builder.query({
      query: ({ objectType, objectId } = {}) => ({
        url: `${ACCOUNTING_BASE}/queue/item-detail`,
        method: "GET",
        params: withParams({ objectType, objectId }),
      }),
      transformResponse: (response) =>
        response?.objectType || response?.accountingMetadata || response?.queue
          ? response
          : response?.data ?? response,
      providesTags: (_result, _error, arg = {}) => [
        {
          type: "Accounting",
          id: `QUEUE_DETAIL_${arg.objectType || "UNKNOWN"}_${arg.objectId || "UNKNOWN"}`,
        },
      ],
    }),
    markAccountingReadyItem: builder.mutation({
      query: ({ objectType, objectId } = {}) => ({
        url: `${ACCOUNTING_BASE}/ready`,
        method: "POST",
        body: { objectType, objectId },
      }),
      invalidatesTags: ["Accounting"],
    }),
    bulkMarkAccountingReadyItems: builder.mutation({
      query: ({ items = [] } = {}) => ({
        url: `${ACCOUNTING_BASE}/ready/bulk`,
        method: "POST",
        body: { items },
      }),
      invalidatesTags: ["Accounting"],
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
    directUnlockAccountingReadyItem: builder.mutation({
      query: ({ id }) => ({
        url: `${ACCOUNTING_BASE}/ready/${id}/unlock`,
        method: "POST",
      }),
      invalidatesTags: ["Accounting"],
    }),
    getAccountingSyncLogs: builder.query({
      query: (params = {}) => ({
        url: `${ACCOUNTING_BASE}/sync-logs`,
        method: "GET",
        params: withParams(params),
      }),
      providesTags: ["Accounting"],
    }),
    downloadAccountingSyncLogs: builder.mutation({
      query: (params = {}) => ({
        url: `${ACCOUNTING_BASE}/sync-logs/export`,
        method: "GET",
        params: withParams(params),
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
  useCreateLedgerMutation,
  useUpdateLedgerMutation,
  useCreateAccountCategoryMutation,
  useUpdateAccountCategoryMutation,
  useCreateAccountGroupMutation,
  useUpdateAccountGroupMutation,
  useGetAccountingVoucherTypesQuery,
  useGetAccountingReadyQueueQuery,
  useLazyGetAccountingQueueItemDetailQuery,
  useMarkAccountingReadyItemMutation,
  useBulkMarkAccountingReadyItemsMutation,
  useSyncAccountingReadyItemMutation,
  useBulkSyncAccountingReadyItemsMutation,
  useRetryAccountingReadyItemMutation,
  useRequestAccountingReadyUnlockMutation,
  useApproveAccountingReadyUnlockMutation,
  useDirectUnlockAccountingReadyItemMutation,
  useGetAccountingSyncLogsQuery,
  useDownloadAccountingSyncLogsMutation,
} = accountingApi;

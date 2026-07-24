import { serviceApi } from "../serviceApi";
import { extractListResponse } from "../utils/payloadMappers";
import { normalizeApIntegrationSummary } from "../../pages/integrations/integrationSummary";
import {
  buildSyncDataCategoriesPath,
  buildSyncDataImportPath,
  buildSyncDataImportPayload,
  buildSyncDataItemsPath,
  normalizeSyncDataCategoriesResponse,
  normalizeSyncDataImportResponse,
  normalizeSyncDataItemsResponse,
  SYNC_DATA_LIMIT,
} from "../../pages/integrations/syncDataUtils";

const ZOHO_BASE = "/integration/zoho";
const GMAIL_BASE = "/integration/gmail";
const TALLY_BASE = "/integration/tally";
const AP_INTEGRATIONS_BASE = "/accounts-payable/integrations";

const withParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  );

export const integrationsApi = serviceApi.injectEndpoints({
  endpoints: (builder) => ({
    getApIntegrationSummary: builder.query({
      query: () => ({
        url: `${AP_INTEGRATIONS_BASE}/summary`,
        method: "GET",
      }),
      transformResponse: normalizeApIntegrationSummary,
      providesTags: ["ApIntegrationSummary"],
    }),
    getIntegrationProviders: builder.query({
      query: () => ({ url: `${ZOHO_BASE}/providers`, method: "GET" }),
      transformResponse: (response) =>
        extractListResponse(response, ["providers"]),
      providesTags: ["Integrations"],
    }),
    getIntegrationConnections: builder.query({
      query: () => ({ url: `${ZOHO_BASE}/connections`, method: "GET" }),
      transformResponse: (response) =>
        extractListResponse(response, ["connections"]),
      providesTags: ["Integrations"],
    }),
    getIntegrationConnection: builder.query({
      query: (connectionId) => ({
        url: `${ZOHO_BASE}/connections/${connectionId}`,
        method: "GET",
      }),
      providesTags: ["Integrations"],
    }),
    createZohoConnection: builder.mutation({
      query: (body) => ({
        url: `${ZOHO_BASE}/connections`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Integrations", "ApIntegrationSummary"],
    }),
    getZohoConnectionStatus: builder.query({
      query: (connectionId) => ({
        url: `${ZOHO_BASE}/connections/${connectionId}/status`,
        method: "GET",
      }),
      providesTags: ["Integrations"],
    }),
    getZohoOrganizations: builder.query({
      query: (connectionId) => ({
        url: `${ZOHO_BASE}/connections/${connectionId}/organizations`,
        method: "GET",
      }),
      transformResponse: (response) =>
        extractListResponse(response, ["organizations"]),
      providesTags: ["Integrations"],
    }),
    bindZohoOrganization: builder.mutation({
      query: ({ connectionId, organizationId }) => ({
        url: `${ZOHO_BASE}/connections/${connectionId}/organization`,
        method: "POST",
        body: { organizationId },
      }),
      invalidatesTags: ["Integrations", "ApIntegrationSummary"],
    }),
    disconnectZohoConnection: builder.mutation({
      query: (connectionId) => ({
        url: `${ZOHO_BASE}/connections/${connectionId}/disconnect`,
        method: "POST",
      }),
      invalidatesTags: ["Integrations", "ApIntegrationSummary"],
    }),
    getIntegrationMappings: builder.query({
      query: (connectionId) => ({
        url: `${ZOHO_BASE}/connections/${connectionId}/mappings`,
        method: "GET",
      }),
      providesTags: ["Integrations"],
    }),
    updateIntegrationMappings: builder.mutation({
      query: ({ connectionId, body }) => ({
        url: `${ZOHO_BASE}/connections/${connectionId}/mappings`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Integrations"],
    }),
    getIntegrationSyncStatus: builder.query({
      query: (connectionId) => ({
        url: `${ZOHO_BASE}/connections/${connectionId}/sync-status`,
        method: "GET",
      }),
      providesTags: ["Integrations"],
    }),
    triggerIntegrationSync: builder.mutation({
      query: ({ connectionId, object }) => ({
        url: `${ZOHO_BASE}/connections/${connectionId}/sync`,
        method: "POST",
        body: withParams({ object }),
      }),
      invalidatesTags: ["Integrations"],
    }),
    getIntegrationReviewQueue: builder.query({
      query: ({ connectionId, object } = {}) => ({
        url: `${ZOHO_BASE}/connections/${connectionId}/review-queue`,
        method: "GET",
        params: withParams({ object }),
      }),
      transformResponse: extractListResponse,
      providesTags: ["Integrations"],
    }),
    resolveIntegrationMatch: builder.mutation({
      query: ({ connectionId, reviewId, resolution }) => ({
        url: `${ZOHO_BASE}/connections/${connectionId}/review-queue/${reviewId}/resolve`,
        method: "POST",
        body: resolution,
      }),
      invalidatesTags: ["Integrations"],
    }),
    getIntegrationLogs: builder.query({
      query: ({ connectionId, object, page = 1, perPage = 50 } = {}) => ({
        url: `${ZOHO_BASE}/connections/${connectionId}/logs`,
        method: "GET",
        params: withParams({ object, page, perPage }),
      }),
      transformResponse: extractListResponse,
      providesTags: ["Integrations"],
    }),
    getGmailConnections: builder.query({
      query: () => ({ url: `${GMAIL_BASE}/connections`, method: "GET" }),
      transformResponse: (response) =>
        extractListResponse(response, ["connections"]),
      providesTags: ["Integrations"],
    }),
    getGmailConnection: builder.query({
      query: (connectionId) => ({
        url: `${GMAIL_BASE}/connections/${connectionId}`,
        method: "GET",
      }),
      providesTags: ["Integrations"],
    }),
    createGmailConnection: builder.mutation({
      query: () => ({
        url: `${GMAIL_BASE}/connect`,
        method: "POST",
      }),
      invalidatesTags: ["Integrations", "ApIntegrationSummary"],
    }),
    disconnectGmailConnection: builder.mutation({
      query: (connectionId) => ({
        url: `${GMAIL_BASE}/connections/${connectionId}/disconnect`,
        method: "POST",
      }),
      invalidatesTags: ["Integrations", "ApIntegrationSummary"],
    }),
    syncGmailConnection: builder.mutation({
      query: (connectionId) => ({
        url: `${GMAIL_BASE}/connections/${connectionId}/sync`,
        method: "POST",
      }),
      invalidatesTags: ["Integrations", "ApIntegrationSummary"],
    }),
    getTallyProviders: builder.query({
      query: () => ({ url: `${TALLY_BASE}/providers`, method: "GET" }),
      providesTags: ["Integrations"],
    }),
    getTallyConnections: builder.query({
      query: () => ({ url: `${TALLY_BASE}/connections`, method: "GET" }),
      providesTags: ["Integrations"],
    }),
    getTallyConnection: builder.query({
      query: (connectionId) => ({
        url: `${TALLY_BASE}/connections/${connectionId}`,
        method: "GET",
      }),
      providesTags: ["Integrations"],
    }),
    createTallyConnection: builder.mutation({
      query: (body = {}) => ({
        url: `${TALLY_BASE}/connections`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Integrations", "ApIntegrationSummary"],
    }),
    disconnectTallyConnection: builder.mutation({
      query: (connectionId) => ({
        url: `${TALLY_BASE}/connections/${connectionId}/disconnect`,
        method: "POST",
      }),
      invalidatesTags: ["Integrations", "ApIntegrationSummary"],
    }),
    triggerTallySync: builder.mutation({
      query: ({
        connectionId,
        object = "ALL",
        direction = "PULL",
        ids,
      } = {}) => ({
        url: `${TALLY_BASE}/connections/${connectionId}/sync`,
        method: "POST",
        body: withParams({ object, direction, ids }),
      }),
      invalidatesTags: ["Integrations", "ApIntegrationSummary"],
    }),
    getTallySyncStatus: builder.query({
      query: (connectionId) => ({
        url: `${TALLY_BASE}/connections/${connectionId}/sync-status`,
        method: "GET",
      }),
      providesTags: ["Integrations"],
    }),
    getTallyLogs: builder.query({
      query: ({ connectionId, object, page = 1, perPage = 50 } = {}) => ({
        url: `${TALLY_BASE}/connections/${connectionId}/logs`,
        method: "GET",
        params: withParams({ object, page, perPage }),
      }),
      transformResponse: extractListResponse,
      providesTags: ["Integrations"],
    }),
    downloadTallyWindowsConnector: builder.query({
      query: () => ({
        url: "/downloads/windows",
        method: "GET",
        responseHandler: async (response) => {
          const contentType = response.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            return response.json();
          }
          if (contentType.startsWith("text/")) {
            const text = await response.text();
            try {
              return JSON.parse(text);
            } catch {
              return { downloadUrl: text };
            }
          }
          return response.blob();
        },
        cache: "no-cache",
      }),
    }),
    getSyncDataCategories: builder.query({
      query: ({ provider, connectionId } = {}) => {
        const url = buildSyncDataCategoriesPath({ provider, connectionId });
        if (!url) {
          throw new Error("Granular sync data is unavailable for this provider");
        }
        return { url, method: "GET" };
      },
      transformResponse: normalizeSyncDataCategoriesResponse,
      providesTags: ["Integrations"],
    }),
    getSyncDataItems: builder.query({
      query: ({
        provider,
        connectionId,
        categoryCode,
        search = "",
        limit = SYNC_DATA_LIMIT,
        offset = 0,
        importedOnly = false,
      } = {}) => {
        const url = buildSyncDataItemsPath({ provider, connectionId, categoryCode });
        if (!url) {
          throw new Error("Granular sync data is unavailable for this provider");
        }
        return {
          url,
          method: "GET",
          params: withParams({ search, limit, offset, importedOnly }),
        };
      },
      transformResponse: normalizeSyncDataItemsResponse,
      providesTags: ["Integrations"],
    }),
    importSyncDataItems: builder.mutation({
      query: ({ provider, connectionId, categoryCode, itemIds } = {}) => {
        const url = buildSyncDataImportPath({ provider, connectionId, categoryCode });
        if (!url) {
          throw new Error("Granular sync data is unavailable for this provider");
        }
        return {
          url,
          method: "POST",
          body: buildSyncDataImportPayload(itemIds),
        };
      },
      transformResponse: normalizeSyncDataImportResponse,
      invalidatesTags: ["Integrations", "ApIntegrationSummary"],
    }),
  }),
});

export const {
  useGetApIntegrationSummaryQuery,
  useGetIntegrationProvidersQuery,
  useGetIntegrationConnectionsQuery,
  useGetIntegrationConnectionQuery,
  useCreateZohoConnectionMutation,
  useGetZohoConnectionStatusQuery,
  useGetZohoOrganizationsQuery,
  useBindZohoOrganizationMutation,
  useDisconnectZohoConnectionMutation,
  useGetIntegrationMappingsQuery,
  useUpdateIntegrationMappingsMutation,
  useGetIntegrationSyncStatusQuery,
  useTriggerIntegrationSyncMutation,
  useGetIntegrationReviewQueueQuery,
  useResolveIntegrationMatchMutation,
  useGetIntegrationLogsQuery,
  useGetGmailConnectionsQuery,
  useGetGmailConnectionQuery,
  useCreateGmailConnectionMutation,
  useDisconnectGmailConnectionMutation,
  useSyncGmailConnectionMutation,
  useGetTallyProvidersQuery,
  useGetTallyConnectionsQuery,
  useGetTallyConnectionQuery,
  useCreateTallyConnectionMutation,
  useDisconnectTallyConnectionMutation,
  useTriggerTallySyncMutation,
  useGetTallySyncStatusQuery,
  useGetTallyLogsQuery,
  useLazyDownloadTallyWindowsConnectorQuery,
  useGetSyncDataCategoriesQuery,
  useLazyGetSyncDataCategoriesQuery,
  useGetSyncDataItemsQuery,
  useImportSyncDataItemsMutation,
} = integrationsApi;

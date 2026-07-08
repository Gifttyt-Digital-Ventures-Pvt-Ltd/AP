import { serviceApi } from "../serviceApi";
import { extractListResponse } from "../utils/payloadMappers";

const ZOHO_BASE = "/integration/zoho";
const GMAIL_BASE = "/integration/gmail";

const withParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  );

export const integrationsApi = serviceApi.injectEndpoints({
  endpoints: (builder) => ({
    getIntegrationProviders: builder.query({
      query: () => ({ url: `${ZOHO_BASE}/providers`, method: "GET" }),
      transformResponse: (response) => extractListResponse(response, ['providers']),
      providesTags: ["Integrations"],
    }),
    getIntegrationConnections: builder.query({
      query: () => ({ url: `${ZOHO_BASE}/connections`, method: "GET" }),
      transformResponse: (response) => extractListResponse(response, ['connections']),
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
      invalidatesTags: ["Integrations"],
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
      transformResponse: (response) => extractListResponse(response, ['organizations']),
      providesTags: ["Integrations"],
    }),
    bindZohoOrganization: builder.mutation({
      query: ({ connectionId, organizationId }) => ({
        url: `${ZOHO_BASE}/connections/${connectionId}/organization`,
        method: "POST",
        body: { organizationId },
      }),
      invalidatesTags: ["Integrations"],
    }),
    disconnectZohoConnection: builder.mutation({
      query: (connectionId) => ({
        url: `${ZOHO_BASE}/connections/${connectionId}/disconnect`,
        method: "POST",
      }),
      invalidatesTags: ["Integrations"],
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
      query: ({ connectionId, object } = {}) => ({
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
      transformResponse: (response) => extractListResponse(response, ["connections"]),
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
      invalidatesTags: ["Integrations"],
    }),
    disconnectGmailConnection: builder.mutation({
      query: (connectionId) => ({
        url: `${GMAIL_BASE}/connections/${connectionId}/disconnect`,
        method: "POST",
      }),
      invalidatesTags: ["Integrations"],
    }),
    syncGmailConnection: builder.mutation({
      query: (connectionId) => ({
        url: `${GMAIL_BASE}/connections/${connectionId}/sync`,
        method: "POST",
      }),
      invalidatesTags: ["Integrations"],
    }),
  }),
});

export const {
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
} = integrationsApi;

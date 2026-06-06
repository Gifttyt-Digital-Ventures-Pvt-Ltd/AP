import { serviceApi } from "../serviceApi";

const unwrapList = (response, keys = []) => {
  if (Array.isArray(response)) return response;
  const payload = response?.data ?? response ?? {};
  if (Array.isArray(payload)) return payload;
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
};

const normalizeReportExportResponse = (response) => {
  const payload = response?.data ?? response ?? {};
  return {
    ...payload,
    downloadUrl:
      payload.downloadUrl ??
      payload.download_url ??
      payload.url ??
      payload.fileUrl ??
      payload.file_url ??
      null,
  };
};

export const reportExportsApi = serviceApi.injectEndpoints({
  endpoints: (builder) => ({
    getReportExportTypes: builder.query({
      query: (params = {}) => ({
        url: "/reports/export-types",
        method: "GET",
        params,
      }),
      transformResponse: (response) =>
        unwrapList(response, [
          "types",
          "reportTypes",
          "items",
          "content",
          "reports",
        ]),
      providesTags: ["ReportExports"],
    }),
    getReportExportStatuses: builder.query({
      query: () => ({
        url: "/reports/export-statuses",
        method: "GET",
      }),
      transformResponse: (response) =>
        unwrapList(response, ["statuses", "items", "content"]),
      providesTags: ["ReportExports"],
    }),
    getReportExportVendors: builder.query({
      query: () => ({
        url: "/reports/export-vendors",
        method: "GET",
      }),
      transformResponse: (response) =>
        unwrapList(response, ["vendors", "items", "content"]),
      providesTags: ["ReportExports"],
    }),
    getReportExports: builder.query({
      query: (params = {}) => ({
        url: "/reports/exports",
        method: "GET",
        params,
      }),
      transformResponse: (response) =>
        unwrapList(response, ["exports", "items", "content", "reports"]),
      providesTags: ["ReportExports"],
    }),
    generateReportExport: builder.mutation({
      query: (body) => ({
        url: "/reports/exports",
        method: "POST",
        body,
      }),
      transformResponse: normalizeReportExportResponse,
      invalidatesTags: ["ReportExports"],
    }),
    downloadReportExport: builder.query({
      query: (exportId) => ({
        url: `/reports/exports/${exportId}/download`,
        method: "GET",
      }),
      transformResponse: normalizeReportExportResponse,
    }),
  }),
});

export const {
  useGetReportExportTypesQuery,
  useGetReportExportStatusesQuery,
  useGetReportExportVendorsQuery,
  useGetReportExportsQuery,
  useGenerateReportExportMutation,
  useLazyDownloadReportExportQuery,
} = reportExportsApi;

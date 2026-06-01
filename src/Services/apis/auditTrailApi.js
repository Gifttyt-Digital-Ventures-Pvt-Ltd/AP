import { serviceApi } from "../serviceApi";

export const AUDIT_ACTIONS = [
  "VENDOR_CREATED",
  "VENDOR_APPROVED",
  "VENDOR_REJECTED",
  "ROLE_CREATED",
  "ROLE_ASSIGNED",
  "INVOICE_APPROVED",
  "INVOICE_REJECTED",
  "PAYMENT_BATCH_CREATED",
  "PAYMENT_BATCH_DISBURSED",
  "PAYMENT_BATCH_REJECTED",
  "PO_CREATED",
  "PO_APPROVED",
  "PO_REJECTED",
  "APPROVAL_WORKFLOW_CREATED",
  "USER_ADDED",
  "USER_DELETED",
  "INVOICE_MATCHING_COMPLETED",
  "GRN_CREATED",
  "REPORT_DOWNLOADED",
  "CATEGORY_CREATED",
  "CATEGORY_UPDATED",
  "CATEGORY_DELETED",
];

export const AUDIT_STATUSES = [
  "SUCCESS",
  "COMPLETED",
  "APPROVED",
  "PENDING",
  "REJECTED",
  "FAILED",
];

const toArray = (value) => (Array.isArray(value) ? value : []);

const appendParam = (params, key, value) => {
  if (value === undefined || value === null || value === "") return;
  if (Array.isArray(value)) {
    value.forEach((item) => appendParam(params, key, item));
    return;
  }
  params.append(key, String(value));
};

export const buildAuditQueryString = (filters = {}) => {
  const params = new URLSearchParams();

  appendParam(params, "page", filters.page ?? 0);
  appendParam(params, "size", filters.size ?? 25);
  appendParam(params, "sort", filters.sort || "timestamp,desc");
  appendParam(params, "search", filters.search);
  appendParam(params, "from", filters.from);
  appendParam(params, "to", filters.to);
  appendParam(params, "userId", filters.userId);
  appendParam(params, "action", filters.action);
  appendParam(params, "status", filters.status);
  appendParam(params, "format", filters.format);
  appendParam(params, "confirm", filters.confirm);

  return params.toString();
};

const normalizePage = (response = {}) => {
  const content = toArray(response.content);
  const number = response.number ?? response.page ?? response?.pageable?.pageNumber ?? 0;
  const size = response.size ?? response?.pageable?.pageSize ?? 25;

  return {
    content,
    page: number,
    number,
    size,
    totalElements: response.totalElements ?? content.length,
    totalPages: response.totalPages ?? 1,
    numberOfElements: response.numberOfElements ?? content.length,
    first: response.first ?? number === 0,
    last: response.last ?? number + 1 >= (response.totalPages ?? 1),
    raw: response,
  };
};

const normalizeAuditUser = (user = {}) => ({
  userId: user.userId ?? user.id ?? "",
  userName: user.userName ?? user.name ?? "Unknown User",
});

export const auditTrailApi = serviceApi.injectEndpoints({
  endpoints: (builder) => ({
    getAuditLogs: builder.query({
      query: (filters = {}) => {
        const queryString = buildAuditQueryString(filters);
        return {
          url: `/api/v1/audit-logs${queryString ? `?${queryString}` : ""}`,
          method: "GET",
        };
      },
      transformResponse: normalizePage,
      providesTags: ["AuditLogs"],
    }),
    getAuditUsers: builder.query({
      query: () => ({ url: "/api/v1/audit-logs/users", method: "GET" }),
      transformResponse: (response) => toArray(response).map(normalizeAuditUser),
      providesTags: ["AuditLogs"],
    }),
    exportAuditLogs: builder.mutation({
      query: (filters = {}) => {
        const queryString = buildAuditQueryString(filters);
        return {
          url: `/api/v1/audit-logs/export${queryString ? `?${queryString}` : ""}`,
          method: "GET",
        };
      },
      transformResponse: (response) => {
        const payload = response?.download_url || response?.downloadUrl ? response : response?.data ?? response;
        return {
          downloadUrl: payload?.download_url ?? payload?.downloadUrl ?? null,
        };
      },
    }),
  }),
});

export const {
  useGetAuditLogsQuery,
  useGetAuditUsersQuery,
  useExportAuditLogsMutation,
} = auditTrailApi;

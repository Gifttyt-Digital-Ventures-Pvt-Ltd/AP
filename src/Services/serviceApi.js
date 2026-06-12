import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? "";

const DEFAULT_TIMEOUT_MS = 20000;
const SCAN_TIMEOUT_MS = 120000;
const BULK_SCAN_TIMEOUT_MS = 300000;

const prepareHeaders = (headers) => {
  const skipAuth = headers.get("x-skip-auth") === "true";
  if (skipAuth) {
    headers.delete("x-skip-auth");
    return headers;
  }

  const token = sessionStorage.getItem("token");
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
    headers.set("authToken", token);
  }

  return headers;
};

const createTimedBaseQuery = (timeout) =>
  fetchBaseQuery({
    baseUrl: BACKEND_URL,
    timeout,
    prepareHeaders,
  });

const defaultBaseQuery = createTimedBaseQuery(DEFAULT_TIMEOUT_MS);
const scanBaseQuery = createTimedBaseQuery(SCAN_TIMEOUT_MS);
const bulkScanBaseQuery = createTimedBaseQuery(BULK_SCAN_TIMEOUT_MS);

const baseQuery = (args, api, extraOptions) => {
  if (api.endpoint === "bulkUploadInvoices") {
    return bulkScanBaseQuery(args, api, extraOptions);
  }
  if (api.endpoint === "scanInvoice") {
    return scanBaseQuery(args, api, extraOptions);
  }
  return defaultBaseQuery(args, api, extraOptions);
};

// Auth endpoints are intentionally kept in serviceApi as requested.
export const serviceApi = createApi({
  reducerPath: "serviceApi",
  baseQuery,
  tagTypes: [
    "Auth",
    "Dashboard",
    "Invoices",
    "Vendors",
    "Approvals",
    "Payments",
    "Banking",
    "Settings",
    "Users",
    "Transactions",
    "PurchaseOrders",
    "PurchaseOrderFormatConfig",
    "GoodsReceipt",
    "Tax",
    "Matching",
    "Batches",
    "Notifications",
    "Reports",
    "ReportExports",
    "MasterData",
    "Workflow",
    "Categories",
    "AuditLogs",
    "Campaigns",
    "Integrations",
    "Credits",
  ],
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (body) => ({ url: "/auth/login", method: "POST", body }),
      invalidatesTags: ["Auth"],
    }),
    register: builder.mutation({
      query: (body) => ({ url: "/auth/register", method: "POST", body }),
      invalidatesTags: ["Auth"],
    }),
    corporateLogin: builder.mutation({
      query: (credentials) => ({
        url: "/session/corporate/login",
        method: "POST",
        body: credentials,
        headers: { "x-skip-auth": "true" },
      }),
      invalidatesTags: ["Auth"],
    }),
    getCorporatesByEmail: builder.mutation({
      query: ({ email }) => ({
        url: "/session/corporate/getCorporates",
        method: "POST",
        body: { email },
        headers: { "x-skip-auth": "true" },
      }),
      invalidatesTags: ["Auth"],
    }),
    sendCorporateLoginOtp: builder.mutation({
      query: ({ email, corpId }) => ({
        url: "/session/corporate/sendLoginOTP",
        method: "POST",
        body: { email, corpId },
        headers: { "x-skip-auth": "true" },
      }),
      invalidatesTags: ["Auth"],
    }),
    exchangeHandoffToken: builder.query({
      query: (token) => ({
        url: "/session/getToken",
        method: "GET",
        params: { encryptedToken: token },
        headers: { "x-skip-auth": "true" },
      }),
      providesTags: ["Auth"],
    }),
    refreshSession: builder.query({
      query: (token) => ({
        url: "/session/ping",
        method: "GET",
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
              authToken: token,
            }
          : undefined,
      }),
      providesTags: ["Auth"],
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useCorporateLoginMutation,
  useGetCorporatesByEmailMutation,
  useSendCorporateLoginOtpMutation,
  useLazyExchangeHandoffTokenQuery,
  useRefreshSessionQuery,
  useLazyRefreshSessionQuery,
} = serviceApi;

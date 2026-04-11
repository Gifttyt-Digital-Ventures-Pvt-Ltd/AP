import { serviceApi } from "../serviceApi";

export const dashboardReportsApi = serviceApi.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardStats: builder.query({
      query: () => ({ url: "/dashboard/stats", method: "GET" }),
      providesTags: ["Dashboard"],
    }),
    getExecutiveDashboard: builder.query({
      query: ({ days = 30 } = {}) => ({
        url: "/analytics/executive-dashboard",
        method: "GET",
        params: { days },
      }),
      providesTags: ["Dashboard", "Reports"],
    }),
    getApReports: builder.query({
      query: ({ days = 30 } = {}) => ({
        url: "/analytics/ap-reports",
        method: "GET",
        params: { days },
      }),
      providesTags: ["Dashboard", "Reports"],
    }),
    getVendorAnalytics: builder.query({
      query: ({ days = 30 } = {}) => ({
        url: "/analytics/vendor-analytics",
        method: "GET",
        params: { days },
      }),
      providesTags: ["Reports"],
    }),
    getTaxReports: builder.query({
      query: ({ days = 30 } = {}) => ({
        url: "/analytics/tax-reports",
        method: "GET",
        params: { days },
      }),
      providesTags: ["Reports"],
    }),
    getPaymentAnalytics: builder.query({
      query: ({ days = 30 } = {}) => ({
        url: "/analytics/payment-analytics",
        method: "GET",
        params: { days },
      }),
      providesTags: ["Reports"],
    }),
  }),
});

export const {
  useGetDashboardStatsQuery,
  useGetExecutiveDashboardQuery,
  useGetApReportsQuery,
  useGetVendorAnalyticsQuery,
  useGetTaxReportsQuery,
  useGetPaymentAnalyticsQuery,
} = dashboardReportsApi;

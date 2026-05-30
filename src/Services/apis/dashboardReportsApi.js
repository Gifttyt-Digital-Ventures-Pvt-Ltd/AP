import { serviceApi } from "../serviceApi";

export const dashboardReportsApi = serviceApi.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardStats: builder.query({
      query: () => ({ url: "/dashboard/stats", method: "GET" }),
      providesTags: ["Dashboard"],
    }),
    getExecutiveDashboard: builder.query({
      query: ({ days = 30, currency } = {}) => ({
        url: "/analytics/executive-dashboard",
        method: "GET",
        params: { days, ...(currency ? { currency } : {}) },
      }),
      providesTags: ["Dashboard", "Reports"],
    }),
    getApReports: builder.query({
      query: ({ days = 30, currency } = {}) => ({
        url: "/analytics/ap-reports",
        method: "GET",
        params: { days, ...(currency ? { currency } : {}) },
      }),
      providesTags: ["Dashboard", "Reports"],
    }),
    getVendorAnalytics: builder.query({
      query: ({ days = 30, currency } = {}) => ({
        url: "/analytics/vendor-analytics",
        method: "GET",
        params: { days, ...(currency ? { currency } : {}) },
      }),
      providesTags: ["Reports"],
    }),
    getTaxReports: builder.query({
      query: ({ days = 30, currency } = {}) => ({
        url: "/analytics/tax-reports",
        method: "GET",
        params: { days, ...(currency ? { currency } : {}) },
      }),
      providesTags: ["Reports"],
    }),
    getPaymentAnalytics: builder.query({
      query: ({ days = 30, currency } = {}) => ({
        url: "/analytics/payment-analytics",
        method: "GET",
        params: { days, ...(currency ? { currency } : {}) },
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

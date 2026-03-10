import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? "";

const baseQuery = fetchBaseQuery({
  baseUrl: BACKEND_URL,
  prepareHeaders: (headers) => {
    const token = localStorage.getItem("token");
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

export const apiSlice = createApi({
  reducerPath: "apiSlice",
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
    "GoodsReceipt",
    "Tax",
    "Matching",
    "Batches",
    "Notifications",
    "Reports",
    "MasterData",
  ],
  endpoints: (builder) => ({
    // Auth
    login: builder.mutation({
      query: (body) => ({ url: "/api/auth/login", method: "POST", body }),
      invalidatesTags: ["Auth"],
    }),
    register: builder.mutation({
      query: (body) => ({ url: "/api/auth/register", method: "POST", body }),
      invalidatesTags: ["Auth"],
    }),

    // Dashboard and Reports
    getDashboardStats: builder.query({
      query: () => ({ url: "/api/dashboard/stats", method: "GET" }),
      providesTags: ["Dashboard"],
    }),
    getExecutiveDashboard: builder.query({
      query: ({ days = 30 } = {}) => ({
        url: "/api/analytics/executive-dashboard",
        method: "GET",
        params: { days },
      }),
      providesTags: ["Dashboard", "Reports"],
    }),
    getApReports: builder.query({
      query: ({ days = 30 } = {}) => ({
        url: "/api/analytics/ap-reports",
        method: "GET",
        params: { days },
      }),
      providesTags: ["Dashboard", "Reports"],
    }),
    getVendorAnalytics: builder.query({
      query: ({ days = 30 } = {}) => ({
        url: "/api/analytics/vendor-analytics",
        method: "GET",
        params: { days },
      }),
      providesTags: ["Reports"],
    }),
    getTaxReports: builder.query({
      query: ({ days = 30 } = {}) => ({
        url: "/api/analytics/tax-reports",
        method: "GET",
        params: { days },
      }),
      providesTags: ["Reports"],
    }),
    getPaymentAnalytics: builder.query({
      query: ({ days = 30 } = {}) => ({
        url: "/api/analytics/payment-analytics",
        method: "GET",
        params: { days },
      }),
      providesTags: ["Reports"],
    }),

    // Invoices and Vendors
    getInvoices: builder.query({
      query: (params) => ({ url: "/api/invoices", method: "GET", params }),
      providesTags: ["Invoices"],
    }),
    createInvoice: builder.mutation({
      query: (body) => ({ url: "/api/invoices", method: "POST", body }),
      invalidatesTags: ["Invoices"],
    }),
    updateInvoice: builder.mutation({
      query: ({ id, body }) => ({
        url: `/api/invoices/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Invoices"],
    }),
    deleteInvoice: builder.mutation({
      query: (id) => ({ url: `/api/invoices/${id}`, method: "DELETE" }),
      invalidatesTags: ["Invoices"],
    }),
    scanInvoice: builder.mutation({
      query: (body) => ({ url: "/api/invoices/scan", method: "POST", body }),
      invalidatesTags: ["Invoices"],
    }),
    bulkUploadInvoices: builder.mutation({
      query: (body) => ({
        url: "/api/invoices/bulk-upload",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Invoices"],
    }),
    approveInvoice: builder.mutation({
      query: ({ id, body }) => ({
        url: `/api/invoices/${id}/approve`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Invoices", "Approvals"],
    }),
    getInvoiceHistory: builder.query({
      query: (id) => ({ url: `/api/invoices/${id}/history`, method: "GET" }),
      providesTags: ["Invoices"],
    }),
    getVendors: builder.query({
      query: () => ({ url: "/api/vendors", method: "GET" }),
      providesTags: ["Vendors"],
    }),
    createVendor: builder.mutation({
      query: (body) => ({ url: "/api/vendors", method: "POST", body }),
      invalidatesTags: ["Vendors"],
    }),
    updateVendor: builder.mutation({
      query: ({ id, body }) => ({
        url: `/api/vendors/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Vendors"],
    }),
    deleteVendor: builder.mutation({
      query: (id) => ({ url: `/api/vendors/${id}`, method: "DELETE" }),
      invalidatesTags: ["Vendors"],
    }),

    // Approvals, Payments, Banking
    getPendingApprovals: builder.query({
      query: () => ({ url: "/api/approvals/pending", method: "GET" }),
      providesTags: ["Approvals"],
    }),
    getPayments: builder.query({
      query: () => ({ url: "/api/payments", method: "GET" }),
      providesTags: ["Payments"],
    }),
    createPayment: builder.mutation({
      query: (body) => ({ url: "/api/payments", method: "POST", body }),
      invalidatesTags: ["Payments", "Invoices"],
    }),
    bulkReleasePayments: builder.mutation({
      query: () => ({ url: "/api/payments/bulk-release", method: "POST" }),
      invalidatesTags: ["Payments", "Invoices"],
    }),
    getBankAccounts: builder.query({
      query: () => ({ url: "/api/bank-accounts", method: "GET" }),
      providesTags: ["Banking"],
    }),
    createBankAccount: builder.mutation({
      query: (body) => ({ url: "/api/bank-accounts", method: "POST", body }),
      invalidatesTags: ["Banking"],
    }),

    // Settings
    getOrganisation: builder.query({
      query: () => ({ url: "/api/organisation", method: "GET" }),
      providesTags: ["Settings"],
    }),
    createOrganisation: builder.mutation({
      query: (body) => ({ url: "/api/organisation", method: "POST", body }),
      invalidatesTags: ["Settings"],
    }),
    updateOrganisation: builder.mutation({
      query: (body) => ({ url: "/api/organisation", method: "PUT", body }),
      invalidatesTags: ["Settings"],
    }),

    // Users and Roles
    getUsers: builder.query({
      query: () => ({ url: "/api/users", method: "GET" }),
      providesTags: ["Users"],
    }),
    getRoles: builder.query({
      query: () => ({ url: "/api/roles", method: "GET" }),
      providesTags: ["Users"],
    }),
    inviteUser: builder.mutation({
      query: (body) => ({ url: "/api/users/invite", method: "POST", body }),
      invalidatesTags: ["Users"],
    }),
    updateUserRole: builder.mutation({
      query: ({ userId, role }) => ({
        url: `/api/users/${userId}/role`,
        method: "PUT",
        body: { role },
      }),
      invalidatesTags: ["Users"],
    }),
    updateUserStatus: builder.mutation({
      query: ({ userId, is_active }) => ({
        url: `/api/users/${userId}/status`,
        method: "PUT",
        body: { is_active },
      }),
      invalidatesTags: ["Users"],
    }),
    deleteUser: builder.mutation({
      query: (userId) => ({ url: `/api/users/${userId}`, method: "DELETE" }),
      invalidatesTags: ["Users"],
    }),

    // Transactions and Statements
    getStatements: builder.query({
      query: () => ({ url: "/api/statements", method: "GET" }),
      providesTags: ["Transactions"],
    }),
    uploadStatement: builder.mutation({
      query: (body) => ({ url: "/api/statements/upload", method: "POST", body }),
      invalidatesTags: ["Transactions"],
    }),
    deleteStatement: builder.mutation({
      query: (statementId) => ({
        url: `/api/statements/${statementId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Transactions"],
    }),
    getLedgers: builder.query({
      query: () => ({ url: "/api/ledgers", method: "GET" }),
      providesTags: ["Transactions"],
    }),
    getTransactions: builder.query({
      query: (params) => ({ url: "/api/transactions", method: "GET", params }),
      providesTags: ["Transactions"],
    }),
    getTransactionInvoice: builder.query({
      query: (transactionId) => ({
        url: `/api/transactions/${transactionId}/invoice`,
        method: "GET",
      }),
      providesTags: ["Transactions", "Invoices"],
    }),
    updateTransaction: builder.mutation({
      query: ({ transactionId, body }) => ({
        url: `/api/transactions/${transactionId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Transactions"],
    }),
    reviewTransaction: builder.mutation({
      query: (transactionId) => ({
        url: `/api/transactions/${transactionId}/review`,
        method: "POST",
      }),
      invalidatesTags: ["Transactions"],
    }),
    undoTransaction: builder.mutation({
      query: (transactionId) => ({
        url: `/api/transactions/${transactionId}/undo`,
        method: "POST",
      }),
      invalidatesTags: ["Transactions"],
    }),
    uploadTransactionVoucher: builder.mutation({
      query: ({ transactionId, body }) => ({
        url: `/api/transactions/${transactionId}/upload-voucher`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Transactions"],
    }),
    linkTransactionInvoice: builder.mutation({
      query: ({ transactionId, invoiceId }) => ({
        url: `/api/transactions/${transactionId}/link-invoice`,
        method: "POST",
        params: { invoice_id: invoiceId },
      }),
      invalidatesTags: ["Transactions", "Invoices"],
    }),

    // Purchase Orders and Master Data
    getPurchaseOrders: builder.query({
      query: (params) => ({ url: "/api/purchase-orders", method: "GET", params }),
      providesTags: ["PurchaseOrders"],
    }),
    getPendingPurchaseOrderApprovals: builder.query({
      query: () => ({
        url: "/api/purchase-orders/pending-approvals",
        method: "GET",
      }),
      providesTags: ["PurchaseOrders", "Approvals"],
    }),
    getPurchaseOrderById: builder.query({
      query: (id) => ({ url: `/api/purchase-orders/${id}`, method: "GET" }),
      providesTags: ["PurchaseOrders"],
    }),
    createPurchaseOrder: builder.mutation({
      query: (body) => ({ url: "/api/purchase-orders", method: "POST", body }),
      invalidatesTags: ["PurchaseOrders"],
    }),
    submitPurchaseOrder: builder.mutation({
      query: (id) => ({ url: `/api/purchase-orders/${id}/submit`, method: "POST" }),
      invalidatesTags: ["PurchaseOrders", "Approvals"],
    }),
    approvePurchaseOrder: builder.mutation({
      query: ({ id, body }) => ({
        url: `/api/purchase-orders/${id}/approve`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["PurchaseOrders", "Approvals"],
    }),
    getGlAccounts: builder.query({
      query: () => ({ url: "/api/master/gl-accounts", method: "GET" }),
      providesTags: ["MasterData"],
    }),
    getCostCenters: builder.query({
      query: () => ({ url: "/api/master/cost-centers", method: "GET" }),
      providesTags: ["MasterData"],
    }),
    getHsnSacCodes: builder.query({
      query: () => ({ url: "/api/master/hsn-sac", method: "GET" }),
      providesTags: ["MasterData"],
    }),
    seedMasterData: builder.mutation({
      query: () => ({ url: "/api/master/seed", method: "POST" }),
      invalidatesTags: ["MasterData"],
    }),

    // Goods Receipt
    getGrns: builder.query({
      query: () => ({ url: "/api/grn", method: "GET" }),
      providesTags: ["GoodsReceipt"],
    }),
    createGrn: builder.mutation({
      query: (body) => ({ url: "/api/grn", method: "POST", body }),
      invalidatesTags: ["GoodsReceipt", "PurchaseOrders"],
    }),
    postGrn: builder.mutation({
      query: (id) => ({ url: `/api/grn/${id}/post`, method: "POST" }),
      invalidatesTags: ["GoodsReceipt"],
    }),

    // Invoice Matching
    getInvoiceMatching: builder.query({
      query: () => ({ url: "/api/invoice-matching", method: "GET" }),
      providesTags: ["Matching"],
    }),
    getPendingInvoiceMatching: builder.query({
      query: () => ({ url: "/api/invoice-matching/pending", method: "GET" }),
      providesTags: ["Matching"],
    }),
    getInvoiceMatchingStats: builder.query({
      query: () => ({ url: "/api/invoice-matching/stats", method: "GET" }),
      providesTags: ["Matching"],
    }),
    getInvoiceMatchingCandidates: builder.query({
      query: (invoiceId) => ({
        url: `/api/invoices/${invoiceId}/matching-candidates`,
        method: "GET",
      }),
      providesTags: ["Matching"],
    }),
    matchInvoice: builder.mutation({
      query: (body) => ({ url: "/api/invoice-matching/match", method: "POST", body }),
      invalidatesTags: ["Matching", "Invoices"],
    }),
    resolveInvoiceMatch: builder.mutation({
      query: ({ id, body }) => ({
        url: `/api/invoice-matching/${id}/resolve`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Matching", "Invoices"],
    }),

    // Payment Batches
    getPaymentBatches: builder.query({
      query: () => ({ url: "/api/payment-batches", method: "GET" }),
      providesTags: ["Batches"],
    }),
    getPendingPaymentBatchApprovals: builder.query({
      query: () => ({ url: "/api/payment-batches/pending-approval", method: "GET" }),
      providesTags: ["Batches", "Approvals"],
    }),
    getPaymentBatchStats: builder.query({
      query: () => ({ url: "/api/payment-batches/stats", method: "GET" }),
      providesTags: ["Batches"],
    }),
    createPaymentBatch: builder.mutation({
      query: (body) => ({ url: "/api/payment-batches", method: "POST", body }),
      invalidatesTags: ["Batches"],
    }),
    submitPaymentBatch: builder.mutation({
      query: (id) => ({ url: `/api/payment-batches/${id}/submit`, method: "POST" }),
      invalidatesTags: ["Batches", "Approvals"],
    }),
    approvePaymentBatch: builder.mutation({
      query: ({ id, body }) => ({
        url: `/api/payment-batches/${id}/approve`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Batches", "Approvals"],
    }),
    processPaymentBatch: builder.mutation({
      query: (id) => ({ url: `/api/payment-batches/${id}/process`, method: "POST" }),
      invalidatesTags: ["Batches", "Payments"],
    }),
    generatePaymentBatchFile: builder.mutation({
      query: (id) => ({
        url: `/api/payment-batches/${id}/generate-file`,
        method: "POST",
      }),
      invalidatesTags: ["Batches"],
    }),

    // Notifications
    getNotifications: builder.query({
      query: ({ limit = 100 } = {}) => ({
        url: "/api/notifications",
        method: "GET",
        params: { limit },
      }),
      providesTags: ["Notifications"],
    }),
    getPendingNotifications: builder.query({
      query: () => ({ url: "/api/notifications/pending", method: "GET" }),
      providesTags: ["Notifications"],
    }),

    // Tax
    getGstEntries: builder.query({
      query: () => ({ url: "/api/tax/gst/entries", method: "GET" }),
      providesTags: ["Tax"],
    }),
    getGstSummary: builder.query({
      query: () => ({ url: "/api/tax/gst/summary", method: "GET" }),
      providesTags: ["Tax"],
    }),
    getTdsEntries: builder.query({
      query: () => ({ url: "/api/tax/tds/entries", method: "GET" }),
      providesTags: ["Tax"],
    }),
    getTdsSummary: builder.query({
      query: () => ({ url: "/api/tax/tds/summary", method: "GET" }),
      providesTags: ["Tax"],
    }),
    getTdsSections: builder.query({
      query: () => ({ url: "/api/tax/tds/sections", method: "GET" }),
      providesTags: ["Tax"],
    }),
    calculateGst: builder.mutation({
      query: (body) => ({ url: "/api/tax/gst/calculate", method: "POST", body }),
      invalidatesTags: ["Tax"],
    }),
    calculateTds: builder.mutation({
      query: (body) => ({ url: "/api/tax/tds/calculate", method: "POST", body }),
      invalidatesTags: ["Tax"],
    }),
    generateForm16a: builder.mutation({
      query: (body) => ({ url: "/api/tax/tds/form16a", method: "POST", body }),
      invalidatesTags: ["Tax"],
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useGetDashboardStatsQuery,
  useGetExecutiveDashboardQuery,
  useGetApReportsQuery,
  useGetVendorAnalyticsQuery,
  useGetTaxReportsQuery,
  useGetPaymentAnalyticsQuery,
  useGetInvoicesQuery,
  useCreateInvoiceMutation,
  useUpdateInvoiceMutation,
  useDeleteInvoiceMutation,
  useScanInvoiceMutation,
  useBulkUploadInvoicesMutation,
  useApproveInvoiceMutation,
  useGetInvoiceHistoryQuery,
  useLazyGetInvoiceHistoryQuery,
  useGetVendorsQuery,
  useCreateVendorMutation,
  useUpdateVendorMutation,
  useDeleteVendorMutation,
  useGetPendingApprovalsQuery,
  useGetPaymentsQuery,
  useCreatePaymentMutation,
  useBulkReleasePaymentsMutation,
  useGetBankAccountsQuery,
  useCreateBankAccountMutation,
  useGetOrganisationQuery,
  useCreateOrganisationMutation,
  useUpdateOrganisationMutation,
  useGetUsersQuery,
  useGetRolesQuery,
  useInviteUserMutation,
  useUpdateUserRoleMutation,
  useUpdateUserStatusMutation,
  useDeleteUserMutation,
  useGetStatementsQuery,
  useUploadStatementMutation,
  useDeleteStatementMutation,
  useGetLedgersQuery,
  useGetTransactionsQuery,
  useGetTransactionInvoiceQuery,
  useLazyGetTransactionInvoiceQuery,
  useUpdateTransactionMutation,
  useReviewTransactionMutation,
  useUndoTransactionMutation,
  useUploadTransactionVoucherMutation,
  useLinkTransactionInvoiceMutation,
  useGetPurchaseOrdersQuery,
  useGetPendingPurchaseOrderApprovalsQuery,
  useGetPurchaseOrderByIdQuery,
  useLazyGetPurchaseOrderByIdQuery,
  useCreatePurchaseOrderMutation,
  useSubmitPurchaseOrderMutation,
  useApprovePurchaseOrderMutation,
  useGetGlAccountsQuery,
  useGetCostCentersQuery,
  useGetHsnSacCodesQuery,
  useSeedMasterDataMutation,
  useGetGrnsQuery,
  useCreateGrnMutation,
  usePostGrnMutation,
  useGetInvoiceMatchingQuery,
  useGetPendingInvoiceMatchingQuery,
  useGetInvoiceMatchingStatsQuery,
  useGetInvoiceMatchingCandidatesQuery,
  useLazyGetInvoiceMatchingCandidatesQuery,
  useMatchInvoiceMutation,
  useResolveInvoiceMatchMutation,
  useGetPaymentBatchesQuery,
  useGetPendingPaymentBatchApprovalsQuery,
  useGetPaymentBatchStatsQuery,
  useCreatePaymentBatchMutation,
  useSubmitPaymentBatchMutation,
  useApprovePaymentBatchMutation,
  useProcessPaymentBatchMutation,
  useGeneratePaymentBatchFileMutation,
  useGetNotificationsQuery,
  useGetPendingNotificationsQuery,
  useGetGstEntriesQuery,
  useGetGstSummaryQuery,
  useGetTdsEntriesQuery,
  useGetTdsSummaryQuery,
  useGetTdsSectionsQuery,
  useCalculateGstMutation,
  useCalculateTdsMutation,
  useGenerateForm16aMutation,
} = apiSlice;

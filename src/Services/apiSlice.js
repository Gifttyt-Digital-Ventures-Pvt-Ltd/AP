import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? "";

const baseQuery = fetchBaseQuery({
  baseUrl: BACKEND_URL,
  prepareHeaders: (headers) => {
    const token = sessionStorage.getItem("token");
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
      headers.set("authToken", token);
    }
    return headers;
  },
});

const toVendorApiPayload = (vendor = {}) => {
  const {
    vendor_type,
    address_line1,
    address_line2,
    bank_name,
    account_number,
    ifsc_code,
    account_holder_name,
    payment_terms,
    contact_person,
    ...rest
  } = vendor;

  return {
    ...rest,
    vendorType: rest.vendorType ?? vendor_type,
    addressLine1: rest.addressLine1 ?? address_line1,
    addressLine2: rest.addressLine2 ?? address_line2,
    bankName: rest.bankName ?? bank_name,
    accountNumber: rest.accountNumber ?? account_number,
    ifscCode: rest.ifscCode ?? ifsc_code,
    accountHolderName: rest.accountHolderName ?? account_holder_name,
    paymentTerms: rest.paymentTerms ?? payment_terms,
    contactPerson: rest.contactPerson ?? contact_person,
  };
};

const toVendorUiPayload = (vendor = {}) => ({
  ...vendor,
  vendor_type: vendor.vendor_type ?? vendor.vendorType,
  address_line1: vendor.address_line1 ?? vendor.addressLine1,
  address_line2: vendor.address_line2 ?? vendor.addressLine2,
  bank_name: vendor.bank_name ?? vendor.bankName,
  account_number: vendor.account_number ?? vendor.accountNumber,
  ifsc_code: vendor.ifsc_code ?? vendor.ifscCode,
  account_holder_name: vendor.account_holder_name ?? vendor.accountHolderName,
  payment_terms: vendor.payment_terms ?? vendor.paymentTerms,
  contact_person: vendor.contact_person ?? vendor.contactPerson,
});

const toBankAccountApiPayload = (account = {}) => {
  const {
    account_name,
    account_number,
    bank_name,
    account_type,
    ifsc_code,
    is_active,
    ...rest
  } = account;

  return {
    ...rest,
    accountName: rest.accountName ?? account_name,
    accountNumber: rest.accountNumber ?? account_number,
    bankName: rest.bankName ?? bank_name,
    accountType: rest.accountType ?? account_type,
    ifscCode: rest.ifscCode ?? ifsc_code,
    isActive: rest.isActive ?? is_active,
  };
};

const toBankAccountUiPayload = (account = {}) => ({
  ...account,
  account_name: account.account_name ?? account.accountName,
  account_number: account.account_number ?? account.accountNumber,
  bank_name: account.bank_name ?? account.bankName,
  account_type: account.account_type ?? account.accountType,
  ifsc_code: account.ifsc_code ?? account.ifscCode,
  is_active: account.is_active ?? account.isActive,
});

const toInvoiceLineItemApiPayload = (item = {}) => {
  const {
    unit_price,
    eligible_for_itc,
    hsn_sac,
    ...rest
  } = item;

  return {
    ...rest,
    unitPrice: rest.unitPrice ?? unit_price,
    eligibleForItc: rest.eligibleForItc ?? eligible_for_itc,
    hsnSac: rest.hsnSac ?? hsn_sac,
  };
};

const toInvoiceLineItemUiPayload = (item = {}) => ({
  ...item,
  unit_price: item.unit_price ?? item.unitPrice,
  eligible_for_itc: item.eligible_for_itc ?? item.eligibleForItc,
  hsn_sac: item.hsn_sac ?? item.hsnSac,
});

const toLocalDateTimeString = (value) => {
  if (!value) return value;
  if (typeof value !== "string") return value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T00:00:00`;
  return value;
};

const toInvoiceApiPayload = (invoice = {}) => {
  const {
    invoice_number,
    vendor_id,
    vendor_name,
    line_items,
    invoice_date,
    due_date,
    source_email,
    file_id,
    file_hash,
    original_file_name,
    file_category,
    work_item_id,
    branch_name,
    po_number,
    po_id,
    grn_number,
    grn_id,
    receipt_file_url,
    invoice_file_url,
    payment_date,
    created_by_name,
    created_at,
    matching_status,
    approval_records,
    ...rest
  } = invoice;

  return {
    ...rest,
    invoiceNumber: rest.invoiceNumber ?? invoice_number,
    vendorId: rest.vendorId ?? vendor_id,
    vendorName: rest.vendorName ?? vendor_name,
    lineItems: (rest.lineItems ?? line_items)?.map?.(toInvoiceLineItemApiPayload) ?? [],
    invoiceDate: toLocalDateTimeString(rest.invoiceDate ?? invoice_date),
    dueDate: toLocalDateTimeString(rest.dueDate ?? due_date),
    sourceEmail: rest.sourceEmail ?? source_email,
    fileId: rest.fileId ?? file_id,
    fileHash: rest.fileHash ?? file_hash,
    originalFileName: rest.originalFileName ?? original_file_name,
    fileCategory: rest.fileCategory ?? file_category,
    workItemId: rest.workItemId ?? work_item_id,
    branchName: rest.branchName ?? branch_name,
    poNumber: rest.poNumber ?? po_number,
    poId: rest.poId ?? po_id,
    grnNumber: rest.grnNumber ?? grn_number,
    grnId: rest.grnId ?? grn_id,
    receiptFileUrl: rest.receiptFileUrl ?? receipt_file_url,
    invoiceFileUrl: rest.invoiceFileUrl ?? invoice_file_url,
    paymentDate: toLocalDateTimeString(rest.paymentDate ?? payment_date),
    createdByName: rest.createdByName ?? created_by_name,
    createdAt: rest.createdAt ?? created_at,
    matchingStatus: rest.matchingStatus ?? matching_status,
    approvalRecords: rest.approvalRecords ?? approval_records,
  };
};

const toInvoiceUiPayload = (invoice = {}) => ({
  ...invoice,
  invoice_number: invoice.invoice_number ?? invoice.invoiceNumber,
  vendor_id: invoice.vendor_id ?? invoice.vendorId,
  vendor_name: invoice.vendor_name ?? invoice.vendorName,
  line_items: (invoice.line_items ?? invoice.lineItems)?.map?.(toInvoiceLineItemUiPayload) ?? [],
  invoice_date: invoice.invoice_date ?? invoice.invoiceDate,
  due_date: invoice.due_date ?? invoice.dueDate,
  source_email: invoice.source_email ?? invoice.sourceEmail,
  file_id: invoice.file_id ?? invoice.fileId,
  file_hash: invoice.file_hash ?? invoice.fileHash,
  original_file_name: invoice.original_file_name ?? invoice.originalFileName,
  file_category: invoice.file_category ?? invoice.fileCategory,
  work_item_id: invoice.work_item_id ?? invoice.workItemId,
  branch_name: invoice.branch_name ?? invoice.branchName,
  po_number: invoice.po_number ?? invoice.poNumber,
  po_id: invoice.po_id ?? invoice.poId,
  grn_number: invoice.grn_number ?? invoice.grnNumber,
  grn_id: invoice.grn_id ?? invoice.grnId,
  receipt_file_url: invoice.receipt_file_url ?? invoice.receiptFileUrl,
  invoice_file_url: invoice.invoice_file_url ?? invoice.invoiceFileUrl,
  payment_date: invoice.payment_date ?? invoice.paymentDate,
  created_by_name: invoice.created_by_name ?? invoice.createdByName,
  created_at: invoice.created_at ?? invoice.createdAt,
  matching_status: invoice.matching_status ?? invoice.matchingStatus,
  approval_records: invoice.approval_records ?? invoice.approvalRecords,
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
      }),
      invalidatesTags: ["Auth"],
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

    // Dashboard and Reports
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

    // Invoices and Vendors
    getInvoices: builder.query({
      query: (params) => ({ url: "/invoices", method: "GET", params }),
      transformResponse: (response) =>
        Array.isArray(response)
          ? response.map(toInvoiceUiPayload)
          : toInvoiceUiPayload(response),
      providesTags: ["Invoices"],
    }),
    createInvoice: builder.mutation({
      query: (body) => ({
        url: "/invoices",
        method: "POST",
        body: body instanceof FormData ? body : toInvoiceApiPayload(body),
      }),
      invalidatesTags: ["Invoices", "Dashboard", "Reports"],
    }),
    updateInvoice: builder.mutation({
      query: ({ id, body }) => ({
        url: `/invoices/${id}`,
        method: "PUT",
        body: toInvoiceApiPayload(body),
      }),
      invalidatesTags: ["Invoices", "Dashboard", "Reports"],
    }),
    deleteInvoice: builder.mutation({
      query: (id) => ({ url: `/invoices/${id}`, method: "DELETE" }),
      invalidatesTags: ["Invoices", "Dashboard", "Reports"],
    }),
    scanInvoice: builder.mutation({
      query: (body) => {
        return {
          url: "/scan/extract-invoice-data",
          //  url: "/invoices/scan"
          method: "POST",
          body,
        };
      },
      invalidatesTags: ["Invoices", "Dashboard", "Reports"],
    }),
    bulkUploadInvoices: builder.mutation({
      query: (body) => ({
        url: "/scan/bulk-extract-invoice-data",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Invoices", "Dashboard", "Reports"],
    }),
    approveInvoice: builder.mutation({
      query: ({ id, body }) => ({
        url: `/invoices/${id}/approve`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Invoices", "Approvals", "Dashboard", "Reports"],
    }),
    getInvoiceHistory: builder.query({
      query: (id) => ({ url: `/invoices/${id}/history`, method: "GET" }),
      providesTags: ["Invoices"],
    }),
    getVendors: builder.query({
      query: () => ({ url: "/vendors", method: "GET" }),
      transformResponse: (response) =>
        Array.isArray(response)
          ? response.map(toVendorUiPayload)
          : toVendorUiPayload(response),
      providesTags: (result) => {
        if (Array.isArray(result)) {
          return [
            { type: "Vendors", id: "LIST" },
            ...result
              .filter(
                (vendor) => vendor?.id !== undefined && vendor?.id !== null,
              )
              .map((vendor) => ({ type: "Vendors", id: vendor.id })),
          ];
        }
        if (result?.id !== undefined && result?.id !== null) {
          return [
            { type: "Vendors", id: "LIST" },
            { type: "Vendors", id: result.id },
          ];
        }
        return [{ type: "Vendors", id: "LIST" }];
      },
    }),
    createVendor: builder.mutation({
      query: (body) => ({
        url: "/vendors",
        method: "POST",
        body: toVendorApiPayload(body),
      }),
      invalidatesTags: [
        { type: "Vendors", id: "LIST" },
        "Dashboard",
        "Reports",
      ],
    }),
    updateVendor: builder.mutation({
      query: ({ id, body }) => ({
        url: `/vendors/${id}`,
        method: "PUT",
        body: toVendorApiPayload(body),
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Vendors", id: "LIST" },
        { type: "Vendors", id },
        "Dashboard",
        "Reports",
      ],
    }),
    deleteVendor: builder.mutation({
      query: (id) => ({ url: `/vendors/${id}`, method: "DELETE" }),
      invalidatesTags: (result, error, id) => [
        { type: "Vendors", id: "LIST" },
        { type: "Vendors", id },
        "Dashboard",
        "Reports",
      ],
    }),

    // Approvals, Payments, Banking
    getPendingApprovals: builder.query({
      query: () => ({ url: "/approvals/pending", method: "GET" }),
      providesTags: ["Approvals"],
    }),
    getPayments: builder.query({
      query: () => ({ url: "/payments", method: "GET" }),
      providesTags: ["Payments"],
    }),
    createPayment: builder.mutation({
      query: (body) => ({ url: "/payments", method: "POST", body }),
      invalidatesTags: ["Payments", "Invoices", "Dashboard", "Reports"],
    }),
    bulkReleasePayments: builder.mutation({
      query: () => ({ url: "/payments/bulk-release", method: "POST" }),
      invalidatesTags: ["Payments", "Invoices", "Dashboard", "Reports"],
    }),
    getBankAccounts: builder.query({
      query: () => ({ url: "/bank-accounts", method: "GET" }),
      transformResponse: (response) =>
        Array.isArray(response)
          ? response.map(toBankAccountUiPayload)
          : toBankAccountUiPayload(response),
      providesTags: ["Banking"],
    }),
    createBankAccount: builder.mutation({
      query: (body) => ({
        url: "/bank-accounts",
        method: "POST",
        body: toBankAccountApiPayload(body),
      }),
      invalidatesTags: ["Banking"],
    }),

    // Settings
    getOrganisation: builder.query({
      query: () => ({ url: "/organisation", method: "GET" }),
      providesTags: ["Settings"],
    }),
    createOrganisation: builder.mutation({
      query: (body) => ({ url: "/organisation", method: "POST", body }),
      invalidatesTags: ["Settings", "Dashboard", "Reports"],
    }),
    updateOrganisation: builder.mutation({
      query: (body) => ({ url: "/organisation", method: "PUT", body }),
      invalidatesTags: ["Settings", "Dashboard", "Reports"],
    }),

    // Users and Roles
    getUsers: builder.query({
      query: () => ({ url: "/users", method: "GET" }),
      providesTags: ["Users"],
    }),
    getRoles: builder.query({
      query: () => ({ url: "/roles", method: "GET" }),
      providesTags: ["Users"],
    }),
    inviteUser: builder.mutation({
      query: (body) => ({ url: "/users/invite", method: "POST", body }),
      invalidatesTags: ["Users"],
    }),
    updateUserRole: builder.mutation({
      query: ({ userId, role }) => ({
        url: `/users/${userId}/role`,
        method: "PUT",
        body: { role },
      }),
      invalidatesTags: ["Users"],
    }),
    updateUserStatus: builder.mutation({
      query: ({ userId, is_active }) => ({
        url: `/users/${userId}/status`,
        method: "PUT",
        body: { is_active },
      }),
      invalidatesTags: ["Users"],
    }),
    deleteUser: builder.mutation({
      query: (userId) => ({ url: `/users/${userId}`, method: "DELETE" }),
      invalidatesTags: ["Users"],
    }),

    // Transactions and Statements
    getStatements: builder.query({
      query: () => ({ url: "/statements", method: "GET" }),
      providesTags: ["Transactions"],
    }),
    uploadStatement: builder.mutation({
      query: (body) => ({
        url: "/statements/upload",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Transactions"],
    }),
    deleteStatement: builder.mutation({
      query: (statementId) => ({
        url: `/statements/${statementId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Transactions"],
    }),
    getLedgers: builder.query({
      query: () => ({ url: "/ledgers", method: "GET" }),
      providesTags: ["Transactions"],
    }),
    getTransactions: builder.query({
      query: (params) => ({ url: "/transactions", method: "GET", params }),
      providesTags: ["Transactions"],
    }),
    getTransactionInvoice: builder.query({
      query: (transactionId) => ({
        url: `/transactions/${transactionId}/invoice`,
        method: "GET",
      }),
      providesTags: ["Transactions", "Invoices"],
    }),
    updateTransaction: builder.mutation({
      query: ({ transactionId, body }) => ({
        url: `/transactions/${transactionId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Transactions"],
    }),
    reviewTransaction: builder.mutation({
      query: (transactionId) => ({
        url: `/transactions/${transactionId}/review`,
        method: "POST",
      }),
      invalidatesTags: ["Transactions"],
    }),
    undoTransaction: builder.mutation({
      query: (transactionId) => ({
        url: `/transactions/${transactionId}/undo`,
        method: "POST",
      }),
      invalidatesTags: ["Transactions"],
    }),
    uploadTransactionVoucher: builder.mutation({
      query: ({ transactionId, body }) => ({
        url: `/transactions/${transactionId}/upload-voucher`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Transactions"],
    }),
    linkTransactionInvoice: builder.mutation({
      query: ({ transactionId, invoiceId }) => ({
        url: `/transactions/${transactionId}/link-invoice`,
        method: "POST",
        params: { invoice_id: invoiceId },
      }),
      invalidatesTags: ["Transactions", "Invoices"],
    }),

    // Purchase Orders and Master Data
    getPurchaseOrders: builder.query({
      query: (params) => ({
        url: "/purchase-orders",
        method: "GET",
        params,
      }),
      providesTags: ["PurchaseOrders"],
    }),
    getPendingPurchaseOrderApprovals: builder.query({
      query: () => ({
        url: "/purchase-orders/pending-approvals",
        method: "GET",
      }),
      providesTags: ["PurchaseOrders", "Approvals"],
    }),
    getPurchaseOrderById: builder.query({
      query: (id) => ({ url: `/purchase-orders/${id}`, method: "GET" }),
      providesTags: ["PurchaseOrders"],
    }),
    createPurchaseOrder: builder.mutation({
      query: (body) => ({ url: "/purchase-orders", method: "POST", body }),
      invalidatesTags: ["PurchaseOrders"],
    }),
    submitPurchaseOrder: builder.mutation({
      query: (id) => ({
        url: `/purchase-orders/${id}/submit`,
        method: "POST",
      }),
      invalidatesTags: ["PurchaseOrders", "Approvals"],
    }),
    approvePurchaseOrder: builder.mutation({
      query: ({ id, body }) => ({
        url: `/purchase-orders/${id}/approve`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["PurchaseOrders", "Approvals"],
    }),
    getGlAccounts: builder.query({
      query: () => ({ url: "/master/gl-accounts", method: "GET" }),
      providesTags: ["MasterData"],
    }),
    getCostCenters: builder.query({
      query: () => ({ url: "/master/cost-centers", method: "GET" }),
      providesTags: ["MasterData"],
    }),
    getHsnSacCodes: builder.query({
      query: () => ({ url: "/master/hsn-sac", method: "GET" }),
      providesTags: ["MasterData"],
    }),
    seedMasterData: builder.mutation({
      query: () => ({ url: "/master/seed", method: "POST" }),
      invalidatesTags: ["MasterData"],
    }),

    // Goods Receipt
    getGrns: builder.query({
      query: () => ({ url: "/grn", method: "GET" }),
      providesTags: ["GoodsReceipt"],
    }),
    createGrn: builder.mutation({
      query: (body) => ({ url: "/grn", method: "POST", body }),
      invalidatesTags: ["GoodsReceipt", "PurchaseOrders"],
    }),
    postGrn: builder.mutation({
      query: (id) => ({ url: `/grn/${id}/post`, method: "POST" }),
      invalidatesTags: ["GoodsReceipt"],
    }),

    // Invoice Matching
    getInvoiceMatching: builder.query({
      query: () => ({ url: "/invoice-matching", method: "GET" }),
      providesTags: ["Matching"],
    }),
    getPendingInvoiceMatching: builder.query({
      query: () => ({ url: "/invoice-matching/pending", method: "GET" }),
      providesTags: ["Matching"],
    }),
    getInvoiceMatchingStats: builder.query({
      query: () => ({ url: "/invoice-matching/stats", method: "GET" }),
      providesTags: ["Matching"],
    }),
    getInvoiceMatchingCandidates: builder.query({
      query: (invoiceId) => ({
        url: `/invoices/${invoiceId}/matching-candidates`,
        method: "GET",
      }),
      providesTags: ["Matching"],
    }),
    matchInvoice: builder.mutation({
      query: (body) => ({
        url: "/invoice-matching/match",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Matching", "Invoices"],
    }),
    resolveInvoiceMatch: builder.mutation({
      query: ({ id, body }) => ({
        url: `/invoice-matching/${id}/resolve`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Matching", "Invoices"],
    }),

    // Payment Batches
    getPaymentBatches: builder.query({
      query: () => ({ url: "/payment-batches", method: "GET" }),
      providesTags: ["Batches"],
    }),
    getPendingPaymentBatchApprovals: builder.query({
      query: () => ({
        url: "/payment-batches/pending-approval",
        method: "GET",
      }),
      providesTags: ["Batches", "Approvals"],
    }),
    getPaymentBatchStats: builder.query({
      query: () => ({ url: "/payment-batches/stats", method: "GET" }),
      providesTags: ["Batches"],
    }),
    createPaymentBatch: builder.mutation({
      query: (body) => ({ url: "/payment-batches", method: "POST", body }),
      invalidatesTags: ["Batches"],
    }),
    submitPaymentBatch: builder.mutation({
      query: (id) => ({
        url: `/payment-batches/${id}/submit`,
        method: "POST",
      }),
      invalidatesTags: ["Batches", "Approvals"],
    }),
    approvePaymentBatch: builder.mutation({
      query: ({ id, body }) => ({
        url: `/payment-batches/${id}/approve`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Batches", "Approvals"],
    }),
    processPaymentBatch: builder.mutation({
      query: (id) => ({
        url: `/payment-batches/${id}/process`,
        method: "POST",
      }),
      invalidatesTags: [
        "Batches",
        "Payments",
        "Invoices",
        "Dashboard",
        "Reports",
      ],
    }),
    generatePaymentBatchFile: builder.mutation({
      query: (id) => ({
        url: `/payment-batches/${id}/generate-file`,
        method: "POST",
      }),
      invalidatesTags: ["Batches"],
    }),

    // Notifications
    getNotifications: builder.query({
      query: ({ limit = 100 } = {}) => ({
        url: "/notifications",
        method: "GET",
        params: { limit },
      }),
      providesTags: ["Notifications"],
    }),
    getPendingNotifications: builder.query({
      query: () => ({ url: "/notifications/pending", method: "GET" }),
      providesTags: ["Notifications"],
    }),

    // Tax
    getGstEntries: builder.query({
      query: () => ({ url: "/tax/gst/entries", method: "GET" }),
      providesTags: ["Tax"],
    }),
    getGstSummary: builder.query({
      query: () => ({ url: "/tax/gst/summary", method: "GET" }),
      providesTags: ["Tax"],
    }),
    getTdsEntries: builder.query({
      query: () => ({ url: "/tax/tds/entries", method: "GET" }),
      providesTags: ["Tax"],
    }),
    getTdsSummary: builder.query({
      query: () => ({ url: "/tax/tds/summary", method: "GET" }),
      providesTags: ["Tax"],
    }),
    getTdsSections: builder.query({
      query: () => ({ url: "/tax/tds/sections", method: "GET" }),
      providesTags: ["Tax"],
    }),
    calculateGst: builder.mutation({
      query: (body) => ({
        url: "/tax/gst/calculate",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Tax"],
    }),
    calculateTds: builder.mutation({
      query: (body) => ({
        url: "/tax/tds/calculate",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Tax"],
    }),
    generateForm16a: builder.mutation({
      query: (body) => ({ url: "/tax/tds/form16a", method: "POST", body }),
      invalidatesTags: ["Tax"],
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useCorporateLoginMutation,
  useLazyRefreshSessionQuery,
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

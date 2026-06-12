import { serviceApi } from "../serviceApi";

const CLIENT_CREDITS_BASE = "/client";
const USE_DUMMY_CREDITS =
  import.meta.env.VITE_CREDITS_DUMMY_FLOW !== "false";

const nowIso = "2026-06-12T10:15:00.000Z";

const dummyWallet = {
  organizationId: "org_demo_india",
  balance: "6840.50",
  lowBalanceThreshold: "2500.00",
  totalPaidIn: "10000.00",
  totalBonus: "500.00",
  totalSpent: "4160.00",
  totalRefunded: "500.00",
  totalWithdrawn: "0.00",
  updatedAt: nowIso,
};

const dummyWalletSummary = {
  organizationId: dummyWallet.organizationId,
  balance: dummyWallet.balance,
  lowBalanceThreshold: dummyWallet.lowBalanceThreshold,
  totalSpent: dummyWallet.totalSpent,
  updatedAt: dummyWallet.updatedAt,
};

const dummyActionTypes = [
  {
    id: "act_invoice_upload",
    code: "INVOICE_UPLOAD",
    name: "Invoice Upload",
    category: "DOCUMENT",
    isBulkCapable: true,
    isEnabled: true,
    autoRefundOnFailure: true,
    currentRate: "2.50",
    effectiveFrom: "2026-06-01T00:00:00.000Z",
  },
  {
    id: "act_vendor_upload",
    code: "VENDOR_UPLOAD",
    name: "Vendor Upload",
    category: "DOCUMENT",
    isBulkCapable: true,
    isEnabled: true,
    autoRefundOnFailure: false,
    currentRate: "1.00",
    effectiveFrom: "2026-06-01T00:00:00.000Z",
  },
  {
    id: "act_invoice_matching",
    code: "INVOICE_MATCHING",
    name: "Invoice Matching",
    category: "MATCHING",
    isBulkCapable: true,
    isEnabled: true,
    autoRefundOnFailure: true,
    currentRate: "5.00",
    effectiveFrom: "2026-06-01T00:00:00.000Z",
  },
  {
    id: "act_po_upload",
    code: "PO_UPLOAD",
    name: "PO Creation/Upload",
    category: "DOCUMENT",
    isBulkCapable: true,
    isEnabled: true,
    autoRefundOnFailure: false,
    currentRate: "0.00",
    effectiveFrom: null,
  },
  {
    id: "act_grn_upload",
    code: "GRN_UPLOAD",
    name: "GRN Creation/Upload",
    category: "DOCUMENT",
    isBulkCapable: true,
    isEnabled: true,
    autoRefundOnFailure: false,
    currentRate: "1.50",
    effectiveFrom: "2026-06-01T00:00:00.000Z",
  },
  {
    id: "act_gst_invoice_api",
    code: "GST_INVOICE_API",
    name: "Invoice-related GST APIs",
    category: "GST",
    isBulkCapable: true,
    isEnabled: true,
    autoRefundOnFailure: true,
    currentRate: "3.00",
    effectiveFrom: "2026-06-01T00:00:00.000Z",
  },
  {
    id: "act_gst_recon_api",
    code: "GST_RECON_API",
    name: "Reconciliation GST APIs",
    category: "GST",
    isBulkCapable: true,
    isEnabled: false,
    autoRefundOnFailure: true,
    currentRate: "4.00",
    effectiveFrom: "2026-06-01T00:00:00.000Z",
  },
  {
    id: "act_tds_api",
    code: "TDS_API",
    name: "TDS APIs",
    category: "TDS",
    isBulkCapable: true,
    isEnabled: true,
    autoRefundOnFailure: true,
    currentRate: "2.50",
    effectiveFrom: "2026-06-01T00:00:00.000Z",
  },
  {
    id: "act_payment_processing",
    code: "PAYMENT_PROCESSING",
    name: "Payment Processing",
    category: "PAYMENT",
    isBulkCapable: true,
    isEnabled: true,
    autoRefundOnFailure: false,
    currentRate: "10.00",
    effectiveFrom: "2026-06-01T00:00:00.000Z",
  },
];

const dummyLedgerEntries = [
  {
    id: "led_1008",
    createdAt: "2026-06-12T09:25:00.000Z",
    entryType: "DEDUCTION",
    actionCode: "PAYMENT_PROCESSING",
    actionName: "Payment Processing",
    amount: "-140.00",
    balanceAfter: "6840.00",
    performedBy: "Finance Team",
    reference: "PAY-BATCH-1024",
    description: "Processed vendor payment batch",
  },
  {
    id: "led_1007",
    createdAt: "2026-06-11T14:35:00.000Z",
    entryType: "REFUND",
    actionCode: "INVOICE_UPLOAD",
    actionName: "Invoice Upload",
    amount: "20.00",
    balanceAfter: "6980.00",
    performedBy: "System",
    reference: "INV-BULK-8821",
    description: "Auto-refund for failed invoice rows",
  },
  {
    id: "led_1006",
    createdAt: "2026-06-11T14:30:00.000Z",
    entryType: "DEDUCTION",
    actionCode: "INVOICE_UPLOAD",
    actionName: "Invoice Upload",
    amount: "-160.00",
    balanceAfter: "6960.00",
    performedBy: "Ayesha Khan",
    reference: "INV-BULK-8821",
    description: "Bulk invoice upload",
  },
  {
    id: "led_1005",
    createdAt: "2026-06-10T11:00:00.000Z",
    entryType: "DEDUCTION",
    actionCode: "GST_INVOICE_API",
    actionName: "Invoice-related GST APIs",
    amount: "-60.00",
    balanceAfter: "7120.00",
    performedBy: "Tax Team",
    reference: "GST-VERIFY-443",
    description: "GST invoice verification",
  },
  {
    id: "led_1004",
    createdAt: "2026-06-09T12:20:00.000Z",
    entryType: "BONUS",
    actionCode: null,
    actionName: null,
    amount: "500.00",
    balanceAfter: "7180.00",
    performedBy: "Optifii Admin",
    reference: "TOPUP-JUN-001",
    description: "Promotional bonus credits",
  },
  {
    id: "led_1003",
    createdAt: "2026-06-09T12:20:00.000Z",
    entryType: "TOP_UP",
    actionCode: null,
    actionName: null,
    amount: "5000.00",
    balanceAfter: "6680.00",
    performedBy: "Optifii Admin",
    reference: "UTR-92882271",
    description: "Wallet top-up",
  },
  {
    id: "led_1002",
    createdAt: "2026-06-08T16:10:00.000Z",
    entryType: "DEDUCTION",
    actionCode: "INVOICE_MATCHING",
    actionName: "Invoice Matching",
    amount: "-250.00",
    balanceAfter: "1680.00",
    performedBy: "Ravi Mehta",
    reference: "MATCH-RUN-119",
    description: "Invoice matching run",
  },
  {
    id: "led_1001",
    createdAt: "2026-06-08T10:00:00.000Z",
    entryType: "TOP_UP",
    actionCode: null,
    actionName: null,
    amount: "2000.00",
    balanceAfter: "1930.00",
    performedBy: "Optifii Admin",
    reference: "UTR-92880011",
    description: "Wallet top-up",
  },
];

const wait = (data) =>
  new Promise((resolve) => {
    window.setTimeout(() => resolve({ data }), 250);
  });

const toResult = (items = [], page = 1, pageSize = 25, total = items.length) => ({
  items,
  page,
  pageSize,
  total,
});

const filterLedger = ({ type, from, to, page = 1, pageSize = 25 } = {}) => {
  const normalizedType = String(type || "ALL").toUpperCase();
  const fromTime = from ? new Date(from).getTime() : null;
  const toTime = to ? new Date(to).getTime() : null;

  const filtered = dummyLedgerEntries.filter((entry) => {
    const entryTime = new Date(entry.createdAt).getTime();
    const matchesType =
      normalizedType === "ALL" || entry.entryType === normalizedType;
    const matchesFrom = !fromTime || entryTime >= fromTime;
    const matchesTo = !toTime || entryTime <= toTime;
    return matchesType && matchesFrom && matchesTo;
  });

  const start = (Number(page) - 1) * Number(pageSize);
  return toResult(
    filtered.slice(start, start + Number(pageSize)),
    Number(page),
    Number(pageSize),
    filtered.length,
  );
};

const withParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  );

export const creditsApi = serviceApi.injectEndpoints({
  endpoints: (builder) => ({
    getClientWallet: builder.query({
      queryFn: USE_DUMMY_CREDITS
        ? () => wait(dummyWallet)
        : undefined,
      query: USE_DUMMY_CREDITS
        ? undefined
        : () => ({ url: `${CLIENT_CREDITS_BASE}/wallet`, method: "GET" }),
      providesTags: ["Credits"],
    }),
    getClientWalletSummary: builder.query({
      queryFn: USE_DUMMY_CREDITS
        ? () => wait(dummyWalletSummary)
        : undefined,
      query: USE_DUMMY_CREDITS
        ? undefined
        : () => ({ url: `${CLIENT_CREDITS_BASE}/wallet/summary`, method: "GET" }),
      providesTags: ["Credits"],
    }),
    getClientLedger: builder.query({
      queryFn: USE_DUMMY_CREDITS
        ? (params) => wait(filterLedger(params))
        : undefined,
      query: USE_DUMMY_CREDITS
        ? undefined
        : (params = {}) => ({
            url: `${CLIENT_CREDITS_BASE}/ledger`,
            method: "GET",
            params: withParams(params),
          }),
      providesTags: ["Credits"],
    }),
    getClientActionTypes: builder.query({
      queryFn: USE_DUMMY_CREDITS
        ? () => wait({ items: dummyActionTypes, total: dummyActionTypes.length })
        : undefined,
      query: USE_DUMMY_CREDITS
        ? undefined
        : () => ({
            url: `${CLIENT_CREDITS_BASE}/action-types`,
            method: "GET",
          }),
      providesTags: ["Credits"],
    }),
  }),
});

export const {
  useGetClientWalletQuery,
  useGetClientWalletSummaryQuery,
  useGetClientLedgerQuery,
  useGetClientActionTypesQuery,
} = creditsApi;

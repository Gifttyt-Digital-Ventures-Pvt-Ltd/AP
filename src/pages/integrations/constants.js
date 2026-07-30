export const DATA_CENTERS = [
  { value: "in", label: "India (.in)" },
  { value: "com", label: "US / Global (.com)" },
  { value: "eu", label: "Europe (.eu)" },
  { value: "com.au", label: "Australia (.com.au)" },
  { value: "jp", label: "Japan (.jp)" },
  { value: "ca", label: "Canada (.ca)" },
  { value: "sa", label: "Saudi Arabia (.sa)" },
];

export const OBJECT_LABELS = {
  CHART_OF_ACCOUNTS: "Chart of Accounts",
  BANK_ACCOUNTS: "Bank Accounts",
  BANK_TRANSACTIONS: "Bank Transactions",
  VENDORS: "Vendors",
  PURCHASE_ORDERS: "Purchase Orders",
  INVOICES: "Invoices",
  BILLS: "Bills",
  VENDOR_PAYMENTS: "Transactions",
  JOURNALS: "Journals",
  LEDGER_VIEW: "Ledger View",
};

export const FALLBACK_ZOHO_PROVIDER = {
  provider: "ZOHO_BOOKS",
  name: "Zoho Books",
  description: "OAuth connection for chart of accounts, bank accounts, vendors, purchase orders, bills, payments, journals, and bank transactions.",
  auth: {
    type: "OAUTH2",
    requiresDataCenter: true,
    requiresOrgSelection: true,
    requiresClientCredentials: true,
  },
  objects: {
    CHART_OF_ACCOUNTS: { supported: true, directions: ["PULL"] },
    BANK_ACCOUNTS: { supported: true, directions: ["PULL"] },
    VENDORS: { supported: true, directions: ["PULL", "PUSH"] },
    PURCHASE_ORDERS: { supported: true, directions: ["PULL", "PUSH"] },
    INVOICES: { supported: true, directions: ["PULL", "PUSH"] },
    VENDOR_PAYMENTS: { supported: true, directions: ["PULL", "PUSH"] },
    JOURNALS: { supported: true, directions: ["PULL", "PUSH"] },
    BANK_TRANSACTIONS: { supported: true, directions: ["PULL"] },
  },
  syncOrder: [
    "CHART_OF_ACCOUNTS",
    "BANK_ACCOUNTS",
    "VENDORS",
    "PURCHASE_ORDERS",
    "INVOICES",
    "VENDOR_PAYMENTS",
    "JOURNALS",
    "BANK_TRANSACTIONS",
  ],
};

export const ACTIVE_SYNC_STATUSES = new Set([
  "PENDING",
  "PENDING_AUTHORIZATION",
  "AUTHORIZING",
  "SYNCING",
  "RUNNING",
  "THROTTLED",
  "QUEUED",
]);

export const OAUTH_POLL_STATUSES = new Set(["PENDING", "PENDING_AUTHORIZATION", "AUTHORIZING"]);

export const OAUTH_TERMINAL_STATUSES = new Set([
  "CONNECTED",
  "AWAITING_ORG_SELECTION",
  "ERROR",
  "DISCONNECTED",
  "FAILED",
]);

export const BLOCKING_CONNECTION_STATUSES = new Set([
  "CONNECTED",
  "AWAITING_ORG_SELECTION",
  "PENDING",
  "PENDING_AUTHORIZATION",
  "AUTHORIZING",
  "ERROR",
]);

export const ZOHO_OAUTH_SESSION_KEY = "optifii.zoho.oauth.connectionId";

export const REVIEW_RESOLVE_ACTIONS = [
  { value: "ACCEPT", label: "Accept" },
  { value: "LINK", label: "Link" },
  { value: "CREATE_NEW", label: "Create new" },
  { value: "REJECT", label: "Reject" },
  { value: "IGNORE", label: "Ignore" },
];

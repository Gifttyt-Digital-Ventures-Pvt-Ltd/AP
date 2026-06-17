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
  VENDORS: "Vendors",
  BILLS: "Bills",
  VENDOR_PAYMENTS: "Transactions",
  JOURNALS: "Journals",
  LEDGER_VIEW: "Ledger View",
};

export const FALLBACK_ZOHO_PROVIDER = {
  provider: "ZOHO_BOOKS",
  name: "Zoho Books",
  description: "OAuth connection for vendors, chart of accounts, bills, payments, journals, and ledgers.",
  auth: {
    type: "OAUTH2",
    requiresDataCenter: true,
    requiresOrgSelection: true,
    supportsByoCredentials: true,
  },
  objects: {
    CHART_OF_ACCOUNTS: { supported: true, directions: ["PULL"] },
    VENDORS: { supported: true, directions: ["PULL", "PUSH"] },
    BILLS: { supported: true, directions: ["PUSH", "PULL_STATUS"] },
    VENDOR_PAYMENTS: { supported: true, directions: ["PULL", "PUSH"] },
    JOURNALS: { supported: true, directions: ["PULL", "PUSH"] },
    LEDGER_VIEW: { supported: true, directions: ["PULL"] },
  },
  syncOrder: ["CHART_OF_ACCOUNTS", "VENDORS", "BILLS", "VENDOR_PAYMENTS", "JOURNALS"],
};

export const ACTIVE_SYNC_STATUSES = new Set(["PENDING", "AUTHORIZING", "SYNCING", "RUNNING", "THROTTLED", "QUEUED"]);

export const OAUTH_POLL_STATUSES = new Set(["PENDING", "AUTHORIZING"]);

export const OAUTH_TERMINAL_STATUSES = new Set(["CONNECTED", "ERROR", "DISCONNECTED", "FAILED"]);

export const BLOCKING_CONNECTION_STATUSES = new Set(["CONNECTED", "PENDING", "AUTHORIZING", "ERROR"]);

export const ZOHO_OAUTH_SESSION_KEY = "optifii.zoho.oauth.connectionId";

export const REVIEW_RESOLVE_ACTIONS = [
  { value: "ACCEPT", label: "Accept" },
  { value: "LINK", label: "Link" },
  { value: "CREATE_NEW", label: "Create new" },
  { value: "REJECT", label: "Reject" },
  { value: "IGNORE", label: "Ignore" },
];

export const isZohoByoFeatureEnabled = () =>
  import.meta.env.VITE_INTEGRATIONS_ZOHO_BYO_ENABLED !== "false";

import {
  ACTIVE_SYNC_STATUSES,
  BLOCKING_CONNECTION_STATUSES,
  FALLBACK_ZOHO_PROVIDER,
  OBJECT_LABELS,
  OAUTH_POLL_STATUSES,
  OAUTH_TERMINAL_STATUSES,
} from "./constants";

export const toArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [value];
};

export const titleize = (value = "") =>
  String(value || "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export const formatDateTime = (value) => {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const getErrorText = (error, fallback = "Something went wrong") =>
  error?.data?.detail ||
  error?.data?.message ||
  error?.error ||
  error?.message ||
  fallback;

export const normalizeProviders = (response) => {
  const rawProviders =
    response?.providers ||
    response?.data?.providers ||
    response?.data ||
    response ||
    [];
  const providers = toArray(rawProviders).filter(Boolean);
  return providers.length > 0 ? providers : [FALLBACK_ZOHO_PROVIDER];
};

export const normalizeConnections = (response) => {
  const rawConnections =
    response?.connections ||
    response?.data?.connections ||
    response?.items ||
    response?.data ||
    response ||
    [];
  return toArray(rawConnections).filter(Boolean);
};

export const normalizeObjects = (manifest = {}) =>
  Object.entries(manifest.objects || {}).filter(([, config]) => config?.supported !== false);

export const getProviderName = (provider = {}) =>
  provider.name || provider.displayName || titleize(provider.provider || provider.code || "ERP");

export const getProviderKey = (provider = {}) => provider.provider || provider.code || provider.id;

export const getConnectionId = (connection = {}) =>
  connection.id || connection.connectionId || connection.connection_id;

export const getConnectionStatus = (connection = {}) =>
  String(connection.status || connection.connectionStatus || "UNKNOWN").toUpperCase();

export const isBlockingConnection = (connection = {}) =>
  BLOCKING_CONNECTION_STATUSES.has(getConnectionStatus(connection));

export const shouldPollOAuthStatus = (status = "") => {
  const normalized = String(status || "").toUpperCase();
  if (OAUTH_TERMINAL_STATUSES.has(normalized)) return false;
  return OAUTH_POLL_STATUSES.has(normalized) || normalized === "UNKNOWN" || !normalized;
};

export const shouldPollSyncStatus = (rows = []) =>
  rows.some((row) => ACTIVE_SYNC_STATUSES.has(String(row.status || "").toUpperCase()));

export const getZohoOAuthCallbackUrl = () => {
  if (typeof window === "undefined") {
    return "https://app.optifii.com/api/integration/zoho/callback";
  }
  return `${window.location.origin}/api/integration/zoho/callback`;
};

export const getZohoOAuthReturnUrl = (provider = "ZOHO_BOOKS", connectionId = "") => {
  const params = new URLSearchParams();
  if (connectionId) params.set("connectionId", connectionId);
  const query = params.toString();
  const path = `/integrations/connect/${provider}`;
  if (typeof window === "undefined") {
    return query ? `${path}?${query}` : path;
  }
  return query ? `${window.location.origin}${path}?${query}` : `${window.location.origin}${path}`;
};

export const getOAuthErrorMessage = (errorCode = "", description = "") => {
  const code = String(errorCode || "").toLowerCase();
  if (code === "redirect_uri_mismatch") {
    return "Redirect URI mismatch. Add the exact Optifii callback URL in the Zoho API Console.";
  }
  if (code === "invalid_client") {
    return "Invalid Zoho Client ID or Client Secret. Re-enter your BYO credentials and try again.";
  }
  if (code === "invalid_code" || code === "access_denied") {
    return "Zoho authorization was denied or expired. Start the connection again.";
  }
  return description || errorCode || "Zoho authorization failed.";
};

export const getConnectionProvider = (connection = {}) =>
  connection.provider || connection.providerCode || connection.erp || "ZOHO_BOOKS";

export const getConnectionOrgName = (connection = {}) =>
  connection.organizationName ||
  connection.organization_name ||
  connection.orgName ||
  connection.organizationId ||
  connection.organization_id ||
  "Organization pending";

export const normalizeSyncRows = (response, manifest = FALLBACK_ZOHO_PROVIDER) => {
  const rawRows =
    response?.objects ||
    response?.syncStatus ||
    response?.statuses ||
    response?.data?.objects ||
    response?.data ||
    [];
  const rowsByObject = new Map(
    toArray(rawRows).map((row) => [row.object || row.objectKey || row.name, row]),
  );

  return normalizeObjects(manifest).map(([objectKey, config]) => {
    const row = rowsByObject.get(objectKey) || {};
    return {
      object: objectKey,
      label: OBJECT_LABELS[objectKey] || titleize(objectKey),
      directions: row.directions || config.directions || [],
      status: String(row.status || row.syncStatus || "NOT_SYNCED").toUpperCase(),
      lastSyncedAt: row.lastSyncedAt || row.last_synced_at || row.lastSyncAt,
      synced: Number(row.synced ?? row.recordsSynced ?? row.successCount ?? 0),
      pending: Number(row.pending ?? row.pendingCount ?? 0),
      errored: Number(row.errored ?? row.errorCount ?? row.failed ?? 0),
      message: row.message || row.detail || "",
    };
  });
};

export const normalizeMappings = (response) => {
  const raw =
    response?.mappings ||
    response?.data?.mappings ||
    response?.data ||
    response ||
    {};

  return {
    version: raw.version || raw.mappingVersion || "draft",
    categories: toArray(raw.categories || raw.categoryMappings || raw.expenseCategories),
    paymentModes: toArray(raw.paymentModes || raw.payment_mode_mappings || raw.payments),
    vendors: toArray(raw.vendors || raw.vendorMappings || raw.contacts),
    raw,
  };
};

export const normalizeReviewQueue = (response) => {
  const raw = response?.items || response?.queue || response?.data?.items || response?.data || response || [];
  return toArray(raw).filter(Boolean);
};

export const normalizeLogs = (response) => {
  const raw = response?.logs || response?.items || response?.data?.logs || response?.data || response || [];
  return toArray(raw).filter(Boolean);
};

export const statusBadgeClass = (status = "") => {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "CONNECTED" || normalized === "COMPLETED" || normalized === "SUCCESS") {
    return "border-green-200 bg-green-50 text-green-700";
  }
  if (normalized === "ERROR" || normalized === "FAILED") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  if (normalized === "THROTTLED" || normalized === "PARTIAL") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  if (ACTIVE_SYNC_STATUSES.has(normalized)) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-700";
};

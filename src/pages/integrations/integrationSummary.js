/**
 * @typedef {"CONNECTED"|"CONNECTING"|"ACTION_REQUIRED"|"DISCONNECTED"|"ERROR"} IntegrationConnectionStatus
 * @typedef {"ZOHO_BOOKS"|"TALLY"|null} ErpProvider
 */

export const INTEGRATION_CONNECTION_STATUS = {
  CONNECTED: "CONNECTED",
  CONNECTING: "CONNECTING",
  ACTION_REQUIRED: "ACTION_REQUIRED",
  DISCONNECTED: "DISCONNECTED",
  ERROR: "ERROR",
};

export const ERP_PROVIDER = {
  ZOHO_BOOKS: "ZOHO_BOOKS",
  TALLY: "TALLY",
};

const VALID_CONNECTION_STATUSES = new Set(
  Object.values(INTEGRATION_CONNECTION_STATUS),
);
const VALID_ERP_PROVIDERS = new Set(Object.values(ERP_PROVIDER));

const asStringOrNull = (value) =>
  value === undefined || value === null || value === "" ? null : String(value);

const asBoolean = (value) => value === true;

const normalizeStatus = (value) => {
  const normalized = String(value || "").toUpperCase();
  if (normalized === "AWAITING_ORG_SELECTION") {
    return INTEGRATION_CONNECTION_STATUS.ACTION_REQUIRED;
  }
  if (normalized === "PENDING" || normalized === "PENDING_AUTHORIZATION" || normalized === "AUTHORIZING") {
    return INTEGRATION_CONNECTION_STATUS.CONNECTING;
  }
  return VALID_CONNECTION_STATUSES.has(normalized)
    ? normalized
    : INTEGRATION_CONNECTION_STATUS.DISCONNECTED;
};

const normalizeProviderStatus = (value) => asStringOrNull(value);

const normalizeError = (error) => {
  if (!error || typeof error !== "object") return null;
  return {
    code: asStringOrNull(error.code) || "INTEGRATION_ERROR",
    message: asStringOrNull(error.message) || "Integration error",
    retryable: error.retryable === true,
  };
};

const normalizeGmailDetails = (details = {}) => ({
  email: asStringOrNull(details.email),
  pollQuery: asStringOrNull(details.pollQuery ?? details.poll_query),
});

const normalizeOrganization = (organization) => {
  if (!organization || typeof organization !== "object") return null;
  return {
    id: asStringOrNull(organization.id),
    name: asStringOrNull(organization.name),
    gstin: asStringOrNull(organization.gstin),
  };
};

const normalizeDetails = (details) => {
  if (!details || typeof details !== "object") return null;
  return {
    dataCenter: asStringOrNull(details.dataCenter ?? details.data_center),
    hasValidToken:
      details.hasValidToken ?? details.has_valid_token ?? null,
    tokenExpiresAt: asStringOrNull(
      details.tokenExpiresAt ?? details.token_expires_at,
    ),
    lastTokenRefreshAt: asStringOrNull(
      details.lastTokenRefreshAt ?? details.last_token_refresh_at,
    ),
    connectorId: asStringOrNull(details.connectorId ?? details.connector_id),
    connectorStatus: asStringOrNull(
      details.connectorStatus ?? details.connector_status,
    ),
    connectorName: asStringOrNull(
      details.connectorName ?? details.connector_name,
    ),
    lastHeartbeatAt: asStringOrNull(
      details.lastHeartbeatAt ?? details.last_heartbeat_at,
    ),
  };
};

const normalizeEmailIntegration = (emailIntegration = {}) => ({
  provider: "GMAIL",
  connected: asBoolean(emailIntegration.connected),
  connectionStatus: normalizeStatus(emailIntegration.connectionStatus),
  providerStatus: normalizeProviderStatus(emailIntegration.providerStatus),
  connectionId: asStringOrNull(emailIntegration.connectionId),
  displayName: asStringOrNull(emailIntegration.displayName),
  details: normalizeGmailDetails(emailIntegration.details),
  connectedAt: asStringOrNull(emailIntegration.connectedAt),
  lastActivityAt: asStringOrNull(emailIntegration.lastActivityAt),
  error: normalizeError(emailIntegration.error),
});

const normalizeErpProvider = (provider) => {
  const normalized = String(provider || "").toUpperCase();
  return VALID_ERP_PROVIDERS.has(normalized) ? normalized : null;
};

const normalizeErpIntegration = (erpIntegration = {}) => ({
  provider: normalizeErpProvider(erpIntegration.provider),
  connected: asBoolean(erpIntegration.connected),
  connectionStatus: normalizeStatus(erpIntegration.connectionStatus),
  providerStatus: normalizeProviderStatus(erpIntegration.providerStatus),
  connectionId: asStringOrNull(erpIntegration.connectionId),
  displayName: asStringOrNull(erpIntegration.displayName),
  organization: normalizeOrganization(erpIntegration.organization),
  details: normalizeDetails(erpIntegration.details),
  connectedAt: asStringOrNull(erpIntegration.connectedAt),
  lastActivityAt: asStringOrNull(erpIntegration.lastActivityAt),
  error: normalizeError(erpIntegration.error),
});

export const normalizeApIntegrationSummary = (response = {}) => ({
  emailIntegration: normalizeEmailIntegration(response.emailIntegration),
  erpIntegration: normalizeErpIntegration(response.erpIntegration),
});

export const selectEmailIntegration = (summary) =>
  summary?.emailIntegration || normalizeEmailIntegration();

export const selectErpIntegration = (summary) =>
  summary?.erpIntegration || normalizeErpIntegration();

export const selectActiveErpProvider = (summary) =>
  selectErpIntegration(summary).provider;

export const isIntegrationConnected = (integration) =>
  integration?.connected === true &&
  integration?.connectionStatus === INTEGRATION_CONNECTION_STATUS.CONNECTED;

export const selectIsGmailConnected = (summary) =>
  isIntegrationConnected(selectEmailIntegration(summary));

export const selectIsErpConnected = (summary) =>
  isIntegrationConnected(selectErpIntegration(summary));

export const integrationRequiresAction = (integration) =>
  integration?.connectionStatus ===
  INTEGRATION_CONNECTION_STATUS.ACTION_REQUIRED;

export const selectEmailRequiresAction = (summary) =>
  integrationRequiresAction(selectEmailIntegration(summary));

export const selectErpRequiresAction = (summary) =>
  integrationRequiresAction(selectErpIntegration(summary));

export const integrationHasError = (integration) =>
  integration?.connectionStatus === INTEGRATION_CONNECTION_STATUS.ERROR ||
  Boolean(integration?.error);

export const selectIntegrationHasError = (summary) =>
  integrationHasError(selectEmailIntegration(summary)) ||
  integrationHasError(selectErpIntegration(summary));

export const canShowTokenExpiryWarning = (erpIntegration) =>
  erpIntegration?.provider === ERP_PROVIDER.ZOHO_BOOKS &&
  Boolean(erpIntegration?.details?.tokenExpiresAt);

export const isZohoIntegration = (erpIntegration) =>
  erpIntegration?.provider === ERP_PROVIDER.ZOHO_BOOKS;

export const isTallyIntegration = (erpIntegration) =>
  erpIntegration?.provider === ERP_PROVIDER.TALLY;

export const getIntegrationStatusLabel = (status = "") => {
  switch (status) {
    case INTEGRATION_CONNECTION_STATUS.CONNECTED:
      return "Connected";
    case INTEGRATION_CONNECTION_STATUS.CONNECTING:
      return "Connecting";
    case INTEGRATION_CONNECTION_STATUS.ACTION_REQUIRED:
      return "Action required";
    case INTEGRATION_CONNECTION_STATUS.ERROR:
      return "Connection error";
    case INTEGRATION_CONNECTION_STATUS.DISCONNECTED:
    default:
      return "Not connected";
  }
};

import { titleize, toArray } from "./utils";

export const SYNC_DATA_LIMIT = 50;

export const SYNC_DATA_STATUS = {
  NOT_IMPORTED: "NOT_IMPORTED",
  PARTIALLY_IMPORTED: "PARTIALLY_IMPORTED",
  FULLY_IMPORTED: "FULLY_IMPORTED",
  UNAVAILABLE: "UNAVAILABLE",
};

const PROVIDER_PATHS = {
  TALLY: "tally",
  TALLY_PRIME: "tally",
  ZOHO: "zoho",
  ZOHO_BOOKS: "zoho",
};

export const getIntegrationProviderPathValue = (provider) => {
  const normalized = String(provider || "")
    .trim()
    .replace(/[\s-]+/g, "_")
    .toUpperCase();
  return PROVIDER_PATHS[normalized] || null;
};

export const getSyncDataConnectionProvider = (connection = {}) =>
  connection.provider || connection.providerCode || connection.erp || "";

export const getSyncDataProviderBasePath = (provider) => {
  const providerPath = getIntegrationProviderPathValue(provider);
  return providerPath ? `/integration/${providerPath}` : null;
};

export const buildSyncDataCategoriesPath = ({ provider, connectionId } = {}) => {
  const basePath = getSyncDataProviderBasePath(provider);
  if (!basePath || !connectionId) return null;
  return `${basePath}/connections/${connectionId}/sync-data/categories`;
};

export const buildSyncDataItemsPath = ({ provider, connectionId, categoryCode } = {}) => {
  const categoriesPath = buildSyncDataCategoriesPath({ provider, connectionId });
  if (!categoriesPath || !categoryCode) return null;
  return `${categoriesPath}/${encodeURIComponent(categoryCode)}/items`;
};

export const buildSyncDataImportPath = ({ provider, connectionId, categoryCode } = {}) => {
  const categoriesPath = buildSyncDataCategoriesPath({ provider, connectionId });
  if (!categoriesPath || !categoryCode) return null;
  return `${categoriesPath}/${encodeURIComponent(categoryCode)}/import`;
};

export const isGranularSyncSupported = (summary = {}) =>
  summary?.granularSyncSupported === true;

const normalizeNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const normalizeCategoryStatus = (category = {}) => {
  const rawStatus = String(category.status || "").trim().toUpperCase();
  if (Object.values(SYNC_DATA_STATUS).includes(rawStatus)) return rawStatus;
  if (category.supported === false) return SYNC_DATA_STATUS.UNAVAILABLE;

  const totalAvailable = normalizeNumber(category.totalAvailable);
  const syncedCount = normalizeNumber(category.importedCount ?? category.syncedCount);
  if (totalAvailable > 0 && syncedCount >= totalAvailable) {
    return SYNC_DATA_STATUS.FULLY_IMPORTED;
  }
  if (syncedCount > 0) return SYNC_DATA_STATUS.PARTIALLY_IMPORTED;
  return SYNC_DATA_STATUS.NOT_IMPORTED;
};

export const normalizeSyncDataCategory = (category = {}) => {
  const code = String(category.code || category.categoryCode || "").trim();
  const supported = category.supported !== false;
  const totalAvailable = normalizeNumber(category.totalAvailable ?? category.total);
  const syncedCount = normalizeNumber(category.importedCount ?? category.syncedCount);

  return {
    code,
    label: category.label || category.name || titleize(code),
    supported,
    totalAvailable,
    syncedCount,
    status: supported ? normalizeCategoryStatus(category) : SYNC_DATA_STATUS.UNAVAILABLE,
  };
};

export const normalizeSyncDataCategoriesResponse = (response = {}) => {
  const raw = response?.data || response || {};
  const categories = toArray(raw.categories).map(normalizeSyncDataCategory).filter((item) => item.code);

  return {
    connectionId: raw.connectionId || raw.connection_id || "",
    provider: raw.provider || "",
    granularSyncSupported: raw.granularSyncSupported === true,
    categories,
    raw,
  };
};

export const normalizeSyncDataItem = (item = {}) => {
  const sourceItemId = String(item.sourceItemId || item.source_item_id || item.id || "").trim();

  return {
    sourceItemId,
    name: item.name || item.label || item.displayName || sourceItemId,
    code: item.code || item.externalCode || item.external_code || "",
    alreadySynced: item.imported === true,
    syncedAt: item.importedAt || item.imported_at || null,
  };
};

export const normalizeSyncDataItemsResponse = (response = {}) => {
  const raw = response?.data || response || {};
  const items = toArray(raw.items).map(normalizeSyncDataItem).filter((item) => item.sourceItemId);
  const limit = normalizeNumber(raw.limit) || SYNC_DATA_LIMIT;
  const offset = normalizeNumber(raw.offset);
  const total = normalizeNumber(raw.total ?? items.length);

  return {
    items,
    total,
    limit,
    offset,
    hasMore: Boolean(raw.hasMore ?? offset + items.length < total),
    raw,
  };
};

export const buildSyncDataImportPayload = (selectedIds = []) => ({
  itemIds: Array.from(new Set(toArray(selectedIds).map(String).filter(Boolean))),
});

export const normalizeSyncDataImportResponse = (response = {}) => {
  const raw = response?.data || response || {};
  const results = toArray(raw.results).map((result = {}) => ({
    sourceItemId: result.sourceItemId || result.source_item_id || "",
    status: String(result.status || "").toUpperCase(),
    message: result.message || null,
  }));

  return {
    requestedCount: normalizeNumber(raw.requestedCount),
    successCount: normalizeNumber(raw.successCount),
    failureCount: normalizeNumber(raw.failureCount),
    results,
    raw,
  };
};

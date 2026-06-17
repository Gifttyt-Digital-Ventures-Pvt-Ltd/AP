export const normalizeIntegrationProvenance = (record = {}) => ({
  sourceSystem: record.sourceSystem ?? record.source_system ?? null,
  sourceDirection: record.sourceDirection ?? record.source_direction ?? null,
  syncStatus: record.syncStatus ?? record.sync_status ?? null,
  integrationProvider: record.integrationProvider ?? record.integration_provider ?? null,
  integrationConnectionId:
    record.integrationConnectionId ?? record.integration_connection_id ?? null,
  syncErrorMessage: record.syncErrorMessage ?? record.sync_error_message ?? null,
  lastSyncedAt: record.lastSyncedAt ?? record.last_synced_at ?? null,
  editPolicy: record.editPolicy ?? record.edit_policy ?? null,
  externalIds: record.externalIds ?? record.external_ids ?? null,
});

const hasZohoExternalId = (externalIds = {}) =>
  Boolean(
    externalIds?.zohoContactId ||
      externalIds?.zoho_contact_id ||
      externalIds?.zohoBillId ||
      externalIds?.zoho_bill_id ||
      externalIds?.zohoPaymentId ||
      externalIds?.zoho_payment_id ||
      externalIds?.zohoJournalId ||
      externalIds?.zoho_journal_id,
  );

export const getIntegrationBadgePresentation = (record = {}) => {
  const provenance = normalizeIntegrationProvenance(record);
  const { sourceSystem, sourceDirection, syncStatus, syncErrorMessage } = provenance;
  const direction = String(sourceDirection || "").toUpperCase();
  const status = String(syncStatus || "").toUpperCase();
  const system = String(sourceSystem || "").toUpperCase();

  if (status === "FAILED") {
    return {
      label: "Sync failed",
      tone: "error",
      tooltip: syncErrorMessage || "Integration sync failed for this record.",
    };
  }

  if (status === "CONFLICT" || status === "REVIEW_REQUIRED") {
    return {
      label: "Needs review",
      tone: "warning",
      tooltip: syncErrorMessage || "Resolve this record in Integrations review queue.",
    };
  }

  if (direction === "PULLED_FROM_ZOHO" || system === "ZOHO_BOOKS") {
    return {
      label: "Zoho Books",
      tone: "zoho",
      tooltip: provenance.lastSyncedAt
        ? `Pulled from Zoho Books. Last synced ${new Date(provenance.lastSyncedAt).toLocaleString("en-IN")}.`
        : "Pulled from Zoho Books.",
    };
  }

  if (
    direction === "PUSHED_TO_ZOHO" ||
    direction === "MATCHED_TO_ZOHO" ||
    status === "SYNCED" ||
    hasZohoExternalId(provenance.externalIds)
  ) {
    return {
      label: "Optifii · Synced",
      tone: "synced",
      tooltip: provenance.lastSyncedAt
        ? `Synced with Zoho Books. Last synced ${new Date(provenance.lastSyncedAt).toLocaleString("en-IN")}.`
        : "Synced with Zoho Books.",
    };
  }

  if (status === "PENDING") {
    return {
      label: "Sync pending",
      tone: "pending",
      tooltip: "Waiting for Zoho Books sync.",
    };
  }

  return {
    label: "Optifii",
    tone: "native",
    tooltip: "Created and managed in Optifii.",
  };
};

export const INTEGRATION_TABLE_COLUMN = {
  key: "integration",
  title: "Integration",
  headerClassName: "text-left",
  cellClassName: "text-left",
};

export const withIntegrationTableHeader = (headers = [], showIntegrationColumn = false) => {
  if (!showIntegrationColumn) return headers;
  const actionsIndex = headers.findIndex((header) => header.key === "actions");
  if (actionsIndex === -1) {
    return [...headers, INTEGRATION_TABLE_COLUMN];
  }
  return [
    ...headers.slice(0, actionsIndex),
    INTEGRATION_TABLE_COLUMN,
    ...headers.slice(actionsIndex),
  ];
};

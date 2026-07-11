/** Accounting domain constants — aligned to OptiFii Accounting Module PRD. */

export const ERP_SOURCE = {
  ZOHO: "ZOHO_BOOKS",
  TALLY: "TALLY",
  OPTIFII: "OPTIFII",
};

export const ERP_SOURCE_LABELS = {
  [ERP_SOURCE.ZOHO]: "Zoho Books",
  [ERP_SOURCE.TALLY]: "Tally",
  [ERP_SOURCE.OPTIFII]: "OptiFii",
};

/** Nested COA node kinds (lowercase, matches PRD UI). */
export const COA_TYPE = {
  CATEGORY: "category",
  GROUP: "group",
  LEDGER: "ledger",
};

/** @deprecated use COA_TYPE — kept for lock/utils compatibility */
export const NODE_TYPE = {
  CATEGORY: "category",
  GROUP: "group",
  LEDGER: "ledger",
};

export const ACCOUNT_STATUS = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
};

/** Accounting workflow status (queue). */
export const ACC_STATUS = {
  NOT_READY: "Not Ready",
  READY: "Ready",
  QUEUED: "Queued",
  SYNCED: "Synced",
  FAILED: "Failed",
};

/** ERP push status (queue / transactions). */
export const ERP_STATUS = {
  NOT_SYNCED: "Not Synced",
  READY_TO_SYNC: "Ready to Sync",
  SYNCED: "Synced",
  FAILED: "Failed",
  RETRY_REQUIRED: "Retry Required",
  NONE: "—",
};

/** Business / final document status. */
export const BIZ_STATUS = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Pending Approval",
  APPROVED: "Approved",
  PAID: "Paid",
};

/**
 * Wire enums the backend may still return.
 * Map into display ACC_STATUS / ERP_STATUS in normalizers.
 */
export const SYNC_STATUS = {
  NOT_SYNCED: "NOT_SYNCED",
  READY_TO_SYNC: "READY_TO_SYNC",
  SYNCED: "SYNCED",
  FAILED: "FAILED",
  RETRY_REQUIRED: "RETRY_REQUIRED",
  QUEUED: "QUEUED",
  NOT_READY: "NOT_READY",
  READY: "READY",
};

export const OBJECT_TYPE = {
  INVOICE: "INVOICE",
  PO: "PO",
  PI: "PI",
  GRN: "GRN",
  VENDOR: "VENDOR",
};

export const QUEUE_TAB = {
  PO: "Purchase Orders",
  GRN: "GRN",
  INVOICE: "Invoices",
  PI: "Proforma Invoices",
  VENDOR: "Vendors",
};

export const OBJECT_TYPE_LABELS = {
  [OBJECT_TYPE.INVOICE]: "Invoice",
  [OBJECT_TYPE.PO]: "Purchase Order",
  [OBJECT_TYPE.PI]: "Proforma Invoice",
  [OBJECT_TYPE.GRN]: "Goods Receipt",
  [OBJECT_TYPE.VENDOR]: "Vendor",
};

export const OBJECT_TYPE_TO_TAB = {
  [OBJECT_TYPE.PO]: QUEUE_TAB.PO,
  [OBJECT_TYPE.GRN]: QUEUE_TAB.GRN,
  [OBJECT_TYPE.INVOICE]: QUEUE_TAB.INVOICE,
  [OBJECT_TYPE.PI]: QUEUE_TAB.PI,
  [OBJECT_TYPE.VENDOR]: QUEUE_TAB.VENDOR,
};

export const TAB_TO_OBJECT_TYPE = {
  [QUEUE_TAB.PO]: OBJECT_TYPE.PO,
  [QUEUE_TAB.GRN]: OBJECT_TYPE.GRN,
  [QUEUE_TAB.INVOICE]: OBJECT_TYPE.INVOICE,
  [QUEUE_TAB.PI]: OBJECT_TYPE.PI,
  [QUEUE_TAB.VENDOR]: OBJECT_TYPE.VENDOR,
};

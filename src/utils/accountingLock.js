/**
 * Accounting Ready lock (rules 17–22).
 * When a record is marked Accounting Ready it is locked across Invoice / PO / PI / GRN / Vendor UIs.
 */

export const isAccountingReadyLocked = (record = {}) => {
  if (!record || typeof record !== "object") return false;
  if (record.locked === true || record.is_locked === true || record.isLocked === true) {
    return true;
  }
  if (record.accountingReady === true || record.accounting_ready === true) {
    return true;
  }
  const policy = String(record.editPolicy ?? record.edit_policy ?? "").toUpperCase();
  return policy === "LOCKED" || policy === "ACCOUNTING_READY_LOCKED";
};

export const getAccountingUnlockRequestStatus = (record = {}) =>
  record.unlockRequestStatus ??
  record.unlock_request_status ??
  record.unlockStatus ??
  record.unlock_status ??
  null;

export const getAccountingReadyBlockedMessage = (record = {}, objectLabel = "record") => {
  const unlockStatus = String(getAccountingUnlockRequestStatus(record) || "").toUpperCase();
  if (unlockStatus === "PENDING") {
    return `This ${objectLabel} is locked for Accounting Ready. An unlock request is pending approval by an Integrations user.`;
  }
  return `This ${objectLabel} is locked for Accounting Ready. Request unlock from this screen, then an Integrations user will approve it on Accounting → Accounting Ready Items.`;
};

export const withAccountingLock = (canEditFn, objectLabel = "record") => (record, identity) => {
  if (isAccountingReadyLocked(record)) return false;
  return canEditFn(record, identity);
};

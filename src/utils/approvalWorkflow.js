export const NEEDS_CORRECTION_STATUS = "Needs Correction";
export const LEGACY_SENT_BACK_STATUS = "Sent Back";
export const NEEDS_CORRECTION_ACTION = "Needs Correction";
export const LEGACY_SENT_BACK_ACTION = "Sent Back";
export const PAID_STATUS = "Paid";
export const LEGACY_AMOUNT_RELEASED_STATUS = "Amount Released";

const TITLE_CASE_STATUS_ALIASES = {
  PAID: PAID_STATUS,
  AMOUNT_RELEASED: PAID_STATUS,
  PENDING_CHECKER: "Pending Checker",
  PENDING_APPROVER: "Pending Approver",
  PENDING_APPROVAL: "Pending Approval",
  PENDING_PAYMENT: "Pending Payment",
  VENDOR_APPROVAL_PENDING: "Vendor Approval Pending",
  NEEDS_CORRECTION: NEEDS_CORRECTION_STATUS,
  DRAFT: "Draft",
  REJECTED: "Rejected",
};

export const normalizeWorkflowStatus = (status) => {
  const value = String(status || "").trim();
  if (!value) return value;
  if (value === LEGACY_SENT_BACK_STATUS) return NEEDS_CORRECTION_STATUS;
  if (value === LEGACY_AMOUNT_RELEASED_STATUS) return PAID_STATUS;
  const upperSnake = value.toUpperCase().replace(/\s+/g, "_");
  if (TITLE_CASE_STATUS_ALIASES[upperSnake]) return TITLE_CASE_STATUS_ALIASES[upperSnake];
  if (upperSnake === "PAID") return PAID_STATUS;
  return value;
};

export const getInvoiceStatusBadgeClass = (status) => {
  const normalizedStatus = normalizeWorkflowStatus(status);
  const statusMap = {
    Draft: "bg-gray-100 text-gray-800 border-gray-200",
    "Pending Checker": "bg-yellow-100 text-yellow-800 border-yellow-200",
    "Pending Approver": "bg-yellow-100 text-yellow-800 border-yellow-200",
    "Pending Approval": "bg-[#FFF7CC] text-[#7A4A00] border-[#F2D675]",
    "Pending Payment": "bg-blue-100 text-blue-800 border-blue-200",
    [PAID_STATUS]: "bg-emerald-100 text-emerald-800 border-emerald-200",
    Rejected: "bg-red-100 text-red-800 border-red-200",
    [NEEDS_CORRECTION_STATUS]: "bg-amber-100 text-amber-900 border-amber-200",
    "Vendor Approval Pending": "bg-purple-100 text-purple-800 border-purple-200",
  };
  return statusMap[normalizedStatus] || "bg-gray-100 text-gray-800 border-gray-200";
};

const INVOICE_APPROVAL_ACTIONABLE_STATUSES = new Set([
  "Pending Checker",
  "Pending Approver",
  "Pending Approval",
]);

export const isInvoiceAwaitingApproval = (status) =>
  INVOICE_APPROVAL_ACTIONABLE_STATUSES.has(normalizeWorkflowStatus(status));

export const isInvoicePaid = (status) => normalizeWorkflowStatus(status) === PAID_STATUS;

export const normalizeHistoryActionType = (actionType) => {
  const value = String(actionType || "").trim();
  if (value === "Payment Released" || value === LEGACY_AMOUNT_RELEASED_STATUS) {
    return PAID_STATUS;
  }
  return value;
};

export const normalizeApprovalAction = (action) => {
  const value = String(action || "").trim();
  if (value === LEGACY_SENT_BACK_ACTION) return NEEDS_CORRECTION_ACTION;
  return value;
};

export const formatWorkflowStatus = (status) => normalizeWorkflowStatus(status);

export const emailsMatch = (left, right) => {
  if (!left || !right) return false;
  return String(left).trim().toLowerCase() === String(right).trim().toLowerCase();
};

export const resolveCreatorEmail = (entity = {}) => {
  const candidates = [
    entity.created_by_email,
    entity.createdByEmail,
    entity.created_by,
    entity.createdBy,
  ];
  const emailLike = candidates.find(
    (value) => typeof value === "string" && value.includes("@"),
  );
  if (emailLike) return emailLike;
  return candidates.find((value) => value) || "";
};

export const isEntityCreator = (entity, userEmail) => {
  const creatorEmail = resolveCreatorEmail(entity);
  if (!creatorEmail || !userEmail) return false;
  return emailsMatch(creatorEmail, userEmail);
};

export const extractApiErrorDetail = (error) => {
  const detail = error?.data?.detail ?? error?.data?.message;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((item) => item?.msg || item?.message || JSON.stringify(item)).join(", ");
  }
  return "";
};

const INVOICE_DELETABLE_STATUSES = new Set([
  "Draft",
  "Pending Checker",
  "Pending Approver",
  "Pending Approval",
  "Rejected",
]);

export const canEditInvoice = (invoice, { userEmail, canUpdateInvoices }) => {
  if (!canUpdateInvoices) return false;

  const status = normalizeWorkflowStatus(invoice?.status);
  if (status !== NEEDS_CORRECTION_STATUS) return false;

  return isEntityCreator(invoice, userEmail);
};

export const canDeleteInvoice = (status, canDeleteInvoices) => {
  if (!canDeleteInvoices) return false;
  return INVOICE_DELETABLE_STATUSES.has(normalizeWorkflowStatus(status));
};

const VENDOR_MAKER_EDITABLE_STATUSES = new Set([
  "Request Create",
  "Pending Approval",
  "Approved",
  "Draft",
]);

export const canEditVendor = (vendor, { userEmail, canUpdateVendor }) => {
  if (!canUpdateVendor) return false;

  const status = normalizeWorkflowStatus(vendor?.status);
  if (status === "Rejected") return false;

  if (status === NEEDS_CORRECTION_STATUS) {
    return isEntityCreator(vendor, userEmail);
  }

  return VENDOR_MAKER_EDITABLE_STATUSES.has(status) || status === "";
};

export const NEEDS_CORRECTION_STATUS = "Needs Correction";
export const LEGACY_SENT_BACK_STATUS = "Sent Back";
export const NEEDS_CORRECTION_ACTION = "Needs Correction";
export const LEGACY_SENT_BACK_ACTION = "Sent Back";
export const PAID_STATUS = "Paid";
export const LEGACY_AMOUNT_RELEASED_STATUS = "Amount Released";
export const SAVED_STATUS = "Saved";
export const PENDING_CHECKER_STATUS = "Pending Checker";
export const VENDOR_APPROVAL_PENDING_STATUS = "Vendor Approval Pending";

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
  SAVED: "Saved",
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
    Saved: "bg-slate-100 text-slate-800 border-slate-200",
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

export const resolveInitialInvoiceStatus = ({
  vendorId,
  vendorRequestSubmitted = false,
  findVendorById,
} = {}) => {
  if (vendorRequestSubmitted) return VENDOR_APPROVAL_PENDING_STATUS;
  if (!vendorId) return VENDOR_APPROVAL_PENDING_STATUS;

  const vendor = findVendorById?.(vendorId);
  if (vendor?.isPendingApproval) return VENDOR_APPROVAL_PENDING_STATUS;

  return PENDING_CHECKER_STATUS;
};

export const resolveBulkCreateInvoiceStatus = () => SAVED_STATUS;

export const resolveBulkCreateVendorStatus = () => SAVED_STATUS;

export const isSavedVendorStatus = (status) =>
  normalizeWorkflowStatus(status) === SAVED_STATUS;

export const resolveSavedVendorSubmitStatus = () => "Pending Approval";

export const emailsMatch = (left, right) => {
  if (!left || !right) return false;
  return String(left).trim().toLowerCase() === String(right).trim().toLowerCase();
};

const normalizeDisplayName = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

export const namesMatch = (left, right) => {
  if (!left || !right) return false;
  return normalizeDisplayName(left) === normalizeDisplayName(right);
};

const pickEmailLikeValue = (values = []) =>
  values.find((value) => typeof value === "string" && value.includes("@")) || "";

export const resolveCreatorEmail = (entity = {}) => {
  const emailLike = pickEmailLikeValue([
    entity.createdByEmail,
    entity.createdByEmail,
    entity.requested_by_email,
    entity.requestedByEmail,
    entity.creator_email,
    entity.creatorEmail,
    entity.createdByName,
    entity.createdByName,
    entity.requested_by_name,
    entity.requestedByName,
    entity.created_by,
    entity.createdBy,
    entity.requested_by,
    entity.requestedBy,
  ]);
  return emailLike;
};

export const resolveCreatorUserId = (entity = {}) => {
  const idCandidates = [
    entity.createdById,
    entity.createdById,
    entity.creator_id,
    entity.creatorId,
    entity.requested_by_id,
    entity.requestedById,
  ];

  for (const value of idCandidates) {
    if (value !== null && value !== undefined && value !== "" && !String(value).includes("@")) {
      return value;
    }
  }

  const legacyCreatedBy = entity.created_by ?? entity.createdBy;
  if (
    legacyCreatedBy !== null &&
    legacyCreatedBy !== undefined &&
    legacyCreatedBy !== "" &&
    !String(legacyCreatedBy).includes("@")
  ) {
    return legacyCreatedBy;
  }

  return null;
};

export const resolveCreatorDisplayName = (entity = {}) =>
  entity.createdByName ??
  entity.createdByName ??
  entity.requested_by_name ??
  entity.requestedByName ??
  "";

const uniqueStrings = (values = []) =>
  [...new Set(values.filter((value) => value !== null && value !== undefined && value !== "").map(String))];

export const buildCurrentUserIdentity = ({ user, corporateUserContext } = {}) => {
  const corporateUser = corporateUserContext?.corporateUser;
  const employeeDetails = corporateUserContext?.employeeDetails;

  const userEmails = uniqueStrings(
    [
      corporateUser?.email,
      employeeDetails?.email,
      user?.email,
      user?.identifier,
      typeof user?.name === "string" && user.name.includes("@") ? user.name : null,
    ].filter((value) => typeof value === "string" && value.includes("@")),
  ).map((email) => email.trim().toLowerCase());

  const userIds = uniqueStrings([
    corporateUser?.id,
    corporateUser?.userId,
    employeeDetails?.id,
    employeeDetails?.employeeId,
    employeeDetails?.optifiiUserId,
    employeeDetails?.userId,
    user?.id,
  ]).filter((id) => !id.includes("@"));

  const employeeFullName = [employeeDetails?.firstName, employeeDetails?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  const userNames = uniqueStrings([
    corporateUser?.name,
    corporateUser?.userName,
    employeeDetails?.name,
    employeeDetails?.employeeName,
    employeeDetails?.fullName,
    employeeFullName || null,
    user?.name,
    typeof user?.identifier === "string" && !user.identifier.includes("@") ? user.identifier : null,
  ]).filter((name) => !String(name).includes("@"));

  return {
    userEmail: userEmails[0] || "",
    userId: userIds[0] || "",
    userName: userNames[0] || "",
    userEmails,
    userIds,
    userNames,
  };
};

export const isEntityCreator = (
  entity,
  userEmail,
  userId,
  { userEmails = [], userIds = [], userNames = [] } = {},
) => {
  const emailsToCheck = uniqueStrings([userEmail, ...userEmails]).map((email) =>
    email.toLowerCase(),
  );
  const idsToCheck = uniqueStrings([userId, ...userIds]).filter((id) => !id.includes("@"));
  const namesToCheck = uniqueStrings(userNames);

  const creatorEmail = resolveCreatorEmail(entity);
  if (creatorEmail && emailsToCheck.some((email) => emailsMatch(creatorEmail, email))) {
    return true;
  }

  const creatorId = resolveCreatorUserId(entity);
  if (creatorId !== null && idsToCheck.some((id) => String(creatorId) === String(id))) {
    return true;
  }

  const creatorName = resolveCreatorDisplayName(entity);
  if (creatorName && namesToCheck.some((name) => namesMatch(creatorName, name))) {
    return true;
  }

  return false;
};

const matchesCreator = (entity, identity = {}) =>
  isEntityCreator(entity, identity.userEmail, identity.userId, {
    userEmails: identity.userEmails,
    userIds: identity.userIds,
    userNames: identity.userNames,
  });

export const extractApiErrorDetail = (error) => {
  const detail = error?.data?.detail ?? error?.data?.message;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((item) => item?.msg || item?.message || JSON.stringify(item)).join(", ");
  }
  return "";
};

const INVOICE_MUTABLE_STATUSES = new Set([
  NEEDS_CORRECTION_STATUS,
  "Saved",
  "Pending Checker",
  "Vendor Approval Pending",
]);

export const isSavedInvoiceStatus = (status) =>
  normalizeWorkflowStatus(status) === "Saved";

export const canForwardSavedInvoice = (invoice, identity = {}) => {
  if (!isSavedInvoiceStatus(invoice?.status)) return false;
  const { canUpdateInvoices, canManageInvoices } = identity;
  return Boolean(canUpdateInvoices || canManageInvoices);
};
const INVOICE_DELETABLE_STATUSES = new Set([
  ...INVOICE_MUTABLE_STATUSES,
  "Rejected",
]);

export const shouldCheckerSubmitOnUpdate = (invoice, identity = {}) => {
  const status = normalizeWorkflowStatus(invoice?.status);
  return (
    status === PENDING_CHECKER_STATUS &&
    Boolean(identity.isCheckerEditEnabled) &&
    Boolean(identity.canCheckInvoices)
  );
};

export const canEditInvoice = (invoice, identity = {}) => {
  const {
    canUpdateInvoices,
    canManageInvoices,
    canCheckInvoices,
    isCorporateAdmin,
    isCheckerEditEnabled = false,
  } = identity;

  const status = normalizeWorkflowStatus(invoice?.status);
  if (!INVOICE_MUTABLE_STATUSES.has(status)) return false;

  if (status === PENDING_CHECKER_STATUS) {
    if (!isCheckerEditEnabled) return false;
    if (isCorporateAdmin) return true;
    if (canCheckInvoices) return true;
    return Boolean(canUpdateInvoices || canManageInvoices);
  }

  if (isCorporateAdmin) return true;

  const canMutateInvoice = canUpdateInvoices || canManageInvoices;
  if (!canMutateInvoice) return false;

  if (status === NEEDS_CORRECTION_STATUS) {
    return Boolean(canManageInvoices || matchesCreator(invoice, identity));
  }
  return true;
};

export const getInvoiceEditBlockedMessage = (invoice, identity = {}) => {
  const status = normalizeWorkflowStatus(invoice?.status);
  const {
    canUpdateInvoices,
    canManageInvoices,
    canCheckInvoices,
    isCheckerEditEnabled = false,
  } = identity;

  if (
    status === PENDING_CHECKER_STATUS &&
    !isCheckerEditEnabled &&
    (canCheckInvoices || canUpdateInvoices || canManageInvoices)
  ) {
    return 'Invoice editing during checker review is not enabled for your organization';
  }

  if (!canUpdateInvoices && !canManageInvoices && !canCheckInvoices) {
    return 'You do not have permission to edit this invoice';
  }

  if (status === NEEDS_CORRECTION_STATUS) {
    return 'Only the creator or an invoice manager can edit an invoice in Needs Correction status';
  }

  return `Invoices in ${status || 'this'} status cannot be edited`;
};

export const canDeleteInvoice = (status, canDeleteInvoices) => {
  if (!canDeleteInvoices) return false;
  return INVOICE_DELETABLE_STATUSES.has(normalizeWorkflowStatus(status));
};

const VENDOR_MAKER_EDITABLE_STATUSES = new Set([
  "Create Request",
  "Pending Approval",
  "Approved",
  "Draft",
  SAVED_STATUS,
]);

export const canEditVendor = (vendor, identity = {}) => {
  const { canUpdateVendor, canRequestVendor, isCorporateAdmin } = identity;
  const status = normalizeWorkflowStatus(vendor?.status);
  if (status === "Rejected") return false;

  const isCreator = matchesCreator(vendor, identity);
  const canMutateVendor = canUpdateVendor || canRequestVendor;

  if (status === NEEDS_CORRECTION_STATUS) {
    if (isCorporateAdmin && canUpdateVendor) return true;
    return canMutateVendor && isCreator;
  }

  if (!canUpdateVendor) return false;
  return VENDOR_MAKER_EDITABLE_STATUSES.has(status) || status === "";
};

export const canSaveVendorEdit = (vendor, identity = {}) => {
  const { canUpdateVendor, canRequestVendor } = identity;
  if (canUpdateVendor) return true;

  const status = normalizeWorkflowStatus(vendor?.status);
  if (status === NEEDS_CORRECTION_STATUS && canRequestVendor) {
    return matchesCreator(vendor, identity);
  }

  return false;
};

import { FULL_ACCESS_PERMISSION } from "../../../constants/rbacPolicy";

const normalizeRole = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^role[_-]?/, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const collectRoles = ({ user, corporateUserContext }) => {
  const roles = new Set();
  [
    user?.role,
    user?.type,
    corporateUserContext?.effectiveRole,
    corporateUserContext?.corporateUser?.role,
    corporateUserContext?.type,
  ].forEach((role) => {
    const normalized = normalizeRole(role);
    if (normalized) roles.add(normalized);
  });

  const assignedRoles = corporateUserContext?.employeeDetails?.assignedRoles;
  if (Array.isArray(assignedRoles)) {
    assignedRoles.forEach((role) => {
      const normalized = normalizeRole(role);
      if (normalized) roles.add(normalized);
    });
  }
  if (typeof assignedRoles === "string") {
    assignedRoles.split(",").forEach((role) => {
      const normalized = normalizeRole(role);
      if (normalized) roles.add(normalized);
    });
  }

  return roles;
};

export const buildCampaignAccess = ({
  user,
  corporateUserContext,
  hasPermission,
}) => {
  const roles = collectRoles({ user, corporateUserContext });
  const admin =
    roles.has("admin") ||
    roles.has("corp_admin") ||
    roles.has("corpadmin") ||
    hasPermission?.(FULL_ACCESS_PERMISSION);

  const canManage =
    admin ||
    roles.has("creator") ||
    roles.has("maker") ||
    roles.has("finance") ||
    roles.has("accountant") ||
    hasPermission?.("campaign-manage") ||
    hasPermission?.("payments-manage");

  const canApproveCampaign =
    admin ||
    roles.has("approver") ||
    hasPermission?.("campaign-approve");

  const canCheckInvoice =
    admin || roles.has("checker") || hasPermission?.("invoice-checker");

  const canApproveInvoice =
    admin || roles.has("approver") || hasPermission?.("invoice-approver");

  return {
    roles,
    admin,
    canManage,
    canApproveCampaign,
    canCreateCampaign: canManage,
    canReviewCampaign: canApproveCampaign,
    canSubmitInvoice: canManage,
    canCheckInvoice,
    canApproveInvoice,
    canRecordAdvance: canManage,
    canMarkPaid: canManage,
  };
};

export const getVendorRowActions = ({ row, campaign, access }) => {
  if (campaign?.status !== "approved") return {};
  const status = row?.status || "no_invoice";
  return {
    recordAdvance:
      access.canRecordAdvance &&
      ["no_invoice", "pending_checker", "pending_approval", "pending_payment"].includes(status),
    submitInvoice: access.canSubmitInvoice,
    reviewChecker: false,
    reviewApprover: false,
    markPaid: access.canMarkPaid && status === "pending_payment",
  };
};

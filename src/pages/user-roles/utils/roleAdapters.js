import { mapScreenPermissionToCanonical } from "../../../utils/rbacPermissions";

const CUSTOM_ROLE_PERMISSION_MAP = {
  "dashboard-view": { screen: "DASHBOARD", permissionType: "VIEW" },
  "vendors-view": { screen: "VENDORS", permissionType: "VIEW" },
  "vendors-manage": { screen: "VENDORS", permissionType: "MANAGE" },
  "vendors-approve": { screen: "VENDORS", permissionType: "APPROVE" },
  "po-view": { screen: "PURCHASE_ORDER", permissionType: "VIEW" },
  "po-manage": { screen: "PURCHASE_ORDER", permissionType: "MANAGE" },
  "po-approve": { screen: "PURCHASE_ORDER", permissionType: "APPROVE" },
  "grn-view": { screen: "GRN", permissionType: "VIEW" },
  "grn-manage": { screen: "GRN", permissionType: "MANAGE" },
  "grn-approve": { screen: "GRN", permissionType: "APPROVE" },
  "pi-view": { screen: "PI", permissionType: "VIEW" },
  "pi-manage": { screen: "PI", permissionType: "MANAGE" },
  "pi-approve": { screen: "PI", permissionType: "APPROVE" },
  "invoice-view": { screen: "INVOICE", permissionType: "VIEW" },
  "invoice-maker": { screen: "INVOICE", permissionType: "MAKER" },
  "invoice-checker": { screen: "INVOICE", permissionType: "CHECKER" },
  "invoice-approver": { screen: "INVOICE", permissionType: "APPROVER" },
  "matching-view": { screen: "INVOICE_MATCHING", permissionType: "VIEW" },
  "matching-manage": { screen: "INVOICE_MATCHING", permissionType: "MANAGE" },
  "approval-full": { screen: "APPROVAL", permissionType: "FULL" },
  "payments-view": { screen: "PAYMENTS", permissionType: "VIEW" },
  "payments-manage": { screen: "PAYMENTS", permissionType: "MANAGE" },
  "tax-view": { screen: "TAX_MANAGEMENT", permissionType: "VIEW" },
  "tax-manage": { screen: "TAX_MANAGEMENT", permissionType: "MANAGE" },
  "reports-full": { screen: "REPORTS", permissionType: "FULL" },
  "banking-full": { screen: "BANKING", permissionType: "FULL" },
  "roles-view": { screen: "MANAGE_ROLE", permissionType: "VIEW" },
  "roles-manage": { screen: "MANAGE_ROLE", permissionType: "MANAGE" },
  "vendor-workflow-view": { screen: "VENDOR_APPROVAL_WORKFLOW", permissionType: "VIEW" },
  "vendor-workflow-manage": { screen: "VENDOR_APPROVAL_WORKFLOW", permissionType: "MANAGE" },
  "settings-org": { screen: "SETTINGS", permissionType: "ORG" },
  "settings-banking": { screen: "SETTINGS", permissionType: "BANKING" },
  "settings-interaction": { screen: "SETTINGS", permissionType: "INTERACTION" },
};

const toArray = (value) => (Array.isArray(value) ? value : []);

export const normalizePermissions = (permissions) => {
  if (!permissions) return [];
  if (Array.isArray(permissions)) {
    if (permissions.every((item) => typeof item === "string")) {
      return permissions.filter((item) => typeof item === "string");
    }
    const fromScreenPermissions = permissions
      .map((item) =>
        mapScreenPermissionToCanonical(item?.screen, item?.permissionType),
      )
      .filter(Boolean);
    return fromScreenPermissions;
  }
  if (typeof permissions === "object") {
    return Object.entries(permissions)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([key]) => key);
  }
  return [];
};

const normalizeRoleName = (value) => String(value || "").trim();

const normalizeRoleToken = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

const toUserName = (user) => user?.name || user?.full_name || user?.email || "Unknown User";
const toUserId = (user) => user?.id || user?.empId || user?.employeeId || null;

const matchesRole = (candidate, roleName) => {
  const candidateRole = normalizeRoleName(candidate?.role || candidate?.role_name || candidate?.title);
  if (!candidateRole || !roleName) return false;
  return normalizeRoleToken(candidateRole) === normalizeRoleToken(roleName);
};

export const toUiRole = (role = {}, users = []) => {
  const roleName = normalizeRoleName(
    role.roleName || role.name || role.role_name || role.title || role.roleCode || role.role_code || role.id,
  );
  const backendPermissions = normalizePermissions(role.permissions);
  const matchedUsers = toArray(users).filter((user) => matchesRole(user, roleName));
  const assignedUsersFromRole = toArray(role?.employees || role?.assignedEmployees || role?.users).map((employee) => ({
    id: toUserId(employee),
    name: toUserName(employee),
  }));
  const matchedAssignedUsers = matchedUsers.map((user) => ({
    id: toUserId(user),
    name: toUserName(user),
  }));
  const combinedAssignedUsers = [...matchedAssignedUsers, ...assignedUsersFromRole].filter((user) => user?.name);
  const uniqueAssignedUsers = [];
  const seenUserKeys = new Set();
  combinedAssignedUsers.forEach((user) => {
    const key = String(user.id || normalizeRoleToken(user.name));
    if (seenUserKeys.has(key)) return;
    seenUserKeys.add(key);
    uniqueAssignedUsers.push(user);
  });

  return {
    id: String(role.id || role.roleId || roleName || `role-${Math.random().toString(36).slice(2, 9)}`),
    key: String(role.id || role.roleId || role.roleCode || role.role_code || normalizeRoleToken(roleName)),
    templateId: null,
    sourceRoleName: roleName,
    name: roleName,
    description: role.description || role.summary || "",
    permissions: backendPermissions,
    permissionsCount: backendPermissions.length,
    users: uniqueAssignedUsers.map((user) => user.name),
    assignedUsers: uniqueAssignedUsers,
    assignedEmployeeIds: uniqueAssignedUsers.map((user) => user.id).filter(Boolean),
    roleCode: role.roleCode || role.role_code || null,
    active: role.active !== false,
  };
};

const toRoleCodeToken = (value = "") =>
  String(value)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

export const buildCustomRoleCode = (roleName = "") => {
  const token = toRoleCodeToken(roleName);
  return `CUSTOM_${token || "ROLE"}`;
};

export const mapUiPermissionsToCustomRolePayload = (permissions = []) => {
  const selectedPermissions = normalizePermissions(permissions);
  const mapped = [];
  const unmapped = [];

  selectedPermissions.forEach((permissionId) => {
    const entry = CUSTOM_ROLE_PERMISSION_MAP[permissionId];
    if (!entry) {
      unmapped.push(permissionId);
      return;
    }
    mapped.push(entry);
  });

  const unique = [];
  const seen = new Set();
  mapped.forEach((entry) => {
    const key = `${entry.screen}:${entry.permissionType}`;
    if (seen.has(key)) return;
    seen.add(key);
    unique.push(entry);
  });

  return {
    permissions: unique,
    unmappedPermissions: unmapped,
  };
};

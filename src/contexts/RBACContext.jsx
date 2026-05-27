import React, { createContext, useContext, useEffect, useMemo } from "react";
import { useAuth } from "./AuthContext";
import {
  useGetCorporateScreensQuery,
  useGetCorporateUserDetailsQuery,
  useGetEmployeeCustomRolesQuery,
} from "../Services/apis/corporateApi";
import { PERMISSION_LABELS } from "../pages/user-roles/constants/permissionConfig";
import {
  ACTION_PERMISSION_RULES,
  FULL_ACCESS_PERMISSION,
  resolveRouteCorporateEntitlementRule,
  resolveRoutePermissionRule,
} from "../constants/rbacPolicy";

const RBACContext = createContext({
  isLoaded: false,
  permissions: [],
  permissionSource: null,
  unmappedPermissions: [],
  hasPermission: () => false,
  hasAnyPermission: () => false,
  hasAllPermissions: () => false,
  canAccessRoute: () => false,
  canPerformAction: () => false,
  isCorporateScreenAllowed: () => false,
  isCorporateSectionEnabled: () => false,
  isCategoryFeatureEnabled: false,
});

const normalizeRoleToken = (value = "") =>
  String(value)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const toArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [value];
};

const normalizeEntitlementToken = (value = "") =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const normalizeRoutePath = (path = "") => {
  const raw = String(path || "").trim();
  if (!raw) return "/";
  return raw !== "/" && raw.endsWith("/") ? raw.slice(0, -1).toLowerCase() : raw.toLowerCase();
};

const getAssignedRoles = (employeeDetails = null) => {
  const assignedRoles = employeeDetails?.assignedRoles;

  if (Array.isArray(assignedRoles)) {
    return assignedRoles
      .map((role) => String(role || "").trim())
      .filter(Boolean);
  }

  if (typeof assignedRoles === "string") {
    return assignedRoles
      .split(",")
      .map((role) => role.trim())
      .filter(Boolean);
  }

  return [];
};

const FALLBACK_DIRECT_ROLE_PERMISSIONS = {
  CHECKER: ["invoice-checker"],
  APPROVER: ["invoice-approver"],
  ACCOUNTANT: ["payments-manage", "payments-view", "tax-manage"],
};

const resolvePermissionsFromRole = (roleName = "") => {
  if (!roleName) return [];

  const normalizedRole = normalizeRoleToken(roleName);
  return FALLBACK_DIRECT_ROLE_PERMISSIONS[normalizedRole] || [];
};

const dedupePermissions = (permissions = []) =>
  Array.from(
    new Set(
      permissions
        .map((permission) => String(permission || "").trim())
        .filter(Boolean),
    ),
  );

const buildFallbackPermissions = ({ authRole, effectiveRole, employeeDetails }) => {
  const assignedRoles = getAssignedRoles(employeeDetails);
  const candidateRoles = [effectiveRole, authRole, ...assignedRoles];
  const rolePermissions = candidateRoles.flatMap((roleName) => resolvePermissionsFromRole(roleName));
  return dedupePermissions(rolePermissions);
};

const makeHasPermissionChecker = (permissionsSet) => (permissionId) => {
  if (permissionsSet.has(FULL_ACCESS_PERMISSION)) return true;
  return permissionsSet.has(permissionId);
};

export const RBACProvider = ({ children }) => {
  const { user, loading: authLoading } = useAuth();

  const {
    data: corporateUserContext = null,
    isLoading: corporateUserLoading,
    isFetching: corporateUserFetching,
  } = useGetCorporateUserDetailsQuery(undefined, {
    skip: authLoading || !user,
  });
  const {
    data: corporateScreens = null,
    isLoading: corporateScreensLoading,
    isFetching: corporateScreensFetching,
  } = useGetCorporateScreensQuery(undefined, {
    skip: authLoading || !user,
  });

  const employeeDetails = corporateUserContext?.employeeDetails || null;
  const employeeId =
    employeeDetails?.id ||
    employeeDetails?.employeeId ||
    employeeDetails?.optifiiUserId ||
    null;
  const isEmployee = corporateUserContext?.type === "EMPLOYEE";

  const shouldFetchCustomRoles = Boolean(!authLoading && user && isEmployee && employeeId);

  const {
    data: customRolesContext = null,
    isLoading: customRolesLoading,
    isFetching: customRolesFetching,
    isError: customRolesError,
  } = useGetEmployeeCustomRolesQuery(employeeId, {
    skip: !shouldFetchCustomRoles,
  });

  const authRole = user?.role || null;
  const effectiveRole = corporateUserContext?.effectiveRole || null;

  const normalizedCorporateUserRole = normalizeRoleToken(corporateUserContext?.corporateUser?.role);
  const normalizedAuthRole = normalizeRoleToken(authRole);
  const isCorporateAdmin =
    normalizedCorporateUserRole === "CORP_ADMIN" ||
    normalizedCorporateUserRole === "CORPADMIN" ||
    normalizedCorporateUserRole === "ADMIN" ||
    normalizedAuthRole === "CORP_ADMIN" ||
    normalizedAuthRole === "CORPADMIN" ||
    normalizedAuthRole === "ADMIN";

  const computedPermissions = useMemo(() => {
    if (!user) {
      return {
        source: null,
        permissions: [],
        unmappedPermissions: [],
      };
    }

    if (isCorporateAdmin) {
      return {
        source: "corp_admin",
        permissions: [FULL_ACCESS_PERMISSION],
        unmappedPermissions: [],
      };
    }

    if (isEmployee) {
      const canonicalPermissions = toArray(customRolesContext?.canonicalPermissions);
      if (canonicalPermissions.length > 0) {
        return {
          source: "custom_roles",
          permissions: dedupePermissions(canonicalPermissions),
          unmappedPermissions: toArray(customRolesContext?.unmappedPermissions),
        };
      }

      if (customRolesError) {
        const fallbackPermissions = buildFallbackPermissions({
          authRole,
          effectiveRole,
          employeeDetails,
        });

        return {
          source: "fallback_role_custom_roles_error",
          permissions: fallbackPermissions,
          unmappedPermissions: [],
        };
      }

      return {
        source: "custom_roles_empty",
        permissions: [],
        unmappedPermissions: toArray(customRolesContext?.unmappedPermissions),
      };
    }

    const fallbackPermissions = buildFallbackPermissions({
      authRole,
      effectiveRole,
      employeeDetails,
    });

    return {
      source: "fallback_role",
      permissions: fallbackPermissions,
      unmappedPermissions: [],
    };
  }, [
    user,
    isCorporateAdmin,
    isEmployee,
    customRolesContext?.canonicalPermissions,
    customRolesContext?.unmappedPermissions,
    customRolesError,
    authRole,
    effectiveRole,
    employeeDetails,
  ]);

  useEffect(() => {
    if (computedPermissions.unmappedPermissions.length > 0) {
      console.warn("[RBAC] Unmapped custom role permissions", computedPermissions.unmappedPermissions);
    }
  }, [computedPermissions.unmappedPermissions]);

  const isLoaded = useMemo(() => {
    if (authLoading) return false;
    if (!user) return true;
    if (corporateUserLoading || corporateUserFetching) return false;
    if (corporateScreensLoading || corporateScreensFetching) return false;
    if (shouldFetchCustomRoles && (customRolesLoading || customRolesFetching)) return false;
    return true;
  }, [
    authLoading,
    user,
    corporateUserLoading,
    corporateUserFetching,
    corporateScreensLoading,
    corporateScreensFetching,
    shouldFetchCustomRoles,
    customRolesLoading,
    customRolesFetching,
  ]);

  const permissions = computedPermissions.permissions;
  const permissionsSet = useMemo(() => new Set(permissions), [permissions]);
  const hasPermission = useMemo(() => makeHasPermissionChecker(permissionsSet), [permissionsSet]);
  const allowedScreensSet = useMemo(
    () => new Set(toArray(corporateScreens?.allowedScreens).map(normalizeEntitlementToken)),
    [corporateScreens?.allowedScreens],
  );
  const enabledSectionsSet = useMemo(
    () => new Set(toArray(corporateScreens?.enabledSections).map(normalizeEntitlementToken)),
    [corporateScreens?.enabledSections],
  );

  const isCorporateScreenAllowed = (screen = "") => {
    const normalizedScreen = normalizeEntitlementToken(screen);
    if (!normalizedScreen) return false;
    return allowedScreensSet.has(normalizedScreen);
  };

  const isCorporateSectionEnabled = (section = "") => {
    const normalizedSection = normalizeEntitlementToken(section);
    if (!normalizedSection) return false;
    return enabledSectionsSet.has(normalizedSection);
  };

  const isCorporateScreenSectionEnabled = (screen = "", section = "") => {
    const normalizedSection = normalizeEntitlementToken(section);
    if (!normalizedSection || !isCorporateSectionEnabled(normalizedSection)) return false;
    return isCorporateScreenAllowed(screen);
  };

  const isCategoryFeatureEnabled = Boolean(corporateScreens?.isCategoryFeatureEnabled);

  const hasAnyPermission = (permissionIds = []) => {
    if (!permissionIds || permissionIds.length === 0) return true;
    return permissionIds.some((permissionId) => hasPermission(permissionId));
  };

  const hasAllPermissions = (permissionIds = []) => {
    if (!permissionIds || permissionIds.length === 0) return true;
    return permissionIds.every((permissionId) => hasPermission(permissionId));
  };

  const canAccessRoute = (path = "") => {
    if (!isLoaded) return false;

    const rule = resolveRoutePermissionRule(path);
    if (!rule) return true;

    if (rule.anyOf && !hasAnyPermission(rule.anyOf)) return false;
    if (rule.allOf && !hasAllPermissions(rule.allOf)) return false;

    const normalizedPath = normalizeRoutePath(path);
    if (normalizedPath === "/user-roles" || normalizedPath.startsWith("/user-roles/")) {
      const canViewRoles = hasAnyPermission(["roles-view", "roles-manage"]);
      const canViewWorkflow = hasAnyPermission(["vendor-workflow-view", "vendor-workflow-manage"]);
      const canViewCategories = hasAnyPermission(["category-view", "category-manage"]);
      return (
        (canViewRoles && isCorporateSectionEnabled("MANAGE_ROLE_USERS")) ||
        (canViewRoles && isCorporateSectionEnabled("MANAGE_ROLE_ROLES_PERMISSIONS")) ||
        (canViewWorkflow && isCorporateSectionEnabled("MANAGE_ROLE_APPROVAL_WORKFLOW")) ||
        (canViewCategories && isCategoryFeatureEnabled)
      );
    }

    if (normalizedPath === "/settings" || normalizedPath.startsWith("/settings/")) {
      return (
        (hasPermission("settings-org") && isCorporateSectionEnabled("SETTINGS_ORG_DETAILS")) ||
        (hasAnyPermission(["settings-banking", "banking-full"]) && isCorporateSectionEnabled("SETTINGS_CONNECTED_BANKING")) ||
        (hasPermission("settings-interaction") && isCorporateSectionEnabled("SETTINGS_INTEGRATIONS"))
      );
    }

    const entitlementRule = resolveRouteCorporateEntitlementRule(path);
    if (entitlementRule) {
      if (entitlementRule.screen && !isCorporateScreenAllowed(entitlementRule.screen)) return false;
      if (
        entitlementRule.anySections &&
        !entitlementRule.anySections.some((section) => isCorporateSectionEnabled(section))
      ) {
        return false;
      }
    }

    return true;
  };

  const canPerformAction = (actionKey = "") => {
    if (!isLoaded) return false;

    const actionRule = ACTION_PERMISSION_RULES[actionKey];
    if (!actionRule) {
      console.warn(`[RBAC] Missing action rule for: ${actionKey}`);
      return false;
    }

    if (actionRule.anyOf && !hasAnyPermission(actionRule.anyOf)) return false;
    if (actionRule.allOf && !hasAllPermissions(actionRule.allOf)) return false;

    if (actionKey.startsWith("categories.")) {
      return isCategoryFeatureEnabled;
    }
    if (actionKey === "settings.createBankAccount") {
      return isCorporateSectionEnabled("SETTINGS_CONNECTED_BANKING");
    }
    if (actionKey === "settings.createOrganisation" || actionKey === "settings.updateOrganisation") {
      return isCorporateSectionEnabled("SETTINGS_ORG_DETAILS");
    }
    if (actionKey === "tax.calculateGst") {
      return isCorporateSectionEnabled("TAX_GST");
    }
    if (actionKey === "tax.calculateTds" || actionKey === "tax.generateForm16a") {
      return isCorporateSectionEnabled("TAX_TDS_COMPLIANCE");
    }

    return true;
  };

  const contextValue = {
    isLoaded,
    permissions,
    permissionSource: computedPermissions.source,
    unmappedPermissions: computedPermissions.unmappedPermissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canAccessRoute,
    canPerformAction,
    corporateScreens,
    isCorporateScreenAllowed,
    isCorporateSectionEnabled,
    isCorporateScreenSectionEnabled,
    isCategoryFeatureEnabled,
    permissionLabels: PERMISSION_LABELS,
  };

  return <RBACContext.Provider value={contextValue}>{children}</RBACContext.Provider>;
};

export const useRBAC = () => {
  const context = useContext(RBACContext);
  if (!context) {
    throw new Error("useRBAC must be used within RBACProvider");
  }
  return context;
};

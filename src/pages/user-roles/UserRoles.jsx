import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGetVendorsQuery } from "../../Services/apis/invoicesVendorsApi";
import {
  useAddCorporateUsersMutation,
  useAssignCustomRoleToEmployeesMutation,
  useDeleteCorporateEmployeeMutation,
  useGetCorporateEmployeesQuery,
  useCreateCustomRoleMutation,
  useDeleteCustomRoleMutation,
  useGetCustomRolesQuery,
  useGetCustomRoleScreensQuery,
  useRemoveCustomRoleFromEmployeesMutation,
  useUpdateCustomRoleMutation,
  useUpdateCorporateEmployeeMutation,
} from "../../Services/apis/corporateApi";
import { Button } from "../../components/ui/button";
import RefreshButton from "../../components/common/RefreshButton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { toast } from "sonner";
import { useAuth } from "../../contexts/AuthContext";
import { useRBAC } from "../../contexts/RBACContext";
import { GitBranch, Shield, ShieldAlert, UserPlus, Users } from "lucide-react";
import {
  BILLING_PERMISSION_IDS,
  CAMPAIGN_BACKEND_PERMISSION_TYPES,
  CAMPAIGN_PERMISSION_IDS,
  AP_MASTER_ADMIN_BACKEND_SCREEN,
  MASTER_ADMIN_PERMISSION_ID,
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
} from "./constants/permissionConfig";
import {
  buildCustomRoleCode,
  CUSTOM_ROLE_PERMISSION_MAP,
  mapUiPermissionsToCustomRolePayload,
  toUiRole,
} from "./utils/roleAdapters";
import { mapScreenPermissionToCanonical } from "../../utils/rbacPermissions";
import InviteUserDialog from "./components/InviteUserDialog";
import AddRoleDialog from "./components/AddRoleDialog";
import AssignRoleSetsDialog from "./components/AssignRoleSetsDialog";
import ViewRoleDialog from "./components/ViewRoleDialog";
import RolesTab from "./components/RolesTab";
import UsersTable from "./components/UsersTable";
import ApprovalWorkflowTab from "./components/ApprovalWorkflowTab";
import CategoriesTab from "./components/CategoriesTab";
import UserDetailsDialog from "./components/UserDetailsDialog";
import { useActionGuard } from "../../hooks/useActionGuard";
import { FULL_ACCESS_PERMISSION } from "../../constants/rbacPolicy";

const UserRoles = () => {
  const [activeTab, setActiveTab] = useState("users");
  const [accessDenied, setAccessDenied] = useState(false);
  const [roleDialogMode, setRoleDialogMode] = useState("view"); // view | edit | assignUsers
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [addRoleDialogOpen, setAddRoleDialogOpen] = useState(false);
  const [viewRoleDialogOpen, setViewRoleDialogOpen] = useState(false);
  const [assignRoleSetsDialogOpen, setAssignRoleSetsDialogOpen] =
    useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);
  const [userDetailsDialogOpen, setUserDetailsDialogOpen] = useState(false);
  const [selectedUserForRoleSets, setSelectedUserForRoleSets] = useState(null);
  const [selectedUserInitialRoleIds, setSelectedUserInitialRoleIds] = useState(
    [],
  );
  const [inviteDialogMode, setInviteDialogMode] = useState("add");
  const [editingUser, setEditingUser] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: "",
    description: "",
    confirmLabel: "Confirm",
    onConfirm: null,
  });

  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    mobile: "",
    employeeCode: "",
    grade: "",
    department: "",
    role: "",
  });

  const { user: currentUser } = useAuth();
  const {
    hasPermission,
    canAssignRoleSets,
    isCorporateScreenAllowed,
    isCorporateSectionEnabled,
    isCategoryFeatureEnabled,
    isCampaignFeatureEnabled,
    isBillingFeatureEnabled,
  } = useRBAC();
  const { guardAction } = useActionGuard();
  const navigate = useNavigate();
  const canViewRoleRecords =
    hasPermission("roles-view") || hasPermission("roles-manage");
  const canManageRoleUsers = hasPermission("roles-manage-users");
  const canViewUserRecords =
    canViewRoleRecords || canManageRoleUsers;
  const canManageRoles = hasPermission("roles-manage");
  const canManageUserRecords = canManageRoleUsers || hasPermission(FULL_ACCESS_PERMISSION);
  const canViewWorkflow =
    hasPermission("vendor-workflow-view") ||
    hasPermission("vendor-workflow-manage");
  const canManageWorkflow = hasPermission("vendor-workflow-manage");
  const canViewCategories =
    hasPermission("category-view") || hasPermission("category-manage");
  const canUseManageRoleCategories = isCorporateSectionEnabled("CATEGORY_ALL");
  const canUseBillingSettings = isBillingFeatureEnabled;
  const canViewUsersTab =
    canViewUserRecords && isCorporateSectionEnabled("MANAGE_ROLE_USERS");
  const canViewRolesTab =
    canViewRoleRecords && isCorporateSectionEnabled("MANAGE_ROLE_ROLES_PERMISSIONS");
  const canViewWorkflowTab =
    canViewWorkflow &&
    isCorporateSectionEnabled("MANAGE_ROLE_APPROVAL_WORKFLOW");
  const canViewCategoriesTab = canViewCategories && canUseManageRoleCategories;
  const canViewUserRolesModule =
    canViewUsersTab ||
    canViewRolesTab ||
    canViewWorkflowTab ||
    canViewCategoriesTab;
  const shouldSkipUsersAndRoles =
    !currentUser || !(canViewUsersTab || canViewRolesTab);
  const shouldSkipVendors = !currentUser || !canViewWorkflowTab;

  const {
    data: employeesResponse = null,
    isLoading: usersLoading,
    isError: usersError,
    refetch: refetchUsers,
  } = useGetCorporateEmployeesQuery(
    {
      type: "EMPLOYEES",
      limit: 200,
      offset: 0,
      programType: "VENDOR_PAYMENTS",
    },
    { skip: shouldSkipUsersAndRoles },
  );

  const {
    data: rolesData = [],
    isLoading: rolesLoading,
    isError: rolesError,
    refetch: refetchRoles,
  } = useGetCustomRolesQuery(undefined, { skip: shouldSkipUsersAndRoles });
  const {
    data: vendorsData = [],
    isLoading: vendorsLoading,
    isError: vendorsError,
    refetch: refetchVendors,
  } = useGetVendorsQuery(undefined, { skip: shouldSkipVendors });

  const [addCorporateUsers] = useAddCorporateUsersMutation();
  const [assignCustomRoleToEmployees] =
    useAssignCustomRoleToEmployeesMutation();
  const [removeCustomRoleFromEmployees] =
    useRemoveCustomRoleFromEmployeesMutation();
  const [updateCorporateEmployee] = useUpdateCorporateEmployeeMutation();
  const [deleteCorporateEmployee] = useDeleteCorporateEmployeeMutation();
  const [createCustomRole, { isLoading: createCustomRoleLoading }] =
    useCreateCustomRoleMutation();
  const [updateCustomRole, { isLoading: updateCustomRoleLoading }] =
    useUpdateCustomRoleMutation();
  const [deleteCustomRole, { isLoading: deleteCustomRoleLoading }] =
    useDeleteCustomRoleMutation();
  const [assigningRoleSets, setAssigningRoleSets] = useState(false);
  const {
    data: availableCustomRoleScreens = [],
    isError: customRoleScreensError,
    refetch: refetchCustomRoleScreens,
  } = useGetCustomRoleScreensQuery(undefined, {
    skip: !currentUser || !canManageRoles || !canViewRolesTab,
  });
  const userRolesRefreshing = usersLoading || rolesLoading || vendorsLoading;

  const handleRefreshUserRoles = async () => {
    try {
      await Promise.all([
        shouldSkipUsersAndRoles ? Promise.resolve() : refetchUsers(),
        shouldSkipUsersAndRoles ? Promise.resolve() : refetchRoles(),
        shouldSkipVendors ? Promise.resolve() : refetchVendors(),
        !currentUser || !canManageRoles || !canViewRolesTab
          ? Promise.resolve()
          : refetchCustomRoleScreens(),
      ]);
      toast.success("User roles refreshed");
    } catch {
      toast.error("Failed to refresh user roles");
    }
  };

  useEffect(() => {
    if (currentUser) {
      setAccessDenied(!canViewUserRolesModule);
    }
  }, [currentUser, canViewUserRolesModule]);

  useEffect(() => {
    const availableTabs = [];
    if (canViewUsersTab) availableTabs.push("users");
    if (canViewRolesTab) availableTabs.push("roles");
    if (canViewWorkflowTab) availableTabs.push("workflow");
    if (canViewCategoriesTab) availableTabs.push("categories");
    if (availableTabs.length === 0) return;
    if (!availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0]);
    }
  }, [
    activeTab,
    canViewUsersTab,
    canViewRolesTab,
    canViewWorkflowTab,
    canViewCategoriesTab,
  ]);

  useEffect(() => {
    if (usersError) toast.error("Failed to load users");
  }, [usersError]);

  useEffect(() => {
    if (rolesError) toast.error("Failed to load roles");
  }, [rolesError]);
  useEffect(() => {
    if (vendorsError) toast.error("Failed to load vendors");
  }, [vendorsError]);
  useEffect(() => {
    if (customRoleScreensError)
      toast.error("Failed to load custom-role screens");
  }, [customRoleScreensError]);

  const users = useMemo(() => {
    const rows = Array.isArray(employeesResponse?.data)
      ? employeesResponse.data
      : [];
    return rows.map((item) => ({
      id: item.id ?? item.empId ?? null,
      empId: item.empId || "",
      name: item.name || "",
      email: item.email || "",
      mobile:
        item.phoneNumber ||
        item?.raw?.phoneNumber ||
        item?.raw?.mobile ||
        item?.raw?.phone ||
        "",
      role: item.role || "",
      department:
        item?.raw?.department?.name ||
        item?.raw?.department?.departmentName ||
        item?.raw?.department ||
        "",
      is_active: item.is_active !== false,
      created_at: item.created_at || null,
      programType: item.programType ?? null,
      raw: item.raw,
    }));
  }, [employeesResponse]);
  const vendors = useMemo(
    () => (Array.isArray(vendorsData) ? vendorsData : []),
    [vendorsData],
  );
  const backendRoles = useMemo(() => {
    const rows = Array.isArray(rolesData) ? rolesData : [];
    return rows.map((role) => toUiRole(role, users));
  }, [rolesData, users]);

  const isMappedPermissionEntitled = useCallback(
    (backendEntry) => {
      if (!backendEntry?.screen) return false;
      if (backendEntry.screen === "CAMPAIGN" || backendEntry.screen === "CAMPAIGNS") {
        return (
          isCampaignFeatureEnabled ||
          (isCorporateScreenAllowed("CAMPAIGN") &&
            isCorporateSectionEnabled("CAMPAIGN_ALL"))
        );
      }
      if (backendEntry.screen === "CATEGORY") return canUseManageRoleCategories;
      if (backendEntry.screen === "VENDOR_APPROVAL_WORKFLOW") {
        return (
          isCorporateSectionEnabled("MANAGE_ROLE_APPROVAL_WORKFLOW") ||
          isCorporateSectionEnabled("VENDOR_APPROVAL_WORKFLOW_ALL")
        );
      }
      if (backendEntry.screen === "MANAGE_ROLE") {
        if (backendEntry.permissionType === "USERS") {
          return isCorporateSectionEnabled("MANAGE_ROLE_USERS");
        }
        if (
          backendEntry.permissionType === "VIEW" ||
          backendEntry.permissionType === "MANAGE"
        ) {
          return (
            isCorporateSectionEnabled("MANAGE_ROLE_USERS") ||
            isCorporateSectionEnabled("MANAGE_ROLE_ROLES_PERMISSIONS")
          );
        }
      }
      if (backendEntry.screen === "SETTINGS") {
        if (backendEntry.permissionType === "ORG")
          return isCorporateSectionEnabled("SETTINGS_ORG_DETAILS");
        if (backendEntry.permissionType === "BANKING")
          return isCorporateSectionEnabled("SETTINGS_CONNECTED_BANKING");
        if (backendEntry.permissionType === "INTERACTION")
          return isCorporateSectionEnabled("SETTINGS_INTEGRATIONS");
        if (
          backendEntry.permissionType === "BILLING" ||
          backendEntry.permissionType === "MANAGE_BILLING"
        ) {
          return canUseBillingSettings;
        }
      }
      if (backendEntry.screen === "CREDITS") {
        return canUseBillingSettings;
      }
      if (backendEntry.screen === "PAYMENTS") {
        return (
          isCorporateScreenAllowed("PAYMENTS") &&
          isCorporateSectionEnabled("PAYMENTS_ALL")
        );
      }
      if (backendEntry.screen === "PAYMENT_BATCHES") {
        return (
          isCorporateScreenAllowed("PAYMENT_BATCHES") &&
          isCorporateSectionEnabled("PAYMENT_BATCHES_ALL")
        );
      }
      if (backendEntry.screen === "BANKING") {
        return isCorporateSectionEnabled("SETTINGS_CONNECTED_BANKING");
      }
      if (backendEntry.screen === "INTEGRATIONS" || backendEntry.screen === "ERP_INTEGRATIONS") {
        return isCorporateSectionEnabled("SETTINGS_INTEGRATIONS");
      }
      return isCorporateScreenAllowed(backendEntry.screen);
    },
    [
      isCampaignFeatureEnabled,
      canUseManageRoleCategories,
      canUseBillingSettings,
      isCorporateScreenAllowed,
      isCorporateSectionEnabled,
    ],
  );

  const supportedCustomRolePermissionKeys = useMemo(() => {
    if (
      !Array.isArray(availableCustomRoleScreens) ||
      availableCustomRoleScreens.length === 0
    ) {
      return null;
    }

    const keys = new Set();
    keys.add(`${AP_MASTER_ADMIN_BACKEND_SCREEN}:FULL_ACCESS`);
    availableCustomRoleScreens.forEach((screen) => {
      const screenName = String(screen?.screen || "").trim().toUpperCase();
      const permissionTypes = Array.isArray(screen?.permissionTypes)
        ? screen.permissionTypes
        : [];
      permissionTypes.forEach((permissionTypeEntry) => {
        const permissionType = String(
          permissionTypeEntry?.permissionType ??
            permissionTypeEntry?.type ??
            "",
        )
          .trim()
          .toUpperCase();
        if (screenName && permissionType) {
          keys.add(`${screenName}:${permissionType}`);
          if (screenName === "CAMPAIGN") {
            keys.add(`CAMPAIGNS:${permissionType}`);
          }
          if (screenName === "CAMPAIGNS") {
            keys.add(`CAMPAIGN:${permissionType}`);
          }
        }
      });
    });

    if (isCampaignFeatureEnabled) {
      CAMPAIGN_BACKEND_PERMISSION_TYPES.forEach((permissionType) => {
        keys.add(`CAMPAIGN:${permissionType}`);
        keys.add(`CAMPAIGNS:${permissionType}`);
      });
    }

    if (isCorporateSectionEnabled("MANAGE_ROLE_USERS")) {
      keys.add("MANAGE_ROLE:USERS");
    }

    if (canUseManageRoleCategories) {
      keys.add("CATEGORY:VIEW");
      keys.add("CATEGORY:MANAGE");
    }

    if (canUseBillingSettings) {
      keys.add("CREDITS:MANAGE");
      keys.add("CREDITS:MANAGE_BILLING");
      keys.add("SETTINGS:BILLING");
      keys.add("SETTINGS:MANAGE_BILLING");
    }

    return keys;
  }, [
    availableCustomRoleScreens,
    isCampaignFeatureEnabled,
    isCorporateSectionEnabled,
    canUseManageRoleCategories,
    canUseBillingSettings,
  ]);

  const availablePermissionKeys = useMemo(() => {
    if (
      !Array.isArray(availableCustomRoleScreens) ||
      availableCustomRoleScreens.length === 0
    ) {
      return null;
    }

    const keys = new Set();
    availableCustomRoleScreens.forEach((screen) => {
      const screenName = screen?.screen;
      const permissionTypes = Array.isArray(screen?.permissionTypes)
        ? screen.permissionTypes
        : [];
      permissionTypes.forEach((permissionTypeEntry) => {
        const permissionType =
          permissionTypeEntry?.permissionType ?? permissionTypeEntry?.type;
        const canonicalPermissions = mapScreenPermissionToCanonical(
          screenName,
          permissionType,
        );
        (Array.isArray(canonicalPermissions)
          ? canonicalPermissions
          : [canonicalPermissions]
        )
          .filter(Boolean)
          .forEach((permissionId) => keys.add(permissionId));
      });
    });

    if (isCampaignFeatureEnabled) {
      CAMPAIGN_PERMISSION_IDS.forEach((permissionId) => keys.add(permissionId));
    }

    if (isCorporateSectionEnabled("MANAGE_ROLE_USERS")) {
      keys.add("roles-manage-users");
    }

    if (canUseManageRoleCategories) {
      keys.add("category-view");
      keys.add("category-manage");
    }

    if (canUseBillingSettings) {
      keys.add("credits-manage");
    }

    return keys;
  }, [
    availableCustomRoleScreens,
    isCampaignFeatureEnabled,
    isCorporateSectionEnabled,
    canUseManageRoleCategories,
    canUseBillingSettings,
  ]);

  const filteredPermissionGroups = useMemo(() => {
    const groups = PERMISSION_GROUPS.map((group) => ({
      ...group,
      permissions: group.permissions.filter((permission) => {
        const backendEntry = CUSTOM_ROLE_PERMISSION_MAP[permission.id];
        if (!backendEntry) return false;
        if (!isMappedPermissionEntitled(backendEntry)) return false;
        const isCampaignPermission = CAMPAIGN_PERMISSION_IDS.includes(permission.id);
        const isBillingPermission = BILLING_PERMISSION_IDS.includes(permission.id);
        if (
          availablePermissionKeys &&
          !availablePermissionKeys.has(permission.id) &&
          !(isCampaignFeatureEnabled && isCampaignPermission) &&
          !(canUseBillingSettings && isBillingPermission)
        ) {
          return false;
        }
        return true;
      }),
    })).filter((group) => group.permissions.length > 0);

    return groups;
  }, [
    availablePermissionKeys,
    canUseBillingSettings,
    isCampaignFeatureEnabled,
    isMappedPermissionEntitled,
  ]);

  const visiblePermissionIds = useMemo(() => {
    const ids = new Set([MASTER_ADMIN_PERMISSION_ID]);
    filteredPermissionGroups.forEach((group) => {
      group.permissions.forEach((permission) => {
        if (permission?.id) ids.add(permission.id);
      });
    });
    return ids;
  }, [filteredPermissionGroups]);

  const isMasterAdminCanonicalPermission = useCallback((permissionId) => {
    const normalizedPermissionId = String(permissionId || "").trim();
    return (
      normalizedPermissionId === MASTER_ADMIN_PERMISSION_ID ||
      normalizedPermissionId === FULL_ACCESS_PERMISSION
    );
  }, []);

  const isMasterAdminPermissionEntry = useCallback((entry) => {
    const screen = String(entry?.screen || "").trim().toUpperCase();
    return (
      screen === AP_MASTER_ADMIN_BACKEND_SCREEN ||
      screen === "MASTER_ADMIN" ||
      isMasterAdminCanonicalPermission(entry?.canonicalId)
    );
  }, [isMasterAdminCanonicalPermission]);

  const filterRoleForVisiblePermissions = useCallback(
    (role) => {
      const rawPermissions = Array.isArray(role?.permissions) ? role.permissions : [];
      const rawPermissionEntries = Array.isArray(role?.permissionEntries)
        ? role.permissionEntries
        : [];
      const hasMasterAdmin =
        rawPermissions.some(isMasterAdminCanonicalPermission) ||
        rawPermissionEntries.some(isMasterAdminPermissionEntry);

      const visiblePermissions = hasMasterAdmin
        ? [MASTER_ADMIN_PERMISSION_ID]
        : rawPermissions.filter((permissionId) =>
            visiblePermissionIds.has(permissionId),
          );

      const visiblePermissionSet = new Set(visiblePermissions);
      const visiblePermissionEntries = hasMasterAdmin
        ? rawPermissionEntries.filter(isMasterAdminPermissionEntry)
        : rawPermissionEntries.filter(
            (entry) =>
              entry?.canonicalId && visiblePermissionSet.has(entry.canonicalId),
          );

      return {
        ...role,
        permissions: visiblePermissions,
        permissionEntries: visiblePermissionEntries,
        permissionsCount: visiblePermissions.length,
      };
    },
    [
      isMasterAdminCanonicalPermission,
      isMasterAdminPermissionEntry,
      visiblePermissionIds,
    ],
  );

  const allRoles = useMemo(
    () => backendRoles.map((role) => filterRoleForVisiblePermissions(role)),
    [backendRoles, filterRoleForVisiblePermissions],
  );

  const filterMappedPermissionsForCorporate = (mappedPermissions = []) => {
    const enabledPermissions = [];
    const removedPermissions = [];

    mappedPermissions.forEach((permission) => {
      const screen = String(permission?.screen || "").trim().toUpperCase();
      const permissionType = String(permission?.permissionType || "")
        .trim()
        .toUpperCase();
      const permissionKey = `${screen}:${permissionType}`;
      const isMasterAdminPermission =
        (screen === AP_MASTER_ADMIN_BACKEND_SCREEN || screen === "MASTER_ADMIN") &&
        permissionType === "FULL_ACCESS";
      const isCampaignPermission =
        (screen === "CAMPAIGN" || screen === "CAMPAIGNS") && isCampaignFeatureEnabled;
      const isSupported =
        isMasterAdminPermission ||
        isCampaignPermission ||
        !supportedCustomRolePermissionKeys ||
        supportedCustomRolePermissionKeys.has(permissionKey);
      const isEntitled = isMappedPermissionEntitled({
        screen,
        permissionType,
      });

      if (screen && permissionType && isSupported && (isEntitled || isMasterAdminPermission)) {
        enabledPermissions.push({ screen, permissionType });
      } else {
        removedPermissions.push({ screen, permissionType });
      }
    });

    return { enabledPermissions, removedPermissions };
  };

  const getAssignedRoleIdsForUser = (user) => {
    if (!user?.id) return [];
    const userId = String(user.id);
    return allRoles
      .filter(
        (role) =>
          Array.isArray(role.assignedEmployeeIds) &&
          role.assignedEmployeeIds.some(
            (employeeId) => String(employeeId) === userId,
          ),
      )
      .map((role) => String(role.id));
  };

  const loading =
    !currentUser ||
    (!accessDenied && (usersLoading || rolesLoading || vendorsLoading));

  const resetInviteForm = () => {
    setInviteForm({
      name: "",
      email: "",
      mobile: "",
      employeeCode: "",
      grade: "",
      department: "",
      role: "",
    });
    setEditingUser(null);
  };

  const openAddUserDialog = () => {
    setInviteDialogMode("add");
    resetInviteForm();
    setInviteDialogOpen(true);
  };

  const openEditUserDialog = (user) => {
    setInviteDialogMode("edit");
    setEditingUser(user || null);
    setInviteForm({
      name: user?.name || "",
      email: user?.email || "",
      mobile: user?.raw?.phoneNumber || user?.raw?.mobile || "",
      employeeCode: user?.empId || "",
      grade: user?.raw?.grade?.name || user?.raw?.grade || "",
      department:
        user?.raw?.department?.name ||
        user?.raw?.department?.departmentName ||
        user?.raw?.department ||
        user?.department ||
        "",
      role: user?.role || user?.raw?.role || "",
      id: user?.id,
    });
    setInviteDialogOpen(true);
  };

  const getAssignedRoleNamesForUser = (user) => {
    const roleIds = new Set(getAssignedRoleIdsForUser(user));
    return allRoles
      .filter((role) => roleIds.has(String(role.id)))
      .map((role) => role.name)
      .filter(Boolean);
  };

  const openAssignRoleSetsDialog = (user) => {
    if (!canAssignRoleSets || !guardAction("roles.assignRoleSets")) return;
    setSelectedUserForRoleSets(user || null);
    setSelectedUserInitialRoleIds(getAssignedRoleIdsForUser(user));
    setAssignRoleSetsDialogOpen(true);
  };

  const handleInviteUser = async (e) => {
    e.preventDefault();
    if (
      !guardAction(
        inviteDialogMode === "edit" ? "roles.updateUserRole" : "roles.invite",
      )
    )
      return;
    try {
      if (inviteDialogMode === "edit") {
        await updateCorporateEmployee({
          id: inviteForm.id,
          empId: String(inviteForm.employeeCode || "").trim() || undefined,
          name: inviteForm.name.trim(),
          department: String(inviteForm.department || "").trim(),
          role: String(inviteForm.role || "").trim(),
        }).unwrap();
        toast.success("User updated successfully");
        setInviteDialogOpen(false);
        resetInviteForm();
        refetchUsers();
        return;
      }

      const payload = {
        type: "EMPLOYEES",
        employees: [
          {
            name: inviteForm.name.trim(),
            email: inviteForm.email.trim(),
            mobile: String(inviteForm.mobile || "").trim(),
            id: String(inviteForm.employeeCode || "").trim(),
            grade: String(inviteForm.grade || "").trim() || "",
            department: String(inviteForm.department || "").trim() || "",
            role: String(inviteForm.role || "").trim(),
            programType: "VENDOR_PAYMENTS",
          },
        ],
      };
      const response = await addCorporateUsers(payload).unwrap();
      if (response?.failed?.total > 0) {
        toast.error(
          response?.failed?.details?.[0]?.reason || "Failed to create employee",
        );
        return;
      }
      if (response?.skipped?.total > 0) {
        toast.info(
          response?.skipped?.details?.[0]?.reason || "Employee already exists",
        );
      } else {
        toast.success(`User ${inviteForm.name} created successfully!`);
      }
      setInviteDialogOpen(false);
      resetInviteForm();
      refetchUsers();
    } catch (error) {
      toast.error(
        error?.data?.detail ||
          (inviteDialogMode === "edit"
            ? "Failed to update user"
            : "Failed to create user"),
      );
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!guardAction("roles.deleteUser")) return;
    setConfirmDialog({
      open: true,
      title: "Delete User?",
      description: `Are you sure you want to delete ${userName}? This action cannot be undone.`,
      confirmLabel: "Delete",
      onConfirm: async () => {
        try {
          await deleteCorporateEmployee({ id: userId }).unwrap();
          toast.success("User deleted successfully");
          refetchUsers();
        } catch (error) {
          toast.error(error?.data?.detail || "Failed to delete user");
        }
      },
    });
  };

  const handleCreateCustomRole = async ({ name, description, permissions }) => {
    if (!guardAction("roles.manageCustomRoles")) return;

    const { permissions: mappedPermissions, unmappedPermissions } =
      mapUiPermissionsToCustomRolePayload(permissions);

    if (mappedPermissions.length === 0) {
      toast.error(
        "Select at least one valid permission for custom role creation",
      );
      return false;
    }

    if (unmappedPermissions.length > 0) {
      toast.error(
        `Some permissions are not supported by custom-role API: ${unmappedPermissions.join(", ")}`,
      );
      return false;
    }

    const { enabledPermissions, removedPermissions } =
      filterMappedPermissionsForCorporate(mappedPermissions);

    if (enabledPermissions.length === 0) {
      toast.error(
        "Select at least one permission enabled for your corporate setup",
      );
      return false;
    }

    if (removedPermissions.length > 0) {
      toast.info(
        "Permissions from disabled modules were removed from the role payload",
      );
    }

    try {
      const body = {
        roleCode: buildCustomRoleCode(name),
        roleName: name.trim(),
        description: description?.trim() || "",
        permissions: enabledPermissions,
      };

      const response = await createCustomRole(body).unwrap();
      await refetchRoles();
      const createdRole = filterRoleForVisiblePermissions(
        toUiRole(response, users),
      );
      toast.success(`Role "${createdRole.name}" created successfully`);
      setSelectedRole(createdRole);
      setRoleDialogMode("view");
      setViewRoleDialogOpen(true);
      return true;
    } catch (error) {
      toast.error(
        error?.data?.detail || "Failed to create custom role on server",
      );
      return false;
    }
  };

  const handleDeleteRole = async (role) => {
    if (!role) return;
    if (!guardAction("roles.manageCustomRoles")) return;
    setConfirmDialog({
      open: true,
      title: "Delete Role?",
      description: `Delete role "${role.name}"? This action cannot be undone.`,
      confirmLabel: "Delete",
      onConfirm: async () => {
        try {
          await deleteCustomRole(role.id).unwrap();
          toast.success("Role deleted successfully");
          refetchRoles();
        } catch (error) {
          toast.error(error?.data?.detail || "Failed to delete custom role");
        }
      },
    });
  };

  const handleSaveRoleChanges = async (roleDraft) => {
    if (!roleDraft?.id) {
      toast.error("Invalid role payload");
      return false;
    }

    if (roleDraft.editSection === "role" && !guardAction("roles.manageCustomRoles")) {
      return false;
    }

    if (roleDraft.editSection === "users" && !guardAction("roles.assignRoleSets")) {
      return false;
    }

    if (!roleDraft.editSection) {
      toast.error("Nothing to save");
      return false;
    }

    try {
      if (roleDraft.editSection === "role") {
        const roleName = roleDraft.name?.trim();
        if (!roleName) {
          toast.error("Role name is required");
          return false;
        }

        const { permissions: mappedPermissions, unmappedPermissions } =
          mapUiPermissionsToCustomRolePayload(roleDraft.permissions);

        if (mappedPermissions.length === 0) {
          toast.error("Select at least one valid permission");
          return false;
        }

        if (unmappedPermissions.length > 0) {
          toast.error(
            `Some permissions are not supported by custom-role API: ${unmappedPermissions.join(", ")}`,
          );
          return false;
        }

        const { enabledPermissions, removedPermissions } =
          filterMappedPermissionsForCorporate(mappedPermissions);

        if (enabledPermissions.length === 0) {
          toast.error(
            "Select at least one permission enabled for your corporate setup",
          );
          return false;
        }

        if (removedPermissions.length > 0) {
          toast.info(
            "Permissions from disabled modules were removed from the role payload",
          );
        }

        await updateCustomRole({
          roleId: roleDraft.id,
          body: {
            roleName,
            description: roleDraft.description?.trim() || "",
            active: roleDraft.active !== false,
            permissions: enabledPermissions,
          },
        }).unwrap();
      }

      if (roleDraft.editSection === "users") {
        const previousEmployeeIds = Array.isArray(
          roleDraft.previousAssignedEmployeeIds,
        )
          ? roleDraft.previousAssignedEmployeeIds
          : [];
        const nextEmployeeIds = Array.isArray(roleDraft.assignedEmployeeIds)
          ? roleDraft.assignedEmployeeIds
          : [];
        const previousSet = new Set(
          previousEmployeeIds.map((id) => String(id)),
        );
        const nextSet = new Set(nextEmployeeIds.map((id) => String(id)));

        const employeeIdsToAssign = nextEmployeeIds.filter(
          (id) => !previousSet.has(String(id)),
        );
        const employeeIdsToRemove = previousEmployeeIds.filter(
          (id) => !nextSet.has(String(id)),
        );

        if (employeeIdsToAssign.length > 0) {
          await assignCustomRoleToEmployees({
            roleId: roleDraft.id,
            employeeIds: employeeIdsToAssign,
          }).unwrap();
        }

        if (employeeIdsToRemove.length > 0) {
          await removeCustomRoleFromEmployees({
            roleId: roleDraft.id,
            employeeIds: employeeIdsToRemove,
          }).unwrap();
        }
      }

      const successLabels = {
        users: "Users assigned to role successfully",
        role: "Role updated successfully",
      };
      toast.success(successLabels[roleDraft.editSection] || "Role updated successfully");
      await Promise.all([refetchRoles(), refetchUsers()]);
      return true;
    } catch (error) {
      toast.error(error?.data?.detail || "Failed to update custom role");
      return false;
    }
  };

  const handleAssignRoleSets = async ({
    user,
    previousRoleIds,
    selectedRoleIds,
  }) => {
    if (!canAssignRoleSets || !guardAction("roles.assignRoleSets")) return false;
    if (!user?.id) {
      toast.error("Invalid user selected");
      return false;
    }

    const previousSet = new Set(
      (previousRoleIds || []).map((id) => String(id)),
    );
    const selectedSet = new Set(
      (selectedRoleIds || []).map((id) => String(id)),
    );
    const roleIdsToAssign = (selectedRoleIds || []).filter(
      (id) => !previousSet.has(String(id)),
    );
    const roleIdsToRemove = (previousRoleIds || []).filter(
      (id) => !selectedSet.has(String(id)),
    );

    setAssigningRoleSets(true);
    try {
      await Promise.all([
        ...roleIdsToAssign.map((roleId) =>
          assignCustomRoleToEmployees({
            roleId,
            employeeIds: [user.id],
          }).unwrap(),
        ),
        ...roleIdsToRemove.map((roleId) =>
          removeCustomRoleFromEmployees({
            roleId,
            employeeIds: [user.id],
          }).unwrap(),
        ),
      ]);

      toast.success(
        "Role sets assigned successfully. Final access has been updated for this user.",
      );
      setAssignRoleSetsDialogOpen(false);
      setSelectedUserForRoleSets(null);
      await Promise.all([refetchRoles(), refetchUsers()]);
      return true;
    } catch (error) {
      toast.error(error?.data?.detail || "Failed to assign role sets");
      return false;
    } finally {
      setAssigningRoleSets(false);
    }
  };

  const handleRoleCardClick = (role) => {
    setSelectedRole(role);
    setRoleDialogMode("view");
    setViewRoleDialogOpen(true);
  };

  const handleRoleCardEdit = (role) => {
    setSelectedRole(role);
    setRoleDialogMode("edit");
    setViewRoleDialogOpen(true);
  };

  const handleViewUserDetails = (user) => {
    setSelectedUserDetails(user);
    setUserDetailsDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div
        className="flex flex-col items-center justify-center h-[60vh]"
        data-testid="access-denied"
      >
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center max-w-md">
          <ShieldAlert className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-800 mb-2">
            Access Denied
          </h2>
          <p className="text-red-600 mb-6">
            You do not have permission to access User Management.
          </p>
          <Button onClick={() => navigate("/")} variant="outline">
            Return to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="user-roles-page">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold font-['Manrope'] text-primary mb-2">
            User Roles & Access
          </h1>
          <p className="text-muted-foreground">
            Manage user permissions and access rights
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RefreshButton
            onClick={handleRefreshUserRoles}
            refreshing={userRolesRefreshing}
          >
            Refresh
          </RefreshButton>
          {canManageUserRecords && canViewUsersTab && activeTab === "users" && (
            <Button onClick={openAddUserDialog} data-testid="invite-user-btn">
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          {canViewUsersTab && (
            <TabsTrigger value="users" data-testid="tab-users">
              <Users className="h-4 w-4 mr-2" />
              Users ({users.length})
            </TabsTrigger>
          )}
          {canViewRolesTab && (
            <TabsTrigger value="roles" data-testid="tab-roles">
              <Shield className="h-4 w-4 mr-2" />
              Roles & Permissions ({allRoles.length})
            </TabsTrigger>
          )}
          {canViewWorkflowTab && (
            <TabsTrigger value="workflow" data-testid="tab-approval-workflow">
              <GitBranch className="h-4 w-4 mr-2" />
              Approval Workflow
            </TabsTrigger>
          )}
          {canViewCategoriesTab && (
            <TabsTrigger value="categories" data-testid="tab-categories">
              Categories
            </TabsTrigger>
          )}
        </TabsList>

        {canViewUsersTab && (
          <TabsContent value="users">
            <UsersTable
              users={users}
              currentUserId={currentUser?.id}
              handleDeleteUser={handleDeleteUser}
              handleEditUser={openEditUserDialog}
              handleAssignRoles={openAssignRoleSetsDialog}
              handleViewUserDetails={handleViewUserDetails}
              canManageUserRecords={canManageUserRecords}
              canAssignRoles={canAssignRoleSets}
            />
          </TabsContent>
        )}

        {canViewRolesTab && (
          <TabsContent value="roles">
            <RolesTab
              roles={allRoles}
              onRoleClick={handleRoleCardClick}
              onEditRole={handleRoleCardEdit}
              onDeleteRole={handleDeleteRole}
              onOpenCreateDialog={() => setAddRoleDialogOpen(true)}
              canManageRoles={canManageRoles}
            />
          </TabsContent>
        )}

        {canViewWorkflowTab && (
          <TabsContent value="workflow">
            <ApprovalWorkflowTab
              vendors={vendors}
              canManageWorkflow={canManageWorkflow}
              categoryEnabled={isCategoryFeatureEnabled}
            />
          </TabsContent>
        )}

        {canViewCategoriesTab && (
          <TabsContent value="categories">
            <CategoriesTab />
          </TabsContent>
        )}
      </Tabs>

      <InviteUserDialog
        open={inviteDialogOpen}
        setOpen={setInviteDialogOpen}
        inviteForm={inviteForm}
        setInviteForm={setInviteForm}
        mode={inviteDialogMode}
        handleInviteUser={handleInviteUser}
      />

      <AddRoleDialog
        open={addRoleDialogOpen}
        onOpenChange={setAddRoleDialogOpen}
        permissionGroups={filteredPermissionGroups}
        onSave={handleCreateCustomRole}
        saving={createCustomRoleLoading}
      />

      {canAssignRoleSets && (
        <AssignRoleSetsDialog
          open={assignRoleSetsDialogOpen}
          onOpenChange={(open) => {
            setAssignRoleSetsDialogOpen(open);
            if (!open) {
              setSelectedUserForRoleSets(null);
              setSelectedUserInitialRoleIds([]);
            }
          }}
          user={selectedUserForRoleSets}
          roles={allRoles}
          initialRoleIds={selectedUserInitialRoleIds}
          onSave={handleAssignRoleSets}
          saving={assigningRoleSets}
        />
      )}

      <ViewRoleDialog
        open={viewRoleDialogOpen}
        onOpenChange={(open) => {
          setViewRoleDialogOpen(open);
          if (!open) setRoleDialogMode("view");
        }}
        role={selectedRole}
        dialogMode={roleDialogMode}
        permissionGroups={filteredPermissionGroups}
        permissionLabels={PERMISSION_LABELS}
        hiddenPermissionIds={[
          ...(isCategoryFeatureEnabled ? [] : ["category-view", "category-manage"]),
          ...(isCampaignFeatureEnabled
            ? []
            : [
                "campaign-view",
                "campaign-manage",
                "campaign-approve",
              ]),
        ]}
        availableUsers={users.filter((user) => user?.id)}
        onSave={handleSaveRoleChanges}
        saving={updateCustomRoleLoading || deleteCustomRoleLoading}
        canManageRoles={canManageRoles}
        canManageAssignedUsers={canAssignRoleSets}
      />

      <UserDetailsDialog
        open={userDetailsDialogOpen}
        onOpenChange={(open) => {
          setUserDetailsDialogOpen(open);
          if (!open) setSelectedUserDetails(null);
        }}
        user={selectedUserDetails}
        assignedRoleSets={
          selectedUserDetails
            ? getAssignedRoleNamesForUser(selectedUserDetails)
            : []
        }
      />

      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await confirmDialog.onConfirm?.();
                setConfirmDialog((prev) => ({ ...prev, open: false }));
              }}
            >
              {confirmDialog.confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserRoles;

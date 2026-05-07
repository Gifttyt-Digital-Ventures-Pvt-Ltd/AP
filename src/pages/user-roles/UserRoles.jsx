import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetVendorsQuery } from '../../Services/apis/invoicesVendorsApi';
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
} from '../../Services/apis/corporateApi';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { useRBAC } from '../../contexts/RBACContext';
import { GitBranch, Shield, ShieldAlert, UserPlus, Users } from 'lucide-react';
import { PERMISSION_GROUPS, PERMISSION_LABELS } from './constants/permissionConfig';
import {
  buildCustomRoleCode,
  mapUiPermissionsToCustomRolePayload,
  toUiRole,
} from './utils/roleAdapters';
import InviteUserDialog from './components/InviteUserDialog';
import AddRoleDialog from './components/AddRoleDialog';
import ViewRoleDialog from './components/ViewRoleDialog';
import RolesTab from './components/RolesTab';
import UsersTable from './components/UsersTable';
import ApprovalWorkflowTab from './components/ApprovalWorkflowTab';
import { useActionGuard } from '../../hooks/useActionGuard';

const UserRoles = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [accessDenied, setAccessDenied] = useState(false);
  const [roleDialogMode, setRoleDialogMode] = useState('view');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [addRoleDialogOpen, setAddRoleDialogOpen] = useState(false);
  const [viewRoleDialogOpen, setViewRoleDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [inviteDialogMode, setInviteDialogMode] = useState('add');
  const [editingUser, setEditingUser] = useState(null);

  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    mobile: '',
    employeeCode: '',
    grade: '',
    department: '',
  });

  const { user: currentUser } = useAuth();
  const { hasPermission } = useRBAC();
  const { guardAction } = useActionGuard();
  const navigate = useNavigate();
  const canViewRoles = hasPermission('roles-view') || hasPermission('roles-manage');
  const canManageRoles = hasPermission('roles-manage');
  const canViewWorkflow =
    hasPermission('vendor-workflow-view') ||
    hasPermission('vendor-workflow-manage') ||
    canManageRoles;
  const canManageWorkflow =
    hasPermission('vendor-workflow-manage') ||
    canManageRoles;
  const canViewUserRolesModule = canViewRoles || canViewWorkflow;
  const shouldSkipUsersAndRoles = !currentUser || !canViewRoles;
  const shouldSkipVendors = !currentUser || !canViewWorkflow;

  const {
    data: employeesResponse = null,
    isLoading: usersLoading,
    isError: usersError,
    refetch: refetchUsers,
  } = useGetCorporateEmployeesQuery(
    { type: 'EMPLOYEES', limit: 200, offset: 0, programType: 'VENDORS_PAYMENTS' },
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
  } = useGetVendorsQuery(undefined, { skip: shouldSkipVendors });

  const [addCorporateUsers] = useAddCorporateUsersMutation();
  const [assignCustomRoleToEmployees] = useAssignCustomRoleToEmployeesMutation();
  const [removeCustomRoleFromEmployees] = useRemoveCustomRoleFromEmployeesMutation();
  const [updateCorporateEmployee] = useUpdateCorporateEmployeeMutation();
  const [deleteCorporateEmployee] = useDeleteCorporateEmployeeMutation();
  const [createCustomRole, { isLoading: createCustomRoleLoading }] = useCreateCustomRoleMutation();
  const [updateCustomRole, { isLoading: updateCustomRoleLoading }] = useUpdateCustomRoleMutation();
  const [deleteCustomRole, { isLoading: deleteCustomRoleLoading }] = useDeleteCustomRoleMutation();
  const {
    data: availableCustomRoleScreens = [],
    isError: customRoleScreensError,
  } = useGetCustomRoleScreensQuery(undefined, { skip: !currentUser || !canManageRoles });

  useEffect(() => {
    if (currentUser) {
      setAccessDenied(!canViewUserRolesModule);
    }
  }, [currentUser, canViewUserRolesModule]);

  useEffect(() => {
    const availableTabs = [];
    if (canViewRoles) availableTabs.push('users', 'roles');
    if (canViewWorkflow) availableTabs.push('workflow');
    if (availableTabs.length === 0) return;
    if (!availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0]);
    }
  }, [activeTab, canViewRoles, canViewWorkflow]);

  useEffect(() => {
    if (usersError) toast.error('Failed to load users');
  }, [usersError]);

  useEffect(() => {
    if (rolesError) toast.error('Failed to load roles');
  }, [rolesError]);
  useEffect(() => {
    if (vendorsError) toast.error('Failed to load vendors');
  }, [vendorsError]);
  useEffect(() => {
    if (customRoleScreensError) toast.error('Failed to load custom-role screens');
  }, [customRoleScreensError]);

  const users = useMemo(() => {
    const rows = Array.isArray(employeesResponse?.data) ? employeesResponse.data : [];
    return rows.map((item) => ({
      id: item.id ?? item.empId ?? null,
      empId: item.empId || '',
      name: item.name || '',
      email: item.email || '',
      role: item.role || '',
      department:
        item?.raw?.department?.name ||
        item?.raw?.department?.departmentName ||
        item?.raw?.department ||
        '',
      is_active: item.is_active !== false,
      created_at: item.created_at || null,
      programType: item.programType ?? null,
      raw: item.raw,
    }));
  }, [employeesResponse]);
  const vendors = useMemo(() => (Array.isArray(vendorsData) ? vendorsData : []), [vendorsData]);
  const backendRoles = useMemo(() => {
    const rows = Array.isArray(rolesData) ? rolesData : [];
    return rows.map((role) => toUiRole(role, users));
  }, [rolesData, users]);

  const allRoles = useMemo(() => backendRoles, [backendRoles]);

  const loading = !currentUser || (!accessDenied && (usersLoading || rolesLoading || vendorsLoading));

  const resetInviteForm = () => {
    setInviteForm({
      name: '',
      email: '',
      mobile: '',
      employeeCode: '',
      grade: '',
      department: '',
    });
    setEditingUser(null);
  };

  const openAddUserDialog = () => {
    setInviteDialogMode('add');
    resetInviteForm();
    setInviteDialogOpen(true);
  };

  const openEditUserDialog = (user) => {
    setInviteDialogMode('edit');
    setEditingUser(user || null);
    setInviteForm({
      name: user?.name || '',
      email: user?.email || '',
      mobile: user?.raw?.phoneNumber || user?.raw?.mobile || '',
      employeeCode: user?.empId || '',
      grade: user?.raw?.grade?.name || user?.raw?.grade || '',
      department:
        user?.raw?.department?.name ||
        user?.raw?.department?.departmentName ||
        user?.raw?.department ||
        user?.department ||
        '',
      id: user?.id,
    });
    setInviteDialogOpen(true);
  };

  const handleInviteUser = async (e) => {
    e.preventDefault();
    if (!guardAction(inviteDialogMode === 'edit' ? 'roles.updateUserRole' : 'roles.invite')) return;
    try {
      if (inviteDialogMode === 'edit') {
        await updateCorporateEmployee({
          id: inviteForm.id,
          empId: String(inviteForm.employeeCode || '').trim() || undefined,
          name: inviteForm.name.trim(),
          department: String(inviteForm.department || '').trim(),
          role: String(editingUser?.role || '').trim(),
        }).unwrap();
        toast.success('User updated successfully');
        setInviteDialogOpen(false);
        resetInviteForm();
        refetchUsers();
        return;
      }

      const payload = {
        type: 'EMPLOYEES',
        employees: [
          {
            name: inviteForm.name.trim(),
            email: inviteForm.email.trim(),
            mobile: String(inviteForm.mobile || '').trim(),
            id: String(inviteForm.employeeCode || '').trim(),
            grade: String(inviteForm.grade || '').trim() || '',
            department: String(inviteForm.department || '').trim() || '',
            role: '',
            programType: 'VENDORS_PAYMENTS',
          },
        ],
      };
      const response = await addCorporateUsers(payload).unwrap();
      if (response?.failed?.total > 0) {
        toast.error(response?.failed?.details?.[0]?.reason || 'Failed to create employee');
        return;
      }
      if (response?.skipped?.total > 0) {
        toast.info(response?.skipped?.details?.[0]?.reason || 'Employee already exists');
      } else {
        toast.success(`User ${inviteForm.name} created successfully!`);
      }
      setInviteDialogOpen(false);
      resetInviteForm();
      refetchUsers();
    } catch (error) {
      toast.error(error?.data?.detail || (inviteDialogMode === 'edit' ? 'Failed to update user' : 'Failed to create user'));
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!guardAction('roles.deleteUser')) return;
    if (!window.confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
      return;
    }
    try {
      await deleteCorporateEmployee({ id: userId }).unwrap();
      toast.success('User deleted successfully');
      refetchUsers();
    } catch (error) {
      toast.error(error?.data?.detail || 'Failed to delete user');
    }
  };

  const handleCreateCustomRole = async ({ name, description, permissions }) => {
    if (!guardAction('roles.manageCustomRoles')) return;

    const { permissions: mappedPermissions, unmappedPermissions } =
      mapUiPermissionsToCustomRolePayload(permissions);

    if (mappedPermissions.length === 0) {
      toast.error('Select at least one valid permission for custom role creation');
      return false;
    }

    if (unmappedPermissions.length > 0) {
      toast.error(`Some permissions are not supported by custom-role API: ${unmappedPermissions.join(', ')}`);
      return false;
    }

    if (availableCustomRoleScreens.length > 0) {
      const supportedScreens = new Set(availableCustomRoleScreens.map((screen) => String(screen || '').trim()));
      const unsupportedScreenEntry = mappedPermissions.find(
        (permission) => !supportedScreens.has(permission.screen),
      );
      if (unsupportedScreenEntry) {
        toast.error(`Screen "${unsupportedScreenEntry.screen}" is not enabled for your corporate setup`);
        return false;
      }
    }

    try {
      const body = {
        roleCode: buildCustomRoleCode(name),
        roleName: name.trim(),
        description: description?.trim() || '',
        permissions: mappedPermissions,
      };

      const response = await createCustomRole(body).unwrap();
      const createdRoleId = response?.id ?? response?.roleId ?? response?.data?.id ?? null;
      toast.success(
        createdRoleId
          ? `Custom role created (ID: ${createdRoleId})`
          : 'Custom role created',
      );
      refetchRoles();
      return true;
    } catch (error) {
      toast.error(error?.data?.detail || 'Failed to create custom role on server');
      return false;
    }
  };

  const handleDeleteRole = async (role) => {
    if (!role) return;
    if (!guardAction('roles.manageCustomRoles')) return;
    if (!window.confirm(`Delete role "${role.name}"? This action cannot be undone.`)) return;
    try {
      await deleteCustomRole(role.id).unwrap();
      toast.success('Role deleted successfully');
      refetchRoles();
    } catch (error) {
      toast.error(error?.data?.detail || 'Failed to delete custom role');
    }
  };

  const handleSaveRoleChanges = async (roleDraft) => {
    if (!guardAction('roles.manageCustomRoles')) return false;
    if (!roleDraft?.id) {
      toast.error('Invalid role payload');
      return false;
    }

    try {
      if (roleDraft.editSection === 'permissions') {
        const { permissions: mappedPermissions, unmappedPermissions } =
          mapUiPermissionsToCustomRolePayload(roleDraft.permissions);

        if (mappedPermissions.length === 0) {
          toast.error('Select at least one valid permission');
          return false;
        }

        if (unmappedPermissions.length > 0) {
          toast.error(`Some permissions are not supported by custom-role API: ${unmappedPermissions.join(', ')}`);
          return false;
        }

        if (availableCustomRoleScreens.length > 0) {
          const supportedScreens = new Set(availableCustomRoleScreens.map((screen) => String(screen || '').trim()));
          const unsupportedScreenEntry = mappedPermissions.find(
            (permission) => !supportedScreens.has(permission.screen),
          );
          if (unsupportedScreenEntry) {
            toast.error(`Screen "${unsupportedScreenEntry.screen}" is not enabled for your corporate setup`);
            return false;
          }
        }

        await updateCustomRole({
          roleId: roleDraft.id,
          body: {
            roleName: roleDraft.name?.trim(),
            description: roleDraft.description?.trim() || '',
            active: roleDraft.active !== false,
            permissions: mappedPermissions,
          },
        }).unwrap();
      }

      if (roleDraft.editSection === 'users') {
        const previousEmployeeIds = Array.isArray(roleDraft.previousAssignedEmployeeIds)
          ? roleDraft.previousAssignedEmployeeIds
          : [];
        const nextEmployeeIds = Array.isArray(roleDraft.assignedEmployeeIds)
          ? roleDraft.assignedEmployeeIds
          : [];
        const previousSet = new Set(previousEmployeeIds.map((id) => String(id)));
        const nextSet = new Set(nextEmployeeIds.map((id) => String(id)));

        const employeeIdsToAssign = nextEmployeeIds.filter((id) => !previousSet.has(String(id)));
        const employeeIdsToRemove = previousEmployeeIds.filter((id) => !nextSet.has(String(id)));

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

      const successLabel = roleDraft.editSection === 'users' ? 'Role users updated successfully' : 'Role permissions updated successfully';
      toast.success(successLabel);
      await Promise.all([refetchRoles(), refetchUsers()]);
      return true;
    } catch (error) {
      toast.error(error?.data?.detail || 'Failed to update custom role');
      return false;
    }
  };

  const handleRoleCardClick = (role) => {
    setSelectedRole(role);
    setRoleDialogMode('view');
    setViewRoleDialogOpen(true);
  };

  const handleRoleCardEdit = (role) => {
    setSelectedRole(role);
    setRoleDialogMode('edit');
    setViewRoleDialogOpen(true);
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
      <div className="flex flex-col items-center justify-center h-[60vh]" data-testid="access-denied">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center max-w-md">
          <ShieldAlert className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-800 mb-2">Access Denied</h2>
          <p className="text-red-600 mb-6">
            You do not have permission to access User Management.
          </p>
          <Button onClick={() => navigate('/dashboard')} variant="outline">
            Return to Dashboard
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
          <p className="text-muted-foreground">Manage user permissions and access rights</p>
        </div>
        {canManageRoles && (
          <Button onClick={openAddUserDialog} data-testid="invite-user-btn">
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          {canViewRoles && (
            <TabsTrigger value="users" data-testid="tab-users">
              <Users className="h-4 w-4 mr-2" />
              Users ({users.length})
            </TabsTrigger>
          )}
          {canViewRoles && (
            <TabsTrigger value="roles" data-testid="tab-roles">
              <Shield className="h-4 w-4 mr-2" />
              Roles & Permissions ({allRoles.length})
            </TabsTrigger>
          )}
          {canViewWorkflow && (
            <TabsTrigger value="workflow" data-testid="tab-approval-workflow">
              <GitBranch className="h-4 w-4 mr-2" />
              Approval Workflow
            </TabsTrigger>
          )}
        </TabsList>

        {canViewRoles && (
          <TabsContent value="users">
            <UsersTable
              users={users}
              currentUserId={currentUser?.id}
              handleDeleteUser={handleDeleteUser}
              handleEditUser={openEditUserDialog}
              canManageRoles={canManageRoles}
            />
          </TabsContent>
        )}

        {canViewRoles && (
          <TabsContent value="roles">
            <RolesTab
              roles={allRoles}
              onRoleClick={handleRoleCardClick}
              onEditRole={handleRoleCardEdit}
              onDeleteRole={handleDeleteRole}
              onOpenCreateDialog={() => setAddRoleDialogOpen(true)}
            />
          </TabsContent>
        )}

        {canViewWorkflow && (
          <TabsContent value="workflow">
            <ApprovalWorkflowTab
              vendors={vendors}
              canManageWorkflow={canManageWorkflow}
            />
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
        permissionGroups={PERMISSION_GROUPS}
        onSave={handleCreateCustomRole}
        saving={createCustomRoleLoading}
      />

      <ViewRoleDialog
        open={viewRoleDialogOpen}
        onOpenChange={(open) => {
          setViewRoleDialogOpen(open);
          if (!open) setRoleDialogMode('view');
        }}
        role={selectedRole}
        startInEditMode={roleDialogMode === 'edit'}
        permissionGroups={PERMISSION_GROUPS}
        permissionLabels={PERMISSION_LABELS}
        availableUsers={users.filter((user) => user?.id)}
        onSave={handleSaveRoleChanges}
        saving={updateCustomRoleLoading || deleteCustomRoleLoading}
      />
    </div>
  );
};

export default UserRoles;

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useDeleteUserMutation,
  useGetRolesQuery,
  useGetUsersQuery,
  useInviteUserMutation,
  useUpdateUserRoleMutation,
  useUpdateUserStatusMutation,
} from '../../Services/apis/usersApi';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { Shield, ShieldAlert, UserPlus, Users } from 'lucide-react';
import { PERMISSION_GROUPS, PERMISSION_LABELS, ROLE_TEMPLATES } from './constants/permissionConfig';
import { toLocalDraftRole, toTemplateUiRole, toUiRole } from './utils/roleAdapters';
import InviteUserDialog from './components/InviteUserDialog';
import AddRoleDialog from './components/AddRoleDialog';
import ViewRoleDialog from './components/ViewRoleDialog';
import RolesTab from './components/RolesTab';
import UsersTable from './components/UsersTable';

const sortPermissions = (permissions = []) => [...permissions].sort();

const samePermissionSet = (left = [], right = []) => {
  const a = sortPermissions(left);
  const b = sortPermissions(right);
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
};

const normalizeRoleToken = (value = '') =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');

const includesRoleName = (roles = [], candidate = '') => {
  const normalizedCandidate = normalizeRoleToken(candidate);
  if (!normalizedCandidate) return false;
  return roles.some((roleName) => normalizeRoleToken(roleName) === normalizedCandidate);
};

const UserRoles = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [accessDenied, setAccessDenied] = useState(false);
  const [roleDialogMode, setRoleDialogMode] = useState('view');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [addRoleDialogOpen, setAddRoleDialogOpen] = useState(false);
  const [viewRoleDialogOpen, setViewRoleDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [localDraftRoles, setLocalDraftRoles] = useState([]);
  const [localRoleOverrides, setLocalRoleOverrides] = useState({});
  const [localDeletedRoleKeys, setLocalDeletedRoleKeys] = useState([]);

  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    role: ROLE_TEMPLATES[0]?.name || 'Admin',
    password: 'Welcome@123',
  });

  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const isAdmin = currentUser?.role?.toUpperCase() === 'ADMIN';
  const shouldSkip = !currentUser || !isAdmin;

  const {
    data: usersData = [],
    isLoading: usersLoading,
    isError: usersError,
    refetch: refetchUsers,
  } = useGetUsersQuery(undefined, { skip: shouldSkip });

  const {
    data: rolesData = [],
    isLoading: rolesLoading,
    isError: rolesError,
  } = useGetRolesQuery(undefined, { skip: shouldSkip });

  const [inviteUser] = useInviteUserMutation();
  const [updateUserRole] = useUpdateUserRoleMutation();
  const [updateUserStatus] = useUpdateUserStatusMutation();
  const [deleteUser] = useDeleteUserMutation();

  useEffect(() => {
    if (currentUser) {
      setAccessDenied(currentUser.role?.toUpperCase() !== 'ADMIN');
    }
  }, [currentUser]);

  useEffect(() => {
    if (usersError) toast.error('Failed to load users');
  }, [usersError]);

  useEffect(() => {
    if (rolesError) toast.error('Failed to load roles');
  }, [rolesError]);

  const users = useMemo(() => (Array.isArray(usersData) ? usersData : []), [usersData]);
  const backendRoles = useMemo(() => {
    const rows = Array.isArray(rolesData) ? rolesData : [];
    return rows.map((role) => toUiRole(role, users));
  }, [rolesData, users]);

  // Ensures all source roles are represented even when backend does not return each role row.
  const sourceFallbackRoles = useMemo(() => {
    const backendTemplateIds = new Set(backendRoles.map((role) => role.templateId).filter(Boolean));
    return ROLE_TEMPLATES
      .filter((template) => !backendTemplateIds.has(template.id))
      .map((template) => toTemplateUiRole(template, users));
  }, [backendRoles, users]);

  const baseRoles = useMemo(() => {
    return [...backendRoles, ...sourceFallbackRoles];
  }, [backendRoles, sourceFallbackRoles]);

  const backendRoleByKey = useMemo(() => {
    return baseRoles.reduce((acc, role) => {
      acc[role.key] = role;
      return acc;
    }, {});
  }, [baseRoles]);

  const mergedBackendRoles = useMemo(() => {
    return baseRoles
      .map((role) => {
        const override = localRoleOverrides[role.key];
        if (!override) return role;
        return {
          ...role,
          ...override,
          permissionsCount: Array.isArray(override.permissions)
            ? override.permissions.length
            : role.permissionsCount,
          isLocalOverride: true,
        };
      })
      .filter((role) => !localDeletedRoleKeys.includes(role.key));
  }, [baseRoles, localRoleOverrides, localDeletedRoleKeys]);

  const allRoles = useMemo(() => {
    return [...mergedBackendRoles, ...localDraftRoles];
  }, [mergedBackendRoles, localDraftRoles]);

  // Keeps user role dropdowns aligned with source role templates plus any live backend role names.
  const availableRoles = useMemo(() => {
    const orderedRoles = ROLE_TEMPLATES.map((template) => template.name);
    users.forEach((user) => {
      const userRoleName = String(user?.role || '').trim();
      if (userRoleName && !includesRoleName(orderedRoles, userRoleName)) {
        orderedRoles.push(userRoleName);
      }
    });
    localDraftRoles.forEach((role) => {
      if (role?.name && !includesRoleName(orderedRoles, role.name)) {
        orderedRoles.push(role.name);
      }
    });
    return orderedRoles;
  }, [users, localDraftRoles]);

  useEffect(() => {
    if (!availableRoles.length) return;
    setInviteForm((prev) => {
      const matchedRole = availableRoles.find(
        (roleName) => normalizeRoleToken(roleName) === normalizeRoleToken(prev.role)
      );
      if (matchedRole && matchedRole === prev.role) return prev;
      if (matchedRole) return { ...prev, role: matchedRole };
      return { ...prev, role: availableRoles[0] };
    });
  }, [availableRoles]);

  const loading = !currentUser || (!accessDenied && (usersLoading || rolesLoading));

  const handleInviteUser = async (e) => {
    e.preventDefault();
    try {
      const response = await inviteUser(inviteForm).unwrap();
      toast.success(`User ${inviteForm.name} created successfully!`);
      if (response?.temp_password) {
        toast.info(`Temporary password: ${response.temp_password}`);
      }
      setInviteDialogOpen(false);
      setInviteForm({
        name: '',
        email: '',
        role: availableRoles[0] || ROLE_TEMPLATES[0]?.name || 'Admin',
        password: 'Welcome@123',
      });
      refetchUsers();
    } catch (error) {
      toast.error(error?.data?.detail || 'Failed to create user');
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    try {
      await updateUserRole({ userId, role: newRole }).unwrap();
      toast.success(`Role updated to ${newRole}`);
      refetchUsers();
    } catch (error) {
      toast.error(error?.data?.detail || 'Failed to update role');
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      await updateUserStatus({ userId, is_active: !currentStatus }).unwrap();
      toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'}`);
      refetchUsers();
    } catch (error) {
      toast.error(error?.data?.detail || 'Failed to update status');
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to delete ${userName}? This action cannot be undone.`)) {
      return;
    }
    try {
      await deleteUser(userId).unwrap();
      toast.success('User deleted successfully');
      refetchUsers();
    } catch (error) {
      toast.error(error?.data?.detail || 'Failed to delete user');
    }
  };

  // Local draft role creation (session-only).
  const handleCreateLocalRole = ({ name, description, permissions }) => {
    const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const draftRole = toLocalDraftRole({
      id: localId,
      name,
      description,
      permissions,
    });
    setLocalDraftRoles((prev) => [...prev, draftRole]);
    toast.success('Local role draft created');
  };

  const handleDeleteRole = (role) => {
    if (!role) return;
    if (!window.confirm(`Delete role "${role.name}" locally for this session?`)) return;

    if (role.isLocalDraft) {
      setLocalDraftRoles((prev) => prev.filter((item) => item.id !== role.id));
      toast.success('Local draft role deleted');
    } else {
      setLocalDeletedRoleKeys((prev) => (prev.includes(role.key) ? prev : [...prev, role.key]));
      setLocalRoleOverrides((prev) => {
        const next = { ...prev };
        delete next[role.key];
        return next;
      });
      toast.success('Backend role hidden locally (not deleted from server)');
    }

    if (selectedRole?.id === role.id) {
      setSelectedRole(null);
      setViewRoleDialogOpen(false);
    }
  };

  // Local edit behavior for both backend roles and local drafts.
  const handleSaveRoleLocalChanges = (editedRole) => {
    if (editedRole.isLocalDraft) {
      setLocalDraftRoles((prev) =>
        prev.map((role) =>
          role.id === editedRole.id
            ? {
                ...role,
                name: editedRole.name,
                description: editedRole.description,
                permissions: editedRole.permissions,
                permissionsCount: editedRole.permissions.length,
              }
            : role
        )
      );
      toast.success('Local draft updated');
      return;
    }

    const backendBase = backendRoleByKey[editedRole.key];
    if (!backendBase) return;

    const hasMeaningfulChange =
      editedRole.name !== backendBase.name ||
      (editedRole.description || '') !== (backendBase.description || '') ||
      !samePermissionSet(editedRole.permissions, backendBase.permissions);

    setLocalRoleOverrides((prev) => {
      if (!hasMeaningfulChange) {
        const next = { ...prev };
        delete next[editedRole.key];
        return next;
      }
      return {
        ...prev,
        [editedRole.key]: {
          name: editedRole.name,
          description: editedRole.description,
          permissions: editedRole.permissions,
        },
      };
    });

    toast.success('Local override saved (not persisted)');
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
            You don't have permission to access User Management. This page is only available to Administrators.
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
          <h1 className="text-4xl md:text-5xl font-bold  text-primary mb-2">
            User Roles & Access
          </h1>
          <p className="text-muted-foreground">Manage user permissions and access rights</p>
        </div>
        <Button onClick={() => setInviteDialogOpen(true)} data-testid="invite-user-btn">
          <UserPlus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="users" data-testid="tab-users">
            <Users className="h-4 w-4 mr-2" />
            Users ({users.length})
          </TabsTrigger>
          <TabsTrigger value="roles" data-testid="tab-roles">
            <Shield className="h-4 w-4 mr-2" />
            Roles & Permissions ({allRoles.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <UsersTable
            users={users}
            availableRoles={availableRoles}
            currentUserId={currentUser?.id}
            handleUpdateRole={handleUpdateRole}
            handleToggleStatus={handleToggleStatus}
            handleDeleteUser={handleDeleteUser}
          />
        </TabsContent>

        <TabsContent value="roles">
          <RolesTab
            roles={allRoles}
            onRoleClick={handleRoleCardClick}
            onEditRole={handleRoleCardEdit}
            onDeleteRole={handleDeleteRole}
            onOpenCreateDialog={() => setAddRoleDialogOpen(true)}
          />
        </TabsContent>
      </Tabs>

      <InviteUserDialog
        open={inviteDialogOpen}
        setOpen={setInviteDialogOpen}
        inviteForm={inviteForm}
        setInviteForm={setInviteForm}
        availableRoles={availableRoles}
        handleInviteUser={handleInviteUser}
      />

      <AddRoleDialog
        open={addRoleDialogOpen}
        onOpenChange={setAddRoleDialogOpen}
        permissionGroups={PERMISSION_GROUPS}
        onSave={handleCreateLocalRole}
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
        onSave={handleSaveRoleLocalChanges}
      />
    </div>
  );
};

export default UserRoles;


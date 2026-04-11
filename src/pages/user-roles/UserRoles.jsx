import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useGetUsersQuery,
  useGetRolesQuery,
  useInviteUserMutation,
  useUpdateUserRoleMutation,
  useUpdateUserStatusMutation,
  useDeleteUserMutation,
} from '../../Services/apiSlice';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { 
  Users, Shield, UserPlus, Pencil, Trash2, Check, X, 
  FileText, CreditCard, Building2, Eye, Settings, BarChart3,
  Upload, CheckCircle, Ban, ShieldAlert
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';

const UserRoles = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [accessDenied, setAccessDenied] = useState(false);
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

  // Dialog states
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form state
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    role: 'Viewer',
    password: 'Welcome@123'
  });

  useEffect(() => {
    if (currentUser) {
      setAccessDenied(currentUser.role?.toUpperCase() !== 'ADMIN');
    }
  }, [currentUser]);

  useEffect(() => {
    if (usersError) {
      toast.error('Failed to load users');
    }
  }, [usersError]);

  useEffect(() => {
    if (rolesError) {
      toast.error('Failed to load roles');
    }
  }, [rolesError]);

  const handleInviteUser = async (e) => {
    e.preventDefault();
    try {
      const response = await inviteUser(inviteForm).unwrap();
      toast.success(`User ${inviteForm.name} created successfully!`);
      toast.info(`Temporary password: ${response?.temp_password}`);
      setInviteDialogOpen(false);
      setInviteForm({ name: '', email: '', role: 'Viewer', password: 'Welcome@123' });
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

  const users = Array.isArray(usersData) ? usersData : [];
  const roles = Array.isArray(rolesData) ? rolesData : [];
  const loading = !currentUser || (!accessDenied && (usersLoading || rolesLoading));

  const getRoleBadgeClass = (role) => {
    const roleColors = {
      'Admin': 'bg-purple-100 text-purple-800 border-purple-200',
      'Maker': 'bg-blue-100 text-blue-800 border-blue-200',
      'Checker': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Approver': 'bg-emerald-100 text-emerald-800 border-emerald-200',
      'Accountant': 'bg-cyan-100 text-cyan-800 border-cyan-200',
      'Viewer': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return roleColors[role] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getPermissionIcon = (permission) => {
    const icons = {
      'invoice_upload': Upload,
      'invoice_view': Eye,
      'invoice_edit': Pencil,
      'invoice_delete': Trash2,
      'invoice_approve': CheckCircle,
      'payment_approve': CreditCard,
      'payment_release': CreditCard,
      'vendor_create': Building2,
      'vendor_edit': Building2,
      'vendor_delete': Building2,
      'banking_view': CreditCard,
      'banking_manage': CreditCard,
      'user_manage': Users,
      'reports_view': BarChart3,
      'settings_manage': Settings
    };
    return icons[permission] || FileText;
  };

  const formatPermissionName = (permission) => {
    return permission
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const permissionGroups = [
    {
      name: 'Invoice Management',
      icon: FileText,
      permissions: ['invoice_upload', 'invoice_view', 'invoice_edit', 'invoice_delete', 'invoice_approve']
    },
    {
      name: 'Payment Management',
      icon: CreditCard,
      permissions: ['payment_approve', 'payment_release']
    },
    {
      name: 'Vendor Management',
      icon: Building2,
      permissions: ['vendor_create', 'vendor_edit', 'vendor_delete']
    },
    {
      name: 'Banking',
      icon: CreditCard,
      permissions: ['banking_view', 'banking_manage']
    },
    {
      name: 'Administration',
      icon: Settings,
      permissions: ['user_manage', 'reports_view', 'settings_manage']
    }
  ];

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
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold font-['Manrope'] text-primary mb-2">
            User Roles & Access
          </h1>
          <p className="text-muted-foreground">Manage user permissions and access rights</p>
        </div>
        <Button onClick={() => setInviteDialogOpen(true)} data-testid="invite-user-btn">
          <UserPlus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="users" data-testid="tab-users">
            <Users className="h-4 w-4 mr-2" />
            Users ({users.length})
          </TabsTrigger>
          <TabsTrigger value="roles" data-testid="tab-roles">
            <Shield className="h-4 w-4 mr-2" />
            Roles & Permissions
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="p-4 text-left text-sm font-medium">User</th>
                  <th className="p-4 text-left text-sm font-medium">Role</th>
                  <th className="p-4 text-left text-sm font-medium">Status</th>
                  <th className="p-4 text-left text-sm font-medium">Created</th>
                  <th className="p-4 text-right text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary">
                            {user.name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <select
                        value={user.role}
                        onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                        disabled={user.id === currentUser?.id}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border cursor-pointer ${getRoleBadgeClass(user.role)} ${user.id === currentUser?.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                        data-testid={`role-select-${user.id}`}
                      >
                        <option value="Admin">Admin</option>
                        <option value="Maker">Maker</option>
                        <option value="Checker">Checker</option>
                        <option value="Approver">Approver</option>
                        <option value="Accountant">Accountant</option>
                        <option value="Viewer">Viewer</option>
                      </select>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        user.is_active 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.is_active ? (
                          <>
                            <Check className="h-3 w-3 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <X className="h-3 w-3 mr-1" />
                            Inactive
                          </>
                        )}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {user.created_at ? format(new Date(user.created_at), 'dd MMM yyyy') : '-'}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        {user.id !== currentUser?.id && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleStatus(user.id, user.is_active)}
                              title={user.is_active ? 'Deactivate' : 'Activate'}
                              data-testid={`toggle-status-${user.id}`}
                            >
                              {user.is_active ? (
                                <Ban className="h-4 w-4 text-yellow-600" />
                              ) : (
                                <CheckCircle className="h-4 w-4 text-emerald-600" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteUser(user.id, user.name)}
                              title="Delete User"
                              data-testid={`delete-user-${user.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </>
                        )}
                        {user.id === currentUser?.id && (
                          <span className="text-xs text-muted-foreground italic">You</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Roles & Permissions Tab */}
        <TabsContent value="roles">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Role Cards */}
            {roles.map((role) => (
              <div 
                key={role.name} 
                className="bg-card border border-border rounded-lg p-6"
                data-testid={`role-card-${role.name}`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getRoleBadgeClass(role.name)}`}>
                    <Shield className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{role.name}</h3>
                    <p className="text-sm text-muted-foreground">{role.description}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {permissionGroups.map((group) => (
                    <div key={group.name}>
                      <div className="flex items-center gap-2 mb-2">
                        <group.icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground">{group.name}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {group.permissions.map((perm) => {
                          const hasPermission = role.permissions[perm];
                          return (
                            <span
                              key={perm}
                              className={`inline-flex items-center px-2 py-1 rounded text-xs ${
                                hasPermission
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-gray-100 text-gray-400 line-through'
                              }`}
                            >
                              {hasPermission ? (
                                <Check className="h-3 w-3 mr-1" />
                              ) : (
                                <X className="h-3 w-3 mr-1" />
                              )}
                              {formatPermissionName(perm).replace(group.name.split(' ')[0] + ' ', '')}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Invite User Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent className="max-w-md" data-testid="invite-user-dialog">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Add New User
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleInviteUser} className="space-y-4 mt-4">
            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={inviteForm.name}
                onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                placeholder="Enter full name"
                required
              />
            </div>

            <div>
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                placeholder="user@company.com"
                required
              />
            </div>

            <div>
              <Label htmlFor="role">Role *</Label>
              <select
                id="role"
                value={inviteForm.role}
                onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md bg-background"
              >
                <option value="Viewer">Viewer</option>
                <option value="Maker">Maker (Invoice Uploader)</option>
                <option value="Checker">Checker (First Approver)</option>
                <option value="Approver">Approver (Final Approver)</option>
                <option value="Accountant">Accountant (Payments)</option>
                <option value="Admin">Admin (Full Access)</option>
              </select>
            </div>

            <div>
              <Label htmlFor="password">Temporary Password</Label>
              <Input
                id="password"
                type="text"
                value={inviteForm.password}
                onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })}
                placeholder="Welcome@123"
              />
              <p className="text-xs text-muted-foreground mt-1">
                User should change this on first login
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setInviteDialogOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-1">
                <UserPlus className="h-4 w-4 mr-2" />
                Create User
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserRoles;

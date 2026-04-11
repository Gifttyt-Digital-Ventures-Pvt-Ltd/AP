import React from 'react';
import { Button } from '../../../components/ui/button';
import { Ban, Check, CheckCircle, Trash2, X } from 'lucide-react';
import { format } from 'date-fns';

const roleBadgeClass = (role) => {
  const normalizedRole = String(role || '').trim().toLowerCase();
  const roleColors = {
    Admin: 'bg-purple-100 text-purple-800 border-purple-200',
    'Finance Manager': 'bg-blue-100 text-blue-800 border-blue-200',
    'Procurement Officer': 'bg-amber-100 text-amber-800 border-amber-200',
    Maker: 'bg-blue-100 text-blue-800 border-blue-200',
    Checker: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    Approver: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    Accountant: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    Viewer: 'bg-gray-100 text-gray-800 border-gray-200',
  };
  const directMatch = roleColors[role];
  if (directMatch) return directMatch;

  if (normalizedRole === 'admin' || normalizedRole === 'administrator') {
    return roleColors.Admin;
  }
  if (normalizedRole === 'finance manager' || normalizedRole === 'finance_manager') {
    return roleColors['Finance Manager'];
  }
  if (normalizedRole === 'procurement officer' || normalizedRole === 'procurement_officer') {
    return roleColors['Procurement Officer'];
  }
  return 'bg-gray-100 text-gray-800 border-gray-200';
};

const resolveRoleValue = (role, roleOptions = []) => {
  if (!role) return roleOptions[0] || '';
  const exactMatch = roleOptions.find((option) => option === role);
  if (exactMatch) return exactMatch;
  const normalizedRole = String(role).trim().toLowerCase();
  const canonicalMatch = roleOptions.find(
    (option) => String(option || '').trim().toLowerCase() === normalizedRole
  );
  return canonicalMatch || role;
};

// Backend-driven users table with role/status/user lifecycle actions.
const UsersTable = ({
  users,
  availableRoles = [],
  currentUserId,
  handleUpdateRole,
  handleToggleStatus,
  handleDeleteUser,
}) => {
  const roleOptions = availableRoles.length > 0 ? availableRoles : ['Admin', 'Finance Manager', 'Procurement Officer', 'Approver'];

  return (
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
                      {user.name?.split(' ').map((n) => n[0]).join('').toUpperCase()}
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
                  value={resolveRoleValue(user.role, roleOptions)}
                  onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                  disabled={user.id === currentUserId}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border cursor-pointer ${roleBadgeClass(user.role)} ${user.id === currentUserId ? 'opacity-50 cursor-not-allowed' : ''}`}
                  data-testid={`role-select-${user.id}`}
                >
                  {roleOptions.map((roleName) => (
                    <option key={roleName} value={roleName}>
                      {roleName}
                    </option>
                  ))}
                </select>
              </td>
              <td className="p-4">
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                    user.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                  }`}
                >
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
                  {user.id !== currentUserId ? (
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
                  ) : (
                    <span className="text-xs text-muted-foreground italic">You</span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UsersTable;

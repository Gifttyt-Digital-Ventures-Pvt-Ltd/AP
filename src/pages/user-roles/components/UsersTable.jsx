import React from 'react';
import { Button } from '../../../components/ui/button';
import { CheckCircle, Pencil, ShieldCheck, Trash2, X } from 'lucide-react';
import { format } from 'date-fns';
import AppDataTable from '../../../components/common/AppDataTable';
import { TableCell, TableRow } from '../../../components/ui/table';

const roleBadgeClass = (role) => {
  const palettes = [
    'bg-slate-100 text-slate-800 border-slate-200',
    'bg-blue-100 text-blue-800 border-blue-200',
    'bg-emerald-100 text-emerald-800 border-emerald-200',
    'bg-amber-100 text-amber-800 border-amber-200',
    'bg-cyan-100 text-cyan-800 border-cyan-200',
    'bg-rose-100 text-rose-800 border-rose-200',
  ];
  const token = String(role || '').trim().toLowerCase();
  if (!token) return palettes[0];
  let hash = 0;
  for (let i = 0; i < token.length; i += 1) {
    hash = (hash + token.charCodeAt(i)) % palettes.length;
  }
  return palettes[hash];
};

const usersTableHeader = [
  { key: 'user', title: 'User' },
  { key: 'department', title: 'Department' },
  { key: 'status', title: 'Status' },
  { key: 'created_at', title: 'Created', cellClassName: 'text-sm text-muted-foreground' },
  { key: 'actions', title: 'Actions', headerClassName: 'text-right', cellClassName: 'text-right' },
];

// Backend-driven users table with role/status/user lifecycle actions.
const UsersTable = ({
  users,
  currentUserId,
  handleDeleteUser,
  handleEditUser,
  handleAssignRoles,
  canManageUserRecords,
  canAssignRoles,
}) => {
  const renderUserRow = (user, rowIndex, headers) => (
    <TableRow key={user.id ?? rowIndex} className="last:border-0 hover:bg-muted/30">
      {headers.map((header) => {
        let value;

        switch (header.key) {
          case 'user':
            value = (
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
            );
            break;
          case 'department':
            value = (
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${roleBadgeClass(user.department || 'department')}`}>
                {user.department || '-'}
              </span>
            );
            break;
          case 'status':
            value = (
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                  user.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                }`}
              >
                {user.is_active ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </>
                ) : (
                  <>
                    <X className="h-3 w-3 mr-1" />
                    Inactive
                  </>
                )}
              </span>
            );
            break;
          case 'created_at':
            value = user.created_at ? format(new Date(user.created_at), 'dd MMM yyyy') : '-';
            break;
          case 'actions':
            value = (
              <div className="flex items-center justify-end gap-2">
                {user.id !== currentUserId && (canManageUserRecords || canAssignRoles) ? (
                  <>
                    {canManageUserRecords && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditUser?.(user)}
                        title="Edit User"
                        data-testid={`edit-user-${user.id}`}
                      >
                        <Pencil className="h-4 w-4 text-blue-600" />
                      </Button>
                    )}
                    {canAssignRoles && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAssignRoles?.(user)}
                        title="Assign Role Sets"
                        data-testid={`assign-roles-${user.id}`}
                      >
                        <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      </Button>
                    )}
                    {canManageUserRecords && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteUser(user.id, user.name)}
                        title="Delete User"
                        data-testid={`delete-user-${user.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground italic">
                    {user.id === currentUserId ? 'You' : 'No Actions'}
                  </span>
                )}
              </div>
            );
            break;
          default:
            value = user?.[header.key] || '-';
        }

        return (
          <TableCell key={header.key} className={header.cellClassName}>
            {value}
          </TableCell>
        );
      })}
    </TableRow>
  );

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <AppDataTable
        tableHeader={usersTableHeader}
        tableData={users}
        renderRow={renderUserRow}
        emptyMessage="No users found"
      />
    </div>
  );
};

export default UsersTable;

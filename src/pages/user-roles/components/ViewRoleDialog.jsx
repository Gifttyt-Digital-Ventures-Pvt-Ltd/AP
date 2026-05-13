import React, { useEffect, useMemo, useState } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../../components/ui/accordion';
import { Button } from '../../../components/ui/button';
import { Checkbox } from '../../../components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Separator } from '../../../components/ui/separator';
import { CheckCircle2, Edit2, Shield, Users } from 'lucide-react';

// Role detail dialog for backend roles.
const ViewRoleDialog = ({
  open,
  onOpenChange,
  role,
  startInEditMode = false,
  permissionGroups,
  permissionLabels,
  onSave,
  saving = false,
  availableUsers = [],
}) => {
  const [editSection, setEditSection] = useState(null);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [userSearch, setUserSearch] = useState('');

  useEffect(() => {
    if (!role) return;
    setSelectedPermissions(Array.isArray(role.permissions) ? role.permissions : []);
    setSelectedEmployeeIds(Array.isArray(role.assignedEmployeeIds) ? role.assignedEmployeeIds : []);
    setUserSearch('');
    setEditSection(startInEditMode ? 'permissions' : null);
  }, [role, open, startInEditMode]);

  const isPermissionEditMode = editSection === 'permissions';
  const isUserEditMode = editSection === 'users';

  const handlePermissionToggle = (permissionId) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleCancel = () => {
    setSelectedPermissions(Array.isArray(role.permissions) ? role.permissions : []);
    setSelectedEmployeeIds(Array.isArray(role.assignedEmployeeIds) ? role.assignedEmployeeIds : []);
    setUserSearch('');
    setEditSection(null);
  };

  const handleEmployeeToggle = (employeeId) => {
    if (!employeeId) return;
    setSelectedEmployeeIds((prev) =>
      prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const filteredUsers = useMemo(() => {
    const query = String(userSearch || '').trim().toLowerCase();
    if (!query) return availableUsers;
    return availableUsers.filter((user) => {
      const name = String(user?.name || '').toLowerCase();
      const email = String(user?.email || '').toLowerCase();
      const empId = String(user?.empId || '').toLowerCase();
      return name.includes(query) || email.includes(query) || empId.includes(query);
    });
  }, [availableUsers, userSearch]);

  const displayedPermissions = useMemo(() => {
    const backendEntries = Array.isArray(role?.permissionEntries) ? role.permissionEntries : [];
    if (backendEntries.length > 0) {
      return backendEntries.map((entry, index) => {
        const screenLabel =
          String(entry?.screenDisplayName || '').trim() ||
          String(entry?.screen || '').trim();
        const permissionTypeLabel =
          String(entry?.permissionTypeDisplayName || '').trim() ||
          String(entry?.permissionType || '').trim();
        const fallbackLabel = entry?.canonicalId ? permissionLabels[entry.canonicalId] : '';
        const label = screenLabel && permissionTypeLabel
          ? `${screenLabel} - ${permissionTypeLabel}`
          : fallbackLabel || screenLabel || permissionTypeLabel || 'Unknown Permission';
        const key = entry?.id || `${entry?.screen || 'screen'}-${entry?.permissionType || 'type'}-${index}`;
        return { key, label };
      });
    }
    const canonicalPermissions = Array.isArray(role?.permissions) ? role.permissions : [];
    return canonicalPermissions.map((permissionId) => ({
      key: permissionId,
      label: permissionLabels[permissionId] || permissionId,
    }));
  }, [permissionLabels, role?.permissionEntries, role?.permissions]);

  const handleSave = async () => {
    const didSave = await onSave({
      ...role,
      editSection,
      name: role.name?.trim() || '',
      description: role.description?.trim() || '',
      permissions: selectedPermissions,
      assignedEmployeeIds: selectedEmployeeIds,
      previousAssignedEmployeeIds: Array.isArray(role.assignedEmployeeIds) ? role.assignedEmployeeIds : [],
    });
    if (!didSave) return;
    setEditSection(null);
    onOpenChange(false);
  };

  if (!role) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0 flex flex-col overflow-hidden">
        <div className="p-6 pb-4 shrink-0">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                {role.name}
              </div>
            </DialogTitle>
            <DialogDescription>Review and update role details.</DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-6">
          <div className="space-y-6 pb-4">
            <div>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-medium">
                    Permissions ({isPermissionEditMode ? selectedPermissions.length : role.permissionsCount})
                  </h3>
                </div>
                {!isPermissionEditMode && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditSection('permissions')}
                    disabled={isUserEditMode || saving}
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit Permissions
                  </Button>
                )}
              </div>

              {isPermissionEditMode ? (
                <Accordion type="multiple" className="space-y-2">
                  {permissionGroups.map((group, index) => (
                    <AccordionItem
                      key={group.title}
                      value={`item-${index}`}
                      className="border border-border rounded-lg px-4"
                    >
                      <AccordionTrigger className="hover:no-underline py-4">
                        <span className="font-medium text-sm">{group.title}</span>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4">
                        <div className="space-y-3 pt-2">
                          {group.permissions.map((permission) => (
                            <div key={permission.id} className="flex items-center space-x-3">
                              <Checkbox
                                id={`edit-${permission.id}`}
                                checked={selectedPermissions.includes(permission.id)}
                                onCheckedChange={() => handlePermissionToggle(permission.id)}
                              />
                              <label htmlFor={`edit-${permission.id}`} className="text-sm text-foreground cursor-pointer">
                                {permission.label}
                              </label>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <div className="space-y-2">
                  {displayedPermissions.length > 0 ? (
                    displayedPermissions.map((permission) => (
                      <div key={permission.key} className="flex items-center gap-2 p-3 bg-accent/50 rounded-lg">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                        <span className="text-sm">{permission.label}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No permissions assigned</p>
                  )}
                </div>
              )}
            </div>

            <div>
              <Separator className="mb-4" />
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-medium">
                    Assigned Users ({isUserEditMode ? selectedEmployeeIds.length : role.users.length})
                  </h3>
                </div>
                {!isUserEditMode && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditSection('users')}
                    disabled={isPermissionEditMode || saving}
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit Users
                  </Button>
                )}
              </div>

              {isUserEditMode ? (
                <div className="space-y-3">
                  <Input
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search users by name, email, or employee ID"
                  />
                  <div className="max-h-60 overflow-y-auto border border-border rounded-lg p-3 space-y-3">
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => (
                        <div key={user.id} className="flex items-start space-x-3">
                          <Checkbox
                            id={`employee-${user.id}`}
                            checked={selectedEmployeeIds.includes(user.id)}
                            onCheckedChange={() => handleEmployeeToggle(user.id)}
                          />
                          <label htmlFor={`employee-${user.id}`} className="text-sm cursor-pointer">
                            <div className="font-medium">{user.name || user.email || user.empId || 'Unnamed user'}</div>
                            <div className="text-xs text-muted-foreground">
                              {user.email || '-'} {user.empId ? `• ${user.empId}` : ''}
                            </div>
                          </label>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No users found</p>
                    )}
                  </div>
                </div>
              ) : role.users.length > 0 ? (
                <div className="space-y-2">
                  {role.users.map((userName, index) => (
                    <div
                      key={`${userName}-${index}`}
                      className="flex items-center gap-3 p-3 border border-border rounded-lg"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                        {userName.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm">{userName}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No users assigned to this role</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 pt-4 border-t shrink-0">
          {isPermissionEditMode || isUserEditMode ? (
            <>
              <Button variant="outline" onClick={handleCancel} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving} data-testid="save-role-local-changes-btn">
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViewRoleDialog;

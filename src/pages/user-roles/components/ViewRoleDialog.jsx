import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Textarea } from '../../../components/ui/textarea';
import { CheckCircle2, Edit2, Shield, Users } from 'lucide-react';
import {
  isPermissionChecked,
  isPermissionDisabledByMasterAdmin,
  isMasterAdminSelected,
  isViewOnlyImplied,
  togglePermissionSelection,
} from '../utils/permissionSelection';
import { MASTER_ADMIN_PERMISSION_ID } from '../constants/permissionConfig';

const resolveInitialEditSection = (dialogMode) => {
  if (dialogMode === 'assignUsers') return 'users';
  if (dialogMode === 'edit') return 'role';
  return null;
};

// Role detail dialog for backend roles.
const ViewRoleDialog = ({
  open,
  onOpenChange,
  role,
  dialogMode = 'view',
  permissionGroups,
  permissionLabels,
  onSave,
  saving = false,
  availableUsers = [],
  canManageRoles = false,
  canManageAssignedUsers = false,
  hiddenPermissionIds = [],
}) => {
  const isAssignUsersFlow = dialogMode === 'assignUsers';
  const [editSection, setEditSection] = useState(null);
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const hiddenPermissionSet = useMemo(
    () => new Set(hiddenPermissionIds.map((permissionId) => String(permissionId || '').trim()).filter(Boolean)),
    [hiddenPermissionIds],
  );
  const filterHiddenPermissions = useCallback(
    (permissions = []) => permissions.filter((permissionId) => !hiddenPermissionSet.has(permissionId)),
    [hiddenPermissionSet],
  );

  useEffect(() => {
    if (!role) return;
    setRoleName(role.name || '');
    setRoleDescription(role.description || '');
    setSelectedPermissions(filterHiddenPermissions(Array.isArray(role.permissions) ? role.permissions : []));
    setSelectedEmployeeIds(Array.isArray(role.assignedEmployeeIds) ? role.assignedEmployeeIds : []);
    setUserSearch('');
    setEditSection(resolveInitialEditSection(dialogMode));
  }, [role, open, dialogMode, filterHiddenPermissions]);

  const isRoleEditMode = editSection === 'role';
  const isUserEditMode = editSection === 'users';
  const isEditing = Boolean(editSection);

  const handlePermissionToggle = (group, permissionId) => {
    setSelectedPermissions((prev) => togglePermissionSelection(group, permissionId, prev));
  };

  const handleMasterAdminToggle = () => {
    setSelectedPermissions((prev) =>
      togglePermissionSelection({}, MASTER_ADMIN_PERMISSION_ID, prev),
    );
  };

  const handleCancel = () => {
    if (!role) return;
    setRoleName(role.name || '');
    setRoleDescription(role.description || '');
    setSelectedPermissions(filterHiddenPermissions(Array.isArray(role.permissions) ? role.permissions : []));
    setSelectedEmployeeIds(Array.isArray(role.assignedEmployeeIds) ? role.assignedEmployeeIds : []);
    setUserSearch('');
    setEditSection(resolveInitialEditSection(dialogMode));
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
      return backendEntries
        .filter((entry) => !entry?.canonicalId || !hiddenPermissionSet.has(entry.canonicalId))
        .map((entry, index) => {
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
    return canonicalPermissions
      .filter((permissionId) => !hiddenPermissionSet.has(permissionId))
      .map((permissionId) => ({
        key: permissionId,
        label: permissionLabels[permissionId] || permissionId,
      }));
  }, [hiddenPermissionSet, permissionLabels, role?.permissionEntries, role?.permissions]);

  const handleSave = async () => {
    const didSave = await onSave({
      ...role,
      editSection,
      name: roleName.trim(),
      description: roleDescription.trim(),
      permissions: selectedPermissions,
      assignedEmployeeIds: selectedEmployeeIds,
      previousAssignedEmployeeIds: Array.isArray(role.assignedEmployeeIds) ? role.assignedEmployeeIds : [],
    });
    if (!didSave) return;
    setEditSection(null);
    onOpenChange(false);
  };

  const renderRoleDetailsFields = (readOnly = false) => (
    <div className="space-y-3 rounded-lg border border-border p-4 bg-muted/20">
      <div className="space-y-2">
        <Label htmlFor="view-role-name">Role Name</Label>
        {readOnly ? (
          <p className="text-sm font-medium">{roleName || '-'}</p>
        ) : (
          <Input
            id="view-role-name"
            value={roleName}
            onChange={(e) => setRoleName(e.target.value)}
            placeholder="Role name"
            data-testid="edit-role-name-input"
          />
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="view-role-description">Description</Label>
        {readOnly ? (
          <p className="text-sm text-muted-foreground">{roleDescription || 'No description'}</p>
        ) : (
          <Textarea
            id="view-role-description"
            value={roleDescription}
            onChange={(e) => setRoleDescription(e.target.value)}
            placeholder="Optional description"
            rows={2}
            data-testid="edit-role-description-input"
          />
        )}
      </div>
      {/* {role?.roleCode && (
        <p className="text-xs text-muted-foreground">Role code: {role.roleCode}</p>
      )} */}
    </div>
  );

  if (!role) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0 flex flex-col overflow-hidden">
        <div className="p-6 pb-4 shrink-0">
          <DialogHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5">
                <DialogTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  {isAssignUsersFlow ? `Assign Users — ${role.name}` : role.name}
                </DialogTitle>
                <DialogDescription>
                  {isAssignUsersFlow
                    ? 'Your role was created successfully. Select users to assign to this role now, or skip and assign later.'
                    : 'Review and update role details, permissions, and assigned users.'}
                </DialogDescription>
              </div>
              {canManageRoles && !isAssignUsersFlow && !isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditSection('role')}
                  disabled={saving}
                  data-testid="edit-role-btn"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit Role
                </Button>
              )}
            </div>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-6">
          <div className="space-y-6 pb-4">
            {!isAssignUsersFlow && (
              <div className="space-y-4">
                {isRoleEditMode ? (
                  <>
                    {renderRoleDetailsFields(false)}
                    <div>
                      <Label className="mb-3 block">
                        Permissions ({selectedPermissions.length})
                      </Label>
                      <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
                        <div className="flex items-start space-x-3">
                          <Checkbox
                            id="edit-master-admin"
                            checked={isMasterAdminSelected(selectedPermissions)}
                            onCheckedChange={handleMasterAdminToggle}
                            data-testid="edit-master-admin-checkbox"
                          />
                          <label htmlFor="edit-master-admin" className="cursor-pointer">
                            <span className="block text-sm font-medium">Master Admin</span>
                            <span className="block text-xs text-muted-foreground">
                              Full corporate portal access. Selecting this enables all permissions.
                            </span>
                          </label>
                        </div>
                      </div>
                      <Accordion
                        type="multiple"
                        className={`space-y-2 ${isMasterAdminSelected(selectedPermissions) ? 'pointer-events-none opacity-60' : ''}`}
                      >
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
                                {group.permissions.map((permission) => {
                                  const impliedViewOnly = isViewOnlyImplied(
                                    group,
                                    permission.id,
                                    selectedPermissions,
                                  );
                                  const disabledByMasterAdmin = isPermissionDisabledByMasterAdmin(
                                    permission.id,
                                    selectedPermissions,
                                  );
                                  return (
                                    <div
                                      key={permission.id}
                                      className={`flex items-center space-x-3 ${
                                        impliedViewOnly || disabledByMasterAdmin ? 'opacity-50' : ''
                                      }`}
                                    >
                                      <Checkbox
                                        id={`edit-${permission.id}`}
                                        checked={isPermissionChecked(group, permission.id, selectedPermissions)}
                                        disabled={impliedViewOnly || disabledByMasterAdmin}
                                        onCheckedChange={() => handlePermissionToggle(group, permission.id)}
                                      />
                                      <label
                                        htmlFor={`edit-${permission.id}`}
                                        className={`text-sm ${
                                          impliedViewOnly || disabledByMasterAdmin
                                            ? 'text-muted-foreground cursor-not-allowed'
                                            : 'text-foreground cursor-pointer'
                                        }`}
                                      >
                                        {permission.label}
                                        {(impliedViewOnly || disabledByMasterAdmin) && (
                                          <span className="ml-2 text-xs text-muted-foreground">
                                            {disabledByMasterAdmin
                                              ? 'Disabled by Master Admin'
                                              : 'Included with higher access'}
                                          </span>
                                        )}
                                      </label>
                                    </div>
                                  );
                                })}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </div>
                  </>
                ) : (
                  <>
                    {renderRoleDetailsFields(true)}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                        <h3 className="font-medium text-sm">
                          Permissions ({role.permissionsCount})
                        </h3>
                      </div>
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
                    </div>
                  </>
                )}
              </div>
            )}

            <div>
              {!isAssignUsersFlow && <Separator className="mb-4" />}
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-medium">
                    Assigned Users ({isUserEditMode ? selectedEmployeeIds.length : role.users.length})
                  </h3>
                </div>
                {canManageAssignedUsers && !isUserEditMode && !isAssignUsersFlow && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditSection('users')}
                    disabled={isRoleEditMode || saving}
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
                    data-testid="assign-role-user-search"
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
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancel} disabled={saving}>
                Cancel
              </Button>
              {isAssignUsersFlow && (
                <Button
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  disabled={saving}
                  data-testid="skip-assign-users-btn"
                >
                  Skip for now
                </Button>
              )}
              <Button
                onClick={handleSave}
                disabled={saving || (isRoleEditMode && !roleName.trim())}
                data-testid="save-role-local-changes-btn"
              >
                {saving
                  ? 'Saving...'
                  : isAssignUsersFlow
                    ? 'Assign Users'
                    : isUserEditMode
                      ? 'Save Users'
                      : 'Save Role'}
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

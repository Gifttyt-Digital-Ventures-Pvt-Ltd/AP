import React, { useEffect, useMemo, useState } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../../components/ui/accordion';
import { Badge } from '../../../components/ui/badge';
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

// Role detail dialog that supports local-only edits for both backend and draft roles.
const ViewRoleDialog = ({
  open,
  onOpenChange,
  role,
  startInEditMode = false,
  permissionGroups,
  permissionLabels,
  onSave,
}) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState([]);

  useEffect(() => {
    if (!role) return;
    setEditedName(role.name || '');
    setEditedDescription(role.description || '');
    setSelectedPermissions(Array.isArray(role.permissions) ? role.permissions : []);
    setIsEditMode(Boolean(startInEditMode));
  }, [role, open, startInEditMode]);

  const canSave = useMemo(() => editedName.trim().length > 0, [editedName]);

  if (!role) return null;

  const handlePermissionToggle = (permissionId) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleCancel = () => {
    setEditedName(role.name || '');
    setEditedDescription(role.description || '');
    setSelectedPermissions(Array.isArray(role.permissions) ? role.permissions : []);
    setIsEditMode(false);
  };

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      ...role,
      name: editedName.trim(),
      description: editedDescription.trim(),
      permissions: selectedPermissions,
    });
    setIsEditMode(false);
    onOpenChange(false);
  };

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
              {!isEditMode && (
                <Button variant="outline" size="sm" onClick={() => setIsEditMode(true)}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit (Local Only)
                </Button>
              )}
            </DialogTitle>
            <DialogDescription>
              Changes here are local to this session and are not sent to backend.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-6">
          <div className="space-y-6 pb-4">
            <div className="flex gap-2">
              {role.isLocalDraft && <Badge variant="outline">Local Draft</Badge>}
              {role.isLocalOverride && <Badge variant="outline">Local Override</Badge>}
            </div>

            {isEditMode && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="edit-role-name">Role Name</Label>
                  <Input
                    id="edit-role-name"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    data-testid="edit-role-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-role-description">Description</Label>
                  <Input
                    id="edit-role-description"
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    data-testid="edit-role-description-input"
                  />
                </div>
              </>
            )}

            <div>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-medium">
                  Permissions ({isEditMode ? selectedPermissions.length : role.permissionsCount})
                </h3>
              </div>

              {isEditMode ? (
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
                  {role.permissions.length > 0 ? (
                    role.permissions.map((permissionId) => (
                      <div key={permissionId} className="flex items-center gap-2 p-3 bg-accent/50 rounded-lg">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                        <span className="text-sm">{permissionLabels[permissionId] || permissionId}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No permissions assigned</p>
                  )}
                </div>
              )}
            </div>

            {!isEditMode && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <h3 className="font-medium">Assigned Users ({role.users.length})</h3>
                  </div>
                  {role.users.length > 0 ? (
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
              </>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 pt-4 border-t shrink-0">
          {isEditMode ? (
            <>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!canSave} data-testid="save-role-local-changes-btn">
                Save Local Changes
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

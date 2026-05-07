import React, { useMemo, useState } from 'react';
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

// Dialog for backend custom role creation.
const AddRoleDialog = ({ open, onOpenChange, permissionGroups, onSave, saving = false }) => {
  const [roleName, setRoleName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState([]);

  const canSave = useMemo(() => roleName.trim().length > 0, [roleName]);

  const handlePermissionToggle = (permissionId) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const reset = () => {
    setRoleName('');
    setDescription('');
    setSelectedPermissions([]);
  };

  const handleCancel = () => {
    reset();
    onOpenChange(false);
  };

  const handleSave = async () => {
    if (!canSave) return;
    const didSave = await onSave({
      name: roleName.trim(),
      description: description.trim(),
      permissions: selectedPermissions,
    });
    if (!didSave) return;
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0 flex flex-col overflow-hidden">
        <div className="p-6 pb-4 shrink-0">
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
            <DialogDescription>
              Create a custom role and assign permissions.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-6">
          <div className="space-y-6 pb-4">
            <div className="space-y-2">
              <Label htmlFor="role-name">Role Name</Label>
              <Input
                id="role-name"
                placeholder="e.g., AP Reviewer"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                data-testid="add-role-name-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role-description">Description</Label>
              <Input
                id="role-description"
                placeholder="Optional description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                data-testid="add-role-description-input"
              />
            </div>

            <div>
              <Label className="mb-3 block">Permissions</Label>
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
                              id={`create-${permission.id}`}
                              checked={selectedPermissions.includes(permission.id)}
                              onCheckedChange={() => handlePermissionToggle(permission.id)}
                            />
                            <label
                              htmlFor={`create-${permission.id}`}
                              className="text-sm text-foreground cursor-pointer"
                            >
                              {permission.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 pt-4 border-t shrink-0">
          <Button variant="outline" onClick={handleCancel} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!canSave || saving} data-testid="save-local-role-btn">
            {saving ? 'Saving...' : 'Create Role'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddRoleDialog;

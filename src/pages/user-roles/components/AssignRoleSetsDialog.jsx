import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Checkbox } from '../../../components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { PERMISSION_GROUPS } from '../constants/permissionConfig';

const permissionModuleMap = PERMISSION_GROUPS.reduce((acc, group) => {
  group.permissions.forEach((permission) => {
    acc[permission.id] = group.title;
  });
  return acc;
}, {});

const permissionAccessRank = (permissionId = '') =>
  String(permissionId).endsWith('-view') ? 1 : 2;

const accessLabel = (rank) => {
  if (rank >= 2) return 'Manage';
  if (rank === 1) return 'View Only';
  return 'No Access';
};

const buildAccessPreview = (roles, selectedRoleIds) => {
  const selectedSet = new Set(selectedRoleIds.map((id) => String(id)));
  const moduleMap = new Map();

  roles
    .filter((role) => selectedSet.has(String(role.id)))
    .forEach((role) => {
      (role.permissions || []).forEach((permissionId) => {
        const moduleName = permissionModuleMap[permissionId] || 'Other';
        const rank = permissionAccessRank(permissionId);
        const existing = moduleMap.get(moduleName) || {
          moduleName,
          rank: 0,
          sources: new Set(),
        };

        existing.rank = Math.max(existing.rank, rank);
        existing.sources.add(role.name);
        moduleMap.set(moduleName, existing);
      });
    });

  return Array.from(moduleMap.values())
    .map((entry) => ({
      moduleName: entry.moduleName,
      finalAccess: accessLabel(entry.rank),
      sources: Array.from(entry.sources),
      hasOverlap: entry.sources.size > 1,
    }))
    .sort((a, b) => a.moduleName.localeCompare(b.moduleName));
};

const AssignRoleSetsDialog = ({
  open,
  onOpenChange,
  user,
  roles = [],
  initialRoleIds = [],
  onSave,
  saving = false,
}) => {
  const [selectedRoleIds, setSelectedRoleIds] = useState([]);

  useEffect(() => {
    if (!open) return;
    setSelectedRoleIds(initialRoleIds.map((id) => String(id)));
  }, [initialRoleIds, open]);

  const previewRows = useMemo(
    () => buildAccessPreview(roles, selectedRoleIds),
    [roles, selectedRoleIds],
  );
  const overlapRows = previewRows.filter((row) => row.hasOverlap);

  const toggleRole = (roleId) => {
    const id = String(roleId);
    setSelectedRoleIds((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id],
    );
  };

  const handleSave = () => {
    onSave?.({
      user,
      previousRoleIds: initialRoleIds.map((id) => String(id)),
      selectedRoleIds,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Assign Role Sets
          </DialogTitle>
          <DialogDescription>
            Select one or more role sets for {user?.name || 'this user'}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(260px,0.8fr)_1.2fr] gap-6">
          <div className="space-y-3">
            <div>
              <h3 className="font-medium">Role Sets</h3>
              <p className="text-sm text-muted-foreground">Multiple role sets can be assigned.</p>
            </div>

            <div className="border border-border rounded-lg divide-y max-h-[420px] overflow-y-auto">
              {roles.length > 0 ? (
                roles.map((role) => {
                  const roleId = String(role.id);
                  return (
                    <label
                      key={roleId}
                      className="flex items-start gap-3 p-3 cursor-pointer hover:bg-muted/40"
                    >
                      <Checkbox
                        checked={selectedRoleIds.includes(roleId)}
                        onCheckedChange={() => toggleRole(roleId)}
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{role.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {role.permissionsCount || 0} permissions
                        </span>
                      </span>
                    </label>
                  );
                })
              ) : (
                <p className="p-4 text-sm text-muted-foreground">No role sets available.</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="font-medium">Access Preview</h3>
              <p className="text-sm text-muted-foreground">
                Final access is calculated using the highest permission across selected role sets.
              </p>
            </div>

            {overlapRows.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Some modules have permissions from multiple role sets.</p>
                    <p>The highest access level will be applied automatically.</p>
                  </div>
                </div>
              </div>
            )}

            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-3 text-left font-medium">Module</th>
                    <th className="p-3 text-left font-medium">Final Access</th>
                    <th className="p-3 text-left font-medium">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.length > 0 ? (
                    previewRows.map((row) => (
                      <tr key={row.moduleName} className="border-t border-border">
                        <td className="p-3">{row.moduleName}</td>
                        <td className="p-3">
                          <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium">
                            {row.finalAccess}
                          </span>
                        </td>
                        <td className="p-3">
                          {row.sources.join(', ')}
                          {row.hasOverlap && (
                            <span className="ml-2 text-xs text-amber-700">
                              Overlap
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="p-4 text-center text-muted-foreground">
                        Select role sets to preview access.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Assigning...' : 'Assign Role Sets'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignRoleSetsDialog;

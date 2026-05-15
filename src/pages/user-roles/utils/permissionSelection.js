const getViewOnlyPermissionId = (group = {}) =>
  (group.permissions || []).find((permission) =>
    String(permission?.label || "").toLowerCase().includes("view only"),
  )?.id || null;

export const isViewOnlyImplied = (group, permissionId, selectedPermissions = []) => {
  const viewOnlyPermissionId = getViewOnlyPermissionId(group);
  if (!viewOnlyPermissionId || permissionId !== viewOnlyPermissionId) return false;
  return (group.permissions || []).some(
    (permission) =>
      permission.id !== viewOnlyPermissionId &&
      selectedPermissions.includes(permission.id),
  );
};

export const isPermissionChecked = (group, permissionId, selectedPermissions = []) =>
  selectedPermissions.includes(permissionId) ||
  isViewOnlyImplied(group, permissionId, selectedPermissions);

export const togglePermissionSelection = (group, permissionId, selectedPermissions = []) => {
  if (isViewOnlyImplied(group, permissionId, selectedPermissions)) {
    return selectedPermissions;
  }

  const viewOnlyPermissionId = getViewOnlyPermissionId(group);
  const isSelected = selectedPermissions.includes(permissionId);

  if (isSelected) {
    return selectedPermissions.filter((id) => id !== permissionId);
  }

  const nextPermissions = [...selectedPermissions, permissionId];
  if (viewOnlyPermissionId && permissionId !== viewOnlyPermissionId) {
    return nextPermissions.filter((id) => id !== viewOnlyPermissionId);
  }

  return nextPermissions;
};

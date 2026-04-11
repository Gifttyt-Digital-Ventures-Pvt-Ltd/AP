import { getRoleTemplateByName } from '../constants/permissionConfig';

const toArray = (value) => (Array.isArray(value) ? value : []);

// Normalizes mixed backend permission shapes into a string array.
export const normalizePermissions = (permissions) => {
  if (!permissions) return [];
  if (Array.isArray(permissions)) {
    return permissions.filter((item) => typeof item === 'string');
  }
  if (typeof permissions === 'object') {
    return Object.entries(permissions)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([key]) => key);
  }
  return [];
};

const normalizeRoleName = (value) => String(value || '').trim();

const normalizeRoleToken = (value = '') =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');

const matchesRole = (candidate, sourceTemplate, fallbackRoleName) => {
  const candidateRole = normalizeRoleName(candidate?.role || candidate?.role_name || candidate?.title);
  if (!candidateRole) return false;

  const templateForCandidate = getRoleTemplateByName(candidateRole);
  if (sourceTemplate && templateForCandidate) {
    return sourceTemplate.id === templateForCandidate.id;
  }

  return normalizeRoleToken(candidateRole) === normalizeRoleToken(fallbackRoleName);
};

const toUserName = (user) => user?.name || user?.full_name || user?.email || 'Unknown User';

// Converts role API rows into UI cards compatible with local draft roles.
export const toUiRole = (role = {}, users = []) => {
  const rawRoleName = normalizeRoleName(role.name || role.role_name || role.title || role.id);
  const template = getRoleTemplateByName(rawRoleName);
  const roleName = template?.name || rawRoleName;
  const backendPermissions = normalizePermissions(role.permissions);
  const resolvedPermissions = template ? [...template.permissions] : backendPermissions;
  const matchedUsers = toArray(users).filter((user) => matchesRole(user, template, roleName));
  const mappedUsers = matchedUsers.map((user) => toUserName(user));
  const fallbackUsers = template && mappedUsers.length === 0 ? toArray(template.users) : [];
  const assignedUsers = mappedUsers.length > 0 ? mappedUsers : fallbackUsers;

  return {
    id: String(role.id || roleName || `role-${Math.random().toString(36).slice(2, 9)}`),
    key: String(role.id || template?.id || normalizeRoleToken(roleName)),
    templateId: template?.id || null,
    sourceRoleName: roleName,
    name: roleName,
    description: role.description || role.summary || template?.description || '',
    permissions: resolvedPermissions,
    permissionsCount: template?.permissionsCount ?? resolvedPermissions.length,
    users: assignedUsers,
    isLocalDraft: false,
    isLocalOverride: false,
  };
};

// Builds a UI role card directly from a source template when backend role rows are missing.
export const toTemplateUiRole = (template = {}, users = []) => {
  const roleName = normalizeRoleName(template.name);
  const matchedUsers = toArray(users).filter((user) => matchesRole(user, template, roleName));
  const mappedUsers = matchedUsers.map((user) => toUserName(user));
  const fallbackUsers = mappedUsers.length > 0 ? [] : toArray(template.users);
  const assignedUsers = mappedUsers.length > 0 ? mappedUsers : fallbackUsers;
  const resolvedPermissions = normalizePermissions(template.permissions);

  return {
    id: String(template.id || normalizeRoleToken(roleName)),
    key: `template-${template.id || normalizeRoleToken(roleName)}`,
    templateId: template.id || null,
    sourceRoleName: roleName,
    name: roleName,
    description: template.description || '',
    permissions: resolvedPermissions,
    permissionsCount: template.permissionsCount ?? resolvedPermissions.length,
    users: assignedUsers,
    isLocalDraft: false,
    isLocalOverride: false,
    isTemplateFallback: true,
  };
};

// Local roles are client-side only by design.
export const toLocalDraftRole = ({ id, name, description, permissions }) => ({
  id,
  key: id,
  sourceRoleName: name,
  name,
  description,
  permissions: normalizePermissions(permissions),
  permissionsCount: normalizePermissions(permissions).length,
  users: [],
  isLocalDraft: true,
  isLocalOverride: false,
});

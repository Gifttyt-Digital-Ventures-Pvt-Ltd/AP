import React from 'react';
import AddRoleCard from './AddRoleCard';
import RoleCard from './RoleCard';

// Card grid from source UI adapted for backend roles + local draft roles.
const RolesTab = ({ roles, onRoleClick, onEditRole, onDeleteRole, onOpenCreateDialog }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {roles.map((role) => (
        <RoleCard
          key={role.id}
          name={role.name}
          description={role.description}
          permissionsCount={role.permissionsCount}
          usersCount={Array.isArray(role.users) ? role.users.length : 0}
          isLocalDraft={Boolean(role.isLocalDraft)}
          isLocalOverride={Boolean(role.isLocalOverride)}
          onClick={() => onRoleClick(role)}
          onEdit={() => onEditRole(role)}
          onDelete={() => onDeleteRole(role)}
        />
      ))}
      <AddRoleCard onClick={onOpenCreateDialog} />
    </div>
  );
};

export default RolesTab;

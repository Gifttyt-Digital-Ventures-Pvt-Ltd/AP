import React from 'react';
import { Badge } from '../../../components/ui/badge';
import { Pencil, Trash2 } from 'lucide-react';

// Source-inspired role card, extended with local/draft indicators.
const RoleCard = ({
  name,
  description,
  permissionsCount,
  usersCount,
  isLocalDraft,
  isLocalOverride,
  onEdit,
  onDelete,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className="bg-card border border-border rounded-lg p-5 hover:border-foreground/20 transition-colors cursor-pointer"
      data-testid={`role-card-${name}`}
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="font-medium text-foreground">{name}</h3>
        <div className="flex items-center gap-1">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="text-muted-foreground hover:text-primary transition-colors"
              aria-label={`Edit role ${name}`}
              data-testid={`edit-role-${name}`}
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="text-muted-foreground hover:text-destructive transition-colors"
              aria-label={`Delete role ${name}`}
              data-testid={`delete-role-${name}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {description ? (
        <p className="text-sm text-muted-foreground mb-3">{description}</p>
      ) : (
        <p className="text-sm text-muted-foreground mb-3">No description provided</p>
      )}

      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">{permissionsCount} permissions enabled</p>
        <p className="text-sm text-muted-foreground">{usersCount} assigned users</p>
        {(isLocalDraft || isLocalOverride) && (
          <div className="flex gap-2 pt-1">
            {isLocalDraft && <Badge variant="outline">Local Draft</Badge>}
            {isLocalOverride && <Badge variant="outline">Local Override</Badge>}
          </div>
        )}
      </div>
    </div>
  );
};

export default RoleCard;

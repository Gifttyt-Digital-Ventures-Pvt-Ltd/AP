import React from 'react';
import { Plus } from 'lucide-react';

// Dashed action card for creating a backend custom role.
const AddRoleCard = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="bg-card border-2 border-dashed border-border rounded-lg p-5 hover:border-foreground/40 hover:bg-accent/50 transition-all min-h-[140px] flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
      data-testid="add-role-card"
    >
      <Plus className="w-6 h-6" />
      <span className="font-medium">Create New Role</span>
      {/* <span className="text-xs">Backend custom role</span> */}
    </button>
  );
};

export default AddRoleCard;

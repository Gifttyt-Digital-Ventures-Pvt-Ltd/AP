import React from "react";
import { ShieldAlert } from "lucide-react";

const AccessDeniedState = ({ title = "Access denied", description = "You do not have the required permissions to access this page." }) => {
  return (
    <div className="min-h-[60vh] rounded-xl border border-border bg-card/50 flex items-center justify-center" data-testid="access-denied-state">
      <div className="text-center px-6 max-w-xl">
        <ShieldAlert className="h-10 w-10 mx-auto text-amber-600" />
        <h2 className="mt-3 text-2xl font-semibold">{title}</h2>
        <p className="mt-2 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
};

export default AccessDeniedState;

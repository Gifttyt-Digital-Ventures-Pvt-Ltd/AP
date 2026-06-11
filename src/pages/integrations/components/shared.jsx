import React from "react";
import { Loader2, Plug } from "lucide-react";

import { Badge } from "../../../components/ui/badge";
import { statusBadgeClass, titleize } from "../utils";

export const StatusBadge = ({ status }) => (
  <Badge variant="outline" className={statusBadgeClass(status)}>
    {titleize(status || "unknown")}
  </Badge>
);

export const DirectionBadge = ({ direction }) => (
  <Badge variant="outline" className="border-slate-200 bg-white text-slate-700">
    {titleize(direction)}
  </Badge>
);

export const PageShell = ({ title, description, backAction, actions, children }) => (
  <div className="flex h-full min-h-0 flex-col overflow-y-auto bg-background p-6">
    {backAction && <div className="mb-3">{backAction}</div>}
    <div
      className={`mb-5 flex flex-col gap-3 ${
        actions ? "md:flex-row md:items-start md:justify-between" : ""
      }`}
    >
      <div>
        <h1 className="text-2xl font-semibold tracking-normal text-foreground">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
    {children}
  </div>
);

export const LoadingState = ({ label = "Loading integrations..." }) => (
  <div className="flex min-h-[360px] items-center justify-center rounded-md border bg-card">
    <div className="text-center">
      <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
      <p className="mt-3 text-sm text-muted-foreground">{label}</p>
    </div>
  </div>
);

export const EmptyState = ({ icon: Icon = Plug, title, description, action }) => (
  <div className="flex min-h-[280px] flex-col items-center justify-center rounded-md border border-dashed bg-card px-6 text-center">
    <Icon className="h-10 w-10 text-muted-foreground" />
    <h2 className="mt-4 text-lg font-semibold">{title}</h2>
    {description && <p className="mt-2 max-w-xl text-sm text-muted-foreground">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

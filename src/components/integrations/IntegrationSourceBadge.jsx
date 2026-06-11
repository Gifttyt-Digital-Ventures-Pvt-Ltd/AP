import React from "react";
import { Badge } from "../ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { getIntegrationBadgePresentation } from "../../utils/integrationProvenance";

const toneClasses = {
  native: "border-slate-200 bg-slate-50 text-slate-700",
  zoho: "border-indigo-200 bg-indigo-50 text-indigo-800",
  synced: "border-emerald-200 bg-emerald-50 text-emerald-800",
  pending: "border-blue-200 bg-blue-50 text-blue-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  error: "border-red-200 bg-red-50 text-red-800",
};

const IntegrationSourceBadge = ({ record, className = "" }) => {
  const { label, tone, tooltip } = getIntegrationBadgePresentation(record);

  const badge = (
    <Badge
      variant="outline"
      className={`whitespace-nowrap rounded-sm text-xs font-medium ${toneClasses[tone] || toneClasses.native} ${className}`}
    >
      {label}
    </Badge>
  );

  if (!tooltip) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">{badge}</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default IntegrationSourceBadge;

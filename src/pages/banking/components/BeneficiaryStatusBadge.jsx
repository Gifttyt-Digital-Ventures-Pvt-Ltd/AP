import React, { useMemo } from "react";
import { format } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../../../components/ui/tooltip";
import { BENEFICIARY_STATUS } from "../constants";

const STATUS_STYLES = {
  ACTIVE: "bg-green-100 text-green-800 border-green-200",
  ACTIVATING: "bg-amber-100 text-amber-800 border-amber-200",
  FAILED: "bg-red-100 text-red-800 border-red-200",
  NOT_REGISTERED: "bg-slate-100 text-slate-600 border-slate-200",
};

const BeneficiaryStatusBadge = ({ status, availableAt, className = "" }) => {
  const normalized = String(status || "NOT_REGISTERED").toUpperCase();

  const label = useMemo(() => {
    if (normalized === BENEFICIARY_STATUS.ACTIVE) return "Registered";
    if (normalized === BENEFICIARY_STATUS.FAILED) return "Failed";
    if (normalized === BENEFICIARY_STATUS.ACTIVATING) {
      if (availableAt) {
        const availableDate = new Date(availableAt);
        if (!Number.isNaN(availableDate.getTime()) && availableDate > new Date()) {
          return `Activating — payable after ${format(availableDate, "HH:mm")}`;
        }
      }
      return "Activating";
    }
    return "Not registered";
  }, [normalized, availableAt]);

  const styleClass = STATUS_STYLES[normalized] || STATUS_STYLES.NOT_REGISTERED;

  const badge = (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${styleClass} ${className}`}
    >
      {label}
    </span>
  );

  if (normalized === BENEFICIARY_STATUS.ACTIVATING) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent>
          ICICI beneficiaries become payable ~30 minutes after registration.
        </TooltipContent>
      </Tooltip>
    );
  }

  return badge;
};

export default BeneficiaryStatusBadge;

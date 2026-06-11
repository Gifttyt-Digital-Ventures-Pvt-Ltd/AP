import React from "react";
import { Loader2 } from "lucide-react";
import { getPayoutStatusConfig } from "../utils/payoutStatus";

const PayoutStatusBadge = ({ status, className = "" }) => {
  const config = getPayoutStatusConfig(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.className} ${className}`}
    >
      {config.showSpinner && <Loader2 className="h-3 w-3 animate-spin" />}
      {config.label}
    </span>
  );
};

export default PayoutStatusBadge;

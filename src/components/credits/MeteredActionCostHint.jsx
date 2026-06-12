import { AlertTriangle, Coins, Loader2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import CreditAmount, { formatCredits } from "./CreditAmount";
import { useMeteredActionEstimate } from "../../hooks/useMeteredActionEstimate";

const MeteredActionCostHint = ({
  actionCode,
  unitCount = 1,
  className = "",
}) => {
  const estimate = useMeteredActionEstimate(actionCode, unitCount);

  if (estimate.loading) {
    return (
      <div className={`flex items-center gap-2 rounded-md border border-dashed p-3 text-sm text-muted-foreground ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading token estimate...
      </div>
    );
  }

  if (!estimate.action) {
    return null;
  }

  if (estimate.isDisabled) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Action unavailable</AlertTitle>
        <AlertDescription>
          {estimate.actionName} is disabled for your organisation. Contact Optifii if you need it enabled.
        </AlertDescription>
      </Alert>
    );
  }

  if (estimate.unitCount <= 0) {
    return (
      <div className={`rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground ${className}`}>
        Select items to see the estimated token cost for {estimate.actionName}.
      </div>
    );
  }

  if (estimate.isFree) {
    return (
      <Alert className={`border-green-200 bg-green-50 text-green-900 ${className}`}>
        <Coins className="h-4 w-4" />
        <AlertTitle>No tokens will be used</AlertTitle>
        <AlertDescription>
          {estimate.actionName} is free for your organisation.
        </AlertDescription>
      </Alert>
    );
  }

  const unitLabel = estimate.unitCount === 1 ? "unit" : "units";

  return (
    <Alert
      className={`${
        estimate.canAfford
          ? "border-blue-200 bg-blue-50 text-blue-950"
          : "border-amber-200 bg-amber-50 text-amber-950"
      } ${className}`}
    >
      <Coins className="h-4 w-4" />
      <AlertTitle>Estimated token cost</AlertTitle>
      <AlertDescription className="space-y-1">
        <p>
          <CreditAmount value={estimate.estimatedCost} showUnit={false} /> for{" "}
          {estimate.unitCount} {unitLabel} of {estimate.actionName}
          {" "}({formatCredits(estimate.rate)} tokens per unit).
        </p>
        <p>
          Balance after: <CreditAmount value={estimate.balanceAfter} showUnit={false} /> tokens
        </p>
        {!estimate.canAfford ? (
          <p className="font-medium">
            Your wallet may not have enough tokens. The action can still be blocked by the server.
          </p>
        ) : null}
      </AlertDescription>
    </Alert>
  );
};

export default MeteredActionCostHint;

import React from "react";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { formatCurrency } from "../../../utils/currency";

const formatDate = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
};

const AdvanceAdjustmentSection = ({
  proposal,
  currency,
  isLoading = false,
  isError = false,
  isConfirmed = false,
  isConfirming = false,
  onConfirm,
}) => {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking advance adjustment...
        </div>
      </div>
    );
  }

  if (isError && !proposal) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <div className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Advance adjustment could not be checked. Final approval will still
            rely on backend validation.
          </p>
        </div>
      </div>
    );
  }

  if (!proposal) return null;

  const requiresConfirmation = proposal.requiresConfirmation && !isConfirmed;

  return (
    <div className="space-y-3 rounded-lg border border-border bg-background p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Advance Adjustment</h3>
          <p className="text-xs text-muted-foreground">
            Review the proposed adjustment before final approval.
          </p>
        </div>
        {isConfirmed ? (
          <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
            Confirmed
          </Badge>
        ) : proposal.requiresConfirmation ? (
          <Badge variant="outline">Confirmation required</Badge>
        ) : (
          <Badge variant="secondary">Read only</Badge>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-md bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">Outstanding Advances</p>
          <p className="text-sm font-semibold">
            {formatCurrency(proposal.totalOutstandingAdvance ?? 0, currency)}
          </p>
        </div>
        <div className="rounded-md bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">Proposed Adjustment</p>
          <p className="text-sm font-semibold">
            {formatCurrency(proposal.proposedAdjustmentAmount ?? 0, currency)}
          </p>
        </div>
        <div className="rounded-md bg-muted/40 p-3">
          <p className="text-xs text-muted-foreground">Net Payable After Advance</p>
          <p className="text-sm font-semibold">
            {formatCurrency(proposal.netPayableAfterAdvance ?? 0, currency)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span>Method: {proposal.adjustmentMethod || "-"}</span>
        <span>Order: {proposal.consumptionOrder || "-"}</span>
      </div>

      {proposal.advances?.length > 0 && (
        <div className="space-y-2">
          {proposal.advances.map((advance, index) => (
            <div
              key={`${advance.advanceId ?? advance.referenceNumber ?? index}`}
              className="rounded-md border border-border p-3 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">
                  {advance.referenceNumber || advance.advanceId || "Advance"}
                </span>
                <Badge variant="outline">{advance.origin || "MANUAL"}</Badge>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                <span>Paid: {formatDate(advance.paidAt)}</span>
                <span>
                  Outstanding:{" "}
                  {formatCurrency(advance.outstandingAmount ?? 0, currency)}
                </span>
                <span>
                  Adjusting:{" "}
                  {formatCurrency(
                    advance.proposedAdjustedAmount ?? advance.adjustedAmount ?? 0,
                    currency,
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {requiresConfirmation && (
        <Button
          type="button"
          variant="outline"
          onClick={onConfirm}
          disabled={isConfirming}
          className="w-full"
        >
          {isConfirming ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Confirming...
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Confirm Adjustment
            </>
          )}
        </Button>
      )}
    </div>
  );
};

export default AdvanceAdjustmentSection;

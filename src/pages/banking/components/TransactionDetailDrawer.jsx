import React, { useState } from "react";
import { format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "../../../components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../../components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { formatCurrency } from "../../../utils/currency";
import { getPayoutStatusConfig } from "../utils/payoutStatus";
import PayoutStatusBadge from "./PayoutStatusBadge";

const DetailRow = ({ label, value }) => (
  <div className="flex justify-between gap-4 text-sm py-1.5 border-b border-border/50 last:border-0">
    <span className="text-muted-foreground shrink-0">{label}</span>
    <span className="text-right font-medium break-all">{value || "-"}</span>
  </div>
);

const TransactionDetailDrawer = ({ open, onOpenChange, payout }) => {
  const [techOpen, setTechOpen] = useState(false);

  if (!payout) return null;

  const statusConfig = getPayoutStatusConfig(payout.normalizedStatus);
  const technical = payout.technicalDetail || {};

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Payout Details</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <PayoutStatusBadge status={payout.normalizedStatus} />
            {payout.utr && (
              <span className="text-xs text-muted-foreground">UTR: {payout.utr}</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{statusConfig.hint}</p>

          <div className="rounded-lg border p-3 space-y-0">
            <DetailRow label="Vendor" value={payout.vendorName} />
            <DetailRow label="Mode" value={payout.mode} />
            <DetailRow label="Amount" value={formatCurrency(payout.amount, "INR")} />
            <DetailRow label="Reference" value={payout.clientReference || payout.bankReference} />
            <DetailRow
              label="Initiated"
              value={
                payout.initiatedAt
                  ? format(new Date(payout.initiatedAt), "dd MMM yyyy HH:mm")
                  : null
              }
            />
            <DetailRow
              label="Updated"
              value={
                payout.updatedAt
                  ? format(new Date(payout.updatedAt), "dd MMM yyyy HH:mm")
                  : null
              }
            />
            {payout.message && <DetailRow label="Message" value={payout.message} />}
          </div>

          <Collapsible open={techOpen} onOpenChange={setTechOpen}>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted/50">
              Technical details
              <ChevronDown
                className={`h-4 w-4 transition-transform ${techOpen ? "rotate-180" : ""}`}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 rounded-lg border p-3 space-y-0">
              <DetailRow label="Act Code" value={technical.actCode} />
              <DetailRow label="RRN" value={technical.rrn} />
              <DetailRow label="Bank Reference" value={payout.bankReference} />
              <DetailRow label="Settlement ID" value={payout.settlementId} />
              {Array.isArray(technical.legs) && technical.legs.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Legs</p>
                  {technical.legs.map((leg, index) => (
                    <div key={index} className="text-xs mb-2 p-2 bg-muted/30 rounded">
                      {Object.entries(leg).map(([key, val]) => (
                        <div key={key}>
                          {key}: {String(val)}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default TransactionDetailDrawer;

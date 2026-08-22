import { TrendingUp } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";


const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

export const getInvoiceAvailabilitySummary = (summary = null) => {
  const resolvedSummary = summary;
  if (!resolvedSummary || resolvedSummary.showBillingInPortal !== true) return null;
  const subscriptionModel = String(resolvedSummary.subscriptionModel || "").toUpperCase();
  if (subscriptionModel && subscriptionModel !== "INVOICE_BASED") return null;

  const availableInvoiceLimit = toNumber(
    resolvedSummary.availableInvoiceLimit ?? resolvedSummary.remainingInvoices,
    0,
  );

  return {
    availableInvoiceLimit,
    remainingInvoices: availableInvoiceLimit,
  };
};

const InvoiceAvailabilityCard = ({ summary, compact = false, className = "" }) => {
  const usage = getInvoiceAvailabilitySummary(summary);
  if (!usage) return null;

  if (compact) {
    return (
      <div
        className={cn(
          "rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-800",
          usage.availableInvoiceLimit < 0 && "border-red-200 bg-red-50 text-red-800",
          usage.availableInvoiceLimit === 0 && "border-amber-200 bg-amber-50 text-amber-900",
          className,
        )}
      >
        Available invoice limit: {usage.availableInvoiceLimit}
      </div>
    );
  }

  return (
    <Card
      className={cn(
        "w-full max-w-[184px] rounded-xl border border-indigo-100 bg-white shadow-sm",
        usage.availableInvoiceLimit < 0 && "border-red-100",
        className,
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-medium leading-tight text-muted-foreground">
            Available invoice limit
          </p>
          <div
            className={cn(
              "rounded-lg bg-indigo-100 p-2 text-indigo-700",
              usage.availableInvoiceLimit < 0 && "bg-red-100 text-red-600",
            )}
          >
            <TrendingUp className="h-4 w-4" />
          </div>
        </div>
        <p
          className={cn(
            "mt-4 text-2xl font-bold tracking-tight text-indigo-700",
            usage.availableInvoiceLimit < 0 && "text-red-600",
          )}
        >
          {usage.availableInvoiceLimit}
        </p>
      </CardContent>
    </Card>
  );
};

export default InvoiceAvailabilityCard;

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import CreditAmount from "./CreditAmount";
import { parseCreditAmount } from "../../utils/creditMath";

const CreditBalanceBadge = ({ wallet, size = "sm", className = "" }) => {
  const balance = parseCreditAmount(wallet?.balance);
  const threshold = parseCreditAmount(wallet?.lowBalanceThreshold);
  const nearZero = balance <= Math.max(threshold * 0.25, 100);
  const lowBalance = threshold > 0 && balance < threshold;

  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full border-green-200 bg-green-50 px-3 py-1 text-green-800",
        lowBalance && "border-amber-200 bg-amber-50 text-amber-800",
        nearZero && "border-red-200 bg-red-50 text-red-800",
        size === "lg" && "px-4 py-2 text-base",
        className,
      )}
    >
      Balance: <CreditAmount value={balance} showUnit={size === "lg"} className="ml-1" />
    </Badge>
  );
};

export default CreditBalanceBadge;

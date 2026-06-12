import { cn } from "@/lib/utils";
import {
  formatCredits,
  parseCreditAmount,
  roundCreditAmount,
} from "../../utils/creditMath";

export { formatCredits };

const CreditAmount = ({
  value,
  signed = false,
  showUnit = true,
  className = "",
}) => {
  const amount = roundCreditAmount(value);
  const prefix = signed && amount > 0 ? "+" : "";

  return (
    <span
      className={cn(
        "font-semibold tabular-nums",
        signed && amount > 0 && "text-green-700",
        signed && amount < 0 && "text-red-700",
        className,
      )}
      title={`₹${formatCredits(amount)} equivalent`}
    >
      {prefix}
      {formatCredits(amount)}
      {showUnit ? " tokens" : ""}
    </span>
  );
};

export default CreditAmount;

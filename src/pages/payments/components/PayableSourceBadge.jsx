import { PAYABLE_SOURCE_LABELS } from "../constants/payables";

const SOURCE_CLASSES = {
  INVOICE: "border-blue-200 bg-blue-50 text-blue-800",
  OBLIGATION: "border-violet-200 bg-violet-50 text-violet-800",
  ADVANCE: "border-emerald-200 bg-emerald-50 text-emerald-800",
};

const PayableSourceBadge = ({ sourceType = "INVOICE", isAdvance = false }) => {
  const normalizedSource = String(sourceType || "INVOICE").toUpperCase();
  const label = isAdvance && normalizedSource === "OBLIGATION"
    ? "Advance"
    : PAYABLE_SOURCE_LABELS[normalizedSource] || normalizedSource;

  return (
    <span
      className={`inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${SOURCE_CLASSES[normalizedSource] || SOURCE_CLASSES.INVOICE}`}
    >
      {label}
    </span>
  );
};

export default PayableSourceBadge;


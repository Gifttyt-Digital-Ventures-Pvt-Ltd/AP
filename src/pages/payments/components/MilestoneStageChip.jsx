import { PAYABLE_STAGE_LABELS } from "../constants/payables";

const STAGE_CLASSES = {
  PO: "border-slate-200 bg-slate-50 text-slate-700",
  GRN: "border-cyan-200 bg-cyan-50 text-cyan-800",
  PI: "border-amber-200 bg-amber-50 text-amber-800",
  TI: "border-rose-200 bg-rose-50 text-rose-800",
};

const MilestoneStageChip = ({ stage, sharePct }) => {
  const normalizedStage = String(stage || "").toUpperCase();
  if (!normalizedStage) return null;

  const shareLabel =
    sharePct !== undefined && sharePct !== null && sharePct !== ""
      ? ` ${Number(sharePct).toLocaleString("en-IN", { maximumFractionDigits: 2 })}%`
      : "";

  return (
    <span
      className={`inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STAGE_CLASSES[normalizedStage] || STAGE_CLASSES.PO}`}
    >
      {PAYABLE_STAGE_LABELS[normalizedStage] || normalizedStage}
      {shareLabel}
    </span>
  );
};

export default MilestoneStageChip;


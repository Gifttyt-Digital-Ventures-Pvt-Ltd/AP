import { PAYOUT_STATUS } from "../constants";

const STATUS_CONFIG = {
  [PAYOUT_STATUS.INITIATED]: {
    label: "Initiated",
    hint: "Payment accepted and awaiting first confirmation from the bank.",
    className: "bg-blue-100 text-blue-800 border-blue-200",
    showSpinner: true,
  },
  [PAYOUT_STATUS.PENDING]: {
    label: "Confirming with bank",
    hint: "Payment is in progress. The bank is still confirming the transfer.",
    className: "bg-amber-100 text-amber-800 border-amber-200",
    showSpinner: true,
  },
  [PAYOUT_STATUS.SUCCESS]: {
    label: "Success",
    hint: "Payment completed. Credit confirmed by the beneficiary bank.",
    className: "bg-green-100 text-green-800 border-green-200",
    showSpinner: false,
  },
  [PAYOUT_STATUS.FAILED]: {
    label: "Failed",
    hint: "Payment could not be completed. You may retry with a new reference.",
    className: "bg-red-100 text-red-800 border-red-200",
    showSpinner: false,
  },
  [PAYOUT_STATUS.RETURNED]: {
    label: "Returned",
    hint: "Funds were returned by the beneficiary bank.",
    className: "bg-red-50 text-red-700 border-red-200",
    showSpinner: false,
  },
  [PAYOUT_STATUS.NEEDS_ATTENTION]: {
    label: "Needs attention",
    hint: "Payment has been pending beyond the expected window. Contact your RM.",
    className: "bg-slate-100 text-slate-700 border-slate-300",
    showSpinner: false,
  },
};

export const getPayoutStatusConfig = (status) => {
  const normalized = String(status || "").toUpperCase();
  return STATUS_CONFIG[normalized] || {
    label: normalized || "Unknown",
    hint: "",
    className: "bg-muted text-muted-foreground border-border",
    showSpinner: false,
  };
};

export const isTerminalPayoutStatus = (status) =>
  [PAYOUT_STATUS.SUCCESS, PAYOUT_STATUS.FAILED, PAYOUT_STATUS.RETURNED].includes(
    String(status || "").toUpperCase(),
  );

export const isNonTerminalPayoutStatus = (status) =>
  !isTerminalPayoutStatus(status) &&
  String(status || "").toUpperCase() !== PAYOUT_STATUS.NEEDS_ATTENTION;

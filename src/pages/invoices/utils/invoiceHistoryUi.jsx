import React from "react";
import {
  CheckCircle2,
  Clock,
  CreditCard,
  Pencil,
  Plus,
  RotateCcw,
  XCircle,
} from "lucide-react";
import {
  NEEDS_CORRECTION_ACTION,
  normalizeHistoryActionType,
  PAID_STATUS,
} from "../../../utils/approvalWorkflow";

export {
  extractRawHistory,
  getHistoryCommentsStyle,
  normalizeApprovalHistoryEntries,
  normalizeInvoiceHistoryEntries,
  resolveHistoryEntryComments,
} from "./invoiceHistory";

export const getHistoryIcon = (actionType) => {
  const normalizedAction = normalizeHistoryActionType(actionType);
  switch (normalizedAction) {
    case "Created":
      return <Plus className="h-4 w-4 text-emerald-500" />;
    case "Edited":
      return <Pencil className="h-4 w-4 text-blue-500" />;
    case "Approved":
    case "Checked":
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case "Rejected":
      return <XCircle className="h-4 w-4 text-red-500" />;
    case NEEDS_CORRECTION_ACTION:
      return <RotateCcw className="h-4 w-4 text-amber-600" />;
    case "Edited & Resubmitted":
      return <Pencil className="h-4 w-4 text-amber-600" />;
    case PAID_STATUS:
    case "Payment Released":
      return <CreditCard className="h-4 w-4 text-emerald-500" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
};

export const getHistoryBadgeClass = (actionType) => {
  const normalizedAction = normalizeHistoryActionType(actionType);
  switch (normalizedAction) {
    case "Created":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "Edited":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "Approved":
    case "Checked":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "Rejected":
      return "bg-red-100 text-red-700 border-red-200";
    case NEEDS_CORRECTION_ACTION:
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "Edited & Resubmitted":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case PAID_STATUS:
    case "Payment Released":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
};

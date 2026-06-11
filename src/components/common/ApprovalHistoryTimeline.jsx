import React from "react";
import { format } from "date-fns";
import { ArrowRight, History, User } from "lucide-react";
import {
  NEEDS_CORRECTION_ACTION,
  normalizeHistoryActionType,
  PAID_STATUS,
} from "../../utils/approvalWorkflow";
import { getHistoryCommentsStyle } from "../../pages/invoices/utils/invoiceHistory";
import {
  getHistoryBadgeClass,
  getHistoryIcon,
} from "../../pages/invoices/utils/invoiceHistoryUi";

const getHistoryEntryIconBackground = (actionType) => {
  const normalized = normalizeHistoryActionType(actionType);
  if (["Created", "Approved", "Payment Released", PAID_STATUS, "Checked"].includes(normalized)) {
    return "bg-emerald-100";
  }
  if (normalized === "Rejected") return "bg-red-100";
  if (normalized === NEEDS_CORRECTION_ACTION) return "bg-amber-100";
  if (normalized === "Edited" || normalized === "Edited & Resubmitted") return "bg-blue-100";
  return "bg-gray-100";
};

const ApprovalHistoryTimeline = ({
  history = [],
  loading = false,
  emptyMessage = "No history records found",
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!history.length) {
    return (
      <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
        <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-border" />
      <div className="space-y-4">
        {history.map((entry) => {
          const commentStyle = getHistoryCommentsStyle(entry.action_type);

          return (
            <div key={entry.id} className="relative flex gap-4">
              <div
                className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-2 border-background shadow-sm ${getHistoryEntryIconBackground(entry.action_type)}`}
              >
                {getHistoryIcon(entry.action_type)}
              </div>
              <div className="flex-1 pb-4">
                <div className="bg-card border rounded-lg p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${getHistoryBadgeClass(entry.action_type)}`}
                    >
                      {normalizeHistoryActionType(entry.action_type)}
                    </span>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>{format(new Date(entry.timestamp), "dd MMM yyyy")}</p>
                      <p>{format(new Date(entry.timestamp), "hh:mm a")}</p>
                    </div>
                  </div>
                  <p className="text-sm mb-3">{entry.action_description}</p>
                  {entry.comments?.trim() && (
                    <div className={`mb-3 rounded-md border px-3 py-2 ${commentStyle.boxClassName}`}>
                      <p className={`text-xs font-medium ${commentStyle.labelClassName}`}>
                        {commentStyle.label}
                      </p>
                      <p className={`mt-1 text-sm whitespace-pre-line ${commentStyle.textClassName}`}>
                        {entry.comments}
                      </p>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span className="font-medium">{entry.user_name}</span>
                    <span>|</span>
                    <span className="bg-muted px-2 py-0.5 rounded">{entry.user_role}</span>
                  </div>
                  {entry.changes?.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Changes:</p>
                      {entry.changes.map((change, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs">
                          <span className="font-medium capitalize">
                            {String(change.field_name || change.fieldName || "field").replace(/_/g, " ")}:
                          </span>
                          <span className="text-red-500 line-through">{change.old_value || change.oldValue || "empty"}</span>
                          <ArrowRight className="h-3 w-3" />
                          <span className="text-emerald-600">{change.new_value || change.newValue || "empty"}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ApprovalHistoryTimeline;

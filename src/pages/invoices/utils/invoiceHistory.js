import {
  NEEDS_CORRECTION_ACTION,
  normalizeApprovalAction,
  normalizeHistoryActionType,
} from "../../../utils/approvalWorkflow";

export const extractRawHistory = (response) => {
  if (Array.isArray(response)) return response;

  const candidates = [
    response?.history,
    response?.records,
    response?.approvalRecords,
    response?.approval_records,
    response?.data,
    response?.results,
    response?.content,
    response?.data?.history,
    response?.data?.records,
    response?.data?.approvalRecords,
    response?.data?.approval_records,
  ];

  const populated = candidates.find((entry) => Array.isArray(entry) && entry.length > 0);
  if (populated) return populated;

  return candidates.find(Array.isArray) || [];
};

export const resolveHistoryEntryComments = (entry = {}) => {
  const candidates = [
    entry.comments,
    entry.comment,
    entry.approvalComments,
    entry.approval_comments,
    entry.rejectionComment,
    entry.rejection_comment,
    entry.correctionComment,
    entry.correction_comment,
    entry.sentBackComment,
    entry.sent_back_comment,
    entry.checkerComment,
    entry.checker_comment,
    entry.approverComment,
    entry.approver_comment,
    entry.remarks,
    entry.notes,
    entry.message,
    entry.reason,
  ];

  const matched = candidates.find((value) => typeof value === "string" && value.trim());
  return matched ? matched.trim() : "";
};

export const getHistoryCommentsStyle = (actionType) => {
  const normalized = normalizeHistoryActionType(normalizeApprovalAction(actionType));

  if (normalized === "Rejected") {
    return {
      label: "Rejection comments",
      boxClassName: "border-red-200 bg-red-50",
      labelClassName: "text-red-700",
      textClassName: "text-red-900",
    };
  }

  if (normalized === NEEDS_CORRECTION_ACTION) {
    return {
      label: "Correction comments",
      boxClassName: "border-amber-200 bg-amber-50",
      labelClassName: "text-amber-800",
      textClassName: "text-amber-900",
    };
  }

  return {
    label: "Comments",
    boxClassName: "border-slate-200 bg-slate-50",
    labelClassName: "text-slate-700",
    textClassName: "text-slate-900",
  };
};

const resolveHistoryUserName = (entry = {}, level = "") => {
  if (entry.user_name || entry.userName) {
    return entry.user_name || entry.userName;
  }

  if (entry.approver_name || entry.approverName) {
    return entry.approver_name || entry.approverName;
  }

  if (entry.checker_name || entry.checkerName) {
    return entry.checker_name || entry.checkerName;
  }

  if (level === "System") return "System";
  return level || "Unknown";
};

const buildHistoryActionDescription = (actionRaw, userName, level = "") => {
  if (level === "System") return String(actionRaw || "Updated");
  if (userName && userName !== "Unknown") return `${actionRaw} by ${userName}`;
  return String(actionRaw || "Updated");
};

/** Normalizes approval/history record arrays (invoice + vendor). */
export const normalizeApprovalHistoryEntries = (response) => {
  const rawHistory = extractRawHistory(response);

  return rawHistory.map((entry, index) => {
    const actionRaw =
      entry.action_type ||
      entry.actionType ||
      entry.action ||
      entry.status ||
      "Updated";
    const action_type = normalizeApprovalAction(actionRaw);
    const level = String(
      entry.level || entry.approval_level || entry.approvalLevel || "",
    ).trim();
    const user_name = resolveHistoryUserName(entry, level);
    const comments = resolveHistoryEntryComments(entry);

    return {
      id:
        entry.id ||
        entry.recordId ||
        `${entry.userId || entry.user_id || user_name}-${entry.timestamp || index}-${index}`,
      action_type,
      action_description:
        entry.action_description ||
        entry.actionDescription ||
        buildHistoryActionDescription(actionRaw, user_name, level),
      timestamp:
        entry.timestamp ||
        entry.createdAt ||
        entry.created_at ||
        new Date().toISOString(),
      user_name,
      user_role:
        entry.user_role ||
        entry.userRole ||
        level ||
        "-",
      comments,
      changes: Array.isArray(entry.changes) ? entry.changes : [],
    };
  });
};

export const normalizeInvoiceHistoryEntries = normalizeApprovalHistoryEntries;

import { normalizeWorkflowStatus, PAID_STATUS } from '../../../utils/approvalWorkflow';

const APPROVAL_PIPELINE_STATUSES = new Set([
  'Pending Checker',
  'Pending Approver',
  'Pending Approval',
  'Pending Payment',
  PAID_STATUS,
]);

const getApproverLevels = (invoice) =>
  Math.max(
    1,
    Number(invoice.requiredApprovalLevels ?? invoice.requiredApprovalLevels ?? 1) || 1,
  );

const getApprovalRecords = (invoice) => {
  const records = invoice.approvalRecords ?? invoice.approvalRecords;
  return Array.isArray(records) ? records : [];
};

const getLatestRecordForApproverLevel = (records, level) => {
  const matches = records.filter((record) => {
    const recordLevel = String(record.level || '').trim();
    const approverLevel = Number(record.approver_level ?? record.approverLevel);
    return approverLevel === level || recordLevel === `Approver Level ${level}`;
  });

  return matches.sort(
    (left, right) => new Date(right.timestamp || 0) - new Date(left.timestamp || 0),
  )[0];
};

const countParallelApproverCompletions = (invoice, approverLevels) => {
  const records = getApprovalRecords(invoice);
  let completed = 0;

  for (let level = 1; level <= approverLevels; level += 1) {
    const latest = getLatestRecordForApproverLevel(records, level);
    if (latest?.action === 'Approved') {
      completed += 1;
    }
  }

  return completed;
};

export const getApprovalProgress = (invoice = {}) => {
  const status = normalizeWorkflowStatus(invoice.status);
  const approverLevels = getApproverLevels(invoice);
  const total = approverLevels;

  if (!APPROVAL_PIPELINE_STATUSES.has(status)) {
    return { approved: 0, total, percentage: 0 };
  }

  if (status === 'Pending Checker') {
    return {
      approved: 0,
      total,
      percentage: 0,
    };
  }

  let completed = 0;

  if (status === 'Pending Approver' || status === 'Pending Approval') {
    const isSequential = invoice.isSequentialApproval ?? invoice.isSequentialApproval ?? true;

    if (isSequential) {
      const currentLevel = Number(
        invoice.currentApprovalLevel ?? invoice.currentApprovalLevel ?? 1,
      );
      completed += Math.max(0, currentLevel - 1);
    } else {
      completed += countParallelApproverCompletions(invoice, approverLevels);
    }
  } else if (status === 'Pending Payment' || status === PAID_STATUS) {
    completed += approverLevels;
  }

  const approved = Math.min(completed, total);

  return {
    approved,
    total,
    percentage: total > 0 ? (approved / total) * 100 : 0,
  };
};

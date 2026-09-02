import React from 'react';
import { CheckCircle2, Eye, RotateCcw, Send, XCircle } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import AppDataTable from '../../../components/common/AppDataTable';
import { TableCell, TableRow } from '../../../components/ui/table';
import { cn } from '../../../lib/utils';
import { DEFAULT_CURRENCY, formatCurrency } from '../../../utils/currency';
import {
  PayrunStatusBadge,
  getPayrunApprovalRecords,
} from './payrunUtils';

const formatMoney = (value, currency = DEFAULT_CURRENCY) =>
  formatCurrency(Number(value || 0), currency);

const clippedTableText = (value, className = '') => {
  const text = String(value || '-');
  return (
    <span className={cn('block min-w-0 truncate text-left', className)} title={text}>
      {text}
    </span>
  );
};

const PayrunsTab = ({
  payruns,
  onView,
  onApprove,
  onReject,
  onRelease,
  onRetry,
  onCancel,
  canApprovePayrun,
  canReleasePayrun,
  canCancelPayrun,
  paginationFooter = null,
}) => (
  <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm">
    <AppDataTable
      tableHeader={[
        { key: 'batchId', title: 'Batch ID' },
        { key: 'createdBy', title: 'Created By' },
        { key: 'invoices', title: 'Invoices', headerClassName: 'text-left', cellClassName: 'text-left' },
        { key: 'totalAmount', title: 'Total Amount', headerClassName: 'text-left', cellClassName: 'text-left font-semibold' },
        { key: 'approvalRoute', title: 'Approval Route' },
        { key: 'approvalStatus', title: 'Approval Status' },
        { key: 'status', title: 'Status' },
        { key: 'actions', title: 'Actions' },
      ]}
      tableData={payruns}
      rowKey="id"
      tableClassName="min-w-[1360px] table-auto text-sm"
      tableContainerClassName="overflow-x-auto scrollbar-thin-muted"
      emptyMessage="No payruns yet. Select invoices from Pending Payments and request payment."
      renderRow={(payrun) => {
        const approvals = getPayrunApprovalRecords(payrun);
        const approvedCount = approvals.filter((approval) => approval.status === 'Approved').length;
        const actions = payrun.allowedActions || {};
        const canApproveAction = Boolean(actions.approve) && canApprovePayrun;
        const canRejectAction = Boolean(actions.reject) && canApprovePayrun;
        const canReleaseAction = Boolean(actions.release) && canReleasePayrun;
        const canRetryAction = Boolean(actions.retry) && canReleasePayrun;
        const canCancelAction = Boolean(actions.cancel) && canCancelPayrun;
        return (
          <TableRow key={payrun.id}>
            <TableCell className="max-w-[180px] overflow-hidden whitespace-nowrap px-3 py-3 text-left font-semibold text-primary">
              {clippedTableText(payrun.batchId)}
            </TableCell>
            <TableCell className="max-w-[180px] overflow-hidden whitespace-nowrap px-3 py-3 text-left">
              {clippedTableText(payrun.createdBy)}
            </TableCell>
            <TableCell className="max-w-[180px] overflow-hidden whitespace-nowrap px-3 py-3 text-left">
              {clippedTableText(payrun.invoices.length)}
            </TableCell>
            <TableCell className="max-w-[180px] overflow-hidden whitespace-nowrap px-3 py-3 text-left font-semibold">
              {clippedTableText(formatMoney(payrun.totalAmount, payrun.currency))}
            </TableCell>
            <TableCell className="max-w-[180px] overflow-hidden whitespace-nowrap px-3 py-3 text-left">
              {clippedTableText(payrun.approvalRoute || payrun.admin?.name || '-')}
            </TableCell>
            <TableCell className="max-w-[180px] overflow-hidden whitespace-nowrap px-3 py-3 text-left">
              {clippedTableText(
                `Approved ${approvedCount}/${approvals.length || 1}`,
                'font-medium text-foreground',
              )}
            </TableCell>
            <TableCell className="max-w-[180px] overflow-hidden whitespace-nowrap px-3 py-3 text-left"><PayrunStatusBadge status={payrun.status} /></TableCell>
            <TableCell className="w-[360px] min-w-[360px] whitespace-nowrap px-3 py-3 text-left">
              <div className="flex flex-nowrap gap-1">
                <Button variant="ghost" size="sm" onClick={() => onView(payrun)}>
                  <Eye className="mr-1 h-4 w-4" /> View
                </Button>
                {(canApproveAction || canRejectAction) && (
                  <>
                    {canApproveAction && (
                      <Button variant="outline" size="sm" onClick={() => onApprove(payrun)}>
                        <CheckCircle2 className="mr-1 h-4 w-4" /> Approve
                      </Button>
                    )}
                    {canRejectAction && (
                      <Button variant="outline" size="sm" onClick={() => onReject(payrun)}>
                        <XCircle className="mr-1 h-4 w-4" /> Reject
                      </Button>
                    )}
                  </>
                )}
                {canReleaseAction && (
                  <Button size="sm" onClick={() => onRelease(payrun)}>
                    <Send className="mr-1 h-4 w-4" /> Release
                  </Button>
                )}
                {canRetryAction && (
                  <Button variant="outline" size="sm" onClick={() => onRetry(payrun)}>
                    <RotateCcw className="mr-1 h-4 w-4" /> Retry
                  </Button>
                )}
                {canCancelAction && (
                  <Button variant="outline" size="sm" onClick={() => onCancel(payrun)}>
                    <XCircle className="mr-1 h-4 w-4" /> Cancel
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        );
      }}
    />
    {paginationFooter}
  </div>
);

export default PayrunsTab;

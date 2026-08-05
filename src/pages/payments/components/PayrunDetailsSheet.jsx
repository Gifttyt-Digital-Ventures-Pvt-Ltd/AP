import React from 'react';
import { Button } from '../../../components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '../../../components/ui/sheet';
import {
  PayrunAuditTimeline,
  PayrunStatusBadge,
  getPayrunApprovalRecords,
} from './payrunUtils';

const preventDialogOutsideDismiss = (event) => {
  event.preventDefault();
};

const safeFormatDate = (value, pattern = 'dd MMM yy') => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '-'
    : new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        year: pattern.includes('yyyy') ? 'numeric' : '2-digit',
      }).format(date);
};

const formatMoney = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const getInvoiceStatusLabel = (status = '') => {
  const value = String(status || 'ready').trim().toLowerCase();
  if (value === 'approved') return 'Approved';
  if (value === 'paid') return 'Paid';
  if (value === 'failed') return 'Failed';
  if (value === 'pending') return 'Pending';
  if (value === 'ready') return 'Ready';
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const getInvoiceStatusClass = (status = '') => {
  const value = String(status || 'ready').trim().toLowerCase();
  if (value === 'approved' || value === 'paid') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (value === 'failed') return 'bg-red-50 text-red-700 border-red-200';
  if (value === 'pending') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-slate-50 text-slate-700 border-slate-200';
};

const PayrunDetailsSheet = ({ payrun, open, onOpenChange, onRelease, canReleasePayrun }) => {
  if (!payrun) return null;
  const approvals = getPayrunApprovalRecords(payrun);
  const canShowReleaseAction = Boolean(payrun.allowedActions?.release) && canReleasePayrun;
  const detailRows = [
    ['Created By', payrun.createdBy],
    ['Created On', safeFormatDate(payrun.createdOn, 'dd MMM yyyy')],
    ['Approval Route', payrun.approvalRoute || '-'],
    ['Approval Owner', payrun.admin?.name || '-'],
    ['Approvers', payrun.approvers?.length ? payrun.approvers.map((item) => item.name).join(', ') : '-'],
    ['Comments', payrun.remarks || '-'],
  ];

  const renderDrawerSection = (title, children) => (
    <section className="mb-6">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.09em] text-slate-400">
        {title}
      </p>
      <div className="overflow-hidden rounded-[10px] border border-slate-200 bg-white">
        {children}
      </div>
    </section>
  );

  const renderDrawerRow = (label, value, { alignTop = false, mono = false } = {}) => (
    <div className={`flex justify-between gap-4 border-b border-slate-100 px-3.5 py-2.5 last:border-b-0 ${alignTop ? 'items-start' : 'items-center'}`}>
      <span className="shrink-0 text-[13px] text-slate-500">{label}</span>
      <span className={`min-w-0 text-right text-[13px] font-medium text-slate-900 ${mono ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="flex h-full w-full flex-col gap-0 p-0 sm:w-[560px] sm:max-w-[560px]"
        onInteractOutside={preventDialogOutsideDismiss}
      >
        <SheetHeader className="shrink-0 border-b border-slate-200 px-6 py-[22px] pr-14">
          <div className="flex flex-wrap items-center gap-2">
            <SheetTitle className="text-base font-semibold text-slate-900">Payrun Details</SheetTitle>
            <PayrunStatusBadge status={payrun.status} />
          </div>
          <p className="mt-1 text-[13px] text-slate-500">
            {payrun.batchId} · {payrun.invoices.length} invoice{payrun.invoices.length === 1 ? '' : 's'}
          </p>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 px-[18px] py-4">
            <div>
              <p className="mb-0.5 text-xs text-slate-500">Amount</p>
              <p className="m-0 text-[22px] font-extrabold text-slate-900">{formatMoney(payrun.totalAmount)}</p>
            </div>
          </div>

          <PayrunAuditTimeline payrun={payrun} approvals={approvals} />

          {renderDrawerSection(
            'Payrun Summary',
            detailRows.map(([label, value]) =>
              renderDrawerRow(label, value, { alignTop: label === 'Comments' || label === 'Approvers' }),
            ),
          )}

          {renderDrawerSection(
            'Invoices',
            <>
              {payrun.invoices.map((invoice) => (
                <div key={invoice.id} className="border-b border-slate-100 px-3.5 py-3 last:border-b-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="m-0 truncate text-[13px] font-semibold text-primary">{invoice.invoiceNumber}</p>
                      <p className="mt-0.5 truncate text-[13px] font-medium text-slate-900">{invoice.vendorName}</p>
                    </div>
                    <p className="shrink-0 text-right text-[13px] font-bold text-slate-900">
                      {formatMoney(invoice.requestedAmount)}
                    </p>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-500">
                    <span>GST Held: {invoice.holdGst ? formatMoney(invoice.gstAmount) : '-'}</span>
                    <span className="text-right">UTR: {invoice.utr || '-'}</span>
                    <span className="col-span-2 truncate">Bank: {invoice.bankDetails || '-'}</span>
                    <span className="col-span-2 inline-flex items-center gap-2">
                      <span>Status:</span>
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${getInvoiceStatusClass(invoice.status)}`}>
                        {getInvoiceStatusLabel(invoice.status)}
                      </span>
                    </span>
                  </div>
                </div>
              ))}
            </>,
          )}
        </div>

        <SheetFooter className="shrink-0 border-t border-slate-200 px-6 pb-6 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          {canShowReleaseAction && (
            <Button onClick={() => onRelease(payrun)}>Release Payment</Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default PayrunDetailsSheet;

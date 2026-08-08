import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { Checkbox } from '../../../components/ui/checkbox';
import AppDataTable from '../../../components/common/AppDataTable';
import { TableCell, TableRow } from '../../../components/ui/table';
import { cn } from '../../../lib/utils';

const preventDialogOutsideDismiss = (event) => {
  event.preventDefault();
};

const formatMoney = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const clippedTableText = (value, className = '') => {
  const text = String(value || '-');
  return (
    <span className={cn('block min-w-0 truncate text-left', className)} title={text}>
      {text}
    </span>
  );
};

const getInvoiceAmount = (invoice = {}) =>
  Number(
    invoice.netAmount ??
      invoice.net_amount ??
      invoice.netPayable ??
      invoice.net_payable ??
      invoice.amount ??
      invoice.totalAmount ??
      invoice.total_amount ??
      invoice.amountDue ??
      0,
  );

const getInvoiceGstAmount = (invoice = {}) =>
  Number(
    invoice.gstAmount ??
      invoice.gst_amount ??
      invoice.taxAmount ??
      invoice.tax_amount ??
      Math.round(getInvoiceAmount(invoice) * 0.18),
  );

const RequestPaymentDialog = ({
  open,
  onOpenChange,
  invoices,
  onCreate,
  submitting = false,
}) => {
  const [rows, setRows] = useState([]);
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    if (!open) return;
    setRemarks('');
    setRows(
      invoices.map((invoice) => {
        const amountDue = getInvoiceAmount(invoice);
        const gstAmount = getInvoiceGstAmount(invoice);
        return {
          id: invoice.id,
          vendorName: invoice.vendorName || '-',
          invoiceNumber: invoice.invoiceNumber || '-',
          gstValid: true,
          holdGst: false,
          gstAmount,
          amountDue,
          requestedAmount: amountDue,
          bankDetails: invoice.accountNumber || invoice.bankAccount || 'Beneficiary verified',
        };
      }),
    );
  }, [invoices, open]);

  const getPayableAmount = (row) =>
    Math.max(0, Number(row.amountDue || 0) - (row.holdGst ? Number(row.gstAmount || 0) : 0));

  const getPaymentAmount = (row) => Number(row.requestedAmount || 0);

  const totalRequested = rows.reduce((sum, row) => sum + Number(row.requestedAmount || 0), 0);

  const updateRow = (rowId, updater) => {
    setRows((prev) => prev.map((row) => (row.id === rowId ? updater(row) : row)));
  };

  const submit = () => {
    if (rows.length === 0) {
      toast.error('Add at least one invoice');
      return;
    }

    onCreate({
      currency: 'INR',
      remarks,
      items: rows.map((row) => ({
        invoiceId: row.id,
        invoiceNumber: row.invoiceNumber,
        requestedAmount: Number(row.requestedAmount || 0),
        holdGst: row.holdGst,
        gstAmount: row.holdGst ? Number(row.gstAmount || 0) : 0,
        paymentAmount: getPaymentAmount(row),
      })),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] max-w-6xl overflow-y-auto"
        onInteractOutside={preventDialogOutsideDismiss}
      >
        <DialogHeader>
          <DialogTitle>Review & Confirm Payment Request</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="overflow-hidden rounded-lg border">
            <AppDataTable
              tableHeader={[
                { key: 'vendorName', title: 'Vendor' },
                { key: 'invoiceNumber', title: 'Invoice' },
                { key: 'gstValidation', title: 'GST Validation' },
                { key: 'holdGst', title: 'Hold GST' },
                { key: 'gstAmount', title: 'GST Amount', headerClassName: 'text-left', cellClassName: 'text-left' },
                { key: 'amountDue', title: 'Net Payable', headerClassName: 'text-left', cellClassName: 'text-left font-medium' },
                { key: 'requestedAmount', title: 'Requested Amount', headerClassName: 'text-left', cellClassName: 'text-left' },
                { key: 'actions', title: '' },
              ]}
              tableData={rows}
              rowKey="id"
              tableClassName="min-w-[980px] table-fixed text-sm"
              tableContainerClassName="overflow-x-auto"
              emptyMessage="No invoices selected"
              renderRow={(row) => (
                <TableRow key={row.id}>
                  <TableCell className="max-w-[180px] overflow-hidden whitespace-nowrap px-3 py-3 text-left font-medium">
                    {clippedTableText(row.vendorName)}
                  </TableCell>
                  <TableCell className="max-w-[180px] overflow-hidden whitespace-nowrap px-3 py-3 text-left">
                    {clippedTableText(row.invoiceNumber)}
                  </TableCell>
                  <TableCell className="max-w-[180px] overflow-hidden whitespace-nowrap px-3 py-3 text-left">
                    <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2 py-1 text-xs font-medium text-green-800">
                      Pass
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[180px] overflow-hidden whitespace-nowrap px-3 py-3 text-left">
                    <Checkbox
                      checked={row.holdGst}
                      onCheckedChange={(checked) =>
                        updateRow(row.id, (current) => ({
                          ...current,
                          holdGst: Boolean(checked),
                          requestedAmount: getPayableAmount({
                            ...current,
                            holdGst: Boolean(checked),
                          }),
                        }))
                      }
                    />
                  </TableCell>
                  <TableCell className="max-w-[180px] overflow-hidden whitespace-nowrap px-3 py-3 text-left">
                    {clippedTableText(formatMoney(row.gstAmount))}
                  </TableCell>
                  <TableCell className="max-w-[180px] overflow-hidden whitespace-nowrap px-3 py-3 text-left font-medium">
                    {clippedTableText(formatMoney(row.amountDue))}
                  </TableCell>
                  <TableCell className="max-w-[180px] overflow-hidden whitespace-nowrap px-3 py-3 text-left">
                    <span className="font-medium text-slate-900">
                      {formatMoney(row.requestedAmount)}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[180px] overflow-hidden whitespace-nowrap px-3 py-3 text-left">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setRows((prev) => prev.filter((item) => item.id !== row.id))}
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              )}
            />
          </div>
          <div className="flex items-center justify-end rounded-lg bg-muted px-4 py-3">
            <span className="text-sm text-muted-foreground">Total Requested Amount:&nbsp;</span>
            <strong>{formatMoney(totalRequested)}</strong>
          </div>
          <div className="space-y-2">
            <Label>Remarks</Label>
            <Textarea
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              placeholder="Optional notes for approval"
            />
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
           This payment request will follow your organization's Payment Approval Workflow. If no approvers are configured, it will be routed to the Generic Admin for approval.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={rows.length === 0 || submitting}>
            {submitting ? 'Creating...' : 'Create Payrun'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RequestPaymentDialog;

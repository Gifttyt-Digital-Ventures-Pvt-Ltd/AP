import React, { useMemo, useState } from 'react';
import { Download, Loader2, Search } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Checkbox } from '../../../components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { formatCurrency } from '../../../utils/currency';
import { formatInvoiceAmount } from '../../invoices/utils/invoiceAmounts';

const safeLower = (value) => String(value ?? '').toLowerCase();

const PendingPaymentReportDialog = ({
  open,
  onOpenChange,
  invoices = [],
  selectedInvoiceIds = [],
  onToggleInvoice,
  onSelectAllInvoices,
  onDownload,
  downloading = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredInvoices = useMemo(() => {
    const query = safeLower(searchTerm).trim();
    if (!query) return invoices;

    return invoices.filter(
      (invoice) =>
        safeLower(invoice.invoiceNumber).includes(query) ||
        safeLower(invoice.vendorName).includes(query) ||
        safeLower(invoice.gstin ?? invoice.vendorGstin ?? invoice.vendor_gstin).includes(query),
    );
  }, [invoices, searchTerm]);

  const selectedInvoices = useMemo(
    () => invoices.filter((invoice) => selectedInvoiceIds.includes(invoice.id)),
    [invoices, selectedInvoiceIds],
  );

  const selectedTotal = selectedInvoices.reduce(
    (sum, invoice) => sum + Number(invoice.amount || invoice.total || 0),
    0,
  );
  const selectedCurrency = selectedInvoices[0]?.currency || 'INR';
  const allFilteredSelected =
    filteredInvoices.length > 0 &&
    filteredInvoices.every((invoice) => selectedInvoiceIds.includes(invoice.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-3xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>Download Bank Invoice Report</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Select pending invoices for the bank submission sheet
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedInvoiceIds.length} selected · {formatCurrency(selectedTotal, selectedCurrency)}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onSelectAllInvoices?.(filteredInvoices.map((invoice) => invoice.id))}
                disabled={filteredInvoices.length === 0 || downloading}
              >
                {allFilteredSelected ? 'Clear selection' : 'Select all'}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pending-payment-report-search">Invoices</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="pending-payment-report-search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search invoice, vendor, or GSTIN"
                className="pl-10"
              />
            </div>
          </div>

          <div className="max-h-[360px] overflow-y-auto rounded-lg border border-border">
            {filteredInvoices.length > 0 ? (
              <div className="divide-y divide-border">
                {filteredInvoices.map((invoice) => {
                  const checked = selectedInvoiceIds.includes(invoice.id);
                  const vendorGstin =
                    invoice.gstin || invoice.vendorGstin || invoice.vendor_gstin || '-';

                  return (
                    <div
                      role="button"
                      tabIndex={0}
                      key={invoice.id}
                      onClick={() => onToggleInvoice?.(invoice.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          onToggleInvoice?.(invoice.id);
                        }
                      }}
                      className={`grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 ${
                        checked ? 'bg-primary/5' : ''
                      }`}
                    >
                      <div onClick={(event) => event.stopPropagation()}>
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => onToggleInvoice?.(invoice.id)}
                          aria-label="Select invoice"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="truncate text-sm font-semibold text-foreground">
                            {invoice.invoiceNumber || '-'}
                          </span>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="truncate text-sm text-muted-foreground">
                            {invoice.vendorName || '-'}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          Vendor GSTIN: {vendorGstin}
                        </p>
                      </div>
                      <div className="text-right text-sm font-semibold text-foreground">
                        {formatInvoiceAmount(invoice, invoice.amount || invoice.total || 0)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                No pending invoices match this search.
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={downloading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onDownload}
            disabled={downloading || selectedInvoiceIds.length === 0}
          >
            {downloading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Download report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PendingPaymentReportDialog;

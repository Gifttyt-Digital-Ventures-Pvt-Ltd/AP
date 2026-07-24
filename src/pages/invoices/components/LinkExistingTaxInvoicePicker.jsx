import React, { useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { formatCurrency } from '../../../utils/currency';
import { format } from 'date-fns';
import { getInvoiceNetAmount } from '../utils/invoiceAmounts';

const LinkExistingTaxInvoicePicker = ({
  invoices = [],
  selectedId,
  onSelect,
  loading = false,
  disabled = false,
  currency = 'INR',
}) => {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return invoices;
    return invoices.filter((invoice) => {
      const haystack = [invoice.invoiceNumber, invoice.vendorName, invoice.refNo]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [invoices, query]);

  return (
    <div className="space-y-2">
      <Label>Select existing tax invoice</Label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search invoice number or vendor"
          className="pl-9"
          disabled={disabled}
          data-testid="link-existing-tax-invoice-search"
        />
      </div>

      <div className="max-h-56 overflow-y-auto rounded-lg border">
        {loading ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            Loading tax invoices...
          </p>
        ) : filtered.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            No unlinked tax invoices found for this vendor.
          </p>
        ) : (
          filtered.map((invoice) => {
            const isSelected = String(selectedId) === String(invoice.id);
            const amount = getInvoiceNetAmount(invoice);
            const invoiceDate = invoice.invoiceDate ?? invoice.invoice_date;

            return (
              <button
                key={invoice.id}
                type="button"
                disabled={disabled}
                onClick={() => onSelect?.(invoice)}
                className={`flex w-full items-start gap-3 border-b px-4 py-3 text-left last:border-0 hover:bg-muted/50 ${
                  isSelected ? 'bg-primary/5' : ''
                }`}
                data-testid={`link-existing-tax-invoice-option-${invoice?.id ?? 'unknown'}`}
              >
                <div className="mt-0.5">
                  {isSelected ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <span className="inline-block h-4 w-4 rounded-full border" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{invoice.invoiceNumber || 'Tax invoice'}</p>
                  <p className="text-sm text-muted-foreground">{invoice.vendorName || '-'}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="rounded bg-muted px-2 py-0.5">
                      {formatCurrency(amount, invoice.currency ?? currency)}
                    </span>
                    {invoiceDate && (
                      <span className="rounded bg-muted px-2 py-0.5">
                        {format(new Date(invoiceDate), 'dd MMM yyyy')}
                      </span>
                    )}
                    {invoice.status && (
                      <span className="rounded bg-muted px-2 py-0.5">{invoice.status}</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default LinkExistingTaxInvoicePicker;

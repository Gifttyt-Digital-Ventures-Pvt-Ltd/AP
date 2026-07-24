import React, { useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { formatCurrency } from '../../../utils/currency';
import {
  PI_MATCH_LABELS,
} from '../constants/proformaInvoice';

const ProformaInvoicePicker = ({
  suggestions = [],
  selectedId,
  onSelect,
  loading = false,
  disabled = false,
}) => {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return suggestions;
    return suggestions.filter((pi) => {
      const haystack = [
        pi.invoiceNumber,
        pi.vendorName,
        pi.poNumber,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [query, suggestions]);

  return (
    <div className="space-y-2">
      <Label>Map to Proforma Invoice</Label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search or select PI"
          className="pl-9"
          disabled={disabled}
          data-testid="proforma-invoice-picker-search"
        />
      </div>

      <div className="max-h-56 overflow-y-auto rounded-lg border">
        {loading ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">Loading suggestions...</p>
        ) : filtered.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            No eligible proforma invoices found for this vendor.
          </p>
        ) : (
          filtered.map((pi) => {
            const isSelected = String(selectedId) === String(pi.id);
            return (
              <button
                key={pi.id}
                type="button"
                disabled={disabled}
                onClick={() => onSelect?.(pi)}
                className={`flex w-full items-start gap-3 border-b px-4 py-3 text-left last:border-0 hover:bg-muted/50 ${
                  isSelected ? 'bg-primary/5' : ''
                }`}
                data-testid={`proforma-invoice-option-${pi?.id ?? 'unknown'}`}
              >
                <div className="mt-0.5">
                  {isSelected ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <span className="inline-block h-4 w-4 rounded-full border" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{pi.invoiceNumber || 'PI'}</p>
                  <p className="text-sm text-muted-foreground">{pi.vendorName || '-'}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="rounded bg-muted px-2 py-0.5">
                      Remaining: {formatCurrency(pi.piRemainingBalance ?? 0, pi.currency)}
                    </span>
                    {pi.lineItemMatchPercent > 0 && (
                      <span className="rounded bg-muted px-2 py-0.5">
                        Line items: {pi.lineItemMatchPercent}%
                      </span>
                    )}
                    {pi.poMatch && (
                      <span className="rounded bg-emerald-50 px-2 py-0.5 text-emerald-700">
                        PO match
                      </span>
                    )}
                    {/* <span className="rounded bg-primary/10 px-2 py-0.5 text-primary">
                      {PI_MATCH_LABELS[pi.matchLabel] || 'Match'}
                    </span> */}
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

export default ProformaInvoicePicker;

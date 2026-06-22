import React, { useMemo, useState } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { Badge } from '../../../../components/ui/badge';
import { TableCell, TableRow } from '../../../../components/ui/table';
import { cn } from '../../../../lib/utils';
import { formatCurrency } from '../../utils/taxFormatting';

export const GST_ENTRIES_TABLE_HEADER = [
  { key: 'invoice_number', title: 'Invoice', cellClassName: 'font-medium' },
  { key: 'vendor_name', title: 'Vendor' },
  { key: 'vendor_gstin', title: 'GSTIN', cellClassName: 'font-mono text-xs' },
  { key: 'place_of_supply', title: 'Place of Supply' },
  { key: 'taxable_amount', title: 'Taxable Amt' },
  { key: 'cgst_amount', title: 'CGST' },
  { key: 'sgst_amount', title: 'SGST' },
  { key: 'igst_amount', title: 'IGST' },
  { key: 'total_gst', title: 'Total GST', cellClassName: 'font-medium' },
  { key: 'itc_eligible', title: 'ITC' },
  { key: 'gstr2a_matched', title: 'GSTR-2A' },
];

export const renderGstEntryRow = (entry, rowIndex, headers) => (
  <TableRow
    key={entry.id ?? rowIndex}
    className={cn(rowIndex % 2 === 1 && 'bg-muted/20')}
    data-testid={`gst-entry-row-${entry.id}`}
  >
    {headers.map((header) => {
      let value;

      switch (header.key) {
        case 'invoice_number':
          value = entry.invoice_number || '-';
          break;
        case 'vendor_name':
          value = entry.vendor_name || '-';
          break;
        case 'vendor_gstin':
          value = entry.vendor_gstin || '-';
          break;
        case 'place_of_supply':
          value = entry.place_of_supply || '-';
          break;
        case 'taxable_amount':
          value = formatCurrency(entry.taxable_amount);
          break;
        case 'cgst_amount':
          value = formatCurrency(entry.cgst_amount);
          break;
        case 'sgst_amount':
          value = formatCurrency(entry.sgst_amount);
          break;
        case 'igst_amount':
          value = formatCurrency(entry.igst_amount);
          break;
        case 'total_gst':
          value = formatCurrency(entry.total_gst);
          break;
        case 'itc_eligible':
          value = entry.itc_eligible ? (
            <Badge variant="outline" className="text-green-600 border-green-600">
              Eligible
            </Badge>
          ) : (
            <Badge variant="outline" className="text-red-600 border-red-600">
              Not Eligible
            </Badge>
          );
          break;
        case 'gstr2a_matched':
          value = entry.gstr2a_matched ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          );
          break;
        default:
          value = entry?.[header.key] ?? '-';
      }

      return (
        <TableCell key={header.key} className={cn('px-3 py-3', header.cellClassName)}>
          {value}
        </TableCell>
      );
    })}
  </TableRow>
);

export const useFilteredGstEntries = (entries, search) =>
  useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return entries;
    return entries.filter((entry) =>
      [entry.invoice_number, entry.vendor_name, entry.vendor_gstin, entry.place_of_supply]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [entries, search]);

export const DEFAULT_GST_FORM = {
  invoice_id: '',
  vendor_gstin: '',
  place_of_supply: '',
  taxable_amount: 0,
  gst_rate: 18,
  is_reverse_charge: false,
};

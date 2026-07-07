import React from 'react';
import { Eye } from 'lucide-react';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { TableCell, TableRow } from '../../../../components/ui/table';
import { cn } from '../../../../lib/utils';
import { formatCurrency } from '../../utils/taxFormatting';

export const TDS_SECTIONS_TABLE_HEADER = [
  { key: 'section_code', title: 'Section', cellClassName: 'font-medium' },
  { key: 'description', title: 'Description' },
  { key: 'rate_individual', title: 'Individual Rate' },
  { key: 'rate_company', title: 'Company Rate' },
  { key: 'threshold_single', title: 'Single Threshold' },
  { key: 'threshold_annual', title: 'Annual Threshold' },
];

export const TDS_ENTRIES_TABLE_HEADER = [
  { key: 'section_code', title: 'Section', cellClassName: 'font-medium' },
  { key: 'invoice_number', title: 'Invoice No' },
  { key: 'vendor_name', title: 'Vendor' },
  { key: 'base_amount', title: 'Base Amount' },
  { key: 'tds_rate', title: 'TDS Rate' },
  { key: 'tds_amount', title: 'TDS Amount' },
  { key: 'total_tds', title: 'Total TDS', cellClassName: 'font-medium' },
  { key: 'actions', title: 'Actions' },
  // { key: 'status', title: 'Status' },
  // { key: 'challan_number', title: 'Challan', cellClassName: 'font-mono text-xs' },
  // { key: 'quarter', title: 'Quarter' },
];

const getTdsEntryInvoice = (entry = {}) =>
  entry.invoice_details ?? entry.invoiceDetails ?? {};

const getTdsEntryCurrency = (entry = {}) =>
  getTdsEntryInvoice(entry)?.currency || entry.currency || 'INR';

const formatTdsEntryCurrency = (entry, amount) => {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: getTdsEntryCurrency(entry),
      minimumFractionDigits: 2,
    }).format(Number(amount) || 0);
  } catch {
    return formatCurrency(amount);
  }
};

const getTdsEntryKey = (entry = {}, rowIndex) => {
  const invoice = getTdsEntryInvoice(entry);
  return (
    entry.id ??
    entry.entry_id ??
    invoice.id ??
    `${entry.section?.id ?? entry.section_code ?? 'tds'}-${invoice.invoice_number ?? rowIndex}`
  );
};

const getTdsSectionLabel = (entry = {}) => {
  const section = entry.section ?? {};
  const code =
    section.section_code ??
    section.sectionCode ??
    entry.section_code ??
    entry.sectionCode ??
    '';
  const name = section.name ?? entry.section_name ?? entry.sectionName ?? '';
  if (code && name) return `${code} - ${name}`;
  return code || name || '-';
};

const getTdsEntryInvoiceNumber = (entry = {}) => {
  const invoice = getTdsEntryInvoice(entry);
  return (
    invoice.invoice_number ??
    invoice.invoiceNumber ??
    entry.invoice_number ??
    entry.invoiceNumber ??
    '-'
  );
};

const getTdsEntryVendor = (entry = {}) => {
  const invoice = getTdsEntryInvoice(entry);
  return (
    entry.vendor ??
    entry.vendor_name ??
    entry.vendorName ??
    invoice.vendor_name ??
    invoice.vendorName ??
    '-'
  );
};

export const renderTdsSectionRow = (section, rowIndex, headers) => (
  <TableRow
    key={section.id ?? rowIndex}
    className={cn(rowIndex % 2 === 1 && 'bg-muted/20')}
    data-testid={`tds-section-row-${section?.id ?? 'unknown'}`}
  >
    {headers.map((header) => {
      let value;

      switch (header.key) {
        case 'rate_individual':
          value = `${section.rate_individual}%`;
          break;
        case 'rate_company':
          value = `${section.rate_company}%`;
          break;
        case 'threshold_single':
          value = formatCurrency(section.threshold_single);
          break;
        case 'threshold_annual':
          value = formatCurrency(section.threshold_annual);
          break;
        default:
          value = section?.[header.key] ?? '-';
      }

      return (
        <TableCell
          key={header.key}
          className={cn('px-3 py-3', header.cellClassName)}
        >
          {value}
        </TableCell>
      );
    })}
  </TableRow>
);

export const renderTdsEntryRow = (entry, rowIndex, headers, options = {}) => (
  <TableRow
    key={getTdsEntryKey(entry, rowIndex)}
    className={cn(rowIndex % 2 === 1 && 'bg-muted/20')}
    data-testid={`tds-entry-row-${getTdsEntryKey(entry, rowIndex)}`}
  >
    {headers.map((header) => {
      let value;

      switch (header.key) {
        case 'section_code':
          value = getTdsSectionLabel(entry);
          break;
        case 'invoice_number':
          value = getTdsEntryInvoiceNumber(entry);
          break;
        case 'vendor_name':
          value = getTdsEntryVendor(entry);
          break;
        case 'base_amount':
          value = formatTdsEntryCurrency(entry, entry.base_amount ?? entry.baseAmount);
          break;
        case 'tds_rate':
          value = `${Number(entry.tds_rate ?? entry.tdsRate ?? 0)}%`;
          break;
        case 'tds_amount':
          value = formatTdsEntryCurrency(entry, entry.tds_amount ?? entry.tdsAmount);
          break;
        case 'total_tds':
          value = formatTdsEntryCurrency(entry, entry.total_tds ?? entry.totalTds);
          break;
        case 'actions': {
          const invoice = getTdsEntryInvoice(entry);
          value = (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => options.onViewInvoice?.(invoice, entry)}
              disabled={!invoice?.id}
              data-testid={`view-tds-invoice-${invoice?.id ?? getTdsEntryKey(entry, rowIndex)}`}
              title={invoice?.id ? 'View Invoice' : 'Invoice details unavailable'}
              className="h-8 w-8 p-0"
            >
              <Eye className="h-4 w-4" />
            </Button>
          );
          break;
        }
        case 'status':
          value = (
            <Badge
              variant={entry.status === 'Deposited' ? 'default' : 'secondary'}
              className={entry.status === 'Deposited' ? 'bg-green-500' : ''}
            >
              {entry.status}
            </Badge>
          );
          break;
        case 'challan_number':
          value = entry.challan_number || '-';
          break;
        default:
          value = entry?.[header.key] ?? '-';
      }

      return (
        <TableCell
          key={header.key}
          className={cn('px-3 py-3', header.cellClassName)}
        >
          {value}
        </TableCell>
      );
    })}
  </TableRow>
);

export const DEFAULT_TDS_FORM = {
  invoice_id: '',
  section_code: '194C',
  base_amount: 0,
  is_company: false,
};

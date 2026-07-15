import React from 'react';
import { Eye } from 'lucide-react';
import { Badge } from '../../../../components/ui/badge';
import { Button } from '../../../../components/ui/button';
import { TableCell, TableRow } from '../../../../components/ui/table';
import { cn } from '../../../../lib/utils';
import { formatCurrency, formatDate } from '../../utils/taxFormatting';

export const TDS_SECTIONS_TABLE_HEADER = [
  { key: 'section_code', title: 'Section', cellClassName: 'font-medium' },
  { key: 'description', title: 'Description' },
  { key: 'rate_individual', title: 'Individual Rate' },
  { key: 'rate_company', title: 'Company Rate' },
  { key: 'threshold_single', title: 'Single Threshold' },
  { key: 'threshold_annual', title: 'Annual Threshold' },
];

export const TDS_ENTRIES_TABLE_HEADER = [
  { key: 'sr_no', title: 'Sr. No.', cellClassName: 'w-20 text-muted-foreground' },
  { key: 'vendor_name', title: 'Vendor', cellClassName: 'min-w-44 max-w-56' },
  { key: 'invoice_number', title: 'Invoice No.', cellClassName: 'font-medium' },
  { key: 'invoice_date', title: 'Invoice Date' },
  { key: 'pan', title: 'PAN' },
  { key: 'voucher_type', title: 'Voucher Type' },
  { key: 'narration', title: 'Narration', cellClassName: 'min-w-56 max-w-72' },
  { key: 'expense_type', title: 'Expense Type' },
  { key: 'taxable_amount', title: 'Taxable Amount', cellClassName: 'text-right' },
  { key: 'tds_section', title: 'TDS Section' },
  { key: 'tds_rate', title: 'TDS Rate (%)', cellClassName: 'text-right' },
  { key: 'tds_amount', title: 'TDS Amount', cellClassName: 'text-right font-medium' },
  { key: 'actions', title: 'Action', cellClassName: 'text-right' },
];

export const getTdsEntryInvoice = (entry = {}) =>
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

const getNestedValue = (source = {}, keys = []) => {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
};

export const getTdsEntryFieldValue = (entry = {}, field, rowIndex = 0, options = {}) => {
  const invoice = getTdsEntryInvoice(entry);
  const section = entry.section ?? {};

  switch (field) {
    case 'sr_no':
      return (Number(options.offset) || 0) + rowIndex + 1;
    case 'vendor_name':
      return getTdsEntryVendor(entry);
    case 'invoice_number':
      return getTdsEntryInvoiceNumber(entry);
    case 'invoice_date':
      return getNestedValue(entry, ['invoiceDate', 'invoice_date']) ??
        getNestedValue(invoice, ['invoiceDate', 'invoice_date']);
    case 'pan':
      return getNestedValue(entry, ['pan', 'panNo', 'pan_no', 'vendorPan', 'vendor_pan']) ??
        getNestedValue(invoice, ['pan', 'panNo', 'pan_no', 'vendorPan', 'vendor_pan']);
    case 'voucher_type':
      return getNestedValue(entry, ['voucherType', 'voucher_type']);
    case 'narration':
      return getNestedValue(entry, ['narration', 'description', 'remarks', 'memo']);
    case 'expense_type':
      return getNestedValue(entry, ['expenseType', 'expense_type', 'category', 'expenseCategory']);
    case 'taxable_amount':
      return getNestedValue(entry, ['taxableAmount', 'taxable_amount', 'baseAmount', 'base_amount']);
    case 'tds_section':
      return getNestedValue(entry, ['tdsSection', 'tds_section', 'sectionCode', 'section_code']) ??
        getNestedValue(section, ['sectionCode', 'section_code']) ??
        getTdsSectionLabel(entry);
    case 'tds_rate':
      return getNestedValue(entry, ['tdsRate', 'tds_rate']);
    case 'tds_amount':
      return getNestedValue(entry, ['tdsAmount', 'tds_amount', 'totalTds', 'total_tds']);
    default:
      return entry?.[field];
  }
};

const TruncatedCell = ({ value, className = '' }) => {
  const displayValue = value === undefined || value === null || value === '' ? '-' : String(value);
  return (
    <span className={cn('block truncate', className)} title={displayValue}>
      {displayValue}
    </span>
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
        case 'sr_no':
          value = getTdsEntryFieldValue(entry, 'sr_no', rowIndex, options);
          break;
        case 'vendor_name':
          value = <TruncatedCell value={getTdsEntryFieldValue(entry, header.key)} />;
          break;
        case 'invoice_number':
        case 'pan':
        case 'voucher_type':
        case 'expense_type':
        case 'tds_section':
          value = getTdsEntryFieldValue(entry, header.key) ?? '-';
          break;
        case 'invoice_date':
          value = formatDate(getTdsEntryFieldValue(entry, header.key));
          break;
        case 'narration':
          value = <TruncatedCell value={getTdsEntryFieldValue(entry, header.key)} />;
          break;
        case 'taxable_amount':
          value = formatTdsEntryCurrency(entry, getTdsEntryFieldValue(entry, header.key));
          break;
        case 'tds_rate': {
          const rate = getTdsEntryFieldValue(entry, header.key);
          value = rate === undefined || rate === null || rate === '' ? '-' : `${Number(rate)}%`;
          break;
        }
        case 'tds_amount':
          value = formatTdsEntryCurrency(entry, getTdsEntryFieldValue(entry, header.key));
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
              title={invoice?.id ? 'View invoice details' : 'Invoice details unavailable'}
              className="ml-auto h-8 w-8 p-0"
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

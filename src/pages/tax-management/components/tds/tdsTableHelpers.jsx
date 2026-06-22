import React from 'react';
import { Badge } from '../../../../components/ui/badge';
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
  { key: 'vendor_name', title: 'Vendor' },
  { key: 'base_amount', title: 'Base Amount' },
  { key: 'tds_rate', title: 'TDS Rate' },
  { key: 'tds_amount', title: 'TDS Amount' },
  { key: 'total_tds', title: 'Total TDS', cellClassName: 'font-medium' },
  { key: 'status', title: 'Status' },
  { key: 'challan_number', title: 'Challan', cellClassName: 'font-mono text-xs' },
  { key: 'quarter', title: 'Quarter' },
];

export const renderTdsSectionRow = (section, rowIndex, headers) => (
  <TableRow
    key={section.id ?? rowIndex}
    className={cn(rowIndex % 2 === 1 && 'bg-muted/20')}
    data-testid={`tds-section-row-${section.id}`}
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
        <TableCell key={header.key} className={cn('px-3 py-3', header.cellClassName)}>
          {value}
        </TableCell>
      );
    })}
  </TableRow>
);

export const renderTdsEntryRow = (entry, rowIndex, headers) => (
  <TableRow
    key={entry.id ?? rowIndex}
    className={cn(rowIndex % 2 === 1 && 'bg-muted/20')}
    data-testid={`tds-entry-row-${entry.id}`}
  >
    {headers.map((header) => {
      let value;

      switch (header.key) {
        case 'vendor_name':
          value = entry.vendor_name || '-';
          break;
        case 'base_amount':
          value = formatCurrency(entry.base_amount);
          break;
        case 'tds_rate':
          value = `${entry.tds_rate}%`;
          break;
        case 'tds_amount':
          value = formatCurrency(entry.tds_amount);
          break;
        case 'total_tds':
          value = formatCurrency(entry.total_tds);
          break;
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
        <TableCell key={header.key} className={cn('px-3 py-3', header.cellClassName)}>
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

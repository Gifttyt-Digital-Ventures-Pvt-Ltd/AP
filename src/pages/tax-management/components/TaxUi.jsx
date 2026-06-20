import React from 'react';
import { Building2, ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Progress } from '../../../components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../../components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import { cn } from '../../../lib/utils';

export const TaxKpiCard = ({ label, value, sub, icon: Icon, tone = 'default' }) => {
  const toneClass = {
    default: 'text-primary bg-primary/10',
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    amber: 'text-amber-600 bg-amber-50',
    red: 'text-red-600 bg-red-50',
    slate: 'text-slate-600 bg-slate-100',
  }[tone] || 'text-primary bg-primary/10';

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
            {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
          </div>
          {Icon ? (
            <div className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-md', toneClass)}>
              <Icon className="h-4 w-4" />
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
};

export const TaxSectionCard = ({ icon: Icon, title, description, meta, children, actions, className }) => (
  <Card className={className}>
    <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 border-b py-4">
      <div className="flex items-start gap-3">
        {Icon ? (
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          {description ? <CardDescription className="mt-1">{description}</CardDescription> : null}
          {meta ? <div className="mt-2">{meta}</div> : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap justify-end gap-2">{actions}</div> : null}
    </CardHeader>
    <CardContent className="p-4">{children}</CardContent>
  </Card>
);

export const TaxStatusBadge = ({ status }) => {
  const normalized = String(status || '').toLowerCase();
  const className =
    normalized.includes('matched') || normalized.includes('filed') || normalized.includes('eligible') || normalized.includes('available') || normalized.includes('completed')
      ? 'border-green-200 bg-green-50 text-green-700'
      : normalized.includes('pending') || normalized.includes('partial') || normalized.includes('review') || normalized.includes('amended') || normalized.includes('low')
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : normalized.includes('missing') || normalized.includes('mismatch') || normalized.includes('cancel') || normalized.includes('blocked') || normalized.includes('overdue')
          ? 'border-red-200 bg-red-50 text-red-700'
          : 'border-slate-200 bg-slate-50 text-slate-700';

  return (
    <Badge variant="outline" className={cn('whitespace-nowrap font-medium', className)}>
      {status || '-'}
    </Badge>
  );
};

export const TaxFilterBar = ({ children, className }) => (
  <div className={cn('grid gap-3 rounded-md border bg-muted/20 p-3 md:grid-cols-4', className)}>
    {children}
  </div>
);

export const TaxSearchInput = ({ value, onChange, placeholder = 'Search...' }) => (
  <Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
);

export const TaxSelect = ({ value, onValueChange, options, placeholder = 'Select' }) => (
  <Select value={value} onValueChange={onValueChange}>
    <SelectTrigger>
      <SelectValue placeholder={placeholder} />
    </SelectTrigger>
    <SelectContent>
      {options.map((option) => {
        const valueText = typeof option === 'string' ? option : option.value;
        const label = typeof option === 'string' ? option : option.label;
        return (
          <SelectItem key={valueText} value={valueText}>
            {label}
          </SelectItem>
        );
      })}
    </SelectContent>
  </Select>
);

export const TaxCompactTable = ({ columns, rows, getRowKey, onRowClick, getRowClassName, emptyMessage = 'No records found.' }) => (
  <div className="overflow-hidden rounded-md border">
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            {columns.map((column) => (
              <TableHead key={column.key} className={cn('whitespace-nowrap text-xs', column.className)}>
                {column.title}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="py-8 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, index) => (
              <TableRow
                key={getRowKey ? getRowKey(row, index) : row.id ?? index}
                className={cn(onRowClick && 'cursor-pointer hover:bg-muted/50', getRowClassName?.(row, index))}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((column) => (
                  <TableCell key={column.key} className={cn('whitespace-nowrap text-sm', column.cellClassName)}>
                    {column.render ? column.render(row, index) : row[column.key] ?? '-'}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  </div>
);

export const TaxDrawer = ({ open, onOpenChange, title, children }) => (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
      <SheetHeader className="mb-4 pr-8">
        <SheetTitle>{title}</SheetTitle>
      </SheetHeader>
      {children}
    </SheetContent>
  </Sheet>
);

export const TaxDetailGrid = ({ items }) => (
  <div className="grid gap-3 sm:grid-cols-2">
    {items.map((item) => (
      <div key={item.label} className="rounded-md border bg-muted/20 p-3">
        <p className="text-xs text-muted-foreground">{item.label}</p>
        <div className={cn('mt-1 text-sm font-medium', item.mono && 'font-mono text-xs')}>
          {item.value || '-'}
        </div>
      </div>
    ))}
  </div>
);

export const TaxProgressRow = ({ label, value, sub, className, progressClassName, trailing }) => (
  <div className={cn('space-y-2', className)}>
    {label ? (
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{trailing ?? `${value}%`}</span>
      </div>
    ) : null}
    <Progress value={value} className={progressClassName} />
    {sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
  </div>
);

export const TaxPeriodSelect = ({ value, onValueChange, periods, className }) => (
  <Select value={value} onValueChange={onValueChange}>
    <SelectTrigger className={cn('w-full md:w-[180px]', className)}>
      <SelectValue placeholder="Select period" />
    </SelectTrigger>
    <SelectContent>
      {periods.map((period) => (
        <SelectItem key={period.value} value={period.value}>
          {period.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

export const TaxReferenceNotice = ({ children, className }) => (
  <div className={cn('rounded-md border border-dashed border-amber-200 bg-amber-50/60 px-3 py-2 text-xs text-amber-900', className)}>
    {children || 'Reference data preview — live API integration pending.'}
  </div>
);

export const TaxApiMeta = ({ synced, status = 'live', count }) => {
  const statusTone = {
    live: 'text-green-600',
    error: 'text-red-600',
    syncing: 'text-amber-600',
  }[status] || 'text-muted-foreground';

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span>
        Synced: <span className="font-medium text-foreground">{synced}</span>
      </span>
      <span className={cn('inline-flex items-center gap-1.5 font-medium', statusTone)}>
        <span className={cn('h-1.5 w-1.5 rounded-full', status === 'live' ? 'bg-green-500' : status === 'error' ? 'bg-red-500' : 'bg-amber-500')} />
        {status === 'live' ? 'Live' : status === 'error' ? 'Error' : 'Syncing'}
      </span>
      {count != null && (
        <span>
          Records: <span className="font-medium text-foreground">{count}</span>
        </span>
      )}
    </div>
  );
};

export const TaxPagination = ({ page = 1, totalPages = 3 }) => (
  <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
    <span>
      Page {page} of {totalPages}
    </span>
    <div className="flex gap-2">
      <Button type="button" variant="outline" size="sm" disabled={page <= 1}>
        Previous
      </Button>
      <Button type="button" variant="outline" size="sm" disabled={page >= totalPages}>
        Next
      </Button>
    </div>
  </div>
);

const activityToneClass = {
  success: 'bg-green-500',
  info: 'bg-blue-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
};

export const TaxActivityTimeline = ({ items = [] }) => (
  <div className="divide-y">
    {items.map((item) => (
      <div key={item.id} className="flex gap-3 px-1 py-3">
        <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', activityToneClass[item.type] || 'bg-muted-foreground')} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{item.action || item.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{item.detail}</p>
          <p className="mt-1 text-[11px] text-muted-foreground/80">{item.time}</p>
        </div>
      </div>
    ))}
  </div>
);

export const TaxAlertBanner = ({ children, tone = 'amber' }) => {
  const toneClass = {
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    red: 'border-red-200 bg-red-50 text-red-900',
    blue: 'border-blue-200 bg-blue-50 text-blue-900',
  }[tone];

  return (
    <div className={cn('flex items-start gap-2 rounded-md border px-3 py-2 text-xs', toneClass)}>
      {children}
    </div>
  );
};

export const TaxValidBadge = ({ valid }) => {
  const normalized = String(valid || '').toUpperCase();
  if (normalized === 'Y') {
    return <Badge variant="outline" className="border-green-200 bg-green-50 font-medium text-green-700">Valid</Badge>;
  }
  if (normalized === 'N') {
    return <Badge variant="outline" className="border-red-200 bg-red-50 font-medium text-red-700">Invalid</Badge>;
  }
  return <Badge variant="outline" className="font-medium text-muted-foreground">{valid || '—'}</Badge>;
};

export const TaxComplianceIndicator = ({ rating }) => {
  const configs = {
    regular: { label: 'Regular Filer', className: 'border-green-200 bg-green-50 text-green-700' },
    irregular: { label: 'Irregular Filer', className: 'border-amber-200 bg-amber-50 text-amber-700' },
    none: { label: 'Not Assessed', className: 'border-slate-200 bg-slate-50 text-slate-600' },
  };
  const config = configs[rating] || configs.none;

  return (
    <Badge variant="outline" className={cn('font-medium', config.className)}>
      {config.label}
    </Badge>
  );
};

export const TaxEmptyState = ({ icon: Icon, title, description, children }) => (
  <Card className="py-16 text-center">
    <CardContent className="space-y-3">
      {Icon ? (
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-6 w-6" />
        </div>
      ) : null}
      <p className="text-base font-semibold">{title}</p>
      {description ? <p className="mx-auto max-w-md text-sm text-muted-foreground">{description}</p> : null}
      {children}
    </CardContent>
  </Card>
);

export const TaxViewFilterPills = ({ options, value, onChange, className }) => (
  <div className={cn('inline-flex flex-wrap gap-0.5 rounded-lg bg-muted p-1', className)}>
    {options.map((option) => {
      const label = typeof option === 'string' ? option : option.label;
      const key = typeof option === 'string' ? option : option.value;
      const count = typeof option === 'object' ? option.count : undefined;
      const active = value === key;

      return (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            active ? 'border bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {label}
          {count != null ? ` (${count})` : ''}
        </button>
      );
    })}
  </div>
);

export const TaxGstAvailBadge = ({ status }) => {
  const className = {
    'GST Data Available': 'border-green-200 bg-green-50 text-green-700',
    'Partial Records': 'border-amber-200 bg-amber-50 text-amber-700',
    'No Records Found': 'border-slate-200 bg-slate-50 text-slate-600',
  }[status] || 'border-slate-200 bg-slate-50 text-slate-600';

  return (
    <Badge variant="outline" className={cn('gap-1.5 font-medium', className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {status}
    </Badge>
  );
};

export const TaxMiniMetric = ({ label, value, tone = 'default', className }) => {
  const valueClass = {
    default: 'text-foreground',
    green: 'text-green-600',
    amber: 'text-amber-600',
    red: 'text-red-600',
    primary: 'text-primary',
  }[tone] || 'text-foreground';

  return (
    <div className={cn('rounded-lg border bg-muted/30 p-3', className)}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn('mt-1 text-xl font-bold', valueClass)}>{value}</p>
    </div>
  );
};

export const TaxFilterChip = ({ label, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'rounded-full border px-3 py-1 text-xs font-medium transition',
      active ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground hover:border-primary/30',
    )}
  >
    {label}
  </button>
);

export const TaxVendorSelector = ({
  vendors = [],
  mode,
  onModeChange,
  selectedIds = [],
  onSelectedIdsChange,
}) => {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  const filtered = vendors.filter((vendor) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    const name = (vendor.name || vendor.vendor || '').toLowerCase();
    const gstin = (vendor.gstin || '').toLowerCase();
    return name.includes(query) || gstin.includes(query);
  });

  const toggleVendor = (id) => {
    if (mode === 'single') {
      onSelectedIdsChange([id]);
      setOpen(false);
      return;
    }
    onSelectedIdsChange(
      selectedIds.includes(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id],
    );
  };

  const pillLabel = () => {
    if (mode === 'all') return `All Vendors (${vendors.length} GSTINs)`;
    if (selectedIds.length === 0) return 'Select vendor…';
    if (selectedIds.length === 1) {
      const vendor = vendors.find((item) => item.id === selectedIds[0]);
      return vendor?.name || vendor?.vendor || '1 Vendor';
    }
    return `${selectedIds.length} Vendors Selected`;
  };

  const modeOptions = [
    { value: 'all', label: 'All Vendors' },
    { value: 'single', label: 'Single Vendor' },
    { value: 'multiple', label: 'Multiple Vendors' },
  ];

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-foreground">Vendor Selection</p>
        <div className="inline-flex overflow-hidden rounded-lg border bg-background">
          {modeOptions.map((option, index) => {
            const active = mode === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onModeChange(option.value);
                  onSelectedIdsChange([]);
                  setOpen(false);
                }}
                className={cn(
                  'px-3.5 py-2 text-xs font-medium transition',
                  index < modeOptions.length - 1 && 'border-r',
                  active ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted/50',
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
      {mode !== 'all' ? (
        <div className="relative min-w-[240px]">
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="flex w-full items-center justify-between gap-2 rounded-lg border bg-background px-3.5 py-2 text-sm"
          >
            <span className="flex min-w-0 items-center gap-2 truncate">
              <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{pillLabel()}</span>
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </button>
          {open ? (
            <div className="absolute z-20 mt-1 w-full min-w-[300px] overflow-hidden rounded-lg border bg-background shadow-lg">
              <div className="border-b p-2">
                <TaxSearchInput value={search} onChange={setSearch} placeholder="Search vendor or GSTIN…" />
              </div>
              <div className="max-h-60 overflow-y-auto">
                {filtered.length === 0 ? (
                  <p className="px-3 py-4 text-center text-sm text-muted-foreground">No vendors found</p>
                ) : (
                  filtered.map((vendor) => {
                    const selected = selectedIds.includes(vendor.id);
                    return (
                      <button
                        key={vendor.id}
                        type="button"
                        onClick={() => toggleVendor(vendor.id)}
                        className={cn(
                          'flex w-full items-center gap-3 border-b px-3 py-2.5 text-left text-sm last:border-b-0 hover:bg-muted/50',
                          selected && 'bg-primary/5',
                        )}
                      >
                        <input type={mode === 'single' ? 'radio' : 'checkbox'} readOnly checked={selected} />
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{vendor.name || vendor.vendor}</span>
                          <span className="block truncate font-mono text-[11px] text-muted-foreground">{vendor.gstin}</span>
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export const TaxQuickActions = ({ actions = [] }) => (
  <div className="space-y-2">
    {actions.map((action) => (
      <button
        key={action.label}
        type="button"
        onClick={action.onClick}
        disabled={!action.onClick}
        className="flex w-full items-center gap-3 rounded-md border bg-muted/20 px-3 py-2.5 text-left transition hover:border-primary/30 hover:bg-primary/5 disabled:cursor-default disabled:opacity-60"
      >
        {action.icon ? <action.icon className="h-4 w-4 shrink-0 text-primary" /> : null}
        <span className="text-sm font-medium">{action.label}</span>
        <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
      </button>
    ))}
  </div>
);

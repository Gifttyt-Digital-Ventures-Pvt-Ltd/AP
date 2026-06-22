import React, { useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useGetVendorReturnPreferenceMutation } from '../../Services/apis/taxApi';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { cn } from '../../lib/utils';

const QUARTERS = [
  { key: 'q1Preference', label: 'Q1', period: 'Apr-Jun' },
  { key: 'q2Preference', label: 'Q2', period: 'Jul-Sep' },
  { key: 'q3Preference', label: 'Q3', period: 'Oct-Dec' },
  { key: 'q4Preference', label: 'Q4', period: 'Jan-Mar' },
];

const isValidGstin = (value) =>
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
    String(value || '').trim().toUpperCase(),
  );

function getCurrentIndianFyStart() {
  const today = new Date();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();
  return month >= 4 ? year : year - 1;
}

function buildFyOptions({ startYear = 2021, futureYears = 2 } = {}) {
  const currentStart = getCurrentIndianFyStart();
  const endYear = currentStart + futureYears;
  return Array.from({ length: endYear - startYear + 1 }, (_, index) => {
    const start = endYear - index;
    const end = String(start + 1).slice(-2);
    return `FY ${start}-${end}`;
  });
}

function formatPreference(value) {
  const normalized = String(value || '').trim();
  return normalized || 'Not available';
}

function getPreferenceTone(value) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'monthly') return 'border-blue-200 bg-blue-50 text-blue-700';
  if (normalized === 'quarterly') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  return 'border-muted bg-muted/40 text-muted-foreground';
}

function normalizePreferenceResponse(response = {}) {
  const source = response.currentData ?? response.data ?? response;
  const latest = source.list?.[0] ?? source;
  return {
    financialYear: source.financialYear ?? latest.financialYear ?? '',
    gstin: source.gstin ?? latest.gstin ?? '',
    q1Preference: source.q1Preference ?? latest.q1Preference ?? '',
    q2Preference: source.q2Preference ?? latest.q2Preference ?? '',
    q3Preference: source.q3Preference ?? latest.q3Preference ?? '',
    q4Preference: source.q4Preference ?? latest.q4Preference ?? '',
    lastUpdatedAt: source.lastUpdatedAt ?? latest.lastUpdatedAt ?? '',
    history: Array.isArray(source.list) ? source.list : [],
  };
}

function formatDateTime(value) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const VendorReturnPreferenceBlock = ({ gstin, vendorName, className }) => {
  const fyOptions = useMemo(() => buildFyOptions({ startYear: 2021, futureYears: 2 }), []);
  const [financialYear, setFinancialYear] = useState(fyOptions[0]);
  const [preference, setPreference] = useState(null);
  const [fetchPreference, { isLoading }] = useGetVendorReturnPreferenceMutation();

  const normalizedGstin = String(gstin || '').trim().toUpperCase();
  const canFetch = isValidGstin(normalizedGstin);

  const handleFetch = async () => {
    if (!canFetch || isLoading) return;
    try {
      const response = await fetchPreference({
        financialYear,
        gstin: normalizedGstin,
      }).unwrap();
      const nextPreference = normalizePreferenceResponse(response);
      setPreference(nextPreference);
      toast.success('GST return preference fetched');
    } catch (error) {
      toast.error(
        error?.data?.detail ||
          error?.data?.message ||
          error?.message ||
          'Failed to fetch GST return preference',
      );
    }
  };

  return (
    <div className={cn('rounded-lg border bg-muted/20 p-4', className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
            <CalendarDays className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold">GST Return Preference</p>
              {preference ? (
                <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Fetched
                </Badge>
              ) : null}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Check whether {vendorName || 'this vendor'} files GST returns monthly or quarterly before approval.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:min-w-[260px] sm:flex-row">
          <Select value={financialYear} onValueChange={setFinancialYear}>
            <SelectTrigger className="h-9 sm:w-[145px]">
              <SelectValue placeholder="Financial year" />
            </SelectTrigger>
            <SelectContent>
              {fyOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            className="h-9"
            disabled={!canFetch || isLoading}
            onClick={handleFetch}
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            {preference ? 'Refresh' : 'Fetch'}
          </Button>
        </div>
      </div>

      {!canFetch ? (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-900">
          Add a valid 15-character GSTIN to fetch return preference.
        </div>
      ) : null}

      {preference ? (
        <div className="mt-4 space-y-3">
          <div className="grid gap-2 sm:grid-cols-4">
            {QUARTERS.map((quarter) => {
              const value = preference[quarter.key];
              return (
                <div key={quarter.key} className="rounded-md border bg-background p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">{quarter.label}</span>
                    <span className="text-[11px] text-muted-foreground">{quarter.period}</span>
                  </div>
                  <Badge variant="outline" className={cn('mt-2 font-medium', getPreferenceTone(value))}>
                    {formatPreference(value)}
                  </Badge>
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>
              GSTIN: <span className="font-mono font-medium text-foreground">{preference.gstin || normalizedGstin}</span>
            </span>
            <span>
              FY: <span className="font-medium text-foreground">{preference.financialYear || financialYear}</span>
            </span>
            {preference.lastUpdatedAt ? (
              <span>
                Updated: <span className="font-medium text-foreground">{formatDateTime(preference.lastUpdatedAt)}</span>
              </span>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="mt-4 text-xs text-muted-foreground">
          Preference is not fetched yet. Use Fetch before approving if GST compliance needs to be checked.
        </p>
      )}
    </div>
  );
};

export default VendorReturnPreferenceBlock;

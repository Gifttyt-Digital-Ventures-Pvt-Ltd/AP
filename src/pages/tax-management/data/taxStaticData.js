import {
  getCurrentIndianFinancialYear,
  getIndianFinancialYearOptions,
} from '../utils/gstPeriod';

export const TAX_PERIODS = [
  { value: '2026-05', label: 'May 2026' },
  { value: '2026-04', label: 'Apr 2026' },
  { value: '2026-03', label: 'Mar 2026' },
  { value: '2026-02', label: 'Feb 2026' },
];

export const DEFAULT_TAX_PERIOD = TAX_PERIODS[0].value;

export const GST_DOC_MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

export const DEFAULT_GST_DOC_FY = getCurrentIndianFinancialYear();
export const GST_DOC_FY_OPTIONS = getIndianFinancialYearOptions();

export const GST_LEDGER_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const GST_LEDGER_YEARS = ['2026', '2025', '2024', '2023'];

export const resolveLedgerHistoryPeriod = (entry) => {
  if (entry?.periodMonth && entry?.periodYear) {
    return { periodMonth: entry.periodMonth, periodYear: entry.periodYear };
  }

  const label = String(entry?.month || '').trim();
  const yearMatch = label.match(/\b(20\d{2})\b/);
  const periodYear = yearMatch?.[1] || '';
  const monthRaw = label.replace(periodYear, '').trim();
  const periodMonth = GST_LEDGER_MONTHS.find(
    (month) => month.toLowerCase() === monthRaw.toLowerCase()
      || month.toLowerCase().startsWith(monthRaw.toLowerCase().slice(0, 3)),
  ) || monthRaw;

  return { periodMonth, periodYear };
};

export const tdsMonthlyTrend = [
  { month: 'Jan', deducted: 0, deposited: 0 },
  { month: 'Feb', deducted: 0, deposited: 0 },
  { month: 'Mar', deducted: 0, deposited: 0 },
  { month: 'Apr', deducted: 0, deposited: 0 },
  { month: 'May', deducted: 0, deposited: 0 },
  { month: 'Jun', deducted: 0, deposited: 0 },
];

export const tdsVendorWise = [];

export const tdsSectionWise = [
  { section: '194C', name: '194C', value: 0, color: '#5B21B6' },
  { section: '194J', name: '194J', value: 0, color: '#3B82F6' },
  { section: '194H', name: '194H', value: 0, color: '#10B981' },
  { section: '194I', name: '194I', value: 0, color: '#F59E0B' },
  { section: 'Others', name: 'Others', value: 0, color: '#6B7280' },
];

export const tdsReports = [];

export const tdsExceptions = [];

export const tdsFvuReturns = [];

export const tdsForm16aJobs = [];

export const TDS_REPORT_TYPES = [
  { key: 'vendor-summary', label: 'Vendor TDS Summary', desc: 'Consolidated deduction summary per vendor' },
  { key: 'quarterly', label: 'Quarterly TDS Report', desc: 'Quarter-wise TDS deduction and deposit' },
  { key: 'deduction-reg', label: 'Deduction Register', desc: 'Line-item deduction records' },
  { key: 'challan-reg', label: 'Challan Register', desc: 'Challan-wise deposit tracking' },
  { key: 'compliance', label: 'Compliance Report', desc: 'Section-wise compliance health summary' },
  { key: 'exception', label: 'Exception Report', desc: 'All compliance exceptions requiring action' },
];

export const TDS_RATES = {
  '194C': { rate: 0, desc: 'Contractor payments' },
  '194J': { rate: 0, desc: 'Professional/Technical services' },
  '194H': { rate: 0, desc: 'Commission or brokerage' },
  '194I': { rate: 0, desc: 'Rent' },
  '194Q': { rate: 0, desc: 'Purchase of goods' },
  Others: { rate: 0, desc: 'Other payments' },
};

export const tdsRecentActivities = [];

export const tdsCsiFiles = [];

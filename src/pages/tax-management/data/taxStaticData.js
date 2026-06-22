export const TAX_PERIODS = [
  { value: '2026-05', label: 'May 2026' },
  { value: '2026-04', label: 'Apr 2026' },
  { value: '2026-03', label: 'Mar 2026' },
  { value: '2026-02', label: 'Feb 2026' },
];

export const DEFAULT_TAX_PERIOD = TAX_PERIODS[0].value;

export const GST_DOC_MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

export const GST_DOC_FY_OPTIONS = ['2025-26', '2024-25', '2023-24'];

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
  { month: 'Jan', deducted: 5.2, deposited: 5.0 },
  { month: 'Feb', deducted: 6.1, deposited: 5.9 },
  { month: 'Mar', deducted: 7.4, deposited: 7.1 },
  { month: 'Apr', deducted: 5.8, deposited: 5.6 },
  { month: 'May', deducted: 6.9, deposited: 6.7 },
  { month: 'Jun', deducted: 7.8, deposited: 7.3 },
];

export const tdsVendorWise = [
  { vendor: 'Acme Corp', amount: 8.4 },
  { vendor: 'TechSol', amount: 6.2 },
  { vendor: 'Global Mfg', amount: 5.8 },
  { vendor: 'Delta Logistics', amount: 4.1 },
];

export const tdsSectionWise = [
  { section: '194C', name: '194C', value: 34, color: '#5B21B6' },
  { section: '194J', name: '194J', value: 28, color: '#3B82F6' },
  { section: '194H', name: '194H', value: 18, color: '#10B981' },
  { section: '194I', name: '194I', value: 12, color: '#F59E0B' },
  { section: 'Others', name: 'Others', value: 8, color: '#6B7280' },
];

export const tdsReports = [
  { id: 'rep-1', name: 'Vendor TDS Summary - Q3 FY26', date: '18 Jun 2026', status: 'Completed' },
  { id: 'rep-2', name: 'Quarterly TDS Report - Q2 FY26', date: '12 Jun 2026', status: 'Completed' },
  { id: 'rep-3', name: 'Exception Report - Missing PAN', date: '08 Jun 2026', status: 'Processing' },
  { id: 'rep-4', name: 'Section-wise Deduction Register', date: '05 Jun 2026', status: 'Completed' },
];

export const tdsExceptions = [
  { id: 'ex-1', vendor: 'Nova Retail Pvt', issue: 'PAN not available', severity: 'High', amount: 128000 },
  { id: 'ex-2', vendor: 'Sunrise Traders', issue: 'Challan pending', severity: 'Medium', amount: 46000 },
  { id: 'ex-3', vendor: 'Beta Services', issue: 'Rate mismatch', severity: 'Low', amount: 18000 },
];

export const tdsFvuReturns = [
  { id: 'fvu-1', form: '26Q', period: 'Q4 FY25-26', records: 142, status: 'Ready', validation: 98 },
  { id: 'fvu-2', form: '24Q', period: 'Q4 FY25-26', records: 0, status: 'Not started', validation: 0 },
  { id: 'fvu-3', form: '27Q', period: 'Q4 FY25-26', records: 18, status: 'Review', validation: 86 },
];

export const tdsForm16aJobs = [
  { id: 'JOB-001', vendor: 'TechSol Pvt Ltd', quarter: 'Q3', fy: '2023-24', generated: '18 Feb 2024', status: 'completed' },
  { id: 'JOB-002', vendor: 'Acme Corp', quarter: 'Q3', fy: '2023-24', generated: '18 Feb 2024', status: 'completed' },
  { id: 'JOB-003', vendor: 'Global Manufacturing', quarter: 'Q3', fy: '2023-24', generated: '19 Feb 2024', status: 'processing' },
  { id: 'JOB-004', vendor: 'Sunrise Traders', quarter: 'Q2', fy: '2023-24', generated: '12 Jan 2024', status: 'completed' },
  { id: 'JOB-005', vendor: 'Delta Logistics', quarter: 'Q3', fy: '2023-24', generated: '—', status: 'failed' },
  { id: 'JOB-006', vendor: 'Beta Services', quarter: 'Q3', fy: '2023-24', generated: '20 Feb 2024', status: 'submitted' },
];

export const TDS_REPORT_TYPES = [
  { key: 'vendor-summary', label: 'Vendor TDS Summary', desc: 'Consolidated deduction summary per vendor' },
  { key: 'quarterly', label: 'Quarterly TDS Report', desc: 'Quarter-wise TDS deduction and deposit' },
  { key: 'deduction-reg', label: 'Deduction Register', desc: 'Line-item deduction records' },
  { key: 'challan-reg', label: 'Challan Register', desc: 'Challan-wise deposit tracking' },
  { key: 'compliance', label: 'Compliance Report', desc: 'Section-wise compliance health summary' },
  { key: 'exception', label: 'Exception Report', desc: 'All compliance exceptions requiring action' },
];

export const TDS_RATES = {
  '194C': { rate: 1, desc: 'Contractor payments' },
  '194J': { rate: 10, desc: 'Professional/Technical services' },
  '194H': { rate: 5, desc: 'Commission or brokerage' },
  '194I': { rate: 10, desc: 'Rent' },
  '194Q': { rate: 0.1, desc: 'Purchase of goods' },
  Others: { rate: 2, desc: 'Other payments' },
};

export const tdsRecentActivities = [
  { id: 'tds-a1', vendor: 'TechSol Pvt Ltd', section: '194J', amount: 48500, date: '20 Feb 2024', status: 'completed' },
  { id: 'tds-a2', vendor: 'Acme Corp', section: '194C', amount: 12300, date: '19 Feb 2024', status: 'pending' },
  { id: 'tds-a3', vendor: 'Global Manufacturing', section: '194I', amount: 95000, date: '18 Feb 2024', status: 'completed' },
  { id: 'tds-a4', vendor: 'Delta Logistics', section: '194C', amount: 8750, date: '17 Feb 2024', status: 'processing' },
  { id: 'tds-a5', vendor: 'Sunrise Traders', section: '194H', amount: 21000, date: '16 Feb 2024', status: 'failed' },
];

export const tdsCsiFiles = [
  { id: 'csi-1', quarter: 'Q4 FY25-26', challans: 18, pending: 2, downloaded: '18 Jun 2026', status: 'Available' },
  { id: 'csi-2', quarter: 'Q3 FY25-26', challans: 16, pending: 0, downloaded: '12 Mar 2026', status: 'Available' },
  { id: 'csi-3', quarter: 'Q2 FY25-26', challans: 14, pending: 1, downloaded: '10 Dec 2025', status: 'Partial' },
];

export const TAX_PERIODS = [
  { value: '2026-05', label: 'May 2026' },
  { value: '2026-04', label: 'Apr 2026' },
  { value: '2026-03', label: 'Mar 2026' },
  { value: '2026-02', label: 'Feb 2026' },
];

export const DEFAULT_TAX_PERIOD = TAX_PERIODS[0].value;

export const gstActivityLog = [
  { id: 'act-1', action: 'GSTR-2A Reconciliation completed', detail: '248 invoices processed, 73.4% match rate', time: 'Today, 09:42', type: 'success' },
  { id: 'act-2', action: 'GST data synced from portal', detail: 'GSTR-2B statement for Jan 2024 downloaded', time: 'Today, 08:15', type: 'info' },
  { id: 'act-3', action: 'GSTR-3B return filing due in 3 days', detail: '₹6.6L payable for January 2024', time: 'Yesterday', type: 'warning' },
  { id: 'act-4', action: 'GSTR-1 filed successfully', detail: 'ARN: AA2401090012345, 82 invoices reported', time: '17 Feb', type: 'success' },
  { id: 'act-5', action: 'ITC mismatch detected', detail: '₹24,300 difference in 3 invoices — action required', time: '15 Feb', type: 'error' },
];

export const gstHealthItems = [
  { label: 'GSTR-2A Reconciliation', score: 73, status: 'warning' },
  { label: 'GSTR-2B Reconciliation', score: 81, status: 'good' },
  { label: 'GST Return Filing', score: 92, status: 'good' },
  { label: 'ITC Claims Accuracy', score: 88, status: 'good' },
  { label: 'E-Invoice Compliance', score: 65, status: 'warning' },
];

export const gstOverviewKpis = {
  totalTaxable: '₹4.82Cr',
  totalTaxableSub: 'FY 2023-24, all GSTINs',
  totalGstCollected: '₹86.8L',
  totalGstCollectedSub: 'CGST + SGST + IGST',
  eligibleItc: '₹24.8L',
  eligibleItcSub: 'Available for offset',
  cashLedgerBalance: '₹18.9L',
  cashLedgerSub: 'As of today',
  cgst: '₹28.4L',
  sgst: '₹28.4L',
  igst: '₹30.0L',
  taxSub: 'Central tax',
  reconciliationPct: '77.3%',
  reconciliationSub: 'Across all GSTINs',
};

export const gstOverviewReferenceKpis = {
  eligibleItc: 2480000,
  cashLedgerBalance: 1890000,
  reconciliationPct: 77.3,
};

export const GST_VENDOR_MASTER = [
  { id: 'v1', name: 'Acme Corp', gstin: '27AADCA0001A1ZK' },
  { id: 'v2', name: 'TechSol Pvt Ltd', gstin: '29AAKCT0001B1ZP' },
  { id: 'v3', name: 'Global Mfg Co', gstin: '06AAFCG0001D1ZY' },
  { id: 'v4', name: 'Sunrise Traders', gstin: '24AANCA0001F1ZG' },
  { id: 'v5', name: 'Delta Logistics', gstin: '33AABCD0001G1ZJ' },
  { id: 'v6', name: 'Nova Retail Pvt', gstin: '19AABCN0001J1ZK' },
];

export const MOCK_GSTR_RETURNS_API = {
  'v1-2024-25': [
    { ret_typ: 'GSTR-1', ret_prd: '092024', arn: 'AA2709240034521Z', dof: '11 Oct 2024', filing_mode: 'GSP', status: 'Filed', valid: 'Y' },
    { ret_typ: 'GSTR-3B', ret_prd: '092024', arn: 'AA2709240067892Z', dof: '20 Oct 2024', filing_mode: 'Online', status: 'Filed', valid: 'Y' },
    { ret_typ: 'GSTR-1', ret_prd: '082024', arn: 'AA2708240045612Z', dof: '12 Sep 2024', filing_mode: 'GSP', status: 'Filed', valid: 'Y' },
    { ret_typ: 'GSTR-3B', ret_prd: '082024', arn: 'AA2708240078923Z', dof: '19 Sep 2024', filing_mode: 'Online', status: 'Filed', valid: 'Y' },
    { ret_typ: 'GSTR-1', ret_prd: '072024', arn: 'AA2707240023451Z', dof: '11 Aug 2024', filing_mode: 'GSP', status: 'Filed', valid: 'Y' },
    { ret_typ: 'GSTR-3B', ret_prd: '072024', arn: 'AA2707240056782Z', dof: '20 Aug 2024', filing_mode: 'GSP', status: 'Filed', valid: 'N' },
  ],
  'v2-2024-25': [
    { ret_typ: 'GSTR-1', ret_prd: '092024', arn: 'AA2909240012345Z', dof: '11 Oct 2024', filing_mode: 'Online', status: 'Filed', valid: 'Y' },
    { ret_typ: 'GSTR-3B', ret_prd: '092024', arn: 'AA2909240056789Z', dof: '20 Oct 2024', filing_mode: 'Online', status: 'Filed', valid: 'Y' },
    { ret_typ: 'GSTR-1', ret_prd: '082024', arn: 'AA2908240034567Z', dof: '11 Sep 2024', filing_mode: 'Online', status: 'Filed', valid: 'Y' },
    { ret_typ: 'GSTR-3B', ret_prd: '082024', arn: '', dof: '—', filing_mode: '—', status: 'No Record', valid: '—' },
  ],
  'v3-2024-25': [],
};

export const gstReconciliationRows2A = [
  { id: 'rec-1', invoiceNo: 'INV-2024-001', vendor: 'Acme Corp', gstin: '27AADCA0001A1ZK', date: '05 Jan 2024', taxable: 185000, gst: 33300, itcEligible: 'Eligible', booksStatus: 'Matched', portalStatus: 'Matched', difference: 0, result: 'Matched' },
  { id: 'rec-2', invoiceNo: 'INV-2024-002', vendor: 'TechSol Pvt', gstin: '29AAKCT0001B1ZP', date: '12 Jan 2024', taxable: 92500, gst: 16650, itcEligible: 'Eligible', booksStatus: 'Matched', portalStatus: 'Missing', difference: 16650, result: 'Partial' },
  { id: 'rec-3', invoiceNo: 'INV-2024-003', vendor: 'Global Mfg', gstin: '06AAFCG0001D1ZY', date: '18 Jan 2024', taxable: 340000, gst: 61200, itcEligible: 'Ineligible', booksStatus: 'Missing', portalStatus: 'Matched', difference: 61200, result: 'Missing in Books' },
  { id: 'rec-4', invoiceNo: 'INV-2024-004', vendor: 'Sunrise Ltd', gstin: '24AANCA0001F1ZG', date: '22 Jan 2024', taxable: 78000, gst: 14040, itcEligible: 'Eligible', booksStatus: 'Matched', portalStatus: 'Matched', difference: 0, result: 'Matched' },
  { id: 'rec-5', invoiceNo: 'INV-2024-005', vendor: 'Delta Trading', gstin: '33AABCD0001G1ZJ', date: '28 Jan 2024', taxable: 210000, gst: 37800, itcEligible: 'Eligible', booksStatus: 'Matched', portalStatus: 'Matched', difference: 4200, result: 'Amount Mismatch' },
  { id: 'rec-6', invoiceNo: 'INV-2024-006', vendor: 'Nova Retail', gstin: '19AABCN0001J1ZK', date: '30 Jan 2024', taxable: 125000, gst: 22500, itcEligible: 'Eligible', booksStatus: 'Matched', portalStatus: 'Missing', difference: 22500, result: 'Partial' },
  { id: 'rec-7', invoiceNo: 'INV-2024-007', vendor: 'Omega Tech', gstin: '07AABCO0001H1ZM', date: '31 Jan 2024', taxable: 450000, gst: 81000, itcEligible: 'Eligible', booksStatus: 'Matched', portalStatus: 'Matched', difference: 0, result: 'Matched' },
];

export const gstReconciliationRows2B = [
  { id: 'rec-b1', invoiceNo: 'INV-2024-001', vendor: 'Acme Corp', gstin: '27AADCA0001A1ZK', date: '05 Jan 2024', taxable: 185000, gst: 33300, itcEligible: 'Eligible', booksStatus: 'Matched', portalStatus: 'Matched', difference: 0, result: 'Matched' },
  { id: 'rec-b2', invoiceNo: 'INV-2024-002', vendor: 'TechSol Pvt', gstin: '29AAKCT0001B1ZP', date: '12 Jan 2024', taxable: 92500, gst: 16650, itcEligible: 'Eligible', booksStatus: 'Matched', portalStatus: 'Matched', difference: 0, result: 'Matched' },
  { id: 'rec-b3', invoiceNo: 'INV-2024-005', vendor: 'Delta Trading', gstin: '33AABCD0001G1ZJ', date: '28 Jan 2024', taxable: 210000, gst: 37800, itcEligible: 'Eligible', booksStatus: 'Matched', portalStatus: 'Matched', difference: 4200, result: 'Amount Mismatch' },
  { id: 'rec-b4', invoiceNo: 'INV-2024-008', vendor: 'Beta Services', gstin: '19AABCB6789G1Z3', date: '29 Jan 2024', taxable: 48000, gst: 8640, itcEligible: 'Eligible', booksStatus: 'Missing', portalStatus: 'Matched', difference: 8640, result: 'Missing in AP' },
];

export const gstReturnRows = [
  { id: 'ret-1', vendor: 'Acme Corp', gstin: '27AABCA1234A1Z5', period: 'May 2026', gstr1: 'Filed', gstr3b: 'Filed', filingType: 'Monthly', compliance: 'Regular' },
  { id: 'ret-2', vendor: 'TechSol Pvt Ltd', gstin: '29AACCT5678B1Z3', period: 'May 2026', gstr1: 'Filed', gstr3b: 'Pending', filingType: 'Quarterly', compliance: 'Partial Compliance' },
  { id: 'ret-3', vendor: 'Nova Retail Pvt', gstin: '33AABCN2345F1Z5', period: 'May 2026', gstr1: 'Overdue', gstr3b: 'Overdue', filingType: 'Monthly', compliance: 'No Records Found' },
  { id: 'ret-4', vendor: 'Beta Services', gstin: '19AABCB6789G1Z3', period: 'May 2026', gstr1: 'Filed', gstr3b: 'Filed', filingType: 'Monthly', compliance: 'Regular' },
  { id: 'ret-5', vendor: 'Delta Logistics', gstin: '07AABCD7890E1Z7', period: 'May 2026', gstr1: 'Filed', gstr3b: 'Amended', filingType: 'Monthly', compliance: 'Partial Compliance' },
];

export const GST_DOC_MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

export const GST_DOC_FY_OPTIONS = ['2025-26', '2024-25', '2023-24'];

export const MOCK_GSTR2A_B2B_API = {
  'v1-Sep-2024-25': [
    {
      inv_num: 'ACM/2024/0091', inv_date: '05 Sep 2024', taxable: 212000, cgst: 19080, sgst: 19080, igst: 0, cess: 0,
      itc: 'Eligible', match: 'Matched', ap_inv: 'INV-2024-091', ap_diff: 0, amend: 'Amended',
      amendments: [{ date: '02 Oct 2024', taxable_orig: 210000, taxable_new: 212000, gst_orig: 37800, gst_new: 38160, reason: 'Price revision by supplier' }],
    },
    {
      inv_num: 'ACM/2024/0092', inv_date: '12 Sep 2024', taxable: 92500, cgst: 8325, sgst: 8325, igst: 0, cess: 0,
      itc: 'Eligible', match: 'Amount Mismatch', ap_inv: 'INV-2024-092', ap_diff: 1500, amend: 'No Amendment', amendments: [],
    },
    {
      inv_num: 'ACM/2024/0093', inv_date: '18 Sep 2024', taxable: 345000, cgst: 0, sgst: 0, igst: 62100, cess: 0,
      itc: 'Eligible', match: 'Matched', ap_inv: 'INV-2024-093', ap_diff: 0, amend: 'Multiple Amendments',
      amendments: [
        { date: '05 Oct 2024', taxable_orig: 340000, taxable_new: 342000, gst_orig: 61200, gst_new: 61560, reason: 'GST rate correction' },
        { date: '18 Oct 2024', taxable_orig: 342000, taxable_new: 345000, gst_orig: 61560, gst_new: 62100, reason: 'Additional line item added' },
      ],
    },
    {
      inv_num: 'ACM/2024/0094', inv_date: '22 Sep 2024', taxable: 78000, cgst: 7020, sgst: 7020, igst: 0, cess: 0,
      itc: 'Eligible', match: 'Missing in AP', ap_inv: undefined, ap_diff: undefined, amend: 'No Amendment', amendments: [],
    },
    {
      inv_num: 'ACM/2024/0095', inv_date: '28 Sep 2024', taxable: 145000, cgst: 13050, sgst: 13050, igst: 0, cess: 500,
      itc: 'Blocked', match: 'Matched', ap_inv: 'INV-2024-094', ap_diff: 0, amend: 'No Amendment', amendments: [],
    },
  ],
  'v2-Sep-2024-25': [
    {
      inv_num: 'TSP/2024/0034', inv_date: '08 Sep 2024', taxable: 85500, cgst: 7695, sgst: 7695, igst: 0, cess: 0,
      itc: 'Eligible', match: 'Matched', ap_inv: 'INV-2024-085', ap_diff: 0, amend: 'No Amendment', amendments: [],
    },
    {
      inv_num: 'TSP/2024/0035', inv_date: '19 Sep 2024', taxable: 64000, cgst: 5760, sgst: 5760, igst: 0, cess: 0,
      itc: 'Eligible', match: 'Missing in AP', ap_inv: undefined, ap_diff: undefined, amend: 'Amended',
      amendments: [{ date: '10 Oct 2024', taxable_orig: 62000, taxable_new: 64000, gst_orig: 11160, gst_new: 11520, reason: 'Invoice value corrected' }],
    },
    {
      inv_num: 'TSP/2024/0036', inv_date: '25 Sep 2024', taxable: 120000, cgst: 0, sgst: 0, igst: 21600, cess: 0,
      itc: 'Eligible', match: 'Amount Mismatch', ap_inv: 'INV-2024-086', ap_diff: 2400, amend: 'No Amendment', amendments: [],
    },
  ],
  'v1-Aug-2024-25': [
    {
      inv_num: 'ACM/2024/0081', inv_date: '03 Aug 2024', taxable: 195000, cgst: 17550, sgst: 17550, igst: 0, cess: 0,
      itc: 'Eligible', match: 'Matched', ap_inv: 'INV-2024-081', ap_diff: 0, amend: 'No Amendment', amendments: [],
    },
    {
      inv_num: 'ACM/2024/0082', inv_date: '14 Aug 2024', taxable: 48000, cgst: 4320, sgst: 4320, igst: 0, cess: 0,
      itc: 'Ineligible', match: 'Missing in GST', ap_inv: 'INV-2024-082', ap_diff: undefined, amend: 'No Amendment', amendments: [],
    },
  ],
};

export const MOCK_AP_INVOICE_COUNTS = {
  'v1-Sep-2024-25': 6,
  'v2-Sep-2024-25': 4,
  'v1-Aug-2024-25': 3,
};

export const MOCK_GSTR2A_DOCUMENTS_API = {
  'v1-Sep-2024-25': [
    { doc_num: 'ACM/INV/2024/0091', doc_date: '05 Sep 2024', doc_type: 'Invoice', vendor_id: 'v1', taxable: 210000, cgst: 18900, sgst: 18900, igst: 0, cess: 0, itc: 'Eligible', doc_status: 'Active', amend_rev: 'Original', ap_match: 'Matched', ap_inv_num: 'INV-2024-091', ap_amount: 210000, amended: false },
    { doc_num: 'ACM/INV/2024/0092', doc_date: '12 Sep 2024', doc_type: 'Invoice', vendor_id: 'v1', taxable: 92500, cgst: 8325, sgst: 8325, igst: 0, cess: 0, itc: 'Eligible', doc_status: 'Active', amend_rev: 'Original', ap_match: 'Amount Mismatch', ap_inv_num: 'INV-2024-092', ap_amount: 91000, amended: false },
    { doc_num: 'ACM/CN/2024/0014', doc_date: '14 Sep 2024', doc_type: 'Credit Note', vendor_id: 'v1', taxable: 15000, cgst: 1350, sgst: 1350, igst: 0, cess: 0, itc: 'Eligible', doc_status: 'Active', amend_rev: 'Original', ap_match: 'Missing in AP', ap_inv_num: undefined, ap_amount: undefined, amended: false },
    {
      doc_num: 'ACM/INV/2024/0093', doc_date: '18 Sep 2024', doc_type: 'Amended Invoice', vendor_id: 'v1', taxable: 345000, cgst: 0, sgst: 0, igst: 62100, cess: 0, itc: 'Eligible', doc_status: 'Amended', amend_rev: 'Latest Revision', ap_match: 'Matched', ap_inv_num: 'INV-2024-093', ap_amount: 342000, amended: true, amend_note: 'Latest version after 2 amendments',
      amend_history: [
        { label: 'Original', taxable: 340000, gst: 61200, date: '18 Sep 2024', note: 'Original invoice as filed' },
        { label: 'Amendment 1', taxable: 342000, gst: 61560, date: '05 Oct 2024', note: 'Taxable value revised upward' },
        { label: 'Amendment 2', taxable: 345000, gst: 62100, date: '18 Oct 2024', note: 'Additional line item added' },
      ],
    },
    { doc_num: 'ACM/INV/2024/0094', doc_date: '22 Sep 2024', doc_type: 'Invoice', vendor_id: 'v1', taxable: 78000, cgst: 7020, sgst: 7020, igst: 0, cess: 0, itc: 'Eligible', doc_status: 'Active', amend_rev: 'Original', ap_match: 'Missing in AP', ap_inv_num: undefined, ap_amount: undefined, amended: false },
    { doc_num: 'ACM/DN/2024/0007', doc_date: '25 Sep 2024', doc_type: 'Debit Note', vendor_id: 'v1', taxable: 8000, cgst: 720, sgst: 720, igst: 0, cess: 0, itc: 'Ineligible', doc_status: 'Active', amend_rev: 'Original', ap_match: 'Pending Review', ap_inv_num: undefined, ap_amount: undefined, amended: false },
    { doc_num: 'ACM/INV/2024/0095', doc_date: '28 Sep 2024', doc_type: 'Invoice', vendor_id: 'v1', taxable: 145000, cgst: 13050, sgst: 13050, igst: 0, cess: 500, itc: 'Ineligible', doc_status: 'Active', amend_rev: 'Original', ap_match: 'Matched', ap_inv_num: 'INV-2024-094', ap_amount: 145000, amended: false },
    { doc_num: 'ACM/INV/2024/0088', doc_date: '01 Sep 2024', doc_type: 'Invoice', vendor_id: 'v1', taxable: 32000, cgst: 2880, sgst: 2880, igst: 0, cess: 0, itc: 'Eligible', doc_status: 'Cancelled', amend_rev: 'Original', ap_match: 'Pending Review', ap_inv_num: undefined, ap_amount: undefined, amended: false },
  ],
  'v2-Sep-2024-25': [
    { doc_num: 'TSP/INV/2024/0034', doc_date: '08 Sep 2024', doc_type: 'Invoice', vendor_id: 'v2', taxable: 85500, cgst: 7695, sgst: 7695, igst: 0, cess: 0, itc: 'Eligible', doc_status: 'Active', amend_rev: 'Original', ap_match: 'Matched', ap_inv_num: 'INV-2024-085', ap_amount: 85500, amended: false },
    {
      doc_num: 'TSP/INV/2024/0035', doc_date: '19 Sep 2024', doc_type: 'Invoice', vendor_id: 'v2', taxable: 64000, cgst: 5760, sgst: 5760, igst: 0, cess: 0, itc: 'Eligible', doc_status: 'Amended', amend_rev: 'Latest Revision', ap_match: 'Missing in AP', ap_inv_num: undefined, ap_amount: undefined, amended: true, amend_note: 'Invoice value revised from ₹62,000 to ₹64,000',
      amend_history: [
        { label: 'Original', taxable: 62000, gst: 11160, date: '19 Sep 2024', note: 'Original invoice' },
        { label: 'Amendment 1', taxable: 64000, gst: 11520, date: '10 Oct 2024', note: 'Invoice value corrected by supplier' },
      ],
    },
    { doc_num: 'TSP/INV/2024/0036', doc_date: '25 Sep 2024', doc_type: 'Invoice', vendor_id: 'v2', taxable: 120000, cgst: 0, sgst: 0, igst: 21600, cess: 0, itc: 'Eligible', doc_status: 'Active', amend_rev: 'Original', ap_match: 'Amount Mismatch', ap_inv_num: 'INV-2024-086', ap_amount: 117600, amended: false },
    { doc_num: 'TSP/CN/2024/0003', doc_date: '28 Sep 2024', doc_type: 'Credit Note', vendor_id: 'v2', taxable: 12000, cgst: 1080, sgst: 1080, igst: 0, cess: 0, itc: 'Ineligible', doc_status: 'Active', amend_rev: 'Original', ap_match: 'Pending Review', ap_inv_num: undefined, ap_amount: undefined, amended: false },
  ],
  'all-Sep-2024-25': [
    { doc_num: 'ACM/INV/2024/0091', doc_date: '05 Sep 2024', doc_type: 'Invoice', vendor_id: 'v1', taxable: 210000, cgst: 18900, sgst: 18900, igst: 0, cess: 0, itc: 'Eligible', doc_status: 'Active', amend_rev: 'Original', ap_match: 'Matched', ap_inv_num: 'INV-2024-091', ap_amount: 210000, amended: false },
    { doc_num: 'ACM/INV/2024/0093', doc_date: '18 Sep 2024', doc_type: 'Amended Invoice', vendor_id: 'v1', taxable: 345000, cgst: 0, sgst: 0, igst: 62100, cess: 0, itc: 'Eligible', doc_status: 'Amended', amend_rev: 'Latest Revision', ap_match: 'Matched', ap_inv_num: 'INV-2024-093', ap_amount: 342000, amended: true, amend_note: 'Latest version after 2 amendments' },
    { doc_num: 'TSP/INV/2024/0034', doc_date: '08 Sep 2024', doc_type: 'Invoice', vendor_id: 'v2', taxable: 85500, cgst: 7695, sgst: 7695, igst: 0, cess: 0, itc: 'Eligible', doc_status: 'Active', amend_rev: 'Original', ap_match: 'Matched', ap_inv_num: 'INV-2024-085', ap_amount: 85500, amended: false },
    { doc_num: 'TSP/INV/2024/0035', doc_date: '19 Sep 2024', doc_type: 'Invoice', vendor_id: 'v2', taxable: 64000, cgst: 5760, sgst: 5760, igst: 0, cess: 0, itc: 'Eligible', doc_status: 'Amended', amend_rev: 'Latest Revision', ap_match: 'Missing in AP', ap_inv_num: undefined, ap_amount: undefined, amended: true, amend_note: 'Revised from ₹62,000' },
    { doc_num: 'ACM/CN/2024/0014', doc_date: '14 Sep 2024', doc_type: 'Credit Note', vendor_id: 'v1', taxable: 15000, cgst: 1350, sgst: 1350, igst: 0, cess: 0, itc: 'Eligible', doc_status: 'Active', amend_rev: 'Original', ap_match: 'Missing in AP', ap_inv_num: undefined, ap_amount: undefined, amended: false },
    { doc_num: 'ACM/INV/2024/0088', doc_date: '01 Sep 2024', doc_type: 'Invoice', vendor_id: 'v1', taxable: 32000, cgst: 2880, sgst: 2880, igst: 0, cess: 0, itc: 'Eligible', doc_status: 'Cancelled', amend_rev: 'Original', ap_match: 'Pending Review', ap_inv_num: undefined, ap_amount: undefined, amended: false },
  ],
};

export const MOCK_GSTR2B_STATEMENT = {
  'Sep-2024-25': [
    { doc_num: 'ACM/INV/2024/0091', doc_date: '05 Sep 2024', doc_type: 'Invoice', vendor_id: 'v1', taxable: 210000, cgst: 18900, sgst: 18900, igst: 0, cess: 0, itc_status: 'Eligible', claimable: 37800, blocked: 0, block_reason: '', ap_match: 'Matched', ap_inv_num: 'INV-2024-091', ap_amount: 210000 },
    { doc_num: 'ACM/INV/2024/0093', doc_date: '18 Sep 2024', doc_type: 'Invoice', vendor_id: 'v1', taxable: 345000, cgst: 0, sgst: 0, igst: 62100, cess: 0, itc_status: 'Eligible', claimable: 62100, blocked: 0, block_reason: '', ap_match: 'Matched', ap_inv_num: 'INV-2024-093', ap_amount: 342000 },
    { doc_num: 'ACM/INV/2024/0092', doc_date: '12 Sep 2024', doc_type: 'Invoice', vendor_id: 'v1', taxable: 92500, cgst: 8325, sgst: 8325, igst: 0, cess: 0, itc_status: 'Partially Eligible', claimable: 12000, blocked: 4650, block_reason: 'Partial ineligibility — mixed-use supply', ap_match: 'Amount Mismatch', ap_inv_num: 'INV-2024-092', ap_amount: 91000 },
    { doc_num: 'ACM/DN/2024/0007', doc_date: '25 Sep 2024', doc_type: 'Debit Note', vendor_id: 'v1', taxable: 8000, cgst: 720, sgst: 720, igst: 0, cess: 0, itc_status: 'Ineligible', claimable: 0, blocked: 1440, block_reason: 'Section 17(5) — personal use', ap_match: 'Pending Review', ap_inv_num: undefined, ap_amount: undefined },
    { doc_num: 'ACM/INV/2024/0095', doc_date: '28 Sep 2024', doc_type: 'Invoice', vendor_id: 'v1', taxable: 145000, cgst: 13050, sgst: 13050, igst: 0, cess: 500, itc_status: 'Blocked', claimable: 0, blocked: 26600, block_reason: 'Section 17(5)(d) — construction of immovable property', ap_match: 'Matched', ap_inv_num: 'INV-2024-094', ap_amount: 145000 },
    { doc_num: 'TSP/INV/2024/0034', doc_date: '08 Sep 2024', doc_type: 'Invoice', vendor_id: 'v2', taxable: 85500, cgst: 7695, sgst: 7695, igst: 0, cess: 0, itc_status: 'Eligible', claimable: 15390, blocked: 0, block_reason: '', ap_match: 'Matched', ap_inv_num: 'INV-2024-085', ap_amount: 85500 },
    { doc_num: 'TSP/INV/2024/0036', doc_date: '25 Sep 2024', doc_type: 'Invoice', vendor_id: 'v2', taxable: 120000, cgst: 0, sgst: 0, igst: 21600, cess: 0, itc_status: 'Eligible', claimable: 21600, blocked: 0, block_reason: '', ap_match: 'Amount Mismatch', ap_inv_num: 'INV-2024-086', ap_amount: 117600 },
    { doc_num: 'TSP/CN/2024/0003', doc_date: '28 Sep 2024', doc_type: 'Credit Note', vendor_id: 'v2', taxable: 12000, cgst: 1080, sgst: 1080, igst: 0, cess: 0, itc_status: 'Ineligible', claimable: 0, blocked: 2160, block_reason: 'Supplier GSTIN mismatch — portal error', ap_match: 'Missing in AP', ap_inv_num: undefined, ap_amount: undefined },
    { doc_num: 'GLB/INV/2024/0041', doc_date: '10 Sep 2024', doc_type: 'Invoice', vendor_id: 'v3', taxable: 280000, cgst: 25200, sgst: 25200, igst: 0, cess: 0, itc_status: 'Eligible', claimable: 50400, blocked: 0, block_reason: '', ap_match: 'Matched', ap_inv_num: 'INV-2024-077', ap_amount: 280000 },
    { doc_num: 'GLB/INV/2024/0042', doc_date: '20 Sep 2024', doc_type: 'Invoice', vendor_id: 'v3', taxable: 95000, cgst: 8550, sgst: 8550, igst: 0, cess: 0, itc_status: 'Partially Eligible', claimable: 11000, blocked: 6100, block_reason: 'Apportioned ITC — exempt + taxable supply', ap_match: 'Pending Review', ap_inv_num: undefined, ap_amount: undefined },
  ],
  'Aug-2024-25': [
    { doc_num: 'ACM/INV/2024/0081', doc_date: '03 Aug 2024', doc_type: 'Invoice', vendor_id: 'v1', taxable: 195000, cgst: 17550, sgst: 17550, igst: 0, cess: 0, itc_status: 'Eligible', claimable: 35100, blocked: 0, block_reason: '', ap_match: 'Matched', ap_inv_num: 'INV-2024-081', ap_amount: 195000 },
    { doc_num: 'ACM/INV/2024/0082', doc_date: '14 Aug 2024', doc_type: 'Invoice', vendor_id: 'v1', taxable: 48000, cgst: 4320, sgst: 4320, igst: 0, cess: 0, itc_status: 'Ineligible', claimable: 0, blocked: 8640, block_reason: 'Section 17(5) — employee benefits', ap_match: 'Pending Review', ap_inv_num: undefined, ap_amount: undefined },
    { doc_num: 'SUN/INV/2024/0019', doc_date: '22 Aug 2024', doc_type: 'Invoice', vendor_id: 'v4', taxable: 62000, cgst: 5580, sgst: 5580, igst: 0, cess: 0, itc_status: 'Eligible', claimable: 11160, blocked: 0, block_reason: '', ap_match: 'Matched', ap_inv_num: 'INV-2024-063', ap_amount: 62000 },
  ],
};

export const gstVendorBalances = [
  { id: 'v1', vendor: 'Acme Corp', name: 'Acme Corp', gstin: '27AADCA0001A1ZK', cgst: 2.40, sgst: 2.10, igst: 4.20, cess: 0.22, cash: 8.92, itc: 11.40, synced: 'Today, 09:42 AM' },
  { id: 'v2', vendor: 'TechSol Pvt Ltd', name: 'TechSol Pvt Ltd', gstin: '29AAKCT0001B1ZP', cgst: 1.80, sgst: 1.60, igst: 3.50, cess: 0.10, cash: 6.90, itc: 9.20, synced: 'Today, 09:40 AM' },
  { id: 'v3', vendor: 'Global Mfg Co', name: 'Global Mfg Co', gstin: '06AAFCG0001D1ZY', cgst: 3.10, sgst: 2.80, igst: 5.70, cess: 0.18, cash: 11.78, itc: 14.60, synced: 'Today, 09:38 AM' },
  { id: 'v4', vendor: 'Sunrise Traders', name: 'Sunrise Traders', gstin: '24AANCA0001F1ZG', cgst: 0.90, sgst: 0.85, igst: 1.20, cess: 0.05, cash: 2.95, itc: 3.80, synced: 'Today, 09:41 AM' },
  { id: 'v5', vendor: 'Delta Logistics', name: 'Delta Logistics', gstin: '33AABCD0001G1ZJ', cgst: 1.50, sgst: 1.40, igst: 2.80, cess: 0.00, cash: 5.70, itc: 7.10, synced: 'Today, 09:39 AM' },
  { id: 'v6', vendor: 'Nova Retail Pvt', name: 'Nova Retail Pvt', gstin: '19AABCN0001J1ZK', cgst: 0.60, sgst: 0.55, igst: 0.90, cess: 0.00, cash: 2.05, itc: 2.60, synced: 'Today, 09:37 AM' },
];

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

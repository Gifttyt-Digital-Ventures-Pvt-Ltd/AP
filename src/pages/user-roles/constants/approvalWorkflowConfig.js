export const WORKFLOW_TYPE_LABELS = {
  VENDOR_DEPARTMENT_AMOUNT: 'Vendor + Dept + Amount',
  VENDOR_DEPARTMENT: 'Vendor + Department',
  DEPARTMENT_AMOUNT: 'Department + Amount',
  VENDOR_AMOUNT: 'Vendor + Amount',
  DEPARTMENT: 'Department',
  VENDOR: 'Vendor',
  AMOUNT: 'Amount',
  GENERIC: 'Generic',
};

export const WORKFLOW_SECTIONS = [
  { type: 'VENDOR_DEPARTMENT_AMOUNT', priority: 1 },
  { type: 'VENDOR_DEPARTMENT', priority: 2 },
  { type: 'DEPARTMENT_AMOUNT', priority: 3 },
  { type: 'VENDOR_AMOUNT', priority: 4 },
  { type: 'DEPARTMENT', priority: 5 },
  { type: 'VENDOR', priority: 6 },
  { type: 'AMOUNT', priority: 7 },
  { type: 'GENERIC', priority: 8 },
];

export const CONDITION_VISIBILITY = {
  VENDOR: { showVendor: true, showDept: false, showAmount: false },
  AMOUNT: { showVendor: false, showDept: false, showAmount: true },
  DEPARTMENT: { showVendor: false, showDept: true, showAmount: false },
  GENERIC: { showVendor: false, showDept: false, showAmount: false },
  VENDOR_AMOUNT: { showVendor: true, showDept: false, showAmount: true },
  DEPARTMENT_AMOUNT: { showVendor: false, showDept: true, showAmount: true },
  VENDOR_DEPARTMENT: { showVendor: true, showDept: true, showAmount: false },
  VENDOR_DEPARTMENT_AMOUNT: { showVendor: true, showDept: true, showAmount: true },
};

export const WORKFLOW_TYPE_BADGE_CLASSES = {
  VENDOR_DEPARTMENT_AMOUNT: 'bg-purple-100 text-purple-800 border-purple-200',
  VENDOR_DEPARTMENT: 'bg-blue-100 text-blue-800 border-blue-200',
  DEPARTMENT_AMOUNT: 'bg-green-100 text-green-800 border-green-200',
  VENDOR_AMOUNT: 'bg-orange-100 text-orange-800 border-orange-200',
  DEPARTMENT: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  VENDOR: 'bg-pink-100 text-pink-800 border-pink-200',
  AMOUNT: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  GENERIC: 'bg-gray-100 text-gray-800 border-gray-200',
};

export const FALLBACK_VENDORS = [
  { id: '', name: 'No Vendors Found' },
];

export const FALLBACK_USERS = [
  { id: '', name: 'No Approvers Found', role: '' },
];

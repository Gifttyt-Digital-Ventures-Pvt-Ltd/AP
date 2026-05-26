export const WORKFLOW_TYPE_LABELS = {
  VENDOR_DEPARTMENT_AMOUNT_CATEGORY: 'Vendor + Dept + Amount + Category',
  VENDOR_DEPARTMENT_CATEGORY: 'Vendor + Dept + Category',
  VENDOR_DEPARTMENT_AMOUNT: 'Vendor + Dept + Amount',
  DEPARTMENT_AMOUNT_CATEGORY: 'Department + Amount + Category',
  VENDOR_AMOUNT_CATEGORY: 'Vendor + Amount + Category',
  VENDOR_CATEGORY: 'Vendor + Category',
  VENDOR_DEPARTMENT: 'Vendor + Department',
  DEPARTMENT_CATEGORY: 'Department + Category',
  AMOUNT_CATEGORY: 'Amount + Category',
  DEPARTMENT_AMOUNT: 'Department + Amount',
  VENDOR_AMOUNT: 'Vendor + Amount',
  CATEGORY: 'Category',
  DEPARTMENT: 'Department',
  VENDOR: 'Vendor',
  AMOUNT: 'Amount',
  GENERIC: 'Generic',
};

export const getWorkflowTypeLabel = (type) => {
  const upperType = String(type || '').trim().toUpperCase();
  if (!upperType) return '';
  if (WORKFLOW_TYPE_LABELS[upperType]) return WORKFLOW_TYPE_LABELS[upperType];
  return upperType
    .split('_')
    .filter(Boolean)
    .map((token) => token.charAt(0) + token.slice(1).toLowerCase())
    .join(' + ');
};

export const WORKFLOW_SECTIONS = [
  { type: 'VENDOR_DEPARTMENT_AMOUNT_CATEGORY', priority: 1 },
  { type: 'VENDOR_DEPARTMENT_CATEGORY', priority: 2 },
  { type: 'VENDOR_DEPARTMENT_AMOUNT', priority: 3 },
  { type: 'DEPARTMENT_AMOUNT_CATEGORY', priority: 4 },
  { type: 'VENDOR_AMOUNT_CATEGORY', priority: 5 },
  { type: 'VENDOR_CATEGORY', priority: 6 },
  { type: 'DEPARTMENT_CATEGORY', priority: 7 },
  { type: 'AMOUNT_CATEGORY', priority: 8 },
  { type: 'VENDOR_DEPARTMENT', priority: 9 },
  { type: 'DEPARTMENT_AMOUNT', priority: 10 },
  { type: 'VENDOR_AMOUNT', priority: 11 },
  { type: 'CATEGORY', priority: 12 },
  { type: 'DEPARTMENT', priority: 13 },
  { type: 'VENDOR', priority: 14 },
  { type: 'AMOUNT', priority: 15 },
  { type: 'GENERIC', priority: 16 },
];

const WORKFLOW_TYPE_TOKENS = ['VENDOR', 'DEPARTMENT', 'AMOUNT', 'CATEGORY'];

const hasTypeToken = (type, token) => {
  const upperType = String(type || '').toUpperCase();
  return upperType.split('_').includes(token);
};

export const getConditionVisibility = (type) => {
  const upperType = String(type || '').toUpperCase();
  if (!upperType || upperType === 'GENERIC') {
    return { showVendor: false, showDept: false, showAmount: false, showCategory: false };
  }

  const includesKnownToken = WORKFLOW_TYPE_TOKENS.some((token) => hasTypeToken(upperType, token));
  if (!includesKnownToken) {
    return { showVendor: false, showDept: false, showAmount: false, showCategory: false };
  }

  return {
    showVendor: hasTypeToken(upperType, 'VENDOR'),
    showDept: hasTypeToken(upperType, 'DEPARTMENT'),
    showAmount: hasTypeToken(upperType, 'AMOUNT'),
    showCategory: hasTypeToken(upperType, 'CATEGORY'),
  };
};

export const WORKFLOW_TYPE_BADGE_CLASSES = {
  VENDOR_DEPARTMENT_AMOUNT_CATEGORY: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
  VENDOR_DEPARTMENT_CATEGORY: 'bg-violet-100 text-violet-800 border-violet-200',
  VENDOR_DEPARTMENT_AMOUNT: 'bg-purple-100 text-purple-800 border-purple-200',
  DEPARTMENT_AMOUNT_CATEGORY: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  VENDOR_AMOUNT_CATEGORY: 'bg-amber-100 text-amber-800 border-amber-200',
  VENDOR_CATEGORY: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  VENDOR_DEPARTMENT: 'bg-blue-100 text-blue-800 border-blue-200',
  DEPARTMENT_CATEGORY: 'bg-teal-100 text-teal-800 border-teal-200',
  AMOUNT_CATEGORY: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  DEPARTMENT_AMOUNT: 'bg-green-100 text-green-800 border-green-200',
  VENDOR_AMOUNT: 'bg-orange-100 text-orange-800 border-orange-200',
  CATEGORY: 'bg-lime-100 text-lime-800 border-lime-200',
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

export const GRN_STATUS = {
  DRAFT: 'DRAFT',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  SENT_BACK: 'SENT_BACK',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
};

export const GRN_APPROVAL_ACTION = {
  APPROVED: 'Approved',
  SENT_BACK: 'Sent Back',
  REJECTED: 'Rejected',
};

export const GRN_SOURCE = {
  PO: 'PO',
  STANDALONE: 'STANDALONE',
  UPLOAD: 'UPLOAD',
  FROM_PI: 'FROM_PI',
};

export const GRN_SOURCE_LABELS = {
  PO: 'PO',
  STANDALONE: 'Standalone',
  UPLOAD: 'Uploaded',
  FROM_PI: 'From PI',
};

export const GRN_CREATE_OPTIONS = [
  {
    value: GRN_SOURCE.PO,
    label: 'Against a Purchase Order',
    description: 'Link to an open PO with pending quantities',
  },
  {
    value: GRN_SOURCE.STANDALONE,
    label: 'Standalone GRN',
    description: 'Manual GRN without a PO',
  },
  {
    value: GRN_SOURCE.UPLOAD,
    label: 'Upload Internal GRN PDF',
    description: 'Extract data from your ERP GRN',
  },
  {
    value: GRN_SOURCE.FROM_PI,
    label: 'Auto from Proforma Invoice',
    description: 'Pre-fill from a received PI',
  },
];

export const GRN_PAGE_SIZE = 10;

export const statusBadgeClass = {
  DRAFT: 'bg-muted text-muted-foreground',
  Draft: 'bg-muted text-muted-foreground',
  PENDING_APPROVAL: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  'Pending Approval': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  APPROVED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  Approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  Posted: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  Rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  SENT_BACK: 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200',
  'Sent Back': 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200',
  CANCELLED: 'bg-muted text-muted-foreground',
  Cancelled: 'bg-muted text-muted-foreground',
};

export const sourceBadgeClass = {
  PO: 'bg-primary/10 text-primary',
  STANDALONE: 'bg-muted text-muted-foreground',
  UPLOAD: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  FROM_PI: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
};

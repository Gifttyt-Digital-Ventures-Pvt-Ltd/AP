import { FALLBACK_CURRENCIES } from "../../../utils/currency";

/**
 * Table column configuration, kept separate from OrderTrackingTable's render
 * logic — matches the pattern already used by the Purchase Orders module
 * (basePoTableHeader in pages/purchase-orders/components/PoListTable.jsx).
 */
export const ORDER_TRACKING_TABLE_COLUMNS = [
  { key: "srNo", title: "Sr. No", headerClassName: "bg-muted text-foreground", cellClassName: "text-sm font-medium" },
  { key: "poNumber", title: "PO Number", headerClassName: "bg-muted text-foreground", cellClassName: "font-medium" },
  { key: "vendorName", title: "Vendor", headerClassName: "bg-muted text-foreground" },
  { key: "branchName", title: "Branch", headerClassName: "bg-muted text-foreground" },
  { key: "poDate", title: "PO Date", headerClassName: "bg-muted text-foreground" },
  { key: "expectedDeliveryDate", title: "Expected Delivery Timeline", headerClassName: "bg-muted text-foreground" },
  { key: "poAmount", title: "PO Amount", headerClassName: "bg-muted text-foreground" },
  { key: "documentStatus", title: "Document Status", headerClassName: "bg-muted text-foreground" },
  { key: "paymentStatus", title: "Payment Status", headerClassName: "bg-muted text-foreground" },
  { key: "amountOutstanding", title: "Amount Outstanding", headerClassName: "bg-muted text-foreground" },
  { key: "deliveryStatus", title: "Delivery Status", headerClassName: "bg-muted text-foreground" },
  { key: "fundingStatus", title: "Funding Status", headerClassName: "bg-muted text-foreground" },
];

// Document Status — closed enum, document lifecycle only. Never derived from
// or mixed with payment progress.
export const DOCUMENT_STATUS_OPTIONS = [
  "Proforma Pending",
  "Proforma Received",
  "Invoice Received",
  "Final Invoice Pending",
  "Documents Closed",
];

export const documentStatusColors = {
  "Proforma Pending": "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300",
  "Proforma Received": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "Invoice Received": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  "Final Invoice Pending": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  "Documents Closed": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

// Payment Status — closed enum, payment progress only. Never derived from or
// mixed with document lifecycle.
export const PAYMENT_STATUS_OPTIONS = ["Nothing Due", "Due", "Overdue", "Partially Paid", "Fully Paid"];

export const paymentStatusColors = {
  "Nothing Due": "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300",
  Due: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  Overdue: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  "Partially Paid": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "Fully Paid": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

// Delivery Status and Funding Status are backend-owned, open-ended values —
// not calculated or validated here. These maps only cover the documented
// examples for a nicer look; any other value the backend sends still
// renders correctly via the neutral fallback color in StatusBadge.
export const deliveryStatusColors = {
  Pending: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300",
  "In Transit": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  Delivered: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

export const fundingStatusColors = {
  "Awaiting Funds": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  "Partially Funded": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  Funded: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

export const DEFAULT_STATUS_BADGE_CLASS =
  "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";

export const CURRENCY_FILTER_OPTIONS = FALLBACK_CURRENCIES;

export const ORDER_TRACKING_PAGE_SIZE = 20;

/** Sortable columns — value/label feed TableSortButton, defaultDirection is applied the first time each option is picked. */
export const ORDER_TRACKING_SORT_OPTIONS = [
  { value: "poDate", label: "PO Date", defaultDirection: "desc" },
  { value: "expectedDeliveryDate", label: "Expected Delivery Timeline", defaultDirection: "asc" },
  { value: "poAmount", label: "PO Amount", defaultDirection: "desc" },
  { value: "amountOutstanding", label: "Amount Outstanding", defaultDirection: "desc" },
];

export const DEFAULT_ORDER_TRACKING_SORT = {
  sortBy: "poDate",
  sortDirection: "desc",
};

/** Default/empty filter state — the single source of truth for what a "filters" object looks like. */
export const DEFAULT_ORDER_TRACKING_FILTERS = {
  poDateFrom: "",
  poDateTo: "",
  vendorId: "",
  documentStatus: "",
  paymentStatus: "",
  deliveryStatus: "",
  fundingStatus: "",
  currency: "",
};

/**
 * The exact shape sent to useGetOrderTrackingQuery — pagination + sort +
 * filters combined into one object, matching the query string a real
 * GET /order-tracking request will use. OrderTrackingPage holds exactly one
 * piece of state shaped like this; every filter/sort/pagination action is
 * just a partial update to it.
 */
export const DEFAULT_ORDER_TRACKING_PARAMS = {
  page: 0,
  size: ORDER_TRACKING_PAGE_SIZE,
  ...DEFAULT_ORDER_TRACKING_SORT,
  ...DEFAULT_ORDER_TRACKING_FILTERS,
};

import { FALLBACK_CURRENCIES } from "../../../utils/currency";
import {
  DELIVERY_STATUS_OPTIONS as PO_DELIVERY_STATUS_OPTIONS,
  deliveryStatusColors as poDeliveryStatusColors,
} from "../../purchase-orders/constants";

/**
 * v4 column set (Order_Tracking_Screen_Spec.md §6). "Document Status" and
 * "Branch" are gone — no longer part of the row model at all (see
 * docs/order-tracking-api-contract.md §1). Order date renders beneath the PO
 * number inside the poNumber cell (spec §6: "Order date beneath, as built"),
 * so there's no separate date column.
 */
const COLUMN_HEADER_CLASS = "bg-muted text-foreground border-r border-border";

export const ORDER_TRACKING_TABLE_COLUMNS = [
  { key: "srNo", title: "Sr. No", headerClassName: COLUMN_HEADER_CLASS, cellClassName: "text-sm font-medium" },
  { key: "poNumber", title: "PO No.", headerClassName: COLUMN_HEADER_CLASS, cellClassName: "font-medium" },
  { key: "vendorName", title: "Vendor", headerClassName: COLUMN_HEADER_CLASS },
  { key: "documentChain", title: "Document Chain", headerClassName: COLUMN_HEADER_CLASS },
  { key: "orderValue", title: "Order Value", headerClassName: COLUMN_HEADER_CLASS },
  { key: "paymentStatus", title: "Payment Status", headerClassName: COLUMN_HEADER_CLASS },
  { key: "amountOutstanding", title: "Outstanding", headerClassName: COLUMN_HEADER_CLASS },
  { key: "deliveryStatus", title: "Delivery Status", headerClassName: COLUMN_HEADER_CLASS },
  { key: "fundingStatus", title: "Funding", headerClassName: COLUMN_HEADER_CLASS },
  { key: "actions", title: "Actions", headerClassName: "bg-muted text-foreground", cellClassName: "text-right pr-6" },
];

// Order status — NEW in v4. Not a grid column (spec §6: moved to the drawer),
// but still needed for the row-level cancelled treatment and the orderStatus filter.
export const ORDER_STATUS = { OPEN: "OPEN", CLOSED: "CLOSED", CANCELLED: "CANCELLED" };

export const ORDER_STATUS_OPTIONS = [
  { value: ORDER_STATUS.OPEN, label: "Open" },
  { value: ORDER_STATUS.CLOSED, label: "Closed" },
  { value: ORDER_STATUS.CANCELLED, label: "Cancelled" },
];

export const orderStatusColors = {
  [ORDER_STATUS.OPEN]: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  [ORDER_STATUS.CLOSED]: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  [ORDER_STATUS.CANCELLED]: "bg-muted text-muted-foreground",
};

// Payment Status — KEEP, unchanged from v1 (docs/order-tracking-api-contract.md §2).
// Ships as the literal label string on the wire, not a coded value.
export const PAYMENT_STATUS_OPTIONS = ["Nothing Due", "Due", "Overdue", "Partially Paid", "Fully Paid"];

export const paymentStatusColors = {
  "Nothing Due": "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300",
  Due: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  Overdue: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  "Partially Paid": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "Fully Paid": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

/**
 * Delivery Status — CHANGE in v4. Reuses the Purchase Orders module's own
 * enum/colors directly (imported, not copy-pasted) so the two screens can
 * never drift into a second vocabulary — see
 * docs/order-tracking-api-contract.md §2 and §4's KEEP/CHANGE table.
 */
export const DELIVERY_STATUS_OPTIONS = PO_DELIVERY_STATUS_OPTIONS;
export const deliveryStatusColors = poDeliveryStatusColors;
export const DELIVERY_STATUS_UNSET_LABEL = "Not Delivered";
export const deliveryStatusLabel = (value) =>
  value ? DELIVERY_STATUS_OPTIONS.find((option) => option.value === value)?.label || value : DELIVERY_STATUS_UNSET_LABEL;

// Document chain — NEW. One of these per GRN/PI/TI slot on a row (spec §7).
export const DOCUMENT_CHAIN_STATE = {
  PRESENT: "PRESENT",
  PARTIAL: "PARTIAL",
  NOT_RECEIVED: "NOT_RECEIVED",
  NOT_APPLICABLE: "NOT_APPLICABLE",
};

export const documentChainStateMeta = {
  [DOCUMENT_CHAIN_STATE.PRESENT]: { className: "text-green-600 dark:text-green-400", label: "Present" },
  [DOCUMENT_CHAIN_STATE.PARTIAL]: { className: "text-amber-500 dark:text-amber-400", label: "Partial" },
  [DOCUMENT_CHAIN_STATE.NOT_RECEIVED]: { className: "text-muted-foreground", label: "Not received" },
  [DOCUMENT_CHAIN_STATE.NOT_APPLICABLE]: { className: "text-muted-foreground/50", label: "Not applicable" },
};

// Document chain filter — proposed enum per spec §13's bullet list; not
// formally specified anywhere as a closed set (docs/order-tracking-api-contract.md §8).
export const DOCUMENT_CHAIN_FILTER_OPTIONS = [
  { value: "MISSING_TI", label: "Missing TI" },
  { value: "MISSING_GRN", label: "Missing GRN" },
  { value: "TI_PARTIAL", label: "TI Partial" },
];

// Funding — CHANGE in v4. List-level is binary; the Praxia/Financier split lives only in the drawer.
export const FUNDING_STATUS = { FUNDED: "FUNDED", NON_FUNDED: "NON_FUNDED" };

export const FUNDING_STATUS_OPTIONS = [
  { value: FUNDING_STATUS.FUNDED, label: "Funded" },
  { value: FUNDING_STATUS.NON_FUNDED, label: "Non-funded" },
];

export const fundingStatusColors = {
  [FUNDING_STATUS.FUNDED]: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  [FUNDING_STATUS.NON_FUNDED]: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300",
};

export const CHECKLIST_COMPLETE_FILTER_OPTIONS = [
  { value: "true", label: "Complete" },
  { value: "false", label: "Incomplete" },
];

export const DEFAULT_STATUS_BADGE_CLASS =
  "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";

export const CURRENCY_FILTER_OPTIONS = FALLBACK_CURRENCIES;

export const ORDER_TRACKING_PAGE_SIZE = 20;

/** Sortable columns — `expectedDeliveryDate` removed, that field no longer exists in v4. */
export const ORDER_TRACKING_SORT_OPTIONS = [
  { value: "poDate", label: "Order Date", defaultDirection: "desc" },
  { value: "poAmount", label: "Order Value", defaultDirection: "desc" },
  { value: "amountOutstanding", label: "Amount Outstanding", defaultDirection: "desc" },
];

export const DEFAULT_ORDER_TRACKING_SORT = {
  sortBy: "poDate",
  sortDirection: "desc",
};

/** Default/empty filter state — the single source of truth for what a "filters" object looks like. */
export const DEFAULT_ORDER_TRACKING_FILTERS = {
  search: "",
  poDateFrom: "",
  poDateTo: "",
  vendorId: "",
  documentChain: "",
  paymentStatus: "",
  deliveryStatus: "",
  fundingStatus: "",
  checklistComplete: "",
  orderStatus: "",
  currency: "",
};

/**
 * The exact shape sent to useGetOrderTrackingQuery — pagination + sort +
 * filters combined into one object, matching docs/order-tracking-api-contract.md §3.1.
 */
export const DEFAULT_ORDER_TRACKING_PARAMS = {
  page: 0,
  size: ORDER_TRACKING_PAGE_SIZE,
  ...DEFAULT_ORDER_TRACKING_SORT,
  ...DEFAULT_ORDER_TRACKING_FILTERS,
};

// Summary cards — spec §5. Each maps to a filter shortcut into the grid.
export const ORDER_TRACKING_SUMMARY_CARDS = [
  { key: "openOrders", label: "Open Orders", filter: { orderStatus: ORDER_STATUS.OPEN } },
  { key: "overduePayments", label: "Overdue Payments", filter: { paymentStatus: "Overdue" } },
  { key: "pendingDelivery", label: "Pending Delivery", filter: {} }, // exact filter TBD — see docs §8 "pendingDelivery" open item
  { key: "fullyClosed", label: "Fully Closed", filter: { orderStatus: ORDER_STATUS.CLOSED } },
];

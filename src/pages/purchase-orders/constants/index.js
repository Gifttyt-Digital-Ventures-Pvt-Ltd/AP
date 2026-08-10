export const statusColors = {
  Draft: "bg-muted text-muted-foreground",
  Issued: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  Amended: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "Pending Approval": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  Approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "Partially Received": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  Closed: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300",
  Cancelled: "bg-muted text-muted-foreground",
  Rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  "Sent Back": "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200",
};

export const DELIVERY_STATUS_OPTIONS = [
  { value: "INVOICE_RECEIVED_ASSET_NOT_DELIVERED", label: "Invoice Received – Asset Not Delivered" },
  { value: "PARTIALLY_DELIVERED", label: "Partially Delivered" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "ASSET_DELIVERED_INVOICE_AWAITED", label: "Asset Delivered – Invoice Awaited" },
];

export const deliveryStatusColors = {
  INVOICE_RECEIVED_ASSET_NOT_DELIVERED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  PARTIALLY_DELIVERED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  DELIVERED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  ASSET_DELIVERED_INVOICE_AWAITED: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
};

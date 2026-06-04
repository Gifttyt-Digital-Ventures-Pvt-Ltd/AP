export const CAMPAIGN_STATUS_LABELS = {
  pending_approval: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
  correction_needed: "Correction Needed",
};

export const INVOICE_STATUS_LABELS = {
  no_invoice: "Pending Invoice",
  pending_checker: "Pending Check",
  pending_approval: "Pending Approval",
  pending_payment: "Pending Payment",
  pending: "Pending",
  paid: "Paid",
  rejected: "Rejected",
};

export const PAYMENT_MODE_LABELS = {
  NEFT: "NEFT",
  RTGS: "RTGS",
  IMPS: "IMPS",
  UPI: "UPI",
  BANK_TRANSFER: "Bank Transfer",
  CHEQUE: "Cheque",
  CASH: "Cash",
  CARD: "Card",
  OTHER: "Other",
};

export const PAYMENT_MODES = Object.keys(PAYMENT_MODE_LABELS);

export const normalizeStatus = (status = "") =>
  String(status || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

export const formatCampaignStatus = (status) =>
  CAMPAIGN_STATUS_LABELS[normalizeStatus(status)] || status || "-";

export const formatInvoiceStatus = (status) =>
  INVOICE_STATUS_LABELS[normalizeStatus(status)] || status || "-";

export const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

export const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const campaignStatusBadgeClass = (status) => {
  switch (normalizeStatus(status)) {
    case "approved":
      return "bg-green-100 text-green-700 border-green-200";
    case "rejected":
      return "bg-red-100 text-red-700 border-red-200";
    case "correction_needed":
      return "bg-orange-100 text-orange-700 border-orange-200";
    case "pending_approval":
    default:
      return "bg-amber-100 text-amber-700 border-amber-200";
  }
};

export const invoiceStatusBadgeClass = (status) => {
  switch (normalizeStatus(status)) {
    case "paid":
      return "bg-green-100 text-green-700 border-green-200";
    case "rejected":
      return "bg-red-100 text-red-700 border-red-200";
    case "pending_payment":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "pending_approval":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "pending_checker":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "no_invoice":
    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
};

export const getApiErrorMessage = (error, fallback = "Something went wrong") =>
  error?.data?.message ||
  error?.data?.detail ||
  error?.data?.error ||
  error?.error ||
  fallback;

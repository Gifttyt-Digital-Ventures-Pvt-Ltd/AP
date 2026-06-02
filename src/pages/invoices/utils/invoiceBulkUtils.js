import { DEFAULT_CURRENCY, normalizeCurrencyCode } from "../../../utils/currency";
import { isInrInvoiceCurrency } from "./invoiceTax";

export const createEmptyVendorRequestForm = () => ({
  name: "",
  vendor_type: "Company",
  email: "",
  phone: "",
  mobile: "",
  pan: "",
  gstin: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  pincode: "",
  country: "",
  bank_name: "",
  account_number: "",
  ifsc_code: "",
  branch: "",
  account_holder_name: "",
  category: "",
  currency: "INR",
  payment_terms: "30",
  contact_person: "",
  website: "",
  notes: "",
});

export const buildVendorRequestForm = (source = {}) => {
  const invoiceCurrency = normalizeCurrencyCode(source.currency) || DEFAULT_CURRENCY;
  return {
    ...createEmptyVendorRequestForm(),
    name: source.vendorName || source.name || "",
    gstin:
      source.vendorGstin ||
      source.vendorGstin ||
      source.gstin ||
      source.billingGstin ||
      source.billingGstin ||
      "",
    mobile:
      source.mobile ||
      source.vendor_mobile ||
      source.vendorMobile ||
      "",
    phone: source.phone || source.vendor_phone || source.vendorPhone || "",
    pan: source.pan || source.vendor_pan || source.vendorPan || "",
    address_line1: "",
    address_line2: "",
    city: "",
    state: "",
    pincode: "",
    notes: source.memo || source.description || "",
    country: source.country || (isInrInvoiceCurrency(invoiceCurrency) ? "India" : ""),
    currency: invoiceCurrency,
  };
};

export const formatBulkDuration = (totalSeconds) => {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
};

export const formatBulkStatusLabel = (status) => {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "success" || normalized === "extracted") return "Extracted";
  if (normalized === "vendor_missing") return "Vendor Not Matched";
  if (normalized === "uploaded") return "Uploaded";
  if (normalized === "upload_failed") return "Upload Failed";
  if (normalized === "duplicate") return "Duplicate";
  if (normalized === "failed" || normalized === "error") return "Extraction Failed";
  return "Unknown";
};

export const getBulkStatusBadgeClass = (status) => {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "uploaded") return "bg-blue-100 text-blue-800 border-blue-200";
  if (normalized === "success" || normalized === "extracted") {
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  }
  if (normalized === "vendor_missing") return "bg-amber-100 text-amber-800 border-amber-200";
  if (normalized === "duplicate") return "bg-amber-100 text-amber-800 border-amber-200";
  if (normalized === "upload_failed" || normalized === "failed" || normalized === "error") {
    return "bg-red-100 text-red-800 border-red-200";
  }
  return "bg-gray-100 text-gray-800 border-gray-200";
};

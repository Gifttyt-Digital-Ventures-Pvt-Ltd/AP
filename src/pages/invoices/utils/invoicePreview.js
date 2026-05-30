const FILE_BASE_URL = import.meta.env.VITE_BACKEND_URL ?? "";

export const withInvoiceFileBaseUrl = (url) => {
  if (!url) return null;
  if (typeof url !== "string") return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${FILE_BASE_URL}${url.startsWith("/") ? url : `/${url}`}`;
};

export const getInvoiceFileUrl = (invoice) => {
  if (!invoice) return null;
  if (invoice.invoice_file_url) {
    return withInvoiceFileBaseUrl(invoice.invoice_file_url);
  }
  if (invoice.receipt_file_url) {
    return withInvoiceFileBaseUrl(invoice.receipt_file_url);
  }
  if (invoice.file_id) {
    return withInvoiceFileBaseUrl(`/files/${invoice.file_id}`);
  }
  return null;
};

const FILE_BASE_URL = import.meta.env.VITE_BACKEND_URL ?? "";

export const withInvoiceFileBaseUrl = (url) => {
  if (!url) return null;
  if (typeof url !== "string") return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${FILE_BASE_URL}${url.startsWith("/") ? url : `/${url}`}`;
};

export const getInvoiceFileUrl = (invoice) => {
  if (!invoice) return null;
  if (invoice.invoiceFileUrl) {
    return withInvoiceFileBaseUrl(invoice.invoiceFileUrl);
  }
  if (invoice.receiptFileUrl) {
    return withInvoiceFileBaseUrl(invoice.receiptFileUrl);
  }
  if (invoice.fileId) {
    return withInvoiceFileBaseUrl(`/files/${invoice.fileId}`);
  }
  return null;
};

export const openInvoiceFileDownload = (invoice) => {
  const url = getInvoiceFileUrl(invoice);
  if (!url) return false;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
};

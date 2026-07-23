const NOTIFICATION_QUERY_KEYS = [
  "source",
  "action",
  "tab",
  "filter",
  "status",
  "weakEntity",
  "invoiceId",
  "vendorId",
  "poId",
  "grnId",
  "paymentId",
  "batchId",
];

export const clearNotificationQueryParams = (searchParams, setSearchParams, extraKeys = []) => {
  if (searchParams.get("source") !== "notification") return;

  const nextParams = new URLSearchParams(searchParams);
  [...NOTIFICATION_QUERY_KEYS, ...extraKeys].forEach((key) => {
    nextParams.delete(key);
  });

  setSearchParams(nextParams, { replace: true });
};

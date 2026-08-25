export const AP_SUBSCRIPTION_MODEL = {
  INVOICE_BASED: "INVOICE_BASED",
  TOKEN_BASED: "TOKEN_BASED",
};

export const normalizeSubscriptionModel = (value) => {
  const normalized = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_");

  if (
    normalized === "TOKEN" ||
    normalized === "TOKEN_BASED" ||
    normalized === "TOKENBASED"
  ) {
    return AP_SUBSCRIPTION_MODEL.TOKEN_BASED;
  }

  return AP_SUBSCRIPTION_MODEL.INVOICE_BASED;
};

export const isTokenBasedSubscription = (value) =>
  normalizeSubscriptionModel(value) === AP_SUBSCRIPTION_MODEL.TOKEN_BASED;

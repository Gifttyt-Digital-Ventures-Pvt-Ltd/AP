const NOTIFICATION_SOURCE = "notification";
const PREVIEW_ACTION = "preview";

const normalizeToken = (value) => String(value ?? "").trim().toUpperCase();

export const getNotificationEntityId = (notification) => {
  if (notification?.entityId) return notification.entityId;
  if (notification?.entity_id) return notification.entity_id;

  const deepLink = notification?.deepLink || notification?.deep_link || notification?.link;
  if (deepLink) {
    try {
      const pathWithoutQuery = String(deepLink).split("?")[0];
      const pathWithoutHash = pathWithoutQuery.split("#")[0];
      const parts = pathWithoutHash.split("/").filter(Boolean);
      const lastPart = parts[parts.length - 1];
      if (lastPart) return decodeURIComponent(lastPart);
    } catch (error) {
      console.warn("Unable to parse notification deep link", error);
    }
  }

  return notification?.entityRef || notification?.entity_ref || null;
};

export const isWeakNotificationEntityId = (notification) => {
  if (notification?.entityId || notification?.entity_id) return false;
  const deepLink = notification?.deepLink || notification?.deep_link || notification?.link;
  return !deepLink && Boolean(notification?.entityRef || notification?.entity_ref);
};

const buildTarget = (pathname, params) => ({
  pathname,
  search: params.toString() ? `?${params.toString()}` : "",
});

export const resolveNotificationNavigation = (notification) => {
  const entityId = getNotificationEntityId(notification);
  const hasWeakEntityId = isWeakNotificationEntityId(notification);
  const params = new URLSearchParams({
    source: NOTIFICATION_SOURCE,
    action: PREVIEW_ACTION,
  });
  if (hasWeakEntityId) {
    params.set("weakEntity", "1");
  }
  const setParam = (key, value) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  };

  const targetModule = normalizeToken(notification?.targetModule || notification?.target_module);
  const recipientContext = normalizeToken(notification?.recipientContext || notification?.recipient_context);
  const workflowStage = normalizeToken(notification?.workflowStage || notification?.workflow_stage);
  const typeCode = normalizeToken(notification?.typeCode || notification?.type_code);
  const kind = normalizeToken(notification?.kind || notification?.type);
  const entityType = normalizeToken(notification?.entityType || notification?.entity_type);

  const routePayments = () => {
    if (entityType === "PAYMENT") setParam("paymentId", entityId);
    else setParam("invoiceId", entityId);
    if (workflowStage === "PENDING_PAYMENT" || typeCode === "INVOICE_PENDING_PAYMENT") {
      params.set("status", "pending-payment");
    }
    return buildTarget("/payments", params);
  };

  if (targetModule === "PAYMENTS") return routePayments();
  if (targetModule === "PAYMENT_BATCHES") {
    setParam("batchId", entityId);
    return buildTarget("/payment-batches", params);
  }
  if (targetModule === "APPROVALS") {
    setParam("invoiceId", entityId);
    params.set("tab", "needs-approval");
    return buildTarget("/approvals", params);
  }
  if (targetModule === "INVOICES") {
    setParam("invoiceId", entityId);
    return buildTarget("/invoices", params);
  }
  if (targetModule === "VENDORS") {
    setParam("vendorId", entityId);
    if (kind === "ACTIONABLE") params.set("filter", "pending-approval");
    return buildTarget("/vendors", params);
  }
  if (targetModule === "PURCHASE_ORDERS") {
    setParam("poId", entityId);
    if (kind === "ACTIONABLE") params.set("status", "pending-approval");
    return buildTarget("/purchase-orders", params);
  }
  if (targetModule === "GOODS_RECEIPT") {
    setParam("grnId", entityId);
    if (kind === "ACTIONABLE") params.set("status", "pending-approval");
    return buildTarget("/goods-receipt", params);
  }

  if (
    recipientContext === "PAYMENT_OPERATOR" ||
    workflowStage === "PENDING_PAYMENT" ||
    typeCode === "INVOICE_PENDING_PAYMENT"
  ) {
    return routePayments();
  }

  if (
    entityType === "INVOICE" &&
    kind === "ACTIONABLE" &&
    (
      workflowStage === "CHECKER" ||
      workflowStage === "APPROVER" ||
      recipientContext === "CHECKER" ||
      recipientContext === "APPROVER" ||
      typeCode === "INVOICE_APPROVAL_PENDING"
    )
  ) {
    setParam("invoiceId", entityId);
    params.set("tab", "needs-approval");
    return buildTarget("/approvals", params);
  }

  switch (entityType) {
    case "INVOICE":
      setParam("invoiceId", entityId);
      return buildTarget("/invoices", params);
    case "VENDOR":
      setParam("vendorId", entityId);
      if (kind === "ACTIONABLE") params.set("filter", "pending-approval");
      return buildTarget("/vendors", params);
    case "PO":
    case "PURCHASE_ORDER":
      setParam("poId", entityId);
      if (kind === "ACTIONABLE") params.set("status", "pending-approval");
      return buildTarget("/purchase-orders", params);
    case "GRN":
    case "GOODS_RECEIPT":
      setParam("grnId", entityId);
      if (kind === "ACTIONABLE") params.set("status", "pending-approval");
      return buildTarget("/goods-receipt", params);
    case "PAYMENT":
      setParam("paymentId", entityId);
      if (typeCode === "PAYMENT_APPROVAL_PENDING") params.set("status", "pending-approval");
      return buildTarget("/payments", params);
    default:
      return { pathname: "/notifications", search: "" };
  }
};

export const navigateFromNotification = (notification, navigate) => {
  const target = resolveNotificationNavigation(notification);
  navigate({
    pathname: target.pathname,
    search: target.search,
  });
};

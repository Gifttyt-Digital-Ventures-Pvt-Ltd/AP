export const FULL_ACCESS_PERMISSION = "FULL_ACCESS";

export const ROUTE_PERMISSION_RULES = {
  "/dashboard": { anyOf: ["dashboard-view"] },
  "/vendors": { anyOf: ["vendors-view", "vendors-manage", "vendors-approve"] },
  "/campaigns": {
    anyOf: ["campaign-view", "campaign-manage", "campaign-approve"],
  },
  "/purchase-orders": { anyOf: ["po-view", "po-manage", "po-approve"] },
  "/goods-receipt": { anyOf: ["grn-view", "grn-manage", "grn-approve"] },
  "/invoices": {
    anyOf: [
      "invoice-view",
      "invoice-maker",
      "invoice-checker",
      "invoice-approver",
    ],
  },
  "/invoice-matching": { anyOf: ["matching-view", "matching-manage"] },
  "/transactions": { anyOf: ["banking-view", "banking-full"] },
  "/approvals": {
    anyOf: [
      "invoice-checker",
      "invoice-approver",
      // "po-approve",
      // "grn-approve",
      // "payments-manage",
    ],
  },
  "/payments": { anyOf: ["payments-view", "payments-manage"] },
  "/payment-batches": {
    anyOf: ["payment-batches-view", "payment-batches-manage"],
  },
  "/tax-management": { anyOf: ["tax-view", "tax-manage"] },
  "/reports": { anyOf: ["reports-view", "reports-full"] },
  "/audit-trail": { anyOf: ["audit-trail-view"] },
  "/banking": { anyOf: ["banking-view", "banking-full"] },
  "/notifications": { anyOf: ["settings-interaction"] },
  "/user-roles": {
    anyOf: [
      "roles-view",
      "roles-manage",
      "roles-manage-users",
      "vendor-workflow-view",
      "vendor-workflow-manage",
      "category-view",
      "category-manage",
    ],
  },
  "/settings": {
    anyOf: ["settings-org", "settings-banking", "settings-interaction"],
  },
};

export const ROUTE_CORPORATE_ENTITLEMENT_RULES = {
  "/dashboard": { screen: "DASHBOARD", anySections: ["DASHBOARD_ALL"] },
  "/vendors": { screen: "VENDORS", anySections: ["VENDORS_ALL"] },
  "/campaigns": { screen: "CAMPAIGN", anySections: ["CAMPAIGN_ALL"] },
  "/purchase-orders": {
    screen: "PURCHASE_ORDER",
    anySections: [
      "PURCHASE_ORDER_CREATE",
      "PURCHASE_ORDER_UPLOAD",
      "PURCHASE_ORDER_ALL",
    ],
  },
  "/goods-receipt": { screen: "GRN", anySections: ["GRN_ALL"] },
  "/invoices": { screen: "INVOICE", anySections: ["INVOICES_ALL"] },
  "/invoice-matching": {
    screen: "INVOICE_MATCHING",
    anySections: ["INVOICE_MATCHING_ALL"],
  },
  "/transactions": { screen: "BANKING", anySections: ["BANKING_ALL"] },
  "/approvals": { screen: "APPROVAL", anySections: ["APPROVAL_ALL"] },
  "/payments": { screen: "PAYMENTS", anySections: ["PAYMENTS_ALL"] },
  "/payment-batches": {
    screen: "PAYMENT_BATCHES",
    anySections: ["PAYMENT_BATCHES_ALL"],
  },
  "/tax-management": {
    screen: "TAX_MANAGEMENT",
    anySections: ["TAX_GST", "TAX_TDS_COMPLIANCE"],
  },
  "/reports": {
    screen: "REPORTS",
    anySections: [
      "REPORTS_EXECUTIVE",
      "REPORTS_AP",
      "REPORTS_VENDOR",
      "REPORTS_TAX",
      "REPORTS_PAYMENT",
    ],
  },
  "/audit-trail": { screen: "AUDIT_TRAIL", anySections: ["AUDIT_TRAIL_ALL"] },
  "/banking": { anySections: ["SETTINGS_CONNECTED_BANKING"] },
  "/notifications": {
    screen: "SETTINGS",
    anySections: ["SETTINGS_INTEGRATIONS", "SETTINGS_ORG_DETAILS"],
  },
  "/user-roles": {
    screen: "MANAGE_ROLE",
    anySections: [
      "MANAGE_ROLE_USERS",
      "MANAGE_ROLE_ROLES_PERMISSIONS",
      "MANAGE_ROLE_APPROVAL_WORKFLOW",
      "CATEGORY_ALL",
    ],
  },
  "/settings": {
    screen: "SETTINGS",
    anySections: [
      "SETTINGS_ORG_DETAILS",
      "SETTINGS_CONNECTED_BANKING",
      "SETTINGS_INTEGRATIONS",
    ],
  },
};

export const DEFAULT_ROUTE_PRIORITY = [
  "/dashboard",
  "/vendors",
  "/campaigns",
  "/purchase-orders",
  "/goods-receipt",
  "/invoices",
  "/invoice-matching",
  "/transactions",
  "/approvals",
  "/payments",
  "/payment-batches",
  "/tax-management",
  "/reports",
  "/audit-trail",
  "/banking",
  "/notifications",
  "/user-roles",
  "/settings",
];

export const resolveDefaultAccessibleRoute = (canAccessRoute) => {
  if (typeof canAccessRoute !== "function") return null;
  return DEFAULT_ROUTE_PRIORITY.find((path) => canAccessRoute(path)) || null;
};

export const ACTION_PERMISSION_RULES = {
  "vendors.create": { anyOf: ["vendors-manage"] },
  "vendors.update": { anyOf: ["vendors-manage"] },
  "vendors.delete": { anyOf: ["vendors-manage"] },
  "vendors.approve": { anyOf: ["vendors-approve"] },

  "invoices.scan": { anyOf: ["invoice-maker", "pi-manage"] },
  "invoices.bulkUpload": { anyOf: ["invoice-maker", "pi-manage"] },
  "invoices.addVendor": { anyOf: ["vendors-manage", "invoice-maker"] },
  "invoices.create": { anyOf: ["invoice-maker"] },
  "invoices.update": { anyOf: ["invoice-maker", "invoice-checker"] },
  "invoices.delete": { anyOf: ["invoice-maker"] },
  "invoices.check": { anyOf: ["invoice-checker"] },
  "invoices.approve": { anyOf: ["invoice-approver"] },

  "campaigns.create": { anyOf: ["campaign-manage"] },
  "campaigns.approve": { anyOf: ["campaign-approve"] },
  "campaigns.submitInvoice": { anyOf: ["campaign-manage"] },
  "campaigns.checkInvoice": { anyOf: ["invoice-checker"] },
  "campaigns.approveInvoice": { anyOf: ["invoice-approver"] },
  "campaigns.recordAdvance": { anyOf: ["campaign-manage"] },
  "campaigns.markPaid": { anyOf: ["campaign-manage"] },

  "po.create": { anyOf: ["po-manage"] },
  "po.submit": { anyOf: ["po-manage"] },
  "po.approve": { anyOf: ["po-approve"] },

  "grn.create": { anyOf: ["grn-manage"] },
  "grn.post": { anyOf: ["grn-approve"] },

  "matching.perform": { anyOf: ["matching-manage"] },
  "matching.edit": { anyOf: ["matching-manage"] },
  "matching.exception": { anyOf: ["matching-manage"] },

  "payments.releaseBulk": { anyOf: ["payments-manage"] },
  "payments.create": { anyOf: ["payments-manage"] },
  "payments.createBatch": { anyOf: ["payment-batches-manage"] },

  "paymentBatches.process": { anyOf: ["payment-batches-manage"] },
  "paymentBatches.markProcessed": { anyOf: ["payment-batches-manage"] },
  "paymentBatches.generateFile": { anyOf: ["payment-batches-manage"] },

  "settings.createBankAccount": { anyOf: ["settings-banking", "banking-full"] },
  "settings.createOrganisation": { anyOf: ["settings-org"] },
  "settings.updateOrganisation": { anyOf: ["settings-org"] },
  "categories.create": { anyOf: ["category-manage"] },
  "categories.update": { anyOf: ["category-manage"] },
  "categories.delete": { anyOf: ["category-manage"] },

  "tax.calculateGst": { anyOf: ["tax-manage"] },
  "tax.calculateTds": { anyOf: ["tax-manage"] },
  "tax.generateForm16a": { anyOf: ["tax-manage"] },

  "transactions.uploadStatement": { anyOf: ["banking-full"] },
  "transactions.deleteStatement": { anyOf: ["banking-full"] },
  "transactions.update": { anyOf: ["banking-full"] },
  "transactions.review": { anyOf: ["banking-full"] },
  "transactions.undo": { anyOf: ["banking-full"] },
  "transactions.uploadVoucher": { anyOf: ["banking-full"] },
  "transactions.linkInvoice": { anyOf: ["banking-full"] },

  "roles.invite": { anyOf: ["roles-manage-users"] },
  "roles.updateUserRole": { anyOf: ["roles-manage-users"] },
  "roles.updateUserStatus": { anyOf: ["roles-manage-users"] },
  "roles.deleteUser": { anyOf: ["roles-manage-users"] },
  "roles.assignRoleSets": { anyOf: ["roles-manage"] },
  "roles.manageCustomRoles": { anyOf: ["roles-manage"] },

  "workflow.create": { anyOf: ["vendor-workflow-manage"] },
  "workflow.update": { anyOf: ["vendor-workflow-manage"] },
  "workflow.delete": { anyOf: ["vendor-workflow-manage"] },
  "workflow.switch": { anyOf: ["vendor-workflow-manage"] },
  "workflow.test": {
    anyOf: ["vendor-workflow-view", "vendor-workflow-manage"],
  },
};

const normalizePath = (path = "") => {
  const raw = String(path || "").trim();
  if (!raw) return "/";
  const withoutTrailing =
    raw !== "/" && raw.endsWith("/") ? raw.slice(0, -1) : raw;
  return withoutTrailing.toLowerCase();
};

export const resolveRoutePermissionRule = (path = "") => {
  const normalizedPath = normalizePath(path);
  const routes = Object.keys(ROUTE_PERMISSION_RULES).sort(
    (a, b) => b.length - a.length,
  );
  const matchedRoute = routes.find(
    (route) =>
      normalizedPath === route || normalizedPath.startsWith(`${route}/`),
  );

  return matchedRoute ? ROUTE_PERMISSION_RULES[matchedRoute] : null;
};

export const resolveRouteCorporateEntitlementRule = (path = "") => {
  const normalizedPath = normalizePath(path);
  const routes = Object.keys(ROUTE_CORPORATE_ENTITLEMENT_RULES).sort(
    (a, b) => b.length - a.length,
  );
  const matchedRoute = routes.find(
    (route) =>
      normalizedPath === route || normalizedPath.startsWith(`${route}/`),
  );

  return matchedRoute ? ROUTE_CORPORATE_ENTITLEMENT_RULES[matchedRoute] : null;
};

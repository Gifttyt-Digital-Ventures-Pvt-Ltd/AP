export const FULL_ACCESS_PERMISSION = "FULL_ACCESS";

export const ROUTE_PERMISSION_RULES = {
  "/dashboard": { anyOf: ["dashboard-view"] },
  "/vendors": { anyOf: ["vendors-view", "vendors-manage", "vendors-approve"] },
  "/purchase-orders": { anyOf: ["po-view", "po-manage", "po-approve"] },
  "/goods-receipt": { anyOf: ["grn-view", "grn-manage", "grn-approve"] },
  "/invoices": {
    anyOf: ["invoice-view", "invoice-maker", "invoice-checker", "invoice-approver"],
  },
  "/invoice-matching": { anyOf: ["matching-view", "matching-manage"] },
  "/transactions": { anyOf: ["banking-view", "banking-full"] },
  "/approvals": {
    anyOf: [
      "invoice-checker",
      "invoice-approver",
      "po-approve",
      "grn-approve",
      "payments-manage",
    ],
  },
  "/payments": { anyOf: ["payments-view", "payments-manage"] },
  "/payment-batches": { anyOf: ["payments-view", "payments-manage"] },
  "/tax-management": { anyOf: ["tax-view", "tax-manage"] },
  "/reports": { anyOf: ["reports-view", "reports-full"] },
  "/audit-trail": { anyOf: ["audit-trail-view"] },
  "/banking": { anyOf: ["banking-view", "banking-full"] },
  "/notifications": { anyOf: ["settings-interaction"] },
  "/user-roles": {
    anyOf: [
      "roles-view",
      "roles-manage",
      "vendor-workflow-view",
      "vendor-workflow-manage",
      "category-view",
      "category-manage",
    ],
  },
  "/settings": {
    anyOf: [
      "settings-org",
      "settings-banking",
      "settings-interaction",
    ],
  },
};

export const DEFAULT_ROUTE_PRIORITY = [
  "/dashboard",
  "/vendors",
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
  "invoices.update": { anyOf: ["invoice-maker"] },
  "invoices.delete": { anyOf: ["invoice-maker"] },
  "invoices.check": { anyOf: ["invoice-checker"] },
  "invoices.approve": { anyOf: ["invoice-approver"] },

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
  "payments.createBatch": { anyOf: ["payments-manage"] },

  "paymentBatches.process": { anyOf: ["payments-manage"] },
  "paymentBatches.markProcessed": { anyOf: ["payments-manage"] },
  "paymentBatches.generateFile": { anyOf: ["payments-manage"] },

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

  "roles.invite": { anyOf: [FULL_ACCESS_PERMISSION] },
  "roles.updateUserRole": { anyOf: [FULL_ACCESS_PERMISSION] },
  "roles.updateUserStatus": { anyOf: [FULL_ACCESS_PERMISSION] },
  "roles.deleteUser": { anyOf: [FULL_ACCESS_PERMISSION] },
  "roles.manageCustomRoles": { anyOf: ["roles-manage"] },

  "workflow.create": { anyOf: ["vendor-workflow-manage"] },
  "workflow.update": { anyOf: ["vendor-workflow-manage"] },
  "workflow.delete": { anyOf: ["vendor-workflow-manage"] },
  "workflow.switch": { anyOf: ["vendor-workflow-manage"] },
  "workflow.test": { anyOf: ["vendor-workflow-view", "vendor-workflow-manage"] },
};

const normalizePath = (path = "") => {
  const raw = String(path || "").trim();
  if (!raw) return "/";
  const withoutTrailing = raw !== "/" && raw.endsWith("/") ? raw.slice(0, -1) : raw;
  return withoutTrailing.toLowerCase();
};

export const resolveRoutePermissionRule = (path = "") => {
  const normalizedPath = normalizePath(path);
  const routes = Object.keys(ROUTE_PERMISSION_RULES).sort((a, b) => b.length - a.length);
  const matchedRoute = routes.find(
    (route) =>
      normalizedPath === route || normalizedPath.startsWith(`${route}/`),
  );

  return matchedRoute ? ROUTE_PERMISSION_RULES[matchedRoute] : null;
};

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
      "approval-view",
      "approval-full",
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
  "/banking": { anyOf: ["banking-view", "banking-full"] },
  "/notifications": { anyOf: ["settings-interaction"] },
  "/user-roles": {
    anyOf: [
      "roles-view",
      "roles-manage",
      "vendor-workflow-view",
      "vendor-workflow-manage",
    ],
  },
  "/settings": { anyOf: ["settings-org", "settings-banking", "settings-interaction"] },
};

export const ACTION_PERMISSION_RULES = {
  "vendors.create": { anyOf: ["vendors-manage"] },
  "vendors.update": { anyOf: ["vendors-manage"] },
  "vendors.delete": { anyOf: ["vendors-manage"] },
  "vendors.approve": { anyOf: ["vendors-approve", "approval-full"] },

  "invoices.scan": { anyOf: ["invoice-maker", "pi-manage"] },
  "invoices.bulkUpload": { anyOf: ["invoice-maker", "pi-manage"] },
  "invoices.addVendor": { anyOf: ["vendors-manage", "invoice-maker"] },
  "invoices.create": { anyOf: ["invoice-maker"] },
  "invoices.update": { anyOf: ["invoice-maker"] },
  "invoices.delete": { anyOf: ["invoice-maker"] },
  "invoices.approve": { anyOf: ["invoice-approver", "approval-full"] },

  "po.seedMasterData": { anyOf: ["po-manage"] },
  "po.create": { anyOf: ["po-manage"] },
  "po.submit": { anyOf: ["po-manage"] },
  "po.approve": { anyOf: ["po-approve", "approval-full"] },

  "grn.create": { anyOf: ["grn-manage"] },
  "grn.post": { anyOf: ["grn-approve", "approval-full"] },

  "matching.match": { anyOf: ["matching-manage"] },
  "matching.resolve": { anyOf: ["matching-manage"] },

  "payments.releaseBulk": { anyOf: ["payments-manage"] },
  "payments.create": { anyOf: ["payments-manage"] },
  "payments.createBatch": { anyOf: ["payments-manage"] },

  "paymentBatches.submit": { anyOf: ["payments-manage"] },
  "paymentBatches.approve": { anyOf: ["approval-full", "payments-manage"] },
  "paymentBatches.process": { anyOf: ["payments-manage"] },
  "paymentBatches.generateFile": { anyOf: ["payments-manage"] },

  "settings.createBankAccount": { anyOf: ["settings-banking", "banking-full"] },
  "settings.createOrganisation": { anyOf: ["settings-org"] },
  "settings.updateOrganisation": { anyOf: ["settings-org"] },

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

  "roles.invite": { anyOf: ["roles-manage"] },
  "roles.updateUserRole": { anyOf: ["roles-manage"] },
  "roles.updateUserStatus": { anyOf: ["roles-manage"] },
  "roles.deleteUser": { anyOf: ["roles-manage"] },
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

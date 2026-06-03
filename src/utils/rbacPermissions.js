const normalizeToken = (value = "") =>
  String(value)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");

const toArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [value];
};

const mapVendorPermission = (permissionType) => {
  if (permissionType === "VIEW") return "vendors-view";
  if (permissionType === "MANAGE") return "vendors-manage";
  if (permissionType === "APPROVER" || permissionType === "APPROVE") return "vendors-approve";
  return null;
};

const mapPurchaseOrderPermission = (permissionType) => {
  if (permissionType === "VIEW") return "po-view";
  if (permissionType === "MANAGE") return "po-manage";
  if (permissionType === "APPROVER" || permissionType === "APPROVE") return "po-approve";
  if (permissionType === "FULL") return ["po-view", "po-manage", "po-approve"];
  return null;
};

const mapGrnPermission = (permissionType) => {
  if (permissionType === "VIEW") return "grn-view";
  if (permissionType === "MANAGE") return "grn-manage";
  if (permissionType === "APPROVER" || permissionType === "APPROVE") return "grn-approve";
  if (permissionType === "FULL") return ["grn-view", "grn-manage", "grn-approve"];
  return null;
};

const mapPiPermission = (permissionType) => {
  if (permissionType === "VIEW") return "pi-view";
  if (permissionType === "MANAGE") return "pi-manage";
  if (permissionType === "APPROVER" || permissionType === "APPROVE") return "pi-approve";
  return null;
};

const mapInvoicePermission = (permissionType) => {
  if (permissionType === "VIEW") return "invoice-view";
  if (permissionType === "MAKER" || permissionType === "MANAGE") return "invoice-maker";
  if (permissionType === "CHECKER") return "invoice-checker";
  if (permissionType === "APPROVER" || permissionType === "APPROVE") return "invoice-approver";
  if (permissionType === "FULL") return ["invoice-view", "invoice-maker", "invoice-checker", "invoice-approver"];
  return null;
};

const mapCampaignPermission = (permissionType) => {
  if (permissionType === "VIEW") return "campaign-view";
  if (
    permissionType === "MANAGE" ||
    permissionType === "CREATOR" ||
    permissionType === "MAKER" ||
    permissionType === "FINANCE"
  ) {
    return "campaign-manage";
  }
  if (permissionType === "APPROVER" || permissionType === "APPROVE") {
    return "campaign-approve";
  }
  if (permissionType === "ADMIN" || permissionType === "FULL") {
    return ["campaign-view", "campaign-manage", "campaign-approve"];
  }
  return null;
};

const mapInvoiceMatchingPermission = (permissionType) => {
  if (permissionType === "VIEW") return "matching-view";
  if (permissionType === "MANAGE") return "matching-manage";
  return null;
};

const mapPaymentsPermission = (permissionType) => {
  if (permissionType === "VIEW") return "payments-view";
  if (permissionType === "MANAGE") return "payments-manage";
  return null;
};

const mapPaymentBatchesPermission = (permissionType) => {
  if (permissionType === "VIEW") return "payment-batches-view";
  if (permissionType === "MANAGE") return "payment-batches-manage";
  return null;
};

const mapTaxPermission = (permissionType) => {
  if (permissionType === "VIEW") return "tax-view";
  if (permissionType === "MANAGE") return "tax-manage";
  return null;
};

const mapReportsPermission = (permissionType) => {
  if (permissionType === "VIEW") return "reports-view";
  if (["FULL", "MANAGE"].includes(permissionType)) return "reports-full";
  return null;
};

const mapAuditTrailPermission = (permissionType) => {
  if (permissionType === "VIEW") return "audit-trail-view";
  return null;
};

const mapBankingPermission = (permissionType) => {
  if (permissionType === "VIEW") return "banking-view";
  if (["FULL", "MANAGE"].includes(permissionType)) return "banking-full";
  return null;
};

const mapRolesPermission = (permissionType) => {
  if (permissionType === "VIEW") return "roles-view";
  if (permissionType === "MANAGE") return "roles-manage";
  return null;
};

const mapSettingsPermission = (permissionType) => {
  if (permissionType === "ORG" || permissionType === "ORGANISATION" || permissionType === "ORGANIZATION") {
    return "settings-org";
  }
  if (permissionType === "BANKING") return "settings-banking";
  if (permissionType === "INTERACTION") return "settings-interaction";
  return null;
};

const mapCategoryPermission = (permissionType) => {
  if (permissionType === "VIEW") return "category-view";
  if (permissionType === "MANAGE") return "category-manage";
  return null;
};

const mapVendorWorkflowPermission = (permissionType) => {
  if (permissionType === "VIEW") return "vendor-workflow-view";
  if (permissionType === "MANAGE") return "vendor-workflow-manage";
  return null;
};

export const mapScreenPermissionToCanonical = (screenInput, permissionTypeInput) => {
  const screen = normalizeToken(screenInput);
  const permissionType = normalizeToken(permissionTypeInput);

  if (screen === "DASHBOARD") {
    return permissionType === "VIEW" ? "dashboard-view" : null;
  }

  if (screen === "VENDORS" || screen === "VENDOR") {
    return mapVendorPermission(permissionType);
  }

  if (
    screen === "PURCHASE_ORDER" ||
    screen === "PURCHASE_ORDERS" ||
    screen === "PO"
  ) {
    return mapPurchaseOrderPermission(permissionType);
  }

  if (screen === "GRN" || screen === "GOODS_RECEIPT" || screen === "GOODS_RECEIPT_NOTE") {
    return mapGrnPermission(permissionType);
  }

  if (screen === "PI" || screen === "PURCHASE_INVOICE") {
    return mapPiPermission(permissionType);
  }

  if (screen === "INVOICE" || screen === "INVOICES") {
    return mapInvoicePermission(permissionType);
  }

  if (screen === "CAMPAIGN" || screen === "CAMPAIGNS") {
    return mapCampaignPermission(permissionType);
  }

  if (screen === "INVOICE_MATCHING" || screen === "MATCHING") {
    return mapInvoiceMatchingPermission(permissionType);
  }

  if (screen === "PAYMENTS" || screen === "PAYMENT") {
    return mapPaymentsPermission(permissionType);
  }

  if (screen === "PAYMENT_BATCHES" || screen === "PAYMENT_BATCH") {
    return mapPaymentBatchesPermission(permissionType);
  }

  if (screen === "TAX" || screen === "TAX_MANAGEMENT") {
    return mapTaxPermission(permissionType);
  }

  if (screen === "REPORTS" || screen === "REPORT") {
    return mapReportsPermission(permissionType);
  }

  if (screen === "AUDIT_TRAIL" || screen === "AUDIT") {
    return mapAuditTrailPermission(permissionType);
  }

  if (screen === "BANKING" || screen === "BANK") {
    return mapBankingPermission(permissionType);
  }

  if (screen === "ROLES" || screen === "USER_ROLES" || screen === "MANAGE_ROLE") {
    return mapRolesPermission(permissionType);
  }

  if (screen === "SETTINGS") {
    return mapSettingsPermission(permissionType);
  }

  if (screen === "CATEGORY" || screen === "CATEGORIES") {
    return mapCategoryPermission(permissionType);
  }

  if (
    screen === "VENDOR_APPROVAL_WORKFLOW" ||
    screen === "VENDOR_WORKFLOW" ||
    screen === "APPROVAL_WORKFLOW" ||
    screen === "WORKFLOW"
  ) {
    return mapVendorWorkflowPermission(permissionType);
  }

  return null;
};

const getPermissionsArrayFromResponse = (response) => {
  if (Array.isArray(response)) {
    return response.flatMap((role) =>
      Array.isArray(role?.permissions) ? role.permissions : [],
    );
  }

  const directPermissions = response?.permissions;
  if (Array.isArray(directPermissions)) return directPermissions;

  if (Array.isArray(response?.roles)) {
    return response.roles.flatMap((role) =>
      Array.isArray(role?.permissions) ? role.permissions : [],
    );
  }

  if (Array.isArray(response?.data)) {
    return response.data.flatMap((role) =>
      Array.isArray(role?.permissions) ? role.permissions : [],
    );
  }

  const nestedPermissions = response?.data?.permissions;
  if (Array.isArray(nestedPermissions)) return nestedPermissions;

  return [];
};

export const normalizeCustomRolePermissionsResponse = (response) => {
  const permissionsRaw = getPermissionsArrayFromResponse(response);
  const canonicalSet = new Set();
  const unmappedPermissions = [];

  permissionsRaw.forEach((entry) => {
    const canonicalPermission = mapScreenPermissionToCanonical(
      entry?.screen,
      entry?.permissionType,
    );

    if (canonicalPermission) {
      toArray(canonicalPermission).forEach((permission) => canonicalSet.add(permission));
      return;
    }

    unmappedPermissions.push({
      screen: entry?.screen ?? null,
      permissionType: entry?.permissionType ?? null,
    });
  });

  return {
    raw: response ?? null,
    permissionsRaw,
    canonicalPermissions: Array.from(canonicalSet),
    unmappedPermissions,
  };
};

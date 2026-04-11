const normalizeRoleToken = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

// Exact permission catalog ported from AP_User Roles source dialogs.
export const PERMISSION_GROUPS = [
  {
    title: "Dashboard",
    permissions: [{ id: "dashboard-view", label: "View Only" }],
  },
  {
    title: "Vendors",
    permissions: [
      { id: "vendors-view", label: "View Only" },
      { id: "vendors-manage", label: "Manage (Add, Delete, Edit) Vendors" },
      { id: "vendors-approve", label: "Approve Vendors" },
    ],
  },
  {
    title: "Purchase Order",
    permissions: [
      { id: "po-manage", label: "Manage (Create, Delete, Edit) Orders" },
      { id: "po-approve", label: "Approve Orders" },
      { id: "po-view", label: "View Only" },
    ],
  },
  {
    title: "GRN",
    permissions: [
      { id: "grn-manage", label: "Manage (Create, Delete, Edit) GRN" },
      { id: "grn-approve", label: "Approve GRN" },
      { id: "grn-view", label: "View Only" },
    ],
  },
  {
    title: "PI",
    permissions: [
      { id: "pi-manage", label: "Manage (Upload, Delete) PI" },
      { id: "pi-approve", label: "Approve PI" },
      { id: "pi-view", label: "View Only" },
    ],
  },
  {
    title: "Invoice",
    permissions: [
      { id: "invoice-maker", label: "Maker (Upload, Edit, Delete)" },
      { id: "invoice-checker", label: "Checker" },
      { id: "invoice-approver", label: "Approver" },
    ],
  },
  {
    title: "Invoice Matching",
    permissions: [
      { id: "matching-manage", label: "Manage" },
      { id: "matching-view", label: "View Only" },
    ],
  },
  {
    title: "Approval",
    permissions: [{ id: "approval-full", label: "Full Access" }],
  },
  {
    title: "Payments / Payment Batches",
    permissions: [
      { id: "payments-manage", label: "Manage" },
      { id: "payments-view", label: "View Only" },
    ],
  },
  {
    title: "Tax Management",
    permissions: [
      { id: "tax-view", label: "View Only" },
      { id: "tax-manage", label: "Manage" },
    ],
  },
  {
    title: "Reports",
    permissions: [{ id: "reports-full", label: "Full Access" }],
  },
  {
    title: "Banking",
    permissions: [{ id: "banking-full", label: "Full Access" }],
  },
  {
    title: "Manage Role",
    permissions: [
      { id: "roles-view", label: "View Only" },
      { id: "roles-manage", label: "Manage" },
    ],
  },
  {
    title: "Settings",
    permissions: [
      { id: "settings-org", label: "Manage Organisation Details" },
      { id: "settings-banking", label: "Manage Connected Banking" },
      { id: "settings-interaction", label: "Interaction Rules" },
    ],
  },
];

// Human-readable permission labels ported from AP_User Roles ViewRoleDialog.
export const PERMISSION_LABELS = {
  "dashboard-view": "Dashboard - View Only",
  "dashboard-widgets": "Dashboard - Specific Widget(s) Access",
  "vendors-view": "Vendors - View Only",
  "vendors-manage": "Vendors - Manage (Add, Delete, Edit)",
  "vendors-approve": "Vendors - Approve",
  "po-manage": "Purchase Orders - Manage",
  "po-approve": "Purchase Orders - Approve",
  "po-view": "Purchase Orders - View Only",
  "grn-manage": "GRN - Manage",
  "grn-approve": "GRN - Approve",
  "grn-view": "GRN - View Only",
  "pi-manage": "PI - Manage",
  "pi-approve": "PI - Approve",
  "pi-view": "PI - View Only",
  "invoice-maker": "Invoice - Maker",
  "invoice-checker": "Invoice - Checker",
  "invoice-approver": "Invoice - Approver",
  "matching-manage": "Invoice Matching - Manage",
  "matching-view": "Invoice Matching - View Only",
  "approval-full": "Approvals - Full Access",
  "payments-manage": "Payments - Manage",
  "payments-view": "Payments - View Only",
  "tax-view": "Tax Management - View Only",
  "tax-manage": "Tax Management - Manage",
  "reports-full": "Reports - Full Access",
  "banking-full": "Banking - Full Access",
  "roles-view": "Manage Roles - View Only",
  "roles-manage": "Manage Roles - Manage",
  "settings-org": "Settings - Manage Organisation",
  "settings-banking": "Settings - Manage Banking",
  "settings-interaction": "Settings - Interaction Rules",
};

// Source role definitions used as exact templates/fallbacks in the AP page.
export const ROLE_TEMPLATES = [
  {
    id: "1",
    name: "Admin",
    description: "Full system access with all permissions",
    permissionsCount: 28,
    permissions: [
      "dashboard-view",
      "dashboard-widgets",
      "vendors-view",
      "vendors-manage",
      "vendors-approve",
      "po-manage",
      "po-approve",
      "grn-manage",
      "grn-approve",
      "invoice-maker",
      "invoice-checker",
      "invoice-approver",
      "matching-manage",
      "approval-full",
      "payments-manage",
      "tax-manage",
      "reports-full",
      "banking-full",
      "roles-manage",
      "settings-org",
      "settings-banking",
      "settings-interaction",
    ],
    users: ["John Doe", "Sarah Chen"],
  },
  {
    id: "2",
    name: "Finance Manager",
    description: "Manage invoices, payments, and financial reports",
    permissionsCount: 15,
    permissions: [
      "dashboard-view",
      "invoice-maker",
      "invoice-checker",
      "invoice-approver",
      "matching-manage",
      "payments-manage",
      "tax-manage",
      "reports-full",
      "banking-full",
    ],
    users: ["Michael Brown", "Emily Johnson", "David Wilson"],
  },
  {
    id: "3",
    name: "Procurement Officer",
    description: "Handle purchase orders and vendor management",
    permissionsCount: 12,
    permissions: [
      "dashboard-view",
      "vendors-view",
      "vendors-manage",
      "po-manage",
      "po-approve",
      "grn-manage",
      "grn-approve",
    ],
    users: ["Lisa Anderson", "James Taylor"],
  },
  {
    id: "4",
    name: "Approver",
    description: "Approve invoices and payment requests",
    permissionsCount: 8,
    permissions: [
      "dashboard-view",
      "invoice-approver",
      "approval-full",
      "po-approve",
      "grn-approve",
    ],
    users: ["Robert Martinez"],
  },
];

const TEMPLATE_ALIASES = {
  1: ["admin", "administrator"],
  2: ["finance manager", "finance_manager", "finance-manager", "finance"],
  3: [
    "procurement officer",
    "procurement_officer",
    "procurement manager",
    "procurement-manager",
    "procurement",
  ],
  4: ["approver"],
};

// Resolves backend role names (including aliases) to source templates.
export const getRoleTemplateByName = (roleName = "") => {
  const normalizedRoleName = normalizeRoleToken(roleName);
  if (!normalizedRoleName) return null;

  const directTemplate = ROLE_TEMPLATES.find((template) => {
    return (
      normalizeRoleToken(template.name) === normalizedRoleName ||
      normalizeRoleToken(template.id) === normalizedRoleName
    );
  });
  if (directTemplate) return directTemplate;

  const matchedEntry = Object.entries(TEMPLATE_ALIASES).find(([, aliases]) =>
    aliases.some((alias) => normalizeRoleToken(alias) === normalizedRoleName),
  );
  if (!matchedEntry) return null;

  const [templateId] = matchedEntry;
  return ROLE_TEMPLATES.find((template) => template.id === templateId) || null;
};

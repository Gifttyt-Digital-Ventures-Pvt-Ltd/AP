// Exact permission catalog ported from AP_User Roles source dialogs.
export const MASTER_ADMIN_PERMISSION_ID = "master-admin";
export const AP_MASTER_ADMIN_BACKEND_SCREEN = "AP_MASTER_ADMIN";

export const PERMISSION_GROUPS = [
  {
    title: "Dashboard",
    permissions: [{ id: "dashboard-view", label: "View Only" }],
  },
  {
    title: "Vendors",
    permissions: [
      { id: "vendors-manage", label: "Manage (Add, Delete, Edit) Vendors" },
      { id: "vendors-approve", label: "Approve Vendors" },
      { id: "vendors-view", label: "View Only" },
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
    title: "Campaigns",
    permissions: [
      { id: "campaign-manage", label: "Manage (Create Campaign, Invoices, Advances, Settlement)" },
      { id: "campaign-approve", label: "Approve (Campaign Approval Only)" },
      { id: "campaign-view", label: "View Only" },
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
    title: "Payments",
    permissions: [
      { id: "payments-manage", label: "Manage" },
      { id: "payments-view", label: "View Only" },
    ],
  },
  {
    title: "Payment Batches",
    permissions: [
      { id: "payment-batches-manage", label: "Manage" },
      { id: "payment-batches-view", label: "View Only" },
    ],
  },
  {
    title: "Tax Management",
    permissions: [
      { id: "tax-manage", label: "Manage" },
      { id: "tax-view", label: "View Only" },
    ],
  },
  {
    title: "Reports",
    permissions: [{ id: "reports-full", label: "Full Access" }],
  },
  {
    title: "Audit Trail",
    permissions: [{ id: "audit-trail-view", label: "View Only" }],
  },
  {
    title: "Banking",
    permissions: [{ id: "banking-full", label: "Full Access" }],
  },
  {
    title: "Manage Role",
    permissions: [
      { id: "roles-manage", label: "Manage Roles (Create, Edit, Delete)" },
      { id: "roles-manage-users", label: "Manage Users (Create, Edit, Delete)" },
      { id: "roles-view", label: "View Only" },
    ],
  },
  {
    title: "Vendor Approval Workflow",
    permissions: [
      { id: "vendor-workflow-manage", label: "Manage (Add, Delete, Edit)" },
      { id: "vendor-workflow-view", label: "View Only" },
    ],
  },
  {
    title: "Settings",
    permissions: [
      { id: "settings-org", label: "Manage Organisation Details" },
      { id: "settings-banking", label: "Manage Connected Banking" },
      { id: "settings-interaction", label: "Integrations" },
    ],
  },
  {
    title: "Category",
    permissions: [
      { id: "category-view", label: "View Only" },
      { id: "category-manage", label: "Manage (Add, Delete, Edit)" },
    ],
  },
];

// Human-readable permission labels ported from AP_User Roles ViewRoleDialog.
export const PERMISSION_LABELS = {
  [MASTER_ADMIN_PERMISSION_ID]: "Master Admin - Full Access",
  "dashboard-view": "Dashboard - View Only",
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
  "invoice-view": "Invoice - View Only",
  "invoice-checker": "Invoice - Checker",
  "invoice-approver": "Invoice - Approver",
  "campaign-view": "Campaigns - View Only",
  "campaign-manage": "Campaigns - Manage",
  "campaign-approve": "Campaigns - Approve",
  "matching-manage": "Invoice Matching - Manage",
  "matching-view": "Invoice Matching - View Only",
  "payments-manage": "Payments - Manage",
  "payments-view": "Payments - View Only",
  "payment-batches-manage": "Payment Batches - Manage",
  "payment-batches-view": "Payment Batches - View Only",
  "tax-view": "Tax Management - View Only",
  "tax-manage": "Tax Management - Manage",
  "reports-view": "Reports - View Only",
  "reports-full": "Reports - Full Access",
  "audit-trail-view": "Audit Trail - View Only",
  "banking-view": "Banking - View Only",
  "banking-full": "Banking - Full Access",
  "roles-view": "Manage Roles - View Only",
  "roles-manage": "Manage Roles - Manage Roles",
  "roles-manage-users": "Manage Roles - Manage Users",
  "vendor-workflow-view": "Vendor Approval Workflow - View Only",
  "vendor-workflow-manage": "Vendor Approval Workflow - Manage",
  "settings-org": "Settings - Manage Organisation",
  "settings-banking": "Settings - Manage Banking",
  "settings-interaction": "Settings - Integrations",
  "category-view": "Category - View Only",
  "category-manage": "Category - Manage (Add, Delete, Edit)",
};

export const CAMPAIGN_PERMISSION_IDS = [
  "campaign-view",
  "campaign-manage",
  "campaign-approve",
];

export const CAMPAIGN_BACKEND_PERMISSION_TYPES = ["VIEW", "MANAGE", "APPROVE"];

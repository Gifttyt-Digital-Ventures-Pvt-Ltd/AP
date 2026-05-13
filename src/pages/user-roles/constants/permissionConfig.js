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
    title: "Vendor Approval Workflow",
    permissions: [
      { id: "vendor-workflow-view", label: "View Only" },
      { id: "vendor-workflow-manage", label: "Manage (Add, Delete, Edit)" },
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
  "matching-manage": "Invoice Matching - Manage",
  "matching-view": "Invoice Matching - View Only",
  "approval-view": "Approvals - View Only",
  "approval-full": "Approvals - Full Access",
  "payments-manage": "Payments - Manage",
  "payments-view": "Payments - View Only",
  "tax-view": "Tax Management - View Only",
  "tax-manage": "Tax Management - Manage",
  "reports-view": "Reports - View Only",
  "reports-full": "Reports - Full Access",
  "banking-view": "Banking - View Only",
  "banking-full": "Banking - Full Access",
  "roles-view": "Manage Roles - View Only",
  "roles-manage": "Manage Roles - Manage",
  "vendor-workflow-view": "Vendor Approval Workflow - View Only",
  "vendor-workflow-manage": "Vendor Approval Workflow - Manage",
  "settings-org": "Settings - Manage Organisation",
  "settings-banking": "Settings - Manage Banking",
  "settings-interaction": "Settings - Interaction Rules",
};

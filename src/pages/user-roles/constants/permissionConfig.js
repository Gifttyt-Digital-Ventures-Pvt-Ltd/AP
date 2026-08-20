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
    title: "Order Tracking",
    permissions: [
      { id: "order-tracking-manage", label: "Manage (Export Reports)" },
      { id: "order-tracking-view", label: "View Only" },
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
      { id: "payments-view", label: "View Only" },
      { id: "payments-manage", label: "Manage" },
      { id: "payments-admin", label: "Admin" },
      { id: "payments-requester", label: "Requester" },
      { id: "payments-approver", label: "Approver" },
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
    permissions: [
      { id: "banking-manage", label: "Manage" },
      { id: "banking-view", label: "View Only" },
    ],
  },
  {
    title: "Manage Role",
    permissions: [
      { id: "roles-manage", label: "Manage Roles (Create, Edit, Delete, Assign)" },
      { id: "roles-manage-users", label: "Manage Users (Create, Edit, Delete)" },
      { id: "roles-view", label: "View Only" },
    ],
  },
  {
    title: "Approval Workflow",
    permissions: [
      { id: "approval-workflow-manage", label: "Manage (Add, Delete, Edit)" },
      { id: "approval-workflow-view", label: "View Only" },
    ],
  },
  {
    title: "Payment Approval Workflow",
    permissions: [
      { id: "payment-approval-workflow-manage", label: "Manage Payment Workflows" },
      { id: "payment-approval-workflow-view", label: "View Payment Workflows" },
    ],
  },
  {
    title: "Settings",
    permissions: [
      { id: "settings-org", label: "Manage Organisation Details" },
      { id: "credits-manage", label: "Manage Billing" },
      { id: "notifications-manage", label: "Manage Notifications" },
    ],
  },
  {
    title: "Integrations",
    permissions: [{ id: "integrations-manage", label: "Manage Integrations" }],
  },
  {
    title: "Category",
    permissions: [
      { id: "category-view", label: "View Only" },
      { id: "category-manage", label: "Manage (Add, Delete, Edit)" },
    ],
  },
  {
    title: "Department",
    permissions: [
      { id: "department-view", label: "View Only" },
      { id: "department-manage", label: "Manage (Add, Delete, Edit)" },
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
  "order-tracking-manage": "Order Tracking - Manage (Export Reports)",
  "order-tracking-view": "Order Tracking - View Only",
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
  "payments-admin": "Payments - Admin",
  "payments-requester": "Payments - Requester",
  "payments-approver": "Payments - Approver",
  "payments-manage": "Payments - Manage",
  "payments-view": "Payments - View Only",
  "payment-batches-manage": "Payment Batches - Manage",
  "payment-batches-view": "Payment Batches - View Only",
  "credits-view": "Billing - View",
  "credits-ledger": "Billing - View Ledger",
  "credits-manage": "Settings - Manage Billing",
  "tax-view": "Tax Management - View Only",
  "tax-manage": "Tax Management - Manage",
  "reports-view": "Reports - View Only",
  "reports-full": "Reports - Full Access",
  "audit-trail-view": "Audit Trail - View Only",
  "banking-view": "Banking - View Only",
  "banking-manage": "Banking - Manage",
  "beneficiary-manage": "Banking - Manage Beneficiaries",
  "banking-full": "Banking - Full Access",
  "payouts-release": "Payments - Release ICICI Payout",
  "roles-view": "Manage Roles - View Only",
  "roles-manage": "Manage Roles - Manage Roles & Assign Role Sets",
  "roles-manage-users": "Manage Roles - Manage Users (no role assignment)",
  "approval-workflow-view": "Approval Workflow - View Only",
  "approval-workflow-manage": "Approval Workflow - Manage",
  "payment-approval-workflow-view": "Payment Approval Workflow - View Only",
  "payment-approval-workflow-manage": "Payment Approval Workflow - Manage",
  "settings-org": "Settings - Manage Organisation",
  "settings-banking": "Settings - Manage Banking",
  "notifications-manage": "Notifications - Manage",
  "integrations-manage": "Integrations - Manage",
  "category-view": "Category - View Only",
  "category-manage": "Category - Manage (Add, Delete, Edit)",
  "department-view": "Department - View Only",
  "department-manage": "Department - Manage (Add, Delete, Edit)",
};

export const CAMPAIGN_PERMISSION_IDS = [
  "campaign-view",
  "campaign-manage",
  "campaign-approve",
];

export const BILLING_PERMISSION_IDS = ["credits-manage"];

export const CAMPAIGN_BACKEND_PERMISSION_TYPES = ["VIEW", "MANAGE", "APPROVE"];

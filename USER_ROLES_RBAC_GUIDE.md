# User Roles RBAC Guide

## Purpose
This document explains how the User Roles module decides:

- which User Roles tabs are visible,
- which permission modules are shown or hidden,
- how `View Only` vs `Manage` access works,
- how backend `screen + permissionType` values map to frontend permission IDs,
- how disabled corporate modules are removed from role display and save payloads.

The main implementation lives in:

- `src/pages/user-roles/UserRoles.jsx`
- `src/pages/user-roles/constants/permissionConfig.js`
- `src/pages/user-roles/utils/roleAdapters.js`
- `src/constants/rbacPolicy.js`
- `src/contexts/RBACContext.jsx`

## High-Level RBAC Model
The app uses two layers of access control together:

1. **User permissions**
   - These are canonical frontend permission IDs like `roles-view`, `roles-manage`, `vendors-view`, `vendors-manage`, `invoice-maker`, etc.
   - For employees, these permissions usually come from assigned custom roles.
   - For corporate admins, the app grants `FULL_ACCESS`.

2. **Corporate entitlements**
   - These define which modules/sections are enabled for the corporate account.
   - They come from corporate screen/section APIs.
   - Even if a user has a permission, the UI still hides the module if the corporate entitlement is disabled.

A user can see or use something only when both layers allow it:

```txt
visible/usable = user permission allows it AND corporate module/section is enabled
```

## RBAC Data Sources

### Current User Context
`src/contexts/AuthContext.jsx` provides the authenticated user.

`src/contexts/RBACContext.jsx` then fetches additional context:

- `GET /corporate/user/details`
- `GET /corporate/custom-roles/employee/{employeeId}` for employee custom-role permissions
- corporate screen/section entitlement APIs

### Custom Role Permission Catalog
The User Roles page fetches role permission availability from:

```txt
GET /corporate/custom-roles/screens
```

In code this is used through `useGetCustomRoleScreensQuery()` in `UserRoles.jsx`.

The response is converted into supported permission keys such as:

```txt
PURCHASE_ORDER:MANAGE
INVOICE:MAKER
SETTINGS:INTERACTION
```

Those backend keys are then mapped to frontend canonical IDs such as:

```txt
po-manage
invoice-maker
settings-interaction
```

## Canonical Permission IDs
Frontend components do not work directly with raw backend `screen + permissionType` everywhere. They use canonical IDs.

Examples:

| Frontend Permission ID | Backend Screen | Backend Permission Type |
| --- | --- | --- |
| `dashboard-view` | `DASHBOARD` | `VIEW` |
| `vendors-view` | `VENDORS` | `VIEW` |
| `vendors-manage` | `VENDORS` | `MANAGE` |
| `vendors-approve` | `VENDORS` | `APPROVE` |
| `po-view` | `PURCHASE_ORDER` | `VIEW` |
| `po-manage` | `PURCHASE_ORDER` | `MANAGE` |
| `po-approve` | `PURCHASE_ORDER` | `APPROVE` |
| `grn-view` | `GRN` | `VIEW` |
| `grn-manage` | `GRN` | `MANAGE` |
| `grn-approve` | `GRN` | `APPROVE` |
| `invoice-maker` | `INVOICE` | `MAKER` |
| `invoice-checker` | `INVOICE` | `CHECKER` |
| `invoice-approver` | `INVOICE` | `APPROVER` |
| `matching-view` | `INVOICE_MATCHING` | `VIEW` |
| `matching-manage` | `INVOICE_MATCHING` | `MANAGE` |
| `payments-view` | `PAYMENTS` | `VIEW` |
| `payments-manage` | `PAYMENTS` | `MANAGE` |
| `payment-batches-view` | `PAYMENT_BATCHES` | `VIEW` |
| `payment-batches-manage` | `PAYMENT_BATCHES` | `MANAGE` |
| `tax-view` | `TAX_MANAGEMENT` | `VIEW` |
| `tax-manage` | `TAX_MANAGEMENT` | `MANAGE` |
| `reports-view` | `REPORTS` | `VIEW` |
| `reports-full` | `REPORTS` | `FULL` |
| `audit-trail-view` | `AUDIT_TRAIL` | `VIEW` |
| `banking-view` | `BANKING` | `VIEW` |
| `banking-full` | `BANKING` | `FULL` |
| `roles-view` | `MANAGE_ROLE` | `VIEW` |
| `roles-manage` | `MANAGE_ROLE` | `MANAGE` |
| `vendor-workflow-view` | `VENDOR_APPROVAL_WORKFLOW` | `VIEW` |
| `vendor-workflow-manage` | `VENDOR_APPROVAL_WORKFLOW` | `MANAGE` |
| `settings-org` | `SETTINGS` | `ORG` |
| `settings-banking` | `SETTINGS` | `BANKING` |
| `settings-interaction` | `SETTINGS` | `INTERACTION` |
| `category-view` | `CATEGORY` | `VIEW` |
| `category-manage` | `CATEGORY` | `MANAGE` |

The source of this mapping is `CUSTOM_ROLE_PERMISSION_MAP` in `src/pages/user-roles/utils/roleAdapters.js`.

## User Roles Route Access
The `/user-roles` route is protected by route permission rules and corporate entitlement rules.

### Permission Rule
In `src/constants/rbacPolicy.js`, `/user-roles` requires at least one of:

```txt
roles-view
roles-manage
vendor-workflow-view
vendor-workflow-manage
category-view
category-manage
```

This means the page can be opened by users who only have access to one sub-area, such as Approval Workflow, without requiring full user-management access.

### Corporate Entitlement Rule
The same route also requires at least one enabled User Roles section:

```txt
MANAGE_ROLE_USERS
MANAGE_ROLE_ROLES_PERMISSIONS
MANAGE_ROLE_APPROVAL_WORKFLOW
MANAGE_ROLE_CATEGORIES
```

If the user permission exists but the corporate section is disabled, the route/subtab is hidden.

## User Roles Tabs
`UserRoles.jsx` computes tab visibility independently for each tab.

### Users Tab
Visible when:

```txt
(user has roles-view OR roles-manage)
AND corporate section MANAGE_ROLE_USERS is enabled
```

Code concept:

```js
canViewUsersTab = canViewRoles && isCorporateSectionEnabled("MANAGE_ROLE_USERS")
```

Important behavior:

- Users can view the Users tab with `roles-view` or `roles-manage`.
- Adding/editing/deleting employee records is not granted by `roles-manage`.
- Employee add/edit/delete currently requires `FULL_ACCESS` through action rules.

### Roles & Permissions Tab
Visible when:

```txt
(user has roles-view OR roles-manage)
AND corporate section MANAGE_ROLE_ROLES_PERMISSIONS is enabled
```

Code concept:

```js
canViewRolesTab = canViewRoles && isCorporateSectionEnabled("MANAGE_ROLE_ROLES_PERMISSIONS")
```

Behavior:

- `roles-view` can see roles and permissions.
- `roles-manage` can create/update/delete custom roles and assign role sets.
- Disabled module permissions are hidden from role cards, role details, and permission pickers.

### Approval Workflow Tab
Visible when:

```txt
(user has vendor-workflow-view OR vendor-workflow-manage)
AND corporate section MANAGE_ROLE_APPROVAL_WORKFLOW is enabled
```

Code concept:

```js
canViewWorkflowTab = canViewWorkflow && isCorporateSectionEnabled("MANAGE_ROLE_APPROVAL_WORKFLOW")
```

Behavior:

- `vendor-workflow-view` can view/test workflows where allowed.
- `vendor-workflow-manage` can create, update, delete, and toggle workflows.

### Categories Tab
Visible when:

```txt
(user has category-view OR category-manage)
AND category feature is enabled for the corporate
```

Code concept:

```js
canViewCategoriesTab = canViewCategories && isCategoryFeatureEnabled
```

Behavior:

- `category-view` can see categories.
- `category-manage` can create/update/delete categories.
- When category feature is disabled, Category permissions are hidden from role editing and removed from payloads.

## View Only vs Manage Access
The frontend treats `View Only` as read-only access. It can reveal pages/data, but it must not unlock mutations.

### Route Access vs Action Access
Route access is defined separately from action access.

- Route rules decide whether the page or tab can be opened.
- Action rules decide whether buttons and mutations are allowed.

For example:

```txt
roles-view
```

can show the User Roles page and relevant tabs, but does not allow creating/updating/deleting roles.

```txt
roles-manage
```

allows custom-role management actions.

Action checks use `useActionGuard()` and `canPerformAction()` rules from `src/constants/rbacPolicy.js`.

### User Roles Action Rules
Key action rules:

| Action | Required Permission |
| --- | --- |
| `roles.invite` | `FULL_ACCESS` |
| `roles.updateUserRole` | `FULL_ACCESS` |
| `roles.updateUserStatus` | `FULL_ACCESS` |
| `roles.deleteUser` | `FULL_ACCESS` |
| `roles.manageCustomRoles` | `roles-manage` |
| `workflow.create` | `vendor-workflow-manage` |
| `workflow.update` | `vendor-workflow-manage` |
| `workflow.delete` | `vendor-workflow-manage` |
| `workflow.switch` | `vendor-workflow-manage` |
| `workflow.test` | `vendor-workflow-view` or `vendor-workflow-manage` |
| `categories.create` | `category-manage` |
| `categories.update` | `category-manage` |
| `categories.delete` | `category-manage` |

## How Permission Modules Are Shown or Hidden
The role permission editor starts from the static permission catalog in `PERMISSION_GROUPS`:

```txt
Dashboard
Vendors
Purchase Order
GRN
PI
Invoice
Invoice Matching
Payments
Payment Batches
Tax Management
Reports
Audit Trail
Banking
Manage Role
Vendor Approval Workflow
Settings
Category
```

Then it filters every permission using two checks:

1. **Corporate entitlement check**
2. **Backend custom-role screen catalog check**

Only permissions passing both checks are shown.

## Corporate Entitlement Filtering
`UserRoles.jsx` uses `isMappedPermissionEntitled()` to decide if a backend permission belongs to an enabled corporate module.

Rules include:

| Backend Screen | Entitlement Behavior |
| --- | --- |
| `CATEGORY` | Allowed only when category feature is enabled |
| `VENDOR_APPROVAL_WORKFLOW` | Allowed when role approval workflow section is enabled |
| `SETTINGS` + `ORG` | Requires `SETTINGS_ORG_DETAILS` |
| `SETTINGS` + `BANKING` | Requires `SETTINGS_CONNECTED_BANKING` |
| `SETTINGS` + `INTERACTION` | Requires `SETTINGS_INTEGRATIONS` |
| `PAYMENTS` | Requires `PAYMENTS` screen and `PAYMENTS_ALL` section |
| `PAYMENT_BATCHES` | Requires `PAYMENT_BATCHES` screen and `PAYMENT_BATCHES_ALL` section |
| `BANKING` | Requires `SETTINGS_CONNECTED_BANKING` |
| Other screens | Use `isCorporateScreenAllowed(screen)` |

This means if `PURCHASE_ORDER` is not enabled for a corporate, all Purchase Order permissions are hidden from the permission editor.

## Backend Custom-Role Catalog Filtering
The backend can return a custom-role permission catalog from:

```txt
GET /corporate/custom-roles/screens
```

The frontend builds two sets:

1. `supportedCustomRolePermissionKeys`
   - Raw backend keys in `SCREEN:PERMISSION_TYPE` format.
   - Used before create/update payload submit.

2. `availablePermissionKeys`
   - Canonical frontend permission IDs.
   - Used to hide permissions from the role editor.

If the backend catalog is present, only permissions returned by that catalog are selectable.

If the backend catalog is absent or empty, the UI falls back to static `PERMISSION_GROUPS`, but still applies corporate entitlement filtering.

## Hidden Permission Groups
A permission group is removed entirely when all permissions inside it are filtered out.

Example:

If `PURCHASE_ORDER` is disabled for the corporate:

- `po-view` is hidden.
- `po-manage` is hidden.
- `po-approve` is hidden.
- The full **Purchase Order** group disappears from the Add/Edit Role permission picker.
- Existing backend Purchase Order permissions are also removed from role details and counts.

This prevents users from seeing modules their corporate has not enabled.

## Existing Role Display Filtering
Backend role responses may still include permissions for modules that are now disabled for the corporate.

To avoid showing those stale permissions, `UserRoles.jsx` computes:

```txt
visiblePermissionIds
```

from the filtered permission groups, then maps every backend role through:

```txt
filterRoleForVisiblePermissions(role)
```

This filters:

- `role.permissions`
- `role.permissionEntries`
- `role.permissionsCount`

So role cards and role detail dialogs only display permissions that are currently enabled for the corporate.

## Create/Update Payload Filtering
Before custom-role create/update, selected frontend permission IDs are mapped to backend payload entries.

Example selected IDs:

```json
["dashboard-view", "po-manage", "invoice-maker"]
```

become backend entries:

```json
[
  { "screen": "DASHBOARD", "permissionType": "VIEW" },
  { "screen": "PURCHASE_ORDER", "permissionType": "MANAGE" },
  { "screen": "INVOICE", "permissionType": "MAKER" }
]
```

Then `filterMappedPermissionsForCorporate()` removes anything that is not allowed.

A permission is kept only when:

```txt
screen exists
AND permissionType exists
AND permission exists in backend custom-role catalog when catalog is available
AND corporate entitlement allows that screen/section
```

If disabled permissions are removed, the user sees an info toast:

```txt
Permissions from disabled modules were removed from the role payload
```

If all permissions are removed, the save is blocked:

```txt
Select at least one permission enabled for your corporate setup
```

This prevents backend errors like:

```txt
Screen 'PURCHASE_ORDER' is not enabled for this corporate
```

## Create Role Flow
When creating a custom role:

1. User selects permissions from filtered permission groups.
2. UI maps canonical IDs to backend `screen + permissionType` entries.
3. UI removes unsupported/disabled permissions.
4. UI sends `POST /corporate/custom-roles`.
5. After success, roles are refetched.
6. Created role is normalized to UI shape and filtered again for visible permissions.
7. Dialog opens in assign-users mode.

Payload shape:

```json
{
  "roleCode": "CUSTOM_EXAMPLE_ROLE",
  "roleName": "Example Role",
  "description": "Optional description",
  "permissions": [
    { "screen": "DASHBOARD", "permissionType": "VIEW" },
    { "screen": "INVOICE", "permissionType": "MAKER" }
  ]
}
```

## Update Role Flow
When editing a custom role:

1. Dialog opens with already filtered visible permissions.
2. User edits role name, description, and permissions.
3. UI maps selected canonical IDs to backend entries.
4. UI removes unsupported/disabled permissions.
5. UI sends `PUT /corporate/custom-roles/{roleId}`.

Payload shape:

```json
{
  "roleName": "Updated Role",
  "description": "Updated description",
  "active": true,
  "permissions": [
    { "screen": "DASHBOARD", "permissionType": "VIEW" },
    { "screen": "SETTINGS", "permissionType": "INTERACTION" }
  ]
}
```

## Assign Role Sets Flow
Users can be assigned to custom roles from the User Roles module.

Access:

```txt
roles-manage OR FULL_ACCESS
```

Behavior:

- The assignment dialog receives `allRoles`, which are already filtered for visible permissions.
- Assign/remove operations use role employee endpoints.
- Multiple role sets can be assigned to the same employee.
- The role assignment roadmap is documented separately in `ROLE_ASSIGNMENT_WORKFLOW_PLAN.md`.

## Settings Permissions
Settings permissions are split into sub-permissions instead of one broad Settings permission.

| UI Label | Frontend ID | Backend Payload | Entitlement |
| --- | --- | --- | --- |
| Manage Organisation Details | `settings-org` | `SETTINGS` + `ORG` | `SETTINGS_ORG_DETAILS` |
| Manage Connected Banking | `settings-banking` | `SETTINGS` + `BANKING` | `SETTINGS_CONNECTED_BANKING` |
| Integrations | `settings-interaction` | `SETTINGS` + `INTERACTION` | `SETTINGS_INTEGRATIONS` |

Important naming note:

- `settings-interaction` is the canonical frontend ID.
- Backend permission type remains `INTERACTION`.
- User-facing label is **Integrations**.
- It should not be shown as **Interaction Rules**.

## Generic Approval Permission Is Hidden
The role editor intentionally does not expose generic Approval permissions.

Hidden backend screens:

```txt
APPROVAL
APPROVALS
```

Hidden frontend permissions:

```txt
approval-view
approval-full
```

Reason:

- Approval access should come from module-specific permissions.
- Invoice approvals use `invoice-checker` and `invoice-approver`.
- PO/GRN/payment approval permissions are module-specific when enabled.

## Corporate Admin Behavior
Corporate admins get:

```txt
FULL_ACCESS
```

This bypasses normal permission checks in `hasPermission()`.

However, corporate entitlements still matter for feature visibility. A corporate admin should not see disabled modules just because they have `FULL_ACCESS`.

## Employee Behavior
Employees normally receive canonical permissions from assigned custom roles:

```txt
GET /corporate/custom-roles/employee/{employeeId}
```

If custom-role permissions are returned, those are used as the source of truth.

If the custom-role endpoint errors, the app can fall back to direct legacy roles such as:

| Legacy Role | Fallback Permissions |
| --- | --- |
| `CHECKER` | `invoice-checker` |
| `APPROVER` | `invoice-approver` |
| `ACCOUNTANT` | `payments-manage`, `payments-view`, `payment-batches-manage`, `payment-batches-view`, `tax-manage` |

## Practical Examples

### Example 1: Purchase Order Disabled
Corporate setup does not enable `PURCHASE_ORDER`.

Result:

- Purchase Order permission group is hidden in Add/Edit Role.
- Existing role cards do not count Purchase Order permissions.
- Role detail dialog does not show Purchase Order permissions.
- Create/update payload removes `PURCHASE_ORDER` permissions before submit.
- Backend does not receive disabled PO permissions.

### Example 2: User Has `roles-view`
User has:

```txt
roles-view
```

Corporate has:

```txt
MANAGE_ROLE_USERS
MANAGE_ROLE_ROLES_PERMISSIONS
```

Result:

- User can open User Roles page.
- User can see Users tab and Roles & Permissions tab.
- User cannot create/update/delete custom roles.
- User cannot add/edit/delete employees.

### Example 3: User Has `roles-manage`
User has:

```txt
roles-manage
```

Corporate has:

```txt
MANAGE_ROLE_ROLES_PERMISSIONS
```

Result:

- User can see Roles & Permissions tab.
- User can create/update/delete custom roles.
- User can assign role sets.
- User still cannot add/edit/delete employee records unless they also have `FULL_ACCESS`.

### Example 4: Settings Integrations Enabled
Corporate has:

```txt
SETTINGS_INTEGRATIONS
```

Result:

- Settings Integrations permission is shown in the role editor.
- The backend payload uses `{ screen: "SETTINGS", permissionType: "INTERACTION" }`.
- The user-facing label is **Settings - Integrations**.

### Example 5: Category Feature Disabled
Corporate category feature is disabled.

Result:

- Category tab is hidden.
- Category permission group is hidden.
- Existing `category-view` and `category-manage` role permissions are hidden.
- Category permissions are removed from create/update role payloads.

## Testing Checklist
Use this checklist when changing User Roles RBAC logic.

### Module Visibility
- Disabled corporate modules are hidden from Add Role permission picker.
- Disabled corporate modules are hidden from Edit Role permission picker.
- Disabled corporate modules are hidden from View Role permission details.
- Disabled corporate modules are not counted in role card permission counts.
- Empty permission groups disappear completely.

### Payload Safety
- Create role payload includes only enabled `screen + permissionType` pairs.
- Update role payload includes only enabled `screen + permissionType` pairs.
- Disabled module permissions are removed before submit.
- Save is blocked if no enabled permission remains.
- Backend does not receive disabled screens like `PURCHASE_ORDER` when disabled.

### View vs Manage
- `roles-view` can view tabs/data but cannot mutate roles.
- `roles-manage` can manage custom roles.
- `FULL_ACCESS` is still required for employee add/edit/delete.
- `vendor-workflow-view` can view workflow areas.
- `vendor-workflow-manage` can mutate workflow areas.
- `category-view` can view categories.
- `category-manage` can mutate categories.

### Settings
- `settings-interaction` displays as **Integrations**.
- Backend payload remains `SETTINGS` + `INTERACTION`.
- Permission is shown only when `SETTINGS_INTEGRATIONS` is enabled.

## Key Files

| File | Responsibility |
| --- | --- |
| `src/pages/user-roles/UserRoles.jsx` | Tab visibility, module filtering, custom-role payload filtering, role display filtering |
| `src/pages/user-roles/constants/permissionConfig.js` | Static permission groups and labels |
| `src/pages/user-roles/utils/roleAdapters.js` | Canonical permission mapping and role normalization |
| `src/constants/rbacPolicy.js` | Route and action permission rules |
| `src/contexts/RBACContext.jsx` | Effective permissions, corporate entitlement helpers, route/action checks |
| `src/hooks/useActionGuard.js` | Runtime mutation guard used by submit/delete handlers |
| `src/Services/apis/corporateApi.js` | Corporate user, role, employee, and custom-role endpoints |

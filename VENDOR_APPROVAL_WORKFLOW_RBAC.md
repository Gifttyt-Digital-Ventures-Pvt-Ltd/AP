# Vendor Approval Workflow RBAC

This document captures the expected request/response shape for custom roles that grant access to the Vendor Approval Workflow tab in the AP Portal.

## Permission Screen

Use this backend screen token:

```json
"VENDOR_APPROVAL_WORKFLOW"
```

Supported permission types:

```json
"VIEW"
"MANAGE"
```

Frontend mapping:

| Backend screen | Backend permissionType | Frontend permission |
|---|---|---|
| `VENDOR_APPROVAL_WORKFLOW` | `VIEW` | `vendor-workflow-view` |
| `VENDOR_APPROVAL_WORKFLOW` | `MANAGE` | `vendor-workflow-manage` |

## Behavior

- `VIEW`: user can open User Roles and view the Approval Workflow tab.
- `MANAGE`: user can create, edit, delete, switch, and test workflow rules.
- `VIEW` does not allow workflow mutations.
- `MANAGE` is sufficient for workflow management. Include `VIEW` too only if the backend requires explicit view permission.

## Create Role Request

Recommended manage-role request:

```json
{
  "roleCode": "CUSTOM_VENDOR_FLOW",
  "roleName": "Vendor flow",
  "description": "",
  "permissions": [
    {
      "screen": "VENDOR_APPROVAL_WORKFLOW",
      "permissionType": "MANAGE"
    }
  ]
}
```

View-only request:

```json
{
  "roleCode": "CUSTOM_VENDOR_FLOW_VIEW",
  "roleName": "Vendor flow viewer",
  "description": "",
  "permissions": [
    {
      "screen": "VENDOR_APPROVAL_WORKFLOW",
      "permissionType": "VIEW"
    }
  ]
}
```

If the backend requires both explicit view and manage permissions:

```json
{
  "roleCode": "CUSTOM_VENDOR_FLOW",
  "roleName": "Vendor flow",
  "description": "",
  "permissions": [
    {
      "screen": "VENDOR_APPROVAL_WORKFLOW",
      "permissionType": "VIEW"
    },
    {
      "screen": "VENDOR_APPROVAL_WORKFLOW",
      "permissionType": "MANAGE"
    }
  ]
}
```

## Expected Create Role Response

```json
{
  "id": 5,
  "roleCode": "CUSTOM_VENDOR_FLOW",
  "roleName": "Vendor flow",
  "description": "",
  "corpId": "370Zhc",
  "active": true,
  "permissions": [
    {
      "screen": "VENDOR_APPROVAL_WORKFLOW",
      "screenDisplayName": "Vendor Approval Workflow",
      "permissionType": "MANAGE",
      "permissionTypeDisplayName": "Manage"
    }
  ],
  "assignedEmployees": [],
  "createdAt": "2026-05-13T10:30:00.000",
  "updatedAt": "2026-05-13T10:30:00.000"
}
```

## Employee Custom Roles Response

Endpoint:

```txt
GET /corporate/custom-roles/employee/{employeeId}
```

Expected response:

```json
[
  {
    "id": 5,
    "roleCode": "CUSTOM_VENDOR_FLOW",
    "roleName": "Vendor flow",
    "description": "",
    "corpId": "370Zhc",
    "active": true,
    "permissions": [
      {
        "screen": "VENDOR_APPROVAL_WORKFLOW",
        "screenDisplayName": "Vendor Approval Workflow",
        "permissionType": "MANAGE",
        "permissionTypeDisplayName": "Manage"
      }
    ],
    "assignedEmployees": [
      {
        "id": 110,
        "name": "test idds",
        "email": "test@idds.com"
      }
    ],
    "createdAt": "2026-05-13T10:30:00.000",
    "updatedAt": "2026-05-13T10:30:00.000"
  }
]
```

## Frontend Route Access

The workflow tab lives inside:

```txt
/user-roles
```

The `/user-roles` route is accessible when the user has any of:

```txt
roles-view
roles-manage
vendor-workflow-view
vendor-workflow-manage
```

When the user only has workflow permissions, the page shows the Approval Workflow tab and hides the Users/Roles tabs.

## Frontend Action Rules

Workflow actions are guarded by:

```js
"workflow.create": { anyOf: ["vendor-workflow-manage"] }
"workflow.update": { anyOf: ["vendor-workflow-manage"] }
"workflow.delete": { anyOf: ["vendor-workflow-manage"] }
"workflow.switch": { anyOf: ["vendor-workflow-manage"] }
"workflow.test": { anyOf: ["vendor-workflow-view", "vendor-workflow-manage"] }
```

## API Access By Permission

The frontend renders the Approval Workflow tab when the user has either `vendor-workflow-view` or `vendor-workflow-manage`.

Read/reference APIs are accessible for both `VIEW` and `MANAGE` users:

| Permission | Method | Endpoint | Purpose |
|---|---:|---|---|
| `VIEW` or `MANAGE` | `GET` | `/workflow/type` | Load available workflow types |
| `VIEW` or `MANAGE` | `GET` | `/workflow/invoice-approver` | Load approver directory |
| `VIEW` or `MANAGE` | `GET` | `/workflow/list` | Load configured workflow rules |
| `VIEW` or `MANAGE` | `GET` | `/corporate/departments` | Load departments for rule conditions |
| `VIEW` or `MANAGE` | `POST` | `/workflow/test` | Test which rule would match a vendor/department/amount |

Mutation APIs require `MANAGE`:

| Permission | Method | Endpoint | Purpose |
|---|---:|---|---|
| `MANAGE` only | `POST` | `/workflow/create` | Create workflow rule |
| `MANAGE` only | `PATCH` | `/workflow/update` | Update workflow rule |
| `MANAGE` only | `PATCH` | `/workflow/switch` | Enable/disable workflow rule |
| `MANAGE` only | `DELETE` | `/workflow/delete` | Delete workflow rule |

### View-Only User

With only:

```json
{
  "screen": "VENDOR_APPROVAL_WORKFLOW",
  "permissionType": "VIEW"
}
```

The user can call/read:

```txt
GET /workflow/type
GET /workflow/invoice-approver
GET /workflow/list
POST /workflow/test
```

The user cannot create, update, switch, or delete workflows.

### Manage User

With:

```json
{
  "screen": "VENDOR_APPROVAL_WORKFLOW",
  "permissionType": "MANAGE"
}
```

The user can use all read/test APIs plus:

```txt
POST /workflow/create
PATCH /workflow/update
PATCH /workflow/switch
DELETE /workflow/delete
```

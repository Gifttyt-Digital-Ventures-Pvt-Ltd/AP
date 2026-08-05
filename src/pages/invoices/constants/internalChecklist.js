/**
 * Internal Checklist item catalog — manual operational checks performed by
 * internal employees (e.g. Asset Verification, Insurance, Asset Approval).
 * This is a separate concern from the OCR/mandatory-field completion
 * checklist and from Invoice Matching's checklist; nothing here is shared
 * with either.
 *
 * This is a fixed, code-defined catalog (adding a brand-new item still
 * requires a code change). What IS admin-configurable per corp, without a
 * deploy, is which of these are active — see OptifiiAdmin's "Internal
 * Checklist" → "Internal Checklist Items" panel, which writes
 * `activeInternalChecklistItems` onto `corporateScreens`. InvoiceForm.jsx
 * filters this catalog down to that active set (falling back to showing
 * everything when a corp hasn't configured it yet).
 *
 * The `id` values below are deliberately the same section ids OptifiiAdmin
 * uses (`INTERNAL_CHECKLIST_ITEM_SECTIONS` in apModules.js) so
 * `activeInternalChecklistItems` can be matched directly with no
 * translation layer.
 */
export const INTERNAL_CHECKLIST_ITEMS = [
  { id: "INTERNAL_CHECKLIST_ITEM_ASSET_VERIFICATION", label: "Asset Verification" },
  { id: "INTERNAL_CHECKLIST_ITEM_INSURANCE", label: "Insurance" },
  { id: "INTERNAL_CHECKLIST_ITEM_ASSET_APPROVAL", label: "Asset Approval" },
];

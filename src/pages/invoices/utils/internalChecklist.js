import { INTERNAL_CHECKLIST_ITEMS } from '../constants/internalChecklist';

/**
 * Builds the Internal Checklist form-state array from the item catalog,
 * matching the shape the backend is expected to persist/return later:
 *   { itemId, isChecked, note }
 * Any entries already present in `existing` (e.g. loaded on an invoice
 * being edited) are preserved by itemId; catalog items not yet present in
 * `existing` are added with default unchecked/blank values.
 *
 * If a definition is later retired/renamed/removed from `items`, any
 * `existing` response recorded against its itemId is kept at the end of the
 * returned array ("orphaned") rather than dropped — retiring a definition
 * must not delete history already recorded against an invoice. Callers that
 * render an editable list should iterate `items` (never `values` directly)
 * so orphaned entries are naturally excluded from the editable UI while
 * still round-tripping through the saved payload. Use
 * `partitionInternalChecklistValues` to split active vs. orphaned entries
 * for display.
 */
export const buildInternalChecklistState = (existing = [], items = INTERNAL_CHECKLIST_ITEMS) => {
  const existingList = Array.isArray(existing) ? existing : [];
  const itemList = Array.isArray(items) ? items : [];
  const activeItemIds = new Set(itemList.map((item) => String(item.id)));
  const existingByItemId = new Map(
    existingList.map((entry) => [String(entry?.itemId ?? ''), entry]),
  );

  const active = itemList.map((item) => {
    const found = existingByItemId.get(String(item.id));
    return {
      itemId: item.id,
      isChecked: Boolean(found?.isChecked),
      note: found?.note ?? '',
    };
  });

  const orphaned = existingList
    .filter((entry) => !activeItemIds.has(String(entry?.itemId ?? '')))
    .map((entry) => ({
      itemId: entry.itemId,
      isChecked: Boolean(entry?.isChecked),
      note: entry?.note ?? '',
    }));

  return [...active, ...orphaned];
};

/**
 * Splits a checklist state array into entries whose itemId still matches an
 * active definition ("active") vs. ones that don't ("orphaned" — recorded
 * against a definition that's since been retired/renamed/removed). Used to
 * render the editable list from `active` and a read-only history section
 * from `orphaned`, without ever deleting the orphaned data itself.
 */
export const partitionInternalChecklistValues = (values = [], items = INTERNAL_CHECKLIST_ITEMS) => {
  const itemList = Array.isArray(items) ? items : [];
  const activeItemIds = new Set(itemList.map((item) => String(item.id)));
  const valueList = Array.isArray(values) ? values : [];

  return {
    active: valueList.filter((entry) => activeItemIds.has(String(entry?.itemId ?? ''))),
    orphaned: valueList.filter((entry) => !activeItemIds.has(String(entry?.itemId ?? ''))),
  };
};

/** Returns a new checklist array with one entry's checked state and/or note updated. */
export const updateInternalChecklistEntry = (checklist = [], itemId, changes = {}) =>
  (Array.isArray(checklist) ? checklist : []).map((entry) =>
    String(entry.itemId) === String(itemId) ? { ...entry, ...changes } : entry,
  );

/**
 * Filters the (fixed, code-defined) item catalog down to the subset an
 * OptifiiAdmin operator has marked active for this corp
 * (`corporateScreens.activeInternalChecklistItems`). Matches the same
 * "empty/unconfigured means show everything" default already used
 * elsewhere in this app (e.g. GST tab configuration) — a corp that has
 * never opened that admin panel gets the full catalog rather than an
 * empty checklist, and an admin has to make an active choice to actually
 * narrow it down.
 */
export const getActiveInternalChecklistItems = (
  activeInternalChecklistItems = [],
  items = INTERNAL_CHECKLIST_ITEMS,
) => {
  const itemList = Array.isArray(items) ? items : [];
  const activeIds = Array.isArray(activeInternalChecklistItems)
    ? activeInternalChecklistItems
    : [];

  if (activeIds.length === 0) return itemList;

  const activeIdSet = new Set(activeIds.map((id) => String(id)));
  return itemList.filter((item) => activeIdSet.has(String(item.id)));
};

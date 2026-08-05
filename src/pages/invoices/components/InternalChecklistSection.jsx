import React from "react";
import { Checkbox } from "../../../components/ui/checkbox";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import {
  partitionInternalChecklistValues,
  updateInternalChecklistEntry,
} from "../utils/internalChecklist";

/**
 * Internal Checklist — manual operational checks performed by internal
 * employees (Asset Verification, Insurance, Asset Approval, etc). This is
 * intentionally separate from the OCR/completion checklist sidebar
 * (InvoiceFormChecklist.jsx) and from Invoice Matching's checklist: no
 * component, state, or naming is shared with either.
 *
 * Purely presentational — it has no knowledge of where `items` comes from
 * (local mock data today, a real API later). The caller (InvoiceForm) owns
 * that decision entirely, so swapping the mock catalog for a real one is a
 * one-file change with zero edits needed here.
 *
 * `items` is the *active* checklist item catalog ({ id, label }[]) — only
 * these render as editable rows.
 * `values` is the full per-invoice checklist state ({ itemId, isChecked,
 * note }[]), owned by the parent form (InvoiceForm) via `onChange`. It may
 * contain entries whose itemId no longer matches anything in `items` (the
 * definition was retired/renamed/removed) — those are never edited or
 * dropped, only shown read-only, so retiring a definition can't delete
 * history already recorded against an invoice.
 */
const InternalChecklistSection = ({
  items = [],
  values = [],
  onChange,
}) => {
  const { active: activeValues, orphaned: orphanedValues } = partitionInternalChecklistValues(
    values,
    items,
  );

  if (items.length === 0 && orphanedValues.length === 0) return null;

  const activeValuesByItemId = new Map(
    activeValues.map((entry) => [String(entry.itemId), entry]),
  );

  const handleToggle = (itemId, isChecked) => {
    onChange?.(updateInternalChecklistEntry(values, itemId, { isChecked }));
  };

  const handleNoteChange = (itemId, note) => {
    onChange?.(updateInternalChecklistEntry(values, itemId, { note }));
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-800">Internal Checklist</h3>

      {items.length > 0 && (
        <div className="space-y-3">
          {items.map((item) => {
            const value = activeValuesByItemId.get(String(item.id));
            const checkboxId = `internal-checklist-${item.id}`;
            const noteId = `internal-checklist-note-${item.id}`;

            return (
              <div
                key={item.id}
                className="rounded-lg border border-border p-3 space-y-2"
                data-testid={`internal-checklist-item-${item.id}`}
              >
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={checkboxId}
                    checked={Boolean(value?.isChecked)}
                    onCheckedChange={(checked) => handleToggle(item.id, Boolean(checked))}
                    data-testid={checkboxId}
                  />
                  <Label htmlFor={checkboxId} className="cursor-pointer text-xs">
                    {item.label}
                  </Label>
                </div>
                <div>
                  <Label htmlFor={noteId} className="text-xs text-muted-foreground">
                    Note
                  </Label>
                  <Input
                    id={noteId}
                    value={value?.note || ""}
                    onChange={(e) => handleNoteChange(item.id, e.target.value)}
                    disabled={!value?.isChecked}
                    placeholder={
                      value?.isChecked ? "Add a note (optional)" : "Check the item to add a note"
                    }
                    className="h-6 text-xs"
                    data-testid={noteId}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {orphanedValues.length > 0 && (
        <div
          className="space-y-2 rounded-lg border border-dashed border-border bg-muted/30 p-3"
          data-testid="internal-checklist-orphaned-section"
        >
          <p className="text-xs font-medium text-muted-foreground">
            Retired checklist items (read-only, kept for history)
          </p>
          <div className="space-y-2">
            {orphanedValues.map((entry) => (
              <div
                key={entry.itemId}
                className="flex items-start gap-2"
                data-testid={`internal-checklist-orphaned-${entry.itemId}`}
              >
                <Checkbox checked={Boolean(entry.isChecked)} disabled className="mt-0.5" />
                <div className="min-w-0 space-y-0.5">
                  <p className="text-xs text-muted-foreground">
                    Checklist item (ID: {entry.itemId})
                  </p>
                  {entry.note ? (
                    <p className="text-xs text-foreground">{entry.note}</p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default InternalChecklistSection;

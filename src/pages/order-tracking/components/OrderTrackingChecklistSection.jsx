import React, { useState } from "react";
import { Loader2, Pencil, Save, X } from "lucide-react";
import { Checkbox } from "../../../components/ui/checkbox";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";

const cloneChecklistItems = (items = []) =>
  (Array.isArray(items) ? items : []).map((item) => ({
    itemId: item.itemId,
    label: item.label,
    isChecked: Boolean(item.isChecked),
    note: item.note || "",
  }));

/**
 * Shared order-level checklist. Backend owns the source of truth and syncs
 * PI/TI edits back to the same order checklist.
 */
const OrderTrackingChecklistSection = ({
  checklist,
  onSave,
  isSaving = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draftItems, setDraftItems] = useState([]);

  if (checklist.totalCount === 0) {
    return <p className="text-sm text-muted-foreground">No internal checklist configured for this order.</p>;
  }

  const visibleItems = isEditing ? draftItems : checklist.items;
  const completeCount = visibleItems.filter((item) => item.isChecked).length;
  const totalCount = visibleItems.length;

  const startEditing = () => {
    setDraftItems(cloneChecklistItems(checklist.items));
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setDraftItems([]);
    setIsEditing(false);
  };

  const updateDraftItem = (itemId, changes) => {
    setDraftItems((prev) =>
      prev.map((item) =>
        String(item.itemId) === String(itemId) ? { ...item, ...changes } : item,
      ),
    );
  };

  const handleSave = async () => {
    const saved = await onSave?.(
      draftItems.map((item) => ({
        itemId: item.itemId,
        isChecked: Boolean(item.isChecked),
        note: item.note || "",
      })),
    );
    if (saved !== false) {
      setIsEditing(false);
      setDraftItems([]);
    }
  };

  return (
    <div className="space-y-2" data-testid="order-tracking-checklist-section">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {completeCount}/{totalCount} complete
        </p>
        {isEditing ? (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={cancelEditing}
              disabled={isSaving}
            >
              <X className="mr-1.5 h-3.5 w-3.5" />
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              data-testid="order-tracking-save-checklist-btn"
            >
              {isSaving ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="mr-1.5 h-3.5 w-3.5" />
              )}
              Save
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={startEditing}
            data-testid="order-tracking-edit-checklist-btn"
          >
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>
        )}
      </div>

      {visibleItems.map((item) => (
        <div key={item.itemId} className="flex items-start gap-2 rounded-md border border-border p-2 text-sm">
          <Checkbox
            checked={Boolean(item.isChecked)}
            disabled={!isEditing || isSaving}
            onCheckedChange={
              isEditing
                ? (checked) => updateDraftItem(item.itemId, { isChecked: Boolean(checked) })
                : undefined
            }
            className="mt-0.5"
          />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground">{item.label}</p>
            {isEditing ? (
              <Input
                value={item.note || ""}
                onChange={(event) => updateDraftItem(item.itemId, { note: event.target.value })}
                disabled={!item.isChecked || isSaving}
                placeholder={item.isChecked ? "Add a note (optional)" : "Check the item to add a note"}
                className="mt-1 h-7 text-xs"
              />
            ) : item.note ? (
              <p className="text-xs text-muted-foreground">{item.note}</p>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
};

export default OrderTrackingChecklistSection;

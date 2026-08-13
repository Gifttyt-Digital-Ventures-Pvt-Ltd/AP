import React from "react";
import { Checkbox } from "../../../components/ui/checkbox";

/**
 * Item-level list with checkboxes (spec §12.5). Read-only here — whether
 * items should be editable from the drawer, or read-only with editing on
 * the invoice, is an explicit open question (spec §19, §12.5) not decided
 * by this component. Grain (order-level vs invoice-level, per SOW §9
 * capturing checklist "at invoice upload") is also unresolved — this
 * section only renders whatever `checklist` the mapper hands it, isolated
 * from that decision rather than assuming one answer.
 */
const OrderTrackingChecklistSection = ({ checklist }) => {
  if (checklist.totalCount === 0) {
    return <p className="text-sm text-muted-foreground">No internal checklist configured for this order.</p>;
  }

  return (
    <div className="space-y-2" data-testid="order-tracking-checklist-section">
      <p className="text-xs text-muted-foreground">
        {checklist.completeCount}/{checklist.totalCount} complete
      </p>
      {checklist.items.map((item) => (
        <div key={item.itemId} className="flex items-start gap-2 rounded-md border border-border p-2 text-sm">
          <Checkbox checked={item.isChecked} disabled className="mt-0.5" />
          <div className="min-w-0">
            <p className="font-medium text-foreground">{item.label}</p>
            {item.note ? <p className="text-xs text-muted-foreground">{item.note}</p> : null}
          </div>
        </div>
      ))}
    </div>
  );
};

export default OrderTrackingChecklistSection;

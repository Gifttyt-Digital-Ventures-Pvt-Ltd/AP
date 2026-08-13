import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { cn } from "../../../lib/utils";
import { DELIVERY_STATUS_OPTIONS, DELIVERY_STATUS_UNSET_LABEL } from "../constants";

const UNSET_VALUE = "__UNSET__";
const HIGHLIGHT_VALUE = "ASSET_DELIVERED_INVOICE_AWAITED";

/**
 * Inline-editable delivery status cell (spec §9: "Set directly in this
 * screen's column via dropdown, writing immediately"). Must stay settable
 * with no TI present — this component has no such gate, the value comes
 * from the row regardless of document-chain state. Writes immediately on
 * change, no separate save step; remarks live in the drawer, not here
 * (spec §9).
 */
const DeliveryStatusSelect = ({ value, onChange, disabled = false, orderId }) => {
  const [saving, setSaving] = useState(false);
  const selectValue = value ?? UNSET_VALUE;

  const handleChange = async (nextValue) => {
    const resolved = nextValue === UNSET_VALUE ? null : nextValue;
    if (resolved === value) return;
    setSaving(true);
    try {
      await onChange?.(resolved);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Select value={selectValue} onValueChange={handleChange} disabled={disabled || saving}>
      <SelectTrigger
        className={cn(
          "h-8 w-auto min-w-[10rem] gap-2 px-2",
          value === HIGHLIGHT_VALUE && "bg-yellow-100 dark:bg-yellow-900/20",
        )}
        onClick={(event) => event.stopPropagation()}
        data-testid={`delivery-status-select-${orderId}`}
      >
        {saving ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        ) : (
          <SelectValue>
            <span className={`text-sm font-medium ${value ? "text-foreground" : "text-muted-foreground"}`}>
              {value ? DELIVERY_STATUS_OPTIONS.find((option) => option.value === value)?.label || value : DELIVERY_STATUS_UNSET_LABEL}
            </span>
          </SelectValue>
        )}
      </SelectTrigger>
      <SelectContent onClick={(event) => event.stopPropagation()}>
        <SelectItem value={UNSET_VALUE}>{DELIVERY_STATUS_UNSET_LABEL}</SelectItem>
        {DELIVERY_STATUS_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default DeliveryStatusSelect;

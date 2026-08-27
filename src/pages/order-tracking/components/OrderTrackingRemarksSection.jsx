import React, { useState } from "react";
import { Loader2, MessageSquarePlus } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Textarea } from "../../../components/ui/textarea";
import { formatDate } from "../utils";

const getRemarkKey = (entry = {}, index) =>
  entry.id || `${entry.timestamp || "remark"}-${index}`;

const OrderTrackingRemarksSection = ({
  remarks = [],
  onAddRemark,
  isAdding = false,
}) => {
  const [remark, setRemark] = useState("");
  const trimmedRemark = remark.trim();

  const handleSubmit = async () => {
    if (!trimmedRemark || isAdding) return;
    const added = await onAddRemark?.(trimmedRemark);
    if (added !== false) setRemark("");
  };

  return (
    <div className="space-y-3" data-testid="order-tracking-remarks-section">
      <div className="space-y-2">
        <Textarea
          value={remark}
          onChange={(event) => setRemark(event.target.value)}
          placeholder="Add an order remark"
          rows={3}
          disabled={isAdding}
          data-testid="order-tracking-remark-input"
        />
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={!trimmedRemark || isAdding}
            data-testid="order-tracking-add-remark-btn"
          >
            {isAdding ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <MessageSquarePlus className="mr-1.5 h-3.5 w-3.5" />
            )}
            Add Remark
          </Button>
        </div>
      </div>

      {remarks.length > 0 ? (
        <div className="space-y-2">
          {remarks.map((entry, index) => (
            <div
              key={getRemarkKey(entry, index)}
              className="rounded-md border border-border p-2.5 text-sm"
            >
              <p className="whitespace-pre-wrap text-foreground">{entry.remark}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {entry.userName || "Unknown user"}
                {entry.timestamp ? ` · ${formatDate(entry.timestamp)}` : ""}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No remarks added yet.</p>
      )}
    </div>
  );
};

export default OrderTrackingRemarksSection;

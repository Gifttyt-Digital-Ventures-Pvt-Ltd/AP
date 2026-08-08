import React from "react";
import { getPoDeliveryOverdueLabel, isPoDeliveryOverdue } from "../utils/poDeliveryOverdue";

const PoDeliveryDateCell = ({ po, formattedDate }) => {
  const overdue = isPoDeliveryOverdue(po);
  const overdueLabel = overdue ? getPoDeliveryOverdueLabel(po) : "";

  return (
    <div className="space-y-1">
      <span className="whitespace-nowrap">{formattedDate || "-"}</span>
      {overdue && overdueLabel ? (
        <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-medium leading-tight text-red-800">
          {overdueLabel}
        </span>
      ) : null}
    </div>
  );
};

export default PoDeliveryDateCell;

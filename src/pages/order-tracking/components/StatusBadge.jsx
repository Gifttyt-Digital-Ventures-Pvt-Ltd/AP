import React from "react";
import { Badge } from "../../../components/ui/badge";
import { DEFAULT_STATUS_BADGE_CLASS } from "../constants";

/**
 * Shared badge renderer for this page's four independent status columns
 * (Document/Payment/Delivery/Funding). No generic StatusBadge exists
 * elsewhere in the app to reuse — every module keeps its own local
 * Badge + color-map (see pages/purchase-orders/components/PoListTable.jsx,
 * pages/goods-receipt/components/GrnStatusBadge.jsx) — so this follows that
 * same convention, scoped to this page rather than introducing a new
 * cross-app component.
 */
const StatusBadge = ({ value, colorMap = {} }) => {
  if (!value) return <span className="text-muted-foreground">-</span>;

  return (
    <Badge variant="outline" className={`border-0 font-semibold ${colorMap[value] || DEFAULT_STATUS_BADGE_CLASS}`}>
      {value}
    </Badge>
  );
};

export default StatusBadge;

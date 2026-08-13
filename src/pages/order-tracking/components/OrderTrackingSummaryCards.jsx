import React from "react";
import { Button } from "../../../components/ui/button";
import { ORDER_TRACKING_SUMMARY_CARDS } from "../constants";

/**
 * Open Orders · Overdue Payments · Pending Delivery · Fully Closed
 * (spec §5), rendered as quick-filter buttons — same pattern already used by
 * Purchase Orders' own status quick filters (PurchaseOrdersToolbar.jsx).
 * Each is a shortcut filter into the grid — clicking one applies its filter
 * combination via onSelect, replacing the active filters (a second click
 * clears back to the unfiltered state). Counts come from
 * GET /order-tracking/summary, computed independently of whatever filters
 * are currently applied to the list (docs/order-tracking-api-contract.md §3.2)
 * — never derived from the current page's rows.
 */
const OrderTrackingSummaryCards = ({ summary, activeCardKey, onSelect, isLoading }) => (
  <div className="flex flex-wrap gap-2" data-testid="order-tracking-summary-cards">
    {ORDER_TRACKING_SUMMARY_CARDS.map((card) => {
      const isActive = activeCardKey === card.key;
      const count = isLoading ? "-" : (summary?.[card.key] ?? 0).toLocaleString("en-IN");
      return (
        <Button
          key={card.key}
          type="button"
          size="sm"
          variant={isActive ? "default" : "outline"}
          onClick={() => onSelect?.(isActive ? null : card)}
          data-testid={`order-tracking-summary-card-${card.key}`}
        >
          {card.label} ({count})
        </Button>
      );
    })}
  </div>
);

export default OrderTrackingSummaryCards;

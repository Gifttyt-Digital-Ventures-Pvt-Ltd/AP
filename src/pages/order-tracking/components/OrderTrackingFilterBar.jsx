import React from "react";
import { Search, X } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import AppSelect from "../../../components/common/AppSelect";
import DatePicker from "../../../components/common/DatePicker";
import TableSortButton from "../../../components/common/TableSortButton";
import {
  CURRENCY_FILTER_OPTIONS,
  DEFAULT_ORDER_TRACKING_FILTERS,
  DOCUMENT_CHAIN_FILTER_OPTIONS,
  DELIVERY_STATUS_OPTIONS,
  FUNDING_STATUS_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
  ORDER_STATUS_OPTIONS,
  CHECKLIST_COMPLETE_FILTER_OPTIONS,
  ORDER_TRACKING_SORT_OPTIONS,
} from "../constants";

const isFiltersActive = (filters) =>
  Object.entries(filters).some(([key, value]) => value !== DEFAULT_ORDER_TRACKING_FILTERS[key]);

/**
 * `filters`/`sort` are exactly the shape sent to useGetOrderTrackingQuery
 * (see DEFAULT_ORDER_TRACKING_PARAMS) — this component never filters/sorts
 * anything itself, it only reports the next desired value up to
 * OrderTrackingPage, which owns the single params object. All server-side
 * (spec §13) — search included, no client-side dataset filtering anywhere.
 */
const OrderTrackingFilterBar = ({
  filters,
  onFiltersChange,
  sort,
  onSortChange,
  vendorOptions = [],
  canUseGrn = true,
  canUseTi = true,
}) => {
  const updateFilter = (key, value) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const handleClear = () => onFiltersChange(DEFAULT_ORDER_TRACKING_FILTERS);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="relative w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.search}
          onChange={(event) => updateFilter("search", event.target.value)}
          placeholder="Search order no., PO no., or vendor"
          className="pl-9"
          data-testid="order-tracking-search"
        />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Order Date From</Label>
          <DatePicker
            value={filters.poDateFrom}
            onChange={(value) => updateFilter("poDateFrom", value)}
            maxDate={filters.poDateTo}
            placeholder="From"
            size="sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Order Date To</Label>
          <DatePicker
            value={filters.poDateTo}
            onChange={(value) => updateFilter("poDateTo", value)}
            minDate={filters.poDateFrom}
            placeholder="To"
            size="sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Vendor</Label>
          <AppSelect
            value={filters.vendorId}
            onChange={(e) => updateFilter("vendorId", e.target.value)}
            options={vendorOptions}
            placeholder="All vendors"
            className="w-48"
            data-testid="order-tracking-vendor-filter"
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Document Chain</Label>
          <AppSelect
            value={filters.documentChain}
            onChange={(e) => updateFilter("documentChain", e.target.value)}
            options={DOCUMENT_CHAIN_FILTER_OPTIONS.filter(
              (option) =>
                (canUseGrn || option.value !== "MISSING_GRN") &&
                (canUseTi || !["MISSING_TI", "TI_PARTIAL"].includes(option.value)),
            )}
            placeholder="All"
            className="w-40"
            data-testid="order-tracking-document-chain-filter"
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Payment Status</Label>
          <AppSelect
            value={filters.paymentStatus}
            onChange={(e) => updateFilter("paymentStatus", e.target.value)}
            options={PAYMENT_STATUS_OPTIONS.map((value) => ({ value, label: value }))}
            placeholder="All payment statuses"
            className="w-48"
            data-testid="order-tracking-payment-status-filter"
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Delivery Status</Label>
          <AppSelect
            value={filters.deliveryStatus}
            onChange={(e) => updateFilter("deliveryStatus", e.target.value)}
            options={DELIVERY_STATUS_OPTIONS}
            placeholder="All delivery statuses"
            className="w-48"
            data-testid="order-tracking-delivery-status-filter"
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Funding Status</Label>
          <AppSelect
            value={filters.fundingStatus}
            onChange={(e) => updateFilter("fundingStatus", e.target.value)}
            options={FUNDING_STATUS_OPTIONS}
            placeholder="All"
            className="w-36"
            data-testid="order-tracking-funding-status-filter"
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Checklist</Label>
          <AppSelect
            value={filters.checklistComplete}
            onChange={(e) => updateFilter("checklistComplete", e.target.value)}
            options={CHECKLIST_COMPLETE_FILTER_OPTIONS}
            placeholder="All"
            className="w-36"
            data-testid="order-tracking-checklist-filter"
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Order Status</Label>
          <AppSelect
            value={filters.orderStatus}
            onChange={(e) => updateFilter("orderStatus", e.target.value)}
            options={ORDER_STATUS_OPTIONS}
            placeholder="All"
            className="w-36"
            data-testid="order-tracking-order-status-filter"
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Currency</Label>
          <AppSelect
            value={filters.currency}
            onChange={(e) => updateFilter("currency", e.target.value)}
            options={CURRENCY_FILTER_OPTIONS}
            placeholder="All currencies"
            className="w-32"
            data-testid="order-tracking-currency-filter"
          />
        </div>

        {isFiltersActive(filters) ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            data-testid="order-tracking-clear-filters"
          >
            <X className="mr-1 h-3.5 w-3.5" />
            Clear filters
          </Button>
        ) : null}

        <TableSortButton
          options={ORDER_TRACKING_SORT_OPTIONS}
          value={sort?.value}
          direction={sort?.direction}
          onChange={onSortChange}
        />
      </div>
    </div>
  );
};

export default OrderTrackingFilterBar;

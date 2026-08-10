import React from "react";
import { Search, Settings2 } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import AppSelect from "../../../components/common/AppSelect";
import RefreshButton from "../../../components/common/RefreshButton";
import TableSortButton from "../../../components/common/TableSortButton";
import PoCreateMenu from "./PoCreateMenu";
import { DELIVERY_STATUS_OPTIONS } from "../constants";

const deliveryStatusFilterOptions = [
  { value: "all", label: "Delivery Status" },
  ...DELIVERY_STATUS_OPTIONS,
];

const poSortOptions = [
  { value: "created_at", label: "Upload date", defaultDirection: "desc" },
  { value: "po_date", label: "PO Date", defaultDirection: "desc" },
  { value: "total_amount", label: "Amount", defaultDirection: "desc" },
];

const PurchaseOrdersToolbar = ({
  setShowBuilderDialog,
  stats,
  canManagePo,
  canUploadPo = false,
  createMenuOpen = false,
  onToggleCreateMenu,
  onSelectCreateOption,
  activeFormat,
  onRefresh,
  refreshing = false,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  deliveryStatusFilter = "all",
  setDeliveryStatusFilter,
  poSort,
  setPoSort,
}) => {
  const poQuickFilters = [
    { value: "all", label: "All", count: stats.total },
    { value: "Pending Approval", label: "Pending Approval", count: stats.pending },
    { value: "Draft", label: "Draft", count: stats.draft },
    { value: "Issued", label: "Issued", count: stats.issued },
  ];

  return (
    <>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Purchase Orders</h1>
          <p className="text-muted-foreground">Create and track purchase orders</p>
          {activeFormat && (
            <p className="mt-1 text-xs text-muted-foreground">
              Active format: {activeFormat.name} ({activeFormat.defaultCurrency})
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <RefreshButton onClick={onRefresh} refreshing={refreshing}>
            Refresh
          </RefreshButton>
          {canManagePo && (
            <>
              <Button variant="outline" onClick={() => setShowBuilderDialog(true)} data-testid="open-po-builder-btn">
                <Settings2 className="h-4 w-4 mr-2" />
                Format Builder
              </Button>
              <PoCreateMenu
                open={createMenuOpen}
                onToggle={onToggleCreateMenu}
                onSelect={onSelectCreateOption}
                canUploadPo={canUploadPo}
              />
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2 mt-6 ">
          {poQuickFilters.map(({ value, label, count }) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={statusFilter === value ? "default" : "outline"}
              onClick={() => setStatusFilter(value)}
              data-testid={`po-filter-${value}`}
            >
              {label} ({count})
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-64 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search PO number or vendor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="search-po-input"
            />
          </div>
          <AppSelect
            value={deliveryStatusFilter}
            onChange={(e) => setDeliveryStatusFilter(e.target.value)}
            options={deliveryStatusFilterOptions}
            className="w-full sm:w-56"
            data-testid="po-delivery-status-filter"
          />
          <TableSortButton
            options={poSortOptions}
            value={poSort.value}
            direction={poSort.direction}
            onChange={setPoSort}
          />
        </div>
      </div>
    </>
  );
};

export default PurchaseOrdersToolbar;

import React, { useState } from "react";
import { toast } from "sonner";
import RefreshButton from "../../components/common/RefreshButton";
import { useRBAC } from "../../contexts/RBACContext";
import {
  useGetOrderTrackingQuery,
  useGetOrderTrackingSummaryQuery,
  useGetOrderTrackingFilterOptionsQuery,
  useGetOrderTrackingDetailQuery,
  useUpdateOrderTrackingDeliveryStatusMutation,
} from "../../Services/apis/orderTrackingApi";
import OrderTrackingSummaryCards from "./components/OrderTrackingSummaryCards";
import OrderTrackingFilterBar from "./components/OrderTrackingFilterBar";
import DownloadReportButton from "./components/DownloadReportButton";
import OrderTrackingTable from "./components/OrderTrackingTable";
import OrderTrackingPagination from "./components/OrderTrackingPagination";
import OrderTrackingDetailDrawer from "./components/OrderTrackingDetailDrawer";
import OrderTrackingPoPreviewDialog from "./components/OrderTrackingPoPreviewDialog";
import { DEFAULT_ORDER_TRACKING_PARAMS, DEFAULT_ORDER_TRACKING_FILTERS } from "./constants";

/**
 * Holds two pieces of state — `params` (identical to what
 * useGetOrderTrackingQuery sends as the GET /order-tracking query string,
 * see DEFAULT_ORDER_TRACKING_PARAMS) and `activeSummaryCardKey` (which
 * summary-card shortcut, if any, is currently applied). Every filter, sort,
 * search, and pagination action is a partial update to `params`; none of
 * them filter/sort/slice any array themselves — that happens entirely
 * inside the query layer (today: the mock queryFn; later: the real
 * backend), so this component needs no changes once a real endpoint
 * replaces the mock (docs/order-tracking-api-contract.md).
 */
const OrderTrackingPage = () => {
  const { hasPermission } = useRBAC();
  const [params, setParams] = useState(DEFAULT_ORDER_TRACKING_PARAMS);
  const [activeSummaryCardKey, setActiveSummaryCardKey] = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [previewPoId, setPreviewPoId] = useState(null);

  const { data: listData, isFetching, refetch } = useGetOrderTrackingQuery(params);
  const { data: summary, isFetching: isSummaryFetching } = useGetOrderTrackingSummaryQuery();
  const { data: filterOptions } = useGetOrderTrackingFilterOptionsQuery();
  const { data: detail, isFetching: isDetailFetching } = useGetOrderTrackingDetailQuery(selectedOrderId, {
    skip: !selectedOrderId,
  });
  const [updateDeliveryStatus] = useUpdateOrderTrackingDeliveryStatusMutation();

  // order-tracking-manage is documented today as export-only with no other
  // runtime effect; whether it should also gate inline delivery-status
  // editing is an open question (docs/order-tracking-api-contract.md §8) —
  // using it here as the working assumption until confirmed.
  const canEditDelivery = hasPermission("order-tracking-manage");

  const rows = listData?.items ?? [];
  const totalPages = listData?.totalPages ?? 1;
  const totalElements = listData?.totalElements ?? 0;
  const currentPage = listData?.page ?? params.page;
  const pageSize = listData?.size ?? params.size;

  const { page: _page, size: _size, sortBy, sortDirection, ...filters } = params;
  const sort = { value: sortBy, direction: sortDirection };

  const handleFiltersChange = (nextFilters) => {
    setActiveSummaryCardKey(null);
    setParams((prev) => ({ ...prev, ...nextFilters, page: 0 }));
  };

  const handleSortChange = ({ value, direction }) => {
    setParams((prev) => ({ ...prev, sortBy: value, sortDirection: direction, page: 0 }));
  };

  const handlePageChange = (nextPage) => {
    setParams((prev) => ({ ...prev, page: nextPage }));
  };

  const handleSummaryCardSelect = (card) => {
    if (!card) {
      setActiveSummaryCardKey(null);
      setParams((prev) => ({ ...prev, ...DEFAULT_ORDER_TRACKING_FILTERS, page: 0 }));
      return;
    }
    setActiveSummaryCardKey(card.key);
    setParams((prev) => ({ ...prev, ...DEFAULT_ORDER_TRACKING_FILTERS, ...card.filter, page: 0 }));
  };

  const handleView = (row) => {
    if (!row?.id) return;
    setSelectedOrderId(row.id);
  };

  const handleOpenDocument = (doc) => {
    if (doc.type === "PO") {
      setPreviewPoId(doc.id);
      return;
    }
    // GRN/PI/TI don't have a wired cross-module deep link yet in this app —
    // flagging rather than guessing at a route that doesn't exist.
    toast.info(`Opening ${doc.type} ${doc.number} isn't wired up yet.`);
  };

  const handleDeliveryStatusChange = async (row, nextStatus) => {
    try {
      await updateDeliveryStatus({ orderId: row.id, deliveryStatus: nextStatus }).unwrap();
    } catch (error) {
      toast.error(error?.data?.message || "Failed to update delivery status.");
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4" data-testid="order-tracking-page">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Purchase Order Tracking</h1>
          <p className="text-muted-foreground">
            Track document, payment, delivery, and funding progress across every order.
          </p>
        </div>
        <div className="flex gap-2">
          <RefreshButton onClick={refetch} refreshing={isFetching}>
            Refresh
          </RefreshButton>
          <DownloadReportButton filters={filters} />
        </div>
      </div>

      <OrderTrackingSummaryCards
        summary={summary}
        activeCardKey={activeSummaryCardKey}
        onSelect={handleSummaryCardSelect}
        isLoading={isSummaryFetching}
      />

      <OrderTrackingFilterBar
        filters={filters}
        onFiltersChange={handleFiltersChange}
        sort={sort}
        onSortChange={handleSortChange}
        vendorOptions={filterOptions?.vendors ?? []}
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto scrollbar-thin-muted">
          <OrderTrackingTable
            rows={rows}
            isLoading={isFetching}
            onView={handleView}
            onOpenDocument={handleOpenDocument}
            onDeliveryStatusChange={handleDeliveryStatusChange}
            canEditDelivery={canEditDelivery}
          />
        </div>
        <OrderTrackingPagination
          page={currentPage}
          totalPages={totalPages}
          totalRows={totalElements}
          pageSize={pageSize}
          onPageChange={handlePageChange}
        />
      </div>

      <OrderTrackingDetailDrawer
        open={Boolean(selectedOrderId)}
        onOpenChange={(open) => {
          if (!open) setSelectedOrderId(null);
        }}
        detail={detail}
        isLoading={isDetailFetching}
        onOpenDocument={handleOpenDocument}
      />

      <OrderTrackingPoPreviewDialog poId={previewPoId} onClose={() => setPreviewPoId(null)} />
    </div>
  );
};

export default OrderTrackingPage;

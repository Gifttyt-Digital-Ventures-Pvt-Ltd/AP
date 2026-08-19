import React, { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import RefreshButton from "../../components/common/RefreshButton";
import { useRBAC } from "../../contexts/RBACContext";
import {
  useGetOrderTrackingQuery,
  useGetOrderTrackingSummaryQuery,
  useGetOrderTrackingFilterOptionsQuery,
  useGetOrderTrackingDetailQuery,
  useUpdateOrderTrackingDeliveryStatusMutation,
  useCloseOrderTrackingOrderMutation,
} from "../../Services/apis/orderTrackingApi";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { formatCurrency } from "../../utils/currency";
import { Loader2, Lock } from "lucide-react";
import OrderTrackingSummaryCards from "./components/OrderTrackingSummaryCards";
import OrderTrackingFilterBar from "./components/OrderTrackingFilterBar";
import DownloadReportButton from "./components/DownloadReportButton";
import OrderTrackingTable from "./components/OrderTrackingTable";
import OrderTrackingPagination from "./components/OrderTrackingPagination";
import OrderTrackingDetailDrawer from "./components/OrderTrackingDetailDrawer";
import OrderTrackingPoPreviewDialog from "./components/OrderTrackingPoPreviewDialog";
import OrderTrackingGrnPreviewDialog from "./components/OrderTrackingGrnPreviewDialog";
import OrderTrackingInvoicePreviewDialog from "./components/OrderTrackingInvoicePreviewDialog";
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
  const [previewGrnId, setPreviewGrnId] = useState(null);
  const [previewInvoiceId, setPreviewInvoiceId] = useState(null);

  const { data: listData, isFetching, refetch } = useGetOrderTrackingQuery(params);
  const { data: summary, isFetching: isSummaryFetching } = useGetOrderTrackingSummaryQuery();
  const { data: filterOptions } = useGetOrderTrackingFilterOptionsQuery();
  const { data: detail, isFetching: isDetailFetching } = useGetOrderTrackingDetailQuery(selectedOrderId, {
    skip: !selectedOrderId,
  });
  const [updateDeliveryStatus] = useUpdateOrderTrackingDeliveryStatusMutation();
  const [closeOrderTrackingOrder, { isLoading: closingOrder }] = useCloseOrderTrackingOrderMutation();

  const canEditDelivery = hasPermission("order-tracking-manage");
  const canManageOrder = hasPermission("order-tracking-manage");

  const [showCloseModal, setShowCloseModal] = useState(false);
  const [orderToClose, setOrderToClose] = useState(null);

  const handleOpenCloseModal = (orderDetail) => {
    setOrderToClose(orderDetail);
    setShowCloseModal(true);
  };

  const handleConfirmCloseOrder = async () => {
    if (!orderToClose?.id) return;
    try {
      await closeOrderTrackingOrder({ orderId: orderToClose.id }).unwrap();
      toast.success(`Order ${orderToClose.orderNumber || ""} closed successfully.`);
      setShowCloseModal(false);
      setOrderToClose(null);
      refetch();
    } catch (error) {
      toast.error(error?.data?.message || "Failed to close order.");
    }
  };

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
    if (doc.type === "GRN") {
      setPreviewGrnId(doc.id);
      return;
    }
    if (doc.type === "PI" || doc.type === "TI") {
      setPreviewInvoiceId(doc.id);
      return;
    }
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
        onCloseOrder={handleOpenCloseModal}
        canManageOrder={canManageOrder}
        closingOrder={closingOrder}
      />

      <OrderTrackingPoPreviewDialog poId={previewPoId} onClose={() => setPreviewPoId(null)} />
      <OrderTrackingGrnPreviewDialog grnId={previewGrnId} onClose={() => setPreviewGrnId(null)} />
      <OrderTrackingInvoicePreviewDialog invoiceId={previewInvoiceId} onClose={() => setPreviewInvoiceId(null)} />

      {/* Manual Close Order Confirmation Modal */}
      <Dialog
        open={showCloseModal}
        onOpenChange={(open) => {
          setShowCloseModal(open);
          if (!open) setOrderToClose(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-red-600" />
              Close Order
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  You are about to manually close order{" "}
                  <span className="font-semibold text-foreground">{orderToClose?.orderNumber || ""}</span>.
                </p>
                {Number(orderToClose?.advanceOutstanding || 0) > 0 ? (
                  <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                    ⚠ Closing this order will release the unadjusted advance of{" "}
                    <span className="font-semibold">
                      {formatCurrency(orderToClose?.advanceOutstanding, orderToClose?.currency)}
                    </span>{" "}
                    to the vendor pool.
                  </p>
                ) : null}
                <p className="font-medium text-foreground">
                  This action is irreversible. Closed orders cannot be reopened.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCloseModal(false)}
              disabled={closingOrder}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmCloseOrder}
              disabled={closingOrder}
              data-testid="confirm-close-order-btn"
            >
              {closingOrder && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Close Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrderTrackingPage;

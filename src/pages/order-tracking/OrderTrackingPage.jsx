import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import RefreshButton from "../../components/common/RefreshButton";
import {
  useGetOrderTrackingQuery,
  useGetOrderTrackingFilterOptionsQuery,
} from "../../Services/apis/orderTrackingApi";
import OrderTrackingFilterBar from "./components/OrderTrackingFilterBar";
import DownloadReportButton from "./components/DownloadReportButton";
import OrderTrackingTable from "./components/OrderTrackingTable";
import OrderTrackingPagination from "./components/OrderTrackingPagination";
import { DEFAULT_ORDER_TRACKING_PARAMS } from "./constants";

/**
 * Holds exactly one piece of state — `params` — shaped identically to what
 * useGetOrderTrackingQuery sends as the future GET /order-tracking query
 * string (see DEFAULT_ORDER_TRACKING_PARAMS). Every filter, sort, and
 * pagination action is just a partial update to this object; none of them
 * filter/sort/slice any array themselves — that all happens inside the
 * query layer (today: the mock queryFn; later: the real backend), so this
 * component needs no changes once a real endpoint replaces the mock.
 */
const OrderTrackingPage = () => {
  const navigate = useNavigate();
  const [params, setParams] = useState(DEFAULT_ORDER_TRACKING_PARAMS);

  const {
    data: listData,
    isFetching,
    refetch,
  } = useGetOrderTrackingQuery(params);

  const { data: filterOptions } = useGetOrderTrackingFilterOptionsQuery();

  const rows = listData?.items ?? [];
  const totalPages = listData?.totalPages ?? 1;
  const totalElements = listData?.totalElements ?? 0;
  const currentPage = listData?.page ?? params.page;
  const pageSize = listData?.size ?? params.size;

  const {
    poDateFrom,
    poDateTo,
    vendorId,
    documentStatus,
    paymentStatus,
    deliveryStatus,
    fundingStatus,
    currency,
  } = params;
  const filters = {
    poDateFrom,
    poDateTo,
    vendorId,
    documentStatus,
    paymentStatus,
    deliveryStatus,
    fundingStatus,
    currency,
  };
  const sort = { value: params.sortBy, direction: params.sortDirection };

  const handleFiltersChange = (nextFilters) => {
    setParams((prev) => ({ ...prev, ...nextFilters, page: 0 }));
  };

  const handleSortChange = ({ value, direction }) => {
    setParams((prev) => ({ ...prev, sortBy: value, sortDirection: direction, page: 0 }));
  };

  const handlePageChange = (nextPage) => {
    setParams((prev) => ({ ...prev, page: nextPage }));
  };

  const handleRowClick = (row) => {
    if (!row?.id) return;
    navigate(`/purchase-orders?source=notification&action=preview&poId=${row.id}`);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4" data-testid="order-tracking-page">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Purchase Order Tracking</h1>
          <p className="text-muted-foreground">
            Track document, payment, delivery, and funding progress across every purchase order.
          </p>
        </div>
        <div className="flex gap-2">
          <RefreshButton onClick={refetch} refreshing={isFetching}>
            Refresh
          </RefreshButton>
          <DownloadReportButton filters={filters} />
        </div>
      </div>

      <OrderTrackingFilterBar
        filters={filters}
        onFiltersChange={handleFiltersChange}
        sort={sort}
        onSortChange={handleSortChange}
        vendorOptions={filterOptions?.vendors ?? []}
        deliveryStatusOptions={filterOptions?.deliveryStatuses ?? []}
        fundingStatusOptions={filterOptions?.fundingStatuses ?? []}
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto scrollbar-thin-muted">
          <OrderTrackingTable rows={rows} isLoading={isFetching} onRowClick={handleRowClick} />
        </div>
        <OrderTrackingPagination
          page={currentPage}
          totalPages={totalPages}
          totalRows={totalElements}
          pageSize={pageSize}
          onPageChange={handlePageChange}
        />
      </div>
    </div>
  );
};

export default OrderTrackingPage;

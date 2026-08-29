import React from "react";
import { Eye } from "lucide-react";
import { TableCell, TableRow } from "../../../components/ui/table";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import AppDataTable from "../../../components/common/AppDataTable";
import {
  ORDER_TRACKING_TABLE_COLUMNS,
  ORDER_STATUS,
  paymentStatusColors,
  fundingStatusColors,
  FUNDING_STATUS_OPTIONS,
} from "../constants";
import { formatCurrency } from "../../../utils/currency";
import { formatDate } from "../utils";
import DocumentChainCell from "./DocumentChainCell";
import DeliveryStatusSelect from "./DeliveryStatusSelect";
import { cn } from "../../../lib/utils";

/**
 * Clicking anywhere on a row opens the detail drawer, same as the Actions
 * column's View button (both call onView). Document-chain indicators and
 * the delivery-status dropdown are independently clickable and stop event
 * propagation so they don't also trigger the row click. Cancelled orders
 * get muted text + a strikethrough PO number rather than a re-added Status
 * column, per the spec's own recommendation (§13) since Order Status moved
 * to the drawer.
 */
const OrderTrackingTable = ({
  rows,
  isLoading,
  onView,
  onOpenDocument,
  onDeliveryStatusChange,
  canEditDelivery,
  canUseGrn = true,
  canUsePi = true,
  canUseTi = true,
}) => {
  const renderRow = (row, rowIndex, headers) => {
    const isCancelled = row.orderStatus === ORDER_STATUS.CANCELLED;

    const renderCell = (header) => {
      switch (header.key) {
        case "srNo":
          return rowIndex + 1;
        case "poNumber":
          return (
            <div>
              <p className={cn("font-medium", isCancelled && "text-muted-foreground line-through")}>{row.poNumber}</p>
              <p className="text-xs text-muted-foreground">{formatDate(row.orderDate)}</p>
            </div>
          );
        case "vendorName":
          return (
            <div className="flex items-center gap-1.5">
              <span className={cn(isCancelled && "text-muted-foreground")}>{row.vendorName}</span>
              {row.isMsme ? (
                <Badge variant="outline" className="border-0 bg-purple-100 text-[10px] font-semibold text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                  MSME
                </Badge>
              ) : null}
            </div>
          );
        case "documentChain":
          return (
            <DocumentChainCell
              documentChain={row.documentChain}
              onOpenDocument={onOpenDocument}
              canUseGrn={canUseGrn}
              canUsePi={canUsePi}
              canUseTi={canUseTi}
            />
          );
        case "orderValue":
          return formatCurrency(row.orderValue, row.currency);
        case "amountOutstanding":
          return formatCurrency(row.amountOutstanding, row.currency);
        case "paymentStatus":
          return row.paymentStatus ? (
            <Badge variant="outline" className={`border-0 font-semibold ${paymentStatusColors[row.paymentStatus] || ""}`}>
              {row.paymentStatus}
            </Badge>
          ) : (
            "-"
          );
        case "deliveryStatus":
          return (
            <DeliveryStatusSelect
              value={row.deliveryStatus}
              orderId={row.id}
              disabled={!canEditDelivery}
              onChange={(nextValue) => onDeliveryStatusChange?.(row, nextValue)}
            />
          );
        case "fundingStatus":
          return row.fundingStatus ? (
            <Badge variant="outline" className={`border-0 font-semibold ${fundingStatusColors[row.fundingStatus] || ""}`}>
              {FUNDING_STATUS_OPTIONS.find((option) => option.value === row.fundingStatus)?.label || row.fundingStatus}
            </Badge>
          ) : (
            "-"
          );
        case "actions":
          return (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(event) => {
                event.stopPropagation();
                onView?.(row);
              }}
              data-testid={`order-tracking-view-${row.id}`}
            >
              <Eye className="mr-1.5 h-3.5 w-3.5" />
              View
            </Button>
          );
        default:
          return row?.[header.key] ?? "-";
      }
    };

    return (
      <TableRow
        key={row.id ?? rowIndex}
        onClick={() => onView?.(row)}
        className="cursor-pointer hover:bg-muted/50"
        data-testid={`order-tracking-row-${row.id ?? "unknown"}`}
      >
        {headers.map((header, index) => (
          <TableCell
            key={header.key}
            className={cn(header.cellClassName, index < headers.length - 1 && "border-r border-border")}
          >
            {renderCell(header)}
          </TableCell>
        ))}
      </TableRow>
    );
  };

  return (
    <AppDataTable
      tableHeader={ORDER_TRACKING_TABLE_COLUMNS}
      tableData={rows}
      renderRow={renderRow}
      isLoading={isLoading}
      loadingRowCount={8}
      stickyHeader
      bordered
      tableClassName="min-w-[1400px]"
      headClassName="border-b border-border bg-muted shadow-sm"
      emptyMessage="No orders match the current filters."
      emptyTestId="no-order-tracking-rows"
    />
  );
};

export default OrderTrackingTable;

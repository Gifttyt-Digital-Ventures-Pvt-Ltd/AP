import React from "react";
import { TableCell, TableRow } from "../../../components/ui/table";
import AppDataTable from "../../../components/common/AppDataTable";
import {
  ORDER_TRACKING_TABLE_COLUMNS,
  deliveryStatusColors,
  documentStatusColors,
  fundingStatusColors,
  paymentStatusColors,
} from "../constants";
import { formatCurrency } from "../../../utils/currency";
import { formatDate } from "../utils";
import StatusBadge from "./StatusBadge";

const OrderTrackingTable = ({ rows, isLoading, onRowClick }) => {
  const renderRow = (row, rowIndex, headers) => (
    <TableRow
      key={row.id ?? rowIndex}
      className="cursor-pointer hover:bg-muted"
      onClick={() => onRowClick?.(row)}
      data-testid={`order-tracking-row-${row.id ?? "unknown"}`}
    >
      {headers.map((header) => {
        let value;

        switch (header.key) {
          case "srNo":
            value = rowIndex + 1;
            break;
          case "poNumber":
            value = (
              <button
                type="button"
                className="font-medium text-button-primary underline-offset-2 hover:underline"
                onClick={(event) => {
                  event.stopPropagation();
                  onRowClick?.(row);
                }}
                data-testid={`order-tracking-po-link-${row.id ?? "unknown"}`}
              >
                {row.poNumber}
              </button>
            );
            break;
          case "poDate":
            value = formatDate(row.poDate);
            break;
          case "expectedDeliveryDate":
            value = formatDate(row.expectedDeliveryDate);
            break;
          case "poAmount":
            value = formatCurrency(row.poAmount, row.currency);
            break;
          case "amountOutstanding":
            value = formatCurrency(row.amountOutstanding, row.currency);
            break;
          case "documentStatus":
            value = <StatusBadge value={row.documentStatus} colorMap={documentStatusColors} />;
            break;
          case "paymentStatus":
            value = <StatusBadge value={row.paymentStatus} colorMap={paymentStatusColors} />;
            break;
          case "deliveryStatus":
            value = <StatusBadge value={row.deliveryStatus} colorMap={deliveryStatusColors} />;
            break;
          case "fundingStatus":
            value = <StatusBadge value={row.fundingStatus} colorMap={fundingStatusColors} />;
            break;
          default:
            value = row?.[header.key] || "-";
        }

        return (
          <TableCell key={header.key} className={header.cellClassName}>
            {value}
          </TableCell>
        );
      })}
    </TableRow>
  );

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
      emptyMessage="No purchase orders match the current filters."
      emptyTestId="no-order-tracking-rows"
    />
  );
};

export default OrderTrackingTable;

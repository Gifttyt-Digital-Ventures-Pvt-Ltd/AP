import React, { useMemo } from "react";
import { CheckCircle2, Eye, Pencil, Send, Unlock } from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { TableCell, TableRow } from "../../../components/ui/table";
import AppDataTable from "../../../components/common/AppDataTable";
import { OrgBranchCell, VendorWithBranchCell } from "../../../components/common/BranchTableCells";
import { cn } from "../../../lib/utils";
import {
  getAccountingUnlockRequestStatus,
  isAccountingReadyLocked,
} from "../../../utils/accountingLock";
import { DELIVERY_STATUS_OPTIONS, deliveryStatusColors } from "../constants";
import PoDeliveryDateCell from "./PoDeliveryDateCell";

const basePoTableHeader = [
  { key: "srNo", title: "Sr. No", headerClassName: "bg-muted text-foreground", cellClassName: "text-sm font-medium" },
  { key: "po_number", title: "PO Number", headerClassName: "bg-muted text-foreground", cellClassName: "font-medium" },
  { key: "vendor_name", title: "Vendor", headerClassName: "bg-muted text-foreground" },
  { key: "orgBranch", title: "Branch", headerClassName: "bg-muted text-foreground", cellClassName: "text-sm" },
  { key: "po_date", title: "PO Date", headerClassName: "bg-muted text-foreground" },
  { key: "expected_delivery_date", title: "Delivery Date", headerClassName: "bg-muted text-foreground" },
  { key: "total_amount", title: "Amount", headerClassName: "bg-muted text-foreground" },
  { key: "status", title: "Status", headerClassName: "bg-muted text-foreground" },
  { key: "deliveryStatus", title: "Delivery Status", headerClassName: "bg-muted text-foreground" },
  { key: "actions", title: "Actions", headerClassName: "bg-muted text-left text-foreground", cellClassName: "text-left" },
];

const getDeliveryStatusLabel = (deliveryStatus) =>
  DELIVERY_STATUS_OPTIONS.find((option) => option.value === deliveryStatus)?.label;

const PoListTable = ({
  filteredOrders,
  totalOrders = 0,
  formatDate,
  formatCurrency,
  statusColors,
  setSelectedPO,
  setShowViewDialog,
  canManagePo = false,
  canSubmitPo = false,
  canApprovePo = false,
  onEditPO,
  onSubmitPO,
  onReviewPO,
  onRequestUnlock,
  submitting = false,
  requestingUnlock = false,
  showBranchField = false,
}) => {
  const poTableHeader = useMemo(
    () =>
      showBranchField
        ? basePoTableHeader
        : basePoTableHeader.filter((header) => header.key !== "orgBranch"),
    [showBranchField],
  );

  const renderPoRow = (po, rowIndex, headers) => (
    <TableRow
      key={po.id ?? rowIndex}
      className="cursor-pointer hover:bg-muted"
      onClick={() => {
        setSelectedPO(po);
        setShowViewDialog(true);
      }}
      data-testid={`po-row-${po?.id ?? 'unknown'}`}
    >
      {headers.map((header) => {
        let value;

        switch (header.key) {
          case "srNo":
            value = rowIndex + 1;
            break;
          case "vendor_name":
            value = <VendorWithBranchCell record={po} vendorName={po.vendor_name} />;
            break;
          case "orgBranch":
            value = <OrgBranchCell record={po} />;
            break;
          case "po_date":
            value = formatDate(po.po_date);
            break;
          case "expected_delivery_date":
            value = (
              <PoDeliveryDateCell po={po} formattedDate={formatDate(po.expected_delivery_date)} />
            );
            break;
          case "total_amount":
            value = (
              <div className="space-y-0.5">
                <div>{formatCurrency(po.total_amount, po.currency)}</div>
                {po.convertToInr && Number(po.matchingInrValue) > 0 ? (
                  <div className="text-xs text-muted-foreground">
                    Converted INR Amount: {formatCurrency(po.matchingInrValue, "INR")}
                  </div>
                ) : null}
              </div>
            );
            break;
          case "status":
            value = (
              <Badge
                variant="outline"
                className={`border-0 font-semibold ${statusColors[po.status] || statusColors.Draft}`}
              >
                {po.status}
              </Badge>
            );
            break;
          case "deliveryStatus": {
            const deliveryStatusLabel = getDeliveryStatusLabel(po.delivery_status);
            value = deliveryStatusLabel ? (
              <Badge
                variant="outline"
                className={`border-0 font-semibold ${deliveryStatusColors[po.delivery_status] || ""}`}
              >
                {deliveryStatusLabel}
              </Badge>
            ) : (
              "-"
            );
            break;
          }
          case "actions":
            value = (
              <div className="flex items-center justify-start gap-1 whitespace-nowrap">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedPO(po);
                    setShowViewDialog(true);
                  }}
                  title="View PO"
                  aria-label="View PO"
                  data-testid={`view-po-${po?.id ?? 'unknown'}`}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                {canManagePo &&
                  ["Draft", "Sent Back"].includes(po.status) &&
                  !isAccountingReadyLocked(po) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(event) => {
                      event.stopPropagation();
                      onEditPO?.(po);
                    }}
                    title="Edit PO"
                    aria-label="Edit PO"
                    data-testid={`edit-po-${po?.id ?? 'unknown'}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {canSubmitPo &&
                  ["Draft", "Sent Back"].includes(po.status) &&
                  !isAccountingReadyLocked(po) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(event) => {
                        event.stopPropagation();
                        onSubmitPO?.(po);
                      }}
                      disabled={submitting}
                      title="Submit for approval"
                      aria-label="Submit for approval"
                      data-testid={`submit-po-${po?.id ?? 'unknown'}`}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  )}
                {canApprovePo && po.status === "Pending Approval" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      onReviewPO?.(po);
                    }}
                    disabled={submitting}
                    title="Review PO"
                    aria-label="Review PO"
                    data-testid={`review-po-${po?.id ?? 'unknown'}`}
                  >
                    <CheckCircle2 className="mr-1 h-4 w-4" />
                    Review
                  </Button>
                )}
                {isAccountingReadyLocked(po) &&
                  canManagePo &&
                  String(getAccountingUnlockRequestStatus(po) || '').toUpperCase() !== 'PENDING' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        onRequestUnlock?.(po);
                      }}
                      disabled={requestingUnlock}
                      title="Request accounting unlock"
                      aria-label="Request accounting unlock"
                      data-testid={`request-unlock-po-${po?.id ?? 'unknown'}`}
                    >
                      <Unlock className="h-4 w-4 text-amber-700" />
                    </Button>
                  )}
              </div>
            );
            break;
          default:
            value = po?.[header.key] || "-";
        }

        return (
          <TableCell
            key={header.key}
            className={cn("px-3 py-3 border border-table-border", header.cellClassName)}
          >
            {value}
          </TableCell>
        );
      })}
    </TableRow>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div
        className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm"
        data-testid="purchase-orders-table"
      >
        <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto scrollbar-thin-muted">
          <AppDataTable
            tableHeader={poTableHeader}
            tableData={filteredOrders}
            renderRow={renderPoRow}
            tableClassName="min-w-[1100px]"
            tableContainerClassName="overflow-visible"
            headClassName="border-b border-border bg-muted shadow-sm"
            stickyHeader
            bordered
            emptyMessage="No purchase orders found. Create your first PO to get started."
            emptyTestId="no-purchase-orders"
          />
        </div>
        <div className="mt-auto flex shrink-0 border-t border-border p-4">
          <p className="text-sm text-muted-foreground" data-testid="po-table-summary">
            {filteredOrders.length === totalOrders
              ? `Showing ${filteredOrders.length.toLocaleString("en-IN")} purchase orders`
              : `Showing ${filteredOrders.length.toLocaleString("en-IN")} of ${totalOrders.toLocaleString("en-IN")} purchase orders`}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PoListTable;

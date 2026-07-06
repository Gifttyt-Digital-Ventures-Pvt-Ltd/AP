import React, { useMemo } from "react";
import { Eye, Pencil, Search } from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { TableCell, TableRow } from "../../../components/ui/table";
import AppDataTable from "../../../components/common/AppDataTable";
import { OrgBranchCell, VendorWithBranchCell } from "../../../components/common/BranchTableCells";
import { cn } from "../../../lib/utils";

const basePoTableHeader = [
  { key: "po_number", title: "PO Number", headerClassName: "bg-muted text-foreground", cellClassName: "font-medium" },
  { key: "orgBranch", title: "Branch", headerClassName: "bg-muted text-foreground", cellClassName: "text-sm" },
  { key: "vendor_name", title: "Vendor", headerClassName: "bg-muted text-foreground" },
  { key: "po_date", title: "PO Date", headerClassName: "bg-muted text-foreground" },
  { key: "expected_delivery_date", title: "Delivery Date", headerClassName: "bg-muted text-foreground" },
  { key: "total_amount", title: "Amount", headerClassName: "bg-muted text-foreground" },
  { key: "status", title: "Status", headerClassName: "bg-muted text-foreground" },
  { key: "actions", title: "Actions", headerClassName: "bg-muted text-foreground" },
];

const PoListTable = ({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  filteredOrders,
  totalOrders = 0,
  formatDate,
  formatCurrency,
  statusColors,
  setSelectedPO,
  setShowViewDialog,
  canManagePo = false,
  onEditPO,
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
      className={cn(rowIndex % 2 === 1 && "bg-muted/20")}
      data-testid={`po-row-${po?.id ?? 'unknown'}`}
    >
      {headers.map((header) => {
        let value;

        switch (header.key) {
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
            value = formatDate(po.expected_delivery_date);
            break;
          case "total_amount":
            value = formatCurrency(po.total_amount, po.currency);
            break;
          case "status":
            value = <Badge className={`${statusColors[po.status] || "bg-gray-500"} text-white`}>{po.status}</Badge>;
            break;
          case "actions":
            value = (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedPO(po);
                    setShowViewDialog(true);
                  }}
                  data-testid={`view-po-${po?.id ?? 'unknown'}`}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                {canManagePo && ["Draft", "Sent Back"].includes(po.status) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEditPO?.(po)}
                    data-testid={`edit-po-${po?.id ?? 'unknown'}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </div>
            );
            break;
          default:
            value = po?.[header.key] || "-";
        }

        return (
          <TableCell key={header.key} className={cn("px-3 py-3", header.cellClassName)}>
            {value}
          </TableCell>
        );
      })}
    </TableRow>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search PO number or vendor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="search-po-input"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48" data-testid="status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Draft">Draft</SelectItem>
            <SelectItem value="Pending Approval">Pending Approval</SelectItem>
            <SelectItem value="Issued">Issued</SelectItem>
            <SelectItem value="Amended">Amended</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
            <SelectItem value="Cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

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

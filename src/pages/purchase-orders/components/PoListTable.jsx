import React from "react";
import { Eye, Pencil, Search } from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { TableCell, TableRow } from "../../../components/ui/table";
import AppDataTable from "../../../components/common/AppDataTable";
import { cn } from "../../../lib/utils";

const poTableHeader = [
  { key: "po_number", title: "PO Number", cellClassName: "font-medium" },
  { key: "vendor_name", title: "Vendor" },
  { key: "po_date", title: "PO Date" },
  { key: "expected_delivery_date", title: "Delivery Date" },
  { key: "total_amount", title: "Amount" },
  { key: "status", title: "Status" },
  { key: "actions", title: "Actions" },
];

const PoListTable = ({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  filteredOrders,
  formatDate,
  formatCurrency,
  statusColors,
  setSelectedPO,
  setShowViewDialog,
  canManagePo = false,
  onEditPO,
}) => {
  const renderPoRow = (po, rowIndex, headers) => (
    <TableRow
      key={po.id ?? rowIndex}
      className={cn(rowIndex % 2 === 1 && "bg-muted/20")}
      data-testid={`po-row-${po.id}`}
    >
      {headers.map((header) => {
        let value;

        switch (header.key) {
          case "vendor_name":
            value = po.vendor_name || "-";
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
                  data-testid={`view-po-${po.id}`}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                {canManagePo && ["Draft", "Sent Back"].includes(po.status) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEditPO?.(po)}
                    data-testid={`edit-po-${po.id}`}
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
    <div className="space-y-4">
      <div className="flex gap-4 items-center">
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

      <div className="mt-0">
        <Card>
          <AppDataTable
            tableHeader={poTableHeader}
            tableData={filteredOrders}
            renderRow={renderPoRow}
            emptyMessage="No purchase orders found. Create your first PO to get started."
          />
        </Card>
      </div>
    </div>
  );
};

export default PoListTable;

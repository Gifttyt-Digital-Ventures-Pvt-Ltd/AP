import React from "react";
import { Eye, Search } from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { TabsContent } from "../../../components/ui/tabs";
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

const pendingPoTableHeader = [
  { key: "po_number", title: "PO Number", cellClassName: "font-medium" },
  { key: "vendor_name", title: "Vendor" },
  { key: "po_format_name", title: "Format" },
  { key: "total_amount", title: "Amount" },
  { key: "current_approval_level", title: "Approval Level" },
  { key: "actions", title: "Actions" },
];

const PoListTable = ({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  filteredOrders,
  pendingApprovals = [],
  activeTab = "all",
  formatDate,
  formatCurrency,
  statusColors,
  setSelectedPO,
  setShowViewDialog,
  setShowApprovalDialog,
  canApprovePo,
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

  const renderPendingPoRow = (po, rowIndex, headers) => (
    <TableRow
      key={po.id ?? rowIndex}
      className={cn(rowIndex % 2 === 1 && "bg-muted/20")}
      data-testid={`pending-po-row-${po.id}`}
    >
      {headers.map((header) => {
        let value;

        switch (header.key) {
          case "vendor_name":
            value = po.vendor_name || "-";
            break;
          case "total_amount":
            value = formatCurrency(po.total_amount, po.currency);
            break;
          case "current_approval_level":
            value = <Badge>Level {po.current_approval_level || 1}</Badge>;
            break;
          case "actions":
            value = (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedPO(po);
                    setShowViewDialog(true);
                  }}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedPO(po);
                    setShowApprovalDialog(true);
                  }}
                  data-testid={`approve-po-${po.id}`}
                >
                  Review
                </Button>
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
      {activeTab === "all" && (
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
      )}

      <TabsContent value="all" className="mt-0">
        <Card>
          <AppDataTable
            tableHeader={poTableHeader}
            tableData={filteredOrders}
            renderRow={renderPoRow}
            emptyMessage="No purchase orders found. Create your first PO to get started."
          />
        </Card>
      </TabsContent>

      {canApprovePo && (
        <TabsContent value="pending" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>POs Pending Your Approval</CardTitle>
            </CardHeader>
            <CardContent>
              <AppDataTable
                tableHeader={pendingPoTableHeader}
                tableData={pendingApprovals}
                renderRow={renderPendingPoRow}
                emptyMessage="No pending approvals"
              />
            </CardContent>
          </Card>
        </TabsContent>
      )}
    </div>
  );
};

export default PoListTable;

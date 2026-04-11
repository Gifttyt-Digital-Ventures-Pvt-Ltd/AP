import React from "react";
import { Eye, Search } from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { TabsContent } from "../../../components/ui/tabs";
import AppDataTable from "../../../components/common/AppDataTable";

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
  pendingApprovals,
  setShowApprovalDialog,
}) => {
  return (
    <>
      <TabsContent value="all" className="space-y-4">
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
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Partially Received">Partially Received</SelectItem>
              <SelectItem value="Closed">Closed</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <AppDataTable
            rows={filteredOrders}
            rowKey="id"
            getRowProps={(po) => ({ "data-testid": `po-row-${po.id}` })}
            emptyMessage="No purchase orders found. Create your first PO to get started."
            columns={[
              { key: "po_number", header: "PO Number", cellClassName: "font-medium" },
              { key: "vendor_name", header: "Vendor", render: (po) => po.vendor_name || "-" },
              { key: "po_date", header: "PO Date", render: (po) => formatDate(po.po_date) },
              { key: "expected_delivery_date", header: "Delivery Date", render: (po) => formatDate(po.expected_delivery_date) },
              { key: "total_amount", header: "Amount", render: (po) => formatCurrency(po.total_amount) },
              {
                key: "status",
                header: "Status",
                render: (po) => <Badge className={`${statusColors[po.status]} text-white`}>{po.status}</Badge>,
              },
              {
                key: "actions",
                header: "Actions",
                render: (po) => (
                  <div className="flex gap-2">
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
                  </div>
                ),
              },
            ]}
          />
        </Card>
      </TabsContent>

      <TabsContent value="pending" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>POs Pending Your Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <AppDataTable
              rows={pendingApprovals}
              rowKey="id"
              emptyMessage="No pending approvals"
              columns={[
                { key: "po_number", header: "PO Number", cellClassName: "font-medium" },
                { key: "vendor_name", header: "Vendor", render: (po) => po.vendor_name || "-" },
                { key: "requester_name", header: "Requester" },
                { key: "total_amount", header: "Amount", render: (po) => formatCurrency(po.total_amount) },
                { key: "current_approval_level", header: "Approval Level", render: (po) => <Badge>Level {po.current_approval_level}</Badge> },
                {
                  key: "actions",
                  header: "Actions",
                  render: (po) => (
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
                  ),
                },
              ]}
            />
          </CardContent>
        </Card>
      </TabsContent>
    </>
  );
};

export default PoListTable;

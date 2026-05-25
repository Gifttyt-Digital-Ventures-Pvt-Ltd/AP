import React from "react";
import { CheckCircle, Clock, FileText, IndianRupee, Plus, Settings2 } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";

const PurchaseOrdersToolbar = ({
  setShowCreateDialog,
  setShowBuilderDialog,
  stats,
  formatCurrency,
  canManagePo,
  activeFormat,
}) => {
  return (
    <>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Purchase Orders</h1>
          <p className="text-muted-foreground">Create and track purchase orders</p>
          {activeFormat && (
            <p className="mt-1 text-xs text-muted-foreground">
              Active format: {activeFormat.name} ({activeFormat.templateCode}, {activeFormat.defaultCurrency})
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {canManagePo && (
            <>
              <Button variant="outline" onClick={() => setShowBuilderDialog(true)} data-testid="open-po-builder-btn">
                <Settings2 className="h-4 w-4 mr-2" />
                Format Builder
              </Button>
              <Button onClick={() => setShowCreateDialog(true)} data-testid="create-po-btn">
                <Plus className="h-4 w-4 mr-2" />
                Create PO
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total POs</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Draft</p>
                <p className="text-2xl font-bold">{stats.draft}</p>
              </div>
              <Clock className="h-8 w-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Approval</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Issued</p>
                <p className="text-2xl font-bold">{stats.issued}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-xl font-bold">{formatCurrency(stats.totalValue)}</p>
              </div>
              <IndianRupee className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default PurchaseOrdersToolbar;

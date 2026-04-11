import React from "react";
import { Building2, CheckCircle, FileText, Loader2, Package, Send, XCircle } from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table";

const PoDetailsDialog = ({
  showViewDialog,
  setShowViewDialog,
  selectedPO,
  statusColors,
  formatDate,
  formatCurrency,
  handleSubmitForApproval,
  submitting,
  setShowApprovalDialog,
}) => {
  return (
    <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Purchase Order: {selectedPO?.po_number}
          </DialogTitle>
        </DialogHeader>

        {selectedPO && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge className={`${statusColors[selectedPO.status]} text-white mt-1`}>{selectedPO.status}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">PO Type</p>
                <p className="font-medium">{selectedPO.po_type}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">PO Date</p>
                <p className="font-medium">{formatDate(selectedPO.po_date)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Delivery Date</p>
                <p className="font-medium">{formatDate(selectedPO.expected_delivery_date)}</p>
              </div>
            </div>

            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Vendor Information
                </CardTitle>
              </CardHeader>
              <CardContent className="py-3">
                <p className="font-medium">{selectedPO.vendor_name}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Line Items
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>HSN/SAC</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Tax</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedPO.line_items?.map((item, idx) => {
                      const lineNumber = item.line_number ?? item.lineNumber ?? idx + 1;
                      const description = item.item_description ?? item.description ?? "-";
                      const hsnSacCode = item.hsn_sac_code ?? item.hsnSac ?? "-";
                      const quantity = Number(item.quantity ?? 0);
                      const uom = item.unit_of_measure ?? item.uom ?? "";
                      const unitPrice = Number(item.unit_price ?? item.unitPrice ?? 0);
                      const taxAmount = Number(item.tax_amount ?? item.taxAmount ?? item.igst_amount ?? item.igstAmount ?? 0);
                      const totalAmount = Number(item.total_amount ?? item.totalAmount ?? item.line_amount ?? item.lineAmount ?? item.amount ?? 0);
                      return (
                        <TableRow key={idx}>
                          <TableCell>{lineNumber}</TableCell>
                          <TableCell>{description}</TableCell>
                          <TableCell>{hsnSacCode || "-"}</TableCell>
                          <TableCell>{quantity} {uom}</TableCell>
                          <TableCell>{formatCurrency(unitPrice)}</TableCell>
                          <TableCell>{formatCurrency(taxAmount)}</TableCell>
                          <TableCell className="font-medium">{formatCurrency(totalAmount)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <div className="w-72 space-y-2 border rounded-lg p-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>{formatCurrency(selectedPO.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax:</span>
                  <span>{formatCurrency(selectedPO.tax_amount)}</span>
                </div>
                <div className="flex justify-between font-semibold text-lg border-t pt-2">
                  <span>Total:</span>
                  <span>{formatCurrency(selectedPO.total_amount)}</span>
                </div>
              </div>
            </div>

            {selectedPO.approvals?.length > 0 && (
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Approval History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {selectedPO.approvals.map((approval, idx) => (
                      <div key={idx} className="flex items-center gap-4 text-sm">
                        {approval.action === "Approved" ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                        <span className="font-medium">Level {approval.approval_level}</span>
                        <span>{approval.approver_name}</span>
                        <Badge variant={approval.action === "Approved" ? "default" : "destructive"}>{approval.action}</Badge>
                        {approval.comments && <span className="text-muted-foreground">"{approval.comments}"</span>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setShowViewDialog(false)}>Close</Button>
          {selectedPO?.status === "Draft" && (
            <Button onClick={() => handleSubmitForApproval(selectedPO.id)} disabled={submitting} data-testid="submit-for-approval-btn">
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Send className="h-4 w-4 mr-2" />
              Submit for Approval
            </Button>
          )}
          {selectedPO?.status === "Pending Approval" && (
            <Button
              onClick={() => {
                setShowViewDialog(false);
                setShowApprovalDialog(true);
              }}
              data-testid="review-po-btn"
            >
              Review & Approve
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PoDetailsDialog;

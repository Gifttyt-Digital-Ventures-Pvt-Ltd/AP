import React from "react";
import { format } from "date-fns";
import { FileText, History, Pencil, User } from "lucide-react";
import ApprovalHistoryTimeline from "../../../components/common/ApprovalHistoryTimeline";
import { Button } from "../../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Label } from "../../../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { formatWorkflowStatus } from "../../../utils/approvalWorkflow";
import { formatInvoiceAmount } from "../utils/invoiceAmounts";

const ViewDialog = ({
  viewDialogOpen,
  setViewDialogOpen,
  selectedInvoice,
  renderPdfPreview,
  pdfZoom,
  viewPreviewError,
  setViewPreviewError,
  getStatusBadgeClass,
  viewTab,
  setViewTab,
  invoiceHistory,
  loadingHistory,
  canEdit,
  handleEditInvoice,
}) => {
  return (
    <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
      <DialogContent
        className="w-[96vw] max-w-6xl h-[90vh] max-h-[90vh] p-0 overflow-hidden"
        data-testid="view-invoice-dialog"
      >
        {selectedInvoice && (
          /* Keep both panes constrained to the dialog height so content scrolls inside, not outside. */
          <div className="grid grid-cols-1 lg:grid-cols-[35%_65%] h-full min-h-0">
            <div className="border-r h-full min-h-0 overflow-hidden">
              {renderPdfPreview({
                invoice: selectedInvoice,
                zoom: pdfZoom,
                imageError: viewPreviewError,
                setImageError: setViewPreviewError,
              })}
            </div>

            <div className="min-h-0 overflow-hidden flex flex-col">
              <div className="p-6 min-h-0 overflow-y-auto flex-1 scrollbar-thin-muted">
                <DialogHeader className="mb-6">
                  <DialogTitle className="text-2xl font-bold flex items-center justify-between">
                    <span>Invoice {selectedInvoice.invoice_number}</span>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadgeClass(selectedInvoice.status)}`}>
                      {formatWorkflowStatus(selectedInvoice.status)}
                    </span>
                  </DialogTitle>
                </DialogHeader>

                <Tabs value={viewTab} onValueChange={setViewTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="details"><FileText className="h-4 w-4 mr-2" />Details</TabsTrigger>
                    <TabsTrigger value="history"><History className="h-4 w-4 mr-2" />History ({invoiceHistory.length})</TabsTrigger>
                  </TabsList>

                  <TabsContent value="details" className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Vendor Details</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label className="text-xs text-muted-foreground">Vendor Name</Label><p className="font-medium">{selectedInvoice.vendor_name}</p></div>
                      <div><Label className="text-xs text-muted-foreground">Bill Number</Label><p className="font-['JetBrains_Mono'] font-medium">{selectedInvoice.invoice_number}</p></div>
                      <div><Label className="text-xs text-muted-foreground">Billing Date</Label><p className="font-medium">{format(new Date(selectedInvoice.invoice_date), "MMMM do, yyyy")}</p></div>
                      <div><Label className="text-xs text-muted-foreground">Due Date</Label><p className="font-medium">{format(new Date(selectedInvoice.due_date), "MMMM do, yyyy")}</p></div>
                    </div>
                  </div>

                  <div className="p-4 bg-primary/5 rounded-lg border">
                    <Label className="text-xs text-muted-foreground">Total Amount</Label>
                    <p className="text-3xl font-bold font-['JetBrains_Mono'] text-primary">
                      {formatInvoiceAmount(selectedInvoice, selectedInvoice.amount)}
                    </p>
                  </div>

                  {selectedInvoice.line_items && selectedInvoice.line_items.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Line Items</h3>
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-muted/50 border-b">
                            <tr>
                              <th className="p-3 text-left text-xs font-medium">Description</th>
                              <th className="p-3 text-right text-xs font-medium">Qty</th>
                              <th className="p-3 text-right text-xs font-medium">Unit Price</th>
                              <th className="p-3 text-right text-xs font-medium">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedInvoice.line_items.map((item, index) => (
                              <tr key={index} className="border-b last:border-0">
                                <td className="p-3 text-sm">{item.description}</td>
                                <td className="p-3 text-sm text-right font-['JetBrains_Mono']">{item.quantity || "-"}</td>
                                <td className="p-3 text-sm text-right font-['JetBrains_Mono']">
                                  {item.unit_price != null
                                    ? formatInvoiceAmount(selectedInvoice, item.unit_price)
                                    : "-"}
                                </td>
                                <td className="p-3 text-sm text-right font-['JetBrains_Mono'] font-semibold">
                                  {formatInvoiceAmount(selectedInvoice, item.amount)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="pt-4 border-t">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>Created by {selectedInvoice.created_by_name} on {format(new Date(selectedInvoice.created_at), "dd MMM yyyy, hh:mm a")}</span>
                    </div>
                  </div>
                </TabsContent>

                  <TabsContent value="history" className="space-y-4">
                    <ApprovalHistoryTimeline
                      history={invoiceHistory}
                      loading={loadingHistory}
                    />
                  </TabsContent>
                </Tabs>
              </div>

              <div className="flex gap-3 p-4 border-t bg-background shrink-0">
                <Button variant="outline" onClick={() => setViewDialogOpen(false)} className="flex-1">
                  Close
                </Button>
                {canEdit(selectedInvoice) && (
                  <Button
                    onClick={() => {
                      setViewDialogOpen(false);
                      handleEditInvoice(selectedInvoice);
                    }}
                    className="flex-1"
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Invoice
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ViewDialog;

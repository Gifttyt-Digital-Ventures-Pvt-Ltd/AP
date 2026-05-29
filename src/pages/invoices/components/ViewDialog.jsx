import React from "react";
import { format } from "date-fns";
import { ArrowRight, FileText, History, Pencil, User } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Label } from "../../../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import {
  formatWorkflowStatus,
  normalizeHistoryActionType,
  PAID_STATUS,
} from "../../../utils/approvalWorkflow";

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
  getHistoryIcon,
  getHistoryBadgeClass,
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
                    <p className="text-3xl font-bold font-['JetBrains_Mono'] text-primary">₹{selectedInvoice.amount.toLocaleString("en-IN")}</p>
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
                                <td className="p-3 text-sm text-right font-['JetBrains_Mono']">{item.unit_price ? `₹${item.unit_price.toLocaleString("en-IN")}` : "-"}</td>
                                <td className="p-3 text-sm text-right font-['JetBrains_Mono'] font-semibold">₹{item.amount.toLocaleString("en-IN")}</td>
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
                  {loadingHistory ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : invoiceHistory.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
                      <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No history records found</p>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-border" />
                      <div className="space-y-4">
                        {invoiceHistory.map((entry) => (
                          <div key={entry.id} className="relative flex gap-4">
                            <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-2 border-background shadow-sm ${["Created", "Approved", "Payment Released", PAID_STATUS].includes(normalizeHistoryActionType(entry.action_type)) ? "bg-emerald-100" : entry.action_type === "Rejected" ? "bg-red-100" : entry.action_type === "Edited" || entry.action_type === "Edited & Resubmitted" ? "bg-blue-100" : "bg-gray-100"}`}>
                              {getHistoryIcon(entry.action_type)}
                            </div>
                            <div className="flex-1 pb-4">
                              <div className="bg-card border rounded-lg p-4 shadow-sm">
                                <div className="flex items-start justify-between mb-2">
                                  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${getHistoryBadgeClass(entry.action_type)}`}>{normalizeHistoryActionType(entry.action_type)}</span>
                                  <div className="text-right text-xs text-muted-foreground">
                                    <p>{format(new Date(entry.timestamp), "dd MMM yyyy")}</p>
                                    <p>{format(new Date(entry.timestamp), "hh:mm a")}</p>
                                  </div>
                                </div>
                                <p className="text-sm mb-3">{entry.action_description}</p>
                                {entry.action_type === "Rejected" && entry.comments && (
                                  <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2">
                                    <p className="text-xs font-medium text-red-700">Rejection comments</p>
                                    <p className="mt-1 text-sm text-red-900 whitespace-pre-line">{entry.comments}</p>
                                  </div>
                                )}
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <User className="h-3 w-3" />
                                  <span className="font-medium">{entry.user_name}</span>
                                  <span>|</span>
                                  <span className="bg-muted px-2 py-0.5 rounded">{entry.user_role}</span>
                                </div>
                                {entry.changes && entry.changes.length > 0 && (
                                  <div className="mt-3 pt-3 border-t">
                                    <p className="text-xs font-medium text-muted-foreground mb-2">Changes:</p>
                                    {entry.changes.map((change, idx) => (
                                      <div key={idx} className="flex items-center gap-2 text-xs">
                                        <span className="font-medium capitalize">{change.field_name.replace(/_/g, " ")}:</span>
                                        <span className="text-red-500 line-through">{change.old_value || "empty"}</span>
                                        <ArrowRight className="h-3 w-3" />
                                        <span className="text-emerald-600">{change.new_value || "empty"}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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

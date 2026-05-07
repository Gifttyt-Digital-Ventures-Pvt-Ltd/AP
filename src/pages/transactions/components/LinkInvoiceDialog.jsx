import React from "react";
import { FileText, Link2, Search } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";

const LinkInvoiceDialog = ({
  linkInvoiceModalOpen,
  setLinkInvoiceModalOpen,
  invoiceSearchTerm,
  setInvoiceSearchTerm,
  filteredInvoicesForLinking,
  handleLinkInvoice,
  canLinkInvoices,
}) => {
  return (
    <Dialog open={linkInvoiceModalOpen} onOpenChange={setLinkInvoiceModalOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Select Invoice to Link</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by invoice number or vendor..."
              value={invoiceSearchTerm}
              onChange={(e) => setInvoiceSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>

          <div className="border rounded-lg max-h-[400px] overflow-y-auto">
            {filteredInvoicesForLinking.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p>No invoices found</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b sticky top-0">
                  <tr>
                    <th className="p-3 text-left font-medium">Invoice #</th>
                    <th className="p-3 text-left font-medium">Vendor</th>
                    <th className="p-3 text-right font-medium">Amount</th>
                    <th className="p-3 text-center font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredInvoicesForLinking.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="p-3 font-medium">{inv.invoice_number}</td>
                      <td className="p-3">{inv.vendor_name}</td>
                      <td className="p-3 text-right">₹{inv.amount?.toLocaleString("en-IN")}</td>
                      <td className="p-3 text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleLinkInvoice(inv.id)}
                          disabled={!canLinkInvoices}
                        >
                          <Link2 className="h-3 w-3 mr-1" />
                          Link
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LinkInvoiceDialog;

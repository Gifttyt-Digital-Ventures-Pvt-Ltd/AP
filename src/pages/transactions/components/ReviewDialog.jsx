import React from "react";
import { format } from "date-fns";
import { FileText, X } from "lucide-react";

const ReviewDialog = ({
  invoicePanelOpen,
  setInvoicePanelOpen,
  setSelectedInvoice,
  selectedInvoice,
  loadingInvoice,
}) => {
  if (!invoicePanelOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="flex-1 bg-black/50"
        onClick={() => {
          setInvoicePanelOpen(false);
          setSelectedInvoice(null);
        }}
      />

      <div className="w-[500px] bg-white shadow-2xl h-full overflow-hidden flex flex-col animate-in slide-in-from-right">
        <div className="p-4 border-b flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold">{selectedInvoice?.invoice_number || "Invoice Details"}</h3>
          </div>
          <button
            onClick={() => {
              setInvoicePanelOpen(false);
              setSelectedInvoice(null);
            }}
            className="p-1 hover:bg-gray-200 rounded"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loadingInvoice ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : selectedInvoice ? (
            <div className="space-y-4">
              <div className="border rounded-lg overflow-hidden bg-gray-100 h-[400px] flex items-center justify-center">
                {selectedInvoice.file_id ? (
                  <iframe src={`/api/files/${selectedInvoice.file_id}`} className="w-full h-full" title="Invoice Preview" />
                ) : selectedInvoice.voucher_file_id ? (
                  <iframe src={`/api/files/voucher/${selectedInvoice.voucher_file_id}`} className="w-full h-full" title="Voucher Preview" />
                ) : (
                  <div className="text-center text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>No preview available</p>
                  </div>
                )}
              </div>

              {selectedInvoice.vendor_name && (
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-800 border-b pb-2">Invoice Details</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">Invoice #</span>
                      <p className="font-medium">{selectedInvoice.invoice_number}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Vendor</span>
                      <p className="font-medium">{selectedInvoice.vendor_name}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Amount</span>
                      <p className="font-medium">₹{selectedInvoice.amount?.toLocaleString("en-IN")}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Status</span>
                      <p className="font-medium">{selectedInvoice.status}</p>
                    </div>
                    {selectedInvoice.invoice_date && (
                      <div>
                        <span className="text-gray-500">Invoice Date</span>
                        <p className="font-medium">{format(new Date(selectedInvoice.invoice_date), "d MMM yyyy")}</p>
                      </div>
                    )}
                    {selectedInvoice.due_date && (
                      <div>
                        <span className="text-gray-500">Due Date</span>
                        <p className="font-medium">{format(new Date(selectedInvoice.due_date), "d MMM yyyy")}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-500 mt-20">
              <p>No invoice data</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewDialog;

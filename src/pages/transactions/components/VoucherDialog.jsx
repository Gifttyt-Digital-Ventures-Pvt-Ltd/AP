import React from "react";
import { Link2, Plus, Upload } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";

const VoucherDialog = ({
  voucherModalOpen,
  setVoucherModalOpen,
  selectedTransactionForVoucher,
  setLinkInvoiceModalOpen,
  voucherNumber,
  setVoucherNumber,
  voucherFileInputRef,
  setVoucherFile,
  voucherFile,
  handleUploadVoucher,
  uploadingVoucher,
}) => {
  return (
    <Dialog open={voucherModalOpen} onOpenChange={setVoucherModalOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-amber-600" />
            Add Voucher / Link Invoice
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {selectedTransactionForVoucher && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              <p className="text-gray-500">Transaction</p>
              <p className="font-medium truncate">{selectedTransactionForVoucher.description}</p>
              <p className="text-lg font-bold mt-1">₹{selectedTransactionForVoucher.amount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
            </div>
          )}

          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Link2 className="h-4 w-4 text-blue-600" />
              <h4 className="font-medium">Link Existing Invoice</h4>
            </div>
            <Button variant="outline" className="w-full" onClick={() => setLinkInvoiceModalOpen(true)}>
              Select from System Invoices
            </Button>
          </div>

          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Upload className="h-4 w-4 text-green-600" />
              <h4 className="font-medium">Upload New Voucher</h4>
            </div>
            <div className="space-y-3">
              <div>
                <Label className="text-sm">Voucher Number</Label>
                <Input value={voucherNumber} onChange={(e) => setVoucherNumber(e.target.value)} placeholder="Enter voucher number" className="mt-1" />
              </div>
              <div>
                <Label className="text-sm">Voucher File</Label>
                <input type="file" ref={voucherFileInputRef} onChange={(e) => setVoucherFile(e.target.files[0])} accept=".pdf,.png,.jpg,.jpeg" className="hidden" />
                <div className="mt-1 flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => voucherFileInputRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-1" />
                    Choose File
                  </Button>
                  {voucherFile && <span className="text-sm text-gray-600 truncate max-w-[200px]">{voucherFile.name}</span>}
                </div>
              </div>

              <Button onClick={handleUploadVoucher} disabled={uploadingVoucher || !voucherFile || !voucherNumber} className="w-full">
                {uploadingVoucher ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Uploading...
                  </>
                ) : (
                  "Upload Voucher"
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VoucherDialog;

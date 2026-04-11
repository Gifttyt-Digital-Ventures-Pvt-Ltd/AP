import React from "react";
import { Sparkles, Upload } from "lucide-react";
import { Button } from "../../../components/ui/button";

const InvoiceHeader = ({
  scanning,
  openBulkFilePicker,
  bulkFileInputRef,
  handleBulkFileUpload,
  openSingleFilePicker,
  fileInputRef,
  handleSingleFileUpload,
}) => {
  return (
    <div className="flex justify-between items-center mb-8">
      <div>
        <h1 className="text-4xl md:text-5xl font-bold font-['Manrope'] text-primary mb-2" data-testid="invoices-title">
          Invoices
        </h1>
        <p className="text-muted-foreground">Upload and manage all invoices</p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={openBulkFilePicker} data-testid="bulk-upload-button" disabled={scanning}>
          <Upload className="h-4 w-4 mr-2" />
          Bulk Upload
        </Button>
        <input ref={bulkFileInputRef} type="file" accept="image/*,.pdf" multiple onChange={handleBulkFileUpload} className="hidden" />
        <Button onClick={openSingleFilePicker} data-testid="upload-invoice-button" disabled={scanning}>
          {scanning ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Extracting...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Upload Invoice
            </>
          )}
        </Button>
        <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={handleSingleFileUpload} className="hidden" />
      </div>
    </div>
  );
};

export default InvoiceHeader;

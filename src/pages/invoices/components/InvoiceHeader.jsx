import React from "react";
import { Sparkles, Upload } from "lucide-react";
import { Button } from "../../../components/ui/button";
import CurrencySelector from "../../../components/common/CurrencySelector";

const InvoiceHeader = ({
  scanning,
  canScanInvoices,
  canBulkUploadInvoices,
  openBulkFilePicker,
  bulkFileInputRef,
  handleBulkFileUpload,
  openSingleFilePicker,
  fileInputRef,
  handleSingleFileUpload,
  currencies = [],
  selectedCurrency,
  onCurrencyChange,
}) => {
  return (
    <div className="flex flex-col gap-4 mb-8 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 className="text-4xl md:text-5xl font-bold font-['Manrope'] text-primary mb-2" data-testid="invoices-title">
          Invoices
        </h1>
        <p className="text-muted-foreground">Upload and manage all invoices</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <CurrencySelector
          currencies={currencies}
          value={selectedCurrency}
          onChange={onCurrencyChange}
          variant="inline"
          id="invoice-currency-filter"
        />
        <Button
          variant="outline"
          onClick={openBulkFilePicker}
          data-testid="bulk-upload-button"
          disabled={scanning || !canBulkUploadInvoices}
        >
          <Upload className="h-4 w-4 mr-2" />
          Bulk Upload
        </Button>
        <input ref={bulkFileInputRef} type="file" accept="image/*,.pdf" multiple onChange={handleBulkFileUpload} className="hidden" />
        <Button
          onClick={openSingleFilePicker}
          data-testid="upload-invoice-button"
          disabled={scanning || !canScanInvoices}
        >
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

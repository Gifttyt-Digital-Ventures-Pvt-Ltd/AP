import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Upload, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { Separator } from '../../../components/ui/separator';
import FileUploader from '../../../components/common/FileUploader';
import MeteredActionCostHint from '../../../components/credits/MeteredActionCostHint';
import { CREDIT_ACTION_CODES } from '../../../constants/creditActions';

const UploadErrorsPanel = ({ errors = [] }) => {
  if (!errors.length) return null;

  return (
    <div
      className="mt-2 max-h-80 overflow-y-auto rounded-md border border-red-200 bg-[#FFF4F4]"
      data-testid="vendor-upload-errors"
      role="alert"
    >
      <div className="flex items-center gap-2 px-4 py-3 text-[#D74141]">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <p className="text-base font-medium">Error</p>
      </div>
      <Separator className="bg-[#E6E6E6]" />
      <ul className="space-y-1 px-4 py-3">
        {errors.map((error, index) => (
          <li key={`${error}-${index}`} className="text-xs leading-relaxed text-foreground">
            {error}
          </li>
        ))}
      </ul>
    </div>
  );
};

const MultipleVendorUploadDialog = ({
  open,
  onOpenChange,
  onDownloadTemplate,
  onDataParsed,
  disabled,
  expectedHeaders,
  uploadHeaderMap,
  nonMandatoryFields,
  customValidation,
}) => {
  const [uploadErrors, setUploadErrors] = useState([]);

  useEffect(() => {
    if (!open) {
      setUploadErrors([]);
    }
  }, [open]);

  const handleDataParsed = useCallback(
    async (rows, file) => {
      if (typeof onDataParsed !== 'function') return;

      setUploadErrors([]);
      const result = await onDataParsed(rows, file);
      if (Array.isArray(result?.errors) && result.errors.length > 0) {
        setUploadErrors(result.errors);
      }
    },
    [onDataParsed],
  );

  const handleClearFile = (clearSelectedFile) => {
    clearSelectedFile();
    setUploadErrors([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Multiple Vendor Upload</DialogTitle>
          <DialogDescription>
            Upload a spreadsheet to import vendors in Saved status. Only company name is required
            at import; complete GSTIN, bank, and documents by editing each vendor before submitting
            for approval. See the Guide sheet in the sample spreadsheet for upload rules.
          </DialogDescription>
        </DialogHeader>
        <MeteredActionCostHint actionCode={CREDIT_ACTION_CODES.VENDOR_UPLOAD} className="mb-4" />
        <div className="rounded-lg border border-border bg-muted/20 p-5">
          <div className="space-y-4">
            <FileUploader
              key={open ? 'vendor-upload-open' : 'vendor-upload-closed'}
              acceptedExtensions={['xlsx', 'xls', 'csv']}
              expectedHeaders={expectedHeaders}
              uploadHeaderMap={uploadHeaderMap}
              nonMandatoryFields={nonMandatoryFields}
              customValidation={customValidation}
              onDataParsed={handleDataParsed}
              onErrors={setUploadErrors}
              disabled={disabled}
            >
              {({
                clearSelectedFile,
                fileName,
                isParsing,
                isDragging,
                getDropZoneProps,
              }) => (
                <div className="space-y-2">
                  <div
                    {...getDropZoneProps()}
                    data-testid="vendor-bulk-upload-dropzone"
                    aria-label="Upload vendor spreadsheet"
                    className={`flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed px-4 py-8 text-center transition-colors ${
                      isDragging
                        ? 'border-primary bg-primary/10'
                        : 'border-[#6311CB] bg-[#3725EA26]'
                    } ${disabled || isParsing ? 'pointer-events-none opacity-60' : ''}`}
                  >
                    <Upload className="h-8 w-8 text-primary" />
                    {fileName ? (
                      <p className="mb-0 flex items-center gap-1 text-sm font-medium text-foreground">
                        {fileName}
                        <button
                          type="button"
                          aria-label="Remove file"
                          className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          onClick={(event) => {
                            event.stopPropagation();
                            event.preventDefault();
                            handleClearFile(clearSelectedFile);
                          }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </p>
                    ) : null}
                    <p className="mb-0 text-lg font-medium text-primary">
                      {isParsing ? 'Processing...' : 'Upload spreadsheet'}
                    </p>
                    {!isParsing && (
                      <p className="mb-0 text-sm text-muted-foreground">
                        Click to upload or drag and drop the sheet
                      </p>
                    )}
                    <p className="mb-0 text-xs text-muted-foreground">
                      (only xlsx, xls, csv formats are supported)
                    </p>
                  </div>

                  <p className="rounded-sm bg-muted px-2 py-1 text-sm text-muted-foreground">
                    Download a{' '}
                    <button
                      type="button"
                      className="font-medium text-primary underline-offset-2 hover:underline"
                      onClick={onDownloadTemplate}
                    >
                      sample spreadsheet
                    </button>{' '}
                    to quickly start your import
                  </p>

                  <UploadErrorsPanel errors={uploadErrors} />
                </div>
              )}
            </FileUploader>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MultipleVendorUploadDialog;

import React from 'react';
import { Button } from '../../../components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import FileUploader from '../../../components/common/FileUploader';

const MultipleVendorUploadDialog = ({
  open,
  onOpenChange,
  onDownloadTemplate,
  onDataParsed,
  onUploadErrors,
  disabled,
  expectedHeaders,
  uploadHeaderMap,
  nonMandatoryFields,
  customValidation,
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Multiple Vendor Upload</DialogTitle>
        <DialogDescription>
          Download the template, fill the required vendor fields, then upload using file picker or drag and drop.
        </DialogDescription>
      </DialogHeader>
      <div className="rounded-lg border border-border bg-muted/20 p-5">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Upload Vendor Sheet</p>
              <p className="text-xs text-muted-foreground">Supported formats: .xlsx, .xls, .csv</p>
            </div>
            <Button variant="outline" onClick={onDownloadTemplate}>
              Download Sheet
            </Button>
          </div>

          <FileUploader
            acceptedExtensions={['xlsx', 'xls', 'csv']}
            expectedHeaders={expectedHeaders}
            uploadHeaderMap={uploadHeaderMap}
            nonMandatoryFields={nonMandatoryFields}
            customValidation={customValidation}
            onDataParsed={onDataParsed}
            onErrors={onUploadErrors}
            disabled={disabled}
          >
            {({ openFilePicker, isParsing, isDragging, getDropZoneProps }) => (
              <div className="space-y-3">
                <div
                  {...getDropZoneProps()}
                  className={`rounded-md border border-dashed px-4 py-8 text-center transition-colors ${
                    isDragging ? 'border-primary bg-primary/5' : 'border-border bg-background'
                  }`}
                >
                  <p className="text-sm font-medium">Drag and drop your file here</p>
                  <p className="mt-1 text-xs text-muted-foreground">or upload using the button below</p>
                </div>
                <div className="flex justify-end">
                  <Button
                    className="min-w-36"
                    onClick={openFilePicker}
                    disabled={disabled || isParsing}
                  >
                    Upload File
                  </Button>
                </div>
              </div>
            )}
          </FileUploader>
        </div>
      </div>
    </DialogContent>
  </Dialog>
);

export default MultipleVendorUploadDialog;

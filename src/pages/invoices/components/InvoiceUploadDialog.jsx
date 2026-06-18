import React, { useEffect, useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import MeteredActionCostHint from "../../../components/credits/MeteredActionCostHint";
import { CREDIT_ACTION_CODES } from "../../../constants/creditActions";
import { useMeteredActionEstimate } from "../../../hooks/useMeteredActionEstimate";

const InvoiceUploadDialog = ({
  open,
  onOpenChange,
  onFilesSelected,
  disabled = false,
  overlayClassName,
  contentClassName,
  actionCode = CREDIT_ACTION_CODES.INVOICE_UPLOAD,
}) => {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pendingFiles, setPendingFiles] = useState([]);
  const estimate = useMeteredActionEstimate(actionCode, pendingFiles.length);

  useEffect(() => {
    if (!open) {
      setPendingFiles([]);
      setIsDragging(false);
    }
  }, [open]);

  const handleFiles = (fileList) => {
    const files = Array.from(fileList || []).filter(Boolean);
    if (disabled || files.length === 0) return;
    setPendingFiles(files);
  };

  const handleConfirmUpload = async () => {
    if (disabled || pendingFiles.length === 0) return;
    if (estimate.isDisabled) return;

    const shouldClose = await onFilesSelected(pendingFiles);
    if (shouldClose !== false) {
      setPendingFiles([]);
      onOpenChange(false);
    }
  };

  const openFilePicker = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    setIsDragging(false);
    handleFiles(event.dataTransfer?.files);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setIsDragging(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName={overlayClassName}
        className={contentClassName ? `max-w-2xl ${contentClassName}` : "max-w-2xl"}
        data-testid="invoice-upload-dialog"
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Upload Invoice</DialogTitle>
          <DialogDescription>
            {pendingFiles.length > 0
              ? `Review the token estimate before uploading ${pendingFiles.length} file${pendingFiles.length === 1 ? "" : "s"}.`
              : "Select invoice files to upload."}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-muted/20 p-5">
          <input
            ref={inputRef}
            type="file"
            accept="image/*,.pdf"
            multiple
            className="hidden"
            onChange={(event) => {
              handleFiles(event.target.files);
              event.target.value = "";
            }}
          />

          {pendingFiles.length === 0 ? (
            <div
              role="button"
              tabIndex={disabled ? -1 : 0}
              data-testid="invoice-upload-dropzone"
              aria-label="Upload invoice files"
              onClick={openFilePicker}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openFilePicker();
                }
              }}
              onDragOver={handleDragOver}
              onDragEnter={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed px-4 py-10 text-center transition-colors ${
                isDragging
                  ? "border-primary bg-primary/10"
                  : "border-[#6311CB] bg-[#3725EA26]"
              } ${disabled ? "pointer-events-none opacity-60" : ""}`}
            >
              <Upload className="h-8 w-8 text-primary" />
              <p className="mb-0 text-lg font-medium text-primary">
                Upload invoice
              </p>
              <p className="mb-0 text-sm text-muted-foreground">
                Click to upload or drag and drop invoice files
              </p>
              <p className="mb-0 text-xs text-muted-foreground">
                (only PDF and image formats are supported)
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border bg-background p-4">
                <p className="text-sm font-medium text-primary-text">
                  {pendingFiles.length} file{pendingFiles.length === 1 ? "" : "s"} selected
                </p>
                <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-sm text-muted-foreground">
                  {pendingFiles.map((file) => (
                    <li key={`${file.name}-${file.size}`}>{file.name}</li>
                  ))}
                </ul>
              </div>
              <MeteredActionCostHint actionCode={actionCode} unitCount={pendingFiles.length} />
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => setPendingFiles([])}>
                  Choose different files
                </Button>
                <Button type="button" variant="outline" onClick={openFilePicker}>
                  Add more files
                </Button>
              </div>
            </div>
          )}

          <button
            type="button"
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-3.5 w-3.5" />
            Cancel upload
          </button>
        </div>

        {pendingFiles.length > 0 ? (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmUpload}
              disabled={disabled || estimate.isDisabled || estimate.loading}
              data-testid="invoice-upload-confirm-button"
            >
              Upload {pendingFiles.length} file{pendingFiles.length === 1 ? "" : "s"}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceUploadDialog;

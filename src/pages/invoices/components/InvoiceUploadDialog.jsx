import React, { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";

const InvoiceUploadDialog = ({
  open,
  onOpenChange,
  onFilesSelected,
  disabled = false,
  overlayClassName,
  contentClassName,
}) => {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || []).filter(Boolean);
    if (disabled || files.length === 0) return;

    const shouldClose = await onFilesSelected(files);
    if (shouldClose !== false) {
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
    await handleFiles(event.dataTransfer?.files);
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
          <DialogDescription>Select invoice files to upload.</DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-muted/20 p-5">
          <input
            ref={inputRef}
            type="file"
            accept="image/*,.pdf"
            multiple
            className="hidden"
            onChange={async (event) => {
              await handleFiles(event.target.files);
              event.target.value = "";
            }}
          />

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

          <button
            type="button"
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-3.5 w-3.5" />
            Cancel upload
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceUploadDialog;

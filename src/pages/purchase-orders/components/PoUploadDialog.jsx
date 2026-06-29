import React, { useEffect, useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import MeteredActionCostHint from '../../../components/credits/MeteredActionCostHint';
import { CREDIT_ACTION_CODES } from '../../../constants/creditActions';
import { useRBAC } from '../../../contexts/RBACContext';
import { useMeteredActionEstimate } from '../../../hooks/useMeteredActionEstimate';

const PoUploadDialog = ({
  open,
  onOpenChange,
  onFileSelected,
  disabled = false,
}) => {
  const { isTokenBasedSubscription } = useRBAC();
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const estimate = useMeteredActionEstimate(CREDIT_ACTION_CODES.PO_UPLOAD, pendingFile ? 1 : 0);

  useEffect(() => {
    if (!open) {
      setPendingFile(null);
      setIsDragging(false);
    }
  }, [open]);

  const uploadFile = async (file) => {
    const shouldClose = await onFileSelected(file);
    if (shouldClose !== false) {
      setPendingFile(null);
      onOpenChange(false);
    }
  };

  const handleFile = async (fileList) => {
    const file = Array.from(fileList || []).filter(Boolean)[0];
    if (disabled || !file) return;

    if (!isTokenBasedSubscription) {
      await uploadFile(file);
      return;
    }

    setPendingFile(file);
  };

  const handleConfirmUpload = async () => {
    if (disabled || !pendingFile || estimate.isDisabled) return;
    await uploadFile(pendingFile);
  };

  const openFilePicker = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    handleFile(event.dataTransfer?.files);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl"
        data-testid="po-upload-dialog"
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Upload Purchase Order</DialogTitle>
          <DialogDescription>
            Upload a vendor PO document (PDF or image). Data will be extracted as-is — no internal PO format is applied.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border bg-muted/20 p-5">
          <input
            ref={inputRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={(event) => {
              handleFile(event.target.files);
              event.target.value = '';
            }}
          />

          {!pendingFile ? (
            <div
              role="button"
              tabIndex={disabled ? -1 : 0}
              data-testid="po-upload-dropzone"
              aria-label="Upload purchase order file"
              onClick={openFilePicker}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  openFilePicker();
                }
              }}
              onDragOver={(event) => {
                event.preventDefault();
                if (!disabled) setIsDragging(true);
              }}
              onDragEnter={(event) => {
                event.preventDefault();
                if (!disabled) setIsDragging(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                setIsDragging(false);
              }}
              onDrop={handleDrop}
              className={`flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed px-4 py-10 text-center transition-colors ${
                isDragging
                  ? 'border-primary bg-primary/10'
                  : 'border-[#6311CB] bg-[#3725EA26]'
              } ${disabled ? 'pointer-events-none opacity-60' : ''}`}
            >
              <Upload className="h-8 w-8 text-primary" />
              <p className="mb-0 text-lg font-medium text-primary">Upload purchase order</p>
              <p className="mb-0 text-sm text-muted-foreground">
                Click to upload or drag and drop a PO document
              </p>
              <p className="mb-0 text-xs text-muted-foreground">
                PDF, PNG, and JPG formats are supported
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border bg-background p-4">
                <p className="text-sm font-medium text-primary-text">Selected file</p>
                <p className="mt-2 text-sm text-muted-foreground">{pendingFile.name}</p>
              </div>
              <MeteredActionCostHint actionCode={CREDIT_ACTION_CODES.PO_UPLOAD} unitCount={1} />
              <Button type="button" variant="outline" onClick={() => setPendingFile(null)}>
                Choose a different file
              </Button>
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

        {pendingFile ? (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmUpload}
              disabled={disabled || estimate.isDisabled || estimate.loading}
              data-testid="po-upload-confirm-button"
            >
              Scan PO
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default PoUploadDialog;

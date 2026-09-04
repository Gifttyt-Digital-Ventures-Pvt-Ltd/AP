import React, { useRef, useState } from 'react';
import { Eye, FileText, Trash2, Upload, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../../components/ui/button';
import {
  VENDOR_DOCUMENT_ACCEPT,
  createVendorDocumentMeta,
  formatVendorDocumentSize,
  getVendorDocumentValidationError,
  normalizeVendorDocuments,
} from '../utils/vendorDocuments';
import VendorDocumentPreviewDialog from './VendorDocumentPreviewDialog';

const documentRowKey = (document) => document.id ?? document.clientId;

const VendorDocumentRow = ({ document, onView, onRemove, disabled, readOnly }) => (
  <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 text-sm">
    <div className="flex min-w-0 items-start gap-2">
      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{document.fileName}</p>
        <p className="text-xs text-muted-foreground">
          {formatVendorDocumentSize(document.fileSize)}
          {document.mimeType ? ` · ${document.mimeType}` : ''}
        </p>
      </div>
    </div>
    <div className="flex shrink-0 items-center gap-1">
      {document.downloadUrl || document.storageKey ? (
        <Button type="button" variant="outline" size="sm" onClick={onView} data-testid="vendor-document-view-btn">
          <Eye className="mr-2 h-4 w-4" />
          View
        </Button>
      ) : null}
      {!readOnly ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={onRemove}
          disabled={disabled}
          title="Remove document"
          data-testid="vendor-document-remove-btn"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  </div>
);

/**
 * Single common upload area for all vendor documents. `documents` is a generic array (see
 * docs/vendor-documents-api-contract.md) — there are no more fixed PAN/GST/COI slots, so a
 * document never needs a type picked for it; `documentType` still round-trips on each entry
 * for backend's own use, but this component never surfaces or requires it.
 */
const VendorDocumentsPanel = ({
  documents = [],
  onChange,
  disabled = false,
  readOnly = false,
  // Retained for backward compatibility with existing callers that still compute a tenant's
  // enabled document-type whitelist (src/utils/vendorDocumentConfig.js) — no longer used here
  // to filter rows, since uploads aren't split into fixed type slots anymore.
  visibleDocumentTypes = null,
  gridClassName = null,
}) => {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const normalizedDocuments = normalizeVendorDocuments(documents);

  const openFilePicker = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const addFiles = (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    const accepted = [];
    files.forEach((file) => {
      const validationError = getVendorDocumentValidationError(file);
      if (validationError) {
        toast.error(`${file.name}: ${validationError}`);
        return;
      }
      accepted.push(createVendorDocumentMeta(file));
    });

    if (accepted.length) {
      onChange?.([...normalizedDocuments, ...accepted]);
    }
  };

  const handleInputChange = (event) => {
    addFiles(event.target.files);
    event.target.value = '';
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    if (disabled) return;
    setIsDragging(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    addFiles(event.dataTransfer?.files);
  };

  const handleRemove = (document) => {
    onChange?.(normalizedDocuments.filter((entry) => documentRowKey(entry) !== documentRowKey(document)));
  };

  if (readOnly) {
    if (!normalizedDocuments.length) {
      return (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
          No vendor documents uploaded.
        </div>
      );
    }

    return (
      <>
        <div className={gridClassName || 'space-y-2'}>
          {normalizedDocuments.map((document) => (
            <VendorDocumentRow
              key={documentRowKey(document)}
              document={document}
              readOnly
              onView={() => setPreviewDoc(document)}
            />
          ))}
        </div>
        <VendorDocumentPreviewDialog
          open={Boolean(previewDoc)}
          onOpenChange={(open) => !open && setPreviewDoc(null)}
          document={previewDoc}
        />
      </>
    );
  }

  return (
    <div className={gridClassName || 'flex w-full flex-col gap-4'}>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={openFilePicker}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            openFilePicker();
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          isDragging ? 'border-primary bg-primary/5' : 'border-border bg-muted/20'
        } ${disabled ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:border-primary/60'}`}
        data-testid="vendor-documents-dropzone"
      >
        <UploadCloud className="h-6 w-6 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">Drag & drop files here, or click to browse</p>
        <p className="text-xs text-muted-foreground">Supported: PDF, JPG, JPEG, PNG, WEBP · Up to 10 MB each</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={VENDOR_DOCUMENT_ACCEPT}
          className="hidden"
          onChange={handleInputChange}
          disabled={disabled}
          data-testid="vendor-documents-input"
        />
      </div>

      {normalizedDocuments.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-foreground">Uploaded documents</p>
          {normalizedDocuments.map((document) => (
            <VendorDocumentRow
              key={documentRowKey(document)}
              document={document}
              disabled={disabled}
              onView={() => setPreviewDoc(document)}
              onRemove={() => handleRemove(document)}
            />
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={openFilePicker}
            disabled={disabled}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload More Documents
          </Button>
        </div>
      ) : null}

      <VendorDocumentPreviewDialog
        open={Boolean(previewDoc)}
        onOpenChange={(open) => !open && setPreviewDoc(null)}
        document={previewDoc}
      />
    </div>
  );
};

export default VendorDocumentsPanel;

import React, { useRef } from 'react';
import { FileText, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../../components/ui/button';
import { Label } from '../../../components/ui/label';
import {
  VENDOR_DOCUMENT_ACCEPT,
  VENDOR_DOCUMENT_TYPES,
  createVendorDocumentMeta,
  formatVendorDocumentSize,
  getVendorDocumentValidationError,
  normalizeVendorDocuments,
} from '../utils/vendorDocuments';

const VendorDocumentRow = ({ docKey, label, document, onUpload, onRemove, disabled }) => {
  const inputRef = useRef(null);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const validationError = getVendorDocumentValidationError(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    onUpload(docKey, { ...createVendorDocumentMeta(file), _file: file });
  };

  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <Label className="text-sm font-medium text-foreground">{label}</Label>
          <p className="mt-0.5 text-xs text-muted-foreground">Optional</p>
          {document ? (
            <div className="mt-2 flex items-start gap-2 text-sm">
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{document.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {formatVendorDocumentSize(document.fileSize)}
                  {document.mimeType ? ` · ${document.mimeType}` : ''}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">No file uploaded</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={VENDOR_DOCUMENT_ACCEPT}
            className="hidden"
            onChange={handleFileChange}
            disabled={disabled}
            data-testid={`vendor-document-input-${docKey}`}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={disabled}
          >
            <Upload className="mr-2 h-4 w-4" />
            {document ? 'Replace' : 'Upload'}
          </Button>
          {document ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => onRemove(docKey)}
              disabled={disabled}
              title="Remove document"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const VendorDocumentsPanel = ({
  documents = {},
  onChange,
  disabled = false,
  readOnly = false,
  visibleDocumentTypes = null,
}) => {
  const normalizedDocuments = normalizeVendorDocuments(documents);
  const documentTypes = Array.isArray(visibleDocumentTypes) && visibleDocumentTypes.length > 0
    ? visibleDocumentTypes
    : VENDOR_DOCUMENT_TYPES;

  const handleUpload = (docKey, meta) => {
    onChange?.({
      ...normalizedDocuments,
      [docKey]: meta,
    });
  };

  const handleRemove = (docKey) => {
    onChange?.({
      ...normalizedDocuments,
      [docKey]: null,
    });
  };

  if (readOnly) {
    const uploaded = documentTypes.filter(({ key }) => normalizedDocuments[key]);
    if (!uploaded.length) {
      return (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
          No vendor documents uploaded.
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {uploaded.map(({ key, label }) => {
          const document = normalizedDocuments[key];
          return (
            <div
              key={key}
              className="flex items-start gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="font-medium text-foreground">{label}</p>
                <p className="truncate text-muted-foreground">{document.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {formatVendorDocumentSize(document.fileSize)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {documentTypes.map(({ key, label }) => (
        <VendorDocumentRow
          key={key}
          docKey={key}
          label={label}
          document={normalizedDocuments[key]}
          onUpload={handleUpload}
          onRemove={handleRemove}
          disabled={disabled}
        />
      ))}
    </div>
  );
};

export default VendorDocumentsPanel;

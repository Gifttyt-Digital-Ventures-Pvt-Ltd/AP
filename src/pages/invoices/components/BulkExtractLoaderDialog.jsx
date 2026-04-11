import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog';

// Blocking loader shown while the bulk extraction request is in progress.
const BulkExtractLoaderDialog = ({
  open,
  totalFiles,
  progress,
  elapsedSeconds,
  formatDuration,
}) => (
  <Dialog open={open}>
    <DialogContent className="max-w-md" data-testid="bulk-extract-loader-dialog">
      <DialogHeader>
        <DialogTitle>Uploading & Extracting Invoices</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Processing {totalFiles} file{totalFiles === 1 ? '' : 's'}...
        </p>
        <div className="h-2 w-full rounded bg-muted overflow-hidden">
          {/* Determinate progress keeps users informed during multi-file extraction. */}
          <div
            className="h-full bg-primary transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Please wait, do not close this window.</span>
          <span>{Math.round(progress)}% | {formatDuration(elapsedSeconds)}</span>
        </div>
      </div>
    </DialogContent>
  </Dialog>
);

export default BulkExtractLoaderDialog;

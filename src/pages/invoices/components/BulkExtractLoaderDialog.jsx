import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog';

// Blocking loader shown while the bulk extraction request is in progress.
const BulkExtractLoaderDialog = ({
  open,
  totalFiles,
  progress,
  elapsedSeconds,
  formatDuration,
}) => {
  const safeTotalFiles = Math.max(0, Number(totalFiles) || 0);
  const safeProgress = Math.min(100, Math.max(0, Number(progress) || 0));
  const extractedCount =
    safeTotalFiles > 0
      ? Math.min(safeTotalFiles, Math.floor((safeProgress / 100) * safeTotalFiles))
      : 0;

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-md" data-testid="bulk-extract-loader-dialog">
        <DialogHeader>
          <DialogTitle>Uploading & Extracting Invoices</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {extractedCount} of {safeTotalFiles} invoice{safeTotalFiles === 1 ? '' : 's'} extracted
          </p>
          <div className="h-2 w-full rounded bg-muted overflow-hidden">
            {/* Determinate progress keeps users informed during multi-file extraction. */}
            <div
              className="h-full bg-primary transition-all duration-700"
              style={{ width: `${safeProgress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Please wait, do not close this window.</span>
            <span>{formatDuration(elapsedSeconds)}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkExtractLoaderDialog;

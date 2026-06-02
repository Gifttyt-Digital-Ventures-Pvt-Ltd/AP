import React, { useMemo } from 'react';
import { Button } from '../../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { isDuplicateBulkPreviewItem } from '../utils/duplicateInvoice';

const BulkPreviewDialog = ({
  open,
  bulkCreating,
  bulkPreviewItems = [],
  bulkProgress,
  bulkElapsedSeconds,
  formatDuration,
  setBulkPreviewOpen,
  handleCreateBulkInvoices,
}) => {
  const scannedCount = bulkPreviewItems.length;
  const pendingCount = bulkPreviewItems.filter((item) => item.status !== 'uploaded').length;
  const duplicateCount = bulkPreviewItems.filter((item) => isDuplicateBulkPreviewItem(item)).length;
  const failedExtractionCount = bulkPreviewItems.filter(
    (item) => item.status !== 'uploaded' && item.status !== 'success' && !isDuplicateBulkPreviewItem(item),
  ).length;
  const proceedAllCount = pendingCount;
  const proceedWithoutDuplicateCount = useMemo(
    () =>
      bulkPreviewItems.filter(
        (item) => item.status !== 'uploaded' && !isDuplicateBulkPreviewItem(item),
      ).length,
    [bulkPreviewItems],
  );

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !bulkCreating && setBulkPreviewOpen(nextOpen)}>
      <DialogContent
        className="max-w-md"
        data-testid="bulk-preview-dialog"
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Bulk Upload</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-4 text-center space-y-1">
            <p className="text-3xl font-semibold tabular-nums">{scannedCount}</p>
            <p className="text-sm text-muted-foreground">
              invoice{scannedCount === 1 ? '' : 's'} scanned
            </p>
            {(duplicateCount > 0 || failedExtractionCount > 0) && (
              <p className="text-xs text-muted-foreground pt-1">
                {duplicateCount > 0 && `${duplicateCount} duplicate${duplicateCount === 1 ? '' : 's'}`}
                {duplicateCount > 0 && failedExtractionCount > 0 && ' · '}
                {failedExtractionCount > 0 &&
                  `${failedExtractionCount} extraction failed`}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              All files will be saved as drafts. Complete details when editing saved invoices.
            </p>
          </div>

          {(bulkCreating || bulkProgress.processed > 0) && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  Saving: {bulkProgress.processed}/{bulkProgress.total}
                </span>
                <span className="text-muted-foreground">
                  Time: {formatDuration(bulkElapsedSeconds)}
                </span>
              </div>
              <div className="h-2 w-full rounded bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{
                    width: `${bulkProgress.total > 0 ? (bulkProgress.processed / bulkProgress.total) * 100 : 0}%`,
                  }}
                />
              </div>
              <div className="text-xs text-muted-foreground">
                Saved: {bulkProgress.success} | Failed: {bulkProgress.failed}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button
              onClick={() => handleCreateBulkInvoices('all')}
              disabled={bulkCreating || proceedAllCount === 0}
              data-testid="bulk-proceed-all-btn"
            >
              {bulkCreating ? 'Saving...' : `Proceed All (${proceedAllCount})`}
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleCreateBulkInvoices('without_duplicate')}
              disabled={bulkCreating || proceedWithoutDuplicateCount === 0}
              data-testid="bulk-proceed-without-duplicate-btn"
            >
              Proceed Without Duplicate ({proceedWithoutDuplicateCount})
            </Button>
            <Button
              variant="outline"
              onClick={() => setBulkPreviewOpen(false)}
              disabled={bulkCreating}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkPreviewDialog;

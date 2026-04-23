import React from 'react';
import { Button } from '../../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog';

// Review and selection surface for extracted invoices before final creation.
const BulkPreviewDialog = ({
  open,
  bulkCreating,
  bulkExtracting,
  bulkAddingVendorItemId,
  bulkPreviewItems,
  bulkProgress,
  bulkElapsedSeconds,
  formatDuration,
  formatBulkStatusLabel,
  getBulkStatusBadgeClass,
  setBulkPreviewOpen,
  setBulkPreviewItems,
  handleAddVendorForBulkItem,
  openBulkEditDialog,
  handleCreateBulkInvoices,
}) => {
  const extractedCount = bulkPreviewItems.filter((item) => item.invoicePayload).length;
  const selectableItems = bulkPreviewItems.filter(
    (item) => item.invoicePayload && item.status !== 'uploaded'
  );
  const selectedCreatableCount = selectableItems.filter((item) => item.selected).length;
  const allSelectableChecked = selectableItems.length > 0 && selectableItems.every((item) => item.selected);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !bulkCreating && setBulkPreviewOpen(nextOpen)}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto overflow-x-hidden" data-testid="bulk-preview-dialog">
        <DialogHeader>
          <DialogTitle>Review Bulk Invoices</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <div className="text-muted-foreground">
              {extractedCount} extracted successfully out of {bulkPreviewItems.length}
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={allSelectableChecked}
                onChange={(e) =>
                  setBulkPreviewItems((prev) =>
                    prev.map((item) =>
                      item.invoicePayload && item.status !== 'uploaded'
                        ? { ...item, selected: e.target.checked }
                        : item
                    )
                  )
                }
              />
              <span>Select all extracted</span>
            </label>
          </div>

          {(bulkCreating || bulkProgress.processed > 0) && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">
                  Upload Progress: {bulkProgress.processed}/{bulkProgress.total}
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
                Uploaded: {bulkProgress.success} | Failed: {bulkProgress.failed}
              </div>
            </div>
          )}

          <div className="border rounded-lg min-h-0 max-w-full overflow-auto max-h-[52vh]">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-muted/50 border-b sticky top-0 z-10">
                <tr>
                  <th className="p-3 text-left w-12">Pick</th>
                  <th className="p-3 text-left">File</th>
                  <th className="p-3 text-left">Vendor</th>
                  <th className="p-3 text-left">Invoice #</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bulkPreviewItems.map((item) => (
                  <tr key={item.id} className="border-b last:border-b-0">
                    <td className="p-3 w-12">
                      <input
                        type="checkbox"
                        disabled={!item.invoicePayload || item.status === 'uploaded'}
                        checked={Boolean(item.selected && item.invoicePayload)}
                        onChange={(e) =>
                          setBulkPreviewItems((prev) =>
                            prev.map((row) =>
                              row.id === item.id ? { ...row, selected: e.target.checked } : row
                            )
                          )
                        }
                      />
                    </td>
                    <td className="p-3">{item.filename}</td>
                    <td className="p-3">{item.invoicePayload?.vendor_name || '-'}</td>
                    <td className="p-3 ">{item.invoicePayload?.invoice_number || '-'}</td>
                    <td className="p-3 text-right ">
                      {item.invoicePayload ? `\u20B9${Number(item.invoicePayload.amount || 0).toLocaleString('en-IN')}` : '-'}
                    </td>
                    <td className="p-3">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${getBulkStatusBadgeClass(item.status)}`}
                      >
                        {formatBulkStatusLabel(item.status)}
                      </span>
                      {item.error && (
                        <p className="text-[11px] text-red-600 mt-1">{item.error}</p>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-2">
                        {item.invoicePayload && !item.invoicePayload.vendor_id && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleAddVendorForBulkItem(item.id)}
                            disabled={bulkCreating || bulkExtracting || bulkAddingVendorItemId === item.id}
                          >
                            {bulkAddingVendorItemId === item.id ? 'Adding...' : 'Add Vendor'}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openBulkEditDialog(item)}
                          disabled={!item.invoicePayload || bulkAddingVendorItemId === item.id}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            setBulkPreviewItems((prev) => prev.filter((row) => row.id !== item.id))
                          }
                        >
                          Remove
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setBulkPreviewOpen(false)}
              className="flex-1"
              disabled={bulkCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateBulkInvoices}
              className="flex-1"
              disabled={bulkCreating || selectedCreatableCount === 0}
              data-testid="bulk-create-confirm-btn"
            >
              {bulkCreating
                ? 'Creating...'
                : `Create Selected (${selectedCreatableCount})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkPreviewDialog;


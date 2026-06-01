import React from 'react';
import { Button } from '../../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { isDuplicateBulkPreviewItem } from '../utils/duplicateInvoice';
import { formatInvoiceAmount } from '../utils/invoiceAmounts';

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
  departments = [],
  getDepartmentNameById = () => '',
  invoiceCategories = [],
  getCategoryNameById = () => '',
  showCategoryField = true,
  departmentMandatory = false,
  categoryMandatory = false,
}) => {
  const extractedCount = bulkPreviewItems.filter((item) => item.invoicePayload).length;
  const selectableItems = bulkPreviewItems.filter(
    (item) => item.invoicePayload && item.status !== 'uploaded'
  );
  const selectedCreatableCount = selectableItems.filter((item) => item.selected).length;
  const allSelectableChecked = selectableItems.length > 0 && selectableItems.every((item) => item.selected);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !bulkCreating && setBulkPreviewOpen(nextOpen)}>
      <DialogContent
        className="max-w-5xl max-h-[90vh] overflow-y-auto"
        data-testid="bulk-preview-dialog"
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Review Bulk Invoices</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 min-w-0">
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

          <div className="border rounded-lg w-full overflow-auto max-h-[52vh]">
            <table className={`w-max text-sm ${showCategoryField ? 'min-w-[1180px]' : 'min-w-[1020px]'}`}>
              <thead className="bg-muted/50 border-b sticky top-0 z-10">
                <tr>
                  <th className="p-3 text-left w-12">Pick</th>
                  <th className="p-3 text-left">File</th>
                  <th className="p-3 text-left">Vendor</th>
                  <th className="p-3 text-left">Invoice #</th>
                  <th className="p-3 text-left">
                    {departmentMandatory ? '* ' : ''}Department
                  </th>
                  {showCategoryField && (
                    <th className="p-3 text-left">
                      {categoryMandatory ? '* ' : ''}Category
                    </th>
                  )}
                  <th className="p-3 text-left">Amount</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bulkPreviewItems.map((item) => {
                  const isDuplicateRow = isDuplicateBulkPreviewItem(item);
                  const isUploadedRow = item.status === 'uploaded';
                  const canEditRow = Boolean(item.invoicePayload) && !isDuplicateRow && !isUploadedRow;

                  return (
                  <tr key={item.id} className="border-b last:border-b-0">
                    <td className="p-3 w-12">
                      <input
                        type="checkbox"
                        disabled={!canEditRow || item.status === 'uploaded'}
                        checked={Boolean(item.selected && canEditRow)}
                        onChange={(e) =>
                          setBulkPreviewItems((prev) =>
                            prev.map((row) =>
                              row.id === item.id ? { ...row, selected: e.target.checked } : row
                            )
                          )
                        }
                      />
                    </td>
                    <td className="p-3 whitespace-nowrap">{item.filename}</td>
                    <td className="p-3 whitespace-nowrap">{item.invoicePayload?.vendor_name || '-'}</td>
                    <td className="p-3 whitespace-nowrap font-['JetBrains_Mono']">{item.invoicePayload?.invoice_number || '-'}</td>
                    <td className="p-3 min-w-44">
                      {canEditRow ? (
                        <select
                          value={item.invoicePayload.department_id || ''}
                          onChange={(e) =>
                            setBulkPreviewItems((prev) =>
                              prev.map((row) =>
                                row.id === item.id
                                  ? {
                                      ...row,
                                      invoicePayload: {
                                        ...row.invoicePayload,
                                        department_id: e.target.value,
                                        department_name: getDepartmentNameById(e.target.value),
                                      },
                                    }
                                  : row
                              )
                            )
                          }
                          className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                          required={departmentMandatory}
                        >
                          <option value="">Select department</option>
                          {departments.map((department) => {
                            const id = department?.id ?? department?.departmentId ?? department?.department_id;
                            const name = department?.name ?? department?.departmentName ?? department?.department_name;
                            return (
                              <option key={id} value={id}>
                                {name}
                              </option>
                            );
                          })}
                        </select>
                      ) : (
                        '-'
                      )}
                    </td>
                    {showCategoryField && (
                      <td className="p-3 min-w-44">
                        {canEditRow ? (
                          <select
                            value={item.invoicePayload.category_id || item.invoicePayload.category?.id || ''}
                            onChange={(e) =>
                              setBulkPreviewItems((prev) =>
                                prev.map((row) =>
                                  row.id === item.id
                                    ? {
                                        ...row,
                                        invoicePayload: {
                                          ...row.invoicePayload,
                                          category_id: e.target.value,
                                          category_name: getCategoryNameById(e.target.value),
                                          category: e.target.value
                                            ? {
                                                id: e.target.value,
                                                name: getCategoryNameById(e.target.value),
                                              }
                                            : null,
                                        },
                                      }
                                    : row
                                )
                              )
                            }
                            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                            required={categoryMandatory}
                          >
                            <option value="">Select category</option>
                            {invoiceCategories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          '-'
                        )}
                      </td>
                    )}
                    <td className="p-3 text-left whitespace-nowrap font-['JetBrains_Mono']">
                      {item.invoicePayload
                        ? formatInvoiceAmount(item.invoicePayload, item.invoicePayload.amount)
                        : '-'}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${getBulkStatusBadgeClass(item.status)}`}
                      >
                        {formatBulkStatusLabel(item.status)}
                      </span>
                      {item.error && (
                        <p className="text-[11px] text-red-600 mt-1">{item.error}</p>
                      )}
                    </td>
                    <td className="p-3 text-left whitespace-nowrap">
                      {isDuplicateRow ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            setBulkPreviewItems((prev) => prev.filter((row) => row.id !== item.id))
                          }
                        >
                          Delete
                        </Button>
                      ) : (
                        <div className="flex justify-end gap-2">
                          {item.invoicePayload && !item.invoicePayload.vendor_id && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleAddVendorForBulkItem(item.id)}
                              disabled={bulkCreating || bulkExtracting || bulkAddingVendorItemId === item.id}
                            >
                              {bulkAddingVendorItemId === item.id ? 'Requesting...' : 'Request Vendor'}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openBulkEditDialog(item)}
                            disabled={!canEditRow || bulkAddingVendorItemId === item.id}
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
                      )}
                    </td>
                  </tr>
                  );
                })}
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

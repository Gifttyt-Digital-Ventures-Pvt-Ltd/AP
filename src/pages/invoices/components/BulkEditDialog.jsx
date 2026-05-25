import React from 'react';
import { X } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';

// Editor for a single extracted row so users can fix fields before invoice creation.
const BulkEditDialog = ({
  open,
  setOpen,
  bulkCreating,
  bulkEditForm,
  setBulkEditForm,
  bulkEditItemId,
  bulkPreviewItems,
  bulkEditFileURL,
  pdfZoom,
  bulkEditPreviewError,
  setBulkEditPreviewError,
  vendors,
  departments = [],
  getDepartmentNameById = () => '',
  taxRates,
  updateBulkEditLineItem,
  saveBulkEditChanges,
  renderPdfPreview,
}) => {
  const selectedFile = bulkPreviewItems.find((item) => item.id === bulkEditItemId)?.file || null;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !bulkCreating && setOpen(nextOpen)}>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto overflow-x-hidden" data-testid="bulk-edit-dialog">
        <DialogHeader>
          <DialogTitle>Edit Extracted Invoice</DialogTitle>
        </DialogHeader>
        {bulkEditForm && (
          // Split view keeps extracted file and editable fields visible at the same time.
          <div className="grid grid-cols-1 lg:grid-cols-[35%_65%] gap-4 lg:max-h-[78vh] min-h-0">
            <div className="border rounded-lg overflow-hidden h-full min-h-[500px]">
              {renderPdfPreview({
                fileURL: bulkEditFileURL,
                file: selectedFile,
                zoom: pdfZoom,
                imageError: bulkEditPreviewError,
                setImageError: setBulkEditPreviewError,
              })}
            </div>
            <div className="space-y-4 overflow-y-auto pr-2 min-h-0">
              <datalist id="bulk-vendor-options">
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.name} />
                ))}
              </datalist>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Vendor Name</Label>
                  <Input
                    list="bulk-vendor-options"
                    value={bulkEditForm.vendor_name}
                    onChange={(e) => setBulkEditForm((prev) => ({ ...prev, vendor_name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Invoice Number</Label>
                  <Input
                    value={bulkEditForm.invoice_number}
                    onChange={(e) => setBulkEditForm((prev) => ({ ...prev, invoice_number: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Invoice Date</Label>
                  <Input
                    type="date"
                    value={bulkEditForm.invoice_date}
                    onChange={(e) => setBulkEditForm((prev) => ({ ...prev, invoice_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Due Date</Label>
                  <Input
                    type="date"
                    value={bulkEditForm.due_date}
                    onChange={(e) => setBulkEditForm((prev) => ({ ...prev, due_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Amount</Label>
                  <Input
                    type="number"
                    value={bulkEditForm.amount}
                    onChange={(e) => setBulkEditForm((prev) => ({ ...prev, amount: Number(e.target.value || 0) }))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Currency</Label>
                  <Input
                    value={bulkEditForm.currency}
                    onChange={(e) => setBulkEditForm((prev) => ({ ...prev, currency: e.target.value }))}
                  />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs">Department</Label>
                  <select
                    value={bulkEditForm.department_id || ''}
                    onChange={(e) =>
                      setBulkEditForm((prev) => ({
                        ...prev,
                        department_id: e.target.value,
                        department_name: getDepartmentNameById(e.target.value),
                      }))
                    }
                    className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    required
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
                </div>
              </div>

              <div>
                <Label className="text-xs">Billing Address</Label>
                <textarea
                  value={bulkEditForm.billing_address}
                  onChange={(e) => setBulkEditForm((prev) => ({ ...prev, billing_address: e.target.value }))}
                  className="w-full min-h-[70px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="p-2 text-left">Description</th>
                      <th className="p-2 text-left w-28">HSN/SAC</th>
                      <th className="p-2 text-left w-40">Tax</th>
                      <th className="p-2 text-right w-24">Qty</th>
                      <th className="p-2 text-right w-28">Unit Price</th>
                      <th className="p-2 text-right w-28">Amount</th>
                      <th className="p-2 text-right w-14"></th>
                    </tr>
                  </thead>
                </table>
                <div className="max-h-[30vh] overflow-y-auto">
                  <table className="w-full text-sm">
                    <tbody>
                      {bulkEditForm.line_items.map((line, index) => (
                        <tr key={index} className="border-b last:border-b-0">
                          <td className="p-2">
                            <Input
                              value={line.description}
                              onChange={(e) => updateBulkEditLineItem(index, 'description', e.target.value)}
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              value={line.hsn_sac}
                              onChange={(e) => updateBulkEditLineItem(index, 'hsn_sac', e.target.value)}
                            />
                          </td>
                          <td className="p-2">
                            <select
                              value={line.tax || 'CGST + SGST 18%'}
                              onChange={(e) => updateBulkEditLineItem(index, 'tax', e.target.value)}
                              className="h-10 w-full rounded-md border border-input bg-background px-2 py-2 text-sm"
                            >
                              {taxRates.map((tax) => (
                                <option key={tax.value} value={tax.value}>
                                  {tax.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              value={line.quantity}
                              onChange={(e) => updateBulkEditLineItem(index, 'quantity', Number(e.target.value || 0))}
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              value={line.unit_price}
                              onChange={(e) => updateBulkEditLineItem(index, 'unit_price', Number(e.target.value || 0))}
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              value={line.amount}
                              onChange={(e) => updateBulkEditLineItem(index, 'amount', Number(e.target.value || 0))}
                            />
                          </td>
                          <td className="p-2 text-right">
                            {bulkEditForm.line_items.length > 1 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  setBulkEditForm((prev) => ({
                                    ...prev,
                                    line_items: prev.line_items.filter((_, i) => i !== index),
                                  }))
                                }
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() =>
                    setBulkEditForm((prev) => ({
                      ...prev,
                      line_items: [
                        ...prev.line_items,
                        {
                          description: '',
                          quantity: 1,
                          unit_price: 0,
                          amount: 0,
                          hsn_sac: '',
                          tax: 'CGST + SGST 18%',
                        },
                      ],
                    }))
                  }
                >
                  Add Line
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={saveBulkEditChanges}>Save Changes</Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BulkEditDialog;

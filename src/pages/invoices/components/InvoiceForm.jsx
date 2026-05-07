import React from "react";
import { Building2, CheckCircle2, Plus, X } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";

export const InvoiceForm = ({
  formData,
  setFormData,
  isEdit = false,
  hideActions = false,
  calculateTotals,
  findVendorByName,
  handleAddVendorFromInvoice,
  updateLineItem,
  removeLineItem,
  addLineItem,
  calculateLineItemSubtotal,
  setEditDialogOpen,
  setUploadedFile,
  setUploadedFileURL,
  setActiveTab,
  handleUpdateInvoice,
  handleAddInvoice,
  canAddVendor = true,
  canSubmit = true,
  GST_TREATMENTS,
  INDIAN_STATES,
  FILE_CATEGORIES,
  INVOICE_SOURCES,
  LEDGER_OPTIONS,
  TAX_RATES,
}) => {
  if (!formData) return null;
  const totals = calculateTotals(formData.line_items);
  const tdsRate = Number.parseFloat(String(formData.tds || "").replace("%", "")) || 0;
  const tdsAmount = Math.round(((totals.subTotal * tdsRate) / 100) * 100) / 100;
  const netPayable = Math.max(Math.round((totals.total - tdsAmount) * 100) / 100, 0);

  return (
    <div className="space-y-4">
      {!isEdit && formData.vendor_name && !formData.vendor_matched && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-amber-600" />
            <div>
              <p className="font-medium text-amber-800 text-xs">Vendor not registered</p>
              <p className="text-[11px] text-amber-600">"{formData.vendor_name}" is not in the system</p>
            </div>
          </div>
          <Button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleAddVendorFromInvoice();
            }}
            className="bg-amber-600 hover:bg-amber-700 text-white h-7 text-xs"
            size="sm"
            data-testid="add-vendor-from-invoice-btn"
            disabled={!canAddVendor}
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Vendor
          </Button>
        </div>
      )}

      {!isEdit && formData.vendor_name && formData.vendor_matched && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <p className="text-xs text-emerald-700">
            <span className="font-medium">Vendor matched:</span> "{formData.vendor_name}"
          </p>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-800">Vendor Details</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-blue-400">* Vendor Name</Label>
            <div className="relative">
              <Input
                value={formData.vendor_name}
                onChange={(e) => {
                  const newName = e.target.value;
                  const matched = findVendorByName(newName);
                  setFormData({
                    ...formData,
                    vendor_name: newName,
                    vendor_id: matched?.id || "",
                    vendor_matched: !!matched,
                  });
                }}
                placeholder="Select or enter vendor"
                className="pr-12 h-8 text-sm"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {formData.vendor_name && (
                  <button onClick={() => setFormData({ ...formData, vendor_name: "", vendor_id: "", vendor_matched: false })} className="text-gray-400 hover:text-gray-600">
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
          <div>
            <Label className="text-xs text-blue-400">* Bill Number</Label>
            <Input value={formData.invoice_number} onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })} placeholder="Invoice number" className="h-8 text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-blue-400">* Billing Date</Label>
            <Input type="date" value={formData.invoice_date} onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs text-blue-400">* Due Date</Label>
            <Input type="date" value={formData.due_date} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} className="h-8 text-sm" />
          </div>
        </div>

        <div>
          <Label className="text-xs">Billing Address</Label>
          <textarea
            value={formData.billing_address}
            onChange={(e) => setFormData({ ...formData, billing_address: e.target.value })}
            placeholder="Enter billing address"
            className="w-full min-h-[50px] rounded-md border border-input bg-background px-2 py-1.5 text-xs resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-blue-400">* GST Treatment</Label>
            <select value={formData.gst_treatment} onChange={(e) => setFormData({ ...formData, gst_treatment: e.target.value })} className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm">
              {GST_TREATMENTS.map((gst) => (
                <option key={gst.value} value={gst.value}>
                  {gst.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs text-blue-400">* GSTIN</Label>
            <Input value={formData.gstin} onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })} placeholder="Enter GSTIN" className="h-8 text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs text-blue-400">* Source of Supply</Label>
            <select value={formData.source_of_supply} onChange={(e) => setFormData({ ...formData, source_of_supply: e.target.value })} className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs">
              {INDIAN_STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs text-blue-400">* Destination</Label>
            <select value={formData.destination_of_supply} onChange={(e) => setFormData({ ...formData, destination_of_supply: e.target.value })} className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs">
              {INDIAN_STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs text-blue-400">* Location</Label>
            <select value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs">
              <option value="Karnataka Registration">Karnataka</option>
              <option value="Maharashtra Registration">Maharashtra</option>
              <option value="Tamil Nadu Registration">Tamil Nadu</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-blue-400">* File Category</Label>
            <select value={formData.file_category} onChange={(e) => setFormData({ ...formData, file_category: e.target.value })} className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm" data-testid="file-category-select">
              {FILE_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs text-blue-400">* Source</Label>
            <select value={formData.source} onChange={(e) => setFormData({ ...formData, source: e.target.value })} className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm" data-testid="source-select">
              {INVOICE_SOURCES.map((src) => (
                <option key={src.value} value={src.value}>
                  {src.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {formData.source === "Email" && (
          <div>
            <Label className="text-xs text-blue-400">Source Email</Label>
            <Input
              type="email"
              value={formData.source_email}
              onChange={(e) => setFormData({ ...formData, source_email: e.target.value })}
              placeholder="vendor@example.com"
              className="w-full h-8 text-sm"
              data-testid="source-email-input"
            />
          </div>
        )}

        <div className="flex gap-6 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-gray-600">Reverse Charges:</span>
            <select value={formData.reverse_charges} onChange={(e) => setFormData({ ...formData, reverse_charges: e.target.value })} className="text-blue-600 bg-transparent border-none cursor-pointer text-xs">
              <option value="Not Applicable">Not Applicable</option>
              <option value="Applicable">Applicable</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-gray-600">Discounts:</span>
            <select value={formData.discounts_level} onChange={(e) => setFormData({ ...formData, discounts_level: e.target.value })} className="text-blue-600 bg-transparent border-none cursor-pointer text-xs">
              <option value="At Line Item Level">At Line Item Level</option>
              <option value="At Invoice Level">At Invoice Level</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-800">Line Items</h3>
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 border-b">
            <div className="grid grid-cols-[1fr_120px_100px_60px_80px_70px_90px_30px] gap-1 px-2 py-2 text-xs font-medium text-gray-600">
              <span>Item Description</span>
              <span className="text-blue-500">*Ledger</span>
              <span className="text-blue-500">*Tax</span>
              <span className="text-right">Qty</span>
              <span className="text-right">Rate</span>
              <span className="text-right">Disc</span>
              <span className="text-right">Subtotal</span>
              <span></span>
            </div>
          </div>
          <div className="divide-y">
            {formData.line_items.map((item, index) => (
              <div key={index} className="grid grid-cols-[1fr_120px_100px_60px_80px_70px_90px_30px] gap-1 px-2 py-1.5 items-center text-xs">
                <div>
                  <Input value={item.description} onChange={(e) => updateLineItem(index, "description", e.target.value)} placeholder="Description" className="h-7 text-xs" />
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[10px] text-gray-400">HSN:</span>
                    <Input value={item.hsn_sac} onChange={(e) => updateLineItem(index, "hsn_sac", e.target.value)} placeholder="Code" className="h-5 text-[10px] w-16 px-1" />
                    <label className="flex items-center gap-0.5 text-[10px] text-gray-500 ml-1">
                      <input type="checkbox" checked={item.eligible_for_itc} onChange={(e) => updateLineItem(index, "eligible_for_itc", e.target.checked)} className="h-2.5 w-2.5" />
                      ITC
                    </label>
                  </div>
                </div>
                <select value={item.ledger} onChange={(e) => updateLineItem(index, "ledger", e.target.value)} className="h-7 w-full rounded border px-1 text-xs bg-white">
                  {LEDGER_OPTIONS.map((ledger) => (
                    <option key={ledger} value={ledger}>
                      {ledger}
                    </option>
                  ))}
                </select>
                <select value={item.tax} onChange={(e) => updateLineItem(index, "tax", e.target.value)} className="h-7 w-full rounded border px-1 text-xs bg-white">
                  {TAX_RATES.map((tax) => (
                    <option key={tax.value} value={tax.value}>
                      {tax.label}
                    </option>
                  ))}
                </select>
                <Input type="number" value={item.quantity} onChange={(e) => updateLineItem(index, "quantity", parseFloat(e.target.value) || 0)} className="h-7 text-xs text-right px-1" min="0" />
                <Input type="number" value={item.unit_rate} onChange={(e) => updateLineItem(index, "unit_rate", parseFloat(e.target.value) || 0)} className="h-7 text-xs text-right px-1" min="0" />
                <div className="flex items-center gap-0.5">
                  <Input type="number" value={item.discount} onChange={(e) => updateLineItem(index, "discount", parseFloat(e.target.value) || 0)} className="h-7 text-xs text-right w-10 px-1" min="0" />
                  <select value={item.discount_type} onChange={(e) => updateLineItem(index, "discount_type", e.target.value)} className="h-7 w-8 rounded border text-xs bg-white px-0">
                    <option value="%">%</option>
                    <option value="\u20B9">\u20B9</option>
                  </select>
                </div>
                <div className="text-right font-medium text-xs">{"\u20B9"}{calculateLineItemSubtotal(item).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</div>
                <div className="text-center">
                  {formData.line_items.length > 1 && (
                    <button onClick={() => removeLineItem(index)} className="text-red-500 hover:text-red-700 p-0.5">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="h-0.5 bg-gradient-to-r from-blue-500 via-blue-400 to-yellow-400 rounded" />
        <Button variant="outline" onClick={addLineItem} className="text-blue-600 h-7 text-xs" size="sm">
          <Plus className="h-3 w-3 mr-1" />
          Add Line Item
        </Button>
      </div>

      <div>
        <Label className="text-xs">Description</Label>
        <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Enter Description (Optional)" className="w-full min-h-[50px] rounded-md border border-input bg-background px-2 py-1.5 text-xs resize-none" />
      </div>

      <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
        <div className="flex justify-between text-xs">
          <span>Sub Total</span>
          <span className="font-medium">{"\u20B9"}{totals.subTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
        </div>
        {totals.cgst > 0 && (
          <div className="flex justify-between text-xs">
            <span>CGST 9%</span>
            <span>{"\u20B9"}{totals.cgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
          </div>
        )}
        {totals.sgst > 0 && (
          <div className="flex justify-between text-xs">
            <span>SGST 9%</span>
            <span>{"\u20B9"}{totals.sgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
          </div>
        )}
        {totals.igst > 0 && (
          <div className="flex justify-between text-xs">
            <span>IGST</span>
            <span>{"\u20B9"}{totals.igst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
          </div>
        )}
        <div className="flex justify-between items-center pt-1.5 border-t text-xs">
          <div className="flex items-center gap-1.5">
            <span>TDS</span>
            <select value={formData.tds} onChange={(e) => setFormData({ ...formData, tds: e.target.value })} className="h-6 rounded border px-1 text-xs">
              <option value="">TDS</option>
              <option value="1%">1%</option>
              <option value="2%">2%</option>
              <option value="10%">10%</option>
            </select>
          </div>
          <span>{"\u20B9"}{tdsAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between text-sm pt-1.5 border-t">
          <span>Total</span>
          <span>{"\u20B9"}{totals.total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="flex justify-between text-sm font-bold pt-1.5 border-t">
          <span>Net Payable</span>
          <span>{"\u20B9"}{netPayable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      {!hideActions && (
        <div className="flex gap-3 pt-4 border-t sticky bottom-0 bg-white">
          <Button
            variant="outline"
            onClick={() => {
              if (isEdit) {
                setEditDialogOpen(false);
              } else {
                setUploadedFile(null);
                setUploadedFileURL(null);
                setFormData(null);
                setActiveTab("list");
              }
            }}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={isEdit ? handleUpdateInvoice : handleAddInvoice}
            className="flex-1"
            disabled={!canSubmit}
          >
            {isEdit ? "Update Invoice" : "Add Invoice"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default InvoiceForm;

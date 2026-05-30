import React from "react";
import { Building2, CheckCircle2, Plus, X } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { TableCell, TableRow } from "../../../components/ui/table";
import AppDataTable from "../../../components/common/AppDataTable";
import AppSelect from "../../../components/common/AppSelect";
import CurrencySelector from "../../../components/common/CurrencySelector";
import { DEFAULT_CURRENCY, formatCurrency } from "../../../utils/currency";
import {
  isInrInvoiceCurrency,
  remapLineItemsForCurrencyChange,
} from "../utils/invoiceTax";
import {
  formatNumericInputValue,
  sanitizeNumericInput,
} from "../utils/numericInput";
import InvoiceChecklist from "./InvoiceFormChecklist";

const lineItemTableHeader = [
  { key: "description", title: "Item Description", headerClassName: "min-w-[190px]", cellClassName: "min-w-[190px]" },
  { key: "ledger", title: "*Ledger", headerClassName: "w-[160px] text-blue-500", cellClassName: "w-[200px]" },
  { key: "tax", title: "*Tax", headerClassName: "w-[150px] text-blue-500", cellClassName: "w-[200px]" },
  { key: "quantity", title: "Qty", headerClassName: "w-[60px] text-right", cellClassName: "w-[60px]" },
  { key: "unit_rate", title: "Rate", headerClassName: "w-[80px] text-right", cellClassName: "w-[80px]" },
  { key: "discount", title: "Discount", headerClassName: "w-[120px] text-left", cellClassName: "w-[120px]" },
  { key: "subtotal", title: "Subtotal", headerClassName: "w-[100px] text-right", cellClassName: "w-[100px] text-right" },
  { key: "actions", title: "", headerClassName: "w-[32px]", cellClassName: "w-[32px] text-center" },
];

const lineItemSelectClassName =
  "h-7 w-full rounded border bg-white pl-2 pr-7 text-xs";

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
  vendorOptions = [],
  departments = [],
  invoiceCategories = [],
  invoiceCategoriesLoading = false,
  showCategoryField = true,
  departmentMandatory = false,
  categoryMandatory = false,
  currencyOptions = [],
  GST_TREATMENTS,
  INDIAN_STATES,
  INVOICE_SOURCES,
  LEDGER_OPTIONS,
  TAX_RATES,
}) => {
  if (!formData) return null;
  const invoiceCurrency = formData.currency || DEFAULT_CURRENCY;
  const useInrTax = isInrInvoiceCurrency(invoiceCurrency);
  const formatAmount = (amount) => formatCurrency(amount, invoiceCurrency);
  const totals = calculateTotals(formData.line_items, invoiceCurrency);
  const tdsRate = Number.parseFloat(String(formData.tds || "").replace("%", "")) || 0;
  const tdsAmount = Math.round(((totals.subTotal * tdsRate) / 100) * 100) / 100;
  const netPayable = Math.max(Math.round((totals.total - tdsAmount) * 100) / 100, 0);
  const renderLineItemRow = (item, index, headers) => (
    <TableRow key={index} className="border-b last:border-b-0">
      {headers.map((header) => {
        let value;

        switch (header.key) {
          case "description":
            value = (
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
            );
            break;
          case "ledger":
            value = (
              <AppSelect value={item.ledger} onChange={(e) => updateLineItem(index, "ledger", e.target.value)} options={LEDGER_OPTIONS} className={lineItemSelectClassName} />
            );
            break;
          case "tax":
            value = useInrTax ? (
              <AppSelect value={item.tax} onChange={(e) => updateLineItem(index, "tax", e.target.value)} options={TAX_RATES} className={lineItemSelectClassName} />
            ) : (
              <div className="flex flex-col gap-1">
                <Input
                  value={item.tax_name || ""}
                  onChange={(e) => updateLineItem(index, "tax_name", e.target.value)}
                  placeholder="Tax name"
                  className="h-7 text-xs"
                />
                <Input
                  type="text"
                  inputMode="decimal"
                  value={formatNumericInputValue(item.tax_rate)}
                  onChange={(e) =>
                    updateLineItem(index, "tax_rate", sanitizeNumericInput(e.target.value))
                  }
                  placeholder="Rate %"
                  className="h-7 text-xs"
                />
              </div>
            );
            break;
          case "quantity":
            value = (
              <Input
                type="text"
                inputMode="decimal"
                value={formatNumericInputValue(item.quantity)}
                onChange={(e) =>
                  updateLineItem(index, "quantity", sanitizeNumericInput(e.target.value))
                }
                className="h-7 text-xs text-right px-1"
              />
            );
            break;
          case "unit_rate":
            value = (
              <Input
                type="text"
                inputMode="decimal"
                value={formatNumericInputValue(item.unit_rate)}
                onChange={(e) =>
                  updateLineItem(index, "unit_rate", sanitizeNumericInput(e.target.value))
                }
                className="h-7 text-xs text-right px-1"
              />
            );
            break;
          case "discount":
            value = (
              <div className="flex items-center gap-0.5">
                <Input
                  type="text"
                  inputMode="decimal"
                  value={formatNumericInputValue(item.discount)}
                  onChange={(e) =>
                    updateLineItem(index, "discount", sanitizeNumericInput(e.target.value))
                  }
                  className="h-7 text-xs text-right w-12 px-1"
                />
                <AppSelect
                  value={item.discount_type}
                  onChange={(e) => updateLineItem(index, "discount_type", e.target.value)}
                  options={["%", invoiceCurrency === DEFAULT_CURRENCY ? "₹" : invoiceCurrency]}
                  className="h-7 w-14 rounded border text-xs bg-white pl-2 pr-6"
                />
              </div>
            );
            break;
          case "subtotal":
            value = formatAmount(calculateLineItemSubtotal(item));
            break;
          case "actions":
            value = formData.line_items.length > 1 && (
              <button type="button" onClick={() => removeLineItem(index)} className="text-red-500 hover:text-red-700 p-0.5">
                <X className="h-3.5 w-3.5" />
              </button>
            );
            break;
          default:
            value = item?.[header.key] || "-";
        }

        return (
          <TableCell key={header.key} className={`px-2 py-1.5 align-middle text-xs ${header.cellClassName || ""}`}>
            {value}
          </TableCell>
        );
      })}
    </TableRow>
  );

  return (
    <div className="space-y-4">
      {!isEdit &&
        formData.vendor_name &&
        formData.vendor_request_submitted &&
        !formData.vendor_matched && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-blue-600" />
          <p className="text-xs text-blue-700">
            <span className="font-medium">Vendor request submitted:</span> "{formData.vendor_name}"
            {' '}(you can add this invoice while approval is pending)
          </p>
        </div>
      )}

      {!isEdit && formData.vendor_name && !formData.vendor_matched && !formData.vendor_request_submitted && (
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
            data-testid="request-vendor-from-invoice-btn"
            disabled={!canAddVendor}
          >
            <Plus className="h-3 w-3 mr-1" />
            Request Vendor
          </Button>
        </div>
      )}

      {!isEdit && formData.vendor_name && formData.vendor_matched && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <p className="text-xs text-emerald-700">
            <span className="font-medium">
              {formData.vendor_request_pending ? 'Vendor linked (pending approval):' : 'Vendor matched:'}
            </span>{' '}
            "{formData.vendor_name}"
          </p>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-800">Vendor Details</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-blue-400">* Vendor Name</Label>
            <div className="relative">
              <datalist id="invoice-vendor-options">
                {vendorOptions.map((vendor) => (
                  <option key={vendor.id} value={vendor.name} />
                ))}
              </datalist>
              <Input
                list="invoice-vendor-options"
                value={formData.vendor_name}
                onChange={(e) => {
                  const newName = e.target.value;
                  const matched = findVendorByName(newName);
                  setFormData({
                    ...formData,
                    vendor_name: newName,
                    vendor_id: matched?.id || "",
                    vendor_matched: !!matched,
                    vendor_request_pending: Boolean(matched?.is_pending_approval),
                    vendor_request_submitted: matched
                      ? formData.vendor_request_submitted
                      : false,
                    gstin: matched?.gstin
                      ? String(matched.gstin).trim().toUpperCase()
                      : formData.gstin,
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

        <div className="grid grid-cols-2 gap-3">
          <CurrencySelector
            currencies={currencyOptions}
            value={invoiceCurrency}
            onChange={(currency) => {
              const switchingTaxMode =
                isInrInvoiceCurrency(invoiceCurrency) !== isInrInvoiceCurrency(currency);
              setFormData({
                ...formData,
                currency,
                scanned_tax_amount: undefined,
                scanned_tax_name: undefined,
                scanned_tax_rate: undefined,
                scanned_total: undefined,
                line_items: switchingTaxMode
                  ? remapLineItemsForCurrencyChange(formData.line_items, currency)
                  : formData.line_items,
              });
            }}
            label="Currency"
            id="invoice-form-currency"
            selectClassName="h-8 text-sm"
          />
        </div>

        <div>
          <Label className={`text-xs ${departmentMandatory ? "text-blue-400" : ""}`}>
            {departmentMandatory ? "* " : ""}Department
          </Label>
          <AppSelect
            value={formData.department_id || ""}
            onChange={(e) => {
              const selectedDepartment = departments.find((department) => {
                const departmentId = department?.id ?? department?.departmentId ?? department?.department_id;
                return String(departmentId ?? "") === e.target.value;
              });
              setFormData({
                ...formData,
                department_id: e.target.value,
                department_name:
                  selectedDepartment?.name ||
                  selectedDepartment?.departmentName ||
                  selectedDepartment?.department_name ||
                  "",
              });
            }}
            className="h-8 text-sm"
            data-testid="invoice-department-select"
            required={departmentMandatory}
            placeholder="Select department"
            options={departments.map((department) => ({
              value: department?.id ?? department?.departmentId ?? department?.department_id,
              label: department?.name ?? department?.departmentName ?? department?.department_name,
            }))}
          />
        </div>

        {showCategoryField && (
          <div>
            <Label className={`text-xs ${categoryMandatory ? "text-blue-400" : ""}`}>
              {categoryMandatory ? "* " : ""}Category
            </Label>
            <AppSelect
              value={formData.category_id || ""}
              onChange={(e) => {
                const selectedCategory = invoiceCategories.find(
                  (category) => String(category.id ?? "") === e.target.value,
                );
                setFormData({
                  ...formData,
                  category_id: e.target.value,
                  category_name: selectedCategory?.name || "",
                  category: selectedCategory
                    ? { id: selectedCategory.id, name: selectedCategory.name }
                    : null,
                });
              }}
              className="h-8 text-sm"
              data-testid="invoice-category-select"
              required={categoryMandatory}
              placeholder={invoiceCategoriesLoading ? "Loading categories..." : "Select category"}
              disabled={invoiceCategoriesLoading}
              options={invoiceCategories.map((category) => ({
                value: category.id,
                label: category.name,
              }))}
            />
          </div>
        )}

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
            <AppSelect value={formData.gst_treatment} onChange={(e) => setFormData({ ...formData, gst_treatment: e.target.value })} options={GST_TREATMENTS} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs text-blue-400">* GSTIN</Label>
            <Input value={formData.gstin} onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })} placeholder="Enter GSTIN" className="h-8 text-sm" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs text-blue-400">* Source of Supply</Label>
            <AppSelect value={formData.source_of_supply} onChange={(e) => setFormData({ ...formData, source_of_supply: e.target.value })} options={INDIAN_STATES} className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-xs text-blue-400">* Destination</Label>
            <AppSelect value={formData.destination_of_supply} onChange={(e) => setFormData({ ...formData, destination_of_supply: e.target.value })} options={INDIAN_STATES} className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-xs text-blue-400">* Location</Label>
            <AppSelect
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              options={[
                { value: "Karnataka Registration", label: "Karnataka" },
                { value: "Maharashtra Registration", label: "Maharashtra" },
                { value: "Tamil Nadu Registration", label: "Tamil Nadu" },
              ]}
              className="h-8 text-xs"
            />
          </div>
        </div>

        <div>
          <Label className="text-xs text-blue-400">* Source</Label>
          <AppSelect value={formData.source} onChange={(e) => setFormData({ ...formData, source: e.target.value })} options={INVOICE_SOURCES} className="h-8 text-sm" data-testid="source-select" />
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
            <AppSelect
              value={formData.reverse_charges}
              onChange={(e) => setFormData({ ...formData, reverse_charges: e.target.value })}
              options={["Not Applicable", "Applicable"]}
              className="h-6 w-auto border-none bg-transparent pl-0 pr-6 text-xs text-blue-600 shadow-none"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-gray-600">Discounts:</span>
            <AppSelect
              value={formData.discounts_level}
              onChange={(e) => setFormData({ ...formData, discounts_level: e.target.value })}
              options={["At Line Item Level", "At Invoice Level"]}
              className="h-6 w-auto border-none bg-transparent pl-0 pr-6 text-xs text-blue-600 shadow-none"
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-800">Line Items</h3>
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin-muted">
            <AppDataTable
              tableHeader={lineItemTableHeader}
              tableData={formData.line_items}
              renderRow={renderLineItemRow}
              tableClassName="min-w-[890px] border-separate border-spacing-0"
              headClassName="bg-gray-50 border-b"
              stickyHeader={false}
              striped={false}
              emptyMessage="No line items found"
            />
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
          <span className="font-medium">{formatAmount(totals.subTotal)}</span>
        </div>
        {useInrTax && totals.cgst > 0 && (
          <div className="flex justify-between text-xs">
            <span>CGST 9%</span>
            <span>{formatAmount(totals.cgst)}</span>
          </div>
        )}
        {useInrTax && totals.sgst > 0 && (
          <div className="flex justify-between text-xs">
            <span>SGST 9%</span>
            <span>{formatAmount(totals.sgst)}</span>
          </div>
        )}
        {useInrTax && totals.igst > 0 && (
          <div className="flex justify-between text-xs">
            <span>IGST</span>
            <span>{formatAmount(totals.igst)}</span>
          </div>
        )}
        {!useInrTax && totals.foreignTaxes?.map((entry) => (
          <div key={`${entry.name}-${entry.rate}`} className="flex justify-between text-xs">
            <span>
              {entry.name}
              {entry.rate > 0 ? ` ${entry.rate}%` : ""}
            </span>
            <span>{formatAmount(entry.amount)}</span>
          </div>
        ))}
        <div className="flex justify-between items-center pt-1.5 border-t text-xs">
          <div className="flex items-center gap-1.5">
            <span>TDS</span>
            <AppSelect
              value={formData.tds}
              onChange={(e) => setFormData({ ...formData, tds: e.target.value })}
              placeholder="TDS"
              options={["1%", "2%", "10%"]}
              className="h-6 w-20 rounded border pl-1 pr-6 text-xs"
            />
          </div>
          <span>{formatAmount(tdsAmount)}</span>
        </div>
        <div className="flex justify-between text-sm pt-1.5 border-t">
          <span>Total</span>
          <span>{formatAmount(totals.total)}</span>
        </div>
        <div className="flex justify-between text-sm font-bold pt-1.5 border-t">
          <span>Net Payable</span>
          <span>{formatAmount(netPayable)}</span>
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

      <InvoiceChecklist
        formData={formData}
        departmentMandatory={departmentMandatory}
        categoryMandatory={categoryMandatory}
        showCategoryField={showCategoryField}
      />
    </div>
  );
};

export default InvoiceForm;

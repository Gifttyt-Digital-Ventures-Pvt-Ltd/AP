import React from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import AppDataTable from "../../../components/common/AppDataTable";
import { TableCell, TableRow } from "../../../components/ui/table";
import { Textarea } from "../../../components/ui/textarea";

const poFormLineItemTableHeader = [
  { key: "item_description", title: "Description *", headerClassName: "w-[200px]" },
  { key: "hsn_sac_code", title: "HSN/SAC" },
  { key: "quantity", title: "Qty", headerClassName: "w-[80px]" },
  { key: "unit_of_measure", title: "Unit", headerClassName: "w-[80px]" },
  { key: "unit_price", title: "Unit Price", headerClassName: "w-[100px]" },
  { key: "gst_rate", title: "GST %", headerClassName: "w-[80px]" },
  { key: "total", title: "Total", headerClassName: "w-[100px]", cellClassName: "font-medium" },
  { key: "actions", title: "", headerClassName: "w-[50px]" },
];

const PoFormDialog = ({
  showCreateDialog,
  setShowCreateDialog,
  poForm,
  setPoForm,
  vendors,
  addLineItem,
  updateLineItem,
  removeLineItem,
  formatCurrency,
  calculateLineTotal,
  calculatePOTotal,
  handleCreatePO,
  createAction,
}) => {
  const isSavingDraft = createAction === "draft";
  const isSubmittingForApproval = createAction === "submit";
  const isCreating = Boolean(createAction);

  const renderLineItemRow = (item, idx, headers) => (
    <TableRow key={idx}>
      {headers.map((header) => {
        let value;

        switch (header.key) {
          case "item_description":
            value = (
              <Input value={item.item_description} onChange={(e) => updateLineItem(idx, "item_description", e.target.value)} placeholder="Item description" data-testid={`line-item-desc-${idx}`} />
            );
            break;
          case "hsn_sac_code":
            value = (
              <Input
                value={item.hsn_sac_code}
                onChange={(e) => updateLineItem(idx, "hsn_sac_code", e.target.value)}
                placeholder="HSN/SAC"
                className="min-w-[120px]"
                data-testid={`line-item-hsn-sac-${idx}`}
              />
            );
            break;
          case "quantity":
            value = (
              <Input type="number" value={item.quantity} onChange={(e) => updateLineItem(idx, "quantity", parseFloat(e.target.value) || 0)} data-testid={`line-item-qty-${idx}`} />
            );
            break;
          case "unit_of_measure":
            value = (
              <Select value={item.unit_of_measure} onValueChange={(v) => updateLineItem(idx, "unit_of_measure", v)}>
                <SelectTrigger className="w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NOS">NOS</SelectItem>
                  <SelectItem value="KG">KG</SelectItem>
                  <SelectItem value="MTR">MTR</SelectItem>
                  <SelectItem value="PCS">PCS</SelectItem>
                  <SelectItem value="HRS">HRS</SelectItem>
                </SelectContent>
              </Select>
            );
            break;
          case "unit_price":
            value = (
              <Input
                type="number"
                value={item.unit_price ?? ""}
                onChange={(e) => {
                  const rawValue = e.target.value;
                  if (rawValue === "") {
                    updateLineItem(idx, "unit_price", "");
                    return;
                  }
                  const parsedValue = Number(rawValue);
                  if (Number.isNaN(parsedValue)) return;
                  updateLineItem(idx, "unit_price", parsedValue);
                }}
                min="0"
                className="min-w-[120px]"
                data-testid={`line-item-price-${idx}`}
              />
            );
            break;
          case "gst_rate":
            value = (
              <Select value={String(item.gst_rate)} onValueChange={(v) => updateLineItem(idx, "gst_rate", parseFloat(v))}>
                <SelectTrigger className="w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0%</SelectItem>
                  <SelectItem value="5">5%</SelectItem>
                  <SelectItem value="12">12%</SelectItem>
                  <SelectItem value="18">18%</SelectItem>
                  <SelectItem value="28">28%</SelectItem>
                </SelectContent>
              </Select>
            );
            break;
          case "total":
            value = formatCurrency(calculateLineTotal(item));
            break;
          case "actions":
            value = poForm.line_items.length > 1 && (
              <Button variant="ghost" size="sm" onClick={() => removeLineItem(idx)} data-testid={`remove-line-item-${idx}`}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            );
            break;
          default:
            value = item?.[header.key] || "-";
        }

        return (
          <TableCell key={header.key} className={header.cellClassName}>
            {value}
          </TableCell>
        );
      })}
    </TableRow>
  );

  return (
    <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
      <DialogContent className="flex flex-col w-[95vw] max-w-4xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>Create Purchase Order</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto px-6 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>PO Type</Label>
              <Select value={poForm.po_type} onValueChange={(v) => setPoForm((prev) => ({ ...prev, po_type: v }))}>
                <SelectTrigger data-testid="po-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Standard">Standard</SelectItem>
                  <SelectItem value="Blanket">Blanket</SelectItem>
                  <SelectItem value="Contract">Contract</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Vendor *</Label>
              <Select value={poForm.vendor_id} onValueChange={(v) => setPoForm((prev) => ({ ...prev, vendor_id: v }))}>
                <SelectTrigger data-testid="vendor-select">
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>PO Date *</Label>
              <Input type="date" value={poForm.po_date} onChange={(e) => setPoForm((prev) => ({ ...prev, po_date: e.target.value }))} data-testid="po-date-input" />
            </div>

            <div className="space-y-2">
              <Label>Expected Delivery Date</Label>
              <Input type="date" value={poForm.expected_delivery_date} onChange={(e) => setPoForm((prev) => ({ ...prev, expected_delivery_date: e.target.value }))} data-testid="delivery-date-input" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Shipping Address</Label>
              <Textarea value={poForm.shipping_address} onChange={(e) => setPoForm((prev) => ({ ...prev, shipping_address: e.target.value }))} rows={2} data-testid="shipping-address-input" />
            </div>
            <div className="space-y-2">
              <Label>Billing Address</Label>
              <Textarea value={poForm.billing_address} onChange={(e) => setPoForm((prev) => ({ ...prev, billing_address: e.target.value }))} rows={2} data-testid="billing-address-input" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-lg font-semibold">Line Items</Label>
              <Button variant="outline" size="sm" onClick={addLineItem} data-testid="add-line-item-btn">
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </div>

            <div className="border rounded-lg max-w-full overflow-x-auto">
              <AppDataTable
                tableHeader={poFormLineItemTableHeader}
                tableData={poForm.line_items}
                renderRow={renderLineItemRow}
                tableClassName="min-w-[860px]"
              />
            </div>

            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total Amount:</span>
                  <span>{formatCurrency(calculatePOTotal())}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Remarks</Label>
            <Textarea
              value={poForm.remarks}
              onChange={(e) => setPoForm((prev) => ({ ...prev, remarks: e.target.value }))}
              rows={2}
              placeholder="Additional notes or comments"
              data-testid="po-remarks-input"
            />
          </div>
        </div>

        <DialogFooter className="px-6 pb-6 pt-2">
          <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={() => handleCreatePO({ submitForApproval: false })}
            disabled={isCreating}
            data-testid="save-draft-po-btn"
          >
            {isSavingDraft && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save as Draft
          </Button>
          <Button
            onClick={() => handleCreatePO({ submitForApproval: true })}
            disabled={isCreating}
            data-testid="submit-po-btn"
          >
            {isSubmittingForApproval && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Submit for Approval
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PoFormDialog;

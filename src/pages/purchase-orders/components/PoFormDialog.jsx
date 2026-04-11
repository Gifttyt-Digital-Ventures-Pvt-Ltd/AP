import React from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../components/ui/table";
import { Textarea } from "../../../components/ui/textarea";

const PoFormDialog = ({
  showCreateDialog,
  setShowCreateDialog,
  poForm,
  setPoForm,
  vendors,
  addLineItem,
  updateLineItem,
  hsnSacCodes,
  truncateText,
  glAccounts,
  costCenters,
  removeLineItem,
  formatCurrency,
  calculateLineTotal,
  calculatePOTotal,
  handleCreatePO,
  creating,
}) => {
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
              <Table className="min-w-[1100px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Description *</TableHead>
                    <TableHead>HSN/SAC</TableHead>
                    <TableHead className="w-[80px]">Qty</TableHead>
                    <TableHead className="w-[80px]">Unit</TableHead>
                    <TableHead className="w-[100px]">Unit Price</TableHead>
                    <TableHead className="w-[80px]">GST %</TableHead>
                    <TableHead>GL Account</TableHead>
                    <TableHead>Cost Center</TableHead>
                    <TableHead className="w-[100px]">Total</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {poForm.line_items.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Input value={item.item_description} onChange={(e) => updateLineItem(idx, "item_description", e.target.value)} placeholder="Item description" data-testid={`line-item-desc-${idx}`} />
                      </TableCell>
                      <TableCell>
                        <Select value={item.hsn_sac_code} onValueChange={(v) => updateLineItem(idx, "hsn_sac_code", v)}>
                          <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {hsnSacCodes.map((h) => (
                              <SelectItem key={h.id} value={String(h.hsn_sac_code || h.code || h.id)}>
                                {(h.hsn_sac_code || h.code || "-") + " - " + truncateText(h.description ?? h.name ?? "", 15)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input type="number" value={item.quantity} onChange={(e) => updateLineItem(idx, "quantity", parseFloat(e.target.value) || 0)} data-testid={`line-item-qty-${idx}`} />
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                      <TableCell>
                        <Select value={item.gl_account_id} onValueChange={(v) => updateLineItem(idx, "gl_account_id", v)}>
                          <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {glAccounts.map((g) => (
                              <SelectItem key={g.id} value={g.id}>
                                {g.account_code} - {truncateText(g.account_name, 12)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select value={item.cost_center_id} onValueChange={(v) => updateLineItem(idx, "cost_center_id", v)}>
                          <SelectTrigger className="w-[120px]">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {costCenters.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.cost_center_code || "-"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(calculateLineTotal(item))}</TableCell>
                      <TableCell>
                        {poForm.line_items.length > 1 && (
                          <Button variant="ghost" size="sm" onClick={() => removeLineItem(idx)} data-testid={`remove-line-item-${idx}`}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
          <Button onClick={handleCreatePO} disabled={creating} data-testid="submit-po-btn">
            {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Purchase Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PoFormDialog;

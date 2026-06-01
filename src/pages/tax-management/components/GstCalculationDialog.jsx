import React from 'react';
import { Button } from '../../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Loader2 } from 'lucide-react';

// Dialog to calculate GST on a selected invoice.
const GstCalculationDialog = ({
  open,
  setOpen,
  gstForm,
  setGstForm,
  invoices,
  formatCurrency,
  indianStates,
  calculating,
  handleCalculateGST,
  canManageTax,
}) => (
  <Dialog open={open} onOpenChange={setOpen}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Calculate GST</DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Invoice *</Label>
          <Select
            value={gstForm.invoice_id}
            onValueChange={(v) => {
              const inv = invoices.find((i) => i.id === v);
              setGstForm((prev) => ({ ...prev, invoice_id: v, taxable_amount: inv?.amount || 0 }));
            }}
          >
            <SelectTrigger data-testid="gst-invoice-select">
              <SelectValue placeholder="Select invoice" />
            </SelectTrigger>
            <SelectContent>
              {invoices.map((inv) => (
                <SelectItem key={inv.id} value={inv.id}>
                  {inv.invoice_number} - {inv.vendor_name} ({formatCurrency(inv.amount)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Vendor GSTIN</Label>
          <Input
            value={gstForm.vendor_gstin}
            onChange={(e) => setGstForm((prev) => ({ ...prev, vendor_gstin: e.target.value }))}
            placeholder="22AAAAA0000A1Z5"
            data-testid="vendor-gstin-input"
          />
        </div>

        <div className="space-y-2">
          <Label>Place of Supply *</Label>
          <Select value={gstForm.place_of_supply} onValueChange={(v) => setGstForm((prev) => ({ ...prev, place_of_supply: v }))}>
            <SelectTrigger data-testid="place-of-supply-select">
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent>
              {indianStates.map((state) => (
                <SelectItem key={state} value={state}>{state}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Taxable Amount *</Label>
            <Input
              type="number"
              value={gstForm.taxable_amount}
              onChange={(e) => setGstForm((prev) => ({ ...prev, taxable_amount: parseFloat(e.target.value) || 0 }))}
              data-testid="taxable-amount-input"
            />
          </div>
          <div className="space-y-2">
            <Label>GST Rate *</Label>
            <Select value={String(gstForm.gst_rate)} onValueChange={(v) => setGstForm((prev) => ({ ...prev, gst_rate: parseFloat(v) }))}>
              <SelectTrigger data-testid="gst-rate-select">
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
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="reverse-charge"
            checked={gstForm.is_reverse_charge}
            onChange={(e) => setGstForm((prev) => ({ ...prev, is_reverse_charge: e.target.checked }))}
          />
          <Label htmlFor="reverse-charge">Reverse Charge Applicable</Label>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
        <Button
          onClick={handleCalculateGST}
          disabled={calculating || !canManageTax}
          data-testid="submit-gst-calc-btn"
        >
          {calculating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Calculate GST
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default GstCalculationDialog;

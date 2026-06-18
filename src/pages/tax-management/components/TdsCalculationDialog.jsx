import React from 'react';
import { Button } from '../../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Loader2 } from 'lucide-react';
import MeteredActionCostHint from '../../../components/credits/MeteredActionCostHint';
import { CREDIT_ACTION_CODES } from '../../../constants/creditActions';

// Dialog to calculate TDS using selected section and invoice amount.
const TdsCalculationDialog = ({
  open,
  setOpen,
  tdsForm,
  setTdsForm,
  invoices,
  tdsSections,
  formatCurrency,
  calculating,
  handleCalculateTDS,
  canManageTax,
}) => (
  <Dialog open={open} onOpenChange={setOpen}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Calculate TDS</DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Invoice *</Label>
          <Select
            value={tdsForm.invoice_id}
            onValueChange={(v) => {
              const inv = invoices.find((i) => i.id === v);
              setTdsForm((prev) => ({ ...prev, invoice_id: v, base_amount: inv?.amount || 0 }));
            }}
          >
            <SelectTrigger data-testid="tds-invoice-select">
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
          <Label>TDS Section *</Label>
          <Select value={tdsForm.section_code} onValueChange={(v) => setTdsForm((prev) => ({ ...prev, section_code: v }))}>
            <SelectTrigger data-testid="tds-section-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tdsSections.map((section) => (
                <SelectItem key={section.id} value={section.section_code}>
                  {section.section_code} - {section.description}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Base Amount *</Label>
          <Input
            type="number"
            value={tdsForm.base_amount}
            onChange={(e) => setTdsForm((prev) => ({ ...prev, base_amount: parseFloat(e.target.value) || 0 }))}
            data-testid="tds-base-amount-input"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is-company"
            checked={tdsForm.is_company}
            onChange={(e) => setTdsForm((prev) => ({ ...prev, is_company: e.target.checked }))}
          />
          <Label htmlFor="is-company">Vendor is a Company (higher TDS rate)</Label>
        </div>
      </div>

      <MeteredActionCostHint actionCode={CREDIT_ACTION_CODES.TDS_API} />

      <DialogFooter>
        <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
        <Button
          onClick={handleCalculateTDS}
          disabled={calculating || !canManageTax}
          data-testid="submit-tds-calc-btn"
        >
          {calculating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Calculate TDS
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default TdsCalculationDialog;

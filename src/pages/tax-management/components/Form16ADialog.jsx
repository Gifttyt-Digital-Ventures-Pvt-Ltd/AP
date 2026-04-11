import React from 'react';
import { Button } from '../../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { FileText, Loader2 } from 'lucide-react';

// Dialog for generating quarterly Form 16A certificates.
const Form16ADialog = ({
  open,
  setOpen,
  form16AForm,
  setForm16AForm,
  vendors,
  calculating,
  handleGenerateForm16A,
}) => (
  <Dialog open={open} onOpenChange={setOpen}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Generate Form 16A (TDS Certificate)</DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Vendor *</Label>
          <Select value={form16AForm.vendor_id} onValueChange={(v) => setForm16AForm((prev) => ({ ...prev, vendor_id: v }))}>
            <SelectTrigger data-testid="form16a-vendor-select">
              <SelectValue placeholder="Select vendor" />
            </SelectTrigger>
            <SelectContent>
              {vendors.map((v) => (
                <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Fiscal Year *</Label>
            <Select value={form16AForm.fiscal_year} onValueChange={(v) => setForm16AForm((prev) => ({ ...prev, fiscal_year: v }))}>
              <SelectTrigger data-testid="fiscal-year-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2023-24">2023-24</SelectItem>
                <SelectItem value="2024-25">2024-25</SelectItem>
                <SelectItem value="2025-26">2025-26</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Quarter *</Label>
            <Select value={form16AForm.quarter} onValueChange={(v) => setForm16AForm((prev) => ({ ...prev, quarter: v }))}>
              <SelectTrigger data-testid="quarter-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Q1">Q1 (Apr-Jun)</SelectItem>
                <SelectItem value="Q2">Q2 (Jul-Sep)</SelectItem>
                <SelectItem value="Q3">Q3 (Oct-Dec)</SelectItem>
                <SelectItem value="Q4">Q4 (Jan-Mar)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
        <Button onClick={handleGenerateForm16A} disabled={calculating} data-testid="submit-form16a-btn">
          {calculating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          <FileText className="h-4 w-4 mr-2" />
          Generate Certificate
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default Form16ADialog;

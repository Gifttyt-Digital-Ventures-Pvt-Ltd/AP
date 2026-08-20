import { Loader2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Label } from '../../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import GrnCreateFormFields from './GrnCreateFormFields';
import { GRN_SOURCE, GRN_SOURCE_LABELS } from '../constants';

const GrnCreateDialog = ({
  open,
  onOpenChange,
  formatConfig,
  formatConfigs = [],
  activeFormatId,
  onFormatChange,
  form,
  setForm,
  selectedPo,
  vendors = [],
  saving = false,
  onSaveDraft,
  onSubmit,
}) => {
  const poLinked = form.source_type === GRN_SOURCE.PO;
  const isStandalone = form.source_type === GRN_SOURCE.STANDALONE;
  const isUploadSource = form.source_type === GRN_SOURCE.UPLOAD;
  const selectedFormat =
    formatConfigs.find((format) => format.id === (form.grn_format_id || activeFormatId)) ||
    formatConfig;

  const sourceLabel = GRN_SOURCE_LABELS[form.source_type] || 'GRN';
  const titleSuffix = selectedPo?.po_number ? ` · ${selectedPo.po_number}` : '';
  const dialogTitle = isStandalone
    ? 'Create Standalone GRN'
    : `Create GRN · ${sourceLabel}${titleSuffix}`;
  const dialogSubtitle = isStandalone
    ? 'Manual goods receipt with no linked purchase order'
    : 'Enter receipt details and received quantities';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-[96vw] max-w-5xl flex-col overflow-hidden p-0">
        <DialogHeader className="border-b px-6 pt-6 pb-3">
          <DialogTitle>{dialogTitle}</DialogTitle>
          <p className="text-sm text-muted-foreground">{dialogSubtitle}</p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {formatConfigs.length > 0 && (
            <div className="mb-6 space-y-2">
              <Label>GRN Format</Label>
              <Select
                value={form.grn_format_id || activeFormatId}
                onValueChange={onFormatChange}
              >
                <SelectTrigger data-testid="grn-format-select">
                  <SelectValue placeholder="Select GRN format" />
                </SelectTrigger>
                <SelectContent>
                  {formatConfigs.map((format) => (
                    <SelectItem key={format.id} value={format.id}>
                      {format.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {isStandalone && (
            <div className="mb-6 space-y-2">
              <Label>Vendor *</Label>
              <Select
                value={form.vendor_id ? String(form.vendor_id) : ''}
                onValueChange={(vendorId) => {
                  const vendor = vendors.find((item) => String(item.id) === String(vendorId));
                  setForm((current) => ({
                    ...current,
                    vendor_id: vendorId,
                    vendor_name: vendor?.name ?? vendor?.vendor_name ?? '',
                  }));
                }}
              >
                <SelectTrigger className="h-9 bg-white/80" data-testid="grn-vendor-select">
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={String(vendor.id)}>
                      {vendor.name ?? vendor.vendor_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <GrnCreateFormFields
            form={form}
            setForm={setForm}
            formatConfig={selectedFormat}
            selectedPo={selectedPo}
            poLinked={poLinked}
            showExtractedBadge={isUploadSource}
          />
        </div>

        <DialogFooter className="gap-2 border-t px-6 py-4 sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={onSaveDraft} disabled={saving}>
            Save as Draft
          </Button>
          <Button onClick={onSubmit} disabled={saving} data-testid="submit-grn-btn">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {selectedFormat?.approval_enabled ? 'Submit for Approval' : 'Post GRN'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GrnCreateDialog;

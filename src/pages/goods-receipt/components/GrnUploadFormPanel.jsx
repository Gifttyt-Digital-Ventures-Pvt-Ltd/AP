import { AlertCircle } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Label } from '../../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import GrnCreateFormFields from './GrnCreateFormFields';

const GrnUploadFormPanel = ({
  form,
  setForm,
  formatConfig,
  formatConfigs = [],
  activeFormatId,
  onFormatChange,
  vendors = [],
  extractionFailed = false,
  onRetryUpload,
}) => (
  <div className="space-y-6">
    {formatConfigs.length > 0 && (
      <div className="space-y-2">
        <Label>GRN Format</Label>
        <Select
          value={form.grn_format_id || activeFormatId}
          onValueChange={onFormatChange}
        >
          <SelectTrigger data-testid="grn-upload-format-select">
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

    {extractionFailed && (
      <div className="flex items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
        <div className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Could not extract data from the document</p>
            <p className="mt-0.5 text-amber-800 dark:text-amber-300">
              Enter the GRN details manually, or try uploading again.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={onRetryUpload}
          data-testid="grn-retry-upload-btn"
        >
          Try again
        </Button>
      </div>
    )}

    {form.requires_vendor && (
      <div className="space-y-2">
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
      formatConfig={formatConfig}
      poLinked={false}
      showExtractedBadge={!extractionFailed}
    />
  </div>
);

export default GrnUploadFormPanel;

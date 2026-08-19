import { AlertCircle, ClipboardList } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { Label } from '../../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import ConnectedVendorPicker from '../../../components/common/ConnectedVendorPicker';
import GrnCreateFormFields from './GrnCreateFormFields';
import { GRN_SOURCE } from '../constants';

const REFERENCE_TYPES = {
  NONE: 'NONE',
  PO: 'PO',
  PI: 'PI',
};

const getCurrentReferenceType = (form = {}) => {
  if (form.reference_type === REFERENCE_TYPES.PO) return REFERENCE_TYPES.PO;
  if (form.reference_type === REFERENCE_TYPES.PI) return REFERENCE_TYPES.PI;
  if (form.reference_type === REFERENCE_TYPES.NONE) return REFERENCE_TYPES.NONE;
  if (form.pi_id || form.pi_number) return REFERENCE_TYPES.PI;
  if (form.po_id || form.po_number) return REFERENCE_TYPES.PO;
  return REFERENCE_TYPES.NONE;
};

const getVendorName = (vendor = {}) =>
  vendor.name ?? vendor.vendor_name ?? vendor.vendorName ?? vendor.companyName ?? '';

const getPiId = (pi = {}) => pi.id ?? pi.pi_id ?? pi.piId;

const getPiNumber = (pi = {}) =>
  pi.piRef ?? pi.pi_ref ?? pi.piNumber ?? pi.pi_number ?? pi.invoiceNumber ?? pi.invoice_number ?? '';

const GrnUploadFormPanel = ({
  form,
  setForm,
  formatConfig,
  formatConfigs = [],
  activeFormatId,
  onFormatChange,
  vendors = [],
  purchaseOrders = [],
  eligiblePis = [],
  isPiEnabled = false,
  extractionFailed = false,
  onRetryUpload,
}) => {
  const referenceType = getCurrentReferenceType(form);

  const handleReferenceTypeChange = (nextType) => {
    setForm((current) => {
      const next = {
        ...current,
        reference_type: nextType,
        // Preserve vendor, scanned header fields, and line items — only swap reference linkage.
        source_type:
          nextType === REFERENCE_TYPES.PO
            ? GRN_SOURCE.PO
            : nextType === REFERENCE_TYPES.PI
              ? GRN_SOURCE.FROM_PI
              : GRN_SOURCE.UPLOAD,
      };

      if (nextType === REFERENCE_TYPES.NONE) {
        next.po_id = '';
        next.pi_id = '';
        // Keep OCR po_number / pi_number as hints; do not wipe scanned form data.
      }

      if (nextType === REFERENCE_TYPES.PO) {
        next.pi_id = '';
        next.pi_number = '';
      }

      if (nextType === REFERENCE_TYPES.PI) {
        next.po_id = '';
      }

      next.requires_vendor = !next.vendor_id && !next.vendor_name;
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {formatConfigs.length > 0 && (
        <div className="space-y-2">
          <Label>GRN Format</Label>
          <Select value={form.grn_format_id || activeFormatId} onValueChange={onFormatChange}>
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

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <Label>Vendor</Label>
          <ConnectedVendorPicker
            value={form.vendor_name || form.vendor_id}
            onSelect={(vendor) => {
              setForm((current) => ({
                ...current,
                vendor_id: vendor?.id || '',
                vendor_name: getVendorName(vendor),
                requires_vendor: false,
              }));
            }}
            placeholder={form.vendor_name || 'Select vendor'}
          />
          {!form.vendor_id && form.vendor_name ? (
            <p className="text-xs text-muted-foreground">Scanned: {form.vendor_name}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>Reference (optional)</Label>
          <Select value={referenceType} onValueChange={handleReferenceTypeChange}>
            <SelectTrigger className="h-9 bg-white/80" data-testid="grn-upload-reference-type">
              <SelectValue placeholder="No reference" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={REFERENCE_TYPES.NONE}>None</SelectItem>
              <SelectItem value={REFERENCE_TYPES.PO}>Purchase Order</SelectItem>
              {isPiEnabled && <SelectItem value={REFERENCE_TYPES.PI}>Proforma Invoice</SelectItem>}
            </SelectContent>
          </Select>
        </div>
      </div>

      {referenceType === REFERENCE_TYPES.PO && (
        <div className="space-y-2">
          <Label>Purchase Order</Label>
          <Select
            value={form.po_id ? String(form.po_id) : undefined}
            onValueChange={(poId) => {
              const po = purchaseOrders.find((item) => String(item.id) === String(poId));
              setForm((current) => ({
                ...current,
                reference_type: REFERENCE_TYPES.PO,
                source_type: GRN_SOURCE.PO,
                po_id: poId,
                po_number: po?.po_number ?? current.po_number ?? '',
                pi_id: '',
                pi_number: '',
                vendor_id: po?.vendor_id || current.vendor_id,
                vendor_name: po?.vendor_name || current.vendor_name,
                received_at_location: po?.shipping_address || current.received_at_location,
                bill_to_name: po?.billing_name || current.bill_to_name,
                bill_to_gstin: po?.billing_gstin || current.bill_to_gstin,
                bill_to_address: po?.billing_address || current.bill_to_address,
                requires_vendor: !(po?.vendor_id || current.vendor_id),
              }));
            }}
          >
            <SelectTrigger className="h-9 bg-white/80" data-testid="grn-upload-po-select">
              <SelectValue placeholder={form.po_number || 'Select PO'} />
            </SelectTrigger>
            <SelectContent>
              {purchaseOrders.map((po) => (
                <SelectItem key={po.id} value={String(po.id)}>
                  {po.po_number} · {po.vendor_name || 'Vendor'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!form.po_id && form.po_number ? (
            <p className="text-xs text-muted-foreground">Scanned PO: {form.po_number}</p>
          ) : null}
        </div>
      )}

      {referenceType === REFERENCE_TYPES.PI && (
        <div className="space-y-2">
          <Label>Proforma Invoice</Label>
          <Select
            value={form.pi_id ? String(form.pi_id) : undefined}
            onValueChange={(piId) => {
              const pi = eligiblePis.find((item) => String(getPiId(item)) === String(piId));
              setForm((current) => ({
                ...current,
                reference_type: REFERENCE_TYPES.PI,
                source_type: GRN_SOURCE.FROM_PI,
                pi_id: piId,
                pi_number: getPiNumber(pi) || current.pi_number,
                po_id: pi?.poId ?? pi?.po_id ?? current.po_id,
                po_number: pi?.poNumber ?? pi?.po_number ?? current.po_number,
                vendor_id: pi?.vendorId ?? pi?.vendor_id ?? current.vendor_id,
                vendor_name: pi?.vendorName ?? pi?.vendor_name ?? pi?.vendor ?? current.vendor_name,
                requires_vendor: !(pi?.vendorId || pi?.vendor_id || current.vendor_id),
              }));
            }}
          >
            <SelectTrigger className="h-9 bg-white/80" data-testid="grn-upload-pi-select">
              <SelectValue placeholder={form.pi_number || 'Select PI'} />
            </SelectTrigger>
            <SelectContent>
              {eligiblePis.map((pi) => (
                <SelectItem key={getPiId(pi)} value={String(getPiId(pi))}>
                  {getPiNumber(pi)} · {pi.vendorName ?? pi.vendor_name ?? pi.vendor ?? 'Vendor'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!form.pi_id && form.pi_number ? (
            <p className="text-xs text-muted-foreground">Scanned PI: {form.pi_number}</p>
          ) : null}
        </div>
      )}

      {(form.po_id || form.pi_id) && (
        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-200">
          <ClipboardList className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">
              {form.pi_id ? 'Selected PI reference' : 'Selected PO reference'}
            </p>
            <p className="mt-0.5">
              {form.pi_id
                ? form.pi_number || 'PI reference selected'
                : form.po_number || 'PO reference detected'}{' '}
              <span className="text-blue-700/80 dark:text-blue-300/80">
                ({form.pi_id || form.po_id})
              </span>
            </p>
          </div>
        </div>
      )}

      <GrnCreateFormFields
        form={form}
        setForm={setForm}
        formatConfig={formatConfig}
        poLinked={Boolean(form.po_id)}
        showExtractedBadge={!extractionFailed}
      />
    </div>
  );
};

export default GrnUploadFormPanel;

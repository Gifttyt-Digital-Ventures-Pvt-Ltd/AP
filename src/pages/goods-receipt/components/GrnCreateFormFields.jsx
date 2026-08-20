import { CheckCircle2, ClipboardList, Shield } from 'lucide-react';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import GrnLineItemsEditor from './GrnLineItemsEditor';
import { GRN_SOURCE } from '../constants';
import {
  isGrnDeliveryEnabled,
  isGrnDeliveryFieldEnabled,
  isGrnFooterEnabled,
  isGrnFooterFieldEnabled,
  isGrnHeaderFieldEnabled,
  isGrnBillToEnabled,
} from '../utils/grnFormatConfig';
import { formatCurrency } from '../utils';
import InrConversionFields from '../../../components/common/InrConversionFields';
import PoPaymentScheduleSection from '../../purchase-orders/components/PoPaymentScheduleSection';
import { normalizePaymentScheduleRows } from '../../purchase-orders/utils/poPaymentSchedule';

const GrnCreateFormFields = ({
  form,
  setForm,
  formatConfig,
  selectedPo,
  poLinked = false,
  showExtractedBadge = false,
}) => {
  const qcEnabled = Boolean(formatConfig?.qc_enabled);
  const paymentScheduleRows = normalizePaymentScheduleRows(form || {});
  const showPaymentSchedule =
    Boolean(form.paymentScheduleAvailable) && selectedPo && paymentScheduleRows.length > 0;
  const paymentScheduleGrossTotal =
    Number(selectedPo?.total_amount ?? selectedPo?.totalAmount ?? 0) || 0;

  return (
    <div className="space-y-6">
      {selectedPo && (
        <div className="flex items-center gap-3 rounded-lg bg-primary/5 p-3">
          <ClipboardList className="h-4 w-4 text-primary" />
          <div>
            <p className="font-semibold text-primary">{selectedPo.po_number}</p>
            <p className="text-sm text-muted-foreground">
              {selectedPo.vendor_name} · {formatCurrency(selectedPo.total_amount, selectedPo.currency || form.currency)}
            </p>
          </div>
          {showExtractedBadge && (
            <span className="ml-auto flex items-center gap-1 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              Extracted from PDF
            </span>
          )}
        </div>
      )}

      {showPaymentSchedule ? (
        <PoPaymentScheduleSection
          rows={paymentScheduleRows}
          documentGrossTotal={paymentScheduleGrossTotal}
          formatCurrency={(amount) => formatCurrency(amount, selectedPo?.currency || form.currency)}
          onChange={(paymentSchedule) =>
            setForm((current) => ({ ...current, paymentSchedule }))
          }
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>GRN Date *</Label>
          <Input
            type="date"
            value={form.receipt_date}
            onChange={(e) => setForm((c) => ({ ...c, receipt_date: e.target.value }))}
            data-testid="receipt-date-input"
          />
        </div>
        {isGrnHeaderFieldEnabled(formatConfig, 'location') && (
          <div className="space-y-2">
            <Label>Received at Location</Label>
            <Input
              value={form.received_at_location}
              onChange={(e) =>
                setForm((c) => ({ ...c, received_at_location: e.target.value }))
              }
              placeholder="Warehouse / Location"
            />
          </div>
        )}
      </div>

      {isGrnDeliveryEnabled(formatConfig) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {isGrnDeliveryFieldEnabled(formatConfig, 'challan') && (
            <div className="space-y-2">
              <Label>Delivery Challan No.</Label>
              <Input
                value={form.delivery_note_number}
                onChange={(e) =>
                  setForm((c) => ({
                    ...c,
                    delivery_note_number: e.target.value,
                    delivery_challan_no: e.target.value,
                  }))
                }
                data-testid="delivery-note-input"
              />
            </div>
          )}
          {isGrnDeliveryFieldEnabled(formatConfig, 'eway_bill') && (
            <div className="space-y-2">
              <Label>E-Way Bill No.</Label>
              <Input
                value={form.eway_bill_no}
                onChange={(e) => setForm((c) => ({ ...c, eway_bill_no: e.target.value }))}
              />
            </div>
          )}
          {isGrnDeliveryFieldEnabled(formatConfig, 'vehicle') && (
            <div className="space-y-2">
              <Label>Vehicle No.</Label>
              <Input
                value={form.vehicle_number}
                onChange={(e) => setForm((c) => ({ ...c, vehicle_number: e.target.value }))}
                data-testid="vehicle-input"
              />
            </div>
          )}
          {isGrnDeliveryFieldEnabled(formatConfig, 'transporter') && (
            <div className="space-y-2">
              <Label>Transporter</Label>
              <Input
                value={form.transporter_name}
                onChange={(e) => setForm((c) => ({ ...c, transporter_name: e.target.value }))}
                data-testid="transporter-input"
              />
            </div>
          )}
        </div>
      )}

      {qcEnabled && (
        <div className="flex items-start gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-900 dark:bg-green-950/30 dark:text-green-200">
          <Shield className="mt-0.5 h-4 w-4 shrink-0" />
          Quality Inspection enabled — Accepted + Rejected must equal Received per line.
        </div>
      )}

      <GrnLineItemsEditor
        lines={form.line_items}
        onChange={(line_items) => setForm((c) => ({ ...c, line_items }))}
        qcEnabled={qcEnabled}
        poLinked={poLinked}
        formatConfig={formatConfig}
        currency={form.currency}
      />

      <InrConversionFields
        currency={form.currency}
        convertToInr={form.convertToInr}
        matchingInrValue={form.matchingInrValue}
        onChange={(conversion) =>
          setForm((current) => ({
            ...current,
            ...conversion,
          }))
        }
      />

      {isGrnBillToEnabled(formatConfig) && (
        <div className="rounded-lg border bg-muted/20 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Bill To
          </h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Billing Name</Label>
              <Input
                value={form.bill_to_name || ''}
                onChange={(e) => setForm((c) => ({ ...c, bill_to_name: e.target.value }))}
                placeholder="Company / branch name"
              />
            </div>
            <div className="space-y-2">
              <Label>Billing GSTIN</Label>
              <Input
                value={form.bill_to_gstin || ''}
                onChange={(e) => setForm((c) => ({ ...c, bill_to_gstin: e.target.value }))}
                placeholder="GSTIN"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Billing Address</Label>
              <Textarea
                value={form.bill_to_address || ''}
                onChange={(e) => setForm((c) => ({ ...c, bill_to_address: e.target.value }))}
                rows={2}
                placeholder="Billing address"
              />
            </div>
          </div>
        </div>
      )}

      {isGrnFooterEnabled(formatConfig) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {isGrnFooterFieldEnabled(formatConfig, 'received_by') && (
            <div className="space-y-2">
              <Label>Received By</Label>
              <Input
                value={form.received_by}
                onChange={(e) => setForm((c) => ({ ...c, received_by: e.target.value }))}
              />
            </div>
          )}
          {isGrnFooterFieldEnabled(formatConfig, 'remarks') && (
            <div className="space-y-2 sm:col-span-2">
              <Label>Remarks</Label>
              <Textarea
                value={form.remarks}
                onChange={(e) => setForm((c) => ({ ...c, remarks: e.target.value }))}
                rows={2}
                data-testid="grn-remarks-input"
              />
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default GrnCreateFormFields;

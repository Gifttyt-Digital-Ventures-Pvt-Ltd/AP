import { Eye, FileText, Lock, Package, Save, Shield, Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { Switch } from '../../../components/ui/switch';
import {
  fieldEnabled,
  sanitizeGrnFormatName,
  sectionEnabled,
} from '../utils/grnFormatConfig';

const SAMPLE_LINES = [
  { description: 'Raw Material - Grade A Steel', ordered: 500, received: 300, accepted: 298, rejected: 2, rate: 120, gstRate: 18 },
  { description: 'Aluminium Sheets - 2mm', ordered: 100, received: 100, accepted: 100, rejected: 0, rate: 240, gstRate: 18 },
];

const cloneConfig = (config) => ({
  ...config,
  sections: (config.sections || []).map((section) => ({
    ...section,
    fields: (section.fields || []).map((field) => ({ ...field })),
  })),
});

const GrnFormatBuilderDialog = ({
  open,
  onOpenChange,
  draftConfig,
  setDraftConfig,
  savedFormatConfigs = [],
  activeFormatId,
  onSelectFormat,
  onCreateFormat,
  onDeleteFormat,
  onSave,
  saving = false,
}) => {
  const documentBorderClass = 'border';
  const headerBorderClass = 'border-b';
  const formatOptions = savedFormatConfigs.some((format) => format.id === draftConfig.id)
    ? savedFormatConfigs
    : [...savedFormatConfigs, draftConfig];

  const updateConfig = (patch) => setDraftConfig((prev) => ({ ...prev, ...patch }));

  const toggleSection = (sectionKey, checked) => {
    setDraftConfig((prev) => ({
      ...prev,
      sections: prev.sections.map((section) =>
        section.section === sectionKey ? { ...section, isEnabled: checked } : section,
      ),
    }));
  };

  const toggleField = (sectionKey, fieldKey, checked) => {
    setDraftConfig((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => {
        if (section.section !== sectionKey) return section;
        return {
          ...section,
          fields: section.fields.map((field) =>
            field.fieldKey === fieldKey ? { ...field, isEnabled: checked } : field,
          ),
        };
      }),
    }));
  };

  const toggleQc = (checked) => {
    setDraftConfig((prev) => {
      const next = cloneConfig({ ...prev, qc_enabled: checked });
      const lineSection = next.sections.find((section) => section.section === 'LINE_ITEM');
      const inspection = next.sections.find((section) => section.section === 'INSPECTION');
      if (lineSection) {
        ['accepted_qty', 'rejected_qty', 'rejection_reason'].forEach((fieldKey) => {
          const field = lineSection.fields.find((item) => item.fieldKey === fieldKey);
          if (field) field.isEnabled = checked;
        });
      }
      if (inspection) inspection.isEnabled = checked;
      return next;
    });
  };

  const toggleValuation = (checked) => {
    setDraftConfig((prev) => {
      const next = cloneConfig({ ...prev, valuation_enabled: checked });
      const lineSection = next.sections.find((section) => section.section === 'LINE_ITEM');
      if (lineSection) {
        ['rate', 'amount', 'gst_rate'].forEach((fieldKey) => {
          const field = lineSection.fields.find((item) => item.fieldKey === fieldKey);
          if (field) field.isEnabled = checked;
        });
      }
      return next;
    });
  };

  const toggleBillTo = (checked) => {
    updateConfig({ bill_to_enabled: checked });
  };

  const showQcColumns = Boolean(draftConfig.qc_enabled);
  const showValuationColumns = Boolean(draftConfig.valuation_enabled);
  const showBillToBlock = Boolean(draftConfig.bill_to_enabled);
  const samplePreTaxTotal = SAMPLE_LINES.reduce(
    (sum, line) => sum + Number(line.received || 0) * Number(line.rate || 0),
    0,
  );
  const sampleTaxTotal = SAMPLE_LINES.reduce(
    (sum, line) => sum + (Number(line.received || 0) * Number(line.rate || 0) * Number(line.gstRate || 0)) / 100,
    0,
  );
  const showHeader = sectionEnabled(draftConfig, 'HEADER');
  const showDelivery = sectionEnabled(draftConfig, 'DELIVERY');
  const showLineItems = sectionEnabled(draftConfig, 'LINE_ITEM');
  const showInspection = sectionEnabled(draftConfig, 'INSPECTION') && showQcColumns;
  const showFooter = sectionEnabled(draftConfig, 'FOOTER');
  const showItemCode = fieldEnabled(draftConfig, 'LINE_ITEM', 'item_code');
  const showHsn = fieldEnabled(draftConfig, 'LINE_ITEM', 'hsn_sac');
  const showUom = fieldEnabled(draftConfig, 'LINE_ITEM', 'uom');
  const showOrdered = fieldEnabled(draftConfig, 'LINE_ITEM', 'ordered_qty');
  const showAlreadyReceived = fieldEnabled(draftConfig, 'LINE_ITEM', 'already_received');
  const showReceived = fieldEnabled(draftConfig, 'LINE_ITEM', 'received_qty');
  const showAccepted = fieldEnabled(draftConfig, 'LINE_ITEM', 'accepted_qty');
  const showRejected = fieldEnabled(draftConfig, 'LINE_ITEM', 'rejected_qty');
  const showRejectionReason = fieldEnabled(draftConfig, 'LINE_ITEM', 'rejection_reason');
  const showRate = showValuationColumns;
  const showAmount = showValuationColumns;
  const showGstRate = showValuationColumns;
  const showBatchNo = fieldEnabled(draftConfig, 'LINE_ITEM', 'batch_no');
  const showLineRemarks = fieldEnabled(draftConfig, 'LINE_ITEM', 'line_remarks');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[92vh] w-[96vw] max-w-7xl flex-col overflow-hidden p-0">
        <DialogHeader className="border-b px-6 pb-3 pt-6">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            GRN Format Builder
          </DialogTitle>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[360px_1fr]">
          <aside className="space-y-5 overflow-y-auto border-r bg-muted/20 px-5 py-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label>Editing Format</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onCreateFormat}
                      data-testid="grn-builder-new-format"
                    >
                      New Format
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onDeleteFormat}
                      disabled={savedFormatConfigs.length <= 1}
                      data-testid="grn-builder-delete-format"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Select value={draftConfig.id || activeFormatId} onValueChange={onSelectFormat}>
                  <SelectTrigger data-testid="grn-builder-format-select">
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    {formatOptions.map((format) => (
                      <SelectItem key={format.id} value={format.id}>
                        {format.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Format Name</Label>
                <Input
                  value={draftConfig.name || ''}
                  onChange={(e) => updateConfig({ name: e.target.value })}
                  onBlur={(e) => updateConfig({ name: sanitizeGrnFormatName(e.target.value, '') })}
                  placeholder="e.g. Standard GRN Format"
                  data-testid="grn-builder-format-name"
                />
              </div>

              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input
                  value={draftConfig.companyName || ''}
                  onChange={(e) => updateConfig({ companyName: e.target.value })}
                  data-testid="grn-builder-company-name"
                />
              </div>

              <div className="space-y-2">
                <Label>GRN Prefix</Label>
                <Input
                  value={draftConfig.grnNumberPrefix || ''}
                  onChange={(e) => updateConfig({ grnNumberPrefix: e.target.value })}
                  data-testid="grn-builder-prefix"
                />
              </div>
            </div>

            <div className={`rounded-lg border p-4 ${showQcColumns ? 'border-green-200 bg-green-50/60' : 'bg-background'}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-sm font-semibold">Quality Inspection (QC)</p>
                    <p className="text-xs text-muted-foreground">
                      Shows Accepted / Rejected / Reason columns on create form
                    </p>
                  </div>
                </div>
                <Switch checked={showQcColumns} onCheckedChange={toggleQc} />
              </div>
            </div>

            <div className={`rounded-lg border p-4 ${showValuationColumns ? 'border-blue-200 bg-blue-50/60' : 'bg-background'}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="text-sm font-semibold">Valuation</p>
                    <p className="text-xs text-muted-foreground">
                      Adds Rate / Amount / GST columns and enables financial GRN checks
                    </p>
                  </div>
                </div>
                <Switch checked={showValuationColumns} onCheckedChange={toggleValuation} />
              </div>
            </div>

            <div className={`rounded-lg border p-4 ${showBillToBlock ? 'border-blue-200 bg-blue-50/60' : 'bg-background'}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="text-sm font-semibold">Bill-to</p>
                    <p className="text-xs text-muted-foreground">
                      Adds bill-to address capture and enables the GRN bill-to checkpoint
                    </p>
                  </div>
                </div>
                <Switch checked={showBillToBlock} onCheckedChange={toggleBillTo} />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border bg-background px-3 py-2">
              <div>
                <p className="text-sm font-medium">Approval Workflow</p>
                <p className="text-xs text-muted-foreground">Submit → approver before posting</p>
              </div>
              <Switch
                checked={Boolean(draftConfig.approval_enabled)}
                onCheckedChange={(approval_enabled) => updateConfig({ approval_enabled })}
              />
            </div>

            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold">Sections & Fields</h3>
                <p className="text-xs text-muted-foreground">
                  Controls the create-GRN layout. Quantities are entered during creation only.
                </p>
              </div>

              {(draftConfig.sections || []).map((section) => (
                <div key={section.section} className="rounded-lg border bg-background">
                  <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
                    <div>
                      <p className="text-sm font-medium">{section.label}</p>
                      <p className="text-[11px] text-muted-foreground">{section.section}</p>
                    </div>
                    <Switch
                      checked={section.isEnabled}
                      onCheckedChange={(checked) => toggleSection(section.section, checked)}
                      disabled={section.section === 'LINE_ITEM'}
                      data-testid={`grn-builder-section-${section.section}`}
                    />
                  </div>
                  <div className="space-y-2 px-3 py-2">
                    {section.fields.map((field) => {
                      const isQcField = [
                        'accepted_qty',
                        'rejected_qty',
                        'rejection_reason',
                        'inspected_by',
                      ].includes(field.fieldKey);
                      const isValuationField = ['rate', 'amount', 'gst_rate'].includes(field.fieldKey);
                      const qcLocked = isQcField;
                      const valuationLocked = isValuationField;
                      const disabled =
                        field.isSystemField || qcLocked || valuationLocked || !section.isEnabled;
                      const checked = isValuationField
                        ? showValuationColumns && section.isEnabled
                        : isQcField
                          ? showQcColumns && section.isEnabled
                          : field.isEnabled && section.isEnabled;
                      return (
                        <div
                          key={field.fieldKey}
                          className="flex items-center justify-between gap-3 text-sm"
                        >
                          <div className={disabled ? 'opacity-50' : ''}>
                            <span>{field.label}</span>
                            {field.isSystemField && (
                              <Lock className="ml-1 inline h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                          <Switch
                            checked={checked}
                            disabled={disabled}
                            onCheckedChange={(checkedValue) =>
                              toggleField(section.section, field.fieldKey, checkedValue)
                            }
                            data-testid={`grn-builder-field-${field.fieldKey}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <main className="overflow-y-auto bg-slate-100 px-6 py-5">
            <div className="mx-auto max-w-4xl">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Create GRN layout preview
                </div>
                <p className="max-w-xl text-xs">
                  This is the document layout users see when creating a GRN. Received quantities
                  are entered on the create form, not here.
                </p>
              </div>

              <div className={`min-h-[760px] bg-white p-8 shadow-sm ${documentBorderClass}`}>
                {showHeader && (
                  <header className={`mb-5 pb-5 ${headerBorderClass}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-bold">
                          {draftConfig.companyName || 'Company Name'}
                        </h2>
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          Goods Received Note
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Package className="h-8 w-8 text-muted-foreground/50" />
                        {fieldEnabled(draftConfig, 'HEADER', 'source_badge') && (
                          <span className="rounded-full border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                            Manual
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                      {fieldEnabled(draftConfig, 'HEADER', 'grn_number') && (
                        <p>
                          <span className="text-muted-foreground">GRN No:</span>{' '}
                          {draftConfig.grnNumberPrefix || 'GRN-'}2026-0042
                        </p>
                      )}
                      {fieldEnabled(draftConfig, 'HEADER', 'grn_date') && (
                        <p>
                          <span className="text-muted-foreground">Date:</span> 05 Nov 2024
                        </p>
                      )}
                      {fieldEnabled(draftConfig, 'HEADER', 'po_reference') && (
                        <p>
                          <span className="text-muted-foreground">PO Ref:</span> PO-2024-025
                        </p>
                      )}
                      {fieldEnabled(draftConfig, 'HEADER', 'vendor_name') && (
                        <p>
                          <span className="text-muted-foreground">Vendor:</span> Acme Corp
                        </p>
                      )}
                      {fieldEnabled(draftConfig, 'HEADER', 'location') && (
                        <p>
                          <span className="text-muted-foreground">Location:</span> Head Office WH
                        </p>
                      )}
                    </div>
                  </header>
                )}

                {showDelivery && (
                  <section className="mb-5 rounded border p-4 text-sm">
                    <h3 className="mb-2 font-semibold">Delivery Details</h3>
                    <div className="flex flex-wrap gap-4">
                      {fieldEnabled(draftConfig, 'DELIVERY', 'challan') && (
                        <span>Challan: DC-ACM-112</span>
                      )}
                      {fieldEnabled(draftConfig, 'DELIVERY', 'challan_date') && (
                        <span>Challan Date: 04 Nov 2024</span>
                      )}
                      {fieldEnabled(draftConfig, 'DELIVERY', 'eway_bill') && (
                        <span>E-Way: EWB-112233</span>
                      )}
                      {fieldEnabled(draftConfig, 'DELIVERY', 'vehicle') && (
                        <span>Vehicle: MH-04-AB-1234</span>
                      )}
                      {fieldEnabled(draftConfig, 'DELIVERY', 'transporter') && (
                        <span>Transporter: BlueDart</span>
                      )}
                      {fieldEnabled(draftConfig, 'DELIVERY', 'lr_number') && (
                        <span>LR No: LR-998877</span>
                      )}
                    </div>
                  </section>
                )}

                {showBillToBlock && (
                  <section className="mb-5 rounded border p-4 text-sm">
                    <h3 className="mb-2 font-semibold">Bill-to</h3>
                    <div className="grid gap-2 md:grid-cols-2">
                      <span>Optifii AP Pvt Ltd</span>
                      <span>GSTIN: 27AAKCG8904C1ZL</span>
                      <span>Mumbai, Maharashtra 400079</span>
                    </div>
                  </section>
                )}

                {showLineItems && (
                  <section>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[720px] border-collapse text-sm">
                        <thead>
                          <tr className="border-b bg-slate-50 text-left text-xs uppercase text-muted-foreground">
                            {showItemCode && <th className="px-2 py-2">Code</th>}
                            <th className="px-2 py-2">Description</th>
                            {showHsn && <th className="px-2 py-2">HSN</th>}
                            {showUom && <th className="px-2 py-2">UOM</th>}
                            {showOrdered && <th className="px-2 py-2 text-right">Ordered</th>}
                            {showAlreadyReceived && <th className="px-2 py-2 text-right">Already Rcvd</th>}
                            {showReceived && <th className="px-2 py-2 text-right text-primary">Received</th>}
                            {showAccepted && <th className="px-2 py-2 text-right text-green-600">Accepted</th>}
                            {showRejected && <th className="px-2 py-2 text-right text-red-600">Rejected</th>}
                            {showRejectionReason && <th className="px-2 py-2">Reject Reason</th>}
                            {showRate && <th className="px-2 py-2 text-right">Rate</th>}
                            {showAmount && <th className="px-2 py-2 text-right">Amount</th>}
                            {showGstRate && <th className="px-2 py-2 text-right">GST %</th>}
                            {showBatchNo && <th className="px-2 py-2">Batch</th>}
                            {showLineRemarks && <th className="px-2 py-2">Remarks</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {SAMPLE_LINES.map((line, index) => (
                            <tr key={line.description} className="border-b">
                              {showItemCode && <td className="px-2 py-3">RM-00{index + 1}</td>}
                              <td className="px-2 py-3">{line.description}</td>
                              {showHsn && <td className="px-2 py-3">7208</td>}
                              {showUom && <td className="px-2 py-3">KG</td>}
                              {showOrdered && (
                                <td className="px-2 py-3 text-right text-muted-foreground">{line.ordered}</td>
                              )}
                              {showAlreadyReceived && (
                                <td className="px-2 py-3 text-right text-muted-foreground">200</td>
                              )}
                              {showReceived && (
                                <td className="px-2 py-3 text-right font-semibold text-primary">
                                  {line.received}
                                </td>
                              )}
                              {showAccepted && (
                                <td className="px-2 py-3 text-right text-green-600">{line.accepted}</td>
                              )}
                              {showRejected && (
                                <td className="px-2 py-3 text-right text-red-600">{line.rejected}</td>
                              )}
                              {showRejectionReason && (
                                <td className="px-2 py-3 text-muted-foreground">
                                  {line.rejected ? 'Damaged' : '-'}
                                </td>
                              )}
                              {showRate && <td className="px-2 py-3 text-right tabular-nums">{line.rate}</td>}
                              {showAmount && (
                                <td className="px-2 py-3 text-right tabular-nums">
                                  {(line.received * line.rate).toLocaleString('en-IN')}
                                </td>
                              )}
                              {showGstRate && (
                                <td className="px-2 py-3 text-right tabular-nums">{line.gstRate}%</td>
                              )}
                              {showBatchNo && <td className="px-2 py-3">BATCH-{index + 1}</td>}
                              {showLineRemarks && (
                                <td className="px-2 py-3 text-muted-foreground">OK</td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {showValuationColumns && (showRate || showAmount || showGstRate) && (
                      <div className="mt-4 flex justify-end">
                        <div className="w-full max-w-xs space-y-1 rounded border p-3 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Pre-tax Total</span>
                            <span>{samplePreTaxTotal.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">GST</span>
                            <span>{sampleTaxTotal.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex justify-between border-t pt-1 font-semibold">
                            <span>Post-tax Total</span>
                            <span>{(samplePreTaxTotal + sampleTaxTotal).toLocaleString('en-IN')}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </section>
                )}

                {showInspection && (
                  <section className="mt-5 rounded border p-4 text-sm">
                    <h3 className="mb-2 font-semibold">Inspection (QC)</h3>
                    {fieldEnabled(draftConfig, 'INSPECTION', 'inspected_by') && (
                      <p>Inspected by: Priya M.</p>
                    )}
                  </section>
                )}

                {showFooter && (
                  <section className="mt-6 rounded border p-4 text-sm">
                    <h3 className="mb-2 font-semibold">Footer</h3>
                    {fieldEnabled(draftConfig, 'FOOTER', 'received_by') && (
                      <p>Received by: Rahul S.</p>
                    )}
                    {fieldEnabled(draftConfig, 'FOOTER', 'remarks') && (
                      <p className="text-muted-foreground">Remarks: All items in good condition.</p>
                    )}
                    {fieldEnabled(draftConfig, 'FOOTER', 'signatures') && (
                      <div className="mt-4 grid grid-cols-2 gap-8 border-t pt-4 text-xs text-muted-foreground">
                        <div>Receiver Signature</div>
                        <div>Authorised Signature</div>
                      </div>
                    )}
                  </section>
                )}
              </div>
            </div>
          </main>
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={saving} data-testid="save-grn-builder-config">
            <Save className="mr-2 h-4 w-4" />
            Save Format
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GrnFormatBuilderDialog;

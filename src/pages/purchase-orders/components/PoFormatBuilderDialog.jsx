import React from "react";
import { Eye, FileText, Lock, Save, Trash2 } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { Switch } from "../../../components/ui/switch";
import { getTaxMode, isInrCurrency, formatCurrency } from "../utils";

const SAMPLE_ITEMS = [
  { description: "Industrial switch 48-port", hsn: "851762", uom: "NOS", quantity: 10, unitRate: 4200, gstRate: 18 },
  { description: "Installation and commissioning", hsn: "998739", uom: "HRS", quantity: 1, unitRate: 12000, gstRate: 18 },
];

const cloneConfig = (config) => ({
  ...config,
  sections: (config.sections || []).map((section) => ({
    ...section,
    fields: (section.fields || []).map((field) => ({ ...field })),
  })),
});

const sectionEnabled = (config, sectionKey) =>
  Boolean(config.sections?.find((section) => section.section === sectionKey)?.isEnabled);

const fieldEnabled = (config, sectionKey, fieldKey) => {
  const section = config.sections?.find((item) => item.section === sectionKey);
  if (!section?.isEnabled) return false;
  return Boolean(section.fields?.find((field) => field.fieldKey === fieldKey)?.isEnabled);
};

const isVisibleBuilderField = (field) => field.fieldKey !== "is_reverse_charge";

const PoFormatBuilderDialog = ({
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
}) => {
  const isInr = isInrCurrency(draftConfig.defaultCurrency);
  const taxMode = getTaxMode(draftConfig.defaultCurrency);
  const formatOptions = savedFormatConfigs.some((format) => format.id === draftConfig.id)
    ? savedFormatConfigs
    : [...savedFormatConfigs, draftConfig];
  const showGstSummary = isInr && fieldEnabled(draftConfig, "TAX_TOTALS", "tax_summary");
  const showLineGst = showGstSummary && fieldEnabled(draftConfig, "LINE_ITEM", "gst_rate");
  const showTds = isInr && fieldEnabled(draftConfig, "TAX_TOTALS", "is_tds_applicable");
  const sampleSubtotal = SAMPLE_ITEMS.reduce((sum, item) => sum + item.quantity * item.unitRate, 0);
  const sampleTax = showGstSummary ? SAMPLE_ITEMS.reduce((sum, item) => sum + (item.quantity * item.unitRate * item.gstRate) / 100, 0) : 0;
  const sampleTotal = sampleSubtotal + sampleTax;
  const documentBorderClass = draftConfig.templateCode === "T3" ? "border-2 border-slate-900" : "border";
  const headerBorderClass = draftConfig.templateCode === "T4" ? "border-b-4 border-emerald-600" : "border-b";

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

  const changeCurrency = (currency) => {
    setDraftConfig((prev) => {
      const next = cloneConfig(prev);
      next.defaultCurrency = currency;
      if (!isInrCurrency(currency)) {
        next.sections = next.sections.map((section) => ({
          ...section,
          fields: section.fields.map((field) =>
            field.isCurrencyDependent ? { ...field, isEnabled: false } : field,
          ),
        }));
      }
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col w-[96vw] max-w-7xl max-h-[92vh] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            PO Format Builder
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] min-h-0 overflow-hidden">
          <aside className="border-r bg-muted/20 overflow-y-auto px-5 py-4 space-y-5">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label>Editing Format</Label>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={onCreateFormat} data-testid="po-builder-new-format">
                      New Format
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onDeleteFormat}
                      disabled={savedFormatConfigs.length <= 1}
                      data-testid="po-builder-delete-format"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Select value={draftConfig.id || activeFormatId} onValueChange={onSelectFormat}>
                  <SelectTrigger data-testid="po-builder-format-select">
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    {formatOptions.map((format) => (
                      <SelectItem key={format.id} value={format.id}>
                        {format.name} ({format.templateCode}, {format.defaultCurrency})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Format Name</Label>
                <Input
                  value={draftConfig.name || ""}
                  onChange={(event) => updateConfig({ name: event.target.value })}
                  placeholder="e.g. Domestic GST Format"
                  data-testid="po-builder-format-name"
                />
              </div>

              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input
                  value={draftConfig.companyName}
                  onChange={(event) => updateConfig({ companyName: event.target.value })}
                  data-testid="po-builder-company-name"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>PO Prefix</Label>
                  <Input
                    value={draftConfig.poNumberPrefix}
                    onChange={(event) => updateConfig({ poNumberPrefix: event.target.value })}
                    data-testid="po-builder-prefix"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Template</Label>
                  <Select value={draftConfig.templateCode} onValueChange={(templateCode) => updateConfig({ templateCode })}>
                    <SelectTrigger data-testid="po-builder-template">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="T1">T1 Classic</SelectItem>
                      <SelectItem value="T2">T2 Compact</SelectItem>
                      <SelectItem value="T3">T3 Bordered</SelectItem>
                      <SelectItem value="T4">T4 Modern</SelectItem>
                      <SelectItem value="T5">T5 Letterhead</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Default Currency</Label>
                <Select value={draftConfig.defaultCurrency} onValueChange={changeCurrency}>
                  <SelectTrigger data-testid="po-builder-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR - GST Mode</SelectItem>
                    <SelectItem value="USD">USD - Export Mode</SelectItem>
                    <SelectItem value="EUR">EUR - Export Mode</SelectItem>
                    <SelectItem value="GBP">GBP - Export Mode</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Tax mode: {taxMode}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold">Sections & Fields</h3>
                <p className="text-xs text-muted-foreground">
                  Controls the exact create-PO document layout. PO values are entered during creation.
                </p>
              </div>

              {draftConfig.sections.map((section) => (
                <div key={section.section} className="rounded-lg border bg-background">
                  <div className="flex items-center justify-between gap-3 px-3 py-2 border-b">
                    <div>
                      <p className="text-sm font-medium">{section.label}</p>
                      <p className="text-[11px] text-muted-foreground">{section.section}</p>
                    </div>
                    <Switch
                      checked={section.isEnabled}
                      onCheckedChange={(checked) => toggleSection(section.section, checked)}
                      data-testid={`po-builder-section-${section.section}`}
                    />
                  </div>
                  <div className="px-3 py-2 space-y-2">
                    {section.fields.filter(isVisibleBuilderField).map((field) => {
                      const locked = !isInr && field.isCurrencyDependent;
                      return (
                        <div key={field.fieldKey} className="flex items-center justify-between gap-3 text-sm">
                          <div className={locked || !section.isEnabled ? "opacity-50" : ""}>
                            <span>{field.label}</span>
                            {field.isSystemField && <Lock className="ml-1 inline h-3 w-3 text-muted-foreground" />}
                            {locked && <span className="ml-2 text-[10px] text-amber-700">INR only</span>}
                          </div>
                          <Switch
                            checked={field.isEnabled && !locked && section.isEnabled}
                            disabled={field.isSystemField || locked || !section.isEnabled}
                            onCheckedChange={(checked) => toggleField(section.section, field.fieldKey, checked)}
                            data-testid={`po-builder-field-${field.fieldKey}`}
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
                  Create PO layout preview
                </div>
                <p className="max-w-xl text-xs">
                  This is the same selected format the user will edit in Create PO, then review read-only before saving.
                </p>
              </div>

              <div className={`bg-white shadow-sm ${documentBorderClass} p-8 min-h-[760px]`}>
                {sectionEnabled(draftConfig, "HEADER") && (
                  <header className={`mb-5 pb-5 ${headerBorderClass}`}>
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
                      <div className="flex items-start gap-3">
                        {fieldEnabled(draftConfig, "HEADER", "h_logo") && (
                          <div className="grid h-12 w-12 place-items-center rounded bg-emerald-700 text-lg font-semibold text-white">
                            {(draftConfig.companyName || "O").charAt(0)}
                          </div>
                        )}
                        <div>
                          <h2 className="text-xl font-bold">{draftConfig.companyName || "Company Name"}</h2>
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Purchase Order</p>
                        </div>
                      </div>
                      <div className="space-y-1 text-right text-sm">
                        {fieldEnabled(draftConfig, "HEADER", "po_number") && (
                          <p><span className="text-muted-foreground">PO No:</span> {draftConfig.poNumberPrefix || "PO-"}2026-0042</p>
                        )}
                        {fieldEnabled(draftConfig, "HEADER", "po_date") && (
                          <p><span className="text-muted-foreground">Date:</span> 22 May 2026</p>
                        )}
                        {fieldEnabled(draftConfig, "HEADER", "valid_till") && (
                          <p><span className="text-muted-foreground">Valid Till:</span> 15 Jun 2026</p>
                        )}
                      </div>
                    </div>
                  </header>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {sectionEnabled(draftConfig, "VENDOR") && (
                    <section className="rounded border p-4">
                      <h3 className="mb-2 text-sm font-semibold">Vendor</h3>
                      {fieldEnabled(draftConfig, "VENDOR", "vendor_name") && <p className="font-medium">Aarav Industrial Supplies</p>}
                      {fieldEnabled(draftConfig, "VENDOR", "vendor_gstin") && <p className="text-sm text-muted-foreground">GSTIN: 27ABCDE1234F1Z5</p>}
                      {fieldEnabled(draftConfig, "VENDOR", "vendor_pan") && <p className="text-sm text-muted-foreground">PAN: ABCDE1234F</p>}
                    </section>
                  )}

                  {sectionEnabled(draftConfig, "SHIP_BILL") && (
                    <section className="rounded border p-4">
                      <h3 className="mb-2 text-sm font-semibold">Ship & Bill</h3>
                      {fieldEnabled(draftConfig, "SHIP_BILL", "ship_to_address") && <p className="text-sm">Ship To: Optifii AP Office, Mumbai</p>}
                      {fieldEnabled(draftConfig, "SHIP_BILL", "billing_address") && <p className="text-sm">Bill To: Optifii Finance Team, Mumbai</p>}
                      {fieldEnabled(draftConfig, "SHIP_BILL", "place_of_supply") && <p className="text-sm text-muted-foreground">Place of Supply: MH</p>}
                    </section>
                  )}
                </div>

                {sectionEnabled(draftConfig, "LINE_ITEM") && (
                  <section className="mt-6">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b bg-slate-50 text-left text-xs uppercase text-muted-foreground">
                          <th className="px-2 py-2">#</th>
                          {fieldEnabled(draftConfig, "LINE_ITEM", "item_name") && <th className="px-2 py-2">Description</th>}
                          {fieldEnabled(draftConfig, "LINE_ITEM", "hsn_sac_code") && <th className="px-2 py-2">HSN/SAC</th>}
                          {fieldEnabled(draftConfig, "LINE_ITEM", "uom") && <th className="px-2 py-2">UOM</th>}
                          {fieldEnabled(draftConfig, "LINE_ITEM", "quantity") && <th className="px-2 py-2 text-right">Qty</th>}
                          {fieldEnabled(draftConfig, "LINE_ITEM", "unit_rate") && <th className="px-2 py-2 text-right">Rate</th>}
                          {fieldEnabled(draftConfig, "LINE_ITEM", "discount_percent") && <th className="px-2 py-2 text-right">Disc</th>}
                          {showLineGst && <th className="px-2 py-2 text-right">GST</th>}
                          <th className="px-2 py-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {SAMPLE_ITEMS.map((item, index) => (
                          <tr key={item.description} className="border-b">
                            <td className="px-2 py-3">{index + 1}</td>
                            {fieldEnabled(draftConfig, "LINE_ITEM", "item_name") && <td className="px-2 py-3">{item.description}</td>}
                            {fieldEnabled(draftConfig, "LINE_ITEM", "hsn_sac_code") && <td className="px-2 py-3">{item.hsn}</td>}
                            {fieldEnabled(draftConfig, "LINE_ITEM", "uom") && <td className="px-2 py-3">{item.uom}</td>}
                            {fieldEnabled(draftConfig, "LINE_ITEM", "quantity") && <td className="px-2 py-3 text-right">{item.quantity}</td>}
                            {fieldEnabled(draftConfig, "LINE_ITEM", "unit_rate") && <td className="px-2 py-3 text-right">{formatCurrency(item.unitRate, draftConfig.defaultCurrency)}</td>}
                            {fieldEnabled(draftConfig, "LINE_ITEM", "discount_percent") && <td className="px-2 py-3 text-right">0%</td>}
                            {showLineGst && <td className="px-2 py-3 text-right">{item.gstRate}%</td>}
                            <td className="px-2 py-3 text-right">{formatCurrency(item.quantity * item.unitRate * (showLineGst ? 1 + item.gstRate / 100 : 1), draftConfig.defaultCurrency)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </section>
                )}

                {sectionEnabled(draftConfig, "TAX_TOTALS") && (
                  <section className="ml-auto mt-6 w-full max-w-sm rounded border p-4 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(sampleSubtotal, draftConfig.defaultCurrency)}</span></div>
                    {showGstSummary && (
                      <>
                        <div className="flex justify-between"><span className="text-muted-foreground">CGST</span><span>{formatCurrency(sampleTax / 2, draftConfig.defaultCurrency)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">SGST</span><span>{formatCurrency(sampleTax / 2, draftConfig.defaultCurrency)}</span></div>
                      </>
                    )}
                    {!isInr && <p className="my-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-700">Export mode: zero-rated, no GST fields.</p>}
                    <div className="mt-2 flex justify-between border-t pt-2 text-base font-semibold"><span>Total</span><span>{formatCurrency(sampleTotal, draftConfig.defaultCurrency)}</span></div>
                    {showTds && (
                      <div className="mt-2 rounded bg-slate-50 px-2 py-1 text-xs text-muted-foreground">
                        <div className="flex justify-between gap-3">
                          <span>TDS</span>
                          <span>Section and rate selected during PO creation</span>
                        </div>
                      </div>
                    )}
                  </section>
                )}

                {sectionEnabled(draftConfig, "PAYMENT") && (
                  <section className="mt-6 rounded border p-4 text-sm">
                    <h3 className="mb-2 font-semibold">Terms</h3>
                    {fieldEnabled(draftConfig, "PAYMENT", "payment_terms") && <p>Payment Terms: Net 30 days</p>}
                    {fieldEnabled(draftConfig, "PAYMENT", "delivery_terms") && <p>Delivery Terms: Door delivery</p>}
                    {fieldEnabled(draftConfig, "PAYMENT", "freight_terms") && <p>Freight Terms: Included</p>}
                  </section>
                )}
              </div>
            </div>
          </main>
        </div>

        <DialogFooter className="border-t px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSave} data-testid="save-po-builder-config">
            <Save className="mr-2 h-4 w-4" />
            Save Format
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PoFormatBuilderDialog;

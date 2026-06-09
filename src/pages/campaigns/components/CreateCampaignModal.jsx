import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Calendar } from "../../../components/ui/calendar";
import { Checkbox } from "../../../components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../../../components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { cn } from "../../../lib/utils";
import { TAX_RATES } from "../../invoices/constants";
import { sanitizeNumericInput } from "../../invoices/utils/numericInput";
import { FieldError } from "./CampaignShared";
import {
  calculateCampaignGrossFromNet,
  calculateCampaignNetFromGross,
  formatCurrency,
  formatDate,
} from "../utils/campaignFormatters";

const EMPTY_VENDOR_ENTRY = {
  net: "",
  gross: "",
  gstOption: "",
};

const initialForm = {
  name: "",
  startDate: "",
  endDate: "",
  budget: "",
  budgetNet: "",
  budgetGstOption: "",
  totalCost: "",
  totalCostNet: "",
  totalCostGstOption: "",
};

const toInputAmount = (value) => {
  const number = Number(value || 0);
  if (!number) return "";
  const rounded = Math.round(number * 100) / 100;
  return String(rounded);
};

const sanitizeCampaignAmount = (value) =>
  sanitizeNumericInput(value, { allowDecimal: true, maxDecimalPlaces: 2 });

const amountsMatch = (left, right) =>
  Math.abs(Number(left || 0) - Number(right || 0)) < 0.005;

const parseDateValue = (value) => {
  if (!value) return undefined;
  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
};

const toDateValue = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const campaignCalendarStartMonth = new Date(new Date().getFullYear() - 10, 0);
const campaignCalendarEndMonth = new Date(2099, 11);

const CAMPAIGN_GST_OPTIONS = TAX_RATES.map((taxRate) => ({
  value: taxRate.value,
  label: taxRate.label,
}));

const getCampaignGstRate = (gstOption) => {
  const taxRate = TAX_RATES.find((entry) => entry.value === gstOption);
  if (!taxRate) return 0;
  if (taxRate.igst != null) return Number(taxRate.igst) || 0;
  const splitTaxRate = Number(taxRate.cgst || 0) + Number(taxRate.sgst || 0);
  if (splitTaxRate > 0) return splitTaxRate;
  const labelRate = String(taxRate.value || taxRate.label || "").match(
    /(\d+(?:\.\d+)?)%/,
  );
  return labelRate ? Number(labelRate[1]) : 0;
};

const CampaignTaxAmountFields = ({
  sectionLabel,
  grossValue,
  onGrossChange,
  grossError,
  netValue,
  onNetChange,
  netError,
  gstOption,
  onTaxChange,
  taxError,
}) => (
  <div className="space-y-2">
    {sectionLabel ? <Label>{sectionLabel}</Label> : null}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <div className="space-y-2">
        <Label>Net Amount (₹) *</Label>
        <Input
          inputMode="decimal"
          value={netValue}
          onChange={(event) => onNetChange(event.target.value)}
          placeholder="Amount before tax"
        />
        <FieldError>{netError}</FieldError>
      </div>
      <div className="space-y-2">
        <Label>Tax *</Label>
        <Select value={gstOption} onValueChange={onTaxChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select tax" />
          </SelectTrigger>
          <SelectContent>
            {CAMPAIGN_GST_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError>{taxError}</FieldError>
      </div>
      <div className="space-y-2">
        <Label>Gross Amount (₹) *</Label>
        <Input
          inputMode="decimal"
          value={grossValue}
          onChange={(event) => onGrossChange(event.target.value)}
          placeholder="Net amount + tax"
        />
        <FieldError>{grossError}</FieldError>
      </div>
    </div>
  </div>
);

const CreateCampaignModal = ({
  open,
  onOpenChange,
  vendors = [],
  onSubmit,
  saving = false,
  campaign = null,
}) => {
  const [form, setForm] = useState(initialForm);
  const [selectedVendorIds, setSelectedVendorIds] = useState([]);
  const [vendorEntries, setVendorEntries] = useState({});
  const [errors, setErrors] = useState({});
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const totalCostTaxTouchedRef = useRef(false);

  const applyTotalCostTaxToForm = (next, prev, totalCostGstOption) => {
    next.totalCostGstOption = totalCostGstOption;
    if (prev.totalCostNet) {
      next.totalCost = toInputAmount(
        calculateCampaignGrossFromNet({
          netAmount: prev.totalCostNet,
          gstOption: totalCostGstOption,
        }),
      );
    } else if (prev.totalCost) {
      next.totalCostNet = toInputAmount(
        calculateCampaignNetFromGross({
          grossAmount: prev.totalCost,
          gstOption: totalCostGstOption,
        }),
      );
    }
    return next;
  };

  useEffect(() => {
    if (!open) return;
    if (campaign) {
      const budgetGstOption =
        campaign.budgetGstOption ?? campaign.budget_gst_option ?? campaign.gstOption ?? "Exempt";
      const totalCostGstOption =
        campaign.totalCostGstOption ??
        campaign.total_cost_gst_option ??
        campaign.gstOption ??
        "Exempt";
      const budgetNet = toInputAmount(
        campaign.budgetNetAmount ?? campaign.budget,
      );
      const totalCostNet = toInputAmount(
        campaign.netAmount ?? campaign.totalCost,
      );
      setForm({
        name: campaign.name || "",
        startDate: campaign.startDate || "",
        endDate: campaign.endDate || "",
        budgetNet,
        budgetGstOption,
        budget: toInputAmount(
          campaign.budgetGrossAmount ??
            calculateCampaignGrossFromNet({
              netAmount: budgetNet,
              gstOption: budgetGstOption,
            }),
        ),
        totalCostNet,
        totalCostGstOption,
        totalCost: toInputAmount(
          campaign.grossAmount ??
            calculateCampaignGrossFromNet({
              netAmount: totalCostNet,
              gstOption: totalCostGstOption,
            }),
        ),
      });
      const ids = (campaign.vendors || []).map((v) => String(v.vendorId || v.id));
      setSelectedVendorIds(ids);
      const entries = {};
      (campaign.vendors || []).forEach((v) => {
        const vendorId = String(v.vendorId || v.id);
        const gstOption =
          v.gstOption ?? v.gst_option ?? totalCostGstOption ?? "";
        const net = toInputAmount(v.netCost ?? v.net_cost ?? v.cost);
        entries[vendorId] = {
          net,
          gstOption,
          gross: toInputAmount(
            v.grossCost ??
              v.gross_cost ??
              calculateCampaignGrossFromNet({ netAmount: net, gstOption }),
          ),
        };
      });
      setVendorEntries(entries);
      totalCostTaxTouchedRef.current = budgetGstOption !== totalCostGstOption;
    } else {
      setForm(initialForm);
      setSelectedVendorIds([]);
      setVendorEntries({});
      totalCostTaxTouchedRef.current = false;
    }
    setErrors({});
    setStartDateOpen(false);
    setEndDateOpen(false);
  }, [open, campaign]);

  const selectedVendors = useMemo(
    () =>
      selectedVendorIds
        .map((id) => vendors.find((vendor) => String(vendor.id) === id))
        .filter(Boolean),
    [selectedVendorIds, vendors],
  );

  const vendorGrossTotal = selectedVendorIds.reduce(
    (sum, vendorId) => sum + Number(vendorEntries[vendorId]?.gross || 0),
    0,
  );
  const budgetNet = Number(form.budgetNet || 0);
  const totalCostNet = Number(form.totalCostNet || 0);
  const totalCostGross = Number(form.totalCost || 0);
  const remainingBudget = budgetNet - totalCostNet;
  const remainingVendorCost = totalCostGross - vendorGrossTotal;
  const totalMatches =
    totalCostGross > 0 && amountsMatch(vendorGrossTotal, totalCostGross);
  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const updateBudgetTaxOption = (budgetGstOption) => {
    setForm((prev) => {
      let next = { ...prev, budgetGstOption };
      if (prev.budgetNet) {
        next.budget = toInputAmount(
          calculateCampaignGrossFromNet({
            netAmount: prev.budgetNet,
            gstOption: budgetGstOption,
          }),
        );
      } else if (prev.budget) {
        next.budgetNet = toInputAmount(
          calculateCampaignNetFromGross({
            grossAmount: prev.budget,
            gstOption: budgetGstOption,
          }),
        );
      }
      if (!totalCostTaxTouchedRef.current) {
        next = applyTotalCostTaxToForm(next, prev, budgetGstOption);
      }
      return next;
    });
    setErrors((prev) => ({
      ...prev,
      budgetGstOption: "",
      budget: "",
      budgetNet: "",
      ...(!totalCostTaxTouchedRef.current
        ? {
            totalCostGstOption: "",
            totalCost: "",
            totalCostNet: "",
          }
        : {}),
    }));
  };

  const updateTotalCostTaxOption = (totalCostGstOption) => {
    totalCostTaxTouchedRef.current = true;
    setForm((prev) => {
      const next = { ...prev, totalCostGstOption };
      if (prev.totalCostNet) {
        next.totalCost = toInputAmount(
          calculateCampaignGrossFromNet({
            netAmount: prev.totalCostNet,
            gstOption: totalCostGstOption,
          }),
        );
      } else if (prev.totalCost) {
        next.totalCostNet = toInputAmount(
          calculateCampaignNetFromGross({
            grossAmount: prev.totalCost,
            gstOption: totalCostGstOption,
          }),
        );
      }
      return next;
    });
    setErrors((prev) => ({
      ...prev,
      totalCostGstOption: "",
      totalCost: "",
      totalCostNet: "",
    }));
  };

  const updateBudgetGross = (value) => {
    const gross = sanitizeCampaignAmount(value);
    setForm((prev) => {
      const net =
        gross && prev.budgetGstOption
          ? toInputAmount(
              calculateCampaignNetFromGross({
                grossAmount: gross,
                gstOption: prev.budgetGstOption,
              }),
            )
          : "";
      return { ...prev, budget: gross, budgetNet: net };
    });
    setErrors((prev) => ({ ...prev, budget: "", budgetNet: "" }));
  };

  const updateBudgetNet = (value) => {
    const net = sanitizeCampaignAmount(value);
    setForm((prev) => {
      const gross =
        net && prev.budgetGstOption
          ? toInputAmount(
              calculateCampaignGrossFromNet({
                netAmount: net,
                gstOption: prev.budgetGstOption,
              }),
            )
          : "";
      return { ...prev, budgetNet: net, budget: gross };
    });
    setErrors((prev) => ({ ...prev, budget: "", budgetNet: "" }));
  };

  const updateTotalCostGross = (value) => {
    const gross = sanitizeCampaignAmount(value);
    setForm((prev) => {
      const net =
        gross && prev.totalCostGstOption
          ? toInputAmount(
              calculateCampaignNetFromGross({
                grossAmount: gross,
                gstOption: prev.totalCostGstOption,
              }),
            )
          : "";
      return { ...prev, totalCost: gross, totalCostNet: net };
    });
    setErrors((prev) => ({ ...prev, totalCost: "", totalCostNet: "" }));
  };

  const updateTotalCostNet = (value) => {
    const net = sanitizeCampaignAmount(value);
    setForm((prev) => {
      const gross =
        net && prev.totalCostGstOption
          ? toInputAmount(
              calculateCampaignGrossFromNet({
                netAmount: net,
                gstOption: prev.totalCostGstOption,
              }),
            )
          : "";
      return { ...prev, totalCostNet: net, totalCost: gross };
    });
    setErrors((prev) => ({ ...prev, totalCost: "", totalCostNet: "" }));
  };

  const getVendorEntry = (vendorId) =>
    vendorEntries[vendorId] || EMPTY_VENDOR_ENTRY;

  const clearVendorFieldErrors = () => {
    setErrors((prev) => ({
      ...prev,
      vendorCosts: "",
      vendorTax: "",
      vendorTotal: "",
    }));
  };

  const updateVendorNet = (vendorId, value) => {
    const net = sanitizeCampaignAmount(value);
    setVendorEntries((prev) => {
      const entry = prev[vendorId] || EMPTY_VENDOR_ENTRY;
      const gross =
        net && entry.gstOption
          ? toInputAmount(
              calculateCampaignGrossFromNet({
                netAmount: net,
                gstOption: entry.gstOption,
              }),
            )
          : "";
      return { ...prev, [vendorId]: { ...entry, net, gross } };
    });
    clearVendorFieldErrors();
  };

  const updateVendorGross = (vendorId, value) => {
    const gross = sanitizeCampaignAmount(value);
    setVendorEntries((prev) => {
      const entry = prev[vendorId] || EMPTY_VENDOR_ENTRY;
      const net =
        gross && entry.gstOption
          ? toInputAmount(
              calculateCampaignNetFromGross({
                grossAmount: gross,
                gstOption: entry.gstOption,
              }),
            )
          : "";
      return { ...prev, [vendorId]: { ...entry, gross, net } };
    });
    clearVendorFieldErrors();
  };

  const updateVendorTax = (vendorId, gstOption) => {
    setVendorEntries((prev) => {
      const entry = prev[vendorId] || EMPTY_VENDOR_ENTRY;
      const next = { ...entry, gstOption };
      if (entry.net) {
        next.gross = toInputAmount(
          calculateCampaignGrossFromNet({
            netAmount: entry.net,
            gstOption,
          }),
        );
      } else if (entry.gross) {
        next.net = toInputAmount(
          calculateCampaignNetFromGross({
            grossAmount: entry.gross,
            gstOption,
          }),
        );
      }
      return { ...prev, [vendorId]: next };
    });
    clearVendorFieldErrors();
  };

  const toggleVendor = (vendorId) => {
    const id = String(vendorId);
    if (selectedVendorIds.includes(id)) {
      setSelectedVendorIds((prev) => prev.filter((item) => item !== id));
      setVendorEntries((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } else {
      setSelectedVendorIds((prev) => [...prev, id]);
      setVendorEntries((prev) => ({
        ...prev,
        [id]: {
          ...EMPTY_VENDOR_ENTRY,
          gstOption: form.totalCostGstOption || "",
        },
      }));
    }
    setErrors((prev) => ({ ...prev, vendors: "", vendorCosts: "", vendorTax: "" }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = "Campaign name is required";
    if (!form.startDate) nextErrors.startDate = "Start date is required";
    if (!form.endDate) nextErrors.endDate = "End date is required";
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      nextErrors.endDate = "End date must be on or after start date";
    }
    if (budgetNet <= 0) nextErrors.budgetNet = "Budget net amount must be > 0";
    if (totalCostNet <= 0)
      nextErrors.totalCostNet = "Total cost net amount must be > 0";
    if (budgetNet > 0 && totalCostNet > budgetNet) {
      nextErrors.totalCostNet = "Total cost cannot be greater than budget";
    }
    if (budgetNet > 0 && !form.budgetGstOption) {
      nextErrors.budgetGstOption = "Budget tax is required";
    }
    if (totalCostNet > 0 && !form.totalCostGstOption) {
      nextErrors.totalCostGstOption = "Total cost tax is required";
    }
    if (selectedVendorIds.length === 0)
      nextErrors.vendors = "Select at least one vendor";
    selectedVendorIds.forEach((vendorId) => {
      const entry = getVendorEntry(vendorId);
      if (Number(entry.net || 0) <= 0) {
        nextErrors.vendorCosts = "Each vendor needs a net amount > 0";
      }
      if (!entry.gstOption) {
        nextErrors.vendorTax = "Each vendor needs a tax selection";
      }
      if (Number(entry.gross || 0) <= 0) {
        nextErrors.vendorCosts = "Each vendor needs a gross amount > 0";
      }
    });
    if (
      selectedVendorIds.length > 0 &&
      !amountsMatch(vendorGrossTotal, totalCostGross)
    ) {
      nextErrors.vendorTotal =
        "Vendor gross total must equal total cost gross amount";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit?.({
      name: form.name.trim(),
      startDate: form.startDate,
      endDate: form.endDate,
      budget: Number(form.budgetNet),
      totalCost: Number(form.totalCostNet),
      includeGst:
        getCampaignGstRate(form.budgetGstOption) > 0 ||
        getCampaignGstRate(form.totalCostGstOption) > 0,
      budgetGstOption: form.budgetGstOption || "",
      totalCostGstOption: form.totalCostGstOption || "",
      gstOption: form.totalCostGstOption || "",
      grossAmount: Number(form.totalCost),
      netAmount: Number(form.totalCostNet),
      budgetGrossAmount: Number(form.budget),
      budgetNetAmount: Number(form.budgetNet),
      vendors: selectedVendorIds.map((vendorId) => {
        const entry = getVendorEntry(vendorId);
        return {
          vendorId,
          cost: Number(entry.net),
          netCost: Number(entry.net),
          grossCost: Number(entry.gross),
          gstOption: entry.gstOption || "",
        };
      }),
    });
  };

  const handleStartDateSelect = (date) => {
    if (!date) return;
    const nextStartDate = toDateValue(date);
    setForm((prev) => ({
      ...prev,
      startDate: nextStartDate,
      endDate: "",
    }));
    setErrors((prev) => ({ ...prev, startDate: "", endDate: "" }));
    setStartDateOpen(false);
    setEndDateOpen(true);
  };

  const handleEndDateSelect = (date) => {
    if (!date) return;
    updateForm("endDate", toDateValue(date));
    setEndDateOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{campaign ? "Edit Campaign" : "Create Campaign"}</DialogTitle>
          <DialogDescription>
            Select campaign vendors once, then enter the cost for each vendor.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Campaign Name *</Label>
            <Input
              value={form.name}
              onChange={(event) => updateForm("name", event.target.value)}
            />
            <FieldError>{errors.name}</FieldError>
          </div>
          <div className="md:col-span-2">
            <CampaignTaxAmountFields
              sectionLabel="Selling Price / Budget *"
              grossValue={form.budget}
              onGrossChange={updateBudgetGross}
              grossError={errors.budget}
              netValue={form.budgetNet}
              onNetChange={updateBudgetNet}
              netError={errors.budgetNet}
              gstOption={form.budgetGstOption}
              onTaxChange={updateBudgetTaxOption}
              taxError={errors.budgetGstOption}
            />
          </div>
          <div className="space-y-2">
            <Label>Start Date *</Label>
            <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "h-9 w-full justify-start text-left font-normal",
                    !form.startDate && "text-muted-foreground",
                  )}
                >
                  {form.startDate ? formatDate(form.startDate) : "Select start date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="z-[60] w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  captionLayout="dropdown"
                  navLayout="after"
                  startMonth={campaignCalendarStartMonth}
                  endMonth={campaignCalendarEndMonth}
                  selected={parseDateValue(form.startDate)}
                  onSelect={handleStartDateSelect}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <FieldError>{errors.startDate}</FieldError>
          </div>
          <div className="space-y-2">
            <Label>End Date *</Label>
            <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "h-9 w-full justify-start text-left font-normal",
                    !form.endDate && "text-muted-foreground",
                  )}
                >
                  {form.endDate ? formatDate(form.endDate) : "Select end date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="z-[60] w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  captionLayout="dropdown"
                  navLayout="after"
                  startMonth={campaignCalendarStartMonth}
                  endMonth={campaignCalendarEndMonth}
                  selected={parseDateValue(form.endDate)}
                  onSelect={handleEndDateSelect}
                  disabled={(date) => {
                    const startDate = parseDateValue(form.startDate);
                    return startDate ? date < startDate : false;
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <FieldError>{errors.endDate}</FieldError>
          </div>
          <div className="md:col-span-2">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <Label>Cost Price / Total Cost *</Label>
              <span
                className={cn(
                  "text-xs font-medium",
                  remainingBudget < 0 ? "text-red-600" : "text-muted-foreground",
                )}
              >
                Remaining budget: {formatCurrency(remainingBudget)}
              </span>
            </div>
            <CampaignTaxAmountFields
              grossValue={form.totalCost}
              onGrossChange={updateTotalCostGross}
              grossError={errors.totalCost}
              netValue={form.totalCostNet}
              onNetChange={updateTotalCostNet}
              netError={errors.totalCostNet}
              gstOption={form.totalCostGstOption}
              onTaxChange={updateTotalCostTaxOption}
              taxError={errors.totalCostGstOption}
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label>Vendors *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-between"
              >
                {selectedVendors.length > 0
                  ? `${selectedVendors.length} vendor(s) selected`
                  : "Select vendors"}
                <ChevronsUpDown className="h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
              <Command>
                <CommandInput placeholder="Search vendors..." />
                <CommandList>
                  <CommandEmpty>No vendors found.</CommandEmpty>
                  <CommandGroup>
                    {vendors.map((vendor) => {
                      const vendorId = String(vendor.id);
                      const checked = selectedVendorIds.includes(vendorId);
                      return (
                        <CommandItem
                          key={vendorId}
                          value={vendor.name}
                          onSelect={() => toggleVendor(vendorId)}
                          className="gap-2"
                        >
                          <Checkbox checked={checked} />
                          <span className="flex-1">{vendor.name}</span>
                          <Check
                            className={cn(
                              "h-4 w-4",
                              checked ? "opacity-100" : "opacity-0",
                            )}
                          />
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <FieldError>{errors.vendors}</FieldError>

          {selectedVendors.length > 0 && (
            <div className="rounded-lg border border-border divide-y">
              {selectedVendors.map((vendor) => {
                const vendorId = String(vendor.id);
                const entry = getVendorEntry(vendorId);
                return (
                  <div key={vendorId} className="space-y-3 p-3">
                    <p className="font-medium">{vendor.name}</p>
                    <CampaignTaxAmountFields
                      grossValue={entry.gross}
                      onGrossChange={(value) => updateVendorGross(vendorId, value)}
                      netValue={entry.net}
                      onNetChange={(value) => updateVendorNet(vendorId, value)}
                      gstOption={entry.gstOption}
                      onTaxChange={(value) => updateVendorTax(vendorId, value)}
                      taxError={errors.vendorTax}
                    />
                  </div>
                );
              })}
            </div>
          )}
          <FieldError>{errors.vendorCosts}</FieldError>
          <FieldError>{errors.vendorTax}</FieldError>

          <div
            className={cn(
              "rounded-lg border p-3 text-sm space-y-1 flex justify-between",
              totalMatches
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700",
            )}
          >
            <p>
              Vendor gross total: {formatCurrency(vendorGrossTotal)} / Total cost
              gross: {formatCurrency(totalCostGross)}
            </p>
            <p>
              Remaining cost: {formatCurrency(remainingVendorCost)}
            </p>
          </div>
          <FieldError>{errors.vendorTotal}</FieldError>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? (campaign ? "Saving..." : "Creating...") : (campaign ? "Save Changes" : "Create Campaign")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateCampaignModal;

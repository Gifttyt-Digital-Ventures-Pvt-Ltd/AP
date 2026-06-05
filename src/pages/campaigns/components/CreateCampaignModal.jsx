import React, { useEffect, useMemo, useState } from "react";
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
import { FieldError } from "./CampaignShared";
import { formatCurrency, formatDate } from "../utils/campaignFormatters";

const initialForm = {
  name: "",
  startDate: "",
  endDate: "",
  budget: "",
  totalCost: "",
  includeGst: false,
  gstOption: "",
};

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

const sanitizeNumberInput = (value) => String(value).replace(/\D/g, "");

const getTaxRateValue = (taxRate = {}) => {
  if (taxRate.igst != null) return Number(taxRate.igst) || 0;
  const splitTaxRate = Number(taxRate.cgst || 0) + Number(taxRate.sgst || 0);
  if (splitTaxRate > 0) return splitTaxRate;
  const labelRate = String(taxRate.value || taxRate.label || "").match(
    /(\d+(?:\.\d+)?)%/,
  );
  return labelRate ? Number(labelRate[1]) : 0;
};

const CAMPAIGN_GST_OPTIONS = TAX_RATES.map((taxRate) => ({
  value: taxRate.value,
  label: taxRate.label,
  rate: getTaxRateValue(taxRate),
}));

const getCampaignGstRate = (gstOption) =>
  CAMPAIGN_GST_OPTIONS.find((option) => option.value === gstOption)?.rate ?? 0;

const calculateCampaignGstAmounts = ({ totalCost, includeGst, gstOption }) => {
  const grossAmount = Number(totalCost || 0);
  if (!includeGst) {
    return { grossAmount, netAmount: grossAmount };
  }
  const gstRate = getCampaignGstRate(gstOption);
  const netAmount =
    gstRate > 0
      ? Math.round((grossAmount + (grossAmount * gstRate) / 100) * 100) / 100
      : grossAmount;
  return { grossAmount, netAmount };
};

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
  const [vendorCosts, setVendorCosts] = useState({});
  const [errors, setErrors] = useState({});
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (campaign) {
      setForm({
        name: campaign.name || "",
        startDate: campaign.startDate || "",
        endDate: campaign.endDate || "",
        budget: campaign.budget || "",
        totalCost: campaign.totalCost || "",
        includeGst: Boolean(campaign.includeGst),
        gstOption: campaign.gstOption || "",
      });
      const ids = (campaign.vendors || []).map((v) => String(v.vendorId || v.id));
      setSelectedVendorIds(ids);
      const costs = {};
      (campaign.vendors || []).forEach((v) => {
        costs[String(v.vendorId || v.id)] = v.cost;
      });
      setVendorCosts(costs);
    } else {
      setForm(initialForm);
      setSelectedVendorIds([]);
      setVendorCosts({});
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

  const vendorCostTotal = selectedVendorIds.reduce(
    (sum, vendorId) => sum + Number(vendorCosts[vendorId] || 0),
    0,
  );
  const budget = Number(form.budget || 0);
  const totalCost = Number(form.totalCost || 0);
  const remainingBudget = budget - totalCost;
  const remainingVendorCost = totalCost - vendorCostTotal;
  const totalMatches = totalCost > 0 && vendorCostTotal === totalCost;
  const { grossAmount, netAmount } = calculateCampaignGstAmounts({
    totalCost: form.totalCost,
    includeGst: form.includeGst,
    gstOption: form.gstOption,
  });

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const updateNumberField = (key, value) => {
    updateForm(key, sanitizeNumberInput(value));
    if (key === "budget" || key === "totalCost") {
      setErrors((prev) => ({ ...prev, budget: "", totalCost: "" }));
    }
  };

  const updateVendorCost = (vendorId, value) => {
    setVendorCosts((prev) => ({
      ...prev,
      [vendorId]: sanitizeNumberInput(value),
    }));
    setErrors((prev) => ({
      ...prev,
      vendorCosts: "",
      vendorTotal: "",
    }));
  };

  const toggleVendor = (vendorId) => {
    setSelectedVendorIds((prev) => {
      const id = String(vendorId);
      if (prev.includes(id)) {
        setVendorCosts((costs) => {
          const next = { ...costs };
          delete next[id];
          return next;
        });
        return prev.filter((item) => item !== id);
      }
      return [...prev, id];
    });
    setErrors((prev) => ({ ...prev, vendors: "", vendorCosts: "" }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = "Campaign name is required";
    if (!form.startDate) nextErrors.startDate = "Start date is required";
    if (!form.endDate) nextErrors.endDate = "End date is required";
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      nextErrors.endDate = "End date must be on or after start date";
    }
    if (budget <= 0) nextErrors.budget = "Budget must be > 0";
    if (totalCost <= 0)
      nextErrors.totalCost = "Total cost must be > 0";
    if (budget > 0 && totalCost > budget) {
      nextErrors.totalCost = "Total cost cannot be greater than budget";
    }
    if (form.includeGst && !form.gstOption) {
      nextErrors.gstOption = "GST option is required";
    }
    if (selectedVendorIds.length === 0)
      nextErrors.vendors = "Select at least one vendor";
    selectedVendorIds.forEach((vendorId) => {
      if (Number(vendorCosts[vendorId] || 0) <= 0) {
        nextErrors.vendorCosts = "Each selected vendor needs a cost > 0";
      }
    });
    if (selectedVendorIds.length > 0 && vendorCostTotal !== totalCost) {
      nextErrors.vendorTotal = "Vendor cost total must equal total cost";
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
      budget: Number(form.budget),
      totalCost: Number(form.totalCost),
      includeGst: Boolean(form.includeGst),
      gstOption: form.includeGst ? form.gstOption : "",
      grossAmount,
      netAmount,
      vendors: selectedVendorIds.map((vendorId) => ({
        vendorId,
        cost: Number(vendorCosts[vendorId]),
      })),
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
          <div className="space-y-2">
            <Label>Budget (₹) *</Label>
            <Input
              inputMode="numeric"
              pattern="[0-9]*"
              value={form.budget}
              onChange={(event) => updateNumberField("budget", event.target.value)}
            />
            <FieldError>{errors.budget}</FieldError>
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
          <div className="space-y-2 md:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label>Total Cost (₹) *</Label>
              <span
                className={cn(
                  "text-xs font-medium",
                  remainingBudget < 0 ? "text-red-600" : "text-muted-foreground",
                )}
              >
                Remaining budget: {formatCurrency(remainingBudget)}
              </span>
            </div>
            <Input
              inputMode="numeric"
              pattern="[0-9]*"
              value={form.totalCost}
              onChange={(event) =>
                updateNumberField("totalCost", event.target.value)
              }
            />
            <FieldError>{errors.totalCost}</FieldError>
          </div>
          <div className="space-y-3 md:col-span-2 rounded-lg border border-border p-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Checkbox
                checked={form.includeGst}
                onCheckedChange={(checked) => {
                  setForm((prev) => ({
                    ...prev,
                    includeGst: Boolean(checked),
                    gstOption: checked ? prev.gstOption : "",
                  }));
                  setErrors((prev) => ({ ...prev, gstOption: "" }));
                }}
              />
              Include GST
            </label>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {form.includeGst && (
                <div className="space-y-2">
                  <Label>GST Option *</Label>
                  <Select
                    value={form.gstOption}
                    onValueChange={(value) => updateForm("gstOption", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select GST" />
                    </SelectTrigger>
                    <SelectContent>
                      {CAMPAIGN_GST_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError>{errors.gstOption}</FieldError>
                </div>
              )}
              <div className="space-y-2">
                <Label>Gross Amount</Label>
                <div className="h-9 rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium">
                  {formatCurrency(grossAmount)}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Net Amount</Label>
                <div className="h-9 rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium">
                  {formatCurrency(netAmount)}
                </div>
              </div>
            </div>
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
                return (
                  <div
                    key={vendorId}
                    className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-3 p-3 items-center"
                  >
                    <p className="font-medium">{vendor.name}</p>
                    <Input
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="Cost"
                      value={vendorCosts[vendorId] || ""}
                      onChange={(event) =>
                        updateVendorCost(vendorId, event.target.value)
                      }
                    />
                  </div>
                );
              })}
            </div>
          )}
          <FieldError>{errors.vendorCosts}</FieldError>

          <div
            className={cn(
              "rounded-lg border p-3 text-sm space-y-1 flex justify-between",
              totalMatches
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700",
            )}
          >
            <p>
              Vendor cost total: {formatCurrency(vendorCostTotal)} / Total cost:{" "}
              {formatCurrency(totalCost)}
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

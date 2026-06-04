import React, { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "../../../components/ui/button";
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
import { cn } from "../../../lib/utils";
import { FieldError } from "./CampaignShared";
import { formatCurrency } from "../utils/campaignFormatters";

const initialForm = {
  name: "",
  startDate: "",
  endDate: "",
  budget: "",
  totalCost: "",
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

  useEffect(() => {
    if (!open) return;
    if (campaign) {
      setForm({
        name: campaign.name || "",
        startDate: campaign.startDate || "",
        endDate: campaign.endDate || "",
        budget: campaign.budget || "",
        totalCost: campaign.totalCost || "",
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
  const totalCost = Number(form.totalCost || 0);
  const totalMatches = totalCost > 0 && vendorCostTotal === totalCost;

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
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
    if (Number(form.budget) <= 0) nextErrors.budget = "Budget must be > 0";
    if (Number(form.totalCost) <= 0)
      nextErrors.totalCost = "Total cost must be > 0";
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
      vendors: selectedVendorIds.map((vendorId) => ({
        vendorId,
        cost: Number(vendorCosts[vendorId]),
      })),
    });
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
              type="number"
              value={form.budget}
              onChange={(event) => updateForm("budget", event.target.value)}
            />
            <FieldError>{errors.budget}</FieldError>
          </div>
          <div className="space-y-2">
            <Label>Start Date *</Label>
            <Input
              type="date"
              value={form.startDate}
              onChange={(event) => updateForm("startDate", event.target.value)}
            />
            <FieldError>{errors.startDate}</FieldError>
          </div>
          <div className="space-y-2">
            <Label>End Date *</Label>
            <Input
              type="date"
              value={form.endDate}
              onChange={(event) => updateForm("endDate", event.target.value)}
            />
            <FieldError>{errors.endDate}</FieldError>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Total Cost (₹) *</Label>
            <Input
              type="number"
              value={form.totalCost}
              onChange={(event) => updateForm("totalCost", event.target.value)}
            />
            <FieldError>{errors.totalCost}</FieldError>
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
                      type="number"
                      placeholder="Cost"
                      value={vendorCosts[vendorId] || ""}
                      onChange={(event) => {
                        setVendorCosts((prev) => ({
                          ...prev,
                          [vendorId]: event.target.value,
                        }));
                        setErrors((prev) => ({
                          ...prev,
                          vendorCosts: "",
                          vendorTotal: "",
                        }));
                      }}
                    />
                  </div>
                );
              })}
            </div>
          )}
          <FieldError>{errors.vendorCosts}</FieldError>

          <div
            className={cn(
              "rounded-lg border p-3 text-sm",
              totalMatches
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700",
            )}
          >
            Vendor cost total: {formatCurrency(vendorCostTotal)} / Total cost:{" "}
            {formatCurrency(totalCost)}
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

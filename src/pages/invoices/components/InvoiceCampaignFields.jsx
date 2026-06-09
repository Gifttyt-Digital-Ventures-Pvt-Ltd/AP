import React, { useMemo, useRef, useState } from "react";
import { ChevronsUpDown, X } from "lucide-react";
import { useGetVendorCampaignsQuery } from "../../../Services/apis/campaignsApi";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "../../../components/ui/popover";
import { cn } from "../../../lib/utils";

const EMPTY_CAMPAIGN = {
  campaignId: "",
  campaignName: "",
  referenceNumber: "",
  campaignReferenceNumber: "",
};

const isCampaignEmpty = (formData = {}) =>
  !formData.campaignId &&
  !formData.campaignName &&
  !formData.referenceNumber &&
  !formData.campaignReferenceNumber;

const applyCampaignSelection = (setFormData, campaign) => {
  if (!campaign) {
    setFormData((prev) => ({
      ...prev,
      ...EMPTY_CAMPAIGN,
    }));
    return;
  }

  setFormData((prev) => ({
    ...prev,
    campaignId: campaign.id || "",
    campaignName: campaign.name || "",
    referenceNumber: campaign.referenceCode || "",
    campaignReferenceNumber: campaign.referenceCode || "",
  }));
};

const CampaignSearchSelect = ({
  label,
  value,
  placeholder,
  options,
  onInputChange,
  onSelect,
  disabled = false,
  testId,
  emptyMessage = "No matching campaigns",
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const anchorRef = useRef(null);

  const filteredOptions = useMemo(() => {
    const search = String(query || "")
      .toLowerCase()
      .trim();
    if (!search) return options;
    return options.filter((option) =>
      String(option.label || "")
        .toLowerCase()
        .includes(search),
    );
  }, [options, query, value]);

  const handleInputChange = (nextValue) => {
    setQuery(nextValue);
    onInputChange(nextValue);
    setOpen(true);
  };

  const handleSelect = (option) => {
    onSelect(option.campaign);
    setQuery("");
    setOpen(false);
  };

  const handleClear = () => {
    setQuery("");
    onSelect(null);
    setOpen(false);
  };

  return (
    <div>
      <Label className="text-xs font-medium text-gray-700">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <div className="relative" ref={anchorRef}>
            <Input
              value={value}
              onChange={(event) => handleInputChange(event.target.value)}
              onFocus={() => {
                setQuery("");
                setOpen(true);
              }}
              placeholder={placeholder}
              className="pr-16 h-8 text-sm"
              disabled={disabled}
              autoComplete="off"
              data-testid={testId}
            />
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
              {value && !disabled && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-gray-400 hover:text-gray-600 p-1"
                  aria-label={`Clear ${label}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setOpen(true);
                }}
                className="text-gray-400 hover:text-gray-600 p-1"
                aria-label={`Show ${label} list`}
                disabled={disabled}
              >
                <ChevronsUpDown className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </PopoverAnchor>
        <PopoverContent
          className="z-[120] min-w-[260px] overflow-y-auto w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
          onOpenAutoFocus={(event) => event.preventDefault()}
          onInteractOutside={(event) => {
            if (anchorRef.current?.contains(event.target)) {
              event.preventDefault();
            }
          }}
        >
          <div
            className="max-h-56 overflow-y-auto overscroll-contain py-1"
            onWheel={(event) => {
              event.currentTarget.scrollTop += event.deltaY;
              event.stopPropagation();
            }}
          >
            {filteredOptions.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                {options.length === 0 ? "No approved campaigns" : emptyMessage}
              </p>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent",
                    value === option.label && "bg-accent",
                  )}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleSelect(option)}
                >
                  <span className="truncate">{option.label}</span>
                </button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

const InvoiceCampaignFields = ({
  formData,
  setFormData,
  showCampaignField = false,
  lockedCampaign = false,
  lockedCampaignPrefill = null,
}) => {
  const vendorId = String(formData?.vendorId || "").trim();
  const lockedPrefill = lockedCampaign ? lockedCampaignPrefill : null;

  const {
    data: campaigns = [],
    isFetching,
    isError,
  } = useGetVendorCampaignsQuery(vendorId, {
    skip: !showCampaignField || !vendorId || lockedCampaign,
  });

  const campaignNameOptions = useMemo(
    () =>
      campaigns.map((campaign) => ({
        key: `name-${campaign.id}`,
        label: campaign.name || "",
        campaign,
      })),
    [campaigns],
  );

  const referenceOptions = useMemo(
    () =>
      campaigns
        .filter((campaign) => String(campaign.referenceCode || "").trim())
        .map((campaign) => ({
          key: `ref-${campaign.id}`,
          label: campaign.referenceCode || "",
          campaign,
        })),
    [campaigns],
  );

  if (!showCampaignField) return null;

  const clearCampaign = () => {
    setFormData((prev) =>
      isCampaignEmpty(prev)
        ? prev
        : {
            ...prev,
            ...EMPTY_CAMPAIGN,
          },
    );
  };

  const displayCampaignId = formData.campaignId || lockedPrefill?.campaignId || "";
  const displayCampaignName =
    formData.campaignName || lockedPrefill?.campaignName || "";
  const displayReferenceNumber =
    formData.referenceNumber || lockedPrefill?.referenceNumber || "";

  const handleCampaignNameInput = (nextName) => {
    const selected = campaigns.find((campaign) => campaign.id === displayCampaignId);
    if (selected?.name === nextName) return;

    setFormData((prev) => ({
      ...prev,
      campaignId: "",
      campaignName: nextName,
      referenceNumber: "",
      campaignReferenceNumber: "",
    }));
  };

  const handleReferenceInput = (nextReference) => {
    const selected = campaigns.find((campaign) => campaign.id === displayCampaignId);
    if (selected?.referenceCode === nextReference) return;

    setFormData((prev) => ({
      ...prev,
      campaignId: "",
      campaignName: "",
      referenceNumber: nextReference,
      campaignReferenceNumber: nextReference,
    }));
  };

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-800">
          Campaign{" "}
          {lockedCampaign ? (
            <span className="font-normal text-muted-foreground">(from campaign)</span>
          ) : (
            <span className="font-normal text-muted-foreground">(optional)</span>
          )}
        </h3>
        {!lockedCampaign && displayCampaignId && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={clearCampaign}
          >
            Clear
          </Button>
        )}
      </div>
      {lockedCampaign && lockedPrefill?.campaignId ? (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs font-medium text-gray-700">Campaign Name</Label>
            <Input
              value={displayCampaignName}
              readOnly
              className="h-8 text-sm bg-muted/50"
              data-testid="invoice-campaign-name-locked"
            />
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-700">Reference Number</Label>
            <Input
              value={displayReferenceNumber}
              readOnly
              className="h-8 text-sm bg-muted/50"
              data-testid="invoice-campaign-reference-locked"
            />
          </div>
        </div>
      ) : !vendorId && !displayCampaignName ? (
        <p className="text-xs text-muted-foreground">
          Select a vendor to load approved campaigns.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <CampaignSearchSelect
            label="Campaign Name"
            value={displayCampaignName}
            placeholder={
              isFetching
                ? "Loading campaigns..."
                : campaigns.length === 0
                  ? "No approved campaigns (optional)"
                  : "Search or select campaign (optional)"
            }
            options={campaignNameOptions}
            onInputChange={handleCampaignNameInput}
            onSelect={(campaign) => applyCampaignSelection(setFormData, campaign)}
            disabled={isFetching}
            testId="invoice-campaign-select"
            emptyMessage="No matching campaign names"
          />
          <CampaignSearchSelect
            label="UAC/Reference No./Coupon Code"
            value={displayReferenceNumber}
            placeholder={
              isFetching
                ? "Loading campaigns..."
                : referenceOptions.length === 0
                  ? "No campaign references (optional)"
                  : "Search or select reference (optional)"
            }
            options={referenceOptions}
            onInputChange={handleReferenceInput}
            onSelect={(campaign) => applyCampaignSelection(setFormData, campaign)}
            disabled={isFetching}
            testId="invoice-campaign-reference"
            emptyMessage="No matching reference numbers"
          />
          {isError && (
            <p className="col-span-2 text-xs text-red-600">Failed to load campaigns.</p>
          )}
          {!isFetching && !isError && campaigns.length === 0 && (
            <p className="col-span-2 text-xs text-muted-foreground">
              No approved campaigns for this vendor.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default InvoiceCampaignFields;

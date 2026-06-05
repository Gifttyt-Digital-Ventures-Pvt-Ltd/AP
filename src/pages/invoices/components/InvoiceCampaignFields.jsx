import React from "react";
import { useGetVendorCampaignsQuery } from "../../../Services/apis/campaignsApi";
import AppSelect from "../../../components/common/AppSelect";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";

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

  if (!showCampaignField) return null;

  const handleCampaignChange = (campaignId) => {
    if (!campaignId) {
      setFormData((prev) => ({
        ...prev,
        ...EMPTY_CAMPAIGN,
      }));
      return;
    }
    const selected = campaigns.find((campaign) => campaign.id === campaignId);
    setFormData((prev) => ({
      ...prev,
      campaignId: selected?.id || "",
      campaignName: selected?.name || "",
      referenceNumber: selected?.referenceCode || "",
      campaignReferenceNumber: selected?.referenceCode || "",
    }));
  };

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
          <div>
            <Label className="text-xs font-medium text-gray-700">Campaign Name</Label>
            <AppSelect
              value={displayCampaignId}
              onChange={(event) => handleCampaignChange(event.target.value)}
              className="h-8 text-sm"
              placeholder={
                isFetching
                  ? "Loading campaigns..."
                  : campaigns.length === 0
                    ? "No approved campaigns (optional)"
                    : "Select campaign (optional)"
              }
              disabled={isFetching}
              options={campaigns.map((campaign) => ({
                value: campaign.id,
                label: campaign.name,
              }))}
              data-testid="invoice-campaign-select"
            />
            {isError && (
              <p className="mt-1 text-xs text-red-600">Failed to load campaigns.</p>
            )}
            {!isFetching && !isError && campaigns.length === 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                No approved campaigns for this vendor.
              </p>
            )}
          </div>
          <div>
            <Label className="text-xs font-medium text-gray-700">Reference Number</Label>
            <Input
              value={displayReferenceNumber}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  referenceNumber: event.target.value,
                }))
              }
              placeholder="Campaign reference"
              className="h-8 text-sm"
              data-testid="invoice-campaign-reference"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceCampaignFields;

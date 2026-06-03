import React, { useEffect, useRef } from "react";
import { useGetVendorCampaignsQuery } from "../../../Services/apis/campaignsApi";
import AppSelect from "../../../components/common/AppSelect";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";

const EMPTY_CAMPAIGN = {
  campaignId: "",
  campaignName: "",
  referenceNumber: "",
};

const InvoiceCampaignFields = ({
  formData,
  setFormData,
  showCampaignField = false,
  lockedCampaign = false,
  lockedCampaignPrefill = null,
}) => {
  const vendorId = String(formData?.vendorId || "").trim();
  const previousVendorIdRef = useRef(vendorId);
  const lockedPrefill = lockedCampaign ? lockedCampaignPrefill : null;

  const {
    data: campaigns = [],
    isFetching,
    isError,
  } = useGetVendorCampaignsQuery(vendorId, {
    skip: !showCampaignField || !vendorId || lockedCampaign,
  });

  useEffect(() => {
    if (!showCampaignField || lockedCampaign) return;
    const previous = previousVendorIdRef.current;
    previousVendorIdRef.current = vendorId;
    if (previous && previous !== vendorId) {
      setFormData((prev) => ({
        ...prev,
        ...EMPTY_CAMPAIGN,
      }));
    }
  }, [vendorId, showCampaignField, lockedCampaign, setFormData]);

  useEffect(() => {
    if (!showCampaignField || !lockedCampaign || !lockedPrefill?.campaignId) return;
    setFormData((prev) => ({
      ...prev,
      campaignId: lockedPrefill.campaignId || prev.campaignId,
      campaignName: lockedPrefill.campaignName || prev.campaignName,
      referenceNumber: lockedPrefill.referenceNumber || prev.referenceNumber,
    }));
  }, [
    showCampaignField,
    lockedCampaign,
    lockedPrefill?.campaignId,
    lockedPrefill?.campaignName,
    lockedPrefill?.referenceNumber,
    setFormData,
  ]);

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
    }));
  };

  const displayCampaignId = formData.campaignId || lockedPrefill?.campaignId || "";
  const displayCampaignName =
    formData.campaignName || lockedPrefill?.campaignName || "";
  const displayReferenceNumber =
    formData.referenceNumber || lockedPrefill?.referenceNumber || "";

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
      <h3 className="text-sm font-semibold text-gray-800">
        Campaign{" "}
        {lockedCampaign ? (
          <span className="font-normal text-muted-foreground">(from campaign)</span>
        ) : (
          <span className="font-normal text-muted-foreground">(optional)</span>
        )}
      </h3>
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
      ) : !vendorId ? (
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

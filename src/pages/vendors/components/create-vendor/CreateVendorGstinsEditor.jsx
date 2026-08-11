import React from "react";
import { X } from "lucide-react";
import AppSelect from "../../../../components/common/AppSelect";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { getRegistrationKey } from "../../utils/vendorGstRegistrations";

const REGISTRATION_TYPE_OPTIONS = [
  { value: "Regular", label: "Regular" },
  { value: "Composition", label: "Composition" },
  { value: "Unregistered", label: "Unregistered" },
  { value: "ISD", label: "Input Service Distributor (ISD)" },
];

const YES_NO_OPTIONS = [
  { value: "Yes", label: "Yes" },
  { value: "No", label: "No" },
];

const CreateVendorGstinsEditor = ({
  registrations,
  onUpdate,
  onRemove,
  portalFetchEnabled = false,
  gstinRequired = false,
}) => {
  if (!registrations.length) {
    return (
      <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        {portalFetchEnabled
          ? "No GSTINs added yet. Use Fetch Details above or add a GSTIN block manually."
          : "No GSTINs added yet. Add a GSTIN block manually."}
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-start gap-6">
      {registrations.map((registration) => {
        const registrationKey = getRegistrationKey(registration);
        const isFetchedRegistration = Boolean(registration._fromFetch && registration.gstin);

        const updateRegistrationField = (field, value) => {
          onUpdate(registrationKey, { [field]: value });
        };

        return (
          <div
            key={registrationKey}
            className="w-full rounded-lg border border-border bg-muted/20 p-4"
          >
            <div className="flex w-full flex-col items-start gap-6">
              <div className="flex w-full items-start gap-4">
                <div className="flex-1">
                  <Label>GSTIN{gstinRequired ? " *" : ""}</Label>
                  {isFetchedRegistration ? (
                    <div className="mt-1.5 flex h-9 items-center rounded-md border border-input bg-transparent px-3 text-sm shadow-sm">
                      <span className="font-mono font-medium text-foreground">
                        {registration.gstin}
                      </span>
                    </div>
                  ) : (
                    <Input
                      value={registration.gstin || ""}
                      onChange={(event) =>
                        updateRegistrationField("gstin", event.target.value.toUpperCase())
                      }
                      placeholder="e.g., 27ABCDE1234F1Z5"
                      className="mt-1.5 font-mono uppercase"
                      maxLength={15}
                      required={gstinRequired}
                    />
                  )}
                </div>
                <div className="flex-1">
                  <Label>GST Registration Type</Label>
                  <AppSelect
                    value={registration.registrationType || ""}
                    onChange={(event) =>
                      updateRegistrationField("registrationType", event.target.value)
                    }
                    options={REGISTRATION_TYPE_OPTIONS}
                    placeholder="Select registration type"
                    className="mt-1.5"
                  />
                </div>
                <div className="flex-1">
                  <Label>HSN/SAC Default Code</Label>
                  <Input
                    value={registration.hsnSacDefaultCode || ""}
                    onChange={(event) =>
                      updateRegistrationField("hsnSacDefaultCode", event.target.value)
                    }
                    placeholder="e.g., 9983"
                    className="mt-1.5"
                  />
                </div>
              </div>

              <div className="flex w-full items-start gap-4">
                <div className="flex-1">
                  <Label>State</Label>
                  <Input
                    value={registration.location?.state || registration.state || ""}
                    onChange={(event) => updateRegistrationField("state", event.target.value)}
                    placeholder="e.g., Maharashtra"
                    className="mt-1.5"
                  />
                </div>
                <div className="flex-1">
                  <Label>Reverse Charge Applicable</Label>
                  <AppSelect
                    value={registration.reverseChargeApplicable ? "Yes" : "No"}
                    onChange={(event) =>
                      updateRegistrationField(
                        "reverseChargeApplicable",
                        event.target.value === "Yes",
                      )
                    }
                    options={YES_NO_OPTIONS}
                    className="mt-1.5"
                  />
                </div>
                <div className="flex-1">
                  <Label>e-Invoicing Applicable</Label>
                  <AppSelect
                    value={registration.eInvoicingApplicable ? "Yes" : "No"}
                    onChange={(event) =>
                      updateRegistrationField(
                        "eInvoicingApplicable",
                        event.target.value === "Yes",
                      )
                    }
                    options={YES_NO_OPTIONS}
                    className="mt-1.5"
                  />
                </div>
              </div>

              <div className="flex w-full justify-end">
                <button
                  type="button"
                  onClick={() => onRemove(registrationKey)}
                  className="flex items-center gap-1 text-xs font-medium text-destructive"
                >
                  <X className="h-4 w-4" />
                  Remove
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CreateVendorGstinsEditor;

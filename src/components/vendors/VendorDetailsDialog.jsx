import React, { useCallback, useEffect, useState } from "react";
import { Building2, CheckCircle2, Loader2, MapPin, Plus, Trash2, User } from "lucide-react";
import { useGetAvailableCurrenciesQuery } from "../../Services/apis/corporateApi";
import { useRBAC } from "../../contexts/RBACContext";
import { CURRENCY_SCREENS, FALLBACK_CURRENCIES } from "../../utils/currency";
import {
  getVendorFieldDisplayName,
  isVendorFieldRequired,
  VENDOR_FIELD_SECTIONS,
} from "../../utils/vendorFieldConfig";
import {
  isIndiaCountry,
  getVendorGstVerificationErrors,
  isVendorGstVerificationSatisfied,
  getVendorGstinFormatError,
  isVendorFetchReady,
} from "../../utils/vendorValidation";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { useVendorGstDetailsFetch } from "../../pages/vendors/hooks/useVendorGstDetailsFetch";
import VendorDocumentsPanel from "../../pages/vendors/components/VendorDocumentsPanel";
import VendorTdsPanel from "../../pages/vendors/components/VendorTdsPanel";
import { createEmptyVendorDocuments } from "../../pages/vendors/utils/vendorDocuments";
import {
  getVisibleVendorDocumentTypes,
  hasVisibleVendorDocuments,
} from "../../utils/vendorDocumentConfig";
import {
  isVendorPortalFetchEnabled,
} from "../../utils/vendorVerificationConfig";
import { getVendorTdsValidationErrors } from "../../pages/vendors/utils/vendorTds";

const CATEGORY_OPTIONS = [
  "IT Services",
  "Office Supplies",
  "Consulting",
  "Marketing",
  "Legal",
  "Maintenance",
  "Utilities",
  "Others",
];

const FormSection = ({ title, description, children, className }) => (
  <section className={className}>
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description ? (
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      ) : null}
    </div>
    {children}
  </section>
);

const buildGstRegistrationFromVerification = (data) => {
  const gstin = String(data?.gstin || "").trim().toUpperCase();
  if (!gstin) return null;

  return {
    gstin,
    state: data.state || "",
    stateCode: data.stateCode || "",
    businessNature: data.businessNature || "",
    location: data.location ?? null,
    bankDetails: data.bankDetails ?? data.bank_details ?? {},
    address: formatRegistrationLocation(data),
  };
};

const getRegistrationValue = (registration, ...keys) => {
  for (const key of keys) {
    const value = registration?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return "";
};

const formatRegistrationLocation = (registration = {}) => {
  const location = registration.location ?? registration.addressDetails ?? registration.address_details;
  if (location && typeof location === "object") {
    return [
      location.addressLine1 ?? location.address_line1,
      location.addressLine2 ?? location.address_line2,
      location.city,
      location.state,
      location.pincode ?? location.postalCode ?? location.postal_code,
      location.country,
    ]
      .filter(Boolean)
      .join(", ");
  }

  return getRegistrationValue(registration, "address", "principalAddress", "principal_address");
};

const normalizeFormGstRegistrations = (registrations = []) =>
  (Array.isArray(registrations) ? registrations : [])
    .map((registration) => ({
      ...registration,
      gstin: String(getRegistrationValue(registration, "gstin", "gstIn", "gst")).trim().toUpperCase(),
      state: getRegistrationValue(registration, "state", "stateName", "state_name"),
      stateCode: getRegistrationValue(registration, "stateCode", "state_code"),
      address: formatRegistrationLocation(registration),
      location: registration.location ?? registration.addressDetails ?? registration.address_details ?? null,
      bankDetails: registration.bankDetails ?? registration.bank_details ?? {},
      _clientId:
        registration._clientId ||
        (getRegistrationValue(registration, "gstin", "gstIn", "gst")
          ? `reg-${String(getRegistrationValue(registration, "gstin", "gstIn", "gst")).trim().toUpperCase()}`
          : undefined),
      _fromFetch: registration._fromFetch === true,
    }))
    .filter((registration) => registration.gstin || registration._clientId);

const getRegistrationKey = (registration = {}) =>
  registration._clientId || String(registration.gstin || "").trim().toUpperCase();

const createEmptyGstRegistration = () => ({
  _clientId: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  gstin: "",
  state: "",
  location: { country: "India" },
  bankDetails: {},
});

const GstRegistrationsEditor = ({
  registrations,
  onUpdate,
  onRemove,
  portalFetchEnabled = false,
}) => {
  if (!registrations.length) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        {portalFetchEnabled
          ? "No GSTINs added yet. Use Fetch Details above or add a GSTIN block manually."
          : "No GSTINs added yet. Add a GSTIN block manually."}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {registrations.map((registration) => {
        const registrationKey = getRegistrationKey(registration);
        const isFetchedRegistration = Boolean(registration._fromFetch && registration.gstin);

        const updateRegistrationField = (field, value) => {
          onUpdate(registrationKey, { [field]: value });
        };

        const updateLocationField = (field, value) => {
          onUpdate(registrationKey, {
            location: {
              ...(registration.location || {}),
              [field]: value,
            },
          });
        };

        const updateBankField = (field, value) => {
          onUpdate(registrationKey, {
            bankDetails: {
              ...(registration.bankDetails || {}),
              [field]: value,
            },
          });
        };

        return (
          <div
            key={registrationKey}
            className="rounded-lg border border-border bg-background p-3"
          >
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  {isFetchedRegistration ? (
                    <>
                      <span className="font-mono text-sm font-semibold text-foreground">
                        {registration.gstin}
                      </span>
                      <p className="mt-1 text-xs text-muted-foreground">
                        GSTIN from fetch lookup.
                      </p>
                    </>
                  ) : (
                    <div>
                      <Label>GSTIN *</Label>
                      <Input
                        value={registration.gstin || ""}
                        onChange={(event) =>
                          updateRegistrationField("gstin", event.target.value.toUpperCase())
                        }
                        placeholder="e.g. 27ABCDE1234F1Z5"
                        className="mt-1.5 font-mono uppercase"
                        maxLength={15}
                      />
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-destructive hover:text-destructive"
                  onClick={() => onRemove(registrationKey)}
                  title="Remove GST registration"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  <Label className="text-sm">Registration Location</Label>
                </div>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Input
                      value={registration.location?.addressLine1 || ""}
                      onChange={(event) => updateLocationField("addressLine1", event.target.value)}
                      placeholder="Address line 1"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Input
                      value={registration.location?.addressLine2 || ""}
                      onChange={(event) => updateLocationField("addressLine2", event.target.value)}
                      placeholder="Address line 2"
                    />
                  </div>
                  <Input
                    value={registration.location?.city || ""}
                    onChange={(event) => updateLocationField("city", event.target.value)}
                    placeholder="City"
                  />
                  <Input
                    value={registration.location?.state || registration.state || ""}
                    onChange={(event) => {
                      updateRegistrationField("state", event.target.value);
                      updateLocationField("state", event.target.value);
                    }}
                    placeholder="State"
                  />
                  <Input
                    value={registration.location?.pincode || ""}
                    onChange={(event) => updateLocationField("pincode", event.target.value)}
                    placeholder="Pincode"
                  />
                  <Input
                    value={registration.location?.country || "India"}
                    onChange={(event) => updateLocationField("country", event.target.value)}
                    placeholder="Country"
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm">Bank Details</Label>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Input
                      value={registration.bankDetails?.accountHolderName || ""}
                      onChange={(event) => updateBankField("accountHolderName", event.target.value)}
                      placeholder="Account holder name"
                    />
                  </div>
                  <Input
                    value={registration.bankDetails?.accountNumber || ""}
                    onChange={(event) => updateBankField("accountNumber", event.target.value)}
                    placeholder="Account number"
                  />
                  <Input
                    value={registration.bankDetails?.ifscCode || ""}
                    onChange={(event) => updateBankField("ifscCode", event.target.value.toUpperCase())}
                    placeholder="IFSC code"
                    className="uppercase"
                  />
                  <Input
                    value={registration.bankDetails?.bankName || ""}
                    onChange={(event) => updateBankField("bankName", event.target.value)}
                    placeholder="Bank name"
                  />
                  <Input
                    value={registration.bankDetails?.branch || ""}
                    onChange={(event) => updateBankField("branch", event.target.value)}
                    placeholder="Branch"
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const mapFetchedRegistrationToVerification = (registration = {}) => ({
  gstin: registration.gstin,
  pan: registration.pan || "",
  state: registration.state || "",
  stateCode: registration.stateCode || "",
  businessNature: registration.businessNature || "",
  location: registration.location ?? null,
  bankDetails: registration.bankDetails ?? {},
  address: registration.address || "",
  legalName: registration.legalName || registration.tradeName || "",
  validGstin: true,
});

const FetchVendorResultsPreview = ({
  fetchMode,
  records,
  selectedGstins,
  onToggleGstin,
  onSelectAll,
  onSelectNone,
  onApply,
}) => {
  if (!records.length) return null;

  const firstRecord = records[0];
  const isPanMode = fetchMode === "pan";
  const selectedCount = selectedGstins.size;

  return (
    <div className="space-y-3 rounded-lg border border-border bg-background p-3">
      <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        <div className="font-semibold">{firstRecord.legalName || firstRecord.tradeName}</div>
        <div className="mt-0.5 text-xs">
          PAN: <span className="font-mono font-medium">{firstRecord.pan || "—"}</span>
          {" · "}
          {records.length} GSTIN{records.length !== 1 ? "s" : ""} found
        </div>
      </div>

      {isPanMode ? (
        <div className="overflow-hidden rounded-md border border-border">
          <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2">
            <span className="text-xs font-semibold text-foreground">
              GSTINs Found ({records.length})
            </span>
            <div className="flex gap-2">
              <button type="button" className="text-xs font-medium text-primary" onClick={onSelectAll}>
                All
              </button>
              <button type="button" className="text-xs text-muted-foreground" onClick={onSelectNone}>
                None
              </button>
            </div>
          </div>
            {records.map((record) => {
            const checked = selectedGstins.has(record.gstin);
            return (
              <div
                key={record.gstin}
                role="button"
                tabIndex={0}
                onClick={() => onToggleGstin(record.gstin)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onToggleGstin(record.gstin);
                  }
                }}
                className={`flex w-full cursor-pointer items-center gap-3 border-b border-border px-3 py-2 text-left last:border-b-0 ${
                  checked ? "bg-primary/5" : "bg-background hover:bg-muted/30"
                }`}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => onToggleGstin(record.gstin)}
                  onClick={(event) => event.stopPropagation()}
                />
                <span className="min-w-[150px] font-mono text-xs font-semibold text-primary">
                  {record.gstin}
                </span>
                <span className="flex-1 text-sm text-foreground">{record.state || "—"}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-border text-sm">
          {[
            ["State", firstRecord.state],
            ["Address", firstRecord.address || formatRegistrationLocation(firstRecord)],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex gap-3 border-b border-border px-3 py-2 last:border-b-0"
            >
              <span className="min-w-24 text-xs font-semibold text-muted-foreground">{label}</span>
              <span className="text-foreground">{value || "—"}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          disabled={selectedCount === 0}
          onClick={onApply}
        >
          <CheckCircle2 className="mr-2 h-4 w-4" />
          {isPanMode
            ? `Add ${selectedCount} Selected GSTIN${selectedCount !== 1 ? "s" : ""}`
            : "Add GSTIN"}
        </Button>
      </div>
    </div>
  );
};

const VendorDetailsDialog = ({
  open,
  onOpenChange,
  formData,
  setFormData,
  onSubmit,
  title = "Create Vendor",
  description = "Add contact details and payment info of your vendor in OptiFii",
  submitLabel = "Save Vendor",
  submitting = false,
  activeVendorFields: activeVendorFieldsProp,
  vendorFieldConfiguration: vendorFieldConfigurationProp,
  /** Invoice upload vendor request: only name + type are mandatory */
  invoiceVendorRequest = false,
  testId = "vendor-dialog",
}) => {
  const { corporateScreens } = useRBAC();
  const activeVendorFields =
    activeVendorFieldsProp ?? corporateScreens?.activeVendorFields ?? [];
  const vendorFieldConfiguration =
    vendorFieldConfigurationProp ?? corporateScreens?.vendorFieldConfiguration ?? [];
  const activeVendorDocuments = corporateScreens?.activeVendorDocuments;
  const vendorDocumentConfiguration = corporateScreens?.vendorDocumentConfiguration ?? [];
  const visibleVendorDocumentTypes = getVisibleVendorDocumentTypes(
    activeVendorDocuments,
    vendorDocumentConfiguration,
  );
  const showVendorDocumentsSection =
    !invoiceVendorRequest &&
    hasVisibleVendorDocuments(activeVendorDocuments, vendorDocumentConfiguration);
  const activeVendorVerification = corporateScreens?.activeVendorVerification;
  const portalVerificationEnabled = isVendorPortalFetchEnabled(activeVendorVerification);
  const gstVerificationEnabled = portalVerificationEnabled;
  const showPortalFetch =
    !invoiceVendorRequest && portalVerificationEnabled;

  const { data: availableCurrencies = [] } = useGetAvailableCurrenciesQuery(
    CURRENCY_SCREENS.INVOICE,
    { skip: invoiceVendorRequest },
  );

  const applyGstVerification = useCallback((data) => {
    if (!data) return;
    const registration = buildGstRegistrationFromVerification(data);
    setFormData((prev) => ({
      ...prev,
      pan: data.pan || prev.pan,
      state: data.state || prev.state,
      country: prev.country || "India",
      name: data.legalName || prev.name,
      gstin: registration?.gstin || prev.gstin,
      gstRegistrations: registration
        ? [
            {
              ...registration,
              _clientId: `reg-${registration.gstin}`,
              _fromFetch: true,
            },
            ...(
              normalizeFormGstRegistrations(prev.gstRegistrations).filter(
                    (item) =>
                      String(item?.gstin || "").trim().toUpperCase() !== registration.gstin,
                  )
            ),
          ]
        : prev.gstRegistrations,
    }));
  }, [setFormData]);

  const [gstVerification, setGstVerification] = useState({
    verified: false,
    gstin: "",
    validGstin: null,
  });
  const [gstVerificationAttempted, setGstVerificationAttempted] = useState(false);
  const [fetchGstinQuery, setFetchGstinQuery] = useState("");
  const [lastFetchMode, setLastFetchMode] = useState("gstin");
  const [fetchMessage, setFetchMessage] = useState("");
  const [fetchMessageIsError, setFetchMessageIsError] = useState(false);
  const [fetchedRecords, setFetchedRecords] = useState([]);
  const [selectedFetchedGstins, setSelectedFetchedGstins] = useState(() => new Set());

  const { fetchVendorDetails, isLoading: isFetchLoading } = useVendorGstDetailsFetch();

  const clearFetchResults = () => {
    setFetchedRecords([]);
    setSelectedFetchedGstins(new Set());
    setFetchMessage("");
    setFetchMessageIsError(false);
  };

  useEffect(() => {
    if (!open) {
      setGstVerification({ verified: false, gstin: "", validGstin: null });
      setGstVerificationAttempted(false);
      setFetchGstinQuery("");
      setLastFetchMode("gstin");
      setFetchMessage("");
      setFetchMessageIsError(false);
      setFetchedRecords([]);
      setSelectedFetchedGstins(new Set());
    }
  }, [open]);

  useEffect(() => {
    if (!showPortalFetch) {
      clearFetchResults();
      setFetchGstinQuery("");
    }
  }, [showPortalFetch]);

  useEffect(() => {
    if (!open || !formData?.gstin) return;

    const normalized = String(formData.gstin || "").trim().toUpperCase();
    const existingRegistration = normalizeFormGstRegistrations(formData.gstRegistrations).find(
      (registration) => registration.gstin === normalized,
    );

    if (!existingRegistration) return;

    setGstVerification((prev) => {
      if (prev.verified && prev.gstin === normalized) return prev;
      return {
        verified: true,
        gstin: normalized,
        validGstin: true,
      };
    });
  }, [open, formData?.gstin, formData?.gstRegistrations]);

  const handleGstVerificationChange = useCallback((next) => {
    setGstVerification((prev) => {
      if (
        prev.verified === next.verified
        && prev.gstin === next.gstin
        && prev.validGstin === next.validGstin
      ) {
        return prev;
      }
      return next;
    });
    if (next.verified) setGstVerificationAttempted(false);
  }, []);

  const handleFormSubmit = (event) => {
    event.preventDefault();
    if (!formData) return;

    const gstErrors = getVendorGstVerificationErrors(formData, gstVerification, {
      invoiceVendorRequest,
      gstVerificationEnabled,
    });
    if (gstErrors.length > 0) {
      setGstVerificationAttempted(true);
      toast.error(gstErrors[0]);
      return;
    }

    const incompleteRegistrations = normalizeFormGstRegistrations(formData.gstRegistrations).filter(
      (registration) => {
        const gstin = String(registration.gstin || "").trim().toUpperCase();
        if (!gstin) return false;
        return Boolean(getVendorGstinFormatError(gstin, { required: true }));
      },
    );
    if (incompleteRegistrations.length > 0) {
      toast.error(getVendorGstinFormatError(incompleteRegistrations[0].gstin) || "Invalid GSTIN in a registration block.");
      return;
    }

    const tdsErrors = getVendorTdsValidationErrors(formData.tdsMapping ?? null);
    if (tdsErrors.length > 0) {
      toast.error(tdsErrors[0]);
      return;
    }

    onSubmit(event);
  };

  if (!formData) return null;

  const isRequired = (sectionId) =>
    !invoiceVendorRequest && isVendorFieldRequired(sectionId, activeVendorFields);

  const labelFor = (sectionId, fallback = "") =>
    getVendorFieldDisplayName(sectionId, vendorFieldConfiguration) || fallback;

  const isIndia = isIndiaCountry(formData.country);
  const gstVerificationSatisfied = isVendorGstVerificationSatisfied(
    formData,
    gstVerification,
    { invoiceVendorRequest, gstVerificationEnabled },
  );
  const currencyOptions =
    Array.isArray(availableCurrencies) && availableCurrencies.length > 0
      ? availableCurrencies.filter((currency) => currency !== "ALL")
      : FALLBACK_CURRENCIES;

  const updateField = (field, value) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const gstRegistrations = normalizeFormGstRegistrations(formData.gstRegistrations);

  const setFetchFeedback = (message, isError = false) => {
    setFetchMessage(message);
    setFetchMessageIsError(isError);
  };

  const clearFetchFeedback = () => {
    setFetchMessage("");
    setFetchMessageIsError(false);
  };

  const prefillVendorIdentityFromFetch = (records = []) => {
    const firstRecord = records[0];
    if (!firstRecord) return;

    setFormData((prev) => ({
      ...prev,
      name: firstRecord.legalName || firstRecord.tradeName || prev.name,
      vendor_type: firstRecord.vendorType || prev.vendor_type,
      pan: firstRecord.pan || prev.pan,
      email: firstRecord.email || prev.email,
      mobile: firstRecord.mobile || prev.mobile,
      contact_person: firstRecord.contactPerson || prev.contact_person,
      country: prev.country || "India",
    }));
  };

  const applySelectedFetchedRegistrations = () => {
    const selectedRecords = fetchedRecords.filter((record) =>
      selectedFetchedGstins.has(record.gstin),
    );
    if (!selectedRecords.length) {
      toast.error("Select at least one GST registration to add.");
      return;
    }

    const newRegistrations = selectedRecords
      .map((record) => {
        const registration = buildGstRegistrationFromVerification(
          mapFetchedRegistrationToVerification(record),
        );
        if (!registration?.gstin) return null;
        return {
          ...registration,
          _clientId: `reg-${registration.gstin}`,
          _fromFetch: true,
        };
      })
      .filter(Boolean);

    setFormData((prev) => {
      const existing = normalizeFormGstRegistrations(prev.gstRegistrations);
      const existingGstins = new Set(existing.map((registration) => registration.gstin));
      const toAdd = newRegistrations.filter((registration) => !existingGstins.has(registration.gstin));

      if (!toAdd.length) {
        toast.info("Selected GST registrations are already added.");
        return prev;
      }

      const merged = [...existing, ...toAdd];
      const primaryGstin = merged.find((registration) => registration.gstin)?.gstin || prev.gstin;

      return {
        ...prev,
        gstin: primaryGstin,
        gstRegistrations: merged,
      };
    });

    const existingGstins = new Set(gstRegistrations.map((registration) => registration.gstin));
    const addedCount = newRegistrations.filter((registration) => !existingGstins.has(registration.gstin)).length;
    if (!addedCount) return;

    if (newRegistrations.find((registration) => !existingGstins.has(registration.gstin))?.gstin) {
      const firstAdded = newRegistrations.find((registration) => !existingGstins.has(registration.gstin));
      setGstVerification({
        verified: true,
        gstin: firstAdded.gstin,
        validGstin: true,
      });
    }

    setFetchedRecords([]);
    setSelectedFetchedGstins(new Set());
    setFetchFeedback(
      `${addedCount} GST registration${addedCount !== 1 ? "s" : ""} added.`,
      false,
    );
  };

  const handleFetchDetails = async () => {
    if (!showPortalFetch || !gstVerificationEnabled) return;

    const result = await fetchVendorDetails({ gstin: fetchGstinQuery });

    if (!result.success) {
      setFetchedRecords([]);
      setSelectedFetchedGstins(new Set());
      setFetchFeedback(result.error || "Failed to fetch vendor details.", true);
      return;
    }

    prefillVendorIdentityFromFetch(result.records);
    setFetchedRecords(result.records);
    setSelectedFetchedGstins(new Set(result.records.map((record) => record.gstin)));
    setLastFetchMode(result.mode || "gstin");
    clearFetchFeedback();
  };

  const addManualGstRegistration = () => {
    setFormData((prev) => ({
      ...prev,
      gstRegistrations: [
        ...normalizeFormGstRegistrations(prev.gstRegistrations),
        createEmptyGstRegistration(),
      ],
    }));
  };

  const removeGstRegistration = (registrationKey) => {
    if (!registrationKey) return;

    setFormData((prev) => {
      const remaining = normalizeFormGstRegistrations(prev.gstRegistrations).filter(
        (registration) => getRegistrationKey(registration) !== registrationKey,
      );
      const nextGstin = remaining.find((registration) => registration.gstin)?.gstin ?? "";

      return {
        ...prev,
        gstin: nextGstin,
        gstRegistrations: remaining,
      };
    });

    const removed = gstRegistrations.find(
      (registration) => getRegistrationKey(registration) === registrationKey,
    );
    if (removed?.gstin && String(formData.gstin || "").trim().toUpperCase() === removed.gstin) {
      setGstVerification({ verified: false, gstin: "", validGstin: null });
    }
  };

  const updateGstRegistration = (registrationKey, patch) => {
    if (!registrationKey) return;

    setFormData((prev) => ({
      ...prev,
      gstRegistrations: normalizeFormGstRegistrations(prev.gstRegistrations).map((registration) => {
        if (getRegistrationKey(registration) !== registrationKey) return registration;
        const next = {
          ...registration,
          ...patch,
          location: patch.location
            ? {
                ...(registration.location || {}),
                ...patch.location,
              }
            : registration.location,
          bankDetails: patch.bankDetails
            ? {
                ...(registration.bankDetails || {}),
                ...patch.bankDetails,
              }
            : registration.bankDetails,
        };
        if (patch.gstin !== undefined) {
          next.gstin = String(patch.gstin || "").trim().toUpperCase();
        }
        return {
          ...next,
          address: formatRegistrationLocation(next),
        };
      }),
    }));
  };

  const basicInfoFields = [
    {
      key: "email",
      section: VENDOR_FIELD_SECTIONS.EMAIL_ID,
      type: "email",
      placeholder: "vendor@example.com",
      testId: "vendor-email-input",
    },
    {
      key: "mobile",
      section: VENDOR_FIELD_SECTIONS.MOBILE_NO,
      placeholder: "+91 98765 43210",
      testId: "vendor-mobile-input",
    },
    {
      key: "phone",
      section: VENDOR_FIELD_SECTIONS.PHONE_NO,
      placeholder: "+91 22 1234 5678",
      testId: "vendor-phone-input",
    },
    {
      key: "contact_person",
      section: VENDOR_FIELD_SECTIONS.CONTACT_PERSON,
      placeholder: "e.g., Rahul Sharma",
    },
    {
      key: "website",
      section: VENDOR_FIELD_SECTIONS.WEBSITE,
      placeholder: "https://example.com",
    },
  ];

  const renderInputField = ({
    key,
    section,
    placeholder,
    type = "text",
    transform,
    className = "",
    colSpan = "",
    maxLength,
    testId: fieldTestId,
  }) => {
    const required = isRequired(section);
    const label = labelFor(section);
    return (
      <div key={key} className={colSpan}>
        <Label>
          {label}
          {required ? " *" : ""}
        </Label>
        <Input
          type={type}
          value={formData[key] || ""}
          onChange={(event) =>
            updateField(
              key,
              transform ? transform(event.target.value) : event.target.value,
            )
          }
          placeholder={placeholder}
          required={required}
          className={className}
          maxLength={maxLength}
          data-testid={fieldTestId}
        />
      </div>
    );
  };

  const nameLabel =
    formData.vendor_type === "Company"
      ? labelFor(VENDOR_FIELD_SECTIONS.COMPANY_NAME, "Company Name")
      : "Full Name";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0"
        data-testid={testId}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/20">
          <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </DialogHeader>

        <form onSubmit={handleFormSubmit} className="px-6 py-6 space-y-8">
          <FormSection
            title="Vendor identity"
            description="Choose the vendor type and registered name."
          >
            <div className="grid gap-4">
              <div>
                <Label>
                  {labelFor(VENDOR_FIELD_SECTIONS.VENDOR_TYPE, "Vendor Type")}
                  {invoiceVendorRequest || isRequired(VENDOR_FIELD_SECTIONS.VENDOR_TYPE)
                    ? " *"
                    : ""}
                </Label>
                <div className="flex gap-3 mt-2">
                  {["Company", "Individual"].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          vendor_type: type,
                        }))
                      }
                      className={`flex-1 p-3 border rounded-lg flex items-center justify-center gap-2 transition-all ${
                        formData.vendor_type === type
                          ? "border-accent bg-accent/10 shadow-sm"
                          : "border-border hover:border-accent/50"
                      }`}
                    >
                      {type === "Company" ? (
                        <Building2 className="h-4 w-4" />
                      ) : (
                        <User className="h-4 w-4" />
                      )}
                      <span className="text-sm font-medium">{type}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label>
                  {nameLabel}
                  {invoiceVendorRequest || isRequired(VENDOR_FIELD_SECTIONS.COMPANY_NAME)
                    ? " *"
                    : ""}
                </Label>
                <Input
                  value={formData.name}
                  onChange={(event) => updateField("name", event.target.value)}
                  placeholder={
                    formData.vendor_type === "Company"
                      ? "e.g., Acme Corporation"
                      : "e.g., John Doe"
                  }
                  className="mt-1.5"
                  data-testid="vendor-name-input"
                  required={
                    invoiceVendorRequest ||
                    isRequired(VENDOR_FIELD_SECTIONS.COMPANY_NAME)
                  }
                />
              </div>

              {isIndia && !invoiceVendorRequest ? (
                <div>
                  <Label>
                    {labelFor(VENDOR_FIELD_SECTIONS.PAN_NO, "PAN Number")}
                    {isRequired(VENDOR_FIELD_SECTIONS.PAN_NO) ? " *" : ""}
                  </Label>
                  <Input
                    value={formData.pan || ""}
                    onChange={(event) => updateField("pan", event.target.value.toUpperCase())}
                    placeholder="e.g. ABCDE1234F"
                    className="mt-1.5 font-mono uppercase"
                    maxLength={10}
                    data-testid="vendor-pan-input"
                    required={isRequired(VENDOR_FIELD_SECTIONS.PAN_NO)}
                  />
                </div>
              ) : null}
            </div>
          </FormSection>

          <FormSection
            title={isIndia && !invoiceVendorRequest ? "Tax & GSTIN details" : "Tax information"}
            description={
              isIndia && !invoiceVendorRequest
                ? showPortalFetch
                  ? "Fetch vendor details from the GST portal by GSTIN."
                  : "Enter tax identifiers and GSTIN details manually."
                : invoiceVendorRequest
                  ? "Optional tax details. GST will be verified when the vendor is approved."
                  : "Enter tax identifiers for this vendor."
            }
          >
            {isIndia && !invoiceVendorRequest ? (
              <div className="space-y-4">
                {showPortalFetch ? (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <div className="mb-3">
                    <h4 className="text-sm font-semibold text-foreground">Fetch Vendor Details</h4>
                    <p className="text-xs text-muted-foreground">
                      Enter a GSTIN to fetch that registration and linked vendor identity.
                    </p>
                  </div>
                  <div className="grid gap-3">
                    {gstVerificationEnabled ? (
                      <div>
                        <Label htmlFor="vendor-fetch-gstin">GSTIN for lookup</Label>
                        <Input
                          id="vendor-fetch-gstin"
                          value={fetchGstinQuery}
                          onChange={(event) => {
                            setFetchGstinQuery(event.target.value.toUpperCase());
                            if (fetchMessageIsError) clearFetchFeedback();
                          }}
                          placeholder="27ABCDE1234F1Z5"
                          className="mt-1.5 font-mono uppercase"
                          maxLength={15}
                          aria-invalid={fetchMessageIsError}
                          data-testid="vendor-fetch-gstin-input"
                        />
                      </div>
                    ) : null}
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        className="shrink-0"
                        onClick={handleFetchDetails}
                        disabled={
                          isFetchLoading ||
                          !isVendorFetchReady({ gstin: fetchGstinQuery })
                        }
                      >
                        {isFetchLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Fetching…
                          </>
                        ) : (
                          'Fetch Details'
                        )}
                      </Button>
                    </div>
                    {fetchMessage ? (
                      <p
                        className={`text-xs ${fetchMessageIsError ? "text-destructive" : "text-muted-foreground"}`}
                      >
                        {fetchMessage}
                      </p>
                    ) : null}
                    <FetchVendorResultsPreview
                      fetchMode={lastFetchMode}
                      records={fetchedRecords}
                      selectedGstins={selectedFetchedGstins}
                      onToggleGstin={(gstin) => {
                        setSelectedFetchedGstins((prev) => {
                          const next = new Set(prev);
                          if (next.has(gstin)) next.delete(gstin);
                          else next.add(gstin);
                          return next;
                        });
                      }}
                      onSelectAll={() => {
                        setSelectedFetchedGstins(new Set(fetchedRecords.map((record) => record.gstin)));
                      }}
                      onSelectNone={() => setSelectedFetchedGstins(new Set())}
                      onApply={applySelectedFetchedRegistrations}
                    />
                  </div>
                </div>
                ) : null}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="vendor-msme"
                    checked={Boolean(formData.msme)}
                    onCheckedChange={(checked) => updateField("msme", checked === true)}
                    data-testid="vendor-msme-checkbox"
                  />
                  <Label htmlFor="vendor-msme" className="cursor-pointer font-normal">
                    {labelFor(VENDOR_FIELD_SECTIONS.MSME, "MSME registered vendor")}
                    {isRequired(VENDOR_FIELD_SECTIONS.MSME) ? " *" : ""}
                  </Label>
                </div>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">GSTIN Details</h4>
                      <p className="text-xs text-muted-foreground">
                        {showPortalFetch
                          ? "Review fetch results above and add selected GSTINs, or add GSTIN blocks manually."
                          : "Add GSTIN blocks manually."}
                      </p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addManualGstRegistration}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add GSTIN
                    </Button>
                  </div>
                  <GstRegistrationsEditor
                    registrations={gstRegistrations}
                    onUpdate={updateGstRegistration}
                    onRemove={removeGstRegistration}
                    portalFetchEnabled={showPortalFetch}
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>
                    {labelFor(VENDOR_FIELD_SECTIONS.PAN_NO, "PAN / Tax ID")}
                    {isRequired(VENDOR_FIELD_SECTIONS.PAN_NO) ? " *" : ""}
                  </Label>
                  <Input
                    value={formData.pan}
                    onChange={(event) =>
                      updateField("pan", event.target.value.toUpperCase())
                    }
                    placeholder="Tax identifier"
                    className="mt-1.5 uppercase"
                    required={isRequired(VENDOR_FIELD_SECTIONS.PAN_NO)}
                  />
                </div>
                <div>
                  <Label>
                    {labelFor(VENDOR_FIELD_SECTIONS.GST_NO, "GSTIN / Tax ID")}
                    {isRequired(VENDOR_FIELD_SECTIONS.GST_NO) ? " *" : ""}
                  </Label>
                  <Input
                    value={formData.gstin}
                    onChange={(event) =>
                      updateField("gstin", event.target.value.toUpperCase())
                    }
                    placeholder="Enter GSTIN or Tax ID"
                    className="mt-1.5 uppercase"
                    required={isRequired(VENDOR_FIELD_SECTIONS.GST_NO)}
                  />
                </div>
                {!invoiceVendorRequest ? (
                  <div className="sm:col-span-2 flex items-center gap-2">
                    <Checkbox
                      id="vendor-msme"
                      checked={Boolean(formData.msme)}
                      onCheckedChange={(checked) =>
                        updateField("msme", checked === true)
                      }
                      data-testid="vendor-msme-checkbox"
                    />
                    <Label htmlFor="vendor-msme" className="cursor-pointer font-normal">
                      {labelFor(VENDOR_FIELD_SECTIONS.MSME, "MSME registered vendor")}
                      {isRequired(VENDOR_FIELD_SECTIONS.MSME) ? " *" : ""}
                    </Label>
                  </div>
                ) : null}
              </div>
            )}
          </FormSection>

          <FormSection
            title="Contact & classification"
            description="How you reach this vendor and how they are categorized."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {basicInfoFields.map(renderInputField)}

              <div>
                <Label>
                  {labelFor(VENDOR_FIELD_SECTIONS.CATEGORY, "Category")}
                  {isRequired(VENDOR_FIELD_SECTIONS.CATEGORY) ? " *" : ""}
                </Label>
                <Select
                  value={formData.category || ""}
                  onValueChange={(value) => updateField("category", value)}
                  required={isRequired(VENDOR_FIELD_SECTIONS.CATEGORY)}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>
                  {labelFor(VENDOR_FIELD_SECTIONS.CURRENCY, "Currency")}
                  {isRequired(VENDOR_FIELD_SECTIONS.CURRENCY) ? " *" : ""}
                </Label>
                <Select
                  value={formData.currency || ""}
                  onValueChange={(value) => updateField("currency", value)}
                  required={isRequired(VENDOR_FIELD_SECTIONS.CURRENCY)}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select Currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencyOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </FormSection>

          {showVendorDocumentsSection ? (
            <FormSection
              title="Vendor documents"
              description="Upload supporting documents for this vendor. All documents are optional."
            >
              <VendorDocumentsPanel
                documents={formData.documents}
                onChange={(documents) => updateField("documents", documents)}
                disabled={submitting}
                visibleDocumentTypes={visibleVendorDocumentTypes}
              />
            </FormSection>
          ) : null}

          {!invoiceVendorRequest ? (
            <FormSection title="TDS">
              <VendorTdsPanel
                tdsMapping={formData.tdsMapping}
                onChange={(tdsMapping) => updateField("tdsMapping", tdsMapping)}
                disabled={submitting}
              />
            </FormSection>
          ) : null}

          {!invoiceVendorRequest ? (
            <>
              <FormSection title="Notes">
                <textarea
                  value={formData.notes}
                  onChange={(event) => updateField("notes", event.target.value)}
                  className="w-full min-h-[96px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Special instructions, payment preferences, or internal remarks…"
                  required={isRequired(VENDOR_FIELD_SECTIONS.REMARKS)}
                />
              </FormSection>
            </>
          ) : null}

          <div className="flex gap-3 pt-2 border-t sticky bottom-0 bg-background pb-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              data-testid="vendor-submit-button"
              disabled={
                submitting ||
                (isIndia && !invoiceVendorRequest && gstVerificationEnabled && !gstVerificationSatisfied)
              }
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {submitting ? "Saving…" : submitLabel}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default VendorDetailsDialog;

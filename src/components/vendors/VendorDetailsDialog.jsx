import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, CheckCircle2, ChevronsUpDown, Loader2, MapPin, Plus, Trash2, User } from "lucide-react";
import { useGetAvailableCurrenciesQuery } from "../../Services/apis/corporateApi";
import { useRBAC } from "../../contexts/RBACContext";
import {
  CURRENCY_SCREENS,
  FALLBACK_CURRENCIES,
  mergeCurrencyOptions,
  normalizeCurrencyCode,
} from "../../utils/currency";
import {
  getVendorFieldDisplayName,
  isVendorFieldRequired,
  VENDOR_FIELD_SECTIONS,
} from "../../utils/vendorFieldConfig";
import {
  isIndiaCountry,
  getInvoiceVendorRequestValidationErrors,
  getVendorGstVerificationErrors,
  isVendorGstVerificationSatisfied,
  getVendorGstinFormatError,
  isVendorFetchReady,
  getVendorValidationErrors,
} from "../../utils/vendorValidation";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import AppSelect from "../common/AppSelect";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "../ui/popover";
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

const createEmptyVendorBranch = () => ({
  id: `vendor-branch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  branchName: "",
  branchCode: "",
  gstin: "",
  isEditing: true,
});

const normalizeVendorBranches = (branches = []) =>
  (Array.isArray(branches) ? branches : [])
    .map((branch) => ({
      ...branch,
      id:
        branch.id ||
        branch.branchId ||
        branch.branch_id ||
        branch._clientId ||
        `vendor-branch-${Math.random().toString(36).slice(2, 9)}`,
      branchName: branch.branchName ?? branch.branch_name ?? branch.name ?? "",
      branchCode: String(branch.branchCode ?? branch.branch_code ?? branch.code ?? "")
        .trim()
        .toUpperCase(),
      gstin: String(branch.gstin ?? branch.mappedGstin ?? branch.mapped_gstin ?? branch.billingGstin ?? "")
        .trim()
        .toUpperCase(),
      isEditing: branch.isEditing,
    }))
    .filter((branch) => branch.branchName || branch.branchCode || branch.gstin);

const validateVendorBranches = (branches = [], gstRegistrations = []) => {
  const activeBranches = normalizeVendorBranches(branches);
  const validGstins = new Set(
    normalizeFormGstRegistrations(gstRegistrations)
      .map((registration) => registration.gstin)
      .filter(Boolean),
  );
  const names = [];
  const codes = [];

  for (const branch of activeBranches) {
    if (!branch.branchName) return "Branch name is required for each vendor branch.";
    if (!branch.branchCode) return "Branch code is required for each vendor branch.";
    if (branch.gstin && !validGstins.has(branch.gstin)) {
      return "Vendor branch GSTIN must be selected from the vendor's added GST registrations.";
    }
    names.push(branch.branchName.trim().toLowerCase());
    codes.push(branch.branchCode.trim().toLowerCase());
  }

  if (new Set(names).size !== names.length) return "Vendor branch names must be unique.";
  if (new Set(codes).size !== codes.length) return "Vendor branch codes must be unique.";
  return "";
};

const VendorBranchesEditor = ({ branches = [], gstRegistrations = [], onChange }) => {
  const rows = normalizeVendorBranches(branches);
  const gstOptions = normalizeFormGstRegistrations(gstRegistrations)
    .map((registration) => registration.gstin)
    .filter(Boolean)
    .map((gstin) => ({ value: gstin, label: gstin }));

  const updateRow = (id, field, value) => {
    onChange(
      rows.map((row) =>
        row.id === id
          ? {
              ...row,
              [field]:
                field === "branchCode" || field === "gstin"
                  ? String(value || "").toUpperCase()
                  : value,
            }
          : row,
      ),
    );
  };

  const toggleEdit = (id) => {
    onChange(rows.map((row) => (row.id === id ? { ...row, isEditing: !row.isEditing } : row)));
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Label className="text-base font-semibold">Vendor Branches</Label>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure vendor branch locations and map each branch to one of the vendor GSTINs.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...rows, createEmptyVendorBranch()])}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Vendor Branch
        </Button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <div className="min-w-[720px]">
          <div className="grid grid-cols-[1.2fr_1fr_1.4fr_96px] gap-3 border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
            <div>Branch Name</div>
            <div>Branch Code</div>
            <div>GSTIN</div>
            <div>Actions</div>
          </div>
          {rows.length ? (
            <div className="divide-y divide-border">
              {rows.map((row, index) => {
                const disabled = row.isEditing === false;
                return (
                  <div
                    key={row.id}
                    className="grid grid-cols-[1.2fr_1fr_1.4fr_96px] items-center gap-3 px-3 py-3"
                    data-testid={`vendor-branch-row-${index}`}
                  >
                    <Input
                      value={row.branchName || ""}
                      disabled={disabled}
                      onChange={(event) => updateRow(row.id, "branchName", event.target.value)}
                      placeholder="Branch name"
                      className="h-8 text-sm"
                    />
                    <Input
                      value={row.branchCode || ""}
                      disabled={disabled}
                      onChange={(event) => updateRow(row.id, "branchCode", event.target.value)}
                      placeholder="BR-001"
                      className="h-8 text-sm uppercase"
                    />
                    <AppSelect
                      value={row.gstin || ""}
                      onChange={(event) => updateRow(row.id, "gstin", event.target.value)}
                      options={gstOptions}
                      placeholder={gstOptions.length ? "Select GSTIN" : "Add GSTIN first"}
                      className="h-8 text-sm"
                      disabled={disabled || gstOptions.length === 0}
                    />
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleEdit(row.id)}
                        aria-label={`Edit vendor branch ${index + 1}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onChange(rows.filter((item) => item.id !== row.id))}
                        className="text-destructive hover:text-destructive"
                        aria-label={`Delete vendor branch ${index + 1}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              No vendor branches configured yet.
            </div>
          )}
        </div>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Multiple vendor branches can share the same GSTIN. Add GSTIN details first, then map them here.
      </p>
    </div>
  );
};

const GstRegistrationsEditor = ({
  registrations,
  onUpdate,
  onRemove,
  portalFetchEnabled = false,
  gstinRequired = false,
  isRequired = () => false,
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
                      <Label>GSTIN{gstinRequired ? " *" : ""}</Label>
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
                    <Label className="mb-1.5 block text-xs">
                      Address line 1{isRequired(VENDOR_FIELD_SECTIONS.ADDRESS_LINE_1) ? " *" : ""}
                    </Label>
                    <Input
                      value={registration.location?.addressLine1 || ""}
                      onChange={(event) => updateLocationField("addressLine1", event.target.value)}
                      placeholder="Address line 1"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label className="mb-1.5 block text-xs">
                      Address line 2{isRequired(VENDOR_FIELD_SECTIONS.ADDRESS_LINE_2) ? " *" : ""}
                    </Label>
                    <Input
                      value={registration.location?.addressLine2 || ""}
                      onChange={(event) => updateLocationField("addressLine2", event.target.value)}
                      placeholder="Address line 2"
                    />
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-xs">
                      City{isRequired(VENDOR_FIELD_SECTIONS.CITY) ? " *" : ""}
                    </Label>
                    <Input
                      value={registration.location?.city || ""}
                      onChange={(event) => updateLocationField("city", event.target.value)}
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-xs">
                      State{isRequired(VENDOR_FIELD_SECTIONS.STATE) ? " *" : ""}
                    </Label>
                    <Input
                      value={registration.location?.state || registration.state || ""}
                      onChange={(event) => {
                        updateRegistrationField("state", event.target.value);
                        updateLocationField("state", event.target.value);
                      }}
                      placeholder="State"
                    />
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-xs">
                      Pincode{isRequired(VENDOR_FIELD_SECTIONS.PINCODE) ? " *" : ""}
                    </Label>
                    <Input
                      value={registration.location?.pincode || ""}
                      onChange={(event) => updateLocationField("pincode", event.target.value)}
                      placeholder="Pincode"
                    />
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-xs">
                      Country{isRequired(VENDOR_FIELD_SECTIONS.COUNTRY) ? " *" : ""}
                    </Label>
                    <Input
                      value={registration.location?.country || "India"}
                      onChange={(event) => updateLocationField("country", event.target.value)}
                      placeholder="Country"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm">Bank Details</Label>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label className="mb-1.5 block text-xs">
                      Account holder name{isRequired(VENDOR_FIELD_SECTIONS.ACCOUNT_NAME) ? " *" : ""}
                    </Label>
                    <Input
                      value={registration.bankDetails?.accountHolderName || ""}
                      onChange={(event) => updateBankField("accountHolderName", event.target.value)}
                      placeholder="Account holder name"
                    />
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-xs">
                      Account number{isRequired(VENDOR_FIELD_SECTIONS.ACCOUNT_NUMBER) ? " *" : ""}
                    </Label>
                    <Input
                      value={registration.bankDetails?.accountNumber || ""}
                      onChange={(event) => updateBankField("accountNumber", event.target.value)}
                      placeholder="Account number"
                    />
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-xs">
                      IFSC code{isRequired(VENDOR_FIELD_SECTIONS.IFSC_CODE) ? " *" : ""}
                    </Label>
                    <Input
                      value={registration.bankDetails?.ifscCode || ""}
                      onChange={(event) => updateBankField("ifscCode", event.target.value.toUpperCase())}
                      placeholder="IFSC code"
                      className="uppercase"
                    />
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-xs">
                      Bank name{isRequired(VENDOR_FIELD_SECTIONS.BANK_NAME) ? " *" : ""}
                    </Label>
                    <Input
                      value={registration.bankDetails?.bankName || ""}
                      onChange={(event) => updateBankField("bankName", event.target.value)}
                      placeholder="Bank name"
                    />
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-xs">
                      Branch{isRequired(VENDOR_FIELD_SECTIONS.BRANCH) ? " *" : ""}
                    </Label>
                    <Input
                      value={registration.bankDetails?.branch || ""}
                      onChange={(event) => updateBankField("branch", event.target.value)}
                      placeholder="Branch"
                    />
                  </div>
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
  legalName: registration.legalName || "",
  tradeName: registration.tradeName || "",
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
        {firstRecord.tradeName &&
        firstRecord.legalName &&
        firstRecord.tradeName.trim().toUpperCase() !== firstRecord.legalName.trim().toUpperCase() ? (
          <div className="mt-0.5 text-xs">
            Trade name: <span className="font-medium">{firstRecord.tradeName}</span>
          </div>
        ) : null}
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
      name: data.legalName || data.tradeName || prev.name,
      trade_name: data.tradeName || prev.trade_name,
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
  const [currencyPickerOpen, setCurrencyPickerOpen] = useState(false);
  const [currencyQuery, setCurrencyQuery] = useState("");

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
      setCurrencyPickerOpen(false);
      setCurrencyQuery("");
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

    if (invoiceVendorRequest) {
      const requestErrors = getInvoiceVendorRequestValidationErrors(formData);
      if (requestErrors.length > 0) {
        toast.error(requestErrors[0]);
        return;
      }
      onSubmit(event);
      return;
    }

    const validationErrors = getVendorValidationErrors(formData, {
      activeVendorFields,
      vendorFieldConfiguration,
    });
    if (validationErrors.length > 0) {
      toast.error(validationErrors[0]);
      return;
    }

    const gstErrors = getVendorGstVerificationErrors(formData, gstVerification, {
      invoiceVendorRequest,
      gstVerificationEnabled,
      activeVendorFields,
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

    const vendorBranchError = validateVendorBranches(
      formData.vendorBranches,
      formData.gstRegistrations,
    );
    if (vendorBranchError) {
      toast.error(vendorBranchError);
      return;
    }

    const tdsErrors = getVendorTdsValidationErrors(formData.tdsMapping ?? null);
    if (tdsErrors.length > 0) {
      toast.error(tdsErrors[0]);
      return;
    }

    onSubmit(event);
  };

  const isRequired = (sectionId) =>
    !invoiceVendorRequest && isVendorFieldRequired(sectionId, activeVendorFields);

  const labelFor = (sectionId, fallback = "") =>
    getVendorFieldDisplayName(sectionId, vendorFieldConfiguration) || fallback;

  const isIndia = isIndiaCountry(formData?.country);
  const gstVerificationSatisfied = isVendorGstVerificationSatisfied(
    formData,
    gstVerification,
    { invoiceVendorRequest, gstVerificationEnabled, activeVendorFields },
  );
  const currencyOptions =
    Array.isArray(availableCurrencies) && availableCurrencies.length > 0
      ? availableCurrencies.filter((currency) => currency !== "ALL")
      : FALLBACK_CURRENCIES;
  const resolvedCurrencyOptions = useMemo(
    () => mergeCurrencyOptions(currencyOptions, FALLBACK_CURRENCIES, formData?.currency),
    [currencyOptions, formData?.currency],
  );
  const filteredCurrencyOptions = useMemo(() => {
    const query = String(currencyQuery || "").trim().toUpperCase();
    if (!query) return resolvedCurrencyOptions;
    return resolvedCurrencyOptions.filter((code) => code.includes(query));
  }, [currencyQuery, resolvedCurrencyOptions]);

  const updateField = (field, value) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const applyCurrencyChange = (value) => {
    const normalized = normalizeCurrencyCode(value);
    updateField("currency", normalized);
    setCurrencyQuery(normalized);
  };

  useEffect(() => {
    if (!open) return;
    setCurrencyQuery(formData?.currency || "INR");
  }, [formData?.currency, open]);

  if (!formData) return null;

  const gstRegistrations = normalizeFormGstRegistrations(formData.gstRegistrations);
  const vendorBranches = normalizeVendorBranches(formData.vendorBranches);

  const updateVendorBranches = (branches) => {
    setFormData((prev) => ({
      ...prev,
      vendorBranches: normalizeVendorBranches(branches),
    }));
  };

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
      trade_name: firstRecord.tradeName || prev.trade_name,
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

    const removed = gstRegistrations.find(
      (registration) => getRegistrationKey(registration) === registrationKey,
    );

    setFormData((prev) => {
      const remaining = normalizeFormGstRegistrations(prev.gstRegistrations).filter(
        (registration) => getRegistrationKey(registration) !== registrationKey,
      );
      const nextGstin = remaining.find((registration) => registration.gstin)?.gstin ?? "";

      return {
        ...prev,
        gstin: nextGstin,
        gstRegistrations: remaining,
        vendorBranches: normalizeVendorBranches(prev.vendorBranches).map((branch) =>
          branch.gstin === removed?.gstin ? { ...branch, gstin: "" } : branch,
        ),
      };
    });

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

        <form onSubmit={handleFormSubmit} noValidate className="px-6 py-6 space-y-8">
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

              <div>
                <Label>
                  {labelFor(VENDOR_FIELD_SECTIONS.TRADE_NAME, "Trade Name")}
                  {isRequired(VENDOR_FIELD_SECTIONS.TRADE_NAME) ? " *" : ""}
                </Label>
                <Input
                  value={formData.trade_name || ""}
                  onChange={(event) => updateField("trade_name", event.target.value)}
                  placeholder="e.g., Tensai"
                  className="mt-1.5"
                  data-testid="vendor-trade-name-input"
                  required={isRequired(VENDOR_FIELD_SECTIONS.TRADE_NAME)}
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
                <VendorBranchesEditor
                  branches={vendorBranches}
                  gstRegistrations={gstRegistrations}
                  onChange={updateVendorBranches}
                />
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
                    gstinRequired={isRequired(VENDOR_FIELD_SECTIONS.GST_NO)}
                    isRequired={isRequired}
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
                <Popover
                  open={currencyPickerOpen}
                  onOpenChange={setCurrencyPickerOpen}
                >
                  <PopoverAnchor asChild>
                    <div className="relative mt-1.5">
                      <Input
                        value={currencyQuery}
                        onChange={(event) => {
                          const next = event.target.value
                            .toUpperCase()
                            .replace(/[^A-Z]/g, "")
                            .slice(0, 3);
                          setCurrencyQuery(next);
                          setCurrencyPickerOpen(true);
                          if (next.length === 3) {
                            applyCurrencyChange(next);
                          }
                        }}
                        onFocus={() => setCurrencyPickerOpen(true)}
                        onBlur={() => {
                          const normalized = normalizeCurrencyCode(currencyQuery);
                          if (String(currencyQuery || "").trim().length === 3) {
                            applyCurrencyChange(normalized);
                          } else {
                            setCurrencyQuery(formData.currency || "INR");
                          }
                        }}
                        placeholder="Select or type code (e.g. USD)"
                        className="pr-10 uppercase"
                        autoComplete="off"
                        maxLength={3}
                        required={isRequired(VENDOR_FIELD_SECTIONS.CURRENCY)}
                      />
                      <button
                        type="button"
                        onClick={() => setCurrencyPickerOpen((open) => !open)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                        aria-label="Show currency list"
                      >
                        <ChevronsUpDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </PopoverAnchor>
                  <PopoverContent
                    className="w-[var(--radix-popover-trigger-width)] p-0"
                    align="start"
                    onOpenAutoFocus={(event) => event.preventDefault()}
                  >
                    <div className="max-h-56 overflow-y-auto py-1">
                      {filteredCurrencyOptions.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-muted-foreground">
                          {String(currencyQuery || "").trim().length === 3
                            ? `Use ${normalizeCurrencyCode(currencyQuery)}`
                            : "No matching currencies — type a 3-letter ISO code"}
                        </p>
                      ) : (
                        filteredCurrencyOptions.map((code) => (
                          <button
                            key={code}
                            type="button"
                            className={`flex w-full items-center px-3 py-2 text-left text-sm hover:bg-accent ${
                              formData.currency === code ? "bg-accent" : ""
                            }`}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              applyCurrencyChange(code);
                              setCurrencyPickerOpen(false);
                            }}
                          >
                            {code}
                          </button>
                        ))
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
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

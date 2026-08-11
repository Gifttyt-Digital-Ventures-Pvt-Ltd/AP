import React, { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { useRBAC } from "../../../../contexts/RBACContext";
import {
  getVendorFieldDisplayName,
  getVendorFormRequiredFields,
  isVendorFieldRequired,
  VENDOR_FIELD_SECTIONS,
} from "../../../../utils/vendorFieldConfig";
import {
  getVendorFieldErrorClassName,
  getVendorFieldErrorMap,
  getVendorGstVerificationErrors,
  getVendorGstinFormatError,
  getVendorValidationErrors,
  isVendorFetchReady,
} from "../../../../utils/vendorValidation";
import {
  getVisibleVendorDocumentTypes,
  hasVisibleVendorDocuments,
} from "../../../../utils/vendorDocumentConfig";
import { isVendorPortalFetchEnabled } from "../../../../utils/vendorVerificationConfig";
import { useVendorGstDetailsFetch } from "../../hooks/useVendorGstDetailsFetch";
import {
  getVendorTdsCertificateValidationErrors,
  getVendorTdsValidationErrors,
  hasConfiguredVendorTds,
} from "../../utils/vendorTds";
import {
  buildGstRegistrationFromVerification,
  createEmptyGstRegistration,
  formatRegistrationLocation,
  getRegistrationKey,
  mapFetchedRegistrationToVerification,
  normalizeFormGstRegistrations,
} from "../../utils/vendorGstRegistrations";
import { normalizeVendorBranches, validateVendorBranches } from "../../utils/vendorBranches";
import VendorFormSectionNav from "./VendorFormSectionNav";
import GeneralInformationSection from "./GeneralInformationSection";
import AddressBranchInformationSection from "./AddressBranchInformationSection";
import TaxInformationSection from "./TaxInformationSection";
import BankDetailsSection from "./BankDetailsSection";
import { validateVendorBankAccounts } from "./VendorBankDetailsEditor";
import AttachmentsSection from "./AttachmentsSection";
import NotesSection from "./NotesSection";

const NAV_SECTIONS = [
  {
    id: "general-information",
    label: "General Information",
    headerWeight: "semibold",
    children: [
      { id: "vendor-identity", label: "Vendor Identity" },
      { id: "classification-commercial-terms", label: "Classification & Commercial Terms" },
      { id: "flags-status", label: "Flags & Status" },
    ],
  },
  {
    id: "address-branch-information",
    label: "Address & Branch Information",
    headerWeight: "medium",
    children: [
      { id: "gstin-details", label: "GSTIN Details" },
      { id: "vendor-branches", label: "Vendor Branches" },
      { id: "legacy-tax-identifiers", label: "Legacy tax identifiers (Pre-GST)" },
    ],
  },
  { id: "contact-details", label: "Contact Details", headerWeight: "semibold" },
  {
    id: "tax-information",
    label: "Tax Information",
    headerWeight: "medium",
    children: [
      { id: "pan-details", label: "PAN Details" },
      { id: "tds", label: "TDS" },
    ],
  },
  {
    id: "bank-details",
    label: "Bank Details",
    headerWeight: "semibold",
    children: [{ id: "vendor-bank-details", label: "Vendor Bank Details" }],
  },
  {
    id: "attachments",
    label: "Attachments",
    headerWeight: "semibold",
    children: [{ id: "vendor-documents", label: "Vendor Documents" }],
  },
  { id: "notes", label: "Notes", headerWeight: "semibold" },
];

const CONTACT_FIELDS = [
  {
    key: "email",
    section: VENDOR_FIELD_SECTIONS.EMAIL_ID,
    type: "email",
    placeholder: "vendor@example.com",
  },
  {
    key: "mobile",
    section: VENDOR_FIELD_SECTIONS.MOBILE_NO,
    placeholder: "+91 98765 43210",
  },
  {
    key: "phone",
    section: VENDOR_FIELD_SECTIONS.PHONE_NO,
    placeholder: "+91 22 1234 5678",
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

const PHONE_INPUT_FIELD_KEYS = new Set(["mobile", "phone"]);
const sanitizePhoneInput = (value) => String(value ?? "").replace(/[^\d+\-\s()]/g, "");

const CreateVendorPage = ({
  formData,
  setFormData,
  onSubmit,
  onCancel,
  submitting = false,
  title = "Create Vendor",
  subtitle = "Add contact details and payment info of your vendor in OptiFii",
  submitLabel = "Create Vendor",
  submittingLabel = "Creating…",
  testId = "create-vendor-page",
  isEditMode = false,
}) => {
  const contentPaneRef = useRef(null);
  const { corporateScreens } = useRBAC();
  const activeVendorFields = corporateScreens?.activeVendorFields ?? [];
  const vendorFieldConfiguration = corporateScreens?.vendorFieldConfiguration ?? [];
  const activeVendorDocuments = corporateScreens?.activeVendorDocuments;
  const vendorDocumentConfiguration = corporateScreens?.vendorDocumentConfiguration ?? [];
  const visibleVendorDocumentTypes = getVisibleVendorDocumentTypes(
    activeVendorDocuments,
    vendorDocumentConfiguration,
  );
  const showVendorDocumentsSection = hasVisibleVendorDocuments(
    activeVendorDocuments,
    vendorDocumentConfiguration,
  );
  const gstVerificationEnabled = isVendorPortalFetchEnabled(
    corporateScreens?.activeVendorVerification,
  );
  const showPortalFetch = gstVerificationEnabled;
  const requiredVendorFields = useMemo(
    () => getVendorFormRequiredFields(activeVendorFields, formData),
    [activeVendorFields, formData],
  );

  const isRequired = (sectionId) => isVendorFieldRequired(sectionId, requiredVendorFields);
  const isApiFieldRequired = (sectionId) => isVendorFieldRequired(sectionId, activeVendorFields);
  const labelFor = (sectionId, fallback = "") =>
    getVendorFieldDisplayName(sectionId, vendorFieldConfiguration) || fallback;
  const updateField = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }));

  const [gstVerification, setGstVerification] = useState({
    verified: false,
    gstin: "",
    validGstin: null,
  });
  const [gstVerificationAttempted, setGstVerificationAttempted] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [fetchGstinQuery, setFetchGstinQuery] = useState("");
  const [lastFetchMode, setLastFetchMode] = useState("gstin");
  const [fetchMessage, setFetchMessage] = useState("");
  const [fetchMessageIsError, setFetchMessageIsError] = useState(false);
  const [fetchedRecords, setFetchedRecords] = useState([]);
  const [selectedFetchedGstins, setSelectedFetchedGstins] = useState(() => new Set());

  const { fetchVendorDetails, isLoading: isFetchLoading } = useVendorGstDetailsFetch();

  useEffect(() => {
    if (!formData?.gstin) return;
    const normalized = String(formData.gstin || "").trim().toUpperCase();
    const existingRegistration = normalizeFormGstRegistrations(formData.gstRegistrations).find(
      (registration) => registration.gstin === normalized,
    );
    if (!existingRegistration) return;

    setGstVerification((prev) => {
      if (prev.verified && prev.gstin === normalized) return prev;
      return { verified: true, gstin: normalized, validGstin: true };
    });
  }, [formData?.gstin, formData?.gstRegistrations]);

  if (!formData) return null;

  const gstRegistrations = normalizeFormGstRegistrations(formData.gstRegistrations);
  const vendorBranches = normalizeVendorBranches(formData.vendorBranches);
  const fieldErrors = submitAttempted
    ? getVendorFieldErrorMap(formData, { activeVendorFields: requiredVendorFields, vendorFieldConfiguration })
    : {};

  const updateVendorBranches = (branches) => {
    setFormData((prev) => ({ ...prev, vendorBranches: normalizeVendorBranches(branches) }));
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
    const selectedRecords = fetchedRecords.filter((record) => selectedFetchedGstins.has(record.gstin));
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
        return { ...registration, _clientId: `reg-${registration.gstin}`, _fromFetch: true };
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

      return { ...prev, gstin: primaryGstin, gstRegistrations: merged };
    });

    const existingGstins = new Set(gstRegistrations.map((registration) => registration.gstin));
    const addedCount = newRegistrations.filter((registration) => !existingGstins.has(registration.gstin)).length;
    if (!addedCount) return;

    const firstAdded = newRegistrations.find((registration) => !existingGstins.has(registration.gstin));
    if (firstAdded?.gstin) {
      setGstVerification({ verified: true, gstin: firstAdded.gstin, validGstin: true });
    }

    setFetchedRecords([]);
    setSelectedFetchedGstins(new Set());
    setFetchFeedback(`${addedCount} GST registration${addedCount !== 1 ? "s" : ""} added.`, false);
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
    setFetchGstinQuery("");
    clearFetchFeedback();
  };

  const addManualGstRegistration = () => {
    setFormData((prev) => ({
      ...prev,
      gstRegistrations: [...normalizeFormGstRegistrations(prev.gstRegistrations), createEmptyGstRegistration()],
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
            ? { ...(registration.location || {}), ...patch.location }
            : registration.location,
          bankDetails: patch.bankDetails
            ? { ...(registration.bankDetails || {}), ...patch.bankDetails }
            : registration.bankDetails,
        };
        if (patch.gstin !== undefined) {
          next.gstin = String(patch.gstin || "").trim().toUpperCase();
        }
        return { ...next, address: formatRegistrationLocation(next) };
      }),
    }));
  };

  const handleFormSubmit = (event) => {
    event.preventDefault();
    if (!formData) return;

    setSubmitAttempted(true);

    const validationErrors = getVendorValidationErrors(formData, {
      activeVendorFields: requiredVendorFields,
      vendorFieldConfiguration,
    });
    if (validationErrors.length > 0) {
      toast.error(validationErrors[0]);
      return;
    }

    const gstErrors = getVendorGstVerificationErrors(formData, gstVerification, {
      invoiceVendorRequest: false,
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
      toast.error(
        getVendorGstinFormatError(incompleteRegistrations[0].gstin) || "Invalid GSTIN in a registration block.",
      );
      return;
    }

    const vendorBankError = validateVendorBankAccounts(formData.bankAccounts, {
      foreignVendor: Boolean(formData.foreignVendor),
      isRequired: isApiFieldRequired,
    });
    if (vendorBankError) {
      toast.error(vendorBankError);
      return;
    }

    const vendorBranchError = validateVendorBranches(formData.vendorBranches, formData.gstRegistrations);
    if (vendorBranchError) {
      toast.error(vendorBranchError);
      return;
    }

    const tdsErrors = [
      ...getVendorTdsValidationErrors(formData.tdsMapping ?? null),
      ...getVendorTdsCertificateValidationErrors(formData.tdsCertificates, {
        requireCertificate: Boolean(formData.tdsDetailsEdited && hasConfiguredVendorTds(formData.tdsMapping)),
      }),
    ];
    if (tdsErrors.length > 0) {
      toast.error(tdsErrors[0]);
      return;
    }

    onSubmit(event);
  };

  return (
    <div className="-m-4 flex min-h-0 flex-1 flex-col overflow-hidden" data-testid={testId}>
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted/20 px-4 py-3">
        <div className="flex flex-col items-start pl-1">
          <h1 className="overflow-hidden text-xl font-bold leading-7 text-foreground">{title}</h1>
          <div className="flex h-7 items-center justify-center rounded-md">
            <p className="text-center text-xs font-medium leading-4 text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onCancel}
          aria-label="Close"
          data-testid="create-vendor-close"
          className="opacity-70"
        >
          <X className="h-6 w-6 text-foreground" />
        </Button>
      </div>

      <form onSubmit={handleFormSubmit} noValidate className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <aside className="hidden min-h-0 w-96 shrink-0 md:flex md:flex-col">
            <VendorFormSectionNav sections={NAV_SECTIONS} scrollContainerRef={contentPaneRef} />
          </aside>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div ref={contentPaneRef} className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-6">
            <div className="space-y-10">
              <div id="general-information" className="scroll-mt-4">
                <GeneralInformationSection
                  formData={formData}
                  updateField={updateField}
                  isRequired={isRequired}
                  labelFor={labelFor}
                  isEditMode={isEditMode}
                  fieldErrors={fieldErrors}
                />
              </div>

              <div id="address-branch-information" className="scroll-mt-4">
                <AddressBranchInformationSection
                  formData={formData}
                  updateField={updateField}
                  isRequired={isRequired}
                  labelFor={labelFor}
                  gstRegistrations={gstRegistrations}
                  vendorBranches={vendorBranches}
                  showPortalFetch={showPortalFetch}
                  gstVerificationEnabled={gstVerificationEnabled}
                  fetchGstinQuery={fetchGstinQuery}
                  setFetchGstinQuery={setFetchGstinQuery}
                  isFetchLoading={isFetchLoading}
                  fetchMessage={fetchMessage}
                  fetchMessageIsError={fetchMessageIsError}
                  clearFetchFeedback={clearFetchFeedback}
                  handleFetchDetails={handleFetchDetails}
                  fetchedRecords={fetchedRecords}
                  selectedFetchedGstins={selectedFetchedGstins}
                  setSelectedFetchedGstins={setSelectedFetchedGstins}
                  lastFetchMode={lastFetchMode}
                  applySelectedFetchedRegistrations={applySelectedFetchedRegistrations}
                  addManualGstRegistration={addManualGstRegistration}
                  updateGstRegistration={updateGstRegistration}
                  removeGstRegistration={removeGstRegistration}
                  updateVendorBranches={updateVendorBranches}
                  isVendorFetchReady={isVendorFetchReady}
                  isApiFieldRequired={isApiFieldRequired}
                  isEditMode={isEditMode}
                  fieldErrors={fieldErrors}
                />
              </div>

              <section id="contact-details" className="-mx-6 scroll-mt-4 border-b border-border px-10">
                <div className="flex flex-col items-start self-stretch border-b border-border py-6">
                  <h3 className="font-['Manrope'] text-lg font-semibold leading-6 text-foreground">
                    Contact Details
                  </h3>
                </div>

                <div className="flex flex-col items-start gap-6 px-4 pb-8 pt-6">
                  <div className="flex w-full items-start gap-4">
                    {CONTACT_FIELDS.slice(0, 3).map(({ key, section, type = "text", placeholder }) => (
                      <div key={key} className="flex-1">
                        <Label>
                          {labelFor(section)}
                          {isRequired(section) ? " *" : ""}
                        </Label>
                        <Input
                          type={type}
                          value={formData[key] || ""}
                          onChange={(event) =>
                            updateField(
                              key,
                              PHONE_INPUT_FIELD_KEYS.has(key)
                                ? sanitizePhoneInput(event.target.value)
                                : event.target.value,
                            )
                          }
                          placeholder={placeholder}
                          required={isRequired(section)}
                          className={`mt-1.5 ${getVendorFieldErrorClassName(fieldErrors, key)}`}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex w-full items-start gap-4">
                    {CONTACT_FIELDS.slice(3).map(({ key, section, type = "text", placeholder }) => (
                      <div key={key} className="flex-1">
                        <Label>
                          {labelFor(section)}
                          {isRequired(section) ? " *" : ""}
                        </Label>
                        <Input
                          type={type}
                          value={formData[key] || ""}
                          onChange={(event) =>
                            updateField(
                              key,
                              PHONE_INPUT_FIELD_KEYS.has(key)
                                ? sanitizePhoneInput(event.target.value)
                                : event.target.value,
                            )
                          }
                          placeholder={placeholder}
                          required={isRequired(section)}
                          className={`mt-1.5 ${getVendorFieldErrorClassName(fieldErrors, key)}`}
                        />
                      </div>
                    ))}
                    <div className="flex-1" />
                  </div>
                </div>
              </section>

              <div id="tax-information" className="scroll-mt-4">
                <TaxInformationSection
                  formData={formData}
                  updateField={updateField}
                  isRequired={isRequired}
                  labelFor={labelFor}
                  submitting={submitting}
                  isEditMode={isEditMode}
                  fieldErrors={fieldErrors}
                />
              </div>

              <div id="bank-details" className="scroll-mt-4">
                <BankDetailsSection
                  bankAccounts={formData.bankAccounts || []}
                  onChange={(bankAccounts) => updateField("bankAccounts", bankAccounts)}
                  foreignVendor={Boolean(formData.foreignVendor)}
                  isRequired={isApiFieldRequired}
                />
              </div>

              <div id="attachments" className="scroll-mt-4">
                <AttachmentsSection
                  documents={formData.documents}
                  onChange={(documents) => updateField("documents", documents)}
                  disabled={submitting}
                  visibleDocumentTypes={visibleVendorDocumentTypes}
                  showDocuments={showVendorDocumentsSection}
                />
              </div>

              <div id="notes" className="scroll-mt-4">
                <NotesSection
                  notes={formData.notes}
                  onNotesChange={(notes) => updateField("notes", notes)}
                  isRequired={isRequired}
                  fieldErrors={fieldErrors}
                />
              </div>
            </div>
            </div>

            <div className="flex shrink-0 items-start gap-3 bg-background px-4 py-1">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onCancel}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {submittingLabel}
                  </>
                ) : (
                  submitLabel
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateVendorPage;

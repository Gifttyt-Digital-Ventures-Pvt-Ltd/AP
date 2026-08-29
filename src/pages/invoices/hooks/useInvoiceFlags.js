import { useCallback, useMemo, useState } from "react";
import { useAuth } from "../../../contexts/AuthContext";
import { useGetOrganisationGstCredentialsQuery, useGetTdsSectionsQuery } from "../../../Services/apis/taxApi";
import { useGetVendorCampaignsQuery } from "../../../Services/apis/campaignsApi";
import { useGetVendorQuery } from "../../../Services/apis/invoicesVendorsApi";
import { useGetOrganisationQuery } from "../../../Services/apis/settingsApi";
import {
  useGetInvoiceFlagReferenceDataQuery,
  useGetDuplicateInvoiceCandidatesQuery,
} from "../../../Services/apis/invoiceFlagsApi";
import { useDebouncedValue } from "../../../hooks/useDebouncedValue";
import { INVOICE_FLAG_CATALOG, INVOICE_FLAG_SEVERITY_ORDER, INVOICE_FLAG_STATUS } from "../constants/invoiceFlags";
import { evaluateInvoiceFlags, mergeFlagsWithResolutions } from "../utils/invoiceFlagsEngine";
import { normalizeInvoiceNumberForCompare } from "../utils/flagRules/duplicateDetection";
import { DEFAULT_TDS_SECTIONS } from "../utils/tds";
import { normalizeOrganisationBranchesFromApi } from "../../../utils/organisationGst";
// Pure, RTK/React-free on purpose — see flagLifecycleSelectors.js's own
// header comment for why (importable by the standalone Node verify script
// without pulling in this file's own RTK Query API dependency chain).
import { BLOCKING_SEVERITIES, selectBlockingFlagsResolvedByOthers } from "../utils/flagLifecycleSelectors";

export { BLOCKING_SEVERITIES, selectBlockingFlagsResolvedByOthers };

const bySeverityThenTitle = (a, b) => {
  const orderDiff =
    INVOICE_FLAG_SEVERITY_ORDER.indexOf(a.severity) - INVOICE_FLAG_SEVERITY_ORDER.indexOf(b.severity);
  if (orderDiff !== 0) return orderDiff;
  return String(a.title).localeCompare(String(b.title));
};

/**
 * Central wiring hook for the Invoice Flags feature — called independently
 * from both InvoicesPage.jsx's renderInvoiceForm and
 * useApprovalsInvoiceEdit.jsx's renderInvoiceForm (they own two fully
 * separate `formData`/`setFormData` state slots for the maker-vs-checker
 * edit flows), never lifted into one shared store.
 *
 * formData/setFormData: the caller's own state pair (same ones passed into
 *   <InvoiceForm>). skip: true while there's no invoice being edited yet.
 * findVendorById/findVendorByName: same lookup callbacks already passed
 *   into <InvoiceForm> today — reused, not re-implemented.
 * excludeInvoiceId: the invoice's own id in edit mode, so duplicate-checking
 *   doesn't flag an invoice against itself.
 * checklistOptions: the same options object already passed into
 *   <InvoiceChecklist> (departmentMandatory, categoryMandatory,
 *   showDepartmentField, showCategoryField, showBillingGst,
 *   billingGstRequired, canShowBranchField) — completeness flags (Phase 1.5)
 *   read the checklist's own output through this, so they can never
 *   disagree with what the checklist shows.
 */
export const useInvoiceFlags = ({
  formData,
  setFormData,
  findVendorById,
  findVendorByName,
  excludeInvoiceId = null,
  checklistOptions = {},
  isNetPayableEditEnabled = true,
  isCampaignFeatureEnabled = false,
  isErpIntegrationEnabled = false,
  isBankIntegrationEnabled = false,
  skip = false,
}) => {
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [duplicateListOpen, setDuplicateListOpen] = useState(false);

  const { data: organisationGstCredentials } = useGetOrganisationGstCredentialsQuery(undefined, { skip });
  const organisationGstins = useMemo(
    () =>
      (organisationGstCredentials || [])
        .map((entry) => entry?.gst ?? entry?.gstin ?? entry?.registrationNumber ?? "")
        .filter(Boolean),
    [organisationGstCredentials],
  );

  const { data: referenceData } = useGetInvoiceFlagReferenceDataQuery(undefined, { skip });

  const debouncedInvoiceNumber = useDebouncedValue(formData?.invoiceNumber, 400);
  const debouncedAmount = useDebouncedValue(formData?.amount, 400);
  const debouncedInvoiceDate = useDebouncedValue(formData?.invoiceDate, 400);

  const shouldLookupDuplicates =
    !skip &&
    Boolean(String(debouncedInvoiceNumber ?? "").trim()) &&
    Boolean(formData?.vendorId || formData?.vendorName);

  const { data: duplicateCandidates } = useGetDuplicateInvoiceCandidatesQuery(
    {
      vendorId: formData?.vendorId,
      vendorName: formData?.vendorName,
      invoiceNumber: debouncedInvoiceNumber,
      amount: debouncedAmount,
      invoiceDate: debouncedInvoiceDate,
      fileHash: formData?.fileHash,
      // Omitted entirely (not sent as a literal "null") when there's no real
      // invoice id yet — a new invoice has nothing to exclude itself from.
      ...(excludeInvoiceId ? { excludeInvoiceId } : {}),
    },
    { skip: !shouldLookupDuplicates },
  );

  // Duplicate Avoided By Edit — runs the exact same lookup a second time,
  // against the AI-read invoice number instead of the typed one, so the
  // rule can tell "would have collided" apart from "does collide." Only
  // fetched when there's actually a different number to check — if the
  // typed number still matches what was extracted, nothing was avoided and
  // this would just duplicate the query above.
  const extractedInvoiceNumber = formData?.extractedSnapshot?.invoiceNumber;
  const shouldLookupExtractedNumberDuplicates =
    !skip &&
    Boolean(String(extractedInvoiceNumber ?? "").trim()) &&
    Boolean(formData?.vendorId || formData?.vendorName) &&
    normalizeInvoiceNumberForCompare(extractedInvoiceNumber) !==
      normalizeInvoiceNumberForCompare(debouncedInvoiceNumber);

  const { data: extractedNumberDuplicateCandidates } = useGetDuplicateInvoiceCandidatesQuery(
    {
      vendorId: formData?.vendorId,
      vendorName: formData?.vendorName,
      invoiceNumber: extractedInvoiceNumber,
      amount: debouncedAmount,
      invoiceDate: debouncedInvoiceDate,
      fileHash: formData?.fileHash,
      // Same omission as the query above — see that comment.
      ...(excludeInvoiceId ? { excludeInvoiceId } : {}),
    },
    { skip: !shouldLookupExtractedNumberDuplicates },
  );

  // Campaign Reference Invalid — the approved-campaigns list for whichever
  // vendor is currently selected. Skipped when campaigns aren't a feature
  // for this org, or no vendor is selected yet; context.approvedCampaigns
  // staying undefined (vs. an empty array once genuinely loaded) is what
  // lets the rule tell "hasn't loaded" apart from "vendor has none."
  const shouldLookupCampaigns = !skip && isCampaignFeatureEnabled && Boolean(formData?.vendorId);
  const { data: approvedCampaigns } = useGetVendorCampaignsQuery(formData?.vendorId, {
    skip: !shouldLookupCampaigns,
  });

  const selectedVendor = useMemo(() => {
    if (!formData) return null;
    if (formData.vendorId && findVendorById) return findVendorById(formData.vendorId);
    if (formData.vendorName && findVendorByName) return findVendorByName(formData.vendorName);
    return null;
  }, [formData, findVendorById, findVendorByName]);

  // Vendor GSTIN / Branch Mismatch needs the vendor's registered branch
  // GSTINs, which the list-row `selectedVendor` object doesn't reliably
  // carry. Same detail endpoint + same arg derivation as InvoiceForm.jsx's
  // own useGetVendorQuery(selectedVendorId) call, so RTK Query dedupes this
  // against that call instead of firing a second network request.
  const selectedVendorId = String(formData?.vendorId || "").trim();
  const { data: selectedVendorDetail = null } = useGetVendorQuery(selectedVendorId, {
    skip: skip || !selectedVendorId,
  });

  // TDS Rate Overridden needs the statutory section→rate registry. Same
  // live source + same merge order (live sections, then the static
  // fallback) as TdsSelectionField.jsx's own buildTdsOptions(tdsSectionsData,
  // ...) call — not a second normalization system, just reusing the raw
  // rows the dropdown itself already fetches.
  const { data: tdsSectionsData = [] } = useGetTdsSectionsQuery(undefined, { skip });
  const tdsSections = useMemo(
    () => [...(tdsSectionsData || []), ...DEFAULT_TDS_SECTIONS],
    [tdsSectionsData],
  );

  // Branch / GSTIN Conflict needs the org's own branch→GSTIN registry. Same
  // query InvoiceForm.jsx uses for its own branch picker
  // (useGetOrganisationQuery), same normalizer (normalizeOrganisationBranchesFromApi)
  // — not a second source of truth for org branches.
  const { data: organisationData } = useGetOrganisationQuery(undefined, { skip });
  const organisationBranches = useMemo(
    () => normalizeOrganisationBranchesFromApi(organisationData),
    [organisationData],
  );

  const context = useMemo(
    () => ({
      organisationGstins,
      selectedVendor,
      selectedVendorDetail,
      tdsSections,
      organisationBranches,
      currentAccountingPeriod: referenceData?.currentAccountingPeriod,
      aiConfidenceThreshold: referenceData?.aiConfidenceThreshold,
      staleInvoiceThresholdDays: referenceData?.staleInvoiceThresholdDays,
      futureDatedToleranceDays: referenceData?.futureDatedToleranceDays,
      itcClaimWindowWarningDays: referenceData?.itcClaimWindowWarningDays,
      duplicateCandidates,
      extractedNumberDuplicateCandidates: shouldLookupExtractedNumberDuplicates
        ? extractedNumberDuplicateCandidates
        : undefined,
      excludeInvoiceId,
      checklistOptions,
      isNetPayableEditEnabled,
      approvedCampaigns: shouldLookupCampaigns ? approvedCampaigns : undefined,
      isErpIntegrationEnabled,
      isBankIntegrationEnabled,
    }),
    [
      organisationGstins,
      selectedVendor,
      selectedVendorDetail,
      tdsSections,
      organisationBranches,
      referenceData,
      duplicateCandidates,
      extractedNumberDuplicateCandidates,
      shouldLookupExtractedNumberDuplicates,
      excludeInvoiceId,
      checklistOptions,
      isNetPayableEditEnabled,
      shouldLookupCampaigns,
      approvedCampaigns,
      isErpIntegrationEnabled,
      isBankIntegrationEnabled,
    ],
  );

  const evaluatedInstances = useMemo(() => evaluateInvoiceFlags(formData, context), [formData, context]);
  const mergedFlags = useMemo(
    () => mergeFlagsWithResolutions(evaluatedInstances, formData?.flagResolutions || {}),
    [evaluatedInstances, formData?.flagResolutions],
  );

  const flags = useMemo(
    () =>
      mergedFlags
        .map((flag) => ({ ...flag, ...(INVOICE_FLAG_CATALOG[flag.key] || {}) }))
        .filter((flag) => flag.title), // drop anything whose catalog entry vanished (shouldn't happen, defensive)
    [mergedFlags],
  );

  const activeFlags = useMemo(
    () => flags.filter((flag) => flag.status === INVOICE_FLAG_STATUS.ACTIVE).sort(bySeverityThenTitle),
    [flags],
  );
  const resolvedFlags = useMemo(
    () => flags.filter((flag) => flag.status !== INVOICE_FLAG_STATUS.ACTIVE).sort(bySeverityThenTitle),
    [flags],
  );
  const blockingFlags = useMemo(
    () => activeFlags.filter((flag) => BLOCKING_SEVERITIES.has(flag.severity)),
    [activeFlags],
  );

  const isLowPriorityOnly = activeFlags.length > 0 && blockingFlags.length === 0;

  const blockingFlagsResolvedByOthers = useMemo(
    () => selectBlockingFlagsResolvedByOthers(resolvedFlags, user?.id ?? null),
    [resolvedFlags, user],
  );

  const setFlagResolutions = useCallback(
    (updater) => {
      setFormData((prev) => {
        if (!prev) return prev;
        const nextResolutions =
          typeof updater === "function" ? updater(prev.flagResolutions || {}) : updater;
        return { ...prev, flagResolutions: nextResolutions };
      });
    },
    [setFormData],
  );

  // instanceId — not key — is the resolution/reopen identity, so two
  // instances of the same flag type (e.g. HSN_SAC_CODE_MISSING on two
  // different lines) never share one record. record.key is stored
  // alongside so mergeFlagsWithResolutions can still resolve catalog
  // metadata for an auto-cleared entry once the instance itself is gone
  // (e.g. its line was removed). For every non-line flag instanceId ===
  // key, so this is unchanged behavior for anything shipped before this.
  const resolveFlag = useCallback(
    (instanceId, reason) => {
      const instance = evaluatedInstances.find((item) => item.instanceId === instanceId);
      setFlagResolutions((prev) => ({
        ...prev,
        [instanceId]: {
          key: instance?.key ?? instanceId,
          status: "RESOLVED",
          reason,
          resolvedBy: { id: user?.id ?? null, name: user?.name ?? user?.fullName ?? user?.email ?? "You" },
          resolvedAt: new Date().toISOString(),
          resolvedSituationSignature: instance?.situationSignature ?? null,
          reopenedBy: null,
          reopenedAt: null,
          reopenReason: null,
          history: prev[instanceId] ? [...(prev[instanceId].history || []), prev[instanceId]] : [],
        },
      }));
    },
    [evaluatedInstances, setFlagResolutions, user],
  );

  // Defensive guard, independent of whatever the UI restricts to: reopening
  // an instance that isn't currently firing (e.g. already AUTO_CLEARED, or
  // a line that's since been removed) would write a REOPENED record that
  // mergeFlagsWithResolutions can never surface again — not ACTIVE (no
  // matching instance to merge with), not AUTO_CLEARED (that branch only
  // handles RESOLVED records) — an invisible, orphaned record. Also refuses
  // reopening anything not currently RESOLVED (e.g. already REOPENED), so a
  // stale/duplicate/programmatic call can't corrupt the record. This does
  // not change the lifecycle model — mergeFlagsWithResolutions and its
  // status transitions are untouched — it only refuses to originate a
  // transition the model was never designed to represent.
  const reopenFlag = useCallback(
    (instanceId, reopenReason) => {
      const instance = evaluatedInstances.find((item) => item.instanceId === instanceId);
      if (!instance) return;

      setFlagResolutions((prev) => {
        const existing = prev[instanceId];
        if (!existing || existing.status !== "RESOLVED") return prev;
        return {
          ...prev,
          [instanceId]: {
            ...existing,
            status: "REOPENED",
            reopenedBy: { id: user?.id ?? null, name: user?.name ?? user?.fullName ?? user?.email ?? "You" },
            reopenedAt: new Date().toISOString(),
            reopenReason,
          },
        };
      });
    },
    [evaluatedInstances, setFlagResolutions, user],
  );

  const openFlagsDialog = useCallback(() => setDialogOpen(true), []);
  const closeFlagsDialog = useCallback(() => setDialogOpen(false), []);

  /** Called right before create/update — auto-opens the dialog on blocking flags, matches step 4 of the spec's UI flow. */
  const guardSubmit = useCallback(() => {
    if (blockingFlags.length === 0) return true;
    setDialogOpen(true);
    return false;
  }, [blockingFlags]);

  return {
    activeFlags,
    resolvedFlags,
    blockingFlags,
    blockingFlagsResolvedByOthers,
    isLowPriorityOnly,
    dialogOpen,
    openFlagsDialog,
    closeFlagsDialog,
    setDialogOpen,
    duplicateListOpen,
    setDuplicateListOpen,
    resolveFlag,
    reopenFlag,
    guardSubmit,
  };
};

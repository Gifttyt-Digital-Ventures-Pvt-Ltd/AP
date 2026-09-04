/**
 * §5.2 Vendor flags. Vendor GSTIN Not Active remains unbuilt: no GST-portal
 * verification/registration-status field exists anywhere in this codebase's
 * vendor data model (confirmed by search) — "the last check with the GST
 * portal" implies an integration this frontend has no data path for.
 */

import { hasConfiguredVendorTds, formatVendorTdsLabel, normalizeVendorTds } from "../../../vendors/utils/vendorTds";
import { matchesExtracted, matchesExtractedLoosely } from "../extractionComparison";
import { resolveVendorIsMsme, getMsmeDueDateValidationError, computeMsmeMaxDueDate } from "../msmePaymentDue";

// Normalizes a vendor-detail branch record the same way InvoiceForm.jsx's
// own `vendorBranches` useMemo does, so the comparison is against exactly
// what the form itself treats as "this branch's registered GSTIN."
const normalizeVendorDetailBranch = (branch) => ({
  branchCode: String(branch?.branchCode ?? branch?.branch_code ?? "").trim(),
  branchName: String(branch?.branchName ?? branch?.branch_name ?? "").trim(),
  gstin: String(branch?.gstin ?? branch?.mappedGstin ?? branch?.mapped_gstin ?? branch?.billingGstin ?? "")
    .trim()
    .toUpperCase(),
});

/** "This vendor is a registered MSME, so statutory payment deadlines apply." Real field: vendor.msme. */
export const evaluateVendorFlags = (formData, context = {}) => {
  const instances = [];
  const vendor = context.selectedVendor;

  if (vendor?.msme) {
    instances.push({
      key: "MSME_VENDOR",
      instanceId: "MSME_VENDOR",
      situationSignature: { vendorId: vendor.id ?? formData.vendorId ?? null },
      evidence: null,
    });
  }

  // "The payment terms exceed the MSME limit — 45 days, or 15 days if
  // there's no written agreement on file." Reuses MSME_MAX_PAYMENT_DAYS /
  // getMsmeDueDateValidationError / computeMsmeMaxDueDate
  // (msmePaymentDue.js) — the same 45-day threshold normalizeDueDateForInvoice
  // already clamps new due-date selections to, rather than a second MSME
  // due-date concept. The MD's 15-day "no written agreement" branch is NOT
  // implemented: no "written agreement on file" field exists anywhere in
  // this codebase's vendor data model (confirmed by search) — implementing
  // it would mean guessing at agreement status, so this only ever applies
  // the 45-day threshold. A real, reachable state despite the existing
  // toast+early-return submit guard (validateMandatoryPayload) — that guard
  // only stops a live create; an already-saved invoice (edited later, or
  // saved before this validation existed) can still carry a due date beyond
  // the limit.
  const vendorIsMsme = resolveVendorIsMsme({}, vendor);
  if (vendorIsMsme && formData.dueDate && formData.invoiceDate) {
    const msmeDueDateError = getMsmeDueDateValidationError({
      invoiceDate: formData.invoiceDate,
      dueDate: formData.dueDate,
      vendorIsMsme,
    });
    if (msmeDueDateError) {
      const maxDueDate = computeMsmeMaxDueDate(formData.invoiceDate);
      instances.push({
        key: "MSME_CREDIT_PERIOD_EXCEEDED",
        instanceId: "MSME_CREDIT_PERIOD_EXCEEDED",
        situationSignature: {
          vendorId: vendor?.id ?? formData.vendorId ?? null,
          dueDate: formData.dueDate,
          maxDueDate,
        },
        evidence: { dueDate: formData.dueDate, maxDueDate },
      });
    }
  }

  // "This vendor hasn't been approved yet. The invoice can be captured but
  // will wait for vendor approval before moving on." Reads
  // formData.vendorRequestPending directly — set from matchedVendor's own
  // status at both initial load (invoicePayloadBuilders.js) and on every
  // live vendor selection (InvoiceForm.jsx), and already displayed
  // elsewhere in the form today, not a new/unproven signal.
  if (formData.vendorRequestPending) {
    instances.push({
      key: "VENDOR_APPROVAL_PENDING",
      instanceId: "VENDOR_APPROVAL_PENDING",
      situationSignature: { vendorId: vendor?.id ?? formData.vendorId ?? null },
      evidence: null,
    });
  }

  // "This vendor is inactive, blocked, or blacklisted." Only "Inactive" is
  // actually representable in this app's data model — VENDOR_STATUS_OPTIONS
  // (GeneralInformationSection.jsx) is exactly ["Active", "Inactive"], no
  // "Blocked"/"Blacklisted" state exists anywhere (confirmed by search), so
  // this covers the one real sub-case rather than guessing at the others.
  // Reads context.selectedVendorDetail (not the list-row selectedVendor
  // above) — vendorStatus hasn't been proven reliable on the list row, same
  // caution already applied to vendorBranches/bankAccounts/tdsMapping.
  const vendorDetailStatus = String(context.selectedVendorDetail?.vendorStatus ?? "").trim();
  if (context.selectedVendorDetail && vendorDetailStatus === "Inactive") {
    instances.push({
      key: "VENDOR_INACTIVE",
      instanceId: "VENDOR_INACTIVE",
      situationSignature: {
        vendorId: context.selectedVendorDetail?.id ?? formData.vendorId ?? null,
        vendorStatus: vendorDetailStatus,
      },
      evidence: { vendorStatus: vendorDetailStatus },
    });
  }

  // "The campaign or coupon code entered doesn't belong to this vendor, or
  // isn't approved." context.approvedCampaigns is only an array once
  // useGetVendorCampaignsQuery has genuinely resolved (undefined while
  // loading or when campaigns aren't a feature for this org) — evaluating
  // before then would false-fire on a vendor that actually has approved
  // campaigns the query just hasn't returned yet.
  // Only checked when campaignId is empty: a non-empty campaignId means the
  // user picked a real option from the dropdown (applyCampaignSelection,
  // InvoiceCampaignFields.jsx), already validated against this same list at
  // selection time — this flag exists specifically for the free-typed
  // bypass (handleCampaignNameInput/handleReferenceInput), which clears
  // campaignId while still writing campaignName/referenceNumber.
  if (Array.isArray(context.approvedCampaigns)) {
    const campaignId = String(formData.campaignId ?? "").trim();
    const campaignName = String(formData.campaignName ?? "").trim();
    const referenceNumber = String(formData.referenceNumber ?? "").trim();
    const isCampaignEmpty = !campaignId && !campaignName && !referenceNumber;

    if (!campaignId && !isCampaignEmpty) {
      const normalize = (value) => String(value ?? "").trim().toLowerCase();
      const nameIsApproved =
        !campaignName ||
        context.approvedCampaigns.some((campaign) => normalize(campaign?.name) === normalize(campaignName));
      const referenceIsApproved =
        !referenceNumber ||
        context.approvedCampaigns.some(
          (campaign) => normalize(campaign?.referenceCode) === normalize(referenceNumber),
        );

      if (!nameIsApproved || !referenceIsApproved) {
        instances.push({
          key: "CAMPAIGN_REFERENCE_INVALID",
          instanceId: "CAMPAIGN_REFERENCE_INVALID",
          situationSignature: { campaignName, referenceNumber },
          evidence: { campaignName, referenceNumber },
        });
      }
    }
  }

  // "The vendor branch you picked is registered under a different GSTIN
  // than the one selected." Ground truth is context.selectedVendorDetail
  // (the detail endpoint, not the list-row selectedVendor above) because
  // only the detail response reliably carries vendorBranches. The currently
  // selected branch is identified the same way InvoiceForm.jsx's own
  // selectedVendorBranchValue does — vendorBranchCode first, vendorBranchName
  // as fallback — and only matched against a real branch record; an
  // unmatched/"phantom" branch (extraction-only, not yet a real vendor
  // branch — see InvoiceForm.jsx's availableVendorBranches) has nothing
  // reliable to compare against, so the rule stays silent rather than
  // guessing. Compares formData.vendorBranchGstin (what's currently
  // associated with the invoice) against the matched branch's own
  // registered gstin — not formData.gstin, a different, already-covered
  // concept.
  const vendorBranchCode = String(formData.vendorBranchCode ?? "").trim();
  const vendorBranchName = String(formData.vendorBranchName ?? "").trim();
  const vendorDetailBranches = Array.isArray(context.selectedVendorDetail?.vendorBranches)
    ? context.selectedVendorDetail.vendorBranches
    : null;

  if ((vendorBranchCode || vendorBranchName) && vendorDetailBranches) {
    const normalizedBranches = vendorDetailBranches.map(normalizeVendorDetailBranch);
    const matchedBranch = vendorBranchCode
      ? normalizedBranches.find((branch) => branch.branchCode && branch.branchCode === vendorBranchCode)
      : normalizedBranches.find((branch) => branch.branchName && branch.branchName === vendorBranchName);

    const invoiceBranchGstin = String(formData.vendorBranchGstin ?? "").trim().toUpperCase();

    if (matchedBranch && matchedBranch.gstin && invoiceBranchGstin && matchedBranch.gstin !== invoiceBranchGstin) {
      instances.push({
        key: "VENDOR_GSTIN_BRANCH_MISMATCH",
        instanceId: "VENDOR_GSTIN_BRANCH_MISMATCH",
        situationSignature: {
          vendorBranchCode: matchedBranch.branchCode || null,
          vendorBranchName: matchedBranch.branchName || null,
          invoiceBranchGstin,
          registeredBranchGstin: matchedBranch.gstin,
        },
        evidence: { invoiceBranchGstin, registeredBranchGstin: matchedBranch.gstin },
      });
    }
  }

  // "The vendor master says TDS applies, but 'No TDS' is selected on this
  // invoice." Reuses hasConfiguredVendorTds (vendors/utils/vendorTds.js)
  // rather than re-deriving what counts as a "meaningful" mapping — it
  // already excludes the incomplete "custom TDS pending" state and handles
  // being passed the vendor object directly (it resolves .tdsMapping off
  // it internally). formData.tds falsy ("" or unset) is "No TDS" — the
  // same convention parseTdsSelection/parseTdsRate use everywhere else in
  // this codebase; every new invoice starts with tds: "" unconditionally.
  // Distinct from §5.5's "TDS Not Deducted" (a broader vendor-and-value
  // threshold check) — out of scope here, not implemented.
  if (context.selectedVendorDetail && hasConfiguredVendorTds(context.selectedVendorDetail) && !formData.tds) {
    const vendorTds = normalizeVendorTds(context.selectedVendorDetail);
    instances.push({
      key: "TDS_MAPPING_NOT_APPLIED",
      instanceId: "TDS_MAPPING_NOT_APPLIED",
      situationSignature: {
        vendorId: formData.vendorId ?? null,
        vendorTdsSectionCode: vendorTds.sectionCode || null,
        vendorTdsRate: vendorTds.rate ?? null,
      },
      evidence: { vendorTdsLabel: formatVendorTdsLabel(vendorTds) },
    });
  }

  // "There's no active bank account on file, so this invoice can't be paid
  // later." Existence check, not a per-account completeness check (that's
  // validateVendorBankAccounts's job, a save-time gate on the vendor record
  // itself — unrelated to this flag). Reads context.selectedVendorDetail
  // .bankAccounts (the array model VendorBankDetailsEditor.jsx/
  // ViewBankDetailsSection.jsx actually read/write) — NOT the legacy flat
  // vendor.bank_name/account_number/ifsc_code fields, which no current UI
  // writes to. Silent (not fired) when bankAccounts isn't an array at all —
  // covers both "vendor detail not loaded yet" and the one unconfirmed
  // assumption (that the backend really does return this under the
  // camelCase `bankAccounts` key) failing safe rather than false-firing for
  // every vendor. isActive missing is treated as active, matching
  // createEmptyBankAccount's own default of true.
  //
  // Gated on context.isBankIntegrationEnabled (RBACContext.jsx's
  // isConnectedBankingEnabled, threaded in via useInvoiceFlags.js) — for an
  // org without Connected Banking, whether a vendor has bank details on file
  // isn't this app's concern to flag.
  const vendorBankAccounts = Array.isArray(context.selectedVendorDetail?.bankAccounts)
    ? context.selectedVendorDetail.bankAccounts
    : null;

  if (context.isBankIntegrationEnabled && vendorBankAccounts) {
    const hasActiveBankAccount = vendorBankAccounts.some(
      (account) =>
        account?.isActive !== false &&
        [account?.bankName, account?.accountNumber, account?.ifscCode].some((value) =>
          String(value ?? "").trim(),
        ),
    );

    if (!hasActiveBankAccount) {
      instances.push({
        key: "VENDOR_BANK_DETAILS_MISSING",
        instanceId: "VENDOR_BANK_DETAILS_MISSING",
        situationSignature: { vendorId: formData.vendorId ?? null },
        evidence: null,
      });
    }
  }

  // "The vendor name or GSTIN on the document doesn't match the vendor
  // you've selected." §5.2's "always evaluated, not confidence-gated"
  // sibling of VENDOR_SWITCHED_AFTER_EXTRACTION/VENDOR_GSTIN_CHANGED_AFTER_EXTRACTION
  // (extractionMismatch.js, both confidence-gated) — the exact same shape as
  // DOCUMENT_TYPE_MISMATCH/DOCUMENT_TYPE_CHANGED_AFTER_EXTRACTION
  // (organisationDocument.js): fires unconditionally on a real divergence,
  // and is suppressed whenever the more specific §5.7 vendor-switch flag
  // fires too (see constants/invoiceFlags.js's VENDOR_SWITCHED_AFTER_EXTRACTION
  // entry — the MD's own §5.7 overlap table names exactly this pair). Name
  // compared loosely, GSTIN strictly — the same comparators
  // extractionMismatch.js's own fields use. Only a GSTIN-only divergence
  // (same vendor, different GSTIN) is deliberately left co-occurring with
  // VENDOR_GSTIN_CHANGED_AFTER_EXTRACTION — the MD's overlap table doesn't
  // list that pair, so nothing suppresses it.
  const extractedSnapshot = formData.extractedSnapshot;
  if (extractedSnapshot) {
    const currentVendorName = String(formData.vendorName ?? "").trim();
    const currentVendorGstin = String(formData.gstin ?? "").trim();
    const nameMismatches =
      currentVendorName && !matchesExtractedLoosely(extractedSnapshot, "vendorName", currentVendorName);
    const gstinMismatches =
      currentVendorGstin && !matchesExtracted(extractedSnapshot, "vendorGstin", currentVendorGstin);

    if (nameMismatches || gstinMismatches) {
      instances.push({
        key: "VENDOR_MISMATCH",
        instanceId: "VENDOR_MISMATCH",
        situationSignature: {
          extractedVendorName: String(extractedSnapshot.vendorName ?? "").trim() || null,
          extractedVendorGstin: String(extractedSnapshot.vendorGstin ?? "").trim() || null,
          currentVendorName: currentVendorName || null,
          currentVendorGstin: currentVendorGstin || null,
        },
        evidence: {
          extractedVendorName: extractedSnapshot.vendorName,
          extractedVendorGstin: extractedSnapshot.vendorGstin,
          currentVendorName,
          currentVendorGstin,
        },
      });
    }
  }

  return instances;
};

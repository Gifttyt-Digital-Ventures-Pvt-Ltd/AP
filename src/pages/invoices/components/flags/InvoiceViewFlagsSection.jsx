import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import InvoiceFlagsStrip from "./InvoiceFlagsStrip";
import InvoiceFlagsDialog from "./InvoiceFlagsDialog";
import { useInvoiceFlags } from "../../hooks/useInvoiceFlags";
import { buildInvoiceEditFormData } from "../../utils/invoiceFormData";
import { useUpdateInvoiceFlagResolutionsMutation } from "../../../../Services/apis/invoicesVendorsApi";
import { extractApiErrorDetail } from "../../../../utils/approvalWorkflow";

/**
 * Invoice Flags for the View Invoice page — the maker's own "View" and the
 * checker/approver's "View" (including the surface where Verify/Approve/
 * Reject buttons render directly, see ViewDialog.jsx's own
 * approvalActionConfig). Read-only for the invoice itself — Resolve is the
 * one mutation this screen allows, persisted via a dedicated endpoint
 * (PUT /invoices/{id}/flags/resolutions) rather than the normal invoice
 * Save, since View Invoice has no Save action. Fix in Form never edits
 * anything here — it navigates to Edit Invoice and reuses that flow's own
 * field-navigation behavior (see onFixInFormNavigate).
 *
 * Deliberately self-contained rather than sharing ViewDialog's own
 * checklistFormData: keeping useInvoiceFlags/InvoiceFlagsStrip/
 * InvoiceFlagsDialog out of ViewDialog entirely is the whole point of this
 * component existing — ViewDialog is shared by 8 different modules
 * (Payments, Accounting, Order Tracking, Tax Management, GST Recon,
 * Campaigns, Invoices, Approvals), and only the last two want flags.
 * Importing this feature directly into ViewDialog previously pulled its
 * whole dependency graph into every one of those 8 callers' bundle chunk,
 * regardless of use. Rebuilding formData here (a second time — the same
 * pattern InvoiceReadOnlyDetails.jsx already uses independently, a third
 * time counting that one) is a small, cheap, synchronous cost in exchange
 * for ViewDialog never importing this feature's code at all.
 *
 * Owning the mutation call directly here (rather than threading it through
 * InvoicesPage.jsx/useApprovalsInvoiceEdit.jsx as a callback prop, the way
 * internal-checklist/funding do) is deliberate: this component already owns
 * the only state (formData.flagResolutions, built by useInvoiceFlags'
 * unmodified resolveFlag) the request body needs, and it's the one shared
 * component for both the maker and checker/approver View surfaces — putting
 * the mutation call here avoids duplicating a near-identical handler in both
 * owner files for no benefit.
 */
const InvoiceViewFlagsSection = ({
  selectedInvoice,
  viewDialogOpen,
  findVendorById,
  findVendorByName,
  isCategoryFeatureEnabled,
  isCampaignFeatureEnabled,
  invoiceFlagsOrgContext = {},
  // Gates Resolve — per the confirmed backend contract's own permission/
  // status rules (Maker/Checker/Corp-Admin/Master-Admin, excludes
  // Approvers, allowed through Approved/Pending Payment, blocked on
  // Paid/Cancelled/Rejected/Vendor Rejected). Computed by the caller via
  // canResolveInvoiceFlag(selectedInvoice, identity).
  canResolveInvoiceFlags = false,
  // Gates Fix in Form — the existing canEditInvoice permission/status
  // logic, computed by the caller via canEdit(selectedInvoice). The button
  // must not render at all for a user who can't actually edit the
  // invoice — never shown-then-refused with a toast.
  canEditSelectedInvoice = false,
  // Navigates to Edit Invoice and reuses the existing Fix-in-Form field
  // navigation there (see InvoicesPage.jsx's handleFixInvoiceFlagInFormFromView
  // / useApprovalsInvoiceEdit.jsx's counterpart). Only ever invoked when
  // canEditSelectedInvoice is true, since it's only ever wired up then.
  onFixInFormNavigate,
  // Called after a Resolve successfully persists, with the backend's
  // returned flagResolutions map, so the caller can sync its own
  // selectedInvoice/viewInvoice state — otherwise a subsequent Fix in Form
  // (which reopens Edit from that same state) would reflect a stale,
  // pre-resolve snapshot.
  onFlagResolutionsSynced,
}) => {
  const seedFormData = useMemo(
    () =>
      selectedInvoice
        ? buildInvoiceEditFormData(selectedInvoice, {
            isCategoryFeatureEnabled,
            isCampaignFeatureEnabled,
            findVendorByName,
            findVendorById,
          })
        : null,
    [
      selectedInvoice,
      isCategoryFeatureEnabled,
      isCampaignFeatureEnabled,
      findVendorByName,
      findVendorById,
    ],
  );

  const [formData, setLocalFormData] = useState(seedFormData);

  // Resets local state to match whenever the caller hands us a different
  // invoice (or a freshly-synced one, see onFlagResolutionsSynced) — the
  // only local mutation this component ever makes (flagResolutions, via
  // resolveFlag below) is immediately persisted, so there's never an
  // unsaved local change this reset could clobber.
  useEffect(() => {
    setLocalFormData(seedFormData);
  }, [seedFormData]);

  const [updateInvoiceFlagResolutions] = useUpdateInvoiceFlagResolutionsMutation();

  const persistFlagResolutions = useCallback(
    async (invoiceId, nextFlagResolutions, previousFlagResolutions) => {
      try {
        const response = await updateInvoiceFlagResolutions({
          id: invoiceId,
          // Complete map, exactly as resolveFlag constructed it — never
          // reduced to just the newly-resolved entry, per the contract.
          body: { flagResolutions: nextFlagResolutions },
        }).unwrap();
        onFlagResolutionsSynced?.(response?.flagResolutions ?? nextFlagResolutions);
      } catch (error) {
        toast.error(extractApiErrorDetail(error) || "Failed to save flag resolution");
        setLocalFormData((prev) =>
          prev ? { ...prev, flagResolutions: previousFlagResolutions } : prev,
        );
      }
    },
    [updateInvoiceFlagResolutions, onFlagResolutionsSynced],
  );

  // The setFormData useInvoiceFlags is given — resolveFlag itself is
  // completely unmodified (still just calls setFormData(prev => ({...prev,
  // flagResolutions: next}))), this wrapper only watches for that one field
  // changing and persists it. No resolve-record-building logic is
  // duplicated here; this only reacts to what resolveFlag already built.
  const setFormData = useCallback(
    (updater) => {
      setLocalFormData((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        if (
          prev &&
          next &&
          next.flagResolutions !== prev.flagResolutions &&
          selectedInvoice?.id
        ) {
          persistFlagResolutions(selectedInvoice.id, next.flagResolutions, prev.flagResolutions);
        }
        return next;
      });
    },
    [persistFlagResolutions, selectedInvoice?.id],
  );

  // Same evaluateInvoiceFlags + mergeFlagsWithResolutions lifecycle the
  // maker/checker edit forms use, same live org/vendor context, scoped to
  // whichever invoice this dialog is currently showing — not the caller's
  // own in-progress edit-form formData, if any (a linked-invoice "View" can
  // be open for a different invoice entirely).
  const invoiceFlags = useInvoiceFlags({
    formData,
    setFormData,
    findVendorById,
    findVendorByName,
    excludeInvoiceId: selectedInvoice?.id ?? null,
    checklistOptions: {
      departmentMandatory: invoiceFlagsOrgContext.departmentMandatory,
      categoryMandatory: invoiceFlagsOrgContext.categoryMandatory,
      showDepartmentField: invoiceFlagsOrgContext.showDepartmentField,
      showCategoryField: invoiceFlagsOrgContext.showCategoryField,
    },
    isCampaignFeatureEnabled,
    isErpIntegrationEnabled: invoiceFlagsOrgContext.isErpIntegrationEnabled,
    isBankIntegrationEnabled: invoiceFlagsOrgContext.isBankIntegrationEnabled,
    isChecklistFlagsEnabled: invoiceFlagsOrgContext.isChecklistFlagsEnabled,
    skip: !viewDialogOpen || !selectedInvoice,
  });

  return (
    <>
      {invoiceFlags.activeFlags.length > 0 ? (
        <div className="mb-4">
          <InvoiceFlagsStrip
            activeFlags={invoiceFlags.activeFlags}
            isLowPriorityOnly={invoiceFlags.isLowPriorityOnly}
            onOpen={invoiceFlags.openFlagsDialog}
          />
        </div>
      ) : invoiceFlags.resolvedFlags.length > 0 ? (
        // No active flags, but this invoice has resolved-flag history worth
        // being able to see — InvoiceFlagsStrip itself only ever renders for
        // active flags (correct for the maker/checker edit forms too,
        // unchanged), so this is the one bit of view-specific markup here,
        // not a new reusable flag component.
        <button
          type="button"
          onClick={invoiceFlags.openFlagsDialog}
          className="mb-4 self-start text-sm font-medium text-button-primary underline-offset-2 hover:underline"
          data-testid="invoice-flags-resolved-only-link"
        >
          {invoiceFlags.resolvedFlags.length} invoice flag
          {invoiceFlags.resolvedFlags.length === 1 ? "" : "s"} resolved — view
        </button>
      ) : null}

      <InvoiceFlagsDialog
        open={invoiceFlags.dialogOpen}
        onOpenChange={invoiceFlags.setDialogOpen}
        activeFlags={invoiceFlags.activeFlags}
        resolvedFlags={invoiceFlags.resolvedFlags}
        blockingFlagsResolvedByOthers={invoiceFlags.blockingFlagsResolvedByOthers}
        onResolveFlag={canResolveInvoiceFlags ? invoiceFlags.resolveFlag : undefined}
        onFixInForm={canEditSelectedInvoice ? onFixInFormNavigate : undefined}
      />
    </>
  );
};

export default InvoiceViewFlagsSection;

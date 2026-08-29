import React, { useMemo } from "react";
import InvoiceFlagsStrip from "./InvoiceFlagsStrip";
import InvoiceFlagsDialog from "./InvoiceFlagsDialog";
import { useInvoiceFlags } from "../../hooks/useInvoiceFlags";
import { buildInvoiceEditFormData } from "../../utils/invoiceFormData";

/**
 * Read-only Invoice Flags for the View Invoice page — the maker's own
 * "View" and the checker/approver's "View" (including the surface where
 * Verify/Approve/Reject buttons render directly, see ViewDialog.jsx's own
 * approvalActionConfig).
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
 * Read-only by omission, not a mode flag: no onResolveFlag/onFixInForm/
 * onReopenFlag is ever passed to InvoiceFlagsDialog below, so none of those
 * actions render — see InvoiceFlagCard.jsx/InvoiceFlagsDialog.jsx/
 * DuplicateInvoicesListDialog.jsx's own conditional-callback logic. "View
 * and Resolve" flags (Duplicate Invoice / Duplicate Avoided By Edit) still
 * let you open the evidence list — that's inspection, not a mutation — but
 * the Resolve button inside that evidence dialog is hidden the same way.
 */
const InvoiceViewFlagsSection = ({
  selectedInvoice,
  viewDialogOpen,
  findVendorById,
  findVendorByName,
  isCategoryFeatureEnabled,
  isCampaignFeatureEnabled,
  invoiceFlagsOrgContext = {},
}) => {
  const formData = useMemo(
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

  // Same evaluateInvoiceFlags + mergeFlagsWithResolutions lifecycle the
  // maker/checker edit forms use, same live org/vendor context, scoped to
  // whichever invoice this dialog is currently showing — not the caller's
  // own in-progress edit-form formData, if any (a linked-invoice "View" can
  // be open for a different invoice entirely). setFormData is a no-op:
  // nothing here ever renders a control that could call it.
  const invoiceFlags = useInvoiceFlags({
    formData,
    setFormData: () => {},
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
      />
    </>
  );
};

export default InvoiceViewFlagsSection;

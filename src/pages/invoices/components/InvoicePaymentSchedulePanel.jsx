import React, { useEffect, useMemo, useState } from "react";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import {
  useGetDocumentPaymentScheduleQuery,
  useUpdateDocumentPaymentScheduleMutation,
} from "../../../Services/apis/paymentSchedulesApi";
import { formatCurrency, normalizeCurrencyCode } from "../../../utils/currency";
import { extractApiErrorDetail } from "../../../utils/approvalWorkflow";
import usePaymentTermsSubscription from "../../../hooks/usePaymentTermsSubscription";
import PoPaymentScheduleSection from "../../purchase-orders/components/PoPaymentScheduleSection";
import { isProformaInvoice } from "../constants/proformaInvoice";
import {
  buildPaymentSchedulePayload,
  getPaymentScheduleSummary,
  normalizePaymentScheduleRows,
  validatePaymentScheduleRows,
} from "../../purchase-orders/utils/poPaymentSchedule";

const firstValue = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== "");

const getInvoiceId = (invoice = {}) =>
  firstValue(
    invoice.id,
    invoice.invoiceId,
    invoice.invoice_id,
    invoice.taxInvoiceId,
    invoice.tax_invoice_id,
  );

const getDocumentGrossTotal = (document = {}, invoice = {}) =>
  Number(
    firstValue(
      document.totalAmount,
      document.total_amount,
      document.grossTotal,
      document.gross_total,
      document.documentGrossTotal,
      document.document_gross_total,
      invoice.invoiceTotal,
      invoice.invoice_total,
      invoice.totalAmount,
      invoice.total_amount,
    ),
  ) || 0;

const isPaymentScheduleAvailable = (source = {}) =>
  source?.paymentScheduleAvailable === true;

const InvoicePaymentSchedulePanel = ({ invoice }) => {
  const documentId = getInvoiceId(invoice);
  const documentType = isProformaInvoice(invoice) ? "PI" : "TI";
  const { isPaymentTermsEnabled } = usePaymentTermsSubscription();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draftRows, setDraftRows] = useState([]);
  const invoiceRows = useMemo(() => normalizePaymentScheduleRows(invoice || {}), [invoice]);
  const invoiceScheduleAvailable =
    isPaymentScheduleAvailable(invoice || {}) || invoiceRows.length > 0;
  const {
    data: documentScheduleData,
    isFetching: loadingSchedule,
    isError: scheduleLoadError,
    refetch,
  } = useGetDocumentPaymentScheduleQuery(
    { documentType, documentId },
    { skip: !isPaymentTermsEnabled || !documentId || !invoiceScheduleAvailable },
  );
  const [updatePaymentSchedule, { isLoading: saving }] =
    useUpdateDocumentPaymentScheduleMutation();

  const documentScheduleSource = useMemo(
    () =>
      Array.isArray(documentScheduleData)
        ? { paymentSchedule: documentScheduleData }
        : {
            ...(documentScheduleData || {}),
            paymentSchedule:
              documentScheduleData?.paymentSchedule ??
              documentScheduleData?.payment_schedule ??
              documentScheduleData?.rows ??
              documentScheduleData?.schedule,
          },
    [documentScheduleData],
  );
  const documentRows = useMemo(
    () => normalizePaymentScheduleRows(documentScheduleSource || {}),
    [documentScheduleSource],
  );
  const scheduleRows = documentRows.length ? documentRows : invoiceRows;
  const documentScheduleAvailable =
    isPaymentScheduleAvailable(documentScheduleSource || {}) ||
    invoiceScheduleAvailable ||
    scheduleRows.length > 0;
  const documentGrossTotal = getDocumentGrossTotal(documentScheduleSource || {}, invoice || {});
  const currency = normalizeCurrencyCode(
    firstValue(
      documentScheduleSource?.currency,
      documentScheduleSource?.currency_code,
      invoice?.currency,
      invoice?.currencyCode,
      invoice?.currency_code,
    ) || "INR",
  );
  const canEditSchedule = Boolean(
    isPaymentTermsEnabled && documentId && documentScheduleAvailable && scheduleRows.length > 0,
  );

  useEffect(() => {
    if (!dialogOpen) return;
    setDraftRows(scheduleRows);
  }, [dialogOpen, scheduleRows]);

  if (!documentId && scheduleRows.length === 0) return null;
  if (!documentScheduleAvailable && scheduleRows.length === 0 && !loadingSchedule) return null;

  const handleSave = async () => {
    const scheduleErrors = validatePaymentScheduleRows(draftRows);
    if (scheduleErrors.length > 0) {
      toast.error(scheduleErrors[0]);
      return;
    }

    const scheduleSummary = getPaymentScheduleSummary(draftRows, documentGrossTotal);
    if (draftRows.length > 0 && Math.abs(scheduleSummary.difference) > 0.009) {
      toast.error("Payment Schedule total must match the document gross total.");
      return;
    }

    try {
      await updatePaymentSchedule({
        documentType,
        documentId,
        body: { paymentSchedule: buildPaymentSchedulePayload(draftRows) },
      }).unwrap();
      toast.success("Payment Schedule updated");
      setDialogOpen(false);
      refetch?.();
    } catch (error) {
      toast.error(extractApiErrorDetail(error) || "Failed to update Payment Schedule");
    }
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Payment Schedule</h3>
          <p className="text-xs text-muted-foreground">
            Propagated from the matched PO schedule.
          </p>
        </div>
        {canEditSchedule ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setDialogOpen(true)}
            disabled={saving || loadingSchedule}
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Pencil className="mr-2 h-4 w-4" />
            )}
            Edit Payment Schedule
          </Button>
        ) : null}
      </div>

      {loadingSchedule && scheduleRows.length === 0 ? (
        <div className="rounded border bg-slate-50/60 p-4 text-sm text-muted-foreground">
          Loading payment schedule...
        </div>
      ) : null}

      {scheduleLoadError && scheduleRows.length === 0 && canEditSchedule ? (
        <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Could not load the payment schedule. Existing invoice flow is unchanged.
        </div>
      ) : null}

      {documentScheduleAvailable && !loadingSchedule && scheduleRows.length === 0 ? (
        <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Payment Schedule is available for this matched document, but schedule rows were not returned.
        </div>
      ) : null}

      {scheduleRows.length ? (
        <PoPaymentScheduleSection
          rows={scheduleRows}
          documentGrossTotal={documentGrossTotal}
          formatCurrency={(amount) => formatCurrency(amount, currency)}
          readOnly
        />
      ) : null}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit Payment Schedule</DialogTitle>
            <DialogDescription>
              Update the matched document schedule. Backend propagation remains authoritative across modules.
            </DialogDescription>
          </DialogHeader>
          <PoPaymentScheduleSection
            rows={draftRows}
            documentGrossTotal={documentGrossTotal}
            formatCurrency={(amount) => formatCurrency(amount, currency)}
            onChange={setDraftRows}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Payment Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default InvoicePaymentSchedulePanel;

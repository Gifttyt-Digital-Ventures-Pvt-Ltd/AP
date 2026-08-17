import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLazyGetInvoiceQuery, useLazyGetInvoiceHistoryQuery } from "../../../Services/apis/invoicesVendorsApi";
import { getInvoiceStatusBadgeClass } from "../../../utils/approvalWorkflow";
import { isProformaInvoice } from "../../invoices/constants/proformaInvoice";
import { normalizeInvoiceHistoryEntries } from "../../invoices/utils/invoiceHistory";
import ViewDialog from "../../invoices/components/ViewDialog";
import InvoicePdfPreview from "../../invoices/components/InvoicePdfPreview";

const getInvoiceFileUrl = (invoice = {}) =>
  invoice.invoiceFileUrl ||
  invoice.invoice_file_url ||
  invoice.fileUrl ||
  invoice.file_url ||
  invoice.documentUrl ||
  invoice.document_url ||
  null;

/**
 * Read-only PI/TI preview opened in place from the document chain's PI/TI
 * indicators (spec §7) — same read-only-stub reuse pattern as
 * OrderTrackingPoPreviewDialog.jsx / AccountingQueuePreviewDialog.jsx, so it
 * stays on Order Tracking instead of navigating to Invoices. PI and TI are
 * both invoice records in this app (differentiated by documentType), so one
 * component covers both — showProformaInvoiceFields is derived from the
 * fetched invoice's own documentType, not assumed from which chain slot it
 * was opened from.
 */
const OrderTrackingInvoicePreviewDialog = ({ invoiceId, onClose }) => {
  const [fetchInvoice] = useLazyGetInvoiceQuery();
  const [fetchInvoiceHistory] = useLazyGetInvoiceHistoryQuery();
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceHistory, setInvoiceHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [viewTab, setViewTab] = useState("details");
  const [pdfZoom, setPdfZoom] = useState(100);

  useEffect(() => {
    if (!invoiceId) {
      setSelectedInvoice(null);
      return undefined;
    }

    let cancelled = false;
    fetchInvoice(invoiceId)
      .unwrap()
      .then((invoice) => {
        if (cancelled) return;
        setSelectedInvoice(invoice);
        setLoadingHistory(true);
        return fetchInvoiceHistory(invoiceId)
          .unwrap()
          .then((history) => {
            if (!cancelled) setInvoiceHistory(normalizeInvoiceHistoryEntries(history));
          })
          .catch(() => {
            if (!cancelled) setInvoiceHistory([]);
          })
          .finally(() => {
            if (!cancelled) setLoadingHistory(false);
          });
      })
      .catch(() => {
        if (!cancelled) {
          toast.error("Failed to load invoice.");
          onClose?.();
        }
      });

    return () => {
      cancelled = true;
    };
  }, [invoiceId, fetchInvoice, fetchInvoiceHistory, onClose]);

  if (!selectedInvoice) return null;

  return (
    <ViewDialog
      viewDialogOpen={Boolean(selectedInvoice)}
      setViewDialogOpen={(open) => {
        if (!open) {
          setSelectedInvoice(null);
          setViewTab("details");
          onClose?.();
        }
      }}
      selectedInvoice={selectedInvoice}
      renderPdfPreview={(props = {}) => (
        <InvoicePdfPreview {...props} getInvoiceFileUrl={getInvoiceFileUrl} setPdfZoom={setPdfZoom} />
      )}
      pdfZoom={pdfZoom}
      viewPreviewError={false}
      setViewPreviewError={() => {}}
      getStatusBadgeClass={getInvoiceStatusBadgeClass}
      viewTab={viewTab}
      setViewTab={setViewTab}
      invoiceHistory={invoiceHistory}
      loadingHistory={loadingHistory}
      canEdit={() => false}
      handleEditInvoice={() => {}}
      canCancel={() => false}
      handleCancelInvoice={() => {}}
      showProformaInvoiceFields={isProformaInvoice(selectedInvoice)}
      showErpIntegrationFields
      showAccountingLockBanner={false}
    />
  );
};

export default OrderTrackingInvoicePreviewDialog;

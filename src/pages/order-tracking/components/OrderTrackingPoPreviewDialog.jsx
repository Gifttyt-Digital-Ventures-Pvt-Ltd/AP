import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLazyGetPurchaseOrderByIdQuery } from "../../../Services/apis/purchaseOrdersMasterDataApi";
import PoDetailsDialog from "../../purchase-orders/components/PoDetailsDialog";
import { statusColors as poStatusColors } from "../../purchase-orders/constants";
import { normalizePurchaseOrder, formatDate as formatPoDate, formatCurrency as formatPoCurrency } from "../../purchase-orders/utils";

/**
 * Read-only PO preview opened in place from the document chain's PO
 * indicator (spec §7: "clickable and opens that document") — reuses
 * PoDetailsDialog + the same read-only-stub pattern already established by
 * AccountingQueuePreviewDialog.jsx (src/pages/accounting/components/), so
 * clicking a PO number stays on Order Tracking instead of navigating to
 * /purchase-orders. Every action handler is a no-op and canManagePo/
 * canApprovePo are false — this is a preview, not an edit surface.
 */
const OrderTrackingPoPreviewDialog = ({ poId, onClose }) => {
  const [fetchPurchaseOrder] = useLazyGetPurchaseOrderByIdQuery();
  const [selectedPO, setSelectedPO] = useState(null);

  useEffect(() => {
    if (!poId) {
      setSelectedPO(null);
      return undefined;
    }

    let cancelled = false;
    fetchPurchaseOrder(poId)
      .unwrap()
      .then((po) => {
        if (!cancelled) setSelectedPO(normalizePurchaseOrder(po));
      })
      .catch(() => {
        if (!cancelled) {
          toast.error("Failed to load purchase order.");
          onClose?.();
        }
      });

    return () => {
      cancelled = true;
    };
  }, [poId, fetchPurchaseOrder, onClose]);

  if (!selectedPO) return null;

  return (
    <PoDetailsDialog
      showViewDialog={Boolean(selectedPO)}
      setShowViewDialog={(open) => {
        if (!open) {
          setSelectedPO(null);
          onClose?.();
        }
      }}
      selectedPO={selectedPO}
      statusColors={poStatusColors}
      formatDate={formatPoDate}
      formatCurrency={formatPoCurrency}
      handleDownloadPO={() => {}}
      handleSubmitForApproval={() => {}}
      downloadingPoId={null}
      submitting={false}
      setShowApprovalDialog={() => {}}
      canManagePo={false}
      canApprovePo={false}
      onEditPO={() => {}}
    />
  );
};

export default OrderTrackingPoPreviewDialog;

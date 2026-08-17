import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLazyGetGrnByIdQuery } from "../../../Services/apis/goodsReceiptApi";
import GrnDetailDialog from "../../goods-receipt/components/GrnDetailDialog";
import { normalizeGrn } from "../../goods-receipt/utils";

/**
 * Read-only GRN preview opened in place from the document chain's GRN
 * indicator (spec §7: "clickable and opens that document") — same
 * read-only-stub reuse pattern as OrderTrackingPoPreviewDialog.jsx /
 * AccountingQueuePreviewDialog.jsx, so it stays on Order Tracking instead of
 * navigating to Goods Receipt. Every action handler is a no-op and
 * canApprove/canPost are false — this is a preview, not an edit surface.
 */
const OrderTrackingGrnPreviewDialog = ({ grnId, onClose }) => {
  const [fetchGrn] = useLazyGetGrnByIdQuery();
  const [selectedGrn, setSelectedGrn] = useState(null);

  useEffect(() => {
    if (!grnId) {
      setSelectedGrn(null);
      return undefined;
    }

    let cancelled = false;
    fetchGrn(grnId)
      .unwrap()
      .then((grn) => {
        if (!cancelled) setSelectedGrn(normalizeGrn(grn));
      })
      .catch(() => {
        if (!cancelled) {
          toast.error("Failed to load goods receipt.");
          onClose?.();
        }
      });

    return () => {
      cancelled = true;
    };
  }, [grnId, fetchGrn, onClose]);

  if (!selectedGrn) return null;

  return (
    <GrnDetailDialog
      grn={selectedGrn}
      open={Boolean(selectedGrn)}
      onOpenChange={(open) => {
        if (!open) {
          setSelectedGrn(null);
          onClose?.();
        }
      }}
      canApprove={false}
      canPost={false}
      onOpenReview={() => {}}
      onPost={() => {}}
      onSaveDraft={() => {}}
      onSaveAndSubmit={() => {}}
      onDownloadPdf={() => {}}
      downloadingPdf={false}
    />
  );
};

export default OrderTrackingGrnPreviewDialog;

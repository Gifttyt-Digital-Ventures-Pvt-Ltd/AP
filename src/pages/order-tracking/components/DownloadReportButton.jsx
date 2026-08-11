import React from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../../components/ui/button";
import { useExportOrderTrackingReportMutation } from "../../../Services/apis/orderTrackingApi";

/**
 * Calls the same RTK Query export endpoint (mocked today, real tomorrow)
 * that every other Order Tracking action flows through, sending the
 * currently applied filters so the export matches what's on screen. The
 * mock's { status, downloadUrl, message } response shape is what a real
 * export endpoint is expected to return — this handler doesn't change when
 * exportOrderTrackingReport's queryFn becomes a real query.
 */
const DownloadReportButton = ({ filters = {} }) => {
  const [exportReport, { isLoading }] = useExportOrderTrackingReportMutation();

  const handleClick = async () => {
    try {
      const response = await exportReport(filters).unwrap();
      if (response?.downloadUrl) {
        window.open(response.downloadUrl, "_blank", "noopener,noreferrer");
      } else {
        toast.info(response?.message || "Order Tracking report export isn't available yet.");
      }
    } catch (error) {
      toast.error(error?.data?.message || "Failed to generate the Order Tracking report.");
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleClick}
      disabled={isLoading}
      data-testid="download-order-tracking-report-btn"
    >
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      Download Report
    </Button>
  );
};

export default DownloadReportButton;

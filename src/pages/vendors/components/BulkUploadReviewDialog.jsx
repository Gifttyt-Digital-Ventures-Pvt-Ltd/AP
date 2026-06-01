import React from "react";
import { Button } from "../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";

const BulkUploadReviewDialog = ({ open, onOpenChange, data }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent
      className="max-w-3xl max-h-[85vh] overflow-y-auto"
      data-testid="bulk-upload-review-dialog"
      onInteractOutside={(event) => event.preventDefault()}
    >
      <DialogHeader>
        <DialogTitle>Bulk Upload Review</DialogTitle>
        <DialogDescription>
          Review uploaded vendor results including failed records and validation
          errors.
        </DialogDescription>
      </DialogHeader>
      {data && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Total Received</p>
              <p className="text-lg font-semibold">{data.totalReceived ?? 0}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Success</p>
              <p className="text-lg font-semibold text-emerald-700">
                {data.successCount ?? 0}
              </p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">Failed</p>
              <p className="text-lg font-semibold text-red-600">
                {data.failedCount ?? 0}
              </p>
            </div>
          </div>

          {Array.isArray(data.success) && data.success.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Successful Vendors</p>
              <div className="rounded-md border">
                {data.success.map((item, index) => (
                  <div
                    key={`${item?.id || item?.name || "success"}-${index}`}
                    className="flex items-center justify-between border-b px-3 py-2 last:border-b-0"
                  >
                    <span className="text-sm">{item?.name || "-"}</span>
                    <span className="text-xs text-muted-foreground">
                      {item?.vendorType || item?.vendor_type || "-"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {Array.isArray(data.failed) && data.failed.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Failed Vendors</p>
              <div className="space-y-2">
                {data.failed.map((item, index) => (
                  <div
                    key={`${item?.name || "failed"}-${index}`}
                    className="rounded-md border border-red-200 bg-red-50/40 p-3"
                  >
                    <p className="font-medium text-sm">
                      {item?.name || "Unknown Vendor"}
                    </p>
                    {Array.isArray(item?.errors) && item.errors.length > 0 && (
                      <ul className="mt-2 list-disc pl-5 text-xs text-red-700 space-y-1">
                        {item.errors.map((error, errorIndex) => (
                          <li key={`${error}-${errorIndex}`}>{error}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Close
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default BulkUploadReviewDialog;

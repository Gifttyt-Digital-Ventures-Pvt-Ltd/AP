import React, { useState } from "react";
import { Loader2, Lock, Unlock } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "./ui/button";
import { useActionGuard } from "../hooks/useActionGuard";
import { useRequestAccountingReadyUnlockMutation } from "../Services/apis/accountingApi";
import {
  getAccountingReadyBlockedMessage,
  getAccountingUnlockRequestStatus,
  isAccountingReadyLocked,
} from "../utils/accountingLock";
import { getAccountingErrorMessage } from "../pages/accounting/utils/coaUtils";

/**
 * Banner on Invoice / PO / GRN / Vendor when Accounting Ready lock is on.
 * Module users request unlock here; Integrations users approve + Sync to ERP on Accounting.
 */
const AccountingLockBanner = ({
  record,
  objectLabel = "record",
  objectType,
  objectId,
}) => {
  const { guardAction, canPerformAction } = useActionGuard();
  const [requestUnlock, { isLoading }] = useRequestAccountingReadyUnlockMutation();
  const [localPending, setLocalPending] = useState(false);

  if (!isAccountingReadyLocked(record) && !localPending) return null;

  const unlockStatus = String(
    getAccountingUnlockRequestStatus(record) || (localPending ? "PENDING" : ""),
  ).toUpperCase();
  const isPending = unlockStatus === "PENDING";
  const resolvedObjectId =
    objectId ||
    record?.id ||
    record?.objectId ||
    record?.object_id ||
    record?.invoiceId ||
    record?.poId ||
    record?.grn_id;
  const resolvedObjectType = objectType || record?.objectType || record?.object_type;
  const readyItemId = record?.accountingReadyId || record?.accounting_ready_id || record?.readyItemId;

  const handleRequestUnlock = async () => {
    if (!guardAction("accounting.ready.unlockRequest")) return;
    try {
      const result = await requestUnlock({
        id: readyItemId,
        objectType: resolvedObjectType,
        objectId: resolvedObjectId,
        reason: `Unlock requested from ${objectLabel} screen`,
      }).unwrap();
      setLocalPending(true);
      toast.success(result?.message || "Unlock request submitted");
    } catch (error) {
      toast.error(getAccountingErrorMessage(error, "Could not raise unlock request"));
    }
  };

  return (
    <div
      className="mb-4 flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 sm:flex-row sm:items-start"
      data-testid="accounting-lock-banner"
    >
      <Lock className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1 space-y-2">
        <div>
          <p className="font-medium">Locked for Accounting Ready</p>
          <p className="text-amber-900/90">
            {getAccountingReadyBlockedMessage(
              { ...record, unlockRequestStatus: isPending ? "PENDING" : getAccountingUnlockRequestStatus(record) },
              objectLabel,
            )}
          </p>
        </div>

        <p className="text-xs text-amber-800">
          <strong>Push to ERP:</strong> after the item is Accounting Ready, go to{" "}
          <Link to="/accounting" className="font-medium underline underline-offset-2">
            Accounting → Accounting Ready Items
          </Link>{" "}
          and use <em>Sync to ERP</em> (or <em>Retry</em> if failed). Push is manual and only when status is Ready to Sync.
        </p>

        <div className="flex flex-wrap gap-2">
          {!isPending && canPerformAction("accounting.ready.unlockRequest") ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-amber-300 bg-white text-amber-950 hover:bg-amber-100"
              disabled={isLoading}
              onClick={handleRequestUnlock}
              data-testid="accounting-request-unlock-btn"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Unlock className="mr-2 h-3.5 w-3.5" />
              )}
              Request unlock
            </Button>
          ) : null}
          {isPending ? (
            <span className="inline-flex items-center rounded-full border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium text-amber-900">
              Unlock request pending
            </span>
          ) : null}
          <Button type="button" size="sm" variant="ghost" className="text-amber-900" asChild>
            <Link to="/accounting">Open Accounting Ready</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AccountingLockBanner;

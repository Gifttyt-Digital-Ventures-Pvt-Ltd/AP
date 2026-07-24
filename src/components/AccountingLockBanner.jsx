import React, { useState } from "react";
import { Loader2, Lock, Unlock } from "lucide-react";
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
      className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
      data-testid="accounting-lock-banner"
    >
      <Lock className="h-4 w-4 shrink-0" />
      <span className="font-medium">Locked for Accounting Ready</span>
      {isPending ? (
        <span className="rounded-full border border-amber-300 bg-white px-2 py-0.5 text-xs font-medium text-amber-900">
          Unlock request pending
        </span>
      ) : null}
      <div className="ml-auto flex flex-wrap items-center gap-1.5">
        {!isPending && canPerformAction("accounting.ready.unlockRequest") ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 border-amber-300 bg-white px-2 text-xs text-amber-950 hover:bg-amber-100"
            disabled={isLoading}
            onClick={handleRequestUnlock}
            title={getAccountingReadyBlockedMessage(
              {
                ...record,
                unlockRequestStatus: isPending ? "PENDING" : getAccountingUnlockRequestStatus(record),
              },
              objectLabel,
            )}
            data-testid="accounting-request-unlock-btn"
          >
            {isLoading ? (
              <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
            ) : (
              <Unlock className="mr-1.5 h-3 w-3" />
            )}
            Request unlock
          </Button>
        ) : null}
      </div>
    </div>
  );
};

export default AccountingLockBanner;

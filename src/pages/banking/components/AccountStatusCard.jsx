import React, { useMemo, useState } from "react";
import { AlertCircle, Building2, CheckCircle2, Eye, Pencil, Trash2 } from "lucide-react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Switch } from "../../../components/ui/switch";
import { Textarea } from "../../../components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../../components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import {
  BANK_ACCOUNT_VERIFICATION_STATUS,
} from "../constants";
import {
  formatBankAccountType,
  getBankAccountVerificationStatus,
  isBankAccountActive,
  maskBankAccountNumber,
} from "../utils/bankAccounts";

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getActorName = (actor) => {
  if (!actor) return "-";
  if (typeof actor === "string") return actor;
  return actor.name || actor.fullName || actor.email || actor.userId || "-";
};

const BANK_ACCOUNT_EVENT_LABELS = {
  BANK_ACCOUNT_SUBMITTED: "Account submitted for verification",
  BANK_ACCOUNT_APPROVED: "Account approved and activated",
  BANK_ACCOUNT_REJECTED: "Account rejected",
  BANK_ACCOUNT_RESUBMITTED: "Account edited and resubmitted",
  BANK_ACCOUNT_DELETED: "Rejected account request deleted",
  BANK_ACCOUNT_ACTIVATED: "Account activated",
  BANK_ACCOUNT_DEACTIVATED: "Account deactivated",
};

const formatEventLabel = (value = "") => {
  const event = String(value || "").toUpperCase();
  if (BANK_ACCOUNT_EVENT_LABELS[event]) return BANK_ACCOUNT_EVENT_LABELS[event];
  const label = String(value || "Account activity").replace(/_/g, " ").toLowerCase();
  return label.charAt(0).toUpperCase() + label.slice(1);
};

const getAccountAuditEntries = (account = {}) => {
  const rawEntries =
    account.auditLogs ||
    account.audit_logs ||
    account.accountLogs ||
    account.account_logs ||
    account.lifecycleEvents ||
    account.lifecycle_events ||
    [];
  const apEntries = (Array.isArray(rawEntries) ? rawEntries : []).filter((entry) => {
    const portal = String(entry.actorPortal || entry.actor_portal || entry.portal || "").toUpperCase();
    return !portal || portal === "AP_PORTAL" || portal === "AP" || portal === "SYSTEM";
  });
  const entries = [...apEntries];
  const submittedAt = account.submittedAt || account.submitted_at || account.createdAt || account.created_at;
  if (submittedAt) {
    entries.push({
      event: "BANK_ACCOUNT_SUBMITTED",
      label: "Account submitted for verification",
      actor: account.submittedBy || account.submitted_by,
      at: submittedAt,
    });
  }
  const status = getBankAccountVerificationStatus(account);
  const reviewedAt = account.reviewedAt || account.reviewed_at;
  if (reviewedAt && status === BANK_ACCOUNT_VERIFICATION_STATUS.REJECTED) {
    entries.push({
      event: "BANK_ACCOUNT_REJECTED",
      label: "Account rejected",
      actor: "System",
      at: reviewedAt,
      comment: account.reviewComment || account.review_comment,
    });
  }
  if (reviewedAt && status === BANK_ACCOUNT_VERIFICATION_STATUS.APPROVED) {
    entries.push({
      event: "BANK_ACCOUNT_APPROVED",
      label: "Account approved and activated",
      actor: "System",
      at: reviewedAt,
    });
  }
  return entries
    .map((entry, index) => ({
      id: entry.id || `${entry.event || entry.label || "event"}-${entry.at || index}`,
      label: formatEventLabel(entry.event || entry.action || entry.label || entry.eventLabel || entry.event_label),
      actor:
        String(entry.actorPortal || entry.actor_portal || entry.portal || "").toUpperCase() === "SYSTEM"
          ? "System"
          : entry.actorName || entry.actor_name || getActorName(entry.actor),
      at: entry.at || entry.timestamp || entry.createdAt || entry.created_at,
      comment:
        entry.comment ||
        entry.comments ||
        entry.reason ||
        entry.deactivationReason ||
        entry.deactivation_reason,
    }))
    .sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime());
};

const VerificationBadge = ({ status }) => {
  const normalized = String(status || "").toUpperCase();
  const config = {
    [BANK_ACCOUNT_VERIFICATION_STATUS.APPROVED]: {
      label: "Approved",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    },
    [BANK_ACCOUNT_VERIFICATION_STATUS.REJECTED]: {
      label: "Rejected",
      className: "border-red-200 bg-red-50 text-red-700",
    },
    [BANK_ACCOUNT_VERIFICATION_STATUS.PENDING_APPROVAL]: {
      label: "Pending Verification",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    },
  };
  const current = config[normalized] || config[BANK_ACCOUNT_VERIFICATION_STATUS.PENDING_APPROVAL];
  return (
    <Badge variant="outline" className={current.className}>
      {current.label}
    </Badge>
  );
};

const AccountDetails = ({ account }) => {
  const status = getBankAccountVerificationStatus(account);
  const isApproved = status === BANK_ACCOUNT_VERIFICATION_STATUS.APPROVED;
  const isRejected = status === BANK_ACCOUNT_VERIFICATION_STATUS.REJECTED;
  const active = isApproved ? isBankAccountActive(account) : false;
  const accountName = account.accountName || account.account_name || "Connected account";
  const accountNumber =
    account.maskedAccountNumber ||
    account.masked_account_number ||
    maskBankAccountNumber(account.accountNumber || account.account_number);
  const ifsc = account.ifsc || account.ifscCode || account.ifsc_code || "-";
  const auditEntries = getAccountAuditEntries(account);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 text-sm md:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-xs text-muted-foreground">Bank</p>
          <p className="font-medium">{account.bankName || account.bank || "IDFC Bank"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Account Name</p>
          <p className="font-medium">{accountName}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Account Number</p>
          <p className="font-medium">{accountNumber}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">IFSC</p>
          <p className="font-medium">{ifsc}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Account Type</p>
          <p className="font-medium">{formatBankAccountType(account.accountType || account.account_type)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Submitted By</p>
          <p className="font-medium">{getActorName(account.submittedBy || account.submitted_by)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Submitted Date</p>
          <p className="font-medium">{formatDateTime(account.submittedAt || account.submitted_at)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Active Status</p>
          <p className="font-medium">{isApproved ? (active ? "Active" : "Inactive") : "-"}</p>
        </div>
      </div>
      {isRejected && (account.reviewComment || account.review_comment) ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          <p className="font-medium">Rejected</p>
          <p className="mt-1">Reason: {account.reviewComment || account.review_comment}</p>
        </div>
      ) : null}
      <div className="rounded-md border border-border bg-muted/20">
        <div className="border-b border-border px-3 py-2">
          <p className="text-sm font-medium">Account Activity Log</p>
          <p className="text-xs text-muted-foreground">
            AP Portal actions are shown with the user. Admin review outcomes are shown as System events.
          </p>
        </div>
        {auditEntries.length > 0 ? (
          <div className="divide-y divide-border">
            {auditEntries.map((entry) => (
              <div key={entry.id} className="grid gap-1 px-3 py-2 text-sm md:grid-cols-[180px_1fr_160px]">
                <p className="text-muted-foreground">{formatDateTime(entry.at)}</p>
                <div>
                  <p className="font-medium capitalize">{entry.label}</p>
                  {entry.comment ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">Reason: {entry.comment}</p>
                  ) : null}
                </div>
                <p className="text-muted-foreground md:text-right">{entry.actor || "System"}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-3 py-3 text-sm text-muted-foreground">No account activity recorded.</p>
        )}
      </div>
    </div>
  );
};

const AccountRow = ({
  account,
  canManage,
  onEditRejected,
  onDeleteRejected,
  onToggleActive,
  actionLoading,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deactivationDialogOpen, setDeactivationDialogOpen] = useState(false);
  const [deactivationReason, setDeactivationReason] = useState("");
  const status = getBankAccountVerificationStatus(account);
  const isPending = status === BANK_ACCOUNT_VERIFICATION_STATUS.PENDING_APPROVAL;
  const isRejected = status === BANK_ACCOUNT_VERIFICATION_STATUS.REJECTED;
  const isApproved = status === BANK_ACCOUNT_VERIFICATION_STATUS.APPROVED;
  const active = isApproved && isBankAccountActive(account);
  const accountName = account.accountName || account.account_name || "Connected account";
  const accountNumber =
    account.maskedAccountNumber ||
    account.masked_account_number ||
    maskBankAccountNumber(account.accountNumber || account.account_number);

  const handleActiveChange = (checked) => {
    if (checked) {
      onToggleActive?.(account, true);
      return;
    }
    setDeactivationReason("");
    setDeactivationDialogOpen(true);
  };

  const confirmDeactivate = () => {
    const reason = deactivationReason.trim();
    if (!reason) return;
    onToggleActive?.(account, false, reason);
    setDeactivationDialogOpen(false);
    setDeactivationReason("");
  };

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 p-3">
        <div className="flex min-w-0 items-start gap-3">
          {isApproved ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className={`mt-0.5 h-5 w-5 shrink-0 ${isRejected ? "text-red-600" : "text-amber-600"}`} />
          )}
          <div className="min-w-0">
            <p className="font-medium">
              {account.bankName || account.bank || "IDFC Bank"} · {accountName}
            </p>
            <p className="text-sm text-muted-foreground">
              A/c {accountNumber} · IFSC {account.ifsc || account.ifscCode || account.ifsc_code || "-"}
            </p>
            {isPending ? (
              <p className="mt-1 text-xs text-amber-700">Verification is pending.</p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <VerificationBadge status={status} />
          {isApproved ? (
            <div className="flex items-center gap-2 rounded-md border px-2 py-1">
              <span className="text-xs">{active ? "Active" : "Inactive"}</span>
              {canManage ? (
                <Switch
                  checked={active}
                  disabled={actionLoading}
                  onCheckedChange={handleActiveChange}
                  aria-label={active ? "Deactivate Account" : "Activate Account"}
                />
              ) : null}
            </div>
          ) : null}
          <Button type="button" variant="outline" size="sm" onClick={() => setExpanded((value) => !value)}>
            <Eye className="mr-2 h-4 w-4" />
            View
          </Button>
          {canManage && isRejected ? (
            <>
              <Button type="button" variant="outline" size="sm" onClick={() => onEditRejected?.(account)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit and Resubmit
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setConfirmDeleteOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </>
          ) : null}
        </div>
      </div>
      {expanded ? (
        <div className="border-t border-border p-3">
          <AccountDetails account={account} />
        </div>
      ) : null}
      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete rejected bank account request?</AlertDialogTitle>
            <AlertDialogDescription>
              This request will be removed and cannot be restored.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDeleteRejected?.(account)}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={deactivationDialogOpen} onOpenChange={setDeactivationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Bank Account?</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              This account will no longer be available for beneficiary operations or payment release until it is activated again.
            </p>
            <p className="text-sm text-muted-foreground">
              Enter the reason for deactivating this bank account. This will be recorded in the AP Portal account log.
            </p>
            <Textarea
              value={deactivationReason}
              onChange={(event) => setDeactivationReason(event.target.value)}
              placeholder="Enter deactivation reason"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivationDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmDeactivate} disabled={actionLoading || !deactivationReason.trim()}>
              Deactivate Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const AccountStatusCard = ({
  account,
  accounts,
  canManage = false,
  onEditRejected,
  onDeleteRejected,
  onToggleActive,
  actionLoading = false,
}) => {
  const accountList = useMemo(
    () => (accounts?.length ? accounts : account ? [account] : []),
    [account, accounts],
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="h-4 w-4" />
          Linked Bank Accounts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {accountList.length === 0 ? (
          <p className="text-sm text-muted-foreground">No bank account request submitted yet.</p>
        ) : (
          accountList.map((item) => (
            <AccountRow
              key={item.id || item.accountNumber || item.account_number}
              account={item}
              canManage={canManage}
              actionLoading={actionLoading}
              onEditRejected={onEditRejected}
              onDeleteRejected={onDeleteRejected}
              onToggleActive={onToggleActive}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default AccountStatusCard;

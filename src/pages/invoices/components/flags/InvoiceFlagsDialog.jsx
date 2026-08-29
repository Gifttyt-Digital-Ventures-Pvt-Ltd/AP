import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../../../components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../../../../components/ui/tabs";
import InvoiceFlagCard from "./InvoiceFlagCard";
import ResolveFlagDialog from "./ResolveFlagDialog";
import ReopenFlagDialog from "./ReopenFlagDialog";
import DuplicateInvoicesListDialog from "./DuplicateInvoicesListDialog";

const padCount = (count) => String(count).padStart(2, "0");

/**
 * "Flags" dialog — centered modal (not a side Sheet), matching the reference
 * design's popup layout. Active/Resolved tab-with-count-pill shape modeled
 * on pages/notifications/Notifications.jsx and
 * pages/transactions/components/TransactionsToolbar.jsx.
 *
 * Owns the three sub-dialogs (Resolve, Reopen, Duplicate Invoices list) so
 * callers only ever need to render this one component.
 *
 * onReopenFlag is the reviewer-surface gate: InvoicesPage.jsx (maker) never
 * passes it, so the Reopen action never renders there — useApprovalsInvoiceEdit.jsx
 * passes it only when the current invoice's status + the viewer's permission
 * actually allow reopening for THIS invoice (Pending Checker → invoices.check,
 * approval-stage → invoices.approve — the same per-invoice rule Approvals.jsx
 * itself already uses, not a generic "not maker" flag).
 */
const InvoiceFlagsDialog = ({
  open,
  onOpenChange,
  activeFlags = [],
  resolvedFlags = [],
  blockingFlagsResolvedByOthers = [],
  onResolveFlag,
  onFixInForm,
  onReopenFlag,
  onViewDuplicateInvoice,
}) => {
  const [tab, setTab] = useState("active");
  const [resolvingFlag, setResolvingFlag] = useState(null);
  const [reopeningFlag, setReopeningFlag] = useState(null);
  const [viewingDuplicatesFlag, setViewingDuplicatesFlag] = useState(null);

  const handleFixInForm = (flag) => {
    onOpenChange(false);
    onFixInForm?.(flag);
  };

  const handleConfirmResolve = (reason) => {
    if (!resolvingFlag) return;
    onResolveFlag?.(resolvingFlag.instanceId, reason);
    setResolvingFlag(null);
  };

  const handleConfirmReopen = (reason) => {
    if (!reopeningFlag) return;
    onReopenFlag?.(reopeningFlag.instanceId, reason);
    setReopeningFlag(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Flags</DialogTitle>
            <DialogDescription>All the flags this invoice has.</DialogDescription>
          </DialogHeader>

          {blockingFlagsResolvedByOthers.length > 0 ? (
            <div
              className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
              data-testid="invoice-flags-resolved-by-maker-callout"
            >
              {blockingFlagsResolvedByOthers.length} blocking flag
              {blockingFlagsResolvedByOthers.length === 1 ? " was" : "s were"} resolved by the maker.
            </div>
          ) : null}

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="active" data-testid="invoice-flags-tab-active">
                Active
                <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">
                  ({padCount(activeFlags.length)})
                </span>
              </TabsTrigger>
              <TabsTrigger value="resolved" data-testid="invoice-flags-tab-resolved">
                Resolved
                <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">
                  ({padCount(resolvedFlags.length)})
                </span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-2">
              {activeFlags.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No active flags.</p>
              ) : (
                activeFlags.map((flag) => (
                  <InvoiceFlagCard
                    key={flag.instanceId}
                    flag={flag}
                    onResolveClick={onResolveFlag ? setResolvingFlag : undefined}
                    onFixInFormClick={onFixInForm ? handleFixInForm : undefined}
                    onViewAndResolveClick={setViewingDuplicatesFlag}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="resolved" className="space-y-2">
              {resolvedFlags.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No resolved flags yet.</p>
              ) : (
                resolvedFlags.map((flag) => (
                  <InvoiceFlagCard
                    key={flag.instanceId}
                    flag={flag}
                    onReopenClick={onReopenFlag ? setReopeningFlag : undefined}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <DuplicateInvoicesListDialog
        open={Boolean(viewingDuplicatesFlag)}
        onOpenChange={(next) => !next && setViewingDuplicatesFlag(null)}
        matches={viewingDuplicatesFlag?.evidence?.matches || []}
        onViewInvoice={onViewDuplicateInvoice}
        onResolveClick={
          onResolveFlag
            ? () => {
                setResolvingFlag(viewingDuplicatesFlag);
                setViewingDuplicatesFlag(null);
              }
            : undefined
        }
      />

      <ResolveFlagDialog
        flag={resolvingFlag}
        open={Boolean(resolvingFlag)}
        onOpenChange={(next) => !next && setResolvingFlag(null)}
        onConfirm={handleConfirmResolve}
      />

      <ReopenFlagDialog
        flag={reopeningFlag}
        open={Boolean(reopeningFlag)}
        onOpenChange={(next) => !next && setReopeningFlag(null)}
        onConfirm={handleConfirmReopen}
      />
    </>
  );
};

export default InvoiceFlagsDialog;

import React, { useEffect, useMemo, useState } from "react";
import {
  Download,
  FileText,
  Loader2,
  Lock,
  Package,
  RefreshCw,
  RotateCcw,
  ShoppingCart,
  Unlock,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Checkbox } from "../../../components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { useActionGuard } from "../../../hooks/useActionGuard";
import {
  useApproveAccountingReadyUnlockMutation,
  useBulkSyncAccountingReadyItemsMutation,
  useDownloadAccountingSyncLogsMutation,
  useGetAccountingReadyQueueQuery,
  useGetAccountingSyncLogsQuery,
  useRequestAccountingReadyUnlockMutation,
  useRetryAccountingReadyItemMutation,
  useSyncAccountingReadyItemMutation,
} from "../../../Services/apis/accountingApi";
import { ACC_STATUS, ERP_STATUS, QUEUE_TAB } from "../constants";
import {
  erpSourceLabel,
  formatCurrencyCompact,
  formatDateTime,
  getAccountingErrorMessage,
  statusBadgeClass,
} from "../utils/coaUtils";

const QUEUE_TABS = [
  { key: QUEUE_TAB.PO, icon: ShoppingCart },
  { key: QUEUE_TAB.GRN, icon: Package },
  { key: QUEUE_TAB.INVOICE, icon: FileText },
  { key: QUEUE_TAB.PI, icon: FileText },
  { key: QUEUE_TAB.VENDOR, icon: FileText },
];

const canPushItem = (item) =>
  item.eligibleForSync &&
  [ACC_STATUS.READY, ACC_STATUS.FAILED].includes(item.accStatus);

const canRetryItem = (item) => item.accStatus === ACC_STATUS.FAILED;

const AccStatusBadge = ({ status }) => {
  const map = {
    [ACC_STATUS.NOT_READY]: "border-slate-200 bg-slate-100 text-slate-600",
    [ACC_STATUS.READY]: "border-blue-200 bg-blue-50 text-blue-700",
    [ACC_STATUS.QUEUED]: "border-amber-200 bg-amber-50 text-amber-800",
    [ACC_STATUS.SYNCED]: "border-emerald-200 bg-emerald-50 text-emerald-800",
    [ACC_STATUS.FAILED]: "border-rose-200 bg-rose-50 text-rose-800",
  };
  return (
    <Badge variant="outline" className={map[status] || statusBadgeClass(status)}>
      {status}
    </Badge>
  );
};

const BizStatusBadge = ({ status }) => (
  <Badge variant="outline" className={statusBadgeClass(status)}>
    {status || "—"}
  </Badge>
);

const ErpStatusBadge = ({ status }) => {
  if (!status || status === ERP_STATUS.NONE) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }
  const map = {
    [ERP_STATUS.SYNCED]: "border-emerald-200 bg-emerald-50 text-emerald-800",
    [ERP_STATUS.FAILED]: "border-rose-200 bg-rose-50 text-rose-800",
    [ERP_STATUS.RETRY_REQUIRED]: "border-rose-200 bg-rose-50 text-rose-800",
    [ERP_STATUS.READY_TO_SYNC]: "border-blue-200 bg-blue-50 text-blue-700",
    [ERP_STATUS.NOT_SYNCED]: "border-slate-200 bg-slate-100 text-slate-600",
  };
  return (
    <Badge variant="outline" className={map[status] || statusBadgeClass(status)}>
      {status}
    </Badge>
  );
};

const SourceBadge = ({ item }) => {
  const source = item.source && item.source !== "—" ? item.source : item.sourceSystem;
  if (!source) return <span className="text-sm text-muted-foreground">—</span>;
  const sourceLabel = erpSourceLabel(source);
  const sourceSystem = erpSourceLabel(item.sourceSystem);
  const label =
    sourceSystem !== "—" && sourceSystem !== sourceLabel
      ? `${sourceLabel} · ${sourceSystem}`
      : sourceLabel;

  return (
    <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
      {label}
    </Badge>
  );
};

const ReadyForAccountingQueue = () => {
  const { guardAction, canPerformAction } = useActionGuard();
  const [activeTab, setActiveTab] = useState(QUEUE_TAB.PO);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [showLogs, setShowLogs] = useState(false);

  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetAccountingReadyQueueQuery();
  const { data: logsData, isLoading: logsLoading } = useGetAccountingSyncLogsQuery(undefined, {
    skip: !showLogs,
  });

  const [syncItem, { isLoading: syncing }] = useSyncAccountingReadyItemMutation();
  const [bulkSync, { isLoading: bulkSyncing }] = useBulkSyncAccountingReadyItemsMutation();
  const [retryItem, { isLoading: retrying }] = useRetryAccountingReadyItemMutation();
  const [requestUnlock, { isLoading: requestingUnlock }] =
    useRequestAccountingReadyUnlockMutation();
  const [approveUnlock, { isLoading: approvingUnlock }] =
    useApproveAccountingReadyUnlockMutation();
  const [downloadLogs, { isLoading: downloading }] = useDownloadAccountingSyncLogsMutation();

  const allItems = data?.items || [];
  const logs = logsData?.items || logsData?.results || [];

  const docs = useMemo(
    () => allItems.filter((item) => item.tab === activeTab),
    [allItems, activeTab],
  );

  const tabCounts = useMemo(() => {
    const counts = {};
    Object.values(QUEUE_TAB).forEach((tab) => {
      counts[tab] = allItems.filter((item) => item.tab === tab).length;
    });
    return counts;
  }, [allItems]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [activeTab, data?.items]);

  const selectedList = useMemo(
    () => docs.filter((item) => selectedIds.has(item.id)),
    [docs, selectedIds],
  );
  const selectedPushable = selectedList.filter(canPushItem);
  const allChecked =
    docs.length > 0 && docs.every((item) => selectedIds.has(item.id));

  const busy = syncing || bulkSyncing || retrying || requestingUnlock || approvingUnlock;
  const canSyncAction = canPerformAction("accounting.ready.sync");

  const toggleOne = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allChecked) setSelectedIds(new Set());
    else setSelectedIds(new Set(docs.map((item) => item.id)));
  };

  const handleSync = async (item) => {
    if (!guardAction("accounting.ready.sync")) return;
    if (item.accStatus === ACC_STATUS.SYNCED && !item.eligibleForSync) {
      toast.info("Already synced — no changes since last successful sync");
      return;
    }
    try {
      const result = await syncItem({ id: item.id }).unwrap();
      toast.success(result?.message || "Synced to ERP successfully");
    } catch (err) {
      toast.error(getAccountingErrorMessage(err, "Sync failed"));
    }
  };

  const handleRetry = async (item) => {
    if (!guardAction("accounting.ready.sync")) return;
    try {
      const result = await retryItem({ id: item.id }).unwrap();
      toast.success(result?.message || "Retry succeeded");
    } catch (err) {
      toast.error(getAccountingErrorMessage(err, "Retry failed"));
    }
  };

  const handleBulkPush = async () => {
    if (!guardAction("accounting.ready.sync")) return;
    const ids = selectedPushable.map((item) => item.id);
    if (ids.length === 0) {
      toast.info("Select at least one Ready or Failed item to push");
      return;
    }
    try {
      const result = await bulkSync({ ids, mode: "SYNC" }).unwrap();
      toast.success(result?.message || `Pushed ${ids.length} item(s) to ERP`);
      setSelectedIds(new Set());
    } catch (err) {
      toast.error(getAccountingErrorMessage(err, "Bulk sync failed"));
    }
  };

  const handleUnlockRequest = async (item) => {
    if (!guardAction("accounting.ready.unlockRequest")) return;
    try {
      const result = await requestUnlock({
        id: item.id,
        objectType: item.objectType,
        objectId: item.objectId,
        reason: "Need to correct document before ERP sync",
      }).unwrap();
      toast.success(result?.message || "Unlock request submitted");
    } catch (err) {
      toast.error(getAccountingErrorMessage(err, "Could not raise unlock request"));
    }
  };

  const handleUnlockApprove = async (item) => {
    if (!guardAction("accounting.ready.unlockApprove")) return;
    try {
      const result = await approveUnlock({ id: item.id }).unwrap();
      toast.success(result?.message || "Item unlocked");
    } catch (err) {
      toast.error(getAccountingErrorMessage(err, "Could not approve unlock"));
    }
  };

  const handleDownloadLogs = async () => {
    if (!guardAction("accounting.syncLogs.download")) return;
    try {
      const blob = await downloadLogs().unwrap();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `accounting-sync-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("Sync logs downloaded");
    } catch (err) {
      toast.error(getAccountingErrorMessage(err, "Failed to download sync logs"));
    }
  };

  const renderRowActions = (item) => {
    const canPush = canPushItem(item);
    const canRetry = canRetryItem(item);

    return (
      <div className="flex flex-wrap justify-end gap-1.5">
        {item.locked ? (
          <>
            <span className="mr-1 inline-flex items-center gap-1 text-xs text-amber-800">
              <Lock className="h-3.5 w-3.5" />
              Locked
            </span>
            {item.unlockRequestStatus !== "PENDING" &&
            canPerformAction("accounting.ready.unlockRequest") ? (
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => handleUnlockRequest(item)}
              >
                Request unlock
              </Button>
            ) : null}
            {item.unlockRequestStatus === "PENDING" &&
            canPerformAction("accounting.ready.unlockApprove") ? (
              <Button size="sm" disabled={busy} onClick={() => handleUnlockApprove(item)}>
                <Unlock className="mr-1 h-3.5 w-3.5" />
                Approve unlock
              </Button>
            ) : null}
          </>
        ) : null}
        {canPush && canSyncAction && !item.locked ? (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => handleSync(item)}
          >
            Sync
          </Button>
        ) : null}
        {canRetry && canSyncAction && !item.locked ? (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => handleRetry(item)}
          >
            <RotateCcw className="mr-1 h-3.5 w-3.5" />
            Retry
          </Button>
        ) : null}
        {!canPush && !canRetry && !item.locked ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : null}
      </div>
    );
  };

  return (
    <Card className="overflow-hidden shadow-sm" data-testid="accounting-ready-queue">
      <CardHeader className="space-y-0 border-b p-0">
        <div className="flex flex-col gap-3 px-5 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">Accounting Queue</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-8"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
            {canPerformAction("accounting.syncLogs.view") ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setShowLogs((prev) => !prev)}
              >
                {showLogs ? "Hide logs" : "Sync logs"}
              </Button>
            ) : null}
            {canPerformAction("accounting.syncLogs.download") ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={handleDownloadLogs}
                disabled={downloading}
              >
                {downloading ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="mr-1 h-3.5 w-3.5" />
                )}
                Export
              </Button>
            ) : null}
          </div>

          {canSyncAction && selectedIds.size > 0 ? (
            <Button size="sm" disabled={busy || selectedPushable.length === 0} onClick={handleBulkPush}>
              {bulkSyncing ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Zap className="mr-1.5 h-3.5 w-3.5" />
              )}
              {bulkSyncing ? "Pushing…" : `Push ${selectedPushable.length || selectedIds.size} to ERP`}
            </Button>
          ) : null}
        </div>

        <div className="mt-3 flex gap-0 overflow-x-auto px-2">
          {QUEUE_TABS.map(({ key, icon: Icon }) => {
            const active = activeTab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`mb-[-1px] inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm transition-colors ${
                  active
                    ? "border-primary font-semibold text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {key}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {tabCounts[key] || 0}
                </span>
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : isError ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {getAccountingErrorMessage(error, "Failed to load accounting queue.")}
            <div className="mt-4">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-10">
                    {canSyncAction ? (
                      <Checkbox
                        checked={allChecked}
                        disabled={docs.length === 0 || busy}
                        onCheckedChange={toggleAll}
                        aria-label="Select all rows"
                        data-testid="ready-select-all"
                      />
                    ) : null}
                  </TableHead>
                  <TableHead>Document No.</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Business Status</TableHead>
                  <TableHead>Accounting Status</TableHead>
                  <TableHead>ERP Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs.map((item) => (
                  <TableRow
                    key={item.id}
                    className={selectedIds.has(item.id) ? "bg-primary/[0.03]" : undefined}
                    data-testid={`ready-row-${item.id}`}
                  >
                    <TableCell>
                      {canSyncAction ? (
                        <Checkbox
                          checked={selectedIds.has(item.id)}
                          disabled={busy}
                          onCheckedChange={() => toggleOne(item.id)}
                          aria-label={`Select ${item.docNo}`}
                          data-testid={`ready-select-${item.id}`}
                        />
                      ) : null}
                    </TableCell>
                    <TableCell className="font-medium text-primary">{item.docNo}</TableCell>
                    <TableCell>{item.vendor}</TableCell>
                    <TableCell>
                      <SourceBadge item={item} />
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrencyCompact(item.amount)}
                    </TableCell>
                    <TableCell>
                      <BizStatusBadge status={item.bizStatus} />
                    </TableCell>
                    <TableCell>
                      <AccStatusBadge status={item.accStatus} />
                    </TableCell>
                    <TableCell>
                      <ErpStatusBadge status={item.erpStatus} />
                    </TableCell>
                    <TableCell className="text-right">{renderRowActions(item)}</TableCell>
                  </TableRow>
                ))}
                {docs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                      No documents in this queue
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        )}

        {showLogs ? (
          <div className="border-t p-4" data-testid="accounting-sync-logs">
            <h4 className="mb-3 text-sm font-semibold">Sync logs</h4>
            {logsLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-2">
                {(Array.isArray(logs) ? logs : []).map((log) => (
                  <div key={log.id || log.at} className="rounded-lg border bg-muted/20 p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">
                        {log.reference || log.docNo || "—"} · {log.action || "sync"}
                      </span>
                      <Badge variant="outline" className={statusBadgeClass(log.status)}>
                        {log.status}
                      </Badge>
                    </div>
                    {log.message ? (
                      <p className="mt-1 text-muted-foreground">{log.message}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDateTime(log.at || log.createdAt)}
                    </p>
                  </div>
                ))}
                {(Array.isArray(logs) ? logs : []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No sync logs yet.</p>
                ) : null}
              </div>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default ReadyForAccountingQueue;

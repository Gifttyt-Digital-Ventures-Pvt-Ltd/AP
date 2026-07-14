import React, { useEffect, useMemo, useState } from "react";
import {
  Download,
  Eye,
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";
import { Checkbox } from "../../../components/ui/checkbox";
import AppDataTable from "../../../components/common/AppDataTable";
import { TableCell, TableRow } from "../../../components/ui/table";
import { useActionGuard } from "../../../hooks/useActionGuard";
import {
  useBulkMarkAccountingReadyItemsMutation,
  useBulkSyncAccountingReadyItemsMutation,
  useDirectUnlockAccountingReadyItemMutation,
  useDownloadAccountingSyncLogsMutation,
  useGetAccountingReadyQueueQuery,
  useLazyGetAccountingQueueItemDetailQuery,
  useGetAccountingSyncLogsQuery,
  useMarkAccountingReadyItemMutation,
  useRetryAccountingReadyItemMutation,
  useSyncAccountingReadyItemMutation,
} from "../../../Services/apis/accountingApi";
import AccountingQueuePreviewDialog from "./AccountingQueuePreviewDialog";
import {
  ACC_STATUS,
  ACCOUNTING_QUEUE_STAGE,
  ACCOUNTING_QUEUE_STAGE_LABELS,
  ERP_STATUS,
  QUEUE_TAB,
  TAB_TO_OBJECT_TYPE,
} from "../constants";
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

const QUEUE_STAGES = [
  ACCOUNTING_QUEUE_STAGE.NEEDS_APPROVAL,
  ACCOUNTING_QUEUE_STAGE.ACCOUNTING_READY,
];

const PAGE_SIZE = 25;

const QUEUE_TABLE_HEADER = [
  { key: "select", title: "", headerClassName: "w-10", cellClassName: "w-10" },
  {
    key: "docNo",
    title: "Document No.",
    cellClassName: "font-medium text-primary",
  },
  { key: "vendor", title: "Vendor" },
  { key: "source", title: "Source" },
  { key: "amount", title: "Amount", cellClassName: "font-semibold" },
  { key: "bizStatus", title: "Business Status" },
  { key: "accStatus", title: "Accounting Status" },
  { key: "erpStatus", title: "ERP Status" },
  { key: "unlockStatus", title: "Unlock Status" },
  {
    key: "action",
    title: "Action",
    headerClassName: "text-left",
    cellClassName: "text-left whitespace-nowrap",
  },
];

const canMarkReadyItem = (item) =>
  item.eligibleForAccountingReady && !item.accountingReady && !item.locked;

const canPushItem = (item) =>
  item.eligibleForSync &&
  [ACC_STATUS.READY, ACC_STATUS.FAILED].includes(item.accStatus);

const canRetryItem = (item) => {
  const syncStatus = String(item.syncStatus || "").toUpperCase();
  const erpStatus = String(item.erpStatus || "")
    .toUpperCase()
    .replace(/\s+/g, "_");
  return (
    item.accStatus === ACC_STATUS.FAILED ||
    syncStatus === "FAILED" ||
    syncStatus === "RETRY_REQUIRED" ||
    erpStatus === "FAILED" ||
    erpStatus === "RETRY_REQUIRED"
  );
};

const isBulkMarkReadyUnsupported = (error) => {
  const status = Number(
    error?.status ?? error?.originalStatus ?? error?.data?.status,
  );
  return status === 404 || status === 405 || status === 501;
};

const AccStatusBadge = ({ status }) => {
  const map = {
    [ACC_STATUS.NOT_READY]: "border-slate-200 bg-slate-100 text-slate-600",
    [ACC_STATUS.READY]: "border-blue-200 bg-blue-50 text-blue-700",
    [ACC_STATUS.QUEUED]: "border-amber-200 bg-amber-50 text-amber-800",
    [ACC_STATUS.SYNCED]: "border-emerald-200 bg-emerald-50 text-emerald-800",
    [ACC_STATUS.FAILED]: "border-rose-200 bg-rose-50 text-rose-800",
  };
  return (
    <Badge
      variant="outline"
      className={map[status] || statusBadgeClass(status)}
    >
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
    <Badge
      variant="outline"
      className={map[status] || statusBadgeClass(status)}
    >
      {status}
    </Badge>
  );
};

const UnlockStatus = ({ status }) => {
  if (status !== "PENDING") {
    return <span className="text-sm text-muted-foreground">-</span>;
  }

  return (
    <Badge
      variant="outline"
      className="border-amber-200 bg-amber-50 text-amber-800"
    >
      Unlock requested
    </Badge>
  );
};

const SourceBadge = ({ item }) => {
  const source =
    item.source && item.source !== "—" ? item.source : item.sourceSystem;
  if (!source) return <span className="text-sm text-muted-foreground">—</span>;
  const sourceLabel = erpSourceLabel(source);
  const sourceSystem = erpSourceLabel(item.sourceSystem);
  const label =
    sourceSystem !== "—" && sourceSystem !== sourceLabel
      ? `${sourceLabel} · ${sourceSystem}`
      : sourceLabel;

  return (
    <Badge
      variant="outline"
      className="border-slate-200 bg-slate-50 text-slate-700"
    >
      {label}
    </Badge>
  );
};

const ReadyForAccountingQueue = () => {
  const { guardAction, canPerformAction } = useActionGuard();
  const [activeTab, setActiveTab] = useState(QUEUE_TAB.PO);
  const [activeStage, setActiveStage] = useState(
    ACCOUNTING_QUEUE_STAGE.NEEDS_APPROVAL,
  );
  const [pageOffset, setPageOffset] = useState(0);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [showLogs, setShowLogs] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDetail, setPreviewDetail] = useState(null);
  const activeObjectType = TAB_TO_OBJECT_TYPE[activeTab];

  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetAccountingReadyQueueQuery({
      objectType: activeObjectType,
      stage: activeStage,
      limit: PAGE_SIZE,
      offset: pageOffset,
    });
  const {
    data: logsData,
    isLoading: logsLoading,
    refetch: refetchLogs,
  } = useGetAccountingSyncLogsQuery(
    { objectType: activeObjectType, limit: PAGE_SIZE, offset: 0 },
    { skip: !showLogs },
  );

  const [markReady, { isLoading: markingReady }] =
    useMarkAccountingReadyItemMutation();
  const [bulkMarkReady, { isLoading: bulkMarkingReady }] =
    useBulkMarkAccountingReadyItemsMutation();
  const [syncItem, { isLoading: syncing }] =
    useSyncAccountingReadyItemMutation();
  const [bulkSync, { isLoading: bulkSyncing }] =
    useBulkSyncAccountingReadyItemsMutation();
  const [retryItem, { isLoading: retrying }] =
    useRetryAccountingReadyItemMutation();
  const [directUnlock, { isLoading: directUnlocking }] =
    useDirectUnlockAccountingReadyItemMutation();
  const [downloadLogs, { isLoading: downloading }] =
    useDownloadAccountingSyncLogsMutation();
  const [loadQueueItemDetail, { isFetching: previewFetching }] =
    useLazyGetAccountingQueueItemDetailQuery();

  const allItems = data?.items || [];
  const docs = allItems;
  const logs = logsData?.items || logsData?.results || [];
  const total = Number(data?.total ?? docs.length) || 0;
  const limit = Number(data?.limit ?? PAGE_SIZE) || PAGE_SIZE;
  const offset = Number(data?.offset ?? pageOffset) || 0;
  const currentPage = limit > 0 ? Math.floor(offset / limit) + 1 : 1;
  const totalPages = total > 0 ? Math.ceil(total / limit) : 1;
  const hasPreviousPage = offset > 0;
  const hasNextPage = Boolean(data?.hasMore) || offset + docs.length < total;

  const getDocumentCount = (tab) => {
    const objectType = TAB_TO_OBJECT_TYPE[tab];
    const counts = data?.documentCounts || {};
    if (counts[objectType] !== undefined)
      return Number(counts[objectType]) || 0;
    if (counts[tab] !== undefined) return Number(counts[tab]) || 0;
    return tab === activeTab ? Number(data?.total ?? docs.length) || 0 : 0;
  };

  const getStageCount = (stage) => {
    const counts = data?.counts || {};
    if (counts[stage] !== undefined) return Number(counts[stage]) || 0;
    return stage === activeStage ? Number(data?.total ?? docs.length) || 0 : 0;
  };

  useEffect(() => {
    setSelectedIds(new Set());
  }, [activeTab, activeStage, pageOffset, data?.items]);

  const selectedList = useMemo(
    () => docs.filter((item) => selectedIds.has(item.id)),
    [docs, selectedIds],
  );
  const selectedMarkable = selectedList.filter(canMarkReadyItem);
  const selectedPushable = selectedList.filter(canPushItem);
  const selectableDocs = useMemo(
    () =>
      activeStage === ACCOUNTING_QUEUE_STAGE.NEEDS_APPROVAL
        ? docs.filter(canMarkReadyItem)
        : docs.filter(canPushItem),
    [activeStage, docs],
  );
  const allChecked =
    selectableDocs.length > 0 &&
    selectableDocs.every((item) => selectedIds.has(item.id));

  const busy =
    markingReady ||
    bulkMarkingReady ||
    syncing ||
    bulkSyncing ||
    retrying ||
    directUnlocking;
  const canMarkReadyAction = canPerformAction("accounting.ready.mark");
  const canSyncAction = canPerformAction("accounting.ready.sync");
  const canSelectInStage =
    activeStage === ACCOUNTING_QUEUE_STAGE.NEEDS_APPROVAL
      ? canMarkReadyAction
      : canSyncAction;

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
    else setSelectedIds(new Set(selectableDocs.map((item) => item.id)));
  };

  const handleDocumentTabChange = (tab) => {
    setActiveTab(tab);
    setActiveStage(ACCOUNTING_QUEUE_STAGE.NEEDS_APPROVAL);
    setPageOffset(0);
    setSelectedIds(new Set());
  };

  const handleStageChange = (stage) => {
    setActiveStage(stage);
    setPageOffset(0);
    setSelectedIds(new Set());
  };

  const refreshAfterAction = async ({
    clearSelection = true,
    refreshLogs = false,
  } = {}) => {
    if (clearSelection) setSelectedIds(new Set());
    await refetch();
    if (refreshLogs && showLogs) {
      await refetchLogs();
    }
  };

  const handleMarkReady = async (item) => {
    if (!guardAction("accounting.ready.mark")) return;
    try {
      const result = await markReady({
        objectType: item.objectType,
        objectId: item.objectId,
      }).unwrap();
      toast.success(result?.message || "Item marked as Accounting Ready");
      await refreshAfterAction();
    } catch (err) {
      toast.error(
        getAccountingErrorMessage(
          err,
          "Could not mark item as Accounting Ready",
        ),
      );
    }
  };

  const handleBulkMarkReady = async () => {
    if (!guardAction("accounting.ready.mark")) return;
    if (selectedMarkable.length === 0) {
      toast.info("Select at least one item to mark Accounting Ready");
      return;
    }
    try {
      const items = selectedMarkable.map((item) => ({
        objectType: item.objectType,
        objectId: item.objectId,
      }));
      try {
        await bulkMarkReady({ items }).unwrap();
      } catch (bulkError) {
        if (!isBulkMarkReadyUnsupported(bulkError)) throw bulkError;
        await Promise.all(items.map((item) => markReady(item).unwrap()));
      }
      toast.success(
        selectedMarkable.length === 1
          ? "Item marked as Accounting Ready"
          : "Items marked as Accounting Ready",
      );
      await refreshAfterAction();
    } catch (err) {
      toast.error(
        getAccountingErrorMessage(
          err,
          "Could not mark selected items as Accounting Ready",
        ),
      );
    }
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
      await refreshAfterAction({ refreshLogs: true });
    } catch (err) {
      toast.error(getAccountingErrorMessage(err, "Sync failed"));
    }
  };

  const handleRetry = async (item) => {
    if (!guardAction("accounting.ready.sync")) return;
    try {
      const result = await retryItem({ id: item.id }).unwrap();
      toast.success(result?.message || "Retry succeeded");
      await refreshAfterAction({ clearSelection: false, refreshLogs: true });
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
      await refreshAfterAction({ refreshLogs: true });
    } catch (err) {
      toast.error(getAccountingErrorMessage(err, "Bulk sync failed"));
    }
  };

  const handleDirectUnlock = async (item) => {
    if (
      !canPerformAction("accounting.ready.unlock") &&
      !guardAction("accounting.ready.unlockApprove")
    ) {
      return;
    }
    try {
      const result = await directUnlock({ id: item.id }).unwrap();
      toast.success(result?.message || "Item unlocked");
      await refreshAfterAction({ refreshLogs: true });
    } catch (err) {
      toast.error(getAccountingErrorMessage(err, "Could not unlock item"));
    }
  };

  const handlePreview = async (item) => {
    try {
      const result = await loadQueueItemDetail({
        objectType: item.objectType,
        objectId: item.objectId,
      }).unwrap();
      setPreviewDetail({
        ...result,
        objectType: result?.objectType || item.objectType,
        objectId: result?.objectId || item.objectId,
      });
      setPreviewOpen(true);
    } catch (err) {
      toast.error(
        getAccountingErrorMessage(err, "Could not load item preview"),
      );
    }
  };

  const handleDownloadLogs = async () => {
    if (!guardAction("accounting.syncLogs.download")) return;
    try {
      const blob = await downloadLogs({
        objectType: activeObjectType,
      }).unwrap();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `accounting-sync-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("Sync logs downloaded");
    } catch (err) {
      toast.error(
        getAccountingErrorMessage(err, "Failed to download sync logs"),
      );
    }
  };

  const emptyMessage =
    activeStage === ACCOUNTING_QUEUE_STAGE.NEEDS_APPROVAL
      ? "No records are waiting to be marked Accounting Ready."
      : "No items are ready for ERP sync.";

  const renderRowActions = (item) => {
    const previewButton = (
      <Button
        size="sm"
        variant="ghost"
        disabled={previewFetching}
        onClick={() => handlePreview(item)}
      >
        <Eye className="mr-1 h-3.5 w-3.5" />
        Preview
      </Button>
    );

    if (activeStage === ACCOUNTING_QUEUE_STAGE.NEEDS_APPROVAL) {
      return (
        <div className="flex flex-nowrap justify-start gap-1.5">
          {previewButton}
          {canMarkReadyItem(item) && canMarkReadyAction ? (
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => handleMarkReady(item)}
            >
              Mark as Accounting Ready
            </Button>
          ) : null}
        </div>
      );
    }

    const canPush = canPushItem(item);
    const canRetry = canRetryItem(item);
    const canDirectUnlock =
      item.locked &&
      (canPerformAction("accounting.ready.unlock") ||
        canPerformAction("accounting.ready.unlockApprove"));

    return (
      <div className="flex flex-nowrap justify-start gap-1.5">
        {previewButton}
        {item.locked ? (
          <>
            {canDirectUnlock ? (
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => handleDirectUnlock(item)}
              >
                <Unlock className="mr-1 h-3.5 w-3.5" />
                Unlock
              </Button>
            ) : null}
          </>
        ) : null}
        {canPush && canSyncAction ? (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => handleSync(item)}
          >
            Sync
          </Button>
        ) : null}
        {canRetry && canSyncAction ? (
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
      </div>
    );
  };

  const renderQueueCell = (item, columnKey) => {
    switch (columnKey) {
      case "select":
        return canSelectInStage ? (
          <Checkbox
            checked={selectedIds.has(item.id)}
            disabled={
              busy ||
              (activeStage === ACCOUNTING_QUEUE_STAGE.NEEDS_APPROVAL
                ? !canMarkReadyItem(item)
                : !canPushItem(item))
            }
            onCheckedChange={() => toggleOne(item.id)}
            aria-label={`Select ${item.docNo}`}
            data-testid={`ready-select-${item.id}`}
          />
        ) : null;
      case "docNo":
        return item.docNo;
      case "vendor":
        return item.vendor;
      case "source":
        return <SourceBadge item={item} />;
      case "amount":
        return formatCurrencyCompact(item.amount);
      case "bizStatus":
        return <BizStatusBadge status={item.bizStatus} />;
      case "accStatus":
        return <AccStatusBadge status={item.accStatus} />;
      case "erpStatus":
        return <ErpStatusBadge status={item.erpStatus} />;
      case "unlockStatus":
        return <UnlockStatus status={item.unlockRequestStatus} />;
      case "action":
        return renderRowActions(item);
      default:
        return item[columnKey] ?? "—";
    }
  };

  const renderQueueRow = (item, _rowIndex, columns) => (
    <TableRow
      key={item.id}
      className={selectedIds.has(item.id) ? "bg-primary/[0.03]" : undefined}
      data-testid={`ready-row-${item.id}`}
    >
      {columns.map((column) => (
        <TableCell key={column.key} className={column.cellClassName}>
          {renderQueueCell(item, column.key)}
        </TableCell>
      ))}
    </TableRow>
  );

  return (
    <>
      <Card
        className="overflow-hidden shadow-sm"
        data-testid="accounting-ready-queue"
      >
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
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`}
                />
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

            {selectedIds.size > 0 &&
            activeStage === ACCOUNTING_QUEUE_STAGE.NEEDS_APPROVAL &&
            canMarkReadyAction ? (
              <Button
                size="sm"
                disabled={busy || selectedMarkable.length === 0}
                onClick={handleBulkMarkReady}
              >
                {markingReady || bulkMarkingReady ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Lock className="mr-1.5 h-3.5 w-3.5" />
                )}
                {markingReady || bulkMarkingReady
                  ? "Marking..."
                  : selectedMarkable.length > 1
                    ? `Mark ${selectedMarkable.length} as Accounting Ready`
                    : "Mark selected as Accounting Ready"}
              </Button>
            ) : null}

            {selectedIds.size > 0 &&
            activeStage === ACCOUNTING_QUEUE_STAGE.ACCOUNTING_READY &&
            canSyncAction ? (
              <Button
                size="sm"
                disabled={busy || selectedPushable.length === 0}
                onClick={handleBulkPush}
              >
                {bulkSyncing ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Zap className="mr-1.5 h-3.5 w-3.5" />
                )}
                {bulkSyncing
                  ? "Pushing..."
                  : selectedPushable.length > 1
                    ? `Push ${selectedPushable.length} to ERP`
                    : "Push selected to ERP"}
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
                  onClick={() => handleDocumentTabChange(key)}
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
                      active
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {getDocumentCount(key)}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex gap-2 border-t px-5 py-3">
            {QUEUE_STAGES.map((stage) => {
              const active = activeStage === stage;
              return (
                <Button
                  key={stage}
                  type="button"
                  variant={active ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleStageChange(stage)}
                  className="gap-2"
                >
                  {ACCOUNTING_QUEUE_STAGE_LABELS[stage]}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                      active
                        ? "bg-white/20 text-current"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {getStageCount(stage)}
                  </span>
                </Button>
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
              {getAccountingErrorMessage(
                error,
                "Failed to load accounting queue.",
              )}
              <div className="mt-4">
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  Retry
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <AppDataTable
                tableHeader={[
                  {
                    ...QUEUE_TABLE_HEADER[0],
                    title: canSelectInStage ? (
                      <Checkbox
                        checked={allChecked}
                        disabled={selectableDocs.length === 0 || busy}
                        onCheckedChange={toggleAll}
                        aria-label="Select all rows"
                        data-testid="ready-select-all"
                      />
                    ) : null,
                  },
                  ...QUEUE_TABLE_HEADER.slice(1),
                ]}
                tableData={docs}
                renderRow={renderQueueRow}
                emptyMessage={emptyMessage}
                emptyColSpan={QUEUE_TABLE_HEADER.length}
                emptyCellClassName="py-10 not-italic"
                stickyHeader={false}
                striped={false}
                headClassName="bg-muted/50"
                tableClassName="border-collapse"
              />
              <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span>
                  {total === 0
                    ? "Showing 0 records"
                    : `Showing ${offset + 1}-${Math.min(offset + docs.length, total)} of ${total}`}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!hasPreviousPage || isFetching}
                    onClick={() => setPageOffset(Math.max(offset - limit, 0))}
                  >
                    Previous
                  </Button>
                  <span className="text-xs">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!hasNextPage || isFetching}
                    onClick={() => setPageOffset(offset + limit)}
                  >
                    Next
                  </Button>
                </div>
              </div>
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
                    <div
                      key={log.id || log.at}
                      className="rounded-lg border bg-muted/20 p-3 text-sm"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">
                          {log.reference || log.docNo || "—"} ·{" "}
                          {log.action || "sync"}
                        </span>
                        <Badge
                          variant="outline"
                          className={statusBadgeClass(log.status)}
                        >
                          {log.status}
                        </Badge>
                      </div>
                      {log.message ? (
                        <p className="mt-1 text-muted-foreground">
                          {log.message}
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDateTime(log.at || log.createdAt)}
                      </p>
                    </div>
                  ))}
                  {(Array.isArray(logs) ? logs : []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No sync logs yet.
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>
      <AccountingQueuePreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        detail={previewDetail}
      />
    </>
  );
};

export default ReadyForAccountingQueue;

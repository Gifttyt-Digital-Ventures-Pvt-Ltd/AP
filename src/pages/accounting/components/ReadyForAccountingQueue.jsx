import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  BookOpen,
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
import {
  useGetTallyConnectionsQuery,
  useTriggerTallySyncMutation,
  useTriggerZohoAccountingReadyPushMutation,
} from "../../../Services/apis/integrationsApi";
import AccountingQueuePreviewDialog from "./AccountingQueuePreviewDialog";
import {
  ERP_PROVIDER,
} from "../../integrations/integrationSummary";
import {
  ACC_STATUS,
  ACCOUNTING_QUEUE_STAGE,
  ACCOUNTING_QUEUE_STAGE_LABELS,
  ERP_STATUS,
  OBJECT_TYPE,
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

const BILL_QUEUE_TAB = "Invoice/PI";
const BILL_OBJECT_TYPES = ["BILLS"];

const QUEUE_TABS = [
  { key: QUEUE_TAB.PO, icon: ShoppingCart, objectTypes: [OBJECT_TYPE.PO] },
  { key: QUEUE_TAB.GRN, icon: Package, objectTypes: [OBJECT_TYPE.GRN] },
  { key: BILL_QUEUE_TAB, icon: FileText, objectTypes: BILL_OBJECT_TYPES },
  { key: QUEUE_TAB.VENDOR, icon: FileText, objectTypes: [OBJECT_TYPE.VENDOR] },
  { key: QUEUE_TAB.COA, icon: BookOpen, objectTypes: [OBJECT_TYPE.COA] },
];

const getObjectTypesForTab = (tab) =>
  QUEUE_TABS.find((item) => item.key === tab)?.objectTypes || [
    TAB_TO_OBJECT_TYPE[tab],
  ];

const getPrimaryObjectTypeForTab = (tab) => getObjectTypesForTab(tab)[0];

const QUEUE_STAGES = [
  ACCOUNTING_QUEUE_STAGE.NEEDS_APPROVAL,
  ACCOUNTING_QUEUE_STAGE.ACCOUNTING_READY,
];

const PAGE_SIZE = 25;
const SHOW_ROW_SYNC_ACTION = true;

const isValidQueueTab = (tab) => QUEUE_TABS.some((item) => item.key === tab);
const isValidQueueStage = (stage) => QUEUE_STAGES.includes(stage);

const getInitialQueueState = (searchParams) => {
  const tab = searchParams.get("queueTab");
  const stage = searchParams.get("queueStage");
  const offset = Number(searchParams.get("queueOffset"));

  return {
    tab: isValidQueueTab(tab) ? tab : QUEUE_TAB.PO,
    stage: isValidQueueStage(stage)
      ? stage
      : ACCOUNTING_QUEUE_STAGE.NEEDS_APPROVAL,
    offset: Number.isFinite(offset) && offset > 0 ? offset : 0,
  };
};

const toArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.connections)) return value.connections;
  if (Array.isArray(value?.data?.connections)) return value.data.connections;
  return [];
};

const getConnectionId = (connection = {}) =>
  connection.connectionId || connection.connection_id || connection.id || "";

const getConnectionStatus = (connection = {}) =>
  String(
    connection.status ||
      connection.connectionStatus ||
      connection.connection_status ||
      "",
  ).toUpperCase();

const isConnectedTallyConnection = (connection = {}) =>
  getConnectionId(connection) && getConnectionStatus(connection) === "CONNECTED";

const ERP_PUSH_OBJECT_TYPE = {
  PO: "PURCHASE_ORDERS",
  GRN: "GOODS_RECEIPT_NOTES",
  BILLS: "BILLS",
  INVOICE: "BILLS",
  PI: "BILLS",
  VENDOR: "VENDORS",
  COA: "CHART_OF_ACCOUNTS",
  CHART_OF_ACCOUNTS: "CHART_OF_ACCOUNTS",
};

const ERP_PUSH_OBJECT_LABEL = {
  PURCHASE_ORDERS: "Purchase Orders",
  GOODS_RECEIPT_NOTES: "Goods Receipts",
  BILLS: "Bills",
  VENDORS: "Vendors",
  CHART_OF_ACCOUNTS: "COA",
};

const getErpPushObjectType = (objectType) =>
  ERP_PUSH_OBJECT_TYPE[objectType] || objectType;

const getErpPushObjectLabel = (objectType) =>
  ERP_PUSH_OBJECT_LABEL[getErpPushObjectType(objectType)] || objectType;

const getZohoPushResultCounts = (result = {}) => {
  const failedItems = Array.isArray(result.failedItems) ? result.failedItems : [];
  const successIds = Array.isArray(result.successIds) ? result.successIds : [];
  return {
    total: Number(result.total ?? successIds.length + failedItems.length) || 0,
    success: Number(result.success ?? result.successCount ?? successIds.length) || 0,
    failed: Number(result.failed ?? result.failedCount ?? failedItems.length) || 0,
    failedItems,
  };
};

const getZohoFailureMessage = (failedItems = []) => {
  const firstReason = failedItems
    .map((item) => item.reason || item.message || item.error)
    .find(Boolean);
  return firstReason ? `: ${firstReason}` : "";
};

const showZohoPushToast = (result, fallbackSuccessMessage) => {
  const { total, success, failed, failedItems } = getZohoPushResultCounts(result);
  if (failed > 0 && success === 0) {
    toast.error(
      result?.message ||
        `Zoho push failed for ${failed} item(s)${getZohoFailureMessage(failedItems)}`,
    );
    return false;
  }
  if (failed > 0) {
    toast.warning(
      result?.message ||
        `Zoho push partially completed: ${success} succeeded, ${failed} failed${getZohoFailureMessage(failedItems)}`,
    );
    return true;
  }
  toast.success(
    result?.message ||
      (total > 0 ? `Zoho push completed for ${success || total} item(s)` : fallbackSuccessMessage),
  );
  return true;
};

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
  { key: "erpStatus", title: "Accounting ERP" },
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

const toSyncStatusLabel = (status) =>
  String(status || "")
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

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
    [ERP_STATUS.QUEUED]: "border-amber-200 bg-amber-50 text-amber-800",
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

const AccountingErpStatusBadge = ({ item, loading = false }) => {
  if (loading) {
    return (
      <Badge
        variant="outline"
        className="border-amber-200 bg-amber-50 text-amber-800"
      >
        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
        Syncing...
      </Badge>
    );
  }

  return (
    <ErpStatusBadge
      status={item.erpStatus || toSyncStatusLabel(item.syncStatus)}
    />
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

const ReadyForAccountingQueue = ({
  erpSyncAvailable = false,
  erpStatusLoading = false,
  activeErpProvider = null,
}) => {
  const { guardAction, canPerformAction } = useActionGuard();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQueueState = useMemo(
    () => getInitialQueueState(searchParams),
    [searchParams],
  );
  const [activeTab, setActiveTab] = useState(initialQueueState.tab);
  const [activeStage, setActiveStage] = useState(initialQueueState.stage);
  const [pageOffset, setPageOffset] = useState(initialQueueState.offset);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [syncingRowIds, setSyncingRowIds] = useState(() => new Set());
  const [bulkPushing, setBulkPushing] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDetail, setPreviewDetail] = useState(null);
  const activeObjectType = getPrimaryObjectTypeForTab(activeTab);

  const updateQueueUrlState = (nextState = {}) => {
    setSearchParams((currentParams) => {
      const params = new URLSearchParams(currentParams);
      const nextTab = nextState.tab ?? activeTab;
      const nextStage = nextState.stage ?? activeStage;
      const nextOffset = Number(nextState.offset ?? pageOffset) || 0;

      params.set("queueTab", nextTab);
      params.set("queueStage", nextStage);
      if (nextOffset > 0) {
        params.set("queueOffset", String(nextOffset));
      } else {
        params.delete("queueOffset");
      }
      return params;
    }, { replace: true });
  };

  useEffect(() => {
    setActiveTab(initialQueueState.tab);
    setActiveStage(initialQueueState.stage);
    setPageOffset(initialQueueState.offset);
  }, [
    initialQueueState.offset,
    initialQueueState.stage,
    initialQueueState.tab,
  ]);

  const primaryQueueQuery = useGetAccountingReadyQueueQuery({
      objectType: activeObjectType,
      stage: activeStage,
      limit: PAGE_SIZE,
      offset: pageOffset,
    });
  const data = primaryQueueQuery.data;
  const isLoading = primaryQueueQuery.isLoading;
  const isFetching = primaryQueueQuery.isFetching;
  const isError = primaryQueueQuery.isError;
  const error = primaryQueueQuery.error;
  const refetch = primaryQueueQuery.refetch;
  const {
    data: logsData,
    isLoading: logsLoading,
    isFetching: logsFetching,
    refetch: refetchLogs,
  } = useGetAccountingSyncLogsQuery(
    { objectType: activeObjectType, limit: PAGE_SIZE, offset: 0 },
    { skip: !showLogs },
  );
  const { data: tallyConnectionsData } = useGetTallyConnectionsQuery(undefined, {
    skip:
      activeStage !== ACCOUNTING_QUEUE_STAGE.ACCOUNTING_READY ||
      activeErpProvider !== ERP_PROVIDER.TALLY,
  });

  const [markReady, { isLoading: markingReady }] =
    useMarkAccountingReadyItemMutation();
  const [bulkMarkReady, { isLoading: bulkMarkingReady }] =
    useBulkMarkAccountingReadyItemsMutation();
  const [syncItem] = useSyncAccountingReadyItemMutation();
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
  const [triggerTallySync] = useTriggerTallySyncMutation();
  const [triggerZohoPush] = useTriggerZohoAccountingReadyPushMutation();

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
  const activeTallyConnection = useMemo(
    () => toArray(tallyConnectionsData).find(isConnectedTallyConnection),
    [tallyConnectionsData],
  );
  const activeTallyConnectionId = getConnectionId(activeTallyConnection);
  const hasTallyConnection =
    activeErpProvider === ERP_PROVIDER.TALLY && Boolean(activeTallyConnectionId);
  const isZohoConnection = activeErpProvider === ERP_PROVIDER.ZOHO_BOOKS;
  const isZohoUnsupportedActiveObject =
    isZohoConnection &&
    String(activeObjectType || "").toUpperCase() === OBJECT_TYPE.GRN;
  const isZohoUnsupportedSyncItem = (item = {}) =>
    isZohoConnection &&
    String(item.objectType || activeObjectType || "").toUpperCase() ===
      OBJECT_TYPE.GRN;
  const canPushQueueItem = (item = {}) =>
    canPushItem(item) && !isZohoUnsupportedSyncItem(item);
  const activeErpPushObjectLabel = getErpPushObjectLabel(activeObjectType);
  const activePushButtonLabel = activeTab === BILL_QUEUE_TAB
    ? BILL_QUEUE_TAB
    : activeErpPushObjectLabel;

  const getDocumentCount = (tab) => {
    const objectTypes = getObjectTypesForTab(tab);
    const counts = data?.documentCounts || {};
    const objectTypeCount = objectTypes.reduce(
      (sum, objectType) => {
        if (objectType === OBJECT_TYPE.COA) {
          return sum + (Number(counts[objectType] ?? counts.COA) || 0);
        }
        return sum + (Number(counts[objectType]) || 0);
      },
      0,
    );
    if (objectTypeCount > 0) return objectTypeCount;
    if (tab === BILL_QUEUE_TAB) {
      const splitBillCount =
        (Number(counts[OBJECT_TYPE.INVOICE]) || 0) +
        (Number(counts[OBJECT_TYPE.PI]) || 0);
      if (splitBillCount > 0) return splitBillCount;
    }
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

  useEffect(() => {
    setSyncingRowIds(new Set());
  }, [activeTab, activeStage, pageOffset]);

  const selectedList = useMemo(
    () => docs.filter((item) => selectedIds.has(item.id)),
    [docs, selectedIds],
  );
  const isAccountingReadyStage =
    activeStage === ACCOUNTING_QUEUE_STAGE.ACCOUNTING_READY;
  const tableColumns = useMemo(
    () =>
      isAccountingReadyStage
        ? QUEUE_TABLE_HEADER.filter(
            (column) =>
              column.key !== "bizStatus" && column.key !== "accStatus",
          )
        : QUEUE_TABLE_HEADER,
    [isAccountingReadyStage],
  );
  const isRowSyncing = (item) => syncingRowIds.has(item.id);
  const updateRowSyncing = (id, loading) => {
    setSyncingRowIds((prev) => {
      const next = new Set(prev);
      if (loading) next.add(id);
      else next.delete(id);
      return next;
    });
  };
  const selectedMarkable = selectedList.filter(canMarkReadyItem);
  const selectedPushable = selectedList.filter(
    (item) => canPushQueueItem(item) && !isRowSyncing(item),
  );
  const selectableDocs = useMemo(
    () =>
      activeStage === ACCOUNTING_QUEUE_STAGE.NEEDS_APPROVAL
        ? docs.filter(canMarkReadyItem)
        : docs.filter((item) => canPushQueueItem(item) && !syncingRowIds.has(item.id)),
    [activeStage, docs, syncingRowIds, isZohoConnection, activeObjectType],
  );
  const allChecked =
    selectableDocs.length > 0 &&
    selectableDocs.every((item) => selectedIds.has(item.id));

  const busy =
    markingReady ||
    bulkMarkingReady ||
    bulkPushing ||
    bulkSyncing ||
    retrying ||
    directUnlocking;
  const refreshBusy = manualRefreshing || isFetching || (showLogs && logsFetching);
  const canMarkReadyAction = canPerformAction("accounting.ready.mark");
  const canSyncAction = canPerformAction("accounting.ready.sync");
  const canSelectInStage =
    activeStage === ACCOUNTING_QUEUE_STAGE.NEEDS_APPROVAL
      ? canMarkReadyAction
      : canSyncAction && erpSyncAvailable;
  const pushInProgress = bulkSyncing || bulkPushing;
  const syncDisabledReason = erpStatusLoading
    ? "Checking ERP connection status..."
    : "Connect an ERP before syncing to ERP.";

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
    setPageOffset(0);
    setSelectedIds(new Set());
    updateQueueUrlState({ tab, offset: 0 });
  };

  const handleStageChange = (stage) => {
    setActiveStage(stage);
    setPageOffset(0);
    setSelectedIds(new Set());
    updateQueueUrlState({ stage, offset: 0 });
  };

  const handlePageOffsetChange = (nextOffset) => {
    const safeOffset = Math.max(Number(nextOffset) || 0, 0);
    setPageOffset(safeOffset);
    updateQueueUrlState({ offset: safeOffset });
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

  const handleManualRefresh = async () => {
    setManualRefreshing(true);
    try {
      await refetch();
      if (showLogs) {
        await refetchLogs();
      }
      toast.success("Accounting queue refreshed");
    } catch (err) {
      toast.error(
        getAccountingErrorMessage(err, "Failed to refresh accounting queue"),
      );
    } finally {
      setManualRefreshing(false);
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
    if (!erpSyncAvailable) {
      toast.info(syncDisabledReason);
      return;
    }
    if (item.accStatus === ACC_STATUS.SYNCED && !item.eligibleForSync) {
      toast.info("Already synced — no changes since last successful sync");
      return;
    }
    updateRowSyncing(item.id, true);
    if (hasTallyConnection) {
      if (!item.objectId) {
        updateRowSyncing(item.id, false);
        toast.error("This row is missing an entity ID for Tally push");
        return;
      }
      try {
        const result = await triggerTallySync({
          connectionId: activeTallyConnectionId,
          object: getErpPushObjectType(item.objectType || activeObjectType),
          direction: "PUSH",
          ids: [item.objectId],
        }).unwrap();
        toast.success(result?.message || "Selected item queued for Tally push");
        await refreshAfterAction({ clearSelection: false, refreshLogs: true });
      } catch (err) {
        toast.error(getAccountingErrorMessage(err, "Tally push failed"));
      } finally {
        updateRowSyncing(item.id, false);
      }
      return;
    }
    if (isZohoConnection) {
      if (!item.objectId) {
        updateRowSyncing(item.id, false);
        toast.error("This row is missing an entity ID for Zoho push");
        return;
      }
      try {
        const result = await triggerZohoPush({
          objectType: item.objectType || activeObjectType,
          ids: [item.objectId],
        }).unwrap();
        showZohoPushToast(result, "Selected item queued for Zoho push");
        await refreshAfterAction({ clearSelection: false, refreshLogs: true });
      } catch (err) {
        toast.error(getAccountingErrorMessage(err, "Zoho push failed"));
      } finally {
        updateRowSyncing(item.id, false);
      }
      return;
    }
    try {
      const result = await syncItem({ id: item.id }).unwrap();
      toast.success(result?.message || "Synced to ERP successfully");
      await refreshAfterAction({ refreshLogs: true });
    } catch (err) {
      toast.error(getAccountingErrorMessage(err, "Sync failed"));
    } finally {
      updateRowSyncing(item.id, false);
    }
  };

  const handleRetry = async (item) => {
    if (!guardAction("accounting.ready.sync")) return;
    if (!erpSyncAvailable) {
      toast.info(syncDisabledReason);
      return;
    }
    if (isZohoConnection) {
      if (!item.objectId) {
        toast.error("This row is missing an entity ID for Zoho retry");
        return;
      }
      updateRowSyncing(item.id, true);
      try {
        const result = await triggerZohoPush({
          objectType: item.objectType || activeObjectType,
          ids: [item.objectId],
        }).unwrap();
        showZohoPushToast(result, "Selected item queued for Zoho retry");
        await refreshAfterAction({ clearSelection: false, refreshLogs: true });
      } catch (err) {
        toast.error(getAccountingErrorMessage(err, "Zoho retry failed"));
      } finally {
        updateRowSyncing(item.id, false);
      }
      return;
    }
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
    if (!erpSyncAvailable) {
      toast.info(syncDisabledReason);
      return;
    }
    const erpPushObjectType = getErpPushObjectType(activeObjectType);
    if (hasTallyConnection) {
      const selectedEntityIds = selectedPushable
        .map((item) => item.objectId)
        .filter(Boolean);
      if (selectedPushable.length > 0 && selectedEntityIds.length === 0) {
        toast.error("Selected rows are missing entity IDs for Tally push");
        return;
      }
      setBulkPushing(true);
      try {
        const result = await triggerTallySync({
          connectionId: activeTallyConnectionId,
          object: erpPushObjectType,
          direction: "PUSH",
          ids: selectedEntityIds.length > 0 ? selectedEntityIds : undefined,
        }).unwrap();
        toast.success(
          result?.message ||
            (selectedEntityIds.length > 0
              ? `Queued ${selectedEntityIds.length} selected item(s) for Tally push`
              : `${erpPushObjectType} push to Tally queued`),
        );
        await refreshAfterAction({ clearSelection: false, refreshLogs: true });
      } catch (err) {
        toast.error(getAccountingErrorMessage(err, "Tally push failed"));
      } finally {
        setBulkPushing(false);
      }
      return;
    }

    if (isZohoConnection) {
      const selectedEntityIds = selectedPushable
        .map((item) => item.objectId)
        .filter(Boolean);
      if (selectedPushable.length > 0 && selectedEntityIds.length === 0) {
        toast.error("Selected rows are missing entity IDs for Zoho push");
        return;
      }
      setBulkPushing(true);
      try {
        const result = await triggerZohoPush({
          objectType: activeObjectType,
          ids: selectedEntityIds.length > 0 ? selectedEntityIds : undefined,
        }).unwrap();
        showZohoPushToast(
          result,
          selectedEntityIds.length > 0
            ? `Queued ${selectedEntityIds.length} selected item(s) for Zoho push`
            : `${erpPushObjectType} push to Zoho queued`,
        );
        await refreshAfterAction({ clearSelection: false, refreshLogs: true });
      } catch (err) {
        toast.error(getAccountingErrorMessage(err, "Zoho push failed"));
      } finally {
        setBulkPushing(false);
      }
      return;
    }

    const ids = selectedPushable.map((item) => item.id);
    if (ids.length === 0) {
      toast.info("Select at least one Ready or Failed item to push");
      return;
    }
    setBulkPushing(true);
    try {
      const result = await bulkSync({ ids, mode: "SYNC" }).unwrap();
      toast.success(result?.message || `Pushed ${ids.length} item(s) to ERP`);
      await refreshAfterAction({ refreshLogs: true });
    } catch (err) {
      toast.error(getAccountingErrorMessage(err, "Bulk sync failed"));
    } finally {
      setBulkPushing(false);
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
    const rowSyncing = isRowSyncing(item);
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

    const zohoUnsupportedSync = isZohoUnsupportedSyncItem(item);
    const canPush = canPushQueueItem(item);
    const canRetry = canRetryItem(item);
    const canDirectUnlock =
      item.locked &&
      item.directUnlockAllowed !== false &&
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
                disabled={busy || rowSyncing}
                onClick={() => handleDirectUnlock(item)}
              >
                <Unlock className="mr-1 h-3.5 w-3.5" />
                Unlock
              </Button>
            ) : null}
          </>
        ) : null}
        {SHOW_ROW_SYNC_ACTION && canPush && canSyncAction ? (
          <Button
            size="sm"
            variant="outline"
            disabled={busy || rowSyncing || !erpSyncAvailable}
            title={
              item.syncDisabledReason ||
              (!erpSyncAvailable ? syncDisabledReason : undefined)
            }
            onClick={() => handleSync(item)}
          >
            {rowSyncing ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : null}
            {rowSyncing ? "Syncing..." : "Sync"}
          </Button>
        ) : null}
        {zohoUnsupportedSync && canSyncAction ? (
          <Button
            size="sm"
            variant="outline"
            disabled
            title="GRN push to Zoho is not supported yet."
          >
            Sync
          </Button>
        ) : null}
        {canRetry && canSyncAction ? (
          <Button
            size="sm"
            variant="outline"
            disabled={busy || rowSyncing || !erpSyncAvailable}
            title={!erpSyncAvailable ? syncDisabledReason : undefined}
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
              isRowSyncing(item) ||
              (activeStage === ACCOUNTING_QUEUE_STAGE.NEEDS_APPROVAL
                ? !canMarkReadyItem(item)
                : !canPushQueueItem(item))
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
        return (
          <AccountingErpStatusBadge item={item} loading={isRowSyncing(item)} />
        );
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
      className={
        isRowSyncing(item)
          ? "bg-amber-50/40"
          : selectedIds.has(item.id)
            ? "bg-primary/[0.03]"
            : undefined
      }
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
                onClick={handleManualRefresh}
                disabled={refreshBusy}
                className="h-8 gap-1.5 text-xs"
                aria-label="Refresh accounting queue"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${refreshBusy ? "animate-spin" : ""}`}
                />
                Refresh
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

            {activeStage === ACCOUNTING_QUEUE_STAGE.ACCOUNTING_READY &&
            canSyncAction ? (
              <Button
                size="sm"
                disabled={busy || !erpSyncAvailable || isZohoUnsupportedActiveObject}
                title={
                  isZohoUnsupportedActiveObject
                    ? "GRN push to Zoho is not supported yet."
                    : !erpSyncAvailable
                      ? syncDisabledReason
                      : undefined
                }
                onClick={handleBulkPush}
              >
                {pushInProgress ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Zap className="mr-1.5 h-3.5 w-3.5" />
                )}
                {pushInProgress
                  ? "Pushing..."
                  : hasTallyConnection
                    ? selectedPushable.length > 1
                      ? `Push ${selectedPushable.length} ${activePushButtonLabel} to ERP`
                      : selectedPushable.length === 1
                        ? `Push selected ${activePushButtonLabel} to ERP`
                        : `Push ${activePushButtonLabel} to ERP`
                    : selectedPushable.length > 1
                    ? `Push ${selectedPushable.length} to ERP`
                    : selectedPushable.length === 1
                      ? "Push selected to ERP"
                      : "Push to ERP"}
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
                    ...tableColumns[0],
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
                  ...tableColumns.slice(1),
                ]}
                tableData={docs}
                renderRow={renderQueueRow}
                emptyMessage={emptyMessage}
                emptyColSpan={tableColumns.length}
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
                    onClick={() => handlePageOffsetChange(offset - limit)}
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
                    onClick={() => handlePageOffsetChange(offset + limit)}
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

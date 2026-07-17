import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  ChevronDown,
  ChevronUp,
  Check,
  Clock,
  ClipboardCopy,
  Database,
  Download,
  Loader2,
  Plug,
  RefreshCw,
  Settings2,
  TriangleAlert,
  Unplug,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import {
  useCreateTallyConnectionMutation,
  useGetTallyConnectionQuery,
  useGetTallyConnectionsQuery,
  useGetTallyLogsQuery,
  useGetTallyProvidersQuery,
  useGetTallySyncStatusQuery,
  useLazyDownloadTallyWindowsConnectorQuery,
  useDisconnectTallyConnectionMutation,
  useTriggerTallySyncMutation,
} from "../../../Services/apis/integrationsApi";
import { useActionGuard } from "../../../hooks/useActionGuard";
import { Button } from "../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import {
  formatDateTime,
  getErrorText,
  statusBadgeClass,
  toArray,
} from "../../integrations/utils";

const POLL_MS = 4000;
const PAIRING_TIMEOUT_MS = 10 * 60 * 1000;
const STALE_HEARTBEAT_MS = 15 * 60 * 1000;

const TALLY_SYNC_ITEMS = [
  "Chart of Accounts",
  "Vendors",
  "Purchase orders",
  "Bills",
  "Goods Receipts",
  "Payments",
];

const TALLY_SYNC_OBJECTS = [
  { key: "CHART_OF_ACCOUNTS", label: "Chart of Accounts" },
  { key: "VENDORS", label: "Vendors" },
  { key: "PURCHASE_ORDERS", label: "Purchase orders" },
  { key: "BILLS", label: "Bills" },
  { key: "GOODS_RECEIPT_NOTES", label: "Goods Receipts" },
  { key: "PAYMENTS", label: "Payments" },
];

const SETUP_CHECKLIST = [
  "Tally is open with the correct company loaded.",
  "Tally XML server is enabled (default port 9000).",
  "Organisation GSTIN in Optifii matches the Tally company GSTIN.",
  "Only one active ERP connection per corporate (disconnect Zoho Books first if needed).",
];

const getConnectionId = (connection) => {
  if (!connection) return "";
  return (
    connection.connectionId || connection.connection_id || connection.id || ""
  );
};

const getStatus = (connection) => {
  if (!connection) return "DISCONNECTED";
  return String(connection.status || "DISCONNECTED").toUpperCase();
};

const getConnectorStatus = (connection) => {
  if (!connection) return "";
  return String(
    connection.connectorStatus || connection.connector_status || "",
  ).toUpperCase();
};

const getDisplayName = (connection) => {
  if (!connection) return "Office Tally Connector";
  return (
    connection.displayName ||
    connection.display_name ||
    "Office Tally Connector"
  );
};

const getHeartbeat = (connection) => {
  if (!connection) return null;
  return (
    connection.lastHeartbeatAt ||
    connection.last_heartbeat_at ||
    connection.lastHeartbeat ||
    connection.last_heartbeat ||
    connection.heartbeatAt ||
    connection.heartbeat_at ||
    connection.connectorLastSeenAt ||
    connection.connector_last_seen_at ||
    connection.lastSeenAt ||
    connection.last_seen_at ||
    null
  );
};

const isHeartbeatStale = (lastHeartbeatAt) => {
  if (!lastHeartbeatAt) return true;
  const timestamp = new Date(lastHeartbeatAt).getTime();
  if (Number.isNaN(timestamp)) return true;
  return Date.now() - timestamp > STALE_HEARTBEAT_MS;
};

const isConnectorActive = (connection) => {
  if (!connection) return false;
  const connectorStatus = getConnectorStatus(connection);
  if (["REVOKED", "DISCONNECTED", "INACTIVE"].includes(connectorStatus))
    return false;
  return getStatus(connection) === "CONNECTED";
};

const getHeaderStatus = (connection) => {
  if (!connection) {
    return { label: "Not Connected", tone: "neutral", icon: "disconnected" };
  }
  const status = getStatus(connection || {});
  const connectorStatus = getConnectorStatus(connection || {});
  const stale =
    status === "CONNECTED" && isHeartbeatStale(getHeartbeat(connection || {}));

  if (status === "DISCONNECTED" || connectorStatus === "REVOKED") {
    return { label: "Disconnected", tone: "neutral", icon: "disconnected" };
  }
  if (status === "CONNECTED" && isConnectorActive(connection) && !stale) {
    return { label: "Connected to Tally", tone: "success", icon: "connected" };
  }
  if (status === "CONNECTED" && stale) {
    return {
      label: "Connector may be offline",
      tone: "warning",
      icon: "warning",
    };
  }
  if (status === "PENDING") {
    return {
      label: "Waiting for Connector pairing",
      tone: "warning",
      icon: "pending",
    };
  }
  if (status === "ERROR") {
    return { label: "Error", tone: "error", icon: "error" };
  }
  return { label: "Not Connected", tone: "neutral", icon: "disconnected" };
};

const getPairingErrorMessage = (error) => {
  const message = getErrorText(error, "Failed to start Tally pairing");
  if (/active erp connection already exists/i.test(message)) {
    return "An active ERP connection already exists. Disconnect it before pairing Tally.";
  }
  if (/pairing is already in progress/i.test(message)) {
    return "A Tally pairing is already in progress. Complete it in the Connector or ask an admin to reset the pending pairing.";
  }
  return message;
};

const TallyLogo = () => (
  <div
    className="text-2xl font-bold italic"
    style={{ fontFamily: "serif", color: "#D32F2F" }}
  >
    <span style={{ color: "#D32F2F" }}>Tally</span>
    {/* <span className="text-xs align-super text-gray-500">.ERP9</span> */}
  </div>
);

const headerToneClass = (tone) => {
  if (tone === "success") return "bg-emerald-50 border-emerald-200";
  if (tone === "warning") return "bg-amber-50 border-amber-200";
  if (tone === "error") return "bg-red-50 border-red-200";
  return "bg-white border-border";
};

const badgeToneClass = (tone) => {
  if (tone === "success") return "bg-emerald-100 text-emerald-700";
  if (tone === "warning") return "bg-amber-100 text-amber-700";
  if (tone === "error") return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-500";
};

const HeaderStatusIcon = ({ icon, className = "h-4 w-4" }) => {
  if (icon === "connected") return <Check className={className} />;
  if (icon === "warning" || icon === "error")
    return <TriangleAlert className={className} />;
  if (icon === "pending")
    return <Loader2 className={`${className} animate-spin`} />;
  return <XCircle className={className} />;
};

const FieldWithCopy = ({ label, value, sensitive = false }) => {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value || "");
      toast.success(`${label} copied`);
    } catch {
      toast.error(`Could not copy ${label.toLowerCase()}`);
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          readOnly
          type={sensitive ? "password" : "text"}
          value={value || ""}
          className="font-mono text-xs"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleCopy}
          disabled={!value}
        >
          <ClipboardCopy className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

const normalizeSyncStatusRows = (response) => {
  const objects = response?.objects || response?.data?.objects || {};
  return TALLY_SYNC_OBJECTS.map(({ key, label }) => {
    const row = objects?.[key] || {};
    return {
      object: key,
      label,
      status: String(
        row.status || row.syncStatus || "NOT_SYNCED",
      ).toUpperCase(),
      synced: Number(row.synced ?? row.recordsSynced ?? 0),
      pending: Number(row.pending ?? 0),
      errored: Number(row.errored ?? row.errorCount ?? row.recordsFailed ?? 0),
      message: row.message || "",
      lastSyncAt: row.lastSyncAt || row.last_sync_at || row.lastSyncedAt,
    };
  });
};

const getLogRows = (response) =>
  toArray(
    response?.logs ||
      response?.items ||
      response?.data?.logs ||
      response?.data ||
      response,
  ).filter(Boolean);

const getBlobFileName = (blob) => {
  if (!blob) return "optifii-tally-connector-windows.exe";
  return "optifii-tally-connector-windows.exe";
};

const TALLY_DOWNLOAD_DEBUG_KEY = "optifii:tally-download-debug";

const isTallyDownloadDebugEnabled = () => {
  if (typeof window === "undefined") return false;
  return (
    import.meta.env.DEV ||
    window.localStorage.getItem(TALLY_DOWNLOAD_DEBUG_KEY) === "true"
  );
};

const debugTallyDownload = (...args) => {
  if (isTallyDownloadDebugEnabled()) {
    console.debug("[TallyConnectorDownload]", ...args);
  }
};

const isBlobResponse = (value) =>
  typeof Blob !== "undefined" && value instanceof Blob;

const getConnectorDownloadPayload = (response) =>
  response?.data && typeof response.data === "object" ? response.data : response;

const getConnectorDownloadUrl = (response) => {
  const payload = getConnectorDownloadPayload(response);
  if (!payload || typeof payload !== "object") return "";
  return (
    payload.downloadUrl ||
    payload.download_url ||
    payload.url ||
    payload.fileUrl ||
    payload.file_url ||
    payload.installerUrl ||
    payload.installer_url ||
    ""
  );
};

const normalizeDownloadUrl = (url) => {
  const value = String(url || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value) || value.startsWith("blob:")) return value;
  const baseUrl = import.meta.env.VITE_BACKEND_URL || window.location.origin;
  return new URL(value, baseUrl).toString();
};

const triggerFileDownload = (href, filename) => {
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
};

const downloadUrlAsBlob = async (downloadUrl) => {
  debugTallyDownload("Fetching returned download URL as Blob", {
    downloadUrl,
  });
  const response = await fetch(downloadUrl);
  debugTallyDownload("Returned download URL response", {
    ok: response.ok,
    status: response.status,
    redirected: response.redirected,
    url: response.url,
    contentType: response.headers.get("content-type"),
    contentDisposition: response.headers.get("content-disposition"),
  });
  if (!response.ok) {
    throw new Error(`Installer download failed (${response.status})`);
  }
  return response.blob();
};

const getConnectorDownloadError = (error) => {
  const message = getErrorText(error, "Could not start installer download");
  if (/abort|aborted/i.test(message)) {
    return "Installer download timed out or was interrupted. Please try again.";
  }
  return message;
};

const TallyIntegrationCard = ({ mode = "full" }) => {
  const showSetup = mode !== "dashboard";
  const showDashboard = mode !== "setup";
  const { guardAction, canPerformAction } = useActionGuard();
  const { data: providersResponse } = useGetTallyProvidersQuery();
  const {
    data: connectionsResponse,
    isLoading: connectionsLoading,
    refetch: refetchConnections,
  } = useGetTallyConnectionsQuery();
  const [createConnection, { isLoading: creating }] =
    useCreateTallyConnectionMutation();
  const [disconnectConnection, { isLoading: disconnecting }] =
    useDisconnectTallyConnectionMutation();
  const [triggerSync, { isLoading: syncing }] = useTriggerTallySyncMutation();
  const [downloadConnector, { isFetching: downloadingConnector }] =
    useLazyDownloadTallyWindowsConnectorQuery();
  const [pairingCredentials, setPairingCredentials] = useState(null);
  const [pairingOpen, setPairingOpen] = useState(false);
  const [displayName, setDisplayName] = useState("Office Tally Connector");
  const [completedConnectionId, setCompletedConnectionId] = useState("");
  const [pairingTimedOut, setPairingTimedOut] = useState(false);
  const [logObjectFilter, setLogObjectFilter] = useState("");
  const [setupDetailsOpen, setSetupDetailsOpen] = useState(false);
  const pairingStartedAt = useRef(0);

  const provider = useMemo(() => {
    const providers = toArray(
      providersResponse?.providers ||
        providersResponse?.data?.providers ||
        providersResponse?.data ||
        providersResponse,
    );
    return (
      providers.find((item) => item?.provider === "TALLY") ||
      providers[0] ||
      null
    );
  }, [providersResponse]);

  const connections = useMemo(
    () =>
      toArray(
        connectionsResponse?.connections ||
          connectionsResponse?.data?.connections ||
          connectionsResponse?.data ||
          connectionsResponse,
      ),
    [connectionsResponse],
  );

  const activeConnection = connections.find((connection) =>
    ["CONNECTED", "PENDING", "ERROR"].includes(getStatus(connection)),
  );
  const disconnectedConnection = connections.find(
    (connection) =>
      getStatus(connection) === "DISCONNECTED" ||
      getConnectorStatus(connection) === "REVOKED",
  );
  const currentListConnection =
    activeConnection || disconnectedConnection || null;
  const resolvedConnectionId =
    getConnectionId(pairingCredentials || {}) ||
    getConnectionId(currentListConnection || {});
  const shouldPollPairing = Boolean(
    showSetup &&
    resolvedConnectionId &&
    (pairingCredentials ||
      getStatus(currentListConnection || {}) === "PENDING"),
  );

  const { data: detailConnection, refetch: refetchDetailConnection } =
    useGetTallyConnectionQuery(resolvedConnectionId, {
      skip: !resolvedConnectionId,
      pollingInterval: shouldPollPairing && !pairingTimedOut ? POLL_MS : 0,
    });

  const currentConnection = detailConnection || currentListConnection || null;
  const currentConnectionId = getConnectionId(currentConnection);
  const headerStatus = getHeaderStatus(currentConnection);
  const status = getStatus(currentConnection);
  const connectorStatus = getConnectorStatus(currentConnection);
  const heartbeat = getHeartbeat(currentConnection);
  const heartbeatStale = status === "CONNECTED" && isHeartbeatStale(heartbeat);
  const isConnected = isConnectorActive(currentConnection);
  const isDisconnected =
    status === "DISCONNECTED" || connectorStatus === "REVOKED";
  const showConnectForm =
    !isConnected &&
    (isDisconnected || !currentConnection || status === "ERROR");
  const syncDisabled = !isConnected || heartbeatStale;

  useEffect(() => {
    setSetupDetailsOpen(!isConnected);
  }, [isConnected]);

  const { data: syncStatusResponse, refetch: refetchSyncStatus } =
    useGetTallySyncStatusQuery(currentConnectionId, {
      skip: !showDashboard || !currentConnectionId || !isConnected,
      pollingInterval: isConnected ? 10000 : 0,
    });
  const { data: logsResponse, refetch: refetchLogs } = useGetTallyLogsQuery(
    { connectionId: currentConnectionId, object: logObjectFilter || undefined },
    { skip: !showDashboard || !currentConnectionId || !isConnected },
  );
  const syncRows = useMemo(
    () => normalizeSyncStatusRows(syncStatusResponse),
    [syncStatusResponse],
  );
  const logRows = useMemo(() => getLogRows(logsResponse), [logsResponse]);

  useEffect(() => {
    if (!showSetup || !pairingOpen || !shouldPollPairing) {
      pairingStartedAt.current = 0;
      setPairingTimedOut(false);
      return;
    }

    if (!pairingStartedAt.current) {
      pairingStartedAt.current = Date.now();
      setPairingTimedOut(false);
    }

    const timer = window.setInterval(() => {
      if (Date.now() - pairingStartedAt.current > PAIRING_TIMEOUT_MS) {
        setPairingTimedOut(true);
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [pairingOpen, shouldPollPairing, resolvedConnectionId, showSetup]);

  useEffect(() => {
    const polledId = getConnectionId(detailConnection || {});
    if (
      !pairingCredentials ||
      !pairingOpen ||
      !polledId ||
      completedConnectionId === polledId
    ) {
      return;
    }
    if (getStatus(detailConnection) === "CONNECTED") {
      setCompletedConnectionId(polledId);
      setPairingOpen(false);
      setPairingCredentials(null);
      setPairingTimedOut(false);
      refetchConnections();
      toast.success("Tally connected successfully");
    }
  }, [
    completedConnectionId,
    detailConnection,
    pairingCredentials,
    pairingOpen,
    refetchConnections,
  ]);

  const startPairing = async () => {
    try {
      const response = await createConnection(
        displayName.trim() ? { displayName: displayName.trim() } : {},
      ).unwrap();
      setPairingCredentials(response);
      setPairingOpen(true);
      setPairingTimedOut(false);
      pairingStartedAt.current = Date.now();
      toast.success("Tally pairing started");
      refetchConnections();
    } catch (error) {
      toast.error(getPairingErrorMessage(error));
    }
  };

  const handleRefreshConnection = async () => {
    try {
      await refetchConnections();
      if (resolvedConnectionId) {
        await refetchDetailConnection();
      }
      if (showDashboard && currentConnectionId && isConnected) {
        await Promise.all([refetchSyncStatus(), refetchLogs()]);
      }
      toast.success(
        isConnected
          ? "Tally connection refreshed"
          : "Tally connection status refreshed",
      );
    } catch (error) {
      toast.error(getErrorText(error, "Failed to refresh Tally connection"));
    }
  };

  const handleDisconnect = async () => {
    if (!currentConnectionId) return;
    if (!guardAction("integrations.disconnect")) return;
    try {
      await disconnectConnection(currentConnectionId).unwrap();
      toast.success("Tally disconnected");
      await refetchConnections();
    } catch (error) {
      toast.error(getErrorText(error, "Failed to disconnect Tally"));
    }
  };

  const handleInstallerDownload = async () => {
    let objectUrl = "";
    try {
      debugTallyDownload("Download clicked");
      const response = await downloadConnector().unwrap();
      debugTallyDownload("Initial endpoint response", {
        isBlob: isBlobResponse(response),
        blobSize: isBlobResponse(response) ? response.size : undefined,
        blobType: isBlobResponse(response) ? response.type : undefined,
        payload: isBlobResponse(response) ? undefined : response,
      });
      if (isBlobResponse(response)) {
        if (!response.size) {
          throw new Error("Installer file was empty");
        }
        debugTallyDownload("Using direct Blob response");
        objectUrl = URL.createObjectURL(response);
        triggerFileDownload(objectUrl, getBlobFileName(response));
      } else {
        const downloadUrl = normalizeDownloadUrl(
          getConnectorDownloadUrl(response),
        );
        if (!downloadUrl) {
          throw new Error("Installer download URL was not returned");
        }
        debugTallyDownload("Using returned URL response", { downloadUrl });
        const blob = await downloadUrlAsBlob(downloadUrl);
        if (!blob.size) {
          throw new Error("Installer file was empty");
        }
        debugTallyDownload("Fetched URL Blob", {
          blobSize: blob.size,
          blobType: blob.type,
        });
        objectUrl = URL.createObjectURL(blob);
        triggerFileDownload(objectUrl, getBlobFileName(blob));
      }
      toast.success("Tally Connector download started");
    } catch (error) {
      debugTallyDownload("Download failed", error);
      toast.error(getConnectorDownloadError(error));
    } finally {
      if (objectUrl) {
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      }
    }
  };

  const handleSync = async (object = "ALL") => {
    if (!currentConnectionId) return;
    if (syncDisabled) {
      toast.error(
        "Tally Connector is offline. Open the connector app on your Tally machine.",
      );
      return;
    }
    try {
      await triggerSync({ connectionId: currentConnectionId, object }).unwrap();
      toast.success(
        object === "ALL"
          ? "Tally sync queued"
          : `${TALLY_SYNC_OBJECTS.find((item) => item.key === object)?.label || object} sync queued`,
      );
      refetchSyncStatus();
      refetchLogs();
    } catch (error) {
      toast.error(getErrorText(error, "Failed to queue Tally sync"));
    }
  };

  const credentials = pairingCredentials
    ? {
        connectorId:
          pairingCredentials.connectorId || pairingCredentials.connector_id,
        pairingCode:
          pairingCredentials.pairingCode || pairingCredentials.pairing_code,
        apiKey: pairingCredentials.apiKey || pairingCredentials.api_key,
      }
    : null;

  return (
    <>
      <div
        className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
        data-testid="tally-integration-card"
      >
        <div
          className={`flex items-center justify-between border-b px-6 py-4 ${headerToneClass(headerStatus.tone)}`}
        >
          <div className="flex items-center gap-3">
            <TallyLogo />
            <div>
              <h3 className="font-semibold text-gray-900">
                {showDashboard
                  ? "Tally sync dashboard"
                  : "Tally connector setup"}
              </h3>
              <p className="text-xs text-muted-foreground">
                {showDashboard
                  ? "Monitor Tally sync health and queue manual syncs."
                  : "Pair the local connector with Optifii AP."}
              </p>
            </div>
          </div>
          <div
            className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${badgeToneClass(headerStatus.tone)}`}
          >
            <HeaderStatusIcon icon={headerStatus.icon} />
            {headerStatus.label}
          </div>
        </div>

        <div className="space-y-5 p-6">
          {showDashboard && currentConnection ? (
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-border bg-white p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-800">
                  <Activity className="h-4 w-4 text-blue-600" />
                  Connection
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {getDisplayName(currentConnection)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {headerStatus.label}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-white p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-800">
                  <Database className="h-4 w-4 text-emerald-600" />
                  Company
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {currentConnection.organizationName ||
                    currentConnection.organization_name ||
                    "Pending"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {currentConnection.gstin || "GSTIN not available"}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-white p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-800">
                  <Clock className="h-4 w-4 text-amber-600" />
                  Last heartbeat
                </div>
                <p
                  className={
                    heartbeatStale
                      ? "text-lg font-semibold text-amber-700"
                      : "text-lg font-semibold text-gray-900"
                  }
                >
                  {formatDateTime(heartbeat)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {heartbeatStale
                    ? "Connector may be offline"
                    : "Connector is reporting normally"}
                </p>
              </div>
            </div>
          ) : null}

          {showSetup ? (
            <div className="rounded-lg border border-border bg-muted/20">
              {isConnected ? (
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                  onClick={() => setSetupDetailsOpen((open) => !open)}
                  aria-expanded={setupDetailsOpen}
                >
                  <div>
                    <h4 className="font-semibold text-gray-800">
                      Connector setup details
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      View connector details, checklist, installer, and sync scope.
                    </p>
                  </div>
                  {setupDetailsOpen ? (
                    <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                </button>
              ) : null}

              {setupDetailsOpen ? (
                <div className="space-y-5 border-t border-border p-4 first:border-t-0">
                  {currentConnection ? (
                    <div className="space-y-2 rounded-lg border border-border bg-background p-3 text-sm">
                      <p className="text-gray-800">
                        <span className="font-medium">Connector:</span>{" "}
                        {getDisplayName(currentConnection)}
                      </p>
                      {currentConnection.organizationName ||
                      currentConnection.organization_name ? (
                        <p className="text-gray-700">
                          <span className="font-medium">Company:</span>{" "}
                          {currentConnection.organizationName ||
                            currentConnection.organization_name}
                        </p>
                      ) : null}
                      {currentConnection.gstin ? (
                        <p className="text-gray-700">
                          <span className="font-medium">GSTIN:</span>{" "}
                          {currentConnection.gstin}
                        </p>
                      ) : null}
                      {currentConnection.tallyUrl || currentConnection.tally_url ? (
                        <p className="text-gray-700">
                          <span className="font-medium">Tally URL:</span>{" "}
                          {currentConnection.tallyUrl || currentConnection.tally_url}
                        </p>
                      ) : null}
                      <p
                        className={heartbeatStale ? "text-amber-700" : "text-gray-600"}
                      >
                        <span className="font-medium">Last heartbeat:</span>{" "}
                        {formatDateTime(heartbeat)}
                      </p>
                      {heartbeatStale && isConnected ? (
                        <p className="text-amber-700">
                          Connector may be offline — last heartbeat is missing or older
                          than 15 minutes.
                        </p>
                      ) : null}
                      {currentConnection.errorMessage ||
                      currentConnection.error_message ? (
                        <p className="text-red-700">
                          {currentConnection.errorMessage ||
                            currentConnection.error_message}
                        </p>
                      ) : null}
                      {isDisconnected ? (
                        <p className="text-gray-600">
                          Disconnected — pair again to reconnect Tally.
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  <div>
                    <h4 className="mb-2 font-semibold text-gray-800">
                      Before you connect
                    </h4>
                    <ul className="space-y-2">
                      {SETUP_CHECKLIST.map((item) => (
                        <li
                          key={item}
                          className="flex items-start gap-2 text-sm text-gray-600"
                        >
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                          {item}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleInstallerDownload}
                        disabled={downloadingConnector}
                      >
                        {downloadingConnector ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="mr-2 h-4 w-4" />
                        )}
                        Download Windows Connector
                      </Button>
                    </div>
                  </div>

                  <div>
                    <h4 className="mb-3 font-semibold text-gray-800">
                      We'll sync your:
                    </h4>
                    <ul className="space-y-2">
                      {TALLY_SYNC_ITEMS.map((item) => (
                        <li
                          key={item}
                          className="flex items-center gap-2 text-sm text-gray-600"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {showDashboard && isConnected ? (
            <div className="space-y-4 rounded-lg border border-border bg-muted/10 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="font-semibold text-gray-800">
                    Sync dashboard
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Manual sync queues import and export jobs for selected
                    objects.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={handleRefreshConnection}
                    disabled={connectionsLoading}
                  >
                    {connectionsLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Refresh Tally
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleDisconnect}
                    disabled={
                      !currentConnectionId ||
                      !canPerformAction("integrations.disconnect") ||
                      disconnecting
                    }
                    className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                  >
                    {disconnecting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Unplug className="mr-2 h-4 w-4" />
                    )}
                    Disconnect
                  </Button>
                  <Button
                    onClick={() => handleSync("ALL")}
                    disabled={syncDisabled || syncing}
                  >
                    {syncing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Sync all
                  </Button>
                </div>
              </div>

              {syncDisabled ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  Tally Connector is offline. Open the connector app on your
                  Tally machine to enable sync.
                </div>
              ) : null}

              <div className="grid gap-3 md:grid-cols-3">
                {syncRows.map((row) => (
                  <div
                    key={row.object}
                    className="rounded-lg border border-border bg-white p-3"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="font-medium text-gray-800">{row.label}</p>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadgeClass(row.status)}`}
                      >
                        {row.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>
                        {row.synced} synced · {row.pending} pending ·{" "}
                        {row.errored} errors
                      </p>
                      <p>Last: {formatDateTime(row.lastSyncAt)}</p>
                      {row.message ? <p>{row.message}</p> : null}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-3 w-full"
                      onClick={() => handleSync(row.object)}
                      disabled={syncDisabled || syncing}
                    >
                      Sync {row.label}
                    </Button>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-semibold text-gray-800">
                    Recent sync activity
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {[{ key: "", label: "All" }, ...TALLY_SYNC_OBJECTS].map(
                      (item) => (
                        <Button
                          key={item.key || "ALL"}
                          type="button"
                          variant={
                            logObjectFilter === item.key ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => setLogObjectFilter(item.key)}
                        >
                          {item.label}
                        </Button>
                      ),
                    )}
                  </div>
                </div>
                <div className="max-h-[360px] overflow-y-auto rounded-lg border border-border scrollbar-thin-muted">
                  {logRows.length > 0 ? (
                    <div className="divide-y divide-border">
                      {logRows.map((log, index) => {
                        const logStatus = String(
                          log.status || "PENDING",
                        ).toUpperCase();
                        return (
                          <div
                            key={log.id || log.syncLogId || index}
                            className="grid gap-2 p-3 text-sm md:grid-cols-[1.2fr_1fr_1fr_1fr_1.4fr]"
                          >
                            <span>
                              {formatDateTime(
                                log.createdAt ||
                                  log.created_at ||
                                  log.completedAt ||
                                  log.completed_at,
                              )}
                            </span>
                            <span>
                              {String(log.object || "-").replace(/_/g, " ")}
                            </span>
                            <span>
                              {String(
                                log.event || log.direction || "-",
                              ).replace(/_/g, " ")}
                            </span>
                            <span
                              className={`w-fit rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadgeClass(logStatus)}`}
                            >
                              {logStatus.replace(/_/g, " ")}
                            </span>
                            <span className="text-muted-foreground">
                              {Number(
                                log.recordsProcessed ??
                                  log.records_processed ??
                                  0,
                              )}{" "}
                              processed ·{" "}
                              {Number(
                                log.recordsFailed ?? log.records_failed ?? 0,
                              )}{" "}
                              failed
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 text-sm text-muted-foreground">
                      No sync activity yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {showDashboard && !isConnected ? (
            <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50/80 p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h4 className="font-semibold text-blue-950">
                    Tally is not connected yet
                  </h4>
	                  <p className="mt-1 text-sm text-blue-800">
	                    Pair the connector from the Tally integration page.
	                    Once connected, this section becomes the sync dashboard.
	                  </p>
                </div>
                <Button
                  asChild
                  variant="outline"
                  className="border-blue-200 bg-white"
                >
	                  <Link to="/integrations/erp/tally">
	                    <Settings2 className="mr-2 h-4 w-4" />
	                    Manage Tally integration
	                  </Link>
                </Button>
              </div>
            </div>
          ) : null}

          {showSetup &&
          !isConnected &&
          status === "PENDING" &&
          !pairingCredentials ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              A Tally pairing is already in progress. Complete pairing in the
              Connector app, or ask an admin to reset the pending connection
              before starting again.
            </div>
          ) : showSetup && !isConnected && showConnectForm ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="tally-display-name">
                  Connector display name
                </Label>
                <Input
                  id="tally-display-name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Office Tally Connector"
                  disabled={creating || connectionsLoading}
                />
              </div>
              <Button
                className="w-full bg-blue-600 text-white hover:bg-blue-700"
                onClick={startPairing}
                disabled={
                  creating ||
                  connectionsLoading ||
                  (status === "PENDING" && !pairingCredentials)
                }
              >
                {creating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plug className="mr-2 h-4 w-4" />
                )}
                {isDisconnected ? "Pair again" : "Connect Tally"}
              </Button>
            </div>
          ) : null}

          {showSetup ? (
            <>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshConnection}
                  disabled={connectionsLoading}
                >
                  {connectionsLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Refresh
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Pairing is completed by the local Tally Connector. The browser
                does not activate the connector or store the API key.
              </p>
            </>
          ) : null}
          {showSetup && provider?.description ? (
            <p className="text-xs text-muted-foreground">
              {provider.description}
            </p>
          ) : null}
        </div>
      </div>

      {showSetup ? (
        <Dialog
          open={pairingOpen}
          onOpenChange={(open) => {
            setPairingOpen(open);
            if (!open) {
              setPairingCredentials(null);
              setPairingTimedOut(false);
            }
          }}
        >
          <DialogContent
            className="max-w-lg"
            onInteractOutside={(event) => event.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle>Tally Connector pairing</DialogTitle>
              <DialogDescription>
                Copy these credentials into the local Tally Connector and click
                Pair. The API key is shown once.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <FieldWithCopy
                label="Connector ID"
                value={credentials?.connectorId}
              />
              <FieldWithCopy
                label="Pairing code"
                value={credentials?.pairingCode}
              />
              <FieldWithCopy
                label="API key"
                value={credentials?.apiKey}
                sensitive
              />

              {pairingTimedOut ? (
                <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  Pairing timed out after 10 minutes. Close this dialog and
                  start pairing again if needed.
                </div>
              ) : (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  Keep this dialog open until pairing completes. If you close
                  it, the API key will not be shown again.
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  type="button"
                  className="flex-1"
                  onClick={() => {
                    refetchDetailConnection();
                    refetchConnections();
                  }}
                >
                  Check status
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
};

export default TallyIntegrationCard;

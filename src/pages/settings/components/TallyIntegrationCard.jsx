import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ClipboardCopy,
  Download,
  ExternalLink,
  Loader2,
  Plug,
  TriangleAlert,
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
  useTriggerTallySyncMutation,
} from "../../../Services/apis/integrationsApi";
import { Button } from "../../../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { formatDateTime, getErrorText, statusBadgeClass, toArray } from "../../integrations/utils";

const CONNECTOR_URL = "http://localhost:8080";
const POLL_MS = 4000;
const PAIRING_TIMEOUT_MS = 10 * 60 * 1000;
const STALE_HEARTBEAT_MS = 15 * 60 * 1000;

const TALLY_SYNC_ITEMS = [
  "Vendors",
  "Purchase orders",
  "Bills",
];

const TALLY_SYNC_OBJECTS = [
  { key: "VENDORS", label: "Vendors" },
  { key: "PURCHASE_ORDERS", label: "Purchase orders" },
  { key: "BILLS", label: "Bills" },
];

const SETUP_CHECKLIST = [
  "Tally is open with the correct company loaded.",
  "Tally XML server is enabled (default port 9000).",
  "Organisation GSTIN in Optifii matches the Tally company GSTIN.",
  "Only one active ERP connection per corporate (disconnect Zoho Books first if needed).",
];

const getConnectionId = (connection = {}) =>
  connection.connectionId || connection.connection_id || connection.id;

const getStatus = (connection = {}) =>
  String(connection.status || "DISCONNECTED").toUpperCase();

const getConnectorStatus = (connection = {}) =>
  String(connection.connectorStatus || connection.connector_status || "").toUpperCase();

const getDisplayName = (connection = {}) =>
  connection.displayName || connection.display_name || "Office Tally Connector";

const getHeartbeat = (connection = {}) =>
  connection.lastHeartbeatAt || connection.last_heartbeat_at || null;

const isHeartbeatStale = (lastHeartbeatAt) => {
  if (!lastHeartbeatAt) return true;
  const timestamp = new Date(lastHeartbeatAt).getTime();
  if (Number.isNaN(timestamp)) return true;
  return Date.now() - timestamp > STALE_HEARTBEAT_MS;
};

const getHeaderStatus = (connection) => {
  const status = getStatus(connection || {});
  const connectorStatus = getConnectorStatus(connection || {});
  const stale = status === "CONNECTED" && isHeartbeatStale(getHeartbeat(connection || {}));

  if (status === "DISCONNECTED" || connectorStatus === "REVOKED") {
    return { label: "Disconnected", tone: "neutral", icon: "disconnected" };
  }
  if (status === "CONNECTED" && connectorStatus === "ACTIVE" && !stale) {
    return { label: "Connected to Tally", tone: "success", icon: "connected" };
  }
  if (status === "CONNECTED" && stale) {
    return { label: "Connector may be offline", tone: "warning", icon: "warning" };
  }
  if (status === "PENDING") {
    return { label: "Waiting for Connector pairing", tone: "warning", icon: "pending" };
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

const checkConnectorReachable = async () => {
  try {
    const response = await fetch(`${CONNECTOR_URL}/health`, { mode: "cors" });
    if (!response.ok) return false;
    const text = await response.text();
    return text.includes("HEALTHY");
  } catch {
    return false;
  }
};

const fetchLocalConnectorStatus = async () => {
  try {
    const response = await fetch(`${CONNECTOR_URL}/api/connector/status`, { mode: "cors" });
    if (!response.ok) throw new Error(`Connector request failed (${response.status})`);
    return response.json();
  } catch {
    return null;
  }
};

const TallyLogo = () => (
  <div className="text-2xl font-bold italic" style={{ fontFamily: "serif", color: "#D32F2F" }}>
    <span style={{ color: "#D32F2F" }}>Tally</span>
    <span className="text-xs align-super text-gray-500">.ERP9</span>
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
  if (icon === "warning" || icon === "error") return <TriangleAlert className={className} />;
  if (icon === "pending") return <Loader2 className={`${className} animate-spin`} />;
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
        <Input readOnly type={sensitive ? "password" : "text"} value={value || ""} className="font-mono text-xs" />
        <Button type="button" variant="outline" size="icon" onClick={handleCopy} disabled={!value}>
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
      status: String(row.status || row.syncStatus || "NOT_SYNCED").toUpperCase(),
      synced: Number(row.synced ?? row.recordsSynced ?? 0),
      pending: Number(row.pending ?? 0),
      errored: Number(row.errored ?? row.errorCount ?? row.recordsFailed ?? 0),
      message: row.message || "",
      lastSyncAt: row.lastSyncAt || row.last_sync_at || row.lastSyncedAt,
    };
  });
};

const getLogRows = (response) =>
  toArray(response?.logs || response?.items || response?.data?.logs || response?.data || response).filter(Boolean);

const getBlobFileName = (blob) => {
  if (!blob) return "optifii-tally-connector-windows.exe";
  return "optifii-tally-connector-windows.exe";
};

const TallyIntegrationCard = () => {
  const { data: providersResponse } = useGetTallyProvidersQuery();
  const {
    data: connectionsResponse,
    isLoading: connectionsLoading,
    refetch: refetchConnections,
  } = useGetTallyConnectionsQuery();
  const [createConnection, { isLoading: creating }] = useCreateTallyConnectionMutation();
  const [triggerSync, { isLoading: syncing }] = useTriggerTallySyncMutation();
  const [downloadConnector, { isFetching: downloadingConnector }] = useLazyDownloadTallyWindowsConnectorQuery();
  const [pairingCredentials, setPairingCredentials] = useState(null);
  const [pairingOpen, setPairingOpen] = useState(false);
  const [displayName, setDisplayName] = useState("Office Tally Connector");
  const [completedConnectionId, setCompletedConnectionId] = useState("");
  const [pairingTimedOut, setPairingTimedOut] = useState(false);
  const [connectorReachable, setConnectorReachable] = useState(null);
  const [localConnectorStatus, setLocalConnectorStatus] = useState(null);
  const [logObjectFilter, setLogObjectFilter] = useState("");
  const pairingStartedAt = useRef(0);

  const provider = useMemo(() => {
    const providers = toArray(
      providersResponse?.providers || providersResponse?.data?.providers || providersResponse?.data || providersResponse,
    );
    return providers.find((item) => item?.provider === "TALLY") || providers[0] || null;
  }, [providersResponse]);

  const connections = useMemo(
    () => toArray(connectionsResponse?.connections || connectionsResponse?.data?.connections || connectionsResponse?.data || connectionsResponse),
    [connectionsResponse],
  );

  const activeConnection = connections.find((connection) =>
    ["CONNECTED", "PENDING", "ERROR"].includes(getStatus(connection)),
  );
  const disconnectedConnection = connections.find(
    (connection) => getStatus(connection) === "DISCONNECTED" || getConnectorStatus(connection) === "REVOKED",
  );
  const currentListConnection = activeConnection || disconnectedConnection || null;
  const pairingConnectionId = getConnectionId(pairingCredentials || {}) || getConnectionId(currentListConnection || {});
  const shouldPoll = Boolean(
    pairingConnectionId && (pairingCredentials || getStatus(currentListConnection || {}) === "PENDING"),
  );

  const { data: polledConnection, refetch: refetchPolledConnection } = useGetTallyConnectionQuery(pairingConnectionId, {
    skip: !pairingConnectionId,
    pollingInterval: shouldPoll && !pairingTimedOut ? POLL_MS : 0,
  });

  const currentConnection = polledConnection || currentListConnection;
  const currentConnectionId = getConnectionId(currentConnection || {});
  const headerStatus = getHeaderStatus(currentConnection);
  const status = getStatus(currentConnection || {});
  const connectorStatus = getConnectorStatus(currentConnection || {});
  const heartbeat = getHeartbeat(currentConnection || {});
  const heartbeatStale = status === "CONNECTED" && isHeartbeatStale(heartbeat);
  const isConnected = status === "CONNECTED" && connectorStatus === "ACTIVE";
  const isDisconnected = status === "DISCONNECTED" || connectorStatus === "REVOKED";
  const showConnectForm = !isConnected && (isDisconnected || !currentConnection || status === "ERROR");
  const syncDisabled = !isConnected || heartbeatStale;

  const {
    data: syncStatusResponse,
    refetch: refetchSyncStatus,
  } = useGetTallySyncStatusQuery(currentConnectionId, {
    skip: !currentConnectionId || !isConnected,
    pollingInterval: isConnected ? 10000 : 0,
  });
  const {
    data: logsResponse,
    refetch: refetchLogs,
  } = useGetTallyLogsQuery(
    { connectionId: currentConnectionId, object: logObjectFilter || undefined },
    { skip: !currentConnectionId || !isConnected },
  );
  const syncRows = useMemo(() => normalizeSyncStatusRows(syncStatusResponse), [syncStatusResponse]);
  const logRows = useMemo(() => getLogRows(logsResponse).slice(0, 8), [logsResponse]);

  const refreshLocalConnectorHints = async () => {
    const reachable = await checkConnectorReachable();
    setConnectorReachable(reachable);
    if (!reachable) {
      setLocalConnectorStatus(null);
      return;
    }
    const connectorStatusResponse = await fetchLocalConnectorStatus();
    setLocalConnectorStatus(connectorStatusResponse);
  };

  useEffect(() => {
    refreshLocalConnectorHints();
  }, []);

  useEffect(() => {
    if (!pairingOpen || !shouldPoll) {
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
  }, [pairingOpen, shouldPoll, pairingConnectionId]);

  useEffect(() => {
    if (!pairingOpen) return undefined;

    const interval = window.setInterval(refreshLocalConnectorHints, POLL_MS);
    return () => window.clearInterval(interval);
  }, [pairingOpen]);

  useEffect(() => {
    const polledId = getConnectionId(polledConnection || {});
    if (!polledId || completedConnectionId === polledId) return;
    if (getStatus(polledConnection) === "CONNECTED") {
      setCompletedConnectionId(polledId);
      setPairingOpen(false);
      setPairingCredentials(null);
      setPairingTimedOut(false);
      refetchConnections();
      toast.success("Tally connected successfully");
    }
  }, [completedConnectionId, polledConnection, refetchConnections]);

  const startPairing = async () => {
    try {
      const response = await createConnection(displayName.trim() ? { displayName: displayName.trim() } : {}).unwrap();
      setPairingCredentials(response);
      setPairingOpen(true);
      setPairingTimedOut(false);
      pairingStartedAt.current = Date.now();
      toast.success("Tally pairing started");
      refetchConnections();
      refreshLocalConnectorHints();
    } catch (error) {
      toast.error(getPairingErrorMessage(error));
    }
  };

  const handleInstallerDownload = async () => {
    try {
      const blob = await downloadConnector().unwrap();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = getBlobFileName(blob);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success("Tally Connector download started");
    } catch {
      toast.error("Could not start installer download");
    }
  };

  const handleSync = async (object = "ALL") => {
    if (!currentConnectionId) return;
    if (syncDisabled) {
      toast.error("Tally Connector is offline. Open the connector app on your Tally machine.");
      return;
    }
    try {
      await triggerSync({ connectionId: currentConnectionId, object }).unwrap();
      toast.success(object === "ALL" ? "Tally sync queued" : `${TALLY_SYNC_OBJECTS.find((item) => item.key === object)?.label || object} sync queued`);
      refetchSyncStatus();
      refetchLogs();
    } catch (error) {
      toast.error(getErrorText(error, "Failed to queue Tally sync"));
    }
  };

  const credentials = pairingCredentials
    ? {
        connectorId: pairingCredentials.connectorId || pairingCredentials.connector_id,
        pairingCode: pairingCredentials.pairingCode || pairingCredentials.pairing_code,
        apiKey: pairingCredentials.apiKey || pairingCredentials.api_key,
      }
    : null;

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm" data-testid="tally-integration-card">
        <div className={`flex items-center justify-between border-b px-6 py-4 ${headerToneClass(headerStatus.tone)}`}>
          <div className="flex items-center gap-3">
            <TallyLogo />
          </div>
          <div className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${badgeToneClass(headerStatus.tone)}`}>
            <HeaderStatusIcon icon={headerStatus.icon} />
            {headerStatus.label}
          </div>
        </div>

        <div className="space-y-5 p-6">
          {connectorReachable !== null ? (
            <div
              className={`rounded-lg border p-3 text-sm ${
                connectorReachable
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-slate-200 bg-slate-50 text-slate-700"
              }`}
            >
              {connectorReachable
                ? "Tally Connector is running on this machine."
                : "Tally Connector was not detected on this machine (localhost:8080). Install and start it before pairing."}
            </div>
          ) : null}

          {currentConnection ? (
            <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <p className="text-gray-800">
                <span className="font-medium">Connector:</span> {getDisplayName(currentConnection)}
              </p>
              {(currentConnection.organizationName || currentConnection.organization_name) ? (
                <p className="text-gray-700">
                  <span className="font-medium">Company:</span>{" "}
                  {currentConnection.organizationName || currentConnection.organization_name}
                </p>
              ) : null}
              {currentConnection.gstin ? (
                <p className="text-gray-700">
                  <span className="font-medium">GSTIN:</span> {currentConnection.gstin}
                </p>
              ) : null}
              {(currentConnection.tallyUrl || currentConnection.tally_url) ? (
                <p className="text-gray-700">
                  <span className="font-medium">Tally URL:</span>{" "}
                  {currentConnection.tallyUrl || currentConnection.tally_url}
                </p>
              ) : null}
              <p className={heartbeatStale ? "text-amber-700" : "text-gray-600"}>
                <span className="font-medium">Last heartbeat:</span> {formatDateTime(heartbeat)}
              </p>
              {heartbeatStale && isConnected ? (
                <p className="text-amber-700">Connector may be offline — last heartbeat is older than 5 minutes.</p>
              ) : null}
              {(currentConnection.errorMessage || currentConnection.error_message) ? (
                <p className="text-red-700">{currentConnection.errorMessage || currentConnection.error_message}</p>
              ) : null}
              {isDisconnected ? (
                <p className="text-gray-600">Disconnected — pair again to reconnect Tally.</p>
              ) : null}
            </div>
          ) : null}

          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <h4 className="mb-2 font-semibold text-gray-800">Before you connect</h4>
            <ul className="space-y-2">
              {SETUP_CHECKLIST.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-gray-600">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleInstallerDownload} disabled={downloadingConnector}>
                {downloadingConnector ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Download Windows Connector
              </Button>
            </div>
          </div>

          <div>
            <h4 className="mb-3 font-semibold text-gray-800">We'll sync your:</h4>
            <ul className="space-y-2">
              {TALLY_SYNC_ITEMS.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {isConnected ? (
            <div className="space-y-4 rounded-lg border border-border bg-muted/10 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className="font-semibold text-gray-800">Sync dashboard</h4>
                  <p className="text-sm text-muted-foreground">Manual sync queues import and export jobs for selected objects.</p>
                </div>
                <Button onClick={() => handleSync("ALL")} disabled={syncDisabled || syncing}>
                  {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Sync all
                </Button>
              </div>

              {syncDisabled ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  Tally Connector is offline. Open the connector app on your Tally machine to enable sync.
                </div>
              ) : null}

              <div className="grid gap-3 md:grid-cols-3">
                {syncRows.map((row) => (
                  <div key={row.object} className="rounded-lg border border-border bg-white p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="font-medium text-gray-800">{row.label}</p>
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadgeClass(row.status)}`}>
                        {row.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>{row.synced} synced · {row.pending} pending · {row.errored} errors</p>
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
                  <h4 className="font-semibold text-gray-800">Recent sync activity</h4>
                  <div className="flex flex-wrap gap-2">
                    {[{ key: "", label: "All" }, ...TALLY_SYNC_OBJECTS].map((item) => (
                      <Button
                        key={item.key || "ALL"}
                        type="button"
                        variant={logObjectFilter === item.key ? "default" : "outline"}
                        size="sm"
                        onClick={() => setLogObjectFilter(item.key)}
                      >
                        {item.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="overflow-hidden rounded-lg border border-border">
                  {logRows.length > 0 ? (
                    <div className="divide-y divide-border">
                      {logRows.map((log, index) => {
                        const logStatus = String(log.status || "PENDING").toUpperCase();
                        return (
                          <div key={log.id || log.syncLogId || index} className="grid gap-2 p-3 text-sm md:grid-cols-[1.2fr_1fr_1fr_1fr_1.4fr]">
                            <span>{formatDateTime(log.createdAt || log.created_at || log.completedAt || log.completed_at)}</span>
                            <span>{String(log.object || "-").replace(/_/g, " ")}</span>
                            <span>{String(log.event || log.direction || "-").replace(/_/g, " ")}</span>
                            <span className={`w-fit rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadgeClass(logStatus)}`}>
                              {logStatus.replace(/_/g, " ")}
                            </span>
                            <span className="text-muted-foreground">
                              {Number(log.recordsProcessed ?? log.records_processed ?? 0)} processed · {Number(log.recordsFailed ?? log.records_failed ?? 0)} failed
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 text-sm text-muted-foreground">No sync activity yet.</div>
                  )}
                </div>
              </div>
            </div>
          ) : status === "PENDING" && !pairingCredentials ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              A Tally pairing is already in progress. Complete pairing in the Connector app, or ask an admin to reset the pending connection before starting again.
            </div>
          ) : showConnectForm ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="tally-display-name">Connector display name</Label>
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
                disabled={creating || connectionsLoading || (status === "PENDING" && !pairingCredentials)}
              >
                {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plug className="mr-2 h-4 w-4" />}
                {isDisconnected ? "Pair again" : "Connect Tally"}
              </Button>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={CONNECTOR_URL} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Connector
              </a>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchConnections();
                refreshLocalConnectorHints();
              }}
              disabled={connectionsLoading}
            >
              {connectionsLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Refresh
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Pairing is completed by the local Tally Connector. The browser does not activate the connector or store the API key.
          </p>
          {provider?.description ? <p className="text-xs text-muted-foreground">{provider.description}</p> : null}
        </div>
      </div>

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
        <DialogContent className="max-w-lg" onInteractOutside={(event) => event.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Tally Connector pairing</DialogTitle>
            <DialogDescription>
              Copy these credentials into the local Tally Connector and click Pair. The API key is shown once.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <FieldWithCopy label="Connector ID" value={credentials?.connectorId} />
            <FieldWithCopy label="Pairing code" value={credentials?.pairingCode} />
            <FieldWithCopy label="API key" value={credentials?.apiKey} sensitive />

            {localConnectorStatus?.paired ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                Local Connector reports pairing complete. Waiting for Optifii backend confirmation…
              </div>
            ) : localConnectorStatus?.optifii?.status === "PENDING" ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Connector is waiting for you to paste credentials and click Pair.
              </div>
            ) : null}

            {pairingTimedOut ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                Pairing timed out after 10 minutes. Close this dialog and start pairing again if needed.
              </div>
            ) : (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Keep this dialog open until pairing completes. If you close it, the API key will not be shown again.
              </div>
            )}

            <div className="flex gap-3">
              <Button asChild variant="outline" className="flex-1">
                <a href={CONNECTOR_URL} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Connector
                </a>
              </Button>
              <Button
                type="button"
                className="flex-1"
                onClick={() => {
                  refetchPolledConnection();
                  refetchConnections();
                  refreshLocalConnectorHints();
                }}
              >
                Check status
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TallyIntegrationCard;

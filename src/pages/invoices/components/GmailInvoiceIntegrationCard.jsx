import React, { useMemo } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  Loader2,
  Mail,
  RefreshCw,
  PlugZap,
  Power,
} from "lucide-react";

import {
  useCreateGmailConnectionMutation,
  useDisconnectGmailConnectionMutation,
  useGetGmailConnectionQuery,
  useGetGmailConnectionsQuery,
  useSyncGmailConnectionMutation,
} from "../../../Services/apis/integrationsApi";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { useActionGuard } from "../../../hooks/useActionGuard";

const getConnectionStatus = (connection = {}) =>
  String(connection.status || connection.connectionStatus || "UNKNOWN").toUpperCase();

const getConnectionId = (connection) => {
  const safeConnection = connection || {};
  return (
    safeConnection.id ||
    safeConnection.connectionId ||
    safeConnection.connection_id ||
    ""
  );
};

const formatDateTime = (value) => {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const statusClassName = (status) => {
  switch (status) {
    case "ACTIVE":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "PENDING":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "DISCONNECTED":
    case "INACTIVE":
      return "border-slate-200 bg-slate-50 text-slate-600";
    default:
      return "border-red-200 bg-red-50 text-red-700";
  }
};

const statusLabel = (status) => {
  if (status === "NONE") return "Not Connected";
  if (status === "ACTIVE") return "Connected";
  if (status === "PENDING") return "Setup Pending";
  if (status === "DISCONNECTED") return "Disconnected";
  if (status === "INACTIVE") return "Inactive";
  return status;
};

const getErrorMessage = (error, fallback) =>
  error?.data?.detail ||
  error?.data?.message ||
  error?.error ||
  error?.message ||
  fallback;

const GmailInvoiceIntegrationCard = () => {
  const { guardAction } = useActionGuard();
  const { data: connectionsResponse, isFetching: connectionsLoading, refetch } =
    useGetGmailConnectionsQuery();
  const [createConnection, { isLoading: creating }] = useCreateGmailConnectionMutation();
  const [disconnectConnection, { isLoading: disconnecting }] =
    useDisconnectGmailConnectionMutation();
  const [syncConnection, { isLoading: syncing }] = useSyncGmailConnectionMutation();

  const connections = useMemo(() => {
    if (Array.isArray(connectionsResponse)) return connectionsResponse;
    return (
      connectionsResponse?.connections ||
      connectionsResponse?.items ||
      connectionsResponse?.data ||
      []
    );
  }, [connectionsResponse]);

  const activeConnection =
    connections.find((connection) => getConnectionStatus(connection) === "ACTIVE") ||
    connections[0] ||
    null;
  const connectionId = getConnectionId(activeConnection);
  const connectionStatus = activeConnection ? getConnectionStatus(activeConnection) : "NONE";
  const { data: connectionDetail } = useGetGmailConnectionQuery(connectionId, {
    skip: !connectionId,
  });
  const detail = connectionDetail || activeConnection || {};
  const lastSync = detail.lastSync || detail.last_sync || null;
  const gmailEmail = detail.gmailEmail || detail.gmail_email || "";
  const errorMessage = detail.errorMessage || detail.error_message || "";
  const isBusy = creating || disconnecting || syncing;
  const canSync = connectionStatus === "ACTIVE";
  const canDisconnect = connectionStatus === "ACTIVE";
  const canReconnect = connectionStatus === "DISCONNECTED" || connectionStatus === "INACTIVE";
  const canStartConnect = connectionStatus === "NONE";
  const canCompleteSetup = connectionStatus === "PENDING";
  const lastSyncLabel = formatDateTime(
    lastSync?.completedAt || detail.updatedAt || detail.updated_at,
  );

  const handleConnect = async () => {
    if (!guardAction("gmailIntegration.connect")) return;
    try {
      const response = await createConnection().unwrap();
      const authorizationUrl = response?.authorizationUrl || response?.authorization_url;
      if (!authorizationUrl) {
        toast.error("Gmail connect started, but no authorization URL was returned.");
        return;
      }
      window.location.assign(authorizationUrl);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to start Gmail connection"));
    }
  };

  const handleSync = async () => {
    if (!connectionId) return;
    if (!guardAction("gmailIntegration.sync")) return;
    try {
      await syncConnection(connectionId).unwrap();
      toast.success("Gmail sync started");
      refetch();
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to trigger Gmail sync"));
    }
  };

  const handleDisconnect = async () => {
    if (!connectionId) return;
    if (!guardAction("gmailIntegration.disconnect")) return;
    try {
      await disconnectConnection(connectionId).unwrap();
      toast.success("Gmail disconnected");
      refetch();
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to disconnect Gmail"));
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-muted/30 px-6 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
                <Mail className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Gmail Invoice Ingestion</h3>
                <p className="text-sm text-muted-foreground">
                  Auto-ingest vendor invoice attachments from a dedicated AP mailbox.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={statusClassName(connectionStatus)}>
                {statusLabel(connectionStatus)}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {gmailEmail || "No mailbox connected"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {canStartConnect || canCompleteSetup || canReconnect ? (
              <Button onClick={handleConnect} disabled={isBusy}>
                {creating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <PlugZap className="mr-2 h-4 w-4" />
                )}
                {canCompleteSetup
                  ? "Complete setup"
                  : canReconnect
                    ? "Reconnect Gmail"
                    : "Connect Gmail"}
              </Button>
            ) : null}
            {canSync ? (
              <Button variant="outline" onClick={handleSync} disabled={isBusy}>
                {syncing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Sync now
              </Button>
            ) : null}
            {canDisconnect ? (
              <Button variant="outline" onClick={handleDisconnect} disabled={isBusy}>
                {disconnecting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Power className="mr-2 h-4 w-4" />
                )}
                Disconnect
              </Button>
            ) : null}
            <Button variant="ghost" onClick={() => refetch()} disabled={connectionsLoading}>
              {connectionsLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 px-6 py-5 md:grid-cols-3">
        <div className="rounded-lg border border-border bg-background p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Connected Mailbox
          </p>
          <p className="mt-2 text-sm font-medium text-foreground">
            {gmailEmail || "Not connected"}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-background p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Last Sync
          </p>
          <p className="mt-2 text-sm font-medium text-foreground">
            {lastSyncLabel}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-background p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Workflow
          </p>
          <p className="mt-2 text-sm font-medium text-foreground">
            Gmail → Optifii Invoice Queue
          </p>
        </div>
      </div>

      <div className="border-t border-border px-6 py-4">
        <div className="grid gap-3 text-sm text-muted-foreground md:grid-cols-2">
          <div>Use a dedicated mailbox to reduce manual uploads and missed invoices.</div>
          <div>Recommended for shared AP inboxes where vendors email PDF invoices directly.</div>
        </div>
        {errorMessage ? (
          <div className="mt-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4" />
            {errorMessage}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default GmailInvoiceIntegrationCard;

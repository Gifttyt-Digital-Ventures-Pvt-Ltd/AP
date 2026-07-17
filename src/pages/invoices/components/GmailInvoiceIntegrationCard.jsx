import React from "react";
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
  useGetApIntegrationSummaryQuery,
  useSyncGmailConnectionMutation,
} from "../../../Services/apis/integrationsApi";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { useActionGuard } from "../../../hooks/useActionGuard";
import {
  INTEGRATION_CONNECTION_STATUS,
  getIntegrationStatusLabel,
  selectEmailIntegration,
} from "../../integrations/integrationSummary";

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
    case INTEGRATION_CONNECTION_STATUS.CONNECTED:
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case INTEGRATION_CONNECTION_STATUS.CONNECTING:
    case INTEGRATION_CONNECTION_STATUS.ACTION_REQUIRED:
      return "border-amber-200 bg-amber-50 text-amber-700";
    case INTEGRATION_CONNECTION_STATUS.DISCONNECTED:
      return "border-slate-200 bg-slate-50 text-slate-600";
    case INTEGRATION_CONNECTION_STATUS.ERROR:
    default:
      return "border-red-200 bg-red-50 text-red-700";
  }
};

const getErrorMessage = (error, fallback) =>
  error?.data?.detail ||
  error?.data?.message ||
  error?.error ||
  error?.message ||
  fallback;

const GmailInvoiceIntegrationCard = () => {
  const { guardAction } = useActionGuard();
  const {
    data: integrationSummary,
    isFetching: summaryFetching,
    isLoading: summaryLoading,
    isError: summaryError,
    refetch,
  } = useGetApIntegrationSummaryQuery();
  const [createConnection, { isLoading: creating }] = useCreateGmailConnectionMutation();
  const [disconnectConnection, { isLoading: disconnecting }] =
    useDisconnectGmailConnectionMutation();
  const [syncConnection, { isLoading: syncing }] = useSyncGmailConnectionMutation();

  const emailIntegration = selectEmailIntegration(integrationSummary);
  const connectionId = emailIntegration.connectionId || "";
  const connectionStatus = emailIntegration.connectionStatus;
  const statusLabel = summaryError
    ? "Status unavailable"
    : getIntegrationStatusLabel(connectionStatus);
  const gmailEmail =
    emailIntegration.details?.email || emailIntegration.displayName || "";
  const errorMessage = emailIntegration.error?.message || "";
  const isBusy = creating || disconnecting || syncing;
  const canSync = connectionStatus === INTEGRATION_CONNECTION_STATUS.CONNECTED;
  const canDisconnect = connectionStatus === INTEGRATION_CONNECTION_STATUS.CONNECTED;
  const canReconnect = connectionStatus === INTEGRATION_CONNECTION_STATUS.ERROR;
  const canStartConnect =
    connectionStatus === INTEGRATION_CONNECTION_STATUS.DISCONNECTED;
  const canCompleteSetup =
    connectionStatus === INTEGRATION_CONNECTION_STATUS.CONNECTING ||
    connectionStatus === INTEGRATION_CONNECTION_STATUS.ACTION_REQUIRED;
  const lastSyncLabel = formatDateTime(emailIntegration.lastActivityAt);

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
                {statusLabel}
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
            <Button variant="ghost" onClick={() => refetch()} disabled={summaryFetching}>
              {summaryFetching ? (
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
        {summaryLoading ? (
          <div className="col-span-full flex items-center justify-center gap-2 rounded-lg border border-border bg-background p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading Gmail integration summary...
          </div>
        ) : summaryError ? (
          <div className="col-span-full rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Unable to load Gmail integration summary. Use Refresh to retry.
          </div>
        ) : null}
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

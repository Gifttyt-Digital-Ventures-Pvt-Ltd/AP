import React, { useMemo, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowRight,
  Check,
  Database,
  Loader2,
  Plug,
  RefreshCw,
  Unplug,
  XCircle,
} from "lucide-react";

import {
  useGetApIntegrationSummaryQuery,
  useDisconnectZohoConnectionMutation,
  useGetIntegrationProvidersQuery,
  useGetIntegrationSyncStatusQuery,
} from "../../../Services/apis/integrationsApi";
import { Button } from "../../../components/ui/button";
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
import { useActionGuard } from "../../../hooks/useActionGuard";
import {
  formatDateTime,
  getErrorText,
  getProviderKey,
  normalizeProviders,
  normalizeSyncRows,
} from "../../integrations/utils";
import {
  ERP_PROVIDER,
  INTEGRATION_CONNECTION_STATUS,
  canShowTokenExpiryWarning,
  getIntegrationStatusLabel,
  isZohoIntegration,
  selectErpIntegration,
} from "../../integrations/integrationSummary";

const ZohoBooksLogo = () => (
  <div className="text-2xl font-bold" style={{ fontFamily: "Manrope, sans-serif" }}>
    <span className="text-[#226DB4]">Zoho</span>
    <span className="ml-1 text-base font-semibold text-gray-700">Books</span>
  </div>
);

const getHeaderStatus = (integration) => {
  if (!integration || !isZohoIntegration(integration)) {
    return { label: "Not Connected", connected: false, tone: "neutral" };
  }

  const status = integration.connectionStatus;
  if (status === INTEGRATION_CONNECTION_STATUS.CONNECTED) {
    return { label: "Connected", connected: true, tone: "success" };
  }
  if (status === INTEGRATION_CONNECTION_STATUS.ERROR) {
    return { label: "Error", connected: false, tone: "error" };
  }
  if (status === INTEGRATION_CONNECTION_STATUS.ACTION_REQUIRED) {
    return { label: "Action required", connected: false, tone: "warning" };
  }
  if (status === INTEGRATION_CONNECTION_STATUS.CONNECTING) {
    return { label: "Setup in progress", connected: false, tone: "warning" };
  }
  return {
    label: getIntegrationStatusLabel(status),
    connected: false,
    tone: "neutral",
  };
};

const headerToneClass = (tone, connected) => {
  if (connected || tone === "success") return "bg-emerald-50 border-emerald-200";
  if (tone === "warning") return "bg-amber-50 border-amber-200";
  if (tone === "error") return "bg-red-50 border-red-200";
  return "bg-white border-border";
};

const badgeToneClass = (tone, connected) => {
  if (connected || tone === "success") return "bg-emerald-100 text-emerald-700";
  if (tone === "warning") return "bg-amber-100 text-amber-700";
  if (tone === "error") return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-500";
};

const ZohoIntegrationCard = () => {
  const { guardAction, canPerformAction } = useActionGuard();
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);
  const { data: providersResponse, isLoading: providersLoading } = useGetIntegrationProvidersQuery();
  const {
    data: integrationSummary,
    isLoading: summaryLoading,
    isError: summaryError,
    refetch: refetchSummary,
  } = useGetApIntegrationSummaryQuery();
  const [disconnectZoho, { isLoading: disconnecting }] =
    useDisconnectZohoConnectionMutation();

  const providers = useMemo(() => normalizeProviders(providersResponse), [providersResponse]);
  const zohoProvider =
    providers.find((provider) => getProviderKey(provider) === "ZOHO_BOOKS") || providers[0];
  const erpIntegration = selectErpIntegration(integrationSummary);
  const zohoIntegration = isZohoIntegration(erpIntegration) ? erpIntegration : null;
  const activeNonZohoErp =
    erpIntegration.provider && erpIntegration.provider !== ERP_PROVIDER.ZOHO_BOOKS;
  const connectionId = zohoIntegration?.connectionId || "";
  const connectionStatus =
    zohoIntegration?.connectionStatus || INTEGRATION_CONNECTION_STATUS.DISCONNECTED;
  const headerStatus = getHeaderStatus(zohoIntegration);
  const { data: syncResponse, isLoading: syncLoading } = useGetIntegrationSyncStatusQuery(connectionId, {
    skip:
      !connectionId ||
      connectionStatus !== INTEGRATION_CONNECTION_STATUS.CONNECTED,
  });

  const syncRows = useMemo(
    () => (connectionId ? normalizeSyncRows(syncResponse, zohoProvider) : []),
    [connectionId, syncResponse, zohoProvider],
  );

  const lastSyncAt = useMemo(() => {
    const timestamps = syncRows
      .map((row) => row.lastSyncedAt)
      .filter(Boolean)
      .map((value) => new Date(value).getTime())
      .filter((value) => !Number.isNaN(value));
    if (timestamps.length === 0) return null;
    return new Date(Math.max(...timestamps)).toISOString();
  }, [syncRows]);

  const syncSummaryLoading =
    Boolean(connectionId) &&
    connectionStatus === INTEGRATION_CONNECTION_STATUS.CONNECTED &&
    syncLoading;
  const isLoading = providersLoading || summaryLoading || syncSummaryLoading;
  const organizationName =
    zohoIntegration?.organization?.name ||
    zohoIntegration?.organization?.id ||
    "Organization pending";
  const tokenExpiresAt = zohoIntegration?.details?.tokenExpiresAt;

  const handleDisconnectClick = () => {
    if (!connectionId) return;
    if (!guardAction("integrations.disconnect")) return;
    setDisconnectDialogOpen(true);
  };

  const confirmDisconnect = async () => {
    if (!connectionId) return;
    try {
      await disconnectZoho(connectionId).unwrap();
      toast.success("Zoho Books disconnected");
      setDisconnectDialogOpen(false);
      await refetchSummary();
    } catch (error) {
      toast.error(getErrorText(error, "Failed to disconnect Zoho Books"));
    }
  };

  return (
    <>
      <div
        className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
        data-testid="zoho-integration-card"
      >
        <div
          className={`flex items-center justify-between border-b px-6 py-4 ${headerToneClass(
            headerStatus.tone,
            headerStatus.connected,
          )}`}
        >
          <div className="flex items-center gap-3">
            <ZohoBooksLogo />
          </div>
          <div
            className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${badgeToneClass(
              headerStatus.tone,
              headerStatus.connected,
            )}`}
          >
            {headerStatus.connected ? (
              <Check className="h-4 w-4" />
            ) : headerStatus.tone === "error" ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            {headerStatus.label}
          </div>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="flex min-h-[220px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : summaryError ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                Unable to load Zoho integration summary.
              </div>
              <Button variant="outline" className="w-full" onClick={() => refetchSummary()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </div>
          ) : (
            <>
              {zohoIntegration && connectionStatus === INTEGRATION_CONNECTION_STATUS.CONNECTED ? (
                <div className="mb-4 space-y-1 rounded-lg border border-border bg-muted/30 p-3 text-sm">
                  <p className="text-gray-800">
                    <span className="font-medium">Organization:</span> {organizationName}
                  </p>
                  <p className="text-gray-600">
                    <span className="font-medium">Last sync:</span>{" "}
                    {syncSummaryLoading ? "Loading..." : formatDateTime(lastSyncAt)}
                  </p>
                  {canShowTokenExpiryWarning(zohoIntegration) ? (
                    <p className="text-gray-600">
                      <span className="font-medium">Token expires:</span>{" "}
                      {formatDateTime(tokenExpiresAt)}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {!zohoIntegration ? (
                activeNonZohoErp ? (
                  <Button disabled className="w-full bg-blue-600 text-white hover:bg-blue-700">
                    <Plug className="mr-2 h-4 w-4" />
                    Disconnect current ERP first
                  </Button>
                ) : (
                  <Button asChild className="w-full bg-blue-600 text-white hover:bg-blue-700">
                    <Link to="/integrations/connect/ZOHO_BOOKS">
                      <Plug className="mr-2 h-4 w-4" />
                      Connect Zoho
                    </Link>
                  </Button>
                )
              ) : connectionStatus === INTEGRATION_CONNECTION_STATUS.CONNECTED ? (
                <div className="space-y-3">
                  <Button asChild className="w-full bg-blue-600 text-white hover:bg-blue-700">
                    <Link to="/integrations/erp/zoho/dashboard">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Open Dashboard
                    </Link>
                  </Button>
                  <Button asChild className="w-full bg-blue-600 text-white hover:bg-blue-700">
                    <Link to={`/integrations/${connectionId}/sync-data`}>
                      <Database className="mr-2 h-4 w-4" />
                      Sync ERP Data
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
                    disabled={
                      disconnecting || !canPerformAction("integrations.disconnect")
                    }
                    onClick={handleDisconnectClick}
                  >
                    {disconnecting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Unplug className="mr-2 h-4 w-4" />
                    )}
                    Disconnect Zoho
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Button asChild className="w-full bg-blue-600 text-white hover:bg-blue-700">
                    <Link
                      to={`/integrations/connect/ZOHO_BOOKS?connectionId=${connectionId}`}
                    >
                      <Plug className="mr-2 h-4 w-4" />
                      {connectionStatus === INTEGRATION_CONNECTION_STATUS.ACTION_REQUIRED
                        ? "Select organization"
                        : "Resume setup"}
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/integrations">
                      <ArrowRight className="mr-2 h-4 w-4" />
                      Open Integrations
                    </Link>
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <AlertDialog
        open={disconnectDialogOpen}
        onOpenChange={(open) => {
          if (!disconnecting) setDisconnectDialogOpen(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Zoho Books?</AlertDialogTitle>
            <AlertDialogDescription>
              This will revoke the Zoho connection and stop Zoho sync until you reconnect it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disconnecting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={disconnecting}
              onClick={(event) => {
                event.preventDefault();
                confirmDisconnect();
              }}
            >
              {disconnecting ? "Disconnecting..." : "Disconnect"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ZohoIntegrationCard;

import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { toast } from "sonner";
import { ArrowLeft, RefreshCw, Search } from "lucide-react";

import {
  useGetIntegrationConnectionQuery,
  useGetIntegrationProvidersQuery,
  useGetIntegrationSyncStatusQuery,
  useTriggerIntegrationSyncMutation,
} from "../../../Services/apis/integrationsApi";
import { useActionGuard } from "../../../hooks/useActionGuard";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { DATA_CENTERS, FALLBACK_ZOHO_PROVIDER, OBJECT_LABELS } from "../constants";
import {
  formatDateTime,
  getConnectionOrgName,
  getConnectionProvider,
  getConnectionStatus,
  getErrorText,
  getProviderKey,
  normalizeProviders,
  normalizeSyncRows,
  shouldPollSyncStatus,
  titleize,
} from "../utils";
import { PageShell, StatusBadge } from "./shared";
import ConnectionWizard from "./ConnectionWizard";
import MappingEditor from "./MappingEditor";

const ObjectSyncCard = ({ row, connectionId, canTrigger, onSync, showSyncAction = false }) => {
  const dependencyBlocked =
    ["BILLS", "VENDOR_PAYMENTS"].includes(row.object) && row.status === "BLOCKED";
  const throttled = row.status === "THROTTLED";
  const syncDisabled = !canTrigger || dependencyBlocked || throttled || row.status === "BLOCKED";

  return (
    <Card className="flex h-full flex-col rounded-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{row.label}</CardTitle>
            <p className="text-xs text-muted-foreground">Last sync: {formatDateTime(row.lastSyncedAt)}</p>
          </div>
          <StatusBadge status={row.status} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded-md border p-2">
            <p className="font-semibold">{row.synced}</p>
            <p className="text-xs text-muted-foreground">Synced</p>
          </div>
          <div className="rounded-md border p-2">
            <p className="font-semibold">{row.pending}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </div>
          <div className="rounded-md border p-2">
            <p className="font-semibold">{row.errored}</p>
            <p className="text-xs text-muted-foreground">Errored</p>
          </div>
        </div>
        {dependencyBlocked && (
          <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
            Complete Chart of Accounts and Vendors sync before pushing bills or payments.
          </p>
        )}
        {throttled && (
          <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
            Throttled by Zoho rate limits. The backend will resume automatically.
          </p>
        )}
        {row.status === "PARTIAL" && (
          <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
            Partial sync completed. Review errored records or open the review queue.
          </p>
        )}
        {row.message && <p className="text-xs text-muted-foreground">{row.message}</p>}
        <div className="mt-auto flex flex-nowrap items-center gap-2 pt-2">
          {showSyncAction ? (
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              disabled={syncDisabled}
              onClick={() => onSync(row.object)}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync now
            </Button>
          ) : null}
          <Button asChild variant="ghost" size="sm" className="shrink-0">
            <Link to={`/integrations/${connectionId}/objects/${row.object}`}>
              <Search className="mr-2 h-4 w-4" />
              Review
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const DASHBOARD_TABS = new Set(["organisation", "mapping", "zoho-setup"]);

const getDashboardTab = (value) =>
  DASHBOARD_TABS.has(value) ? value : "organisation";

const SyncDashboard = ({ connectionId: connectionIdOverride = "" }) => {
  const connectionId = connectionIdOverride;
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = getDashboardTab(searchParams.get("tab") || "organisation");
  const { canPerformAction, guardAction } = useActionGuard();
  const { data: connection } = useGetIntegrationConnectionQuery(connectionId, { skip: !connectionId });
  const { data: providersResponse } = useGetIntegrationProvidersQuery();
  const [pollSyncStatus, setPollSyncStatus] = useState(false);
  const { data: syncResponse, isFetching, refetch } = useGetIntegrationSyncStatusQuery(connectionId, {
    skip: !connectionId,
    pollingInterval: pollSyncStatus ? 5000 : 0,
  });
  const [triggerSync, { isLoading: syncing }] = useTriggerIntegrationSyncMutation();
  const providers = useMemo(() => normalizeProviders(providersResponse), [providersResponse]);
  const connectionProvider = getConnectionProvider(connection || {});
  const isZohoDashboard = String(connectionProvider || "").toUpperCase() === "ZOHO_BOOKS";
  const activeTab =
    requestedTab === "zoho-setup" && !isZohoDashboard
      ? "organisation"
      : requestedTab;
  const manifest =
    providers.find((item) => getProviderKey(item) === connectionProvider) ||
    FALLBACK_ZOHO_PROVIDER;
  const rows = useMemo(() => normalizeSyncRows(syncResponse, manifest), [syncResponse, manifest]);
  const dataCenterValue = connection?.dataCenter || connection?.data_center || "";
  const dataCenterLabel =
    DATA_CENTERS.find((dataCenter) => dataCenter.value === dataCenterValue)?.label ||
    dataCenterValue ||
    "Not set";

  useEffect(() => {
    setPollSyncStatus(shouldPollSyncStatus(rows) || syncing);
  }, [rows, syncing]);

  const canTrigger = canPerformAction("integrations.sync.trigger") && !syncing;
  const showDashboardSyncActions = false;

  const handleSync = async (object) => {
    if (!guardAction("integrations.sync.trigger")) return;
    try {
      await triggerSync({ connectionId, object }).unwrap();
      toast.success(object ? `${OBJECT_LABELS[object] || titleize(object)} sync queued` : "Sync request queued");
      refetch();
    } catch (error) {
      toast.error(getErrorText(error, "Failed to trigger sync"));
    }
  };

  return (
    <PageShell
      title="Integration Dashboard"
      description={`${titleize(connectionProvider)} sync status, controls, and health.`}
      backAction={
        <Button asChild variant="outline" size="sm">
          <Link to="/integrations">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Integrations
          </Link>
        </Button>
      }
    >
      <Tabs
        value={activeTab}
        onValueChange={(nextTab) => {
          const tab = getDashboardTab(nextTab);
          setSearchParams((current) => {
            const params = new URLSearchParams(current);
            if (tab === "organisation") params.delete("tab");
            else params.set("tab", tab);
            return params;
          }, { replace: true });
        }}
        className="space-y-5"
      >
        <TabsList>
          <TabsTrigger value="organisation">Organisation</TabsTrigger>
          <TabsTrigger value="mapping">Mapping</TabsTrigger>
          {isZohoDashboard ? (
            <TabsTrigger value="zoho-setup">Zoho Integration Setup</TabsTrigger>
          ) : null}
        </TabsList>

        <TabsContent value="organisation" className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="rounded-md">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Connection</p>
                <div className="mt-2 flex items-center gap-2">
                  <StatusBadge status={getConnectionStatus(connection || {})} />
                  <span className="text-sm">{getConnectionOrgName(connection || {})}</span>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-md">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Data center</p>
                <p className="mt-2 font-medium">{dataCenterLabel}</p>
              </CardContent>
            </Card>
            <Card className="rounded-md">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Connection type</p>
                <p className="mt-2 font-medium">Client-owned Zoho app</p>
              </CardContent>
            </Card>
          </div>

          {/* <div className="grid auto-rows-fr gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((row) => (
              <ObjectSyncCard
                key={row.object}
                row={row}
                connectionId={connectionId}
                canTrigger={canTrigger}
                onSync={handleSync}
                showSyncAction={showDashboardSyncActions}
              />
            ))}
          </div> */}
        </TabsContent>

        <TabsContent value="mapping">
          <MappingEditor embedded />
        </TabsContent>

        {isZohoDashboard ? (
          <TabsContent value="zoho-setup">
            <ConnectionWizard
              embedded
              provider="ZOHO_BOOKS"
              connectionId={connectionId}
              onDone={(resolvedConnectionId) => {
                if (resolvedConnectionId) refetch();
              }}
            />
          </TabsContent>
        ) : null}
      </Tabs>
    </PageShell>
  );
};

export default SyncDashboard;

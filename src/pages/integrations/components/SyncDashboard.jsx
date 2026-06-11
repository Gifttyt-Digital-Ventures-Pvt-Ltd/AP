import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, RefreshCw, Search, Settings2, Loader2 } from "lucide-react";

import {
  useGetIntegrationConnectionQuery,
  useGetIntegrationProvidersQuery,
  useGetIntegrationSyncStatusQuery,
  useTriggerIntegrationSyncMutation,
} from "../../../Services/apis/integrationsApi";
import { useActionGuard } from "../../../hooks/useActionGuard";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { FALLBACK_ZOHO_PROVIDER, OBJECT_LABELS } from "../constants";
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
import { DirectionBadge, PageShell, StatusBadge } from "./shared";

const ObjectSyncCard = ({ row, connectionId, canTrigger, onSync }) => {
  const dependencyBlocked =
    ["BILLS", "VENDOR_PAYMENTS"].includes(row.object) && row.status === "BLOCKED";
  const throttled = row.status === "THROTTLED";
  const syncDisabled = !canTrigger || dependencyBlocked || throttled || row.status === "BLOCKED";

  return (
    <Card className="rounded-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{row.label}</CardTitle>
            <p className="text-xs text-muted-foreground">Last sync: {formatDateTime(row.lastSyncedAt)}</p>
          </div>
          <StatusBadge status={row.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {row.directions.map((direction) => (
            <DirectionBadge key={direction} direction={direction} />
          ))}
        </div>
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
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={syncDisabled}
            onClick={() => onSync(row.object)}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Sync now
          </Button>
          <Button asChild variant="ghost" size="sm">
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

const SyncDashboard = () => {
  const { connectionId } = useParams();
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
  const manifest =
    providers.find((item) => getProviderKey(item) === getConnectionProvider(connection || {})) ||
    FALLBACK_ZOHO_PROVIDER;
  const rows = useMemo(() => normalizeSyncRows(syncResponse, manifest), [syncResponse, manifest]);

  useEffect(() => {
    setPollSyncStatus(shouldPollSyncStatus(rows) || syncing);
  }, [rows, syncing]);

  const canTrigger = canPerformAction("integrations.sync.trigger") && !syncing;

  const handleSync = async (object) => {
    if (!guardAction("integrations.sync.trigger")) return;
    try {
      await triggerSync({ connectionId, object }).unwrap();
      toast.success(object ? `${OBJECT_LABELS[object] || titleize(object)} sync queued` : "Full sync queued");
      refetch();
    } catch (error) {
      toast.error(getErrorText(error, "Failed to trigger sync"));
    }
  };

  return (
    <PageShell
      title="Integration Dashboard"
      description={`${titleize(getConnectionProvider(connection || {}))} sync status, controls, and health.`}
      backAction={
        <Button asChild variant="outline" size="sm">
          <Link to="/integrations">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Integrations
          </Link>
        </Button>
      }
      actions={
        <>
          <Button asChild variant="outline">
            <Link to={`/integrations/${connectionId}/mapping`}>
              <Settings2 className="mr-2 h-4 w-4" />
              Mappings
            </Link>
          </Button>
          <Button onClick={() => handleSync()} disabled={!canTrigger}>
            {syncing || isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Sync all
          </Button>
        </>
      }
    >
      <div className="mb-5 grid gap-4 md:grid-cols-3">
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
            <p className="mt-2 font-medium">{connection?.dataCenter || connection?.data_center || "Not set"}</p>
          </CardContent>
        </Card>
        <Card className="rounded-md">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">OAuth model</p>
            <p className="mt-2 font-medium">Model {connection?.model || connection?.oauthModel || connection?.oauth_model || "A"}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <ObjectSyncCard
            key={row.object}
            row={row}
            connectionId={connectionId}
            canTrigger={canTrigger}
            onSync={handleSync}
          />
        ))}
      </div>
    </PageShell>
  );
};

export default SyncDashboard;

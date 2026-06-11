import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowUpDown, Building2, Plug, RefreshCw, Settings2, ShieldCheck } from "lucide-react";

import {
  useGetIntegrationConnectionsQuery,
  useGetIntegrationProvidersQuery,
} from "../../../Services/apis/integrationsApi";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { OBJECT_LABELS } from "../constants";
import {
  getConnectionId,
  getConnectionOrgName,
  getConnectionProvider,
  getConnectionStatus,
  isBlockingConnection,
  getProviderKey,
  getProviderName,
  normalizeConnections,
  normalizeObjects,
  normalizeProviders,
  titleize,
} from "../utils";
import { LoadingState, PageShell, StatusBadge } from "./shared";

const ProviderCard = ({ provider, disabled, activeConnection }) => {
  const providerKey = getProviderKey(provider);
  const name = getProviderName(provider);
  const objects = normalizeObjects(provider);

  return (
    <Card className="rounded-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-md border bg-muted p-2">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">{name}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {provider.auth?.type === "OAUTH2" ? "OAuth 2.0" : titleize(provider.auth?.type || "Integration")}
              </p>
            </div>
          </div>
          {activeConnection && getConnectionProvider(activeConnection) === providerKey && (
            <StatusBadge status={getConnectionStatus(activeConnection)} />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="min-h-10 text-sm text-muted-foreground">
          {provider.description || "Connect this ERP to sync accounting data with Optifii AP."}
        </p>
        <div className="flex flex-wrap gap-2">
          {objects.slice(0, 5).map(([objectKey]) => (
            <Badge key={objectKey} variant="secondary" className="rounded-sm">
              {OBJECT_LABELS[objectKey] || titleize(objectKey)}
            </Badge>
          ))}
        </div>
        {disabled ? (
          <Button disabled className="w-full">
            <Plug className="mr-2 h-4 w-4" />
            Disconnect current ERP first
          </Button>
        ) : (
          <Button asChild className="w-full">
            <Link to={`/integrations/connect/${providerKey}`}>
              <Plug className="mr-2 h-4 w-4" />
              Connect
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

const IntegrationLanding = () => {
  const { data: providersResponse, isLoading: providersLoading } = useGetIntegrationProvidersQuery();
  const {
    data: connectionsResponse,
    isLoading: connectionsLoading,
    refetch: refetchConnections,
  } = useGetIntegrationConnectionsQuery();

  const providers = useMemo(() => normalizeProviders(providersResponse), [providersResponse]);
  const connections = useMemo(() => normalizeConnections(connectionsResponse), [connectionsResponse]);
  const activeConnection = connections.find((connection) => isBlockingConnection(connection));
  const activeConnectionId = getConnectionId(activeConnection || {});
  const hasBlockingConnection = Boolean(activeConnection);

  if (providersLoading || connectionsLoading) return <PageShell title="Integrations"><LoadingState /></PageShell>;

  return (
    <PageShell
      title="Integrations"
      description="Connect one ERP at a time, manage sync health, mappings, review queues, and audit logs."
      actions={
        <Button variant="outline" onClick={() => refetchConnections()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      }
    >
      {activeConnection ? (
        <Card className="mb-5 rounded-md">
          <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-md border bg-muted p-2">
                <ShieldCheck className="h-5 w-5 text-green-700" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold">{titleize(getConnectionProvider(activeConnection))}</h2>
                  <StatusBadge status={getConnectionStatus(activeConnection)} />
                </div>
                <p className="text-sm text-muted-foreground">{getConnectionOrgName(activeConnection)}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {getConnectionStatus(activeConnection) !== "CONNECTED" ? (
                <Button asChild variant="outline">
                  <Link to={`/integrations/connect/${getConnectionProvider(activeConnection)}?connectionId=${activeConnectionId}`}>
                    Resume setup
                  </Link>
                </Button>
              ) : null}
              <Button asChild>
                <Link to={`/integrations/${activeConnectionId}`}>
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                  Open dashboard
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to={`/integrations/${activeConnectionId}/mapping`}>
                  <Settings2 className="mr-2 h-4 w-4" />
                  Mappings
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {providers.map((provider) => (
          <ProviderCard
            key={getProviderKey(provider)}
            provider={provider}
            disabled={hasBlockingConnection}
            activeConnection={activeConnection}
          />
        ))}
      </div>
    </PageShell>
  );
};

export default IntegrationLanding;

import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Database,
  ExternalLink,
  GitBranch,
  KeyRound,
  Loader2,
} from "lucide-react";

import {
  useBindZohoOrganizationMutation,
  useCreateZohoConnectionMutation,
  useGetIntegrationConnectionsQuery,
  useGetIntegrationProvidersQuery,
  useGetZohoConnectionStatusQuery,
  useGetZohoOrganizationsQuery,
  useLazyGetSyncDataCategoriesQuery,
  useTriggerIntegrationSyncMutation,
} from "../../../Services/apis/integrationsApi";
import { useActionGuard } from "../../../hooks/useActionGuard";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import {
  DATA_CENTERS,
  FALLBACK_ZOHO_PROVIDER,
  OBJECT_LABELS,
  ZOHO_OAUTH_SESSION_KEY,
} from "../constants";
import {
  getConnectionId,
  getConnectionProvider,
  getConnectionStatus,
  getErrorText,
  getOAuthErrorMessage,
  getProviderKey,
  getProviderName,
  getZohoOAuthCallbackUrl,
  normalizeConnections,
  normalizeObjects,
  normalizeProviders,
  shouldPollOAuthStatus,
  toArray,
  titleize,
} from "../utils";
import { isGranularSyncSupported } from "../syncDataUtils";
import ManageSyncedData from "./ManageSyncedData";
import { PageShell, StatusBadge } from "./shared";

const getZohoOrganizationId = (organization = {}) =>
  organization.externalId ||
  organization.external_id ||
  organization.organizationId ||
  organization.organization_id ||
  organization.id;

const getCreateConnectionResponseData = (response = {}) => response.data || response;

const getAuthorizationUrl = (response = {}) => {
  const data = getCreateConnectionResponseData(response);
  return data.authorizationUrl || data.authorization_url || data.authUrl || data.auth_url || "";
};

const ZOHO_ORG_SELECTION_STATUSES = new Set([
  "CONNECTED",
  "AWAITING_ORG_SELECTION",
  "ACTION_REQUIRED",
]);
const SHOW_ZOHO_SYNC_OBJECT_SELECTOR = false;

const ConnectionWizard = ({
  embedded = false,
  provider: providerOverride,
  connectionId: connectionIdOverride = "",
  onDone,
}) => {
  const params = useParams();
  const provider = providerOverride || params.provider || "ZOHO_BOOKS";
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { guardAction } = useActionGuard();
  const { data: providersResponse } = useGetIntegrationProvidersQuery();
  const { data: connectionsResponse } = useGetIntegrationConnectionsQuery();
  const [createConnection, { isLoading: creating }] = useCreateZohoConnectionMutation();
  const [bindOrganization, { isLoading: bindingOrg }] = useBindZohoOrganizationMutation();
  const [triggerSync] = useTriggerIntegrationSyncMutation();
  const [checkSyncDataCategories] = useLazyGetSyncDataCategoriesQuery();
  const providers = useMemo(() => normalizeProviders(providersResponse), [providersResponse]);
  const providerManifest =
    providers.find((item) => getProviderKey(item) === provider) || FALLBACK_ZOHO_PROVIDER;

  const queryConnectionId =
    connectionIdOverride ||
    searchParams.get("connectionId") ||
    searchParams.get("connection_id") ||
    "";
  const oauthErrorCode = searchParams.get("oauth_error") || searchParams.get("error") || "";
  const oauthErrorDescription = searchParams.get("error_description") || searchParams.get("message") || "";

  const [dataCenter, setDataCenter] = useState("in");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [connectionId, setConnectionId] = useState("");
  const [selectedOrg, setSelectedOrg] = useState("");
  const [enabledObjects, setEnabledObjects] = useState(() => new Set(providerManifest.syncOrder || []));
  const [showGranularSyncStep, setShowGranularSyncStep] = useState(false);
  const model = "B";

  const resumedConnectionId = useMemo(() => {
    if (queryConnectionId) return queryConnectionId;
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem(ZOHO_OAUTH_SESSION_KEY);
      if (stored) return stored;
    }
    const connections = normalizeConnections(connectionsResponse);
    const pending = connections.find(
      (connection) =>
        getConnectionProvider(connection) === provider &&
        (shouldPollOAuthStatus(getConnectionStatus(connection)) ||
          ZOHO_ORG_SELECTION_STATUSES.has(getConnectionStatus(connection))),
    );
    return getConnectionId(pending || {}) || "";
  }, [connectionsResponse, provider, queryConnectionId]);

  useEffect(() => {
    if (!resumedConnectionId || connectionId) return;
    setConnectionId(resumedConnectionId);
  }, [connectionId, resumedConnectionId]);

  useEffect(() => {
    if (!oauthErrorCode) return;
    toast.error(getOAuthErrorMessage(oauthErrorCode, oauthErrorDescription));
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("oauth_error");
    nextParams.delete("error");
    nextParams.delete("error_description");
    nextParams.delete("message");
    setSearchParams(nextParams, { replace: true });
  }, [oauthErrorCode, oauthErrorDescription, searchParams, setSearchParams]);

  const [pollOAuthStatus, setPollOAuthStatus] = useState(true);
  const { data: statusResponse } = useGetZohoConnectionStatusQuery(connectionId, {
    skip: !connectionId,
    pollingInterval: connectionId && pollOAuthStatus ? 3000 : 0,
  });
  const connectionStatus = getConnectionStatus(statusResponse || {});

  useEffect(() => {
    setPollOAuthStatus(shouldPollOAuthStatus(connectionStatus));
  }, [connectionStatus]);
  const canLoadOrganizations = Boolean(
    connectionId && ZOHO_ORG_SELECTION_STATUSES.has(connectionStatus),
  );
  const { data: organizationsResponse, isFetching: orgsFetching } = useGetZohoOrganizationsQuery(connectionId, {
    skip: !canLoadOrganizations,
  });
  const organizations = toArray(
    organizationsResponse?.organizations || organizationsResponse?.data || organizationsResponse,
  );

  const redirectUri = getZohoOAuthCallbackUrl();

  const handleCopyRedirect = async () => {
    try {
      await navigator.clipboard.writeText(redirectUri);
      toast.success("Redirect URI copied");
    } catch {
      toast.error("Could not copy redirect URI");
    }
  };

  const handleStartConnection = async () => {
    if (!guardAction("integrations.connect")) return;
    if (!clientId.trim() || !clientSecret.trim()) {
      toast.error("Client ID and Client Secret are required to connect Zoho");
      return;
    }
    if (enabledObjects.size === 0) {
      toast.error("Select at least one sync object");
      return;
    }

    try {
      const payload = {
        model,
        dataCenter,
        enabledObjects: Array.from(enabledObjects),
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim(),
      };
      const response = await createConnection(payload).unwrap();
      const responseData = getCreateConnectionResponseData(response);
      const nextConnectionId =
        responseData.connectionId || responseData.connection_id || responseData.id;
      if (!nextConnectionId) {
        toast.error("Connection created but no connection ID was returned");
        return;
      }
      setConnectionId(nextConnectionId);
      sessionStorage.setItem(ZOHO_OAUTH_SESSION_KEY, nextConnectionId);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("connectionId", nextConnectionId);
      setSearchParams(nextParams, { replace: true });
      const authorizationUrl = getAuthorizationUrl(responseData);
      if (authorizationUrl) {
        window.location.assign(authorizationUrl);
        return;
      }
      toast.success("Connection created. Waiting for authorization status.");
    } catch (error) {
      toast.error(getErrorText(error, "Failed to create Zoho connection"));
    }
  };

  const handleBindOrganization = async () => {
    if (!selectedOrg || !connectionId) return;
    try {
      await bindOrganization({ connectionId, organizationId: selectedOrg }).unwrap();
      sessionStorage.removeItem(ZOHO_OAUTH_SESSION_KEY);

      try {
        const summary = await checkSyncDataCategories({ provider, connectionId }).unwrap();
        if (isGranularSyncSupported(summary)) {
          setShowGranularSyncStep(true);
          toast.success("Zoho organization selected. Select ERP data to import.");
          return;
        }
      } catch {
        // Granular sync is optional during rollout. Keep the existing broad initial sync fallback.
      }

      const selectedSyncObjects = Array.from(enabledObjects).filter(Boolean);
      if (selectedSyncObjects.length > 0) {
        try {
          await Promise.all(
            selectedSyncObjects.map((object) =>
              triggerSync({ connectionId, object }).unwrap(),
            ),
          );
          toast.success("Zoho organization selected. Selected sync requests queued.");
        } catch {
          toast.success("Zoho organization selected. You can retry sync from the dashboard.");
        }
      } else {
        toast.success("Zoho organization selected. You can start sync from the dashboard.");
      }
      if (onDone) onDone(connectionId);
      else navigate(`/integrations/${connectionId}/sync-data`);
    } catch (error) {
      toast.error(getErrorText(error, "Failed to bind organization"));
    }
  };

  const toggleObject = (objectKey) => {
    setEnabledObjects((current) => {
      const next = new Set(current);
      if (next.has(objectKey)) next.delete(objectKey);
      else next.add(objectKey);
      return next;
    });
  };

  if (showGranularSyncStep) {
    const granularSyncContent = (
      <ManageSyncedData
        mode="wizard"
        connectionId={connectionId}
        provider={provider}
        embedded
        onDone={() => {
          if (onDone) onDone(connectionId);
          else navigate(`/integrations/${connectionId}/sync-data`);
        }}
      />
    );

    if (embedded) return granularSyncContent;

    return (
      <PageShell
        title="Import ERP Data"
        description="Select ERP master data to import. Already imported items stay locked and cannot be resent."
        backAction={
          <Button asChild variant="outline" size="sm">
            <Link to="/integrations">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
        }
      >
        {granularSyncContent}
      </PageShell>
    );
  }

  const setupContent = (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-5">
        <Card className="rounded-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4" />
              Data center
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Zoho data center</Label>
              <Select value={dataCenter} onValueChange={setDataCenter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select data center" />
                </SelectTrigger>
                <SelectContent>
                  {DATA_CENTERS.map((dc) => (
                    <SelectItem key={dc.value} value={dc.value}>
                      {dc.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
              India is the default because most Optifii clients use Zoho Books India. The selected data center is stored on the connection and reused for every backend sync call.
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4" />
              Zoho app credentials
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                <li>Create a Server-based Application in the Zoho API Console.</li>
                <li>Add the authorized redirect URI shown below.</li>
                <li>Copy the generated Client ID and Client Secret into Optifii.</li>
              </ol>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Client ID *</Label>
                  <Input value={clientId} onChange={(event) => setClientId(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Client Secret *</Label>
                  <Input
                    type="password"
                    value={clientSecret}
                    onChange={(event) => setClientSecret(event.target.value)}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Authorized redirect URI</Label>
                  <div className="flex gap-2">
                    <Input readOnly value={redirectUri} className="font-mono text-xs" />
                    <Button type="button" variant="outline" onClick={handleCopyRedirect}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Add this exact URI in the Zoho API Console before authorizing. Optifii stores credentials server-side only.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {SHOW_ZOHO_SYNC_OBJECT_SELECTOR ? (
          <Card className="rounded-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <GitBranch className="h-4 w-4" />
                Sync objects
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {normalizeObjects(providerManifest).map(([objectKey]) => (
                <button
                  key={objectKey}
                  type="button"
                  onClick={() => toggleObject(objectKey)}
                  className={`rounded-md border p-3 text-left transition ${
                    enabledObjects.has(objectKey)
                      ? "border-primary bg-primary/5"
                      : "bg-card hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">
                      {OBJECT_LABELS[objectKey] || titleize(objectKey)}
                    </span>
                    {enabledObjects.has(objectKey) ? (
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    ) : null}
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        ) : null}
      </div>

      <div className="space-y-5">
        <Card className="rounded-md">
          <CardHeader>
            <CardTitle className="text-base">Authorize</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Connection type</span>
                <Badge variant="outline">Client-owned app</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data center</span>
                <span>{dataCenter}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Objects</span>
                <span>{enabledObjects.size}</span>
              </div>
            </div>
            <Button className="w-full" onClick={handleStartConnection} disabled={creating}>
              {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
              Authorize with Zoho
            </Button>
            {connectionId && (
              <div className="rounded-md border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <StatusBadge status={connectionStatus} />
                </div>
                <p className="mt-2 break-all font-mono text-xs text-muted-foreground">{connectionId}</p>
                {connectionStatus === "ERROR" && (
                  <p className="mt-2 text-xs text-red-700">
                    Authorization failed. Disconnect any stale connection or restart with the correct redirect URI and credentials.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-md">
          <CardHeader>
            <CardTitle className="text-base">Organization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!connectionId ? (
              <p className="text-sm text-muted-foreground">
                Complete Zoho authorization to load organizations for this connection.
              </p>
            ) : shouldPollOAuthStatus(connectionStatus) ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Waiting for Zoho authorization to complete.
              </div>
            ) : !ZOHO_ORG_SELECTION_STATUSES.has(connectionStatus) ? (
              <p className="text-sm text-muted-foreground">
                Organizations are available after Zoho authorization is completed.
              </p>
            ) : orgsFetching ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading organizations
              </div>
            ) : organizations.length > 0 ? (
              <>
                <Select value={selectedOrg} onValueChange={setSelectedOrg}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Zoho organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org) => {
                      const id = getZohoOrganizationId(org);
                      if (!id) return null;
                      return (
                        <SelectItem key={id} value={String(id)}>
                          {org.name || org.organizationName || id}
                          {org.currencyCode || org.currency ? ` (${org.currencyCode || org.currency})` : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <Button className="w-full" onClick={handleBindOrganization} disabled={!selectedOrg || bindingOrg}>
                  {bindingOrg ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  Bind organization
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No Zoho organizations were returned for this account. Verify the connected Zoho user has access to at least one Books organization.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );

  if (embedded) return setupContent;

  return (
    <PageShell
      title={`Connect ${getProviderName(providerManifest)}`}
      description="Connect Zoho Books using your own Zoho app credentials. Tokens and secrets remain server-side."
      backAction={
        <Button asChild variant="outline" size="sm">
          <Link to="/integrations">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
      }
    >
      {setupContent}
    </PageShell>
  );
};

export default ConnectionWizard;

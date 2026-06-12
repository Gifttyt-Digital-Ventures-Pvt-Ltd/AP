import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
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
import { Switch } from "../../../components/ui/switch";
import {
  DATA_CENTERS,
  FALLBACK_ZOHO_PROVIDER,
  OBJECT_LABELS,
  ZOHO_OAUTH_SESSION_KEY,
  isZohoByoFeatureEnabled,
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
import { PageShell, StatusBadge } from "./shared";

const getZohoOrganizationId = (organization = {}) =>
  organization.externalId ||
  organization.external_id ||
  organization.organizationId ||
  organization.organization_id ||
  organization.id;

const ConnectionWizard = () => {
  const { provider = "ZOHO_BOOKS" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { guardAction } = useActionGuard();
  const { data: providersResponse } = useGetIntegrationProvidersQuery();
  const { data: connectionsResponse } = useGetIntegrationConnectionsQuery();
  const [createConnection, { isLoading: creating }] = useCreateZohoConnectionMutation();
  const [bindOrganization, { isLoading: bindingOrg }] = useBindZohoOrganizationMutation();
  const providers = useMemo(() => normalizeProviders(providersResponse), [providersResponse]);
  const providerManifest =
    providers.find((item) => getProviderKey(item) === provider) || FALLBACK_ZOHO_PROVIDER;

  const queryConnectionId =
    searchParams.get("connectionId") || searchParams.get("connection_id") || "";
  const oauthErrorCode = searchParams.get("oauth_error") || searchParams.get("error") || "";
  const oauthErrorDescription = searchParams.get("error_description") || searchParams.get("message") || "";

  const [dataCenter, setDataCenter] = useState("in");
  const [useByoCredentials, setUseByoCredentials] = useState(false);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [connectionId, setConnectionId] = useState("");
  const [selectedOrg, setSelectedOrg] = useState("");
  const [enabledObjects, setEnabledObjects] = useState(() => new Set(providerManifest.syncOrder || []));
  const byoEnabled =
    isZohoByoFeatureEnabled() && providerManifest.auth?.supportsByoCredentials !== false;
  const model = useByoCredentials ? "B" : "A";

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
        shouldPollOAuthStatus(getConnectionStatus(connection)),
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
  const canLoadOrganizations = connectionId && !["ERROR", "DISCONNECTED"].includes(connectionStatus);
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
    if (useByoCredentials && (!clientId.trim() || !clientSecret.trim())) {
      toast.error("Client ID and Client Secret are required for BYO credentials");
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
        ...(useByoCredentials
          ? { clientId: clientId.trim(), clientSecret: clientSecret.trim() }
          : {}),
      };
      const response = await createConnection(payload).unwrap();
      const nextConnectionId = response.connectionId || response.connection_id || response.id;
      if (!nextConnectionId) {
        toast.error("Connection created but no connection ID was returned");
        return;
      }
      setConnectionId(nextConnectionId);
      sessionStorage.setItem(ZOHO_OAUTH_SESSION_KEY, nextConnectionId);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set("connectionId", nextConnectionId);
      setSearchParams(nextParams, { replace: true });
      if (response.authUrl) {
        window.location.assign(response.authUrl);
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
      toast.success("Zoho organization selected");
      navigate(`/integrations/${connectionId}`);
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

  return (
    <PageShell
      title={`Connect ${getProviderName(providerManifest)}`}
      description="Model A uses Optifii's shared OAuth app. Model B lets enterprise clients bring their own Zoho app credentials."
      backAction={
        <Button asChild variant="outline" size="sm">
          <Link to="/integrations">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
      }
    >
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
                OAuth model
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="font-medium">Use my own Zoho app</p>
                  <p className="text-sm text-muted-foreground">Advanced Model B path with client-owned OAuth credentials.</p>
                </div>
                <Switch
                  checked={useByoCredentials}
                  disabled={!byoEnabled}
                  onCheckedChange={setUseByoCredentials}
                />
              </div>
              {!byoEnabled && (
                <p className="text-xs text-muted-foreground">
                  BYO credentials are disabled for this tenant. Contact your administrator to enable Model B.
                </p>
              )}
              {useByoCredentials ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Client ID</Label>
                    <Input value={clientId} onChange={(event) => setClientId(event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Client Secret</Label>
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
              ) : (
                <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
                  Model A uses Optifii&apos;s server-side OAuth app. No client secret is collected or exposed in the browser.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <GitBranch className="h-4 w-4" />
                Sync objects
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {normalizeObjects(providerManifest).map(([objectKey, config]) => (
                <button
                  key={objectKey}
                  type="button"
                  onClick={() => toggleObject(objectKey)}
                  className={`rounded-md border p-3 text-left transition ${
                    enabledObjects.has(objectKey) ? "border-primary bg-primary/5" : "bg-card hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{OBJECT_LABELS[objectKey] || titleize(objectKey)}</span>
                    {enabledObjects.has(objectKey) && <CheckCircle2 className="h-4 w-4 text-primary" />}
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="rounded-md">
            <CardHeader>
              <CardTitle className="text-base">Authorize</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Model</span>
                  <Badge variant="outline">Model {model}</Badge>
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
              {orgsFetching ? (
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
                  {connectionId
                    ? "Organizations appear here after Zoho authorization succeeds."
                    : "Start authorization to load Zoho organizations."}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
};

export default ConnectionWizard;

import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Loader2, TriangleAlert, Unplug } from "lucide-react";

import { useDisconnectZohoConnectionMutation } from "../../../Services/apis/integrationsApi";
import { useActionGuard } from "../../../hooks/useActionGuard";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { getErrorText } from "../utils";
import { PageShell } from "./shared";

const DisconnectPanel = ({ connectionId }) => {
  const navigate = useNavigate();
  const { guardAction, canPerformAction } = useActionGuard();
  const [disconnect, { isLoading }] = useDisconnectZohoConnectionMutation();

  const handleDisconnect = async () => {
    if (!guardAction("integrations.disconnect")) return;
    try {
      await disconnect(connectionId).unwrap();
      toast.success("Integration disconnected");
      navigate("/integrations");
    } catch (error) {
      toast.error(getErrorText(error, "Failed to disconnect integration"));
    }
  };

  return (
    <Button
      variant="outline"
      disabled={!canPerformAction("integrations.disconnect") || isLoading}
      onClick={handleDisconnect}
      className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
    >
      {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Unplug className="mr-2 h-4 w-4" />}
      Disconnect
    </Button>
  );
};

const ConnectionSettings = () => {
  const { connectionId } = useParams();

  return (
    <PageShell
      title="Connection Settings"
      description="Disconnecting revokes the backend-brokered ERP connection and frees the tenant to connect another ERP."
      actions={
        <Button asChild variant="outline">
          <Link to={`/integrations/${connectionId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Dashboard
          </Link>
        </Button>
      }
    >
      <Card className="rounded-md border-red-200">
        <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <TriangleAlert className="mt-0.5 h-5 w-5 text-red-700" />
            <div>
              <h2 className="font-semibold">Disconnect ERP</h2>
              <p className="text-sm text-muted-foreground">
                Token revocation and secret cleanup are handled server-side. The browser never receives tokens.
              </p>
            </div>
          </div>
          <DisconnectPanel connectionId={connectionId} />
        </CardContent>
      </Card>
    </PageShell>
  );
};

export default ConnectionSettings;

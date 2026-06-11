import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Settings2 } from "lucide-react";

import {
  useGetIntegrationMappingsQuery,
  useUpdateIntegrationMappingsMutation,
} from "../../../Services/apis/integrationsApi";
import { useActionGuard } from "../../../hooks/useActionGuard";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Textarea } from "../../../components/ui/textarea";
import { getErrorText, normalizeMappings } from "../utils";
import { LoadingState, PageShell } from "./shared";

const MappingEditor = () => {
  const { connectionId } = useParams();
  const { guardAction, canPerformAction } = useActionGuard();
  const { data, isLoading } = useGetIntegrationMappingsQuery(connectionId, { skip: !connectionId });
  const [updateMappings, { isLoading: saving }] = useUpdateIntegrationMappingsMutation();
  const mappings = useMemo(() => normalizeMappings(data), [data]);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    setDraft(JSON.stringify(mappings.raw || {}, null, 2));
  }, [mappings.raw]);

  const handleSave = async () => {
    if (!guardAction("integrations.mapping.edit")) return;
    try {
      const body = JSON.parse(draft || "{}");
      await updateMappings({ connectionId, body }).unwrap();
      toast.success("Mappings saved");
    } catch (error) {
      toast.error(error instanceof SyntaxError ? "Mapping JSON is invalid" : getErrorText(error, "Failed to save mappings"));
    }
  };

  if (isLoading) return <PageShell title="Mappings"><LoadingState label="Loading mappings..." /></PageShell>;

  return (
    <PageShell
      title="Field & Account Mapping"
      description="Versioned connection mappings for categories, payment modes, vendors, and Zoho accounts."
      backAction={
        <Button asChild variant="outline" size="sm">
          <Link to={`/integrations/${connectionId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Dashboard
          </Link>
        </Button>
      }
      actions={
        <Button onClick={handleSave} disabled={!canPerformAction("integrations.mapping.edit") || saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Settings2 className="mr-2 h-4 w-4" />}
            Save mappings
          </Button>
      }
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="rounded-md">
          <CardHeader>
            <CardTitle className="text-base">Mapping payload</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className="min-h-[520px] font-mono text-xs"
              spellCheck={false}
            />
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card className="rounded-md">
            <CardHeader>
              <CardTitle className="text-base">Version</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-sm">{mappings.version}</p>
            </CardContent>
          </Card>
          {[
            ["Expense categories", mappings.categories.length],
            ["Payment modes", mappings.paymentModes.length],
            ["Vendor contacts", mappings.vendors.length],
          ].map(([label, count]) => (
            <Card key={label} className="rounded-md">
              <CardContent className="flex items-center justify-between p-4">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="font-semibold">{count}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </PageShell>
  );
};

export default MappingEditor;

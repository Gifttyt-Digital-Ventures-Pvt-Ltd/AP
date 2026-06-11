import React, { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

import {
  useGetIntegrationReviewQueueQuery,
  useResolveIntegrationMatchMutation,
} from "../../../Services/apis/integrationsApi";
import { useActionGuard } from "../../../hooks/useActionGuard";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { OBJECT_LABELS, REVIEW_RESOLVE_ACTIONS } from "../constants";
import { getErrorText, normalizeReviewQueue, titleize } from "../utils";
import { EmptyState, LoadingState, PageShell, StatusBadge } from "./shared";

const ObjectReview = () => {
  const { connectionId, object } = useParams();
  const { guardAction, canPerformAction } = useActionGuard();
  const { data, isLoading } = useGetIntegrationReviewQueueQuery({ connectionId, object }, { skip: !connectionId });
  const [resolveMatch, { isLoading: resolving }] = useResolveIntegrationMatchMutation();
  const items = useMemo(() => normalizeReviewQueue(data), [data]);

  const handleResolve = async (item, action) => {
    if (!guardAction("integrations.review.resolve")) return;
    const reviewId = item.id || item.reviewId || item.review_id;
    if (!reviewId) {
      toast.error("Review item is missing an ID");
      return;
    }
    try {
      await resolveMatch({ connectionId, reviewId, resolution: { action } }).unwrap();
      toast.success("Review item resolved");
    } catch (error) {
      toast.error(getErrorText(error, "Failed to resolve review item"));
    }
  };

  if (isLoading) return <PageShell title="Review Queue"><LoadingState label="Loading review queue..." /></PageShell>;

  return (
    <PageShell
      title={`${OBJECT_LABELS[object] || titleize(object)} Review Queue`}
      description="Resolve ambiguous ERP matches, conflicts, and partial sync failures."
      backAction={
        <Button asChild variant="outline" size="sm">
          <Link to={`/integrations/${connectionId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Dashboard
          </Link>
        </Button>
      }
    >
      {items.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="No items need review"
          description="Conflicts and ambiguous matches will appear here when the backend sync engine finds them."
        />
      ) : (
        <Card className="rounded-md">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Optifii record</TableHead>
                  <TableHead>ERP record</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={item.id || item.reviewId || index}>
                    <TableCell>{titleize(item.type || item.reason || "Match")}</TableCell>
                    <TableCell>{item.optifiiName || item.optifiiRecord || item.localRecord || "-"}</TableCell>
                    <TableCell>{item.erpName || item.zohoRecord || item.remoteRecord || "-"}</TableCell>
                    <TableCell><StatusBadge status={item.status || "PENDING"} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        {REVIEW_RESOLVE_ACTIONS.map((action) => (
                          <Button
                            key={action.value}
                            size="sm"
                            variant={action.value === "ACCEPT" ? "default" : "outline"}
                            disabled={!canPerformAction("integrations.review.resolve") || resolving}
                            onClick={() => handleResolve(item, action.value)}
                          >
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
};

export default ObjectReview;

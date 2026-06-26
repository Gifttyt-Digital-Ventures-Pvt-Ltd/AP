import React, { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, FileClock, RefreshCw } from "lucide-react";

import { useGetIntegrationLogsQuery } from "../../../Services/apis/integrationsApi";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import { OBJECT_LABELS } from "../constants";
import { formatDateTime, normalizeLogs, titleize } from "../utils";
import { EmptyState, LoadingState, PageShell, StatusBadge } from "./shared";

const DashboardBackButton = ({ connectionId, onOpenDashboard }) => {
  if (onOpenDashboard) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={onOpenDashboard}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Dashboard
      </Button>
    );
  }

  return (
    <Button asChild variant="outline" size="sm">
      <Link to={`/integrations/${connectionId}`}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Dashboard
      </Link>
    </Button>
  );
};

const SyncLogs = ({ onOpenDashboard }) => {
  const { connectionId } = useParams();
  const [object, setObject] = useState("ALL");
  const { data, isLoading, refetch } = useGetIntegrationLogsQuery({
    connectionId,
    object: object === "ALL" ? undefined : object,
  });
  const logs = useMemo(() => normalizeLogs(data), [data]);

  return (
    <PageShell
      title="Sync Logs"
      description="Backend sync history, throttling, partial failures, and resolved events."
      backAction={<DashboardBackButton connectionId={connectionId} onOpenDashboard={onOpenDashboard} />}
      actions={
        <>
          <Select value={object} onValueChange={setObject}>
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All objects</SelectItem>
              {Object.entries(OBJECT_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </>
      }
    >
      {isLoading ? (
        <LoadingState label="Loading logs..." />
      ) : logs.length === 0 ? (
        <EmptyState icon={FileClock} title="No sync logs yet" description="Logs will appear after authorization, sync jobs, or review actions." />
      ) : (
        <Card className="rounded-md">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Object</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log, index) => (
                  <TableRow key={log.id || index}>
                    <TableCell>{formatDateTime(log.createdAt || log.created_at || log.timestamp)}</TableCell>
                    <TableCell>{OBJECT_LABELS[log.object] || titleize(log.object || "-")}</TableCell>
                    <TableCell>{titleize(log.event || log.action || "Sync")}</TableCell>
                    <TableCell><StatusBadge status={log.status || "INFO"} /></TableCell>
                    <TableCell className="max-w-xl truncate">{log.message || log.detail || "-"}</TableCell>
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

export default SyncLogs;

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import CreditAmount from "./CreditAmount";

const formatDateTime = (value) => {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

const asArray = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.data)) return response.data;
  return [];
};

const LedgerTable = ({ ledger, loading = false, limit }) => {
  const entries = asArray(ledger).slice(0, limit || undefined);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-12 animate-pulse rounded-md bg-muted/60" />
        ))}
      </div>
    );
  }

  if (!entries.length) {
    return (
      <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        No token ledger entries found.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Action</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Balance after</TableHead>
            <TableHead>Performed by</TableHead>
            <TableHead>Reference</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="whitespace-nowrap">{formatDateTime(entry.createdAt)}</TableCell>
              <TableCell>
                <Badge variant="outline">{entry.entryType}</Badge>
              </TableCell>
              <TableCell>{entry.actionName || entry.actionCode || "-"}</TableCell>
              <TableCell className="text-right">
                <CreditAmount value={entry.amount} signed />
              </TableCell>
              <TableCell className="text-right">
                <CreditAmount value={entry.balanceAfter} />
              </TableCell>
              <TableCell>{entry.performedBy || "-"}</TableCell>
              <TableCell>{entry.reference || "-"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default LedgerTable;

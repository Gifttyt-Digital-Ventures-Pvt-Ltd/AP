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
import { parseApiDate } from "@/lib/utils";

const formatDateTime = (value) => {
  const parsed = parseApiDate(value);
  if (!parsed) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
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
      <Table className="border-separate border-spacing-0">
        <TableHeader>
          <TableRow>
            <TableHead className="border border-table-border">Date</TableHead>
            <TableHead className="border border-table-border">Type</TableHead>
            <TableHead className="border border-table-border">Action</TableHead>
            <TableHead className="border border-table-border text-right">Amount</TableHead>
            <TableHead className="border border-table-border text-right">Balance after</TableHead>
            <TableHead className="border border-table-border">Performed by</TableHead>
            <TableHead className="border border-table-border">Reference</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="border border-table-border whitespace-nowrap">{formatDateTime(entry.createdAt)}</TableCell>
              <TableCell className="border border-table-border">
                <Badge variant="outline">{entry.entryType}</Badge>
              </TableCell>
              <TableCell className="border border-table-border">{entry.actionName || entry.actionCode || "-"}</TableCell>
              <TableCell className="border border-table-border text-right">
                <CreditAmount value={entry.amount} signed />
              </TableCell>
              <TableCell className="border border-table-border text-right">
                <CreditAmount value={entry.balanceAfter} />
              </TableCell>
              <TableCell className="border border-table-border">{entry.performedBy || "-"}</TableCell>
              <TableCell className="border border-table-border">{entry.reference || "-"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default LedgerTable;

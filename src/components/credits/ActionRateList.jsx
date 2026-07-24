import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import CreditAmount from "./CreditAmount";
import { parseCreditAmount } from "../../utils/creditMath";

const asArray = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.data)) return response.data;
  return [];
};

const ActionRateList = ({ actionTypes = [], loading = false }) => {
  const actions = asArray(actionTypes);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-12 animate-pulse rounded-md bg-muted/60" />
        ))}
      </div>
    );
  }

  if (!actions.length) {
    return (
      <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        No token actions are configured for this organisation yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-md border">
      <Table className="border-separate border-spacing-0">
        <TableHeader>
          <TableRow>
            <TableHead className="border border-border">Action</TableHead>
            <TableHead className="border border-border">Category</TableHead>
            <TableHead className="border border-border text-right">Rate</TableHead>
            <TableHead className="border border-border">Status</TableHead>
            <TableHead className="border border-border">Mode</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {actions.map((action) => {
            const rate = action.currentRate ?? action.creditsPerUnit ?? action.rate ?? "0";
            const isFree = parseCreditAmount(rate) === 0;
            const isEnabled = action.isEnabled ?? action.enabled ?? true;

            return (
              <TableRow key={action.id || action.code}>
                <TableCell className="border border-border font-medium text-primary-text">
                  {action.name || action.code}
                </TableCell>
                <TableCell className="border border-border">
                  <Badge variant="outline">{action.category || "ACTION"}</Badge>
                </TableCell>
                <TableCell className="border border-border text-right">
                  {isFree ? (
                    <span className="font-semibold text-green-700">Free</span>
                  ) : (
                    <span>
                      <CreditAmount value={rate} showUnit={false} /> / unit
                    </span>
                  )}
                </TableCell>
                <TableCell className="border border-border">
                  {!isEnabled ? (
                    <Badge className="bg-red-50 text-red-700 hover:bg-red-50">Disabled</Badge>
                  ) : (
                    <Badge className="bg-green-50 text-green-700 hover:bg-green-50">Allowed</Badge>
                  )}
                </TableCell>
                <TableCell className="border border-border">
                  {action.isBulkCapable ? (
                    <Badge variant="secondary">Bulk capable</Badge>
                  ) : (
                    <span className="text-muted-foreground">Single item</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default ActionRateList;

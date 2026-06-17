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
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Action</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Rate</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Mode</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {actions.map((action) => {
            const rate = action.currentRate ?? action.creditsPerUnit ?? action.rate ?? "0";
            const isFree = parseCreditAmount(rate) === 0;
            const isEnabled = action.isEnabled ?? action.enabled ?? true;

            return (
              <TableRow key={action.id || action.code}>
                <TableCell className="font-medium text-primary-text">
                  {action.name || action.code}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{action.category || "ACTION"}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {isFree ? (
                    <span className="font-semibold text-green-700">Free</span>
                  ) : (
                    <span>
                      <CreditAmount value={rate} showUnit={false} /> / unit
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {!isEnabled ? (
                    <Badge className="bg-red-50 text-red-700 hover:bg-red-50">Disabled</Badge>
                  ) : (
                    <Badge className="bg-green-50 text-green-700 hover:bg-green-50">Allowed</Badge>
                  )}
                </TableCell>
                <TableCell>
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

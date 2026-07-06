import { Package } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import { Badge } from '../../../components/ui/badge';
import { formatCurrency, formatDate } from '../utils';
import { statusColors } from '../../purchase-orders/constants';

const GrnPoPickerDialog = ({
  open,
  onOpenChange,
  purchaseOrders = [],
  onSelect,
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-3xl">
      <DialogHeader>
        <DialogTitle>Select Purchase Order</DialogTitle>
      </DialogHeader>

      {purchaseOrders.length === 0 ? (
        <div className="py-10 text-center text-muted-foreground">
          <Package className="mx-auto mb-4 h-12 w-12 opacity-40" />
          <p>No approved purchase orders available for goods receipt.</p>
          <p className="text-sm">POs must be approved before creating a GRN.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PO Number</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchaseOrders.map((po) => (
              <TableRow key={po.id}>
                <TableCell className="font-medium text-primary">{po.po_number}</TableCell>
                <TableCell>{po.vendor_name}</TableCell>
                <TableCell>{formatCurrency(po.total_amount)}</TableCell>
                <TableCell>
                  <Badge className={`${statusColors[po.status] || 'bg-blue-500'} border-0 text-white`}>
                    {po.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDate(po.po_date)}</TableCell>
                <TableCell>
                  <Button size="sm" onClick={() => onSelect(po.id)} data-testid={`select-po-${po.id}`}>
                    Select
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default GrnPoPickerDialog;

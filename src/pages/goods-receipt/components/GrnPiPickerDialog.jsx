import { Zap } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { formatDate } from '../utils';

const GrnPiPickerDialog = ({
  open,
  onOpenChange,
  eligiblePis = [],
  onSelect,
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>Select Proforma Invoice</DialogTitle>
      </DialogHeader>

      {eligiblePis.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No eligible proforma invoices found.
        </p>
      ) : (
        <div className="max-h-80 overflow-y-auto rounded-lg border">
          {eligiblePis.map((pi) => (
            <button
              key={pi.id || pi.piRef || pi.pi_number}
              type="button"
              className="flex w-full items-center gap-3 border-b px-4 py-3 text-left last:border-0 hover:bg-muted/50"
              onClick={() => onSelect(pi)}
            >
              <Zap className="h-4 w-4 shrink-0 text-orange-500" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{pi.piRef || pi.pi_number || pi.pi_ref}</p>
                <p className="text-sm text-muted-foreground">
                  {pi.vendor || pi.vendor_name} · {formatDate(pi.date || pi.pi_date)}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default GrnPiPickerDialog;

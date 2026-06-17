import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import CreditAmount from "./CreditAmount";

const InsufficientCreditsModal = ({
  open,
  onOpenChange,
  required = 0,
  available = 0,
}) => {
  const shortfall = Math.max(Number(required) - Number(available), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Insufficient tokens</DialogTitle>
          <DialogDescription>
            This action cannot run because the wallet does not have enough
            prepaid tokens.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 rounded-md border bg-muted/30 p-4 text-sm">
          <div className="flex justify-between">
            <span>Required</span>
            <CreditAmount value={required} />
          </div>
          <div className="flex justify-between">
            <span>Available</span>
            <CreditAmount value={available} />
          </div>
          <div className="flex justify-between font-semibold">
            <span>Shortfall</span>
            <CreditAmount value={shortfall} />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Please contact Optifii to top up the organisation wallet before
          retrying.
        </p>
      </DialogContent>
    </Dialog>
  );
};

export default InsufficientCreditsModal;

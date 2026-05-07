import React from 'react';
import { Button } from '../../../components/ui/button';

// Page header with global payment actions.
const PaymentsHeader = ({
  invoicesCount,
  handleBulkRelease,
  canBulkRelease,
  paymentDialog,
  batchDialogTrigger,
}) => (
  <div className="flex justify-between items-center mb-8">
    <div>
      <h1 className="text-4xl md:text-5xl font-bold font-['Manrope'] text-primary mb-2" data-testid="payments-title">
        Payments
      </h1>
      <p className="text-muted-foreground">Track and release payments</p>
    </div>
    <div className="flex gap-2">
      {invoicesCount > 0 && (
        <Button
          variant="default"
          onClick={handleBulkRelease}
          data-testid="bulk-release-button"
          className="bg-accent hover:bg-accent/90"
          disabled={!canBulkRelease}
        >
          Release All Payments ({invoicesCount})
        </Button>
      )}
      {batchDialogTrigger}
      {paymentDialog}
    </div>
  </div>
);

export default PaymentsHeader;

import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '../../../components/ui/button';

// Summary card that toggles visibility of available balance.
const AvailableBalanceCard = ({ showAvailableBalance, setShowAvailableBalance, availableBalance }) => (
  <div className="bg-secondary/30 rounded-lg p-6 mb-8 border border-border">
    <div className="mb-2 flex items-center justify-between">
      <p className="text-sm text-muted-foreground">Available Balance</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setShowAvailableBalance((prev) => !prev)}
        className="border-primary/25 text-primary hover:bg-primary/10 hover:text-primary"
        data-testid="toggle-available-balance"
      >
        {showAvailableBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        {showAvailableBalance ? 'Hide Balance' : 'Show Balance'}
      </Button>
    </div>
    <p className="text-5xl font-bold   text-primary">
      {showAvailableBalance
        ? `INR ${availableBalance.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`
        : 'INR ******'}
    </p>
  </div>
);

export default AvailableBalanceCard;

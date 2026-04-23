import React from 'react';
import { Eye, EyeOff } from 'lucide-react';

// Summary card that toggles visibility of available balance.
const AvailableBalanceCard = ({ showAvailableBalance, setShowAvailableBalance, availableBalance }) => (
  <div className="bg-secondary/30 rounded-lg p-6 mb-8 border border-border">
    <div className="mb-2 flex items-center justify-between">
      <p className="text-sm text-muted-foreground">Available Balance</p>
      <button
        type="button"
        onClick={() => setShowAvailableBalance((prev) => !prev)}
        className="flex items-center gap-1 text-accent hover:text-accent/80 font-medium text-sm"
        data-testid="toggle-available-balance"
      >
        {showAvailableBalance ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        {showAvailableBalance ? 'Hide Balance' : 'Show Balance'}
      </button>
    </div>
    <p className="text-5xl font-bold  text-primary">
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


import React from 'react';
import { Eye, Share2 } from 'lucide-react';

// Account identity/header block with copy/share actions.
const BankingHeader = ({
  selectedAccount,
  showFullAccount,
  setShowFullAccount,
  handleShareAccount,
  handleViewDetails,
}) => (
  <div className="mb-6">
    <button className="text-sm text-muted-foreground hover:text-primary mb-4 flex items-center gap-2">
      {'<-'} OptiFii Accounts
    </button>

    {selectedAccount && (
      <div>
        <h1 className="text-4xl font-bold font-['Manrope'] text-primary mb-4" data-testid="bank-account-name">
          {selectedAccount.account_name}
        </h1>

        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="  bg-secondary/50 px-3 py-1 rounded border border-border">
            {showFullAccount
              ? selectedAccount.account_number || '-'
              : `D*************${(selectedAccount.account_number || '').slice(-4)}`}
          </span>
          <button
            onClick={() => setShowFullAccount(!showFullAccount)}
            className="flex items-center gap-1 text-accent hover:text-accent/80 font-medium"
            data-testid="toggle-account-number"
          >
            <Eye className="h-4 w-4" />
            {showFullAccount ? 'Hide' : 'Show'} Full Account Number
          </button>
          <button
            onClick={handleShareAccount}
            className="flex items-center gap-1 text-accent hover:text-accent/80 font-medium"
            data-testid="share-account-button"
          >
            <Share2 className="h-4 w-4" />
            Share Account Details
          </button>
          <button
            onClick={handleViewDetails}
            className="text-accent hover:text-accent/80 font-medium hover:underline"
            data-testid="view-details-button"
          >
            View Account Details
          </button>
        </div>
      </div>
    )}
  </div>
);

export default BankingHeader;

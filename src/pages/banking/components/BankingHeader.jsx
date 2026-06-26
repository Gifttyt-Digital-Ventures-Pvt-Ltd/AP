import React from "react";
import { Eye, Share2 } from "lucide-react";
import { Button } from "../../../components/ui/button";

// Account identity/header block with copy/share actions.
const BankingHeader = ({
  selectedAccount,
  showFullAccount,
  setShowFullAccount,
  handleShareAccount,
  handleViewDetails,
}) => (
  <div className="mb-6">
    {selectedAccount && (
      <div>
        <h1
          className="text-4xl font-bold font-['Manrope'] text-primary mb-4"
          data-testid="bank-account-name"
        >
          {selectedAccount.account_name}
        </h1>

        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="  bg-secondary/50 px-3 py-1 rounded border border-border">
            {showFullAccount
              ? selectedAccount.account_number || "-"
              : `D*************${(selectedAccount.account_number || "").slice(-4)}`}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowFullAccount(!showFullAccount)}
            className="border-primary/25 text-primary hover:bg-primary/10 hover:text-primary"
            data-testid="toggle-account-number"
          >
            <Eye className="h-4 w-4" />
            {showFullAccount ? "Hide" : "Show"} Full Account Number
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleShareAccount}
            className="border-primary/25 text-primary hover:bg-primary/10 hover:text-primary"
            data-testid="share-account-button"
          >
            <Share2 className="h-4 w-4" />
            Share Account Details
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleViewDetails}
            className="text-primary hover:bg-primary/10 hover:text-primary"
            data-testid="view-details-button"
          >
            View Account Details
          </Button>
        </div>
      </div>
    )}
  </div>
);

export default BankingHeader;

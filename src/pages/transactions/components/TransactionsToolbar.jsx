import React from "react";
import { TabsList, TabsTrigger } from "../../../components/ui/tabs";

const TransactionsToolbar = ({
  needsReviewTransactions,
  accountingReadyTransactions,
}) => {
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-['Manrope']">Transactions</h1>
      </div>

      <TabsList className="bg-gray-100 p-1">
        <TabsTrigger value="upload" className="data-[state=active]:bg-white" data-testid="tab-upload">
          Upload Statement
        </TabsTrigger>
        <TabsTrigger value="review" className="data-[state=active]:bg-white" data-testid="tab-review">
          Review Needed
          {needsReviewTransactions.length > 0 && (
            <span className="ml-2 bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">
              {needsReviewTransactions.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="ready" className="data-[state=active]:bg-white" data-testid="tab-ready">
          Accounting Ready
          {accountingReadyTransactions.length > 0 && (
            <span className="ml-2 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
              {accountingReadyTransactions.length}
            </span>
          )}
        </TabsTrigger>
      </TabsList>
    </>
  );
};

export default TransactionsToolbar;

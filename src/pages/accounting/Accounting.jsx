import React from "react";
import { useLocation } from "react-router-dom";

import AccountingDashboard from "./components/AccountingDashboard";
import ChartOfAccounts from "./components/ChartOfAccounts";
import LedgerDetail from "./components/LedgerDetail";
import LedgerExplorer from "./components/LedgerExplorer";

const Accounting = () => {
  const location = useLocation();

  if (location.pathname.includes("/chart-of-accounts")) {
    return <ChartOfAccounts />;
  }
  if (location.pathname.includes("/ledger-explorer/")) {
    return <LedgerDetail />;
  }
  if (location.pathname.includes("/ledger-explorer")) {
    return <LedgerExplorer />;
  }
  return <AccountingDashboard />;
};

export default Accounting;

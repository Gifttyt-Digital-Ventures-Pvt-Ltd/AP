import React from "react";
import { Navigate } from "react-router-dom";
import { useRBAC } from "../../contexts/RBACContext";
import TransactionsPage from "./TransactionsPage";

const TransactionsRoute = () => {
  const { isBankingEnabled } = useRBAC();

  if (isBankingEnabled) {
    return <Navigate to="/banking?tab=transactions" replace />;
  }

  return <TransactionsPage />;
};

export default TransactionsRoute;

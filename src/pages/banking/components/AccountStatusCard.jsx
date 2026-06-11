import React from "react";
import { CheckCircle2, AlertCircle, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { ACCOUNT_LINK_STATUS } from "../constants";

const AccountRow = ({ account }) => {
  const isLinked = account.status === ACCOUNT_LINK_STATUS.LINKED;
  const isError = account.status === ACCOUNT_LINK_STATUS.ERROR;

  return (
    <div className="flex items-start gap-2">
      {isLinked ? (
        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
      ) : (
        <AlertCircle className={`h-5 w-5 shrink-0 mt-0.5 ${isError ? "text-red-600" : "text-amber-600"}`} />
      )}
      <div>
        <p className="font-medium">
          {account.bank || "ICICI"} · {account.accountType || "Current"}
        </p>
        <p className="text-sm text-muted-foreground">
          A/c {account.accountNumber || "—"}
          {(account.ifsc || account.ifscCode) && (
            <> · IFSC {account.ifsc || account.ifscCode}</>
          )}
        </p>
        <p className="text-xs mt-1 capitalize">
          Status: {String(account.status || "unknown").toLowerCase().replace(/_/g, " ")}
        </p>
        {account.healthDetail && (
          <p className="text-xs text-muted-foreground mt-1">{account.healthDetail}</p>
        )}
      </div>
    </div>
  );
};

const AccountStatusCard = ({ account, accounts }) => {
  const accountList = accounts?.length
    ? accounts
    : account
      ? [account]
      : [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Linked Accounts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {accountList.length === 0 ? (
          <p className="text-sm text-muted-foreground">No account linked yet.</p>
        ) : (
          accountList.map((item) => <AccountRow key={item.id || item.accountNumber} account={item} />)
        )}
      </CardContent>
    </Card>
  );
};

export default AccountStatusCard;

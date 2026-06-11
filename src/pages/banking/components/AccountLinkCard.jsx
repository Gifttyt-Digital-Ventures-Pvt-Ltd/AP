import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { ACCOUNT_LINK_STATUS, ACCOUNT_TYPES } from "../constants";

const AccountLinkCard = ({
  linkedAccount,
  onLinkAccount,
  linking = false,
  canManage = false,
}) => {
  const [accountType, setAccountType] = useState("CURRENT");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");

  const isLinked = linkedAccount?.status === ACCOUNT_LINK_STATUS.LINKED;
  if (isLinked) return null;

  const handleLink = (event) => {
    event.preventDefault();
    onLinkAccount?.({
      accountType,
      accountNumber: accountNumber.trim(),
      ifsc: ifsc.trim().toUpperCase(),
    });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Link ICICI Account</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLink} className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Bank</Label>
            <Input value="ICICI" disabled />
          </div>
          <div>
            <Label>Account Type *</Label>
            <Select value={accountType} onValueChange={setAccountType} disabled={!canManage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="settings-sender-account">Account Number *</Label>
            <Input
              id="settings-sender-account"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="Enter ICICI account number"
              disabled={!canManage}
              required
            />
          </div>
          <div>
            <Label htmlFor="settings-sender-ifsc">IFSC *</Label>
            <Input
              id="settings-sender-ifsc"
              value={ifsc}
              onChange={(e) => setIfsc(e.target.value.toUpperCase())}
              placeholder="e.g. ICIC0001234"
              disabled={!canManage}
              maxLength={11}
              required
            />
          </div>
          {canManage && (
            <div className="md:col-span-2">
              <Button type="submit" disabled={linking}>
                {linking && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Verify Connection
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
};

export default AccountLinkCard;

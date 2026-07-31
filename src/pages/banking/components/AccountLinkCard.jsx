import React, { useEffect, useState } from "react";
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
import { ACCOUNT_TYPES, BANK_LINK_OPTIONS } from "../constants";

const AccountLinkCard = ({
  onLinkAccount,
  linking = false,
  canManage = false,
  initialAccount = null,
  mode = "submit",
  onCancel,
}) => {
  const [bank, setBank] = useState(initialAccount?.bank || BANK_LINK_OPTIONS[0]?.value || "IDFC");
  const [accountType, setAccountType] = useState(initialAccount?.accountType || initialAccount?.account_type || "CURRENT");
  const [accountName, setAccountName] = useState(initialAccount?.accountName || initialAccount?.account_name || "");
  const [accountNumber, setAccountNumber] = useState(initialAccount?.accountNumber || initialAccount?.account_number || "");
  const [ifsc, setIfsc] = useState(initialAccount?.ifsc || initialAccount?.ifscCode || initialAccount?.ifsc_code || "");
  const isResubmit = mode === "resubmit";
  const submitLabel = isResubmit ? "Save and Resubmit" : "Submit for Verification";

  useEffect(() => {
    setBank(initialAccount?.bank || BANK_LINK_OPTIONS[0]?.value || "IDFC");
    setAccountType(initialAccount?.accountType || initialAccount?.account_type || "CURRENT");
    setAccountName(initialAccount?.accountName || initialAccount?.account_name || "");
    setAccountNumber(initialAccount?.accountNumber || initialAccount?.account_number || "");
    setIfsc(initialAccount?.ifsc || initialAccount?.ifscCode || initialAccount?.ifsc_code || "");
  }, [initialAccount]);

  const handleLink = (event) => {
    event.preventDefault();
    const selectedBank = BANK_LINK_OPTIONS.find((option) => option.value === bank);
    onLinkAccount?.({
      accountId: initialAccount?.id,
      bank,
      bankName: selectedBank?.label || bank,
      accountName: accountName.trim(),
      accountType,
      accountNumber: accountNumber.trim(),
      ifsc: ifsc.trim().toUpperCase(),
    });
    if (!isResubmit) {
      setAccountName("");
      setAccountNumber("");
      setIfsc("");
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          {isResubmit ? "Edit Rejected Bank Account" : "Bank Account Verification"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLink} className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Bank *</Label>
            <Select value={bank} onValueChange={setBank} disabled={!canManage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BANK_LINK_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Label htmlFor="settings-sender-account-name">Account Name *</Label>
            <Input
              id="settings-sender-account-name"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              placeholder="Enter account holder name"
              disabled={!canManage}
              required
            />
          </div>
          <div>
            <Label htmlFor="settings-sender-account">Account Number *</Label>
            <Input
              id="settings-sender-account"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="Enter bank account number"
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
              placeholder="e.g. IDFB0001234"
              disabled={!canManage}
              maxLength={11}
              required
            />
          </div>
          {canManage && (
            <div className="flex flex-wrap gap-2 md:col-span-2">
              <Button type="submit" disabled={linking}>
                {linking && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {submitLabel}
              </Button>
              {isResubmit ? (
                <Button type="button" variant="outline" onClick={onCancel} disabled={linking}>
                  Cancel
                </Button>
              ) : null}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
};

export default AccountLinkCard;

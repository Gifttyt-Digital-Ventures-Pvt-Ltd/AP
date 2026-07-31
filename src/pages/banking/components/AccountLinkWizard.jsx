import React, { useState } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
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
import { ACCOUNT_TYPES, BANK_LINK_OPTIONS, GATE_STATE } from "../constants";

const STEP_LABELS = ["Save Account"];

const AccountLinkWizard = ({
  gateState,
  linkedAccount,
  onLinkAccount,
  linking = false,
  canManage = false,
}) => {
  const [bank, setBank] = useState(BANK_LINK_OPTIONS[0]?.value || "IDFC");
  const [accountType, setAccountType] = useState("CURRENT");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");

  const currentStep =
    gateState === GATE_STATE.ACCOUNT_PENDING
      ? 0
      : 1;

  const handleLink = (event) => {
    event.preventDefault();
    const selectedBank = BANK_LINK_OPTIONS.find((option) => option.value === bank);
    onLinkAccount?.({
      bank,
      bankName: selectedBank?.label || bank,
      accountType,
      accountNumber: accountNumber.trim(),
      ifsc: ifsc.trim().toUpperCase(),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {STEP_LABELS.map((label, index) => {
          const done = index < currentStep || gateState === GATE_STATE.READY;
          const active = index === currentStep && gateState !== GATE_STATE.READY;
          return (
            <div
              key={label}
              className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
                done
                  ? "border-green-200 bg-green-50 text-green-800"
                  : active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground"
              }`}
            >
              {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span>{index + 1}</span>}
              {label}
            </div>
          );
        })}
      </div>

      {(gateState === GATE_STATE.ACCOUNT_PENDING || !linkedAccount) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Step 1 — Bank Account Details</CardTitle>
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
                <Label htmlFor="sender-account">Account Number *</Label>
                <Input
                  id="sender-account"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Enter bank account number"
                  disabled={!canManage}
                  required
                />
              </div>
              <div>
                <Label htmlFor="sender-ifsc">IFSC *</Label>
                <Input
                  id="sender-ifsc"
                  value={ifsc}
                  onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                  placeholder="e.g. IDFB0001234"
                  disabled={!canManage}
                  maxLength={11}
                  required
                />
              </div>
              {canManage && (
                <div className="md:col-span-2">
                  <Button type="submit" disabled={linking}>
                    {linking && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save Account
                  </Button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AccountLinkWizard;

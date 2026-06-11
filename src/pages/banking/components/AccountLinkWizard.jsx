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
import { ACCOUNT_TYPES, GATE_STATE } from "../constants";
import CibRegistrationCard from "./CibRegistrationCard";
import BeneficiariesTable from "./BeneficiariesTable";

const STEP_LABELS = ["Link Account", "CIB Registration", "Beneficiaries"];

const AccountLinkWizard = ({
  gateState,
  linkedAccount,
  cibStatus,
  beneficiaries = [],
  onLinkAccount,
  onCibRegister,
  onCibRecheck,
  onAddBeneficiary,
  onRegisterBeneficiary,
  linking = false,
  cibRegistering = false,
  cibRechecking = false,
  canManage = false,
  canManageBeneficiaries = false,
}) => {
  const [accountType, setAccountType] = useState("CURRENT");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");

  const currentStep =
    gateState === GATE_STATE.ACCOUNT_PENDING
      ? 0
      : gateState === GATE_STATE.CIB_PENDING
        ? 1
        : gateState === GATE_STATE.BENEFICIARY_PENDING
          ? 2
          : 3;

  const handleLink = (event) => {
    event.preventDefault();
    onLinkAccount?.({
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
            <CardTitle className="text-base">Step 1 — Link ICICI Account</CardTitle>
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
                <Label htmlFor="sender-account">Account Number *</Label>
                <Input
                  id="sender-account"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Enter ICICI account number"
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
      )}

      {gateState !== GATE_STATE.ACCOUNT_PENDING && (
        <CibRegistrationCard
          cibStatus={cibStatus}
          onRegister={onCibRegister}
          onRecheck={onCibRecheck}
          registering={cibRegistering}
          rechecking={cibRechecking}
          canManage={canManage}
        />
      )}

      {gateState !== GATE_STATE.ACCOUNT_PENDING && gateState !== GATE_STATE.CIB_PENDING && (
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Step 3 — Beneficiaries</CardTitle>
            {canManageBeneficiaries && (
              <Button size="sm" variant="outline" onClick={onAddBeneficiary}>
                Add Beneficiary
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              At least one active beneficiary is required before ICICI payouts can be released.
            </p>
            <BeneficiariesTable
              beneficiaries={beneficiaries}
              onRegister={onRegisterBeneficiary}
              canManage={canManageBeneficiaries}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AccountLinkWizard;

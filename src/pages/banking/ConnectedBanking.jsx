import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";
import { useRBAC } from "../../contexts/RBACContext";
import { useActionGuard } from "../../hooks/useActionGuard";
import { useRegisterBeneficiaryMutation } from "../../Services/apis/connectedBankingApi";
import { Button } from "../../components/ui/button";
import { GATE_STATE } from "./constants";
import useBankingSetup from "./hooks/useBankingSetup";
import AccountStatusCard from "./components/AccountStatusCard";
import CibRegistrationCard from "./components/CibRegistrationCard";
import AddBeneficiaryDialog from "./components/AddBeneficiaryDialog";
import BeneficiariesTable from "./components/BeneficiariesTable";

const SETUP_STATUS_MESSAGES = {
  [GATE_STATE.ACCOUNT_PENDING]: "Link your ICICI account in Settings → Connected Banking.",
  [GATE_STATE.CIB_PENDING]: "Complete CIB registration in Settings → Connected Banking.",
  [GATE_STATE.BENEFICIARY_PENDING]:
    "Register at least one beneficiary below to enable ICICI payouts.",
};

const ConnectedBanking = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isConnectedBankingEnabled } = useRBAC();
  const { guardAction, canPerformAction } = useActionGuard();
  const skip = !isConnectedBankingEnabled;

  const {
    accounts,
    beneficiaries,
    cibStatus,
    gateState,
    isAccountLinked,
    isSetupReady,
    isLoading,
    isFetching,
    refetchAll,
    refetchBeneficiaries,
  } = useBankingSetup({ skip });

  const [registerBeneficiary, { isLoading: registeringBene }] =
    useRegisterBeneficiaryMutation();

  const [addBeneOpen, setAddBeneOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);

  const canManageBeneficiaries = canPerformAction("banking.addBeneficiary");
  const canAddBeneficiary =
    canManageBeneficiaries &&
    gateState !== GATE_STATE.ACCOUNT_PENDING &&
    gateState !== GATE_STATE.CIB_PENDING;

  useEffect(() => {
    if (searchParams.get("tab") === "transactions") {
      navigate("/transactions", { replace: true });
    }
  }, [searchParams, navigate]);

  const handleRegisterBeneficiary = async (payload) => {
    if (!guardAction("banking.addBeneficiary")) return;
    try {
      await registerBeneficiary(payload).unwrap();
      toast.success("Beneficiary registered. Payable in ~30 minutes.");
      setAddBeneOpen(false);
      setSelectedVendor(null);
      await refetchBeneficiaries();
    } catch (error) {
      toast.error(error?.data?.message || error?.data?.detail || "Failed to register beneficiary");
    }
  };

  if (!isConnectedBankingEnabled) {
    return (
      <div className="p-6 text-muted-foreground">
        Connected Banking is not enabled for your organisation.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const setupMessage = SETUP_STATUS_MESSAGES[gateState];

  return (
    <div data-testid="connected-banking-page" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Connected Banking</h1>
          <p className="text-sm text-muted-foreground mt-1">
            View linked account status and manage ICICI beneficiaries
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refetchAll} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {isSetupReady ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Setup complete — ICICI payouts are ready from the Payments page.
        </div>
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {setupMessage}{" "}
          {(gateState === GATE_STATE.ACCOUNT_PENDING || gateState === GATE_STATE.CIB_PENDING) && (
            <Link to="/settings?tab=banking" className="font-medium underline underline-offset-2">
              Go to Settings
            </Link>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <AccountStatusCard accounts={accounts} />
        <CibRegistrationCard
          cibStatus={cibStatus}
          readOnly
          locked={!isAccountLinked}
        />
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Beneficiaries</h2>
            <p className="text-sm text-muted-foreground">
              Add and manage vendor payout accounts for ICICI releases.
            </p>
          </div>
          {canManageBeneficiaries && (
            <Button size="sm" onClick={() => setAddBeneOpen(true)} disabled={!canAddBeneficiary}>
              Add Beneficiary
            </Button>
          )}
        </div>
        <BeneficiariesTable
          beneficiaries={beneficiaries}
          onRegister={(bene) => {
            setSelectedVendor(bene);
            setAddBeneOpen(true);
          }}
          canManage={canManageBeneficiaries && canAddBeneficiary}
        />
      </div>

      <AddBeneficiaryDialog
        open={addBeneOpen}
        onOpenChange={(open) => {
          setAddBeneOpen(open);
          if (!open) setSelectedVendor(null);
        }}
        vendor={selectedVendor}
        onSubmit={handleRegisterBeneficiary}
        submitting={registeringBene}
      />
    </div>
  );
};

export default ConnectedBanking;

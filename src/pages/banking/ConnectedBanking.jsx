import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";
import { useRBAC } from "../../contexts/RBACContext";
import { useActionGuard } from "../../hooks/useActionGuard";
import {
  useLinkBankingAccountMutation,
  useRegisterCibMutation,
  useRegisterBeneficiaryMutation,
} from "../../Services/apis/connectedBankingApi";
import { Button } from "../../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { GATE_STATE } from "./constants";
import useBankingSetup from "./hooks/useBankingSetup";
import AccountStatusCard from "./components/AccountStatusCard";
import AccountLinkWizard from "./components/AccountLinkWizard";
import AddBeneficiaryDialog from "./components/AddBeneficiaryDialog";
import BeneficiariesTable from "./components/BeneficiariesTable";
import BankTransactionsPanel from "./components/BankTransactionsPanel";

const ConnectedBanking = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") === "transactions" ? "transactions" : "overview";
  const { isConnectedBankingEnabled } = useRBAC();
  const { guardAction, canPerformAction } = useActionGuard();
  const skip = !isConnectedBankingEnabled;

  const {
    linkedAccount,
    accounts,
    beneficiaries,
    cibStatus,
    gateState,
    isSetupReady,
    isLoading,
    isFetching,
    refetchAll,
    refetchCib,
    refetchBeneficiaries,
  } = useBankingSetup({ skip });

  const [linkAccount, { isLoading: linking }] = useLinkBankingAccountMutation();
  const [registerCib, { isLoading: cibRegistering }] = useRegisterCibMutation();
  const [registerBeneficiary, { isLoading: registeringBene }] =
    useRegisterBeneficiaryMutation();

  const [addBeneOpen, setAddBeneOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [cibRechecking, setCibRechecking] = useState(false);

  const canManage = canPerformAction("banking.link");
  const canManageBeneficiaries = canPerformAction("banking.addBeneficiary");

  const handleTabChange = (value) => {
    if (value === "overview") {
      setSearchParams({});
      return;
    }
    setSearchParams({ tab: value });
  };

  const handleLinkAccount = async ({ accountType, accountNumber }) => {
    if (!guardAction("banking.link")) return;
    try {
      const result = await linkAccount({ accountType, accountNumber }).unwrap();
      if (result.status === "ERROR") {
        toast.error(result.healthDetail || "Failed to verify ICICI connection");
      } else {
        toast.success("ICICI account connected successfully");
        await refetchAll();
      }
    } catch (error) {
      toast.error(error?.data?.message || error?.data?.detail || "Failed to link account");
    }
  };

  const handleCibRegister = async () => {
    if (!guardAction("banking.cibRegister")) return;
    try {
      const result = await registerCib().unwrap();
      toast.success(result.message || "CIB registration initiated");
      await refetchCib();
    } catch (error) {
      toast.error(error?.data?.message || error?.data?.detail || "CIB registration failed");
    }
  };

  const handleCibRecheck = async () => {
    setCibRechecking(true);
    try {
      await refetchCib();
      toast.success("CIB status refreshed");
    } catch {
      toast.error("Failed to refresh CIB status");
    } finally {
      setCibRechecking(false);
    }
  };

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

  return (
    <div data-testid="connected-banking-page" className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Connected Banking</h1>
          <p className="text-sm text-muted-foreground mt-1">
            ICICI setup, beneficiaries, and payout transaction history
          </p>
        </div>
        {activeTab === "overview" && (
          <Button variant="outline" size="sm" onClick={refetchAll} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-connected-banking-overview">
            Overview
          </TabsTrigger>
          <TabsTrigger value="transactions" data-testid="tab-connected-banking-transactions">
            Transactions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {isSetupReady && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
              Setup complete — ICICI payouts are ready from the Payments page.
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <AccountStatusCard accounts={accounts} />
            </div>
            <div className="lg:col-span-2">
              {gateState !== GATE_STATE.READY ? (
                <AccountLinkWizard
                  gateState={gateState}
                  linkedAccount={linkedAccount}
                  cibStatus={cibStatus}
                  beneficiaries={beneficiaries}
                  onLinkAccount={handleLinkAccount}
                  onCibRegister={handleCibRegister}
                  onCibRecheck={handleCibRecheck}
                  onAddBeneficiary={() => setAddBeneOpen(true)}
                  onRegisterBeneficiary={() => setAddBeneOpen(true)}
                  linking={linking}
                  cibRegistering={cibRegistering}
                  cibRechecking={cibRechecking}
                  canManage={canManage}
                  canManageBeneficiaries={canManageBeneficiaries}
                />
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Registered Beneficiaries</h2>
                    {canManageBeneficiaries && (
                      <Button size="sm" onClick={() => setAddBeneOpen(true)}>
                        Add Beneficiary
                      </Button>
                    )}
                  </div>
                  <BeneficiariesTable
                    beneficiaries={beneficiaries}
                    onRegister={() => setAddBeneOpen(true)}
                    canManage={canManageBeneficiaries}
                  />
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="transactions">
          <BankTransactionsPanel />
        </TabsContent>
      </Tabs>

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

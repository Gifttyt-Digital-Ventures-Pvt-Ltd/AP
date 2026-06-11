import { useMemo } from "react";
import {
  useGetBankingCapabilitiesQuery,
  useGetLinkedBankingAccountsQuery,
  useGetCibRegistrationStatusQuery,
  useGetBeneficiariesQuery,
} from "../../../Services/apis/connectedBankingApi";
import { GATE_STATE, CIB_STATE, ACCOUNT_LINK_STATUS } from "../constants";

export const useBankingSetup = ({ skip = false } = {}) => {
  const {
    data: capabilities,
    isLoading: capabilitiesLoading,
    isFetching: capabilitiesFetching,
    refetch: refetchCapabilities,
  } = useGetBankingCapabilitiesQuery(undefined, { skip });

  const {
    data: accounts = [],
    isLoading: accountsLoading,
    isFetching: accountsFetching,
    refetch: refetchAccounts,
  } = useGetLinkedBankingAccountsQuery(undefined, { skip });

  const {
    data: cibStatus,
    isLoading: cibLoading,
    refetch: refetchCib,
  } = useGetCibRegistrationStatusQuery(undefined, { skip });

  const {
    data: beneficiaries = [],
    isLoading: beneficiariesLoading,
    refetch: refetchBeneficiaries,
  } = useGetBeneficiariesQuery(undefined, { skip });

  const linkedAccount = useMemo(
    () => accounts.find((account) => account.status === ACCOUNT_LINK_STATUS.LINKED) || accounts[0] || null,
    [accounts],
  );

  const activeBeneficiaries = useMemo(
    () =>
      beneficiaries.filter((bene) => {
        if (bene.status === "ACTIVE") return true;
        if (bene.status === "ACTIVATING" && bene.availableAt) {
          return new Date(bene.availableAt) <= new Date();
        }
        return false;
      }),
    [beneficiaries],
  );

  const gateState = useMemo(() => {
    if (capabilities?.setupReady) return GATE_STATE.READY;

    const accountLinked =
      capabilities?.accountLinked ||
      linkedAccount?.status === ACCOUNT_LINK_STATUS.LINKED;
    if (!accountLinked) return GATE_STATE.ACCOUNT_PENDING;

    const cibRegistered =
      capabilities?.cibRegistered ||
      cibStatus?.state === CIB_STATE.REGISTERED;
    if (!cibRegistered) return GATE_STATE.CIB_PENDING;

    const hasBeneficiary =
      capabilities?.hasActiveBeneficiary || activeBeneficiaries.length > 0;
    if (!hasBeneficiary) return GATE_STATE.BENEFICIARY_PENDING;

    return GATE_STATE.READY;
  }, [capabilities, linkedAccount, cibStatus, activeBeneficiaries]);

  const isSetupReady = gateState === GATE_STATE.READY;

  const refetchAll = async () => {
    await Promise.all([
      refetchCapabilities(),
      refetchAccounts(),
      refetchCib(),
      refetchBeneficiaries(),
    ]);
  };

  return {
    capabilities,
    linkedAccount,
    accounts,
    cibStatus,
    beneficiaries,
    activeBeneficiaries,
    gateState,
    isSetupReady,
    isLoading:
      capabilitiesLoading || accountsLoading || cibLoading || beneficiariesLoading,
    isFetching: capabilitiesFetching,
    accountsFetching,
    refetchAll,
    refetchCapabilities,
    refetchAccounts,
    refetchCib,
    refetchBeneficiaries,
  };
};

export default useBankingSetup;

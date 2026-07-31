import { useMemo } from "react";
import {
  useGetBeneficiariesQuery,
  useGetLinkedBankingAccountsQuery,
} from "../../../Services/apis/connectedBankingApi";
import {
  GATE_STATE,
  BANK_ACCOUNT_VERIFICATION_STATUS,
  BANKING_SETUP_STATUS,
} from "../constants";
import {
  getBankAccountVerificationStatus,
  isBankAccountPaymentEligible,
} from "../utils/bankAccounts";

export const useBankingSetup = ({ skip = false } = {}) => {
  const {
    data: apiAccounts = [],
    isLoading: accountsLoading,
    isFetching: accountsFetching,
    refetch: refetchAccounts,
  } = useGetLinkedBankingAccountsQuery(undefined, { skip });

  const {
    data: beneficiaries = [],
    isLoading: beneficiariesLoading,
    isFetching: beneficiariesFetching,
    refetch: refetchBeneficiaries,
  } = useGetBeneficiariesQuery(undefined, { skip });

  const accounts = useMemo(
    () => apiAccounts,
    [apiAccounts],
  );

  const linkedAccount = useMemo(
    () =>
      accounts.find(isBankAccountPaymentEligible) ||
      accounts[0] ||
      null,
    [accounts],
  );

  const isAccountLinked = useMemo(
    () => accounts.length > 0,
    [accounts],
  );

  const paymentReadyAccounts = useMemo(
    () => accounts.filter(isBankAccountPaymentEligible),
    [accounts],
  );

  const setupStatus = useMemo(() => {
    if (accounts.length === 0) return BANKING_SETUP_STATUS.NOT_STARTED;
    if (paymentReadyAccounts.length > 0) return BANKING_SETUP_STATUS.CONFIGURED;

    const hasRejected = accounts.some(
      (account) =>
        getBankAccountVerificationStatus(account) === BANK_ACCOUNT_VERIFICATION_STATUS.REJECTED,
    );
    if (hasRejected) return BANKING_SETUP_STATUS.ACTION_REQUIRED;

    const hasPending = accounts.some(
      (account) =>
        getBankAccountVerificationStatus(account) === BANK_ACCOUNT_VERIFICATION_STATUS.PENDING_APPROVAL,
    );
    if (hasPending) return BANKING_SETUP_STATUS.PENDING_VERIFICATION;

    return BANKING_SETUP_STATUS.CONFIGURED;
  }, [accounts, paymentReadyAccounts]);

  const gateState = useMemo(() => {
    if (paymentReadyAccounts.length > 0) return GATE_STATE.READY;

    if (setupStatus === BANKING_SETUP_STATUS.PENDING_VERIFICATION) {
      return GATE_STATE.PENDING_VERIFICATION;
    }

    if (setupStatus === BANKING_SETUP_STATUS.ACTION_REQUIRED) {
      return GATE_STATE.ACTION_REQUIRED;
    }

    if (!isAccountLinked) return GATE_STATE.ACCOUNT_PENDING;

    return GATE_STATE.CONFIGURED;
  }, [isAccountLinked, paymentReadyAccounts, setupStatus]);

  const isSetupReady = gateState === GATE_STATE.READY;

  const refetchAll = async () => {
    await Promise.all([
      refetchAccounts(),
      refetchBeneficiaries(),
    ]);
  };

  const activeBeneficiaries = useMemo(
    () =>
      beneficiaries.filter((beneficiary) =>
        ["ACTIVE", "VERIFIED", "SUCCESS"].includes(
          String(beneficiary.status || "").toUpperCase(),
        ),
      ),
    [beneficiaries],
  );

  return {
    linkedAccount,
    isAccountLinked,
    paymentReadyAccounts,
    accounts,
    beneficiaries,
    activeBeneficiaries,
    gateState,
    setupStatus,
    isSetupReady,
    isLoading:
      accountsLoading || beneficiariesLoading,
    isFetching: beneficiariesFetching,
    accountsFetching,
    refetchAll,
    refetchAccounts,
    refetchBeneficiaries,
  };
};

export default useBankingSetup;

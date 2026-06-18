import { useMemo } from "react";

import {
  useGetClientActionTypesQuery,
  useGetClientWalletQuery,
} from "../Services/apis/creditsApi";
import { useRBAC } from "../contexts/RBACContext";
import {
  canAffordCreditCost,
  multiplyCreditCost,
  parseCreditAmount,
  subtractCreditBalance,
} from "../utils/creditMath";

const asActionList = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.data)) return response.data;
  return [];
};

export const useMeteredActionEstimate = (actionCode, unitCount = 1) => {
  const { isBillingFeatureEnabled } = useRBAC();
  const normalizedUnitCount = Math.max(Number(unitCount) || 0, 0);
  const { data: wallet, isLoading: walletLoading } = useGetClientWalletQuery(undefined, {
    skip: !isBillingFeatureEnabled,
  });
  const { data: actionTypes, isLoading: actionTypesLoading } =
    useGetClientActionTypesQuery(undefined, {
      skip: !isBillingFeatureEnabled,
    });

  return useMemo(() => {
    if (!isBillingFeatureEnabled) {
      return {
        loading: false,
        action: null,
        actionCode,
        unitCount: normalizedUnitCount,
        rate: 0,
        isEnabled: true,
        isFree: true,
        isDisabled: false,
        estimatedCost: 0,
        balance: 0,
        balanceAfter: 0,
        canAfford: true,
        actionName: actionCode,
      };
    }

    const actions = asActionList(actionTypes);
    const action =
      actions.find((item) => String(item.code || "").toUpperCase() === String(actionCode || "").toUpperCase()) ||
      null;
    const rate = action?.currentRate ?? action?.creditsPerUnit ?? action?.rate ?? "0";
    const isEnabled = action?.isEnabled ?? action?.enabled ?? true;
    const isFree = parseCreditAmount(rate) === 0;
    const balance = parseCreditAmount(wallet?.balance);
    const estimatedCost =
      normalizedUnitCount > 0 && !isFree
        ? multiplyCreditCost(rate, normalizedUnitCount)
        : 0;
    const balanceAfter = subtractCreditBalance(balance, estimatedCost);

    return {
      loading: walletLoading || actionTypesLoading,
      action,
      actionCode,
      unitCount: normalizedUnitCount,
      rate: parseCreditAmount(rate),
      isEnabled,
      isFree,
      isDisabled: Boolean(action && !isEnabled),
      estimatedCost,
      balance,
      balanceAfter,
      canAfford: isFree || normalizedUnitCount === 0 || canAffordCreditCost(balance, estimatedCost),
      actionName: action?.name || actionCode,
    };
  }, [
    actionCode,
    actionTypes,
    actionTypesLoading,
    isBillingFeatureEnabled,
    normalizedUnitCount,
    wallet,
    walletLoading,
  ]);
};

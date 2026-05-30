import { useCallback, useMemo } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useRBAC } from '../../../contexts/RBACContext';
import { useCurrencyFilter } from '../../../hooks/useCurrencyFilter';
import {
  useGetCorporateDetailsQuery,
  useGetCorporateUserDetailsQuery,
} from '../../../Services/apis/corporateApi';
import {
  useGetDashboardStatsQuery,
  useGetExecutiveDashboardQuery,
  useGetApReportsQuery,
} from '../../../Services/apis/dashboardReportsApi';
import { useGetInvoicesQuery } from '../../../Services/apis/invoicesVendorsApi';
import { useGetPurchaseOrdersQuery } from '../../../Services/apis/purchaseOrdersMasterDataApi';
import { useGetPaymentBatchStatsQuery } from '../../../Services/apis/paymentBatchesApi';
import {
  CURRENCY_SCREENS,
  DEFAULT_CURRENCY,
  formatCurrency as formatCurrencyValue,
  normalizeCurrencyCode,
} from '../../../utils/currency';
import { toast } from 'sonner';

export function useDashboardData() {
  const { user } = useAuth();
  const { isPaymentBatchesFeatureEnabled } = useRBAC();
  const { data: corporateContext = null } = useGetCorporateDetailsQuery();
  const { data: corporateUserContext = null } = useGetCorporateUserDetailsQuery();
  const {
    currencies,
    selectedCurrency,
    setSelectedCurrency,
    currencyParam,
    isAllSelected,
  } = useCurrencyFilter(CURRENCY_SCREENS.ANALYTICS);

  const displayCurrency = useMemo(
    () => (isAllSelected ? DEFAULT_CURRENCY : normalizeCurrencyCode(selectedCurrency)),
    [isAllSelected, selectedCurrency],
  );

  const formatFullCurrency = useCallback(
    (amount) => formatCurrencyValue(amount, displayCurrency),
    [displayCurrency],
  );

  const formatCompactCurrency = useCallback(
    (amount) => {
      const value = amount || 0;
      if (displayCurrency === DEFAULT_CURRENCY) {
        if (value >= 10000000) return `\u20B9${(value / 10000000).toFixed(2)}Cr`;
        if (value >= 100000) return `\u20B9${(value / 100000).toFixed(2)}L`;
        if (value >= 1000) return `\u20B9${(value / 1000).toFixed(1)}K`;
        return `\u20B9${value.toFixed(0)}`;
      }
      return formatCurrencyValue(value, displayCurrency);
    },
    [displayCurrency],
  );

  const dashboardQueryArgs = useMemo(
    () => ({
      days: 30,
      ...(currencyParam ? { currency: currencyParam } : {}),
    }),
    [currencyParam],
  );

  const invoiceQueryArgs = useMemo(
    () => (currencyParam ? { currency: currencyParam } : {}),
    [currencyParam],
  );

  const {
    data: stats = null,
    isLoading: statsLoading,
    isFetching: statsFetching,
    refetch: refetchStats,
  } = useGetDashboardStatsQuery(
    currencyParam ? { currency: currencyParam } : {},
  );
  const {
    data: executiveData = null,
    isLoading: executiveLoading,
    isFetching: executiveFetching,
    refetch: refetchExecutiveDashboard,
  } = useGetExecutiveDashboardQuery(dashboardQueryArgs);
  const {
    data: apData = null,
    isLoading: apLoading,
    isFetching: apFetching,
    refetch: refetchApReports,
  } = useGetApReportsQuery(dashboardQueryArgs);
  const {
    data: recentInvoicesData = [],
    isLoading: invoicesLoading,
    isFetching: invoicesFetching,
    refetch: refetchInvoices,
  } = useGetInvoicesQuery({ limit: 5, ...invoiceQueryArgs });
  const {
    data: pendingApprovalsData = [],
    isLoading: pendingApprovalsLoading,
    isFetching: pendingApprovalsFetching,
    refetch: refetchPendingApprovals,
  } = useGetInvoicesQuery({ status: 'Pending Approver', ...invoiceQueryArgs });
  const {
    data: recentPOsData = [],
    isLoading: purchaseOrdersLoading,
    isFetching: purchaseOrdersFetching,
    refetch: refetchPurchaseOrders,
  } = useGetPurchaseOrdersQuery({ limit: 5 });
  const {
    data: paymentBatchStats = null,
    isLoading: batchStatsLoading,
    isFetching: batchStatsFetching,
    refetch: refetchPaymentBatchStats,
  } = useGetPaymentBatchStatsQuery(undefined, { skip: !isPaymentBatchesFeatureEnabled });

  const recentInvoices = Array.isArray(recentInvoicesData)
    ? recentInvoicesData.slice(0, 5)
    : [];
  const recentPOs = Array.isArray(recentPOsData) ? recentPOsData.slice(0, 5) : [];
  const pendingApprovals = Array.isArray(pendingApprovalsData)
    ? pendingApprovalsData.slice(0, 5)
    : [];

  const loading =
    statsLoading ||
    executiveLoading ||
    apLoading ||
    invoicesLoading ||
    pendingApprovalsLoading ||
    purchaseOrdersLoading ||
    (isPaymentBatchesFeatureEnabled && batchStatsLoading);

  const refreshing =
    statsFetching ||
    executiveFetching ||
    apFetching ||
    invoicesFetching ||
    pendingApprovalsFetching ||
    purchaseOrdersFetching ||
    (isPaymentBatchesFeatureEnabled && batchStatsFetching);

  const fetchAllData = async () => {
    try {
      await Promise.all([
        refetchStats(),
        refetchExecutiveDashboard(),
        refetchApReports(),
        refetchInvoices(),
        refetchPendingApprovals(),
        refetchPurchaseOrders(),
        refetchPaymentBatchStats(),
      ]);
    } catch (error) {
      console.error('Error refreshing dashboard data:', error);
      toast.error('Failed to refresh dashboard data');
    }
  };

  const approvalRate =
    stats?.total_invoices > 0
      ? ((stats.paid_invoices / stats.total_invoices) * 100).toFixed(1)
      : 0;

  const corporateName = String(corporateContext?.corporate?.name || '').trim();
  const resolvedUserName =
    String(corporateUserContext?.corporateUser?.name || '').trim() ||
    String(user?.name || '').trim();
  const headerName = resolvedUserName || 'User';

  const pendingValue = stats?.pending_amount || 0;
  const paidValue = stats?.paid_amount || 0;
  const totalValue = stats?.total_amount || 0;
  const paidPercentage = totalValue > 0 ? (paidValue / totalValue) * 100 : 0;

  return {
    stats,
    executiveData,
    apData,
    recentInvoices,
    recentPOs,
    pendingApprovals,
    paymentBatchStats,
    loading,
    refreshing,
    fetchAllData,
    approvalRate,
    corporateName,
    headerName,
    pendingValue,
    paidValue,
    totalValue,
    paidPercentage,
    isPaymentBatchesFeatureEnabled,
    currencies,
    selectedCurrency,
    setSelectedCurrency,
    displayCurrency,
    formatFullCurrency,
    formatCompactCurrency,
  };
}

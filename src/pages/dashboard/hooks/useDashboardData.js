import { useCallback, useMemo } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useRBAC } from '../../../contexts/RBACContext';
import { useCurrencyFilter } from '../../../hooks/useCurrencyFilter';
import {
  useGetCorporateDetailsQuery,
  useGetCorporateUserDetailsQuery,
} from '../../../Services/apis/corporateApi';
import { useGetDashboardSummaryQuery } from '../../../Services/apis/dashboardReportsApi';
import {
  CURRENCY_SCREENS,
  DEFAULT_CURRENCY,
  formatCurrency as formatCurrencyValue,
  normalizeCurrencyCode,
} from '../../../utils/currency';
import { mapDashboardSummary } from '../utils/mapDashboardSummary';
import { toast } from 'sonner';

const DASHBOARD_DAYS = 30;

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

  const summaryQueryArgs = useMemo(
    () => ({
      days: DASHBOARD_DAYS,
      ...(currencyParam ? { currency: currencyParam } : {}),
    }),
    [currencyParam],
  );

  const {
    data: summaryRaw = null,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetDashboardSummaryQuery(summaryQueryArgs);

  const summary = useMemo(() => mapDashboardSummary(summaryRaw), [summaryRaw]);

  const stats = summary?.stats ?? null;
  const paymentProgress = summary?.paymentProgress ?? null;
  const charts = summary?.charts ?? null;
  const bottleneck = summary?.bottleneck ?? null;
  const recentInvoices = summary?.recent_invoices ?? [];
  const pendingApprovals = summary?.pending_your_approval ?? [];
  const paymentBatchStats = summary?.payment_batches ?? null;

  const showPaymentBatches =
    isPaymentBatchesFeatureEnabled && paymentBatchStats?.enabled !== false;

  const approvalRate = useMemo(() => {
    if (stats?.completion_rate != null) return Number(stats.completion_rate).toFixed(1);
    if (stats?.total_invoices > 0) {
      return ((stats.paid_invoices / stats.total_invoices) * 100).toFixed(1);
    }
    return 0;
  }, [stats]);

  const corporateName =
    String(summary?.header?.corporate_name || '').trim() ||
    String(corporateContext?.corporate?.name || '').trim();
  const resolvedUserName =
    String(summary?.header?.user_name || '').trim() ||
    String(corporateUserContext?.corporateUser?.name || '').trim() ||
    String(user?.name || '').trim();
  const headerName = resolvedUserName || 'User';

  const pendingValue = paymentProgress?.pending_amount ?? stats?.pending_amount ?? 0;
  const paidValue = paymentProgress?.paid_amount ?? stats?.paid_amount ?? 0;
  const totalValue = paymentProgress?.total_amount ?? stats?.total_amount ?? 0;
  const paidPercentage = useMemo(() => {
    if (paymentProgress?.paid_percentage != null) return paymentProgress.paid_percentage;
    return totalValue > 0 ? (paidValue / totalValue) * 100 : 0;
  }, [paymentProgress, paidValue, totalValue]);

  const fetchAllData = async () => {
    try {
      await refetch();
    } catch (error) {
      console.error('Error refreshing dashboard data:', error);
      toast.error('Failed to refresh dashboard data');
    }
  };

  return {
    stats,
    charts,
    bottleneck,
    recentInvoices,
    pendingApprovals,
    paymentBatchStats,
    showPaymentBatches,
    loading: isLoading,
    refreshing: isFetching,
    isError,
    fetchAllData,
    approvalRate,
    corporateName,
    headerName,
    pendingValue,
    paidValue,
    totalValue,
    paidPercentage,
    currencies,
    selectedCurrency,
    setSelectedCurrency,
    displayCurrency,
    formatFullCurrency,
    formatCompactCurrency,
  };
}

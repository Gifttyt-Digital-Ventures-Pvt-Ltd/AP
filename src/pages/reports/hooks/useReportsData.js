import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  useGetExecutiveDashboardQuery,
  useGetApReportsQuery,
  useGetVendorAnalyticsQuery,
  useGetTaxReportsQuery,
  useGetPaymentAnalyticsQuery,
} from '../../../Services/apis/dashboardReportsApi';
import { useRBAC } from '../../../contexts/RBACContext';
import { useCurrencyFilter } from '../../../hooks/useCurrencyFilter';
import {
  CURRENCY_SCREENS,
  DEFAULT_CURRENCY,
  formatCurrency as formatCurrencyValue,
  normalizeCurrencyCode,
} from '../../../utils/currency';

export function useReportsData() {
  const { isCorporateSectionEnabled } = useRBAC();
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
    (amount, currency = displayCurrency) => formatCurrencyValue(amount, currency),
    [displayCurrency],
  );

  const formatCurrency = useCallback(
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

  const [activeTab, setActiveTab] = useState('executive');
  const [dateRange, setDateRange] = useState('30');
  const [customDays, setCustomDays] = useState('');

  const canViewExecutiveReports = isCorporateSectionEnabled('REPORTS_EXECUTIVE');
  const canViewApReports = isCorporateSectionEnabled('REPORTS_AP');
  const canViewVendorReports = isCorporateSectionEnabled('REPORTS_VENDOR');
  const canViewTaxReports = isCorporateSectionEnabled('REPORTS_TAX');
  const canViewPaymentReports = isCorporateSectionEnabled('REPORTS_PAYMENT');

  const availableReportTabs = useMemo(() => {
    const tabs = [];
    if (canViewExecutiveReports) tabs.push('executive');
    if (canViewApReports) tabs.push('ap');
    if (canViewVendorReports) tabs.push('vendor');
    if (canViewTaxReports) tabs.push('tax');
    if (canViewPaymentReports) tabs.push('payment');
    return tabs;
  }, [
    canViewApReports,
    canViewExecutiveReports,
    canViewPaymentReports,
    canViewTaxReports,
    canViewVendorReports,
  ]);

  useEffect(() => {
    if (availableReportTabs.length === 0) return;
    if (!availableReportTabs.includes(activeTab)) {
      setActiveTab(availableReportTabs[0]);
    }
  }, [activeTab, availableReportTabs]);

  const getDays = () => {
    if (dateRange === 'custom' && customDays) {
      return parseInt(customDays, 10);
    }
    return parseInt(dateRange, 10);
  };

  const days = getDays();
  const shouldSkip = !days || Number.isNaN(days) || days <= 0;
  const reportQueryArgs = {
    days,
    ...(currencyParam ? { currency: currencyParam } : {}),
  };

  const {
    data: executiveData = null,
    isLoading: executiveLoading,
    isFetching: executiveFetching,
    refetch: refetchExecutiveDashboard,
  } = useGetExecutiveDashboardQuery(reportQueryArgs, {
    skip: shouldSkip || !canViewExecutiveReports,
  });
  const {
    data: apData = null,
    isLoading: apLoading,
    isFetching: apFetching,
    refetch: refetchApReports,
  } = useGetApReportsQuery(reportQueryArgs, { skip: shouldSkip || !canViewApReports });
  const {
    data: vendorData = null,
    isLoading: vendorLoading,
    isFetching: vendorFetching,
    refetch: refetchVendorAnalytics,
  } = useGetVendorAnalyticsQuery(reportQueryArgs, { skip: shouldSkip || !canViewVendorReports });
  const {
    data: taxData = null,
    isLoading: taxLoading,
    isFetching: taxFetching,
    refetch: refetchTaxReports,
  } = useGetTaxReportsQuery(reportQueryArgs, { skip: shouldSkip || !canViewTaxReports });
  const {
    data: paymentData = null,
    isLoading: paymentLoading,
    isFetching: paymentFetching,
    refetch: refetchPaymentAnalytics,
  } = useGetPaymentAnalyticsQuery(reportQueryArgs, { skip: shouldSkip || !canViewPaymentReports });

  const loading =
    (canViewExecutiveReports && (executiveLoading || executiveFetching)) ||
    (canViewApReports && (apLoading || apFetching)) ||
    (canViewVendorReports && (vendorLoading || vendorFetching)) ||
    (canViewTaxReports && (taxLoading || taxFetching)) ||
    (canViewPaymentReports && (paymentLoading || paymentFetching));

  const fetchAllData = async () => {
    if (shouldSkip) return;

    try {
      await Promise.all([
        canViewExecutiveReports ? refetchExecutiveDashboard() : Promise.resolve(),
        canViewApReports ? refetchApReports() : Promise.resolve(),
        canViewVendorReports ? refetchVendorAnalytics() : Promise.resolve(),
        canViewTaxReports ? refetchTaxReports() : Promise.resolve(),
        canViewPaymentReports ? refetchPaymentAnalytics() : Promise.resolve(),
      ]);
    } catch (error) {
      console.error('Error refreshing analytics:', error);
      toast.error('Failed to refresh analytics data');
    }
  };

  return {
    activeTab,
    setActiveTab,
    dateRange,
    setDateRange,
    customDays,
    setCustomDays,
    currencies,
    selectedCurrency,
    setSelectedCurrency,
    formatCurrency,
    formatFullCurrency,
    loading,
    fetchAllData,
    executiveData,
    apData,
    vendorData,
    taxData,
    paymentData,
    canViewExecutiveReports,
    canViewApReports,
    canViewVendorReports,
    canViewTaxReports,
    canViewPaymentReports,
  };
}

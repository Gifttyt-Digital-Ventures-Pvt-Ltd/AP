import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useGetPendingApprovalsQuery } from '../../Services/apis/approvalsPaymentsBankingApi';
import {
  useGetInvoicesQuery,
  useApproveInvoiceMutation,
  useGetPendingCheckerInvoicesQuery,
  useCheckInvoiceMutation,
  useLazyGetInvoiceQuery,
  useLazyGetInvoiceHistoryQuery,
} from '../../Services/apis/invoicesVendorsApi';
import { toInvoiceUiPayload, EMPTY_INVOICE_LIST_RESPONSE, getInvoiceListItems } from '../../Services/utils/payloadMappers';
import { Tabs, TabsContent } from '../../components/ui/tabs';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useRBAC } from '../../contexts/RBACContext';
import { useActionGuard } from '../../hooks/useActionGuard';
import { useCurrencyFilter } from '../../hooks/useCurrencyFilter';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import CurrencySelector from '../../components/common/CurrencySelector';
import RefreshButton from '../../components/common/RefreshButton';
import TableSortButton from '../../components/common/TableSortButton';
import { CURRENCY_SCREENS } from '../../utils/currency';
import { INVOICE_LIST_PAGE_SIZE } from '../invoices/constants';
import NeedsApprovalTable from './components/NeedsApprovalTable';
import AllInvoicesTable from './components/AllInvoicesTable';
import InvoiceHistorySheet from './components/InvoiceHistorySheet';
import ApprovalDialog from './components/ApprovalDialog';
import ViewDialog from '../invoices/components/ViewDialog';
import { InvoicePdfPreview } from '../invoices/components/InvoicePdfPreview';
import { getInvoiceFileUrl } from '../invoices/utils/invoicePreview';
import { normalizeInvoiceHistoryEntries } from '../invoices/utils/invoiceHistory';
import {
  getInvoiceStatusBadgeClass,
  isInvoiceAwaitingApproval,
  NEEDS_CORRECTION_ACTION,
  normalizeApprovalAction,
  normalizeWorkflowStatus,
} from '../../utils/approvalWorkflow';
import { getApprovalProgress } from './utils/approvalProgress';
import { useApprovalsInvoiceEdit } from './hooks/useApprovalsInvoiceEdit';
import {
  isRefNoEnabled as isRefNoEnabledForCorporate,
} from '../../utils/invoiceConfiguration';
import { clearNotificationQueryParams } from '../../utils/notificationQueryParams';

const safeFormatDate = (value, pattern = 'dd MMM yy') => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : format(date, pattern);
};

const approvalsSortOptions = [
  { value: 'uploadDate', label: 'Upload date', defaultDirection: 'desc' },
];

const Approvals = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const handledNotificationRef = useRef(null);
  const { isCategoryFeatureEnabled, isCampaignFeatureEnabled, corporateScreens, isBranchEnabled } = useRBAC();
  const { canPerformAction } = useActionGuard();
  const canCheckInvoices = canPerformAction('invoices.check');
  const canApproveInvoices = canPerformAction('invoices.approve');

  const currencyScreen = useMemo(() => {
    if (canCheckInvoices && !canApproveInvoices) return CURRENCY_SCREENS.CHECKER;
    return CURRENCY_SCREENS.APPROVAL;
  }, [canApproveInvoices, canCheckInvoices]);

  const {
    currencies,
    selectedCurrency,
    setSelectedCurrency,
    queryArgs: approvalQueryArgs,
    currencyParam,
  } = useCurrencyFilter(currencyScreen);
  const [approvalsSearchTerm, setApprovalsSearchTerm] = useState('');
  const [approvalsSort, setApprovalsSort] = useState({ value: 'uploadDate', direction: 'desc' });
  const [allTabPageOffset, setAllTabPageOffset] = useState(0);
  const debouncedApprovalsSearch = useDebouncedValue(approvalsSearchTerm.trim(), 300);

  useEffect(() => {
    setAllTabPageOffset(0);
  }, [debouncedApprovalsSearch, approvalsSort, currencyParam]);

  const sharedFilterQueryArgs = useMemo(
    () => ({
      ...(debouncedApprovalsSearch ? { search: debouncedApprovalsSearch } : {}),
      sortBy: approvalsSort.value,
      sortDirection: approvalsSort.direction,
    }),
    [debouncedApprovalsSearch, approvalsSort],
  );

  const pendingApprovalsQueryArgs = useMemo(
    () => ({ ...approvalQueryArgs, ...sharedFilterQueryArgs }),
    [approvalQueryArgs, sharedFilterQueryArgs],
  );

  const allInvoicesQueryArgs = useMemo(
    () => ({
      ...approvalQueryArgs,
      ...sharedFilterQueryArgs,
      context: 'APPROVALS_ALL',
      limit: INVOICE_LIST_PAGE_SIZE,
      offset: allTabPageOffset,
    }),
    [approvalQueryArgs, sharedFilterQueryArgs, allTabPageOffset],
  );

  const { data: pendingApprovalsData = [], refetch: refetchPendingApprovals } =
    useGetPendingApprovalsQuery(pendingApprovalsQueryArgs);
  const { data: pendingCheckerData = [], refetch: refetchPendingChecker } =
    useGetPendingCheckerInvoicesQuery(pendingApprovalsQueryArgs);
  const {
    data: allInvoicesListData = EMPTY_INVOICE_LIST_RESPONSE,
    isFetching: allInvoicesFetching,
    refetch: refetchInvoices,
  } = useGetInvoicesQuery(allInvoicesQueryArgs);
  const approvalsRefreshing = allInvoicesFetching;
  const [approveInvoice, { isLoading: approveInvoiceLoading }] =
    useApproveInvoiceMutation();
  const [checkInvoice, { isLoading: checkInvoiceLoading }] =
    useCheckInvoiceMutation();
  const [getInvoice] = useLazyGetInvoiceQuery();
  const [getInvoiceHistory] = useLazyGetInvoiceHistoryQuery();

  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewInvoice, setViewInvoice] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewTab, setViewTab] = useState('details');
  const [invoiceHistory, setInvoiceHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historySheetOpen, setHistorySheetOpen] = useState(false);
  const [historySheetInvoice, setHistorySheetInvoice] = useState(null);
  const [activeTab, setActiveTab] = useState('pending-approval');

  const handleRefreshApprovals = async () => {
    try {
      await Promise.all([
        refetchPendingApprovals(),
        refetchPendingChecker(),
        refetchInvoices(),
      ]);
      toast.success('Approvals refreshed');
    } catch {
      toast.error('Failed to refresh approvals');
    }
  };
  const [viewPreviewError, setViewPreviewError] = useState(false);
  const [pdfZoom, setPdfZoom] = useState(100);
  const [comments, setComments] = useState('');
  const [actionType, setActionType] = useState('');
  const canPerformApprovalActions = canApproveInvoices || canCheckInvoices;

  const isRefNoEnabled = useMemo(
    () =>
      isRefNoEnabledForCorporate(
        corporateScreens?.activeInvoiceConfiguration ?? [],
      ),
    [corporateScreens?.activeInvoiceConfiguration],
  );

  const normalizeInvoice = (invoice = {}) => toInvoiceUiPayload(invoice);

  const pendingApprovalInvoices = (
    Array.isArray(pendingApprovalsData) ? pendingApprovalsData : []
  ).map(normalizeInvoice);
  const pendingCheckerInvoices = (
    Array.isArray(pendingCheckerData) ? pendingCheckerData : []
  ).map(normalizeInvoice);
  const allInvoices = getInvoiceListItems(allInvoicesListData);

  const allInvoicesPagination = useMemo(() => {
    const total = Number(allInvoicesListData.total ?? 0) || 0;
    const offset = Number(allInvoicesListData.offset ?? allTabPageOffset) || 0;
    const limit = Number(allInvoicesListData.limit ?? INVOICE_LIST_PAGE_SIZE) || INVOICE_LIST_PAGE_SIZE;
    const currentPage = limit > 0 ? Math.floor(offset / limit) : 0;
    const totalPages = total > 0 ? Math.ceil(total / limit) : 0;

    return {
      total,
      offset,
      limit,
      hasMore: Boolean(allInvoicesListData.hasMore),
      currentPage,
      totalPages,
      startRecord: total === 0 ? 0 : offset + 1,
      endRecord: total === 0 ? 0 : Math.min(offset + allInvoices.length, total),
    };
  }, [allInvoicesListData, allTabPageOffset, allInvoices.length]);

  const visibleAllInvoicePageNumbers = useMemo(() => {
    const { totalPages, currentPage } = allInvoicesPagination;
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, index) => index);
    }
    const start = Math.min(Math.max(currentPage - 2, 0), totalPages - 5);
    return Array.from({ length: 5 }, (_, index) => start + index);
  }, [allInvoicesPagination]);

  const goToAllInvoicesPage = useCallback((pageIndex) => {
    setAllTabPageOffset(Math.max(0, pageIndex) * INVOICE_LIST_PAGE_SIZE);
  }, []);

  const handleApprovalAction = (invoice, action) => {
    if (!isInvoiceAwaitingApproval(invoice.status)) {
      toast.error('Approval actions are not available for this invoice status');
      return;
    }
    // Determine if it's checker or approver based on status
    const isChecker =
      normalizeWorkflowStatus(invoice.status) === 'Pending Checker';
    if (isChecker && !canCheckInvoices) {
      toast.error('You do not have permission to check invoices');
      return;
    }
    if (!isChecker && !canApproveInvoices) {
      toast.error('You do not have permission to approve invoices');
      return;
    }

    setSelectedInvoice(invoice);
    setActionType(action);
    setDialogOpen(true);
  };

  const loadInvoiceHistory = async (invoice) => {
    try {
      const response = await getInvoiceHistory(invoice.id).unwrap();
      const normalized = normalizeInvoice(invoice);
      let historyEntries = Array.isArray(response)
        ? response
        : normalizeInvoiceHistoryEntries(response);

      if (historyEntries.length === 0) {
        const approvalRecords =
          normalized.approvalRecords ||
          normalized.approvalRecords ||
          invoice.approvalRecords ||
          invoice.approvalRecords;
        if (Array.isArray(approvalRecords) && approvalRecords.length > 0) {
          historyEntries = normalizeInvoiceHistoryEntries(approvalRecords);
        }
      }

      setInvoiceHistory(historyEntries);
    } catch (error) {
      console.error('Failed to fetch invoice history:', error);
      toast.error('Failed to load invoice history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleViewInvoice = async (invoice, initialTab = 'details') => {
    setViewInvoice(normalizeInvoice(invoice));
    setViewDialogOpen(true);
    setViewTab(initialTab);
    setViewPreviewError(false);
    setInvoiceHistory([]);
    setLoadingHistory(true);
    await loadInvoiceHistory(invoice);
  };

  const closeViewDialog = useCallback((open) => {
    setViewDialogOpen(open);
    if (!open) {
      clearNotificationQueryParams(searchParams, setSearchParams);
    }
  }, [searchParams, setSearchParams]);

  const handleOpenInvoiceHistory = async (invoice) => {
    setHistorySheetInvoice(normalizeInvoice(invoice));
    setHistorySheetOpen(true);
    setInvoiceHistory([]);
    setLoadingHistory(true);
    await loadInvoiceHistory(invoice);
  };

  const viewApprovalStatus = normalizeWorkflowStatus(viewInvoice?.status);
  const viewInvoiceIsCheckerAction = viewApprovalStatus === 'Pending Checker';
  const viewInvoiceCanAct =
    (activeTab === 'pending-approval' || activeTab === 'pending-checker') &&
    Boolean(viewInvoice) &&
    isInvoiceAwaitingApproval(viewInvoice.status) &&
    (viewInvoiceIsCheckerAction ? canCheckInvoices : canApproveInvoices);
  const viewApprovalActionConfig = viewInvoiceCanAct
    ? {
        canAct: true,
        primaryAction: viewInvoiceIsCheckerAction ? 'Checked' : 'Approved',
        primaryLabel: viewInvoiceIsCheckerAction ? 'Verify' : 'Approve',
        needsCorrectionAction: NEEDS_CORRECTION_ACTION,
        rejectAction: 'Rejected',
        onAction: (invoice, action) => {
          setViewDialogOpen(false);
          handleApprovalAction(invoice, action);
        },
      }
    : null;

  const renderPdfPreview = (props = {}) => (
    <InvoicePdfPreview
      {...props}
      setPdfZoom={setPdfZoom}
      getInvoiceFileUrl={getInvoiceFileUrl}
    />
  );

  const refreshApprovalLists = useCallback(async () => {
    await Promise.all([
      refetchPendingApprovals(),
      refetchPendingChecker(),
      refetchInvoices(),
    ]);
  }, [refetchPendingApprovals, refetchPendingChecker, refetchInvoices]);

  const { canEdit, handleEditInvoice, findVendorByName, findVendorById, editDialogs } =
    useApprovalsInvoiceEdit({
      currencies,
      currencyParam,
      onRefresh: refreshApprovalLists,
      renderPdfPreview,
      pdfZoom,
      viewPreviewError,
      setViewPreviewError,
    });

  const submitApproval = async () => {
    if (approveInvoiceLoading || checkInvoiceLoading) return;

    try {
      const isChecker =
        normalizeWorkflowStatus(selectedInvoice.status) === 'Pending Checker';
      
      if (isChecker) {
        await checkInvoice({
          id: selectedInvoice.id,
          body: {
            action: normalizeApprovalAction(actionType),
            comments,
          },
        }).unwrap();
      } else {
        await approveInvoice({
          id: selectedInvoice.id,
          body: {
            action: normalizeApprovalAction(actionType),
            comments,
          },
        }).unwrap();
      }

      const normalizedAction = normalizeApprovalAction(actionType);
      const isPositiveAction =
        normalizedAction === 'Approved' || normalizedAction === 'Checked';
      const isNeedsCorrection = normalizedAction === NEEDS_CORRECTION_ACTION;
      const verb =
        normalizedAction === 'Checked'
          ? 'verified'
          : normalizedAction === 'Approved'
            ? 'approved'
            : isNeedsCorrection
              ? 'sent for correction'
              : 'rejected';
      toast.success(`Invoice ${verb} successfully`, {
        description: isPositiveAction
          ? `Invoice has been ${verb} successfully`
          : isNeedsCorrection
            ? 'Invoice has been marked as Needs Correction'
            : 'Invoice has been rejected',
        className: isPositiveAction
          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
          : isNeedsCorrection
            ? 'bg-amber-50 border-amber-200 text-amber-900'
            : 'bg-red-50 border-red-200 text-red-900',
      });

      setDialogOpen(false);
      setComments('');
      try {
        await Promise.all([refetchPendingApprovals(), refetchPendingChecker(), refetchInvoices()]);
      } catch {
        // No-op: keep optimistic success toast even if background refetch fails.
      }
    } catch {
      toast.error(`Failed to ${actionType} invoice`);
    }
  };

  const getStatusBadgeClass = (status) => getInvoiceStatusBadgeClass(status);

  const formatStatus = (status) => normalizeWorkflowStatus(status);

  const notificationSource = searchParams.get('source');
  const notificationAction = searchParams.get('action');
  const notificationTab = searchParams.get('tab');
  const notificationInvoiceId = searchParams.get('invoiceId');
  const notificationWeakEntity = searchParams.get('weakEntity') === '1';

  useEffect(() => {
    if (
      notificationSource === 'notification' &&
      (notificationTab === 'pending-approval' || notificationTab === 'pending-checker')
    ) {
      setActiveTab(notificationTab);
    }
  }, [notificationSource, notificationTab]);

  useEffect(() => {
    if (
      notificationSource !== 'notification' ||
      notificationAction !== 'preview' ||
      !notificationInvoiceId
    ) {
      return;
    }

    const notificationKey = `${notificationSource}:${notificationAction}:${notificationInvoiceId}`;
    if (handledNotificationRef.current === notificationKey) return;
    handledNotificationRef.current = notificationKey;

    const loadedInvoice = [...pendingApprovalInvoices, ...pendingCheckerInvoices, ...allInvoices].find(
      (invoice) => String(invoice?.id) === String(notificationInvoiceId),
    );

    if (loadedInvoice) {
      handleViewInvoice(loadedInvoice);
      return;
    }

    if (notificationWeakEntity) {
      toast.warning('Could not open the exact item. Showing the related module instead.');
      return;
    }

    getInvoice(notificationInvoiceId)
      .unwrap()
      .then((invoice) => handleViewInvoice(invoice))
      .catch(() => {
        toast.warning('Could not open the exact item. Showing the related module instead.');
      });
  }, [
    allInvoices,
    getInvoice,
    handleViewInvoice,
    pendingApprovalInvoices,
    notificationAction,
    notificationInvoiceId,
    notificationSource,
    pendingCheckerInvoices,
    notificationWeakEntity,
  ]);

  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      data-testid="approvals-page"
    >
      <div className="mb-6 flex shrink-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold font-['Manrope'] text-primary mb-2" data-testid="approvals-title">
            Approvals
          </h1>
          <p className="text-muted-foreground">Review and approve invoices</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <CurrencySelector
            currencies={currencies}
            value={selectedCurrency}
            onChange={setSelectedCurrency}
            variant="inline"
            id="approvals-currency-filter"
          />
          <RefreshButton
            onClick={handleRefreshApprovals}
            refreshing={approvalsRefreshing}
          >
            Refresh
          </RefreshButton>
        </div>
      </div>

      {/* Each tab now delegates table rendering to focused components. */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex min-h-0 flex-1 flex-col gap-6"
        data-testid="approval-tabs"
      >
        <div className="flex shrink-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'pending-approval', label: 'Pending Approval', count: pendingApprovalInvoices.length },
              { value: 'pending-checker', label: 'Pending Checker', count: pendingCheckerInvoices.length },
              { value: 'all', label: 'All', count: allInvoicesPagination.total },
            ].map(({ value, label, count }) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={activeTab === value ? 'default' : 'outline'}
                onClick={() => setActiveTab(value)}
                data-testid={`tab-${value}`}
              >
                {label} ({count})
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-64 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search invoice, PO, or vendor..."
                value={approvalsSearchTerm}
                onChange={(event) => setApprovalsSearchTerm(event.target.value)}
                className="pl-10"
                data-testid="approvals-search-input"
              />
            </div>
            <TableSortButton
              options={approvalsSortOptions}
              value={approvalsSort.value}
              direction={approvalsSort.direction}
              onChange={setApprovalsSort}
            />
          </div>
        </div>

        <div className="relative min-h-0 flex-1">
          <TabsContent
            value="pending-approval"
            className="absolute inset-0 mt-0 flex min-h-0 flex-col focus-visible:outline-none data-[state=inactive]:hidden"
          >
            <NeedsApprovalTable
              invoices={pendingApprovalInvoices}
              emptyMessage="No invoices pending approval"
              getApprovalProgress={getApprovalProgress}
              safeFormatDate={safeFormatDate}
              handleApprovalAction={handleApprovalAction}
              handleViewInvoice={handleViewInvoice}
              handleOpenInvoiceHistory={handleOpenInvoiceHistory}
              canApproveInvoices={canApproveInvoices}
              canCheckInvoices={canCheckInvoices}
              showApprovalProgress={canApproveInvoices}
              showRefNoField
              showBranchField={isBranchEnabled}
            />
          </TabsContent>

          <TabsContent
            value="pending-checker"
            className="absolute inset-0 mt-0 flex min-h-0 flex-col focus-visible:outline-none data-[state=inactive]:hidden"
          >
            <NeedsApprovalTable
              invoices={pendingCheckerInvoices}
              emptyMessage="No invoices pending checker verification"
              getApprovalProgress={getApprovalProgress}
              safeFormatDate={safeFormatDate}
              handleApprovalAction={handleApprovalAction}
              handleViewInvoice={handleViewInvoice}
              handleOpenInvoiceHistory={handleOpenInvoiceHistory}
              canApproveInvoices={canApproveInvoices}
              canCheckInvoices={canCheckInvoices}
              showApprovalProgress={canApproveInvoices}
              showRefNoField
              showBranchField={isBranchEnabled}
            />
          </TabsContent>

          <TabsContent
            value="all"
            className="absolute inset-0 mt-0 flex min-h-0 flex-col focus-visible:outline-none data-[state=inactive]:hidden"
          >
            <AllInvoicesTable
              allInvoices={allInvoices}
              pagination={allInvoicesPagination}
              visiblePageNumbers={visibleAllInvoicePageNumbers}
              onPageChange={goToAllInvoicesPage}
              isLoading={allInvoicesFetching}
              showRefNoField={isRefNoEnabled}
              showBranchField={isBranchEnabled}
              getStatusBadgeClass={getStatusBadgeClass}
              formatStatus={formatStatus}
              getApprovalProgress={getApprovalProgress}
              safeFormatDate={safeFormatDate}
              handleOpenInvoiceHistory={handleOpenInvoiceHistory}
              handleViewInvoice={handleViewInvoice}
            />
          </TabsContent>
        </div>
      </Tabs>

      <ApprovalDialog
        dialogOpen={dialogOpen}
        setDialogOpen={setDialogOpen}
        actionType={actionType}
        selectedInvoice={selectedInvoice}
        comments={comments}
        setComments={setComments}
        submitApproval={submitApproval}
        isSubmitting={approveInvoiceLoading || checkInvoiceLoading}
      />

      <InvoiceHistorySheet
        open={historySheetOpen}
        onOpenChange={setHistorySheetOpen}
        invoice={historySheetInvoice}
        history={invoiceHistory}
        loading={loadingHistory}
        getStatusBadgeClass={getStatusBadgeClass}
      />

      <ViewDialog
        viewDialogOpen={viewDialogOpen}
        setViewDialogOpen={closeViewDialog}
        selectedInvoice={viewInvoice}
        renderPdfPreview={renderPdfPreview}
        pdfZoom={pdfZoom}
        viewPreviewError={viewPreviewError}
        setViewPreviewError={setViewPreviewError}
        getStatusBadgeClass={getStatusBadgeClass}
        viewTab={viewTab}
        setViewTab={setViewTab}
        invoiceHistory={invoiceHistory}
        loadingHistory={loadingHistory}
        canEdit={canEdit}
        handleEditInvoice={handleEditInvoice}
        showCategoryField={isCategoryFeatureEnabled}
        isCategoryFeatureEnabled={isCategoryFeatureEnabled}
        showCampaignField={isCampaignFeatureEnabled}
        isCampaignFeatureEnabled={isCampaignFeatureEnabled}
        showRefNoField={isRefNoEnabled}
        findVendorByName={findVendorByName}
        findVendorById={findVendorById}
        approvalActionConfig={viewApprovalActionConfig}
      />

      {editDialogs}
    </div>
  );
};

export default Approvals;

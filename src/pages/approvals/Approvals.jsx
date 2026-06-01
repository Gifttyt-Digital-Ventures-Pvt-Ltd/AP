import React, { useMemo, useState } from 'react';
import { useGetPendingApprovalsQuery } from '../../Services/apis/approvalsPaymentsBankingApi';
import {
  useGetInvoicesQuery,
  useApproveInvoiceMutation,
  useGetPendingCheckerInvoicesQuery,
  useCheckInvoiceMutation,
  useLazyGetInvoiceHistoryQuery,
} from '../../Services/apis/invoicesVendorsApi';
import { toInvoiceUiPayload } from '../../Services/utils/payloadMappers';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { useActionGuard } from '../../hooks/useActionGuard';
import { useCurrencyFilter } from '../../hooks/useCurrencyFilter';
import CurrencySelector from '../../components/common/CurrencySelector';
import { CURRENCY_SCREENS } from '../../utils/currency';
import NeedsApprovalTable from './components/NeedsApprovalTable';
import PendingInvoicesTable from './components/PendingInvoicesTable';
import AllInvoicesTable from './components/AllInvoicesTable';
import ApprovalDialog from './components/ApprovalDialog';
import ViewDialog from '../invoices/components/ViewDialog';
import { InvoicePdfPreview } from '../invoices/components/InvoicePdfPreview';
import { getInvoiceFileUrl } from '../invoices/utils/invoicePreview';
import { normalizeInvoiceHistoryEntries } from '../invoices/utils/invoiceHistory';
import {
  getInvoiceStatusBadgeClass,
  isInvoiceAwaitingApproval,
  isInvoicePaid,
  NEEDS_CORRECTION_ACTION,
  normalizeApprovalAction,
  normalizeWorkflowStatus,
} from '../../utils/approvalWorkflow';
import { getApprovalProgress } from './utils/approvalProgress';

const safeFormatDate = (value, pattern = 'dd MMM yy') => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : format(date, pattern);
};

const Approvals = () => {
  const { user } = useAuth();
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
  } = useCurrencyFilter(currencyScreen);
  const { data: pendingApprovalsData = [], refetch: refetchPendingApprovals } =
    useGetPendingApprovalsQuery(approvalQueryArgs);
  const { data: pendingCheckerData = [], refetch: refetchPendingChecker } =
    useGetPendingCheckerInvoicesQuery(approvalQueryArgs);
  const { data: allInvoicesData = [], refetch: refetchInvoices } = useGetInvoicesQuery(approvalQueryArgs);
  const [approveInvoice] = useApproveInvoiceMutation();
  const [checkInvoice] = useCheckInvoiceMutation();
  const [getInvoiceHistory] = useLazyGetInvoiceHistoryQuery();

  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewInvoice, setViewInvoice] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewTab, setViewTab] = useState('details');
  const [invoiceHistory, setInvoiceHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [viewPreviewError, setViewPreviewError] = useState(false);
  const [pdfZoom, setPdfZoom] = useState(100);
  const [comments, setComments] = useState('');
  const [actionType, setActionType] = useState('');
  const canPerformApprovalActions = canApproveInvoices || canCheckInvoices;


  const normalizeInvoice = (invoice = {}) => toInvoiceUiPayload(invoice);

  const pendingInvoicesList = [
    ...(Array.isArray(pendingApprovalsData) ? pendingApprovalsData : []),
    ...(Array.isArray(pendingCheckerData) ? pendingCheckerData : [])
  ];
  
  // Deduplicate in case an invoice appears in both (shouldn't happen, but safe)
  const uniquePendingInvoices = Array.from(new Map(pendingInvoicesList.map(item => [item.id, item])).values());
  const pendingInvoices = uniquePendingInvoices.map(normalizeInvoice);
  const allInvoices = Array.isArray(allInvoicesData) ? allInvoicesData.map(normalizeInvoice) : [];

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

  const handleViewInvoice = async (invoice, initialTab = 'details') => {
    setViewInvoice(normalizeInvoice(invoice));
    setViewDialogOpen(true);
    setViewTab(initialTab);
    setViewPreviewError(false);
    setInvoiceHistory([]);
    setLoadingHistory(true);

    try {
      const response = await getInvoiceHistory(invoice.id).unwrap();
      const normalized = normalizeInvoice(invoice);
      let historyEntries = Array.isArray(response)
        ? response
        : normalizeInvoiceHistoryEntries(response);

      if (historyEntries.length === 0) {
        const approvalRecords =
          normalized.approval_records ||
          normalized.approvalRecords ||
          invoice.approval_records ||
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

  const renderPdfPreview = (props = {}) => (
    <InvoicePdfPreview
      {...props}
      setPdfZoom={setPdfZoom}
      getInvoiceFileUrl={getInvoiceFileUrl}
    />
  );

  const submitApproval = async () => {
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

  const myPendingInvoices = pendingInvoices
    .filter((invoice) => isInvoiceAwaitingApproval(invoice.status))
    .filter((invoice) => {
      const status = normalizeWorkflowStatus(invoice.status);
      const userRole = user?.role?.toUpperCase();
      if (userRole === 'CHECKER') return status === 'Pending Checker';
      if (userRole === 'APPROVER') {
        return status === 'Pending Approver' || status === 'Pending Approval';
      }
      return true;
    });

  const otherPendingInvoices = pendingInvoices.filter((invoice) => {
    const status = normalizeWorkflowStatus(invoice.status);
    if (isInvoicePaid(status) || status === 'Rejected') return false;

    const userRole = user?.role?.toUpperCase();
    if (userRole === 'CHECKER') return status !== 'Pending Checker';
    if (userRole === 'APPROVER') {
      return status !== 'Pending Approver' && status !== 'Pending Approval';
    }
    return false;
  });

  return (
    <div data-testid="approvals-page">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold font-['Manrope'] text-primary mb-2" data-testid="approvals-title">
            Approvals
          </h1>
          <p className="text-muted-foreground">Review and approve invoices</p>
        </div>
        <CurrencySelector
          currencies={currencies}
          value={selectedCurrency}
          onChange={setSelectedCurrency}
          variant="inline"
          id="approvals-currency-filter"
        />
      </div>

      {/* Each tab now delegates table rendering to focused components. */}
      <Tabs defaultValue="needs-approval" className="space-y-6" data-testid="approval-tabs">
        <TabsList>
          <TabsTrigger value="needs-approval" data-testid="tab-needs-approval">
            Needs your approval
          </TabsTrigger>
          <TabsTrigger value="pending" data-testid="tab-pending">
            Pending
          </TabsTrigger>
          <TabsTrigger value="all" data-testid="tab-all">
            All
          </TabsTrigger>
        </TabsList>

        <TabsContent value="needs-approval">
          <NeedsApprovalTable
            myPendingInvoices={myPendingInvoices}
            getApprovalProgress={getApprovalProgress}
            safeFormatDate={safeFormatDate}
            handleApprovalAction={handleApprovalAction}
            handleViewInvoice={handleViewInvoice}
            canApproveInvoices={canApproveInvoices}
            canCheckInvoices={canCheckInvoices}
            showApprovalProgress={canApproveInvoices}
          />
        </TabsContent>

        <TabsContent value="pending">
          <PendingInvoicesTable
            otherPendingInvoices={otherPendingInvoices}
            getStatusBadgeClass={getStatusBadgeClass}
            formatStatus={formatStatus}
            safeFormatDate={safeFormatDate}
            handleViewInvoice={handleViewInvoice}
          />
        </TabsContent>

        <TabsContent value="all">
          <AllInvoicesTable
            allInvoices={allInvoices}
            getStatusBadgeClass={getStatusBadgeClass}
            formatStatus={formatStatus}
            handleViewInvoice={handleViewInvoice}
          />
        </TabsContent>
      </Tabs>

      <ApprovalDialog
        dialogOpen={dialogOpen}
        setDialogOpen={setDialogOpen}
        actionType={actionType}
        selectedInvoice={selectedInvoice}
        comments={comments}
        setComments={setComments}
        submitApproval={submitApproval}
      />

      <ViewDialog
        viewDialogOpen={viewDialogOpen}
        setViewDialogOpen={setViewDialogOpen}
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
        canEdit={() => false}
        handleEditInvoice={() => {}}
      />
    </div>
  );
};

export default Approvals;

import React, { useState } from 'react';
import { useGetPendingApprovalsQuery } from '../../Services/apis/approvalsPaymentsBankingApi';
import {
  useGetInvoicesQuery,
  useApproveInvoiceMutation,
  useGetPendingCheckerInvoicesQuery,
  useCheckInvoiceMutation,
} from '../../Services/apis/invoicesVendorsApi';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { useActionGuard } from '../../hooks/useActionGuard';
import NeedsApprovalTable from './components/NeedsApprovalTable';
import PendingInvoicesTable from './components/PendingInvoicesTable';
import AllInvoicesTable from './components/AllInvoicesTable';
import ApprovalDialog from './components/ApprovalDialog';

const safeFormatDate = (value, pattern = 'dd MMM yy') => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : format(date, pattern);
};

const Approvals = () => {
  const { data: pendingApprovalsData = [], refetch: refetchPendingApprovals } =
    useGetPendingApprovalsQuery();
  const { data: pendingCheckerData = [], refetch: refetchPendingChecker } =
    useGetPendingCheckerInvoicesQuery();
  const { data: allInvoicesData = [], refetch: refetchInvoices } = useGetInvoicesQuery();
  const [approveInvoice] = useApproveInvoiceMutation();
  const [checkInvoice] = useCheckInvoiceMutation();

  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [comments, setComments] = useState('');
  const [actionType, setActionType] = useState('');
  const { user } = useAuth();
  const { canPerformAction } = useActionGuard();
  const canCheckInvoices = canPerformAction('invoices.check');
  const canApproveInvoices = canPerformAction('invoices.approve');
  const canPerformApprovalActions = canApproveInvoices || canCheckInvoices;


  const normalizeInvoice = (invoice = {}) => ({
    ...invoice,
    invoice_number: invoice.invoice_number ?? invoice.invoiceNumber,
    vendor_name: invoice.vendor_name ?? invoice.vendorName,
    vendor_id: invoice.vendor_id ?? invoice.vendorId,
    invoice_date: invoice.invoice_date ?? invoice.invoiceDate,
    due_date: invoice.due_date ?? invoice.dueDate,
    payment_date: invoice.payment_date ?? invoice.paymentDate,
    source_email: invoice.source_email ?? invoice.sourceEmail,
    file_category: invoice.file_category ?? invoice.fileCategory,
    original_file_name: invoice.original_file_name ?? invoice.originalFileName,
    created_by_name: invoice.created_by_name ?? invoice.createdByName,
    approval_records: invoice.approval_records ?? invoice.approvalRecords,
  });

  const pendingInvoicesList = [
    ...(Array.isArray(pendingApprovalsData) ? pendingApprovalsData : []),
    ...(Array.isArray(pendingCheckerData) ? pendingCheckerData : [])
  ];
  
  // Deduplicate in case an invoice appears in both (shouldn't happen, but safe)
  const uniquePendingInvoices = Array.from(new Map(pendingInvoicesList.map(item => [item.id, item])).values());
  const pendingInvoices = uniquePendingInvoices.map(normalizeInvoice);
  const allInvoices = Array.isArray(allInvoicesData) ? allInvoicesData.map(normalizeInvoice) : [];

  const handleApprovalAction = (invoice, action) => {
    // Determine if it's checker or approver based on status
    const isChecker = invoice.status === 'Pending Checker' || invoice.status === 'PENDING_CHECKER';
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

  const submitApproval = async () => {
    try {
      const isChecker = selectedInvoice.status === 'Pending Checker' || selectedInvoice.status === 'PENDING_CHECKER';
      
      if (isChecker) {
        await checkInvoice({
          id: selectedInvoice.id,
          body: {
            action: actionType,
            comments,
          },
        }).unwrap();
      } else {
        await approveInvoice({
          id: selectedInvoice.id,
          body: {
            action: actionType,
            comments,
          },
        }).unwrap();
      }

      const isPositiveAction = actionType === 'Approved' || actionType === 'Checked';
      const verb = actionType === 'Checked' ? 'verified' : (actionType === 'Approved' ? 'approved' : 'rejected');
      toast.success(`Invoice ${verb} successfully`, {
        description: isPositiveAction
          ? `Invoice has been ${verb} successfully`
          : 'Invoice has been rejected',
        className: isPositiveAction
          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
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

  const getApprovalProgress = (invoice) => {
    const records = invoice.approval_records || [];
    const total = 3; // Maker, Checker, Approver
    const approved = records.filter((r) => r.action === 'Approved').length;
    return { approved, total, percentage: (approved / total) * 100 };
  };

  const getStatusBadgeClass = (status) => {
    const normalizedStatus = status?.toUpperCase()?.replace(/ /g, '_');
    const statusMap = {
      PENDING_CHECKER: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      PENDING_APPROVER: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      PENDING_PAYMENT: 'bg-blue-100 text-blue-800 border-blue-200',
      AMOUNT_RELEASED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      REJECTED: 'bg-red-100 text-red-800 border-red-200',
      APPROVED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    };
    return statusMap[normalizedStatus] || 'bg-gray-100 text-gray-800';
  };

  const formatStatus = (status) => {
    if (!status) return '';
    return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const myPendingInvoices = pendingInvoices.filter((invoice) => {
    const userRole = user?.role?.toUpperCase();
    if (userRole === 'CHECKER') {
      return invoice.status === 'Pending Checker' || invoice.status === 'PENDING_CHECKER';
    }
    if (userRole === 'APPROVER') {
      return invoice.status === 'Pending Approver' || invoice.status === 'PENDING_APPROVER';
    }
    return true; // Admin sees all
  });

  const otherPendingInvoices = pendingInvoices.filter((invoice) => {
    const userRole = user?.role?.toUpperCase();
    if (userRole === 'CHECKER') {
      return invoice.status !== 'Pending Checker' && invoice.status !== 'PENDING_CHECKER';
    }
    if (userRole === 'APPROVER') {
      return invoice.status !== 'Pending Approver' && invoice.status !== 'PENDING_APPROVER';
    }
    return false;
  });

  return (
    <div data-testid="approvals-page">
      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-bold font-['Manrope'] text-primary mb-2" data-testid="approvals-title">
          Approvals
        </h1>
        <p className="text-muted-foreground">Review and approve invoices</p>
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
            canApproveInvoices={canPerformApprovalActions}
          />
        </TabsContent>

        <TabsContent value="pending">
          <PendingInvoicesTable
            otherPendingInvoices={otherPendingInvoices}
            getStatusBadgeClass={getStatusBadgeClass}
            formatStatus={formatStatus}
            safeFormatDate={safeFormatDate}
          />
        </TabsContent>

        <TabsContent value="all">
          <AllInvoicesTable
            allInvoices={allInvoices}
            getStatusBadgeClass={getStatusBadgeClass}
            formatStatus={formatStatus}
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
    </div>
  );
};

export default Approvals;

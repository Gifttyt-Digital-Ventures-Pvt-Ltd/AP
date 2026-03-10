import React, { useState } from 'react';
import {
  useGetPendingApprovalsQuery,
  useGetInvoicesQuery,
  useApproveInvoiceMutation,
} from '../Services/apiSlice';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';

export const Approvals = () => {
  const { data: pendingApprovalsData = [], refetch: refetchPendingApprovals } =
    useGetPendingApprovalsQuery();
  const { data: allInvoicesData = [], refetch: refetchInvoices } = useGetInvoicesQuery();
  const [approveInvoice] = useApproveInvoiceMutation();
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [comments, setComments] = useState('');
  const [actionType, setActionType] = useState('');
  const { user } = useAuth();

  const pendingInvoices = Array.isArray(pendingApprovalsData) ? pendingApprovalsData : [];
  const allInvoices = Array.isArray(allInvoicesData) ? allInvoicesData : [];

  const handleApprovalAction = async (invoice, action) => {
    setSelectedInvoice(invoice);
    setActionType(action);
    setDialogOpen(true);
  };

  const submitApproval = async () => {
    try {
      await approveInvoice({
        id: selectedInvoice.id,
        body: {
          action: actionType,
          comments,
        },
      }).unwrap();
      toast.success(`Invoice ${actionType}d successfully`, {
        description: 'Payment has been approved and moved to payments tab',
        className: 'bg-emerald-50 border-emerald-200 text-emerald-900'
      });
      setDialogOpen(false);
      setComments('');
      try {
        await Promise.all([refetchPendingApprovals(), refetchInvoices()]);
      } catch {
        // No-op: keep optimistic success toast even if background refetch fails.
      }
    } catch (error) {
      toast.error(`Failed to ${actionType} invoice`);
    }
  };

  const getApprovalProgress = (invoice) => {
    const records = invoice.approval_records || [];
    const total = 3; // Maker, Checker, Approver
    const approved = records.filter(r => r.action === 'Approved').length;
    return { approved, total, percentage: (approved / total) * 100 };
  };

  const getStatusBadgeClass = (status) => {
    const normalizedStatus = status?.toUpperCase()?.replace(/ /g, '_');
    const statusMap = {
      'PENDING_CHECKER': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'PENDING_APPROVER': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'PENDING_PAYMENT': 'bg-blue-100 text-blue-800 border-blue-200',
      'AMOUNT_RELEASED': 'bg-emerald-100 text-emerald-800 border-emerald-200',
      'REJECTED': 'bg-red-100 text-red-800 border-red-200',
      'APPROVED': 'bg-emerald-100 text-emerald-800 border-emerald-200'
    };
    return statusMap[normalizedStatus] || 'bg-gray-100 text-gray-800';
  };

  const formatStatus = (status) => {
    if (!status) return '';
    return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const myPendingInvoices = pendingInvoices.filter(invoice => {
    const userRole = user?.role?.toUpperCase();
    if (userRole === 'CHECKER') {
      return invoice.status === 'Pending Checker' || invoice.status === 'PENDING_CHECKER';
    } else if (userRole === 'APPROVER') {
      return invoice.status === 'Pending Approver' || invoice.status === 'PENDING_APPROVER';
    }
    return true; // Admin sees all
  });

  const otherPendingInvoices = pendingInvoices.filter(invoice => {
    const userRole = user?.role?.toUpperCase();
    if (userRole === 'CHECKER') {
      return invoice.status !== 'Pending Checker' && invoice.status !== 'PENDING_CHECKER';
    } else if (userRole === 'APPROVER') {
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
          <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
            <table className="w-full" data-testid="needs-approval-table">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="p-4 text-left text-sm font-medium">Vendor</th>
                  <th className="p-4 text-left text-sm font-medium">Amount</th>
                  <th className="p-4 text-left text-sm font-medium">Approval</th>
                  <th className="p-4 text-left text-sm font-medium">Payment date</th>
                  <th className="p-4 text-left text-sm font-medium">Due date</th>
                  <th className="p-4 text-left text-sm font-medium">Invoice date</th>
                  <th className="p-4 text-right text-sm font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {myPendingInvoices.map((invoice) => {
                  const progress = getApprovalProgress(invoice);
                  return (
                    <tr
                      key={invoice.id}
                      className="border-b border-border hover:bg-muted/50 transition-colors"
                      data-testid={`approval-row-${invoice.id}`}
                    >
                      <td className="p-4">{invoice.vendor_name}</td>
                      <td className="p-4 font-['JetBrains_Mono'] font-semibold">
                        {invoice.amount.toLocaleString()} {invoice.currency}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {progress.approved}/{progress.total} approved
                          </span>
                          <div className="flex gap-1">
                            {Array.from({ length: progress.total }).map((_, i) => (
                              <div
                                key={i}
                                className={`h-2 w-2 rounded-full ${
                                  i < progress.approved ? 'bg-emerald-500' : 'bg-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {invoice.payment_date
                          ? format(new Date(invoice.payment_date), 'dd MMM yy')
                          : '-'}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {format(new Date(invoice.due_date), 'dd MMM yy')}
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {format(new Date(invoice.invoice_date), 'dd MMM yy')}
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          size="sm"
                          onClick={() => handleApprovalAction(invoice, 'approve')}
                          data-testid={`approve-button-${invoice.id}`}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {myPendingInvoices.length === 0 && (
              <div className="text-center py-8 text-muted-foreground" data-testid="no-approvals">
                No invoices need your approval
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="pending">
          <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="p-4 text-left text-sm font-medium">Vendor</th>
                  <th className="p-4 text-left text-sm font-medium">Amount</th>
                  <th className="p-4 text-left text-sm font-medium">Status</th>
                  <th className="p-4 text-left text-sm font-medium">Due date</th>
                </tr>
              </thead>
              <tbody>
                {otherPendingInvoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="border-b border-border hover:bg-muted/50 transition-colors"
                  >
                    <td className="p-4">{invoice.vendor_name}</td>
                    <td className="p-4 font-['JetBrains_Mono'] font-semibold">
                      {invoice.amount.toLocaleString()} {invoice.currency}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadgeClass(invoice.status)}`}>
                        {formatStatus(invoice.status)}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">
                      {format(new Date(invoice.due_date), 'dd MMM yy')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {otherPendingInvoices.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No pending invoices
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="all">
          <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/50">
                <tr>
                  <th className="p-4 text-left text-sm font-medium">Invoice #</th>
                  <th className="p-4 text-left text-sm font-medium">Vendor</th>
                  <th className="p-4 text-left text-sm font-medium">Amount</th>
                  <th className="p-4 text-left text-sm font-medium">Status</th>
                  <th className="p-4 text-left text-sm font-medium">Created By</th>
                </tr>
              </thead>
              <tbody>
                {allInvoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="border-b border-border hover:bg-muted/50 transition-colors"
                  >
                    <td className="p-4 font-['JetBrains_Mono'] font-medium">{invoice.invoice_number}</td>
                    <td className="p-4">{invoice.vendor_name}</td>
                    <td className="p-4 font-['JetBrains_Mono'] font-semibold">
                      {invoice.amount.toLocaleString()} {invoice.currency}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadgeClass(invoice.status)}`}>
                        {formatStatus(invoice.status)}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-muted-foreground">{invoice.created_by_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Approval Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-testid="approval-dialog">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve Invoice' : 'Reject Invoice'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedInvoice && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Vendor:</span>
                  <span className="font-medium">{selectedInvoice.vendor_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Amount:</span>
                  <span className="font-['JetBrains_Mono'] font-semibold">
                    {selectedInvoice.currency} {selectedInvoice.amount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Invoice #:</span>
                  <span className="font-['JetBrains_Mono']">{selectedInvoice.invoice_number}</span>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="comments">Comments (Optional)</Label>
              <textarea
                id="comments"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Add any comments..."
                data-testid="approval-comments"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setDialogOpen(false)}
                data-testid="approval-cancel"
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={submitApproval}
                data-testid="approval-confirm"
              >
                {actionType === 'approve' ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};


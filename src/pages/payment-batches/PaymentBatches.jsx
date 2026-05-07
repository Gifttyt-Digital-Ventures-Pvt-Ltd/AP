import React, { useState } from 'react';
import { useGetInvoicesQuery } from '../../Services/apis/invoicesVendorsApi';
import { useGetBankAccountsQuery } from '../../Services/apis/approvalsPaymentsBankingApi';
import {
  useGetPaymentBatchesQuery,
  useGetPendingPaymentBatchApprovalsQuery,
  useGetPaymentBatchStatsQuery,
  useSubmitPaymentBatchMutation,
  useApprovePaymentBatchMutation,
  useProcessPaymentBatchMutation,
  useGeneratePaymentBatchFileMutation,
} from '../../Services/apis/paymentBatchesApi';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import {
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  RefreshCw,
  FileText,
  Download,
  Send,
  DollarSign,
  CreditCard,
  Building2,
  Play,
  CheckCheck,
  AlertTriangle
} from 'lucide-react';
import { useActionGuard } from '../../hooks/useActionGuard';

const statusColors = {
  'Draft': 'bg-gray-500',
  'Pending Approval': 'bg-yellow-500',
  'Approved': 'bg-blue-500',
  'Processing': 'bg-purple-500',
  'Completed': 'bg-green-500',
  'Failed': 'bg-red-500',
  'Cancelled': 'bg-slate-600'
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2
  }).format(amount || 0);
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const PaymentBatches = () => {
  const {
    data: batchesData = [],
    isLoading: batchesLoading,
    refetch: refetchBatches,
  } = useGetPaymentBatchesQuery();
  const {
    data: pendingBatchesData = [],
    isLoading: pendingBatchesLoading,
    refetch: refetchPendingBatches,
  } = useGetPendingPaymentBatchApprovalsQuery();
  const {
    data: stats = null,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useGetPaymentBatchStatsQuery();
  const {
    data: pendingPaymentInvoicesData = [],
    isLoading: pendingPaymentInvoicesLoading,
    refetch: refetchPendingPaymentInvoices,
  } = useGetInvoicesQuery({ status: 'Pending Payment' });
  const {
    data: pendingApproverInvoicesData = [],
    isLoading: pendingApproverInvoicesLoading,
    refetch: refetchPendingApproverInvoices,
  } = useGetInvoicesQuery({ status: 'Pending Approver' });
  const {
    data: bankAccountsData = [],
    isLoading: bankAccountsLoading,
    refetch: refetchBankAccounts,
  } = useGetBankAccountsQuery();
  const [submitPaymentBatch] = useSubmitPaymentBatchMutation();
  const [approvePaymentBatch] = useApprovePaymentBatchMutation();
  const [processPaymentBatch] = useProcessPaymentBatchMutation();
  const [generatePaymentBatchFile] = useGeneratePaymentBatchFileMutation();
  const { guardAction, canPerformAction } = useActionGuard();

  const batches = Array.isArray(batchesData) ? batchesData : [];
  const pendingBatches = Array.isArray(pendingBatchesData) ? pendingBatchesData : [];
  const pendingPaymentInvoices = Array.isArray(pendingPaymentInvoicesData)
    ? pendingPaymentInvoicesData
    : [];
  const pendingApproverInvoices = Array.isArray(pendingApproverInvoicesData)
    ? pendingApproverInvoicesData
    : [];
  const loading =
    batchesLoading ||
    pendingBatchesLoading ||
    statsLoading ||
    pendingPaymentInvoicesLoading ||
    pendingApproverInvoicesLoading ||
    bankAccountsLoading;

  const [activeTab, setActiveTab] = useState('all');

  // Dialog States
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showFileDialog, setShowFileDialog] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [generatedFile, setGeneratedFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  
  // Approval Form
  const [approvalForm, setApprovalForm] = useState({
    action: 'Approved',
    comments: ''
  });
  const canSubmitPaymentBatch = canPerformAction('paymentBatches.submit');
  const canApprovePaymentBatch = canPerformAction('paymentBatches.approve');
  const canProcessPaymentBatch = canPerformAction('paymentBatches.process');
  const canGenerateBatchFile = canPerformAction('paymentBatches.generateFile');

  const fetchData = async () => {
    try {
      await Promise.all([
        refetchBatches(),
        refetchPendingBatches(),
        refetchStats(),
        refetchPendingPaymentInvoices(),
        refetchPendingApproverInvoices(),
        refetchBankAccounts(),
      ]);
    } catch (error) {
      console.error('Error refreshing payment batch data:', error);
      toast.error('Failed to refresh payment batch data');
    }
  };

  const handleSubmitBatch = async (batchId) => {
    if (!guardAction('paymentBatches.submit')) return;
    try {
      await submitPaymentBatch(batchId).unwrap();
      toast.success('Batch submitted for approval');
      setShowViewDialog(false);
      fetchData();
    } catch (error) {
      toast.error(error?.data?.detail || 'Failed to submit batch');
    }
  };

  const handleApproveBatch = async () => {
    if (!guardAction('paymentBatches.approve')) return;
    if (!selectedBatch) return;
    
    setProcessing(true);
    try {
      const data = await approvePaymentBatch({
        id: selectedBatch.id,
        body: approvalForm,
      }).unwrap();
      toast.success(data?.message || 'Batch approved');
      setShowApproveDialog(false);
      setApprovalForm({ action: 'Approved', comments: '' });
      fetchData();
    } catch (error) {
      toast.error(error?.data?.detail || 'Failed to approve batch');
    } finally {
      setProcessing(false);
    }
  };

  const handleProcessBatch = async (batchId) => {
    if (!guardAction('paymentBatches.process')) return;
    setProcessing(true);
    try {
      const data = await processPaymentBatch(batchId).unwrap();
      toast.success(data?.message || 'Batch processed');
      setShowViewDialog(false);
      fetchData();
    } catch (error) {
      toast.error(error?.data?.detail || 'Failed to process batch');
    } finally {
      setProcessing(false);
    }
  };

  const handleGenerateFile = async (batchId) => {
    if (!guardAction('paymentBatches.generateFile')) return;
    try {
      const data = await generatePaymentBatchFile(batchId).unwrap();
      setGeneratedFile(data);
      setShowFileDialog(true);
      toast.success('Payment file generated');
    } catch (error) {
      toast.error(error?.data?.detail || 'Failed to generate file');
    }
  };

  const handleDownloadFile = () => {
    if (!generatedFile) return;
    
    const blob = new Blob([generatedFile.file_content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = generatedFile.file_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success('File downloaded');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="payment-batches-page">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Payment Batches</h1>
          <p className="text-muted-foreground">Create and process bulk vendor payments</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Batches</p>
                  <p className="text-2xl font-bold">{stats.total_batches}</p>
                </div>
                <CreditCard className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Draft</p>
                  <p className="text-2xl font-bold">{stats.draft?.count || 0}</p>
                </div>
                <Clock className="h-8 w-8 text-gray-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Approval</p>
                  <p className="text-2xl font-bold">{stats.pending_approval?.count || 0}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Approved</p>
                  <p className="text-2xl font-bold">{stats.approved?.count || 0}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">{stats.completed?.count || 0}</p>
                </div>
                <CheckCheck className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed Value</p>
                  <p className="text-lg font-bold">{formatCurrency(stats.completed?.amount || 0)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-all">All Batches</TabsTrigger>
          <TabsTrigger value="pending" data-testid="tab-pending">
            Pending Approval
            {pendingBatches.length > 0 && (
              <Badge variant="destructive" className="ml-2">{pendingBatches.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch Number</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Success/Failed</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No payment batches found. Create a batch to process bulk payments.
                    </TableCell>
                  </TableRow>
                ) : (
                  batches.map((batch) => (
                    <TableRow key={batch.id} data-testid={`batch-row-${batch.id}`}>
                      <TableCell className="font-medium">{batch.batch_number}</TableCell>
                      <TableCell>{formatDate(batch.batch_date)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{batch.payment_method}</Badge>
                      </TableCell>
                      <TableCell>{batch.total_items}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(batch.total_amount)}</TableCell>
                      <TableCell>
                        {batch.status === 'Completed' ? (
                          <span className="text-sm">
                            <span className="text-green-600">{batch.successful_count}</span>
                            {' / '}
                            <span className="text-red-600">{batch.failed_count}</span>
                          </span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${statusColors[batch.status]} text-white`}>
                          {batch.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedBatch(batch);
                              setShowViewDialog(true);
                            }}
                            data-testid={`view-batch-${batch.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {(batch.status === 'Approved' || batch.status === 'Completed') && canGenerateBatchFile && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleGenerateFile(batch.id)}
                              data-testid={`download-batch-${batch.id}`}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Batches Pending Approval</CardTitle>
              <CardDescription>Review and approve payment batches</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch Number</TableHead>
                    <TableHead>Created By</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingBatches.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No batches pending approval
                      </TableCell>
                    </TableRow>
                  ) : (
                    pendingBatches.map((batch) => (
                      <TableRow key={batch.id}>
                        <TableCell className="font-medium">{batch.batch_number}</TableCell>
                        <TableCell>{batch.created_by_name}</TableCell>
                        <TableCell>{batch.total_items}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(batch.total_amount)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{batch.payment_method}</Badge>
                        </TableCell>
                        <TableCell>
                          {canApprovePaymentBatch && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedBatch(batch);
                                setShowApproveDialog(true);
                              }}
                              data-testid={`approve-batch-${batch.id}`}
                            >
                              Review
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Batch Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payment Batch: {selectedBatch?.batch_number}</DialogTitle>
          </DialogHeader>

          {selectedBatch && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={`${statusColors[selectedBatch.status]} text-white mt-1`}>
                    {selectedBatch.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payment Method</p>
                  <p className="font-medium">{selectedBatch.payment_method}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bank Account</p>
                  <p className="font-medium">{selectedBatch.bank_account_name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Batch Date</p>
                  <p className="font-medium">{formatDate(selectedBatch.batch_date)}</p>
                </div>
              </div>

              {/* Summary */}
              <Card className="bg-muted">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold">{selectedBatch.total_items}</p>
                      <p className="text-sm text-muted-foreground">Total Items</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{formatCurrency(selectedBatch.total_amount)}</p>
                      <p className="text-sm text-muted-foreground">Total Amount</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">{selectedBatch.successful_count}</p>
                      <p className="text-sm text-muted-foreground">Successful</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-600">{selectedBatch.failed_count}</p>
                      <p className="text-sm text-muted-foreground">Failed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Items */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Payment Items</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Bank Details</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>UTR</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedBatch.items?.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{item.invoice_number}</TableCell>
                          <TableCell>{item.vendor_name}</TableCell>
                          <TableCell className="text-xs">
                            {item.vendor_bank_name ? (
                              <>
                                {item.vendor_bank_name}<br />
                                {item.vendor_account_number}<br />
                                IFSC: {item.vendor_ifsc}
                              </>
                            ) : (
                              <span className="text-red-500">Missing bank details</span>
                            )}
                          </TableCell>
                          <TableCell>{formatCurrency(item.amount)}</TableCell>
                          <TableCell>
                            <Badge variant={item.payment_status === 'Processed' ? 'default' : item.payment_status === 'Failed' ? 'destructive' : 'secondary'}>
                              {item.payment_status}
                            </Badge>
                            {item.failure_reason && (
                              <p className="text-xs text-red-500 mt-1">{item.failure_reason}</p>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{item.utr_number || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>
              Close
            </Button>
            {selectedBatch?.status === 'Draft' && canSubmitPaymentBatch && (
              <Button onClick={() => handleSubmitBatch(selectedBatch.id)} data-testid="submit-for-approval-btn">
                <Send className="h-4 w-4 mr-2" />
                Submit for Approval
              </Button>
            )}
            {selectedBatch?.status === 'Approved' && (
              <>
                {canGenerateBatchFile && (
                  <Button variant="outline" onClick={() => handleGenerateFile(selectedBatch.id)}>
                    <Download className="h-4 w-4 mr-2" />
                    Generate File
                  </Button>
                )}
                {canProcessPaymentBatch && (
                  <Button onClick={() => handleProcessBatch(selectedBatch.id)} disabled={processing}>
                    {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <Play className="h-4 w-4 mr-2" />
                    Process Payments
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Payment Batch</DialogTitle>
          </DialogHeader>

          {selectedBatch && (
            <div className="space-y-4">
              <Card className="bg-muted">
                <CardContent className="pt-4">
                  <p><strong>Batch:</strong> {selectedBatch.batch_number}</p>
                  <p><strong>Created By:</strong> {selectedBatch.created_by_name}</p>
                  <p><strong>Items:</strong> {selectedBatch.total_items}</p>
                  <p><strong>Total Amount:</strong> {formatCurrency(selectedBatch.total_amount)}</p>
                  <p><strong>Payment Method:</strong> {selectedBatch.payment_method}</p>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <Label>Decision</Label>
                <Select 
                  value={approvalForm.action} 
                  onValueChange={(v) => setApprovalForm(prev => ({ ...prev, action: v }))}
                >
                  <SelectTrigger data-testid="approval-action-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Approved">Approve</SelectItem>
                    <SelectItem value="Rejected">Reject</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Comments</Label>
                <Textarea
                  value={approvalForm.comments}
                  onChange={(e) => setApprovalForm(prev => ({ ...prev, comments: e.target.value }))}
                  placeholder="Add comments..."
                  data-testid="approval-comments-input"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleApproveBatch} 
              disabled={processing || !canApprovePaymentBatch}
              variant={approvalForm.action === 'Rejected' ? 'destructive' : 'default'}
              data-testid="confirm-approval-btn"
            >
              {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {approvalForm.action === 'Approved' ? <CheckCircle className="h-4 w-4 mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
              {approvalForm.action}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generated File Dialog */}
      <Dialog open={showFileDialog} onOpenChange={setShowFileDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payment File Generated</DialogTitle>
          </DialogHeader>

          {generatedFile && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">File Name</p>
                  <p className="font-medium">{generatedFile.file_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Format</p>
                  <p className="font-medium">{generatedFile.format}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Records</p>
                  <p className="font-medium">{generatedFile.record_count}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>File Content Preview</Label>
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto max-h-[300px]">
                  {generatedFile.file_content}
                </pre>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFileDialog(false)}>
              Close
            </Button>
            <Button onClick={handleDownloadFile} data-testid="download-file-btn">
              <Download className="h-4 w-4 mr-2" />
              Download File
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentBatches;

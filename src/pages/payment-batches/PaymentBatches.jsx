import React, { useState } from 'react';
import {
  useGetPaymentBatchesQuery,
  useGetPaymentBatchStatsQuery,
  useLazyGetPaymentBatchQuery,
  useProcessPaymentBatchMutation,
  useMarkProcessedPaymentBatchMutation,
  useGeneratePaymentBatchFileMutation,
} from '../../Services/apis/paymentBatchesApi';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import AppDataTable from '../../components/common/AppDataTable';
import RefreshButton from '../../components/common/RefreshButton';
import { TableCell, TableRow } from '../../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import {
  Eye,
  CheckCircle,
  Clock,
  Loader2,
  Download,
  DollarSign,
  CreditCard,
  Play,
  CheckCheck,
} from 'lucide-react';
import { useActionGuard } from '../../hooks/useActionGuard';

const statusColors = {
  'Pending': 'bg-yellow-500',
  'Completed': 'bg-green-500',
  'Failed': 'bg-red-500',
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

const normalizeBatch = (batch = {}) => ({
  ...batch,
  batchNumber: batch.batchNumber ?? batch.batch_number ?? '',
  bankAccountName: batch.bankAccountName ?? batch.bank_account_name ?? '',
  paymentMethod: batch.paymentMethod ?? batch.payment_method ?? '',
  status: batch.status ?? 'Pending',
  totalItems: Number(batch.totalItems ?? batch.total_items ?? 0),
  totalAmount: Number(batch.totalAmount ?? batch.total_amount ?? 0),
  paymentItems: batch.paymentItems ?? batch.payment_items ?? batch.items ?? [],
  notes: batch.notes ?? '',
  createdAt: batch.createdAt ?? batch.created_at ?? batch.batch_date,
  successfulCount: Number(batch.successfulCount ?? batch.successful_count ?? 0),
  failedCount: Number(batch.failedCount ?? batch.failed_count ?? 0),
});

const normalizePaymentItem = (item = {}) => ({
  ...item,
  invoiceNumber: item.invoiceNumber ?? item.invoice_number ?? '',
  vendorName: item.vendorName ?? item.vendor_name ?? '',
  amount: Number(item.amount ?? 0),
  currency: item.currency ?? 'INR',
  vendorBankName: item.vendorBankName ?? item.vendor_bank_name ?? '',
  vendorAccountNumber: item.vendorAccountNumber ?? item.vendor_account_number ?? '',
  vendorIfscCode: item.vendorIfscCode ?? item.vendor_ifsc_code ?? item.vendor_ifsc ?? '',
  status: item.status ?? item.payment_status ?? 'Pending',
  utrNumber: item.utrNumber ?? item.utr_number ?? '',
  errorMessage: item.errorMessage ?? item.failure_reason ?? '',
});

const getStatsCount = (stats, key) => Number(stats?.[key]?.count ?? stats?.[key] ?? 0);

const batchTableHeader = [
  { key: 'batchNumber', title: 'Batch Number', cellClassName: 'font-medium' },
  { key: 'createdAt', title: 'Date' },
  { key: 'paymentMethod', title: 'Method' },
  { key: 'totalItems', title: 'Items' },
  { key: 'totalAmount', title: 'Total Amount', cellClassName: 'font-medium' },
  { key: 'successFailed', title: 'Success/Failed' },
  { key: 'status', title: 'Status' },
  { key: 'actions', title: 'Actions' },
];

const paymentItemTableHeader = [
  { key: 'invoiceNumber', title: 'Invoice', cellClassName: 'font-medium' },
  { key: 'vendorName', title: 'Vendor' },
  { key: 'bankDetails', title: 'Bank Details', cellClassName: 'text-xs' },
  { key: 'amount', title: 'Amount' },
  { key: 'status', title: 'Status' },
  { key: 'utrNumber', title: 'UTR', cellClassName: 'font-mono text-xs' },
];

const PaymentBatches = () => {
  const {
    data: batchesData = [],
    isLoading: batchesLoading,
    refetch: refetchBatches,
  } = useGetPaymentBatchesQuery();
  const {
    data: stats = null,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useGetPaymentBatchStatsQuery();
  const [processPaymentBatch] = useProcessPaymentBatchMutation();
  const [markProcessedPaymentBatch] = useMarkProcessedPaymentBatchMutation();
  const [generatePaymentBatchFile] = useGeneratePaymentBatchFileMutation();
  const [getPaymentBatch] = useLazyGetPaymentBatchQuery();
  const { guardAction, canPerformAction } = useActionGuard();

  const batches = Array.isArray(batchesData) ? batchesData.map(normalizeBatch) : [];
  const loading =
    batchesLoading ||
    statsLoading;

  const [activeTab, setActiveTab] = useState('all');

  // Dialog States
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showMarkProcessedDialog, setShowMarkProcessedDialog] = useState(false);
  const [showFileDialog, setShowFileDialog] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [generatedFile, setGeneratedFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [utr, setUtr] = useState('');
  
  const canProcessPaymentBatch = canPerformAction('paymentBatches.process');
  const canMarkProcessedPaymentBatch = canPerformAction('paymentBatches.markProcessed');
  const canGenerateBatchFile = canPerformAction('paymentBatches.generateFile');

  const fetchData = async () => {
    try {
      await Promise.all([
        refetchBatches(),
        refetchStats(),
      ]);
    } catch (error) {
      console.error('Error refreshing payment batch data:', error);
      toast.error('Failed to refresh payment batch data');
    }
  };

  const handleMarkProcessed = async () => {
    if (!guardAction('paymentBatches.markProcessed')) return;
    if (!selectedBatch) return;
    setProcessing(true);
    try {
      const data = await markProcessedPaymentBatch({
        batch_ids: [selectedBatch.id],
        utr: utr || undefined,
      }).unwrap();
      toast.success(data?.message || `${data?.processed_count || 1} batch marked as processed`);
      setShowMarkProcessedDialog(false);
      setShowViewDialog(false);
      setUtr('');
      fetchData();
    } catch (error) {
      toast.error(error?.data?.detail || 'Failed to mark batch processed');
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

  const handleViewBatch = async (batch) => {
    setSelectedBatch(batch);
    setShowViewDialog(true);
    try {
      const data = await getPaymentBatch(batch.id).unwrap();
      setSelectedBatch(normalizeBatch(data));
    } catch (error) {
      toast.error(error?.data?.detail || 'Failed to load payment batch details');
    }
  };

  const handleDownloadFile = () => {
    if (!generatedFile) return;
    
    const fileContent = generatedFile.content || generatedFile.file_content || '';
    const blob = new Blob([fileContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = generatedFile.file_name || generatedFile.fileName || 'payment_file.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success('File downloaded');
  };

  const renderBatchRow = (batch, rowIndex, headers) => (
    <TableRow key={batch.id ?? rowIndex} data-testid={`batch-row-${batch.id}`}>
      {headers.map((header) => {
        let value;

        switch (header.key) {
          case 'createdAt':
            value = formatDate(batch.createdAt);
            break;
          case 'paymentMethod':
            value = <Badge variant="outline">{batch.paymentMethod}</Badge>;
            break;
          case 'totalAmount':
            value = formatCurrency(batch.totalAmount);
            break;
          case 'successFailed':
            value = batch.status === 'Completed' ? (
              <span className="text-sm">
                <span className="text-green-600">{batch.successfulCount}</span>
                {' / '}
                <span className="text-red-600">{batch.failedCount}</span>
              </span>
            ) : '-';
            break;
          case 'status':
            value = (
              <Badge className={`${statusColors[batch.status]} text-white`}>
                {batch.status}
              </Badge>
            );
            break;
          case 'actions':
            value = (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleViewBatch(batch)}
                  data-testid={`view-batch-${batch.id}`}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                {(batch.status === 'Pending' || batch.status === 'Completed') && canGenerateBatchFile && (
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
            );
            break;
          default:
            value = batch?.[header.key] || '-';
        }

        return (
          <TableCell key={header.key} className={header.cellClassName}>
            {value}
          </TableCell>
        );
      })}
    </TableRow>
  );

  const renderPaymentItemRow = (item, rowIndex, headers) => (
    <TableRow key={`${item.invoiceId || item.invoiceNumber || 'item'}-${rowIndex}`}>
      {headers.map((header) => {
        let value;

        switch (header.key) {
          case 'bankDetails':
            value = item.vendorBankName ? (
              <>
                {item.vendorBankName}<br />
                {item.vendorAccountNumber}<br />
                IFSC: {item.vendorIfscCode}
              </>
            ) : (
              <span className="text-red-500">Missing bank details</span>
            );
            break;
          case 'amount':
            value = formatCurrency(item.amount);
            break;
          case 'status':
            value = (
              <>
                <Badge variant={item.status === 'Completed' ? 'default' : item.status === 'Failed' ? 'destructive' : 'secondary'}>
                  {item.status}
                </Badge>
                {item.errorMessage && (
                  <p className="text-xs text-red-500 mt-1">{item.errorMessage}</p>
                )}
              </>
            );
            break;
          case 'utrNumber':
            value = item.utrNumber || '-';
            break;
          default:
            value = item?.[header.key] || '-';
        }

        return (
          <TableCell key={header.key} className={header.cellClassName}>
            {value}
          </TableCell>
        );
      })}
    </TableRow>
  );

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
          <RefreshButton onClick={fetchData} refreshing={loading}>
            Refresh
          </RefreshButton>
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
                  <p className="text-2xl font-bold">{Number(stats.total_batches ?? stats.totalBatches ?? 0)}</p>
                </div>
                <CreditCard className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">{getStatsCount(stats, 'pending')}</p>
                </div>
                <Clock className="h-8 w-8 text-gray-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Failed</p>
                  <p className="text-2xl font-bold">{getStatsCount(stats, 'failed')}</p>
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
                  <p className="text-2xl font-bold">{getStatsCount(stats, 'completed')}</p>
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
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <AppDataTable
              tableHeader={batchTableHeader}
              tableData={batches}
              renderRow={renderBatchRow}
              emptyMessage="No payment batches found. Create a batch to process bulk payments."
            />
          </Card>
        </TabsContent>
      </Tabs>

      {/* View Batch Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payment Batch: {selectedBatch?.batchNumber}</DialogTitle>
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
                  <p className="font-medium">{selectedBatch.paymentMethod}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Bank Account</p>
                  <p className="font-medium">{selectedBatch.bankAccountName || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="font-medium">{formatDate(selectedBatch.createdAt)}</p>
                </div>
              </div>

              {/* Summary */}
              <Card className="bg-muted">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold">{selectedBatch.totalItems}</p>
                      <p className="text-sm text-muted-foreground">Total Items</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{formatCurrency(selectedBatch.totalAmount)}</p>
                      <p className="text-sm text-muted-foreground">Total Amount</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">{selectedBatch.successfulCount}</p>
                      <p className="text-sm text-muted-foreground">Successful</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-600">{selectedBatch.failedCount}</p>
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
                  <AppDataTable
                    tableHeader={paymentItemTableHeader}
                    tableData={(selectedBatch.paymentItems || []).map(normalizePaymentItem)}
                    renderRow={renderPaymentItemRow}
                    emptyMessage="No payment items found."
                  />
                </CardContent>
              </Card>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>
              Close
            </Button>
            {selectedBatch?.status === 'Pending' && (
              <>
                {canGenerateBatchFile && (
                  <Button variant="outline" onClick={() => handleGenerateFile(selectedBatch.id)}>
                    <Download className="h-4 w-4 mr-2" />
                    Generate File
                  </Button>
                )}
                {(canMarkProcessedPaymentBatch || canProcessPaymentBatch) && (
                  <>
                    {canMarkProcessedPaymentBatch && (
                      <Button variant="secondary" onClick={() => setShowMarkProcessedDialog(true)} disabled={processing}>
                        <CheckCheck className="h-4 w-4 mr-2" />
                        Mark Processed (Manual)
                      </Button>
                    )}
                    {canProcessPaymentBatch && (
                      <Button onClick={() => handleProcessBatch(selectedBatch.id)} disabled={processing}>
                        {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        <Play className="h-4 w-4 mr-2" />
                        Process Automatically
                      </Button>
                    )}
                  </>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark Processed Dialog */}
      <Dialog open={showMarkProcessedDialog} onOpenChange={setShowMarkProcessedDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Batch as Processed</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Use this option if you have processed the payment file manually through your bank portal. 
              This will mark all items as completed and update invoice statuses.
            </p>
            <div className="space-y-2">
              <Label>Bank UTR / Reference Number (Optional)</Label>
              <Input
                value={utr}
                onChange={(e) => setUtr(e.target.value)}
                placeholder="Enter UTR..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMarkProcessedDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleMarkProcessed} 
              disabled={processing}
            >
              {processing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm Processed
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
                  <p className="font-medium">{generatedFile.file_name || generatedFile.fileName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Format</p>
                  <p className="font-medium">NEFT</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Records</p>
                  <p className="font-medium">{generatedFile.record_count || generatedFile.recordCount || '-'}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>File Content Preview</Label>
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto max-h-[300px]">
                  {generatedFile.content || generatedFile.file_content}
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

import React, { useState, useRef } from 'react';
import {
  useGetStatementsQuery,
  useGetTransactionsQuery,
  useGetLedgersQuery,
  useGetInvoicesQuery,
  useUploadStatementMutation,
  useDeleteStatementMutation,
  useUpdateTransactionMutation,
  useReviewTransactionMutation,
  useUndoTransactionMutation,
  useLazyGetTransactionInvoiceQuery,
  useUploadTransactionVoucherMutation,
  useLinkTransactionInvoiceMutation,
} from '../Services/apiSlice';
import { format } from 'date-fns';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { 
  Upload, FileText, Search, Download, Trash2, Check, 
  RotateCcw, Building2, Calendar, ChevronDown, Filter,
  CheckCircle2, Clock, AlertCircle, Plus, X, Eye, Link2
} from 'lucide-react';
import { toast } from 'sonner';

// Transaction Type Options
const TRANSACTION_TYPES = [
  'Bill Payment',
  'Expenses',
  'Other Income',
  'Invoice Receipt',
  'Transfer',
  'Salary',
  'Tax Payment',
  'Refund'
];

// Bank Options
const BANK_OPTIONS = [
  'HDFC Bank',
  'ICICI Bank',
  'State Bank of India',
  'Axis Bank',
  'Kotak Mahindra Bank',
  'Punjab National Bank',
  'Bank of Baroda',
  'Yes Bank'
];

export const Transactions = () => {
  const [transactionQueryParams, setTransactionQueryParams] = useState({});
  const {
    data: statementsData = [],
    refetch: refetchStatements,
  } = useGetStatementsQuery();
  const {
    data: transactionsData = [],
    refetch: refetchTransactions,
  } = useGetTransactionsQuery(transactionQueryParams);
  const {
    data: ledgerOptionsData = [],
  } = useGetLedgersQuery();
  const {
    data: invoicesData = [],
  } = useGetInvoicesQuery();
  const [uploadStatement] = useUploadStatementMutation();
  const [deleteStatement] = useDeleteStatementMutation();
  const [updateTransaction] = useUpdateTransactionMutation();
  const [reviewTransaction] = useReviewTransactionMutation();
  const [undoTransaction] = useUndoTransactionMutation();
  const [getTransactionInvoice] = useLazyGetTransactionInvoiceQuery();
  const [uploadTransactionVoucher] = useUploadTransactionVoucherMutation();
  const [linkTransactionInvoice] = useLinkTransactionInvoiceMutation();

  const statements = Array.isArray(statementsData) ? statementsData : [];
  const transactions = Array.isArray(transactionsData) ? transactionsData : [];
  const invoices = Array.isArray(invoicesData) ? invoicesData : [];
  const ledgerOptions =
    Array.isArray(ledgerOptionsData) && ledgerOptionsData.length > 0
      ? ledgerOptionsData
      : [
          'Marketing & Advertising',
          'Software Licenses',
          'Professional Fees',
          'Utilities',
          'Rent - Office Premises',
          'Office Supplies',
        ];

  const [activeTab, setActiveTab] = useState('upload');
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef(null);
  const voucherFileInputRef = useRef(null);
  
  // Upload form state
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [uploading, setUploading] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [accountFilter, setAccountFilter] = useState('');
  
  // Column filter state
  const [activeColumnFilter, setActiveColumnFilter] = useState(null); // 'date', 'account', 'type', 'ledger', 'amount'
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [appliedDateFilter, setAppliedDateFilter] = useState({ from: '', to: '' });
  const [appliedAccountFilter, setAppliedAccountFilter] = useState('');
  const [appliedTypeFilter, setAppliedTypeFilter] = useState('');
  const [appliedLedgerFilter, setAppliedLedgerFilter] = useState('');
  const [appliedAmountFilter, setAppliedAmountFilter] = useState({ min: '', max: '' });
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');
  const [dateFilterOpen, setDateFilterOpen] = useState(false);

  // Invoice side panel state
  const [invoicePanelOpen, setInvoicePanelOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);

  // Voucher upload modal state
  const [voucherModalOpen, setVoucherModalOpen] = useState(false);
  const [selectedTransactionForVoucher, setSelectedTransactionForVoucher] = useState(null);
  const [voucherNumber, setVoucherNumber] = useState('');
  const [voucherFile, setVoucherFile] = useState(null);
  const [uploadingVoucher, setUploadingVoucher] = useState(false);

  // Link invoice modal state
  const [linkInvoiceModalOpen, setLinkInvoiceModalOpen] = useState(false);
  const [invoiceSearchTerm, setInvoiceSearchTerm] = useState('');

  const buildTransactionQueryParams = (dateFilter = appliedDateFilter) => {
    const params = {};
    if (dateFilter.from) {
      params.date_from = new Date(dateFilter.from).toISOString();
    }
    if (dateFilter.to) {
      params.date_to = new Date(dateFilter.to).toISOString();
    }
    return params;
  };

  const loadTransactionsForFilter = (dateFilter = appliedDateFilter) => {
    setTransactionQueryParams(buildTransactionQueryParams(dateFilter));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!periodStart || !periodEnd) {
      toast.error('Please select period date range first');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bank_name', selectedBank);
    formData.append('period_start', new Date(periodStart).toISOString());
    formData.append('period_end', new Date(periodEnd).toISOString());

    try {
      await uploadStatement(formData).unwrap();
      toast.success('Statement uploaded and processed successfully');
      await Promise.all([refetchStatements(), refetchTransactions()]);
      // Reset form
      setPeriodStart('');
      setPeriodEnd('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      toast.error('Failed to upload statement');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteStatement = async (statementId) => {
    if (!window.confirm('Are you sure? This will delete all associated transactions.')) return;
    
    try {
      await deleteStatement(statementId).unwrap();
      toast.success('Statement deleted');
      await Promise.all([refetchStatements(), refetchTransactions()]);
    } catch (error) {
      toast.error('Failed to delete statement');
    }
  };

  const handleDownloadStatement = async (statementId) => {
    try {
      window.open(`/api/statements/${statementId}/download`, '_blank');
    } catch (error) {
      toast.error('Failed to download statement');
    }
  };

  const handleUpdateTransaction = async (transactionId, field, value) => {
    try {
      await updateTransaction({
        transactionId,
        body: { [field]: value },
      }).unwrap();
      refetchTransactions();
    } catch (error) {
      toast.error('Failed to update transaction');
    }
  };

  const handleMarkReviewed = async (transactionId) => {
    try {
      await reviewTransaction(transactionId).unwrap();
      toast.success('Transaction marked as reviewed');
      refetchTransactions();
    } catch (error) {
      toast.error('Failed to mark transaction');
    }
  };

  const handleUndoReview = async (transactionId) => {
    try {
      await undoTransaction(transactionId).unwrap();
      toast.success('Transaction moved back to Review Needed');
      refetchTransactions();
    } catch (error) {
      toast.error('Failed to undo review');
    }
  };

  // View linked invoice in side panel
  const handleViewInvoice = async (txn) => {
    setLoadingInvoice(true);
    setInvoicePanelOpen(true);
    
    try {
      if (txn.matched_invoice_id) {
        const response = await getTransactionInvoice(txn.id).unwrap();
        setSelectedInvoice(response);
      } else if (txn.voucher_file_id) {
        // For uploaded vouchers, create a pseudo-invoice object
        setSelectedInvoice({
          invoice_number: txn.matched_invoice_number || 'Uploaded Voucher',
          voucher_file_id: txn.voucher_file_id,
          voucher_type: 'uploaded'
        });
      }
    } catch (error) {
      toast.error('Failed to load invoice');
      setInvoicePanelOpen(false);
    } finally {
      setLoadingInvoice(false);
    }
  };

  // Open voucher upload modal
  const handleOpenVoucherModal = (txn) => {
    setSelectedTransactionForVoucher(txn);
    setVoucherNumber('');
    setVoucherFile(null);
    setVoucherModalOpen(true);
  };

  // Upload voucher
  const handleUploadVoucher = async () => {
    if (!voucherFile || !voucherNumber) {
      toast.error('Please provide voucher number and file');
      return;
    }

    setUploadingVoucher(true);
    const formData = new FormData();
    formData.append('file', voucherFile);
    formData.append('voucher_number', voucherNumber);

    try {
      await uploadTransactionVoucher({
        transactionId: selectedTransactionForVoucher.id,
        body: formData,
      }).unwrap();
      toast.success('Voucher uploaded successfully');
      setVoucherModalOpen(false);
      refetchTransactions();
    } catch (error) {
      toast.error('Failed to upload voucher');
    } finally {
      setUploadingVoucher(false);
    }
  };

  // Link existing invoice
  const handleLinkInvoice = async (invoiceId) => {
    try {
      await linkTransactionInvoice({
        transactionId: selectedTransactionForVoucher.id,
        invoiceId,
      }).unwrap();
      toast.success('Invoice linked successfully');
      setLinkInvoiceModalOpen(false);
      setVoucherModalOpen(false);
      refetchTransactions();
    } catch (error) {
      toast.error('Failed to link invoice');
    }
  };

  // Filter invoices for linking
  const filteredInvoicesForLinking = invoices.filter(inv => {
    if (!invoiceSearchTerm) return true;
    const term = invoiceSearchTerm.toLowerCase();
    return inv.invoice_number?.toLowerCase().includes(term) ||
           inv.vendor_name?.toLowerCase().includes(term);
  });

  // Apply date filter
  const handleApplyDateFilter = () => {
    const newFilter = { from: dateFrom, to: dateTo };
    setAppliedDateFilter(newFilter);
    loadTransactionsForFilter(newFilter);
    setDateFilterOpen(false);
  };

  // Clear date filter
  const handleClearDateFilter = () => {
    setDateFrom('');
    setDateTo('');
    setAppliedDateFilter({ from: '', to: '' });
    loadTransactionsForFilter({ from: '', to: '' });
    setDateFilterOpen(false);
  };

  // Format date range display
  const getDateFilterLabel = () => {
    if (appliedDateFilter.from && appliedDateFilter.to) {
      return `${format(new Date(appliedDateFilter.from), 'd MMM')} - ${format(new Date(appliedDateFilter.to), 'd MMM yyyy')}`;
    } else if (appliedDateFilter.from) {
      return `From ${format(new Date(appliedDateFilter.from), 'd MMM yyyy')}`;
    } else if (appliedDateFilter.to) {
      return `Until ${format(new Date(appliedDateFilter.to), 'd MMM yyyy')}`;
    }
    return null;
  };

  // Toggle column filter
  const toggleColumnFilter = (columnName) => {
    setActiveColumnFilter(activeColumnFilter === columnName ? null : columnName);
  };

  // Apply column filters
  const applyDateFilter = () => {
    const newFilter = { from: dateFrom, to: dateTo };
    setAppliedDateFilter(newFilter);
    loadTransactionsForFilter(newFilter);
    setActiveColumnFilter(null);
  };

  const clearDateFilter = () => {
    setDateFrom('');
    setDateTo('');
    setAppliedDateFilter({ from: '', to: '' });
    loadTransactionsForFilter({ from: '', to: '' });
    setActiveColumnFilter(null);
  };

  const applyAccountFilter = (value) => {
    setAppliedAccountFilter(value);
    setActiveColumnFilter(null);
  };

  const applyTypeFilter = (value) => {
    setAppliedTypeFilter(value);
    setActiveColumnFilter(null);
  };

  const applyLedgerFilter = (value) => {
    setAppliedLedgerFilter(value);
    setActiveColumnFilter(null);
  };

  const applyAmountFilter = () => {
    setAppliedAmountFilter({ min: amountMin, max: amountMax });
    setActiveColumnFilter(null);
  };

  // Check if any filter is active
  const hasActiveFilters = () => {
    return appliedDateFilter.from || appliedDateFilter.to || 
           appliedAccountFilter || appliedTypeFilter || 
           appliedLedgerFilter || appliedAmountFilter.min || appliedAmountFilter.max;
  };

  // Clear all filters
  const clearAllFilters = () => {
    setDateFrom('');
    setDateTo('');
    setAppliedDateFilter({ from: '', to: '' });
    setAppliedAccountFilter('');
    setAppliedTypeFilter('');
    setAppliedLedgerFilter('');
    setAmountMin('');
    setAmountMax('');
    setAppliedAmountFilter({ min: '', max: '' });
    loadTransactionsForFilter({ from: '', to: '' });
  };

  // Filter transactions locally based on applied filters
  const applyLocalFilters = (txns) => {
    return txns.filter(txn => {
      // Account filter
      if (appliedAccountFilter && txn.account !== appliedAccountFilter) {
        return false;
      }
      // Type filter
      if (appliedTypeFilter && txn.transaction_type !== appliedTypeFilter) {
        return false;
      }
      // Ledger filter
      if (appliedLedgerFilter && txn.ledger !== appliedLedgerFilter) {
        return false;
      }
      // Amount filter
      if (appliedAmountFilter.min && txn.amount < parseFloat(appliedAmountFilter.min)) {
        return false;
      }
      if (appliedAmountFilter.max && txn.amount > parseFloat(appliedAmountFilter.max)) {
        return false;
      }
      return true;
    });
  };

  // Get unique values for filters
  const uniqueAccounts = [...new Set(transactions.map(t => t.account))].filter(Boolean);
  const uniqueTypes = [...new Set(transactions.map(t => t.transaction_type))].filter(Boolean);
  const uniqueLedgers = [...new Set(transactions.map(t => t.ledger))].filter(Boolean);

  // Filter transactions
  const needsReviewTransactions = transactions.filter(t => t.review_status === 'Needs Review');
  const accountingReadyTransactions = transactions.filter(t => t.review_status === 'Accounting Ready');

  // Search filter
  const filterBySearch = (items) => {
    if (!searchTerm) return items;
    const term = searchTerm.toLowerCase();
    return items.filter(item => 
      item.description?.toLowerCase().includes(term) ||
      item.account?.toLowerCase().includes(term) ||
      item.ledger?.toLowerCase().includes(term)
    );
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Extracted':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
            <CheckCircle2 className="h-3 w-3" />
            Extracted
          </span>
        );
      case 'Processing':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
            <Clock className="h-3 w-3" />
            Processing
          </span>
        );
      case 'Failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
            <AlertCircle className="h-3 w-3" />
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6" data-testid="transactions-page">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold font-['Manrope']">Transactions</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-gray-100 p-1">
          <TabsTrigger value="upload" className="data-[state=active]:bg-white" data-testid="tab-upload">
            Upload Statement
          </TabsTrigger>
          <TabsTrigger value="review" className="data-[state=active]:bg-white" data-testid="tab-review">
            Review Needed
            {needsReviewTransactions.length > 0 && (
              <span className="ml-2 bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {needsReviewTransactions.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="ready" className="data-[state=active]:bg-white" data-testid="tab-ready">
            Accounting Ready
            {accountingReadyTransactions.length > 0 && (
              <span className="ml-2 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {accountingReadyTransactions.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Upload Statement Tab */}
        <TabsContent value="upload" className="space-y-6">
          {/* Upload Area */}
          <div className="bg-white border rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Select Bank</label>
                <select
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  data-testid="bank-select"
                >
                  {BANK_OPTIONS.map(bank => (
                    <option key={bank} value={bank}>{bank}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Period Start</label>
                <Input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  className="h-9"
                  data-testid="period-start"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">Period End</label>
                <Input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  className="h-9"
                  data-testid="period-end"
                />
              </div>
              <div className="flex items-end">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".pdf,.csv,.xlsx"
                  className="hidden"
                  data-testid="file-input"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || !periodStart || !periodEnd}
                  className="w-full h-9"
                  data-testid="upload-btn"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Statement
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Drop Zone */}
            <div 
              className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center cursor-pointer hover:border-primary hover:bg-gray-50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-3">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <p className="text-sm text-gray-600">Drop your files or <span className="text-blue-600 font-medium">browse</span></p>
              <p className="text-xs text-gray-400 mt-1">Supported format: pdf, csv, xlsx</p>
            </div>
          </div>

          {/* Statements Table */}
          <div className="bg-white border rounded-lg overflow-hidden">
            {/* Filters */}
            <div className="p-4 border-b flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-gray-400" />
                <Input
                  placeholder="File name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8 w-40 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-500">Pick a date range</span>
              </div>
              <select
                value={accountFilter}
                onChange={(e) => setAccountFilter(e.target.value)}
                className="h-8 rounded border px-2 text-sm"
              >
                <option value="">Accounts</option>
                {BANK_OPTIONS.map(bank => (
                  <option key={bank} value={bank}>{bank}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-8 rounded border px-2 text-sm"
              >
                <option value="">Status</option>
                <option value="Extracted">Extracted</option>
                <option value="Processing">Processing</option>
                <option value="Failed">Failed</option>
              </select>
            </div>

            {/* Table */}
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-3 text-left font-medium text-gray-600">Period Date</th>
                  <th className="p-3 text-left font-medium text-gray-600">File Name</th>
                  <th className="p-3 text-left font-medium text-gray-600">Account</th>
                  <th className="p-3 text-left font-medium text-gray-600">Status</th>
                  <th className="p-3 text-center font-medium text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {statements.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">
                      <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p>No statements uploaded yet</p>
                    </td>
                  </tr>
                ) : (
                  statements
                    .filter(s => !statusFilter || s.status === statusFilter)
                    .filter(s => !accountFilter || s.bank_name === accountFilter)
                    .map((stmt) => (
                      <tr key={stmt.id} className="hover:bg-gray-50">
                        <td className="p-3">
                          <span className="text-gray-800">
                            {format(new Date(stmt.period_start), 'd MMM yyyy')} - {format(new Date(stmt.period_end), 'd MMM yyyy')}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="text-gray-800">{stmt.original_file_name}</span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-gray-400" />
                            <span>{stmt.bank_name}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          {getStatusBadge(stmt.status)}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleDownloadStatement(stmt.id)}
                              className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700"
                              title="Download"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteStatement(stmt.id)}
                              className="p-1.5 hover:bg-red-50 rounded text-gray-500 hover:text-red-600"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {statements.length > 0 && (
              <div className="p-3 border-t flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <span>Rows per page:</span>
                  <select className="border rounded px-2 py-1 text-sm">
                    <option>10</option>
                    <option>25</option>
                    <option>50</option>
                  </select>
                </div>
                <span>1 - {statements.length} of {statements.length}</span>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Review Needed Tab */}
        <TabsContent value="review" className="space-y-4">
          <div className="bg-white border rounded-lg overflow-hidden">
            {/* Search Bar */}
            <div className="p-4 border-b flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 flex-1">
                <Search className="h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8 max-w-xs text-sm"
                />
              </div>
              
              {/* Active filters display */}
              {hasActiveFilters() && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Filters:</span>
                  {getDateFilterLabel() && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded flex items-center gap-1">
                      {getDateFilterLabel()}
                      <button onClick={clearDateFilter} className="hover:text-blue-900"><X className="h-3 w-3" /></button>
                    </span>
                  )}
                  {appliedAccountFilter && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded flex items-center gap-1">
                      {appliedAccountFilter}
                      <button onClick={() => setAppliedAccountFilter('')}><X className="h-3 w-3" /></button>
                    </span>
                  )}
                  {appliedTypeFilter && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded flex items-center gap-1">
                      {appliedTypeFilter}
                      <button onClick={() => setAppliedTypeFilter('')}><X className="h-3 w-3" /></button>
                    </span>
                  )}
                  <button onClick={clearAllFilters} className="text-xs text-gray-500 hover:text-gray-700 underline">
                    Clear all
                  </button>
                </div>
              )}
              
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600">Show AI Categorised</span>
                <div className="w-10 h-5 bg-purple-500 rounded-full relative cursor-pointer">
                  <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow" />
                </div>
              </div>
            </div>

            {/* Transactions Table with Column Filters */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="p-3 text-left font-medium text-gray-600 w-8">
                      <input type="checkbox" className="rounded" />
                    </th>
                    
                    {/* Date Column with Filter */}
                    <th className="p-3 text-left font-medium text-gray-600 relative">
                      <button 
                        onClick={() => toggleColumnFilter('date')}
                        className={`flex items-center gap-1 hover:text-gray-900 ${appliedDateFilter.from || appliedDateFilter.to ? 'text-blue-600' : ''}`}
                      >
                        Date
                        <ChevronDown className="h-3 w-3" />
                        {(appliedDateFilter.from || appliedDateFilter.to) && <Filter className="h-3 w-3 text-blue-500" />}
                      </button>
                      
                      {/* Date Filter Popup */}
                      {activeColumnFilter === 'date' && (
                        <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-xl p-4 z-50 w-[420px]" onClick={e => e.stopPropagation()}>
                          <div className="flex gap-4">
                            {/* From Calendar */}
                            <div className="flex-1">
                              <Label className="text-xs text-gray-600 font-medium">From:</Label>
                              <Input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="h-9 mt-1"
                              />
                            </div>
                            {/* To Calendar */}
                            <div className="flex-1">
                              <Label className="text-xs text-gray-600 font-medium">To:</Label>
                              <Input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="h-9 mt-1"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end mt-3">
                            <Button size="sm" onClick={applyDateFilter}>Apply</Button>
                          </div>
                        </div>
                      )}
                    </th>
                    
                    {/* Account Column with Filter */}
                    <th className="p-3 text-left font-medium text-gray-600 relative">
                      <button 
                        onClick={() => toggleColumnFilter('account')}
                        className={`flex items-center gap-1 hover:text-gray-900 ${appliedAccountFilter ? 'text-blue-600' : ''}`}
                      >
                        Account
                        <ChevronDown className="h-3 w-3" />
                        {appliedAccountFilter && <Filter className="h-3 w-3 text-blue-500" />}
                      </button>
                      
                      {activeColumnFilter === 'account' && (
                        <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-xl p-2 z-50 w-48 max-h-60 overflow-y-auto">
                          <button
                            onClick={() => applyAccountFilter('')}
                            className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 rounded ${!appliedAccountFilter ? 'bg-blue-50 text-blue-700' : ''}`}
                          >
                            All Accounts
                          </button>
                          {uniqueAccounts.map(acc => (
                            <button
                              key={acc}
                              onClick={() => applyAccountFilter(acc)}
                              className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 rounded ${appliedAccountFilter === acc ? 'bg-blue-50 text-blue-700' : ''}`}
                            >
                              {acc}
                            </button>
                          ))}
                        </div>
                      )}
                    </th>
                    
                    <th className="p-3 text-left font-medium text-gray-600">Description</th>
                    
                    {/* Type Column with Filter */}
                    <th className="p-3 text-left font-medium text-gray-600 relative">
                      <button 
                        onClick={() => toggleColumnFilter('type')}
                        className={`flex items-center gap-1 hover:text-gray-900 ${appliedTypeFilter ? 'text-blue-600' : ''}`}
                      >
                        Type
                        <ChevronDown className="h-3 w-3" />
                        {appliedTypeFilter && <Filter className="h-3 w-3 text-blue-500" />}
                      </button>
                      
                      {activeColumnFilter === 'type' && (
                        <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-xl p-2 z-50 w-48 max-h-60 overflow-y-auto">
                          <button
                            onClick={() => applyTypeFilter('')}
                            className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 rounded ${!appliedTypeFilter ? 'bg-blue-50 text-blue-700' : ''}`}
                          >
                            All Types
                          </button>
                          {uniqueTypes.map(type => (
                            <button
                              key={type}
                              onClick={() => applyTypeFilter(type)}
                              className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 rounded ${appliedTypeFilter === type ? 'bg-blue-50 text-blue-700' : ''}`}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                      )}
                    </th>
                    
                    {/* Ledger Column with Filter */}
                    <th className="p-3 text-left font-medium text-gray-600 relative">
                      <button 
                        onClick={() => toggleColumnFilter('ledger')}
                        className={`flex items-center gap-1 hover:text-gray-900 ${appliedLedgerFilter ? 'text-blue-600' : ''}`}
                      >
                        Ledger
                        <ChevronDown className="h-3 w-3" />
                        {appliedLedgerFilter && <Filter className="h-3 w-3 text-blue-500" />}
                      </button>
                      
                      {activeColumnFilter === 'ledger' && (
                        <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-xl p-2 z-50 w-56 max-h-60 overflow-y-auto">
                          <button
                            onClick={() => applyLedgerFilter('')}
                            className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 rounded ${!appliedLedgerFilter ? 'bg-blue-50 text-blue-700' : ''}`}
                          >
                            All Ledgers
                          </button>
                          {uniqueLedgers.map(ledger => (
                            <button
                              key={ledger}
                              onClick={() => applyLedgerFilter(ledger)}
                              className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 rounded truncate ${appliedLedgerFilter === ledger ? 'bg-blue-50 text-blue-700' : ''}`}
                            >
                              {ledger}
                            </button>
                          ))}
                        </div>
                      )}
                    </th>
                    
                    {/* Amount Column with Filter */}
                    <th className="p-3 text-right font-medium text-gray-600 relative">
                      <button 
                        onClick={() => toggleColumnFilter('amount')}
                        className={`flex items-center gap-1 hover:text-gray-900 justify-end w-full ${appliedAmountFilter.min || appliedAmountFilter.max ? 'text-blue-600' : ''}`}
                      >
                        Amount
                        <ChevronDown className="h-3 w-3" />
                        {(appliedAmountFilter.min || appliedAmountFilter.max) && <Filter className="h-3 w-3 text-blue-500" />}
                      </button>
                      
                      {activeColumnFilter === 'amount' && (
                        <div className="absolute top-full right-0 mt-1 bg-white border rounded-lg shadow-xl p-3 z-50 w-48">
                          <div className="space-y-2">
                            <div>
                              <Label className="text-xs text-gray-600">Min Amount</Label>
                              <Input
                                type="number"
                                value={amountMin}
                                onChange={(e) => setAmountMin(e.target.value)}
                                placeholder="0"
                                className="h-8 mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-gray-600">Max Amount</Label>
                              <Input
                                type="number"
                                value={amountMax}
                                onChange={(e) => setAmountMax(e.target.value)}
                                placeholder="No limit"
                                className="h-8 mt-1"
                              />
                            </div>
                            <Button size="sm" onClick={applyAmountFilter} className="w-full">Apply</Button>
                          </div>
                        </div>
                      )}
                    </th>
                    
                    <th className="p-3 text-center font-medium text-gray-600">Reviewed</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {applyLocalFilters(filterBySearch(needsReviewTransactions)).length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-gray-500">
                        <CheckCircle2 className="h-10 w-10 mx-auto mb-2 opacity-30 text-green-500" />
                        <p>No transactions match the filters</p>
                      </td>
                    </tr>
                  ) : (
                    applyLocalFilters(filterBySearch(needsReviewTransactions)).map((txn) => (
                      <tr key={txn.id} className="hover:bg-gray-50">
                        <td className="p-3">
                          <input type="checkbox" className="rounded" />
                        </td>
                        <td className="p-3 text-gray-800">
                          {format(new Date(txn.date), 'd MMM yyyy')}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-gray-400" />
                            <span>{txn.account}</span>
                          </div>
                        </td>
                        <td className="p-3 max-w-[200px] truncate text-gray-700" title={txn.description}>
                          {txn.description}
                        </td>
                        <td className="p-3">
                          <select
                            value={txn.transaction_type}
                            onChange={(e) => handleUpdateTransaction(txn.id, 'transaction_type', e.target.value)}
                            className="h-8 w-full rounded border px-2 text-sm bg-white"
                          >
                            {TRANSACTION_TYPES.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-3">
                          <select
                            value={txn.ledger || ''}
                            onChange={(e) => handleUpdateTransaction(txn.id, 'ledger', e.target.value)}
                            className={`h-8 w-full rounded border px-2 text-sm bg-white ${!txn.ledger ? 'text-gray-400' : ''}`}
                          >
                            <option value="">Select Ledger</option>
                            {ledgerOptions.map(ledger => (
                              <option key={ledger} value={ledger}>{ledger}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-3 text-right">
                          <div>
                            <span className="font-medium">₹{txn.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            <span className={`block text-xs ${txn.is_credit ? 'text-green-600' : 'text-red-600'}`}>
                              {txn.is_credit ? 'Credit' : 'Debit'}
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          {(txn.matched_invoice_id || txn.voucher_file_id) ? (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleViewInvoice(txn)}
                                className="p-1.5 hover:bg-blue-100 rounded text-blue-500 hover:text-blue-700"
                                title={`View ${txn.matched_invoice_number || 'Voucher'}`}
                              >
                                <FileText className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleMarkReviewed(txn.id)}
                                className="p-1.5 hover:bg-green-100 rounded text-green-500 hover:text-green-700"
                                title="Mark as Reviewed"
                              >
                                <Check className="h-5 w-5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleOpenVoucherModal(txn)}
                              className="flex items-center gap-1 px-2 py-1 text-xs text-amber-600 bg-amber-50 hover:bg-amber-100 rounded border border-amber-200"
                              title="Add voucher or link invoice"
                            >
                              <Plus className="h-3 w-3" />
                              <span>Voucher missing</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {applyLocalFilters(filterBySearch(needsReviewTransactions)).length > 0 && (
              <div className="p-3 border-t flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <span>Rows per page:</span>
                  <select className="border rounded px-2 py-1 text-sm">
                    <option>10</option>
                    <option>25</option>
                    <option>100</option>
                  </select>
                </div>
                <span>1 - {applyLocalFilters(filterBySearch(needsReviewTransactions)).length} of {applyLocalFilters(filterBySearch(needsReviewTransactions)).length}</span>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Accounting Ready Tab */}
        <TabsContent value="ready" className="space-y-4">
          <div className="bg-white border rounded-lg overflow-hidden">
            {/* Search Bar with Date Filter */}
            <div className="p-4 border-b flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2 flex-1">
                <Search className="h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8 max-w-xs text-sm"
                />
              </div>
              
              {/* Date Filter */}
              <div className="relative">
                <button
                  onClick={() => setDateFilterOpen(!dateFilterOpen)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm ${
                    appliedDateFilter.from || appliedDateFilter.to
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Calendar className="h-4 w-4" />
                  <span>{getDateFilterLabel()}</span>
                  {(appliedDateFilter.from || appliedDateFilter.to) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClearDateFilter();
                      }}
                      className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </button>
                
                {/* Date Filter Popup */}
                {dateFilterOpen && (
                  <div className="absolute top-full left-0 mt-2 bg-white border rounded-lg shadow-lg p-4 z-50 w-72">
                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-800">Filter by Date</h4>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-gray-600">From</Label>
                          <Input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="h-9 mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-600">To</Label>
                          <Input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="h-9 mt-1"
                          />
                        </div>
                      </div>
                      
                      {/* Quick filters */}
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => {
                            const today = new Date();
                            const weekAgo = new Date(today);
                            weekAgo.setDate(weekAgo.getDate() - 7);
                            setDateFrom(weekAgo.toISOString().split('T')[0]);
                            setDateTo(today.toISOString().split('T')[0]);
                          }}
                          className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                        >
                          Last 7 days
                        </button>
                        <button
                          onClick={() => {
                            const today = new Date();
                            const monthAgo = new Date(today);
                            monthAgo.setMonth(monthAgo.getMonth() - 1);
                            setDateFrom(monthAgo.toISOString().split('T')[0]);
                            setDateTo(today.toISOString().split('T')[0]);
                          }}
                          className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                        >
                          Last 30 days
                        </button>
                        <button
                          onClick={() => {
                            const today = new Date();
                            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
                            setDateFrom(firstDay.toISOString().split('T')[0]);
                            setDateTo(today.toISOString().split('T')[0]);
                          }}
                          className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                        >
                          This month
                        </button>
                      </div>
                      
                      <div className="flex justify-end gap-2 pt-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDateFilterOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleApplyDateFilter}
                          disabled={!dateFrom && !dateTo}
                        >
                          Apply Filter
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600">Hide Synced Transactions</span>
                <div className="w-10 h-5 bg-gray-300 rounded-full relative cursor-pointer">
                  <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow" />
                </div>
              </div>
              <Button variant="outline" size="sm" className="h-8">
                <Filter className="h-3 w-3 mr-1" />
                Columns
              </Button>
            </div>

            {/* Transactions Table - Non-editable */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="p-3 text-left font-medium text-gray-600 w-8">
                      <input type="checkbox" className="rounded" />
                    </th>
                    <th className="p-3 text-left font-medium text-gray-600">
                      Date <ChevronDown className="inline h-3 w-3" />
                    </th>
                    <th className="p-3 text-left font-medium text-gray-600">
                      Account <ChevronDown className="inline h-3 w-3" />
                    </th>
                    <th className="p-3 text-left font-medium text-gray-600">Description</th>
                    <th className="p-3 text-left font-medium text-gray-600">
                      Type <ChevronDown className="inline h-3 w-3" />
                    </th>
                    <th className="p-3 text-left font-medium text-gray-600">
                      Ledger <ChevronDown className="inline h-3 w-3" />
                    </th>
                    <th className="p-3 text-right font-medium text-gray-600">
                      Amount <ChevronDown className="inline h-3 w-3" />
                    </th>
                    <th className="p-3 text-center font-medium text-gray-600">Undo</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filterBySearch(accountingReadyTransactions).length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-gray-500">
                        <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        <p>No transactions ready for accounting</p>
                        <p className="text-xs mt-1">Review transactions in the "Review Needed" tab first</p>
                      </td>
                    </tr>
                  ) : (
                    filterBySearch(accountingReadyTransactions).map((txn) => (
                      <tr key={txn.id} className="hover:bg-gray-50">
                        <td className="p-3">
                          <input type="checkbox" className="rounded" />
                        </td>
                        <td className="p-3 text-gray-800">
                          {format(new Date(txn.date), 'd MMM yyyy')}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-gray-400" />
                            <span>{txn.account}</span>
                          </div>
                        </td>
                        <td className="p-3 max-w-[200px] truncate text-gray-700" title={txn.description}>
                          {txn.description}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                            {txn.transaction_type}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="text-gray-700">
                            {txn.ledger || '-'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div>
                            <span className="font-medium">₹{txn.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            <span className={`block text-xs ${txn.is_credit ? 'text-green-600' : 'text-red-600'}`}>
                              {txn.is_credit ? 'Credit' : 'Debit'}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => handleUndoReview(txn.id)}
                            className="p-1.5 hover:bg-amber-100 rounded text-gray-400 hover:text-amber-600"
                            title="Undo - Move back to Review Needed"
                          >
                            <RotateCcw className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {accountingReadyTransactions.length > 0 && (
              <div className="p-3 border-t flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <span>Rows per page:</span>
                  <select className="border rounded px-2 py-1 text-sm">
                    <option>100</option>
                    <option>50</option>
                    <option>25</option>
                  </select>
                </div>
                <span>1 - {accountingReadyTransactions.length} of {accountingReadyTransactions.length}</span>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Invoice Side Panel */}
      {invoicePanelOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="flex-1 bg-black/50" 
            onClick={() => {
              setInvoicePanelOpen(false);
              setSelectedInvoice(null);
            }}
          />
          
          {/* Panel */}
          <div className="w-[500px] bg-white shadow-2xl h-full overflow-hidden flex flex-col animate-in slide-in-from-right">
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold">
                  {selectedInvoice?.invoice_number || 'Invoice Details'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setInvoicePanelOpen(false);
                  setSelectedInvoice(null);
                }}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {loadingInvoice ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
              ) : selectedInvoice ? (
                <div className="space-y-4">
                  {/* Invoice/Voucher Preview */}
                  <div className="border rounded-lg overflow-hidden bg-gray-100 h-[400px] flex items-center justify-center">
                    {selectedInvoice.file_id ? (
                      <iframe
                        src={`/api/files/${selectedInvoice.file_id}`}
                        className="w-full h-full"
                        title="Invoice Preview"
                      />
                    ) : selectedInvoice.voucher_file_id ? (
                      <iframe
                        src={`/api/files/voucher/${selectedInvoice.voucher_file_id}`}
                        className="w-full h-full"
                        title="Voucher Preview"
                      />
                    ) : (
                      <div className="text-center text-gray-500">
                        <FileText className="h-12 w-12 mx-auto mb-2 opacity-30" />
                        <p>No preview available</p>
                      </div>
                    )}
                  </div>

                  {/* Invoice Details */}
                  {selectedInvoice.vendor_name && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-800 border-b pb-2">Invoice Details</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500">Invoice #</span>
                          <p className="font-medium">{selectedInvoice.invoice_number}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Vendor</span>
                          <p className="font-medium">{selectedInvoice.vendor_name}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Amount</span>
                          <p className="font-medium">₹{selectedInvoice.amount?.toLocaleString('en-IN')}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Status</span>
                          <p className="font-medium">{selectedInvoice.status}</p>
                        </div>
                        {selectedInvoice.invoice_date && (
                          <div>
                            <span className="text-gray-500">Invoice Date</span>
                            <p className="font-medium">{format(new Date(selectedInvoice.invoice_date), 'd MMM yyyy')}</p>
                          </div>
                        )}
                        {selectedInvoice.due_date && (
                          <div>
                            <span className="text-gray-500">Due Date</span>
                            <p className="font-medium">{format(new Date(selectedInvoice.due_date), 'd MMM yyyy')}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-500 mt-20">
                  <p>No invoice data</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Voucher Upload / Link Invoice Modal */}
      <Dialog open={voucherModalOpen} onOpenChange={setVoucherModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-amber-600" />
              Add Voucher / Link Invoice
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            {/* Transaction Info */}
            {selectedTransactionForVoucher && (
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <p className="text-gray-500">Transaction</p>
                <p className="font-medium truncate">{selectedTransactionForVoucher.description}</p>
                <p className="text-lg font-bold mt-1">
                  ₹{selectedTransactionForVoucher.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
              </div>
            )}

            {/* Option 1: Link existing invoice */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Link2 className="h-4 w-4 text-blue-600" />
                <h4 className="font-medium">Link Existing Invoice</h4>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setLinkInvoiceModalOpen(true);
                }}
              >
                Select from System Invoices
              </Button>
            </div>

            {/* Option 2: Upload new voucher */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Upload className="h-4 w-4 text-green-600" />
                <h4 className="font-medium">Upload New Voucher</h4>
              </div>
              
              <div className="space-y-3">
                <div>
                  <Label className="text-sm">Voucher Number</Label>
                  <Input
                    value={voucherNumber}
                    onChange={(e) => setVoucherNumber(e.target.value)}
                    placeholder="Enter voucher number"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label className="text-sm">Voucher File</Label>
                  <input
                    type="file"
                    ref={voucherFileInputRef}
                    onChange={(e) => setVoucherFile(e.target.files[0])}
                    accept=".pdf,.png,.jpg,.jpeg"
                    className="hidden"
                  />
                  <div className="mt-1 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => voucherFileInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      Choose File
                    </Button>
                    {voucherFile && (
                      <span className="text-sm text-gray-600 truncate max-w-[200px]">
                        {voucherFile.name}
                      </span>
                    )}
                  </div>
                </div>

                <Button
                  onClick={handleUploadVoucher}
                  disabled={uploadingVoucher || !voucherFile || !voucherNumber}
                  className="w-full"
                >
                  {uploadingVoucher ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Uploading...
                    </>
                  ) : (
                    'Upload Voucher'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Link Invoice Selection Modal */}
      <Dialog open={linkInvoiceModalOpen} onOpenChange={setLinkInvoiceModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Select Invoice to Link</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            {/* Search */}
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by invoice number or vendor..."
                value={invoiceSearchTerm}
                onChange={(e) => setInvoiceSearchTerm(e.target.value)}
                className="flex-1"
              />
            </div>

            {/* Invoice List */}
            <div className="border rounded-lg max-h-[400px] overflow-y-auto">
              {filteredInvoicesForLinking.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>No invoices found</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b sticky top-0">
                    <tr>
                      <th className="p-3 text-left font-medium">Invoice #</th>
                      <th className="p-3 text-left font-medium">Vendor</th>
                      <th className="p-3 text-right font-medium">Amount</th>
                      <th className="p-3 text-center font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredInvoicesForLinking.map((inv) => (
                      <tr key={inv.id} className="hover:bg-gray-50">
                        <td className="p-3 font-medium">{inv.invoice_number}</td>
                        <td className="p-3">{inv.vendor_name}</td>
                        <td className="p-3 text-right">₹{inv.amount?.toLocaleString('en-IN')}</td>
                        <td className="p-3 text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleLinkInvoice(inv.id)}
                          >
                            <Link2 className="h-3 w-3 mr-1" />
                            Link
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Transactions;


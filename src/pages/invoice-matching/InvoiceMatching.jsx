import React, { useState } from 'react';
import { useGetInvoicesQuery } from '../../Services/apis/invoicesVendorsApi';
import {
  useGetInvoiceMatchingQuery,
  useGetPendingInvoiceMatchingQuery,
  useGetInvoiceMatchingStatsQuery,
  useLazyGetInvoiceMatchingCandidatesQuery,
  useMatchInvoiceMutation,
  useResolveInvoiceMatchMutation,
} from '../../Services/apis/invoiceMatchingApi';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
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
import { Slider } from '../../components/ui/slider';
import { toast } from 'sonner';
import {
  Search,
  Link2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  ShoppingCart,
  Package,
  Loader2,
  RefreshCw,
  Eye,
  CheckCheck,
  Percent,
  ArrowRight,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { useActionGuard } from '../../hooks/useActionGuard';

const statusColors = {
  'Matched': 'bg-green-500',
  'Partial Match': 'bg-yellow-500',
  'Mismatch': 'bg-red-500',
  'Exception': 'bg-red-500',
  'Resolved': 'bg-blue-500',
  'Pending': 'bg-gray-500'
};

const statusIcons = {
  'Matched': CheckCircle,
  'Partial Match': AlertTriangle,
  'Mismatch': XCircle,
  'Exception': AlertTriangle,
  'Resolved': CheckCheck,
  'Pending': RefreshCw
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

const formatPercent = (value) => {
  const num = Number(value);
  if (Number.isNaN(num)) return '0.00';
  return num.toFixed(2);
};

const InvoiceMatching = () => {
  const {
    data: matchingsData = [],
    isLoading: matchingsLoading,
    refetch: refetchMatchings,
  } = useGetInvoiceMatchingQuery();
  const {
    data: pendingMatchingsData = [],
    isLoading: pendingMatchingsLoading,
    refetch: refetchPendingMatchings,
  } = useGetPendingInvoiceMatchingQuery();
  const {
    data: stats = null,
    isLoading: statsLoading,
    refetch: refetchMatchingStats,
  } = useGetInvoiceMatchingStatsQuery();
  const {
    data: invoicesData = [],
    isLoading: invoicesLoading,
    refetch: refetchInvoices,
  } = useGetInvoicesQuery();
  const [getInvoiceMatchingCandidates] = useLazyGetInvoiceMatchingCandidatesQuery();
  const [matchInvoice] = useMatchInvoiceMutation();
  const [resolveInvoiceMatch] = useResolveInvoiceMatchMutation();
  const { guardAction, canPerformAction } = useActionGuard();

  const normalizeMatchType = (value) => {
    if (!value) return 'TWO_WAY';
    const normalized = String(value).toUpperCase();
    if (normalized === 'TWO_WAY' || normalized === '2_WAY') return 'TWO_WAY';
    if (normalized === 'THREE_WAY' || normalized === '3_WAY') return 'THREE_WAY';
    return normalized;
  };

  const normalizeMatchingStatus = (value) => {
    if (!value) return 'Pending';
    const normalized = String(value).toLowerCase();
    if (normalized === 'exception') return 'Exception';
    if (normalized === 'partial_match' || normalized === 'partial match') return 'Partial Match';
    if (normalized === 'mismatch') return 'Mismatch';
    if (normalized === 'matched') return 'Matched';
    if (normalized === 'resolved') return 'Resolved';
    return value;
  };

  const normalizeMatching = (m = {}) => ({
    ...m,
    invoice_id: m.invoice_id ?? m.invoiceId ?? '',
    invoice_number: m.invoice_number ?? m.invoiceNumber ?? '',
    po_id: m.po_id ?? m.poId ?? '',
    po_number: m.po_number ?? m.poNumber ?? '',
    grn_id: m.grn_id ?? m.grnId ?? '',
    grn_number: m.grn_number ?? m.grnNumber ?? '',
    vendor_id: m.vendor_id ?? m.vendorId ?? '',
    vendor_name: m.vendor_name ?? m.vendorName ?? '',
    match_type: normalizeMatchType(m.match_type ?? m.matching_type ?? m.matchingType),
    match_status: normalizeMatchingStatus(m.match_status ?? m.status),
    invoice_amount: Number(m.invoice_amount ?? m.invoiceAmount ?? 0),
    po_amount: Number(m.po_amount ?? m.poAmount ?? 0),
    amount_variance: Number(m.amount_variance ?? m.amountVariance ?? 0),
    amount_variance_pct: Number(m.amount_variance_pct ?? m.variancePercentage ?? 0),
    quantity_variance_pct: Number(m.quantity_variance_pct ?? m.quantityVariancePct ?? 0),
    price_variance_pct: Number(m.price_variance_pct ?? m.priceVariancePct ?? 0),
    exception_reason: m.exception_reason ?? m.exceptionReason ?? '',
  });

  const normalizeInvoice = (inv = {}) => ({
    ...inv,
    invoice_number: inv.invoice_number ?? inv.invoiceNumber ?? '',
    vendor_name: inv.vendor_name ?? inv.vendorName ?? '',
    matching_id: inv.matching_id ?? inv.matchingId ?? '',
    amount: Number(inv.amount ?? 0),
  });

  const matchings = Array.isArray(matchingsData) ? matchingsData.map(normalizeMatching) : [];
  const pendingMatchings = Array.isArray(pendingMatchingsData) ? pendingMatchingsData.map(normalizeMatching) : [];
  const invoices = Array.isArray(invoicesData)
    ? invoicesData.map(normalizeInvoice).filter((inv) => !inv.matching_id)
    : [];
  const loading = matchingsLoading || pendingMatchingsLoading || statsLoading || invoicesLoading;
  const [activeTab, setActiveTab] = useState('all');
  
  // Data State
 
  // Dialog States
  const [showMatchDialog, setShowMatchDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [selectedMatching, setSelectedMatching] = useState(null);
  const [matchCandidates, setMatchCandidates] = useState(null);
  const [matching, setMatching] = useState(false);
  const [resolving, setResolving] = useState(false);
  
  // Match Form
  const [matchForm, setMatchForm] = useState({
    invoice_id: '',
    po_id: '',
    grn_id: '',
    match_type: 'TWO_WAY',
    tolerance: {
      quantity_tolerance_pct: 5,
      price_tolerance_pct: 2,
      amount_tolerance_pct: 5
    }
  });
  
  // Resolve Form
  const [resolveForm, setResolveForm] = useState({
    resolution_notes: '',
    force_approve: false
  });
  const canMatchInvoices = canPerformAction('matching.match');
  const canResolveMatches = canPerformAction('matching.resolve');
  
  // Filter State
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    try {
      await Promise.all([
        refetchMatchings(),
        refetchPendingMatchings(),
        refetchMatchingStats(),
        refetchInvoices(),
      ]);
    } catch (error) {
      console.error('Error refreshing matching data:', error);
      toast.error('Failed to refresh matching data');
    }
  };

  const normalizeMatchCandidates = (data = {}, selectedInvoice = null) => {
    const invoice = data.invoice ?? data.selected_invoice ?? data.selectedInvoice ?? {};
    const poCandidatesRaw =
      data.po_candidates ?? data.poCandidates ?? data.purchase_orders ?? data.purchaseOrders ?? [];
    const grnCandidatesRaw =
      data.grn_candidates ?? data.grnCandidates ?? data.goods_receipt_notes ?? data.goodsReceiptNotes ?? [];

    const poCandidates = Array.isArray(poCandidatesRaw)
      ? poCandidatesRaw.map((po) => ({
          ...po,
          po_id: po.po_id ?? po.poId ?? po.id ?? '',
          po_number: po.po_number ?? po.poNumber ?? '',
          po_date: po.po_date ?? po.poDate,
          po_amount: po.po_amount ?? po.poAmount ?? po.total_amount ?? po.totalAmount ?? 0,
          amount_variance: po.amount_variance ?? po.amountVariance ?? 0,
          variance_pct: po.variance_pct ?? po.variancePct ?? 0,
        }))
      : [];

    const grnCandidates = Array.isArray(grnCandidatesRaw)
      ? grnCandidatesRaw.map((grn) => ({
          ...grn,
          grn_id: grn.grn_id ?? grn.grnId ?? grn.id ?? '',
          grn_number: grn.grn_number ?? grn.grnNumber ?? '',
          po_number: grn.po_number ?? grn.poNumber ?? '',
          receipt_date: grn.receipt_date ?? grn.receiptDate,
        }))
      : [];

    return {
      ...data,
      invoice: {
        ...selectedInvoice,
        ...invoice,
        invoice_number:
          invoice.invoice_number ??
          invoice.invoiceNumber ??
          selectedInvoice?.invoice_number ??
          selectedInvoice?.invoiceNumber ??
          '',
        vendor_name:
          invoice.vendor_name ??
          invoice.vendorName ??
          selectedInvoice?.vendor_name ??
          selectedInvoice?.vendorName ??
          '',
        amount: invoice.amount ?? selectedInvoice?.amount ?? 0,
      },
      po_candidates: poCandidates,
      grn_candidates: grnCandidates,
    };
  };

  const handleSelectInvoice = async (invoiceId) => {
    try {
      const selectedInvoice = invoices.find((inv) => inv.id === invoiceId) ?? null;
      const data = await getInvoiceMatchingCandidates(invoiceId).unwrap();
      const normalizedData = normalizeMatchCandidates(data, selectedInvoice);
      setMatchCandidates(normalizedData);
      setMatchForm((prev) => ({
        ...prev,
        invoice_id: invoiceId,
        po_id: '',
        grn_id: '',
        match_type: 'TWO_WAY',
      }));
    } catch (error) {
      toast.error('Failed to get matching candidates');
    }
  };

  const handlePerformMatch = async () => {
    if (!guardAction('matching.match')) return;
    if (!matchForm.invoice_id || !matchForm.po_id) {
      toast.error('Please select an invoice and a PO');
      return;
    }
    
    if (matchForm.match_type === 'THREE_WAY' && !matchForm.grn_id) {
      toast.error('Please select a GRN for 3-way matching');
      return;
    }
    
    setMatching(true);
    try {
      const payload = {
        invoice_id: matchForm.invoice_id,
        po_id: matchForm.po_id,
        grn_id: matchForm.match_type === 'THREE_WAY' ? matchForm.grn_id : null,
        match_type: matchForm.match_type,
        tolerance: matchForm.tolerance
      };

      const data = await matchInvoice(payload).unwrap();
      toast.success(data?.message || 'Matching completed');
      setShowMatchDialog(false);
      resetMatchForm();
      fetchData();
    } catch (error) {
      toast.error(error?.data?.detail || 'Failed to perform matching');
    } finally {
      setMatching(false);
    }
  };

  const handleResolve = async () => {
    if (!guardAction('matching.resolve')) return;
    if (!selectedMatching || !resolveForm.resolution_notes) {
      toast.error('Please provide resolution notes');
      return;
    }
    
    setResolving(true);
    try {
      const data = await resolveInvoiceMatch({
        id: selectedMatching.id,
        body: resolveForm,
      }).unwrap();
      toast.success(data?.message || 'Matching resolved');
      setShowResolveDialog(false);
      setResolveForm({ resolution_notes: '', force_approve: false });
      fetchData();
    } catch (error) {
      toast.error(error?.data?.detail || 'Failed to resolve matching');
    } finally {
      setResolving(false);
    }
  };

  const resetMatchForm = () => {
    setMatchForm({
      invoice_id: '',
      po_id: '',
      grn_id: '',
      match_type: 'TWO_WAY',
      tolerance: {
        quantity_tolerance_pct: 5,
        price_tolerance_pct: 2,
        amount_tolerance_pct: 5
      }
    });
    setMatchCandidates(null);
  };

  const filteredMatchings = matchings.filter(m => {
    const matchesSearch = 
      String(m.invoice_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(m.po_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(m.vendor_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || m.match_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statsData = stats && typeof stats === 'object' ? stats : {};
  const totalMatchingsCount = Number(
    statsData.total_matchings ?? statsData.totalMatchings ?? statsData.total ?? 0
  );
  const matchedCount = Number(
    statsData.matched?.count ?? statsData.matched_count ?? statsData.matchedCount ?? statsData.matched ?? 0
  );
  const partialMatchCount = Number(
    statsData.partial_match?.count ??
      statsData.partialMatch?.count ??
      statsData.partial_match_count ??
      statsData.partialMatchCount ??
      0
  );
  const mismatchCount = Number(
    statsData.mismatch?.count ??
      statsData.mismatch_count ??
      statsData.mismatchCount ??
      statsData.exceptions ??
      0
  );
  const resolvedCount = Number(
    statsData.resolved?.count ?? statsData.resolved_count ?? statsData.resolvedCount ?? 0
  );
  const twoWayCount = matchings.filter((m) => m.match_type === 'TWO_WAY').length;
  const threeWayCount = matchings.filter((m) => m.match_type === 'THREE_WAY').length;

  const getPerformMatchDisabledReason = () => {
    if (matching) return 'Matching is in progress...';
    if (!matchForm.invoice_id) return 'Select an invoice';
    if (!matchForm.po_id) return 'Select a purchase order';
    if (matchForm.match_type === 'THREE_WAY' && !matchForm.grn_id) return 'Select a GRN for 3-way match';
    return '';
  };
  const performMatchDisabledReason = getPerformMatchDisabledReason();
  const isPerformMatchDisabled = Boolean(performMatchDisabledReason);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="invoice-matching-page">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Invoice Matching</h1>
          <p className="text-muted-foreground">2-way and 3-way invoice matching with POs and GRNs</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowMatchDialog(true)} data-testid="new-match-btn" disabled={!canMatchInvoices}>
            <Link2 className="h-4 w-4 mr-2" />
            New Match
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Matchings</p>
                  <p className="text-2xl font-bold">{totalMatchingsCount}</p>
                </div>
                <Link2 className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Matched</p>
                  <p className="text-2xl font-bold text-green-600">{matchedCount}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Partial Match</p>
                  <p className="text-2xl font-bold text-yellow-600">{partialMatchCount}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Mismatch</p>
                  <p className="text-2xl font-bold text-red-600">{mismatchCount}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Resolved</p>
                  <p className="text-2xl font-bold text-blue-600">{resolvedCount}</p>
                </div>
                <CheckCheck className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Match Type Breakdown */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 max-w-md">
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">2-Way Matches</p>
              <p className="text-xl font-bold">{twoWayCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground">3-Way Matches</p>
              <p className="text-xl font-bold">{threeWayCount}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-all">All Matchings</TabsTrigger>
          <TabsTrigger value="pending" data-testid="tab-pending">
            Needs Attention
            {pendingMatchings.length > 0 && (
              <Badge variant="destructive" className="ml-2">{pendingMatchings.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {/* Search and Filters */}
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoice, PO, or vendor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="search-matching-input"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48" data-testid="status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Matched">Matched</SelectItem>
                <SelectItem value="Partial Match">Partial Match</SelectItem>
                <SelectItem value="Mismatch">Mismatch</SelectItem>
                <SelectItem value="Exception">Exception</SelectItem>
                <SelectItem value="Resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Matchings Table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>PO</TableHead>
                  <TableHead>GRN</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Invoice Amt</TableHead>
                  <TableHead>PO Amt</TableHead>
                  <TableHead>Variance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMatchings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No matching records found. Perform a new match to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMatchings.map((m) => {
                    const StatusIcon = statusIcons[m.match_status] || RefreshCw;
                    return (
                      <TableRow key={m.id} data-testid={`matching-row-${m.id}`}>
                        <TableCell>
                          <div className="font-medium">{m.invoice_number}</div>
                          <div className="text-xs text-muted-foreground">{m.vendor_name}</div>
                        </TableCell>
                        <TableCell>{m.po_number || '-'}</TableCell>
                        <TableCell>{m.grn_number || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {m.match_type === 'TWO_WAY' ? '2-Way' : '3-Way'}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(m.invoice_amount)}</TableCell>
                        <TableCell>{formatCurrency(m.po_amount)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {m.amount_variance > 0 ? (
                              <TrendingUp className="h-3 w-3 text-red-500" />
                            ) : m.amount_variance < 0 ? (
                              <TrendingDown className="h-3 w-3 text-green-500" />
                            ) : null}
                            <span className={m.tolerance_exceeded ? 'text-red-600' : 'text-green-600'}>
                              {formatPercent(m.amount_variance_pct)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${statusColors[m.match_status]} text-white`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {m.match_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedMatching(m);
                                setShowViewDialog(true);
                              }}
                              data-testid={`view-matching-${m.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {(m.match_status === 'Mismatch' || m.match_status === 'Partial Match' || m.match_status === 'Exception') && canResolveMatches && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedMatching(m);
                                  setShowResolveDialog(true);
                                }}
                                data-testid={`resolve-matching-${m.id}`}
                              >
                                <CheckCheck className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Matchings Requiring Attention</CardTitle>
              <CardDescription>Mismatches and partial matches that need review</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>PO</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount Variance</TableHead>
                    <TableHead>Qty Variance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingMatchings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No matchings need attention
                      </TableCell>
                    </TableRow>
                  ) : (
                    pendingMatchings.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>
                          <div className="font-medium">{m.invoice_number}</div>
                          <div className="text-xs text-muted-foreground">{m.vendor_name}</div>
                        </TableCell>
                        <TableCell>{m.po_number}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {m.match_type === 'TWO_WAY' ? '2-Way' : '3-Way'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-red-600 font-medium">
                            {formatCurrency(m.amount_variance)} ({formatPercent(m.amount_variance_pct)}%)
                          </span>
                        </TableCell>
                        <TableCell>{m.quantity_variance_pct}%</TableCell>
                        <TableCell>
                          <Badge className={`${statusColors[m.match_status]} text-white`}>
                            {m.match_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {canResolveMatches && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedMatching(m);
                                setShowResolveDialog(true);
                              }}
                              data-testid={`resolve-pending-${m.id}`}
                            >
                              Resolve
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

      {/* New Match Dialog */}
      <Dialog open={showMatchDialog} onOpenChange={(open) => { if (!open) resetMatchForm(); setShowMatchDialog(open); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Perform Invoice Matching</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Step 1: Select Invoice */}
            <div className="space-y-4">
              <Label className="text-lg font-semibold">Step 1: Select Invoice</Label>
              <Select 
                value={matchForm.invoice_id} 
                onValueChange={handleSelectInvoice}
              >
                <SelectTrigger data-testid="select-invoice">
                  <SelectValue placeholder="Select an invoice to match" />
                </SelectTrigger>
                <SelectContent>
                  {invoices.map(inv => (
                    <SelectItem key={inv.id} value={inv.id}>
                      {inv.invoice_number} - {inv.vendor_name} ({formatCurrency(inv.amount)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Selected Invoice Info */}
            {matchCandidates?.invoice && (
              <Card className="bg-muted">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Invoice Number</p>
                      <p className="font-medium">{matchCandidates.invoice.invoice_number}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Vendor</p>
                      <p className="font-medium">{matchCandidates.invoice.vendor_name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Amount</p>
                      <p className="font-medium">{formatCurrency(matchCandidates.invoice.amount)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 2: Select Match Type */}
            {matchCandidates && (
              <div className="space-y-4">
                <Label className="text-lg font-semibold">Step 2: Select Match Type</Label>
                <div className="grid grid-cols-2 gap-4">
                  <Card 
                    className={`cursor-pointer transition-all ${matchForm.match_type === 'TWO_WAY' ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => setMatchForm(prev => ({ ...prev, match_type: 'TWO_WAY', grn_id: '' }))}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <FileText className="h-6 w-6 text-blue-600" />
                          <ArrowRight className="h-4 w-4 text-blue-600 -mt-1 ml-1" />
                          <ShoppingCart className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold">2-Way Matching</p>
                          <p className="text-xs text-muted-foreground">Invoice vs Purchase Order</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card 
                    className={`cursor-pointer transition-all ${matchForm.match_type === 'THREE_WAY' ? 'ring-2 ring-primary' : ''}`}
                    onClick={() =>
                      setMatchForm((prev) => ({
                        ...prev,
                        match_type: 'THREE_WAY',
                        grn_id: prev.grn_id || '',
                      }))
                    }
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <FileText className="h-5 w-5 text-purple-600" />
                          <ShoppingCart className="h-5 w-5 text-purple-600" />
                          <Package className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-semibold">3-Way Matching</p>
                          <p className="text-xs text-muted-foreground">Invoice vs PO vs GRN</p>
                          {matchForm.match_type === 'THREE_WAY' && matchCandidates.grn_candidates?.length === 0 && (
                            <p className="text-xs text-red-500">No GRNs available</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Step 3: Select PO */}
            {matchCandidates?.po_candidates && (
              <div className="space-y-4">
                <Label className="text-lg font-semibold">Step 3: Select Purchase Order</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead></TableHead>
                      <TableHead>PO Number</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Variance</TableHead>
                      <TableHead>Recommendation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matchCandidates.po_candidates.map((po) => (
                      <TableRow 
                        key={po.po_id}
                        className={`cursor-pointer ${matchForm.po_id === po.po_id ? 'bg-primary/10' : ''}`}
                        onClick={() => setMatchForm(prev => ({ ...prev, po_id: po.po_id }))}
                      >
                        <TableCell>
                          <input 
                            type="radio" 
                            checked={matchForm.po_id === po.po_id}
                            onChange={() => {}}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{po.po_number}</TableCell>
                        <TableCell>{formatDate(po.po_date)}</TableCell>
                        <TableCell>{formatCurrency(po.po_amount)}</TableCell>
                        <TableCell>
                          <span className={po.variance_pct <= 5 ? 'text-green-600' : po.variance_pct <= 15 ? 'text-yellow-600' : 'text-red-600'}>
                            {formatCurrency(po.amount_variance)} ({formatPercent(po.variance_pct)}%)
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={po.recommendation === 'Good Match' ? 'default' : po.recommendation === 'Possible Match' ? 'secondary' : 'destructive'}
                            className={po.recommendation === 'Good Match' ? 'bg-green-500' : ''}
                          >
                            {po.recommendation}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Step 4: Select GRN (for 3-way) */}
            {matchForm.match_type === 'THREE_WAY' && matchCandidates?.grn_candidates && (
              <div className="space-y-4">
                <Label className="text-lg font-semibold">Step 4: Select GRN</Label>
                <Select 
                  value={matchForm.grn_id} 
                  onValueChange={(v) => setMatchForm(prev => ({ ...prev, grn_id: v }))}
                >
                  <SelectTrigger data-testid="select-grn">
                    <SelectValue placeholder="Select a GRN" />
                  </SelectTrigger>
                  <SelectContent>
                    {matchCandidates.grn_candidates.map(grn => (
                      <SelectItem key={grn.grn_id} value={grn.grn_id}>
                        {grn.grn_number} - PO: {grn.po_number} ({formatDate(grn.receipt_date)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Tolerance Settings */}
            {matchForm.po_id && (
              <div className="space-y-4">
                <Label className="text-lg font-semibold">Tolerance Settings</Label>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Quantity Tolerance: {matchForm.tolerance.quantity_tolerance_pct}%</Label>
                    <Slider
                      value={[matchForm.tolerance.quantity_tolerance_pct]}
                      onValueChange={(v) => setMatchForm(prev => ({ 
                        ...prev, 
                        tolerance: { ...prev.tolerance, quantity_tolerance_pct: v[0] }
                      }))}
                      max={20}
                      step={1}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Price Tolerance: {matchForm.tolerance.price_tolerance_pct}%</Label>
                    <Slider
                      value={[matchForm.tolerance.price_tolerance_pct]}
                      onValueChange={(v) => setMatchForm(prev => ({ 
                        ...prev, 
                        tolerance: { ...prev.tolerance, price_tolerance_pct: v[0] }
                      }))}
                      max={10}
                      step={0.5}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Amount Tolerance: {matchForm.tolerance.amount_tolerance_pct}%</Label>
                    <Slider
                      value={[matchForm.tolerance.amount_tolerance_pct]}
                      onValueChange={(v) => setMatchForm(prev => ({ 
                        ...prev, 
                        tolerance: { ...prev.tolerance, amount_tolerance_pct: v[0] }
                      }))}
                      max={20}
                      step={1}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { resetMatchForm(); setShowMatchDialog(false); }}>
              Cancel
            </Button>
            <Button 
              onClick={handlePerformMatch} 
              disabled={isPerformMatchDisabled || !canMatchInvoices}
              data-testid="perform-match-btn"
            >
              {matching && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Link2 className="h-4 w-4 mr-2" />
              Perform {matchForm.match_type === 'TWO_WAY' ? '2-Way' : '3-Way'} Match
            </Button>
          </DialogFooter>
          {isPerformMatchDisabled && (
            <p className="text-xs text-muted-foreground text-right">
              {performMatchDisabledReason}
            </p>
          )}
        </DialogContent>
      </Dialog>

      {/* View Matching Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Matching Details</DialogTitle>
          </DialogHeader>

          {selectedMatching && (
            <div className="space-y-6">
              {/* Status */}
              <div className="flex justify-between items-center">
                <Badge className={`${statusColors[selectedMatching.match_status]} text-white text-base px-4 py-1`}>
                  {selectedMatching.match_status}
                </Badge>
                <Badge variant="outline" className="text-base">
                  {selectedMatching.match_type === 'TWO_WAY' ? '2-Way Match' : '3-Way Match'}
                </Badge>
              </div>

              {/* Matching Summary */}
              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Invoice
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p><span className="text-muted-foreground">Number:</span> {selectedMatching.invoice_number}</p>
                    <p><span className="text-muted-foreground">Vendor:</span> {selectedMatching.vendor_name}</p>
                    <p><span className="text-muted-foreground">Amount:</span> {formatCurrency(selectedMatching.invoice_amount)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4" />
                      Purchase Order
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p><span className="text-muted-foreground">Number:</span> {selectedMatching.po_number}</p>
                    <p><span className="text-muted-foreground">Amount:</span> {formatCurrency(selectedMatching.po_amount)}</p>
                    {selectedMatching.grn_number && (
                      <p><span className="text-muted-foreground">GRN:</span> {selectedMatching.grn_number}</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Variance Details */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Variance Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Amount Variance</p>
                      <p className={`text-2xl font-bold ${selectedMatching.amount_variance_pct > selectedMatching.tolerance_settings?.amount ? 'text-red-600' : 'text-green-600'}`}>
                        {formatPercent(selectedMatching.amount_variance_pct)}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(selectedMatching.amount_variance)}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Quantity Variance</p>
                      <p className={`text-2xl font-bold ${selectedMatching.quantity_variance_pct > selectedMatching.tolerance_settings?.quantity ? 'text-red-600' : 'text-green-600'}`}>
                        {selectedMatching.quantity_variance_pct}%
                      </p>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">Price Variance</p>
                      <p className={`text-2xl font-bold ${selectedMatching.price_variance_pct > selectedMatching.tolerance_settings?.price ? 'text-red-600' : 'text-green-600'}`}>
                        {selectedMatching.price_variance_pct}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Resolution Info */}
              {selectedMatching.resolved_by && (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Resolution</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p><span className="text-muted-foreground">Resolved By:</span> {selectedMatching.resolved_by_name}</p>
                    <p><span className="text-muted-foreground">Date:</span> {formatDate(selectedMatching.resolved_at)}</p>
                    <p><span className="text-muted-foreground">Notes:</span> {selectedMatching.resolution_notes}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>
              Close
            </Button>
            {selectedMatching && canResolveMatches && (selectedMatching.match_status === 'Mismatch' || selectedMatching.match_status === 'Partial Match' || selectedMatching.match_status === 'Exception') && (
              <Button onClick={() => {
                setShowViewDialog(false);
                setShowResolveDialog(true);
              }}>
                Resolve
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve Dialog */}
      <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Matching</DialogTitle>
          </DialogHeader>

          {selectedMatching && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p><strong>Invoice:</strong> {selectedMatching.invoice_number}</p>
                <p><strong>PO:</strong> {selectedMatching.po_number}</p>
                <p><strong>Variance:</strong> {formatCurrency(selectedMatching.amount_variance)} ({formatPercent(selectedMatching.amount_variance_pct)}%)</p>
                <p><strong>Status:</strong> {selectedMatching.match_status}</p>
              </div>

              <div className="space-y-2">
                <Label>Resolution Notes *</Label>
                <Textarea
                  value={resolveForm.resolution_notes}
                  onChange={(e) => setResolveForm(prev => ({ ...prev, resolution_notes: e.target.value }))}
                  placeholder="Explain why this variance is acceptable or what action was taken..."
                  rows={3}
                  data-testid="resolution-notes-input"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="force-approve"
                  checked={resolveForm.force_approve}
                  onChange={(e) => setResolveForm(prev => ({ ...prev, force_approve: e.target.checked }))}
                />
                <Label htmlFor="force-approve">
                  Force approve despite variance (mark as Resolved)
                </Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResolveDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleResolve} 
              disabled={resolving || !resolveForm.resolution_notes || !canResolveMatches}
              data-testid="submit-resolution-btn"
            >
              {resolving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Resolve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InvoiceMatching;

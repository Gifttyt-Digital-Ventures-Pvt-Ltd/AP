import React, { useState } from 'react';
import {
  useGetPurchaseOrdersQuery,
  useGetPendingPurchaseOrderApprovalsQuery,
  useGetVendorsQuery,
  useGetGlAccountsQuery,
  useGetCostCentersQuery,
  useGetHsnSacCodesQuery,
  useSeedMasterDataMutation,
  useCreatePurchaseOrderMutation,
  useSubmitPurchaseOrderMutation,
  useApprovePurchaseOrderMutation,
} from '../Services/apiSlice';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  FileText,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  Trash2,
  Package,
  DollarSign,
  Calendar,
  Building2,
  ArrowLeft,
  Loader2
} from 'lucide-react';

const statusColors = {
  'Draft': 'bg-gray-500',
  'Pending Approval': 'bg-yellow-500',
  'Approved': 'bg-green-500',
  'Partially Received': 'bg-blue-500',
  'Closed': 'bg-slate-600',
  'Cancelled': 'bg-red-500',
  'Rejected': 'bg-red-600'
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

export const PurchaseOrders = () => {
  const {
    data: purchaseOrdersData = [],
    isLoading: purchaseOrdersLoading,
    refetch: refetchPurchaseOrders,
  } = useGetPurchaseOrdersQuery();
  const {
    data: pendingApprovalsData = [],
    isLoading: pendingApprovalsLoading,
    refetch: refetchPendingApprovals,
  } = useGetPendingPurchaseOrderApprovalsQuery();
  const {
    data: vendorsData = [],
    isLoading: vendorsLoading,
    refetch: refetchVendors,
  } = useGetVendorsQuery();
  const {
    data: glAccountsData = [],
    isLoading: glAccountsLoading,
    refetch: refetchGlAccounts,
  } = useGetGlAccountsQuery();
  const {
    data: costCentersData = [],
    isLoading: costCentersLoading,
    refetch: refetchCostCenters,
  } = useGetCostCentersQuery();
  const {
    data: hsnSacCodesData = [],
    isLoading: hsnSacCodesLoading,
    refetch: refetchHsnSacCodes,
  } = useGetHsnSacCodesQuery();
  const [seedMasterDataMutation] = useSeedMasterDataMutation();
  const [createPurchaseOrder] = useCreatePurchaseOrderMutation();
  const [submitPurchaseOrder] = useSubmitPurchaseOrderMutation();
  const [approvePurchaseOrder] = useApprovePurchaseOrderMutation();
  const purchaseOrders = Array.isArray(purchaseOrdersData) ? purchaseOrdersData : [];
  const pendingApprovals = Array.isArray(pendingApprovalsData) ? pendingApprovalsData : [];
  const vendors = Array.isArray(vendorsData) ? vendorsData : [];
  const glAccounts = Array.isArray(glAccountsData) ? glAccountsData : [];
  const costCenters = Array.isArray(costCentersData) ? costCentersData : [];
  const hsnSacCodes = Array.isArray(hsnSacCodesData) ? hsnSacCodesData : [];
  const loading =
    purchaseOrdersLoading ||
    pendingApprovalsLoading ||
    vendorsLoading ||
    glAccountsLoading ||
    costCentersLoading ||
    hsnSacCodesLoading;
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('all');
  
  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [poForm, setPoForm] = useState({
    po_type: 'Standard',
    vendor_id: '',
    po_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: '',
    currency: 'INR',
    shipping_address: '',
    billing_address: '',
    remarks: '',
    line_items: [
      {
        item_description: '',
        hsn_sac_code: '',
        quantity: 1,
        unit_of_measure: 'NOS',
        unit_price: 0,
        gst_rate: 18,
        gl_account_id: '',
        cost_center_id: '',
        remarks: ''
      }
    ]
  });

  const [approvalForm, setApprovalForm] = useState({
    action: 'Approved',
    comments: ''
  });

  const fetchData = async () => {
    try {
      await Promise.all([
        refetchPurchaseOrders(),
        refetchPendingApprovals(),
        refetchVendors(),
        refetchGlAccounts(),
        refetchCostCenters(),
        refetchHsnSacCodes(),
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh purchase orders');
    }
  };

  const seedMasterData = async () => {
    try {
      const data = await seedMasterDataMutation().unwrap();
      toast.success(
        `Master data seeded: ${data?.gl_accounts_created || 0} GL accounts, ${data?.cost_centers_created || 0} cost centers, ${data?.hsn_sac_codes_created || 0} HSN/SAC codes`
      );
      fetchData();
    } catch (error) {
      toast.error(error?.data?.detail || 'Failed to seed master data');
    }
  };

  const handleCreatePO = async () => {
    if (!poForm.vendor_id) {
      toast.error('Please select a vendor');
      return;
    }
    if (poForm.line_items.length === 0 || !poForm.line_items[0].item_description) {
      toast.error('Please add at least one line item');
      return;
    }

    setCreating(true);
    try {
      const data = await createPurchaseOrder(poForm).unwrap();
      toast.success(`Purchase Order ${data?.po?.po_number || ''} created successfully`);
      setShowCreateDialog(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error?.data?.detail || 'Failed to create purchase order');
    } finally {
      setCreating(false);
    }
  };

  const handleSubmitForApproval = async (poId) => {
    setSubmitting(true);
    try {
      await submitPurchaseOrder(poId).unwrap();
      toast.success('Purchase Order submitted for approval');
      setShowViewDialog(false);
      fetchData();
    } catch (error) {
      toast.error(error?.data?.detail || 'Failed to submit for approval');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproval = async () => {
    if (!selectedPO) return;
    
    setSubmitting(true);
    try {
      const data = await approvePurchaseOrder({
        id: selectedPO.id,
        body: approvalForm,
      }).unwrap();
      toast.success(data?.message || 'Approval processed');
      setShowApprovalDialog(false);
      setApprovalForm({ action: 'Approved', comments: '' });
      fetchData();
    } catch (error) {
      toast.error(error?.data?.detail || 'Failed to process approval');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setPoForm({
      po_type: 'Standard',
      vendor_id: '',
      po_date: new Date().toISOString().split('T')[0],
      expected_delivery_date: '',
      currency: 'INR',
      shipping_address: '',
      billing_address: '',
      remarks: '',
      line_items: [
        {
          item_description: '',
          hsn_sac_code: '',
          quantity: 1,
          unit_of_measure: 'NOS',
          unit_price: 0,
          gst_rate: 18,
          gl_account_id: '',
          cost_center_id: '',
          remarks: ''
        }
      ]
    });
  };

  const addLineItem = () => {
    setPoForm(prev => ({
      ...prev,
      line_items: [
        ...prev.line_items,
        {
          item_description: '',
          hsn_sac_code: '',
          quantity: 1,
          unit_of_measure: 'NOS',
          unit_price: 0,
          gst_rate: 18,
          gl_account_id: '',
          cost_center_id: '',
          remarks: ''
        }
      ]
    }));
  };

  const removeLineItem = (index) => {
    if (poForm.line_items.length === 1) return;
    setPoForm(prev => ({
      ...prev,
      line_items: prev.line_items.filter((_, i) => i !== index)
    }));
  };

  const updateLineItem = (index, field, value) => {
    setPoForm(prev => ({
      ...prev,
      line_items: prev.line_items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const calculateLineTotal = (item) => {
    const amount = (item.quantity || 0) * (item.unit_price || 0);
    const gst = amount * (item.gst_rate || 0) / 100;
    return amount + gst;
  };

  const calculatePOTotal = () => {
    return poForm.line_items.reduce((total, item) => total + calculateLineTotal(item), 0);
  };

  const filteredOrders = purchaseOrders.filter(po => {
    const matchesSearch = po.po_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         po.vendor_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || po.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: purchaseOrders.length,
    draft: purchaseOrders.filter(p => p.status === 'Draft').length,
    pending: purchaseOrders.filter(p => p.status === 'Pending Approval').length,
    approved: purchaseOrders.filter(p => p.status === 'Approved').length,
    totalValue: purchaseOrders.reduce((sum, p) => sum + (p.total_amount || 0), 0)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="purchase-orders-page">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Purchase Orders</h1>
          <p className="text-muted-foreground">Manage purchase orders with multi-level approvals</p>
        </div>
        <div className="flex gap-2">
          {glAccounts.length === 0 && (
            <Button variant="outline" onClick={seedMasterData} data-testid="seed-master-btn">
              <Plus className="h-4 w-4 mr-2" />
              Seed Master Data
            </Button>
          )}
          <Button onClick={() => setShowCreateDialog(true)} data-testid="create-po-btn">
            <Plus className="h-4 w-4 mr-2" />
            Create PO
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total POs</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Draft</p>
                <p className="text-2xl font-bold">{stats.draft}</p>
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
                <p className="text-2xl font-bold">{stats.pending}</p>
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
                <p className="text-2xl font-bold">{stats.approved}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-xl font-bold">{formatCurrency(stats.totalValue)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-all-pos">All POs</TabsTrigger>
          <TabsTrigger value="pending" data-testid="tab-pending-approvals">
            Pending Approvals
            {pendingApprovals.length > 0 && (
              <Badge variant="destructive" className="ml-2">{pendingApprovals.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {/* Search and Filters */}
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search PO number or vendor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="search-po-input"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48" data-testid="status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Pending Approval">Pending Approval</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Partially Received">Partially Received</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* PO Table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>PO Date</TableHead>
                  <TableHead>Delivery Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No purchase orders found. Create your first PO to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((po) => (
                    <TableRow key={po.id} data-testid={`po-row-${po.id}`}>
                      <TableCell className="font-medium">{po.po_number}</TableCell>
                      <TableCell>{po.vendor_name || '-'}</TableCell>
                      <TableCell>{formatDate(po.po_date)}</TableCell>
                      <TableCell>{formatDate(po.expected_delivery_date)}</TableCell>
                      <TableCell>{formatCurrency(po.total_amount)}</TableCell>
                      <TableCell>
                        <Badge className={`${statusColors[po.status]} text-white`}>
                          {po.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedPO(po);
                              setShowViewDialog(true);
                            }}
                            data-testid={`view-po-${po.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
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
              <CardTitle>POs Pending Your Approval</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Requester</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Approval Level</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingApprovals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No pending approvals
                      </TableCell>
                    </TableRow>
                  ) : (
                    pendingApprovals.map((po) => (
                      <TableRow key={po.id}>
                        <TableCell className="font-medium">{po.po_number}</TableCell>
                        <TableCell>{po.vendor_name || '-'}</TableCell>
                        <TableCell>{po.requester_name}</TableCell>
                        <TableCell>{formatCurrency(po.total_amount)}</TableCell>
                        <TableCell>
                          <Badge>Level {po.current_approval_level}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedPO(po);
                                setShowViewDialog(true);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedPO(po);
                                setShowApprovalDialog(true);
                              }}
                              data-testid={`approve-po-${po.id}`}
                            >
                              Review
                            </Button>
                          </div>
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

      {/* Create PO Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Purchase Order</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>PO Type</Label>
                <Select 
                  value={poForm.po_type} 
                  onValueChange={(v) => setPoForm(prev => ({ ...prev, po_type: v }))}
                >
                  <SelectTrigger data-testid="po-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Standard">Standard</SelectItem>
                    <SelectItem value="Blanket">Blanket</SelectItem>
                    <SelectItem value="Contract">Contract</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Vendor *</Label>
                <Select 
                  value={poForm.vendor_id} 
                  onValueChange={(v) => setPoForm(prev => ({ ...prev, vendor_id: v }))}
                >
                  <SelectTrigger data-testid="vendor-select">
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>PO Date *</Label>
                <Input
                  type="date"
                  value={poForm.po_date}
                  onChange={(e) => setPoForm(prev => ({ ...prev, po_date: e.target.value }))}
                  data-testid="po-date-input"
                />
              </div>

              <div className="space-y-2">
                <Label>Expected Delivery Date</Label>
                <Input
                  type="date"
                  value={poForm.expected_delivery_date}
                  onChange={(e) => setPoForm(prev => ({ ...prev, expected_delivery_date: e.target.value }))}
                  data-testid="delivery-date-input"
                />
              </div>
            </div>

            {/* Addresses */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Shipping Address</Label>
                <Textarea
                  value={poForm.shipping_address}
                  onChange={(e) => setPoForm(prev => ({ ...prev, shipping_address: e.target.value }))}
                  rows={2}
                  data-testid="shipping-address-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Billing Address</Label>
                <Textarea
                  value={poForm.billing_address}
                  onChange={(e) => setPoForm(prev => ({ ...prev, billing_address: e.target.value }))}
                  rows={2}
                  data-testid="billing-address-input"
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label className="text-lg font-semibold">Line Items</Label>
                <Button variant="outline" size="sm" onClick={addLineItem} data-testid="add-line-item-btn">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Description *</TableHead>
                      <TableHead>HSN/SAC</TableHead>
                      <TableHead className="w-[80px]">Qty</TableHead>
                      <TableHead className="w-[80px]">Unit</TableHead>
                      <TableHead className="w-[100px]">Unit Price</TableHead>
                      <TableHead className="w-[80px]">GST %</TableHead>
                      <TableHead>GL Account</TableHead>
                      <TableHead>Cost Center</TableHead>
                      <TableHead className="w-[100px]">Total</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {poForm.line_items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Input
                            value={item.item_description}
                            onChange={(e) => updateLineItem(idx, 'item_description', e.target.value)}
                            placeholder="Item description"
                            data-testid={`line-item-desc-${idx}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Select 
                            value={item.hsn_sac_code} 
                            onValueChange={(v) => updateLineItem(idx, 'hsn_sac_code', v)}
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              {hsnSacCodes.map(h => (
                                <SelectItem key={h.id} value={h.code}>
                                  {h.code} - {h.description.substring(0, 15)}...
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateLineItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                            min="1"
                            data-testid={`line-item-qty-${idx}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Select 
                            value={item.unit_of_measure} 
                            onValueChange={(v) => updateLineItem(idx, 'unit_of_measure', v)}
                          >
                            <SelectTrigger className="w-[80px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="NOS">NOS</SelectItem>
                              <SelectItem value="KG">KG</SelectItem>
                              <SelectItem value="MTR">MTR</SelectItem>
                              <SelectItem value="PCS">PCS</SelectItem>
                              <SelectItem value="HRS">HRS</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.unit_price}
                            onChange={(e) => updateLineItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                            min="0"
                            data-testid={`line-item-price-${idx}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Select 
                            value={String(item.gst_rate)} 
                            onValueChange={(v) => updateLineItem(idx, 'gst_rate', parseFloat(v))}
                          >
                            <SelectTrigger className="w-[80px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">0%</SelectItem>
                              <SelectItem value="5">5%</SelectItem>
                              <SelectItem value="12">12%</SelectItem>
                              <SelectItem value="18">18%</SelectItem>
                              <SelectItem value="28">28%</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select 
                            value={item.gl_account_id} 
                            onValueChange={(v) => updateLineItem(idx, 'gl_account_id', v)}
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              {glAccounts.map(g => (
                                <SelectItem key={g.id} value={g.id}>
                                  {g.account_code} - {g.account_name.substring(0, 12)}...
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select 
                            value={item.cost_center_id} 
                            onValueChange={(v) => updateLineItem(idx, 'cost_center_id', v)}
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              {costCenters.map(c => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.cost_center_code}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(calculateLineTotal(item))}
                        </TableCell>
                        <TableCell>
                          {poForm.line_items.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeLineItem(idx)}
                              data-testid={`remove-line-item-${idx}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Total */}
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total Amount:</span>
                    <span>{formatCurrency(calculatePOTotal())}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Remarks */}
            <div className="space-y-2">
              <Label>Remarks</Label>
              <Textarea
                value={poForm.remarks}
                onChange={(e) => setPoForm(prev => ({ ...prev, remarks: e.target.value }))}
                rows={2}
                placeholder="Additional notes or comments"
                data-testid="po-remarks-input"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePO} disabled={creating} data-testid="submit-po-btn">
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Purchase Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View PO Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Purchase Order: {selectedPO?.po_number}
            </DialogTitle>
          </DialogHeader>

          {selectedPO && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={`${statusColors[selectedPO.status]} text-white mt-1`}>
                    {selectedPO.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">PO Type</p>
                  <p className="font-medium">{selectedPO.po_type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">PO Date</p>
                  <p className="font-medium">{formatDate(selectedPO.po_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Delivery Date</p>
                  <p className="font-medium">{formatDate(selectedPO.expected_delivery_date)}</p>
                </div>
              </div>

              {/* Vendor Info */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Vendor Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-3">
                  <p className="font-medium">{selectedPO.vendor_name}</p>
                </CardContent>
              </Card>

              {/* Line Items */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Line Items
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>HSN/SAC</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Tax</TableHead>
                        <TableHead>Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPO.line_items?.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{item.line_number}</TableCell>
                          <TableCell>{item.item_description}</TableCell>
                          <TableCell>{item.hsn_sac_code || '-'}</TableCell>
                          <TableCell>{item.quantity} {item.unit_of_measure}</TableCell>
                          <TableCell>{formatCurrency(item.unit_price)}</TableCell>
                          <TableCell>{formatCurrency(item.igst_amount || 0)}</TableCell>
                          <TableCell className="font-medium">{formatCurrency(item.line_amount + (item.igst_amount || 0))}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Summary */}
              <div className="flex justify-end">
                <div className="w-72 space-y-2 border rounded-lg p-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span>{formatCurrency(selectedPO.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax:</span>
                    <span>{formatCurrency(selectedPO.tax_amount)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span>{formatCurrency(selectedPO.total_amount)}</span>
                  </div>
                </div>
              </div>

              {/* Approval History */}
              {selectedPO.approvals?.length > 0 && (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Approval History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {selectedPO.approvals.map((approval, idx) => (
                        <div key={idx} className="flex items-center gap-4 text-sm">
                          {approval.action === 'Approved' ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          <span className="font-medium">Level {approval.approval_level}</span>
                          <span>{approval.approver_name}</span>
                          <Badge variant={approval.action === 'Approved' ? 'default' : 'destructive'}>
                            {approval.action}
                          </Badge>
                          {approval.comments && <span className="text-muted-foreground">"{approval.comments}"</span>}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>
              Close
            </Button>
            {selectedPO?.status === 'Draft' && (
              <Button 
                onClick={() => handleSubmitForApproval(selectedPO.id)} 
                disabled={submitting}
                data-testid="submit-for-approval-btn"
              >
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Send className="h-4 w-4 mr-2" />
                Submit for Approval
              </Button>
            )}
            {selectedPO?.status === 'Pending Approval' && (
              <Button 
                onClick={() => {
                  setShowViewDialog(false);
                  setShowApprovalDialog(true);
                }}
                data-testid="review-po-btn"
              >
                Review & Approve
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Purchase Order</DialogTitle>
          </DialogHeader>
          
          {selectedPO && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p><strong>PO Number:</strong> {selectedPO.po_number}</p>
                <p><strong>Vendor:</strong> {selectedPO.vendor_name}</p>
                <p><strong>Amount:</strong> {formatCurrency(selectedPO.total_amount)}</p>
                <p><strong>Current Level:</strong> {selectedPO.current_approval_level}</p>
              </div>

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
                    <SelectItem value="Sent Back">Send Back for Revision</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Comments</Label>
                <Textarea
                  value={approvalForm.comments}
                  onChange={(e) => setApprovalForm(prev => ({ ...prev, comments: e.target.value }))}
                  placeholder="Add your comments..."
                  data-testid="approval-comments-input"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleApproval} 
              disabled={submitting}
              variant={approvalForm.action === 'Rejected' ? 'destructive' : 'default'}
              data-testid="confirm-approval-btn"
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {approvalForm.action === 'Approved' && <CheckCircle className="h-4 w-4 mr-2" />}
              {approvalForm.action === 'Rejected' && <XCircle className="h-4 w-4 mr-2" />}
              {approvalForm.action}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PurchaseOrders;


import React, { useState } from 'react';
import {
  useGetGrnsQuery,
  useGetPurchaseOrdersQuery,
  useLazyGetPurchaseOrderByIdQuery,
  useCreateGrnMutation,
  usePostGrnMutation,
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
  Eye,
  CheckCircle,
  Clock,
  Package,
  Truck,
  FileCheck,
  Loader2,
  ClipboardCheck
} from 'lucide-react';

const statusColors = {
  'Draft': 'bg-gray-500',
  'Posted': 'bg-green-500',
  'Cancelled': 'bg-red-500'
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

export const GoodsReceipt = () => {
  const {
    data: grnsData = [],
    isLoading: grnsLoading,
    refetch: refetchGrns,
  } = useGetGrnsQuery();
  const {
    data: approvedPOsData = [],
    isLoading: approvedPOsLoading,
    refetch: refetchApprovedPOs,
  } = useGetPurchaseOrdersQuery({ status: 'Approved' });
  const {
    data: partialPOsData = [],
    isLoading: partialPOsLoading,
    refetch: refetchPartialPOs,
  } = useGetPurchaseOrdersQuery({ status: 'Partially Received' });
  const [getPurchaseOrderById] = useLazyGetPurchaseOrderByIdQuery();
  const [createGrn] = useCreateGrnMutation();
  const [postGrn] = usePostGrnMutation();

  const normalizePoLineItem = (item = {}) => ({
    ...item,
    item_description: item.item_description ?? item.description ?? '',
    unit_of_measure: item.unit_of_measure ?? item.uom ?? '',
    unit_price: item.unit_price ?? item.unitPrice ?? 0,
    gst_rate: item.gst_rate ?? item.gstRate ?? 0,
    tax_amount: item.tax_amount ?? item.taxAmount ?? 0,
    total_amount: item.total_amount ?? item.totalAmount ?? item.amount ?? 0,
    received_quantity: item.received_quantity ?? item.receivedQuantity ?? 0,
    invoiced_quantity: item.invoiced_quantity ?? item.invoicedQuantity ?? 0,
  });

  const normalizePurchaseOrder = (po = {}) => ({
    ...po,
    po_number: po.po_number ?? po.poNumber,
    vendor_id: po.vendor_id ?? po.vendorId,
    vendor_name: po.vendor_name ?? po.vendorName,
    po_date: po.po_date ?? po.poDate,
    expected_delivery_date: po.expected_delivery_date ?? po.expectedDeliveryDate,
    total_amount: po.total_amount ?? po.totalAmount ?? 0,
    tax_amount: po.tax_amount ?? po.taxAmount ?? 0,
    subtotal: po.subtotal ?? 0,
    line_items: Array.isArray(po.line_items)
      ? po.line_items.map(normalizePoLineItem)
      : Array.isArray(po.lineItems)
        ? po.lineItems.map(normalizePoLineItem)
        : [],
  });

  const normalizeGrnLineItem = (item = {}) => ({
    ...item,
    line_number: item.line_number ?? item.lineNumber,
    item_description: item.item_description ?? item.itemDescription ?? item.description ?? '',
    received_quantity: item.received_quantity ?? item.receivedQuantity ?? 0,
    accepted_quantity: item.accepted_quantity ?? item.acceptedQuantity ?? 0,
    rejected_quantity: item.rejected_quantity ?? item.rejectedQuantity ?? 0,
    rejection_reason: item.rejection_reason ?? item.rejectionReason ?? '',
    line_amount: item.line_amount ?? item.lineAmount ?? item.amount ?? 0,
  });

  const normalizeGrn = (grn = {}) => ({
    ...grn,
    grn_number: grn.grn_number ?? grn.grnNumber,
    po_id: grn.po_id ?? grn.poId,
    po_number: grn.po_number ?? grn.poNumber,
    vendor_id: grn.vendor_id ?? grn.vendorId,
    vendor_name: grn.vendor_name ?? grn.vendorName,
    receipt_date: grn.receipt_date ?? grn.receiptDate,
    line_items: Array.isArray(grn.line_items)
      ? grn.line_items.map(normalizeGrnLineItem)
      : Array.isArray(grn.lineItems)
        ? grn.lineItems.map(normalizeGrnLineItem)
        : [],
    total_received_value: grn.total_received_value ?? grn.totalReceivedValue ?? 0,
    delivery_note_number: grn.delivery_note_number ?? grn.deliveryNoteNumber ?? '',
    received_by: grn.received_by ?? grn.receivedBy ?? '',
    received_by_name: grn.received_by_name ?? grn.receivedByName ?? '',
    created_at: grn.created_at ?? grn.createdAt,
    created_by_name: grn.created_by_name ?? grn.createdByName ?? '',
  });

  const grns = Array.isArray(grnsData) ? grnsData.map(normalizeGrn) : [];
  const purchaseOrders = [
    ...(Array.isArray(approvedPOsData) ? approvedPOsData : []),
    ...(Array.isArray(partialPOsData) ? partialPOsData : []),
  ].map(normalizePurchaseOrder);
  const [selectedPO, setSelectedPO] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('all');
  
  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showSelectPODialog, setShowSelectPODialog] = useState(false);
  const [selectedGRN, setSelectedGRN] = useState(null);
  const [creating, setCreating] = useState(false);
  const [posting, setPosting] = useState(false);

  const loading =
    grnsLoading || approvedPOsLoading || partialPOsLoading;
  // Form state
  const [grnForm, setGrnForm] = useState({
    po_id: '',
    receipt_date: new Date().toISOString().split('T')[0],
    delivery_note_number: '',
    transporter_name: '',
    vehicle_number: '',
    remarks: '',
    line_items: []
  });

  const fetchData = async () => {
    try {
      await Promise.all([
        refetchGrns(),
        refetchApprovedPOs(),
        refetchPartialPOs(),
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh goods receipts');
    }
  };

  const handleSelectPO = async (poId) => {
    try {
      const poResponse = await getPurchaseOrderById(poId).unwrap();
      const po = normalizePurchaseOrder(poResponse);
      setSelectedPO(po);
      
      // Initialize line items from PO
      const lineItems = po.line_items.map((item) => ({
        po_line_item_id: item.id,
        item_description: item.item_description,
        ordered_quantity: item.quantity,
        already_received: item.received_quantity || 0,
        pending_quantity: item.quantity - (item.received_quantity || 0),
        received_quantity: 0,
        accepted_quantity: 0,
        rejected_quantity: 0,
        rejection_reason: '',
        unit_price: item.unit_price
      }));

      setGrnForm(prev => ({
        ...prev,
        po_id: poId,
        line_items: lineItems
      }));
      
      setShowSelectPODialog(false);
      setShowCreateDialog(true);
    } catch (error) {
      toast.error('Failed to load PO details');
    }
  };

  const handleCreateGRN = async () => {
    if (!grnForm.po_id) {
      toast.error('Please select a purchase order');
      return;
    }
    
    const hasItems = grnForm.line_items.some(item => item.received_quantity > 0);
    if (!hasItems) {
      toast.error('Please enter received quantity for at least one item');
      return;
    }

    // Validate quantities
    for (const item of grnForm.line_items) {
      if (item.accepted_quantity + item.rejected_quantity !== item.received_quantity) {
        toast.error(`Accepted + Rejected must equal Received quantity for ${item.item_description}`);
        return;
      }
    }

    setCreating(true);
    try {
      const payload = {
        po_id: grnForm.po_id,
        receipt_date: grnForm.receipt_date,
        delivery_note_number: grnForm.delivery_note_number,
        transporter_name: grnForm.transporter_name,
        vehicle_number: grnForm.vehicle_number,
        remarks: grnForm.remarks,
        line_items: grnForm.line_items
          .filter(item => item.received_quantity > 0)
          .map(item => ({
            po_line_item_id: item.po_line_item_id,
            received_quantity: item.received_quantity,
            accepted_quantity: item.accepted_quantity,
            rejected_quantity: item.rejected_quantity,
            rejection_reason: item.rejection_reason
          }))
      };

      const data = await createGrn(payload).unwrap();
      toast.success(`GRN ${data?.grn?.grn_number || ''} created successfully`);
      setShowCreateDialog(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error?.data?.detail || 'Failed to create GRN');
    } finally {
      setCreating(false);
    }
  };

  const handlePostGRN = async (grnId) => {
    setPosting(true);
    try {
      const data = await postGrn(grnId).unwrap();
      toast.success(data?.message || 'GRN posted successfully');
      setShowViewDialog(false);
      fetchData();
    } catch (error) {
      toast.error(error?.data?.detail || 'Failed to post GRN');
    } finally {
      setPosting(false);
    }
  };

  const resetForm = () => {
    setGrnForm({
      po_id: '',
      receipt_date: new Date().toISOString().split('T')[0],
      delivery_note_number: '',
      transporter_name: '',
      vehicle_number: '',
      remarks: '',
      line_items: []
    });
    setSelectedPO(null);
  };

  const updateLineItem = (index, field, value) => {
    setGrnForm(prev => {
      const newItems = [...prev.line_items];
      newItems[index] = { ...newItems[index], [field]: value };
      
      // Auto-calculate accepted quantity
      if (field === 'received_quantity') {
        newItems[index].accepted_quantity = value;
        newItems[index].rejected_quantity = 0;
      }
      if (field === 'rejected_quantity') {
        newItems[index].accepted_quantity = (newItems[index].received_quantity || 0) - (value || 0);
      }
      
      return { ...prev, line_items: newItems };
    });
  };

  const filteredGrns = grns.filter(grn => {
    const matchesSearch = grn.grn_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         grn.po_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         grn.vendor_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || grn.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: grns.length,
    draft: grns.filter(g => g.status === 'Draft').length,
    posted: grns.filter(g => g.status === 'Posted').length,
    pendingPOs: purchaseOrders.length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="goods-receipt-page">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Goods Receipt Notes</h1>
          <p className="text-muted-foreground">Record receipt of goods against purchase orders</p>
        </div>
        <Button 
          onClick={() => setShowSelectPODialog(true)} 
          disabled={purchaseOrders.length === 0}
          data-testid="create-grn-btn"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create GRN
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total GRNs</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <ClipboardCheck className="h-8 w-8 text-muted-foreground" />
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
                <p className="text-sm text-muted-foreground">Posted</p>
                <p className="text-2xl font-bold">{stats.posted}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">POs Pending Receipt</p>
                <p className="text-2xl font-bold">{stats.pendingPOs}</p>
              </div>
              <Package className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search GRN or PO number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="search-grn-input"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48" data-testid="status-filter">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Draft">Draft</SelectItem>
            <SelectItem value="Posted">Posted</SelectItem>
            <SelectItem value="Cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* GRN Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>GRN Number</TableHead>
              <TableHead>PO Number</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Receipt Date</TableHead>
              <TableHead>Delivery Note</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredGrns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No goods receipts found. Create a GRN to record goods received against a PO.
                </TableCell>
              </TableRow>
            ) : (
              filteredGrns.map((grn) => (
                <TableRow key={grn.id} data-testid={`grn-row-${grn.id}`}>
                  <TableCell className="font-medium">{grn.grn_number}</TableCell>
                  <TableCell>{grn.po_number || '-'}</TableCell>
                  <TableCell>{grn.vendor_name || '-'}</TableCell>
                  <TableCell>{formatDate(grn.receipt_date)}</TableCell>
                  <TableCell>{grn.delivery_note_number || '-'}</TableCell>
                  <TableCell>
                    <Badge className={`${statusColors[grn.status]} text-white`}>
                      {grn.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedGRN(grn);
                        setShowViewDialog(true);
                      }}
                      data-testid={`view-grn-${grn.id}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Select PO Dialog */}
      <Dialog open={showSelectPODialog} onOpenChange={setShowSelectPODialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Select Purchase Order</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {purchaseOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p>No approved purchase orders available for goods receipt.</p>
                <p className="text-sm">POs must be approved before creating a GRN.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseOrders.map((po) => (
                    <TableRow key={po.id}>
                      <TableCell className="font-medium">{po.po_number}</TableCell>
                      <TableCell>{po.vendor_name}</TableCell>
                      <TableCell>{formatCurrency(po.total_amount)}</TableCell>
                      <TableCell>
                        <Badge className={`${statusColors[po.status] || 'bg-blue-500'} text-white`}>
                          {po.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => handleSelectPO(po.id)}
                          data-testid={`select-po-${po.id}`}
                        >
                          Select
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSelectPODialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create GRN Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Goods Receipt Note</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* PO Info */}
            {selectedPO && (
              <Card className="bg-muted">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">PO Number</p>
                      <p className="font-medium">{selectedPO.po_number}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Vendor</p>
                      <p className="font-medium">{selectedPO.vendor_name}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">PO Date</p>
                      <p className="font-medium">{formatDate(selectedPO.po_date)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Amount</p>
                      <p className="font-medium">{formatCurrency(selectedPO.total_amount)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* GRN Details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Receipt Date *</Label>
                <Input
                  type="date"
                  value={grnForm.receipt_date}
                  onChange={(e) => setGrnForm(prev => ({ ...prev, receipt_date: e.target.value }))}
                  data-testid="receipt-date-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Delivery Note Number</Label>
                <Input
                  value={grnForm.delivery_note_number}
                  onChange={(e) => setGrnForm(prev => ({ ...prev, delivery_note_number: e.target.value }))}
                  placeholder="DN-001"
                  data-testid="delivery-note-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Transporter Name</Label>
                <Input
                  value={grnForm.transporter_name}
                  onChange={(e) => setGrnForm(prev => ({ ...prev, transporter_name: e.target.value }))}
                  placeholder="Transport Co."
                  data-testid="transporter-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Vehicle Number</Label>
                <Input
                  value={grnForm.vehicle_number}
                  onChange={(e) => setGrnForm(prev => ({ ...prev, vehicle_number: e.target.value }))}
                  placeholder="MH-12-AB-1234"
                  data-testid="vehicle-input"
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-4">
              <Label className="text-lg font-semibold">Items to Receive</Label>
              
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Description</TableHead>
                      <TableHead className="w-[100px]">Ordered</TableHead>
                      <TableHead className="w-[100px]">Already Rcvd</TableHead>
                      <TableHead className="w-[100px]">Pending</TableHead>
                      <TableHead className="w-[100px]">Receiving *</TableHead>
                      <TableHead className="w-[100px]">Accepted</TableHead>
                      <TableHead className="w-[100px]">Rejected</TableHead>
                      <TableHead className="min-w-[150px]">Rejection Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grnForm.line_items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{item.item_description}</TableCell>
                        <TableCell>{item.ordered_quantity}</TableCell>
                        <TableCell>{item.already_received}</TableCell>
                        <TableCell className="text-yellow-600 font-medium">{item.pending_quantity}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.received_quantity}
                            onChange={(e) => updateLineItem(idx, 'received_quantity', parseFloat(e.target.value) || 0)}
                            min="0"
                            max={item.pending_quantity}
                            className="w-20"
                            data-testid={`received-qty-${idx}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.accepted_quantity}
                            onChange={(e) => updateLineItem(idx, 'accepted_quantity', parseFloat(e.target.value) || 0)}
                            min="0"
                            max={item.received_quantity}
                            className="w-20"
                            disabled
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.rejected_quantity}
                            onChange={(e) => updateLineItem(idx, 'rejected_quantity', parseFloat(e.target.value) || 0)}
                            min="0"
                            max={item.received_quantity}
                            className="w-20"
                            data-testid={`rejected-qty-${idx}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.rejection_reason}
                            onChange={(e) => updateLineItem(idx, 'rejection_reason', e.target.value)}
                            placeholder="Reason..."
                            disabled={item.rejected_quantity === 0}
                            data-testid={`rejection-reason-${idx}`}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Remarks */}
            <div className="space-y-2">
              <Label>Remarks</Label>
              <Textarea
                value={grnForm.remarks}
                onChange={(e) => setGrnForm(prev => ({ ...prev, remarks: e.target.value }))}
                rows={2}
                placeholder="Additional notes about this receipt"
                data-testid="grn-remarks-input"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreateDialog(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleCreateGRN} disabled={creating} data-testid="submit-grn-btn">
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create GRN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View GRN Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Goods Receipt Note: {selectedGRN?.grn_number}
            </DialogTitle>
          </DialogHeader>

          {selectedGRN && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={`${statusColors[selectedGRN.status]} text-white mt-1`}>
                    {selectedGRN.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">PO Number</p>
                  <p className="font-medium">{selectedGRN.po_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Receipt Date</p>
                  <p className="font-medium">{formatDate(selectedGRN.receipt_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vendor</p>
                  <p className="font-medium">{selectedGRN.vendor_name}</p>
                </div>
              </div>

              {/* Delivery Info */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Truck className="h-4 w-4" />
                    Delivery Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-3">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Delivery Note</p>
                      <p className="font-medium">{selectedGRN.delivery_note_number || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Transporter</p>
                      <p className="font-medium">{selectedGRN.transporter_name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Vehicle</p>
                      <p className="font-medium">{selectedGRN.vehicle_number || '-'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Line Items */}
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Received Items
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Received</TableHead>
                        <TableHead>Accepted</TableHead>
                        <TableHead>Rejected</TableHead>
                        <TableHead>Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedGRN.line_items?.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{item.line_number ?? idx + 1}</TableCell>
                          <TableCell>{item.item_description || '-'}</TableCell>
                          <TableCell>{item.received_quantity}</TableCell>
                          <TableCell className="text-green-600">{item.accepted_quantity}</TableCell>
                          <TableCell className="text-red-600">
                            {item.rejected_quantity}
                            {item.rejection_reason && (
                              <span className="text-xs text-muted-foreground ml-1">
                                ({item.rejection_reason})
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{formatCurrency(item.line_amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Remarks */}
              {selectedGRN.remarks && (
                <div>
                  <Label className="text-sm text-muted-foreground">Remarks</Label>
                  <p className="mt-1">{selectedGRN.remarks}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewDialog(false)}>
              Close
            </Button>
            {selectedGRN?.status === 'Draft' && (
              <Button 
                onClick={() => handlePostGRN(selectedGRN.id)} 
                disabled={posting}
                data-testid="post-grn-btn"
              >
                {posting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <FileCheck className="h-4 w-4 mr-2" />
                Post GRN
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GoodsReceipt;


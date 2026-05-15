import React, { useState } from 'react';
import { useGetVendorsQuery } from '../../Services/apis/invoicesVendorsApi';
import {
  useGetPurchaseOrdersQuery,
  useGetPendingPurchaseOrderApprovalsQuery,
  useLazyGetPurchaseOrderDownloadUrlQuery,
  useSavePurchaseOrderDraftMutation,
  useCreatePurchaseOrderMutation,
  useSubmitPurchaseOrderMutation,
  useApprovePurchaseOrderMutation,
} from '../../Services/apis/purchaseOrdersMasterDataApi';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { statusColors } from './constants';
import {
  formatCurrency,
  formatDate,
  normalizePurchaseOrder,
} from './utils';
import PurchaseOrdersToolbar from './components/PurchaseOrdersToolbar';
import PoListTable from './components/PoListTable';
import PoFormDialog from './components/PoFormDialog';
import PoDetailsDialog from './components/PoDetailsDialog';
import PoApprovalDialog from './components/PoApprovalDialog';
import { useActionGuard } from '../../hooks/useActionGuard';

const getListData = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.content)) return response.content;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.items)) return response.items;
  return [];
};

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? '';

const PurchaseOrdersPage = () => {
  const { guardAction, canPerformAction } = useActionGuard();
  const canManagePo = canPerformAction('po.create');
  const canApprovePo = canPerformAction('po.approve');
  const {
    data: purchaseOrdersData = [],
    isLoading: purchaseOrdersLoading,
    refetch: refetchPurchaseOrders,
  } = useGetPurchaseOrdersQuery();
  const {
    data: pendingApprovalsData = [],
    isLoading: pendingApprovalsLoading,
    refetch: refetchPendingApprovals,
  } = useGetPendingPurchaseOrderApprovalsQuery(undefined, { skip: !canApprovePo });
  const {
    data: vendorsData = [],
    isLoading: vendorsLoading,
    refetch: refetchVendors,
  } = useGetVendorsQuery();
  const [getPurchaseOrderDownloadUrl] = useLazyGetPurchaseOrderDownloadUrlQuery();
  const [savePurchaseOrderDraft] = useSavePurchaseOrderDraftMutation();
  const [createPurchaseOrder] = useCreatePurchaseOrderMutation();
  const [submitPurchaseOrder] = useSubmitPurchaseOrderMutation();
  const [approvePurchaseOrder] = useApprovePurchaseOrderMutation();
  const purchaseOrders = getListData(purchaseOrdersData).map(normalizePurchaseOrder);
  const pendingApprovals = getListData(pendingApprovalsData).map(normalizePurchaseOrder);
  const vendors = Array.isArray(vendorsData) ? vendorsData : [];
  const loading =
    purchaseOrdersLoading ||
    pendingApprovalsLoading ||
    vendorsLoading;
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('all');
  
  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [createAction, setCreateAction] = useState(null);
  const [downloadingPoId, setDownloadingPoId] = useState(null);
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
      const requests = [
        refetchPurchaseOrders(),
        refetchVendors(),
      ];
      if (canApprovePo) {
        requests.push(refetchPendingApprovals());
      }
      await Promise.all(requests);
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh purchase orders');
    }
  };

  const getCreatedPo = (response) => response?.po || response?.purchaseOrder || response;

  const getPoId = (po) => po?.id || po?.po_id || po?.poId;

  const getDownloadUrl = (response) =>
    response?.url ||
    response?.downloadUrl ||
    response?.download_url ||
    response?.documentUrl ||
    response?.document_url ||
    response?.fileUrl ||
    response?.file_url;

  const normalizeDownloadUrl = (url) => {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    const baseUrl = BACKEND_URL || window.location.origin;
    return new URL(url, baseUrl).toString();
  };

  const handleCreatePO = async ({ submitForApproval = false } = {}) => {
    if (!guardAction('po.create')) return;
    if (submitForApproval && !guardAction('po.submit')) return;
    if (!poForm.vendor_id) {
      toast.error('Please select a vendor');
      return;
    }
    if (poForm.line_items.length === 0 || !poForm.line_items[0].item_description) {
      toast.error('Please add at least one line item');
      return;
    }

    setCreateAction(submitForApproval ? 'submit' : 'draft');
    try {
      const payload = {
        ...poForm,
        line_items: poForm.line_items.map((item) => ({
          item_description: item.item_description,
          hsn_sac_code: item.hsn_sac_code,
          quantity: Number(item.quantity) || 0,
          unit_of_measure: item.unit_of_measure,
          unit_price: Number(item.unit_price) || 0,
          gst_rate: Number(item.gst_rate) || 0,
          remarks: item.remarks || '',
        })),
      };
      const data = submitForApproval
        ? await createPurchaseOrder(payload).unwrap()
        : await savePurchaseOrderDraft(payload).unwrap();
      const createdPo = getCreatedPo(data);
      const createdPoId = getPoId(createdPo);

      if (submitForApproval) {
        if (!createdPoId) {
          toast.error('Purchase order was created, but could not be submitted because the PO id was missing');
          fetchData();
          return;
        }

        await submitPurchaseOrder(createdPoId).unwrap();
        toast.success(`Purchase Order ${createdPo?.po_number || createdPo?.poNumber || ''} submitted for approval`);
      } else {
        toast.success(`Purchase Order ${createdPo?.po_number || createdPo?.poNumber || ''} saved as draft`);
      }

      setShowCreateDialog(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error?.data?.detail || error?.data?.message || 'Failed to save purchase order');
    } finally {
      setCreateAction(null);
    }
  };

  const handleDownloadPO = async (po) => {
    const poId = getPoId(po);
    if (!poId) {
      toast.error('Purchase order id is missing');
      return;
    }

    setDownloadingPoId(poId);
    try {
      const data = await getPurchaseOrderDownloadUrl(poId).unwrap();
      const downloadUrl = getDownloadUrl(data);

      if (!downloadUrl) {
        toast.error('Download URL was not returned for this purchase order');
        return;
      }

      window.open(normalizeDownloadUrl(downloadUrl), '_blank', 'noopener,noreferrer');
    } catch (error) {
      toast.error(error?.data?.detail || error?.data?.message || 'Failed to get purchase order download link');
    } finally {
      setDownloadingPoId(null);
    }
  };

  const handleSubmitForApproval = async (poId) => {
    if (!guardAction('po.submit')) return;
    setSubmitting(true);
    try {
      await submitPurchaseOrder(poId).unwrap();
      toast.success('Purchase Order submitted for approval');
      setShowViewDialog(false);
      fetchData();
    } catch (error) {
      toast.error(error?.data?.detail || error?.data?.message || 'Failed to submit for approval');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproval = async () => {
    if (!guardAction('po.approve')) return;
    if (!selectedPO) return;
    
    setSubmitting(true);
    try {
      const data = await approvePurchaseOrder({
        id: selectedPO.id,
        body: approvalForm,
      }).unwrap();
      toast.success(data?.message || 'Approval processed');
      setShowApprovalDialog(false);
      setSelectedPO(null);
      setApprovalForm({ action: 'Approved', comments: '' });
      fetchData();
    } catch (error) {
      toast.error(error?.data?.detail || error?.data?.message || 'Failed to process approval');
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
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="purchase-orders-page">
      <PurchaseOrdersToolbar
        setShowCreateDialog={setShowCreateDialog}
        stats={stats}
        formatCurrency={formatCurrency}
        canManagePo={canManagePo}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-all-pos">All POs</TabsTrigger>
          {canApprovePo && (
            <TabsTrigger value="pending" data-testid="tab-pending-approvals">
              Pending Approvals
              {pendingApprovals.length > 0 && (
                <Badge variant="destructive" className="ml-2">{pendingApprovals.length}</Badge>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        <PoListTable
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          filteredOrders={filteredOrders}
          formatDate={formatDate}
          formatCurrency={formatCurrency}
          statusColors={statusColors}
          setSelectedPO={setSelectedPO}
          setShowViewDialog={setShowViewDialog}
          pendingApprovals={pendingApprovals}
          setShowApprovalDialog={setShowApprovalDialog}
          canApprovePo={canApprovePo}
        />
      </Tabs>

      <PoFormDialog
        showCreateDialog={showCreateDialog}
        setShowCreateDialog={setShowCreateDialog}
        poForm={poForm}
        setPoForm={setPoForm}
        vendors={vendors}
        addLineItem={addLineItem}
        updateLineItem={updateLineItem}
        removeLineItem={removeLineItem}
        formatCurrency={formatCurrency}
        calculateLineTotal={calculateLineTotal}
        calculatePOTotal={calculatePOTotal}
        handleCreatePO={handleCreatePO}
        createAction={createAction}
      />

      <PoDetailsDialog
        showViewDialog={showViewDialog}
        setShowViewDialog={setShowViewDialog}
        selectedPO={selectedPO}
        statusColors={statusColors}
        formatDate={formatDate}
        formatCurrency={formatCurrency}
        handleSubmitForApproval={handleSubmitForApproval}
        handleDownloadPO={handleDownloadPO}
        downloadingPoId={downloadingPoId}
        submitting={submitting}
        setShowApprovalDialog={setShowApprovalDialog}
        canManagePo={canManagePo}
        canApprovePo={canApprovePo}
      />

      <PoApprovalDialog
        showApprovalDialog={showApprovalDialog}
        setShowApprovalDialog={setShowApprovalDialog}
        selectedPO={selectedPO}
        formatCurrency={formatCurrency}
        approvalForm={approvalForm}
        setApprovalForm={setApprovalForm}
        handleApproval={handleApproval}
        submitting={submitting}
        canApprovePo={canApprovePo}
      />
    </div>
  );
};

export default PurchaseOrdersPage;

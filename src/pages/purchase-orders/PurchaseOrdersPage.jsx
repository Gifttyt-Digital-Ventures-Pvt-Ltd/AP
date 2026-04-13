import React, { useState } from 'react';
import { useGetVendorsQuery } from '../../Services/apis/invoicesVendorsApi';
import {
  useGetPurchaseOrdersQuery,
  useGetPendingPurchaseOrderApprovalsQuery,
  useGetGlAccountsQuery,
  useGetCostCentersQuery,
  useGetHsnSacCodesQuery,
  useSeedMasterDataMutation,
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
  normalizeCostCenter,
  normalizeGlAccount,
  normalizeHsnSacCode,
  normalizePurchaseOrder,
  truncateText,
} from './utils';
import PurchaseOrdersToolbar from './components/PurchaseOrdersToolbar';
import PoListTable from './components/PoListTable';
import PoFormDialog from './components/PoFormDialog';
import PoDetailsDialog from './components/PoDetailsDialog';
import PoApprovalDialog from './components/PoApprovalDialog';

const PurchaseOrdersPage = () => {
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
  const purchaseOrders = Array.isArray(purchaseOrdersData)
    ? purchaseOrdersData.map(normalizePurchaseOrder)
    : [];
  const pendingApprovals = Array.isArray(pendingApprovalsData)
    ? pendingApprovalsData.map(normalizePurchaseOrder)
    : [];
  const vendors = Array.isArray(vendorsData) ? vendorsData : [];
  const glAccounts = Array.isArray(glAccountsData) ? glAccountsData.map(normalizeGlAccount) : [];
  const costCenters = Array.isArray(costCentersData) ? costCentersData.map(normalizeCostCenter) : [];
  const hsnSacCodes = Array.isArray(hsnSacCodesData) ? hsnSacCodesData.map(normalizeHsnSacCode) : [];
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
      const payload = {
        ...poForm,
        line_items: poForm.line_items.map((item) => ({
          ...item,
          quantity: Number(item.quantity) || 0,
          unit_price: Number(item.unit_price) || 0,
          gst_rate: Number(item.gst_rate) || 0,
        })),
      };
      const data = await createPurchaseOrder(payload).unwrap();
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
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="purchase-orders-page">
      <PurchaseOrdersToolbar
        glAccounts={glAccounts}
        seedMasterData={seedMasterData}
        setShowCreateDialog={setShowCreateDialog}
        stats={stats}
        formatCurrency={formatCurrency}
      />

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
        hsnSacCodes={hsnSacCodes}
        truncateText={truncateText}
        glAccounts={glAccounts}
        costCenters={costCenters}
        removeLineItem={removeLineItem}
        formatCurrency={formatCurrency}
        calculateLineTotal={calculateLineTotal}
        calculatePOTotal={calculatePOTotal}
        handleCreatePO={handleCreatePO}
        creating={creating}
      />

      <PoDetailsDialog
        showViewDialog={showViewDialog}
        setShowViewDialog={setShowViewDialog}
        selectedPO={selectedPO}
        statusColors={statusColors}
        formatDate={formatDate}
        formatCurrency={formatCurrency}
        handleSubmitForApproval={handleSubmitForApproval}
        submitting={submitting}
        setShowApprovalDialog={setShowApprovalDialog}
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
      />
    </div>
  );
};

export default PurchaseOrdersPage;


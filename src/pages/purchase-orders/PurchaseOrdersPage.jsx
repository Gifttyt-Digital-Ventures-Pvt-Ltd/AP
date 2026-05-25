import React, { useEffect, useState } from 'react';
import { useGetVendorsQuery } from '../../Services/apis/invoicesVendorsApi';
import {
  useGetPurchaseOrdersQuery,
  useGetPendingPurchaseOrderApprovalsQuery,
  useGetPurchaseOrderFormatConfigQuery,
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
  DEFAULT_PO_FORMAT_CONFIG,
  buildDemoPurchaseOrder,
  buildCreatePurchaseOrderPayload,
  formatCurrency,
  formatDate,
  getTaxMode,
  isInrCurrency,
  isFormatFieldEnabled,
  normalizePurchaseOrder,
  sanitizeLineItemForCurrency,
} from './utils';
import PurchaseOrdersToolbar from './components/PurchaseOrdersToolbar';
import PoListTable from './components/PoListTable';
import PoFormDialog from './components/PoFormDialog';
import PoFormatBuilderDialog from './components/PoFormatBuilderDialog';
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
const USE_FAKE_PO_FLOW = true;

const DEMO_VENDORS = [
  { id: "demo-vendor-1", name: "Aarav Industrial Supplies" },
  { id: "demo-vendor-2", name: "BluePeak Technologies" },
  { id: "demo-vendor-3", name: "Nexa Global Exports" },
];

const createEmptyLineItem = (currency = 'INR') =>
  sanitizeLineItemForCurrency(
    {
      item_description: '',
      hsn_sac_code: '',
      quantity: 1,
      unit_of_measure: 'NOS',
      unit_price: 0,
      discount_percent: 0,
      gst_rate: 18,
      remarks: '',
    },
    currency,
  );

const createDefaultPoForm = (defaultCurrency = 'INR', formatId = 'default-format') => ({
  po_format_id: formatId,
  vendor_id: '',
  po_date: new Date().toISOString().split('T')[0],
  valid_till: '',
  expected_delivery_date: '',
  currency: defaultCurrency,
  exchange_rate: '',
  place_of_supply: '',
  shipping_address: '',
  billing_address: '',
  delivery_terms: '',
  freight_terms: '',
  payment_terms: '',
  tds_applicable: false,
  tds_section: '',
  tds_percent: '',
  remarks: '',
  line_items: [createEmptyLineItem(defaultCurrency)],
});

const cloneFormatConfig = (config) => ({
  ...config,
  sections: (config.sections || []).map((section) => ({
    ...section,
    fields: (section.fields || [])
      .filter((field) => field.fieldKey !== 'is_reverse_charge')
      .map((field) => ({ ...field })),
  })),
});

const makeFormatConfig = (config, fallbackId = 'default-format', fallbackName = 'Standard GST Format') => ({
  ...cloneFormatConfig(config),
  id: config.id || fallbackId,
  name: config.name || fallbackName,
});

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
  const { data: formatConfigData } = useGetPurchaseOrderFormatConfigQuery();
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

  const formatConfig = formatConfigData || DEFAULT_PO_FORMAT_CONFIG;
  const apiPurchaseOrders = getListData(purchaseOrdersData).map(normalizePurchaseOrder);
  const apiPendingApprovals = getListData(pendingApprovalsData).map(normalizePurchaseOrder);
  const vendorsFromApi = Array.isArray(vendorsData) ? vendorsData : [];
  const vendors = vendorsFromApi.length > 0 ? vendorsFromApi : DEMO_VENDORS;
  const loading = purchaseOrdersLoading || pendingApprovalsLoading || vendorsLoading;

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showBuilderDialog, setShowBuilderDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [createAction, setCreateAction] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingPoId, setDownloadingPoId] = useState(null);
  const [demoPurchaseOrders, setDemoPurchaseOrders] = useState([]);
  const [approvalForm, setApprovalForm] = useState({ action: 'Approved', comments: '' });
  const [savedFormatConfigs, setSavedFormatConfigs] = useState(() => [makeFormatConfig(formatConfig)]);
  const [activeFormatId, setActiveFormatId] = useState('default-format');
  const [builderDraftConfig, setBuilderDraftConfig] = useState(() => makeFormatConfig(formatConfig));

  const purchaseOrders = [...demoPurchaseOrders, ...apiPurchaseOrders];
  const pendingApprovals = USE_FAKE_PO_FLOW
    ? purchaseOrders.filter((po) => po.status === 'Pending Approval')
    : apiPendingApprovals;
  const activeFormatConfig =
    savedFormatConfigs.find((config) => config.id === activeFormatId) ||
    savedFormatConfigs[0] ||
    makeFormatConfig(DEFAULT_PO_FORMAT_CONFIG);

  const [poForm, setPoForm] = useState(() =>
    createDefaultPoForm(activeFormatConfig.defaultCurrency, activeFormatConfig.id),
  );

  useEffect(() => {
    if (!formatConfigData?.defaultCurrency) return;
    const nextConfig = makeFormatConfig(formatConfigData);
    setSavedFormatConfigs([nextConfig]);
    setActiveFormatId(nextConfig.id);
    setBuilderDraftConfig(makeFormatConfig(nextConfig));
    setPoForm((prev) => {
      const untouched =
        !prev.vendor_id &&
        prev.currency === DEFAULT_PO_FORMAT_CONFIG.defaultCurrency &&
        prev.line_items.length === 1 &&
        !prev.line_items[0]?.item_description;

      return untouched ? createDefaultPoForm(nextConfig.defaultCurrency, nextConfig.id) : prev;
    });
  }, [formatConfigData]);

  const fetchData = async () => {
    try {
      const requests = [refetchPurchaseOrders(), refetchVendors()];
      if (canApprovePo) requests.push(refetchPendingApprovals());
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

  const validatePoForm = () => {
    const selectedFormat = savedFormatConfigs.find((config) => config.id === poForm.po_format_id) || activeFormatConfig;
    const tdsEnabled = isInrCurrency(poForm.currency) && isFormatFieldEnabled(selectedFormat, 'TAX_TOTALS', 'is_tds_applicable');

    if (!poForm.vendor_id) {
      toast.error('Please select a vendor');
      return false;
    }
    if (poForm.line_items.length === 0 || !poForm.line_items[0].item_description) {
      toast.error('Please add at least one line item');
      return false;
    }
    if (!isInrCurrency(poForm.currency) && !Number(poForm.exchange_rate)) {
      toast.error('Exchange rate is required for foreign-currency purchase orders');
      return false;
    }
    if (tdsEnabled && poForm.tds_applicable && !poForm.tds_section) {
      toast.error('Please select the TDS section');
      return false;
    }
    if (tdsEnabled && poForm.tds_applicable && !(Number(poForm.tds_percent) > 0)) {
      toast.error('Please enter the TDS percent');
      return false;
    }
    return true;
  };

  const handleCreatePO = async ({ submitForApproval = false } = {}) => {
    if (!guardAction('po.create')) return;
    if (submitForApproval && !guardAction('po.submit')) return;
    if (!validatePoForm()) return;

    setCreateAction(submitForApproval ? 'submit' : 'draft');
    try {
      const selectedVendor = vendors.find((vendor) => vendor.id === poForm.vendor_id);
      const selectedFormat = savedFormatConfigs.find((config) => config.id === poForm.po_format_id) || activeFormatConfig;
      const payload = buildCreatePurchaseOrderPayload(poForm, selectedFormat);
      let createdPo;

      if (USE_FAKE_PO_FLOW) {
        createdPo = buildDemoPurchaseOrder({
          form: poForm,
          vendor: selectedVendor,
          formatConfig: selectedFormat,
          sequence: demoPurchaseOrders.length + apiPurchaseOrders.length + 1,
          status: submitForApproval ? 'PENDING_APPROVAL' : 'DRAFT',
        });
        setDemoPurchaseOrders((prev) => [createdPo, ...prev]);
      } else {
        const data = submitForApproval
          ? await createPurchaseOrder(payload).unwrap()
          : await savePurchaseOrderDraft(payload).unwrap();
        createdPo = getCreatedPo(data);
        const createdPoId = getPoId(createdPo);
        if (submitForApproval && createdPoId) {
          await submitPurchaseOrder(createdPoId).unwrap();
        }
      }

      toast.success(
        submitForApproval
          ? `Purchase Order ${createdPo?.po_number || createdPo?.poNumber || ''} submitted for approval`
          : `Purchase Order ${createdPo?.po_number || createdPo?.poNumber || ''} saved as draft`,
      );
      setShowCreateDialog(false);
      resetForm();
      if (!USE_FAKE_PO_FLOW) fetchData();
    } catch (error) {
      toast.error(error?.data?.detail || error?.data?.message || 'Failed to save purchase order');
    } finally {
      setCreateAction(null);
    }
  };

  const handleSubmitForApproval = async (poId) => {
    if (!guardAction('po.submit')) return;
    setSubmitting(true);
    try {
      if (USE_FAKE_PO_FLOW) {
        setDemoPurchaseOrders((prev) =>
          prev.map((po) =>
            getPoId(po) === poId ? { ...po, status: 'Pending Approval', current_approval_level: 1 } : po,
          ),
        );
      } else {
        await submitPurchaseOrder(poId).unwrap();
      }
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
      if (USE_FAKE_PO_FLOW) {
        const nextStatus = approvalForm.action === 'Approved' ? 'Issued' : approvalForm.action;
        const approvalRecord = {
          action: approvalForm.action,
          comments: approvalForm.comments,
          approval_level: selectedPO.current_approval_level || 1,
          approver_name: 'Demo Approver',
        };
        setDemoPurchaseOrders((prev) =>
          prev.map((po) =>
            getPoId(po) === getPoId(selectedPO)
              ? {
                  ...po,
                  status: nextStatus,
                  current_approval_level: null,
                  approvals: [...(po.approvals || []), approvalRecord],
                }
              : po,
          ),
        );
      } else {
        await approvePurchaseOrder({ id: getPoId(selectedPO), body: approvalForm }).unwrap();
      }
      toast.success(approvalForm.action === 'Approved' ? 'Purchase Order issued' : `Purchase Order ${approvalForm.action.toLowerCase()}`);
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

  const handleDownloadPO = async (po) => {
    const poId = getPoId(po);
    if (!poId) {
      toast.error('Purchase order id is missing');
      return;
    }
    if (String(poId).startsWith('demo-po-')) {
      toast.info('Demo POs can be viewed here; PDF download will use the backend generator later.');
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

  const resetForm = () => {
    setPoForm(createDefaultPoForm(activeFormatConfig.defaultCurrency, activeFormatConfig.id));
  };

  const openBuilderDialog = (open) => {
    if (open) setBuilderDraftConfig(makeFormatConfig(activeFormatConfig));
    setShowBuilderDialog(open);
  };

  const saveBuilderConfig = () => {
    if (!String(builderDraftConfig.name || '').trim()) {
      toast.error('Please name this PO format');
      return;
    }
    const nextConfig = {
      ...makeFormatConfig(builderDraftConfig),
      name: String(builderDraftConfig.name || '').trim(),
      configVersion: (builderDraftConfig.configVersion || 0) + 1,
    };
    setSavedFormatConfigs((prev) => {
      const exists = prev.some((config) => config.id === nextConfig.id);
      return exists
        ? prev.map((config) => (config.id === nextConfig.id ? nextConfig : config))
        : [...prev, nextConfig];
    });
    setActiveFormatId(nextConfig.id);
    setShowBuilderDialog(false);
    setPoForm((prev) => {
      const untouched = !prev.vendor_id && prev.line_items.length === 1 && !prev.line_items[0]?.item_description;
      return untouched ? createDefaultPoForm(nextConfig.defaultCurrency, nextConfig.id) : prev;
    });
    toast.success(`PO format "${nextConfig.name}" saved for this demo session`);
  };

  const createNewBuilderFormat = () => {
    const id = `demo-format-${Date.now()}`;
    setBuilderDraftConfig({
      ...makeFormatConfig(activeFormatConfig, id, `Format ${savedFormatConfigs.length + 1}`),
      id,
      name: `Format ${savedFormatConfigs.length + 1}`,
      configVersion: 0,
    });
  };

  const selectBuilderFormat = (formatId) => {
    const selectedFormat = savedFormatConfigs.find((config) => config.id === formatId);
    if (!selectedFormat) return;
    setBuilderDraftConfig(makeFormatConfig(selectedFormat));
    setActiveFormatId(selectedFormat.id);
  };

  const deleteBuilderFormat = () => {
    if (savedFormatConfigs.length <= 1) {
      toast.error('At least one PO format is required');
      return;
    }

    const deletingFormatId = builderDraftConfig.id;
    const remainingFormats = savedFormatConfigs.filter((config) => config.id !== deletingFormatId);
    const nextActiveFormat =
      remainingFormats.find((config) => config.id === activeFormatId) ||
      remainingFormats[0];

    setSavedFormatConfigs(remainingFormats);
    setActiveFormatId(nextActiveFormat.id);
    setBuilderDraftConfig(makeFormatConfig(nextActiveFormat));
    setPoForm((prev) => {
      if (prev.po_format_id !== deletingFormatId) return prev;
      return {
        ...prev,
        po_format_id: nextActiveFormat.id,
        currency: nextActiveFormat.defaultCurrency,
      exchange_rate: isInrCurrency(nextActiveFormat.defaultCurrency) ? '' : prev.exchange_rate,
      place_of_supply: isInrCurrency(nextActiveFormat.defaultCurrency) ? prev.place_of_supply : '',
      tds_applicable: isInrCurrency(nextActiveFormat.defaultCurrency) ? prev.tds_applicable : false,
      tds_section: isInrCurrency(nextActiveFormat.defaultCurrency) ? prev.tds_section : '',
      tds_percent: isInrCurrency(nextActiveFormat.defaultCurrency) ? prev.tds_percent : '',
      line_items: prev.line_items.map((item) => sanitizeLineItemForCurrency(item, nextActiveFormat.defaultCurrency)),
    };
  });
    toast.success('PO format deleted for this demo session');
  };

  const applyPoFormat = (formatId) => {
    const selectedFormat = savedFormatConfigs.find((config) => config.id === formatId);
    if (!selectedFormat) return;
    setActiveFormatId(selectedFormat.id);
    setPoForm((prev) => ({
      ...prev,
      po_format_id: selectedFormat.id,
      currency: selectedFormat.defaultCurrency,
      exchange_rate: isInrCurrency(selectedFormat.defaultCurrency) ? '' : prev.exchange_rate,
      place_of_supply: isInrCurrency(selectedFormat.defaultCurrency) ? prev.place_of_supply : '',
      tds_applicable: isInrCurrency(selectedFormat.defaultCurrency) && isFormatFieldEnabled(selectedFormat, 'TAX_TOTALS', 'is_tds_applicable') ? prev.tds_applicable : false,
      tds_section: isInrCurrency(selectedFormat.defaultCurrency) ? prev.tds_section : '',
      tds_percent: isInrCurrency(selectedFormat.defaultCurrency) ? prev.tds_percent : '',
      line_items: prev.line_items.map((item) => sanitizeLineItemForCurrency(item, selectedFormat.defaultCurrency)),
    }));
  };

  const addLineItem = () => {
    setPoForm((prev) => ({
      ...prev,
      line_items: [...prev.line_items, createEmptyLineItem(prev.currency)],
    }));
  };

  const removeLineItem = (index) => {
    if (poForm.line_items.length === 1) return;
    setPoForm((prev) => ({
      ...prev,
      line_items: prev.line_items.filter((_, i) => i !== index),
    }));
  };

  const updateLineItem = (index, field, value) => {
    setPoForm((prev) => ({
      ...prev,
      line_items: prev.line_items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));
  };

  const updatePoCurrency = (currency) => {
    setPoForm((prev) => ({
      ...prev,
      currency,
      exchange_rate: isInrCurrency(currency) ? '' : prev.exchange_rate,
      place_of_supply: isInrCurrency(currency) ? prev.place_of_supply : '',
      tds_applicable: isInrCurrency(currency) ? prev.tds_applicable : false,
      tds_section: isInrCurrency(currency) ? prev.tds_section : '',
      tds_percent: isInrCurrency(currency) ? prev.tds_percent : '',
      line_items: prev.line_items.map((item) => sanitizeLineItemForCurrency(item, currency)),
    }));
  };

  const loadDemoPoSample = () => {
    const currency = poForm.currency || "INR";
    const isInr = isInrCurrency(currency);
    const demoVendor = currency === "INR" ? vendors[0] : vendors[2] || vendors[0];

    setPoForm((prev) => ({
      ...prev,
      vendor_id: demoVendor?.id || "",
      valid_till: "",
      expected_delivery_date: "2026-06-15",
      exchange_rate: isInr ? "" : prev.exchange_rate || "83.2500",
      place_of_supply: isInr ? "MH" : "",
      shipping_address: "Optifii AP Office, Mumbai, Maharashtra",
      billing_address: "Optifii Finance Team, Mumbai, Maharashtra",
      delivery_terms: "Door delivery",
      freight_terms: isInr ? "Included" : "FOB",
      payment_terms: isInr ? "Net 30 days" : "50% advance, 50% on dispatch",
      tds_applicable: false,
      tds_section: "",
      tds_percent: "",
      remarks: isInr ? "Demo INR purchase order with GST preview." : "Demo export-mode purchase order without GST.",
      line_items: [
        sanitizeLineItemForCurrency(
          {
            item_description: "Industrial switch 48-port",
            hsn_sac_code: "851762",
            quantity: 10,
            unit_of_measure: "NOS",
            unit_price: isInr ? 4200 : 125,
            discount_percent: 5,
            gst_rate: 18,
            remarks: "",
          },
          currency,
        ),
        sanitizeLineItemForCurrency(
          {
            item_description: "Installation and commissioning",
            hsn_sac_code: "998739",
            quantity: 1,
            unit_of_measure: "HRS",
            unit_price: isInr ? 12000 : 450,
            discount_percent: 0,
            gst_rate: 18,
            remarks: "",
          },
          currency,
        ),
      ],
    }));
  };

  const calculateLineSubtotal = (item) => {
    const amount = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
    const discount = amount * (Number(item.discount_percent) || 0) / 100;
    return Math.max(amount - discount, 0);
  };

  const calculateLineTotal = (item) => {
    const taxable = calculateLineSubtotal(item);
    const gst = isInrCurrency(poForm.currency) ? taxable * (Number(item.gst_rate) || 0) / 100 : 0;
    return taxable + gst;
  };

  const calculatePOTotal = () =>
    poForm.line_items.reduce((total, item) => total + calculateLineTotal(item), 0);

  const filteredOrders = purchaseOrders.filter((po) => {
    const matchesSearch =
      po.po_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      po.vendor_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || po.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: purchaseOrders.length,
    draft: purchaseOrders.filter((p) => p.status === 'Draft').length,
    pending: purchaseOrders.filter((p) => p.status === 'Pending Approval').length,
    issued: purchaseOrders.filter((p) => p.status === 'Issued').length,
    amended: purchaseOrders.filter((p) => p.status === 'Amended').length,
    totalValue: purchaseOrders.reduce((sum, p) => sum + (p.total_amount || 0), 0),
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
        setShowBuilderDialog={openBuilderDialog}
        stats={stats}
        formatCurrency={formatCurrency}
        canManagePo={canManagePo}
        isDemoFlow={USE_FAKE_PO_FLOW}
        activeFormat={activeFormatConfig}
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
          pendingApprovals={pendingApprovals}
          activeTab={activeTab}
          formatDate={formatDate}
          formatCurrency={formatCurrency}
          statusColors={statusColors}
          setSelectedPO={setSelectedPO}
          setShowViewDialog={setShowViewDialog}
          setShowApprovalDialog={setShowApprovalDialog}
          canApprovePo={canApprovePo}
        />
      </Tabs>

      <PoFormDialog
        showCreateDialog={showCreateDialog}
        setShowCreateDialog={setShowCreateDialog}
        poForm={poForm}
        setPoForm={setPoForm}
        formatConfigs={savedFormatConfigs}
        activeFormatId={activeFormatId}
        applyPoFormat={applyPoFormat}
        updatePoCurrency={updatePoCurrency}
        vendors={vendors}
        addLineItem={addLineItem}
        updateLineItem={updateLineItem}
        removeLineItem={removeLineItem}
        formatCurrency={formatCurrency}
        calculateLineTotal={calculateLineTotal}
        calculatePOTotal={calculatePOTotal}
        taxMode={getTaxMode(poForm.currency)}
        handleCreatePO={handleCreatePO}
        loadDemoPoSample={loadDemoPoSample}
        createAction={createAction}
      />

      <PoFormatBuilderDialog
        open={showBuilderDialog}
        onOpenChange={openBuilderDialog}
        draftConfig={builderDraftConfig}
        setDraftConfig={setBuilderDraftConfig}
        savedFormatConfigs={savedFormatConfigs}
        activeFormatId={activeFormatId}
        onSelectFormat={selectBuilderFormat}
        onCreateFormat={createNewBuilderFormat}
        onDeleteFormat={deleteBuilderFormat}
        onSave={saveBuilderConfig}
      />

      <PoDetailsDialog
        showViewDialog={showViewDialog}
        setShowViewDialog={setShowViewDialog}
        selectedPO={selectedPO}
        statusColors={statusColors}
        formatDate={formatDate}
        formatCurrency={formatCurrency}
        handleDownloadPO={handleDownloadPO}
        handleSubmitForApproval={handleSubmitForApproval}
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

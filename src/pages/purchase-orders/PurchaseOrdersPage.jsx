import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useGetVendorsQuery } from '../../Services/apis/invoicesVendorsApi';
import {
  useGetPurchaseOrdersQuery,
  useGetPurchaseOrderFormatConfigQuery,
  useGetPurchaseOrderFormatConfigsQuery,
  useLazyGetPurchaseOrderDownloadUrlQuery,
  useCreatePurchaseOrderFormatConfigMutation,
  useUpdatePurchaseOrderFormatConfigMutation,
  useDeletePurchaseOrderFormatConfigMutation,
  useSavePurchaseOrderDraftMutation,
  useCreatePurchaseOrderMutation,
  useUpdatePurchaseOrderMutation,
  useSubmitPurchaseOrderMutation,
  useApprovePurchaseOrderMutation,
  useScanPurchaseOrderMutation,
} from '../../Services/apis/purchaseOrdersMasterDataApi';
import { useGetOrganisationQuery } from '../../Services/apis/settingsApi';
import { toast } from 'sonner';
import { statusColors } from './constants';
import {
  DEFAULT_PO_FORMAT_CONFIG,
  buildCreatePurchaseOrderPayload,
  formatCurrency,
  formatDate,
  getTaxMode,
  isInrCurrency,
  isFormatFieldEnabled,
  normalizePoTemplateCode,
  normalizePurchaseOrder,
  sanitizeLineItemForCurrency,
} from './utils';
import { initializePoFormFromScan } from './utils/poScanNormalization';
import {
  applyUploadLineItemUpdate,
  applyUploadLineItemsChange,
  computeLineTotal,
  resolvePoTotals,
} from './utils/poTotals';
import PurchaseOrdersToolbar from './components/PurchaseOrdersToolbar';
import PoListTable from './components/PoListTable';
import PoFormDialog from './components/PoFormDialog';
import PoFormatBuilderDialog from './components/PoFormatBuilderDialog';
import PoDetailsDialog from './components/PoDetailsDialog';
import PoApprovalDialog from './components/PoApprovalDialog';
import PoUploadDialog from './components/PoUploadDialog';
import PoUploadSection from './components/PoUploadSection';
import { InvoicePdfPreview } from '../invoices/components/InvoicePdfPreview';
import { getVendorGstRegistrations } from '../vendors/components/VendorGstRegistrationsPanel';
import { useActionGuard } from '../../hooks/useActionGuard';
import { useCreditErrorHandler } from '../../contexts/CreditErrorContext';
import { useRBAC } from '../../contexts/RBACContext';
import { useSidebar } from '../../components/Layout';
import { useMeteredActionEstimate } from '../../hooks/useMeteredActionEstimate';
import { CREDIT_ACTION_CODES } from '../../constants/creditActions';
import { extractApiErrorDetail } from '../../utils/approvalWorkflow';

const getListData = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.content)) return response.content;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.items)) return response.items;
  return [];
};

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? '';

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
  vendor_gst_registration_id: '',
  vendor_gstin: '',
  vendor_pan: '',
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

const buildPoEditForm = (po = {}, fallbackFormatId = 'default-format') => ({
  po_format_id: po.po_format_id || po.poFormatId || po.formatConfigId || fallbackFormatId,
  vendor_id: po.vendor_id || po.vendorId || '',
  vendor_gst_registration_id: po.vendor_gst_registration_id || po.vendorGstRegistrationId || po.vendorRegistrationId || '',
  vendor_gstin: po.vendor_gstin || po.vendorGstin || '',
  vendor_pan: po.vendor_pan || po.vendorPan || '',
  po_date: String(po.po_date || po.poDate || '').slice(0, 10) || new Date().toISOString().split('T')[0],
  valid_till: String(po.valid_till || po.validTill || '').slice(0, 10),
  expected_delivery_date: String(po.expected_delivery_date || po.expectedDeliveryDate || '').slice(0, 10),
  currency: po.currency || 'INR',
  exchange_rate: po.exchange_rate || po.exchangeRate || '',
  place_of_supply: po.place_of_supply || po.placeOfSupply || '',
  shipping_address: po.shipping_address || po.shipToAddress || po.shippingAddress || '',
  billing_address: po.billing_address || po.billingAddress || '',
  delivery_terms: po.delivery_terms || po.deliveryTerms || '',
  freight_terms: po.freight_terms || po.freightTerms || '',
  payment_terms: po.payment_terms || po.paymentTerms || '',
  tds_applicable: Boolean(po.tds_applicable ?? po.isTdsApplicable),
  tds_section: po.tds_section || po.tdsSection || '',
  tds_percent: po.tds_percent || po.tdsPercent || '',
  remarks: po.remarks || '',
  line_items: (po.line_items || []).length
    ? po.line_items
    : [createEmptyLineItem(po.currency || 'INR')],
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

const makeFormatConfig = (
  config,
  fallbackId = 'default-format',
  fallbackName = 'Standard GST Format',
  tenantBranding = {},
) => ({
  ...cloneFormatConfig(config),
  templateCode: normalizePoTemplateCode(config.templateCode),
  id: config.id || fallbackId,
  name: config.name || fallbackName,
  companyName:
    config.companyName ||
    config.company_name ||
    tenantBranding.companyName ||
    "Company Name",
  logoUrl: config.logoUrl || config.logo_url || tenantBranding.logoUrl || null,
  logoS3Key: config.logoS3Key || config.logo_s3_key || tenantBranding.logoS3Key || null,
});

const buildFormatConfigPayload = (config) => ({
  name: config.name,
  defaultCurrency: config.defaultCurrency,
  companyName: config.companyName,
  logoUrl: config.logoUrl || null,
  logoS3Key: config.logoS3Key || null,
  poNumberPrefix: config.poNumberPrefix,
  dateFormat: config.dateFormat,
  templateCode: config.templateCode,
  isDefault: Boolean(config.isDefault),
  configVersion: config.configVersion || 0,
  sections: (config.sections || []).map((section, sectionIndex) => ({
    section: section.section,
    label: section.label,
    isEnabled: Boolean(section.isEnabled),
    displayOrder: section.displayOrder ?? sectionIndex + 1,
    fields: (section.fields || []).map((field, fieldIndex) => ({
      fieldKey: field.fieldKey,
      label: field.label,
      isEnabled: Boolean(field.isEnabled),
      isMandatory: Boolean(field.isMandatory),
      labelOverride: field.labelOverride || null,
      displayOrder: field.displayOrder ?? fieldIndex + 1,
      isSystemField: Boolean(field.isSystemField),
      isCurrencyDependent: Boolean(field.isCurrencyDependent),
    })),
  })),
});

const isUnsavedFormat = (formatId = '') => String(formatId).startsWith('new-format-');
const areFormatListsEquivalent = (left = [], right = []) => {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    const leftItem = left[index];
    const rightItem = right[index];
    if (!leftItem || !rightItem) return false;
    if (leftItem.id !== rightItem.id) return false;
    if (leftItem.name !== rightItem.name) return false;
    if (leftItem.defaultCurrency !== rightItem.defaultCurrency) return false;
    if (leftItem.templateCode !== rightItem.templateCode) return false;
    if ((leftItem.logoUrl || '') !== (rightItem.logoUrl || '')) return false;
    if ((leftItem.logoS3Key || '') !== (rightItem.logoS3Key || '')) return false;
  }
  return true;
};

const PurchaseOrdersPage = () => {
  const { guardAction, canPerformAction } = useActionGuard();
  const { handleCreditError } = useCreditErrorHandler();
  const { isCorporateSectionEnabled } = useRBAC();
  const { setHideSidebar } = useSidebar();
  const canManagePo = canPerformAction('po.create');
  const canUploadPo = canManagePo && (
    isCorporateSectionEnabled('PURCHASE_ORDER_UPLOAD')
    || isCorporateSectionEnabled('PURCHASE_ORDER_ALL')
  );
  const canApprovePo = canPerformAction('po.approve');

  const {
    data: purchaseOrdersData = [],
    isLoading: purchaseOrdersLoading,
    refetch: refetchPurchaseOrders,
  } = useGetPurchaseOrdersQuery();
  const {
    data: formatConfigData,
    isLoading: formatConfigLoading,
    refetch: refetchFormatConfig,
  } = useGetPurchaseOrderFormatConfigQuery();
  const {
    data: formatConfigsData = [],
    isLoading: formatConfigsLoading,
    refetch: refetchFormatConfigs,
  } = useGetPurchaseOrderFormatConfigsQuery();
  const {
    data: vendorsData = [],
    isLoading: vendorsLoading,
    refetch: refetchVendors,
  } = useGetVendorsQuery();
  const { data: organisationData } = useGetOrganisationQuery();

  const tenantBranding = {
    companyName:
      organisationData?.companyName ||
      organisationData?.company_name ||
      organisationData?.legalName ||
      organisationData?.legal_name ||
      null,
    logoUrl: organisationData?.logoUrl || organisationData?.logo_url || null,
    logoS3Key: organisationData?.logoS3Key || organisationData?.logo_s3_key || null,
  };

  const [getPurchaseOrderDownloadUrl] = useLazyGetPurchaseOrderDownloadUrlQuery();
  const [createPurchaseOrderFormatConfig] = useCreatePurchaseOrderFormatConfigMutation();
  const [updatePurchaseOrderFormatConfig] = useUpdatePurchaseOrderFormatConfigMutation();
  const [deletePurchaseOrderFormatConfig] = useDeletePurchaseOrderFormatConfigMutation();
  const [savePurchaseOrderDraft] = useSavePurchaseOrderDraftMutation();
  const [createPurchaseOrder] = useCreatePurchaseOrderMutation();
  const [updatePurchaseOrder] = useUpdatePurchaseOrderMutation();
  const [submitPurchaseOrder] = useSubmitPurchaseOrderMutation();
  const [approvePurchaseOrder] = useApprovePurchaseOrderMutation();
  const [scanPurchaseOrder] = useScanPurchaseOrderMutation();

  const [showUploadPicker, setShowUploadPicker] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadFileURL, setUploadFileURL] = useState(null);
  const [uploadPoForm, setUploadPoForm] = useState(null);
  const [uploadScanning, setUploadScanning] = useState(false);
  const [uploadSaving, setUploadSaving] = useState(false);
  const [uploadPreviewError, setUploadPreviewError] = useState(false);
  const [pdfZoom, setPdfZoom] = useState(100);
  const uploadInProgressRef = useRef(false);
  const poUploadEstimate = useMeteredActionEstimate(CREDIT_ACTION_CODES.PO_UPLOAD, uploadFile ? 1 : 0);

  const formatConfig = formatConfigData || DEFAULT_PO_FORMAT_CONFIG;
  const apiPurchaseOrders = getListData(purchaseOrdersData).map(normalizePurchaseOrder);
  const vendors = Array.isArray(vendorsData) ? vendorsData : getListData(vendorsData);
  const loading = purchaseOrdersLoading || vendorsLoading || formatConfigLoading || formatConfigsLoading;

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showBuilderDialog, setShowBuilderDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [editingPO, setEditingPO] = useState(null);
  const [createAction, setCreateAction] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingPoId, setDownloadingPoId] = useState(null);
  const [approvalForm, setApprovalForm] = useState({ action: 'Approved', comments: '' });
  const [savedFormatConfigs, setSavedFormatConfigs] = useState(() => [makeFormatConfig(formatConfig)]);
  const [activeFormatId, setActiveFormatId] = useState('default-format');
  const [builderDraftConfig, setBuilderDraftConfig] = useState(() => makeFormatConfig(formatConfig));

  const purchaseOrders = apiPurchaseOrders;
  const activeFormatConfig =
    savedFormatConfigs.find((config) => config.id === activeFormatId) ||
    savedFormatConfigs[0] ||
    makeFormatConfig(DEFAULT_PO_FORMAT_CONFIG, 'default-format', 'Standard GST Format', tenantBranding);

  const [poForm, setPoForm] = useState(() =>
    createDefaultPoForm(activeFormatConfig.defaultCurrency, activeFormatConfig.id),
  );

  useEffect(() => {
    setHideSidebar(Boolean(uploadFile));
  }, [setHideSidebar, uploadFile]);

  useEffect(() => () => {
    if (uploadFileURL) URL.revokeObjectURL(uploadFileURL);
  }, [uploadFileURL]);

  const resetUploadSession = useCallback(() => {
    setUploadFile(null);
    setUploadFileURL((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setUploadPoForm(null);
    setUploadScanning(false);
    setUploadPreviewError(false);
    uploadInProgressRef.current = false;
  }, []);

  useEffect(() => {
    const formatsFromApi = getListData(formatConfigsData).map((config, index) =>
      makeFormatConfig(config, index === 0 ? 'default-format' : `format-${index + 1}`, 'Standard GST Format', tenantBranding),
    );
    const nextFormats = formatsFromApi.length
      ? formatsFromApi
      : formatConfigData?.defaultCurrency
        ? [makeFormatConfig(formatConfigData, 'default-format', 'Standard GST Format', tenantBranding)]
        : [];

    if (!nextFormats.length) return;

    const resolvedActiveFormat =
      nextFormats.find((config) => config.id === activeFormatId) ||
      nextFormats.find((config) => config.isDefault) ||
      nextFormats[0];

    setSavedFormatConfigs((prev) => (
      areFormatListsEquivalent(prev, nextFormats) ? prev : nextFormats
    ));
    setActiveFormatId((prev) => (
      prev === resolvedActiveFormat.id ? prev : resolvedActiveFormat.id
    ));
    setBuilderDraftConfig((prev) => {
      const nextDraft = makeFormatConfig(resolvedActiveFormat, 'default-format', 'Standard GST Format', tenantBranding);
      if (
        prev?.id === nextDraft.id &&
        prev?.name === nextDraft.name &&
        prev?.companyName === nextDraft.companyName &&
        prev?.defaultCurrency === nextDraft.defaultCurrency &&
        prev?.templateCode === nextDraft.templateCode &&
        (prev?.logoUrl || '') === (nextDraft.logoUrl || '') &&
        (prev?.logoS3Key || '') === (nextDraft.logoS3Key || '')
      ) {
        return prev;
      }
      return nextDraft;
    });
    setPoForm((prev) => {
      const untouched =
        !prev.vendor_id &&
        prev.currency === DEFAULT_PO_FORMAT_CONFIG.defaultCurrency &&
        prev.line_items.length === 1 &&
        !prev.line_items[0]?.item_description;

      if (untouched) return createDefaultPoForm(resolvedActiveFormat.defaultCurrency, resolvedActiveFormat.id);
      if (nextFormats.some((config) => config.id === prev.po_format_id)) return prev;
      return {
        ...prev,
        po_format_id: resolvedActiveFormat.id,
        currency: resolvedActiveFormat.defaultCurrency,
        line_items: prev.line_items.map((item) => sanitizeLineItemForCurrency(item, resolvedActiveFormat.defaultCurrency)),
      };
    });
  }, [
    formatConfigData,
    formatConfigsData,
    activeFormatId,
    tenantBranding.companyName,
    tenantBranding.logoUrl,
    tenantBranding.logoS3Key,
  ]);

  const fetchData = async () => {
    try {
      const requests = [refetchPurchaseOrders(), refetchVendors(), refetchFormatConfig(), refetchFormatConfigs()];
      await Promise.all(requests);
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh purchase orders');
    }
  };

  const getCreatedPo = (response) =>
    response?.po || response?.purchaseOrder || response?.formatConfig || response?.data || response?.item || response;
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

  const validatePoForm = (form = poForm, { isUpload = false } = {}) => {
    const selectedFormat = isUpload
      ? null
      : savedFormatConfigs.find((config) => config.id === form.po_format_id) || activeFormatConfig;
    const tdsEnabled = !isUpload
      && isInrCurrency(form.currency)
      && isFormatFieldEnabled(selectedFormat, 'TAX_TOTALS', 'is_tds_applicable');

    if (!form.vendor_id) {
      toast.error('Please select a vendor');
      return false;
    }
    const selectedVendor = vendors.find((vendor) => String(vendor.id) === String(form.vendor_id));
    const vendorGstRegistrations = getVendorGstRegistrations(selectedVendor);
    if (
      isInrCurrency(form.currency) &&
      vendorGstRegistrations.length > 0 &&
      !form.vendor_gstin &&
      !form.vendor_gst_registration_id
    ) {
      toast.error('Please select a vendor GST registration');
      return false;
    }
    if (form.line_items.length === 0 || !form.line_items[0].item_description) {
      toast.error('Please add at least one line item');
      return false;
    }
    if (!isInrCurrency(form.currency) && !Number(form.exchange_rate)) {
      toast.error('Exchange rate is required for foreign-currency purchase orders');
      return false;
    }
    if (tdsEnabled && form.tds_applicable && !(Number(form.tds_percent) > 0)) {
      toast.error('Please select a valid TDS rate');
      return false;
    }
    return true;
  };

  const savePoForm = async (form, { submitForApproval = false, isUpload = false } = {}) => {
    if (!guardAction('po.create')) return;
    if (submitForApproval && !guardAction('po.submit')) return;
    if (!validatePoForm(form, { isUpload })) return;

    const selectedFormat = isUpload
      ? null
      : savedFormatConfigs.find((config) => config.id === form.po_format_id) || activeFormatConfig;
    const payload = buildCreatePurchaseOrderPayload(form, selectedFormat);
    const data = submitForApproval
      ? await createPurchaseOrder(payload).unwrap()
      : await savePurchaseOrderDraft(payload).unwrap();
    const createdPo = getCreatedPo(data);
    const normalizedCreatedPo = normalizePurchaseOrder(createdPo || {});
    const createdPoId = getPoId(createdPo);

    if (
      submitForApproval &&
      createdPoId &&
      (normalizedCreatedPo.status === 'Draft' || normalizedCreatedPo.status === 'Sent Back')
    ) {
      await submitPurchaseOrder(createdPoId).unwrap();
    }

    toast.success(
      submitForApproval
        ? `Purchase Order ${createdPo?.po_number || createdPo?.poNumber || ''} submitted for approval`
        : `Purchase Order ${createdPo?.po_number || createdPo?.poNumber || ''} saved as draft`,
    );
    await fetchData();
  };

  const handleCreatePO = async ({ submitForApproval = false } = {}) => {
    if (!guardAction('po.create')) return;
    if (submitForApproval && !guardAction('po.submit')) return;
    if (!validatePoForm()) return;

    setCreateAction(submitForApproval ? 'submit' : 'draft');
    try {
      const selectedFormat = savedFormatConfigs.find((config) => config.id === poForm.po_format_id) || activeFormatConfig;
      const payload = buildCreatePurchaseOrderPayload(poForm, selectedFormat);
      const editingPoId = getPoId(editingPO);

      if (editingPoId) {
        const data = await updatePurchaseOrder({ id: editingPoId, body: payload }).unwrap();
        const createdPo = getCreatedPo(data);
        const normalizedCreatedPo = normalizePurchaseOrder(createdPo || {});
        const createdPoId = getPoId(createdPo) || editingPoId;

        if (
          submitForApproval &&
          (normalizedCreatedPo.status === 'Draft' || normalizedCreatedPo.status === 'Sent Back')
        ) {
          await submitPurchaseOrder(createdPoId).unwrap();
        }

        toast.success(
          submitForApproval
            ? `Purchase Order ${createdPo?.po_number || createdPo?.poNumber || ''} submitted for approval`
            : `Purchase Order ${createdPo?.po_number || createdPo?.poNumber || ''} updated`,
        );
        await fetchData();
      } else {
        await savePoForm(poForm, { submitForApproval });
      }

      setShowCreateDialog(false);
      setEditingPO(null);
      resetForm();
    } catch (error) {
      if (handleCreditError(error)) return;
      toast.error(error?.data?.detail || error?.data?.message || 'Failed to save purchase order');
    } finally {
      setCreateAction(null);
    }
  };

  const handlePoPreviewCheck = ({ submitForApproval = false } = {}) => {
    if (!guardAction('po.create')) return false;
    if (submitForApproval && !guardAction('po.submit')) return false;
    return validatePoForm();
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
      await approvePurchaseOrder({ id: getPoId(selectedPO), body: approvalForm }).unwrap();
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

  const openEditPoDialog = (po) => {
    if (!po) return;
    const selectedFormat =
      savedFormatConfigs.find((config) => config.id === (po.po_format_id || po.poFormatId || po.formatConfigId)) ||
      activeFormatConfig;
    setEditingPO(po);
    setPoForm(buildPoEditForm(po, selectedFormat.id));
    setShowViewDialog(false);
    setShowCreateDialog(true);
  };

  const openBuilderDialog = (open) => {
    if (open) setBuilderDraftConfig(makeFormatConfig(activeFormatConfig, 'default-format', 'Standard GST Format', tenantBranding));
    setShowBuilderDialog(open);
  };

  const saveBuilderConfig = async () => {
    if (!String(builderDraftConfig.name || '').trim()) {
      toast.error('Please name this PO format');
      return;
    }

    const nextConfig = {
      ...makeFormatConfig(builderDraftConfig, 'default-format', 'Standard GST Format', tenantBranding),
      name: String(builderDraftConfig.name || '').trim(),
      configVersion: (builderDraftConfig.configVersion || 0) + 1,
    };
    const payload = buildFormatConfigPayload(nextConfig);

    setSubmitting(true);
    try {
      const data = isUnsavedFormat(nextConfig.id)
        ? await createPurchaseOrderFormatConfig(payload).unwrap()
        : await updatePurchaseOrderFormatConfig({ id: nextConfig.id, body: payload }).unwrap();
      const savedConfig = makeFormatConfig(getCreatedPo(data) || nextConfig, nextConfig.id, nextConfig.name, tenantBranding);

      setSavedFormatConfigs((prev) => {
        const existingId = isUnsavedFormat(nextConfig.id) ? savedConfig.id : nextConfig.id;
        const exists = prev.some((config) => config.id === existingId || config.id === nextConfig.id);
        return exists
          ? prev.map((config) => (config.id === existingId || config.id === nextConfig.id ? savedConfig : config))
          : [...prev, savedConfig];
      });
      setActiveFormatId(savedConfig.id);
      setBuilderDraftConfig(savedConfig);
      setShowBuilderDialog(false);
      setPoForm((prev) => {
        const untouched = !prev.vendor_id && prev.line_items.length === 1 && !prev.line_items[0]?.item_description;
        return untouched ? createDefaultPoForm(savedConfig.defaultCurrency, savedConfig.id) : { ...prev, po_format_id: savedConfig.id };
      });
      await Promise.all([refetchFormatConfigs(), refetchFormatConfig()]);
      toast.success(`PO format "${savedConfig.name}" saved`);
    } catch (error) {
      toast.error(error?.data?.detail || error?.data?.message || 'Failed to save PO format');
    } finally {
      setSubmitting(false);
    }
  };

  const createNewBuilderFormat = () => {
    const id = `new-format-${Date.now()}`;
    setBuilderDraftConfig({
      ...makeFormatConfig(activeFormatConfig, id, `Format ${savedFormatConfigs.length + 1}`, tenantBranding),
      id,
      name: `Format ${savedFormatConfigs.length + 1}`,
      configVersion: 0,
    });
  };

  const selectBuilderFormat = (formatId) => {
    const selectedFormat = savedFormatConfigs.find((config) => config.id === formatId);
    if (!selectedFormat) return;
    setBuilderDraftConfig(makeFormatConfig(selectedFormat, 'default-format', 'Standard GST Format', tenantBranding));
    setActiveFormatId(selectedFormat.id);
  };

  const deleteBuilderFormat = async () => {
    if (savedFormatConfigs.length <= 1) {
      toast.error('At least one PO format is required');
      return;
    }

    const deletingFormatId = builderDraftConfig.id;
    const remainingFormats = savedFormatConfigs.filter((config) => config.id !== deletingFormatId);
    const nextActiveFormat =
      remainingFormats.find((config) => config.id === activeFormatId) ||
      remainingFormats[0];

    setSubmitting(true);
    try {
      if (!isUnsavedFormat(deletingFormatId)) {
        await deletePurchaseOrderFormatConfig(deletingFormatId).unwrap();
      }

      setSavedFormatConfigs(remainingFormats);
      setActiveFormatId(nextActiveFormat.id);
      setBuilderDraftConfig(makeFormatConfig(nextActiveFormat, 'default-format', 'Standard GST Format', tenantBranding));
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
      await Promise.all([refetchFormatConfigs(), refetchFormatConfig()]);
      toast.success('PO format deleted');
    } catch (error) {
      toast.error(error?.data?.detail || error?.data?.message || 'Failed to delete PO format');
    } finally {
      setSubmitting(false);
    }
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

  const calculateLineSubtotal = (item) => {
    const amount = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
    const discount = amount * (Number(item.discount_percent) || 0) / 100;
    return Math.max(amount - discount, 0);
  };

  const calculateLineTotalFor = (item, currency) => {
    const taxable = calculateLineSubtotal(item);
    const gst = isInrCurrency(currency) ? taxable * (Number(item.gst_rate) || 0) / 100 : 0;
    return taxable + gst;
  };

  const calculateLineTotal = (item) => calculateLineTotalFor(item, poForm.currency);

  const calculatePOTotalFor = (form) =>
    form.line_items.reduce((total, item) => total + calculateLineTotalFor(item, form.currency), 0);

  const calculatePOTotal = () => calculatePOTotalFor(poForm);

  const processUploadFile = async (file) => {
    if (!guardAction('po.scan')) return false;
    if (!file) return false;

    uploadInProgressRef.current = true;
    const fileURL = URL.createObjectURL(file);
    setUploadFileURL(fileURL);
    setUploadFile(file);
    setUploadScanning(true);
    setUploadPreviewError(false);

    const formDataUpload = new FormData();
    formDataUpload.append('file', file);

    try {
      const response = await scanPurchaseOrder(formDataUpload).unwrap();
      const extracted = response?.data ?? response?.result ?? response;
      if (!extracted || typeof extracted !== 'object') {
        throw new Error('Scan API returned empty response');
      }

      setUploadPoForm(initializePoFormFromScan(extracted, {
        vendors,
        defaultCurrency: activeFormatConfig.defaultCurrency,
      }));
      toast.success('Purchase order scanned successfully');
    } catch (error) {
      if (handleCreditError(error)) {
        resetUploadSession();
        return false;
      }

      const errorMessage =
        extractApiErrorDetail(error) ||
        error?.data?.message ||
        error?.message ||
        'Failed to scan purchase order';
      setUploadPoForm(initializePoFormFromScan({}, {
        vendors,
        defaultCurrency: activeFormatConfig.defaultCurrency,
      }));
      toast.warning(
        <div className="space-y-2">
          <p className="font-bold text-base">Scan Failed</p>
          <p className="text-sm whitespace-pre-line">{errorMessage}</p>
          <p className="text-sm">Enter PO details manually using the form.</p>
        </div>,
        { duration: 8000 },
      );
    } finally {
      setUploadScanning(false);
      uploadInProgressRef.current = false;
    }
    return true;
  };

  const handleUploadPickerFile = async (file) => {
    await processUploadFile(file);
    return false;
  };

  const handleUploadPickerOpenChange = (open) => {
    setShowUploadPicker(open);
    if (!open && !uploadInProgressRef.current && !uploadFile) {
      resetUploadSession();
    }
  };

  const handleUploadSave = async ({ submitForApproval = false } = {}) => {
    if (!uploadPoForm) return;
    setUploadSaving(true);
    try {
      await savePoForm(uploadPoForm, { submitForApproval, isUpload: true });
      resetUploadSession();
      setShowUploadPicker(false);
    } catch (error) {
      if (handleCreditError(error)) return;
      toast.error(error?.data?.detail || error?.data?.message || 'Failed to save purchase order');
    } finally {
      setUploadSaving(false);
    }
  };

  const updateUploadPoCurrency = (currency) => {
    setUploadPoForm((prev) => ({
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

  const addUploadLineItem = () => {
    setUploadPoForm((prev) =>
      applyUploadLineItemsChange(prev, [...prev.line_items, createEmptyLineItem(prev.currency)]),
    );
  };

  const removeUploadLineItem = (index) => {
    setUploadPoForm((prev) => {
      if (prev.line_items.length === 1) return prev;
      return applyUploadLineItemsChange(
        prev,
        prev.line_items.filter((_, i) => i !== index),
      );
    });
  };

  const updateUploadLineItem = (index, field, value) => {
    setUploadPoForm((prev) => applyUploadLineItemUpdate(prev, index, field, value));
  };

  const calculateUploadLineTotal = (item) => computeLineTotal(item, uploadPoForm?.currency);
  const calculateUploadPOTotal = () => resolvePoTotals(uploadPoForm || {}).total_amount;

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
        setShowUploadPicker={setShowUploadPicker}
        setShowBuilderDialog={openBuilderDialog}
        stats={stats}
        formatCurrency={formatCurrency}
        canManagePo={canManagePo}
        canUploadPo={canUploadPo}
        activeFormat={activeFormatConfig}
        onRefresh={fetchData}
        refreshing={loading}
      />

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
        canManagePo={canManagePo}
        onEditPO={openEditPoDialog}
      />

      <PoFormDialog
        showCreateDialog={showCreateDialog}
        setShowCreateDialog={(open) => {
          setShowCreateDialog(open);
          if (!open) setEditingPO(null);
        }}
        poForm={poForm}
        setPoForm={setPoForm}
        isEditMode={Boolean(editingPO)}
        editingStatus={editingPO?.status}
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
        onBeforePreview={handlePoPreviewCheck}
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
        onEditPO={openEditPoDialog}
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

      {canUploadPo ? (
        <PoUploadDialog
          open={showUploadPicker && !uploadFile}
          onOpenChange={handleUploadPickerOpenChange}
          onFileSelected={handleUploadPickerFile}
          disabled={uploadScanning || uploadInProgressRef.current || !canPerformAction('po.scan')}
        />
      ) : null}

      {uploadFile ? (
        <PoUploadSection
          uploadedFile={uploadFile}
          onClose={() => {
            resetUploadSession();
            setShowUploadPicker(false);
          }}
          scanning={uploadScanning}
          saving={uploadSaving}
          canSave={Boolean(uploadPoForm?.vendor_id)}
          poUploadEstimateDisabled={poUploadEstimate.isDisabled}
          onSaveDraft={() => handleUploadSave({ submitForApproval: false })}
          onSubmitForApproval={() => handleUploadSave({ submitForApproval: true })}
          renderDocumentPreview={() => (
            <InvoicePdfPreview
              fileURL={uploadFileURL}
              file={uploadFile}
              zoom={pdfZoom}
              imageError={uploadPreviewError}
              setImageError={setUploadPreviewError}
              setPdfZoom={setPdfZoom}
            />
          )}
          renderPoForm={() => (
            uploadPoForm ? (
              <PoFormDialog
              embedded
              plainDataMode
              showCreateDialog
              setShowCreateDialog={() => {}}
              poForm={uploadPoForm}
              setPoForm={setUploadPoForm}
              formatConfigs={savedFormatConfigs}
              activeFormatId={activeFormatId}
              applyPoFormat={() => {}}
              updatePoCurrency={updateUploadPoCurrency}
              vendors={vendors}
              addLineItem={addUploadLineItem}
              updateLineItem={updateUploadLineItem}
              removeLineItem={removeUploadLineItem}
              formatCurrency={formatCurrency}
              calculateLineTotal={calculateUploadLineTotal}
              calculatePOTotal={calculateUploadPOTotal}
              taxMode={getTaxMode(uploadPoForm.currency)}
              handleCreatePO={() => {}}
              createAction={null}
              scannedVendorHint={
                !uploadPoForm.vendor_id && (uploadPoForm.scanned_vendor_name || uploadPoForm.scanned_vendor_gstin)
                  ? {
                    name: uploadPoForm.scanned_vendor_name,
                    gstin: uploadPoForm.scanned_vendor_gstin,
                  }
                  : null
              }
            />
            ) : null
          )}
        />
      ) : null}
    </div>
  );
};

export default PurchaseOrdersPage;

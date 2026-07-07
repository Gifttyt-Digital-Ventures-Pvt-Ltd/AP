import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../../components/ui/button';
import RefreshButton from '../../components/common/RefreshButton';
import { useSidebar } from '../../components/Layout';
import { useActionGuard } from '../../hooks/useActionGuard';
import { useCreditErrorHandler } from '../../contexts/CreditErrorContext';
import { useRBAC } from '../../contexts/RBACContext';
import { useMeteredActionEstimate } from '../../hooks/useMeteredActionEstimate';
import { useProformaInvoiceSubscription } from '../../hooks/useProformaInvoiceSubscription';
import { CREDIT_ACTION_CODES } from '../../constants/creditActions';
import { InvoicePdfPreview } from '../invoices/components/InvoicePdfPreview';
import {
  useGetPurchaseOrdersQuery,
  useLazyGetPurchaseOrderByIdQuery,
} from '../../Services/apis/purchaseOrdersMasterDataApi';
import {
  useGetGrnsQuery,
  useGetGrnFormatConfigQuery,
  useGetGrnFormatConfigsQuery,
  useCreateGrnFormatConfigMutation,
  useUpdateGrnFormatConfigByIdMutation,
  useDeleteGrnFormatConfigMutation,
  useGetEligiblePisForGrnQuery,
  useCreateGrnMutation,
  useSubmitGrnMutation,
  useApproveGrnMutation,
  useRejectGrnMutation,
  useSendBackGrnMutation,
  usePostGrnMutation,
  useExtractGrnDocumentMutation,
  useCreateGrnFromPiMutation,
  useLazyGetPoLinesReceiptStateQuery,
} from '../../Services/apis/goodsReceiptApi';
import GrnListTab from './components/GrnListTab';
import GrnFormatBuilderDialog from './components/GrnFormatBuilderDialog';
import GrnCreateDialog from './components/GrnCreateDialog';
import GrnUploadDialog from './components/GrnUploadDialog';
import GrnUploadSection from './components/GrnUploadSection';
import GrnUploadFormPanel from './components/GrnUploadFormPanel';
import { useGetVendorsQuery } from '../../Services/apis/invoicesVendorsApi';
import { useGetOrganisationQuery } from '../../Services/apis/settingsApi';
import GrnCreateMenu from './components/GrnCreateMenu';
import GrnPoPickerDialog from './components/GrnPoPickerDialog';
import GrnPiPickerDialog from './components/GrnPiPickerDialog';
import GrnDetailDialog from './components/GrnDetailDialog';
import GrnApprovalDialog from './components/GrnApprovalDialog';
import { GRN_APPROVAL_ACTION, GRN_SOURCE } from './constants';
import {
  DEFAULT_GRN_FORMAT_CONFIG,
  areGrnFormatListsEquivalent,
  buildGrnFormatConfigPayload,
  getCreatedGrnFormatFromResponse,
  getDuplicateGrnFormatNameError,
  getNextGrnFormatName,
  isUnsavedGrnFormat,
  makeGrnFormatConfig,
  normalizeGrnFormatConfig,
  sanitizeGrnFormatName,
} from './utils/grnFormatConfig';
import {
  buildCreateGrnPayload,
  buildGrnLineItemsFromPo,
  createDefaultGrnForm,
  createEmptyGrnLineItem,
  getListData,
  extractPageContent,
  getPoReceiptStateLines,
  normalizeGrn,
  normalizePurchaseOrder,
  validateGrnLineItems,
} from './utils';

const GoodsReceipt = () => {
  const { guardAction, canPerformAction } = useActionGuard();
  const { handleCreditError } = useCreditErrorHandler();
  const { isCorporateScreenAllowed, isCorporateSectionEnabled } = useRBAC();
  const { setHideSidebar } = useSidebar();

  const hasPiSubscription = useProformaInvoiceSubscription().isPiSubscriptionEnabled;

  const { data: grnsResponse, isLoading: grnsLoading, refetch: refetchGrns } = useGetGrnsQuery();
  const { data: vendorsData = [] } = useGetVendorsQuery();
  const { data: formatConfigResponse, refetch: refetchFormatConfig } = useGetGrnFormatConfigQuery();
  const {
    data: formatConfigsResponse = [],
    isLoading: formatConfigsLoading,
    refetch: refetchFormatConfigs,
  } = useGetGrnFormatConfigsQuery();
  const { data: organisationData } = useGetOrganisationQuery();
  const { data: eligiblePisResponse = [] } = useGetEligiblePisForGrnQuery(undefined, {
    skip: !hasPiSubscription,
  });

  const approvedLegacy = useGetPurchaseOrdersQuery({ status: 'Approved' });
  const approvedCanonical = useGetPurchaseOrdersQuery({ status: 'ISSUED' });
  const partialLegacy = useGetPurchaseOrdersQuery({ status: 'Partially Received' });
  const partialCanonical = useGetPurchaseOrdersQuery({ status: 'PARTIALLY_RECEIVED' });

  const [getPurchaseOrderById] = useLazyGetPurchaseOrderByIdQuery();
  const [getPoLinesReceiptState] = useLazyGetPoLinesReceiptStateQuery();
  const [createGrnFormatConfig] = useCreateGrnFormatConfigMutation();
  const [updateGrnFormatConfigById] = useUpdateGrnFormatConfigByIdMutation();
  const [deleteGrnFormatConfig] = useDeleteGrnFormatConfigMutation();
  const [createGrn, { isLoading: creating }] = useCreateGrnMutation();
  const [submitGrn] = useSubmitGrnMutation();
  const [approveGrn] = useApproveGrnMutation();
  const [rejectGrn] = useRejectGrnMutation();
  const [sendBackGrn] = useSendBackGrnMutation();
  const [postGrn, { isLoading: posting }] = usePostGrnMutation();
  const [extractGrnDocument] = useExtractGrnDocumentMutation();
  const [createGrnFromPi] = useCreateGrnFromPiMutation();

  const [showBuilderDialog, setShowBuilderDialog] = useState(false);
  const [grnCreateOptionOpen, setGrnCreateOptionOpen] = useState(false);
  const [showPoPicker, setShowPoPicker] = useState(false);
  const [showPiPicker, setShowPiPicker] = useState(false);
  const [showGrnUploadPicker, setShowGrnUploadPicker] = useState(false);
  const [uploadGrnFile, setUploadGrnFile] = useState(null);
  const [uploadGrnFileURL, setUploadGrnFileURL] = useState(null);
  const [uploadScanning, setUploadScanning] = useState(false);
  const [uploadPreviewError, setUploadPreviewError] = useState(false);
  const [pdfZoom, setPdfZoom] = useState(100);
  const uploadInProgressRef = useRef(false);

  const tenantBranding = useMemo(
    () => ({
      companyName:
        organisationData?.companyName ||
        organisationData?.company_name ||
        organisationData?.legalName ||
        organisationData?.legal_name ||
        null,
    }),
    [organisationData],
  );

  const [savedFormatConfigs, setSavedFormatConfigs] = useState(() => [
    makeGrnFormatConfig(DEFAULT_GRN_FORMAT_CONFIG),
  ]);
  const [activeFormatId, setActiveFormatId] = useState('default-grn-format');
  const [builderDraftConfig, setBuilderDraftConfig] = useState(() =>
    makeGrnFormatConfig(DEFAULT_GRN_FORMAT_CONFIG),
  );
  const [savingConfig, setSavingConfig] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailGrn, setDetailGrn] = useState(null);
  const [selectedPo, setSelectedPo] = useState(null);
  const [grnForm, setGrnForm] = useState(() => createDefaultGrnForm('default-grn-format'));
  const [createdGrnId, setCreatedGrnId] = useState(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalGrn, setApprovalGrn] = useState(null);
  const [approvalForm, setApprovalForm] = useState({
    action: GRN_APPROVAL_ACTION.APPROVED,
    comments: '',
  });
  const [approvalSubmitting, setApprovalSubmitting] = useState(false);

  const canCreateGrn = canPerformAction('grn.create');
  const canPostGrn = canPerformAction('grn.post');
  const grnUploadEstimate = useMeteredActionEstimate(
    CREDIT_ACTION_CODES.GRN_UPLOAD,
    uploadGrnFile ? 1 : 0,
  );

  const activeFormatConfig = useMemo(
    () =>
      savedFormatConfigs.find((config) => config.id === activeFormatId) ||
      savedFormatConfigs[0] ||
      makeGrnFormatConfig(DEFAULT_GRN_FORMAT_CONFIG, 'default-grn-format', 'Standard GRN Format', tenantBranding),
    [activeFormatId, savedFormatConfigs, tenantBranding],
  );

  const resolveFormFormatConfig = useCallback(
    (form) =>
      savedFormatConfigs.find((config) => config.id === form.grn_format_id) || activeFormatConfig,
    [activeFormatConfig, savedFormatConfigs],
  );

  const createFormFormatConfig = resolveFormFormatConfig(grnForm);
  const uploadFormFormatConfig = resolveFormFormatConfig(grnForm);

  useEffect(() => {
    const formatsFromApi = getListData(formatConfigsResponse).map((config, index) =>
      makeGrnFormatConfig(
        config,
        index === 0 ? 'default-grn-format' : `grn-format-${index + 1}`,
        'Standard GRN Format',
        tenantBranding,
      ),
    );
    const nextFormats = formatsFromApi.length
      ? formatsFromApi
      : formatConfigResponse && typeof formatConfigResponse === 'object'
        ? [
            makeGrnFormatConfig(
              normalizeGrnFormatConfig(formatConfigResponse),
              'default-grn-format',
              'Standard GRN Format',
              tenantBranding,
            ),
          ]
        : [];

    if (!nextFormats.length) return;

    const resolvedActiveFormat =
      nextFormats.find((config) => config.id === activeFormatId) ||
      nextFormats.find((config) => config.isDefault) ||
      nextFormats[0];

    setSavedFormatConfigs((prev) =>
      areGrnFormatListsEquivalent(prev, nextFormats) ? prev : nextFormats,
    );
    setActiveFormatId((prev) => (prev === resolvedActiveFormat.id ? prev : resolvedActiveFormat.id));
    setBuilderDraftConfig((prev) => {
      const nextDraft = makeGrnFormatConfig(
        resolvedActiveFormat,
        'default-grn-format',
        'Standard GRN Format',
        tenantBranding,
      );
      if (prev?.id === nextDraft.id && prev?.name === nextDraft.name) return prev;
      return nextDraft;
    });
  }, [activeFormatId, formatConfigResponse, formatConfigsResponse, tenantBranding]);

  useEffect(() => {
    setHideSidebar(Boolean(uploadGrnFile));
  }, [setHideSidebar, uploadGrnFile]);

  useEffect(() => {
    return () => {
      if (uploadGrnFileURL) URL.revokeObjectURL(uploadGrnFileURL);
    };
  }, [uploadGrnFileURL]);

  const grns = useMemo(
    () => extractPageContent(grnsResponse).map(normalizeGrn),
    [grnsResponse],
  );

  const purchaseOrders = useMemo(() => {
    const sources = [
      approvedLegacy.data,
      approvedCanonical.data,
      partialLegacy.data,
      partialCanonical.data,
    ];
    return sources
      .flatMap((response) => (Array.isArray(response) ? response : getListData(response)))
      .map(normalizePurchaseOrder)
      .filter(
        (po, index, list) =>
          list.findIndex((candidate) => candidate.id === po.id) === index,
      );
  }, [
    approvedLegacy.data,
    approvedCanonical.data,
    partialLegacy.data,
    partialCanonical.data,
  ]);

  const eligiblePis = useMemo(() => getListData(eligiblePisResponse), [eligiblePisResponse]);

  const loading =
    grnsLoading ||
    formatConfigsLoading ||
    approvedLegacy.isLoading ||
    approvedCanonical.isLoading ||
    partialLegacy.isLoading ||
    partialCanonical.isLoading;

  const refreshAll = async () => {
    try {
      await Promise.all([
        refetchGrns(),
        refetchFormatConfig(),
        refetchFormatConfigs(),
        approvedLegacy.refetch(),
        approvedCanonical.refetch(),
        partialLegacy.refetch(),
        partialCanonical.refetch(),
      ]);
    } catch {
      toast.error('Failed to refresh goods receipts');
    }
  };

  const resetCreateState = () => {
    setGrnForm(createDefaultGrnForm(activeFormatId));
    setSelectedPo(null);
    setCreatedGrnId(null);
  };

  const resetGrnUploadSession = () => {
    if (uploadGrnFileURL) URL.revokeObjectURL(uploadGrnFileURL);
    setUploadGrnFile(null);
    setUploadGrnFileURL(null);
    setUploadScanning(false);
    setUploadPreviewError(false);
    setPdfZoom(100);
    uploadInProgressRef.current = false;
    resetCreateState();
  };

  const startGrnCreate = (source) => {
    setGrnCreateOptionOpen(false);
    resetCreateState();
    setGrnForm({ ...createDefaultGrnForm(activeFormatId), source_type: source });

    if (source === GRN_SOURCE.PO) {
      if (purchaseOrders.length === 0) {
        toast.error('No open purchase orders available for goods receipt');
        return;
      }
      setShowPoPicker(true);
      return;
    }

    if (source === GRN_SOURCE.STANDALONE) {
      setGrnForm((current) => ({
        ...current,
        line_items: [createEmptyGrnLineItem()],
      }));
      setCreateDialogOpen(true);
      return;
    }

    if (source === GRN_SOURCE.FROM_PI) {
      if (!hasPiSubscription) {
        toast.error('Proforma Invoice module is not enabled');
        return;
      }
      setShowPiPicker(true);
      return;
    }

    if (source === GRN_SOURCE.UPLOAD) {
      setShowGrnUploadPicker(true);
    }
  };

  const handleSelectPo = async (poId) => {
    try {
      const poResponse = await getPurchaseOrderById(poId).unwrap();
      const po = normalizePurchaseOrder(poResponse);

      let receiptStateLines = null;
      try {
        const receiptStateResponse = await getPoLinesReceiptState(poId).unwrap();
        const parsedLines = getPoReceiptStateLines(receiptStateResponse);
        if (parsedLines.length > 0) {
          receiptStateLines = parsedLines;
        }
      } catch {
        // Fall back to PO detail quantities when receipt-state API is unavailable.
      }

      const lineItems = buildGrnLineItemsFromPo(po, receiptStateLines);
      const hasPendingQty = lineItems.some((line) => Number(line.pending_quantity) > 0);

      setSelectedPo(po);
      setGrnForm((current) => ({
        ...current,
        source_type: GRN_SOURCE.PO,
        po_id: poId,
        vendor_id: po.vendor_id,
        vendor_name: po.vendor_name,
        received_at_location: po.shipping_address || current.received_at_location,
        line_items: lineItems,
      }));

      if (!lineItems.length) {
        toast.warning('This purchase order has no line items to receive');
      } else if (!hasPendingQty) {
        toast.warning('This purchase order has no pending quantities left to receive');
      }
    } catch {
      toast.error('Failed to load PO details');
      throw new Error('po-load-failed');
    }
  };

  const persistGrn = async ({ submit = false, fromUpload = false } = {}) => {
    if (!guardAction('grn.create')) return;

    const selectedFormat = resolveFormFormatConfig(grnForm);
    const validationError = validateGrnLineItems(grnForm.line_items, {
      qcEnabled: selectedFormat.qc_enabled,
    });
    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (grnForm.source_type === GRN_SOURCE.PO && !grnForm.po_id) {
      toast.error('Please select a purchase order');
      return;
    }

    if (
      (grnForm.source_type === GRN_SOURCE.STANDALONE || grnForm.requires_vendor) &&
      !grnForm.vendor_id
    ) {
      toast.error('Please select a vendor');
      return;
    }

    const payload = buildCreateGrnPayload(grnForm, {
      formatConfig: selectedFormat,
      qcEnabled: selectedFormat.qc_enabled,
    });

    try {
      let grnId = createdGrnId;
      if (!grnId) {
        const data = await createGrn(payload).unwrap();
        grnId = data?.grn?.id ?? data?.id;
        setCreatedGrnId(grnId);
        toast.success(`GRN ${data?.grn?.grn_number || ''} created`);
      }

      if (submit && grnId) {
        if (selectedFormat.approval_enabled) {
          await submitGrn(grnId).unwrap();
          toast.success('GRN submitted for approval');
        } else {
          await postGrn(grnId).unwrap();
          toast.success('GRN posted successfully');
        }
      }

      if (fromUpload) {
        resetGrnUploadSession();
        setShowGrnUploadPicker(false);
      } else {
        setCreateDialogOpen(false);
        resetCreateState();
      }
      refreshAll();
    } catch (error) {
      if (handleCreditError(error)) return;
      toast.error(error?.data?.detail || error?.data?.message || 'Failed to save GRN');
    }
  };

  const openGrnReview = (grn) => {
    setApprovalGrn(grn);
    setApprovalForm({ action: GRN_APPROVAL_ACTION.APPROVED, comments: '' });
    setShowApprovalDialog(true);
  };

  const handleGrnApproval = async () => {
    if (!guardAction('grn.post')) return;
    if (!approvalGrn?.id) return;

    setApprovalSubmitting(true);
    try {
      const comments = approvalForm.comments.trim();

      if (approvalForm.action === GRN_APPROVAL_ACTION.APPROVED) {
        try {
          await approveGrn(approvalGrn.id).unwrap();
        } catch {
          await postGrn(approvalGrn.id).unwrap();
        }
        toast.success('GRN approved');
      } else if (approvalForm.action === GRN_APPROVAL_ACTION.SENT_BACK) {
        await sendBackGrn({ id: approvalGrn.id, reason: comments, comments }).unwrap();
        toast.success('GRN sent back for revision');
      } else {
        await rejectGrn({ id: approvalGrn.id, reason: comments }).unwrap();
        toast.success('GRN rejected');
      }

      setShowApprovalDialog(false);
      setApprovalGrn(null);
      setApprovalForm({ action: GRN_APPROVAL_ACTION.APPROVED, comments: '' });
      setDetailGrn(null);
      refreshAll();
    } catch (error) {
      toast.error(error?.data?.detail || error?.data?.message || 'Failed to process GRN review');
    } finally {
      setApprovalSubmitting(false);
    }
  };

  const handlePost = async () => {
    if (!detailGrn || !guardAction('grn.post')) return;
    try {
      await postGrn(detailGrn.id).unwrap();
      toast.success('GRN posted successfully');
      setDetailGrn(null);
      refreshAll();
    } catch (error) {
      toast.error(error?.data?.detail || 'Failed to post GRN');
    }
  };

  const openBuilderDialog = (open) => {
    if (open) {
      setBuilderDraftConfig(
        makeGrnFormatConfig(activeFormatConfig, 'default-grn-format', 'Standard GRN Format', tenantBranding),
      );
    }
    setShowBuilderDialog(open);
  };

  const handleSaveFormatConfig = async () => {
    const trimmedName = sanitizeGrnFormatName(builderDraftConfig.name, '');
    const duplicateError = getDuplicateGrnFormatNameError(
      trimmedName,
      savedFormatConfigs,
      isUnsavedGrnFormat(builderDraftConfig.id) ? '' : builderDraftConfig.id,
    );
    if (duplicateError) {
      toast.error(duplicateError);
      return;
    }

    const nextConfig = {
      ...makeGrnFormatConfig(builderDraftConfig, 'default-grn-format', 'Standard GRN Format', tenantBranding),
      name: trimmedName,
      configVersion: (builderDraftConfig.configVersion || 0) + 1,
    };
    const payload = buildGrnFormatConfigPayload(nextConfig);

    setSavingConfig(true);
    try {
      const data = isUnsavedGrnFormat(nextConfig.id)
        ? await createGrnFormatConfig(payload).unwrap()
        : await updateGrnFormatConfigById({ id: nextConfig.id, body: payload }).unwrap();
      const savedConfig = makeGrnFormatConfig(
        getCreatedGrnFormatFromResponse(data) || nextConfig,
        nextConfig.id,
        nextConfig.name,
        tenantBranding,
      );

      setSavedFormatConfigs((prev) => {
        const existingId = isUnsavedGrnFormat(nextConfig.id) ? savedConfig.id : nextConfig.id;
        const exists = prev.some((config) => config.id === existingId || config.id === nextConfig.id);
        return exists
          ? prev.map((config) =>
              config.id === existingId || config.id === nextConfig.id ? savedConfig : config,
            )
          : [...prev, savedConfig];
      });
      setActiveFormatId(savedConfig.id);
      setBuilderDraftConfig(savedConfig);
      setShowBuilderDialog(false);
      setGrnForm((prev) => ({
        ...prev,
        grn_format_id: savedConfig.id,
      }));
      await Promise.all([refetchFormatConfigs(), refetchFormatConfig()]);
      toast.success(`GRN format "${savedConfig.name}" saved`);
    } catch (error) {
      toast.error(error?.data?.detail || error?.data?.message || 'Failed to save GRN format');
    } finally {
      setSavingConfig(false);
    }
  };

  const createNewBuilderFormat = () => {
    const id = `new-format-${Date.now()}`;
    const name = getNextGrnFormatName(savedFormatConfigs);
    setBuilderDraftConfig({
      ...makeGrnFormatConfig(activeFormatConfig, id, name, tenantBranding),
      id,
      name,
      configVersion: 0,
    });
  };

  const selectBuilderFormat = (formatId) => {
    const selectedFormat = savedFormatConfigs.find((config) => config.id === formatId);
    if (!selectedFormat) return;
    setBuilderDraftConfig(
      makeGrnFormatConfig(selectedFormat, 'default-grn-format', 'Standard GRN Format', tenantBranding),
    );
    setActiveFormatId(selectedFormat.id);
  };

  const deleteBuilderFormat = async () => {
    if (savedFormatConfigs.length <= 1) {
      toast.error('At least one GRN format is required');
      return;
    }

    const deletingFormatId = builderDraftConfig.id;
    const remainingFormats = savedFormatConfigs.filter((config) => config.id !== deletingFormatId);
    const nextActiveFormat =
      remainingFormats.find((config) => config.id === activeFormatId) || remainingFormats[0];

    setSavingConfig(true);
    try {
      if (!isUnsavedGrnFormat(deletingFormatId)) {
        await deleteGrnFormatConfig(deletingFormatId).unwrap();
      }

      setSavedFormatConfigs(remainingFormats);
      setActiveFormatId(nextActiveFormat.id);
      setBuilderDraftConfig(
        makeGrnFormatConfig(nextActiveFormat, 'default-grn-format', 'Standard GRN Format', tenantBranding),
      );
      setGrnForm((prev) => {
        if (prev.grn_format_id !== deletingFormatId) return prev;
        return { ...prev, grn_format_id: nextActiveFormat.id };
      });
      await Promise.all([refetchFormatConfigs(), refetchFormatConfig()]);
      toast.success('GRN format deleted');
    } catch (error) {
      toast.error(error?.data?.detail || error?.data?.message || 'Failed to delete GRN format');
    } finally {
      setSavingConfig(false);
    }
  };

  const applyGrnFormat = (formatId) => {
    const selectedFormat = savedFormatConfigs.find((config) => config.id === formatId);
    if (!selectedFormat) return;
    setActiveFormatId(selectedFormat.id);
    setGrnForm((prev) => ({ ...prev, grn_format_id: selectedFormat.id }));
  };

  const handleExtractUpload = useCallback(
    async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      const result = await extractGrnDocument(formData).unwrap();
      const extracted = result?.data ?? result?.result ?? result;
      setSelectedPo(null);
      setGrnForm((current) => ({
        ...current,
        source_type: GRN_SOURCE.UPLOAD,
        po_id: '',
        requires_vendor: false,
        receipt_date: extracted?.grn_date || current.receipt_date,
        delivery_note_number: extracted?.delivery_challan_no || '',
        delivery_challan_no: extracted?.delivery_challan_no || '',
        eway_bill_no: extracted?.eway_bill_no || '',
        vehicle_number: extracted?.vehicle_no || '',
        transporter_name: extracted?.transporter_name || '',
        received_at_location: extracted?.received_at_location || '',
        received_by: extracted?.received_by || '',
        remarks: extracted?.remarks || '',
        line_items: (extracted?.items || []).length
          ? (extracted.items || []).map((item) => ({
              item_code: item.item_code || '',
              item_description: item.description || '',
              hsn_sac: item.hsn_sac || '',
              uom: item.uom || 'PCS',
              ordered_quantity: item.ordered_qty || 0,
              already_received: 0,
              pending_quantity: 0,
              received_quantity: item.received_qty || 0,
              accepted_quantity: item.accepted_qty ?? item.received_qty ?? 0,
              rejected_quantity: item.rejected_qty || 0,
              rejection_reason: item.rejection_reason || '',
              batch_no: item.batch_no || '',
            }))
          : [createEmptyGrnLineItem()],
      }));
      return true;
    },
    [extractGrnDocument],
  );

  const processGrnUploadFile = async (file) => {
    if (!guardAction('grn.create')) return false;
    if (!file) return false;

    uploadInProgressRef.current = true;
    const fileURL = URL.createObjectURL(file);
    if (uploadGrnFileURL) URL.revokeObjectURL(uploadGrnFileURL);
    setUploadGrnFileURL(fileURL);
    setUploadGrnFile(file);
    setUploadScanning(true);
    setUploadPreviewError(false);
    resetCreateState();
    setGrnForm({ ...createDefaultGrnForm(activeFormatId), source_type: GRN_SOURCE.UPLOAD });

    try {
      await handleExtractUpload(file);
      toast.success('GRN scanned successfully');
    } catch (error) {
      if (handleCreditError(error)) {
        resetGrnUploadSession();
        return false;
      }

      setGrnForm({
        ...createDefaultGrnForm(activeFormatId),
        source_type: GRN_SOURCE.UPLOAD,
        requires_vendor: true,
        line_items: [createEmptyGrnLineItem()],
      });
      toast.warning(
        <div className="space-y-2">
          <p className="font-bold text-base">Scan Failed</p>
          <p className="text-sm">
            {error?.data?.detail || error?.data?.message || 'Failed to scan GRN'}
          </p>
          <p className="text-sm">Enter GRN details manually using the form.</p>
        </div>,
        { duration: 8000 },
      );
    } finally {
      setUploadScanning(false);
      uploadInProgressRef.current = false;
    }

    return false;
  };

  const handleUploadPickerOpenChange = (open) => {
    setShowGrnUploadPicker(open);
    if (!open && !uploadInProgressRef.current && !uploadGrnFile) {
      resetGrnUploadSession();
    }
  };

  const handleRetryGrnUpload = () => {
    resetGrnUploadSession();
    setShowGrnUploadPicker(true);
  };

  const handleCreateFromPi = async (pi) => {
    const piId = pi.id ?? pi.pi_id ?? pi.piId;
    if (!piId) {
      toast.error('PI reference is missing');
      return;
    }
    try {
      const result = await createGrnFromPi(piId).unwrap();
      const grn = normalizeGrn(result?.grn ?? result);
      setSelectedPo(null);
      setGrnForm({
        ...createDefaultGrnForm(activeFormatId),
        source_type: GRN_SOURCE.FROM_PI,
        po_id: grn.po_id,
        vendor_id: grn.vendor_id,
        receipt_date: grn.receipt_date || createDefaultGrnForm(activeFormatId).receipt_date,
        line_items: grn.line_items?.length ? grn.line_items : [createEmptyGrnLineItem()],
      });
      setCreatedGrnId(grn.id);
      setShowPiPicker(false);
      setCreateDialogOpen(true);
      toast.success('Draft GRN created from PI — confirm received quantities');
    } catch (error) {
      toast.error(error?.data?.detail || 'Failed to create GRN from PI');
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="goods-receipt-page">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Goods Receipt</h1>
          <p className="text-muted-foreground">
            Record and manage goods received notes against purchase orders
          </p>
          {activeFormatConfig?.name && (
            <p className="mt-1 text-xs text-muted-foreground">
              Default format: {activeFormatConfig.name}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RefreshButton onClick={refreshAll} refreshing={loading}>
            Refresh
          </RefreshButton>
          {canCreateGrn && (
            <>
              <Button
                variant="outline"
                onClick={() => openBuilderDialog(true)}
                data-testid="open-grn-builder-btn"
              >
                <Settings2 className="mr-2 h-4 w-4" />
                Format Builder
              </Button>
              <GrnCreateMenu
                open={grnCreateOptionOpen}
                onToggle={() => setGrnCreateOptionOpen((prev) => !prev)}
                onSelect={startGrnCreate}
                isPiEnabled={hasPiSubscription}
              />
            </>
          )}
        </div>
      </div>

      <GrnListTab
        grns={grns}
        pendingPoCount={purchaseOrders.length}
        canCreate={canCreateGrn}
        canApprove={canPostGrn}
        onCreate={() => setGrnCreateOptionOpen(true)}
        onView={setDetailGrn}
        onReview={openGrnReview}
      />

      <GrnFormatBuilderDialog
        open={showBuilderDialog}
        onOpenChange={openBuilderDialog}
        draftConfig={builderDraftConfig}
        setDraftConfig={setBuilderDraftConfig}
        savedFormatConfigs={savedFormatConfigs}
        activeFormatId={activeFormatId}
        onSelectFormat={selectBuilderFormat}
        onCreateFormat={createNewBuilderFormat}
        onDeleteFormat={deleteBuilderFormat}
        onSave={handleSaveFormatConfig}
        saving={savingConfig}
      />

      <GrnUploadDialog
        open={showGrnUploadPicker && !uploadGrnFile}
        onOpenChange={handleUploadPickerOpenChange}
        onFileSelected={processGrnUploadFile}
        disabled={uploadScanning || uploadInProgressRef.current}
      />

      {uploadGrnFile ? (
        <GrnUploadSection
          uploadedFile={uploadGrnFile}
          onClose={() => {
            resetGrnUploadSession();
            setShowGrnUploadPicker(false);
          }}
          scanning={uploadScanning}
          saving={creating}
          grnUploadEstimateDisabled={grnUploadEstimate.isDisabled}
          onSaveDraft={() => persistGrn({ submit: false, fromUpload: true })}
          onSubmit={() => persistGrn({ submit: true, fromUpload: true })}
          submitLabel={uploadFormFormatConfig?.approval_enabled ? 'Submit for Approval' : 'Post GRN'}
          renderDocumentPreview={() => (
            <InvoicePdfPreview
              fileURL={uploadGrnFileURL}
              file={uploadGrnFile}
              zoom={pdfZoom}
              imageError={uploadPreviewError}
              setImageError={setUploadPreviewError}
              setPdfZoom={setPdfZoom}
            />
          )}
          renderGrnForm={() => (
            <GrnUploadFormPanel
              form={grnForm}
              setForm={setGrnForm}
              formatConfig={uploadFormFormatConfig}
              formatConfigs={savedFormatConfigs}
              activeFormatId={activeFormatId}
              onFormatChange={applyGrnFormat}
              vendors={vendorsData}
              extractionFailed={Boolean(grnForm.requires_vendor)}
              onRetryUpload={handleRetryGrnUpload}
            />
          )}
        />
      ) : null}

      <GrnPoPickerDialog
        open={showPoPicker}
        onOpenChange={setShowPoPicker}
        purchaseOrders={purchaseOrders}
        onSelect={async (poId) => {
          try {
            await handleSelectPo(poId);
            setShowPoPicker(false);
            setCreateDialogOpen(true);
          } catch {
            // handleSelectPo surfaces toast on failure
          }
        }}
      />

      <GrnPiPickerDialog
        open={showPiPicker}
        onOpenChange={setShowPiPicker}
        eligiblePis={eligiblePis}
        onSelect={handleCreateFromPi}
      />

      <GrnCreateDialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          if (!open) resetCreateState();
          setCreateDialogOpen(open);
        }}
        formatConfig={createFormFormatConfig}
        formatConfigs={savedFormatConfigs}
        activeFormatId={activeFormatId}
        onFormatChange={applyGrnFormat}
        form={grnForm}
        setForm={setGrnForm}
        selectedPo={selectedPo}
        vendors={vendorsData}
        saving={creating}
        onSaveDraft={() => persistGrn({ submit: false })}
        onSubmit={() => persistGrn({ submit: true })}
      />

      <GrnApprovalDialog
        open={showApprovalDialog}
        onOpenChange={(open) => {
          setShowApprovalDialog(open);
          if (!open) {
            setApprovalGrn(null);
            setApprovalForm({ action: GRN_APPROVAL_ACTION.APPROVED, comments: '' });
          }
        }}
        grn={approvalGrn}
        approvalForm={approvalForm}
        setApprovalForm={setApprovalForm}
        onSubmit={handleGrnApproval}
        submitting={approvalSubmitting}
        canApprove={canPostGrn}
      />

      <GrnDetailDialog
        grn={detailGrn}
        open={Boolean(detailGrn)}
        onOpenChange={(open) => {
          if (!open) setDetailGrn(null);
        }}
        formatConfig={activeFormatConfig}
        canApprove={canPostGrn}
        canPost={canPostGrn}
        posting={posting}
        onOpenReview={openGrnReview}
        onPost={handlePost}
        onDownloadPdf={() =>
          toast.message('PDF download will be available when backend endpoint is ready')
        }
      />
    </div>
  );
};

export default GoodsReceipt;

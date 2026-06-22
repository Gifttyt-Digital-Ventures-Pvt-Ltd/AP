import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  useGetInvoicesQuery,
  useGetInvoiceMandatoryFieldsQuery,
  useGetVendorsQuery,
  useGetPendingVendorApprovalsQuery,
  useScanInvoiceMutation,
  useBulkUploadInvoicesMutation,
  useRequestVendorAdditionMutation,
  useCreateInvoiceMutation,
  useLazyGetInvoiceHistoryQuery,
  useUpdateInvoiceMutation,
  useForwardInvoiceMutation,
  useDeleteInvoiceMutation,
} from "../../Services/apis/invoicesVendorsApi";
import {
  getInvoiceMandatoryFieldValidationMessage,
  isInvoiceMandatoryFieldsSatisfied,
  normalizeInvoiceMandatoryFields,
} from "./utils/mandatoryFields";
import {
  getBulkExtractResults,
  getDuplicateInvoiceMessage,
  isDuplicateBulkExtractResult,
  isDuplicateBulkPreviewItem,
  isDuplicateInvoiceError,
  normalizeBulkExtractResult,
} from "./utils/duplicateInvoice";
import {
  applyForeignLineItemTax,
  applyInrLineItemTax,
  calculateInvoiceTotals,
  createDefaultLineItem,
  DEFAULT_INR_TAX,
  INVOICE_LEVEL,
  isInrInvoiceCurrency,
  LINE_ITEM_LEVEL,
  remapLineItemsForCurrencyChange,
  resolveLineItemSubtotal,
  syncLineItemLineTotal,
} from "./utils/invoiceTax";
import { parseNumericInput } from "./utils/numericInput";
import { buildInvoiceEditFormData } from "./utils/invoiceFormData";
import { normalizeInvoiceHistoryEntries } from "./utils/invoiceHistory";
import {
  buildInvoiceCategoryPayload,
  buildInvoiceMultipartPayload,
  buildToCreateInvoicePayload,
  computeTdsAmount,
  initializeInvoiceFormData,
  mapBulkLineItemToEditForm,
  mapBulkLineItemToPayload,
  normalizeLineItemsForTaxLevel,
} from "./utils/invoicePayloadBuilders";
import { normalizeScannedInvoice } from "./utils/scanNormalization";
import {
  createEmptyVendorRequestForm,
  buildVendorRequestForm,
  formatBulkStatusLabel,
  getBulkStatusBadgeClass,
} from "./utils/invoiceBulkUtils";
import { getInvoiceFileUrl } from "./utils/invoicePreview";
import {
  EMPTY_INVOICE_LIST_RESPONSE,
  extractVendorIdFromResponse,
  getInvoiceListItems,
  mergeInvoiceVendorOptions,
} from "../../Services/utils/payloadMappers";
import {
  useGetCorporateDepartmentsQuery,
  useGetCorporateUserDetailsQuery,
} from "../../Services/apis/corporateApi";
import { useGetCategoriesForInvoiceQuery } from "../../Services/apis/categoriesApi";
import { useAuth } from "../../contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { useSidebar } from "../../components/Layout";
import {
  GST_TREATMENTS,
  INDIAN_STATES,
  INVOICE_LIST_FILTERS,
  INVOICE_LIST_PAGE_SIZE,
  INVOICE_SOURCES,
  LEDGER_OPTIONS,
  TAX_RATES,
} from "./constants";
import {
  formatInvoiceAmount,
  getInvoiceGrossAmount,
  getInvoiceNetAmount,
  getInvoiceTaxAmount,
  getInvoiceTdsAmount,
} from "./utils/invoiceAmounts";
import { Sparkles, Eye, Mail, Pencil, Search, Trash2 } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../../components/ui/pagination";
import { TableCell, TableRow } from "../../components/ui/table";
import { cn } from "../../lib/utils";
import AppDataTable from "../../components/common/AppDataTable";
import ClippedTextWithTooltip from "../../components/common/ClippedTextWithTooltip";
import CurrencySelector from "../../components/common/CurrencySelector";
import RefreshButton from "../../components/common/RefreshButton";
import { InvoicePdfPreview } from "./components/InvoicePdfPreview";
import { InvoiceForm } from "./components/InvoiceForm";
import UploadSection from "./components/UploadSection";
import InvoicesDialogs from "./components/InvoicesDialogs";
import InvoiceUploadDialog from "./components/InvoiceUploadDialog";
import { getInvoiceVendorRequestValidationErrors } from "../../utils/vendorValidation";
import { useActionGuard } from "../../hooks/useActionGuard";
import { useCreditErrorHandler } from "../../contexts/CreditErrorContext";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useRBAC } from "../../contexts/RBACContext";
import IntegrationSourceBadge from "../../components/integrations/IntegrationSourceBadge";
import useZohoIntegrationActive from "../../hooks/useZohoIntegrationActive";
import { withIntegrationTableHeader } from "../../utils/integrationProvenance";
import { useCurrencyFilter } from "../../hooks/useCurrencyFilter";
import {
  CURRENCY_SCREENS,
  DEFAULT_CURRENCY,
  normalizeCurrencyCode,
} from "../../utils/currency";
import {
  isCheckerEditEnabled as isCheckerEditEnabledForCorporate,
  isCheckerEditForbiddenError,
  isRefNoEnabled as isRefNoEnabledForCorporate,
} from "../../utils/invoiceConfiguration";
import {
  buildCurrentUserIdentity,
  canDeleteInvoice,
  canEditInvoice,
  extractApiErrorDetail,
  formatWorkflowStatus,
  getInvoiceEditBlockedMessage,
  getInvoiceStatusBadgeClass,
  isSavedInvoiceStatus,
  canForwardSavedInvoice,
  resolveBulkCreateInvoiceStatus,
  resolveInitialInvoiceStatus,
} from "../../utils/approvalWorkflow";

const getApprovalWorkflowName = (invoice) =>
  invoice.approvalWorkflowName ??
  invoice.workflowName ??
  invoice.approvalWorkflow?.name ??
  "-";

const baseInvoiceTableHeader = [
  {
    key: "srNo",
    title: "Sr. No",
    headerClassName: "p-3 text-left text-xs font-medium",
    cellClassName: "p-3 text-sm font-medium",
  },
  {
    key: "source",
    title: "Source",
    headerClassName: "p-3 text-left text-xs font-medium",
    cellClassName: "p-3",
  },
  {
    key: "invoiceNumber",
    title: "Invoice #",
    headerClassName: "p-3 text-left text-xs font-medium",
    cellClassName: "p-3   text-sm font-medium",
  },
  {
    key: "refNo",
    title: "Ref No",
    headerClassName: "p-3 text-left text-xs font-medium",
    cellClassName: "p-3 text-sm font-mono",
  },
  {
    key: "vendorName",
    title: "Vendor",
    headerClassName: "p-3 text-left text-xs font-medium",
    cellClassName: "p-3 text-sm",
  },
  {
    key: "originalFileName",
    title: "Original File Name",
    headerClassName: "p-3 text-left text-xs font-medium",
    cellClassName: "p-3 text-xs   text-muted-foreground",
  },
  {
    key: "grossAmount",
    title: "Gross Amount",
    headerClassName: "p-3 text-left text-xs font-medium",
    cellClassName: "p-3   text-sm font-semibold text-left",
  },
  {
    key: "taxAmount",
    title: "GST / Tax",
    headerClassName: "p-3 text-left text-xs font-medium",
    cellClassName: "p-3   text-sm text-left",
  },
  {
    key: "tdsAmount",
    title: "TDS",
    headerClassName: "p-3 text-left text-xs font-medium",
    cellClassName: "p-3   text-sm text-left",
  },
  {
    key: "netAmount",
    title: "Net Amount",
    headerClassName: "p-3 text-left text-xs font-medium",
    cellClassName: "p-3   text-sm font-semibold text-left",
  },
  {
    key: "approvalWorkflowName",
    title: "Approval Workflow",
    headerClassName: "p-3 text-left text-xs font-medium",
    cellClassName: "p-3 text-sm whitespace-nowrap",
  },
  {
    key: "invoiceDate",
    title: "Invoice Date",
    headerClassName: "p-3 text-left text-xs font-medium",
    cellClassName: "p-3 text-xs text-muted-foreground whitespace-nowrap",
  },
  {
    key: "status",
    title: "Status",
    headerClassName: "p-3 text-left text-xs font-medium",
    cellClassName: "p-3",
  },
  {
    key: "createdAt",
    title: "Created At",
    headerClassName: "p-3 text-left text-xs font-medium",
    cellClassName: "p-3 text-xs text-muted-foreground whitespace-nowrap",
  },
  {
    key: "actions",
    title: "Actions",
    headerClassName: "p-3 text-left text-xs font-medium",
    cellClassName: "p-3 text-left",
  },
];

const InvoicesPage = () => {
  const { user } = useAuth();
  const {
    corporateScreens,
    isCategoryFeatureEnabled,
    isCampaignFeatureEnabled,
    isCorporateAdmin,
  } = useRBAC();
  const { showIntegrationColumn } = useZohoIntegrationActive();
  const { data: corporateUserContext = null } =
    useGetCorporateUserDetailsQuery();
  const invoiceUserEmail =
    corporateUserContext?.corporateUser?.email ||
    corporateUserContext?.employeeDetails?.email ||
    user?.email ||
    user?.identifier ||
    "";
  const {
    currencies,
    selectedCurrency,
    setSelectedCurrency,
    currencyParam,
    queryArgs: currencyQueryArgs,
  } = useCurrencyFilter(CURRENCY_SCREENS.INVOICE);
  const invoiceCurrencyOptions = useMemo(
    () => currencies.filter((currency) => currency !== "ALL"),
    [currencies],
  );
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [invoicePageOffset, setInvoicePageOffset] = useState(0);
  const debouncedSearchTerm = useDebouncedValue(searchTerm.trim(), 300);

  useEffect(() => {
    setInvoicePageOffset(0);
  }, [invoiceStatusFilter, debouncedSearchTerm, currencyParam]);

  const invoiceQueryArgs = useMemo(
    () => ({
      ...currencyQueryArgs,
      limit: INVOICE_LIST_PAGE_SIZE,
      offset: invoicePageOffset,
      ...(invoiceStatusFilter !== "all" ? { filter: invoiceStatusFilter } : {}),
      ...(debouncedSearchTerm ? { search: debouncedSearchTerm } : {}),
    }),
    [
      currencyQueryArgs,
      invoiceStatusFilter,
      debouncedSearchTerm,
      invoicePageOffset,
    ],
  );
  const {
    data: invoicesListData = EMPTY_INVOICE_LIST_RESPONSE,
    isFetching: invoicesFetching,
    refetch: refetchInvoices,
  } = useGetInvoicesQuery(invoiceQueryArgs);
  const {
    data: vendorsData = [],
    isFetching: vendorsFetching,
    refetch: refetchVendors,
  } = useGetVendorsQuery();
  const {
    data: pendingVendorsData = [],
    isFetching: pendingVendorsFetching,
    refetch: refetchPendingVendors,
  } = useGetPendingVendorApprovalsQuery();
  const { data: departmentsData = [] } = useGetCorporateDepartmentsQuery();
  const {
    data: invoiceMandatoryFieldsData,
    isLoading: invoiceMandatoryFieldsLoading,
  } = useGetInvoiceMandatoryFieldsQuery(
    { userEmail: invoiceUserEmail },
    { skip: !invoiceUserEmail },
  );
  const invoiceMandatoryFields = useMemo(
    () => normalizeInvoiceMandatoryFields(invoiceMandatoryFieldsData),
    [invoiceMandatoryFieldsData],
  );
  const mandatoryFieldOptions = useMemo(
    () => ({ showCategoryField: isCategoryFeatureEnabled }),
    [isCategoryFeatureEnabled],
  );
  const {
    data: invoiceCategoriesData = [],
    isLoading: invoiceCategoriesLoading,
    isFetching: invoiceCategoriesFetching,
  } = useGetCategoriesForInvoiceQuery(
    {
      userEmail: invoiceUserEmail,
      ...(currencyParam ? { currency: currencyParam } : {}),
    },
    {
      skip: !invoiceUserEmail || !isCategoryFeatureEnabled,
    },
  );
  const [scanInvoice] = useScanInvoiceMutation();
  const [bulkUploadInvoices] = useBulkUploadInvoicesMutation();
  const [requestVendorAddition, { isLoading: requestVendorLoading }] =
    useRequestVendorAdditionMutation();
  const [createInvoice] = useCreateInvoiceMutation();
  const [getInvoiceHistory] = useLazyGetInvoiceHistoryQuery();
  const [updateInvoice, { isLoading: updateInvoiceLoading }] =
    useUpdateInvoiceMutation();
  const [forwardInvoice, { isLoading: forwardInvoiceLoading }] =
    useForwardInvoiceMutation();
  const [deleteInvoice] = useDeleteInvoiceMutation();
  const { guardAction, canPerformAction } = useActionGuard();
  const { handleCreditError } = useCreditErrorHandler();
  const invoices = getInvoiceListItems(invoicesListData);
  const invoicePagination = useMemo(() => {
    const total = Number(invoicesListData.total ?? 0) || 0;
    const offset = Number(invoicesListData.offset ?? invoicePageOffset) || 0;
    const limit =
      Number(invoicesListData.limit ?? INVOICE_LIST_PAGE_SIZE) ||
      INVOICE_LIST_PAGE_SIZE;
    const currentPage = limit > 0 ? Math.floor(offset / limit) : 0;
    const totalPages = total > 0 ? Math.ceil(total / limit) : 0;

    return {
      total,
      offset,
      limit,
      hasMore: Boolean(invoicesListData.hasMore),
      currentPage,
      totalPages,
      startRecord: total === 0 ? 0 : offset + 1,
      endRecord: total === 0 ? 0 : Math.min(offset + invoices.length, total),
    };
  }, [invoicesListData, invoicePageOffset, invoices.length]);

  const goToInvoicePage = useCallback((pageIndex) => {
    const safePage = Math.max(0, pageIndex);
    setInvoicePageOffset(safePage * INVOICE_LIST_PAGE_SIZE);
  }, []);
  const approvedVendors = Array.isArray(vendorsData) ? vendorsData : [];
  const pendingVendors = Array.isArray(pendingVendorsData)
    ? pendingVendorsData
    : [];
  const invoiceVendorOptions = useMemo(
    () => mergeInvoiceVendorOptions(approvedVendors, pendingVendors),
    [approvedVendors, pendingVendors],
  );
  const departments = Array.isArray(departmentsData) ? departmentsData : [];
  const invoiceCategories =
    isCategoryFeatureEnabled && Array.isArray(invoiceCategoriesData)
      ? invoiceCategoriesData
      : [];
  const [activeTab, setActiveTab] = useState("list");
  const { setHideSidebar } = useSidebar();

  // Upload state
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadedFileURL, setUploadedFileURL] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [scanning, setScanning] = useState(false);
  const canScanInvoices = canPerformAction("invoices.scan");
  const canBulkUploadInvoices = canPerformAction("invoices.bulkUpload");
  const canUploadInvoices = canScanInvoices || canBulkUploadInvoices;
  const canManageInvoices = canPerformAction("invoices.create");
  const canUpdateInvoices = canPerformAction("invoices.update");
  const canDeleteInvoices = canPerformAction("invoices.delete");
  const canCheckInvoices = canPerformAction("invoices.check");
  const canAddVendors = canPerformAction("invoices.addVendor");
  const isCheckerEditEnabled = useMemo(
    () =>
      isCheckerEditEnabledForCorporate(
        corporateScreens?.activeInvoiceConfiguration ?? [],
      ),
    [corporateScreens?.activeInvoiceConfiguration],
  );
  const isRefNoEnabled = useMemo(
    () =>
      isRefNoEnabledForCorporate(
        corporateScreens?.activeInvoiceConfiguration ?? [],
      ),
    [corporateScreens?.activeInvoiceConfiguration],
  );
  const invoiceTableHeader = useMemo(() => {
    const headers = isRefNoEnabled
      ? baseInvoiceTableHeader
      : baseInvoiceTableHeader.filter((column) => column.key !== "refNo");
    return withIntegrationTableHeader(headers, showIntegrationColumn);
  }, [isRefNoEnabled, showIntegrationColumn]);
  const invoiceEditContext = useMemo(
    () => ({
      ...buildCurrentUserIdentity({ user, corporateUserContext }),
      canUpdateInvoices,
      canManageInvoices,
      canCheckInvoices,
      isCorporateAdmin,
      isCheckerEditEnabled,
    }),
    [
      user,
      corporateUserContext,
      canUpdateInvoices,
      canManageInvoices,
      canCheckInvoices,
      isCorporateAdmin,
      isCheckerEditEnabled,
    ],
  );

  // PDF Zoom
  const [pdfZoom, setPdfZoom] = useState(100);

  // View/Edit state
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [uploadPreviewError, setUploadPreviewError] = useState(false);
  const [viewPreviewError, setViewPreviewError] = useState(false);

  // Enhanced form data for both upload and edit
  const [formData, setFormData] = useState(null);

  // History state
  const [invoiceHistory, setInvoiceHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [viewTab, setViewTab] = useState("details");
  const [bulkPreviewOpen, setBulkPreviewOpen] = useState(false);
  const [bulkPreviewItems, setBulkPreviewItems] = useState([]);
  const [bulkCreating, setBulkCreating] = useState(false);
  const [bulkExtracting, setBulkExtracting] = useState(false);
  const [bulkExtractTotalFiles, setBulkExtractTotalFiles] = useState(0);
  const [bulkExtractStartedAt, setBulkExtractStartedAt] = useState(null);
  const [bulkExtractProgress, setBulkExtractProgress] = useState(0);
  const [bulkProgress, setBulkProgress] = useState({
    total: 0,
    processed: 0,
    success: 0,
    failed: 0,
    startedAt: null,
  });
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkEditItemId, setBulkEditItemId] = useState("");
  const [bulkEditForm, setBulkEditForm] = useState(null);
  const [bulkEditPreviewError, setBulkEditPreviewError] = useState(false);
  const [bulkEditFileURL, setBulkEditFileURL] = useState(null);
  const [bulkAddingVendorItemId, setBulkAddingVendorItemId] = useState("");
  const [invoiceDeleteTarget, setInvoiceDeleteTarget] = useState(null);
  const [requestVendorOpen, setRequestVendorOpen] = useState(false);
  const [invoiceUploadDialogOpen, setInvoiceUploadDialogOpen] = useState(false);
  const [requestVendorContext, setRequestVendorContext] = useState(null);
  const [requestVendorForm, setRequestVendorForm] = useState(
    createEmptyVendorRequestForm,
  );

  // Hide sidebar while upload or edit dialog is open
  useEffect(() => {
    setHideSidebar(Boolean(uploadedFile) || editDialogOpen);
    return () => setHideSidebar(false);
  }, [uploadedFile, editDialogOpen, setHideSidebar]);

  useEffect(() => {
    setUploadPreviewError(false);
  }, [uploadedFileURL, uploadedFile]);

  useEffect(() => {
    setViewPreviewError(false);
  }, [selectedInvoice, viewDialogOpen]);

  useEffect(() => {
    if (!bulkEditOpen || !bulkEditItemId) {
      setBulkEditFileURL(null);
      return;
    }
    const selected = bulkPreviewItems.find(
      (item) => item.id === bulkEditItemId,
    );
    if (!selected?.file) {
      setBulkEditFileURL(null);
      return;
    }
    const url = URL.createObjectURL(selected.file);
    setBulkEditFileURL(url);
    return () => URL.revokeObjectURL(url);
  }, [bulkEditOpen, bulkEditItemId, bulkPreviewItems]);

  useEffect(() => {
    if (!bulkExtracting || !bulkExtractStartedAt) {
      setBulkExtractProgress(0);
      return;
    }
    const timerId = setInterval(() => {
      const elapsed = Math.max(
        0,
        Math.floor((Date.now() - bulkExtractStartedAt) / 1000),
      );
      // Simulated determinate progress until API returns (caps at 95%)
      setBulkExtractProgress((prev) => {
        const target = Math.min(95, 12 + elapsed * 8);
        return target > prev ? target : prev;
      });
    }, 1000);
    return () => clearInterval(timerId);
  }, [bulkExtracting, bulkExtractStartedAt]);

  useEffect(() => {
    if (!bulkPreviewOpen || bulkCreating || bulkPreviewItems.length === 0)
      return;
    const pendingRows = bulkPreviewItems.filter(
      (item) => item.status !== "uploaded",
    );
    if (pendingRows.length === 0) {
      setBulkPreviewOpen(false);
      setBulkPreviewItems([]);
    }
  }, [bulkPreviewOpen, bulkCreating, bulkPreviewItems]);

  const findVendorByName = useCallback(
    (vendorName) => {
      if (!vendorName) return null;
      const normalizedName = vendorName.toLowerCase().trim();
      return (
        invoiceVendorOptions.find(
          (vendor) =>
            String(vendor?.name || "")
              .toLowerCase()
              .trim() === normalizedName,
        ) || null
      );
    },
    [invoiceVendorOptions],
  );

  const findVendorById = useCallback(
    (vendorId) => {
      if (vendorId === null || vendorId === undefined || vendorId === "")
        return null;
      return (
        invoiceVendorOptions.find(
          (vendor) => String(vendor?.id) === String(vendorId),
        ) || null
      );
    },
    [invoiceVendorOptions],
  );

  const getDepartmentNameById = (departmentId) => {
    const selectedDepartment = departments.find(
      (department) =>
        String(
          department?.id ??
            department?.departmentId ??
            department?.departmentId ??
            "",
        ) === String(departmentId ?? ""),
    );
    return (
      selectedDepartment?.name ||
      selectedDepartment?.departmentName ||
      selectedDepartment?.departmentName ||
      ""
    );
  };

  const openRequestVendorDialog = ({ source = {}, context }) => {
    setRequestVendorContext(context);
    setRequestVendorForm(buildVendorRequestForm(source));
    setRequestVendorOpen(true);
  };

  const handleRequestVendorOpenChange = (open) => {
    setRequestVendorOpen(open);
    if (!open) {
      setRequestVendorContext(null);
      setRequestVendorForm(createEmptyVendorRequestForm());
    }
  };

  const getCategoryNameById = (categoryId) => {
    if (!isCategoryFeatureEnabled) return "";
    const selectedCategory = invoiceCategories.find(
      (category) => String(category?.id ?? "") === String(categoryId ?? ""),
    );
    return selectedCategory?.name || "";
  };

  const payloadBuilderDeps = {
    findVendorByName,
    getDepartmentNameById,
    getCategoryNameById,
    isCategoryFeatureEnabled,
    isCampaignFeatureEnabled,
  };

  const toCreateInvoicePayload = (invoiceData = {}, options = {}) =>
    buildToCreateInvoicePayload(invoiceData, options, payloadBuilderDeps);

  const buildMultipartPayload = (invoicePayload, file = null, options = {}) =>
    buildInvoiceMultipartPayload(invoicePayload, file, options, {
      isCategoryFeatureEnabled,
    });

  const buildBulkProceedPayload = (normalizedInvoice, file, filename = "") => {
    const formBase = normalizedInvoice
      ? initializeFormData(normalizedInvoice)
      : {
          ...initializeFormData(null),
          originalFileName: filename || file?.name || null,
        };

    return toCreateInvoicePayload({
      ...formBase,
      vendorName: formBase.vendorName?.trim() || "",
      originalFileName:
        formBase.originalFileName || filename || file?.name || null,
      currentFileName: file?.name || filename || null,
      status: resolveBulkCreateInvoiceStatus(),
    });
  };

  const initializeFormData = (extractedData = null) =>
    initializeInvoiceFormData(extractedData, {
      findVendorByName,
      isCategoryFeatureEnabled,
    });

  const buildCategoryPayload = (source = {}) =>
    buildInvoiceCategoryPayload(source, {
      isCategoryFeatureEnabled,
      getCategoryNameById,
    });

  const resetSingleUploadSession = () => {
    setUploadedFileURL((currentUrl) => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      return null;
    });
    setUploadedFile(null);
    setExtractedData(null);
    setFormData(null);
    setUploadPreviewError(false);
    setActiveTab("list");
  };

  const handleSingleInvoiceFile = async (file) => {
    if (!guardAction("invoices.scan")) return false;
    if (!file) return false;

    const fileURL = URL.createObjectURL(file);
    setUploadedFileURL(fileURL);
    setUploadedFile(file);
    setScanning(true);
    setActiveTab("upload");

    const formDataUpload = new FormData();
    formDataUpload.append("file", file);

    try {
      const response = await scanInvoice(formDataUpload).unwrap();
      const normalizedResponse =
        response?.data ??
        response?.result ??
        response?.extracted_data ??
        response;

      if (!normalizedResponse || typeof normalizedResponse !== "object") {
        throw new Error("Scan API returned empty response");
      }

      if (isDuplicateBulkExtractResult(normalizedResponse)) {
        resetSingleUploadSession();
        toast.error(
          <div className="space-y-2">
            <p className="font-bold text-base">Duplicate Invoice</p>
            <p className="text-sm whitespace-pre-line">
              {getDuplicateInvoiceMessage(normalizedResponse)}
            </p>
          </div>,
          { duration: 8000 },
        );
        return;
      }

      const extractedInvoice = normalizeScannedInvoice(normalizedResponse);
      setExtractedData(extractedInvoice);
      setFormData(initializeFormData(extractedInvoice));
      toast.success("Invoice scanned successfully!");
    } catch (error) {
      if (handleCreditError(error)) return;

      const errorMessage =
        extractApiErrorDetail(error) ||
        error?.data?.message ||
        error?.message ||
        "Failed to scan invoice";

      if (isDuplicateInvoiceError(error)) {
        resetSingleUploadSession();
        toast.error(
          <div className="space-y-2">
            <p className="font-bold text-base">Duplicate Invoice</p>
            <p className="text-sm whitespace-pre-line">{errorMessage}</p>
          </div>,
          { duration: 8000 },
        );
        return;
      }

      setExtractedData(null);
      setFormData({
        ...initializeFormData(null),
        originalFileName: file.name,
      });
      toast.warning(
        <div className="space-y-2">
          <p className="font-bold text-base">Scan Failed</p>
          <p className="text-sm whitespace-pre-line">{errorMessage}</p>
          <p className="text-sm">
            Enter invoice details manually using the form.
          </p>
        </div>,
        { duration: 8000 },
      );
    } finally {
      setScanning(false);
    }
    return true;
  };

  const handleBulkInvoiceFiles = async (filesInput) => {
    if (!guardAction("invoices.bulkUpload")) return false;
    const files = Array.from(filesInput || []);
    if (!files || files.length === 0) return false;
    setBulkProgress({
      total: 0,
      processed: 0,
      success: 0,
      failed: 0,
      startedAt: null,
    });
    setBulkExtracting(true);
    setBulkExtractTotalFiles(files.length);
    setBulkExtractStartedAt(Date.now());
    setBulkExtractProgress(8);

    const formDataUpload = new FormData();
    files.forEach((file) => {
      formDataUpload.append("files", file);
    });

    toast.info(`Uploading ${files.length} invoices...`, { duration: 3000 });

    try {
      const response = await bulkUploadInvoices(formDataUpload).unwrap();

      const normalizedResults = getBulkExtractResults(response).map(
        normalizeBulkExtractResult,
      );

      const fileMap = new Map(
        files.map((file) => [String(file.name || "").toLowerCase(), file]),
      );

      const previewItemsFromResults = normalizedResults.map((result, index) => {
        const isDuplicate = result.isDuplicate;
        const hasExtracted =
          result.status === "success" &&
          result.extracted &&
          typeof result.extracted === "object";
        const normalizedInvoice = hasExtracted
          ? normalizeScannedInvoice(result.extracted)
          : null;
        const matchingFile =
          fileMap.get(String(result?.filename || "").toLowerCase()) || null;
        const filename =
          result?.filename || matchingFile?.name || "Unknown file";
        const invoicePayload = buildBulkProceedPayload(
          normalizedInvoice,
          matchingFile,
          filename,
        );
        return {
          id: `${filename}-${index}`,
          filename,
          status: isDuplicate ? "duplicate" : result.status || "failed",
          error: isDuplicate
            ? result.duplicateMessage || getDuplicateInvoiceMessage(result)
            : result?.error || result?.message || "",
          isDuplicate,
          selected: false,
          invoicePayload,
          file: matchingFile,
        };
      });

      const resultFilenames = new Set(
        normalizedResults.map((result) =>
          String(result?.filename || "").toLowerCase(),
        ),
      );
      const previewItemsFromMissingFiles = files
        .filter(
          (file) => !resultFilenames.has(String(file.name || "").toLowerCase()),
        )
        .map((file, index) => ({
          id: `missing-${file.name}-${index}`,
          filename: file.name,
          status: "failed",
          error: "No scan result returned for this file",
          isDuplicate: false,
          selected: false,
          invoicePayload: buildBulkProceedPayload(null, file, file.name),
          file,
        }));

      const previewItems = [
        ...previewItemsFromResults,
        ...previewItemsFromMissingFiles,
      ];

      setBulkPreviewItems(previewItems);
      setBulkPreviewOpen(true);
      const scannedCount = previewItems.length;
      const duplicateCount = previewItems.filter(
        (item) => item.isDuplicate,
      ).length;
      const successCount = Number(
        response?.successful ??
          normalizedResults.filter(
            (r) => r.status === "success" && !r.isDuplicate,
          ).length,
      );
      toast.success(
        duplicateCount > 0
          ? `${scannedCount} file${scannedCount === 1 ? "" : "s"} scanned (${successCount} ok, ${duplicateCount} duplicate${duplicateCount === 1 ? "" : "s"}).`
          : `${scannedCount} invoice${scannedCount === 1 ? "" : "s"} scanned.`,
        { duration: 4000 },
      );
    } catch (error) {
      if (handleCreditError(error)) return true;

      const errorMessage = error?.data?.detail || "Bulk upload failed";
      toast.error(errorMessage, { duration: 6000 });
    } finally {
      setBulkExtractProgress(100);
      setBulkExtracting(false);
    }
    return true;
  };

  const handleInvoiceFilesUpload = async (filesInput) => {
    const files = Array.from(filesInput || []).filter(Boolean);
    if (files.length === 0) return false;

    if (files.length === 1) {
      return handleSingleInvoiceFile(files[0]);
    }

    return handleBulkInvoiceFiles(files);
  };

  const handleCreateBulkInvoices = async (mode = "all") => {
    if (!guardAction("invoices.create")) return;

    let selectedItems = bulkPreviewItems.filter(
      (item) => item.status !== "uploaded",
    );

    if (mode === "without_duplicate") {
      selectedItems = selectedItems.filter(
        (item) => !isDuplicateBulkPreviewItem(item),
      );
    }

    if (selectedItems.length === 0) {
      toast.error(
        mode === "without_duplicate"
          ? "No non-duplicate invoices to save"
          : "No scanned invoices to save",
      );
      return;
    }

    setBulkCreating(true);
    setBulkProgress({
      total: selectedItems.length,
      processed: 0,
      success: 0,
      failed: 0,
      startedAt: Date.now(),
    });
    try {
      let createdCount = 0;
      let failedCount = 0;

      for (const [index, item] of selectedItems.entries()) {
        try {
          const invoicePayload =
            item.invoicePayload ||
            buildBulkProceedPayload(null, item.file, item.filename);
          await createInvoice(
            buildMultipartPayload(invoicePayload, item.file, {
              uploadedFileName: item.file?.name || item.filename,
            }),
          ).unwrap();
          createdCount += 1;
          setBulkPreviewItems((prev) =>
            prev.map((row) =>
              row.id === item.id
                ? { ...row, status: "uploaded", selected: false, error: "" }
                : row,
            ),
          );
        } catch (error) {
          failedCount += 1;
          const duplicate = isDuplicateInvoiceError(error);
          setBulkPreviewItems((prev) =>
            prev.map((row) =>
              row.id === item.id
                ? {
                    ...row,
                    status: duplicate ? "duplicate" : "upload_failed",
                    isDuplicate: duplicate || row.isDuplicate,
                    error:
                      error?.data?.detail ||
                      error?.data?.message ||
                      "Upload failed",
                    selected: false,
                  }
                : row,
            ),
          );
        } finally {
          const processed = index + 1;
          setBulkProgress((prev) => ({
            ...prev,
            processed,
            success: createdCount,
            failed: failedCount,
          }));
        }
      }

      toast.success(
        `Saved ${createdCount} invoice${createdCount === 1 ? "" : "s"} as draft${failedCount ? `, ${failedCount} failed` : ""}.`,
        { duration: 5000 },
      );

      if (failedCount === 0) {
        setBulkPreviewOpen(false);
        setBulkPreviewItems([]);
      }
    } finally {
      setBulkCreating(false);
    }
  };

  const openBulkEditDialog = (item) => {
    if (!item?.invoicePayload) return;
    setBulkEditPreviewError(false);
    setBulkEditItemId(item.id);
    const payloadVendorId = item.invoicePayload.vendorId || "";
    const matchedVendor = findVendorByName(item.invoicePayload.vendorName);
    const resolvedVendorId = payloadVendorId || matchedVendor?.id || "";

    setBulkEditForm({
      vendorName: item.invoicePayload.vendorName || "",
      vendorId: resolvedVendorId,
      vendorMatched: Boolean(resolvedVendorId),
      vendorRequestSubmitted: Boolean(
        item.invoicePayload.vendorRequestSubmitted,
      ),
      vendorRequestPending: Boolean(matchedVendor?.isPendingApproval),
      invoiceNumber: item.invoicePayload.invoiceNumber || "",
      invoiceDate:
        item.invoicePayload.invoiceDate || format(new Date(), "yyyy-MM-dd"),
      dueDate: item.invoicePayload.dueDate || "",
      amount: Number(item.invoicePayload.amount || 0),
      currency:
        normalizeCurrencyCode(item.invoicePayload.currency) || DEFAULT_CURRENCY,
      departmentId: item.invoicePayload.departmentId || "",
      departmentName: item.invoicePayload.departmentName || "",
      ...(isCategoryFeatureEnabled
        ? {
            category: item.invoicePayload.category || null,
            categoryId:
              item.invoicePayload.categoryId ||
              item.invoicePayload.category?.id ||
              "",
            categoryName:
              item.invoicePayload.categoryName ||
              item.invoicePayload.category?.name ||
              "",
          }
        : {}),
      billingAddress: item.invoicePayload.billingAddress || "",
      gstin: item.invoicePayload.gstin || "",
      sourceOfSupply: item.invoicePayload.sourceOfSupply || "",
      destinationOfSupply: item.invoicePayload.destinationOfSupply || "",
      gstTreatment:
        item.invoicePayload.gstTreatment ||
        (isInrInvoiceCurrency(item.invoicePayload.currency)
          ? "Regular"
          : "N/A"),
      source: item.invoicePayload.source || "Upload",
      discountsLevel: item.invoicePayload.discountsLevel || LINE_ITEM_LEVEL,
      invoiceDiscount: item.invoicePayload.invoiceDiscount || 0,
      invoiceDiscountType: item.invoicePayload.invoiceDiscountType || "%",
      taxesLevel: item.invoicePayload.taxesLevel || LINE_ITEM_LEVEL,
      invoiceTax: item.invoicePayload.invoiceTax || DEFAULT_INR_TAX,
      invoiceTaxName: item.invoicePayload.invoiceTaxName || "Tax",
      invoiceTaxRate: item.invoicePayload.invoiceTaxRate ?? "",
      memo: item.invoicePayload.memo || "",
      lineItems: (item.invoicePayload.lineItems || []).map((line) =>
        mapBulkLineItemToEditForm(line, item.invoicePayload.currency),
      ),
    });
    setBulkEditOpen(true);
  };

  const updateBulkEditLineItem = (index, field, value) => {
    setBulkEditForm((prev) => {
      if (!prev) return prev;
      const nextLines = prev.lineItems.map((line, i) => {
        if (i !== index) return line;
        let updated = { ...line, [field]: value };
        if (field === "quantity" || field === "unitRate") {
          updated = syncLineItemLineTotal(updated);
          updated.amount = parseNumericInput(updated.lineTotal, 0);
        }
        if (!isInrInvoiceCurrency(prev.currency)) {
          if (field === "taxName" || field === "taxRate") {
            updated = applyForeignLineItemTax(
              updated,
              field === "taxName" ? value : updated.taxName,
              field === "taxRate" ? value : updated.taxRate,
            );
          }
        } else if (field === "tax") {
          updated = applyInrLineItemTax(updated, value);
        }
        return updated;
      });
      return { ...prev, lineItems: nextLines };
    });
  };

  const saveBulkEditChanges = () => {
    if (!bulkEditForm || !bulkEditItemId) return;

    if (!validateMandatoryPayload(bulkEditForm)) return;

    const matchedVendorId = findVendorByName(bulkEditForm.vendorName)?.id || "";
    const resolvedVendorId = bulkEditForm.vendorId || matchedVendorId;
    const vendorRequestSubmitted = Boolean(bulkEditForm.vendorRequestSubmitted);
    const vendorResolved = Boolean(resolvedVendorId) || vendorRequestSubmitted;
    setBulkPreviewItems((prev) =>
      prev.map((item) => {
        if (item.id !== bulkEditItemId) return item;
        const updatedPayload = {
          ...item.invoicePayload,
          ...bulkEditForm,
          vendorId: resolvedVendorId,
          vendorRequestSubmitted,
          amount: parseNumericInput(bulkEditForm.amount, 0),
          lineItems: normalizeLineItemsForTaxLevel({
            ...bulkEditForm,
            lineItems: bulkEditForm.lineItems.map((line) =>
              mapBulkLineItemToPayload(line, bulkEditForm.currency),
            ),
          }),
        };
        if (!isCategoryFeatureEnabled) {
          delete updatedPayload.category;
          delete updatedPayload.categoryId;
          delete updatedPayload.categoryName;
        }
        const vendorMissing = !vendorResolved;
        return {
          ...item,
          invoicePayload: updatedPayload,
          selected: !vendorMissing,
          status: vendorMissing ? "vendor_missing" : item.status,
          error: vendorMissing
            ? `Vendor "${bulkEditForm.vendorName || "Unknown"}" not found in vendor master`
            : "",
        };
      }),
    );
    setBulkEditOpen(false);
    setBulkEditForm(null);
    setBulkEditItemId("");
  };

  const handleAddVendorForBulkItem = async (itemId) => {
    if (!guardAction("invoices.addVendor")) return;
    const row = bulkPreviewItems.find((item) => item.id === itemId);
    const payload = row?.invoicePayload;
    const vendorName = payload?.vendorName?.trim();

    if (!row || !payload || !vendorName) {
      toast.error("Vendor name is required");
      return;
    }

    const existingVendor = findVendorByName(vendorName);
    if (existingVendor?.id) {
      setBulkPreviewItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                invoicePayload: {
                  ...item.invoicePayload,
                  vendorId: existingVendor.id,
                },
                selected: item.status !== "uploaded",
                error: "",
                status:
                  item.status === "vendor_missing" || item.status === "failed"
                    ? "success"
                    : item.status,
              }
            : item,
        ),
      );
      toast.success(`Vendor "${vendorName}" matched`);
      return;
    }

    openRequestVendorDialog({
      source: payload,
      context: { type: "bulk", itemId },
    });
  };

  // Calculate line item subtotal
  const calculateLineItemSubtotal = (item) => {
    if (formData?.discountsLevel === INVOICE_LEVEL) {
      const lineTotal = parseNumericInput(item.lineTotal ?? item.amount, 0);
      if (lineTotal > 0) return lineTotal;
      return (
        parseNumericInput(item.quantity, 0) *
        parseNumericInput(item.unitRate, 0)
      );
    }
    return resolveLineItemSubtotal(item);
  };

  // Calculate totals
  const calculateTotals = (
    lineItems,
    currency = formData?.currency ?? DEFAULT_CURRENCY,
  ) =>
    calculateInvoiceTotals({
      lineItems,
      currency,
      calculateLineItemSubtotal,
      taxRates: TAX_RATES,
      invoiceTaxAmount: formData?.scannedTaxAmount,
      invoiceTaxName:
        formData?.taxesLevel === INVOICE_LEVEL
          ? formData?.invoiceTaxName
          : formData?.scannedTaxName,
      invoiceTaxRate:
        formData?.taxesLevel === INVOICE_LEVEL
          ? formData?.invoiceTaxRate
          : formData?.scannedTaxRate,
      invoiceTax: formData?.invoiceTax,
      taxesLevel: formData?.taxesLevel,
      discountsLevel: formData?.discountsLevel,
      invoiceDiscount: formData?.invoiceDiscount,
      invoiceDiscountType: formData?.invoiceDiscountType,
      roundOff: formData?.roundOff ?? formData?.round_off ?? formData?.roundoff,
      invoiceTotal: formData?.scannedTotal ?? formData?.invoiceTotal,
    });

  // Add line item
  const addLineItem = () => {
    setFormData((prev) =>
      clearScannedTaxSummary({
        ...prev,
        lineItems: [...prev.lineItems, createDefaultLineItem(prev.currency)],
      }),
    );
  };

  // Remove line item
  const removeLineItem = (index) => {
    setFormData((prev) =>
      clearScannedTaxSummary({
        ...prev,
        lineItems: prev.lineItems.filter((_, i) => i !== index),
      }),
    );
  };

  // Update line item
  const clearScannedTaxSummary = (data = {}) => ({
    ...data,
    scannedTaxAmount: undefined,
    scannedTaxName: undefined,
    scannedTaxRate: undefined,
    scannedTotal: undefined,
  });

  const updateLineItem = (index, field, value) => {
    setFormData((prev) =>
      clearScannedTaxSummary({
        ...prev,
        lineItems: prev.lineItems.map((item, i) => {
          if (i !== index) return item;

          let updated = { ...item, [field]: value };
          if (field === "quantity" || field === "unitRate") {
            updated = syncLineItemLineTotal(updated);
          }
          if (!isInrInvoiceCurrency(prev.currency)) {
            if (field === "taxName" || field === "taxRate") {
              updated = applyForeignLineItemTax(
                updated,
                field === "taxName" ? value : updated.taxName,
                field === "taxRate" ? value : updated.taxRate,
              );
            }
          } else if (field === "tax") {
            updated = applyInrLineItemTax(updated, value);
          }

          return updated;
        }),
      }),
    );
  };

  const resetUploadWorkspace = () => {
    resetSingleUploadSession();
  };

  const validateMandatoryPayload = (payload) => {
    const message = getInvoiceMandatoryFieldValidationMessage(
      payload,
      invoiceMandatoryFields,
      mandatoryFieldOptions,
    );
    if (message) {
      toast.error(message);
      return false;
    }
    return true;
  };

  const validateSavedInvoiceEdit = (payload) => {
    if (!payload?.vendorName?.trim()) {
      toast.error("Vendor name is required");
      return false;
    }
    if (!payload.vendorId && !payload.vendorRequestSubmitted) {
      toast.error("Please select or request a vendor before saving");
      return false;
    }
    return validateMandatoryPayload(payload);
  };

  const canSubmitSavedDraft = (payload) =>
    Boolean(payload?.vendorName?.trim()) &&
    (Boolean(payload?.vendorId) || Boolean(payload?.vendorRequestSubmitted)) &&
    !invoiceMandatoryFieldsLoading &&
    isInvoiceMandatoryFieldsSatisfied(
      payload,
      invoiceMandatoryFields,
      mandatoryFieldOptions,
    );

  const buildUpdateInvoiceBody = (data, { keepSaved = false } = {}) => {
    const totals = calculateTotals(data.lineItems, data.currency);
    const resolvedVendorId =
      data.vendorId || findVendorByName(data.vendorName)?.id || "";

    return toCreateInvoicePayload(
      {
        ...data,
        vendorId: resolvedVendorId,
        vendorName: data.vendorName?.trim() || "",
        lineItems: normalizeLineItemsForTaxLevel({
          ...data,
          lineItems: data.lineItems.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitRate,
            amount: calculateLineItemSubtotal(item),
            tax: item.tax,
            taxName: item.taxName,
            taxRate: item.taxRate,
            hsnSac: item.hsnSac,
          })),
        }),
        memo: data.description,
        sourceEmail: data.source === "Email" ? data.sourceEmail : null,
        departmentName:
          data.departmentName || getDepartmentNameById(data.departmentId),
        ...(keepSaved ? { action: "saved" } : {}),
      },
      {
        totals,
        tdsAmount: computeTdsAmount(
          data.lineItems,
          data.tds,
          calculateLineItemSubtotal,
        ),
      },
    );
  };

  // Add vendor from scanned invoice data
  const handleAddVendorFromInvoice = async () => {
    if (!guardAction("invoices.addVendor")) return;
    if (!formData || !formData.vendorName) {
      toast.error("Vendor name is required");
      return;
    }

    openRequestVendorDialog({
      source: formData,
      context: { type: "single" },
    });
  };

  const handleSubmitVendorRequest = async (event) => {
    event.preventDefault();
    if (!guardAction("invoices.addVendor")) return;

    const vendorName = requestVendorForm.name.trim();
    const vendorType =
      requestVendorForm.vendor_type || requestVendorForm.vendorType;
    const gstin = requestVendorForm.gstin.trim();

    const validationErrors =
      getInvoiceVendorRequestValidationErrors(requestVendorForm);
    if (validationErrors.length > 0) {
      toast.error(validationErrors[0]);
      return;
    }

    if (requestVendorContext?.type === "bulk") {
      setBulkAddingVendorItemId(requestVendorContext.itemId);
    }

    try {
      const response = await requestVendorAddition({
        ...requestVendorForm,
        name: vendorName,
        vendor_type: vendorType,
        gstin,
      }).unwrap();

      const requestedVendorId = extractVendorIdFromResponse(response);

      const [vendorsResult, pendingResult] = await Promise.all([
        refetchVendors(),
        refetchPendingVendors(),
      ]);
      const freshVendorOptions = mergeInvoiceVendorOptions(
        vendorsResult?.data || [],
        pendingResult?.data || [],
      );
      const normalizedVendorName = vendorName.toLowerCase().trim();
      const matchedVendor =
        (requestedVendorId
          ? freshVendorOptions.find(
              (vendor) => String(vendor.id) === String(requestedVendorId),
            )
          : null) ||
        freshVendorOptions.find(
          (vendor) =>
            String(vendor?.name || "")
              .toLowerCase()
              .trim() === normalizedVendorName,
        ) ||
        null;
      const resolvedVendorId = matchedVendor?.id || requestedVendorId || "";

      if (requestVendorContext?.type === "bulk") {
        setBulkPreviewItems((prev) =>
          prev.map((item) =>
            item.id === requestVendorContext.itemId
              ? {
                  ...item,
                  selected: true,
                  error: resolvedVendorId
                    ? ""
                    : `Vendor "${vendorName}" requested. You can still create the invoice once the vendor is linked.`,
                  status: resolvedVendorId ? "success" : item.status,
                  invoicePayload: item.invoicePayload
                    ? {
                        ...item.invoicePayload,
                        vendorId: resolvedVendorId,
                        vendorName: vendorName,
                        vendorRequestSubmitted: true,
                      }
                    : item.invoicePayload,
                }
              : item,
          ),
        );
        if (bulkEditItemId === requestVendorContext.itemId) {
          setBulkEditForm((prev) =>
            prev
              ? {
                  ...prev,
                  vendorName,
                  vendorId: resolvedVendorId,
                  vendorMatched: Boolean(resolvedVendorId),
                  vendorRequestSubmitted: true,
                  vendorRequestPending: Boolean(
                    matchedVendor?.isPendingApproval,
                  ),
                }
              : prev,
          );
        }
      } else {
        setFormData((prev) => ({
          ...prev,
          vendorName: vendorName,
          vendorId: resolvedVendorId,
          vendorMatched: Boolean(resolvedVendorId),
          vendorRequestSubmitted: true,
          vendorRequestPending: Boolean(matchedVendor?.isPendingApproval),
        }));
      }

      toast.success(
        resolvedVendorId
          ? `Vendor "${vendorName}" requested. You can add the invoice now.`
          : `Vendor addition requested for "${vendorName}". You can add the invoice while approval is pending.`,
      );
      handleRequestVendorOpenChange(false);
    } catch (error) {
      console.error("Vendor request error:", error);
      let errorMessage = "Failed to request vendor addition";
      if (error?.data?.detail) {
        const detail = error.data.detail;
        if (Array.isArray(detail)) {
          errorMessage = detail
            .map((item) => item.msg || JSON.stringify(item))
            .join(", ");
        } else if (typeof detail === "string") {
          errorMessage = detail;
        } else {
          errorMessage = JSON.stringify(detail);
        }
      } else if (error?.data?.message) {
        errorMessage = error.data.message;
      }
      toast.error(errorMessage);
    } finally {
      setBulkAddingVendorItemId("");
    }
  };

  const handleRefreshInvoices = async () => {
    try {
      await Promise.all([
        refetchInvoices(),
        refetchVendors(),
        refetchPendingVendors(),
      ]);
      toast.success("Invoices refreshed");
    } catch {
      toast.error("Failed to refresh invoices");
    }
  };

  const handleAddInvoice = async () => {
    if (!guardAction("invoices.create")) return;
    if (!formData) return;

    const totals = calculateTotals(formData.lineItems);
    const createStatus = resolveInitialInvoiceStatus({
      vendorId:
        formData.vendorId || findVendorByName(formData.vendorName)?.id || "",
      vendorRequestSubmitted: formData.vendorRequestSubmitted,
      findVendorById,
    });
    const invoicePayload = toCreateInvoicePayload(
      {
        ...formData,
        vendorName: formData.vendorName?.trim() || "",
        status: createStatus,
        lineItems: normalizeLineItemsForTaxLevel({
          ...formData,
          lineItems: formData.lineItems.map((item) => ({
            ...item,
            unitPrice: item.unitRate,
            amount: calculateLineItemSubtotal(item),
          })),
        }),
        memo: formData.description,
        originalFileName:
          formData.originalFileName || uploadedFile?.name || null,
        currentFileName:
          uploadedFile?.name || formData.originalFileName || null,
      },
      {
        status: createStatus,
        totals,
        tdsAmount: computeTdsAmount(
          formData.lineItems,
          formData.tds,
          calculateLineItemSubtotal,
        ),
        uploadedFileName: uploadedFile?.name,
      },
    );
    if (!invoicePayload.vendorId && !formData.vendorRequestSubmitted) {
      toast.error("Please select or request a vendor before creating invoice");
      return;
    }
    if (!invoicePayload.vendorName) {
      toast.error("Vendor name is required");
      return;
    }
    if (!validateMandatoryPayload(formData)) return;

    try {
      if (uploadedFile) {
        const multipartPayload = buildMultipartPayload(
          invoicePayload,
          uploadedFile,
          {
            totals,
            tdsAmount: computeTdsAmount(
              formData.lineItems,
              formData.tds,
              calculateLineItemSubtotal,
            ),
          },
        );
        await createInvoice(multipartPayload).unwrap();
      } else {
        await createInvoice(invoicePayload).unwrap();
      }

      toast.success("Invoice added successfully");
      resetUploadWorkspace();
    } catch (error) {
      const errorMessage =
        extractApiErrorDetail(error) || "Failed to add invoice";

      if (isDuplicateInvoiceError(error)) {
        resetUploadWorkspace();
        toast.error(
          <div className="space-y-2">
            <p className="font-bold text-base">Duplicate Invoice</p>
            <p className="text-sm whitespace-pre-line">{errorMessage}</p>
          </div>,
          { duration: 8000 },
        );
        return;
      }

      toast.error(
        <div className="space-y-2">
          <p className="font-bold text-base">Cannot Add Invoice!</p>
          <p className="text-sm whitespace-pre-line">{errorMessage}</p>
        </div>,
        { duration: 8000 },
      );
    }
  };

  const handleViewInvoice = async (invoice) => {
    setSelectedInvoice(invoice);
    setViewDialogOpen(true);
    setViewTab("details");
    setInvoiceHistory([]);

    setLoadingHistory(true);
    try {
      const response = await getInvoiceHistory(invoice.id).unwrap();
      let normalizedHistory = Array.isArray(response)
        ? response
        : normalizeInvoiceHistoryEntries(response);

      if (
        normalizedHistory.length === 0 &&
        (Array.isArray(invoice.approvalRecords) ||
          Array.isArray(invoice.approvalRecords))
      ) {
        normalizedHistory = normalizeInvoiceHistoryEntries(
          invoice.approvalRecords || invoice.approvalRecords,
        );
      }

      setInvoiceHistory(normalizedHistory);
    } catch (error) {
      console.error("Failed to fetch invoice history:", error);
      toast.error("Failed to load invoice history");
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleEditInvoice = (invoice) => {
    if (!canEditInvoice(invoice, invoiceEditContext)) {
      toast.error(getInvoiceEditBlockedMessage(invoice, invoiceEditContext));
      return;
    }

    setSelectedInvoice(invoice);
    setFormData(
      buildInvoiceEditFormData(invoice, {
        isCategoryFeatureEnabled,
        isCampaignFeatureEnabled,
        findVendorByName,
        findVendorById,
      }),
    );
    setEditDialogOpen(true);
  };

  const handleUpdateInvoice = async () => {
    if (!guardAction("invoices.update")) return;
    if (!selectedInvoice || !formData) return;

    const isSavedDraft = isSavedInvoiceStatus(selectedInvoice.status);
    if (isSavedDraft) {
      if (!validateSavedInvoiceEdit(formData)) return;
    } else if (!validateMandatoryPayload(formData)) {
      return;
    }

    try {
      await updateInvoice({
        id: selectedInvoice.id,
        body: buildUpdateInvoiceBody(formData, { keepSaved: isSavedDraft }),
      }).unwrap();

      toast.success(
        isSavedDraft
          ? "Draft saved successfully"
          : "Invoice updated successfully",
      );
      setEditDialogOpen(false);
      setSelectedInvoice(null);
      setFormData(null);
    } catch (error) {
      if (isCheckerEditForbiddenError(error)) {
        toast.error(
          "Invoice editing during checker review is not enabled for your organization",
        );
        setEditDialogOpen(false);
        setSelectedInvoice(null);
        setFormData(null);
        return;
      }
      toast.error(extractApiErrorDetail(error) || "Failed to update invoice");
    }
  };

  const handleForwardSavedInvoice = async () => {
    if (!guardAction("invoices.update")) return;
    if (!selectedInvoice || !formData) return;
    if (!isSavedInvoiceStatus(selectedInvoice.status)) return;
    if (!canForwardSavedInvoice(selectedInvoice, invoiceEditContext)) {
      toast.error("You do not have permission to submit this invoice");
      return;
    }
    if (!validateSavedInvoiceEdit(formData)) return;

    try {
      await updateInvoice({
        id: selectedInvoice.id,
        body: buildUpdateInvoiceBody(formData),
      }).unwrap();

      await forwardInvoice({
        invoiceId: selectedInvoice.id,
        action: "forward",
      }).unwrap();

      toast.success("Invoice submitted to checker");
      setEditDialogOpen(false);
      setSelectedInvoice(null);
      setFormData(null);
    } catch (error) {
      toast.error(
        extractApiErrorDetail(error) || "Failed to submit invoice to checker",
      );
    }
  };

  const handleDeleteInvoice = async (invoice) => {
    if (!guardAction("invoices.delete")) return;
    setInvoiceDeleteTarget(invoice);
  };

  const confirmDeleteInvoice = async () => {
    if (!invoiceDeleteTarget) return;
    try {
      await deleteInvoice(invoiceDeleteTarget.id).unwrap();
      toast.success("Invoice deleted successfully");
    } catch (error) {
      toast.error("Failed to delete invoice");
    } finally {
      setInvoiceDeleteTarget(null);
    }
  };

  const canEdit = (invoice) => canEditInvoice(invoice, invoiceEditContext);
  const canDelete = (status) => canDeleteInvoice(status, canDeleteInvoices);

  const getStatusBadgeClass = (status) => getInvoiceStatusBadgeClass(status);

  const renderPdfPreview = (props = {}) => (
    <InvoicePdfPreview
      {...props}
      setPdfZoom={setPdfZoom}
      getInvoiceFileUrl={getInvoiceFileUrl}
    />
  );

  const renderInvoiceForm = ({
    isEdit = false,
    hideActions = false,
    isSavedDraft = false,
  } = {}) => {
    const savedDraftCanSubmit = canSubmitSavedDraft(formData);

    return (
      <InvoiceForm
        formData={formData}
        setFormData={setFormData}
        isEdit={isEdit}
        hideActions={hideActions}
        isSavedDraft={isSavedDraft}
        calculateTotals={calculateTotals}
        findVendorByName={findVendorByName}
        handleAddVendorFromInvoice={handleAddVendorFromInvoice}
        updateLineItem={updateLineItem}
        removeLineItem={removeLineItem}
        addLineItem={addLineItem}
        calculateLineItemSubtotal={calculateLineItemSubtotal}
        setEditDialogOpen={setEditDialogOpen}
        setUploadedFile={setUploadedFile}
        setUploadedFileURL={setUploadedFileURL}
        setActiveTab={setActiveTab}
        handleUpdateInvoice={handleUpdateInvoice}
        handleAddInvoice={handleAddInvoice}
        canAddVendor={canAddVendors}
        canSubmit={
          isEdit
            ? selectedInvoice &&
              canEditInvoice(selectedInvoice, invoiceEditContext) &&
              (isSavedDraft || isSavedInvoiceStatus(selectedInvoice?.status)
                ? savedDraftCanSubmit
                : !invoiceMandatoryFieldsLoading &&
                  isInvoiceMandatoryFieldsSatisfied(
                    formData,
                    invoiceMandatoryFields,
                    mandatoryFieldOptions,
                  ))
            : canManageInvoices &&
              !invoiceMandatoryFieldsLoading &&
              isInvoiceMandatoryFieldsSatisfied(
                formData,
                invoiceMandatoryFields,
                mandatoryFieldOptions,
              ) &&
              (Boolean(formData?.vendorId) ||
                Boolean(formData?.vendorRequestSubmitted))
        }
        departmentMandatory={invoiceMandatoryFields.department}
        categoryMandatory={invoiceMandatoryFields.category}
        vendorOptions={invoiceVendorOptions}
        departments={departments}
        invoiceCategories={invoiceCategories}
        invoiceCategoriesLoading={
          invoiceCategoriesLoading || invoiceCategoriesFetching
        }
        showCategoryField={isCategoryFeatureEnabled}
        showCampaignField={isCampaignFeatureEnabled}
        currencyOptions={invoiceCurrencyOptions}
        GST_TREATMENTS={GST_TREATMENTS}
        INDIAN_STATES={INDIAN_STATES}
        INVOICE_SOURCES={INVOICE_SOURCES}
        LEDGER_OPTIONS={LEDGER_OPTIONS}
        TAX_RATES={TAX_RATES}
      />
    );
  };

  const canForwardSavedDraft =
    Boolean(formData) &&
    Boolean(selectedInvoice) &&
    isSavedInvoiceStatus(selectedInvoice?.status) &&
    canForwardSavedInvoice(selectedInvoice, invoiceEditContext) &&
    canSubmitSavedDraft(formData);

  const {
    total: invoiceTotal = 0,
    offset: invoiceOffset = 0,
    currentPage: invoiceCurrentPage = 0,
    totalPages: invoiceTotalPages = 0,
    startRecord: invoiceStartRecord = 0,
    endRecord: invoiceEndRecord = 0,
    hasMore: invoiceHasMore = false,
  } = invoicePagination ?? {};

  const visibleInvoicePageNumbers = (() => {
    if (invoiceTotalPages <= 5) {
      return Array.from({ length: invoiceTotalPages }, (_, index) => index);
    }
    const start = Math.min(
      Math.max(invoiceCurrentPage - 2, 0),
      invoiceTotalPages - 5,
    );
    return Array.from({ length: 5 }, (_, index) => start + index);
  })();

  const renderInvoiceRow = (invoice, rowIndex, headers) => (
    <TableRow
      key={invoice.id ?? rowIndex}
      className={cn(
        rowIndex % 2 === 1 && "bg-muted/20",
        "border-b border-border transition-colors hover:bg-muted/50",
        invoice.isDuplicate && "bg-amber-100 hover:bg-amber-100",
      )}
      data-testid={`invoice-row-${invoice.id}`}
    >
      {headers.map((header) => {
        let value;

        switch (header.key) {
          case "srNo":
            value = invoiceOffset + rowIndex + 1;
            break;
          case "source":
            value = (
              <span
                className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${invoice.source === "Email" ? "bg-blue-100 text-blue-700 border border-blue-200" : "bg-green-100 text-green-700 border border-green-200"}`}
              >
                {invoice.source === "Email" && <Mail className="h-3 w-3" />}
                {invoice.source || "Upload"}
              </span>
            );
            break;
          case "integration":
            value = <IntegrationSourceBadge record={invoice} />;
            break;
          case "originalFileName":
            value = invoice.originalFileName || "-";
            break;
          case "refNo":
            value = invoice.refNo || "-";
            break;
          case "grossAmount":
            value = formatInvoiceAmount(
              invoice,
              getInvoiceGrossAmount(invoice),
            );
            break;
          case "taxAmount":
            value = formatInvoiceAmount(invoice, getInvoiceTaxAmount(invoice));
            break;
          case "tdsAmount":
            value = formatInvoiceAmount(invoice, getInvoiceTdsAmount(invoice));
            break;
          case "netAmount":
            value = formatInvoiceAmount(invoice, getInvoiceNetAmount(invoice));
            break;
          case "approvalWorkflowName":
            value = getApprovalWorkflowName(invoice);
            break;
          case "invoiceDate":
            value = invoice.invoiceDate
              ? format(new Date(invoice.invoiceDate), "dd MMM yy")
              : "-";
            break;
          case "status":
            value = (
              <span
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${getStatusBadgeClass(invoice.status)}`}
              >
                {formatWorkflowStatus(invoice.status)}
              </span>
            );
            break;
          case "createdAt":
            value = invoice.createdAt
              ? format(new Date(invoice.createdAt), "dd MMM yy, hh:mm a")
              : "-";
            break;
          case "actions":
            value = (
              <div className="flex justify-start gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleViewInvoice(invoice)}
                  data-testid={`view-invoice-${invoice.id}`}
                  title="View Invoice"
                  className="h-8 w-8 p-0"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                {canEdit(invoice) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditInvoice(invoice)}
                    data-testid={`edit-invoice-${invoice.id}`}
                    title="Edit Invoice"
                    className="h-8 w-8 p-0"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {canDelete(invoice.status) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteInvoice(invoice)}
                    data-testid={`delete-invoice-${invoice.id}`}
                    title="Delete Invoice"
                    className="h-8 w-8 p-0"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            );
            break;
          case "vendorName":
            value = <ClippedTextWithTooltip text={invoice.vendorName} />;
            break;
          default:
            value = invoice?.[header.key] || "-";
        }

        return (
          <TableCell key={header.key} className={header.cellClassName}>
            {value}
          </TableCell>
        );
      })}
    </TableRow>
  );

  const renderBulkEditInvoiceForm = () => (
    <InvoiceForm
      formData={bulkEditForm}
      setFormData={setBulkEditForm}
      isEdit
      hideActions
      calculateTotals={(
        lineItems,
        currency = bulkEditForm?.currency ?? DEFAULT_CURRENCY,
      ) =>
        calculateInvoiceTotals({
          lineItems,
          currency,
          calculateLineItemSubtotal: (item) => {
            if (bulkEditForm?.discountsLevel === INVOICE_LEVEL) {
              const lineTotal = parseNumericInput(
                item.lineTotal ?? item.amount,
                0,
              );
              if (lineTotal > 0) return lineTotal;
              return (
                parseNumericInput(item.quantity, 0) *
                parseNumericInput(item.unitRate, 0)
              );
            }
            return resolveLineItemSubtotal(item);
          },
          taxRates: TAX_RATES,
          invoiceTaxAmount: bulkEditForm?.scannedTaxAmount,
          invoiceTaxName:
            bulkEditForm?.taxesLevel === INVOICE_LEVEL
              ? bulkEditForm?.invoiceTaxName
              : bulkEditForm?.scannedTaxName,
          invoiceTaxRate:
            bulkEditForm?.taxesLevel === INVOICE_LEVEL
              ? bulkEditForm?.invoiceTaxRate
              : bulkEditForm?.scannedTaxRate,
          invoiceTax: bulkEditForm?.invoiceTax,
          taxesLevel: bulkEditForm?.taxesLevel,
          discountsLevel: bulkEditForm?.discountsLevel,
          invoiceDiscount: bulkEditForm?.invoiceDiscount,
          invoiceDiscountType: bulkEditForm?.invoiceDiscountType,
          roundOff: bulkEditForm?.roundOff ?? bulkEditForm?.round_off ?? bulkEditForm?.roundoff,
          invoiceTotal: bulkEditForm?.scannedTotal ?? bulkEditForm?.invoiceTotal,
        })
      }
      findVendorByName={findVendorByName}
      handleAddVendorFromInvoice={() => {
        if (bulkEditItemId) handleAddVendorForBulkItem(bulkEditItemId);
      }}
      updateLineItem={updateBulkEditLineItem}
      removeLineItem={(index) =>
        setBulkEditForm((prev) => ({
          ...prev,
          lineItems: prev.lineItems.filter((_, i) => i !== index),
        }))
      }
      addLineItem={() =>
        setBulkEditForm((prev) => ({
          ...prev,
          lineItems: [...prev.lineItems, createDefaultLineItem(prev.currency)],
        }))
      }
      calculateLineItemSubtotal={(item) => {
        if (bulkEditForm?.discountsLevel === INVOICE_LEVEL) {
          const lineTotal = parseNumericInput(item.lineTotal ?? item.amount, 0);
          if (lineTotal > 0) return lineTotal;
          return (
            parseNumericInput(item.quantity, 0) *
            parseNumericInput(item.unitRate, 0)
          );
        }
        return resolveLineItemSubtotal(item);
      }}
      setEditDialogOpen={setBulkEditOpen}
      setUploadedFile={() => {}}
      setUploadedFileURL={() => {}}
      setActiveTab={() => {}}
      handleUpdateInvoice={saveBulkEditChanges}
      handleAddInvoice={saveBulkEditChanges}
      canAddVendor={canAddVendors}
      canSubmit
      departmentMandatory={invoiceMandatoryFields.department}
      categoryMandatory={invoiceMandatoryFields.category}
      vendorOptions={invoiceVendorOptions}
      departments={departments}
      invoiceCategories={invoiceCategories}
      invoiceCategoriesLoading={
        invoiceCategoriesLoading || invoiceCategoriesFetching
      }
      showCategoryField={isCategoryFeatureEnabled}
      showCampaignField={isCampaignFeatureEnabled}
      currencyOptions={invoiceCurrencyOptions}
      GST_TREATMENTS={GST_TREATMENTS}
      INDIAN_STATES={INDIAN_STATES}
      INVOICE_SOURCES={INVOICE_SOURCES}
      LEDGER_OPTIONS={LEDGER_OPTIONS}
      TAX_RATES={TAX_RATES}
    />
  );

  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-6"
      data-testid="invoices-page"
    >
      <div className="flex shrink-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1
            className="text-4xl md:text-5xl font-bold font-['Manrope'] text-primary mb-2"
            data-testid="invoices-title"
          >
            Invoices
          </h1>
          <p className="text-muted-foreground">
            Upload and manage all invoices
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <CurrencySelector
            currencies={currencies}
            value={selectedCurrency}
            onChange={setSelectedCurrency}
            variant="inline"
            id="invoice-currency-filter"
          />
          <RefreshButton
            onClick={handleRefreshInvoices}
            refreshing={
              invoicesFetching || vendorsFetching || pendingVendorsFetching
            }
          >
            Refresh
          </RefreshButton>
          <Button
            onClick={() => setInvoiceUploadDialogOpen(true)}
            data-testid="upload-invoice-button"
            disabled={scanning || !canUploadInvoices}
          >
            {scanning ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Extracting...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Upload Invoice
              </>
            )}
          </Button>
        </div>
      </div>

      <InvoiceUploadDialog
        open={invoiceUploadDialogOpen}
        onOpenChange={setInvoiceUploadDialogOpen}
        onFilesSelected={handleInvoiceFilesUpload}
        disabled={scanning || bulkExtracting || !canUploadInvoices}
      />

      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-2">
          {INVOICE_LIST_FILTERS.map(({ value, label }) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={invoiceStatusFilter === value ? "default" : "outline"}
              onClick={() => setInvoiceStatusFilter(value)}
              data-testid={`invoice-filter-${value}`}
            >
              {label}
            </Button>
          ))}
        </div>
        <div className="relative w-full sm:w-64 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search vendor, invoice #, ref no, amount..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="invoice-search-input"
          />
        </div>
      </div>

      <div
        className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm"
        data-testid="invoices-table"
      >
        <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto scrollbar-thin-muted">
          <AppDataTable
            tableHeader={invoiceTableHeader}
            tableData={invoices}
            renderRow={renderInvoiceRow}
            isLoading={invoicesFetching}
            loadingRowCount={8}
            tableClassName="min-w-[1900px]"
            headClassName="border-b border-border bg-muted/50"
            emptyMessage="No invoices found. Upload your first invoice to get started!"
            emptyTestId="no-invoices"
          />
        </div>
        <div className="mt-auto flex shrink-0 flex-col gap-3 border-t border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          {invoiceTotalPages > 0 ? (
            <>
              <p
                className="text-sm text-muted-foreground"
                data-testid="invoice-pagination-summary"
              >
                Showing {invoiceStartRecord}-{invoiceEndRecord} of{" "}
                {invoiceTotal.toLocaleString("en-IN")}
              </p>
              <Pagination className="mx-0 w-auto justify-start sm:justify-end">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        goToInvoicePage(invoiceCurrentPage - 1);
                      }}
                      className={
                        invoiceCurrentPage === 0
                          ? "pointer-events-none opacity-50"
                          : undefined
                      }
                      data-testid="invoice-pagination-previous"
                    />
                  </PaginationItem>
                  {visibleInvoicePageNumbers.map((pageNumber) => (
                    <PaginationItem key={pageNumber}>
                      <PaginationLink
                        href="#"
                        isActive={pageNumber === invoiceCurrentPage}
                        onClick={(event) => {
                          event.preventDefault();
                          goToInvoicePage(pageNumber);
                        }}
                        data-testid={`invoice-pagination-page-${pageNumber + 1}`}
                      >
                        {pageNumber + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        goToInvoicePage(invoiceCurrentPage + 1);
                      }}
                      className={
                        !invoiceHasMore &&
                        invoiceCurrentPage >= invoiceTotalPages - 1
                          ? "pointer-events-none opacity-50"
                          : undefined
                      }
                      data-testid="invoice-pagination-next"
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </>
          ) : null}
        </div>
      </div>

      <UploadSection
        uploadedFile={uploadedFile}
        setUploadedFile={setUploadedFile}
        setUploadedFileURL={setUploadedFileURL}
        setFormData={setFormData}
        setActiveTab={setActiveTab}
        renderPdfPreview={renderPdfPreview}
        uploadedFileURL={uploadedFileURL}
        pdfZoom={pdfZoom}
        uploadPreviewError={uploadPreviewError}
        setUploadPreviewError={setUploadPreviewError}
        scanning={scanning}
        renderInvoiceForm={renderInvoiceForm}
        handleAddInvoice={handleAddInvoice}
      />

      <InvoicesDialogs
        bulkExtracting={bulkExtracting}
        bulkExtractTotalFiles={bulkExtractTotalFiles}
        bulkExtractProgress={bulkExtractProgress}
        bulkPreviewOpen={bulkPreviewOpen}
        bulkCreating={bulkCreating}
        bulkAddingVendorItemId={bulkAddingVendorItemId}
        bulkPreviewItems={bulkPreviewItems}
        bulkProgress={bulkProgress}
        formatBulkStatusLabel={formatBulkStatusLabel}
        getBulkStatusBadgeClass={getBulkStatusBadgeClass}
        setBulkPreviewOpen={setBulkPreviewOpen}
        setBulkPreviewItems={setBulkPreviewItems}
        handleAddVendorForBulkItem={handleAddVendorForBulkItem}
        openBulkEditDialog={openBulkEditDialog}
        handleCreateBulkInvoices={handleCreateBulkInvoices}
        departments={departments}
        getDepartmentNameById={getDepartmentNameById}
        invoiceCategories={invoiceCategories}
        getCategoryNameById={getCategoryNameById}
        isCategoryFeatureEnabled={isCategoryFeatureEnabled}
        isCampaignFeatureEnabled={isCampaignFeatureEnabled}
        showRefNoField={isRefNoEnabled}
        invoiceMandatoryFields={invoiceMandatoryFields}
        bulkEditOpen={bulkEditOpen}
        setBulkEditOpen={setBulkEditOpen}
        bulkEditForm={bulkEditForm}
        setBulkEditForm={setBulkEditForm}
        bulkEditItemId={bulkEditItemId}
        bulkEditFileURL={bulkEditFileURL}
        pdfZoom={pdfZoom}
        bulkEditPreviewError={bulkEditPreviewError}
        setBulkEditPreviewError={setBulkEditPreviewError}
        saveBulkEditChanges={saveBulkEditChanges}
        renderPdfPreview={renderPdfPreview}
        renderBulkEditInvoiceForm={renderBulkEditInvoiceForm}
        viewDialogOpen={viewDialogOpen}
        setViewDialogOpen={setViewDialogOpen}
        selectedInvoice={selectedInvoice}
        viewPreviewError={viewPreviewError}
        setViewPreviewError={setViewPreviewError}
        getStatusBadgeClass={getStatusBadgeClass}
        viewTab={viewTab}
        setViewTab={setViewTab}
        invoiceHistory={invoiceHistory}
        loadingHistory={loadingHistory}
        canEdit={canEdit}
        handleEditInvoice={handleEditInvoice}
        findVendorByName={findVendorByName}
        findVendorById={findVendorById}
        editDialogOpen={editDialogOpen}
        setEditDialogOpen={setEditDialogOpen}
        formData={formData}
        handleUpdateInvoice={handleUpdateInvoice}
        handleForwardSavedInvoice={handleForwardSavedInvoice}
        canForwardSavedDraft={canForwardSavedDraft}
        forwardSavedInvoiceLoading={
          updateInvoiceLoading || forwardInvoiceLoading
        }
        renderInvoiceForm={renderInvoiceForm}
        requestVendorOpen={requestVendorOpen}
        handleRequestVendorOpenChange={handleRequestVendorOpenChange}
        requestVendorForm={requestVendorForm}
        setRequestVendorForm={setRequestVendorForm}
        handleSubmitVendorRequest={handleSubmitVendorRequest}
        requestVendorLoading={requestVendorLoading}
        invoiceDeleteTarget={invoiceDeleteTarget}
        setInvoiceDeleteTarget={setInvoiceDeleteTarget}
        confirmDeleteInvoice={confirmDeleteInvoice}
      />
    </div>
  );
};

export default InvoicesPage;

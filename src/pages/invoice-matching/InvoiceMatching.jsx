import React, { useEffect, useMemo, useState } from "react";
import {
  useEditInvoiceMatchMutation,
  useGetAvailableGrnsQuery,
  useGetAvailableMatchesForGrnQuery,
  useGetAvailableMatchingInvoicesQuery,
  useGetAvailablePurchaseOrdersQuery,
  useGetInvoiceMatchingDetailQuery,
  useGetInvoiceMatchingListQuery,
  useGetInvoiceMatchingSummaryQuery,
  useLazyGetInvoiceMatchingDetailQuery,
  useMarkInvoiceMatchExceptionMutation,
  usePerformInvoiceMatchMutation,
} from "../../Services/apis/invoiceMatchingApi";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Checkbox } from "../../components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  TableCell,
  TableRow,
} from "../../components/ui/table";
import AppDataTable from "../../components/common/AppDataTable";
import RefreshButton from "../../components/common/RefreshButton";
import TableSortButton from "../../components/common/TableSortButton";
import { Textarea } from "../../components/ui/textarea";
import { cn } from "../../lib/utils";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCheck,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Edit,
  Eye,
  FileText,
  Link2,
  Loader2,
  Package,
  RefreshCw,
  Search,
  ShoppingCart,
  XCircle,
} from "lucide-react";
import { useActionGuard } from "../../hooks/useActionGuard";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useCreditErrorHandler } from "../../contexts/CreditErrorContext";
import MeteredActionCostHint from "../../components/credits/MeteredActionCostHint";
import { useMeteredActionEstimate } from "../../hooks/useMeteredActionEstimate";
import { CREDIT_ACTION_CODES } from "../../constants/creditActions";
import { useRBAC } from "../../contexts/RBACContext";
import MatchingGroupExpandedRow from "./components/MatchingGroupExpandedRow";
import MatchingInvoiceCountBadge from "./components/MatchingInvoiceCountBadge";
import MatchChecklistPanel from "./components/MatchChecklistPanel";
import { extractPageContent, extractMatchingGrns } from "../../Services/utils/payloadMappers";

const MATCH_TYPE_OPTIONS = [
  { value: "ALL", label: "All Types" },
  { value: "PO_INVOICE", label: "PO + Tax Invoice" },
  { value: "PO_PI", label: "PO + PI" },
  { value: "PO_PI_TI", label: "PO + PI + Tax Invoice" },
  { value: "THREE_WAY", label: "PO + PI/TI + GRN" },
  { value: "INVOICE_GRN", label: "PI/TI + GRN" },
  { value: "PO_GRN", label: "PO + GRN" },
];

const MANUAL_MATCH_TYPE_OPTIONS = MATCH_TYPE_OPTIONS.filter((option) =>
  option.value !== "ALL",
);

const GRN_MATCH_TYPES = new Set(["THREE_WAY", "INVOICE_GRN", "PO_GRN"]);

const extractSuggestedMatchTypes = (response) => {
  const values =
    response?.availableMatchTypes ??
    response?.available_match_types ??
    response?.data?.availableMatchTypes ??
    response?.data?.available_match_types ??
    response?.matchTypes ??
    response?.data?.matchTypes ??
    [];

  return Array.isArray(values)
    ? values.map(normalizeMatchType).filter(Boolean)
    : [];
};

const matchSortOptions = [
  { value: "createdAt", label: "Upload date", defaultDirection: "desc" },
];

const matchingTableHeader = [
  { key: "poGroup", title: "PO / Document" },
  { key: "vendor", title: "Vendor" },
  { key: "grnNumber", title: "GRN" },
  { key: "matchType", title: "Type" },
  { key: "poAmount", title: "PO Amt" },
  { key: "matchedAmount", title: "Matched Amt" },
  { key: "variance", title: "Variance" },
  { key: "status", title: "Status" },
  { key: "actions", title: "Actions" },
];

const selectedPoTableHeader = [
  { key: "poNumber", title: "PO Number", cellClassName: "font-medium" },
  { key: "date", title: "Date" },
  { key: "amount", title: "Amount" },
  { key: "variance", title: "Variance" },
  { key: "recommendation", title: "Recommendation" },
];

const auditTrailTableHeader = [
  { key: "action", title: "Action" },
  { key: "fromStatus", title: "From" },
  { key: "toStatus", title: "To" },
  { key: "changedBy", title: "Changed By" },
  { key: "changedAt", title: "Changed At" },
  { key: "remarks", title: "Remarks" },
];

const statusMeta = {
  MATCHED: { label: "Matched", className: "bg-green-500", icon: CheckCircle },
  PARTIAL_MATCH: { label: "Partial Match", className: "bg-yellow-500", icon: AlertTriangle },
  MISMATCH: { label: "Mismatch", className: "bg-red-500", icon: XCircle },
  RESOLVED: { label: "Resolved", className: "bg-blue-500", icon: CheckCheck },
  EXCEPTION: { label: "Exception", className: "bg-red-500", icon: AlertTriangle },
};

const formatCurrency = (amount, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency || "INR",
    minimumFractionDigits: 2,
  }).format(Number(amount || 0));

const renderAmountWithConversion = (amount, currency = "INR", record = {}) => (
  <div className="space-y-0.5">
    <div>{formatCurrency(amount, currency)}</div>
    {record.convertToInr && Number(record.matchingInrValue) > 0 ? (
      <div className="text-xs text-muted-foreground">
        Converted INR Amount: {formatCurrency(record.matchingInrValue, "INR")}
      </div>
    ) : null}
    {record.matchingReadinessStatus === "AWAITING_INR_VALUE" ||
    record.readinessStatus === "AWAITING_INR_VALUE" ? (
      <div className="text-xs font-medium text-amber-700">Awaiting INR Value</div>
    ) : null}
  </div>
);

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatPercent = (value) => {
  const num = Number(value);
  return Number.isNaN(num) ? "0.00" : num.toFixed(2);
};

const getErrorMessage = (error, fallback) =>
  error?.data?.message || error?.data?.detail || error?.error || fallback;

const normalizeStatus = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "MISMATCH";
  return raw.toUpperCase().replace(/\s+/g, "_");
};

const normalizeMatchType = (value) => {
  const raw = String(value || "").trim().toUpperCase();
  if (raw === "TWO_WAY" || raw === "2_WAY" || raw === "PO_TO_INVOICE") return "PO_INVOICE";
  if (raw === "3_WAY") return "THREE_WAY";
  return raw || "PO_INVOICE";
};

const getMatchTypeLabel = (value) => {
  const normalized = normalizeMatchType(value);
  return MATCH_TYPE_OPTIONS.find((option) => option.value === normalized)?.label || normalized.replace(/_/g, " ");
};

const usesGrnPool = (matchType) =>
  ["THREE_WAY", "INVOICE_GRN", "PO_GRN"].includes(normalizeMatchType(matchType));

const getMatchTypeRequirements = (matchType) => {
  switch (normalizeMatchType(matchType)) {
    case "PO_PI":
      return { taxInvoice: false, pi: true, anyDocument: false, po: true, grn: false };
    case "PO_PI_TI":
      return { taxInvoice: true, pi: true, anyDocument: false, po: true, grn: false };
    case "THREE_WAY":
      return { taxInvoice: false, pi: false, anyDocument: true, po: true, grn: true };
    case "INVOICE_GRN":
      return { taxInvoice: false, pi: false, anyDocument: true, po: false, grn: true };
    case "PO_GRN":
      return { taxInvoice: false, pi: false, anyDocument: false, po: true, grn: true };
    case "PO_INVOICE":
    default:
      return { taxInvoice: true, pi: false, anyDocument: false, po: true, grn: false };
  }
};

const normalizeMatching = (match = {}) => ({
  ...match,
  id: match.id ?? match.matchId ?? match.match_id,
  matchNumber: match.matchNumber ?? match.match_number ?? "",
  invoiceNumber: match.invoiceNumber ?? match.invoice_number ?? match.invoice?.number ?? "",
  vendorName: match.vendorName ?? match.vendor_name ?? match.invoice?.vendorName ?? "",
  poNumber: match.poNumber ?? match.po_number ?? match.purchaseOrder?.number ?? "",
  grnNumber: match.grnNumber ?? match.grn_number ?? match.grn?.number ?? "",
  matchType: normalizeMatchType(match.matchType ?? match.match_type),
  currency: match.currency ?? match.currencyCode ?? match.invoice?.currency ?? match.purchaseOrder?.currency ?? "INR",
  invoiceAmount: Number(match.invoiceAmount ?? match.invoice_amount ?? match.invoice?.amount ?? 0),
  poAmount: Number(match.poAmount ?? match.po_amount ?? match.purchaseOrder?.amount ?? 0),
  grnAmount: Number(match.grnAmount ?? match.grn_amount ?? match.grn?.amount ?? 0),
  convertToInr: Boolean(match.convertToInr ?? match.convert_to_inr ?? false),
  matchingInrValue: match.matchingInrValue ?? match.matching_inr_value ?? "",
  matchingReadinessStatus:
    match.matchingReadinessStatus ?? match.matching_readiness_status ?? match.readinessStatus ?? match.readiness_status,
  varianceAmount: Number(match.varianceAmount ?? match.variance_amount ?? 0),
  variancePercentage: Number(match.variancePercentage ?? match.variance_percentage ?? 0),
  grnVarianceAmount: Number(match.grnVarianceAmount ?? match.grn_variance_amount ?? 0),
  grnVariancePercentage: Number(match.grnVariancePercentage ?? match.grn_variance_percentage ?? 0),
  status: normalizeStatus(match.status ?? match.match_status),
  isException: Boolean(match.isException ?? match.is_exception),
  requiresReview: Boolean(match.requiresReview ?? match.requires_review),
  createdAt: match.createdAt ?? match.created_at,
});

const normalizeMatchingGroup = (group = {}) => {
  const rawSubRows =
    Array.isArray(group.invoiceMatches)
      ? group.invoiceMatches
      : Array.isArray(group.invoice_matches)
        ? group.invoice_matches
        : [];

  if (rawSubRows.length === 0 && (group.id || group.matchNumber || group.match_number)) {
    const flatMatch = normalizeMatching(group);
    return {
      id: group.poId ?? group.po_id ?? group.purchaseOrderId ?? group.purchase_order_id ?? flatMatch.id,
      groupId: group.groupId ?? group.group_id ?? group.matchGroupId ?? group.match_group_id ?? "",
      poId: group.poId ?? group.po_id ?? group.purchaseOrderId ?? group.purchase_order_id ?? "",
      poNumber: flatMatch.poNumber,
      vendorName: flatMatch.vendorName,
      grnNumber: flatMatch.grnNumber,
      matchType: flatMatch.matchType,
      currency: group.currency ?? group.currencyCode ?? flatMatch.currency ?? "INR",
      poAmount: flatMatch.poAmount,
      convertToInr: flatMatch.convertToInr,
      matchingInrValue: flatMatch.matchingInrValue,
      matchingReadinessStatus: flatMatch.matchingReadinessStatus,
      cumulativeInvoiceAmount: flatMatch.invoiceAmount,
      varianceAmount: flatMatch.varianceAmount,
      variancePercentage: flatMatch.variancePercentage,
      status: flatMatch.status,
      isException: flatMatch.isException,
      requiresReview: flatMatch.requiresReview,
      createdAt: flatMatch.createdAt,
      totalLineCount: Number(group.totalLineCount ?? group.total_line_count ?? 0),
      discrepantLineCount: Number(group.discrepantLineCount ?? group.discrepant_line_count ?? 0),
      invoiceMatches: [flatMatch],
    };
  }

  const invoiceMatches = rawSubRows
    .map(normalizeMatching)
    .sort((left, right) => new Date(left.createdAt || 0) - new Date(right.createdAt || 0));
  const latestMatch = invoiceMatches[invoiceMatches.length - 1] || {};

  return {
    ...group,
    id: group.poId ?? group.po_id ?? group.purchaseOrderId ?? group.purchase_order_id ?? group.id ?? latestMatch.id,
    groupId: group.groupId ?? group.group_id ?? group.matchGroupId ?? group.match_group_id ?? "",
    poId: group.poId ?? group.po_id ?? group.purchaseOrderId ?? group.purchase_order_id ?? "",
    poNumber: group.poNumber ?? group.po_number ?? latestMatch.poNumber ?? "",
    vendorName: group.vendorName ?? group.vendor_name ?? latestMatch.vendorName ?? "",
    grnNumber: group.grnNumber ?? group.grn_number ?? latestMatch.grnNumber ?? "",
    matchType: normalizeMatchType(group.matchType ?? group.match_type ?? latestMatch.matchType),
    currency: group.currency ?? group.currencyCode ?? latestMatch.currency ?? "INR",
    poAmount: Number(group.poAmount ?? group.po_amount ?? latestMatch.poAmount ?? 0),
    convertToInr: Boolean(group.convertToInr ?? group.convert_to_inr ?? latestMatch.convertToInr ?? false),
    matchingInrValue: group.matchingInrValue ?? group.matching_inr_value ?? latestMatch.matchingInrValue ?? "",
    matchingReadinessStatus:
      group.matchingReadinessStatus ??
      group.matching_readiness_status ??
      latestMatch.matchingReadinessStatus,
    cumulativeInvoiceAmount: Number(
      group.cumulativeInvoiceAmount ??
        group.cumulative_invoice_amount ??
        invoiceMatches.reduce((sum, item) => sum + Number(item.invoiceAmount || 0), 0),
    ),
    varianceAmount: Number(group.varianceAmount ?? group.variance_amount ?? 0),
    variancePercentage: Number(group.variancePercentage ?? group.variance_percentage ?? 0),
    status: normalizeStatus(group.status ?? group.match_status ?? latestMatch.status),
    isException: Boolean(group.isException ?? group.is_exception ?? invoiceMatches.some((item) => item.isException)),
    requiresReview: Boolean(group.requiresReview ?? group.requires_review ?? invoiceMatches.some((item) => item.requiresReview)),
    createdAt: group.createdAt ?? group.created_at ?? latestMatch.createdAt,
    totalLineCount: Number(
      group.totalLineCount ??
        group.total_line_count ??
        invoiceMatches.reduce((sum, item) => sum + Number(item.totalLineCount || 0), 0),
    ),
    discrepantLineCount: Number(
      group.discrepantLineCount ??
        group.discrepant_line_count ??
        invoiceMatches.reduce((sum, item) => sum + Number(item.discrepantLineCount || 0), 0),
    ),
    invoiceMatches,
  };
};

const normalizeInvoice = (invoice = {}) => ({
  ...invoice,
  id: invoice.id ?? invoice.invoiceId ?? invoice.invoice_id,
  invoiceNumber: invoice.invoiceNumber ?? invoice.invoice_number ?? invoice.number ?? "",
  vendorId: invoice.vendorId ?? invoice.vendor_id ?? invoice.vendor?.id ?? "",
  vendorName: invoice.vendorName ?? invoice.vendor_name ?? "",
  totalAmount: Number(invoice.totalAmount ?? invoice.total_amount ?? invoice.amount ?? 0),
  remainingAmount: Number(
    invoice.remainingAmount ?? invoice.remaining_amount ?? invoice.totalAmount ?? invoice.amount ?? 0,
  ),
  currency: invoice.currency ?? "INR",
  documentType: invoice.documentType ?? invoice.document_type ?? "",
  linkedProformaInvoiceId:
    invoice.linkedProformaInvoiceId ?? invoice.linked_proforma_invoice_id ?? invoice.piId ?? invoice.pi_id ?? "",
});

const isProformaDocument = (invoice = {}) =>
  ["PROFORMA_INVOICE", "PROFORMA", "PI"].includes(
    String(invoice.documentType || "").trim().toUpperCase(),
  );

const getVendorKey = (record = {}) =>
  String(record.vendorId ?? record.vendor_id ?? record.vendor?.id ?? record.vendorName ?? record.vendor_name ?? "")
    .trim()
    .toLowerCase();

const hasMixedVendors = (records = []) => {
  const vendorKeys = records.map(getVendorKey).filter(Boolean);
  return new Set(vendorKeys).size > 1;
};

const normalizePurchaseOrder = (po = {}) => ({
  ...po,
  id: po.id ?? po.poId ?? po.po_id ?? po.purchaseOrderId ?? po.purchase_order_id,
  poNumber: po.poNumber ?? po.po_number ?? po.number ?? "",
  vendorId: po.vendorId ?? po.vendor_id ?? po.vendor?.id ?? "",
  vendorName: po.vendorName ?? po.vendor_name ?? po.vendor?.name ?? "",
  date: po.date ?? po.poDate ?? po.po_date ?? po.poDateOrReceivedDate,
  amount: Number(po.amount ?? po.poAmount ?? po.po_amount ?? 0),
  currency: po.currency ?? "INR",
  convertToInr: Boolean(po.convertToInr ?? po.convert_to_inr ?? false),
  matchingInrValue: po.matchingInrValue ?? po.matching_inr_value ?? "",
  readinessStatus: po.readinessStatus ?? po.readiness_status,
  varianceAmount: Number(po.varianceAmount ?? po.variance_amount ?? 0),
  variancePercentage: Number(po.variancePercentage ?? po.variance_percentage ?? 0),
  recommendation: po.recommendation ?? po.recommendationStatus ?? po.recommendation_status ?? "",
  recommendationReason: po.recommendationReason ?? po.recommendation_reason ?? "",
});

const normalizeGrn = (grn = {}) => ({
  ...grn,
  id: grn.id ?? grn.grnId ?? grn.grn_id,
  poId: grn.poId ?? grn.po_id ?? grn.purchaseOrderId ?? grn.purchase_order_id ?? "",
  grnNumber: grn.grnNumber ?? grn.grn_number ?? grn.number ?? "",
  vendorId: grn.vendorId ?? grn.vendor_id ?? grn.vendor?.id ?? "",
  vendorName: grn.vendorName ?? grn.vendor_name ?? grn.vendor?.name ?? "",
  amount: Number(grn.amount ?? grn.grnAmount ?? grn.grn_amount ?? 0),
  currency: grn.currency ?? "INR",
  convertToInr: Boolean(grn.convertToInr ?? grn.convert_to_inr ?? false),
  matchingInrValue: grn.matchingInrValue ?? grn.matching_inr_value ?? "",
  readinessStatus: grn.readinessStatus ?? grn.readiness_status,
  receivedDate: grn.receivedDate ?? grn.received_date ?? grn.poDateOrReceivedDate,
  recommendation: grn.recommendation ?? grn.recommendationStatus ?? grn.recommendation_status ?? "",
  recommendationReason: grn.recommendationReason ?? grn.recommendation_reason ?? "",
});

const mergeById = (items, fallbackItem) => {
  const normalized = fallbackItem?.id ? [fallbackItem, ...items] : items;
  return normalized.filter(
    (item, index, list) => item?.id && list.findIndex((candidate) => candidate.id === item.id) === index,
  );
};

const extractSuggestionItems = (data = {}, keys = []) => {
  const containers = [
    data?.suggestions,
    data?.data?.suggestions,
    data?.data,
    data,
  ].filter(Boolean);

  for (const container of containers) {
    for (const key of keys) {
      if (Array.isArray(container?.[key])) return container[key];
    }
  }

  return [];
};

const isRecommendedOption = (item = {}) => {
  const value = String(item.recommendation || item.recommendationStatus || "").trim().toUpperCase();
  return Boolean(item.isRecommended || item.is_recommended || value === "RECOMMENDED" || value === "EXACT_MATCH");
};

const recommendationText = (item = {}) => {
  if (isRecommendedOption(item)) return "Recommended";
  return item.recommendationReason || item.recommendation || "";
};

const documentOptionLabel = (document = {}, fallback = "Document") => {
  const typeLabel = isProformaDocument(document) ? "PI" : "TI";
  const amount = formatCurrency(document.remainingAmount ?? document.totalAmount, document.currency);
  return `${typeLabel} ${document.invoiceNumber || fallback} - ${document.vendorName || "-"} (${amount})`;
};

const purchaseOrderOptionLabel = (po = {}) => {
  const note = recommendationText(po);
  return `${po.poNumber || "PO"} - ${formatCurrency(po.amount, po.currency)}${note ? ` - ${note}` : ""}`;
};

const grnOptionLabel = (grn = {}) => {
  const note = recommendationText(grn);
  return `${grn.grnNumber || "GRN"} - ${formatCurrency(grn.amount, grn.currency)}${note ? ` - ${note}` : ""}`;
};

const emptyMatchForm = {
  invoiceId: "",
  invoiceIds: [],
  piId: "",
  purchaseOrderId: "",
  grnId: "",
  matchType: "PO_INVOICE",
  remarks: "",
};

const InvoiceMatching = () => {
  const { guardAction, canPerformAction } = useActionGuard();
  const { isCorporateScreenAllowed, isCorporateSectionEnabled } = useRBAC();
  const { handleCreditError } = useCreditErrorHandler();
  const canPerform = canPerformAction("matching.perform");
  const canEdit = canPerformAction("matching.edit");
  const canMarkException = canPerformAction("matching.exception");
  const hasPurchaseOrderSubscription =
    isCorporateScreenAllowed("PURCHASE_ORDER") &&
    (isCorporateSectionEnabled("PURCHASE_ORDER_ALL") ||
      isCorporateSectionEnabled("PURCHASE_ORDER_CREATE") ||
      isCorporateSectionEnabled("PURCHASE_ORDER_UPLOAD"));
  const hasGrnSubscription =
    isCorporateScreenAllowed("GRN") && isCorporateSectionEnabled("GRN_ALL");
  const canUseThreeWayMatching = hasPurchaseOrderSubscription && hasGrnSubscription;

  const [query, setQuery] = useState({
    page: 0,
    size: 20,
    status: "ALL",
    matchType: "ALL",
    search: "",
    sortBy: "createdAt",
    sortDir: "desc",
  });
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearchInput = useDebouncedValue(searchInput.trim(), 300);
  const [showMatchDialog, setShowMatchDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showGroupChecklistDialog, setShowGroupChecklistDialog] = useState(false);
  const [showExceptionDialog, setShowExceptionDialog] = useState(false);
  const [selectedMatching, setSelectedMatching] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [editingMatching, setEditingMatching] = useState(null);
  const [matchForm, setMatchForm] = useState(emptyMatchForm);
  const [exceptionReason, setExceptionReason] = useState("");
  const [expandedGroupIds, setExpandedGroupIds] = useState(new Set());

  const listParams = useMemo(
    () => ({
      ...query,
      search: query.search || undefined,
    }),
    [query],
  );

  const {
    data: summary = {},
    isLoading: summaryLoading,
    refetch: refetchSummary,
  } = useGetInvoiceMatchingSummaryQuery();
  const {
    data: listData = {},
    isLoading: listLoading,
    refetch: refetchList,
  } = useGetInvoiceMatchingListQuery(listParams);
  const {
    data: detailData,
    isFetching: detailLoading,
  } = useGetInvoiceMatchingDetailQuery(selectedMatching?.id, {
    skip: !selectedMatching?.id || !showDetailDialog,
  });
  const { data: invoicesData = {}, isFetching: invoicesFetching } =
    useGetAvailableMatchingInvoicesQuery(
      {
        page: 0,
        size: 100,
        matchType: normalizeMatchType(matchForm.matchType),
        purchaseOrderId: matchForm.purchaseOrderId || undefined,
        grnId: matchForm.grnId || undefined,
        includeAll: true,
        includeSuggestions: true,
      },
      {
        skip: !showMatchDialog,
        refetchOnMountOrArgChange: true,
      },
    );
  const isEditMode = Boolean(editingMatching);
  const selectedMatchRequirements = getMatchTypeRequirements(matchForm.matchType);
  const purchaseOrderPickerParams = useMemo(
    () => ({
      page: 0,
      size: 100,
      matchType: normalizeMatchType(matchForm.matchType),
      invoiceId: matchForm.invoiceId || undefined,
      piId: matchForm.piId || undefined,
      includeAll: true,
      includeSuggestions: true,
    }),
    [matchForm.invoiceId, matchForm.matchType, matchForm.piId],
  );
  const { data: purchaseOrdersData = {}, isFetching: purchaseOrdersLoading } =
    useGetAvailablePurchaseOrdersQuery(purchaseOrderPickerParams, {
      skip: !showMatchDialog || !selectedMatchRequirements.po,
      refetchOnMountOrArgChange: true,
    });
  const grnPickerParams = useMemo(() => {
    if (!showMatchDialog || !selectedMatchRequirements.grn) return null;
    return {
      page: 0,
      size: 100,
      matchType: normalizeMatchType(matchForm.matchType),
      poId: matchForm.purchaseOrderId || undefined,
      invoiceId: matchForm.invoiceId || undefined,
      piId: matchForm.piId || undefined,
      includeAll: true,
      includeSuggestions: true,
    };
  }, [
    matchForm.invoiceId,
    matchForm.matchType,
    matchForm.piId,
    matchForm.purchaseOrderId,
    selectedMatchRequirements.grn,
    showMatchDialog,
  ]);
  const { data: grnsData = {}, isFetching: grnsLoading } = useGetAvailableGrnsQuery(
    grnPickerParams,
    {
      skip: !grnPickerParams,
      refetchOnMountOrArgChange: true,
    },
  );
  const {
    data: grnMatchSuggestionsData,
    isFetching: grnMatchSuggestionsLoading,
  } = useGetAvailableMatchesForGrnQuery(matchForm.grnId, {
    skip: !showMatchDialog || !matchForm.grnId,
    refetchOnMountOrArgChange: true,
  });

  const [getInvoiceMatchingDetail] = useLazyGetInvoiceMatchingDetailQuery();
  const [performInvoiceMatch, { isLoading: performing }] = usePerformInvoiceMatchMutation();
  const [editInvoiceMatch, { isLoading: editing }] = useEditInvoiceMatchMutation();
  const [markInvoiceMatchException, { isLoading: markingException }] =
    useMarkInvoiceMatchExceptionMutation();

  const matchingGroups = useMemo(
    () => extractPageContent(listData).map(normalizeMatchingGroup),
    [listData],
  );
  const suggestedTaxInvoices = extractSuggestionItems(invoicesData, [
    "taxInvoices",
    "tax_invoices",
    "taxInvoiceSuggestions",
    "tax_invoice_suggestions",
  ]);
  const suggestedPis = extractSuggestionItems(invoicesData, [
    "proformaInvoices",
    "proforma_invoices",
    "pis",
    "piSuggestions",
    "pi_suggestions",
  ]);
  const suggestedDocuments = extractSuggestionItems(invoicesData, [
    "documents",
    "documentSuggestions",
    "document_suggestions",
    "invoices",
    "invoiceSuggestions",
    "invoice_suggestions",
  ]);
  const documentPickerItems =
    suggestedTaxInvoices.length || suggestedPis.length
      ? [...suggestedTaxInvoices, ...suggestedPis]
      : suggestedDocuments.length
        ? suggestedDocuments
        : extractPageContent(invoicesData);
  const purchaseOrderPickerItems = extractSuggestionItems(purchaseOrdersData, [
    "purchaseOrders",
    "purchase_orders",
    "poSuggestions",
    "po_suggestions",
    "suggestedPurchaseOrders",
    "suggested_purchase_orders",
  ]);
  const grnPickerItems = extractSuggestionItems(grnsData, [
    "grns",
    "grnSuggestions",
    "grn_suggestions",
    "suggestedGrns",
    "suggested_grns",
  ]);
  const invoices = mergeById(
    documentPickerItems.map(normalizeInvoice),
    editingMatching?.invoice ? normalizeInvoice(editingMatching.invoice) : null,
  );
  const purchaseOrders = mergeById(
    (purchaseOrderPickerItems.length ? purchaseOrderPickerItems : extractPageContent(purchaseOrdersData))
      .map(normalizePurchaseOrder),
    editingMatching?.purchaseOrder ? normalizePurchaseOrder(editingMatching.purchaseOrder) : null,
  );
  const grns = mergeById(
    (grnPickerItems.length ? grnPickerItems : extractMatchingGrns(grnsData).items).map(normalizeGrn),
    editingMatching?.grn ? normalizeGrn(editingMatching.grn) : null,
  );
  const detail = detailData ? normalizeMatching(detailData) : selectedMatching;
  const totalPages = Number(listData?.totalPages ?? 1) || 1;
  const totalElements = Number(listData?.totalElements ?? matchingGroups.length) || 0;
  const loading = summaryLoading || listLoading;
  const matchCostEstimate = useMeteredActionEstimate(
    CREDIT_ACTION_CODES.INVOICE_MATCHING,
    isEditMode ? 0 : 1,
  );
  const taxInvoiceOptions = invoices.filter((invoice) => !isProformaDocument(invoice));
  const piOptions = invoices.filter(isProformaDocument);
  const selectedInvoiceIds = matchForm.invoiceIds?.length
    ? matchForm.invoiceIds
    : [matchForm.invoiceId].filter(Boolean);
  const selectedInvoices = invoices.filter((invoice) => selectedInvoiceIds.includes(invoice.id));
  const selectedInvoice = selectedInvoices[0];
  const selectedPi = invoices.find((invoice) => invoice.id === matchForm.piId);
  const selectedDocuments = selectedInvoices.length
    ? selectedInvoices
    : [selectedPi].filter(Boolean);
  const selectedDocument = selectedDocuments[0];
  const selectedPo = purchaseOrders.find((po) => po.id === matchForm.purchaseOrderId);
  const selectedGrn = grns.find((grn) => grn.id === matchForm.grnId);
  const selectedMatchNeedsPo = selectedMatchRequirements.po;
  const selectedMatchNeedsGrn = selectedMatchRequirements.grn;
  const availableMatchTypeOptions = canUseThreeWayMatching
    ? MATCH_TYPE_OPTIONS
    : MATCH_TYPE_OPTIONS.filter((option) => !GRN_MATCH_TYPES.has(option.value));
  const suggestedMatchTypes = useMemo(
    () => extractSuggestedMatchTypes(grnMatchSuggestionsData),
    [grnMatchSuggestionsData],
  );
  const manualMatchTypeOptions = useMemo(() => {
    const subscriptionAllowed = canUseThreeWayMatching
      ? MANUAL_MATCH_TYPE_OPTIONS
      : MANUAL_MATCH_TYPE_OPTIONS.filter((option) => !GRN_MATCH_TYPES.has(option.value));

    if (suggestedMatchTypes.length === 0) return subscriptionAllowed;

    const suggested = new Set(suggestedMatchTypes);
    return subscriptionAllowed.filter((option) => suggested.has(option.value));
  }, [canUseThreeWayMatching, suggestedMatchTypes]);
  const matchQuickFilters = [
    { value: "ALL", label: "All", count: Number(summary.totalMatchings ?? 0) },
    { value: "MATCHED", label: "Matched", count: Number(summary.matched ?? 0) },
    { value: "PARTIAL_MATCH", label: "Partially Matched", count: Number(summary.partialMatch ?? 0) },
    { value: "MISMATCH", label: "Mismatch", count: Number(summary.mismatch ?? 0) },
    { value: "RESOLVED", label: "Resolved", count: Number(summary.resolved ?? 0) },
  ];

  useEffect(() => {
    setQuery((current) =>
      current.search === debouncedSearchInput
        ? current
        : { ...current, page: 0, search: debouncedSearchInput },
    );
  }, [debouncedSearchInput]);

  useEffect(() => {
    if (canUseThreeWayMatching) return;

    if (GRN_MATCH_TYPES.has(query.matchType)) {
      setQuery((current) => ({
        ...current,
        page: 0,
        matchType: "ALL",
      }));
    }
  }, [canUseThreeWayMatching, query.matchType]);

  useEffect(() => {
    if (canUseThreeWayMatching || !GRN_MATCH_TYPES.has(matchForm.matchType)) return;

    setMatchForm((current) => ({
      ...current,
      matchType: "PO_INVOICE",
      grnId: "",
    }));
  }, [canUseThreeWayMatching, matchForm.matchType]);

  useEffect(() => {
    if (!showMatchDialog || !matchForm.grnId || suggestedMatchTypes.length === 0) return;
    if (suggestedMatchTypes.includes(normalizeMatchType(matchForm.matchType))) return;

    const nextMatchType = manualMatchTypeOptions[0]?.value;
    if (!nextMatchType) return;

    setMatchForm((current) => ({
      ...current,
      matchType: nextMatchType,
    }));
  }, [
    manualMatchTypeOptions,
    matchForm.grnId,
    matchForm.matchType,
    showMatchDialog,
    suggestedMatchTypes,
  ]);

  const refreshData = async () => {
    try {
      await Promise.all([refetchSummary(), refetchList()]);
    } catch (error) {
      toast.error("Failed to refresh invoice matching data");
    }
  };

  const updateQuery = (patch) => {
    setQuery((current) => ({
      ...current,
      page: patch.page ?? 0,
      ...patch,
    }));
  };

  const openNewMatchDialog = () => {
    setEditingMatching(null);
    setMatchForm(emptyMatchForm);
    setShowMatchDialog(true);
  };

  const openEditDialog = async (match) => {
    if (!guardAction("matching.edit")) return;
    try {
      const detailRecord = await getInvoiceMatchingDetail(match.id).unwrap();
      setEditingMatching(detailRecord);
      const normalizedType = normalizeMatchType(detailRecord.matchType ?? match.matchType);
      const detailInvoice = normalizeInvoice(detailRecord.invoice || {});
      const detailPiId =
        detailRecord.pi?.id ??
        detailRecord.proformaInvoice?.id ??
        detailRecord.proforma_invoice?.id ??
        detailRecord.piId ??
        detailRecord.pi_id ??
        (isProformaDocument(detailInvoice) ? detailInvoice.id : "");
      setMatchForm({
        invoiceId: isProformaDocument(detailInvoice)
          ? ""
          : detailRecord.invoice?.id ?? detailRecord.invoiceId ?? "",
        invoiceIds: [],
        piId: detailPiId,
        purchaseOrderId: detailRecord.purchaseOrder?.id ?? detailRecord.purchaseOrderId ?? "",
        grnId: detailRecord.grn?.id ?? detailRecord.grnId ?? "",
        matchType: normalizedType,
        remarks: "",
      });
      setShowMatchDialog(true);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to load match details for edit"));
    }
  };

  const handleInvoiceChange = (invoiceId) => {
    const nextInvoice = invoices.find((invoice) => invoice.id === invoiceId);
    const currentPi = invoices.find((invoice) => invoice.id === matchForm.piId);
    if (hasMixedVendors([nextInvoice, currentPi].filter(Boolean))) {
      toast.error("Selected TI and PI must belong to the same vendor");
      return;
    }

    setMatchForm((current) => ({
      ...current,
      invoiceId,
      invoiceIds: invoiceId ? [invoiceId] : [],
    }));
  };

  const handleInvoiceToggle = (invoiceId, checked) => {
    const currentIds = matchForm.invoiceIds?.length
      ? matchForm.invoiceIds
      : [matchForm.invoiceId].filter(Boolean);
    const nextIds = checked
      ? [...new Set([...currentIds, invoiceId])]
      : currentIds.filter((id) => id !== invoiceId);
    const nextDocuments = invoices.filter((invoice) => nextIds.includes(invoice.id));

    if (hasMixedVendors(nextDocuments)) {
      toast.error("Selected invoices must belong to the same vendor");
      return;
    }

    setMatchForm((current) => ({
      ...current,
      invoiceId: nextIds[0] || "",
      invoiceIds: nextIds,
    }));
  };

  const handlePiChange = (piId) => {
    const nextPi = invoices.find((invoice) => invoice.id === piId);
    const currentInvoice = invoices.find((invoice) => invoice.id === matchForm.invoiceId);
    if (hasMixedVendors([currentInvoice, nextPi].filter(Boolean))) {
      toast.error("Selected TI and PI must belong to the same vendor");
      return;
    }

    setMatchForm((current) => ({
      ...current,
      piId,
    }));
  };

  const handleDocumentToggle = (document, checked) => {
    const currentIds = matchForm.invoiceIds?.length
      ? matchForm.invoiceIds
      : [matchForm.invoiceId, matchForm.piId].filter(Boolean);
    const nextIds = checked
      ? [...new Set([...currentIds, document.id])]
      : currentIds.filter((id) => id !== document.id);
    const selectedDocs = invoices.filter((invoice) => nextIds.includes(invoice.id));
    const nextTaxInvoice = selectedDocs.find((invoice) => !isProformaDocument(invoice));
    const nextPi = selectedDocs.find(isProformaDocument);

    if (hasMixedVendors(selectedDocs)) {
      toast.error("Selected documents must belong to the same vendor");
      return;
    }

    setMatchForm((current) => ({
      ...current,
      invoiceId: nextTaxInvoice?.id || "",
      invoiceIds: nextIds,
      piId: nextPi?.id || "",
    }));
  };

  const handlePiToggle = (piId, checked) => {
    const currentIds = matchForm.invoiceIds?.length
      ? matchForm.invoiceIds
      : [matchForm.piId].filter(Boolean);
    const nextIds = checked
      ? [...new Set([...currentIds, piId])]
      : currentIds.filter((id) => id !== piId);
    const nextDocuments = invoices.filter((invoice) => nextIds.includes(invoice.id));

    if (hasMixedVendors(nextDocuments)) {
      toast.error("Selected PI documents must belong to the same vendor");
      return;
    }

    setMatchForm((current) => ({
      ...current,
      invoiceIds: nextIds,
      piId: nextIds[0] || "",
    }));
  };

  const handlePoChange = (purchaseOrderId) => {
    setMatchForm((current) => ({
      ...current,
      purchaseOrderId,
      grnId: "",
    }));
  };

  const handleMatchSubmit = async () => {
    const action = isEditMode ? "matching.edit" : "matching.perform";
    const requirements = getMatchTypeRequirements(matchForm.matchType);
    if (!guardAction(action)) return;
    const selectedTaxInvoiceIds = matchForm.invoiceIds?.length
      ? matchForm.invoiceIds
      : [matchForm.invoiceId].filter(Boolean);
    const selectedPiIds = matchForm.invoiceIds?.length
      ? matchForm.invoiceIds
      : [matchForm.piId].filter(Boolean);
    const selectedDocumentIds = matchForm.invoiceIds?.length
      ? matchForm.invoiceIds
      : [matchForm.invoiceId, matchForm.piId].filter(Boolean);

    if (requirements.taxInvoice && selectedTaxInvoiceIds.length === 0) {
      toast.error("Please select a tax invoice");
      return;
    }
    if (requirements.pi && selectedPiIds.length === 0) {
      toast.error("Please select a PI");
      return;
    }
    if (requirements.anyDocument && selectedDocumentIds.length === 0) {
      toast.error("Please select an invoice or PI");
      return;
    }
    if (requirements.po && !matchForm.purchaseOrderId) {
      toast.error("Please select a purchase order");
      return;
    }
    if (requirements.grn && !matchForm.grnId) {
      toast.error("Please select a GRN");
      return;
    }
    if (hasMixedVendors([...selectedDocuments, selectedPo, selectedGrn].filter(Boolean))) {
      toast.error("Selected documents, PO, and GRN must belong to the same vendor");
      return;
    }

    let body = {
      matchType: normalizeMatchType(matchForm.matchType),
    };
    if (requirements.po) {
      body.purchaseOrderId = matchForm.purchaseOrderId;
    }
    if (requirements.taxInvoice || (requirements.anyDocument && matchForm.invoiceId)) {
      if (!isEditMode && selectedTaxInvoiceIds.length > 1) {
        body.invoiceIds = selectedTaxInvoiceIds;
      } else {
        body.invoiceId = selectedTaxInvoiceIds[0] || matchForm.invoiceId;
      }
      body.matchedDocType = "TAX_INVOICE";
    }
    if (requirements.pi || (requirements.anyDocument && matchForm.piId)) {
      if (!isEditMode && selectedPiIds.length > 1) {
        body.invoiceIds = selectedPiIds;
      }
      body.piId = selectedPiIds[0] || matchForm.piId;
      body.matchedDocType = "PROFORMA_INVOICE";
    }
    if (requirements.anyDocument && !requirements.taxInvoice && !requirements.pi) {
      if (!isEditMode && selectedDocumentIds.length > 1) {
        body.invoiceIds = selectedDocumentIds;
      } else if (matchForm.invoiceId) {
        body.invoiceId = matchForm.invoiceId;
      }
      if (matchForm.piId) {
        body.piId = matchForm.piId;
      }
      if (selectedDocuments.length > 0) {
        const hasPi = selectedDocuments.some(isProformaDocument);
        const hasTaxInvoice = selectedDocuments.some((invoice) => !isProformaDocument(invoice));
        if (hasPi !== hasTaxInvoice) {
          body.matchedDocType = hasPi ? "PROFORMA_INVOICE" : "TAX_INVOICE";
        }
      }
    }
    if (requirements.grn) {
      body.grnId = matchForm.grnId;
    }
    if (isEditMode && matchForm.remarks.trim()) {
      body.remarks = matchForm.remarks.trim();
    }

    try {
      const result = isEditMode
        ? await editInvoiceMatch({ id: editingMatching.id, body }).unwrap()
        : await performInvoiceMatch(body).unwrap();
      toast.success(result?.message || (isEditMode ? "Match resubmitted" : "Match performed"));
      setShowMatchDialog(false);
      setEditingMatching(null);
      setMatchForm(emptyMatchForm);
      refreshData();
    } catch (error) {
      if (handleCreditError(error)) return;
      toast.error(getErrorMessage(error, isEditMode ? "Failed to edit match" : "Failed to perform match"));
    }
  };

  const openExceptionDialog = (match) => {
    if (!guardAction("matching.exception")) return;
    setSelectedMatching(match);
    setExceptionReason("");
    setShowExceptionDialog(true);
  };

  const handleMarkException = async () => {
    if (!guardAction("matching.exception")) return;
    if (!selectedMatching || !exceptionReason.trim()) {
      toast.error("Please provide an exception reason");
      return;
    }
    try {
      const result = await markInvoiceMatchException({
        id: selectedMatching.id,
        body: { exceptionReason: exceptionReason.trim() },
      }).unwrap();
      toast.success(result?.message || "Record marked as exception");
      setShowExceptionDialog(false);
      setExceptionReason("");
      refreshData();
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to mark exception"));
    }
  };

  const getSubmitDisabledReason = () => {
    const requirements = getMatchTypeRequirements(matchForm.matchType);
    const selectedIds = matchForm.invoiceIds?.length
      ? matchForm.invoiceIds
      : [matchForm.invoiceId, matchForm.piId].filter(Boolean);
    if (performing || editing) return "Saving match...";
    if (requirements.taxInvoice && selectedIds.length === 0) return "Select a tax invoice";
    if (requirements.pi && selectedIds.length === 0) return "Select a PI";
    if (requirements.anyDocument && selectedIds.length === 0) return "Select an invoice or PI";
    if (requirements.po && !matchForm.purchaseOrderId) return "Select a purchase order";
    if (requirements.grn && !matchForm.grnId) return "Select a GRN";
    return "";
  };

  const renderStatusBadge = (status) => {
    const meta = statusMeta[normalizeStatus(status)] ?? {
      label: status || "-",
      className: "bg-gray-500",
      icon: RefreshCw,
    };
    const Icon = meta.icon;
    return (
      <Badge className={`${meta.className} text-white`}>
        <Icon className="h-3 w-3 mr-1" />
        {meta.label}
      </Badge>
    );
  };

  const renderDocumentCard = (title, icon, data) => {
    const Icon = icon;
    return (
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Icon className="h-4 w-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>
            <span className="text-muted-foreground">Number:</span> {data?.number || "-"}
          </p>
          <p>
            <span className="text-muted-foreground">Vendor:</span> {data?.vendorName || "-"}
          </p>
          <p>
            <span className="text-muted-foreground">Amount:</span>{" "}
            {formatCurrency(data?.amount, data?.currency)}
          </p>
          <p>
            <span className="text-muted-foreground">Date:</span>{" "}
            {formatDate(data?.poDateOrReceivedDate)}
          </p>
        </CardContent>
      </Card>
    );
  };

  const renderMatchActions = (match) => {
    const canOpenException =
      canMarkException &&
      (match.status === "PARTIAL_MATCH" || match.status === "MISMATCH");

    return (
      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSelectedMatching(match);
            setShowDetailDialog(true);
          }}
          data-testid={`view-matching-${match?.id ?? 'unknown'}`}
        >
          <Eye className="h-4 w-4" />
        </Button>
        {canEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEditDialog(match)}
            data-testid={`edit-matching-${match?.id ?? 'unknown'}`}
          >
            <Edit className="h-4 w-4" />
          </Button>
        )}
        {canOpenException && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openExceptionDialog(match)}
            data-testid={`exception-matching-${match?.id ?? 'unknown'}`}
          >
            <AlertTriangle className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  };

  const renderMatchingRow = (group, rowIndex, headers) => {
    const groupId = String(group.id || group.poId || rowIndex);
    const isExpanded = expandedGroupIds.has(groupId);
    const invoiceMatches = group.invoiceMatches || [];
    const hasChildren = invoiceMatches.length > 0;
    const canExpand = hasChildren;
    const progressValue = group.poAmount > 0
      ? Math.min(100, Math.max(0, (group.cumulativeInvoiceAmount / group.poAmount) * 100))
      : 0;
    const rowTone = group.isException
      ? "bg-red-50/70"
      : group.requiresReview
        ? "bg-amber-50/70"
        : "bg-white";
    const invoiceSummary = invoiceMatches
      .map((match) => match.invoiceNumber)
      .filter(Boolean)
      .join(" · ");

    const toggleExpanded = () => {
      if (!canExpand) return;
      setExpandedGroupIds((current) => {
        const next = new Set(current);
        if (next.has(groupId)) next.delete(groupId);
        else next.add(groupId);
        return next;
      });
    };

    const handleRowKeyDown = (event) => {
      if (!canExpand) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        toggleExpanded();
      }
    };

    return (
      <React.Fragment key={groupId}>
        <TableRow
          className={`${rowTone} border-b ${canExpand ? "cursor-pointer" : ""}`}
          data-testid={`matching-po-row-${groupId}`}
          tabIndex={canExpand ? 0 : undefined}
          onClick={toggleExpanded}
          onKeyDown={handleRowKeyDown}
        >
          {headers.map((header) => {
            let value;

            switch (header.key) {
              case "poGroup":
                value = (
                  <div className="min-w-0">
                    <div
                      className="inline-flex max-w-full items-center gap-1.5 text-left font-semibold"
                      data-testid={`toggle-matching-group-${groupId}`}
                    >
                      {canExpand ? (
                        isExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        )
                      ) : null}
                      <span className="truncate">{group.poNumber || "PO -"}</span>
                    </div>
                    {hasChildren ? (
                      <div className="mt-1 space-y-1">
                        <div className="inline-flex items-center">
                          <MatchingInvoiceCountBadge count={invoiceMatches.length} />
                        </div>
                        {/* {invoiceMatches.length > 1 && !isExpanded && invoiceSummary ? (
                          <div className="text-xs text-muted-foreground">{invoiceSummary}</div>
                        ) : null} */}
                        <div className="text-xs text-muted-foreground">
                          Latest {formatDate(group.createdAt)}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        Latest {formatDate(group.createdAt)}
                      </div>
                    )}
                    {group.requiresReview ? (
                      <div className="mt-1 text-xs font-medium text-amber-700">Needs review</div>
                    ) : null}
                  </div>
                );
                break;
              case "vendor":
                value = <div className="font-medium">{group.vendorName || "-"}</div>;
                break;
              case "grnNumber":
                value = group.grnNumber || "-";
                break;
              case "matchType":
                value = (
                  <Badge variant="outline" className={'whitespace-nowrap'}>{getMatchTypeLabel(group.matchType)}</Badge>
                );
                break;
              case "poAmount":
                value = renderAmountWithConversion(group.poAmount, group.currency, group);
                break;
              case "matchedAmount":
                value = (
                  <div>
                    <div className="font-medium">
                      {renderAmountWithConversion(group.cumulativeInvoiceAmount, group.currency, group)}
                    </div>
                    <div className="mt-1 h-1.5 w-32 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${progressValue}%` }} />
                    </div>
                  </div>
                );
                break;
              case "variance":
                value = (
                  <div>
                    <div>{formatCurrency(group.varianceAmount)}</div>
                    <div className="text-xs text-muted-foreground">{formatPercent(group.variancePercentage)}%</div>
                  </div>
                );
                break;
              case "status":
                value = renderStatusBadge(group.status);
                break;
              case "actions":
                value = (
                  <div className="flex justify-start gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedGroup(group);
                        setShowGroupChecklistDialog(true);
                      }}
                      data-testid={`view-matching-group-${groupId}`}
                      title="View cumulative checklist"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                );
                break;
              default:
                value = group?.[header.key] || "-";
            }

            return (
              <TableCell
                key={header.key}
                className={cn("border border-table-border", header.cellClassName)}
                onClick={header.key === "actions" ? (event) => event.stopPropagation() : undefined}
              >
                {value}
              </TableCell>
            );
          })}
        </TableRow>

        {isExpanded && canExpand ? (
          <MatchingGroupExpandedRow
            group={group}
            colSpan={headers.length}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            formatPercent={formatPercent}
            renderMatchActions={renderMatchActions}
          />
        ) : null}
      </React.Fragment>
    );
  };

  const renderSelectedPoRow = (po, rowIndex, headers) => (
    <TableRow key={po.id ?? rowIndex}>
      {headers.map((header) => {
        let value;

        switch (header.key) {
          case "date":
            value = formatDate(po.date);
            break;
          case "amount":
            value = renderAmountWithConversion(po.amount, po.currency, po);
            break;
          case "variance":
            value = `${formatCurrency(po.varianceAmount, po.currency)} (${formatPercent(po.variancePercentage)}%)`;
            break;
          case "recommendation":
            value = (
              <Badge variant={po.recommendation === "EXACT_MATCH" ? "default" : "secondary"}>
                {po.recommendation || "VARIANCE"}
              </Badge>
            );
            break;
          default:
            value = po?.[header.key] || "-";
        }

        return (
          <TableCell key={header.key} className={header.cellClassName}>
            {value}
          </TableCell>
        );
      })}
    </TableRow>
  );

  const renderAuditTrailRow = (item, rowIndex, headers) => (
    <TableRow key={`${item.action}-${item.changedAt}-${rowIndex}`}>
      {headers.map((header) => {
        const value = header.key === "changedAt" ? formatDate(item.changedAt) : item?.[header.key] || "-";
        return <TableCell key={header.key}>{value}</TableCell>;
      })}
    </TableRow>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    // Bounded-height flex chain (mirrors Approvals.jsx / GST Overview) so the matching table
    // can scroll internally with a sticky header and a docked, non-scrolling pagination
    // footer, instead of the whole page scrolling past it.
    <div className="flex h-full min-h-0 flex-col gap-6" data-testid="invoice-matching-page">
      <div className="flex shrink-0 flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Invoice Matching</h1>
          <p className="text-muted-foreground">PO, invoice, PI, and GRN matching with dynamic checklist scoring</p>
        </div>
        <div className="flex gap-2">
          <RefreshButton onClick={refreshData} refreshing={loading}>
            Refresh
          </RefreshButton>
          <Button onClick={openNewMatchDialog} disabled={!canPerform} data-testid="new-match-btn">
            <Link2 className="h-4 w-4 mr-2" />
            New Match
          </Button>
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {matchQuickFilters.map(({ value, label, count }) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={query.status === value ? "default" : "outline"}
              onClick={() => updateQuery({ status: value })}
              data-testid={`match-filter-${value}`}
            >
              {label} ({count})
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-64 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search invoice, PO, or vendor..."
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              className="pl-10"
              data-testid="search-matching-input"
            />
          </div>
          <Select value={query.matchType} onValueChange={(matchType) => updateQuery({ matchType })}>
            <SelectTrigger className="w-full md:w-40" data-testid="match-type-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableMatchTypeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <TableSortButton
            options={matchSortOptions}
            value={query.sortBy}
            direction={query.sortDir}
            onChange={({ value, direction }) => updateQuery({ sortBy: value, sortDir: direction })}
          />
        </div>
      </div>

      {/* Bounded to the remaining height so the table can scroll its rows internally with a
          docked pagination footer, matching Approvals > All / GST Overview. */}
      <div className="min-h-0 flex-1">
        <Card className="flex h-full min-h-0 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto scrollbar-thin-muted">
            <AppDataTable
              tableHeader={matchingTableHeader}
              tableData={matchingGroups}
              renderRow={renderMatchingRow}
              emptyMessage="No matching records found."
              tableContainerClassName="overflow-visible"
              headClassName="[&_th]:sticky [&_th]:top-0 [&_th]:z-10"
              bordered
            />
          </div>

          <div className="mt-auto flex shrink-0 items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
            <span>
              Page {query.page + 1} of {totalPages} ({totalElements} PO groups)
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={query.page <= 0}
                onClick={() => updateQuery({ page: Math.max(query.page - 1, 0) })}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={query.page + 1 >= totalPages}
                onClick={() => updateQuery({ page: query.page + 1 })}
              >
                Next
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <Dialog
        open={showMatchDialog}
        onOpenChange={(open) => {
          setShowMatchDialog(open);
          if (!open) {
            setEditingMatching(null);
            setMatchForm(emptyMatchForm);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit and Resubmit Match" : "Perform Invoice Matching"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Match Type</Label>
              {canUseThreeWayMatching ? (
                <Select
                  value={matchForm.matchType}
                  onValueChange={(matchType) =>
                    setMatchForm((current) => ({
                      ...current,
                      matchType,
                      invoiceId: "",
                      invoiceIds: [],
                      piId: "",
                      purchaseOrderId: "",
                      grnId: "",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {manualMatchTypeOptions
                      .filter((option) => option.value !== "ALL")
                      .map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label} Matching
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex min-h-10 items-center justify-between rounded-md border bg-muted/40 px-3 text-sm">
                  <span className="font-medium">PO + Invoice Matching</span>
                  <Badge variant="outline">Default</Badge>
                </div>
              )}
              {matchForm.grnId ? (
                <p className="text-xs text-muted-foreground">
                  {grnMatchSuggestionsLoading
                    ? "Loading match type suggestions from the selected GRN..."
                    : suggestedMatchTypes.length > 0
                      ? "Match types are suggested by the selected GRN."
                      : "No GRN-specific match type suggestions returned yet."}
                </p>
              ) : null}
            </div>

            {selectedMatchRequirements.anyDocument ? (
              <div className="space-y-2">
                <Label>{isEditMode ? "Invoice / PI" : "Invoice / PI Document(s)"}</Label>
                {isEditMode ? (
                  <Select
                    value={
                      matchForm.piId
                        ? `PI:${matchForm.piId}`
                        : matchForm.invoiceId
                          ? `TI:${matchForm.invoiceId}`
                          : ""
                    }
                    onValueChange={(value) => {
                      const [type, id] = String(value || "").split(":");
                      setMatchForm((current) => ({
                        ...current,
                        invoiceId: type === "TI" ? id : "",
                        invoiceIds: type === "TI" && id ? [id] : [],
                        piId: type === "PI" ? id : "",
                      }));
                    }}
                    disabled={invoicesFetching && invoices.length === 0}
                  >
                    <SelectTrigger data-testid="select-document">
                      <SelectValue
                        placeholder={
                          invoicesFetching && invoices.length === 0
                            ? "Loading documents..."
                            : "Select an invoice or PI"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {invoices.map((invoice) => {
                        const typePrefix = isProformaDocument(invoice) ? "PI" : "TI";
                        return (
                          <SelectItem key={`${typePrefix}:${invoice.id}`} value={`${typePrefix}:${invoice.id}`}>
                            {documentOptionLabel(invoice)}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="max-h-64 overflow-y-auto rounded-md border bg-white">
                    {invoicesFetching && invoices.length === 0 ? (
                      <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading documents...
                      </div>
                    ) : invoices.length === 0 ? (
                      <div className="px-3 py-4 text-sm text-muted-foreground">
                        No available invoice or PI found.
                      </div>
                    ) : (
                      invoices.map((invoice) => {
                        const checked = selectedInvoiceIds.includes(invoice.id);
                        return (
                          <label
                            key={invoice.id}
                            className="flex cursor-pointer items-start gap-3 border-b px-3 py-3 last:border-b-0 hover:bg-muted/40"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(value) => handleDocumentToggle(invoice, Boolean(value))}
                              data-testid={`select-document-${invoice?.id ?? "unknown"}`}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block font-medium">{invoice.invoiceNumber || "-"}</span>
                              <span className="block text-xs text-muted-foreground">
                                {documentOptionLabel(invoice)}
                              </span>
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            ) : null}

            {selectedMatchRequirements.taxInvoice ? (
              <div className="space-y-2">
                <Label>{isEditMode ? "Tax Invoice" : "Tax Invoice(s)"}</Label>
                {isEditMode ? (
                  <Select
                    value={matchForm.invoiceId}
                    onValueChange={handleInvoiceChange}
                    disabled={invoicesFetching && taxInvoiceOptions.length === 0}
                  >
                    <SelectTrigger data-testid="select-tax-invoice">
                      <SelectValue
                        placeholder={
                          invoicesFetching && taxInvoiceOptions.length === 0
                            ? "Loading tax invoices..."
                            : "Select a tax invoice"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {taxInvoiceOptions.map((invoice) => (
                        <SelectItem key={invoice.id} value={invoice.id}>
                          {documentOptionLabel(invoice, "Tax Invoice")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="max-h-64 overflow-y-auto rounded-md border bg-white">
                    {invoicesFetching && taxInvoiceOptions.length === 0 ? (
                      <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading tax invoices...
                      </div>
                    ) : taxInvoiceOptions.length === 0 ? (
                      <div className="px-3 py-4 text-sm text-muted-foreground">
                        No available tax invoice found.
                      </div>
                    ) : (
                      taxInvoiceOptions.map((invoice) => {
                        const checked = selectedInvoiceIds.includes(invoice.id);
                        return (
                          <label
                            key={invoice.id}
                            className="flex cursor-pointer items-start gap-3 border-b px-3 py-3 last:border-b-0 hover:bg-muted/40"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(value) => handleInvoiceToggle(invoice.id, Boolean(value))}
                              data-testid={`select-tax-invoice-${invoice?.id ?? "unknown"}`}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block font-medium">{invoice.invoiceNumber || "-"}</span>
                              <span className="block text-xs text-muted-foreground">
                                {invoice.vendorName || "-"} · {formatCurrency(invoice.remainingAmount, invoice.currency)}
                              </span>
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            ) : null}

            {selectedMatchRequirements.pi ? (
              <div className="space-y-2">
                <Label>{isEditMode ? "PI" : "PI Document(s)"}</Label>
                {isEditMode ? (
                  <Select
                    value={matchForm.piId}
                    onValueChange={handlePiChange}
                    disabled={invoicesFetching && piOptions.length === 0}
                  >
                    <SelectTrigger data-testid="select-pi">
                      <SelectValue
                        placeholder={
                          invoicesFetching && piOptions.length === 0
                            ? "Loading PI documents..."
                            : "Select a PI"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {piOptions.map((invoice) => (
                        <SelectItem key={invoice.id} value={invoice.id}>
                          {documentOptionLabel(invoice, "PI")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="max-h-64 overflow-y-auto rounded-md border bg-white">
                    {invoicesFetching && piOptions.length === 0 ? (
                      <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading PI documents...
                      </div>
                    ) : piOptions.length === 0 ? (
                      <div className="px-3 py-4 text-sm text-muted-foreground">
                        No available PI found.
                      </div>
                    ) : (
                      piOptions.map((invoice) => {
                        const checked = selectedInvoiceIds.includes(invoice.id);
                        return (
                          <label
                            key={invoice.id}
                            className="flex cursor-pointer items-start gap-3 border-b px-3 py-3 last:border-b-0 hover:bg-muted/40"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(value) => handlePiToggle(invoice.id, Boolean(value))}
                              data-testid={`select-pi-${invoice?.id ?? "unknown"}`}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block font-medium">{invoice.invoiceNumber || "-"}</span>
                              <span className="block text-xs text-muted-foreground">
                                {documentOptionLabel(invoice, "PI")}
                              </span>
                            </span>
                          </label>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            ) : null}

            {selectedDocument ? (
              <Card className="bg-muted">
                <CardContent className="grid gap-4 pt-4 text-sm md:grid-cols-3">
                  <div>
                    <p className="text-muted-foreground">Selected Document(s)</p>
                    <p className="font-medium">
                      {selectedDocuments.length > 1
                        ? `${selectedDocuments.length} documents`
                        : selectedDocument.invoiceNumber || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Vendor</p>
                    <p className="font-medium">{selectedDocument.vendorName || "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">
                      {selectedDocuments.length > 1 ? "Total Amount" : "Amount"}
                    </p>
                    <p className="font-medium">
                      {formatCurrency(
                        selectedDocuments.reduce(
                          (sum, item) => sum + Number(item.remainingAmount ?? item.totalAmount ?? 0),
                          0,
                        ),
                        selectedDocument.currency || "INR",
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {selectedMatchNeedsPo ? (
              <div className="space-y-2">
              <Label>Select Purchase Order</Label>
              <Select
                value={matchForm.purchaseOrderId}
                onValueChange={handlePoChange}
                disabled={purchaseOrdersLoading && purchaseOrders.length === 0}
              >
                <SelectTrigger data-testid="select-po">
                  <SelectValue
                    placeholder={
                      purchaseOrdersLoading ? "Loading purchase orders..." : "Select a purchase order"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {purchaseOrders.map((po) => (
                    <SelectItem key={po.id} value={po.id}>
                      {purchaseOrderOptionLabel(po)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!purchaseOrdersLoading && purchaseOrders.length === 0 ? (
                <p className="text-xs text-muted-foreground">No available purchase order found.</p>
              ) : null}
              </div>
            ) : (
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                This match type is invoice and GRN based, so purchase order selection is not required.
              </div>
            )}

            {selectedPo && (
              <Card>
                <AppDataTable
                  tableHeader={selectedPoTableHeader}
                  tableData={[selectedPo]}
                  renderRow={renderSelectedPoRow}
                />
              </Card>
            )}

            {selectedMatchNeedsGrn && (
              <div className="space-y-2">
                <Label>Select GRN</Label>
                <Select
                  value={matchForm.grnId}
                  onValueChange={(grnId) => setMatchForm((current) => ({ ...current, grnId }))}
                  disabled={grnsLoading && grns.length === 0}
                >
                  <SelectTrigger data-testid="select-grn">
                    <SelectValue placeholder={grnsLoading ? "Loading GRNs..." : "Select a GRN"} />
                  </SelectTrigger>
                  <SelectContent>
                    {grns.map((grn) => (
                      <SelectItem key={grn.id} value={grn.id}>
                        {grnOptionLabel(grn)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!grnsLoading && grns.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No available GRN found.</p>
                ) : null}
              </div>
            )}

            {selectedGrn ? (
              <Card className="bg-muted">
                <CardContent className="grid gap-4 pt-4 text-sm md:grid-cols-3">
                  <div>
                    <p className="text-muted-foreground">Selected GRN</p>
                    <p className="font-medium">{selectedGrn.grnNumber || "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Received Date</p>
                    <p className="font-medium">{formatDate(selectedGrn.receivedDate)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Amount</p>
                    <div className="font-medium">
                      {renderAmountWithConversion(selectedGrn.amount, selectedGrn.currency, selectedGrn)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {isEditMode && (
              <div className="space-y-2">
                <Label>Remarks</Label>
                <Textarea
                  value={matchForm.remarks}
                  onChange={(event) =>
                    setMatchForm((current) => ({ ...current, remarks: event.target.value }))
                  }
                  placeholder="Add remarks for this resubmission"
                  rows={3}
                />
              </div>
            )}
          </div>

          {!isEditMode ? (
            <MeteredActionCostHint
              actionCode={CREDIT_ACTION_CODES.INVOICE_MATCHING}
              unitCount={1}
              className="mt-4"
            />
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMatchDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleMatchSubmit}
              disabled={
                Boolean(getSubmitDisabledReason()) ||
                (isEditMode ? !canEdit : !canPerform || matchCostEstimate.isDisabled)
              }
              data-testid="perform-match-btn"
            >
              {(performing || editing) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Link2 className="h-4 w-4 mr-2" />
              {isEditMode ? "Resubmit Match" : "Perform Match"}
            </Button>
          </DialogFooter>
          {getSubmitDisabledReason() && (
            <p className="text-right text-xs text-muted-foreground">{getSubmitDisabledReason()}</p>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Matching Details</DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : detail ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Badge variant="outline">{getMatchTypeLabel(detail.matchType)} Match</Badge>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {renderDocumentCard("Document", FileText, detailData?.invoice)}
                {renderDocumentCard("Purchase Order", ShoppingCart, detailData?.purchaseOrder)}
                {usesGrnPool(detail.matchType) && renderDocumentCard("GRN", Package, detailData?.grn)}
              </div>

              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Variance Analysis</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Invoice vs PO</p>
                    <p className="text-lg font-semibold">{formatCurrency(detail.varianceAmount)}</p>
                    <p className="text-xs text-muted-foreground">{formatPercent(detail.variancePercentage)}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">PO vs GRN</p>
                    <p className="text-lg font-semibold">{formatCurrency(detail.grnVarianceAmount)}</p>
                    <p className="text-xs text-muted-foreground">{formatPercent(detail.grnVariancePercentage)}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Requires Review</p>
                    <p className="text-lg font-semibold">{detail.requiresReview ? "Yes" : "No"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Exception</p>
                    <p className="text-lg font-semibold">{detail.isException ? "Yes" : "No"}</p>
                  </div>
                </CardContent>
              </Card>

              {Array.isArray(detailData?.auditTrail) && detailData.auditTrail.length > 0 && (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Audit Trail</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AppDataTable
                      tableHeader={auditTrailTableHeader}
                      tableData={detailData.auditTrail}
                      renderRow={renderAuditTrailRow}
                    />
                  </CardContent>
                </Card>
              )}
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showGroupChecklistDialog}
        onOpenChange={(open) => {
          setShowGroupChecklistDialog(open);
          if (!open) setSelectedGroup(null);
        }}
      >
        <DialogContent
          className="flex h-[90vh] w-[80vw] max-w-[80vw] flex-col gap-0 overflow-hidden p-0"
          data-testid="cumulative-checklist-dialog"
        >
          <DialogHeader className="shrink-0 border-b border-border px-6 py-4 pr-12">
            <DialogTitle>
              Cumulative Checklist
              {selectedGroup?.poNumber ? (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {selectedGroup.poNumber}
                </span>
              ) : null}
            </DialogTitle>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
            {selectedGroup ? (
              <MatchChecklistPanel
                scope="GROUP"
                groupId={selectedGroup.groupId || selectedGroup.matchGroupId || selectedGroup.poId || selectedGroup.id}
                group={selectedGroup}
              />
            ) : null}
          </div>

          <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
            <Button variant="outline" onClick={() => setShowGroupChecklistDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showExceptionDialog} onOpenChange={setShowExceptionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Exception</DialogTitle>
          </DialogHeader>

          {selectedMatching && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-4 text-sm">
                <p>
                  <strong>Invoice:</strong> {selectedMatching.invoiceNumber}
                </p>
                <p>
                  <strong>PO:</strong> {selectedMatching.poNumber}
                </p>
                <p>
                  <strong>Status:</strong> {statusMeta[selectedMatching.status]?.label || selectedMatching.status}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Exception Reason *</Label>
                <Textarea
                  value={exceptionReason}
                  onChange={(event) => setExceptionReason(event.target.value)}
                  placeholder="Explain why this mismatch is being accepted as an exception..."
                  rows={4}
                  data-testid="exception-reason-input"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExceptionDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleMarkException}
              disabled={markingException || !exceptionReason.trim() || !canMarkException}
              data-testid="submit-exception-btn"
            >
              {markingException && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Mark Exception
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InvoiceMatching;

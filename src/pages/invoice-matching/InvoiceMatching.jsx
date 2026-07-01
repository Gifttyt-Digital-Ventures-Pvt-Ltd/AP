import React, { useEffect, useMemo, useState } from "react";
import {
  useEditInvoiceMatchMutation,
  useGetAvailableGrnsQuery,
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
import { Textarea } from "../../components/ui/textarea";
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
import { useCreditErrorHandler } from "../../contexts/CreditErrorContext";
import MeteredActionCostHint from "../../components/credits/MeteredActionCostHint";
import { useMeteredActionEstimate } from "../../hooks/useMeteredActionEstimate";
import { CREDIT_ACTION_CODES } from "../../constants/creditActions";
import { useRBAC } from "../../contexts/RBACContext";
import MatchingGroupExpandedRow from "./components/MatchingGroupExpandedRow";
import MatchingInvoiceCountBadge from "./components/MatchingInvoiceCountBadge";
import MatchChecklistPanel from "./components/MatchChecklistPanel";

const STATUS_OPTIONS = [
  { value: "ALL", label: "All Statuses" },
  { value: "MATCHED", label: "Matched" },
  { value: "PARTIAL_MATCH", label: "Partial Match" },
  { value: "MISMATCH", label: "Mismatch" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "EXCEPTION", label: "Exception" },
];

const MATCH_TYPE_OPTIONS = [
  { value: "ALL", label: "All Types" },
  { value: "TWO_WAY", label: "2-Way" },
  { value: "THREE_WAY", label: "3-Way" },
];

const matchingTableHeader = [
  { key: "poGroup", title: "PO / Invoice" },
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

const getPageContent = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  return [];
};

const normalizeStatus = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "MISMATCH";
  return raw.toUpperCase().replace(/\s+/g, "_");
};

const normalizeMatchType = (value) => {
  const raw = String(value || "").trim().toUpperCase();
  if (raw === "2_WAY") return "TWO_WAY";
  if (raw === "3_WAY") return "THREE_WAY";
  return raw || "TWO_WAY";
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
  invoiceAmount: Number(match.invoiceAmount ?? match.invoice_amount ?? match.invoice?.amount ?? 0),
  poAmount: Number(match.poAmount ?? match.po_amount ?? match.purchaseOrder?.amount ?? 0),
  grnAmount: Number(match.grnAmount ?? match.grn_amount ?? match.grn?.amount ?? 0),
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
      poAmount: flatMatch.poAmount,
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
    poAmount: Number(group.poAmount ?? group.po_amount ?? latestMatch.poAmount ?? 0),
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
  vendorName: invoice.vendorName ?? invoice.vendor_name ?? "",
  totalAmount: Number(invoice.totalAmount ?? invoice.total_amount ?? invoice.amount ?? 0),
  remainingAmount: Number(
    invoice.remainingAmount ?? invoice.remaining_amount ?? invoice.totalAmount ?? invoice.amount ?? 0,
  ),
  currency: invoice.currency ?? "INR",
});

const normalizePurchaseOrder = (po = {}) => ({
  ...po,
  id: po.id ?? po.poId ?? po.po_id ?? po.purchaseOrderId ?? po.purchase_order_id,
  poNumber: po.poNumber ?? po.po_number ?? po.number ?? "",
  date: po.date ?? po.poDate ?? po.po_date ?? po.poDateOrReceivedDate,
  amount: Number(po.amount ?? po.poAmount ?? po.po_amount ?? 0),
  currency: po.currency ?? "INR",
  varianceAmount: Number(po.varianceAmount ?? po.variance_amount ?? 0),
  variancePercentage: Number(po.variancePercentage ?? po.variance_percentage ?? 0),
  recommendation: po.recommendation ?? "",
});

const normalizeGrn = (grn = {}) => ({
  ...grn,
  id: grn.id ?? grn.grnId ?? grn.grn_id,
  grnNumber: grn.grnNumber ?? grn.grn_number ?? grn.number ?? "",
  amount: Number(grn.amount ?? grn.grnAmount ?? grn.grn_amount ?? 0),
  currency: grn.currency ?? "INR",
  receivedDate: grn.receivedDate ?? grn.received_date ?? grn.poDateOrReceivedDate,
});

const mergeById = (items, fallbackItem) => {
  const normalized = fallbackItem?.id ? [fallbackItem, ...items] : items;
  return normalized.filter(
    (item, index, list) => item?.id && list.findIndex((candidate) => candidate.id === item.id) === index,
  );
};

const emptyMatchForm = {
  invoiceId: "",
  invoiceIds: [],
  purchaseOrderId: "",
  grnId: "",
  matchType: "TWO_WAY",
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
    needsAttention: false,
    sortBy: "createdAt",
    sortDir: "desc",
  });
  const [searchInput, setSearchInput] = useState("");
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
  const { data: invoicesData = {}, isLoading: invoicesLoading } =
    useGetAvailableMatchingInvoicesQuery(
      { page: 0, size: 100 },
      { skip: !showMatchDialog },
    );
  const isEditMode = Boolean(editingMatching);
  const selectedInvoiceIds = isEditMode
    ? [matchForm.invoiceId].filter(Boolean)
    : (matchForm.invoiceIds?.length ? matchForm.invoiceIds : [matchForm.invoiceId].filter(Boolean));
  const firstSelectedInvoiceId = selectedInvoiceIds[0] || "";
  const { data: purchaseOrdersData = {}, isFetching: purchaseOrdersLoading } =
    useGetAvailablePurchaseOrdersQuery(firstSelectedInvoiceId, {
      skip: !showMatchDialog || !firstSelectedInvoiceId,
    });
  const { data: grnsData = {}, isFetching: grnsLoading } = useGetAvailableGrnsQuery(
    matchForm.purchaseOrderId,
    {
      skip:
        !showMatchDialog ||
        matchForm.matchType !== "THREE_WAY" ||
        !matchForm.purchaseOrderId,
    },
  );

  const [getInvoiceMatchingDetail] = useLazyGetInvoiceMatchingDetailQuery();
  const [performInvoiceMatch, { isLoading: performing }] = usePerformInvoiceMatchMutation();
  const [editInvoiceMatch, { isLoading: editing }] = useEditInvoiceMatchMutation();
  const [markInvoiceMatchException, { isLoading: markingException }] =
    useMarkInvoiceMatchExceptionMutation();

  const matchingGroups = getPageContent(listData).map(normalizeMatchingGroup);
  const invoices = mergeById(
    getPageContent(invoicesData).map(normalizeInvoice),
    editingMatching?.invoice ? normalizeInvoice(editingMatching.invoice) : null,
  );
  const purchaseOrders = mergeById(
    getPageContent(purchaseOrdersData).map(normalizePurchaseOrder),
    editingMatching?.purchaseOrder ? normalizePurchaseOrder(editingMatching.purchaseOrder) : null,
  );
  const grns = mergeById(
    getPageContent(grnsData).map(normalizeGrn),
    editingMatching?.grn ? normalizeGrn(editingMatching.grn) : null,
  );
  const detail = detailData ? normalizeMatching(detailData) : selectedMatching;
  const totalPages = Number(listData?.totalPages ?? 1) || 1;
  const totalElements = Number(listData?.totalElements ?? matchingGroups.length) || 0;
  const loading = summaryLoading || listLoading;
  const matchCostEstimate = useMeteredActionEstimate(
    CREDIT_ACTION_CODES.INVOICE_MATCHING,
    isEditMode ? 0 : Math.max(selectedInvoiceIds.length, 1),
  );
  const selectedInvoices = invoices.filter((invoice) => selectedInvoiceIds.includes(invoice.id));
  const selectedInvoice = selectedInvoices[0];
  const selectedPo = purchaseOrders.find((po) => po.id === matchForm.purchaseOrderId);
  const selectedGrn = grns.find((grn) => grn.id === matchForm.grnId);
  const availableMatchTypeOptions = canUseThreeWayMatching
    ? MATCH_TYPE_OPTIONS
    : MATCH_TYPE_OPTIONS.filter((option) => option.value !== "THREE_WAY");

  useEffect(() => {
    if (canUseThreeWayMatching) return;

    if (query.matchType === "THREE_WAY") {
      setQuery((current) => ({
        ...current,
        page: 0,
        matchType: "ALL",
      }));
    }
  }, [canUseThreeWayMatching, query.matchType]);

  useEffect(() => {
    if (canUseThreeWayMatching || matchForm.matchType !== "THREE_WAY") return;

    setMatchForm((current) => ({
      ...current,
      matchType: "TWO_WAY",
      grnId: "",
    }));
  }, [canUseThreeWayMatching, matchForm.matchType]);

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
      setMatchForm({
        invoiceId: detailRecord.invoice?.id ?? detailRecord.invoiceId ?? "",
        invoiceIds: [],
        purchaseOrderId: detailRecord.purchaseOrder?.id ?? detailRecord.purchaseOrderId ?? "",
        grnId: detailRecord.grn?.id ?? detailRecord.grnId ?? "",
        matchType: normalizeMatchType(detailRecord.matchType ?? match.matchType),
        remarks: "",
      });
      setShowMatchDialog(true);
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to load match details for edit"));
    }
  };

  const handleInvoiceChange = (invoiceId) => {
    setMatchForm((current) => ({
      ...current,
      invoiceId,
      invoiceIds: invoiceId ? [invoiceId] : [],
      purchaseOrderId: "",
      grnId: "",
    }));
  };

  const handleInvoiceToggle = (invoiceId, checked) => {
    setMatchForm((current) => {
      const currentIds = current.invoiceIds?.length ? current.invoiceIds : [current.invoiceId].filter(Boolean);
      const nextIds = checked
        ? [...new Set([...currentIds, invoiceId])]
        : currentIds.filter((id) => id !== invoiceId);

      return {
        ...current,
        invoiceId: nextIds[0] || "",
        invoiceIds: nextIds,
        purchaseOrderId: "",
        grnId: "",
      };
    });
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
    if (!guardAction(action)) return;
    if (selectedInvoiceIds.length === 0 || !matchForm.purchaseOrderId) {
      toast.error("Please select an invoice and purchase order");
      return;
    }
    if (!isEditMode && selectedInvoices.length > 1) {
      const vendorNames = new Set(selectedInvoices.map((invoice) => String(invoice.vendorName || "").trim().toUpperCase()));
      const currencies = new Set(selectedInvoices.map((invoice) => String(invoice.currency || "INR").trim().toUpperCase()));
      if (vendorNames.size > 1 || currencies.size > 1) {
        toast.error("Select invoices from the same vendor and currency for batch matching");
        return;
      }
    }
    if (matchForm.matchType === "THREE_WAY" && !matchForm.grnId) {
      toast.error("Please select a GRN for 3-way matching");
      return;
    }

    const body = {
      purchaseOrderId: matchForm.purchaseOrderId,
      grnId: matchForm.matchType === "THREE_WAY" ? matchForm.grnId : null,
      matchType: matchForm.matchType,
    };
    if (isEditMode || selectedInvoiceIds.length <= 1) {
      body.invoiceId = selectedInvoiceIds[0];
    } else {
      body.invoiceIds = selectedInvoiceIds;
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
    if (performing || editing) return "Saving match...";
    if (selectedInvoiceIds.length === 0) return "Select an invoice";
    if (!matchForm.purchaseOrderId) return "Select a purchase order";
    if (matchForm.matchType === "THREE_WAY" && !matchForm.grnId) return "Select a GRN";
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
          data-testid={`view-matching-${match.id}`}
        >
          <Eye className="h-4 w-4" />
        </Button>
        {canEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEditDialog(match)}
            data-testid={`edit-matching-${match.id}`}
          >
            <Edit className="h-4 w-4" />
          </Button>
        )}
        {canOpenException && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openExceptionDialog(match)}
            data-testid={`exception-matching-${match.id}`}
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
                  <Badge variant="outline">{group.matchType === "THREE_WAY" ? "3-Way" : "2-Way"}</Badge>
                );
                break;
              case "poAmount":
                value = formatCurrency(group.poAmount);
                break;
              case "matchedAmount":
                value = (
                  <div>
                    <div className="font-medium">{formatCurrency(group.cumulativeInvoiceAmount)}</div>
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
                  <div className="flex justify-end gap-1">
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
                className={header.cellClassName}
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
            value = formatCurrency(po.amount, po.currency);
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
    <div className="space-y-6" data-testid="invoice-matching-page">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Invoice Matching</h1>
          <p className="text-muted-foreground">2-way and 3-way invoice matching with POs and GRNs</p>
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4 lg:grid-cols-7">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{Number(summary.totalMatchings ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Matched</p>
            <p className="text-2xl font-bold text-green-600">{Number(summary.matched ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Partial</p>
            <p className="text-2xl font-bold text-yellow-600">{Number(summary.partialMatch ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Mismatch</p>
            <p className="text-2xl font-bold text-red-600">{Number(summary.mismatch ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">Resolved</p>
            <p className="text-2xl font-bold text-blue-600">{Number(summary.resolved ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">2-Way</p>
            <p className="text-2xl font-bold">{Number(summary.twoWayMatches ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">3-Way</p>
            <p className="text-2xl font-bold">{Number(summary.threeWayMatches ?? 0)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1 md:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search invoice, PO, or vendor..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") updateQuery({ search: searchInput.trim() });
            }}
            className="pl-10"
            data-testid="search-matching-input"
          />
        </div>
        <Button variant="outline" onClick={() => updateQuery({ search: searchInput.trim() })}>
          Search
        </Button>
        <Select value={query.status} onValueChange={(status) => updateQuery({ status })}>
          <SelectTrigger className="w-full md:w-48" data-testid="status-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={query.matchType} onValueChange={(matchType) => updateQuery({ matchType })}>
          <SelectTrigger className="w-full md:w-40">
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
        <Button
          variant={query.needsAttention ? "default" : "outline"}
          onClick={() => updateQuery({ needsAttention: !query.needsAttention })}
        >
          Needs Attention
        </Button>
      </div>

      <Card>
        <AppDataTable
          tableHeader={matchingTableHeader}
          tableData={matchingGroups}
          renderRow={renderMatchingRow}
          emptyMessage="No matching records found."
        />
      </Card>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
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
              <Label>{isEditMode ? "Select Invoice" : "Select Invoice(s)"}</Label>
              {isEditMode ? (
                <Select value={matchForm.invoiceId} onValueChange={handleInvoiceChange}>
                  <SelectTrigger data-testid="select-invoice">
                    <SelectValue placeholder={invoicesLoading ? "Loading invoices..." : "Select an invoice"} />
                  </SelectTrigger>
                  <SelectContent>
                    {invoices.map((invoice) => (
                      <SelectItem key={invoice.id} value={invoice.id}>
                        {invoice.invoiceNumber} - {invoice.vendorName} ({formatCurrency(invoice.remainingAmount, invoice.currency)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="max-h-64 overflow-y-auto rounded-md border bg-white">
                  {invoicesLoading ? (
                    <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading invoices...
                    </div>
                  ) : invoices.length === 0 ? (
                    <div className="px-3 py-4 text-sm text-muted-foreground">No available invoices found.</div>
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
                            onCheckedChange={(value) => handleInvoiceToggle(invoice.id, Boolean(value))}
                            data-testid={`select-invoice-${invoice.id}`}
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

            {selectedInvoices.length > 0 && (
              <Card className="bg-muted">
                <CardContent className="grid gap-4 pt-4 text-sm md:grid-cols-3">
                  <div>
                    <p className="text-muted-foreground">Selected Invoice(s)</p>
                    <p className="font-medium">{selectedInvoices.length}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Primary Vendor</p>
                    <p className="font-medium">{selectedInvoice?.vendorName || "-"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Remaining Amount</p>
                    <p className="font-medium">
                      {formatCurrency(
                        selectedInvoices.reduce((sum, invoice) => sum + Number(invoice.remainingAmount || 0), 0),
                        selectedInvoice?.currency || "INR",
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              <Label>Match Type</Label>
              {canUseThreeWayMatching ? (
                <Select
                  value={matchForm.matchType}
                  onValueChange={(matchType) =>
                    setMatchForm((current) => ({
                      ...current,
                      matchType,
                      grnId: matchType === "TWO_WAY" ? "" : current.grnId,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TWO_WAY">2-Way Matching</SelectItem>
                    <SelectItem value="THREE_WAY">3-Way Matching</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex min-h-10 items-center justify-between rounded-md border bg-muted/40 px-3 text-sm">
                  <span className="font-medium">2-Way Matching</span>
                  <Badge variant="outline">Default</Badge>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Select Purchase Order</Label>
              <Select
                value={matchForm.purchaseOrderId}
                onValueChange={handlePoChange}
                disabled={!matchForm.invoiceId || purchaseOrdersLoading}
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
                      {po.poNumber} - {formatCurrency(po.amount, po.currency)} ({po.recommendation || "VARIANCE"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPo && (
              <Card>
                <AppDataTable
                  tableHeader={selectedPoTableHeader}
                  tableData={[selectedPo]}
                  renderRow={renderSelectedPoRow}
                />
              </Card>
            )}

            {matchForm.matchType === "THREE_WAY" && (
              <div className="space-y-2">
                <Label>Select GRN</Label>
                <Select
                  value={matchForm.grnId}
                  onValueChange={(grnId) => setMatchForm((current) => ({ ...current, grnId }))}
                  disabled={!matchForm.purchaseOrderId || grnsLoading}
                >
                  <SelectTrigger data-testid="select-grn">
                    <SelectValue placeholder={grnsLoading ? "Loading GRNs..." : "Select a GRN"} />
                  </SelectTrigger>
                  <SelectContent>
                    {grns.map((grn) => (
                      <SelectItem key={grn.id} value={grn.id}>
                        {grn.grnNumber} - {formatCurrency(grn.amount, grn.currency)} ({formatDate(grn.receivedDate)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {matchForm.purchaseOrderId && !grnsLoading && grns.length === 0 && (
                  <p className="text-xs text-red-500">No GRNs are available for this purchase order.</p>
                )}
              </div>
            )}

            {selectedGrn && (
              <Card className="bg-muted">
                <CardContent className="grid gap-4 pt-4 text-sm md:grid-cols-3">
                  <div>
                    <p className="text-muted-foreground">GRN Number</p>
                    <p className="font-medium">{selectedGrn.grnNumber}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Amount</p>
                    <p className="font-medium">{formatCurrency(selectedGrn.amount, selectedGrn.currency)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Received</p>
                    <p className="font-medium">{formatDate(selectedGrn.receivedDate)}</p>
                  </div>
                </CardContent>
              </Card>
            )}

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
                <Badge variant="outline">{detail.matchType === "THREE_WAY" ? "3-Way Match" : "2-Way Match"}</Badge>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {renderDocumentCard("Invoice", FileText, detailData?.invoice)}
                {renderDocumentCard("Purchase Order", ShoppingCart, detailData?.purchaseOrder)}
                {detail.matchType === "THREE_WAY" && renderDocumentCard("GRN", Package, detailData?.grn)}
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
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Cumulative Checklist
              {selectedGroup?.poNumber ? (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {selectedGroup.poNumber}
                </span>
              ) : null}
            </DialogTitle>
          </DialogHeader>

          {selectedGroup ? (
            <MatchChecklistPanel
              scope="GROUP"
              groupId={selectedGroup.groupId || selectedGroup.matchGroupId || selectedGroup.poId || selectedGroup.id}
              group={selectedGroup}
            />
          ) : null}

          <DialogFooter>
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

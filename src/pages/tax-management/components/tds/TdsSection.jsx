import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { useGetInvoicesQuery } from "../../../../Services/apis/invoicesVendorsApi";
import {
  EMPTY_INVOICE_LIST_RESPONSE,
  getInvoiceListItems,
} from "../../../../Services/utils/payloadMappers";
import DatePicker from "../../../../components/common/DatePicker";
import {
  useCalculateTdsMutation,
  useGetTdsEntriesQuery,
  useGetTdsSectionsQuery,
  useGetTdsSummaryQuery,
  useLazyGetTdsEntriesExportQuery,
} from "../../../../Services/apis/taxApi";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../../components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../../components/ui/card";
import AppDataTable from "../../../../components/common/AppDataTable";
import { toast } from "sonner";
import {
  Calculator,
  CheckCircle,
  Clock,
  Download,
  IndianRupee,
  Loader2,
  Receipt,
} from "lucide-react";
import TdsCalculationDialog from "../TdsCalculationDialog";
import { useActionGuard } from "../../../../hooks/useActionGuard";
import { useCreditErrorHandler } from "../../../../contexts/CreditErrorContext";
import { TaxPagination } from "../TaxUi";
import { formatCurrency, formatDate as formatTaxDate } from "../../utils/taxFormatting";
import { InvoicePdfPreview } from "../../../invoices/components/InvoicePdfPreview";
import ViewDialog from "../../../invoices/components/ViewDialog";
import { getInvoiceFileUrl } from "../../../invoices/utils/invoicePreview";
import { normalizeInvoiceHistoryEntries } from "../../../invoices/utils/invoiceHistory";
import { getInvoiceStatusBadgeClass } from "../../../../utils/approvalWorkflow";
import {
  TdsAnalyticsPanel,
  TdsCalculatorPanel,
  TdsCsiPanel,
  TdsForm16aPanel,
  TdsFvuPanel,
  TdsOverviewPanels,
  TdsReportsPanel,
} from "./TdsReferencePanels";
import {
  DEFAULT_TDS_FORM,
  getTdsEntryFieldValue,
  renderTdsEntryRow,
  renderTdsSectionRow,
  TDS_ENTRIES_TABLE_HEADER,
  TDS_SECTIONS_TABLE_HEADER,
} from "./tdsTableHelpers";

const TDS_SUB_TABS = [
  { value: "overview", label: "Overview" },
  { value: "calculator", label: "Calculator" },
  { value: "analytics", label: "Analytics" },
  { value: "reports", label: "Reports" },
  { value: "form16a", label: "Form 16A" },
  { value: "fvu", label: "FVU" },
  { value: "csi", label: "CSI" },
];

const getTdsSummaryAmount = (summary = {}, snakeKey, camelKey) =>
  summary?.[snakeKey] ?? summary?.[camelKey] ?? 0;

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? "";
const TDS_ENTRIES_PAGE_SIZE = 25;
const DATE_RANGE_OPTIONS = [
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "this_quarter", label: "This Quarter" },
  { value: "last_quarter", label: "Last Quarter" },
  { value: "last_6_months", label: "Last 6 Months" },
  { value: "this_year", label: "This Year" },
  { value: "custom", label: "Custom Date Selection" },
];

const toDateInputValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getCurrentFinancialYearRange = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const fyStartYear = month >= 3 ? year : year - 1;

  return {
    fromDate: `${fyStartYear}-04-01`,
    toDate: `${fyStartYear + 1}-03-31`,
  };
};

const getDateRangeForType = (rangeType) => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  switch (rangeType) {
    case "this_month":
      return {
        fromDate: toDateInputValue(new Date(year, month, 1)),
        toDate: toDateInputValue(new Date(year, month + 1, 0)),
      };
    case "last_month":
      return {
        fromDate: toDateInputValue(new Date(year, month - 1, 1)),
        toDate: toDateInputValue(new Date(year, month, 0)),
      };
    case "this_quarter": {
      const quarterStartMonth = Math.floor(month / 3) * 3;
      return {
        fromDate: toDateInputValue(new Date(year, quarterStartMonth, 1)),
        toDate: toDateInputValue(new Date(year, quarterStartMonth + 3, 0)),
      };
    }
    case "last_quarter": {
      const currentQuarterStartMonth = Math.floor(month / 3) * 3;
      return {
        fromDate: toDateInputValue(new Date(year, currentQuarterStartMonth - 3, 1)),
        toDate: toDateInputValue(new Date(year, currentQuarterStartMonth, 0)),
      };
    }
    case "last_6_months":
      return {
        fromDate: toDateInputValue(new Date(year, month - 5, 1)),
        toDate: toDateInputValue(new Date(year, month + 1, 0)),
      };
    case "this_year":
    default:
      return getCurrentFinancialYearRange();
  }
};

const DEFAULT_TDS_FILTERS = {
  search: "",
};

const TDS_SORT_OPTIONS = [
  { value: "invoiceDate", label: "Invoice Date" },
  { value: "vendorName", label: "Vendor" },
  { value: "invoiceNo", label: "Invoice No." },
  { value: "taxableAmount", label: "Taxable Amount" },
  { value: "tdsAmount", label: "TDS Amount" },
  { value: "tdsRate", label: "TDS Rate" },
];

const SORT_FIELD_MAP = {
  invoiceDate: "invoice_date",
  vendorName: "vendor_name",
  invoiceNo: "invoice_number",
  taxableAmount: "taxable_amount",
  tdsAmount: "tds_amount",
  tdsRate: "tds_rate",
};

const normalizeSearchValue = (value) => String(value ?? "").trim().toLowerCase();

const toComparableDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getFilterableText = (entry = {}) =>
  [
    getTdsEntryFieldValue(entry, "vendor_name"),
    getTdsEntryFieldValue(entry, "invoice_number"),
    getTdsEntryFieldValue(entry, "pan"),
    getTdsEntryFieldValue(entry, "voucher_type"),
    getTdsEntryFieldValue(entry, "narration"),
    getTdsEntryFieldValue(entry, "expense_type"),
    getTdsEntryFieldValue(entry, "tds_section"),
  ]
    .map((value) => String(value ?? ""))
    .join(" ")
    .toLowerCase();

const getSortValue = (entry, sortBy) => {
  const field = SORT_FIELD_MAP[sortBy] ?? "invoice_date";
  const value = getTdsEntryFieldValue(entry, field);
  if (["taxableAmount", "tdsAmount", "tdsRate"].includes(sortBy)) {
    return Number(value) || 0;
  }
  if (sortBy === "invoiceDate") {
    return toComparableDate(value)?.getTime() ?? 0;
  }
  return normalizeSearchValue(value);
};

const normalizeDownloadUrl = (url) => {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  const baseUrl = BACKEND_URL || window.location.origin;
  return new URL(url, baseUrl).toString();
};

const TdsSection = forwardRef(({ enabled = true, onOpenCertificates }, ref) => {
  const { guardAction, canPerformAction } = useActionGuard();
  const { handleCreditError } = useCreditErrorHandler();
  const [tdsSubTab, setTdsSubTab] = useState("overview");
  const [showTdsCalcDialog, setShowTdsCalcDialog] = useState(false);
  const [selectedTdsInvoice, setSelectedTdsInvoice] = useState(null);
  const [tdsInvoiceViewTab, setTdsInvoiceViewTab] = useState("details");
  const [tdsInvoicePdfZoom, setTdsInvoicePdfZoom] = useState(100);
  const [tdsInvoicePreviewError, setTdsInvoicePreviewError] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [tdsForm, setTdsForm] = useState(DEFAULT_TDS_FORM);
  const [tdsDateRangeType, setTdsDateRangeType] = useState("this_year");
  const [tdsDateRange, setTdsDateRange] = useState(() => getDateRangeForType("this_year"));
  const [tdsFilters, setTdsFilters] = useState(DEFAULT_TDS_FILTERS);
  const [tdsSort, setTdsSort] = useState({
    sortBy: "invoiceDate",
    sortDirection: "desc",
  });
  const [tdsPageOffset, setTdsPageOffset] = useState(0);
  const [calculateTds] = useCalculateTdsMutation();
  const [exportTdsEntries, { isFetching: exportingTdsEntries }] =
    useLazyGetTdsEntriesExportQuery();

  const overviewActive = enabled && tdsSubTab === "overview";
  const calculatorActive = enabled && tdsSubTab === "calculator";
  const dialogDataActive = enabled && showTdsCalcDialog;
  const tdsEntriesQueryParams = useMemo(
    () => ({
      rangeType: tdsDateRangeType,
      fromDate: tdsDateRangeType === "custom" ? tdsDateRange.fromDate || undefined : undefined,
      toDate: tdsDateRangeType === "custom" ? tdsDateRange.toDate || undefined : undefined,
      limit: TDS_ENTRIES_PAGE_SIZE,
      offset: tdsPageOffset,
      search: tdsFilters.search || undefined,
      sortBy: tdsSort.sortBy,
      sortDirection: tdsSort.sortDirection,
    }),
    [tdsDateRange, tdsDateRangeType, tdsFilters, tdsPageOffset, tdsSort],
  );

  const {
    data: tdsEntriesData = [],
    isLoading: tdsEntriesLoading,
    isFetching: tdsEntriesFetching,
    refetch: refetchTdsEntries,
  } = useGetTdsEntriesQuery(tdsEntriesQueryParams, { skip: !overviewActive });
  const {
    data: tdsSummary = null,
    isLoading: tdsSummaryLoading,
    isFetching: tdsSummaryFetching,
    refetch: refetchTdsSummary,
  } = useGetTdsSummaryQuery(undefined, { skip: !overviewActive });
  const {
    data: tdsSectionsData = [],
    isLoading: tdsSectionsLoading,
    isFetching: tdsSectionsFetching,
    refetch: refetchTdsSections,
  } = useGetTdsSectionsQuery(undefined, {
    skip: !calculatorActive && !dialogDataActive,
  });
  const {
    data: invoicesListData = EMPTY_INVOICE_LIST_RESPONSE,
    isLoading: invoicesLoading,
    isFetching: invoicesFetching,
    refetch: refetchInvoices,
  } = useGetInvoicesQuery(undefined, { skip: !dialogDataActive });

  const rawTdsEntries = Array.isArray(tdsEntriesData) ? tdsEntriesData : [];
  const tdsEntriesMeta = {
    total: Number(tdsEntriesData?.total ?? rawTdsEntries.length) || 0,
    limit: Number(tdsEntriesData?.limit ?? TDS_ENTRIES_PAGE_SIZE) || TDS_ENTRIES_PAGE_SIZE,
    offset: Number(tdsEntriesData?.offset ?? tdsPageOffset) || 0,
  };
  const backendPaginated = tdsEntriesMeta.total > rawTdsEntries.length;
  const tdsEntriesFiltered = useMemo(() => {
    const fromDate = toComparableDate(tdsDateRange.fromDate);
    const toDate = toComparableDate(tdsDateRange.toDate);
    if (toDate) toDate.setHours(23, 59, 59, 999);
    const search = normalizeSearchValue(tdsFilters.search);

    return rawTdsEntries
      .filter((entry) => {
        const invoiceDate = toComparableDate(getTdsEntryFieldValue(entry, "invoice_date"));
        if (fromDate && invoiceDate && invoiceDate < fromDate) return false;
        if (toDate && invoiceDate && invoiceDate > toDate) return false;
        if (search && !getFilterableText(entry).includes(search)) return false;
        return true;
      })
      .sort((a, b) => {
        const direction = tdsSort.sortDirection === "asc" ? 1 : -1;
        const first = getSortValue(a, tdsSort.sortBy);
        const second = getSortValue(b, tdsSort.sortBy);
        if (first > second) return direction;
        if (first < second) return -direction;
        return 0;
      });
  }, [rawTdsEntries, tdsDateRange, tdsFilters, tdsSort]);
  const tdsEntries = backendPaginated
    ? tdsEntriesFiltered
    : tdsEntriesFiltered.slice(tdsPageOffset, tdsPageOffset + TDS_ENTRIES_PAGE_SIZE);
  const tdsEntriesTotal = backendPaginated ? tdsEntriesMeta.total : tdsEntriesFiltered.length;
  const tdsCurrentPage = Math.floor(tdsPageOffset / TDS_ENTRIES_PAGE_SIZE) + 1;
  const tdsTotalPages = Math.max(1, Math.ceil(tdsEntriesTotal / TDS_ENTRIES_PAGE_SIZE));
  const tdsStartRecord = tdsEntriesTotal === 0 ? 0 : tdsPageOffset + 1;
  const tdsEndRecord = tdsEntriesTotal === 0
    ? 0
    : Math.min(tdsPageOffset + tdsEntries.length, tdsEntriesTotal);
  const tdsSections = Array.isArray(tdsSectionsData) ? tdsSectionsData : [];
  const invoices = getInvoiceListItems(invoicesListData);
  const canManageTds = canPerformAction("tax.calculateTds") && enabled;
  const loading = overviewActive && (tdsEntriesLoading || tdsSummaryLoading);
  const isFetching =
    tdsEntriesFetching ||
    tdsSummaryFetching ||
    tdsSectionsFetching ||
    invoicesFetching;

  useEffect(() => {
    setTdsPageOffset(0);
  }, [
    tdsDateRange.fromDate,
    tdsDateRange.toDate,
    tdsDateRangeType,
    tdsFilters.search,
    tdsSort.sortBy,
    tdsSort.sortDirection,
  ]);

  const refetch = async () => {
    const tasks = [];
    if (overviewActive) {
      tasks.push(refetchTdsEntries(), refetchTdsSummary());
    }
    if (calculatorActive) {
      tasks.push(refetchTdsSections());
    }
    if (dialogDataActive) {
      tasks.push(refetchInvoices());
    }
    await Promise.all(tasks);
  };

  useImperativeHandle(ref, () => ({ refetch, isFetching }));

  const handleCalculateTDS = async () => {
    if (!guardAction("tax.calculateTds")) return;
    if (
      !tdsForm.invoice_id ||
      !tdsForm.section_code ||
      tdsForm.base_amount <= 0
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    setCalculating(true);
    try {
      const data = await calculateTds(tdsForm).unwrap();
      toast.success(
        `TDS calculated: ${formatCurrency(data?.entry?.total_tds)}`,
      );
      setShowTdsCalcDialog(false);
      setTdsForm(DEFAULT_TDS_FORM);
      if (overviewActive) {
        await Promise.all([refetchTdsEntries(), refetchTdsSummary()]);
      }
    } catch (error) {
      if (handleCreditError(error)) return;
      toast.error(error?.data?.detail || "Failed to calculate TDS");
    } finally {
      setCalculating(false);
    }
  };

  const handleViewTdsInvoice = (invoice) => {
    if (!invoice?.id) {
      toast.error("Invoice details are unavailable for this TDS entry");
      return;
    }
    setTdsInvoicePreviewError(false);
    setTdsInvoicePdfZoom(100);
    setTdsInvoiceViewTab("details");
    setSelectedTdsInvoice(invoice);
  };

  const updateTdsFilter = (key, value) => {
    setTdsFilters((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleTdsDateRangeTypeChange = (value) => {
    setTdsDateRangeType(value);
    if (value !== "custom") {
      setTdsDateRange(getDateRangeForType(value));
    }
  };

  const resetTdsFilters = () => {
    setTdsDateRangeType("this_year");
    setTdsDateRange(getDateRangeForType("this_year"));
    setTdsFilters(DEFAULT_TDS_FILTERS);
    setTdsSort({
      sortBy: "invoiceDate",
      sortDirection: "desc",
    });
  };

  const renderTdsInvoicePreview = (props = {}) => (
    <InvoicePdfPreview
      {...props}
      setPdfZoom={setTdsInvoicePdfZoom}
      getInvoiceFileUrl={getInvoiceFileUrl}
    />
  );

  const handleDownloadTdsEntries = async () => {
    try {
      const data = await exportTdsEntries({
        ...tdsEntriesQueryParams,
        limit: undefined,
        offset: undefined,
        format: "xlsx",
        includeInvoiceDetails: true,
      }).unwrap();

      const downloadUrl = normalizeDownloadUrl(data?.downloadUrl);
      if (!downloadUrl) {
        toast.error("Download URL was not returned for TDS entries export");
        return;
      }

      window.open(downloadUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(
        error?.data?.message ||
          error?.data?.detail ||
          "Failed to export TDS entries",
      );
    }
  };

  const tdsInvoiceHistory = normalizeInvoiceHistoryEntries(
    selectedTdsInvoice?.approvalRecords ??
      selectedTdsInvoice?.approval_records ??
      [],
  );

  if (!enabled) return null;

  if (loading) {
    return (
      <TabsContent value="tds" className="space-y-6">
        <div className="min-h-[40vh] flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="mt-3 text-sm text-muted-foreground">
              Loading TDS data...
            </p>
          </div>
        </div>
      </TabsContent>
    );
  }

  return (
    <TabsContent value="tds" className="space-y-6">
      <Tabs
        value={tdsSubTab}
        onValueChange={setTdsSubTab}
        className="space-y-5"
      >
        {/* <TabsList className="grid w-full grid-cols-2 md:grid-cols-7">
          {TDS_SUB_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList> */}

        {tdsSubTab === "overview" ? (
          <div className="space-y-6">
            {/* {tdsSummary && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Base Amount</p>
                        <p className="text-xl font-bold">
                          {formatCurrency(
                            getTdsSummaryAmount(tdsSummary, 'total_base_amount', 'totalBaseAmount'),
                          )}
                        </p>
                      </div>
                      <IndianRupee className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">TDS Deducted</p>
                        <p className="text-xl font-bold">
                          {formatCurrency(
                            getTdsSummaryAmount(tdsSummary, 'total_tds_deducted', 'totalTdsDeducted'),
                          )}
                        </p>
                      </div>
                      <Receipt className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">TDS Deposited</p>
                        <p className="text-xl font-bold">
                          {formatCurrency(
                            getTdsSummaryAmount(tdsSummary, 'total_tds_deposited', 'totalTdsDeposited'),
                          )}
                        </p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Pending Deposit</p>
                        <p className="text-xl font-bold">
                          {formatCurrency(
                            getTdsSummaryAmount(tdsSummary, 'pending_deposit', 'pendingDeposit'),
                          )}
                        </p>
                      </div>
                      <Clock className="h-8 w-8 text-yellow-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <TdsOverviewPanels />

            <div className="flex gap-2">
             
              <Button onClick={() => setShowTdsCalcDialog(true)} data-testid="calc-tds-btn" disabled={!canManageTds}>
                <Calculator className="h-4 w-4 mr-2" />
                Calculate TDS
              </Button>
            </div> */}

            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <CardTitle>TDS Entries</CardTitle>
                    <CardDescription>
                      TDS deductions for {formatTaxDate(tdsDateRange.fromDate)} to{" "}
                      {formatTaxDate(tdsDateRange.toDate)}
                    </CardDescription>{" "}
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleDownloadTdsEntries}
                    data-testid="download-tds-entries-btn"
                    disabled={exportingTdsEntries}
                  >
                    {exportingTdsEntries ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Download TDS Excel
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border bg-muted/20 p-4">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.2fr_1.4fr_1.4fr_auto]">
                    <div className="space-y-1.5">
                      <Label>Date range</Label>
                      <Select
                        value={tdsDateRangeType}
                        onValueChange={handleTdsDateRangeTypeChange}
                      >
                        <SelectTrigger data-testid="tds-entries-date-range">
                          <SelectValue placeholder="Date range" />
                        </SelectTrigger>
                        <SelectContent>
                          {DATE_RANGE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="tds-search">Search</Label>
                      <Input
                        id="tds-search"
                        value={tdsFilters.search}
                        onChange={(event) => updateTdsFilter("search", event.target.value)}
                        placeholder="Vendor, invoice, PAN, section..."
                        data-testid="tds-entries-search"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Sort</Label>
                      <div className="grid grid-cols-[1fr_112px] gap-2">
                        <Select
                          value={tdsSort.sortBy}
                          onValueChange={(value) =>
                            setTdsSort((current) => ({ ...current, sortBy: value }))
                          }
                        >
                          <SelectTrigger data-testid="tds-entries-sort-by">
                            <SelectValue placeholder="Sort by" />
                          </SelectTrigger>
                          <SelectContent>
                            {TDS_SORT_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={tdsSort.sortDirection}
                          onValueChange={(value) =>
                            setTdsSort((current) => ({ ...current, sortDirection: value }))
                          }
                        >
                          <SelectTrigger data-testid="tds-entries-sort-direction">
                            <SelectValue placeholder="Order" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="asc">Asc</SelectItem>
                            <SelectItem value="desc">Desc</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={resetTdsFilters}
                        data-testid="tds-entries-reset-filters"
                        className="w-full"
                      >
                        Reset
                      </Button>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Showing entries from {formatTaxDate(tdsDateRange.fromDate)} to{" "}
                    {formatTaxDate(tdsDateRange.toDate)}
                  </p>
                  {tdsDateRangeType === "custom" ? (
                    <div className="mt-3 grid gap-3 md:grid-cols-2 xl:max-w-xl">
                      <div className="space-y-1.5">
                        <Label htmlFor="tds-from-date">From date</Label>
                        <DatePicker
                          value={tdsDateRange.fromDate}
                          maxDate={tdsDateRange.toDate}
                          onChange={(value) =>
                            setTdsDateRange((current) => ({
                              ...current,
                              fromDate: value,
                            }))
                          }
                          placeholder="Select from date"
                          buttonClassName="bg-background"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="tds-to-date">To date</Label>
                        <DatePicker
                          value={tdsDateRange.toDate}
                          minDate={tdsDateRange.fromDate}
                          onChange={(value) =>
                            setTdsDateRange((current) => ({
                              ...current,
                              toDate: value,
                            }))
                          }
                          placeholder="Select to date"
                          buttonClassName="bg-background"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>

                <AppDataTable
                  tableHeader={TDS_ENTRIES_TABLE_HEADER}
                  tableData={tdsEntries}
                  renderRow={(entry, rowIndex, headers) =>
                    renderTdsEntryRow(entry, rowIndex, headers, {
                      offset: tdsPageOffset,
                      onViewInvoice: handleViewTdsInvoice,
                    })
                  }
                  isLoading={tdsEntriesLoading || tdsEntriesFetching}
                  tableContainerClassName="max-h-[560px]"
                  bordered
                  emptyMessage="No TDS entries found. Entries appear after approved invoices with TDS deduction."
                />
                <div className="flex flex-col gap-3 border-t pt-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    Showing {tdsStartRecord}-{tdsEndRecord} of {tdsEntriesTotal} entries
                  </span>
                  <TaxPagination
                    page={tdsCurrentPage}
                    totalPages={tdsTotalPages}
                    loading={tdsEntriesFetching}
                    onPrevious={() =>
                      setTdsPageOffset((current) =>
                        Math.max(current - TDS_ENTRIES_PAGE_SIZE, 0),
                      )
                    }
                    onNext={() =>
                      setTdsPageOffset((current) =>
                        Math.min(
                          current + TDS_ENTRIES_PAGE_SIZE,
                          Math.max((tdsTotalPages - 1) * TDS_ENTRIES_PAGE_SIZE, 0),
                        ),
                      )
                    }
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        {tdsSubTab === "calculator" ? (
          <div className="space-y-6">
            <TdsCalculatorPanel
              onCalculate={() => setShowTdsCalcDialog(true)}
              disabled={!canManageTds}
            />
            <Card>
              <CardHeader>
                <CardTitle>TDS Sections Reference</CardTitle>
                <CardDescription>
                  Applicable TDS rates by section from API.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {tdsSectionsLoading ? (
                  <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading TDS sections…
                  </div>
                ) : (
                  <AppDataTable
                    tableHeader={TDS_SECTIONS_TABLE_HEADER}
                    tableData={tdsSections}
                    renderRow={renderTdsSectionRow}
                    bordered
                    emptyMessage="No TDS sections found."
                  />
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}

        {tdsSubTab === "analytics" ? <TdsAnalyticsPanel /> : null}
        {tdsSubTab === "reports" ? <TdsReportsPanel /> : null}
        {tdsSubTab === "form16a" ? (
          <TdsForm16aPanel onOpenCertificates={onOpenCertificates} />
        ) : null}
        {tdsSubTab === "fvu" ? <TdsFvuPanel /> : null}
        {tdsSubTab === "csi" ? <TdsCsiPanel /> : null}
      </Tabs>

      <TdsCalculationDialog
        open={showTdsCalcDialog}
        setOpen={setShowTdsCalcDialog}
        tdsForm={tdsForm}
        setTdsForm={setTdsForm}
        invoices={invoices}
        tdsSections={tdsSections}
        formatCurrency={formatCurrency}
        calculating={calculating}
        handleCalculateTDS={handleCalculateTDS}
        canManageTax={canManageTds}
      />

      <ViewDialog
        viewDialogOpen={Boolean(selectedTdsInvoice)}
        setViewDialogOpen={(open) => {
          if (!open) setSelectedTdsInvoice(null);
        }}
        selectedInvoice={selectedTdsInvoice}
        renderPdfPreview={renderTdsInvoicePreview}
        pdfZoom={tdsInvoicePdfZoom}
        viewPreviewError={tdsInvoicePreviewError}
        setViewPreviewError={setTdsInvoicePreviewError}
        getStatusBadgeClass={getInvoiceStatusBadgeClass}
        viewTab={tdsInvoiceViewTab}
        setViewTab={setTdsInvoiceViewTab}
        invoiceHistory={tdsInvoiceHistory}
        loadingHistory={false}
        canEdit={() => false}
        handleEditInvoice={() => {}}
        canCancel={() => false}
        handleCancelInvoice={() => {}}
        showCategoryField
        isCategoryFeatureEnabled
        showCampaignField
        isCampaignFeatureEnabled
        showRefNoField
      />
    </TabsContent>
  );
});

TdsSection.displayName = "TdsSection";

export default TdsSection;

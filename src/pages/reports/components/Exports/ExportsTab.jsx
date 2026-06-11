import React, { useMemo, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  CreditCard,
  Download,
  FileSpreadsheet,
  FileText,
  LineChart,
  Search,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import AppDataTable from "../../../../components/common/AppDataTable";
import { Badge } from "../../../../components/ui/badge";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent } from "../../../../components/ui/card";
import { Checkbox } from "../../../../components/ui/checkbox";
import { Input } from "../../../../components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../../../components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../components/ui/select";
import {
  useGenerateReportExportMutation,
  useGetReportExportsQuery,
  useGetReportExportStatusesQuery,
  useGetReportExportTypesQuery,
  useGetReportExportVendorsQuery,
  useLazyDownloadReportExportQuery,
} from "../../../../Services/apis/reportExportsApi";

const DEFAULT_REPORT_TYPES = [
  {
    id: "invoice-register",
    name: "Invoice Report",
    description:
      "Complete list of invoices including vendor details, dates, amounts, and statuses.",
    metrics: "Invoices",
    columns: "Invoice Number, Vendor, Invoice Date, Due Date, Amount, Status",
    icon: FileText,
  },
  {
    id: "payment-register",
    name: "Payment Report",
    description: "Track completed, pending, and failed payments.",
    metrics: "Payments",
    columns:
      "Payment Reference, Vendor, Amount Paid, Payment Date, Payment Method",
    icon: CreditCard,
  },
  {
    id: "invoice-item",
    name: "Invoice Item Report",
    description: "Detailed invoice line-item breakdown for spend analysis.",
    metrics: "Line Items",
    columns:
      "Invoice Number, Item Description, Quantity, Unit Price, Tax, Total Amount",
    icon: LineChart,
  },

  {
    id: "vendor-spend",
    name: "Vendor Spend Report",
    description: "Analyze total spend by vendor for the selected period.",
    metrics: "Vendors",
    columns: "Vendor Name, Invoice Count, Total Spend, Average Invoice Value",
    icon: Users,
  },
  {
    id: "approval-audit",
    name: "Approvals Report",
    description:
      "Track invoice approvals, approvers, remarks, and decision history.",
    metrics: "Approvals",
    columns: "Invoice Number, Approver, Approval Level, Status, Comments, Date",
    icon: CheckCircle2,
  },
];

const DATE_RANGE_OPTIONS = [
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "this_quarter", label: "This Quarter" },
  { value: "last_quarter", label: "Last Quarter" },
  { value: "last_6_months", label: "Last 6 Months" },
  { value: "this_year", label: "This Year" },
  { value: "custom", label: "Custom Date Selection" },
];

const REPORT_METRIC_LABELS = {
  "invoice-register": "Invoices",
  "payment-register": "Payments",
  "invoice-item": "Line Items",
  "vendor-spend": "Vendors",
  "approval-audit": "Approvals",
};

const firstFiniteNumber = (...values) => {
  for (const value of values) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
  }
  return null;
};

const getReportMetrics = (report = {}, reportId = "") => {
  const explicitMetric =
    report.metrics ??
    report.metric ??
    report.metricLabel ??
    report.metric_label;
  const count = firstFiniteNumber(
    report.metricsCount,
    report.metrics_count,
    report.metricCount,
    report.metric_count,
    report.recordCount,
    report.record_count,
    report.totalCount,
    report.total_count,
    report.invoiceCount,
    report.invoice_count,
    report.paymentCount,
    report.payment_count,
    report.vendorCount,
    report.vendor_count,
    report.count,
  );

  if (count !== null) {
    const label = explicitMetric || REPORT_METRIC_LABELS[reportId] || "Records";
    return `${count} ${label}`;
  }

  return explicitMetric || "";
};

const normalizeReportType = (report = {}) => {
  const id = report.id ?? report.reportType ?? report.type ?? report.key;
  return {
    ...report,
    id,
    name: report.name ?? report.title ?? report.reportName,
    description: report.description ?? "",
    metrics: getReportMetrics(report, id),
    columns: report.columns ?? report.dataPoints ?? report.fields ?? "",
    lastGenerated:
      report.lastGenerated ?? report.last_generated ?? report.generatedOn,
  };
};

const normalizeExportRow = (row = {}, index) => ({
  ...row,
  id: row.id ?? row.exportId ?? row.export_id ?? row.reportId ?? index,
  reportName: row.reportName ?? row.report_name ?? row.name ?? row.title ?? "-",
  generatedBy:
    row.generatedBy ??
    row.generated_by ??
    row.createdByName ??
    row.created_by_name ??
    "-",
  generatedOn:
    row.generatedOn ??
    row.generated_on ??
    row.createdAt ??
    row.created_at ??
    "-",
  format: row.format ?? row.fileFormat ?? row.file_format ?? "-",
  status: String(row.status ?? "completed").toLowerCase(),
  downloadUrl:
    row.downloadUrl ??
    row.download_url ??
    row.url ??
    row.fileUrl ??
    row.file_url,
});

const formatGeneratedOn = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
};

const getStatusClass = (status) => {
  if (status === "completed" || status === "success")
    return "border-green-200 bg-green-50 text-green-700";
  if (status === "processing" || status === "pending")
    return "border-blue-200 bg-blue-50 text-blue-700";
  if (status === "failed" || status === "error")
    return "border-red-200 bg-red-50 text-red-700";
  return "border-gray-200 bg-gray-50 text-gray-700";
};

const getStatusLabel = (status) =>
  String(status || "-")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const triggerDownload = (downloadUrl, filename = "report-export") => {
  if (!downloadUrl) return false;
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = filename;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  link.remove();
  return true;
};

const buildExportPayload = ({
  reportType,
  reportTypes,
  format,
  dateRange,
  customFrom,
  customTo,
  selectedStatuses,
  selectedCurrencies,
  selectedVendorIds,
  allReports = false,
}) => ({
  reportType: allReports ? "all" : reportType,
  ...(allReports ? { reportTypes } : {}),
  format,
  ...(allReports ? { archiveFormat: "zip" } : {}),
  dateRange,
  ...(dateRange === "custom" ? { fromDate: customFrom, toDate: customTo } : {}),
  statuses: selectedStatuses,
  currencies: selectedCurrencies,
  vendorIds: selectedVendorIds,
});

const getMultiSelectLabel = (placeholder, options, selected) => {
  if (selected.length === 0) return placeholder;
  const selectedOptions = options.filter((option) =>
    selected.includes(option.value),
  );
  if (selectedOptions.length === 0) return placeholder;
  if (selectedOptions.length === 1) return selectedOptions[0].label;
  return `${selectedOptions[0].label} +${selectedOptions.length - 1}`;
};

const MultiSelectDropdown = ({
  label,
  placeholder,
  options,
  selected,
  onChange,
  icon: Icon,
  disabled = false,
  searchable = false,
  searchPlaceholder = "Search...",
}) => {
  const [query, setQuery] = useState("");
  const filteredOptions =
    searchable && query.trim()
      ? options.filter((option) =>
          option.label.toLowerCase().includes(query.trim().toLowerCase()),
        )
      : options;

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <Popover onOpenChange={(open) => !open && setQuery("")}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full justify-start font-normal"
            disabled={disabled}
          >
            {Icon && <Icon className="mr-2 h-4 w-4 text-muted-foreground" />}
            <span className="truncate">
              {getMultiSelectLabel(placeholder, options, selected)}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="z-[120] w-[var(--radix-popover-trigger-width)] p-2"
          align="start"
        >
          {searchable && (
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                className="h-8 pl-8 text-sm"
              />
            </div>
          )}
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <p className="px-2 py-2 text-xs text-muted-foreground">
                No options available
              </p>
            ) : (
              filteredOptions.map((option) => {
                const checked = selected.includes(option.value);
                return (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() =>
                        onChange(
                          checked
                            ? selected.filter((item) => item !== option.value)
                            : [...selected, option.value],
                        )
                      }
                    />
                    <span className="truncate">{option.label}</span>
                  </label>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

const toOption = (value) => ({ value, label: value });

const normalizeFilterOption = (option = {}) => {
  if (typeof option === "string") return toOption(option);
  const value =
    option.value ??
    option.id ??
    option.key ??
    option.code ??
    option.status ??
    option.name;
  const label =
    option.label ??
    option.name ??
    option.title ??
    option.statusLabel ??
    option.status ??
    value;
  return value ? { value: String(value), label: String(label) } : null;
};

const ExportsTab = ({ currencies = [] }) => {
  const [dateRange, setDateRange] = useState("this_month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [format, setFormat] = useState("excel");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVendorIds, setSelectedVendorIds] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [selectedCurrencies, setSelectedCurrencies] = useState([]);
  const [expandedId, setExpandedId] = useState("");
  const searchQuery = searchTerm.trim();

  const { data: vendors = [], isFetching: vendorsFetching } =
    useGetReportExportVendorsQuery();
  const { data: exportStatuses = [], isFetching: statusesFetching } =
    useGetReportExportStatusesQuery();
  const { data: apiReportTypes = [], isFetching: typesFetching } =
    useGetReportExportTypesQuery(searchQuery ? { search: searchQuery } : {});
  const {
    data: exportRows = [],
    isFetching: exportsFetching,
    refetch,
  } = useGetReportExportsQuery(searchQuery ? { search: searchQuery } : {});
  const [generateReportExport, { isLoading: generating }] =
    useGenerateReportExportMutation();
  const [downloadReportExport, { isFetching: downloading }] =
    useLazyDownloadReportExportQuery();

  const reportTypes = useMemo(() => {
    const source =
      apiReportTypes.length > 0 ? apiReportTypes : DEFAULT_REPORT_TYPES;
    return source
      .map(normalizeReportType)
      .filter((report) => report.id && report.name);
  }, [apiReportTypes]);

  const normalizedExports = useMemo(
    () => exportRows.map(normalizeExportRow),
    [exportRows],
  );

  const currencyOptions = useMemo(
    () =>
      (currencies.length > 0 ? currencies : ["INR", "USD", "EUR"])
        .map((currency) =>
          String(currency?.code ?? currency?.value ?? currency).toUpperCase(),
        )
        .filter((currency) => currency && currency !== "ALL")
        .map(toOption),
    [currencies],
  );
  const statusOptions = useMemo(
    () => exportStatuses.map(normalizeFilterOption).filter(Boolean),
    [exportStatuses],
  );
  const vendorOptions = useMemo(
    () =>
      vendors
        .map((vendor) =>
          normalizeFilterOption({
            value: vendor?.id ?? vendor?.vendorId ?? vendor?.vendor_id,
            label: vendor?.name ?? vendor?.vendorName ?? vendor?.vendor_name,
          }),
        )
        .filter(Boolean),
    [vendors],
  );

  const handleGenerate = async (
    reportType,
    {
      refreshExports = true,
      allReports = false,
      reportTypes: selectedReportTypes = [],
    } = {},
  ) => {
    if (dateRange === "custom" && (!customFrom || !customTo)) {
      toast.error("Please select custom from and to dates");
      return;
    }

    try {
      const response = await generateReportExport(
        buildExportPayload({
          reportType,
          reportTypes: selectedReportTypes,
          format,
          dateRange,
          customFrom,
          customTo,
          selectedStatuses,
          selectedCurrencies,
          selectedVendorIds,
          allReports,
        }),
      ).unwrap();
      toast.success(
        allReports
          ? "All reports ZIP generation started"
          : "Report generation started",
      );
      if (response?.downloadUrl) {
        triggerDownload(
          response.downloadUrl,
          allReports
            ? "all-reports.zip"
            : `${reportType}.${format === "csv" ? "csv" : "xlsx"}`,
        );
      }
      if (refreshExports) refetch();
      return true;
    } catch (error) {
      toast.error(
        error?.data?.message ||
          error?.data?.detail ||
          "Failed to generate report",
      );
      return false;
    }
  };

  const handleGenerateAll = async () => {
    await handleGenerate("all", {
      allReports: true,
      reportTypes: reportTypes.map((report) => report.id),
    });
  };

  const handleDownload = async (row) => {
    if (
      triggerDownload(
        row.downloadUrl,
        `${row.reportName}.${String(row.format).toLowerCase()}`,
      )
    )
      return;
    if (!row.id) {
      toast.error("Download is not available for this report");
      return;
    }
    try {
      const response = await downloadReportExport(row.id).unwrap();
      if (
        !triggerDownload(
          response?.downloadUrl,
          `${row.reportName}.${String(row.format).toLowerCase()}`,
        )
      ) {
        toast.error("Download link not available");
      }
    } catch (error) {
      toast.error(
        error?.data?.message ||
          error?.data?.detail ||
          "Failed to download report",
      );
    }
  };

  const columns = [
    {
      key: "reportName",
      header: "Report Name",
      cellClassName: "text-sm font-medium",
    },
    {
      key: "generatedBy",
      header: "Generated By",
      cellClassName: "text-sm text-muted-foreground",
    },
    {
      key: "generatedOn",
      header: "Generated On",
      cellClassName: "text-sm text-muted-foreground",
      render: (row) => formatGeneratedOn(row.generatedOn),
    },
    {
      key: "format",
      header: "Format",
      render: (row) => (
        <Badge variant="outline">
          {String(row.format || "-").toUpperCase()}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <Badge variant="outline" className={getStatusClass(row.status)}>
          {getStatusLabel(row.status)}
        </Badge>
      ),
    },
    {
      key: "download",
      header: "Download",
      render: (row) =>
        row.status === "completed" || row.status === "success" ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-primary"
            disabled={downloading}
            onClick={() => handleDownload(row)}
          >
            <Download className="mr-1 h-4 w-4" />
            Download
          </Button>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="grid gap-3 lg:grid-cols-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Date Range
              </p>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <Calendar className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Date Range" />
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
            <MultiSelectDropdown
              label="Vendors"
              placeholder={
                vendorsFetching ? "Loading vendors..." : "All Vendors"
              }
              options={vendorOptions}
              selected={selectedVendorIds}
              onChange={setSelectedVendorIds}
              icon={Users}
              disabled={vendorsFetching}
              searchable
              searchPlaceholder="Search vendors..."
            />
            <MultiSelectDropdown
              label="Statuses"
              placeholder={
                statusesFetching ? "Loading statuses..." : "All Statuses"
              }
              options={statusOptions}
              selected={selectedStatuses}
              onChange={setSelectedStatuses}
              icon={CheckCircle2}
              disabled={statusesFetching}
            />
            <MultiSelectDropdown
              label="Currencies"
              placeholder="All Currencies"
              options={currencyOptions}
              selected={selectedCurrencies}
              onChange={setSelectedCurrencies}
              icon={FileSpreadsheet}
            />
          </div>

          {dateRange === "custom" && (
            <div className="flex max-w-md items-center gap-2">
              <Input
                type="date"
                value={customFrom}
                onChange={(event) => setCustomFrom(event.target.value)}
              />
              <span className="text-xs text-muted-foreground">to</span>
              <Input
                type="date"
                value={customTo}
                onChange={(event) => setCustomTo(event.target.value)}
              />
            </div>
          )}

          <div className="grid gap-3 lg:grid-cols-3">
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                <SelectItem value="csv">CSV (.csv)</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search reports..."
                className="pl-9"
              />
            </div>
            <Button
              type="button"
              disabled={generating || reportTypes.length === 0}
              onClick={handleGenerateAll}
            >
              <Download className="mr-2 h-4 w-4" />
              Generate All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* <div className="grid gap-3 lg:grid-cols-2">
        {reportTypes.map((report) => {
          const Icon = report.icon || FileText;
          const isExpanded = expandedId === report.id;
          return (
            <Card
              key={report.id}
              className={isExpanded ? "border-primary/40" : ""}
            >
              <CardContent className="p-0">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 p-4 text-left"
                  onClick={() => setExpandedId(isExpanded ? "" : report.id)}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {report.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {report.description}
                    </span>
                  </span>
                  <Badge variant="outline">
                    <FileSpreadsheet className="mr-1 h-3 w-3" />
                    {format === "csv" ? "CSV" : "Excel"}
                  </Badge>
                </button>
                {isExpanded && (
                  <div className="space-y-3 border-t p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {report.metrics && (
                        <Badge variant="secondary">{report.metrics}</Badge>
                      )}
                      {report.lastGenerated && (
                        <span className="text-xs text-muted-foreground">
                          Last generated:{" "}
                          {formatGeneratedOn(report.lastGenerated)}
                        </span>
                      )}
                    </div>
                    {report.columns && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Data Points: </span>
                        {Array.isArray(report.columns)
                          ? report.columns.join(", ")
                          : report.columns}
                      </p>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      disabled={generating}
                      onClick={() => handleGenerate(report.id)}
                    >
                      <FileSpreadsheet className="mr-2 h-4 w-4" />
                      Generate Report
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {!typesFetching && reportTypes.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No report types found.
            </CardContent>
          </Card>
        )}
      </div> */}
      <div className="grid gap-3 lg:grid-cols-2">
        {[0, 1].map((columnIndex) => (
          <div key={columnIndex} className="flex flex-col gap-3">
            {reportTypes
              .filter((_, index) => index % 2 === columnIndex)
              .map((report) => {
                const Icon = report.icon || FileText;
                const isExpanded = expandedId === report.id;

                return (
                  <Card
                    key={report.id}
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      isExpanded ? "border-primary/40 shadow-sm" : ""
                    }`}
                  >
                    <CardContent className="p-0">
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 p-4 text-left"
                        onClick={() =>
                          setExpandedId(isExpanded ? "" : report.id)
                        }
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <Icon className="h-4 w-4" />
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">
                            {report.name}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {report.description}
                          </span>
                        </span>

                        <Badge variant="outline">
                          <FileSpreadsheet className="mr-1 h-3 w-3" />
                          {format === "csv" ? "CSV" : "Excel"}
                        </Badge>
                      </button>

                      <div
                        className={`overflow-hidden border-t transition-all duration-300 ease-in-out ${
                          isExpanded
                            ? "max-h-64 opacity-100"
                            : "max-h-0 opacity-0"
                        }`}
                      >
                        <div
                          className={`space-y-3 p-4 transition-all duration-300 ease-in-out ${
                            isExpanded
                              ? "translate-y-0 opacity-100"
                              : "-translate-y-2 opacity-0"
                          }`}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            {report.metrics && (
                              <Badge variant="secondary">
                                {report.metrics}
                              </Badge>
                            )}

                            {report.lastGenerated && (
                              <span className="text-xs text-muted-foreground">
                                Last generated:{" "}
                                {formatGeneratedOn(report.lastGenerated)}
                              </span>
                            )}
                          </div>

                          {report.columns && (
                            <p className="text-xs text-muted-foreground">
                              <span className="font-medium">Data Points: </span>
                              {Array.isArray(report.columns)
                                ? report.columns.join(", ")
                                : report.columns}
                            </p>
                          )}

                          <Button
                            type="button"
                            size="sm"
                            disabled={generating}
                            onClick={() => handleGenerate(report.id)}
                          >
                            <FileSpreadsheet className="mr-2 h-4 w-4" />
                            Generate Report
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        ))}

        {!typesFetching && reportTypes.length === 0 && (
          <Card className="lg:col-span-2">
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              No report types found.
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div>
            <h3 className="text-base font-semibold">Recent Exports</h3>
            <p className="text-sm text-muted-foreground">
              Generated report files available for download.
            </p>
          </div>
          <AppDataTable
            columns={columns}
            rows={normalizedExports}
            rowKey="id"
            isLoading={exportsFetching}
            emptyMessage="No reports generated yet"
            stickyHeader={false}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default ExportsTab;

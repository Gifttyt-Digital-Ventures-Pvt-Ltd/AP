import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  Building2,
  CheckCircle2,
  Download,
  FileSearch,
  FileText,
  Info,
  Layers,
  Loader2,
  Play,
  RefreshCw,
  Search,
  TrendingUp,
} from "lucide-react";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../../components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../../components/ui/tabs";
import { cn } from "../../../../lib/utils";
import {
  TaxAlertBanner,
  TaxApiMeta,
  TaxCompactTable,
  TaxComplianceIndicator,
  TaxDetailGrid,
  TaxDrawer,
  TaxEmptyState,
  TaxFilterBar,
  TaxFilterChip,
  TaxKpiCard,
  TaxPagination,
  TaxPeriodSelect,
  TaxProgressRow,
  TaxSearchInput,
  TaxSectionCard,
  TaxSelect,
  TaxStatusBadge,
  TaxValidBadge,
} from "../TaxUi";
import { DEFAULT_TAX_PERIOD, TAX_PERIODS } from "../../data/taxStaticData";
import {
  useSubmitGstr2aAnalyticsReconciliationMutation,
  useSubmitGstr2bAnalyticsReconciliationMutation,
  useTrackGstReturnsMutation,
} from "../../../../Services/apis/taxApi";
import { buildReturnsTrackPayload } from "../../utils/gstApiMappers";
import { getApiErrorMessage } from "../../hooks/useGstTaxpayerSession";
import { useGstVendors } from "../../hooks/useGstVendors";
import { useVendorGstSelection } from "../../hooks/useVendorGstSelection";
import { useOrganisationGstCredentials } from "../../hooks/useOrganisationGstCredentials";
import { toast } from "sonner";
import { formatCurrency, formatRetPeriod } from "../../utils/taxFormatting";
import MeteredActionCostHint from "../../../../components/credits/MeteredActionCostHint";
import { CREDIT_ACTION_CODES } from "../../../../constants/creditActions";
import {
  getCurrentIndianFinancialYear,
  getIndianFinancialYearReturnsOptions,
  toIndianFinancialYearReturnsLabel,
} from "../../utils/gstPeriod";
import OrgGstCredentialFields from "./OrgGstCredentialFields";
import VendorGstPickerFields from "./VendorGstPickerFields";
import { useCreditErrorHandler } from "../../../../contexts/CreditErrorContext";
import { useGstAnalyticsReconciliation } from "../../contexts/GstAnalyticsReconciliationContext";
import {
  getAnalyticsDocumentUrl,
  getAnalyticsJob,
  getAnalyticsJobId,
  getAnalyticsStatus,
  isAnalyticsJobTerminal,
} from "../../utils/gstAnalyticsReconciliation";

const RECON_SUGGESTED_ACTIONS = {
  Matched: null,
  "Amount Mismatch":
    "Request supplier to re-upload corrected invoice on GST portal or adjust ITC claim in GSTR-3B.",
  Partial:
    "Follow up with supplier to upload the missing invoice on the GST portal before claiming ITC.",
  "Missing in Books":
    "Record the supplier invoice in AP books or verify if the portal entry belongs to another entity.",
  "Missing in AP":
    "Create the corresponding AP invoice or confirm with the supplier whether this is a valid purchase.",
  "Missing in GST":
    "This invoice is in AP but not on the GST portal. Request the supplier to upload GSTR-1.",
};

const getReconTaxBreakup = (row) => {
  const taxable = formatCurrency(row.taxable);
  const totalGst = formatCurrency(row.gst);
  const diff = formatCurrency(row.difference);
  const portalMissing = row.portalStatus === "Missing";
  const booksMissing = row.booksStatus === "Missing";
  const halfGst = row.gst / 2;
  const cgst = formatCurrency(halfGst);
  const sgst = formatCurrency(halfGst);
  const portalCgst = portalMissing ? "—" : cgst;
  const portalSgst = portalMissing ? "—" : sgst;
  const booksCgst = booksMissing ? "—" : cgst;
  const booksSgst = booksMissing ? "—" : sgst;
  const cgstDiff =
    row.difference && !portalMissing && !booksMissing ? diff : "₹0.00";
  const sgstDiff =
    row.difference && !portalMissing && !booksMissing ? diff : "₹0.00";

  return [
    {
      component: "Taxable Value",
      books: taxable,
      portal: taxable,
      difference: row.difference ? diff : "₹0.00",
    },
    {
      component: "CGST (9%)",
      books: booksCgst,
      portal: portalCgst,
      difference: cgstDiff,
    },
    {
      component: "SGST (9%)",
      books: booksSgst,
      portal: portalSgst,
      difference: sgstDiff,
    },
    {
      component: "Total GST",
      books: totalGst,
      portal: portalMissing ? "—" : totalGst,
      difference: diff,
    },
  ];
};

const GstReconciliationDrawerContent = ({ row }) => {
  const breakup = getReconTaxBreakup(row);
  const suggestedAction = RECON_SUGGESTED_ACTIONS[row.result];

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-muted/20 p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Invoice Details
        </p>
        <TaxDetailGrid
          items={[
            { label: "Invoice No.", value: row.invoiceNo, mono: true },
            { label: "Vendor", value: row.vendor },
            { label: "GSTIN", value: row.gstin, mono: true },
            { label: "Invoice Date", value: row.date },
          ]}
        />
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Tax Breakup
        </p>
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                {["Component", "Books", "GST Portal", "Difference"].map(
                  (heading) => (
                    <TableHead key={heading} className="text-xs">
                      {heading}
                    </TableHead>
                  ),
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {breakup.map((line) => (
                <TableRow key={line.component}>
                  <TableCell className="text-sm">{line.component}</TableCell>
                  <TableCell className="text-sm font-medium">
                    {line.books}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {line.portal}
                  </TableCell>
                  <TableCell
                    className={`text-sm font-semibold ${line.difference !== "₹0.00" ? "text-red-600" : "text-green-600"}`}
                  >
                    {line.difference}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="rounded-md border bg-muted/20 p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Match Result
        </p>
        <div className="mb-2 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Overall Status:</span>
          <TaxStatusBadge status={row.result} />
        </div>
        <p className="text-xs text-muted-foreground">
          Matching history: Reconciled on 15 Feb 2024 · Auto-matched by system
        </p>
      </div>

      {suggestedAction ? (
        <TaxAlertBanner>
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <div>
            <p className="font-semibold">Suggested Action</p>
            <p className="mt-1">{suggestedAction}</p>
          </div>
        </TaxAlertBanner>
      ) : null}

      <div className="flex gap-2">
        <Button size="sm">
          <Download className="mr-2 h-4 w-4" />
          Download Report
        </Button>
        <Button size="sm" variant="outline">
          Mark Resolved
        </Button>
      </div>
    </div>
  );
};

const GST_RECONCILIATION_PAGE_SIZE = 20;
const GST_RECONCILIATION_MONTHS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];
const GST_RECONCILIATION_CRITERIA = [
  { value: "strict", label: "Strict" },
  { value: "moderate", label: "Moderate" },
  { value: "flexible", label: "Flexible" },
];
const GST_RECONCILIATION_FILING_PREFERENCES = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
];

const getCalendarYearOptions = () => {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 7 }, (_, index) =>
    String(currentYear - 4 + index),
  );
};

const getAnalyticsHistoryTotal = (history) =>
  Number(history?.total ?? history?.length ?? 0);
const getAnalyticsHistoryPages = (history) => {
  const total = getAnalyticsHistoryTotal(history);
  return Math.max(1, Math.ceil(total / GST_RECONCILIATION_PAGE_SIZE));
};
const formatAnalyticsDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
const formatAnalyticsPeriod = (job) => {
  const month = GST_RECONCILIATION_MONTHS.find(
    (item) => item.value === String(job?.month),
  )?.label;
  return [month, job?.year].filter(Boolean).join(" ") || "—";
};

export const GstReconciliationPanel = () => {
  const now = new Date();
  const yearOptions = useMemo(() => getCalendarYearOptions(), []);
  const [subTab, setSubTab] = useState("2a");
  const [selectedOrgGst, setSelectedOrgGst] = useState("");
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [criteria, setCriteria] = useState("strict");
  const [filingPreference, setFilingPreference] = useState("monthly");
  const [historyRows, setHistoryRows] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  const { handleCreditError } = useCreditErrorHandler();
  const {
    activeJobsByType,
    historyRefreshTick,
    setActiveJobForType,
    startPollingJob,
    clearPendingJobForType,
    fetchHistoryRows,
  } = useGstAnalyticsReconciliation();
  const { credentials, isLoading: credentialsLoading } =
    useOrganisationGstCredentials();
  const { vendors, isLoading: vendorsLoading } = useGstVendors();
  const {
    vendorId,
    setVendorId,
    selectedVendor,
    selectedGstin,
    setSelectedGstin,
    activeGstin,
    gstRegistrations,
    hasMultipleGstins,
  } = useVendorGstSelection(vendors);
  const [submitGstr2a] = useSubmitGstr2aAnalyticsReconciliationMutation();
  const [submitGstr2b] = useSubmitGstr2bAnalyticsReconciliationMutation();

  const selectedCredential = credentials.find(
    (entry) => entry.gst === selectedOrgGst,
  );
  const activeTypeLabel = subTab === "2a" ? "GSTR-2A" : "GSTR-2B";
  const activeJob = activeJobsByType[subTab] ?? null;
  const historyTotalPages = getAnalyticsHistoryPages(historyRows);

  const loadHistory = useCallback(
    async (page = 1, type = subTab) => {
      setHistoryLoading(true);
      try {
        const rows = await fetchHistoryRows(type, page);
        setHistoryRows(rows);
        return rows;
      } catch (error) {
        toast.error(getApiErrorMessage(error));
        setHistoryRows([]);
        return [];
      } finally {
        setHistoryLoading(false);
      }
    },
    [fetchHistoryRows, subTab],
  );

  const openReport = (job) => {
    const documentUrl = getAnalyticsDocumentUrl(job);
    if (!documentUrl) {
      toast.error("Report is not available yet.");
      return;
    }
    window.open(documentUrl, "_blank", "noopener,noreferrer");
  };

  useEffect(() => {
    if (!selectedOrgGst && credentials.length > 0) {
      setSelectedOrgGst(credentials[0].gst);
    }
  }, [credentials, selectedOrgGst]);

  useEffect(() => {
    setSubmitLoading(false);
    setHistoryPage(1);
    loadHistory(1, subTab);
  }, [subTab, loadHistory]);

  useEffect(() => {
    if (!historyRefreshTick[subTab]) return;
    loadHistory(historyPage, subTab);
  }, [historyPage, historyRefreshTick, loadHistory, subTab]);

  const handleSubmit = async () => {
    if (!selectedCredential?.gst) {
      toast.error(
        "Select organisation GSTIN before generating reconciliation.",
      );
      return;
    }

    setSubmitLoading(true);
    try {
      const payload = {
        gstin: selectedCredential.gst,
        username: selectedCredential.userName || undefined,
        ...(selectedVendor?.name ? { vendor: selectedVendor.name } : {}),
        ...(activeGstin && selectedVendor
          ? { supplierGstin: activeGstin }
          : {}),
        year: Number(year),
        month: Number(month),
        reconciliationCriteria: criteria,
        ...(subTab === "2b" ? { filingPreference } : {}),
      };
      const result =
        subTab === "2a"
          ? await submitGstr2a(payload).unwrap()
          : await submitGstr2b(payload).unwrap();
      const job = getAnalyticsJob(result);
      const jobId = getAnalyticsJobId(job);
      setActiveJobForType(subTab, job);
      toast.success(`${activeTypeLabel} reconciliation started.`);

      if (!isAnalyticsJobTerminal(job) && !jobId) {
        setSubmitLoading(false);
        toast.error("Reconciliation job id was not returned by the server.");
        return;
      }

      if (!isAnalyticsJobTerminal(job) && jobId) {
        startPollingJob(subTab, jobId, job);
        setSubmitLoading(false);
        return;
      }

      clearPendingJobForType(subTab);
      setSubmitLoading(false);
      await loadHistory(1, subTab);
    } catch (error) {
      setSubmitLoading(false);
      if (handleCreditError(error)) return;
      toast.error(getApiErrorMessage(error));
    }
  };

  return (
    <TabsContent value="reconciliation" className="space-y-4">
      <Tabs value={subTab} onValueChange={setSubTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="2a">GSTR-2A</TabsTrigger>
          <TabsTrigger value="2b">GSTR-2B</TabsTrigger>
        </TabsList>
      </Tabs>

      <TaxSectionCard
        icon={FileSearch}
        title={`${activeTypeLabel} Analytics Reconciliation`}
        description="Generate a GST analytics reconciliation report for an organisation GSTIN."
        actions={
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={submitLoading || credentialsLoading || !selectedOrgGst}
          >
            {submitLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            {submitLoading ? "Submitting…" : "Generate Report"}
          </Button>
        }
      >
        <MeteredActionCostHint
          actionCode={CREDIT_ACTION_CODES.GST_RECON_API}
          className="mb-4"
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <OrgGstCredentialFields
            credentials={credentials}
            loading={credentialsLoading}
            selectedGst={selectedOrgGst}
            onGstChange={setSelectedOrgGst}
            className="xl:col-span-2"
          />
          <VendorGstPickerFields
            vendors={vendors}
            vendorsLoading={vendorsLoading}
            vendorId={vendorId}
            onVendorIdChange={setVendorId}
            selectedGstin={selectedGstin}
            onSelectedGstinChange={setSelectedGstin}
            activeGstin={activeGstin}
            gstRegistrations={gstRegistrations}
            hasMultipleGstins={hasMultipleGstins}
            allowAll
            vendorOptional
            vendorLabel="Supplier"
            vendorPlaceholder="All Suppliers"
          />
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Month
            </label>
            <TaxSelect
              value={month}
              onValueChange={setMonth}
              options={GST_RECONCILIATION_MONTHS}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Calendar Year
            </label>
            <TaxSelect
              value={year}
              onValueChange={setYear}
              options={yearOptions}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Criteria
            </label>
            <TaxSelect
              value={criteria}
              onValueChange={setCriteria}
              options={GST_RECONCILIATION_CRITERIA}
            />
          </div>
          {subTab === "2b" ? (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Filing Preference
              </label>
              <TaxSelect
                value={filingPreference}
                onValueChange={setFilingPreference}
                options={GST_RECONCILIATION_FILING_PREFERENCES}
              />
            </div>
          ) : null}
        </div>

        {activeJob ? (
          <div className="mt-4 rounded-md border bg-muted/20 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">Current Request</p>
                {getAnalyticsStatus(activeJob) === "PROCESSING" ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Processing in background. Status updates automatically while
                    you stay in Tax Management.
                  </p>
                ) : null}
              </div>
              <TaxStatusBadge status={activeJob.status} />
            </div>
            <TaxDetailGrid
              items={[
                {
                  label: "Supplier",
                  value:
                    activeJob.supplierName ||
                    selectedVendor?.name ||
                    "All Suppliers",
                },
                {
                  label: "Supplier GSTIN",
                  value: activeJob.supplierGstin || activeGstin || "—",
                },
                { label: "Period", value: formatAnalyticsPeriod(activeJob) },
                {
                  label: "Criteria",
                  value: activeJob.reconciliationCriteria || criteria,
                },
                {
                  label: "Generated On",
                  value: formatAnalyticsDateTime(activeJob.fetchDateTime),
                },
                {
                  label: "Completed On",
                  value: formatAnalyticsDateTime(activeJob.completedAt),
                },
                {
                  label: "Filing Preference",
                  value:
                    activeJob.filingPreference ||
                    (subTab === "2b" ? filingPreference : "—"),
                },
              ]}
            />
            {activeJob.failureMessage ? (
              <TaxAlertBanner tone="red" className="mt-3">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{activeJob.failureMessage}</span>
              </TaxAlertBanner>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openReport(activeJob)}
                disabled={!getAnalyticsDocumentUrl(activeJob)}
              >
                <Download className="mr-2 h-4 w-4" />
                Download Report
              </Button>
            </div>
          </div>
        ) : null}
      </TaxSectionCard>

      <TaxSectionCard
        icon={FileText}
        title={`${activeTypeLabel} Report History`}
        description="Previously generated analytics reconciliation reports. Download uses the saved report URL and does not re-run reconciliation."
        meta={
          <TaxApiMeta
            synced={historyLoading ? "Refreshing…" : "Latest"}
            count={String(getAnalyticsHistoryTotal(historyRows))}
          />
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadHistory(historyPage, subTab)}
            disabled={historyLoading}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${historyLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        }
      >
        {historyLoading && historyRows.length === 0 ? (
          <TaxEmptyState
            icon={RefreshCw}
            title="Loading reconciliation history…"
            description="Fetching the latest generated reports."
          />
        ) : (
          <>
            <TaxCompactTable
              rows={historyRows}
              getRowKey={(row, index) =>
                `${getAnalyticsJobId(getAnalyticsJob(row)) || row?.requestedAt || index}-${index}`
              }
              emptyMessage="No reconciliation reports found."
              columns={[
                {
                  key: "requestedAt",
                  title: "Generated On",
                  render: (row) =>
                    formatAnalyticsDateTime(
                      row?.requestedAt ?? getAnalyticsJob(row)?.fetchDateTime,
                    ),
                },
                {
                  key: "completedAt",
                  title: "Completed On",
                  render: (row) =>
                    formatAnalyticsDateTime(getAnalyticsJob(row)?.completedAt),
                },
                {
                  key: "supplierName",
                  title: "Supplier",
                  render: (row) =>
                    getAnalyticsJob(row)?.supplierName || "All Suppliers",
                },
                {
                  key: "period",
                  title: "Period",
                  render: (row) => formatAnalyticsPeriod(getAnalyticsJob(row)),
                },
                {
                  key: "criteria",
                  title: "Criteria",
                  render: (row) =>
                    getAnalyticsJob(row)?.reconciliationCriteria || "—",
                },
                ...(subTab === "2b"
                  ? [
                      {
                        key: "filingPreference",
                        title: "Filing Preference",
                        render: (row) =>
                          getAnalyticsJob(row)?.filingPreference || "—",
                      },
                    ]
                  : []),
                {
                  key: "status",
                  title: "Status",
                  render: (row) => (
                    <TaxStatusBadge status={getAnalyticsJob(row)?.status} />
                  ),
                },
                {
                  key: "download",
                  title: "Report",
                  render: (row) => {
                    const job = getAnalyticsJob(row);
                    return (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!getAnalyticsDocumentUrl(job)}
                        onClick={() => openReport(job)}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                    );
                  },
                },
              ]}
            />
            <TaxPagination
              page={historyPage}
              totalPages={historyTotalPages}
              loading={historyLoading}
              onPrevious={() => {
                const nextPage = Math.max(1, historyPage - 1);
                setHistoryPage(nextPage);
                loadHistory(nextPage, subTab);
              }}
              onNext={() => {
                const nextPage = Math.min(historyTotalPages, historyPage + 1);
                setHistoryPage(nextPage);
                loadHistory(nextPage, subTab);
              }}
            />
          </>
        )}
      </TaxSectionCard>
    </TabsContent>
  );
};

const FY_OPTIONS = getIndianFinancialYearReturnsOptions();
const DEFAULT_GST_RETURNS_FY = toIndianFinancialYearReturnsLabel(
  getCurrentIndianFinancialYear(),
);
const RETURN_TYPE_OPTIONS = ["All Returns", "GSTR-1", "GSTR-3B", "GSTR-9"];

export const GstReturnsPanel = () => {
  const { vendors } = useGstVendors();
  const {
    vendorId,
    setVendorId,
    selectedVendor,
    selectedGstin,
    setSelectedGstin,
    activeGstin,
    gstRegistrations,
    hasMultipleGstins,
  } = useVendorGstSelection(vendors);
  const [returnType, setReturnType] = useState("All Returns");
  const [fy, setFy] = useState(DEFAULT_GST_RETURNS_FY);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [records, setRecords] = useState([]);
  const [trackReturns] = useTrackGstReturnsMutation();

  const handleTrack = async () => {
    if (!vendorId || !selectedVendor) return;
    if (!activeGstin) {
      toast.error(
        "Selected vendor does not have a GSTIN. Add a GST registration to the vendor first.",
      );
      return;
    }
    setLoading(true);
    setFetched(false);
    try {
      const result = await trackReturns(
        buildReturnsTrackPayload({
          vendorName: selectedVendor.name,
          gstin: activeGstin,
          returnType,
          financialYear: fy,
        }),
      ).unwrap();
      const rows = result?.returns ?? [];
      const filtered =
        returnType === "All Returns"
          ? rows
          : rows.filter(
              (row) => row.returnType === returnType.replace(/-/g, ""),
            );
      setRecords(filtered);
      setFetched(true);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const filedCount = records.filter((row) => row.status === "Filed").length;
  const invalidCount = records.filter((row) => row.valid === "N").length;
  const lastFiled = records.find((row) => row.status === "Filed");
  const complianceRating =
    !fetched || records.length === 0
      ? "none"
      : invalidCount > 0 || filedCount < records.length * 0.8
        ? "irregular"
        : "regular";
  const vendorStatus =
    !fetched || records.length === 0
      ? "No Records Found"
      : complianceRating === "regular"
        ? "Compliant"
        : "Partial Compliance";

  return (
    <TabsContent value="returns" className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">
          GST Return Compliance Tracker
        </h3>
        <p className="text-sm text-muted-foreground">
          Track vendor GST return filing history and compliance status using
          Sandbox Track GSTRs API.
        </p>
      </div>

      <TaxSectionCard
        icon={Building2}
        title="Select Vendor & Filter"
        description="Vendor selection is required before fetching filing history."
      >
        <MeteredActionCostHint
          actionCode={CREDIT_ACTION_CODES.GST_RETURNS_API}
          className="mb-4"
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <VendorGstPickerFields
            vendors={vendors}
            vendorId={vendorId}
            onVendorIdChange={setVendorId}
            selectedGstin={selectedGstin}
            onSelectedGstinChange={setSelectedGstin}
            activeGstin={activeGstin}
            gstRegistrations={gstRegistrations}
            hasMultipleGstins={hasMultipleGstins}
            vendorRequired
            vendorLabel="Vendor"
            onVendorChange={() => setFetched(false)}
          />
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Return Type
            </label>
            <TaxSelect
              value={returnType}
              onValueChange={setReturnType}
              options={RETURN_TYPE_OPTIONS}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Financial Year
            </label>
            <TaxSelect value={fy} onValueChange={setFy} options={FY_OPTIONS} />
          </div>
          <div className="flex items-end">
            <Button
              onClick={handleTrack}
              disabled={!vendorId || !activeGstin || loading}
              className="w-full"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              {loading ? "Fetching…" : "Track Returns"}
            </Button>
          </div>
        </div>
      </TaxSectionCard>

      {!fetched && !loading ? (
        <TaxEmptyState
          icon={Building2}
          title="Select a vendor to view GST filing history"
          description="Choose a vendor from your vendor master. The GSTIN will be auto-populated and filing history fetched from the GST portal."
        />
      ) : null}

      {loading ? (
        <TaxEmptyState
          icon={RefreshCw}
          title="Fetching GST filing history from portal…"
          description="Please wait while filing records are retrieved."
        />
      ) : null}

      {fetched && !loading ? (
        <>
          <TaxSectionCard
            icon={FileText}
            title="Vendor Compliance Summary"
            meta={
              <TaxApiMeta synced="Just now" count={String(records.length)} />
            }
          >
            <div className="mb-4 flex flex-wrap items-center gap-4 border-b pb-4">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                {selectedVendor?.name?.[0] || "V"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{selectedVendor?.name}</p>
                <p className="font-mono text-xs text-muted-foreground">
                  {activeGstin || "—"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <TaxStatusBadge status={vendorStatus} />
                <TaxComplianceIndicator rating={complianceRating} />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <TaxKpiCard
                label="Returns Found"
                value={String(records.length)}
                sub={`${returnType} · ${fy}`}
                icon={FileText}
              />
              <TaxKpiCard
                label="Last Filed Return"
                value={lastFiled?.returnType || "—"}
                sub={
                  lastFiled
                    ? formatRetPeriod(lastFiled.returnPeriod)
                    : "No filings found"
                }
                icon={CheckCircle2}
                tone="green"
              />
              <TaxKpiCard
                label="Last Filing Date"
                value={lastFiled?.dof || "—"}
                sub={`Mode: ${lastFiled?.filing_mode || "—"}`}
                icon={Layers}
              />
              <TaxKpiCard
                label="Filing Validity"
                value={
                  invalidCount > 0 ? `${invalidCount} Invalid` : "All Valid"
                }
                sub={`${filedCount} filed of ${records.length}`}
                icon={AlertCircle}
                tone={invalidCount > 0 ? "red" : "green"}
              />
            </div>
          </TaxSectionCard>

          <TaxSectionCard
            icon={FileSearch}
            title="Filing History"
            description="Source: Sandbox Track GSTRs API · Read-only"
            actions={
              <Button
                variant="outline"
                size="sm"
                onClick={handleTrack}
                disabled={!vendorId || !activeGstin || loading}
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
                />
                {loading ? "Refreshing…" : "Refresh"}
              </Button>
            }
          >
            {records.length === 0 ? (
              <TaxEmptyState
                icon={FileText}
                title="No GST return records found"
                description="No GST return records found for the selected vendor and financial year."
              />
            ) : (
              <>
                <TaxCompactTable
                  rows={records}
                  getRowKey={(row, index) =>
                    `${row.returnType}-${row.returnPeriod}-${index}`
                  }
                  columns={[
                    {
                      key: "returnType",
                      title: "Return Type",
                      cellClassName: "font-medium text-primary",
                    },
                    {
                      key: "returnPeriod",
                      title: "Return Period",
                      render: (row) => formatRetPeriod(row.returnPeriod),
                    },
                    {
                      key: "arn",
                      title: "ARN",
                      render: (row) => row.arn || "—",
                      cellClassName: "font-mono text-xs",
                    },
                    { key: "filedDate", title: "Filed Date" },
                    {
                      key: "filingMode",
                      title: "Filing Mode",
                      cellClassName: "text-muted-foreground",
                    },
                    {
                      key: "status",
                      title: "Status",
                      render: (row) => <TaxStatusBadge status={row.status} />,
                    },
                    {
                      key: "valid",
                      title: "Valid",
                      render: (row) => <TaxValidBadge valid={row.valid} />,
                    },
                  ]}
                />
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                  <Info className="h-3.5 w-3.5" />
                  This is a read-only view of GST filing history retrieved from
                  the GST portal.
                </div>
              </>
            )}
          </TaxSectionCard>
        </>
      ) : null}
    </TabsContent>
  );
};

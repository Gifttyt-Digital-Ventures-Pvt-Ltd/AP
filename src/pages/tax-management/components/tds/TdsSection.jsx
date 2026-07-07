import React, { forwardRef, useImperativeHandle, useState } from "react";
import { useGetInvoicesQuery } from "../../../../Services/apis/invoicesVendorsApi";
import {
  EMPTY_INVOICE_LIST_RESPONSE,
  getInvoiceListItems,
} from "../../../../Services/utils/payloadMappers";
import {
  useCalculateTdsMutation,
  useGetTdsEntriesQuery,
  useGetTdsSectionsQuery,
  useGetTdsSummaryQuery,
  useLazyGetTdsEntriesExportQuery,
} from "../../../../Services/apis/taxApi";
import { Button } from "../../../../components/ui/button";
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
import { formatCurrency } from "../../utils/taxFormatting";
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
  const [calculateTds] = useCalculateTdsMutation();
  const [exportTdsEntries, { isFetching: exportingTdsEntries }] =
    useLazyGetTdsEntriesExportQuery();

  const overviewActive = enabled && tdsSubTab === "overview";
  const calculatorActive = enabled && tdsSubTab === "calculator";
  const dialogDataActive = enabled && showTdsCalcDialog;

  const {
    data: tdsEntriesData = [],
    isLoading: tdsEntriesLoading,
    isFetching: tdsEntriesFetching,
    refetch: refetchTdsEntries,
  } = useGetTdsEntriesQuery(undefined, { skip: !overviewActive });
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

  const tdsEntries = Array.isArray(tdsEntriesData) ? tdsEntriesData : [];
  const tdsSections = Array.isArray(tdsSectionsData) ? tdsSectionsData : [];
  const invoices = getInvoiceListItems(invoicesListData);
  const canManageTds = canPerformAction("tax.calculateTds") && enabled;
  const loading = overviewActive && (tdsEntriesLoading || tdsSummaryLoading);
  const isFetching =
    tdsEntriesFetching ||
    tdsSummaryFetching ||
    tdsSectionsFetching ||
    invoicesFetching;

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
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>TDS Entries</CardTitle>
                    <CardDescription>
                      TDS deductions and deposits
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
              <CardContent>
                <AppDataTable
                  tableHeader={TDS_ENTRIES_TABLE_HEADER}
                  tableData={tdsEntries}
                  renderRow={(entry, rowIndex, headers) =>
                    renderTdsEntryRow(entry, rowIndex, headers, {
                      onViewInvoice: handleViewTdsInvoice,
                    })
                  }
                  emptyMessage="No TDS entries found. Entries appear after approved invoices with TDS deduction."
                />
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

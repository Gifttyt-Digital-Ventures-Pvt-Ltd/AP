import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Megaphone, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import {
  EMPTY_CAMPAIGN_LIST_PAGE,
  useApproveCampaignInvoiceMutation,
  useApproveCampaignMutation,
  useCheckCampaignInvoiceMutation,
  useCreateCampaignMutation,
  useUpdateCampaignMutation,
  useGetCampaignDetailQuery,
  useGetCampaignsQuery,
  useGetCampaignVendorsQuery,
  useMarkCampaignInvoicePaidMutation,
  useRecordCampaignAdvanceMutation,
  useUpdateCampaignStatusMutation,
} from "../../Services/apis/campaignsApi";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useAuth } from "../../contexts/AuthContext";
import { useRBAC } from "../../contexts/RBACContext";
import { useGetCorporateUserDetailsQuery } from "../../Services/apis/corporateApi";
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
import AppDataTable from "../../components/common/AppDataTable";
import RefreshButton from "../../components/common/RefreshButton";
import { TableCell, TableRow } from "../../components/ui/table";
import ApproveCampaignModal from "./components/ApproveCampaignModal";
import CampaignDetailsModal from "./components/CampaignDetailsModal";
import { CampaignStatusBadge, SummaryTile } from "./components/CampaignShared";
import CreateCampaignModal from "./components/CreateCampaignModal";
import InvoiceReviewModal from "./components/InvoiceReviewModal";
import MarkInvoicePaidModal from "./components/MarkInvoicePaidModal";
import RecordAdvanceModal from "./components/RecordAdvanceModal";
import InvoiceSingleUploadLayer from "../invoices/components/InvoiceSingleUploadLayer";
import {
  formatCurrency,
  formatDate,
  getApiErrorMessage,
} from "./utils/campaignFormatters";
import { buildCampaignAccess } from "./utils/campaignPermissions";
import { CAMPAIGN_LIST_PAGE_SIZE } from "./constants";

const campaignTableHeader = [
  { key: "campaign", title: "Campaign" },
  { key: "created", title: "Created" },
  { key: "createdBy", title: "Created By" },
  { key: "approvedBy", title: "Approved By" },
  { key: "budget", title: "Budget" },
  { key: "totalCost", title: "Total Cost" },
  { key: "pendingAmount", title: "Pending Amount" },
  { key: "status", title: "Status" },
  {
    key: "actions",
    title: "Actions",
    headerClassName: "text-left",
    cellClassName: "text-left",
  },
];

const CampaignsPage = () => {
  const [search, setSearch] = useState("");
  const [campaignPage, setCampaignPage] = useState(0);
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const [showCreate, setShowCreate] = useState(false);
  const [editCampaign, setEditCampaign] = useState(null);
  const [detailsCampaignId, setDetailsCampaignId] = useState(null);
  const [reviewCampaign, setReviewCampaign] = useState(null);
  const [advanceRow, setAdvanceRow] = useState(null);
  const [invoiceUploadOpen, setInvoiceUploadOpen] = useState(false);
  const [invoiceReview, setInvoiceReview] = useState(null);
  const [markPaidRow, setMarkPaidRow] = useState(null);

  const { user } = useAuth();
  const { hasPermission } = useRBAC();
  const { data: corporateUserContext = null } =
    useGetCorporateUserDetailsQuery();
  const access = useMemo(
    () => buildCampaignAccess({ user, corporateUserContext, hasPermission }),
    [user, corporateUserContext, hasPermission],
  );

  useEffect(() => {
    setCampaignPage(0);
  }, [debouncedSearch]);

  const campaignsQueryArgs = useMemo(
    () => ({
      page: campaignPage,
      size: CAMPAIGN_LIST_PAGE_SIZE,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
    }),
    [campaignPage, debouncedSearch],
  );

  const {
    data: campaignsPage = EMPTY_CAMPAIGN_LIST_PAGE,
    isLoading: campaignsLoading,
    isFetching: campaignsFetching,
    isError: campaignsError,
    refetch: refetchCampaigns,
  } = useGetCampaignsQuery(campaignsQueryArgs);
  const {
    data: vendorsData = [],
    isError: vendorsError,
    isFetching: vendorsFetching,
    refetch: refetchVendors,
  } =
    useGetCampaignVendorsQuery();
  const { data: detailsData, refetch: refetchDetails } =
    useGetCampaignDetailQuery(detailsCampaignId, {
      skip: !detailsCampaignId,
    });

  const [createCampaign, { isLoading: creatingCampaign }] =
    useCreateCampaignMutation();
  const [updateCampaign, { isLoading: updatingCampaign }] =
    useUpdateCampaignMutation();
  const [approveCampaign, { isLoading: approvingCampaign }] =
    useApproveCampaignMutation();
  const [updateCampaignStatus, { isLoading: updatingCampaignStatus }] =
    useUpdateCampaignStatusMutation();
  const [recordAdvance, { isLoading: recordingAdvance }] =
    useRecordCampaignAdvanceMutation();
  const [checkInvoice, { isLoading: checkingInvoice }] =
    useCheckCampaignInvoiceMutation();
  const [approveInvoice, { isLoading: approvingInvoice }] =
    useApproveCampaignInvoiceMutation();
  const [markInvoicePaid, { isLoading: markingPaid }] =
    useMarkCampaignInvoicePaidMutation();

  const campaigns = campaignsPage.items;
  const vendors = vendorsData;
  const detailsCampaign =
    detailsData ||
    campaigns.find((campaign) => campaign.id === detailsCampaignId) ||
    null;

  const campaignPagination = useMemo(() => {
    const { page, size, totalElements, totalPages, numberOfElements, last } =
      campaignsPage;
    const startRecord = totalElements === 0 ? 0 : page * size + 1;
    const endRecord =
      totalElements === 0
        ? 0
        : Math.min(page * size + numberOfElements, totalElements);

    return {
      page,
      size,
      totalElements,
      totalPages,
      startRecord,
      endRecord,
      hasMore: !last && page < totalPages - 1,
    };
  }, [campaignsPage]);

  const goToCampaignPage = useCallback((pageIndex) => {
    setCampaignPage(Math.max(0, pageIndex));
  }, []);

  const visibleCampaignPageNumbers = useMemo(() => {
    const { totalPages, page } = campaignPagination;
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, index) => index);
    }
    const start = Math.min(Math.max(page - 2, 0), totalPages - 5);
    return Array.from({ length: 5 }, (_, index) => start + index);
  }, [campaignPagination]);

  const stats = useMemo(
    () => ({
      total: campaignsPage.totalCampaigns || campaignPagination.totalElements,
      totalPending: campaignsPage.totalPending || 0,
      approved: campaignsPage.totalApproved || 0,
      totalBudget: campaignsPage.totalBudget || 0,
      totalCost: campaignsPage.totalCost || 0,
    }),
    [campaignPagination.totalElements, campaignsPage],
  );
  const pendingApprovalCampaigns = campaigns.filter(
    (campaign) => campaign.status === "pending_approval",
  );
  const firstPendingCampaign = pendingApprovalCampaigns[0];

  const handleRefreshCampaigns = async () => {
    try {
      await Promise.all([
        refetchCampaigns(),
        refetchVendors(),
        detailsCampaignId ? refetchDetails() : Promise.resolve(),
      ]);
      toast.success("Campaigns refreshed");
    } catch {
      toast.error("Failed to refresh campaigns");
    }
  };

  const refreshAfterMutation = async () => {
    await refetchCampaigns();
    if (detailsCampaignId) await refetchDetails();
  };

  const runMutation = async (mutation, successMessage, close) => {
    try {
      await mutation.unwrap();
      toast.success(successMessage);
      close?.();
      await refreshAfterMutation();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  const handleCreateCampaign = (body) =>
    runMutation(createCampaign(body), "Campaign created successfully", () =>
      setShowCreate(false),
    );

  const handleUpdateCampaign = (body) =>
    runMutation(
      updateCampaign({ id: editCampaign.id, body }),
      "Campaign updated successfully",
      () => setEditCampaign(null),
    );

  const handleApproveCampaign = (body) =>
    runMutation(
      approveCampaign({ id: reviewCampaign.id, body }),
      "Campaign approved successfully",
      () => setReviewCampaign(null),
    );

  const handleCampaignStatus = (body) =>
    runMutation(
      updateCampaignStatus({ id: reviewCampaign.id, body }),
      "Campaign status updated",
      () => setReviewCampaign(null),
    );

  const handleRecordAdvance = (body) =>
    runMutation(
      recordAdvance({ campaignId: detailsCampaign.id, body }),
      "Advance recorded successfully",
      () => setAdvanceRow(null),
    );

  const handleInvoiceReview = (body) => {
    const invoiceId = invoiceReview?.row?.invoice?.id;
    const mutation =
      invoiceReview?.stage === "checker"
        ? checkInvoice({ invoiceId, body })
        : approveInvoice({ invoiceId, body });
    return runMutation(mutation, "Invoice review submitted", () =>
      setInvoiceReview(null),
    );
  };

  const handleMarkPaid = (body) =>
    runMutation(
      markInvoicePaid({ invoiceId: markPaidRow?.invoice?.id, body }),
      "Invoice payment recorded",
      () => setMarkPaidRow(null),
    );

  const renderCampaignRow = (campaign, rowIndex, headers) => (
    <TableRow key={campaign.id || rowIndex} className="hover:bg-muted/30">
      {headers.map((header) => {
        let value;
        switch (header.key) {
          case "campaign":
            value = (
              <div>
                <p className="font-medium">{campaign.name}</p>
                <p className="text-xs text-muted-foreground">
                  {campaign.referenceCode || "No reference yet"}
                </p>
              </div>
            );
            break;
          case "created":
            value = formatDate(campaign.createdDate);
            break;
          case "createdBy":
            value = campaign.createdBy || "-";
            break;
          case "approvedBy":
            value = campaign.approvedBy || "-";
            break;
          case "budget":
          case "totalCost":
          case "pendingAmount":
            value = formatCurrency(campaign?.[header.key] || 0);
            break;
          case "status":
            value = <CampaignStatusBadge status={campaign.status} />;
            break;
          case "actions":
            value = (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDetailsCampaignId(campaign.id)}
                >
                  Details
                </Button>
                {access.canCreateCampaign &&
                  campaign.status === "correction_needed" && (
                    <Button size="sm" onClick={() => setEditCampaign(campaign)}>
                      Edit
                    </Button>
                  )}
                {access.canReviewCampaign &&
                  campaign.status === "pending_approval" && (
                    <Button
                      size="sm"
                      onClick={() => setReviewCampaign(campaign)}
                    >
                      Review
                    </Button>
                  )}
              </div>
            );
            break;
          default:
            value = campaign?.[header.key] || "-";
        }
        return (
          <TableCell key={header.key} className={header.cellClassName}>
            {value}
          </TableCell>
        );
      })}
    </TableRow>
  );

  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-6"
      data-testid="campaigns-page"
    >
      <div className="flex shrink-0 flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold font-['Manrope'] text-primary mb-2">
            Campaigns
          </h1>
          <p className="text-muted-foreground">
            Manage campaign approvals, vendor invoices, advances, and
            settlements.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <RefreshButton
            onClick={handleRefreshCampaigns}
            refreshing={campaignsFetching || vendorsFetching}
          >
            Refresh
          </RefreshButton>
          {access.canCreateCampaign && (
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
          )}
        </div>
      </div>

      {campaignsError && (
        <div className="shrink-0 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          Failed to load campaigns. Please try again.
        </div>
      )}

      {vendorsError && (
        <div className="shrink-0 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          Failed to load campaign vendors. Campaign creation may be unavailable.
        </div>
      )}

      {access.canReviewCampaign && firstPendingCampaign && (
        <div className="flex shrink-0 items-center justify-between gap-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <div className="flex items-center gap-3">
            <Megaphone className="h-5 w-5" />
            <p>
              {pendingApprovalCampaigns.length} campaign(s) need approval.
              Review{" "}
              <span className="font-medium">{firstPendingCampaign.name}</span>.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setReviewCampaign(firstPendingCampaign)}
          >
            Review now
          </Button>
        </div>
      )}

      <div className="grid shrink-0 grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <SummaryTile label="Total Campaigns" value={stats.total} />
        <SummaryTile
          label="Total Pending"
          value={stats.totalPending}
        />
        <SummaryTile label="Approved" value={stats.approved} />
        <SummaryTile
          label="Total Budget"
          value={formatCurrency(stats.totalBudget)}
        />
        <SummaryTile
          label="Total Cost"
          value={formatCurrency(stats.totalCost)}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex shrink-0 flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-semibold">Campaign List</h2>
            <p className="text-sm text-muted-foreground">
              Search by campaign name or creator.
            </p>
          </div>
          <div className="relative md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search campaigns..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin-muted">
          <AppDataTable
            tableHeader={campaignTableHeader}
            tableData={campaigns}
            renderRow={renderCampaignRow}
            isLoading={campaignsLoading || campaignsFetching}
            loadingRowCount={8}
            emptyMessage={
              campaignsLoading ? "Loading campaigns..." : "No campaigns found"
            }
          />
        </div>
        <div className="mt-auto flex shrink-0 flex-col gap-3 border-t border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          {campaignPagination.totalPages > 0 ? (
            <>
              <p
                className="text-sm text-muted-foreground"
                data-testid="campaign-pagination-summary"
              >
                Showing {campaignPagination.startRecord}-
                {campaignPagination.endRecord} of{" "}
                {campaignPagination.totalElements.toLocaleString("en-IN")}
              </p>
              <Pagination className="mx-0 w-auto justify-start sm:justify-end">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        goToCampaignPage(campaignPagination.page - 1);
                      }}
                      className={
                        campaignPagination.page === 0
                          ? "pointer-events-none opacity-50"
                          : undefined
                      }
                      data-testid="campaign-pagination-previous"
                    />
                  </PaginationItem>
                  {visibleCampaignPageNumbers.map((pageNumber) => (
                    <PaginationItem key={pageNumber}>
                      <PaginationLink
                        href="#"
                        isActive={pageNumber === campaignPagination.page}
                        onClick={(event) => {
                          event.preventDefault();
                          goToCampaignPage(pageNumber);
                        }}
                        data-testid={`campaign-pagination-page-${pageNumber + 1}`}
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
                        goToCampaignPage(campaignPagination.page + 1);
                      }}
                      className={
                        !campaignPagination.hasMore &&
                        campaignPagination.page >=
                          campaignPagination.totalPages - 1
                          ? "pointer-events-none opacity-50"
                          : undefined
                      }
                      data-testid="campaign-pagination-next"
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </>
          ) : null}
        </div>
      </div>

      <CreateCampaignModal
        open={showCreate || Boolean(editCampaign)}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreate(false);
            setEditCampaign(null);
          }
        }}
        vendors={vendors}
        campaign={editCampaign}
        onSubmit={editCampaign ? handleUpdateCampaign : handleCreateCampaign}
        saving={creatingCampaign || updatingCampaign}
      />
      <ApproveCampaignModal
        open={Boolean(reviewCampaign)}
        onOpenChange={(open) => !open && setReviewCampaign(null)}
        campaign={reviewCampaign}
        onApprove={handleApproveCampaign}
        onStatus={handleCampaignStatus}
        saving={approvingCampaign || updatingCampaignStatus}
      />
      <CampaignDetailsModal
        open={Boolean(detailsCampaignId)}
        onOpenChange={(open) => !open && setDetailsCampaignId(null)}
        campaign={detailsCampaign}
        access={access}
        onRecordAdvance={setAdvanceRow}
        onSubmitInvoice={() => {
          if (!detailsCampaign) return;
          setInvoiceUploadOpen(true);
          setDetailsCampaignId(null);
        }}
        onReviewInvoice={(row, stage) => setInvoiceReview({ row, stage })}
        onMarkPaid={setMarkPaidRow}
      />
      <InvoiceSingleUploadLayer
        showFilePicker
        filePickerOpen={invoiceUploadOpen}
        onFilePickerOpenChange={(open) => {
          setInvoiceUploadOpen(open);
        }}
        onInvoiceAdded={async () => {
          setInvoiceUploadOpen(false);
          await refreshAfterMutation();
        }}
      />
      <RecordAdvanceModal
        open={Boolean(advanceRow)}
        onOpenChange={(open) => !open && setAdvanceRow(null)}
        campaign={detailsCampaign}
        row={advanceRow}
        onSubmit={handleRecordAdvance}
        saving={recordingAdvance}
      />
      <InvoiceReviewModal
        open={Boolean(invoiceReview)}
        onOpenChange={(open) => !open && setInvoiceReview(null)}
        row={invoiceReview?.row}
        stage={invoiceReview?.stage}
        onSubmit={handleInvoiceReview}
        saving={checkingInvoice || approvingInvoice}
      />
      <MarkInvoicePaidModal
        open={Boolean(markPaidRow)}
        onOpenChange={(open) => !open && setMarkPaidRow(null)}
        row={markPaidRow}
        onSubmit={handleMarkPaid}
        saving={markingPaid}
      />
    </div>
  );
};

export default CampaignsPage;

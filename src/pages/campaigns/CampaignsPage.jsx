import React, { useMemo, useState } from "react";
import { Megaphone, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import {
  useApproveCampaignInvoiceMutation,
  useApproveCampaignMutation,
  useCheckCampaignInvoiceMutation,
  useCreateCampaignMutation,
  useGetCampaignDetailQuery,
  useGetCampaignsQuery,
  useGetCampaignVendorsQuery,
  useMarkCampaignInvoicePaidMutation,
  useRecordCampaignAdvanceMutation,
  useUpdateCampaignStatusMutation,
} from "../../Services/apis/campaignsApi";
import { useAuth } from "../../contexts/AuthContext";
import { useRBAC } from "../../contexts/RBACContext";
import { useGetCorporateUserDetailsQuery } from "../../Services/apis/corporateApi";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import AppDataTable from "../../components/common/AppDataTable";
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

const campaignTableHeader = [
  { key: "campaign", title: "Campaign" },
  { key: "created", title: "Created" },
  { key: "createdBy", title: "Created By" },
  { key: "approvedBy", title: "Approved By" },
  { key: "budget", title: "Budget" },
  { key: "amount", title: "Amount" },
  { key: "status", title: "Status" },
  { key: "actions", title: "Actions", headerClassName: "text-left", cellClassName: "text-left" },
];

const CampaignsPage = () => {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [detailsCampaignId, setDetailsCampaignId] = useState(null);
  const [reviewCampaign, setReviewCampaign] = useState(null);
  const [advanceRow, setAdvanceRow] = useState(null);
  const [invoiceUploadOpen, setInvoiceUploadOpen] = useState(false);
  const [invoiceVendorRow, setInvoiceVendorRow] = useState(null);
  const [invoiceCampaignPrefill, setInvoiceCampaignPrefill] = useState(null);
  const [invoiceReview, setInvoiceReview] = useState(null);
  const [markPaidRow, setMarkPaidRow] = useState(null);

  const { user } = useAuth();
  const { hasPermission } = useRBAC();
  const { data: corporateUserContext = null } = useGetCorporateUserDetailsQuery();
  const access = useMemo(
    () => buildCampaignAccess({ user, corporateUserContext, hasPermission }),
    [user, corporateUserContext, hasPermission],
  );

  const {
    data: campaignsData = [],
    isLoading: campaignsLoading,
    isError: campaignsError,
    refetch: refetchCampaigns,
  } = useGetCampaignsQuery();
  const {
    data: vendorsData = [],
    isError: vendorsError,
  } = useGetCampaignVendorsQuery();
  const {
    data: detailsData,
    refetch: refetchDetails,
  } = useGetCampaignDetailQuery(detailsCampaignId, {
    skip: !detailsCampaignId,
  });

  const [createCampaign, { isLoading: creatingCampaign }] =
    useCreateCampaignMutation();
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

  const campaigns = campaignsData;
  const vendors = vendorsData;
  const detailsCampaign =
    detailsData ||
    campaigns.find((campaign) => campaign.id === detailsCampaignId) ||
    null;

  const filteredCampaigns = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return campaigns;
    return campaigns.filter((campaign) => {
      const name = String(campaign.name || "").toLowerCase();
      const createdBy = String(campaign.createdBy || "").toLowerCase();
      return name.includes(query) || createdBy.includes(query);
    });
  }, [campaigns, search]);

  const stats = useMemo(
    () => ({
      total: campaigns.length,
      pending: campaigns.filter((campaign) => campaign.status === "pending_approval").length,
      approved: campaigns.filter((campaign) => campaign.status === "approved").length,
      totalBudget: campaigns.reduce((sum, campaign) => sum + Number(campaign.budget || 0), 0),
    }),
    [campaigns],
  );
  const firstPendingCampaign = campaigns.find(
    (campaign) => campaign.status === "pending_approval",
  );

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
            value = formatCurrency(campaign.budget);
            break;
          case "amount":
            value = formatCurrency(campaign.totalCost);
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
                {access.canReviewCampaign && campaign.status === "pending_approval" && (
                  <Button size="sm" onClick={() => setReviewCampaign(campaign)}>
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
    <div className="space-y-6" data-testid="campaigns-page">
      <div className="flex flex-col gap-4 mb-8 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold font-['Manrope'] text-primary mb-2">
            Campaigns
          </h1>
          <p className="text-muted-foreground">
            Manage campaign approvals, vendor invoices, advances, and settlements.
          </p>
        </div>
        {access.canCreateCampaign && (
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Campaign
          </Button>
        )}
      </div>

      {campaignsError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          Failed to load campaigns. Please try again.
        </div>
      )}

      {vendorsError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">
          Failed to load campaign vendors. Campaign creation may be unavailable.
        </div>
      )}

      {access.canReviewCampaign && firstPendingCampaign && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Megaphone className="h-5 w-5" />
            <p>
              {stats.pending} campaign(s) need approval. Review{" "}
              <span className="font-medium">{firstPendingCampaign.name}</span>.
            </p>
          </div>
          <Button size="sm" onClick={() => setReviewCampaign(firstPendingCampaign)}>
            Review now
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <SummaryTile label="Total Campaigns" value={stats.total} />
        <SummaryTile label="Pending Approval" value={stats.pending} />
        <SummaryTile label="Approved" value={stats.approved} />
        <SummaryTile label="Total Budget" value={formatCurrency(stats.totalBudget)} />
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="p-4 border-b border-border flex flex-col md:flex-row md:items-center md:justify-between gap-3">
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
        <AppDataTable
          tableHeader={campaignTableHeader}
          tableData={filteredCampaigns}
          renderRow={renderCampaignRow}
          emptyMessage={campaignsLoading ? "Loading campaigns..." : "No campaigns found"}
        />
      </div>

      <CreateCampaignModal
        open={showCreate}
        onOpenChange={setShowCreate}
        vendors={vendors}
        onSubmit={handleCreateCampaign}
        saving={creatingCampaign}
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
        onSubmitInvoice={(row) => {
          if (!detailsCampaign) return;
          setInvoiceVendorRow(row);
          setInvoiceCampaignPrefill({
            campaignId: String(detailsCampaign.id || ""),
            campaignName: detailsCampaign.name || "",
            referenceNumber: detailsCampaign.referenceCode || "",
          });
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
          if (!open) {
            setInvoiceVendorRow(null);
            setInvoiceCampaignPrefill(null);
          }
        }}
        prefillVendor={
          invoiceVendorRow
            ? {
                vendorId: String(invoiceVendorRow.vendorId || ""),
                vendorName: invoiceVendorRow.vendorName || "",
              }
            : null
        }
        prefillCampaign={invoiceCampaignPrefill}
        lockCampaign={Boolean(invoiceCampaignPrefill?.campaignId)}
        onInvoiceAdded={async () => {
          setInvoiceVendorRow(null);
          setInvoiceCampaignPrefill(null);
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

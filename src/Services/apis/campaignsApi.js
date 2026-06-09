import { serviceApi } from "../serviceApi";

const toArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [value];
};

const unwrapList = (response, keys = []) => {
  if (Array.isArray(response)) return response;
  for (const key of keys) {
    if (Array.isArray(response?.[key])) return response[key];
  }
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.content)) return response.content;
  if (Array.isArray(response?.items)) return response.items;
  return [];
};

const normalizeId = (item = {}) =>
  String(item.uuid ?? item.id ?? item.vendorId ?? item.vendor_id ?? "");

const normalizeStatus = (status = "") =>
  String(status || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const normalizePayment = (payment = {}) => ({
  id: normalizeId(payment),
  paymentType: normalizeStatus(payment.paymentType ?? payment.payment_type),
  amount: toNumber(payment.amount),
  mode: payment.mode || payment.paymentMode || payment.payment_mode || "",
  referenceNo:
    payment.referenceNo ?? payment.reference_no ?? payment.reference ?? "",
  paymentDate:
    payment.paymentDate ?? payment.payment_date ?? payment.date ?? "",
  recordedBy:
    payment.recordedBy ??
    payment.recorded_by ??
    payment.recordedByName ??
    payment.recorded_by_name ??
    "",
});

const normalizeInvoice = (invoice = {}) => {
  const payments = toArray(invoice.payments).map(normalizePayment);
  const details = invoice.details ?? invoice.invoiceDetails ?? invoice.invoice_details ?? null;
  return {
    id: normalizeId(invoice),
    campaignId:
      invoice.campaignId ?? invoice.campaign_id ?? invoice.campaignUuid ?? "",
    vendorId: String(invoice.vendorId ?? invoice.vendor_id ?? ""),
    vendorName: invoice.vendorName ?? invoice.vendor_name ?? "",
    invoiceNumber:
      invoice.invoiceNumber ?? invoice.invoice_number ?? invoice.number ?? "",
    amount: toNumber(invoice.amount),
    submittedDate:
      invoice.submittedDate ?? invoice.submitted_date ?? invoice.createdDate ?? "",
    status: normalizeStatus(invoice.status),
    submittedBy:
      invoice.submittedBy ?? invoice.submitted_by ?? invoice.submittedByName ?? "",
    checkedBy: invoice.checkedBy ?? invoice.checked_by ?? "",
    approvedBy: invoice.approvedBy ?? invoice.approved_by ?? "",
    advancesTotal: toNumber(invoice.advancesTotal ?? invoice.advances_total),
    settledTotal: toNumber(invoice.settledTotal ?? invoice.settled_total),
    outstanding: toNumber(invoice.outstanding),
    details,
    payments,
  };
};

const normalizeVendorCost = (vendor = {}) => ({
  vendorId: String(vendor.vendorId ?? vendor.vendor_id ?? vendor.id ?? ""),
  vendorName:
    vendor.vendorName ?? vendor.vendor_name ?? vendor.name ?? vendor.companyName ?? "",
  cost: toNumber(vendor.cost ?? vendor.netCost ?? vendor.net_cost ?? vendor.amount),
  netCost: toNumber(vendor.netCost ?? vendor.net_cost ?? vendor.cost ?? vendor.amount),
  grossCost: toNumber(vendor.grossCost ?? vendor.gross_cost),
  gstOption: vendor.gstOption ?? vendor.gst_option ?? "",
});

export const normalizeCampaign = (campaign = {}) => {
  const totalCost = toNumber(campaign.totalCost ?? campaign.total_cost);
  const vendors = toArray(
    campaign.vendors ?? campaign.vendorCosts ?? campaign.vendor_costs,
  ).map(normalizeVendorCost);
  const invoices = toArray(campaign.invoices).map(normalizeInvoice);
  const vendorBreakdown = toArray(campaign.vendorBreakdown).map((row) => {
    const invoice = row.invoice ? normalizeInvoice(row.invoice) : null;
    const rowInvoices = toArray(row.invoices).map(normalizeInvoice);
    const advances = toArray(row.advances).map(normalizePayment);
    const payments = toArray(row.payments).map(normalizePayment);
    return {
      vendorId: String(row.vendorId ?? row.vendor_id ?? ""),
      vendorName: row.vendorName ?? row.vendor_name ?? "",
      cost: toNumber(row.cost),
      invoiceCost: toNumber(row.invoiceCost ?? row.invoice_cost),
      status: normalizeStatus(row.status) || "no_invoice",
      invoice,
      invoices: rowInvoices.length ? rowInvoices : invoice ? [invoice] : [],
      advancesTotal: toNumber(row.advancesTotal ?? row.advances_total),
      settledTotal: toNumber(row.settledTotal ?? row.settled_total),
      outstanding: toNumber(row.outstanding),
      advances,
      payments,
    };
  });
  const invoiceSummary = campaign.invoiceSummary ?? campaign.invoice_summary ?? {};

  return {
    id: normalizeId(campaign),
    name: campaign.name ?? campaign.campaignName ?? "",
    createdDate:
      campaign.createdDate ?? campaign.created_date ?? campaign.createdAt ?? "",
    createdBy: campaign.createdBy ?? campaign.created_by ?? "",
    approvedBy: campaign.approvedBy ?? campaign.approved_by ?? "",
    budget: toNumber(campaign.budget),
    totalCost,
    includeGst: Boolean(
      campaign.includeGst ?? campaign.include_gst ?? campaign.gstIncluded ?? false,
    ),
    gstOption: campaign.gstOption ?? campaign.gst_option ?? "",
    budgetGstOption:
      campaign.budgetGstOption ??
      campaign.budget_gst_option ??
      campaign.gstOption ??
      campaign.gst_option ??
      "",
    totalCostGstOption:
      campaign.totalCostGstOption ??
      campaign.total_cost_gst_option ??
      campaign.gstOption ??
      campaign.gst_option ??
      "",
    budgetGrossAmount: toNumber(
      campaign.budgetGrossAmount ?? campaign.budget_gross_amount,
    ),
    budgetNetAmount: toNumber(
      campaign.budgetNetAmount ?? campaign.budget_net_amount ?? campaign.budget,
    ),
    grossAmount: toNumber(
      campaign.grossAmount ?? campaign.gross_amount ?? totalCost,
    ),
    netAmount: toNumber(campaign.netAmount ?? campaign.net_amount ?? totalCost),
    pendingAmount: toNumber(campaign.pendingAmount ?? campaign.pending_amount),
    startDate: campaign.startDate ?? campaign.start_date ?? "",
    endDate: campaign.endDate ?? campaign.end_date ?? "",
    vendors,
    status: normalizeStatus(campaign.status),
    remark:
      campaign.remark ??
      campaign.remarks ??
      campaign.notes ??
      campaign.note ??
      "",
    referenceCode:
      campaign.referenceCode ?? campaign.reference_code ?? campaign.refCode ?? "",
    invoices,
    vendorBreakdown,
    invoiceSummary: {
      totalVendors: toNumber(invoiceSummary.totalVendors ?? invoiceSummary.total_vendors),
      noInvoice: toNumber(invoiceSummary.noInvoice ?? invoiceSummary.no_invoice),
      pending: toNumber(invoiceSummary.pending),
      pendingCheck: toNumber(invoiceSummary.pendingCheck ?? invoiceSummary.pending_check),
      pendingApproval: toNumber(invoiceSummary.pendingApproval ?? invoiceSummary.pending_approval),
      pendingPayment: toNumber(invoiceSummary.pendingPayment ?? invoiceSummary.pending_payment),
      paid: toNumber(invoiceSummary.paid),
      rejected: toNumber(invoiceSummary.rejected),
    },
  };
};

export const normalizeCampaignListResponse = (response) =>
  unwrapList(response, ["campaigns"]).map(normalizeCampaign);

export const EMPTY_CAMPAIGN_LIST_PAGE = {
  items: [],
  page: 0,
  size: 20,
  totalElements: 0,
  totalPages: 0,
  numberOfElements: 0,
  first: true,
  last: true,
  totalCampaigns: 0,
  totalPending: 0,
  totalApproved: 0,
  totalBudget: 0,
  totalCost: 0,
};

/** Spring page response: { content, pageable, totalElements, totalPages, ... } */
export const normalizeCampaignPageResponse = (response = {}) => {
  const items = normalizeCampaignListResponse(response);
  const page = Number(
    response.number ?? response.page ?? response?.pageable?.pageNumber ?? 0,
  );
  const size = Number(
    response.size ?? response?.pageable?.pageSize ?? (items.length || 20),
  );
  const totalElements = Number(response.totalElements ?? items.length);
  const totalPages = Number(
    response.totalPages ?? (size > 0 ? Math.ceil(totalElements / size) : 0),
  );

  return {
    items,
    page,
    size,
    totalElements,
    totalPages,
    numberOfElements: Number(response.numberOfElements ?? items.length),
    first: response.first ?? page === 0,
    last: response.last ?? (totalPages > 0 ? page >= totalPages - 1 : true),
    totalCampaigns: toNumber(response.totalCampaigns ?? response.total_campaigns ?? totalElements),
    totalPending: toNumber(response.totalPending ?? response.total_pending),
    totalApproved: toNumber(response.totalApproved ?? response.total_approved),
    totalBudget: toNumber(response.totalBudget ?? response.total_budget),
    totalCost: toNumber(response.totalCost ?? response.total_cost),
  };
};

export const normalizeVendorCampaignsResponse = (response) =>
  normalizeCampaignListResponse(response).filter(
    (campaign) => campaign.status === "approved",
  );

export const normalizeCampaignVendorsResponse = (response) =>
  unwrapList(response, ["vendors"]).map((vendor) => ({
    id: String(vendor.id ?? vendor.uuid ?? vendor.vendorId ?? ""),
    name: vendor.name ?? vendor.vendorName ?? vendor.companyName ?? "",
  }));

export const campaignsApi = serviceApi.injectEndpoints({
  endpoints: (builder) => ({
    getCampaigns: builder.query({
      query: (params = {}) => {
        const { page = 0, size = 20, search, ...rest } = params;
        return {
          url: "/campaigns",
          method: "GET",
          params: {
            page,
            size,
            ...(search ? { search } : {}),
            ...rest,
          },
        };
      },
      transformResponse: normalizeCampaignPageResponse,
      providesTags: [{ type: "Campaigns", id: "LIST" }],
    }),
    createCampaign: builder.mutation({
      query: (body) => ({ url: "/campaigns", method: "POST", body }),
      invalidatesTags: [{ type: "Campaigns", id: "LIST" }],
    }),
    updateCampaign: builder.mutation({
      query: ({ id, body }) => ({
        url: `/campaigns/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Campaigns", id },
        { type: "Campaigns", id: "LIST" },
      ],
    }),
    getCampaignDetail: builder.query({
      query: (id) => ({ url: `/campaigns/${id}`, method: "GET" }),
      transformResponse: normalizeCampaign,
      providesTags: (result, error, id) => [{ type: "Campaigns", id }],
    }),
    approveCampaign: builder.mutation({
      query: ({ id, body }) => ({
        url: `/campaigns/${id}/approve`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Campaigns", id },
        { type: "Campaigns", id: "LIST" },
      ],
    }),
    updateCampaignStatus: builder.mutation({
      query: ({ id, body }) => ({
        url: `/campaigns/${id}/status`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Campaigns", id },
        { type: "Campaigns", id: "LIST" },
      ],
    }),
    getCampaignVendors: builder.query({
      query: () => ({
        url: "/vendors",
        method: "GET",
        // params: { type: "creator,influencer,vendor" },
      }),
      transformResponse: normalizeCampaignVendorsResponse,
      providesTags: ["Vendors"],
    }),
    getVendorCampaigns: builder.query({
      query: (vendorId) => ({
        url: `/vendors/${vendorId}/campaigns`,
        method: "GET",
      }),
      transformResponse: normalizeVendorCampaignsResponse,
      providesTags: (result, error, vendorId) => [
        { type: "Campaigns", id: `VENDOR_${vendorId}` },
      ],
    }),
    submitCampaignInvoice: builder.mutation({
      query: ({ campaignId, body }) => ({
        url: `/campaigns/${campaignId}/invoices`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, { campaignId }) => [
        { type: "Campaigns", id: campaignId },
        { type: "Campaigns", id: "LIST" },
      ],
    }),
    recordCampaignAdvance: builder.mutation({
      query: ({ campaignId, body }) => ({
        url: `/campaigns/${campaignId}/advances`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, { campaignId }) => [
        { type: "Campaigns", id: campaignId },
        { type: "Campaigns", id: "LIST" },
      ],
    }),
    checkCampaignInvoice: builder.mutation({
      query: ({ invoiceId, body }) => ({
        url: `/invoices/${invoiceId}/check`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Campaigns"],
    }),
    approveCampaignInvoice: builder.mutation({
      query: ({ invoiceId, body }) => ({
        url: `/invoices/${invoiceId}/approve`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Campaigns"],
    }),
    markCampaignInvoicePaid: builder.mutation({
      query: ({ invoiceId, body }) => ({
        url: `/invoices/${invoiceId}/payments`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Campaigns"],
    }),
  }),
});

export const {
  useGetCampaignsQuery,
  useCreateCampaignMutation,
  useUpdateCampaignMutation,
  useGetCampaignDetailQuery,
  useApproveCampaignMutation,
  useUpdateCampaignStatusMutation,
  useGetCampaignVendorsQuery,
  useGetVendorCampaignsQuery,
  useSubmitCampaignInvoiceMutation,
  useRecordCampaignAdvanceMutation,
  useCheckCampaignInvoiceMutation,
  useApproveCampaignInvoiceMutation,
  useMarkCampaignInvoicePaidMutation,
} = campaignsApi;

import { serviceApi } from "../serviceApi";
import { CREDIT_INVALIDATION_TAGS } from "../../constants/creditActions";

const getListData = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.content)) return response.content;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.items)) return response.items;
  return [];
};

const getEntityId = (entity) => entity?.id ?? entity?.poId ?? entity?.po_id;

const provideListTags = (type, result) => [
  { type, id: "LIST" },
  ...getListData(result)
    .map(getEntityId)
    .filter((id) => id !== undefined && id !== null)
    .map((id) => ({ type, id })),
];

const provideEntityTag = (type, id, result) => {
  const entityId = id ?? getEntityId(result);
  return entityId !== undefined && entityId !== null
    ? [{ type, id: entityId }]
    : [{ type, id: "LIST" }];
};

const invalidateEntityAndList = (type, id) => [
  { type, id: "LIST" },
  ...(id !== undefined && id !== null ? [{ type, id }] : []),
];

export const purchaseOrdersMasterDataApi = serviceApi.injectEndpoints({
  endpoints: (builder) => ({
    // GET /purchase-orders
    // Lists purchase orders. Contract accepts plain arrays and common envelope
    // shapes; the page normalizes those response shapes.
    getPurchaseOrders: builder.query({
      query: (params) => ({
        url: "/purchase-orders",
        method: "GET",
        params,
      }),
      providesTags: (result) => provideListTags("PurchaseOrders", result),
    }),
    // GET /purchase-orders/pending-approvals
    // Lists POs pending the current user's approval.
    getPendingPurchaseOrderApprovals: builder.query({
      query: () => ({
        url: "/purchase-orders/pending-approvals",
        method: "GET",
      }),
      providesTags: (result) => [
        { type: "Approvals", id: "LIST" },
        ...provideListTags("PurchaseOrders", result),
      ],
    }),
    // GET /purchase-orders/{id}
    // Fetches the full PO detail shape, including lines, totals, and approvals.
    getPurchaseOrderById: builder.query({
      query: (id) => ({ url: `/purchase-orders/${id}`, method: "GET" }),
      providesTags: (result, error, id) => provideEntityTag("PurchaseOrders", id, result),
    }),
    // GET /purchase-orders/{id}/download
    // Returns a URL-like response: url/downloadUrl/documentUrl/fileUrl.
    getPurchaseOrderDownloadUrl: builder.query({
      query: (id) => ({ url: `/purchase-orders/${id}/download`, method: "GET" }),
      providesTags: (result, error, id) => provideEntityTag("PurchaseOrders", id, result),
    }),
    // GET /format-config
    // Default-format compatibility alias. Keep this even when multiple saved
    // formats are active, because current UI uses it as the fallback.
    getPurchaseOrderFormatConfig: builder.query({
      query: () => ({ url: "/format-config", method: "GET" }),
      providesTags: (result) => [
        { type: "PurchaseOrderFormatConfig", id: "DEFAULT" },
        ...provideEntityTag("PurchaseOrderFormatConfig", undefined, result),
      ],
    }),
    // PUT /format-config
    // Updates the default format through the alias. Future/default-only flows
    // can use this; current multi-format builder usually updates by id.
    updatePurchaseOrderFormatConfigAlias: builder.mutation({
      query: (body) => ({ url: "/format-config", method: "PUT", body }),
      invalidatesTags: (result) => [
        { type: "PurchaseOrderFormatConfig", id: "DEFAULT" },
        { type: "PurchaseOrderFormatConfig", id: "LIST" },
        ...provideEntityTag("PurchaseOrderFormatConfig", undefined, result),
      ],
    }),
    // GET /po-format-configs
    // Lists all active saved formats available for PO creation.
    getPurchaseOrderFormatConfigs: builder.query({
      query: () => ({ url: "/po-format-configs", method: "GET" }),
      providesTags: (result) => provideListTags("PurchaseOrderFormatConfig", result),
    }),
    // GET /po-format-configs/{id}
    // Fetch one format. Useful if list endpoint later returns summaries only.
    getPurchaseOrderFormatConfigById: builder.query({
      query: (id) => ({ url: `/po-format-configs/${id}`, method: "GET" }),
      providesTags: (result, error, id) => provideEntityTag("PurchaseOrderFormatConfig", id, result),
    }),
    // POST /po-format-configs
    // Creates a new saved PO format.
    createPurchaseOrderFormatConfig: builder.mutation({
      query: (body) => ({ url: "/po-format-configs", method: "POST", body }),
      invalidatesTags: [
        { type: "PurchaseOrderFormatConfig", id: "LIST" },
        { type: "PurchaseOrderFormatConfig", id: "DEFAULT" },
        "Settings",
      ],
    }),
    // PUT /po-format-configs/{id}
    // Updates one saved PO format. The current UI can send the whole config.
    updatePurchaseOrderFormatConfig: builder.mutation({
      query: ({ id, body }) => ({ url: `/po-format-configs/${id}`, method: "PUT", body }),
      invalidatesTags: (result, error, { id }) => [
        ...invalidateEntityAndList("PurchaseOrderFormatConfig", id),
        { type: "PurchaseOrderFormatConfig", id: "DEFAULT" },
      ],
    }),
    // DELETE /po-format-configs/{id}
    // Soft-deletes a format for future use. Historical PO snapshots stay intact.
    deletePurchaseOrderFormatConfig: builder.mutation({
      query: (id) => ({ url: `/po-format-configs/${id}`, method: "DELETE" }),
      invalidatesTags: (result, error, id) => [
        ...invalidateEntityAndList("PurchaseOrderFormatConfig", id),
        { type: "PurchaseOrderFormatConfig", id: "DEFAULT" },
      ],
    }),
    // POST /po-format-configs/{id}/default
    // Marks a saved format as the default for new POs.
    setDefaultPurchaseOrderFormatConfig: builder.mutation({
      query: (id) => ({ url: `/po-format-configs/${id}/default`, method: "POST" }),
      invalidatesTags: (result, error, id) => [
        ...invalidateEntityAndList("PurchaseOrderFormatConfig", id),
        { type: "PurchaseOrderFormatConfig", id: "DEFAULT" },
      ],
    }),
    // POST /branding/logo
    // Tenant-wide logo upload. Pass FormData with `file`; backend returns
    // logoUrl and optional logoS3Key for PO previews/snapshots.
    uploadPurchaseOrderTenantLogo: builder.mutation({
      query: (body) => ({ url: "/branding/logo", method: "POST", body }),
      invalidatesTags: [
        { type: "PurchaseOrderFormatConfig", id: "LIST" },
        { type: "PurchaseOrderFormatConfig", id: "DEFAULT" },
        "Settings",
      ],
    }),
    scanPurchaseOrder: builder.mutation({
      query: (body) => ({
        url: "/scan/extract-po-data",
        method: "POST",
        body,
      }),
      invalidatesTags: [...CREDIT_INVALIDATION_TAGS],
    }),
    // POST /purchase-orders/draft
    // Saves a PO draft. Payload shape is the same as createPurchaseOrder.
    savePurchaseOrderDraft: builder.mutation({
      query: (body) => ({ url: "/purchase-orders/draft", method: "POST", body }),
      invalidatesTags: [{ type: "PurchaseOrders", id: "LIST" }, ...CREDIT_INVALIDATION_TAGS],
    }),
    // POST /purchase-orders
    // Creates/submits a PO for approval. Preferred backend behavior returns
    // PENDING_APPROVAL; migration fallback may return DRAFT, then UI can submit.
    createPurchaseOrder: builder.mutation({
      query: (body) => ({ url: "/purchase-orders", method: "POST", body }),
      invalidatesTags: [
        { type: "PurchaseOrders", id: "LIST" },
        { type: "Approvals", id: "LIST" },
        ...CREDIT_INVALIDATION_TAGS,
      ],
    }),
    // PUT /purchase-orders/{id}
    // Updates an editable PO such as DRAFT or SENT_BACK. Payload shape is the
    // same as createPurchaseOrder.
    updatePurchaseOrder: builder.mutation({
      query: ({ id, body }) => ({
        url: `/purchase-orders/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { id } = {}) => [
        ...invalidateEntityAndList("PurchaseOrders", id),
        { type: "Approvals", id: "LIST" },
      ],
    }),
    // POST /purchase-orders/{id}/submit
    // Moves an existing DRAFT or SENT_BACK PO into PENDING_APPROVAL.
    submitPurchaseOrder: builder.mutation({
      query: (id) => ({
        url: `/purchase-orders/${id}/submit`,
        method: "POST",
      }),
      invalidatesTags: (result, error, id) => [
        ...invalidateEntityAndList("PurchaseOrders", id),
        { type: "Approvals", id: "LIST" },
        ...CREDIT_INVALIDATION_TAGS,
      ],
    }),
    // POST /purchase-orders/{id}/approve
    // Body: { action: "Approved" | "Rejected" | "Sent Back", comments }.
    // Final approval should return ISSUED, not APPROVED.
    approvePurchaseOrder: builder.mutation({
      query: ({ id, body }) => ({
        url: `/purchase-orders/${id}/approve`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        ...invalidateEntityAndList("PurchaseOrders", id),
        { type: "Approvals", id: "LIST" },
      ],
    }),
    // POST /purchase-orders/{id}/pdf
    // Future endpoint from the contract to trigger PDF generation/regeneration.
    generatePurchaseOrderPdf: builder.mutation({
      query: (id) => ({ url: `/purchase-orders/${id}/pdf`, method: "POST" }),
      invalidatesTags: (result, error, id) => provideEntityTag("PurchaseOrders", id, result),
    }),
    // GET /purchase-orders/{id}/pdf
    // Future signed-url PDF endpoint. Current UI uses /download alias.
    getPurchaseOrderPdfUrl: builder.query({
      query: (id) => ({ url: `/purchase-orders/${id}/pdf`, method: "GET" }),
      providesTags: (result, error, id) => provideEntityTag("PurchaseOrders", id, result),
    }),
    // GET /field-registry
    // Future dynamic builder registry. Current builder uses the local field set.
    getPurchaseOrderFieldRegistry: builder.query({
      query: () => ({ url: "/field-registry", method: "GET" }),
      providesTags: [{ type: "MasterData", id: "PO_FIELD_REGISTRY" }],
    }),
    // GET /master/tds-sections
    // Future TDS selector source. Current UI accepts free text/percent.
    getPurchaseOrderTdsSections: builder.query({
      query: () => ({ url: "/master/tds-sections", method: "GET" }),
      providesTags: [{ type: "MasterData", id: "PO_TDS_SECTIONS" }],
    }),
    // GET /master/states
    // Future state selector source for placeOfSupply.
    getPurchaseOrderStates: builder.query({
      query: () => ({ url: "/master/states", method: "GET" }),
      providesTags: [{ type: "MasterData", id: "PO_STATES" }],
    }),
    // GET /master/hsn-rates?code=...
    // Future HSN/GST rate lookup. Current UI uses fixed GST choices.
    getPurchaseOrderHsnRate: builder.query({
      query: (code) => ({
        url: "/master/hsn-rates",
        method: "GET",
        params: { code },
      }),
      providesTags: (result, error, code) => [{ type: "MasterData", id: `PO_HSN_${code}` }],
    }),
  }),
});

export const {
  useGetPurchaseOrdersQuery,
  useGetPendingPurchaseOrderApprovalsQuery,
  useGetPurchaseOrderByIdQuery,
  useLazyGetPurchaseOrderByIdQuery,
  useLazyGetPurchaseOrderDownloadUrlQuery,
  useGetPurchaseOrderFormatConfigQuery,
  useUpdatePurchaseOrderFormatConfigAliasMutation,
  useGetPurchaseOrderFormatConfigsQuery,
  useGetPurchaseOrderFormatConfigByIdQuery,
  useLazyGetPurchaseOrderFormatConfigByIdQuery,
  useCreatePurchaseOrderFormatConfigMutation,
  useUpdatePurchaseOrderFormatConfigMutation,
  useDeletePurchaseOrderFormatConfigMutation,
  useSetDefaultPurchaseOrderFormatConfigMutation,
  useUploadPurchaseOrderTenantLogoMutation,
  useScanPurchaseOrderMutation,
  useSavePurchaseOrderDraftMutation,
  useCreatePurchaseOrderMutation,
  useUpdatePurchaseOrderMutation,
  useSubmitPurchaseOrderMutation,
  useApprovePurchaseOrderMutation,
  useGeneratePurchaseOrderPdfMutation,
  useGetPurchaseOrderPdfUrlQuery,
  useLazyGetPurchaseOrderPdfUrlQuery,
  useGetPurchaseOrderFieldRegistryQuery,
  useGetPurchaseOrderTdsSectionsQuery,
  useGetPurchaseOrderStatesQuery,
  useGetPurchaseOrderHsnRateQuery,
  useLazyGetPurchaseOrderHsnRateQuery,
} = purchaseOrdersMasterDataApi;

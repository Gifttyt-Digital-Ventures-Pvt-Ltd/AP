import { serviceApi } from "../serviceApi";
import { normalizeApprovalHistoryEntries } from "../../pages/invoices/utils/invoiceHistory";

const normalizeDocumentType = (documentType = "") =>
  String(documentType || "").trim().toUpperCase();

const getDocumentTag = (documentType, documentId) => {
  const type = normalizeDocumentType(documentType);
  const id = documentId ?? "LIST";
  if (type === "PO") return { type: "PurchaseOrders", id };
  if (type === "TI" || type === "PI") return { type: "Invoices", id };
  if (type === "GRN") return { type: "GoodsReceipt", id };
  return { type: "PaymentSchedules", id: `${type || "DOCUMENT"}:${id}` };
};

export const paymentSchedulesApi = serviceApi.injectEndpoints({
  endpoints: (builder) => ({
    getDocumentPaymentSchedule: builder.query({
      query: ({ documentType, documentId }) => ({
        url: `/payment-schedules/${normalizeDocumentType(documentType)}/${documentId}`,
        method: "GET",
      }),
      providesTags: (_result, _error, { documentType, documentId } = {}) => [
        { type: "PaymentSchedules", id: `${normalizeDocumentType(documentType)}:${documentId}` },
        getDocumentTag(documentType, documentId),
      ],
    }),
    getDocumentPaymentScheduleHistory: builder.query({
      query: ({ documentType, documentId }) => ({
        url: `/payment-schedules/${normalizeDocumentType(documentType)}/${documentId}/history`,
        method: "GET",
      }),
      transformResponse: (response) => normalizeApprovalHistoryEntries(response),
      providesTags: (_result, _error, { documentType, documentId } = {}) => [
        { type: "PaymentSchedules", id: `HISTORY:${normalizeDocumentType(documentType)}:${documentId}` },
        { type: "PaymentSchedules", id: `${normalizeDocumentType(documentType)}:${documentId}` },
      ],
    }),
    updateDocumentPaymentSchedule: builder.mutation({
      query: ({ documentType, documentId, body }) => ({
        url: `/payment-schedules/${normalizeDocumentType(documentType)}/${documentId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, { documentType, documentId } = {}) => [
        { type: "PaymentSchedules", id: `${normalizeDocumentType(documentType)}:${documentId}` },
        { type: "PaymentSchedules", id: `HISTORY:${normalizeDocumentType(documentType)}:${documentId}` },
        getDocumentTag(documentType, documentId),
      ],
    }),
  }),
});

export const {
  useGetDocumentPaymentScheduleQuery,
  useLazyGetDocumentPaymentScheduleQuery,
  useGetDocumentPaymentScheduleHistoryQuery,
  useUpdateDocumentPaymentScheduleMutation,
} = paymentSchedulesApi;

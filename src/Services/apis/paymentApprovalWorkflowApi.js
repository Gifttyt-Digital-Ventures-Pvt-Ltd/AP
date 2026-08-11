import { serviceApi } from "../serviceApi";
import { extractListResponse } from "../utils/payloadMappers";
import { DEFAULT_CURRENCY } from "../../utils/currency";

const toArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const asNumberOrNull = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toStringId = (value) => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const normalizeUser = (user = {}) => ({
  id: toStringId(user.employeeId ?? user.empId ?? user.userId ?? user.id),
  employeeId: user.employeeId ?? user.empId ?? user.userId ?? user.id ?? null,
  name: String(user.name || user.userName || user.employeeName || user.email || "").trim(),
  email: String(user.email || "").trim(),
  role: String(user.role || user.roleName || user.permissionType || "").trim(),
});

const normalizeApprover = (approver = {}, index = 0) => {
  const userId = toStringId(
    approver.approverId ??
      approver.employeeId ??
      approver.empId ??
      approver.userId ??
      approver.id,
  );

  return {
    id: `${userId || "approver"}-${index}`,
    userId,
    userName: String(
      approver.approverName ||
        approver.userName ||
        approver.employeeName ||
        approver.name ||
        "",
    ).trim(),
    approvalOrder:
      asNumberOrNull(approver.level ?? approver.approvalOrder ?? approver.order) ||
      index + 1,
  };
};

const extractPaymentWorkflowList = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.list)) return response.list;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.workflows)) return response.workflows;
  if (Array.isArray(response?.paymentApprovalWorkflows)) {
    return response.paymentApprovalWorkflows;
  }
  if (Array.isArray(response?.workflowTypeId?.PAYMENT_AMOUNT)) {
    return response.workflowTypeId.PAYMENT_AMOUNT;
  }
  return [];
};

const normalizePaymentWorkflow = (workflow = {}) => {
  const paymentAdmin =
    workflow.paymentAdmin ??
    workflow.payment_admin ??
    workflow.admin ??
    workflow.adminUser ??
    workflow.paymentAdminUser ??
    null;

  return {
    workflowId:
      workflow.workflowId ??
      workflow.paymentWorkflowId ??
      workflow.payment_approval_workflow_id ??
      workflow.id ??
      null,
    name: workflow.name ?? workflow.workflowName ?? workflow.workflow_name ?? "",
    workflowType: "PAYMENT_AMOUNT",
    minAmount:
      workflow.minAmount ??
      workflow.min_amount ??
      null,
    maxAmount:
      workflow.maxAmount ??
      workflow.max_amount ??
      null,
    currency: workflow.currency ?? DEFAULT_CURRENCY,
    isSequential:
      workflow.isSequential === true ||
      workflow.is_sequential === true ||
      workflow.approvalMode === "sequential",
    isActive: workflow.isActive !== false && workflow.is_active !== false,
    approvers: toArray(workflow.approvers ?? workflow.paymentApprovers),
    paymentAdminId:
      workflow.paymentAdminId ??
      workflow.payment_admin_id ??
      workflow.adminId ??
      paymentAdmin?.userId ??
      paymentAdmin?.employeeId ??
      paymentAdmin?.empId ??
      paymentAdmin?.id ??
      null,
    paymentAdminName:
      workflow.paymentAdminName ??
      workflow.payment_admin_name ??
      workflow.adminName ??
      paymentAdmin?.userName ??
      paymentAdmin?.employeeName ??
      paymentAdmin?.name ??
      "",
  };
};

export const paymentApprovalWorkflowApi = serviceApi.injectEndpoints({
  endpoints: (builder) => ({
    getPaymentApprovalWorkflows: builder.query({
      query: (params) => ({
        url: "/payment-approval-workflow/list",
        method: "GET",
        params,
      }),
      providesTags: ["PaymentApprovalWorkflow"],
      transformResponse: (response) =>
        extractPaymentWorkflowList(response).map(normalizePaymentWorkflow),
    }),
    getPaymentWorkflowAdmins: builder.query({
      query: () => ({
        url: "/payment-approval-workflow/admins",
        method: "GET",
      }),
      providesTags: ["PaymentApprovalWorkflow"],
      transformResponse: (response) =>
        extractListResponse(response).map(normalizeUser).filter((user) => user.id && user.name),
    }),
    getPaymentWorkflowApprovers: builder.query({
      query: () => ({
        url: "/payment-approval-workflow/approvers",
        method: "GET",
      }),
      providesTags: ["PaymentApprovalWorkflow"],
      transformResponse: (response) =>
        extractListResponse(response).map(normalizeUser).filter((user) => user.id && user.name),
    }),
    createPaymentApprovalWorkflow: builder.mutation({
      query: (body) => ({
        url: "/payment-approval-workflow/create",
        method: "POST",
        body,
      }),
      invalidatesTags: ["PaymentApprovalWorkflow"],
    }),
    updatePaymentApprovalWorkflow: builder.mutation({
      query: (body) => ({
        url: "/payment-approval-workflow/update",
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["PaymentApprovalWorkflow"],
    }),
    switchPaymentApprovalWorkflow: builder.mutation({
      query: (body) => ({
        url: "/payment-approval-workflow/switch",
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["PaymentApprovalWorkflow"],
    }),
    deletePaymentApprovalWorkflow: builder.mutation({
      query: (body) => ({
        url: "/payment-approval-workflow/delete",
        method: "DELETE",
        body,
      }),
      invalidatesTags: ["PaymentApprovalWorkflow"],
    }),
  }),
});

export const {
  useGetPaymentApprovalWorkflowsQuery,
  useGetPaymentWorkflowAdminsQuery,
  useGetPaymentWorkflowApproversQuery,
  useCreatePaymentApprovalWorkflowMutation,
  useUpdatePaymentApprovalWorkflowMutation,
  useSwitchPaymentApprovalWorkflowMutation,
  useDeletePaymentApprovalWorkflowMutation,
} = paymentApprovalWorkflowApi;

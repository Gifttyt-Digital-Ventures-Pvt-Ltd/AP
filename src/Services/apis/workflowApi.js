import { serviceApi } from "../serviceApi";
import { DEFAULT_CURRENCY } from "../../utils/currency";

const normalizeWorkflowTypeMap = (value) => {
  if (!value || typeof value !== "object") {
    return { GENERIC: [] };
  }

  return Object.entries(value).reduce((acc, [type, items]) => {
    acc[String(type || "").trim().toUpperCase()] = Array.isArray(items) ? items : [];
    return acc;
  }, {});
};

const normalizeWorkflowResponse = (workflow = {}) => {
  const vendors = Array.isArray(workflow.vendor) ? workflow.vendor : [];
  const departments = Array.isArray(workflow.department) ? workflow.department : [];
  const categories = Array.isArray(workflow.category)
    ? workflow.category
    : Array.isArray(workflow.categories)
      ? workflow.categories
      : [];
  const approvers = Array.isArray(workflow.approvers) ? workflow.approvers : [];

  return {
    workflowId: workflow.workflowId ?? null,
    name: workflow.name ?? "",
    vendor: vendors,
    department: departments,
    category: categories,
    minAmount: workflow.minAmount ?? null,
    maxAmount: workflow.maxAmount ?? null,
    currency: workflow.currency ?? DEFAULT_CURRENCY,
    isSequential: workflow.isSequential === true,
    isActive: workflow.isActive === true,
    approvers,
    workflowType: workflow.workflowType ?? null,
    currencies: Array.isArray(workflow.currencies) ? workflow.currencies : [],
  };
};

export const workflowApi = serviceApi.injectEndpoints({
  endpoints: (builder) => ({
    getWorkflowTypes: builder.query({
      query: () => ({ url: "/workflow/type", method: "GET" }),
      providesTags: ["Workflow"],
      transformResponse: (response) => (Array.isArray(response) ? response : []),
    }),
    getWorkflowInvoiceApprovers: builder.query({
      query: () => ({ url: "/workflow/invoice-approver", method: "GET" }),
      providesTags: ["Workflow"],
      transformResponse: (response) => (Array.isArray(response) ? response : []),
    }),
    getWorkflows: builder.query({
      query: (params) => ({ url: "/workflow/list", method: "GET", params }),
      providesTags: ["Workflow"],
      transformResponse: (response) => {
        const workflowTypeId = normalizeWorkflowTypeMap(response?.workflowTypeId);
        const normalizedEntries = Object.entries(workflowTypeId).reduce((acc, [type, items]) => {
          acc[type] = items.map((item) => normalizeWorkflowResponse(item));
          return acc;
        }, {});

        return {
          raw: response ?? null,
          workflowTypeId: normalizedEntries,
        };
      },
    }),
    createWorkflow: builder.mutation({
      query: (body) => ({ url: "/workflow/create", method: "POST", body }),
      invalidatesTags: ["Workflow"],
    }),
    updateWorkflow: builder.mutation({
      query: (body) => ({ url: "/workflow/update", method: "PATCH", body }),
      invalidatesTags: ["Workflow"],
    }),
    switchWorkflow: builder.mutation({
      query: (body) => ({ url: "/workflow/switch", method: "PATCH", body }),
      invalidatesTags: ["Workflow"],
    }),
    deleteWorkflow: builder.mutation({
      query: (body) => ({ url: "/workflow/delete", method: "DELETE", body }),
      invalidatesTags: ["Workflow"],
    }),
    testWorkflow: builder.mutation({
      query: (body) => ({ url: "/workflow/test", method: "POST", body }),
    }),
  }),
});

export const {
  useGetWorkflowTypesQuery,
  useGetWorkflowInvoiceApproversQuery,
  useGetWorkflowsQuery,
  useCreateWorkflowMutation,
  useUpdateWorkflowMutation,
  useSwitchWorkflowMutation,
  useDeleteWorkflowMutation,
  useTestWorkflowMutation,
} = workflowApi;

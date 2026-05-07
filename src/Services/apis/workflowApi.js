import { serviceApi } from "../serviceApi";

const normalizeWorkflowTypeMap = (value) => {
  if (!value || typeof value !== "object") {
    return {
      VENDOR_DEPARTMENT_AMOUNT: [],
      VENDOR_DEPARTMENT: [],
      DEPARTMENT_AMOUNT: [],
      VENDOR_AMOUNT: [],
      DEPARTMENT: [],
      VENDOR: [],
      AMOUNT: [],
      GENERIC: [],
    };
  }

  return {
    VENDOR_DEPARTMENT_AMOUNT: Array.isArray(value.VENDOR_DEPARTMENT_AMOUNT)
      ? value.VENDOR_DEPARTMENT_AMOUNT
      : [],
    VENDOR_DEPARTMENT: Array.isArray(value.VENDOR_DEPARTMENT) ? value.VENDOR_DEPARTMENT : [],
    DEPARTMENT_AMOUNT: Array.isArray(value.DEPARTMENT_AMOUNT) ? value.DEPARTMENT_AMOUNT : [],
    VENDOR_AMOUNT: Array.isArray(value.VENDOR_AMOUNT) ? value.VENDOR_AMOUNT : [],
    DEPARTMENT: Array.isArray(value.DEPARTMENT) ? value.DEPARTMENT : [],
    VENDOR: Array.isArray(value.VENDOR) ? value.VENDOR : [],
    AMOUNT: Array.isArray(value.AMOUNT) ? value.AMOUNT : [],
    GENERIC: Array.isArray(value.GENERIC) ? value.GENERIC : [],
  };
};

const normalizeWorkflowResponse = (workflow = {}) => {
  const vendors = Array.isArray(workflow.vendor) ? workflow.vendor : [];
  const departments = Array.isArray(workflow.department) ? workflow.department : [];
  const approvers = Array.isArray(workflow.approvers) ? workflow.approvers : [];

  return {
    workflowId: workflow.workflowId ?? null,
    name: workflow.name ?? "",
    vendor: vendors,
    department: departments,
    minAmount: workflow.minAmount ?? null,
    maxAmount: workflow.maxAmount ?? null,
    isSequential: workflow.isSequential === true,
    isActive: workflow.isActive === true,
    approvers,
    workflowType: workflow.workflowType ?? null,
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
      query: () => ({ url: "/workflow/list", method: "GET" }),
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

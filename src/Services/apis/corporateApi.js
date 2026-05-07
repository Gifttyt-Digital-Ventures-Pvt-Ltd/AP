import { serviceApi } from "../serviceApi";
import { normalizeCustomRolePermissionsResponse } from "../../utils/rbacPermissions";

const toBoolean = (value) => value === true;

const resolveCorporatePayload = (response) => {
  return response?.corporateUserDetails?.corporate || response?.corporate || response || null;
};

const normalizeCorporateSubscription = (corporate) => {
  if (!corporate || typeof corporate !== "object") {
    return {
      brandVoucher: false,
      giftCard: false,
      smartCard: false,
      vendorPayment: false,
      expense: false,
      advanceExpense: false,
      combined: false,
      liveTracking: false,
      voucherEnabled: false,
    };
  }

  return {
    brandVoucher: toBoolean(corporate.brandVoucher),
    giftCard: toBoolean(corporate.giftCard),
    smartCard: toBoolean(corporate.smartCard ?? corporate.smartcard),
    vendorPayment: toBoolean(corporate.vendorPayment),
    expense: toBoolean(corporate.expense),
    advanceExpense: toBoolean(corporate.advanceExpense),
    combined: toBoolean(
      corporate.combined ?? corporate.combinedExpense ?? corporate.expenseCombined
    ),
    liveTracking: toBoolean(corporate.liveTracking),
    voucherEnabled: toBoolean(corporate.voucherEnabled),
  };
};

const extractFirstEmployeeRole = (employeeDetails = null) => {
  if (!employeeDetails || typeof employeeDetails !== "object") return null;
  const assignedRoles = employeeDetails.assignedRoles;

  if (Array.isArray(assignedRoles)) {
    const firstRole = assignedRoles.find((role) => typeof role === "string" && role.trim());
    return firstRole ? firstRole.trim() : null;
  }

  if (typeof assignedRoles === "string") {
    const roles = assignedRoles
      .split(",")
      .map((role) => role.trim())
      .filter(Boolean);
    return roles[0] || null;
  }

  return null;
};

export const corporateApi = serviceApi.injectEndpoints({
  endpoints: (builder) => ({
    getCorporateDetails: builder.query({
      query: () => ({ url: "/corporate/details", method: "GET" }),
      transformResponse: (response) => {
        const corporate = resolveCorporatePayload(response);
        return {
          raw: response ?? null,
          corporate,
          subscription: normalizeCorporateSubscription(corporate),
        };
      },
    }),
    getCorporateUserDetails: builder.query({
      query: () => ({ url: "/corporate/user/details", method: "GET" }),
      transformResponse: (response) => {
        const corporate = response?.corporateUserDetails?.corporate || null;
        const corporateUser = response?.corporateUserDetails?.corporateUser || null;
        const employeeDetails = response?.employeeDetails || null;
        const effectiveRole = corporateUser?.role || extractFirstEmployeeRole(employeeDetails);

        return {
          raw: response ?? null,
          type: response?.type || null,
          corporate,
          corporateUser,
          employeeDetails,
          effectiveRole: effectiveRole || null,
        };
      },
    }),
    getEmployeeCustomRoles: builder.query({
      query: (employeeId) => ({
        url: `/corporate/custom-roles/employee/${employeeId}`,
        method: "GET",
      }),
      transformResponse: (response) => normalizeCustomRolePermissionsResponse(response),
    }),
    getCustomRoleScreens: builder.query({
      query: () => ({
        url: "/corporate/custom-roles/screens",
        method: "GET",
      }),
      transformResponse: (response) => (Array.isArray(response) ? response : []),
      providesTags: ["Users"],
    }),
    getCustomRoles: builder.query({
      query: () => ({
        url: "/corporate/custom-roles",
        method: "GET",
      }),
      transformResponse: (response) => {
        if (Array.isArray(response)) return response;
        if (Array.isArray(response?.data)) return response.data;
        if (Array.isArray(response?.roles)) return response.roles;
        return [];
      },
      providesTags: ["Users"],
    }),
    getCustomRoleById: builder.query({
      query: (roleId) => ({
        url: `/corporate/custom-roles/${roleId}`,
        method: "GET",
      }),
      providesTags: (_result, _error, roleId) => [{ type: "Users", id: roleId }],
    }),
    createCustomRole: builder.mutation({
      query: (body) => ({
        url: "/corporate/custom-roles",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Users"],
    }),
    updateCustomRole: builder.mutation({
      query: ({ roleId, body }) => ({
        url: `/corporate/custom-roles/${roleId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Users"],
    }),
    deleteCustomRole: builder.mutation({
      query: (roleId) => ({
        url: `/corporate/custom-roles/${roleId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Users"],
    }),
    assignPermissionsToCustomRole: builder.mutation({
      query: ({ roleId, permissions }) => ({
        url: `/corporate/custom-roles/${roleId}/permissions`,
        method: "POST",
        body: { permissions },
      }),
      invalidatesTags: ["Users"],
    }),
    removePermissionsFromCustomRole: builder.mutation({
      query: ({ roleId, permissions }) => ({
        url: `/corporate/custom-roles/${roleId}/permissions`,
        method: "DELETE",
        body: { permissions },
      }),
      invalidatesTags: ["Users"],
    }),
    assignCustomRoleToEmployees: builder.mutation({
      query: ({ roleId, employeeIds }) => ({
        url: `/corporate/custom-roles/${roleId}/employees`,
        method: "POST",
        body: { employeeIds },
      }),
      invalidatesTags: ["Users"],
    }),
    removeCustomRoleFromEmployees: builder.mutation({
      query: ({ roleId, employeeIds }) => ({
        url: `/corporate/custom-roles/${roleId}/employees`,
        method: "DELETE",
        body: { employeeIds },
      }),
      invalidatesTags: ["Users"],
    }),
    getCorporateEmployees: builder.query({
      query: ({
        type = "EMPLOYEES",
        limit = 100,
        offset = 0,
        search = "",
        programType,
      } = {}) => {
        const params = { type, limit, offset };
        if (search && String(search).trim()) {
          params.search = String(search).trim();
        }
        if (programType !== undefined && programType !== null) {
          params.programType = String(programType);
        }
        return {
          url: "/corporate/employees",
          method: "GET",
          params,
        };
      },
      transformResponse: (response, _meta, arg) => {
        const rows = Array.isArray(response?.data) ? response.data : [];
        const data = rows.map((item) => ({
          id: item?.id ?? null,
          empId: item?.empId ?? item?.id ?? "",
          name: item?.name ?? "",
          email: item?.email ?? "",
          phoneNumber: item?.phoneNumber ?? item?.mobile ?? "",
          role: item?.role ?? "",
          type: item?.type ?? "",
          status: item?.status ?? "",
          is_active: item?.isActive ?? item?.is_active ?? true,
          created_at: item?.createdAt ?? item?.created_at ?? null,
          programType: item?.programType ?? null,
          raw: item,
        }));
        return {
          raw: response ?? null,
          data,
          total: response?.total ?? data.length,
          totalEmployee: response?.totalEmployee ?? null,
          totalUser: response?.totalUser ?? null,
          totalChannelPartner: response?.totalChannelPartner ?? null,
          limit: response?.limit ?? arg?.limit ?? 100,
          offset: response?.offset ?? arg?.offset ?? 0,
        };
      },
      providesTags: ["Users"],
    }),
    addCorporateUsers: builder.mutation({
      query: (body) => ({
        url: "/corporate/user/add",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Users"],
    }),
    updateCorporateEmployee: builder.mutation({
      query: (body) => ({
        url: "/corporate/employee/update",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Users"],
    }),
    deleteCorporateEmployee: builder.mutation({
      query: ({ id }) => ({
        url: "/corporate/employee/delete",
        method: "DELETE",
        body: { id },
      }),
      invalidatesTags: ["Users"],
    }),
  }),
});

export const {
  useGetCorporateDetailsQuery,
  useGetCorporateUserDetailsQuery,
  useGetEmployeeCustomRolesQuery,
  useGetCustomRoleScreensQuery,
  useGetCustomRolesQuery,
  useGetCustomRoleByIdQuery,
  useCreateCustomRoleMutation,
  useUpdateCustomRoleMutation,
  useDeleteCustomRoleMutation,
  useAssignPermissionsToCustomRoleMutation,
  useRemovePermissionsFromCustomRoleMutation,
  useAssignCustomRoleToEmployeesMutation,
  useRemoveCustomRoleFromEmployeesMutation,
  useGetCorporateEmployeesQuery,
  useAddCorporateUsersMutation,
  useUpdateCorporateEmployeeMutation,
  useDeleteCorporateEmployeeMutation,
} = corporateApi;

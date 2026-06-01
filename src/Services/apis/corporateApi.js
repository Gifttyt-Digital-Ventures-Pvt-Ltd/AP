import { serviceApi } from "../serviceApi";
import { normalizeCustomRolePermissionsResponse } from "../../utils/rbacPermissions";

const toBoolean = (value) => value === true;

const resolveCorporatePayload = (response) => {
  return (
    response?.corporateUserDetails?.corporate ||
    response?.corporate ||
    response ||
    null
  );
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
      corporate.combined ??
        corporate.combinedExpense ??
        corporate.expenseCombined,
    ),
    liveTracking: toBoolean(corporate.liveTracking),
    voucherEnabled: toBoolean(corporate.voucherEnabled),
  };
};

const extractFirstEmployeeRole = (employeeDetails = null) => {
  if (!employeeDetails || typeof employeeDetails !== "object") return null;
  const assignedRoles = employeeDetails.assignedRoles;

  if (Array.isArray(assignedRoles)) {
    const firstRole = assignedRoles.find(
      (role) => typeof role === "string" && role.trim(),
    );
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

const normalizeToken = (value = "") =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const toArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const normalizeCorporateScreensResponse = (response = {}) => {
  const rawScreenSections =
    response?.screenSections && typeof response.screenSections === "object"
      ? response.screenSections
      : {};
  const explicitSectionEnabled = new Map();
  const sectionScreens = new Map();
  const screenSectionsByScreen = {};

  Object.entries(rawScreenSections).forEach(([screenName, sections]) => {
    const screen = normalizeToken(screenName);
    if (!screen) return;
    const normalizedSections = toArray(sections)
      .map((section) => {
        const sectionId = normalizeToken(section?.section);
        if (!sectionId) return null;
        explicitSectionEnabled.set(sectionId, section?.isEnabled === true);
        sectionScreens.set(sectionId, screen);
        return {
          section: sectionId,
          displayName: String(section?.displayName || sectionId).trim(),
          screen,
          isBasic: section?.isBasic === true,
          isEnabled: section?.isEnabled === true,
        };
      })
      .filter(Boolean);
    screenSectionsByScreen[screen] = normalizedSections;
  });

  const enabledSections = new Set();
  const addEnabledSection = (sectionEntry = {}) => {
    const section = normalizeToken(sectionEntry?.section);
    if (!section) return;
    const explicitEnabled = explicitSectionEnabled.get(section);
    if (explicitEnabled === false) return;
    enabledSections.add(section);
    const screen = normalizeToken(sectionEntry?.screen);
    if (screen) sectionScreens.set(section, screen);
  };

  toArray(response?.basicSections).forEach(addEnabledSection);
  toArray(response?.additionalSections).forEach(addEnabledSection);
  explicitSectionEnabled.forEach((isEnabled, section) => {
    if (isEnabled) enabledSections.add(section);
    if (!isEnabled) enabledSections.delete(section);
  });

  const allowedScreens = new Set(toArray(response?.allowedScreens).map(normalizeToken).filter(Boolean));
  enabledSections.forEach((section) => {
    const screen = sectionScreens.get(section);
    if (screen) allowedScreens.add(screen);
  });

  const enabledSectionList = Array.from(enabledSections);
  return {
    raw: response ?? null,
    allowedScreens: Array.from(allowedScreens),
    enabledSections: enabledSectionList,
    screenSectionsByScreen,
    sectionScreens: Object.fromEntries(sectionScreens),
    isCategoryFeatureEnabled: enabledSections.has("MANAGE_ROLE_CATEGORIES"),
  };
};

const normalizeCustomRoleScreen = (screen = {}) => ({
  ...screen,
  screen: normalizeToken(screen?.screen),
  displayName: String(screen?.displayName || screen?.screen || "").trim(),
  permissionTypes: toArray(screen?.permissionTypes).map((permission) => ({
    ...permission,
    permissionType: normalizeToken(permission?.permissionType ?? permission?.type),
    type: normalizeToken(permission?.type ?? permission?.permissionType),
    displayName: String(permission?.displayName || permission?.permissionType || permission?.type || "").trim(),
  })).filter((permission) => permission.permissionType),
});

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
        const corporateUser =
          response?.corporateUserDetails?.corporateUser || null;
        const employeeDetails = response?.employeeDetails || null;
        const effectiveRole =
          corporateUser?.role || extractFirstEmployeeRole(employeeDetails);

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
      transformResponse: (response) =>
        normalizeCustomRolePermissionsResponse(response),
    }),
    getCustomRoleScreens: builder.query({
      query: () => ({
        url: "/corporate/custom-roles/screens",
        method: "GET",
      }),
      transformResponse: (response) => {
        const screens = Array.isArray(response)
          ? response
          : Array.isArray(response?.screens)
            ? response.screens
            : [];
        return screens.map(normalizeCustomRoleScreen).filter((screen) => screen.screen);
      },
      providesTags: ["Users"],
    }),
    getCorporateScreens: builder.query({
      query: () => ({
        url: "/corporate/custom-roles/corporate-screens",
        method: "GET",
      }),
      transformResponse: normalizeCorporateScreensResponse,
      providesTags: ["Users"],
    }),
    getSubscriptionModules: builder.query({
      query: () => ({
        url: "/corporate/custom-roles/subscription-modules",
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
      providesTags: (_result, _error, roleId) => [
        { type: "Users", id: roleId },
      ],
    }),
    createCustomRole: builder.mutation({
      query: (body) => ({
        url: "/corporate/custom-roles",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Users", "Categories"],
    }),
    updateCustomRole: builder.mutation({
      query: ({ roleId, body }) => ({
        url: `/corporate/custom-roles/${roleId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Users", "Categories"],
    }),
    deleteCustomRole: builder.mutation({
      query: (roleId) => ({
        url: `/corporate/custom-roles/${roleId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Users", "Categories"],
    }),
    assignPermissionsToCustomRole: builder.mutation({
      query: ({ roleId, permissions }) => ({
        url: `/corporate/custom-roles/${roleId}/permissions`,
        method: "POST",
        body: { permissions },
      }),
      invalidatesTags: ["Users", "Categories"],
    }),
    removePermissionsFromCustomRole: builder.mutation({
      query: ({ roleId, permissions }) => ({
        url: `/corporate/custom-roles/${roleId}/permissions`,
        method: "DELETE",
        body: { permissions },
      }),
      invalidatesTags: ["Users", "Categories"],
    }),
    assignCustomRoleToEmployees: builder.mutation({
      query: ({ roleId, employeeIds }) => ({
        url: `/corporate/custom-roles/${roleId}/employees`,
        method: "POST",
        body: { employeeIds },
      }),
      invalidatesTags: ["Users", "Categories"],
    }),
    removeCustomRoleFromEmployees: builder.mutation({
      query: ({ roleId, employeeIds }) => ({
        url: `/corporate/custom-roles/${roleId}/employees`,
        method: "DELETE",
        body: { employeeIds },
      }),
      invalidatesTags: ["Users", "Categories"],
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
          empId:
            item?.empId ??
            item?.employeeId ??
            item?.employeeCode ??
            item?.empCode ??
            "",
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
    getCorporateDepartments: builder.query({
      query: () => ({
        url: "/corporate/departments",
        method: "GET",
        params: { programType: "VENDOR_PAYMENTS" },
      }),
      transformResponse: (response) => {
        if (Array.isArray(response)) return response;
        if (Array.isArray(response?.data)) return response.data;
        if (Array.isArray(response?.departments)) return response.departments;
        return [];
      },
      providesTags: ["Users"],
    }),
    addCorporateUsers: builder.mutation({
      query: (body) => ({
        url: "/corporate/user/add",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Users", "Categories"],
    }),
    updateCorporateEmployee: builder.mutation({
      query: (body) => ({
        url: "/corporate/employee/update",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Users", "Categories"],
    }),
    deleteCorporateEmployee: builder.mutation({
      query: ({ id }) => ({
        url: "/corporate/employee/delete",
        method: "POST",
        params: { employeeId: id },
        body: {},
      }),
      invalidatesTags: ["Users", "Categories"],
    }),
    getAvailableCurrencies: builder.query({
      query: (screen) => ({
        url: "/corporate/ap/getAvailableCurrencies",
        method: "GET",
        params: { screen },
      }),
      transformResponse: (response) => {
        const currencies = Array.isArray(response?.currencies)
          ? response.currencies
          : Array.isArray(response)
            ? response
            : [];
        return currencies
          .map((currency) => String(currency || "").trim().toUpperCase())
          .filter(Boolean);
      },
    }),
  }),
});

export const {
  useGetCorporateDetailsQuery,
  useGetCorporateUserDetailsQuery,
  useGetEmployeeCustomRolesQuery,
  useGetCustomRoleScreensQuery,
  useGetCorporateScreensQuery,
  useGetSubscriptionModulesQuery,
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
  useGetCorporateDepartmentsQuery,
  useAddCorporateUsersMutation,
  useUpdateCorporateEmployeeMutation,
  useDeleteCorporateEmployeeMutation,
  useGetAvailableCurrenciesQuery,
} = corporateApi;

import { serviceApi } from "../serviceApi";

const toArray = (value) => (Array.isArray(value) ? value : []);

const normalizeCategoriesList = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.categories)) return response.categories;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.content)) return response.content;
  if (Array.isArray(response?.results)) return response.results;
  return [];
};

const normalizeUserId = (value) => {
  if (value === undefined || value === null) return "";
  return String(value);
};

const toApiUserId = (value) => {
  const numericId = Number(value);
  return Number.isNaN(numericId) ? value : numericId;
};

const normalizeAssignedUser = (user = {}) => ({
  id: normalizeUserId(user.userId ?? user.id),
  userId: user.userId ?? user.id ?? null,
  name: user.name ?? user.userName ?? "",
  email: user.email ?? "",
});

export const normalizeCategory = (category = {}) => {
  const assignedUsers = toArray(category?.assignedUsers?.users).map(normalizeAssignedUser);
  const assignedMakers = toArray(
    category?.assignedMakers?.users ?? category?.makers ?? category?.makerUsers,
  ).map(normalizeAssignedUser);
  const assignedCheckers = toArray(
    category?.assignedCheckers?.users ?? category?.checkers ?? category?.checkerUsers,
  ).map(normalizeAssignedUser);
  const makerAssignedUserIds = assignedMakers.map((user) => user.id).filter(Boolean);
  const checkerAssignedUserIds = assignedCheckers.map((user) => user.id).filter(Boolean);
  const fallbackAssignedIds = assignedUsers.map((user) => user.id).filter(Boolean);
  const assignedUserIds = Array.from(
    new Set([...makerAssignedUserIds, ...checkerAssignedUserIds, ...fallbackAssignedIds]),
  );

  return {
    id: category.id,
    name: category.name ?? "",
    description: category.description ?? "",
    assignedUsers,
    makerAssignedUsers: assignedMakers,
    checkerAssignedUsers: assignedCheckers,
    makerAssignedUserIds,
    checkerAssignedUserIds,
    assignedUserIds,
    assignedUsersCount:
      category?.assignedUsers?.totalCount ??
      assignedUserIds.length,
    createdDate: category.createdAt ?? category.created_at ?? null,
    raw: category,
  };
};

const normalizeApprover = (approver = {}) => {
  const roles = toArray(approver.roles);
  const roleLabel =
    roles.length > 0 ? roles.join(", ") : approver.role ?? "Invoice Maker";

  return {
    id: normalizeUserId(approver.userId ?? approver.id),
    userId: approver.userId ?? approver.id ?? null,
    name: approver.userName ?? approver.name ?? "",
    email: approver.email ?? "",
    role: roleLabel,
    roles,
  };
};

const toCategoryBody = (category = {}, approvers = []) => {
  const approverById = new Map(
    approvers.map((approver) => [normalizeUserId(approver.id ?? approver.userId), approver]),
  );

  const makerAssignedIds = toArray(category.makerAssignedUserIds);
  const checkerAssignedIds = toArray(category.checkerAssignedUserIds);
  const mergedAssignedIds = Array.from(
    new Set([...makerAssignedIds, ...checkerAssignedIds, ...toArray(category.assignedUserIds)]),
  );

  const toAssignedUserPayload = (userId) => {
    const approver = approverById.get(normalizeUserId(userId));
    return {
      userId: toApiUserId(userId),
      userName: approver?.name || approver?.userName || approver?.email || undefined,
    };
  };

  return {
    name: category.name,
    description: category.description,
    // Backward-compatible field
    assignedUsers: mergedAssignedIds.map(toAssignedUserPayload),
    // Role-specific assignment fields
    assignedMakers: makerAssignedIds.map(toAssignedUserPayload),
    assignedCheckers: checkerAssignedIds.map(toAssignedUserPayload),
  };
};

export const categoriesApi = serviceApi.injectEndpoints({
  endpoints: (builder) => ({
    getCategories: builder.query({
      query: () => ({ url: "/categories", method: "GET" }),
      transformResponse: (response) => normalizeCategoriesList(response).map(normalizeCategory),
      providesTags: (result) => [
        "Categories",
        ...(result || []).map((category) => ({ type: "Categories", id: category.id })),
      ],
    }),
    getCategoryInvoiceApprovers: builder.query({
      query: () => ({ url: "/categories/invoice-approvers", method: "GET" }),
      transformResponse: (response) => {
        const rows = Array.isArray(response) ? response : toArray(response?.data);
        return rows.map(normalizeApprover);
      },
      providesTags: ["Categories"],
    }),
    getCategoriesForInvoice: builder.query({
      query: ({ userEmail, currency } = {}) => ({
        url: "/categories/for-invoice",
        method: "GET",
        params: {
          ...(userEmail ? { userEmail } : {}),
          ...(currency ? { currency } : {}),
        },
      }),
      transformResponse: (response) => normalizeCategoriesList(response).map(normalizeCategory),
      providesTags: ["Categories"],
    }),
    createCategory: builder.mutation({
      query: ({ category, approvers }) => ({
        url: "/categories",
        method: "POST",
        body: toCategoryBody(category, approvers),
      }),
      transformResponse: normalizeCategory,
      invalidatesTags: ["Categories"],
    }),
    updateCategory: builder.mutation({
      query: ({ categoryId, category, approvers }) => ({
        url: `/categories/${categoryId}`,
        method: "PUT",
        body: toCategoryBody(category, approvers),
      }),
      transformResponse: normalizeCategory,
      invalidatesTags: (_result, _error, { categoryId }) => [
        "Categories",
        { type: "Categories", id: categoryId },
      ],
    }),
    deleteCategory: builder.mutation({
      query: (categoryId) => ({
        url: `/categories/${categoryId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Categories"],
    }),
  }),
});

export const {
  useGetCategoriesQuery,
  useGetCategoryInvoiceApproversQuery,
  useGetCategoriesForInvoiceQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} = categoriesApi;

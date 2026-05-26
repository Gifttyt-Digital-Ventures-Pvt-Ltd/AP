import { serviceApi } from "../serviceApi";

const toArray = (value) => (Array.isArray(value) ? value : []);

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

  return {
    id: category.id,
    name: category.name ?? "",
    description: category.description ?? "",
    assignedUsers,
    assignedUserIds: assignedUsers.map((user) => user.id).filter(Boolean),
    assignedUsersCount: category?.assignedUsers?.totalCount ?? assignedUsers.length,
    createdDate: category.createdAt ?? category.created_at ?? null,
    raw: category,
  };
};

const normalizeApprover = (approver = {}) => ({
  id: normalizeUserId(approver.userId ?? approver.id),
  userId: approver.userId ?? approver.id ?? null,
  name: approver.userName ?? approver.name ?? "",
  email: approver.email ?? "",
  role: "Invoice Approver",
});

const toCategoryBody = (category = {}, approvers = []) => {
  const approverById = new Map(
    approvers.map((approver) => [normalizeUserId(approver.id ?? approver.userId), approver]),
  );

  return {
    name: category.name,
    description: category.description,
    assignedUsers: toArray(category.assignedUserIds).map((userId) => {
      const approver = approverById.get(normalizeUserId(userId));
      return {
        userId: toApiUserId(userId),
        userName: approver?.name || approver?.userName || approver?.email || undefined,
      };
    }),
  };
};

export const categoriesApi = serviceApi.injectEndpoints({
  endpoints: (builder) => ({
    getCategories: builder.query({
      query: () => ({ url: "/api/categories", method: "GET" }),
      transformResponse: (response) => toArray(response).map(normalizeCategory),
      providesTags: (result) => [
        "Categories",
        ...(result || []).map((category) => ({ type: "Categories", id: category.id })),
      ],
    }),
    getCategoryInvoiceApprovers: builder.query({
      query: () => ({ url: "/api/categories/invoice-approvers", method: "GET" }),
      transformResponse: (response) => toArray(response).map(normalizeApprover),
      providesTags: ["Categories"],
    }),
    createCategory: builder.mutation({
      query: ({ category, approvers }) => ({
        url: "/api/categories",
        method: "POST",
        body: toCategoryBody(category, approvers),
      }),
      transformResponse: normalizeCategory,
      invalidatesTags: ["Categories"],
    }),
    updateCategory: builder.mutation({
      query: ({ categoryId, category, approvers }) => ({
        url: `/api/categories/${categoryId}`,
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
        url: `/api/categories/${categoryId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Categories"],
    }),
  }),
});

export const {
  useGetCategoriesQuery,
  useGetCategoryInvoiceApproversQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} = categoriesApi;

import { serviceApi } from "../serviceApi";
import { extractListResponse } from "../utils/payloadMappers";

const toArray = (value) => (Array.isArray(value) ? value : []);

const normalizeDepartmentsList = (response) =>
  extractListResponse(response, ["departments"]);

const isActiveDepartment = (department = {}) =>
  normalizeDepartment(department).isActive !== false;

const normalizeUserId = (value) => {
  if (value === undefined || value === null) return "";
  return String(value);
};

const toApiUserId = (value) => {
  const numericId = Number(value);
  return Number.isNaN(numericId) ? value : numericId;
};

const resolveDepartmentId = (department = {}) =>
  department.id ??
  department.departmentId ??
  department.department_id ??
  department.cost_center_id ??
  department.costCenterId;

const resolveDepartmentName = (department = {}) =>
  department.name ??
  department.departmentName ??
  department.department_name ??
  department.cost_center_name ??
  department.costCenterName ??
  department.cost_center_code ??
  department.costCenterCode ??
  "";

const resolveDepartmentStatus = (department = {}) => {
  const rawStatus =
    department.isActive ??
    department.active ??
    department.enabled ??
    department.status;

  if (typeof rawStatus === "boolean") return rawStatus;
  if (typeof rawStatus === "number") return rawStatus === 1;
  if (typeof rawStatus === "string") {
    const normalizedStatus = rawStatus.trim().toLowerCase();
    if (["active", "enabled", "true", "1"].includes(normalizedStatus)) return true;
    if (["inactive", "disabled", "false", "0"].includes(normalizedStatus)) return false;
  }

  return true;
};

const normalizeAssignedUser = (user = {}) => ({
  id: normalizeUserId(user.userId ?? user.id),
  userId: user.userId ?? user.id ?? null,
  name: user.name ?? user.userName ?? "",
  email: user.email ?? "",
});

const dedupeUsersById = (users = []) => {
  const seen = new Map();
  users.forEach((user) => {
    const key = user.id || `${user.email}-${user.name}`;
    if (!seen.has(key)) {
      seen.set(key, user);
    }
  });
  return Array.from(seen.values());
};

const normalizeApproverEntry = (approver = {}) =>
  normalizeAssignedUser({
    userId: approver.userId ?? approver.id,
    name: approver.userName ?? approver.name,
    email: approver.email,
  });

export const normalizeDepartment = (department = {}) => {
  const assignedMakers = toArray(
    department?.assignedMakers?.users ??
      department?.makers?.users ??
      department?.makerUsers,
  ).map(normalizeAssignedUser);
  const assignedCheckers = toArray(
    department?.assignedCheckers?.users ??
      department?.checkers?.users ??
      department?.checkerUsers,
  ).map(normalizeAssignedUser);
  const approverUsers = dedupeUsersById(
    toArray(
      department?.assignedApprovers?.users ??
        department?.approvers?.users ??
        department?.approverUsers ??
        department?.approvers,
    ).map(normalizeApproverEntry),
  );
  const makerAssignedUserIds = assignedMakers.map((user) => user.id).filter(Boolean);
  const checkerAssignedUserIds = assignedCheckers.map((user) => user.id).filter(Boolean);
  const id = resolveDepartmentId(department);

  return {
    id,
    departmentId: id,
    name: resolveDepartmentName(department),
    departmentName: resolveDepartmentName(department),
    description: department.description ?? "",
    isActive: resolveDepartmentStatus(department),
    makerAssignedUsers: assignedMakers,
    checkerAssignedUsers: assignedCheckers,
    approverUsers,
    makerAssignedUserIds,
    checkerAssignedUserIds,
    createdDate: department.createdAt ?? department.created_at ?? null,
    raw: department,
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

const toDepartmentBody = (department = {}, approvers = []) => {
  const approverById = new Map(
    approvers.map((approver) => [normalizeUserId(approver.id ?? approver.userId), approver]),
  );

  const makerAssignedIds = toArray(department.makerAssignedUserIds);
  const checkerAssignedIds = toArray(department.checkerAssignedUserIds);

  const toAssignedUserPayload = (userId) => {
    const approver = approverById.get(normalizeUserId(userId));
    return {
      userId: toApiUserId(userId),
      userName: approver?.name || approver?.userName || approver?.email || undefined,
    };
  };

  return {
    name: department.name,
    description: department.description,
    isActive: department.isActive !== false,
    assignedMakers: makerAssignedIds.map(toAssignedUserPayload),
    assignedCheckers: checkerAssignedIds.map(toAssignedUserPayload),
  };
};

const toStatusBody = (isActive) => ({ isActive: isActive !== false });

export const departmentsApi = serviceApi.injectEndpoints({
  endpoints: (builder) => ({
    getDepartments: builder.query({
      query: (params) => ({ url: "/departments", method: "GET", params }),
      transformResponse: (response) => normalizeDepartmentsList(response).map(normalizeDepartment),
      providesTags: (result) => [
        "Departments",
        ...(result || []).map((department) => ({ type: "Departments", id: department.id })),
      ],
    }),
    getDepartmentInvoiceApprovers: builder.query({
      query: () => ({ url: "/departments/invoice-approvers", method: "GET" }),
      transformResponse: (response) =>
        extractListResponse(response).map(normalizeApprover),
      providesTags: ["Departments"],
    }),
    getDepartmentsForInvoice: builder.query({
      query: ({ userEmail, currency } = {}) => ({
        url: "/departments/for-invoice",
        method: "GET",
        params: {
          ...(userEmail ? { userEmail } : {}),
          ...(currency ? { currency } : {}),
        },
      }),
      transformResponse: (response) =>
        normalizeDepartmentsList(response)
          .filter(isActiveDepartment)
          .map(normalizeDepartment),
      providesTags: ["Departments"],
    }),
    createDepartment: builder.mutation({
      query: ({ department, approvers }) => ({
        url: "/departments",
        method: "POST",
        body: toDepartmentBody(department, approvers),
      }),
      transformResponse: normalizeDepartment,
      invalidatesTags: ["Departments"],
    }),
    updateDepartment: builder.mutation({
      query: ({ departmentId, department, approvers }) => ({
        url: `/departments/${departmentId}`,
        method: "PUT",
        body: toDepartmentBody(department, approvers),
      }),
      transformResponse: normalizeDepartment,
      invalidatesTags: (_result, _error, { departmentId }) => [
        "Departments",
        { type: "Departments", id: departmentId },
      ],
    }),
    updateDepartmentStatus: builder.mutation({
      query: ({ departmentId, isActive }) => ({
        url: `/departments/${departmentId}/status`,
        method: "PATCH",
        body: toStatusBody(isActive),
      }),
      transformResponse: normalizeDepartment,
      invalidatesTags: (_result, _error, { departmentId }) => [
        "Departments",
        { type: "Departments", id: departmentId },
      ],
    }),
    deleteDepartment: builder.mutation({
      query: (departmentId) => ({
        url: `/departments/${departmentId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Departments"],
    }),
  }),
});

export const {
  useGetDepartmentsQuery,
  useGetDepartmentInvoiceApproversQuery,
  useGetDepartmentsForInvoiceQuery,
  useCreateDepartmentMutation,
  useUpdateDepartmentMutation,
  useUpdateDepartmentStatusMutation,
  useDeleteDepartmentMutation,
} = departmentsApi;

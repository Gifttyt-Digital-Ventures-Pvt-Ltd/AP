import { serviceApi } from "../serviceApi";
import { extractListResponse } from "../utils/payloadMappers";

export const usersApi = serviceApi.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query({
      query: () => ({ url: "/users", method: "GET" }),
      transformResponse: extractListResponse,
      providesTags: ["Users"],
    }),
    getRoles: builder.query({
      query: () => ({ url: "/roles", method: "GET" }),
      transformResponse: (response) => extractListResponse(response, ['roles']),
      providesTags: ["Users"],
    }),
    inviteUser: builder.mutation({
      query: (body) => ({ url: "/users/invite", method: "POST", body }),
      invalidatesTags: ["Users"],
    }),
    updateUserRole: builder.mutation({
      query: ({ userId, role }) => ({
        url: `/users/${userId}/role`,
        method: "PUT",
        body: { role },
      }),
      invalidatesTags: ["Users"],
    }),
    updateUserStatus: builder.mutation({
      query: ({ userId, is_active }) => ({
        url: `/users/${userId}/status`,
        method: "PUT",
        body: { is_active },
      }),
      invalidatesTags: ["Users"],
    }),
    deleteUser: builder.mutation({
      query: (userId) => ({ url: `/users/${userId}`, method: "DELETE" }),
      invalidatesTags: ["Users"],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useGetRolesQuery,
  useInviteUserMutation,
  useUpdateUserRoleMutation,
  useUpdateUserStatusMutation,
  useDeleteUserMutation,
} = usersApi;

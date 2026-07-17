import { serviceApi } from "../serviceApi";

export const notificationsApi = serviceApi.injectEndpoints({
  endpoints: (builder) => ({
    getNotificationSettings: builder.query({
      query: () => ({ url: "/notifications/settings", method: "GET" }),
      providesTags: ["Notifications"],
    }),
    updateNotificationMasterSettings: builder.mutation({
      query: (body) => ({
        url: "/notifications/settings/master",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Notifications"],
    }),
    updateNotificationTypeSetting: builder.mutation({
      query: ({ typeId, ...body }) => ({
        url: `/notifications/settings/types/${typeId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Notifications"],
    }),
    getNotificationInbox: builder.query({
      query: ({ filter = "ACTIONABLE", page = 0, size = 20 } = {}) => ({
        url: "/notifications",
        method: "GET",
        params: { filter, page, size },
      }),
      providesTags: (_result, _error, arg = {}) => [
        { type: "Notifications", id: `Inbox-${arg.filter ?? "ACTIONABLE"}-${arg.page ?? 0}` },
        { type: "Notifications", id: "Inbox" },
      ],
    }),
    getUnreadNotificationCount: builder.query({
      query: () => ({ url: "/notifications/unread-count", method: "GET" }),
      providesTags: [{ type: "Notifications", id: "UnreadCount" }],
    }),
    markNotificationRead: builder.mutation({
      query: (id) => ({ url: `/notifications/${id}/read`, method: "PATCH" }),
      invalidatesTags: [
        { type: "Notifications", id: "Inbox" },
        { type: "Notifications", id: "UnreadCount" },
      ],
    }),
    markAllNotificationsRead: builder.mutation({
      query: () => ({ url: "/notifications/read-all", method: "POST" }),
      invalidatesTags: [
        { type: "Notifications", id: "Inbox" },
        { type: "Notifications", id: "UnreadCount" },
      ],
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetNotificationSettingsQuery,
  useUpdateNotificationMasterSettingsMutation,
  useUpdateNotificationTypeSettingMutation,
  useGetNotificationInboxQuery,
  useGetUnreadNotificationCountQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} = notificationsApi;

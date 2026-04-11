import { serviceApi } from "../serviceApi";

export const notificationsApi = serviceApi.injectEndpoints({
  endpoints: (builder) => ({
    getNotifications: builder.query({
      query: ({ limit = 100 } = {}) => ({
        url: "/notifications",
        method: "GET",
        params: { limit },
      }),
      providesTags: ["Notifications"],
    }),
    getPendingNotifications: builder.query({
      query: () => ({ url: "/notifications/pending", method: "GET" }),
      providesTags: ["Notifications"],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useGetPendingNotificationsQuery,
} = notificationsApi;

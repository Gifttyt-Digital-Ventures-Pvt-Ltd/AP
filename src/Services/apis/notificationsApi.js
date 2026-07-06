import { serviceApi } from "../serviceApi";
import { extractListResponse } from "../utils/payloadMappers";

export const notificationsApi = serviceApi.injectEndpoints({
  endpoints: (builder) => ({
    getNotifications: builder.query({
      query: ({ limit = 100 } = {}) => ({
        url: "/notifications",
        method: "GET",
        params: { limit },
      }),
      transformResponse: extractListResponse,
      providesTags: ["Notifications"],
    }),
    getPendingNotifications: builder.query({
      query: () => ({ url: "/notifications/pending", method: "GET" }),
      transformResponse: extractListResponse,
      providesTags: ["Notifications"],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useGetPendingNotificationsQuery,
} = notificationsApi;

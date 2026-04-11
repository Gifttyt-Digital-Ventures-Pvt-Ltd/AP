import { serviceApi } from "../serviceApi";

export const settingsApi = serviceApi.injectEndpoints({
  endpoints: (builder) => ({
    getOrganisation: builder.query({
      query: () => ({ url: "/organisation", method: "GET" }),
      providesTags: ["Settings"],
    }),
    createOrganisation: builder.mutation({
      query: (body) => ({ url: "/organisation", method: "POST", body }),
      invalidatesTags: ["Settings", "Dashboard", "Reports"],
    }),
    updateOrganisation: builder.mutation({
      query: (body) => ({ url: "/organisation", method: "PUT", body }),
      invalidatesTags: ["Settings", "Dashboard", "Reports"],
    }),
  }),
});

export const {
  useGetOrganisationQuery,
  useCreateOrganisationMutation,
  useUpdateOrganisationMutation,
} = settingsApi;
